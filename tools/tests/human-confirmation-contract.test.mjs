#!/usr/bin/env node
/**
 * Human Confirmation Contract — Unit Tests V46.1
 */

import {
  createHumanConfirmationContract,
  validateHumanConfirmationContract,
  bindHumanConfirmationToManualRequest,
  renderHumanConfirmationSummary,
  HUMAN_CONFIRMATION_STATUSES,
  REQUIRED_CONFIRMATION_PHRASE,
  REQUIRED_DENIED_CAPABILITIES,
} from '../human-confirmation-contract.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS     = '2026-05-17T12:00:00.000Z';
const TS_EXP = '2026-05-16T12:00:00.000Z';

const VALID_PARAMS = {
  confirmed_by:                 'alice',
  confirmer_role:               'release-reviewer',
  confirmation_decision:        'approved',
  confirmation_phrase:          REQUIRED_CONFIRMATION_PHRASE,
  allowed_scope:                ['manual_release_review'],
  denied_capabilities:          REQUIRED_DENIED_CAPABILITIES,
  evidence_acknowledged:        true,
  rollback_acknowledged:        true,
  production_risk_acknowledged: true,
  _mock_timestamp:              TS,
};

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(HUMAN_CONFIRMATION_STATUSES),                             '[A-01] statuses array');
assert(HUMAN_CONFIRMATION_STATUSES.length === 7,                               '[A-02] 7 statuses');
assert(HUMAN_CONFIRMATION_STATUSES.includes('HUMAN_CONFIRMATION_MISSING'),     '[A-03] MISSING');
assert(HUMAN_CONFIRMATION_STATUSES.includes('HUMAN_CONFIRMATION_INVALID'),     '[A-04] INVALID');
assert(HUMAN_CONFIRMATION_STATUSES.includes('HUMAN_CONFIRMATION_REJECTED'),    '[A-05] REJECTED');
assert(HUMAN_CONFIRMATION_STATUSES.includes('HUMAN_CONFIRMATION_EXPIRED'),     '[A-06] EXPIRED');
assert(HUMAN_CONFIRMATION_STATUSES.includes('HUMAN_CONFIRMATION_SCOPE_MISMATCH'), '[A-07] SCOPE_MISMATCH');
assert(HUMAN_CONFIRMATION_STATUSES.includes('HUMAN_CONFIRMATION_PHRASE_MISMATCH'), '[A-08] PHRASE_MISMATCH');
assert(HUMAN_CONFIRMATION_STATUSES.includes('HUMAN_CONFIRMATION_READY'),       '[A-09] READY');
assert(typeof REQUIRED_CONFIRMATION_PHRASE === 'string',                       '[A-10] phrase is string');
assert(REQUIRED_CONFIRMATION_PHRASE.length > 10,                               '[A-11] phrase non-trivial');
assert(Array.isArray(REQUIRED_DENIED_CAPABILITIES),                            '[A-12] denied_caps array');
assert(REQUIRED_DENIED_CAPABILITIES.length === 6,                              '[A-13] 6 denied caps');
assert(REQUIRED_DENIED_CAPABILITIES.includes('deploy_execution'),              '[A-14] deploy_execution');
assert(REQUIRED_DENIED_CAPABILITIES.includes('tag_creation'),                  '[A-15] tag_creation');
assert(REQUIRED_DENIED_CAPABILITIES.includes('stable_promotion'),              '[A-16] stable_promotion');
assert(REQUIRED_DENIED_CAPABILITIES.includes('automatic_release'),             '[A-17] automatic_release');
assert(REQUIRED_DENIED_CAPABILITIES.includes('evidence_override'),             '[A-18] evidence_override');
assert(REQUIRED_DENIED_CAPABILITIES.includes('go_core_override'),              '[A-19] go_core_override');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fixture = createHumanConfirmationContract({ fixture_mode: true, _mock_timestamp: TS });
assert(fixture.human_confirmation_ready   === true,                            '[B-01] ready=true');
assert(fixture.human_confirmation_status  === 'HUMAN_CONFIRMATION_READY',      '[B-02] status=READY');
assert(typeof fixture.confirmation_id     === 'string',                        '[B-03] confirmation_id string');
assert(fixture.confirmation_decision      === 'approved',                      '[B-04] decision=approved');
assert(fixture.confirmation_phrase        === REQUIRED_CONFIRMATION_PHRASE,    '[B-05] phrase correct');
assert(fixture.evidence_acknowledged      === true,                            '[B-06] evidence_acknowledged=true');
assert(fixture.rollback_acknowledged      === true,                            '[B-07] rollback_acknowledged=true');
assert(fixture.production_risk_acknowledged === true,                          '[B-08] production_risk=true');
assert(fixture.local_only                 === true,                            '[B-09] local_only=true');
assert(fixture.manual_only                === true,                            '[B-10] manual_only=true');
assert(fixture.can_create_evidence        === false,                           '[B-11] can_create_evidence=false');
assert(fixture.can_override_go_core       === false,                           '[B-12] can_override_go_core=false');
assert(fixture.can_execute_release        === false,                           '[B-13] can_execute_release=false');
assert(fixture.deploy_allowed             === false,                           '[B-14] deploy=false');
assert(fixture.promotion_allowed          === false,                           '[B-15] promotion=false');
assert(fixture.stable_allowed             === false,                           '[B-16] stable=false');
assert(fixture.tag_allowed                === false,                           '[B-17] tag=false');
assert(fixture.release_performed          === false,                           '[B-18] release_performed=false');
assert(fixture.tag_created                === false,                           '[B-19] tag_created=false');
assert(fixture.stable_promoted            === false,                           '[B-20] stable_promoted=false');
assert(fixture.deploy_performed           === false,                           '[B-21] deploy_performed=false');
assert(fixture.schema_version             === 'v46.1',                         '[B-22] schema=v46.1');
assert(fixture.blocking_reason            === null,                            '[B-23] blocking_reason=null');
assert(Array.isArray(fixture.denied_capabilities),                             '[B-24] denied_capabilities array');
assert(fixture.denied_capabilities.length === 6,                               '[B-25] 6 denied caps');

// ─── Suite C: Validate — missing fields ──────────────────────────
console.log('\n[Suite C] Validate — missing fields');
const noConfirmer = validateHumanConfirmationContract({ ...VALID_PARAMS, confirmed_by: null });
assert(noConfirmer.human_confirmation_status === 'HUMAN_CONFIRMATION_INVALID', '[C-01] no confirmed_by → INVALID');
assert(noConfirmer.deploy_allowed             === false,                       '[C-02] deploy=false');

const noRole = validateHumanConfirmationContract({ ...VALID_PARAMS, confirmer_role: null });
assert(noRole.human_confirmation_status === 'HUMAN_CONFIRMATION_INVALID',      '[C-03] no role → INVALID');

// ─── Suite D: Validate — rejected ────────────────────────────────
console.log('\n[Suite D] Validate — rejected');
const rejected = validateHumanConfirmationContract({ ...VALID_PARAMS, confirmation_decision: 'rejected' });
assert(rejected.human_confirmation_status === 'HUMAN_CONFIRMATION_REJECTED',   '[D-01] rejected → REJECTED');
assert(rejected.deploy_allowed             === false,                          '[D-02] deploy=false');

const pending = validateHumanConfirmationContract({ ...VALID_PARAMS, confirmation_decision: 'pending' });
assert(pending.human_confirmation_status  === 'HUMAN_CONFIRMATION_REJECTED',   '[D-03] pending → REJECTED');

// ─── Suite E: Validate — phrase mismatch ─────────────────────────
console.log('\n[Suite E] Validate — phrase mismatch');
const badPhrase = validateHumanConfirmationContract({ ...VALID_PARAMS, confirmation_phrase: 'I confirm this release' });
assert(badPhrase.human_confirmation_status === 'HUMAN_CONFIRMATION_PHRASE_MISMATCH', '[E-01] bad phrase → PHRASE_MISMATCH');
assert(badPhrase.deploy_allowed             === false,                         '[E-02] deploy=false');

const emptyPhrase = validateHumanConfirmationContract({ ...VALID_PARAMS, confirmation_phrase: '' });
assert(emptyPhrase.human_confirmation_status === 'HUMAN_CONFIRMATION_PHRASE_MISMATCH', '[E-03] empty phrase → PHRASE_MISMATCH');

// ─── Suite F: Validate — scope mismatch ──────────────────────────
console.log('\n[Suite F] Validate — scope mismatch');
const emptyScope = validateHumanConfirmationContract({ ...VALID_PARAMS, allowed_scope: [] });
assert(emptyScope.human_confirmation_status === 'HUMAN_CONFIRMATION_SCOPE_MISMATCH', '[F-01] empty scope → SCOPE_MISMATCH');

const nullScope = validateHumanConfirmationContract({ ...VALID_PARAMS, allowed_scope: null });
assert(nullScope.human_confirmation_status  === 'HUMAN_CONFIRMATION_SCOPE_MISMATCH', '[F-02] null scope → SCOPE_MISMATCH');

// ─── Suite G: Validate — missing denied capabilities ─────────────
console.log('\n[Suite G] Validate — denied capabilities');
const missingOneCap = validateHumanConfirmationContract({
  ...VALID_PARAMS,
  denied_capabilities: REQUIRED_DENIED_CAPABILITIES.filter(c => c !== 'deploy_execution'),
});
assert(missingOneCap.human_confirmation_status === 'HUMAN_CONFIRMATION_SCOPE_MISMATCH', '[G-01] missing cap → SCOPE_MISMATCH');

const emptyCaps = validateHumanConfirmationContract({ ...VALID_PARAMS, denied_capabilities: [] });
assert(emptyCaps.human_confirmation_status === 'HUMAN_CONFIRMATION_SCOPE_MISMATCH', '[G-02] empty caps → SCOPE_MISMATCH');

const nullCaps = validateHumanConfirmationContract({ ...VALID_PARAMS, denied_capabilities: null });
assert(nullCaps.human_confirmation_status === 'HUMAN_CONFIRMATION_SCOPE_MISMATCH', '[G-03] null caps → SCOPE_MISMATCH');

// ─── Suite H: Validate — acknowledgements required ───────────────
console.log('\n[Suite H] Validate — acknowledgements');
const noEvidence = validateHumanConfirmationContract({ ...VALID_PARAMS, evidence_acknowledged: false });
assert(noEvidence.human_confirmation_status === 'HUMAN_CONFIRMATION_INVALID',  '[H-01] no evidence_ack → INVALID');

const noRollback = validateHumanConfirmationContract({ ...VALID_PARAMS, rollback_acknowledged: false });
assert(noRollback.human_confirmation_status === 'HUMAN_CONFIRMATION_INVALID',  '[H-02] no rollback_ack → INVALID');

const noRisk = validateHumanConfirmationContract({ ...VALID_PARAMS, production_risk_acknowledged: false });
assert(noRisk.human_confirmation_status     === 'HUMAN_CONFIRMATION_INVALID',  '[H-03] no risk_ack → INVALID');

// ─── Suite I: Valid confirmation ──────────────────────────────────
console.log('\n[Suite I] Valid confirmation');
const valid = validateHumanConfirmationContract(VALID_PARAMS);
assert(valid.human_confirmation_ready    === true,                             '[I-01] ready=true');
assert(valid.human_confirmation_status   === 'HUMAN_CONFIRMATION_READY',       '[I-02] status=READY');
assert(typeof valid.confirmation_id      === 'string',                         '[I-03] confirmation_id present');
assert(valid.confirmed_by                === 'alice',                          '[I-04] confirmed_by wired');
assert(valid.confirmer_role              === 'release-reviewer',               '[I-05] confirmer_role wired');
assert(valid.can_create_evidence         === false,                            '[I-06] cannot create evidence');
assert(valid.can_override_go_core        === false,                            '[I-07] cannot override go-core');
assert(valid.can_execute_release         === false,                            '[I-08] cannot execute release');
assert(valid.deploy_allowed              === false,                            '[I-09] deploy=false');
assert(valid.promotion_allowed           === false,                            '[I-10] promotion=false');
assert(valid.stable_allowed              === false,                            '[I-11] stable=false');
assert(valid.tag_allowed                 === false,                            '[I-12] tag=false');
assert(valid.release_performed           === false,                            '[I-13] release_performed=false');
assert(valid.tag_created                 === false,                            '[I-14] tag_created=false');
assert(valid.stable_promoted             === false,                            '[I-15] stable_promoted=false');
assert(valid.deploy_performed            === false,                            '[I-16] deploy_performed=false');

// ─── Suite J: Bind to manual request ─────────────────────────────
console.log('\n[Suite J] Bind to manual request');
const fakeRequest = { request_id: 'req-xyz', manual_release_request_valid: true };
const bound = bindHumanConfirmationToManualRequest(valid, fakeRequest);
assert(bound.human_confirmation_ready   === true,                              '[J-01] bound ready=true');
assert(bound.bound_to_request_id        === 'req-xyz',                         '[J-02] bound request_id wired');
assert(bound.binding_valid              === true,                              '[J-03] binding_valid=true');
assert(bound.deploy_allowed             === false,                             '[J-04] deploy=false after bind');

const bindNoConfirm = bindHumanConfirmationToManualRequest(null, fakeRequest);
assert(bindNoConfirm.human_confirmation_status === 'HUMAN_CONFIRMATION_INVALID', '[J-05] null confirm → INVALID');

const bindNoRequest = bindHumanConfirmationToManualRequest(valid, null);
assert(bindNoRequest.human_confirmation_status === 'HUMAN_CONFIRMATION_INVALID', '[J-06] null request → INVALID');

// ─── Suite K: Render summary ──────────────────────────────────────
console.log('\n[Suite K] Render summary');
const summary = renderHumanConfirmationSummary(valid);
assert(typeof summary             === 'string',                                '[K-01] summary is string');
assert(summary.includes('HUMAN_CONFIRMATION_CONTRACT V46.1'),                 '[K-02] header present');
assert(summary.includes('HUMAN_CONFIRMATION_READY'),                          '[K-03] status in summary');
assert(summary.includes('can_execute_release  : false'),                      '[K-04] can_execute_release in summary');
assert(summary.includes('deploy_allowed       : false'),                      '[K-05] deploy_allowed in summary');

const summaryNull = renderHumanConfirmationSummary(null);
assert(typeof summaryNull === 'string',                                        '[K-06] null renders string');

// ─── Suite L: Invariants across all modes ────────────────────────
console.log('\n[Suite L] Invariants across all modes');
const modes = [
  { label: 'fixture',     o: fixture     },
  { label: 'valid',       o: valid       },
  { label: 'rejected',    o: rejected    },
  { label: 'bad-phrase',  o: badPhrase   },
  { label: 'no-evidence', o: noEvidence  },
  { label: 'bound',       o: bound       },
];
for (const { label, o } of modes) {
  assert(o.deploy_allowed    === false, `[L] ${label}: deploy=false`);
  assert(o.promotion_allowed === false, `[L] ${label}: promotion=false`);
  assert(o.stable_allowed    === false, `[L] ${label}: stable=false`);
  assert(o.tag_allowed       === false, `[L] ${label}: tag=false`);
  assert(o.release_performed === false, `[L] ${label}: release_performed=false`);
  assert(o.tag_created       === false, `[L] ${label}: tag_created=false`);
  assert(o.stable_promoted   === false, `[L] ${label}: stable_promoted=false`);
  assert(o.deploy_performed  === false, `[L] ${label}: deploy_performed=false`);
}

// ─── Summary ─────────────────────────────────────────────────────
console.log(`\nhuman-confirmation-contract: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
