#!/usr/bin/env node
/**
 * Manual Release Handoff Package — Unit Tests V48.0
 */

import {
  buildManualReleaseHandoffPackage,
  HANDOFF_STATUSES,
  BLOCKED_ACTIONS,
} from '../manual-release-handoff-package.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-17T12:00:00.000Z';

const VALID_PREFLIGHT = {
  manual_release_preflight_ready: true,
  preflight_id:           'pf-abc',
  evidence_source:        'go-core',
  evidence_receipt_id:    'receipt-abc',
  git_head:               'deadbeef',
  target_branch:          'main',
  target_version:         '1.0.0',
};

const VALID_DRY_RUN = {
  manual_release_dry_run_ready: true,
  dry_run_report_id:      'dr-abc',
  simulated_tag_name:     'v1.0.0',
  simulated_stable_target:'main',
  simulated_rollback_anchor: 'rollback-anchor-abc',
  target_version:         '1.0.0',
  target_branch:          'main',
  git_head:               'deadbeef',
};

const VALID_REQUEST = { request_id: 'req-abc', evidence_source: 'go-core', evidence_receipt_id: 'receipt-abc' };
const VALID_CONFIRM = { confirmation_id: 'conf-abc' };
const VALID_BINDING = { binding_id: 'bind-abc' };

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(HANDOFF_STATUSES),                                      '[A-01] statuses array');
assert(HANDOFF_STATUSES.length === 5,                                        '[A-02] 5 statuses');
assert(HANDOFF_STATUSES.includes('HANDOFF_BLOCKED_PREFLIGHT'),               '[A-03] BLOCKED_PREFLIGHT');
assert(HANDOFF_STATUSES.includes('HANDOFF_BLOCKED_DRY_RUN'),                 '[A-04] BLOCKED_DRY_RUN');
assert(HANDOFF_STATUSES.includes('HANDOFF_BLOCKED_EVIDENCE'),                '[A-05] BLOCKED_EVIDENCE');
assert(HANDOFF_STATUSES.includes('HANDOFF_BLOCKED_HASH'),                    '[A-06] BLOCKED_HASH');
assert(HANDOFF_STATUSES.includes('HANDOFF_READY'),                           '[A-07] READY');
assert(Array.isArray(BLOCKED_ACTIONS),                                       '[A-08] blocked_actions array');
assert(BLOCKED_ACTIONS.includes('auto_deploy'),                              '[A-09] auto_deploy');
assert(BLOCKED_ACTIONS.includes('auto_tag'),                                 '[A-10] auto_tag');
assert(BLOCKED_ACTIONS.includes('auto_stable_promotion'),                    '[A-11] auto_stable_promotion');
assert(BLOCKED_ACTIONS.includes('evidence_override'),                        '[A-12] evidence_override');
assert(BLOCKED_ACTIONS.includes('go_core_override'),                         '[A-13] go_core_override');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fixture = buildManualReleaseHandoffPackage({ fixture_mode: true, _mock_timestamp: TS });
const fixture2 = buildManualReleaseHandoffPackage({ fixture_mode: true, _mock_timestamp: TS });
assert(fixture.handoff_ready               === true,                         '[B-01] ready=true');
assert(fixture.handoff_status              === 'HANDOFF_READY',              '[B-02] status=HANDOFF_READY');
assert(typeof fixture.handoff_id           === 'string',                     '[B-03] handoff_id string');
assert(typeof fixture.package_hash         === 'string',                     '[B-04] package_hash string');
assert(fixture.package_hash                === fixture2.package_hash,        '[B-05] hash deterministic');
assert(fixture.evidence_source             === 'go-core',                    '[B-06] evidence_source=go-core');
assert(fixture.local_only                  === true,                         '[B-07] local_only=true');
assert(fixture.manual_only                 === true,                         '[B-08] manual_only=true');
assert(Array.isArray(fixture.blocked_actions),                               '[B-09] blocked_actions array');
assert(fixture.blocked_actions.includes('auto_deploy'),                      '[B-10] blocked: auto_deploy');
assert(fixture.blocked_actions.includes('auto_tag'),                         '[B-11] blocked: auto_tag');
assert(fixture.blocked_actions.includes('auto_stable_promotion'),            '[B-12] blocked: auto_stable_promotion');
assert(fixture.blocked_actions.includes('evidence_override'),                '[B-13] blocked: evidence_override');
assert(fixture.blocked_actions.includes('go_core_override'),                 '[B-14] blocked: go_core_override');
assert(Array.isArray(fixture.human_next_actions),                            '[B-15] human_next_actions array');
assert(fixture.human_next_actions.length > 0,                                '[B-16] human_next_actions non-empty');
assert(fixture.release_execution_allowed   === false,                        '[B-17] release_execution_allowed=false');
assert(fixture.deploy_allowed              === false,                        '[B-18] deploy=false');
assert(fixture.promotion_allowed           === false,                        '[B-19] promotion=false');
assert(fixture.stable_allowed              === false,                        '[B-20] stable=false');
assert(fixture.tag_allowed                 === false,                        '[B-21] tag=false');
assert(fixture.release_performed           === false,                        '[B-22] release_performed=false');
assert(fixture.tag_created                 === false,                        '[B-23] tag_created=false');
assert(fixture.stable_promoted             === false,                        '[B-24] stable_promoted=false');
assert(fixture.deploy_performed            === false,                        '[B-25] deploy_performed=false');
assert(fixture.schema_version              === 'v48.0',                      '[B-26] schema=v48.0');
assert(fixture.blocking_reason             === null,                         '[B-27] blocking_reason=null');

// ─── Suite C: Blocked — preflight ────────────────────────────────
console.log('\n[Suite C] Blocked — preflight');
const noPreflight = buildManualReleaseHandoffPackage({ preflight_result: null, dry_run_result: VALID_DRY_RUN });
assert(noPreflight.handoff_status === 'HANDOFF_BLOCKED_PREFLIGHT', '[C-01] null preflight → BLOCKED_PREFLIGHT');
assert(noPreflight.deploy_allowed === false,                        '[C-02] deploy=false');

const notReadyPf = buildManualReleaseHandoffPackage({ preflight_result: { manual_release_preflight_ready: false }, dry_run_result: VALID_DRY_RUN });
assert(notReadyPf.handoff_status === 'HANDOFF_BLOCKED_PREFLIGHT',  '[C-03] not ready pf → BLOCKED_PREFLIGHT');

// ─── Suite D: Blocked — dry-run ──────────────────────────────────
console.log('\n[Suite D] Blocked — dry-run');
const noDryRun = buildManualReleaseHandoffPackage({ preflight_result: VALID_PREFLIGHT, dry_run_result: null });
assert(noDryRun.handoff_status === 'HANDOFF_BLOCKED_DRY_RUN', '[D-01] null dry-run → BLOCKED_DRY_RUN');

const notReadyDr = buildManualReleaseHandoffPackage({ preflight_result: VALID_PREFLIGHT, dry_run_result: { manual_release_dry_run_ready: false } });
assert(notReadyDr.handoff_status === 'HANDOFF_BLOCKED_DRY_RUN', '[D-02] not ready dr → BLOCKED_DRY_RUN');

// ─── Suite E: Blocked — evidence ─────────────────────────────────
console.log('\n[Suite E] Blocked — evidence');
const backendEvidence = buildManualReleaseHandoffPackage({
  preflight_result: { ...VALID_PREFLIGHT, evidence_source: 'backend' },
  dry_run_result: VALID_DRY_RUN,
});
assert(backendEvidence.handoff_status === 'HANDOFF_BLOCKED_EVIDENCE', '[E-01] backend → BLOCKED_EVIDENCE');

const noReceipt = buildManualReleaseHandoffPackage({
  preflight_result: { ...VALID_PREFLIGHT, evidence_receipt_id: null },
  dry_run_result: VALID_DRY_RUN,
});
assert(noReceipt.handoff_status === 'HANDOFF_BLOCKED_EVIDENCE', '[E-02] no receipt → BLOCKED_EVIDENCE');

// ─── Suite F: Full handoff ready ─────────────────────────────────
console.log('\n[Suite F] Full handoff ready');
const ready = buildManualReleaseHandoffPackage({
  preflight_result:           VALID_PREFLIGHT,
  dry_run_result:             VALID_DRY_RUN,
  manual_release_request:     VALID_REQUEST,
  human_confirmation:         VALID_CONFIRM,
  request_authority_binding:  VALID_BINDING,
  _mock_timestamp:            TS,
});
const ready2 = buildManualReleaseHandoffPackage({
  preflight_result:           VALID_PREFLIGHT,
  dry_run_result:             VALID_DRY_RUN,
  manual_release_request:     VALID_REQUEST,
  human_confirmation:         VALID_CONFIRM,
  request_authority_binding:  VALID_BINDING,
  _mock_timestamp:            TS,
});
assert(ready.handoff_ready              === true,                              '[F-01] ready=true');
assert(ready.handoff_status             === 'HANDOFF_READY',                   '[F-02] status=HANDOFF_READY');
assert(typeof ready.handoff_id          === 'string',                          '[F-03] handoff_id string');
assert(typeof ready.package_hash        === 'string',                          '[F-04] package_hash string');
assert(ready.package_hash               === ready2.package_hash,               '[F-05] hash deterministic');
assert(ready.request_id                 === 'req-abc',                         '[F-06] request_id wired');
assert(ready.confirmation_id            === 'conf-abc',                        '[F-07] confirmation_id wired');
assert(ready.authority_binding_id       === 'bind-abc',                        '[F-08] authority_id wired');
assert(ready.preflight_id               === 'pf-abc',                          '[F-09] preflight_id wired');
assert(ready.dry_run_report_id          === 'dr-abc',                          '[F-10] dry_run_report_id wired');
assert(ready.evidence_source            === 'go-core',                         '[F-11] evidence_source=go-core');
assert(ready.evidence_receipt_id        === 'receipt-abc',                     '[F-12] evidence_receipt_id wired');
assert(ready.target_version             === '1.0.0',                           '[F-13] target_version wired');
assert(ready.target_branch              === 'main',                            '[F-14] target_branch wired');
assert(ready.git_head                   === 'deadbeef',                        '[F-15] git_head wired');
assert(ready.simulated_tag_name         === 'v1.0.0',                          '[F-16] simulated_tag wired');
assert(ready.simulated_stable_target    === 'main',                            '[F-17] simulated_stable wired');
assert(ready.rollback_anchor            === 'rollback-anchor-abc',             '[F-18] rollback_anchor wired');
assert(ready.blocked_actions.includes('auto_deploy'),                          '[F-19] blocked: auto_deploy');
assert(ready.blocked_actions.includes('go_core_override'),                     '[F-20] blocked: go_core_override');
assert(ready.release_execution_allowed  === false,                             '[F-21] release_execution_allowed=false');
assert(ready.deploy_allowed             === false,                             '[F-22] deploy=false');
assert(ready.release_performed          === false,                             '[F-23] release_performed=false');
assert(ready.tag_created                === false,                             '[F-24] tag_created=false');
assert(ready.stable_promoted            === false,                             '[F-25] stable_promoted=false');

// ─── Suite G: Invariants across all modes ────────────────────────
console.log('\n[Suite G] Invariants across all modes');
const modes = [
  { label: 'fixture',          o: fixture       },
  { label: 'ready',            o: ready         },
  { label: 'no-preflight',     o: noPreflight   },
  { label: 'no-dry-run',       o: noDryRun      },
  { label: 'backend-evidence', o: backendEvidence },
];
for (const { label, o } of modes) {
  assert(o.release_execution_allowed === false, `[G] ${label}: release_execution_allowed=false`);
  assert(o.deploy_allowed            === false, `[G] ${label}: deploy=false`);
  assert(o.promotion_allowed         === false, `[G] ${label}: promotion=false`);
  assert(o.stable_allowed            === false, `[G] ${label}: stable=false`);
  assert(o.tag_allowed               === false, `[G] ${label}: tag=false`);
  assert(o.release_performed         === false, `[G] ${label}: release_performed=false`);
  assert(o.tag_created               === false, `[G] ${label}: tag_created=false`);
  assert(o.stable_promoted           === false, `[G] ${label}: stable_promoted=false`);
  assert(o.deploy_performed          === false, `[G] ${label}: deploy_performed=false`);
}

// ─── Summary ─────────────────────────────────────────────────────
console.log(`\nmanual-release-handoff-package: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
