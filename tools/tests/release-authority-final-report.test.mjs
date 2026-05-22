#!/usr/bin/env node

import {
  buildReleaseAuthorityFinalReport,
  validateReleaseAuthorityFinalReport,
  renderReleaseAuthorityFinalReport,
  RELEASE_AUTHORITY_FINAL_REPORT_STATUSES,
} from '../release-authority-final-report.mjs';

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
  authority_report_id: 'report-001',
  pre_release_ready: true,
  release_plan_locked: true,
  go_dry_ready: true,
  impact_manifest_ready: true,
  risk_classifier_ready: true,
  decision_request_ready: true,
  manual_authority_granted_dry: true,
};

console.log('\n=== release-authority-final-report tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(RELEASE_AUTHORITY_FINAL_REPORT_STATUSES));
assert('contains AUTHORITY_REPORT_BLOCKED_INPUT', RELEASE_AUTHORITY_FINAL_REPORT_STATUSES.includes('AUTHORITY_REPORT_BLOCKED_INPUT'));
assert('contains AUTHORITY_REPORT_BLOCKED_PRE_RELEASE', RELEASE_AUTHORITY_FINAL_REPORT_STATUSES.includes('AUTHORITY_REPORT_BLOCKED_PRE_RELEASE'));
assert('contains AUTHORITY_REPORT_READY', RELEASE_AUTHORITY_FINAL_REPORT_STATUSES.includes('AUTHORITY_REPORT_READY'));
assert('build is function', typeof buildReleaseAuthorityFinalReport === 'function');
assert('validate is function', typeof validateReleaseAuthorityFinalReport === 'function');
assert('render is function', typeof renderReleaseAuthorityFinalReport === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildReleaseAuthorityFinalReport(null);
  assert('null -> BLOCKED_INPUT', r.status === 'AUTHORITY_REPORT_BLOCKED_INPUT');
  assert('null: report_ready=false', r.report_ready === false);
  assert('null: errors non-empty', r.errors.length > 0);
}
{
  const r = buildReleaseAuthorityFinalReport({});
  assert('{} -> BLOCKED_INPUT', r.status === 'AUTHORITY_REPORT_BLOCKED_INPUT');
}
{
  const r = buildReleaseAuthorityFinalReport({ authority_report_id: '' });
  assert('empty report_id -> BLOCKED_INPUT', r.status === 'AUTHORITY_REPORT_BLOCKED_INPUT');
}

// --- blocked pre-release ---
console.log('--- blocked pre-release ---');
{
  const base = { authority_report_id: 'r-1' };
  const r = buildReleaseAuthorityFinalReport({ ...base, pre_release_ready: false });
  assert('pre_release_ready=false -> BLOCKED_PRE_RELEASE', r.status === 'AUTHORITY_REPORT_BLOCKED_PRE_RELEASE');
}
{
  const base = { authority_report_id: 'r-1' };
  const r = buildReleaseAuthorityFinalReport({ ...base, pre_release_ready: true, release_plan_locked: false });
  assert('release_plan_locked=false -> BLOCKED_PRE_RELEASE', r.status === 'AUTHORITY_REPORT_BLOCKED_PRE_RELEASE');
}
{
  const base = { authority_report_id: 'r-1' };
  const r = buildReleaseAuthorityFinalReport({ ...base, pre_release_ready: true, release_plan_locked: true, go_dry_ready: false });
  assert('go_dry_ready=false -> BLOCKED_PRE_RELEASE', r.status === 'AUTHORITY_REPORT_BLOCKED_PRE_RELEASE');
}
{
  const base = { authority_report_id: 'r-1' };
  const r = buildReleaseAuthorityFinalReport({ ...base, pre_release_ready: true, release_plan_locked: true, go_dry_ready: true, impact_manifest_ready: false });
  assert('impact_manifest_ready=false -> BLOCKED_PRE_RELEASE', r.status === 'AUTHORITY_REPORT_BLOCKED_PRE_RELEASE');
}
{
  const base = { authority_report_id: 'r-1' };
  const r = buildReleaseAuthorityFinalReport({ ...base, pre_release_ready: true, release_plan_locked: true, go_dry_ready: true, impact_manifest_ready: true, risk_classifier_ready: false });
  assert('risk_classifier_ready=false -> BLOCKED_PRE_RELEASE', r.status === 'AUTHORITY_REPORT_BLOCKED_PRE_RELEASE');
}
{
  const base = { authority_report_id: 'r-1' };
  const r = buildReleaseAuthorityFinalReport({ ...base, pre_release_ready: true, release_plan_locked: true, go_dry_ready: true, impact_manifest_ready: true, risk_classifier_ready: true, decision_request_ready: false });
  assert('decision_request_ready=false -> BLOCKED_PRE_RELEASE', r.status === 'AUTHORITY_REPORT_BLOCKED_PRE_RELEASE');
}
{
  const base = { authority_report_id: 'r-1' };
  const r = buildReleaseAuthorityFinalReport({ ...base, pre_release_ready: true, release_plan_locked: true, go_dry_ready: true, impact_manifest_ready: true, risk_classifier_ready: true, decision_request_ready: true, manual_authority_granted_dry: false });
  assert('manual_authority_granted_dry=false -> BLOCKED_PRE_RELEASE', r.status === 'AUTHORITY_REPORT_BLOCKED_PRE_RELEASE');
}
{
  const base = { authority_report_id: 'r-1' };
  const r = buildReleaseAuthorityFinalReport({ ...base, pre_release_ready: true, release_plan_locked: true, go_dry_ready: true, impact_manifest_ready: true, risk_classifier_ready: true, decision_request_ready: true, manual_authority_granted_dry: true, production_touched: true });
  assert('production_touched=true -> BLOCKED_PRE_RELEASE', r.status === 'AUTHORITY_REPORT_BLOCKED_PRE_RELEASE');
}
{
  const base = { authority_report_id: 'r-1' };
  const r = buildReleaseAuthorityFinalReport({ ...base, pre_release_ready: true, release_plan_locked: true, go_dry_ready: true, impact_manifest_ready: true, risk_classifier_ready: true, decision_request_ready: true, manual_authority_granted_dry: true, deploy_performed: true });
  assert('deploy_performed=true -> BLOCKED_PRE_RELEASE', r.status === 'AUTHORITY_REPORT_BLOCKED_PRE_RELEASE');
}
{
  const base = { authority_report_id: 'r-1' };
  const r = buildReleaseAuthorityFinalReport({ ...base, pre_release_ready: true, release_plan_locked: true, go_dry_ready: true, impact_manifest_ready: true, risk_classifier_ready: true, decision_request_ready: true, manual_authority_granted_dry: true, stable_promoted: true });
  assert('stable_promoted=true -> BLOCKED_PRE_RELEASE', r.status === 'AUTHORITY_REPORT_BLOCKED_PRE_RELEASE');
}
{
  const base = { authority_report_id: 'r-1' };
  const r = buildReleaseAuthorityFinalReport({ ...base, pre_release_ready: true, release_plan_locked: true, go_dry_ready: true, impact_manifest_ready: true, risk_classifier_ready: true, decision_request_ready: true, manual_authority_granted_dry: true, release_performed: true });
  assert('release_performed=true -> BLOCKED_PRE_RELEASE', r.status === 'AUTHORITY_REPORT_BLOCKED_PRE_RELEASE');
}

// --- ready ---
console.log('--- ready ---');
{
  const r = buildReleaseAuthorityFinalReport(VALID_INPUT);
  assert('valid -> AUTHORITY_REPORT_READY', r.status === 'AUTHORITY_REPORT_READY');
  assert('ready: schema_version=v199.0', r.schema_version === 'v199.0');
  assert('ready: report_id set', r.release_authority_report_id === 'report-001');
  assert('ready: report_ready=true', r.report_ready === true);
  assert('ready: authority_chain has 8', r.authority_chain.length === 8);
  assert('ready: has manual_release_authority_contract', r.authority_chain.includes('manual_release_authority_contract'));
  assert('ready: has real_release_decision_request', r.authority_chain.includes('real_release_decision_request'));
  assert('ready: has release_risk_classifier', r.authority_chain.includes('release_risk_classifier'));
  assert('ready: has release_impact_manifest', r.authority_chain.includes('release_impact_manifest'));
  assert('ready: has manual_go_no_go_decision_gate', r.authority_chain.includes('manual_go_no_go_decision_gate'));
  assert('ready: has controlled_tag_plan', r.authority_chain.includes('controlled_tag_plan'));
  assert('ready: has controlled_release_plan_lock', r.authority_chain.includes('controlled_release_plan_lock'));
  assert('ready: has pre_release_final_verifier', r.authority_chain.includes('pre_release_final_verifier'));
  assert('ready: final_recommendation=READY_FOR_EXPLICIT_V200', r.final_recommendation === 'READY_FOR_EXPLICIT_V200_RELEASE_EXECUTION_DECISION');
  assert('ready: report_hash 64 chars', r.report_hash && r.report_hash.length === 64);
  assert('ready: release_allowed=false', r.release_allowed === false);
  assert('ready: deploy_allowed=false', r.deploy_allowed === false);
  assert('ready: stable_allowed=false', r.stable_allowed === false);
  assert('ready: tag_allowed=false', r.tag_allowed === false);
  assert('ready: real_execution_allowed=false', r.real_execution_allowed === false);
  assert('ready: errors empty', Array.isArray(r.errors) && r.errors.length === 0);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildReleaseAuthorityFinalReport(VALID_INPUT);
  const v = validateReleaseAuthorityFinalReport(r);
  assert('validate ready: valid=true', v.valid === true);
  assert('validate ready: no errors', v.errors.length === 0);
}
{
  const r = buildReleaseAuthorityFinalReport(null);
  const v = validateReleaseAuthorityFinalReport(r);
  assert('validate blocked: valid=true', v.valid === true);
}
{
  const v = validateReleaseAuthorityFinalReport(null);
  assert('validate null: valid=false', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildReleaseAuthorityFinalReport(VALID_INPUT);
  const s = renderReleaseAuthorityFinalReport(r);
  assert('render: is string', typeof s === 'string');
  assert('render: contains READY_FOR_EXPLICIT_V200', s.includes('READY_FOR_EXPLICIT_V200'));
  assert('render: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
}
{
  const s = renderReleaseAuthorityFinalReport(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const r = buildReleaseAuthorityFinalReport(VALID_INPUT);
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
