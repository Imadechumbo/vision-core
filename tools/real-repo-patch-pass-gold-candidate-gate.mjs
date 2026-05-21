#!/usr/bin/env node
/**
 * Real Repo Patch PASS GOLD Candidate Gate — V177.0
 * Evaluates final-report + ledger readiness for PASS GOLD candidacy.
 * Does NOT promote, deploy, or mark stable.
 */

export const REAL_REPO_PATCH_PASS_GOLD_CANDIDATE_STATUSES = [
  'REPO_PATCH_PASS_GOLD_BLOCKED_INPUT',
  'REPO_PATCH_PASS_GOLD_BLOCKED_REPORT',
  'REPO_PATCH_PASS_GOLD_CANDIDATE',
  'REPO_PATCH_PASS_GOLD_FAIL',
];

const SCHEMA_VERSION = 'v177.0';

function blockedInput(reason, overrides = {}) {
  return {
    schema_version: SCHEMA_VERSION,
    pass_gold_candidate_id: null,
    final_report_ready: false,
    ledger_ready: false,
    all_gates_passed: false,
    pass_gold_candidate_ready: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    status: 'REPO_PATCH_PASS_GOLD_BLOCKED_INPUT',
    errors: [reason],
    ...overrides,
  };
}

export function buildRealRepoPatchPassGoldCandidateGate(input) {
  if (!input || typeof input !== 'object') {
    return blockedInput('input is null or not an object');
  }

  const { pass_gold_candidate_id, final_report_ready, ledger_ready } = input;

  if (!pass_gold_candidate_id || typeof pass_gold_candidate_id !== 'string' || !pass_gold_candidate_id.trim()) {
    return blockedInput('Missing or invalid pass_gold_candidate_id');
  }

  if (input.production_touched === true) {
    return blockedInput('production_touched must be false');
  }
  if (input.local_only === false) {
    return blockedInput('local_only must be true');
  }

  let status = 'REPO_PATCH_PASS_GOLD_BLOCKED_REPORT';
  let candidateReady = false;

  if (!final_report_ready || !ledger_ready) {
    status = 'REPO_PATCH_PASS_GOLD_BLOCKED_REPORT';
  } else {
    status = 'REPO_PATCH_PASS_GOLD_CANDIDATE';
    candidateReady = true;
  }

  return {
    schema_version: SCHEMA_VERSION,
    pass_gold_candidate_id,
    final_report_ready: !!final_report_ready,
    ledger_ready: !!ledger_ready,
    all_gates_passed: candidateReady,
    pass_gold_candidate_ready: candidateReady,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    status,
    errors: [],
  };
}

export function validateRealRepoPatchPassGoldCandidateGate(gate) {
  if (!gate || typeof gate !== 'object') {
    return { valid: false, errors: ['gate is null or not an object'] };
  }
  const errors = [];
  if (gate.production_touched !== false) errors.push('production_touched must be false');
  if (gate.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (gate.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (gate.release_performed !== false) errors.push('release_performed must be false');
  if (!REAL_REPO_PATCH_PASS_GOLD_CANDIDATE_STATUSES.includes(gate.status)) {
    errors.push(`Invalid status: ${gate.status}`);
  }
  if (gate.status === 'REPO_PATCH_PASS_GOLD_CANDIDATE' && !gate.pass_gold_candidate_ready) {
    errors.push('CANDIDATE status requires pass_gold_candidate_ready=true');
  }
  return { valid: errors.length === 0, errors };
}

export function renderRealRepoPatchPassGoldCandidateGate(gate) {
  if (!gate || typeof gate !== 'object') return '[RealRepoPatchPassGoldCandidateGate: null]';
  const lines = [
    `=== Real Repo Patch PASS GOLD Candidate Gate ${SCHEMA_VERSION} ===`,
    `Status              : ${gate.status}`,
    `Candidate ID        : ${gate.pass_gold_candidate_id ?? 'N/A'}`,
    `Final Report Ready  : ${gate.final_report_ready}`,
    `Ledger Ready        : ${gate.ledger_ready}`,
    `All Gates Passed    : ${gate.all_gates_passed}`,
    `Candidate Ready     : ${gate.pass_gold_candidate_ready}`,
    `Prod Touched        : ${gate.production_touched}`,
  ];
  if (gate.errors && gate.errors.length) lines.push(`Errors              : ${gate.errors.join('; ')}`);
  lines.push('--- REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable ---');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-repo-patch-pass-gold-candidate-gate.mjs')) {
  const demo = buildRealRepoPatchPassGoldCandidateGate({
    pass_gold_candidate_id: 'pass-gold-demo-001',
    final_report_ready: true,
    ledger_ready: true,
  });
  console.log(renderRealRepoPatchPassGoldCandidateGate(demo));
  const v = validateRealRepoPatchPassGoldCandidateGate(demo);
  console.log(`\nValidation: ${v.valid ? 'OK' : 'FAIL'}`);
  if (!v.valid) console.error(v.errors);
}
