#!/usr/bin/env node
/**
 * Real Repo Patch Baseline — V178.0 (Capstone)
 * Validates full pipeline readiness. Does NOT deploy, promote, or release.
 */

export const REAL_REPO_PATCH_BASELINE_STATUSES = [
  'REPO_PATCH_BASELINE_BLOCKED_INPUT',
  'REPO_PATCH_BASELINE_BLOCKED_CANDIDATE',
  'REPO_PATCH_BASELINE_READY',
  'REPO_PATCH_BASELINE_FAIL',
];

const SCHEMA_VERSION = 'v178.0';

const PIPELINE_STAGES = [
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
  'pass_gold_candidate',
];

function blockedInput(reason, overrides = {}) {
  return {
    schema_version: SCHEMA_VERSION,
    baseline_id: null,
    pipeline_stages: PIPELINE_STAGES,
    stages_ready: [],
    all_stages_passed: false,
    pass_gold_candidate_ready: false,
    real_repo_patch_baseline_ready: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    status: 'REPO_PATCH_BASELINE_BLOCKED_INPUT',
    errors: [reason],
    ...overrides,
  };
}

export function buildRealRepoPatchBaseline(input) {
  if (!input || typeof input !== 'object') {
    return blockedInput('input is null or not an object');
  }

  const { baseline_id, pass_gold_candidate_ready } = input;

  if (!baseline_id || typeof baseline_id !== 'string' || !baseline_id.trim()) {
    return blockedInput('Missing or invalid baseline_id');
  }

  if (input.production_touched === true) {
    return blockedInput('production_touched must be false');
  }
  if (input.local_only === false) {
    return blockedInput('local_only must be true');
  }

  const stages_ready = (input.stages_ready && Array.isArray(input.stages_ready))
    ? input.stages_ready.filter(s => PIPELINE_STAGES.includes(s))
    : [];

  const all_stages_passed = PIPELINE_STAGES.every(s => stages_ready.includes(s));

  let status = 'REPO_PATCH_BASELINE_BLOCKED_CANDIDATE';
  let baselineReady = false;

  if (!pass_gold_candidate_ready || !all_stages_passed) {
    status = 'REPO_PATCH_BASELINE_BLOCKED_CANDIDATE';
  } else {
    status = 'REPO_PATCH_BASELINE_READY';
    baselineReady = true;
  }

  return {
    schema_version: SCHEMA_VERSION,
    baseline_id,
    pipeline_stages: PIPELINE_STAGES,
    stages_ready,
    all_stages_passed,
    pass_gold_candidate_ready: !!pass_gold_candidate_ready,
    real_repo_patch_baseline_ready: baselineReady,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    status,
    errors: [],
  };
}

export function validateRealRepoPatchBaseline(baseline) {
  if (!baseline || typeof baseline !== 'object') {
    return { valid: false, errors: ['baseline is null or not an object'] };
  }
  const errors = [];
  if (baseline.production_touched !== false) errors.push('production_touched must be false');
  if (baseline.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (baseline.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (baseline.release_performed !== false) errors.push('release_performed must be false');
  if (!REAL_REPO_PATCH_BASELINE_STATUSES.includes(baseline.status)) {
    errors.push(`Invalid status: ${baseline.status}`);
  }
  if (baseline.status === 'REPO_PATCH_BASELINE_READY' && !baseline.real_repo_patch_baseline_ready) {
    errors.push('BASELINE_READY requires real_repo_patch_baseline_ready=true');
  }
  return { valid: errors.length === 0, errors };
}

export function renderRealRepoPatchBaseline(baseline) {
  if (!baseline || typeof baseline !== 'object') return '[RealRepoPatchBaseline: null]';
  const lines = [
    `=== Real Repo Patch Baseline ${SCHEMA_VERSION} ===`,
    `Status              : ${baseline.status}`,
    `Baseline ID         : ${baseline.baseline_id ?? 'N/A'}`,
    `Stages Ready        : ${(baseline.stages_ready || []).length}/${(baseline.pipeline_stages || []).length}`,
    `All Stages Passed   : ${baseline.all_stages_passed}`,
    `PG Candidate Ready  : ${baseline.pass_gold_candidate_ready}`,
    `Baseline Ready      : ${baseline.real_repo_patch_baseline_ready}`,
    `Prod Touched        : ${baseline.production_touched}`,
  ];
  if (baseline.errors && baseline.errors.length) lines.push(`Errors              : ${baseline.errors.join('; ')}`);
  lines.push('--- REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable ---');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-repo-patch-baseline.mjs')) {
  const demo = buildRealRepoPatchBaseline({
    baseline_id: 'baseline-demo-001',
    pass_gold_candidate_ready: true,
    stages_ready: PIPELINE_STAGES,
    production_touched: false,
    local_only: true,
  });
  console.log(renderRealRepoPatchBaseline(demo));
  const v = validateRealRepoPatchBaseline(demo);
  console.log(`\nValidation: ${v.valid ? 'OK' : 'FAIL'}`);
  if (!v.valid) console.error(v.errors);
}
