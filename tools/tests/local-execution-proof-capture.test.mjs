#!/usr/bin/env node
/**
 * Tests — Local Execution Proof Capture V162.0
 */

import {
  buildLocalExecutionProofCapture,
  validateLocalExecutionProofCapture,
  renderLocalExecutionProofCapture,
  LOCAL_EXECUTION_PROOF_CAPTURE_STATUSES,
} from '../local-execution-proof-capture.mjs';

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label}`);
    failed++;
  }
}

const VALID_INPUT = {
  proof_id: 'proof-v162-001',
  drill_id: 'drill-v161-001',
  mission_id: 'mission-001',
  command_hash: 'abc123def456',
  command_text_redacted: 'node tools/[REDACTED].mjs --dry-run',
  allowed_working_directory: '.vision/sandbox',
  allowed_files: ['tools/sandbox-module.mjs'],
  forbidden_files: [],
  touched_files: ['tools/sandbox-module.mjs'],
  stdout_hash: 'stdout-hash-001',
  stderr_hash: 'stderr-hash-001',
  exit_code: 0,
  started_at: '2026-05-21T10:00:00.000Z',
  finished_at: '2026-05-21T10:00:01.000Z',
  duration_ms: 1000,
  before_hash: 'before-hash-001',
  after_hash: 'after-hash-001',
  local_only: true,
  production_touched: false,
  drill_status: 'FIRST_REAL_LOCAL_DRILL_EXECUTED_LOCAL_ONLY',
  human_approval_verified: true,
  baseline_v160_confirmed: true,
  anti_hallucination_confirmed: true,
  pass_gold_confirmed: true,
  evidence_receipt_confirmed: true,
};

console.log('\n=== local-execution-proof-capture tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(LOCAL_EXECUTION_PROOF_CAPTURE_STATUSES));
assert('STATUSES has CAPTURED', LOCAL_EXECUTION_PROOF_CAPTURE_STATUSES.includes('LOCAL_EXECUTION_PROOF_CAPTURED'));
assert('STATUSES has BLOCKED_INPUT', LOCAL_EXECUTION_PROOF_CAPTURE_STATUSES.includes('LOCAL_EXECUTION_PROOF_BLOCKED_INPUT'));
assert('STATUSES has BLOCKED_DRILL', LOCAL_EXECUTION_PROOF_CAPTURE_STATUSES.includes('LOCAL_EXECUTION_PROOF_BLOCKED_DRILL'));
assert('STATUSES has INVALID', LOCAL_EXECUTION_PROOF_CAPTURE_STATUSES.includes('LOCAL_EXECUTION_PROOF_INVALID'));
assert('buildLocalExecutionProofCapture is function', typeof buildLocalExecutionProofCapture === 'function');
assert('validateLocalExecutionProofCapture is function', typeof validateLocalExecutionProofCapture === 'function');
assert('renderLocalExecutionProofCapture is function', typeof renderLocalExecutionProofCapture === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildLocalExecutionProofCapture(null);
  assert('null → BLOCKED_INPUT', r.proof_status === 'LOCAL_EXECUTION_PROOF_BLOCKED_INPUT');
  assert('null: production_touched=false', r.production_touched === false);
  assert('null: deploy_performed=false', r.deploy_performed === false);
  assert('null: stable_promoted=false', r.stable_promoted === false);
  assert('null: release_performed=false', r.release_performed === false);
  assert('null: local_only=true', r.local_only === true);
  assert('null: production_execution_blocked=true', r.production_execution_blocked === true);
}
{
  const r = buildLocalExecutionProofCapture({});
  assert('empty obj → BLOCKED_INPUT', r.proof_status === 'LOCAL_EXECUTION_PROOF_BLOCKED_INPUT');
}
{
  const r = buildLocalExecutionProofCapture({ proof_id: '  ' });
  assert('blank proof_id → BLOCKED_INPUT', r.proof_status === 'LOCAL_EXECUTION_PROOF_BLOCKED_INPUT');
}
{
  const r = buildLocalExecutionProofCapture({ proof_id: 'p1', drill_id: '  ' });
  assert('blank drill_id → BLOCKED_INPUT', r.proof_status === 'LOCAL_EXECUTION_PROOF_BLOCKED_INPUT');
}
{
  const r = buildLocalExecutionProofCapture({ proof_id: 'p1', drill_id: 'd1', mission_id: '  ' });
  assert('blank mission_id → BLOCKED_INPUT', r.proof_status === 'LOCAL_EXECUTION_PROOF_BLOCKED_INPUT');
}

// --- blocked command ---
console.log('--- blocked command ---');
{
  const r = buildLocalExecutionProofCapture({ ...VALID_INPUT, command_hash: '' });
  assert('empty command_hash → BLOCKED_COMMAND', r.proof_status === 'LOCAL_EXECUTION_PROOF_BLOCKED_COMMAND');
}
{
  const r = buildLocalExecutionProofCapture({ ...VALID_INPUT, command_text_redacted: null });
  assert('null command_text_redacted → BLOCKED_COMMAND', r.proof_status === 'LOCAL_EXECUTION_PROOF_BLOCKED_COMMAND');
}

// --- blocked drill ---
console.log('--- blocked drill ---');
{
  const r = buildLocalExecutionProofCapture({ ...VALID_INPUT, drill_status: 'UNKNOWN_STATUS' });
  assert('invalid drill_status → BLOCKED_DRILL', r.proof_status === 'LOCAL_EXECUTION_PROOF_BLOCKED_DRILL');
}
{
  const r = buildLocalExecutionProofCapture({ ...VALID_INPUT, human_approval_verified: false });
  assert('human_approval=false → BLOCKED_DRILL', r.proof_status === 'LOCAL_EXECUTION_PROOF_BLOCKED_DRILL');
}
{
  const r = buildLocalExecutionProofCapture({ ...VALID_INPUT, baseline_v160_confirmed: false });
  assert('baseline_v160=false → BLOCKED_DRILL', r.proof_status === 'LOCAL_EXECUTION_PROOF_BLOCKED_DRILL');
}
{
  const r = buildLocalExecutionProofCapture({ ...VALID_INPUT, anti_hallucination_confirmed: false });
  assert('anti_hallucination=false → BLOCKED_DRILL', r.proof_status === 'LOCAL_EXECUTION_PROOF_BLOCKED_DRILL');
}
{
  const r = buildLocalExecutionProofCapture({ ...VALID_INPUT, pass_gold_confirmed: false });
  assert('pass_gold=false → BLOCKED_DRILL', r.proof_status === 'LOCAL_EXECUTION_PROOF_BLOCKED_DRILL');
}
{
  const r = buildLocalExecutionProofCapture({ ...VALID_INPUT, evidence_receipt_confirmed: false });
  assert('evidence_receipt=false → BLOCKED_DRILL', r.proof_status === 'LOCAL_EXECUTION_PROOF_BLOCKED_DRILL');
}

// --- blocked scope ---
console.log('--- blocked scope ---');
{
  const r = buildLocalExecutionProofCapture({ ...VALID_INPUT, local_only: false });
  assert('local_only=false → BLOCKED_SCOPE', r.proof_status === 'LOCAL_EXECUTION_PROOF_BLOCKED_SCOPE');
  assert('local_only=false: production_touched=false', r.production_touched === false);
}
{
  const r = buildLocalExecutionProofCapture({ ...VALID_INPUT, production_touched: true });
  assert('production_touched=true → BLOCKED_SCOPE', r.proof_status === 'LOCAL_EXECUTION_PROOF_BLOCKED_SCOPE');
}
{
  const r = buildLocalExecutionProofCapture({ ...VALID_INPUT, touched_files: ['tools/ok.mjs', '.env'] });
  assert('forbidden file .env → BLOCKED_SCOPE', r.proof_status === 'LOCAL_EXECUTION_PROOF_BLOCKED_SCOPE');
  assert('forbidden: detected list populated', Array.isArray(r.forbidden_files_detected) && r.forbidden_files_detected.length > 0);
}
{
  const r = buildLocalExecutionProofCapture({ ...VALID_INPUT, touched_files: ['deploy.sh'] });
  assert('forbidden file deploy.sh → BLOCKED_SCOPE', r.proof_status === 'LOCAL_EXECUTION_PROOF_BLOCKED_SCOPE');
}

// --- captured local proof ---
console.log('--- captured local proof ---');
{
  const r = buildLocalExecutionProofCapture(VALID_INPUT);
  assert('valid input exit_code=0 → CAPTURED', r.proof_status === 'LOCAL_EXECUTION_PROOF_CAPTURED');
  assert('captured: local_execution_proof_captured=true', r.local_execution_proof_captured === true);
  assert('captured: local_only=true', r.local_only === true);
  assert('captured: production_touched=false', r.production_touched === false);
  assert('captured: execution_proven_local_only=true', r.execution_proven_local_only === true);
  assert('captured: production_execution_blocked=true', r.production_execution_blocked === true);
  assert('captured: deploy_performed=false', r.deploy_performed === false);
  assert('captured: stable_promoted=false', r.stable_promoted === false);
  assert('captured: release_performed=false', r.release_performed === false);
  assert('captured: schema_version=v162.0', r.schema_version === 'v162.0');
  assert('captured: proof_id set', r.proof_id === 'proof-v162-001');
  assert('captured: proof_id_hash is string', typeof r.proof_id_hash === 'string' && r.proof_id_hash.length > 0);
  assert('captured: before_hash set', r.before_hash === 'before-hash-001');
  assert('captured: after_hash set', r.after_hash === 'after-hash-001');
  assert('captured: changed_files_count=1', r.changed_files_count === 1);
  assert('captured: touched_files array', Array.isArray(r.touched_files));
  assert('captured: forbidden_files_detected empty', r.forbidden_files_detected.length === 0);
}

// --- invalid exit_code ---
console.log('--- invalid exit_code ---');
{
  const r = buildLocalExecutionProofCapture({ ...VALID_INPUT, exit_code: 1 });
  assert('exit_code=1 → INVALID', r.proof_status === 'LOCAL_EXECUTION_PROOF_INVALID');
  assert('invalid: local_execution_proof_captured=false', r.local_execution_proof_captured === false);
  assert('invalid: production_touched=false', r.production_touched === false);
  assert('invalid: production_execution_blocked=true', r.production_execution_blocked === true);
  assert('invalid: deploy_performed=false', r.deploy_performed === false);
}
{
  const r = buildLocalExecutionProofCapture({ ...VALID_INPUT, exit_code: 2 });
  assert('exit_code=2 → INVALID', r.proof_status === 'LOCAL_EXECUTION_PROOF_INVALID');
}

// --- hashes deterministic ---
console.log('--- hashes deterministic ---');
{
  const r1 = buildLocalExecutionProofCapture(VALID_INPUT);
  const r2 = buildLocalExecutionProofCapture(VALID_INPUT);
  assert('proof_id_hash deterministic', r1.proof_id_hash === r2.proof_id_hash);
}

// --- READY drill_status also accepted ---
console.log('--- alternate drill_status ---');
{
  const r = buildLocalExecutionProofCapture({ ...VALID_INPUT, drill_status: 'READY', exit_code: 0 });
  assert('READY drill_status accepted', r.proof_status === 'LOCAL_EXECUTION_PROOF_CAPTURED');
}
{
  const r = buildLocalExecutionProofCapture({ ...VALID_INPUT, drill_status: 'EXECUTED_LOCAL_ONLY', exit_code: 0 });
  assert('EXECUTED_LOCAL_ONLY drill_status accepted', r.proof_status === 'LOCAL_EXECUTION_PROOF_CAPTURED');
}
{
  const r = buildLocalExecutionProofCapture({ ...VALID_INPUT, drill_status: 'FIRST_REAL_LOCAL_DRILL_READY', exit_code: 0 });
  assert('FIRST_REAL_LOCAL_DRILL_READY accepted', r.proof_status === 'LOCAL_EXECUTION_PROOF_CAPTURED');
}

// --- validate captured ---
console.log('--- validate captured ---');
{
  const r = buildLocalExecutionProofCapture(VALID_INPUT);
  const v = validateLocalExecutionProofCapture(r);
  assert('validate captured: valid=true', v.valid === true);
  assert('validate captured: no errors', v.errors.length === 0);
}

// --- validate blocked ---
console.log('--- validate blocked ---');
{
  const r = buildLocalExecutionProofCapture(null);
  const v = validateLocalExecutionProofCapture(r);
  assert('validate blocked: valid=true (invariants hold)', v.valid === true);
}
{
  const v = validateLocalExecutionProofCapture(null);
  assert('validate null: valid=false', v.valid === false);
}

// --- render captured ---
console.log('--- render captured ---');
{
  const r = buildLocalExecutionProofCapture(VALID_INPUT);
  const s = renderLocalExecutionProofCapture(r);
  assert('render captured: is string', typeof s === 'string');
  assert('render captured: contains CAPTURED', s.includes('CAPTURED'));
  assert('render captured: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
}

// --- render blocked ---
console.log('--- render blocked ---');
{
  const r = buildLocalExecutionProofCapture(null);
  const s = renderLocalExecutionProofCapture(r);
  assert('render blocked: is string', typeof s === 'string');
  assert('render blocked: contains BLOCKED', s.includes('BLOCKED'));
}
{
  const s = renderLocalExecutionProofCapture(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants deploy/stable/release false ---
console.log('--- invariants ---');
{
  const cases = [
    buildLocalExecutionProofCapture(null),
    buildLocalExecutionProofCapture({}),
    buildLocalExecutionProofCapture(VALID_INPUT),
    buildLocalExecutionProofCapture({ ...VALID_INPUT, exit_code: 1 }),
    buildLocalExecutionProofCapture({ ...VALID_INPUT, local_only: false }),
    buildLocalExecutionProofCapture({ ...VALID_INPUT, production_touched: true }),
    buildLocalExecutionProofCapture({ ...VALID_INPUT, human_approval_verified: false }),
  ];
  let allDeployFalse = cases.every(r => r.deploy_performed === false);
  let allStableFalse = cases.every(r => r.stable_promoted === false);
  let allReleaseFalse = cases.every(r => r.release_performed === false);
  let allProductionFalse = cases.every(r => r.production_touched === false);
  let allLocalOnly = cases.every(r => r.local_only === true);
  assert('all cases: deploy_performed=false', allDeployFalse);
  assert('all cases: stable_promoted=false', allStableFalse);
  assert('all cases: release_performed=false', allReleaseFalse);
  assert('all cases: production_touched=false', allProductionFalse);
  assert('all cases: local_only=true', allLocalOnly);
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
