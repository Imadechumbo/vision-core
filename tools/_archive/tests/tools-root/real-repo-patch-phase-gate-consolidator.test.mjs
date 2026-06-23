#!/usr/bin/env node
/**
 * Tests — Real Repo Patch Phase Gate Consolidator V190.0
 */

import {
  buildRealRepoPatchPhaseGateConsolidator,
  validateRealRepoPatchPhaseGateConsolidator,
  renderRealRepoPatchPhaseGateConsolidator,
  REAL_REPO_PATCH_PHASE_GATE_STATUSES,
} from '../real-repo-patch-phase-gate-consolidator.mjs';

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

const FINAL_MESSAGE =
  'V171-V190 certified. Real release remains blocked until explicit V191+ manual release authority.';

const VALID_INPUT = {
  gate_id: 'gate-001',
  cert_id: 'cert-001',
  certification_ready: true,
};

console.log('\n=== real-repo-patch-phase-gate-consolidator tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(REAL_REPO_PATCH_PHASE_GATE_STATUSES));
assert('has PHASE_GATE_BLOCKED_INPUT', REAL_REPO_PATCH_PHASE_GATE_STATUSES.includes('PHASE_GATE_BLOCKED_INPUT'));
assert('has PHASE_GATE_BLOCKED_CERTIFICATION', REAL_REPO_PATCH_PHASE_GATE_STATUSES.includes('PHASE_GATE_BLOCKED_CERTIFICATION'));
assert('has PHASE_GATE_FAIL', REAL_REPO_PATCH_PHASE_GATE_STATUSES.includes('PHASE_GATE_FAIL'));
assert('has PHASE_GATE_READY', REAL_REPO_PATCH_PHASE_GATE_STATUSES.includes('PHASE_GATE_READY'));
assert('build is function', typeof buildRealRepoPatchPhaseGateConsolidator === 'function');
assert('validate is function', typeof validateRealRepoPatchPhaseGateConsolidator === 'function');
assert('render is function', typeof renderRealRepoPatchPhaseGateConsolidator === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildRealRepoPatchPhaseGateConsolidator(null);
  assert('null → BLOCKED_INPUT', r.status === 'PHASE_GATE_BLOCKED_INPUT');
  assert('null: release_allowed=false', r.release_allowed === false);
  assert('null: production_touched=false', r.production_touched === false);
  assert('null: deploy_performed=false', r.deploy_performed === false);
  assert('null: stable_promoted=false', r.stable_promoted === false);
  assert('null: release_performed=false', r.release_performed === false);
  assert('null: phase_modules empty', r.phase_modules.length === 0);
  assert('null: final_message=null', r.final_message === null);
}
{
  const r = buildRealRepoPatchPhaseGateConsolidator({});
  assert('no gate_id → BLOCKED_INPUT', r.status === 'PHASE_GATE_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchPhaseGateConsolidator({ gate_id: 'g' });
  assert('no cert_id → BLOCKED_INPUT', r.status === 'PHASE_GATE_BLOCKED_INPUT');
}

// --- blocked certification ---
console.log('--- blocked certification ---');
{
  const r = buildRealRepoPatchPhaseGateConsolidator({ ...VALID_INPUT, certification_ready: false });
  assert('cert_ready=false → BLOCKED_CERTIFICATION', r.status === 'PHASE_GATE_BLOCKED_CERTIFICATION');
  assert('blocked_cert: release_allowed=false', r.release_allowed === false);
  assert('blocked_cert: phase_modules empty', r.phase_modules.length === 0);
  assert('blocked_cert: gate_hash=null', r.gate_hash === null);
}
{
  const r = buildRealRepoPatchPhaseGateConsolidator({ ...VALID_INPUT, certification_ready: undefined });
  assert('cert_ready=undefined → BLOCKED_CERTIFICATION', r.status === 'PHASE_GATE_BLOCKED_CERTIFICATION');
}

// --- fail ---
console.log('--- fail ---');
{
  const r = buildRealRepoPatchPhaseGateConsolidator({
    ...VALID_INPUT,
    missing_modules: ['test_lane'],
  });
  assert('missing_modules → PHASE_GATE_FAIL', r.status === 'PHASE_GATE_FAIL');
  assert('fail: release_allowed=false', r.release_allowed === false);
  assert('fail: gate_hash=null', r.gate_hash === null);
  assert('fail: final_message=null', r.final_message === null);
  assert('fail: errors has missing module', r.errors.some(e => e.includes('test_lane')));
}
{
  const r = buildRealRepoPatchPhaseGateConsolidator({
    ...VALID_INPUT,
    missing_modules: ['scope_contract', 'ledger'],
  });
  assert('multiple missing → PHASE_GATE_FAIL', r.status === 'PHASE_GATE_FAIL');
  assert('fail: 2 errors', r.errors.length === 2);
}

// --- ready ---
console.log('--- ready ---');
{
  const r = buildRealRepoPatchPhaseGateConsolidator(VALID_INPUT);
  assert('valid → PHASE_GATE_READY', r.status === 'PHASE_GATE_READY');
  assert('ready: schema_version=v190.0', r.schema_version === 'v190.0');
  assert('ready: gate_id set', r.gate_id === 'gate-001');
  assert('ready: cert_id set', r.cert_id === 'cert-001');
  assert('ready: phase_modules has 20', r.phase_modules.length === 20);
  assert('ready: includes scope_contract', r.phase_modules.includes('scope_contract'));
  assert('ready: includes rc_dry_run', r.phase_modules.includes('rc_dry_run'));
  assert('ready: release_allowed=false', r.release_allowed === false);
  assert('ready: gate_hash 64 chars', typeof r.gate_hash === 'string' && r.gate_hash.length === 64);
  assert('ready: final_message correct', r.final_message === FINAL_MESSAGE);
  assert('ready: errors empty', r.errors.length === 0);
  assert('ready: production_touched=false', r.production_touched === false);
  assert('ready: deploy_performed=false', r.deploy_performed === false);
  assert('ready: stable_promoted=false', r.stable_promoted === false);
  assert('ready: release_performed=false', r.release_performed === false);
}

// --- hash determinism ---
console.log('--- hash determinism ---');
{
  const r1 = buildRealRepoPatchPhaseGateConsolidator(VALID_INPUT);
  const r2 = buildRealRepoPatchPhaseGateConsolidator(VALID_INPUT);
  assert('hash deterministic', r1.gate_hash === r2.gate_hash);
  const r3 = buildRealRepoPatchPhaseGateConsolidator({ ...VALID_INPUT, gate_id: 'gate-002' });
  assert('different gate_id → different hash', r1.gate_hash !== r3.gate_hash);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildRealRepoPatchPhaseGateConsolidator(VALID_INPUT);
  const v = validateRealRepoPatchPhaseGateConsolidator(r);
  assert('validate ready: valid=true', v.valid === true);
  assert('validate ready: no errors', v.errors.length === 0);
}
{
  const r = buildRealRepoPatchPhaseGateConsolidator(null);
  const v = validateRealRepoPatchPhaseGateConsolidator(r);
  assert('validate blocked: valid=true', v.valid === true);
}
{
  const v = validateRealRepoPatchPhaseGateConsolidator(null);
  assert('validate null: valid=false', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildRealRepoPatchPhaseGateConsolidator(VALID_INPUT);
  const s = renderRealRepoPatchPhaseGateConsolidator(r);
  assert('render: is string', typeof s === 'string');
  assert('render: contains PHASE_GATE_READY', s.includes('PHASE_GATE_READY'));
  assert('render: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
  assert('render: contains V171-V190', s.includes('V171-V190'));
  assert('render: release_allowed false in output', s.includes('false'));
}
{
  const s = renderRealRepoPatchPhaseGateConsolidator(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildRealRepoPatchPhaseGateConsolidator(null),
    buildRealRepoPatchPhaseGateConsolidator({}),
    buildRealRepoPatchPhaseGateConsolidator({ ...VALID_INPUT, certification_ready: false }),
    buildRealRepoPatchPhaseGateConsolidator({ ...VALID_INPUT, missing_modules: ['ledger'] }),
    buildRealRepoPatchPhaseGateConsolidator(VALID_INPUT),
  ];
  assert('all: release_allowed=false', cases.every(r => r.release_allowed === false));
  assert('all: production_touched=false', cases.every(r => r.production_touched === false));
  assert('all: deploy_performed=false', cases.every(r => r.deploy_performed === false));
  assert('all: stable_promoted=false', cases.every(r => r.stable_promoted === false));
  assert('all: release_performed=false', cases.every(r => r.release_performed === false));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
