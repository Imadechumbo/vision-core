#!/usr/bin/env node

import {
  buildPreReleaseFinalVerifier,
  validatePreReleaseFinalVerifier,
  renderPreReleaseFinalVerifier,
  PRE_RELEASE_FINAL_VERIFIER_STATUSES,
} from '../pre-release-final-verifier.mjs';

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
  pre_release_verifier_id: 'verifier-001',
  release_plan_locked: true,
  tamper_detected: false,
  tag_plan_ready: true,
  go_dry_ready: true,
  phase_gate_ready: true,
  certification_ready: true,
  working_tree_clean: true,
  main_up_to_date: true,
  risk_level: 'LOW',
};

console.log('\n=== pre-release-final-verifier tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(PRE_RELEASE_FINAL_VERIFIER_STATUSES));
assert('contains PRE_RELEASE_BLOCKED_INPUT', PRE_RELEASE_FINAL_VERIFIER_STATUSES.includes('PRE_RELEASE_BLOCKED_INPUT'));
assert('contains PRE_RELEASE_BLOCKED_LOCK', PRE_RELEASE_FINAL_VERIFIER_STATUSES.includes('PRE_RELEASE_BLOCKED_LOCK'));
assert('contains PRE_RELEASE_FAIL', PRE_RELEASE_FINAL_VERIFIER_STATUSES.includes('PRE_RELEASE_FAIL'));
assert('contains PRE_RELEASE_READY', PRE_RELEASE_FINAL_VERIFIER_STATUSES.includes('PRE_RELEASE_READY'));
assert('build is function', typeof buildPreReleaseFinalVerifier === 'function');
assert('validate is function', typeof validatePreReleaseFinalVerifier === 'function');
assert('render is function', typeof renderPreReleaseFinalVerifier === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildPreReleaseFinalVerifier(null);
  assert('null -> BLOCKED_INPUT', r.status === 'PRE_RELEASE_BLOCKED_INPUT');
  assert('null: pre_release_ready=false', r.pre_release_ready === false);
  assert('null: errors non-empty', r.errors.length > 0);
}
{
  const r = buildPreReleaseFinalVerifier({});
  assert('{} -> BLOCKED_INPUT', r.status === 'PRE_RELEASE_BLOCKED_INPUT');
}
{
  const r = buildPreReleaseFinalVerifier({ pre_release_verifier_id: '' });
  assert('empty verifier_id -> BLOCKED_INPUT', r.status === 'PRE_RELEASE_BLOCKED_INPUT');
}

// --- blocked lock ---
console.log('--- blocked lock ---');
{
  const r = buildPreReleaseFinalVerifier({ ...VALID_INPUT, release_plan_locked: false });
  assert('release_plan_locked=false -> BLOCKED_LOCK', r.status === 'PRE_RELEASE_BLOCKED_LOCK');
}

// --- fail ---
console.log('--- fail ---');
{
  const r = buildPreReleaseFinalVerifier({ ...VALID_INPUT, tamper_detected: true });
  assert('tamper_detected -> FAIL', r.status === 'PRE_RELEASE_FAIL');
  assert('tamper: failed_checks non-empty', r.failed_checks.length > 0);
}
{
  const r = buildPreReleaseFinalVerifier({ ...VALID_INPUT, tag_plan_ready: false });
  assert('tag_plan_ready=false -> FAIL', r.status === 'PRE_RELEASE_FAIL');
}
{
  const r = buildPreReleaseFinalVerifier({ ...VALID_INPUT, go_dry_ready: false });
  assert('go_dry_ready=false -> FAIL', r.status === 'PRE_RELEASE_FAIL');
}
{
  const r = buildPreReleaseFinalVerifier({ ...VALID_INPUT, phase_gate_ready: false });
  assert('phase_gate_ready=false -> FAIL', r.status === 'PRE_RELEASE_FAIL');
}
{
  const r = buildPreReleaseFinalVerifier({ ...VALID_INPUT, certification_ready: false });
  assert('certification_ready=false -> FAIL', r.status === 'PRE_RELEASE_FAIL');
}
{
  const r = buildPreReleaseFinalVerifier({ ...VALID_INPUT, working_tree_clean: false });
  assert('working_tree_clean=false -> FAIL', r.status === 'PRE_RELEASE_FAIL');
}
{
  const r = buildPreReleaseFinalVerifier({ ...VALID_INPUT, main_up_to_date: false });
  assert('main_up_to_date=false -> FAIL', r.status === 'PRE_RELEASE_FAIL');
}
{
  const r = buildPreReleaseFinalVerifier({ ...VALID_INPUT, risk_level: 'BLOCKED' });
  assert('risk_level=BLOCKED -> FAIL', r.status === 'PRE_RELEASE_FAIL');
}
{
  const r = buildPreReleaseFinalVerifier({ ...VALID_INPUT, production_touched: true });
  assert('production_touched=true -> FAIL', r.status === 'PRE_RELEASE_FAIL');
}
{
  const r = buildPreReleaseFinalVerifier({ ...VALID_INPUT, deploy_performed: true });
  assert('deploy_performed=true -> FAIL', r.status === 'PRE_RELEASE_FAIL');
}
{
  const r = buildPreReleaseFinalVerifier({ ...VALID_INPUT, stable_promoted: true });
  assert('stable_promoted=true -> FAIL', r.status === 'PRE_RELEASE_FAIL');
}
{
  const r = buildPreReleaseFinalVerifier({ ...VALID_INPUT, release_performed: true });
  assert('release_performed=true -> FAIL', r.status === 'PRE_RELEASE_FAIL');
}

// --- ready ---
console.log('--- ready ---');
{
  const r = buildPreReleaseFinalVerifier(VALID_INPUT);
  assert('valid -> PRE_RELEASE_READY', r.status === 'PRE_RELEASE_READY');
  assert('ready: schema_version=v198.0', r.schema_version === 'v198.0');
  assert('ready: pre_release_verifier_id set', r.pre_release_verifier_id === 'verifier-001');
  assert('ready: pre_release_ready=true', r.pre_release_ready === true);
  assert('ready: failed_checks empty', Array.isArray(r.failed_checks) && r.failed_checks.length === 0);
  assert('ready: verifier_hash 64 chars', r.verifier_hash && r.verifier_hash.length === 64);
  assert('ready: release_allowed=false', r.release_allowed === false);
  assert('ready: deploy_allowed=false', r.deploy_allowed === false);
  assert('ready: stable_allowed=false', r.stable_allowed === false);
  assert('ready: tag_allowed=false', r.tag_allowed === false);
  assert('ready: real_execution_allowed=false', r.real_execution_allowed === false);
  assert('ready: errors empty', Array.isArray(r.errors) && r.errors.length === 0);
}

// --- hash determinism ---
console.log('--- hash determinism ---');
{
  const r1 = buildPreReleaseFinalVerifier(VALID_INPUT);
  const r2 = buildPreReleaseFinalVerifier(VALID_INPUT);
  assert('hash deterministic', r1.verifier_hash === r2.verifier_hash);
}
{
  const r = buildPreReleaseFinalVerifier({ ...VALID_INPUT, pre_release_verifier_id: 'different-id' });
  assert('different id -> different hash', r.verifier_hash !== buildPreReleaseFinalVerifier(VALID_INPUT).verifier_hash);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildPreReleaseFinalVerifier(VALID_INPUT);
  const v = validatePreReleaseFinalVerifier(r);
  assert('validate ready: valid=true', v.valid === true);
  assert('validate ready: no errors', v.errors.length === 0);
}
{
  const r = buildPreReleaseFinalVerifier(null);
  const v = validatePreReleaseFinalVerifier(r);
  assert('validate blocked: valid=true', v.valid === true);
}
{
  const v = validatePreReleaseFinalVerifier(null);
  assert('validate null: valid=false', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildPreReleaseFinalVerifier(VALID_INPUT);
  const s = renderPreReleaseFinalVerifier(r);
  assert('render: is string', typeof s === 'string');
  assert('render: contains PRE_RELEASE_READY', s.includes('PRE_RELEASE_READY'));
  assert('render: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
}
{
  const s = renderPreReleaseFinalVerifier(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const r = buildPreReleaseFinalVerifier(VALID_INPUT);
  assert('all: release_allowed=false', r.release_allowed === false);
  assert('all: deploy_allowed=false', r.deploy_allowed === false);
  assert('all: stable_allowed=false', r.stable_allowed === false);
  assert('all: tag_allowed=false', r.tag_allowed === false);
  assert('all: real_execution_allowed=false', r.real_execution_allowed === false);
  assert('all: production_touched=false', r.production_touched === false);
  assert('all: deploy_performed=false', r.deploy_performed === false);
  assert('all: stable_promoted=false', r.stable_promoted === false);
  assert('all: release_performed=false', r.release_performed === false);
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
