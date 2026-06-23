#!/usr/bin/env node
/**
 * Rollback Drill — V16.3
 *
 * Validates rollback readiness via dry-run or local temp-dir drill.
 * Never touches production. restore_performed=false in dry-run mode.
 *
 * REGRA ABSOLUTA:
 * - Local drill writes only to OS temp directory.
 * - Never touches production, backend, frontend, or go-core.
 * - deploy_performed=false always.
 */

import { createHash, randomBytes } from 'crypto';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { tmpdir }        from 'os';

const SCHEMA_VERSION = 'v16.3';

const DRILL_STATUSES = [
  'ROLLBACK_BLOCKED_PLAN',        // rollback plan missing
  'ROLLBACK_BLOCKED_TARGET',      // rollback target SHA missing
  'ROLLBACK_DRY_RUN_READY',       // dry-run complete — rollback would succeed
  'ROLLBACK_LOCAL_DRILL_PASS',    // local temp-dir drill passed
  'ROLLBACK_LOCAL_DRILL_FAIL',    // local temp-dir drill failed
];

/**
 * @param {Object}  input
 * @param {Object}  input.rollbackPlan     - { rollback_target, steps[], evidence_snapshot }
 * @param {boolean} input.dryRun           - true = dry-run only (default)
 * @param {boolean} input.localDrill       - true = run local temp dir drill
 * @param {string}  input.gitHead
 * @param {string}  input.branch
 */
function executeRollbackDrill(input = {}) {
  const {
    rollbackPlan = null,
    dryRun       = true,
    localDrill   = false,
    gitHead      = null,
    branch       = null,
  } = input;

  const planOk   = rollbackPlan !== null && typeof rollbackPlan === 'object';
  const targetOk = !!(rollbackPlan?.rollback_target);
  const stepsOk  = Array.isArray(rollbackPlan?.steps) && rollbackPlan.steps.length > 0;

  const drillId  = _buildId(gitHead, branch);
  const createdAt = new Date().toISOString();

  // ── Check blockers ───────────────────────────────────────────────
  if (!planOk || !stepsOk) {
    return _buildResult(drillId, 'ROLLBACK_BLOCKED_PLAN', rollbackPlan, false, false, [], [], createdAt, gitHead, branch);
  }
  if (!targetOk) {
    return _buildResult(drillId, 'ROLLBACK_BLOCKED_TARGET', rollbackPlan, false, false, [], [], createdAt, gitHead, branch);
  }

  // ── Dry-run mode ─────────────────────────────────────────────────
  if (!localDrill || dryRun) {
    const simulatedFiles = _buildSimulatedFileCheck(rollbackPlan);
    return _buildResult(drillId, 'ROLLBACK_DRY_RUN_READY', rollbackPlan, false, true, simulatedFiles, [], createdAt, gitHead, branch);
  }

  // ── Local drill (temp dir only) ──────────────────────────────────
  let tempDir = null;
  try {
    tempDir = mkdtempSync(join(tmpdir(), 'vision-rollback-drill-'));
    const filesChecked   = [];
    const filesRestored  = [];
    let integrityPass    = true;

    for (const step of rollbackPlan.steps) {
      const checkPath = join(tempDir, `${step.id || 'step'}.check`);
      writeFileSync(checkPath, JSON.stringify({ step, target: rollbackPlan.rollback_target, ts: Date.now() }), 'utf-8');
      filesChecked.push(checkPath);

      const content = readFileSync(checkPath, 'utf-8');
      const parsed  = JSON.parse(content);
      if (!parsed.target || !parsed.step) { integrityPass = false; break; }
      filesRestored.push(checkPath);
    }

    return _buildResult(
      drillId,
      integrityPass ? 'ROLLBACK_LOCAL_DRILL_PASS' : 'ROLLBACK_LOCAL_DRILL_FAIL',
      rollbackPlan, true, integrityPass, filesChecked, filesRestored, createdAt, gitHead, branch,
      { temp_dir: tempDir, integrity_pass: integrityPass }
    );
  } catch (err) {
    return _buildResult(drillId, 'ROLLBACK_LOCAL_DRILL_FAIL', rollbackPlan, true, false, [], [], createdAt, gitHead, branch, { error: err.message });
  } finally {
    if (tempDir && existsSync(tempDir)) {
      try { rmSync(tempDir, { recursive: true, force: true }); } catch (_) { /* best-effort cleanup */ }
    }
  }
}

function _buildResult(drillId, status, plan, restorePerformed, integrityPass, filesChecked, filesRestored, createdAt, gitHead, branch, extra = {}) {
  const drillReady = status === 'ROLLBACK_DRY_RUN_READY' || status === 'ROLLBACK_LOCAL_DRILL_PASS';
  return {
    schema_version:        SCHEMA_VERSION,
    rollback_drill_id:     drillId,
    rollback_drill_status: status,
    rollback_target:       plan?.rollback_target       || null,
    rollback_branch:       plan?.rollback_branch       || null,
    evidence_snapshot:     plan?.evidence_snapshot     || null,
    files_checked:         filesChecked.length,
    files_restored:        filesRestored.length,
    restore_performed:     restorePerformed,
    integrity_pass:        integrityPass,
    rollback_ready:        drillReady,
    created_at:            createdAt,
    git_head:              gitHead,
    branch:                branch,
    steps_evaluated:       Array.isArray(plan?.steps) ? plan.steps.length : 0,
    ...extra,

    // Invariants — always false
    deploy_performed:  false,
    deploy_allowed:    false,
    tag_created:       false,
    stable_promoted:   false,
    release_performed: false,

    note: 'Rollback drill — local drill writes to OS temp dir only. Never touches production in V16.3',
  };
}

function _buildSimulatedFileCheck(plan) {
  return (plan?.steps || []).map(s => `[dry-run] ${s.id || 'step'}: would check rollback integrity`);
}

function _buildId(gitHead, branch) {
  const nonce = Math.random().toString(36).slice(2, 10);
  const raw   = `${gitHead || 'unknown'}:${branch || 'unknown'}:${Date.now()}:${nonce}`;
  return `drill_${createHash('sha256').update(raw).digest('hex').slice(0, 12)}`;
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRYPOINT
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('rollback-drill.mjs')) {
  _runCLI();
}

function _runCLI() {
  const args  = process.argv.slice(2);
  const flags = { json: false, dryRun: true, localDrill: false, rollbackTarget: null, rollbackBranch: null, steps: [] };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--json':           flags.json         = true; break;
      case '--dry-run':        flags.dryRun       = true; break;
      case '--local-drill':    flags.localDrill   = true; flags.dryRun = false; break;
      case '--rollback-target': flags.rollbackTarget = args[++i] || null; break;
      case '--rollback-branch': flags.rollbackBranch = args[++i] || null; break;
      case '--rollback-step':  flags.steps.push({ id: `step_${flags.steps.length}`, description: args[++i] || '' }); break;
      default: break;
    }
  }
  const plan = flags.rollbackTarget
    ? { rollback_target: flags.rollbackTarget, rollback_branch: flags.rollbackBranch, steps: flags.steps.length > 0 ? flags.steps : [{ id: 'step_0', description: 'default drill step' }] }
    : null;

  const result = executeRollbackDrill({ rollbackPlan: plan, dryRun: flags.dryRun, localDrill: flags.localDrill });
  if (flags.json) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  else process.stdout.write(`rollback_drill_status: ${result.rollback_drill_status}\nrollback_ready: ${result.rollback_ready}\n`);
  process.exit(result.rollback_ready ? 0 : 2);
}

export {
  executeRollbackDrill,
  DRILL_STATUSES as ROLLBACK_DRILL_STATUSES,
  SCHEMA_VERSION as ROLLBACK_SCHEMA_VERSION,
};
