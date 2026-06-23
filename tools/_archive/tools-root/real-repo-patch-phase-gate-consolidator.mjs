#!/usr/bin/env node
/**
 * Real Repo Patch Phase Gate Consolidator — V190.0
 * Final capstone consolidating the V171–V190 certification chain.
 * Does NOT deploy, promote, or release. release_allowed=false always.
 */

import { createHash } from 'crypto';

export const REAL_REPO_PATCH_PHASE_GATE_STATUSES = [
  'PHASE_GATE_BLOCKED_INPUT',
  'PHASE_GATE_BLOCKED_CERTIFICATION',
  'PHASE_GATE_FAIL',
  'PHASE_GATE_READY',
];

const SCHEMA_VERSION = 'v190.0';

const PHASE_MODULES = [
  'scope_contract',
  'pre_state_snapshot',
  'apply_controller',
  'physical_apply_proof',
  'diff_truth_binding',
  'test_lane',
  'rollback_plan',
  'rollback_drill',
  'evidence_receipt',
  'ledger',
  'final_report',
  'pass_gold_candidate_gate',
  'baseline',
  'archive_record',
  'execution_baseline',
  'chain_integrity_gate',
  'evidence_graph',
  'replay_verifier',
  'human_approval_binding',
  'rc_dry_run',
];

const FINAL_MESSAGE =
  'V171-V190 certified. Real release remains blocked until explicit V191+ manual release authority.';

function sha256(s) {
  return createHash('sha256').update(String(s)).digest('hex');
}

function blockedInput(reason) {
  return {
    schema_version: SCHEMA_VERSION,
    gate_id: null,
    cert_id: null,
    phase_modules: [],
    final_message: null,
    release_allowed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    gate_hash: null,
    status: 'PHASE_GATE_BLOCKED_INPUT',
    errors: [reason],
  };
}

export function buildRealRepoPatchPhaseGateConsolidator(input) {
  if (!input || typeof input !== 'object') {
    return blockedInput('input is null or not an object');
  }

  const { gate_id, cert_id, certification_ready } = input;

  if (!gate_id || typeof gate_id !== 'string' || !gate_id.trim()) {
    return blockedInput('Missing or invalid gate_id');
  }
  if (!cert_id || typeof cert_id !== 'string' || !cert_id.trim()) {
    return blockedInput('Missing or invalid cert_id');
  }

  if (!certification_ready) {
    return {
      schema_version: SCHEMA_VERSION,
      gate_id,
      cert_id,
      phase_modules: [],
      final_message: null,
      release_allowed: false,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      gate_hash: null,
      status: 'PHASE_GATE_BLOCKED_CERTIFICATION',
      errors: ['certification_ready must be true'],
    };
  }

  const missing_modules = Array.isArray(input.missing_modules) ? input.missing_modules : [];

  if (missing_modules.length > 0) {
    return {
      schema_version: SCHEMA_VERSION,
      gate_id,
      cert_id,
      phase_modules: PHASE_MODULES,
      final_message: null,
      release_allowed: false,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      gate_hash: null,
      status: 'PHASE_GATE_FAIL',
      errors: missing_modules.map(m => `Missing certified module: ${m}`),
    };
  }

  const gate_hash = sha256(`${gate_id}:${cert_id}:${PHASE_MODULES.join(',')}`);

  return {
    schema_version: SCHEMA_VERSION,
    gate_id,
    cert_id,
    phase_modules: PHASE_MODULES,
    final_message: FINAL_MESSAGE,
    release_allowed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    gate_hash,
    status: 'PHASE_GATE_READY',
    errors: [],
  };
}

export function validateRealRepoPatchPhaseGateConsolidator(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  if (result.release_allowed !== false) errors.push('release_allowed must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  if (result.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (result.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!REAL_REPO_PATCH_PHASE_GATE_STATUSES.includes(result.status)) {
    errors.push(`Invalid status: ${result.status}`);
  }
  if (result.status === 'PHASE_GATE_READY' && (!result.gate_hash || result.gate_hash.length !== 64)) {
    errors.push('PHASE_GATE_READY requires 64-char gate_hash');
  }
  if (result.status === 'PHASE_GATE_READY' && result.final_message !== FINAL_MESSAGE) {
    errors.push('PHASE_GATE_READY requires correct final_message');
  }
  return { valid: errors.length === 0, errors };
}

export function renderRealRepoPatchPhaseGateConsolidator(result) {
  if (!result || typeof result !== 'object') return '[PhaseGateConsolidator: null]';
  const lines = [
    `=== Real Repo Patch Phase Gate Consolidator ${SCHEMA_VERSION} ===`,
    `Status              : ${result.status}`,
    `Gate ID             : ${result.gate_id ?? 'N/A'}`,
    `Cert ID             : ${result.cert_id ?? 'N/A'}`,
    `Phase Modules       : ${(result.phase_modules || []).length}`,
    `Release Allowed     : ${result.release_allowed}`,
    `Gate Hash           : ${result.gate_hash ?? 'N/A'}`,
    `Final Message       : ${result.final_message ?? 'N/A'}`,
    `Prod Touched        : ${result.production_touched}`,
  ];
  if (result.errors && result.errors.length) lines.push(`Errors              : ${result.errors.join('; ')}`);
  lines.push('--- REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable ---');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-repo-patch-phase-gate-consolidator.mjs')) {
  const demo = buildRealRepoPatchPhaseGateConsolidator({
    gate_id: 'gate-demo-001',
    cert_id: 'cert-demo-001',
    certification_ready: true,
  });
  console.log(renderRealRepoPatchPhaseGateConsolidator(demo));
  console.log(`\nrelease_allowed: ${demo.release_allowed}`);
  console.log(`phase_modules: ${demo.phase_modules.length}`);
  const v = validateRealRepoPatchPhaseGateConsolidator(demo);
  console.log(`Validation: ${v.valid ? 'OK' : 'FAIL'}`);
}
