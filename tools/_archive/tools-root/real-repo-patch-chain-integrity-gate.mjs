#!/usr/bin/env node
/**
 * Real Repo Patch Chain Integrity Gate — V181.0
 * Validates cross-chain integrity of the V171→V180 pipeline.
 * Does NOT deploy, promote, or release.
 */

import { createHash } from 'crypto';

export const REAL_REPO_PATCH_CHAIN_INTEGRITY_STATUSES = [
  'CHAIN_INTEGRITY_BLOCKED_INPUT',
  'CHAIN_INTEGRITY_FAIL',
  'CHAIN_INTEGRITY_READY',
];

const SCHEMA_VERSION = 'v181.0';

const REQUIRED_STAGES = [
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
];

const EXPECTED_SCHEMA_VERSIONS = {
  scope_contract: 'v171.0',
  pre_state_snapshot: 'v171.1',
  apply_controller: 'v172.0',
  physical_apply_proof: 'v172.1',
  diff_truth_binding: 'v173.0',
  test_lane: 'v173.1',
  rollback_plan: 'v174.0',
  rollback_drill: 'v174.1',
  evidence_receipt: 'v175.0',
  ledger: 'v175.1',
  final_report: 'v176.0',
  pass_gold_candidate_gate: 'v177.0',
  baseline: 'v178.0',
  archive_record: 'v179.0',
  execution_baseline: 'v180.0',
};

const STAGE_READY_FIELD = {
  scope_contract: 'repo_patch_scope_ready',
  pre_state_snapshot: 'pre_state_snapshot_ready',
  apply_controller: 'apply_ready',
  physical_apply_proof: 'physical_apply_proof_ready',
  diff_truth_binding: 'diff_truth_bound',
  test_lane: 'test_lane_passed',
  rollback_plan: 'rollback_plan_ready',
  rollback_drill: 'rollback_drill_passed',
  evidence_receipt: 'real_repo_patch_receipt_ready',
  ledger: 'ledger_ready',
  final_report: 'real_repo_patch_final_report_ready',
  pass_gold_candidate_gate: 'pass_gold_candidate_ready',
  baseline: 'real_repo_patch_baseline_ready',
  archive_record: 'archive_record_ready',
  execution_baseline: 'first_real_repo_patch_execution_baseline_ready',
};

// Hash fields expected to be 64-char SHA256 hex when non-null
const STAGE_HASH_FIELDS = {
  scope_contract: ['scope_hash'],
  pre_state_snapshot: ['snapshot_hash'],
  archive_record: ['archive_hash'],
  execution_baseline: ['baseline_hash'],
};

const INVARIANTS = ['production_touched', 'deploy_performed', 'stable_promoted', 'release_performed'];

function sha256(s) {
  return createHash('sha256').update(String(s)).digest('hex');
}

function blockedInput(reason) {
  return {
    schema_version: SCHEMA_VERSION,
    chain_id: null,
    stages_validated: 0,
    integrity_errors: [reason],
    integrity_hash: null,
    chain_integrity_ready: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    status: 'CHAIN_INTEGRITY_BLOCKED_INPUT',
  };
}

export function buildRealRepoPatchChainIntegrityGate(input) {
  if (!input || typeof input !== 'object') {
    return blockedInput('input is null or not an object');
  }
  if (!input.chain_id || typeof input.chain_id !== 'string' || !input.chain_id.trim()) {
    return blockedInput('Missing or invalid chain_id');
  }
  if (!input.stages || typeof input.stages !== 'object') {
    return blockedInput('Missing stages object');
  }

  const stages = input.stages;
  const errors = [];

  // Phase 1: all stages present
  for (const stage of REQUIRED_STAGES) {
    if (!stages[stage] || typeof stages[stage] !== 'object') {
      errors.push(`Missing stage: ${stage}`);
    }
  }

  if (errors.length > 0) {
    return {
      schema_version: SCHEMA_VERSION,
      chain_id: input.chain_id,
      stages_validated: 0,
      integrity_errors: errors,
      integrity_hash: null,
      chain_integrity_ready: false,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      status: 'CHAIN_INTEGRITY_FAIL',
    };
  }

  let stagesValidated = 0;

  // Phase 2: per-stage validation
  for (const stage of REQUIRED_STAGES) {
    const s = stages[stage];

    // schema_version
    if (s.schema_version !== EXPECTED_SCHEMA_VERSIONS[stage]) {
      errors.push(`${stage}: expected schema_version ${EXPECTED_SCHEMA_VERSIONS[stage]}, got ${s.schema_version}`);
    }

    // invariants
    for (const inv of INVARIANTS) {
      if (s[inv] !== false) {
        errors.push(`${stage}: ${inv} must be false`);
      }
    }

    // ready flag
    const readyField = STAGE_READY_FIELD[stage];
    if (!s[readyField]) {
      errors.push(`${stage}: ${readyField} must be true`);
    }

    // hash field validation
    const hashFields = STAGE_HASH_FIELDS[stage] || [];
    for (const hf of hashFields) {
      if (s[hf] !== null && s[hf] !== undefined) {
        if (typeof s[hf] !== 'string' || s[hf].length !== 64) {
          errors.push(`${stage}: ${hf} must be 64-char hex string when present`);
        }
      }
    }

    stagesValidated++;
  }

  // Phase 3: chain dependency validation
  if (errors.length === 0) {
    const eb = stages.execution_baseline;
    const ar = stages.archive_record;
    const bl = stages.baseline;
    const pg = stages.pass_gold_candidate_gate;
    const fr = stages.final_report;
    const lg = stages.ledger;

    if (eb.first_real_repo_patch_execution_baseline_ready && !ar.archive_record_ready) {
      errors.push('execution_baseline ready requires archive_record ready');
    }
    if (ar.archive_record_ready && !bl.real_repo_patch_baseline_ready) {
      errors.push('archive_record ready requires baseline ready');
    }
    if (bl.real_repo_patch_baseline_ready && !pg.pass_gold_candidate_ready) {
      errors.push('baseline ready requires pass_gold_candidate ready');
    }
    if (pg.pass_gold_candidate_ready && (!fr.real_repo_patch_final_report_ready || !lg.ledger_ready)) {
      errors.push('pass_gold_candidate ready requires final_report ready and ledger ready');
    }
  }

  if (errors.length > 0) {
    return {
      schema_version: SCHEMA_VERSION,
      chain_id: input.chain_id,
      stages_validated: stagesValidated,
      integrity_errors: errors,
      integrity_hash: null,
      chain_integrity_ready: false,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      status: 'CHAIN_INTEGRITY_FAIL',
    };
  }

  const integrity_hash = sha256(`${input.chain_id}:${REQUIRED_STAGES.join(',')}`);

  return {
    schema_version: SCHEMA_VERSION,
    chain_id: input.chain_id,
    stages_validated: REQUIRED_STAGES.length,
    integrity_errors: [],
    integrity_hash,
    chain_integrity_ready: true,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    status: 'CHAIN_INTEGRITY_READY',
  };
}

export function validateRealRepoPatchChainIntegrityGate(gate) {
  if (!gate || typeof gate !== 'object') {
    return { valid: false, errors: ['gate is null or not an object'] };
  }
  const errors = [];
  if (gate.production_touched !== false) errors.push('production_touched must be false');
  if (gate.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (gate.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (gate.release_performed !== false) errors.push('release_performed must be false');
  if (!REAL_REPO_PATCH_CHAIN_INTEGRITY_STATUSES.includes(gate.status)) {
    errors.push(`Invalid status: ${gate.status}`);
  }
  if (gate.status === 'CHAIN_INTEGRITY_READY' && !gate.chain_integrity_ready) {
    errors.push('CHAIN_INTEGRITY_READY requires chain_integrity_ready=true');
  }
  if (gate.status === 'CHAIN_INTEGRITY_READY' && (!gate.integrity_hash || gate.integrity_hash.length !== 64)) {
    errors.push('CHAIN_INTEGRITY_READY requires 64-char integrity_hash');
  }
  return { valid: errors.length === 0, errors };
}

export function renderRealRepoPatchChainIntegrityGate(gate) {
  if (!gate || typeof gate !== 'object') return '[ChainIntegrityGate: null]';
  const lines = [
    `=== Real Repo Patch Chain Integrity Gate ${SCHEMA_VERSION} ===`,
    `Status              : ${gate.status}`,
    `Chain ID            : ${gate.chain_id ?? 'N/A'}`,
    `Stages Validated    : ${gate.stages_validated}/${REQUIRED_STAGES.length}`,
    `Integrity Hash      : ${gate.integrity_hash ?? 'N/A'}`,
    `Integrity Ready     : ${gate.chain_integrity_ready}`,
    `Prod Touched        : ${gate.production_touched}`,
  ];
  if (gate.integrity_errors && gate.integrity_errors.length) {
    lines.push(`Errors              : ${gate.integrity_errors.slice(0, 3).join('; ')}${gate.integrity_errors.length > 3 ? '...' : ''}`);
  }
  lines.push('--- REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable ---');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-repo-patch-chain-integrity-gate.mjs')) {
  const demo = buildRealRepoPatchChainIntegrityGate({ chain_id: 'chain-demo' });
  console.log(renderRealRepoPatchChainIntegrityGate(demo));
}
