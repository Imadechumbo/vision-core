#!/usr/bin/env node
/**
 * Tests — First Real Human-Approved Local Execution Drill V161.0
 */

import {
  buildFirstRealHumanApprovedLocalExecutionDrill,
  validateFirstRealHumanApprovedLocalExecutionDrill,
  renderFirstRealHumanApprovedLocalExecutionDrill,
  FIRST_REAL_LOCAL_EXECUTION_DRILL_STATUSES,
} from '../first-real-human-approved-local-execution-drill.mjs';

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
  drill_id: 'drill-v161-001',
  baseline_v160_confirmed: true,
  anti_hallucination_confirmed: true,
  human_approval_verified: true,
  human_approval_token: 'token-abc-123',
  pass_gold_verified: true,
  evidence_receipt_id: 'receipt-xyz-001',
  snapshot_ready: true,
  rollback_ready: true,
  local_only: true,
  touched_files: ['tools/some-module.mjs'],
  initiated_at: '2026-05-21T10:00:00.000Z',
};

console.log('\n=== first-real-human-approved-local-execution-drill tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildFirstRealHumanApprovedLocalExecutionDrill(null);
  assert('null → BLOCKED_INPUT', r.drill_status === 'FIRST_REAL_LOCAL_DRILL_BLOCKED_INPUT');
  assert('null: production_touched=false', r.production_touched === false);
  assert('null: execution_performed=false', r.execution_performed === false);
  assert('null: stable_promoted=false', r.stable_promoted === false);
  assert('null: deploy_performed=false', r.deploy_performed === false);
  assert('null: release_performed=false', r.release_performed === false);
  assert('null: local_only=true', r.local_only === true);
}
{
  const r = buildFirstRealHumanApprovedLocalExecutionDrill({});
  assert('empty obj → BLOCKED_INPUT', r.drill_status === 'FIRST_REAL_LOCAL_DRILL_BLOCKED_INPUT');
}
{
  const r = buildFirstRealHumanApprovedLocalExecutionDrill({ drill_id: '  ' });
  assert('blank drill_id → BLOCKED_INPUT', r.drill_status === 'FIRST_REAL_LOCAL_DRILL_BLOCKED_INPUT');
}
{
  const r = buildFirstRealHumanApprovedLocalExecutionDrill({
    ...VALID_INPUT,
    local_only: false,
  });
  assert('local_only=false → BLOCKED_INPUT', r.drill_status === 'FIRST_REAL_LOCAL_DRILL_BLOCKED_INPUT');
  assert('local_only=false: blocked_reason set', typeof r.blocked_reason === 'string');
  assert('local_only=false: production_touched=false', r.production_touched === false);
}
{
  const r = buildFirstRealHumanApprovedLocalExecutionDrill({
    ...VALID_INPUT,
    touched_files: ['tools/ok.mjs', '.env'],
  });
  assert('forbidden file .env → BLOCKED_INPUT', r.drill_status === 'FIRST_REAL_LOCAL_DRILL_BLOCKED_INPUT');
  assert('forbidden file: forbidden_files_detected present', Array.isArray(r.forbidden_files_detected));
}
{
  const r = buildFirstRealHumanApprovedLocalExecutionDrill({
    ...VALID_INPUT,
    touched_files: ['deploy.sh'],
  });
  assert('forbidden deploy.sh → BLOCKED_INPUT', r.drill_status === 'FIRST_REAL_LOCAL_DRILL_BLOCKED_INPUT');
}

// --- blocked baseline ---
console.log('\n--- blocked baseline ---');
{
  const r = buildFirstRealHumanApprovedLocalExecutionDrill({
    ...VALID_INPUT,
    baseline_v160_confirmed: false,
  });
  assert('no baseline → BLOCKED_BASELINE', r.drill_status === 'FIRST_REAL_LOCAL_DRILL_BLOCKED_BASELINE');
  assert('no baseline: production_touched=false', r.production_touched === false);
  assert('no baseline: execution_performed=false', r.execution_performed === false);
}
{
  const r = buildFirstRealHumanApprovedLocalExecutionDrill({
    ...VALID_INPUT,
    anti_hallucination_confirmed: false,
  });
  assert('no anti-hallucination → BLOCKED_BASELINE', r.drill_status === 'FIRST_REAL_LOCAL_DRILL_BLOCKED_BASELINE');
}

// --- blocked human approval ---
console.log('\n--- blocked human approval ---');
{
  const r = buildFirstRealHumanApprovedLocalExecutionDrill({
    ...VALID_INPUT,
    human_approval_verified: false,
  });
  assert('no human approval → BLOCKED_HUMAN_APPROVAL', r.drill_status === 'FIRST_REAL_LOCAL_DRILL_BLOCKED_HUMAN_APPROVAL');
  assert('no approval: production_touched=false', r.production_touched === false);
}
{
  const r = buildFirstRealHumanApprovedLocalExecutionDrill({
    ...VALID_INPUT,
    human_approval_token: null,
  });
  assert('null token → BLOCKED_HUMAN_APPROVAL', r.drill_status === 'FIRST_REAL_LOCAL_DRILL_BLOCKED_HUMAN_APPROVAL');
}
{
  const r = buildFirstRealHumanApprovedLocalExecutionDrill({
    ...VALID_INPUT,
    pass_gold_verified: false,
  });
  assert('pass_gold_verified=false → BLOCKED_HUMAN_APPROVAL', r.drill_status === 'FIRST_REAL_LOCAL_DRILL_BLOCKED_HUMAN_APPROVAL');
}
{
  const r = buildFirstRealHumanApprovedLocalExecutionDrill({
    ...VALID_INPUT,
    evidence_receipt_id: null,
  });
  assert('no evidence_receipt_id → BLOCKED_HUMAN_APPROVAL', r.drill_status === 'FIRST_REAL_LOCAL_DRILL_BLOCKED_HUMAN_APPROVAL');
}

// --- blocked snapshot ---
console.log('\n--- blocked snapshot ---');
{
  const r = buildFirstRealHumanApprovedLocalExecutionDrill({
    ...VALID_INPUT,
    snapshot_ready: false,
  });
  assert('snapshot_ready=false → BLOCKED_SNAPSHOT', r.drill_status === 'FIRST_REAL_LOCAL_DRILL_BLOCKED_SNAPSHOT');
  assert('blocked snapshot: execution_performed=false', r.execution_performed === false);
  assert('blocked snapshot: production_touched=false', r.production_touched === false);
}

// --- blocked rollback ---
console.log('\n--- blocked rollback ---');
{
  const r = buildFirstRealHumanApprovedLocalExecutionDrill({
    ...VALID_INPUT,
    rollback_ready: false,
  });
  assert('rollback_ready=false → BLOCKED_ROLLBACK', r.drill_status === 'FIRST_REAL_LOCAL_DRILL_BLOCKED_ROLLBACK');
  assert('blocked rollback: execution_performed=false', r.execution_performed === false);
  assert('blocked rollback: production_touched=false', r.production_touched === false);
}

// --- ready ---
console.log('\n--- ready ---');
{
  const r = buildFirstRealHumanApprovedLocalExecutionDrill(VALID_INPUT);
  assert('all valid → READY', r.drill_status === 'FIRST_REAL_LOCAL_DRILL_READY');
  assert('ready: schema_version=v161.0', r.schema_version === 'v161.0');
  assert('ready: first_real_local_execution_drill_ready=true', r.first_real_local_execution_drill_ready === true);
  assert('ready: drill_id propagated', r.drill_id === 'drill-v161-001');
  assert('ready: drill_id_hash is sha256', typeof r.drill_id_hash === 'string' && r.drill_id_hash.length === 64);
  assert('ready: approval_token_hash set', typeof r.approval_token_hash === 'string' && r.approval_token_hash.length === 64);
  assert('ready: human_approval_token NOT in output', !('human_approval_token' in r));
  assert('ready: baseline_v160_confirmed=true', r.baseline_v160_confirmed === true);
  assert('ready: anti_hallucination_confirmed=true', r.anti_hallucination_confirmed === true);
  assert('ready: human_approval_verified=true', r.human_approval_verified === true);
  assert('ready: pass_gold_confirmed=true', r.pass_gold_confirmed === true);
  assert('ready: evidence_receipt_confirmed=true', r.evidence_receipt_confirmed === true);
  assert('ready: snapshot_confirmed=true', r.snapshot_confirmed === true);
  assert('ready: rollback_confirmed=true', r.rollback_confirmed === true);
  assert('ready: local_only=true', r.local_only === true);
  assert('ready: production_touched=false', r.production_touched === false);
  assert('ready: local_execution_proof_required=true', r.local_execution_proof_required === true);
  assert('ready: rollback_drill_required=true', r.rollback_drill_required === true);
  assert('ready: future_production_execution_required=true', r.future_production_execution_required === true);
  assert('ready: execution_performed=false', r.execution_performed === false);
  assert('ready: stable_promoted=false', r.stable_promoted === false);
  assert('ready: deploy_performed=false', r.deploy_performed === false);
  assert('ready: release_performed=false', r.release_performed === false);
}

// --- executed local only ---
console.log('\n--- executed local only ---');
{
  const r = buildFirstRealHumanApprovedLocalExecutionDrill({
    ...VALID_INPUT,
    executed_local: true,
  });
  assert('executed_local=true → EXECUTED_LOCAL_ONLY', r.drill_status === 'FIRST_REAL_LOCAL_DRILL_EXECUTED_LOCAL_ONLY');
  assert('executed: first_real_local_execution_drill_ready=true', r.first_real_local_execution_drill_ready === true);
  assert('executed: local_execution_confirmed=true', r.local_execution_confirmed === true);
  assert('executed: rollback_drill_pending=true', r.rollback_drill_pending === true);
  assert('executed: production_touched=false', r.production_touched === false);
  assert('executed: execution_performed=false', r.execution_performed === false);
  assert('executed: stable_promoted=false', r.stable_promoted === false);
  assert('executed: deploy_performed=false', r.deploy_performed === false);
  assert('executed: release_performed=false', r.release_performed === false);
  assert('executed: local_only=true', r.local_only === true);
  assert('executed: schema_version=v161.0', r.schema_version === 'v161.0');
}

// --- deterministic hash ---
console.log('\n--- deterministic hash ---');
{
  const r1 = buildFirstRealHumanApprovedLocalExecutionDrill(VALID_INPUT);
  const r2 = buildFirstRealHumanApprovedLocalExecutionDrill(VALID_INPUT);
  assert('drill_id_hash deterministic', r1.drill_id_hash === r2.drill_id_hash);
  const r3 = buildFirstRealHumanApprovedLocalExecutionDrill({
    ...VALID_INPUT,
    drill_id: 'drill-v161-002',
  });
  assert('different drill_id → different hash', r3.drill_id_hash !== r1.drill_id_hash);

  const noTs = buildFirstRealHumanApprovedLocalExecutionDrill({
    ...VALID_INPUT,
    initiated_at: undefined,
  });
  assert('no initiated_at → auto ISO set', typeof noTs.initiated_at === 'string');
}

// --- REGRA ABSOLUTA ---
console.log('\n--- REGRA ABSOLUTA ---');
const allStatuses = [
  { ...VALID_INPUT, baseline_v160_confirmed: false },
  { ...VALID_INPUT, human_approval_verified: false },
  { ...VALID_INPUT, snapshot_ready: false },
  { ...VALID_INPUT, rollback_ready: false },
  VALID_INPUT,
  { ...VALID_INPUT, executed_local: true },
];
allStatuses.forEach((inp) => {
  const r = buildFirstRealHumanApprovedLocalExecutionDrill(inp);
  assert(`${r.drill_status}: production_touched=false`, r.production_touched === false);
  assert(`${r.drill_status}: execution_performed=false`, r.execution_performed === false);
  assert(`${r.drill_status}: stable_promoted=false`, r.stable_promoted === false);
  assert(`${r.drill_status}: deploy_performed=false`, r.deploy_performed === false);
  assert(`${r.drill_status}: release_performed=false`, r.release_performed === false);
  assert(`${r.drill_status}: local_only=true`, r.local_only === true);
});

// --- validate ---
console.log('\n--- validate ---');
{
  const ready = buildFirstRealHumanApprovedLocalExecutionDrill(VALID_INPUT);
  const v = validateFirstRealHumanApprovedLocalExecutionDrill(ready);
  assert('validate ready → valid=true', v.valid === true);
  assert('validate ready: no errors', v.errors.length === 0);
}
{
  const blocked = buildFirstRealHumanApprovedLocalExecutionDrill({ ...VALID_INPUT, baseline_v160_confirmed: false });
  const v = validateFirstRealHumanApprovedLocalExecutionDrill(blocked);
  assert('validate blocked struct → valid=true', v.valid === true);
}
{
  const v = validateFirstRealHumanApprovedLocalExecutionDrill(null);
  assert('validate null → invalid', v.valid === false);
}
{
  const tampered = { ...buildFirstRealHumanApprovedLocalExecutionDrill(VALID_INPUT), production_touched: true };
  const v = validateFirstRealHumanApprovedLocalExecutionDrill(tampered);
  assert('tampered production_touched → invalid', v.valid === false);
}
{
  const tampered = { ...buildFirstRealHumanApprovedLocalExecutionDrill(VALID_INPUT), execution_performed: true };
  const v = validateFirstRealHumanApprovedLocalExecutionDrill(tampered);
  assert('tampered execution_performed → invalid', v.valid === false);
}
{
  const tampered = { ...buildFirstRealHumanApprovedLocalExecutionDrill(VALID_INPUT), stable_promoted: true };
  const v = validateFirstRealHumanApprovedLocalExecutionDrill(tampered);
  assert('tampered stable_promoted → invalid', v.valid === false);
}
{
  const tampered = { ...buildFirstRealHumanApprovedLocalExecutionDrill(VALID_INPUT), local_only: false };
  const v = validateFirstRealHumanApprovedLocalExecutionDrill(tampered);
  assert('tampered local_only=false → invalid', v.valid === false);
}
{
  const executed = buildFirstRealHumanApprovedLocalExecutionDrill({ ...VALID_INPUT, executed_local: true });
  const v = validateFirstRealHumanApprovedLocalExecutionDrill(executed);
  assert('validate executed → valid=true', v.valid === true);
}

// --- render ---
console.log('\n--- render ---');
{
  const ready = buildFirstRealHumanApprovedLocalExecutionDrill(VALID_INPUT);
  const rendered = renderFirstRealHumanApprovedLocalExecutionDrill(ready);
  assert('render returns string', typeof rendered === 'string');
  assert('render shows READY', rendered.includes('FIRST_REAL_LOCAL_DRILL_READY'));
  assert('render shows REGRA', rendered.includes('REGRA ABSOLUTA'));
  assert('render shows drill_id', rendered.includes('drill-v161-001'));
  assert('render shows production_touched', rendered.includes('production_touched'));
}
{
  const blocked = buildFirstRealHumanApprovedLocalExecutionDrill({ ...VALID_INPUT, baseline_v160_confirmed: false });
  const rendered = renderFirstRealHumanApprovedLocalExecutionDrill(blocked);
  assert('blocked render shows BLOCKED', rendered.includes('BLOCKED'));
  assert('blocked render shows blocked_reason', rendered.includes('blocked_reason'));
}
{
  const rendered = renderFirstRealHumanApprovedLocalExecutionDrill(null);
  assert('render null graceful', typeof rendered === 'string');
}

// --- exports ---
console.log('\n--- exports ---');
assert('STATUSES is array', Array.isArray(FIRST_REAL_LOCAL_EXECUTION_DRILL_STATUSES));
assert('STATUSES length=8', FIRST_REAL_LOCAL_EXECUTION_DRILL_STATUSES.length === 8);
assert('has BLOCKED_INPUT', FIRST_REAL_LOCAL_EXECUTION_DRILL_STATUSES.includes('FIRST_REAL_LOCAL_DRILL_BLOCKED_INPUT'));
assert('has BLOCKED_BASELINE', FIRST_REAL_LOCAL_EXECUTION_DRILL_STATUSES.includes('FIRST_REAL_LOCAL_DRILL_BLOCKED_BASELINE'));
assert('has BLOCKED_HUMAN_APPROVAL', FIRST_REAL_LOCAL_EXECUTION_DRILL_STATUSES.includes('FIRST_REAL_LOCAL_DRILL_BLOCKED_HUMAN_APPROVAL'));
assert('has BLOCKED_SNAPSHOT', FIRST_REAL_LOCAL_EXECUTION_DRILL_STATUSES.includes('FIRST_REAL_LOCAL_DRILL_BLOCKED_SNAPSHOT'));
assert('has BLOCKED_ROLLBACK', FIRST_REAL_LOCAL_EXECUTION_DRILL_STATUSES.includes('FIRST_REAL_LOCAL_DRILL_BLOCKED_ROLLBACK'));
assert('has READY', FIRST_REAL_LOCAL_EXECUTION_DRILL_STATUSES.includes('FIRST_REAL_LOCAL_DRILL_READY'));
assert('has EXECUTED_LOCAL_ONLY', FIRST_REAL_LOCAL_EXECUTION_DRILL_STATUSES.includes('FIRST_REAL_LOCAL_DRILL_EXECUTED_LOCAL_ONLY'));
assert('has ROLLBACK_READY', FIRST_REAL_LOCAL_EXECUTION_DRILL_STATUSES.includes('FIRST_REAL_LOCAL_DRILL_ROLLBACK_READY'));

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
