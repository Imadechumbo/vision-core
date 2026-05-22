#!/usr/bin/env node

import {
  buildControlledReleasePlanLock,
  validateControlledReleasePlanLock,
  renderControlledReleasePlanLock,
  CONTROLLED_RELEASE_PLAN_LOCK_STATUSES,
} from '../controlled-release-plan-lock.mjs';

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
  release_lock_id: 'lock-001',
  tag_plan_ready: true,
  release_plan_ready: true,
  impact_manifest_ready: true,
  go_dry_ready: true,
  controlled_tag_plan_id: 'tp-001',
  release_plan_id: 'rp-001',
  impact_manifest_id: 'im-001',
  go_no_go_decision_id: 'gng-001',
};

console.log('\n=== controlled-release-plan-lock tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(CONTROLLED_RELEASE_PLAN_LOCK_STATUSES));
assert('contains RELEASE_LOCK_BLOCKED_INPUT', CONTROLLED_RELEASE_PLAN_LOCK_STATUSES.includes('RELEASE_LOCK_BLOCKED_INPUT'));
assert('contains RELEASE_LOCK_BLOCKED_TAG_PLAN', CONTROLLED_RELEASE_PLAN_LOCK_STATUSES.includes('RELEASE_LOCK_BLOCKED_TAG_PLAN'));
assert('contains RELEASE_LOCK_READY', CONTROLLED_RELEASE_PLAN_LOCK_STATUSES.includes('RELEASE_LOCK_READY'));
assert('contains RELEASE_LOCK_TAMPERED', CONTROLLED_RELEASE_PLAN_LOCK_STATUSES.includes('RELEASE_LOCK_TAMPERED'));
assert('build is function', typeof buildControlledReleasePlanLock === 'function');
assert('validate is function', typeof validateControlledReleasePlanLock === 'function');
assert('render is function', typeof renderControlledReleasePlanLock === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildControlledReleasePlanLock(null);
  assert('null -> BLOCKED_INPUT', r.status === 'RELEASE_LOCK_BLOCKED_INPUT');
  assert('null: release_plan_locked=false', r.release_plan_locked === false);
  assert('null: errors non-empty', r.errors.length > 0);
}
{
  const r = buildControlledReleasePlanLock({});
  assert('{} -> BLOCKED_INPUT', r.status === 'RELEASE_LOCK_BLOCKED_INPUT');
}
{
  const r = buildControlledReleasePlanLock({ release_lock_id: '' });
  assert('empty release_lock_id -> BLOCKED_INPUT', r.status === 'RELEASE_LOCK_BLOCKED_INPUT');
}
{
  const r = buildControlledReleasePlanLock({ release_lock_id: 'l-1', controlled_tag_plan_id: '' });
  assert('empty controlled_tag_plan_id -> BLOCKED_INPUT', r.status === 'RELEASE_LOCK_BLOCKED_INPUT');
}
{
  const r = buildControlledReleasePlanLock({ release_lock_id: 'l-1', controlled_tag_plan_id: 'tp-1', release_plan_id: '' });
  assert('empty release_plan_id -> BLOCKED_INPUT', r.status === 'RELEASE_LOCK_BLOCKED_INPUT');
}
{
  const r = buildControlledReleasePlanLock({ release_lock_id: 'l-1', controlled_tag_plan_id: 'tp-1', release_plan_id: 'rp-1', impact_manifest_id: '' });
  assert('empty impact_manifest_id -> BLOCKED_INPUT', r.status === 'RELEASE_LOCK_BLOCKED_INPUT');
}
{
  const r = buildControlledReleasePlanLock({ release_lock_id: 'l-1', controlled_tag_plan_id: 'tp-1', release_plan_id: 'rp-1', impact_manifest_id: 'im-1', go_no_go_decision_id: '' });
  assert('empty go_no_go_decision_id -> BLOCKED_INPUT', r.status === 'RELEASE_LOCK_BLOCKED_INPUT');
}

// --- blocked tag plan ---
console.log('--- blocked tag plan ---');
{
  const base = { release_lock_id: 'l-1', controlled_tag_plan_id: 'tp-1', release_plan_id: 'rp-1', impact_manifest_id: 'im-1', go_no_go_decision_id: 'gng-1' };
  const r = buildControlledReleasePlanLock({ ...base, tag_plan_ready: false });
  assert('tag_plan_ready=false -> BLOCKED_TAG_PLAN', r.status === 'RELEASE_LOCK_BLOCKED_TAG_PLAN');
}
{
  const base = { release_lock_id: 'l-1', controlled_tag_plan_id: 'tp-1', release_plan_id: 'rp-1', impact_manifest_id: 'im-1', go_no_go_decision_id: 'gng-1' };
  const r = buildControlledReleasePlanLock({ ...base, tag_plan_ready: true, release_plan_ready: false });
  assert('release_plan_ready=false -> BLOCKED_TAG_PLAN', r.status === 'RELEASE_LOCK_BLOCKED_TAG_PLAN');
}
{
  const base = { release_lock_id: 'l-1', controlled_tag_plan_id: 'tp-1', release_plan_id: 'rp-1', impact_manifest_id: 'im-1', go_no_go_decision_id: 'gng-1' };
  const r = buildControlledReleasePlanLock({ ...base, tag_plan_ready: true, release_plan_ready: true, impact_manifest_ready: false });
  assert('impact_manifest_ready=false -> BLOCKED_TAG_PLAN', r.status === 'RELEASE_LOCK_BLOCKED_TAG_PLAN');
}
{
  const base = { release_lock_id: 'l-1', controlled_tag_plan_id: 'tp-1', release_plan_id: 'rp-1', impact_manifest_id: 'im-1', go_no_go_decision_id: 'gng-1' };
  const r = buildControlledReleasePlanLock({ ...base, tag_plan_ready: true, release_plan_ready: true, impact_manifest_ready: true, go_dry_ready: false });
  assert('go_dry_ready=false -> BLOCKED_TAG_PLAN', r.status === 'RELEASE_LOCK_BLOCKED_TAG_PLAN');
}
{
  const base = { release_lock_id: 'l-1', controlled_tag_plan_id: 'tp-1', release_plan_id: 'rp-1', impact_manifest_id: 'im-1', go_no_go_decision_id: 'gng-1' };
  const r = buildControlledReleasePlanLock({ ...base, tag_plan_ready: true, release_plan_ready: true, impact_manifest_ready: true, go_dry_ready: true, production_touched: true });
  assert('production_touched=true -> BLOCKED_TAG_PLAN', r.status === 'RELEASE_LOCK_BLOCKED_TAG_PLAN');
}
{
  const base = { release_lock_id: 'l-1', controlled_tag_plan_id: 'tp-1', release_plan_id: 'rp-1', impact_manifest_id: 'im-1', go_no_go_decision_id: 'gng-1' };
  const r = buildControlledReleasePlanLock({ ...base, tag_plan_ready: true, release_plan_ready: true, impact_manifest_ready: true, go_dry_ready: true, deploy_performed: true });
  assert('deploy_performed=true -> BLOCKED_TAG_PLAN', r.status === 'RELEASE_LOCK_BLOCKED_TAG_PLAN');
}
{
  const base = { release_lock_id: 'l-1', controlled_tag_plan_id: 'tp-1', release_plan_id: 'rp-1', impact_manifest_id: 'im-1', go_no_go_decision_id: 'gng-1' };
  const r = buildControlledReleasePlanLock({ ...base, tag_plan_ready: true, release_plan_ready: true, impact_manifest_ready: true, go_dry_ready: true, stable_promoted: true });
  assert('stable_promoted=true -> BLOCKED_TAG_PLAN', r.status === 'RELEASE_LOCK_BLOCKED_TAG_PLAN');
}
{
  const base = { release_lock_id: 'l-1', controlled_tag_plan_id: 'tp-1', release_plan_id: 'rp-1', impact_manifest_id: 'im-1', go_no_go_decision_id: 'gng-1' };
  const r = buildControlledReleasePlanLock({ ...base, tag_plan_ready: true, release_plan_ready: true, impact_manifest_ready: true, go_dry_ready: true, release_performed: true });
  assert('release_performed=true -> BLOCKED_TAG_PLAN', r.status === 'RELEASE_LOCK_BLOCKED_TAG_PLAN');
}

// --- ready ---
console.log('--- ready ---');
{
  const r = buildControlledReleasePlanLock(VALID_INPUT);
  assert('valid -> RELEASE_LOCK_READY', r.status === 'RELEASE_LOCK_READY');
  assert('ready: schema_version=v197.0', r.schema_version === 'v197.0');
  assert('ready: release_plan_lock_id set', r.release_plan_lock_id === 'lock-001');
  assert('ready: locked_components has 4', r.locked_components.length === 4);
  assert('ready: has controlled_tag_plan', r.locked_components.includes('controlled_tag_plan'));
  assert('ready: has release_plan', r.locked_components.includes('release_plan'));
  assert('ready: has impact_manifest', r.locked_components.includes('impact_manifest'));
  assert('ready: has go_no_go_decision', r.locked_components.includes('go_no_go_decision'));
  assert('ready: release_plan_locked=true', r.release_plan_locked === true);
  assert('ready: tamper_detected=false', r.tamper_detected === false);
  assert('ready: lock_hash 64 chars', r.lock_hash && r.lock_hash.length === 64);
  assert('ready: release_allowed=false', r.release_allowed === false);
  assert('ready: deploy_allowed=false', r.deploy_allowed === false);
  assert('ready: stable_allowed=false', r.stable_allowed === false);
  assert('ready: tag_allowed=false', r.tag_allowed === false);
  assert('ready: real_execution_allowed=false', r.real_execution_allowed === false);
  assert('ready: errors empty', Array.isArray(r.errors) && r.errors.length === 0);
}

// --- tamper detection ---
console.log('--- tamper detection ---');
{
  const r = buildControlledReleasePlanLock(VALID_INPUT);
  const correctHash = r.lock_hash;
  const tampered = buildControlledReleasePlanLock({ ...VALID_INPUT, expected_lock_hash: 'fakehash123' });
  assert('wrong expected hash -> TAMPERED', tampered.status === 'RELEASE_LOCK_TAMPERED');
  assert('tampered: tamper_detected=true', tampered.tamper_detected === true);
  assert('tampered: release_plan_locked=false', tampered.release_plan_locked === false);
}
{
  const r = buildControlledReleasePlanLock(VALID_INPUT);
  const correctHash = r.lock_hash;
  const valid = buildControlledReleasePlanLock({ ...VALID_INPUT, expected_lock_hash: correctHash });
  assert('correct expected hash -> READY', valid.status === 'RELEASE_LOCK_READY');
  assert('correct hash: tamper_detected=false', valid.tamper_detected === false);
  assert('correct hash: release_plan_locked=true', valid.release_plan_locked === true);
}

// --- hash determinism ---
console.log('--- hash determinism ---');
{
  const r1 = buildControlledReleasePlanLock(VALID_INPUT);
  const r2 = buildControlledReleasePlanLock(VALID_INPUT);
  assert('hash deterministic', r1.lock_hash === r2.lock_hash);
}
{
  const r = buildControlledReleasePlanLock({ ...VALID_INPUT, controlled_tag_plan_id: 'different-tp' });
  assert('different id -> different hash', r.lock_hash !== buildControlledReleasePlanLock(VALID_INPUT).lock_hash);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildControlledReleasePlanLock(VALID_INPUT);
  const v = validateControlledReleasePlanLock(r);
  assert('validate ready: valid=true', v.valid === true);
  assert('validate ready: no errors', v.errors.length === 0);
}
{
  const r = buildControlledReleasePlanLock(null);
  const v = validateControlledReleasePlanLock(r);
  assert('validate blocked: valid=true', v.valid === true);
}
{
  const v = validateControlledReleasePlanLock(null);
  assert('validate null: valid=false', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildControlledReleasePlanLock(VALID_INPUT);
  const s = renderControlledReleasePlanLock(r);
  assert('render: is string', typeof s === 'string');
  assert('render: contains RELEASE_LOCK_READY', s.includes('RELEASE_LOCK_READY'));
  assert('render: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
}
{
  const s = renderControlledReleasePlanLock(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const r = buildControlledReleasePlanLock(VALID_INPUT);
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
