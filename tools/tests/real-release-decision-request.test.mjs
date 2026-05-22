#!/usr/bin/env node
/**
 * Tests — Real Release Decision Request V192.0
 */

import {
  buildRealReleaseDecisionRequest,
  validateRealReleaseDecisionRequest,
  renderRealReleaseDecisionRequest,
  REAL_RELEASE_DECISION_REQUEST_STATUSES,
} from '../real-release-decision-request.mjs';

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
  release_request_id: 'request-001',
  manual_authority_granted_dry: true,
  phase_gate_ready: true,
  certification_ready: true,
  authority_review_approved: true,
  requested_by: 'operator-01',
  requested_reason: 'Post-certification controlled release',
  requested_version: 'v1.0.0',
  requested_scope: 'full',
};

console.log('\n=== real-release-decision-request tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(REAL_RELEASE_DECISION_REQUEST_STATUSES));
assert('has RELEASE_DECISION_BLOCKED_INPUT', REAL_RELEASE_DECISION_REQUEST_STATUSES.includes('RELEASE_DECISION_BLOCKED_INPUT'));
assert('has RELEASE_DECISION_BLOCKED_AUTHORITY', REAL_RELEASE_DECISION_REQUEST_STATUSES.includes('RELEASE_DECISION_BLOCKED_AUTHORITY'));
assert('has RELEASE_DECISION_PENDING', REAL_RELEASE_DECISION_REQUEST_STATUSES.includes('RELEASE_DECISION_PENDING'));
assert('has RELEASE_DECISION_REQUEST_READY', REAL_RELEASE_DECISION_REQUEST_STATUSES.includes('RELEASE_DECISION_REQUEST_READY'));
assert('build is function', typeof buildRealReleaseDecisionRequest === 'function');
assert('validate is function', typeof validateRealReleaseDecisionRequest === 'function');
assert('render is function', typeof renderRealReleaseDecisionRequest === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildRealReleaseDecisionRequest(null);
  assert('null → BLOCKED_INPUT', r.status === 'RELEASE_DECISION_BLOCKED_INPUT');
  assert('null: release_allowed=false', r.release_allowed === false);
  assert('null: deploy_allowed=false', r.deploy_allowed === false);
  assert('null: stable_allowed=false', r.stable_allowed === false);
  assert('null: tag_allowed=false', r.tag_allowed === false);
  assert('null: production_touched=false', r.production_touched === false);
}
{
  const r = buildRealReleaseDecisionRequest({});
  assert('no request_id → BLOCKED_INPUT', r.status === 'RELEASE_DECISION_BLOCKED_INPUT');
}
{
  const r = buildRealReleaseDecisionRequest({ ...VALID_INPUT, requested_by: '' });
  assert('empty requested_by → BLOCKED_INPUT', r.status === 'RELEASE_DECISION_BLOCKED_INPUT');
}
{
  const r = buildRealReleaseDecisionRequest({ ...VALID_INPUT, requested_version: undefined });
  assert('no requested_version → BLOCKED_INPUT', r.status === 'RELEASE_DECISION_BLOCKED_INPUT');
}

// --- blocked authority ---
console.log('--- blocked authority ---');
{
  const r = buildRealReleaseDecisionRequest({ ...VALID_INPUT, manual_authority_granted_dry: false });
  assert('authority_dry=false → BLOCKED_AUTHORITY', r.status === 'RELEASE_DECISION_BLOCKED_AUTHORITY');
  assert('blocked_auth: release_allowed=false', r.release_allowed === false);
  assert('blocked_auth: decision_request_ready=false', r.decision_request_ready === false);
}
{
  const r = buildRealReleaseDecisionRequest({ ...VALID_INPUT, phase_gate_ready: false });
  assert('phase_gate=false → BLOCKED_AUTHORITY', r.status === 'RELEASE_DECISION_BLOCKED_AUTHORITY');
}
{
  const r = buildRealReleaseDecisionRequest({ ...VALID_INPUT, certification_ready: false });
  assert('cert_ready=false → BLOCKED_AUTHORITY', r.status === 'RELEASE_DECISION_BLOCKED_AUTHORITY');
}
{
  const r = buildRealReleaseDecisionRequest({ ...VALID_INPUT, authority_review_approved: false });
  assert('authority_review=false → BLOCKED_AUTHORITY', r.status === 'RELEASE_DECISION_BLOCKED_AUTHORITY');
}

// --- request ready ---
console.log('--- request ready ---');
{
  const r = buildRealReleaseDecisionRequest(VALID_INPUT);
  assert('valid → RELEASE_DECISION_REQUEST_READY', r.status === 'RELEASE_DECISION_REQUEST_READY');
  assert('ready: schema_version=v192.0', r.schema_version === 'v192.0');
  assert('ready: request_id set', r.release_decision_request_id === 'request-001');
  assert('ready: requested_by set', r.requested_by === 'operator-01');
  assert('ready: requested_version set', r.requested_version === 'v1.0.0');
  assert('ready: decision_request_ready=true', r.decision_request_ready === true);
  assert('ready: decision_status=PENDING_MANUAL_DECISION', r.decision_status === 'PENDING_MANUAL_DECISION');
  assert('ready: release_allowed=false', r.release_allowed === false);
  assert('ready: deploy_allowed=false', r.deploy_allowed === false);
  assert('ready: stable_allowed=false', r.stable_allowed === false);
  assert('ready: tag_allowed=false', r.tag_allowed === false);
  assert('ready: request_hash 64 chars', typeof r.request_hash === 'string' && r.request_hash.length === 64);
  assert('ready: errors empty', r.errors.length === 0);
  assert('ready: production_touched=false', r.production_touched === false);
  assert('ready: deploy_performed=false', r.deploy_performed === false);
  assert('ready: stable_promoted=false', r.stable_promoted === false);
  assert('ready: release_performed=false', r.release_performed === false);
}

// --- pending status ---
console.log('--- pending status ---');
{
  const r = buildRealReleaseDecisionRequest({ ...VALID_INPUT, decision_pending: false });
  assert('decision_pending=false → RELEASE_DECISION_PENDING', r.status === 'RELEASE_DECISION_PENDING');
  assert('pending: release_allowed=false', r.release_allowed === false);
  assert('pending: decision_status=PENDING_MANUAL_DECISION', r.decision_status === 'PENDING_MANUAL_DECISION');
}

// --- hash determinism ---
console.log('--- hash determinism ---');
{
  const r1 = buildRealReleaseDecisionRequest(VALID_INPUT);
  const r2 = buildRealReleaseDecisionRequest(VALID_INPUT);
  assert('hash deterministic', r1.request_hash === r2.request_hash);
  const r3 = buildRealReleaseDecisionRequest({ ...VALID_INPUT, release_request_id: 'request-002' });
  assert('different request_id → different hash', r1.request_hash !== r3.request_hash);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildRealReleaseDecisionRequest(VALID_INPUT);
  const v = validateRealReleaseDecisionRequest(r);
  assert('validate ready: valid=true', v.valid === true);
  assert('validate ready: no errors', v.errors.length === 0);
}
{
  const r = buildRealReleaseDecisionRequest(null);
  const v = validateRealReleaseDecisionRequest(r);
  assert('validate blocked: valid=true', v.valid === true);
}
{
  const v = validateRealReleaseDecisionRequest(null);
  assert('validate null: valid=false', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildRealReleaseDecisionRequest(VALID_INPUT);
  const s = renderRealReleaseDecisionRequest(r);
  assert('render: is string', typeof s === 'string');
  assert('render: contains RELEASE_DECISION_REQUEST_READY', s.includes('RELEASE_DECISION_REQUEST_READY'));
  assert('render: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
  assert('render: release_allowed false', s.includes('false'));
}
{
  const s = renderRealReleaseDecisionRequest(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildRealReleaseDecisionRequest(null),
    buildRealReleaseDecisionRequest({}),
    buildRealReleaseDecisionRequest({ ...VALID_INPUT, manual_authority_granted_dry: false }),
    buildRealReleaseDecisionRequest({ ...VALID_INPUT, decision_pending: false }),
    buildRealReleaseDecisionRequest(VALID_INPUT),
  ];
  assert('all: release_allowed=false', cases.every(r => r.release_allowed === false));
  assert('all: deploy_allowed=false', cases.every(r => r.deploy_allowed === false));
  assert('all: stable_allowed=false', cases.every(r => r.stable_allowed === false));
  assert('all: tag_allowed=false', cases.every(r => r.tag_allowed === false));
  assert('all: production_touched=false', cases.every(r => r.production_touched === false));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
