#!/usr/bin/env node

import {
  buildManualGoNoGoDecisionGate,
  validateManualGoNoGoDecisionGate,
  renderManualGoNoGoDecisionGate,
  MANUAL_GO_NO_GO_STATUSES,
} from '../manual-go-no-go-decision-gate.mjs';

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
  decision_id: 'decision-001',
  impact_manifest_ready: true,
  risk_classifier_ready: true,
  decision_request_ready: true,
  decision: 'GO',
  decided_by: 'operator-01',
  decision_reason: 'All checks passed, proceeding to preparation',
};

console.log('\n=== manual-go-no-go-decision-gate tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(MANUAL_GO_NO_GO_STATUSES));
assert('contains GO_NO_GO_BLOCKED_INPUT', MANUAL_GO_NO_GO_STATUSES.includes('GO_NO_GO_BLOCKED_INPUT'));
assert('contains GO_NO_GO_BLOCKED_MANIFEST', MANUAL_GO_NO_GO_STATUSES.includes('GO_NO_GO_BLOCKED_MANIFEST'));
assert('contains GO_NO_GO_NO_GO', MANUAL_GO_NO_GO_STATUSES.includes('GO_NO_GO_NO_GO'));
assert('contains GO_NO_GO_GO_DRY', MANUAL_GO_NO_GO_STATUSES.includes('GO_NO_GO_GO_DRY'));
assert('build is function', typeof buildManualGoNoGoDecisionGate === 'function');
assert('validate is function', typeof validateManualGoNoGoDecisionGate === 'function');
assert('render is function', typeof renderManualGoNoGoDecisionGate === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildManualGoNoGoDecisionGate(null);
  assert('null -> BLOCKED_INPUT', r.status === 'GO_NO_GO_BLOCKED_INPUT');
  assert('null: release_allowed=false', r.release_allowed === false);
  assert('null: deploy_allowed=false', r.deploy_allowed === false);
  assert('null: stable_allowed=false', r.stable_allowed === false);
  assert('null: tag_allowed=false', r.tag_allowed === false);
  assert('null: real_execution_allowed=false', r.real_execution_allowed === false);
  assert('null: go_dry_ready=false', r.go_dry_ready === false);
  assert('null: decision_hash=null', r.decision_hash === null);
  assert('null: errors non-empty', r.errors.length > 0);
}
{
  const r = buildManualGoNoGoDecisionGate({});
  assert('{} -> BLOCKED_INPUT', r.status === 'GO_NO_GO_BLOCKED_INPUT');
  assert('{}: missing decision_id', r.errors.some(e => e.includes('decision_id')));
}
{
  const r = buildManualGoNoGoDecisionGate({ decision_id: '' });
  assert('empty decision_id -> BLOCKED_INPUT', r.status === 'GO_NO_GO_BLOCKED_INPUT');
}
{
  const baseManifest = { impact_manifest_ready: true, risk_classifier_ready: true, decision_request_ready: true };
  const r = buildManualGoNoGoDecisionGate({ ...baseManifest, decision_id: 'd-001', decision: null });
  assert('null decision -> BLOCKED_INPUT', r.status === 'GO_NO_GO_BLOCKED_INPUT');
}
{
  const baseManifest = { impact_manifest_ready: true, risk_classifier_ready: true, decision_request_ready: true };
  const r = buildManualGoNoGoDecisionGate({ ...baseManifest, decision_id: 'd-001', decision: 'INVALID' });
  assert('invalid decision -> BLOCKED_INPUT', r.status === 'GO_NO_GO_BLOCKED_INPUT');
  assert('invalid decision -> errors include decision', r.errors.some(e => e.includes('decision')));
}
{
  const baseManifest = { impact_manifest_ready: true, risk_classifier_ready: true, decision_request_ready: true };
  const r = buildManualGoNoGoDecisionGate({ ...baseManifest, decision_id: 'd-001', decision: 'GO', decided_by: '' });
  assert('empty decided_by -> BLOCKED_INPUT', r.status === 'GO_NO_GO_BLOCKED_INPUT');
  assert('empty decided_by -> errors include decided_by', r.errors.some(e => e.includes('decided_by')));
}
{
  const baseManifest = { impact_manifest_ready: true, risk_classifier_ready: true, decision_request_ready: true };
  const r = buildManualGoNoGoDecisionGate({ ...baseManifest, decision_id: 'd-001', decision: 'GO', decided_by: 'op', decision_reason: '' });
  assert('empty decision_reason -> BLOCKED_INPUT', r.status === 'GO_NO_GO_BLOCKED_INPUT');
  assert('empty decision_reason -> errors include reason', r.errors.some(e => e.includes('decision_reason')));
}

// --- blocked manifest ---
console.log('--- blocked manifest ---');
{
  const base = { decision_id: 'd-001', decision: 'GO', decided_by: 'op', decision_reason: 'reason' };
  const r = buildManualGoNoGoDecisionGate({ ...base, impact_manifest_ready: false });
  assert('impact_manifest_ready=false -> BLOCKED_MANIFEST', r.status === 'GO_NO_GO_BLOCKED_MANIFEST');
  assert('blocked_manifest: release_allowed=false', r.release_allowed === false);
  assert('blocked_manifest: go_dry_ready=false', r.go_dry_ready === false);
}
{
  const base = { decision_id: 'd-001', decision: 'GO', decided_by: 'op', decision_reason: 'reason' };
  const r = buildManualGoNoGoDecisionGate({ ...base, impact_manifest_ready: true, risk_classifier_ready: false });
  assert('risk_classifier_ready=false -> BLOCKED_MANIFEST', r.status === 'GO_NO_GO_BLOCKED_MANIFEST');
}
{
  const base = { decision_id: 'd-001', decision: 'GO', decided_by: 'op', decision_reason: 'reason' };
  const r = buildManualGoNoGoDecisionGate({ ...base, impact_manifest_ready: true, risk_classifier_ready: true, decision_request_ready: false });
  assert('decision_request_ready=false -> BLOCKED_MANIFEST', r.status === 'GO_NO_GO_BLOCKED_MANIFEST');
}
{
  const r = buildManualGoNoGoDecisionGate({ ...VALID_INPUT, production_touched: true });
  assert('production_touched=true -> BLOCKED_MANIFEST', r.status === 'GO_NO_GO_BLOCKED_MANIFEST');
  assert('production_touched: go_dry_ready=false', r.go_dry_ready === false);
}
{
  const r = buildManualGoNoGoDecisionGate({ ...VALID_INPUT, deploy_performed: true });
  assert('deploy_performed=true -> BLOCKED_MANIFEST', r.status === 'GO_NO_GO_BLOCKED_MANIFEST');
}
{
  const r = buildManualGoNoGoDecisionGate({ ...VALID_INPUT, stable_promoted: true });
  assert('stable_promoted=true -> BLOCKED_MANIFEST', r.status === 'GO_NO_GO_BLOCKED_MANIFEST');
}
{
  const r = buildManualGoNoGoDecisionGate({ ...VALID_INPUT, release_performed: true });
  assert('release_performed=true -> BLOCKED_MANIFEST', r.status === 'GO_NO_GO_BLOCKED_MANIFEST');
}

// --- NO_GO ---
console.log('--- NO_GO ---');
{
  const r = buildManualGoNoGoDecisionGate({ ...VALID_INPUT, decision: 'NO_GO', decision_reason: 'Risk too high' });
  assert('decision=NO_GO -> GO_NO_GO_NO_GO', r.status === 'GO_NO_GO_NO_GO');
  assert('NO_GO: go_dry_ready=false', r.go_dry_ready === false);
  assert('NO_GO: next_release_preparation_allowed=false', r.next_release_preparation_allowed === false);
  assert('NO_GO: release_allowed=false', r.release_allowed === false);
  assert('NO_GO: deploy_allowed=false', r.deploy_allowed === false);
  assert('NO_GO: stable_allowed=false', r.stable_allowed === false);
  assert('NO_GO: tag_allowed=false', r.tag_allowed === false);
  assert('NO_GO: real_execution_allowed=false', r.real_execution_allowed === false);
  assert('NO_GO: decision_hash 64 chars', r.decision_hash && r.decision_hash.length === 64);
  assert('NO_GO: errors empty', Array.isArray(r.errors) && r.errors.length === 0);
  assert('NO_GO: decision_reason preserved', r.decision_reason === 'Risk too high');
}

// --- GO_DRY ---
console.log('--- GO_DRY ---');
{
  const r = buildManualGoNoGoDecisionGate(VALID_INPUT);
  assert('valid -> GO_NO_GO_GO_DRY', r.status === 'GO_NO_GO_GO_DRY');
  assert('ready: schema_version=v195.0', r.schema_version === 'v195.0');
  assert('ready: decision_id set', r.go_no_go_decision_id === 'decision-001');
  assert('ready: decision=GO', r.decision === 'GO');
  assert('ready: decided_by set', r.decided_by === 'operator-01');
  assert('ready: decision_reason set', r.decision_reason === 'All checks passed, proceeding to preparation');
  assert('ready: go_dry_ready=true', r.go_dry_ready === true);
  assert('ready: next_release_preparation_allowed=true', r.next_release_preparation_allowed === true);
  assert('ready: release_allowed=false', r.release_allowed === false);
  assert('ready: deploy_allowed=false', r.deploy_allowed === false);
  assert('ready: stable_allowed=false', r.stable_allowed === false);
  assert('ready: tag_allowed=false', r.tag_allowed === false);
  assert('ready: real_execution_allowed=false', r.real_execution_allowed === false);
  assert('ready: decision_hash 64 chars', r.decision_hash && r.decision_hash.length === 64);
  assert('ready: errors empty', Array.isArray(r.errors) && r.errors.length === 0);
  assert('ready: production_touched=false', r.production_touched === false);
  assert('ready: deploy_performed=false', r.deploy_performed === false);
  assert('ready: stable_promoted=false', r.stable_promoted === false);
  assert('ready: release_performed=false', r.release_performed === false);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildManualGoNoGoDecisionGate(VALID_INPUT);
  const v = validateManualGoNoGoDecisionGate(r);
  assert('validate ready: valid=true', v.valid === true);
  assert('validate ready: no errors', v.errors.length === 0);
}
{
  const r = buildManualGoNoGoDecisionGate({ ...VALID_INPUT, decision: 'NO_GO' });
  const v = validateManualGoNoGoDecisionGate(r);
  assert('validate no_go: valid=true', v.valid === true);
}
{
  const r = buildManualGoNoGoDecisionGate(null);
  const v = validateManualGoNoGoDecisionGate(r);
  assert('validate blocked: valid=true', v.valid === true);
}
{
  const v = validateManualGoNoGoDecisionGate(null);
  assert('validate null: valid=false', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildManualGoNoGoDecisionGate(VALID_INPUT);
  const s = renderManualGoNoGoDecisionGate(r);
  assert('render: is string', typeof s === 'string');
  assert('render: contains GO_NO_GO_GO_DRY', s.includes('GO_NO_GO_GO_DRY'));
  assert('render: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
  assert('render: contains release_allowed=false', s.includes('false'));
}
{
  const s = renderManualGoNoGoDecisionGate(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
for (const decision of ['GO', 'NO_GO']) {
  const r = buildManualGoNoGoDecisionGate({ ...VALID_INPUT, decision });
  assert(`all: release_allowed=false (${decision})`, r.release_allowed === false);
  assert(`all: deploy_allowed=false (${decision})`, r.deploy_allowed === false);
  assert(`all: stable_allowed=false (${decision})`, r.stable_allowed === false);
  assert(`all: tag_allowed=false (${decision})`, r.tag_allowed === false);
  assert(`all: real_execution_allowed=false (${decision})`, r.real_execution_allowed === false);
  assert(`all: production_touched=false (${decision})`, r.production_touched === false);
  assert(`all: deploy_performed=false (${decision})`, r.deploy_performed === false);
  assert(`all: stable_promoted=false (${decision})`, r.stable_promoted === false);
  assert(`all: release_performed=false (${decision})`, r.release_performed === false);
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
