#!/usr/bin/env node
/**
 * Real Manual Execution Baseline — V75.0
 *
 * Capstone baseline for V71–V74 Real Manual Execution layer.
 * Even when READY, no real execution occurred.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 * explicit_real_command_required=true always.
 * No real tag, stable, deploy, release, or git push.
 */

import { createHash } from 'crypto';
import { existsSync } from 'fs';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

const SCHEMA_VERSION = 'v75.0';

export const REAL_MANUAL_EXEC_BASELINE_STATUSES = [
  'REAL_MANUAL_EXEC_BASELINE_BLOCKED_MODULES',
  'REAL_MANUAL_EXEC_BASELINE_BLOCKED_TESTS',
  'REAL_MANUAL_EXEC_BASELINE_BLOCKED_INVARIANTS',
  'REAL_MANUAL_EXEC_BASELINE_BLOCKED_DRY_RUN_PIPELINE',
  'REAL_MANUAL_EXEC_BASELINE_READY_DRY_RUN_ONLY',
];

const REQUIRED_MODULES = [
  'tools/real-manual-unlock-execution-contract.mjs',
  'tools/real-manual-unlock-authority-binding.mjs',
  'tools/real-manual-unlock-dry-run-executor.mjs',
  'tools/real-manual-execution-decision-matrix.mjs',
  'tools/controlled-real-tag-creation-gate.mjs',
  'tools/controlled-real-tag-dry-run-executor.mjs',
  'tools/controlled-stable-promotion-gate.mjs',
  'tools/controlled-stable-dry-run-executor.mjs',
];

const REQUIRED_TEST_SCRIPTS = [
  'test:unlock-exec-contract-unit',
  'test:unlock-authority-binding-unit',
  'test:unlock-dry-run-unit',
  'test:exec-decision-matrix-unit',
  'test:tag-creation-gate-unit',
  'test:tag-dry-run-unit',
  'test:stable-promotion-gate-unit',
  'test:stable-dry-run-unit',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    deploy_allowed:                  false,
    promotion_allowed:               false,
    stable_allowed:                  false,
    tag_allowed:                     false,
    release_execution_allowed:       false,
    release_performed:               false,
    tag_created:                     false,
    stable_promoted:                 false,
    deploy_performed:                false,
    production_execution_locked:     true,
    unlock_executed:                 false,
    git_push_performed:              false,
    real_execution_armed:            false,
    explicit_real_command_required:  true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:                       SCHEMA_VERSION,
    real_manual_exec_baseline_status:     status,
    real_manual_exec_baseline_ready:      false,
    blocking_reason,
    ...extra,
    deploy_allowed:                  false,
    promotion_allowed:               false,
    stable_allowed:                  false,
    tag_allowed:                     false,
    release_execution_allowed:       false,
    release_performed:               false,
    tag_created:                     false,
    stable_promoted:                 false,
    deploy_performed:                false,
    production_execution_locked:     true,
    unlock_executed:                 false,
    git_push_performed:              false,
    real_execution_armed:            false,
    explicit_real_command_required:  true,
  };
}

function _checkModules() {
  const missing = [];
  for (const mod of REQUIRED_MODULES) {
    if (!existsSync(join(ROOT, mod))) missing.push(mod);
  }
  return missing;
}

function _checkTestScripts() {
  const missing = [];
  try {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    for (const script of REQUIRED_TEST_SCRIPTS) {
      if (!pkg.scripts?.[script]) missing.push(script);
    }
  } catch (_) {
    return REQUIRED_TEST_SCRIPTS.slice();
  }
  return missing;
}

function _verifyInvariants(result) {
  const failures = [];
  if (result.production_execution_locked !== true)  failures.push('production_execution_locked must be true');
  if (result.unlock_executed             === true)  failures.push('unlock_executed must be false');
  if (result.git_push_performed          === true)  failures.push('git_push_performed must be false');
  if (result.real_execution_armed        === true)  failures.push('real_execution_armed must be false');
  if (result.deploy_allowed              === true)  failures.push('deploy_allowed must be false');
  if (result.promotion_allowed           === true)  failures.push('promotion_allowed must be false');
  if (result.tag_created                 === true)  failures.push('tag_created must be false');
  if (result.stable_promoted             === true)  failures.push('stable_promoted must be false');
  if (result.deploy_performed            === true)  failures.push('deploy_performed must be false');
  if (result.release_performed           === true)  failures.push('release_performed must be false');
  return failures;
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

export async function evaluateRealManualExecutionBaseline(params = {}) {
  const {
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();
  const baseline_id = _sha256(`real-manual-exec-baseline:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  // ── 1. Module check ────────────────────────────────────────────
  if (!fixture_mode) {
    const missing = _checkModules();
    if (missing.length > 0) {
      return _blocked('REAL_MANUAL_EXEC_BASELINE_BLOCKED_MODULES', 'required_modules_missing', {
        baseline_id,
        missing_modules: missing,
        modules_verified: false,
        test_scripts_verified: false,
        invariants_verified: false,
        dry_run_pipeline_verified: false,
        tag_dry_run_verified: false,
        stable_dry_run_verified: false,
        created_at: now,
      });
    }
  }

  // ── 2. Test script check ───────────────────────────────────────
  if (!fixture_mode) {
    const missing = _checkTestScripts();
    if (missing.length > 0) {
      return _blocked('REAL_MANUAL_EXEC_BASELINE_BLOCKED_TESTS', 'required_test_scripts_missing', {
        baseline_id,
        missing_test_scripts: missing,
        modules_verified: true,
        test_scripts_verified: false,
        invariants_verified: false,
        dry_run_pipeline_verified: false,
        tag_dry_run_verified: false,
        stable_dry_run_verified: false,
        created_at: now,
      });
    }
  }

  // ── 3. Invariant check ─────────────────────────────────────────
  const { runRealManualUnlockDryRun }     = await import('./real-manual-unlock-dry-run-executor.mjs');
  const { runControlledRealTagDryRun }    = await import('./controlled-real-tag-dry-run-executor.mjs');
  const { runControlledStableDryRun }     = await import('./controlled-stable-dry-run-executor.mjs');

  const fixtureDryRun = runRealManualUnlockDryRun({ fixture_mode: true, _mock_timestamp: now });
  const invariantFailures = _verifyInvariants(fixtureDryRun);
  if (invariantFailures.length > 0) {
    return _blocked('REAL_MANUAL_EXEC_BASELINE_BLOCKED_INVARIANTS', 'invariant_violations_detected', {
      baseline_id,
      invariant_failures: invariantFailures,
      modules_verified: true,
      test_scripts_verified: true,
      invariants_verified: false,
      dry_run_pipeline_verified: false,
      tag_dry_run_verified: false,
      stable_dry_run_verified: false,
      created_at: now,
    });
  }

  // ── 4. Dry-run pipeline check ──────────────────────────────────
  const { createRealManualUnlockExecutionContract } = await import('./real-manual-unlock-execution-contract.mjs');
  const { bindRealManualUnlockAuthority }           = await import('./real-manual-unlock-authority-binding.mjs');
  const { evaluateRealManualExecutionDecision }     = await import('./real-manual-execution-decision-matrix.mjs');
  const { evaluateControlledRealTagGate }           = await import('./controlled-real-tag-creation-gate.mjs');
  const { evaluateControlledStablePromotionGate }   = await import('./controlled-stable-promotion-gate.mjs');

  const contract  = createRealManualUnlockExecutionContract({ fixture_mode: true, _mock_timestamp: now });
  const binding   = bindRealManualUnlockAuthority({ fixture_mode: true, _mock_timestamp: now });
  const dryRun    = runRealManualUnlockDryRun({ fixture_mode: true, _mock_timestamp: now });
  const decision  = evaluateRealManualExecutionDecision({ fixture_mode: true, _mock_timestamp: now });
  const tagGate   = evaluateControlledRealTagGate({ fixture_mode: true, _mock_timestamp: now });
  const tagDryRun = runControlledRealTagDryRun({ fixture_mode: true, dry_run: true, _mock_timestamp: now });
  const stableGate   = evaluateControlledStablePromotionGate({ fixture_mode: true, _mock_timestamp: now });
  const stableDryRun = runControlledStableDryRun({ fixture_mode: true, dry_run: true, _mock_timestamp: now });

  const pipelineOk = (
    contract.contract_status      === 'UNLOCK_EXEC_CONTRACT_READY_ARMED_REVIEW'    &&
    binding.binding_status         === 'REAL_UNLOCK_BINDING_READY_ARMED_REVIEW'     &&
    dryRun.unlock_dry_run_status   === 'UNLOCK_DRY_RUN_READY'                       &&
    decision.real_execution_decision_status === 'REAL_EXEC_DECISION_REQUIRES_EXPLICIT_REAL_COMMAND' &&
    tagGate.tag_gate_status        === 'TAG_GATE_READY_REQUIRES_COMMAND'             &&
    tagDryRun.tag_dry_run_status   === 'TAG_DRY_RUN_READY'                           &&
    stableGate.stable_gate_status  === 'STABLE_GATE_READY_REQUIRES_COMMAND'         &&
    stableDryRun.stable_dry_run_status === 'STABLE_DRY_RUN_READY'
  );

  if (!pipelineOk) {
    return _blocked('REAL_MANUAL_EXEC_BASELINE_BLOCKED_DRY_RUN_PIPELINE', 'dry_run_pipeline_verification_failed', {
      baseline_id,
      modules_verified: true,
      test_scripts_verified: true,
      invariants_verified: true,
      dry_run_pipeline_verified: false,
      tag_dry_run_verified: tagDryRun.tag_dry_run_status === 'TAG_DRY_RUN_READY',
      stable_dry_run_verified: stableDryRun.stable_dry_run_status === 'STABLE_DRY_RUN_READY',
      created_at: now,
    });
  }

  return {
    schema_version:                       SCHEMA_VERSION,
    baseline_id,
    real_manual_exec_baseline_status:     'REAL_MANUAL_EXEC_BASELINE_READY_DRY_RUN_ONLY',
    real_manual_exec_baseline_ready:      true,
    blocking_reason:                      null,
    modules_verified:                     true,
    test_scripts_verified:                true,
    invariants_verified:                  true,
    dry_run_pipeline_verified:            true,
    tag_dry_run_verified:                 true,
    stable_dry_run_verified:              true,
    required_modules_count:               REQUIRED_MODULES.length,
    required_test_scripts_count:          REQUIRED_TEST_SCRIPTS.length,
    created_at:                           now,
    ..._locked(),
  };
}

export function renderRealManualExecutionBaseline(result) {
  if (!result) return 'real_manual_execution_baseline: null';
  return [
    `real_manual_exec_baseline_status  : ${result.real_manual_exec_baseline_status ?? 'UNKNOWN'}`,
    `baseline_id                        : ${result.baseline_id ?? 'none'}`,
    `modules_verified                   : ${result.modules_verified ?? false}`,
    `test_scripts_verified              : ${result.test_scripts_verified ?? false}`,
    `invariants_verified                : ${result.invariants_verified ?? false}`,
    `dry_run_pipeline_verified          : ${result.dry_run_pipeline_verified ?? false}`,
    `tag_dry_run_verified               : ${result.tag_dry_run_verified ?? false}`,
    `stable_dry_run_verified            : ${result.stable_dry_run_verified ?? false}`,
    `explicit_real_command_required     : true`,
    `production_execution_locked        : true`,
    `unlock_executed                    : false`,
    `tag_created                        : false`,
    `stable_promoted                    : false`,
    `deploy_performed                   : false`,
    `release_performed                  : false`,
    `git_push_performed                 : false`,
    `blocking_reason                    : ${result.blocking_reason ?? 'none'}`,
  ].join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('real-manual-execution-baseline.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = await evaluateRealManualExecutionBaseline({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealManualExecutionBaseline(result));
  }

  process.exit(result.real_manual_exec_baseline_ready ? 0 : 1);
}
