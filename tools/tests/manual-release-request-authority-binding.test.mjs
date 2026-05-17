#!/usr/bin/env node
/**
 * Manual Release Request Authority Binding — Unit Tests V46.2
 */

import {
  bindManualReleaseRequestAuthority,
  validateManualReleaseRequestAuthorityBinding,
  renderManualReleaseRequestAuthorityBinding,
  REQUEST_AUTHORITY_BINDING_STATUSES,
} from '../manual-release-request-authority-binding.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS     = '2026-05-17T12:00:00.000Z';
const TS_FUT = '2026-12-31T23:59:59.000Z';
const TS_EXP = '2026-01-01T00:00:00.000Z';

const VALID_REQUEST = {
  request_id:                   'req-abc',
  manual_release_request_valid: true,
};

const VALID_CONFIRMATION = {
  confirmation_id:          'conf-abc',
  human_confirmation_ready: true,
  evidence_acknowledged:    true,
  rollback_acknowledged:    true,
  production_risk_acknowledged: true,
  can_create_evidence:      false,
  can_override_go_core:     false,
};

const VALID_AUTHORITY = {
  authority_binding_id: 'auth-abc',
  expires_at:           TS_FUT,
  can_override_evidence: false,
  can_override_go_core:  false,
};

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(REQUEST_AUTHORITY_BINDING_STATUSES),                              '[A-01] statuses array');
assert(REQUEST_AUTHORITY_BINDING_STATUSES.length === 7,                                '[A-02] 7 statuses');
assert(REQUEST_AUTHORITY_BINDING_STATUSES.includes('REQUEST_AUTHORITY_BLOCKED_REQUEST'),      '[A-03] BLOCKED_REQUEST');
assert(REQUEST_AUTHORITY_BINDING_STATUSES.includes('REQUEST_AUTHORITY_BLOCKED_CONFIRMATION'), '[A-04] BLOCKED_CONFIRMATION');
assert(REQUEST_AUTHORITY_BINDING_STATUSES.includes('REQUEST_AUTHORITY_BLOCKED_AUTHORITY'),    '[A-05] BLOCKED_AUTHORITY');
assert(REQUEST_AUTHORITY_BINDING_STATUSES.includes('REQUEST_AUTHORITY_BLOCKED_SCOPE'),        '[A-06] BLOCKED_SCOPE');
assert(REQUEST_AUTHORITY_BINDING_STATUSES.includes('REQUEST_AUTHORITY_BLOCKED_TEMPORAL'),     '[A-07] BLOCKED_TEMPORAL');
assert(REQUEST_AUTHORITY_BINDING_STATUSES.includes('REQUEST_AUTHORITY_BLOCKED_EVIDENCE_OVERRIDE'), '[A-08] BLOCKED_EVIDENCE_OVERRIDE');
assert(REQUEST_AUTHORITY_BINDING_STATUSES.includes('REQUEST_AUTHORITY_READY'),                '[A-09] READY');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fixture = bindManualReleaseRequestAuthority({ fixture_mode: true, _mock_timestamp: TS });
assert(fixture.request_authority_binding_ready   === true,                             '[B-01] ready=true');
assert(fixture.request_authority_binding_status  === 'REQUEST_AUTHORITY_READY',        '[B-02] status=READY');
assert(typeof fixture.binding_id                 === 'string',                         '[B-03] binding_id string');
assert(fixture.authority_valid                   === true,                             '[B-04] authority_valid=true');
assert(fixture.confirmation_valid                === true,                             '[B-05] confirmation_valid=true');
assert(fixture.scope_valid                       === true,                             '[B-06] scope_valid=true');
assert(fixture.temporal_valid                    === true,                             '[B-07] temporal_valid=true');
assert(fixture.can_execute_release               === false,                            '[B-08] can_execute_release=false');
assert(fixture.can_execute_deploy                === false,                            '[B-09] can_execute_deploy=false');
assert(fixture.can_create_tag                    === false,                            '[B-10] can_create_tag=false');
assert(fixture.can_promote_stable                === false,                            '[B-11] can_promote_stable=false');
assert(fixture.can_override_evidence             === false,                            '[B-12] can_override_evidence=false');
assert(fixture.can_override_go_core              === false,                            '[B-13] can_override_go_core=false');
assert(fixture.deploy_allowed                    === false,                            '[B-14] deploy=false');
assert(fixture.promotion_allowed                 === false,                            '[B-15] promotion=false');
assert(fixture.stable_allowed                    === false,                            '[B-16] stable=false');
assert(fixture.tag_allowed                       === false,                            '[B-17] tag=false');
assert(fixture.release_performed                 === false,                            '[B-18] release_performed=false');
assert(fixture.tag_created                       === false,                            '[B-19] tag_created=false');
assert(fixture.stable_promoted                   === false,                            '[B-20] stable_promoted=false');
assert(fixture.deploy_performed                  === false,                            '[B-21] deploy_performed=false');
assert(fixture.schema_version                    === 'v46.2',                          '[B-22] schema=v46.2');
assert(fixture.blocking_reason                   === null,                             '[B-23] blocking_reason=null');

// ─── Suite C: Blocked — missing request ──────────────────────────
console.log('\n[Suite C] Blocked — missing request');
const noReq = validateManualReleaseRequestAuthorityBinding({
  manual_release_request: null,
  human_confirmation: VALID_CONFIRMATION,
  authority_contract: VALID_AUTHORITY,
  _mock_timestamp: TS,
});
assert(noReq.request_authority_binding_status === 'REQUEST_AUTHORITY_BLOCKED_REQUEST', '[C-01] null req → BLOCKED_REQUEST');
assert(noReq.deploy_allowed                   === false,                               '[C-02] deploy=false');

const invalidReq = validateManualReleaseRequestAuthorityBinding({
  manual_release_request: { manual_release_request_valid: false },
  human_confirmation: VALID_CONFIRMATION,
  authority_contract: VALID_AUTHORITY,
  _mock_timestamp: TS,
});
assert(invalidReq.request_authority_binding_status === 'REQUEST_AUTHORITY_BLOCKED_REQUEST', '[C-03] invalid req → BLOCKED_REQUEST');

// ─── Suite D: Blocked — missing confirmation ──────────────────────
console.log('\n[Suite D] Blocked — missing confirmation');
const noConf = validateManualReleaseRequestAuthorityBinding({
  manual_release_request: VALID_REQUEST,
  human_confirmation: null,
  authority_contract: VALID_AUTHORITY,
  _mock_timestamp: TS,
});
assert(noConf.request_authority_binding_status === 'REQUEST_AUTHORITY_BLOCKED_CONFIRMATION', '[D-01] null conf → BLOCKED_CONFIRMATION');
assert(noConf.deploy_allowed                   === false,                                    '[D-02] deploy=false');

const notReadyConf = validateManualReleaseRequestAuthorityBinding({
  manual_release_request: VALID_REQUEST,
  human_confirmation: { human_confirmation_ready: false },
  authority_contract: VALID_AUTHORITY,
  _mock_timestamp: TS,
});
assert(notReadyConf.request_authority_binding_status === 'REQUEST_AUTHORITY_BLOCKED_CONFIRMATION', '[D-03] not ready conf → BLOCKED_CONFIRMATION');

// ─── Suite E: Blocked — missing authority ─────────────────────────
console.log('\n[Suite E] Blocked — missing authority');
const noAuth = validateManualReleaseRequestAuthorityBinding({
  manual_release_request: VALID_REQUEST,
  human_confirmation: VALID_CONFIRMATION,
  authority_contract: null,
  _mock_timestamp: TS,
});
assert(noAuth.request_authority_binding_status === 'REQUEST_AUTHORITY_BLOCKED_AUTHORITY', '[E-01] null auth → BLOCKED_AUTHORITY');
assert(noAuth.deploy_allowed                   === false,                                 '[E-02] deploy=false');

// ─── Suite F: Blocked — expired authority ─────────────────────────
console.log('\n[Suite F] Blocked — expired authority');
const expiredAuth = validateManualReleaseRequestAuthorityBinding({
  manual_release_request: VALID_REQUEST,
  human_confirmation: VALID_CONFIRMATION,
  authority_contract: { ...VALID_AUTHORITY, expires_at: TS_EXP },
  _mock_timestamp: TS,
});
assert(expiredAuth.request_authority_binding_status === 'REQUEST_AUTHORITY_BLOCKED_TEMPORAL', '[F-01] expired auth → BLOCKED_TEMPORAL');
assert(expiredAuth.deploy_allowed                   === false,                               '[F-02] deploy=false');

// ─── Suite G: Blocked — evidence override ─────────────────────────
console.log('\n[Suite G] Blocked — evidence override');
const overrideEvidence = validateManualReleaseRequestAuthorityBinding({
  manual_release_request: VALID_REQUEST,
  human_confirmation: VALID_CONFIRMATION,
  authority_contract: { ...VALID_AUTHORITY, can_override_evidence: true },
  _mock_timestamp: TS,
});
assert(overrideEvidence.request_authority_binding_status === 'REQUEST_AUTHORITY_BLOCKED_EVIDENCE_OVERRIDE', '[G-01] override evidence → BLOCKED');
assert(overrideEvidence.deploy_allowed                   === false,                                         '[G-02] deploy=false');

const overrideGoCore = validateManualReleaseRequestAuthorityBinding({
  manual_release_request: VALID_REQUEST,
  human_confirmation: VALID_CONFIRMATION,
  authority_contract: { ...VALID_AUTHORITY, can_override_go_core: true },
  _mock_timestamp: TS,
});
assert(overrideGoCore.request_authority_binding_status === 'REQUEST_AUTHORITY_BLOCKED_EVIDENCE_OVERRIDE', '[G-03] override go_core → BLOCKED');

const confOverride = validateManualReleaseRequestAuthorityBinding({
  manual_release_request: VALID_REQUEST,
  human_confirmation: { ...VALID_CONFIRMATION, can_override_go_core: true },
  authority_contract: VALID_AUTHORITY,
  _mock_timestamp: TS,
});
assert(confOverride.request_authority_binding_status === 'REQUEST_AUTHORITY_BLOCKED_EVIDENCE_OVERRIDE', '[G-04] conf override → BLOCKED');

// ─── Suite H: Full ready ──────────────────────────────────────────
console.log('\n[Suite H] Full ready');
const ready = validateManualReleaseRequestAuthorityBinding({
  manual_release_request: VALID_REQUEST,
  human_confirmation: VALID_CONFIRMATION,
  authority_contract: VALID_AUTHORITY,
  _mock_timestamp: TS,
});
assert(ready.request_authority_binding_ready   === true,                               '[H-01] ready=true');
assert(ready.request_authority_binding_status  === 'REQUEST_AUTHORITY_READY',          '[H-02] status=READY');
assert(typeof ready.binding_id                 === 'string',                           '[H-03] binding_id string');
assert(ready.request_id                        === 'req-abc',                          '[H-04] request_id wired');
assert(ready.confirmation_id                   === 'conf-abc',                         '[H-05] confirmation_id wired');
assert(ready.authority_contract_id             === 'auth-abc',                         '[H-06] authority_id wired');
assert(ready.authority_valid                   === true,                               '[H-07] authority_valid=true');
assert(ready.confirmation_valid                === true,                               '[H-08] confirmation_valid=true');
assert(ready.can_execute_release               === false,                              '[H-09] can_execute_release=false');
assert(ready.can_execute_deploy                === false,                              '[H-10] can_execute_deploy=false');
assert(ready.can_create_tag                    === false,                              '[H-11] can_create_tag=false');
assert(ready.can_promote_stable                === false,                              '[H-12] can_promote_stable=false');
assert(ready.can_override_evidence             === false,                              '[H-13] can_override_evidence=false');
assert(ready.can_override_go_core              === false,                              '[H-14] can_override_go_core=false');
assert(ready.deploy_allowed                    === false,                              '[H-15] deploy=false');
assert(ready.tag_allowed                       === false,                              '[H-16] tag=false');
assert(ready.stable_allowed                    === false,                              '[H-17] stable=false');
assert(ready.promotion_allowed                 === false,                              '[H-18] promotion=false');
assert(ready.release_performed                 === false,                              '[H-19] release_performed=false');
assert(ready.tag_created                       === false,                              '[H-20] tag_created=false');
assert(ready.stable_promoted                   === false,                              '[H-21] stable_promoted=false');
assert(ready.deploy_performed                  === false,                              '[H-22] deploy_performed=false');

// ─── Suite I: Render summary ──────────────────────────────────────
console.log('\n[Suite I] Render summary');
const summary = renderManualReleaseRequestAuthorityBinding(ready);
assert(typeof summary === 'string',                                                    '[I-01] summary is string');
assert(summary.includes('MANUAL_RELEASE_REQUEST_AUTHORITY_BINDING V46.2'),             '[I-02] header present');
assert(summary.includes('REQUEST_AUTHORITY_READY'),                                    '[I-03] status in summary');
assert(summary.includes('can_execute_release : false'),                                '[I-04] can_execute_release in summary');

const summaryNull = renderManualReleaseRequestAuthorityBinding(null);
assert(typeof summaryNull === 'string',                                                '[I-05] null renders string');

// ─── Suite J: Invariants across all modes ────────────────────────
console.log('\n[Suite J] Invariants across all modes');
const modes = [
  { label: 'fixture',          o: fixture       },
  { label: 'ready',            o: ready         },
  { label: 'no-req',           o: noReq         },
  { label: 'no-conf',          o: noConf        },
  { label: 'no-auth',          o: noAuth        },
  { label: 'expired-auth',     o: expiredAuth   },
  { label: 'override-evidence',o: overrideEvidence },
];
for (const { label, o } of modes) {
  assert(o.deploy_allowed    === false, `[J] ${label}: deploy=false`);
  assert(o.promotion_allowed === false, `[J] ${label}: promotion=false`);
  assert(o.stable_allowed    === false, `[J] ${label}: stable=false`);
  assert(o.tag_allowed       === false, `[J] ${label}: tag=false`);
  assert(o.release_performed === false, `[J] ${label}: release_performed=false`);
  assert(o.tag_created       === false, `[J] ${label}: tag_created=false`);
  assert(o.stable_promoted   === false, `[J] ${label}: stable_promoted=false`);
  assert(o.deploy_performed  === false, `[J] ${label}: deploy_performed=false`);
}

// ─── Summary ─────────────────────────────────────────────────────
console.log(`\nmanual-release-request-authority-binding: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
