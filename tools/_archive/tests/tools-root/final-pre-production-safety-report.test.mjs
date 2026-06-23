#!/usr/bin/env node
/**
 * Final Pre-Production Safety Report — Unit Tests V69.0
 */

import {
  buildFinalPreProductionSafetyReport,
  renderFinalPreProductionSafetyReport,
  PREPROD_REPORT_STATUSES,
  PREPROD_BLOCKED_ACTIONS,
  PREPROD_SAFE_NEXT_ACTIONS,
} from '../final-pre-production-safety-report.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T00:00:00.000Z';

const GOOD_CONTRACT  = { contract_ready: true, controlled_contract_id: 'cid', contract_status: 'CONTROLLED_CONTRACT_READY_REVIEW' };
const GOOD_AUTHORITY = { authority_ready: true, controlled_authority_id: 'aid', authority_status: 'CONTROLLED_AUTHORITY_READY_REVIEW' };
const GOOD_BINDING   = { binding_ready: true, binding_id: 'bid', binding_status: 'CONTROLLED_BINDING_READY_REVIEW' };
const GOOD_EVIDENCE  = { evidence_review_ready: true, controlled_evidence_package_id: 'eid', evidence_package_status: 'CONTROLLED_EVIDENCE_READY_REVIEW', evidence_source: 'go-core', evidence_receipt_id: 'rid' };

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(PREPROD_REPORT_STATUSES),                                         '[A-01] statuses array');
assert(PREPROD_REPORT_STATUSES.length === 6,                                           '[A-02] 6 statuses');
assert(PREPROD_REPORT_STATUSES.includes('PREPROD_REPORT_BLOCKED_CONTRACT'),            '[A-03] BLOCKED_CONTRACT');
assert(PREPROD_REPORT_STATUSES.includes('PREPROD_REPORT_BLOCKED_AUTHORITY'),           '[A-04] BLOCKED_AUTHORITY');
assert(PREPROD_REPORT_STATUSES.includes('PREPROD_REPORT_BLOCKED_BINDING'),             '[A-05] BLOCKED_BINDING');
assert(PREPROD_REPORT_STATUSES.includes('PREPROD_REPORT_BLOCKED_EVIDENCE'),            '[A-06] BLOCKED_EVIDENCE');
assert(PREPROD_REPORT_STATUSES.includes('PREPROD_REPORT_BLOCKED_LEDGER'),              '[A-07] BLOCKED_LEDGER');
assert(PREPROD_REPORT_STATUSES.includes('PREPROD_REPORT_READY'),                       '[A-08] READY');

assert(Array.isArray(PREPROD_BLOCKED_ACTIONS),                                         '[A-09] blocked_actions array');
assert(PREPROD_BLOCKED_ACTIONS.length === 10,                                          '[A-10] 10 blocked actions');
assert(PREPROD_BLOCKED_ACTIONS.includes('auto_release'),                               '[A-11] auto_release blocked');
assert(PREPROD_BLOCKED_ACTIONS.includes('auto_tag'),                                   '[A-12] auto_tag blocked');
assert(PREPROD_BLOCKED_ACTIONS.includes('auto_stable_promotion'),                      '[A-13] auto_stable blocked');
assert(PREPROD_BLOCKED_ACTIONS.includes('auto_deploy'),                                '[A-14] auto_deploy blocked');
assert(PREPROD_BLOCKED_ACTIONS.includes('auto_unlock'),                                '[A-15] auto_unlock blocked');
assert(PREPROD_BLOCKED_ACTIONS.includes('auto_controlled_execution'),                  '[A-16] auto_controlled blocked');
assert(PREPROD_BLOCKED_ACTIONS.includes('git_push'),                                   '[A-17] git_push blocked');
assert(PREPROD_BLOCKED_ACTIONS.includes('production_write'),                           '[A-18] production_write blocked');
assert(PREPROD_BLOCKED_ACTIONS.includes('evidence_override'),                          '[A-19] evidence_override blocked');
assert(PREPROD_BLOCKED_ACTIONS.includes('go_core_override'),                           '[A-20] go_core_override blocked');

assert(Array.isArray(PREPROD_SAFE_NEXT_ACTIONS),                                       '[A-21] safe_actions array');
assert(PREPROD_SAFE_NEXT_ACTIONS.length === 6,                                         '[A-22] 6 safe actions');
assert(PREPROD_SAFE_NEXT_ACTIONS.includes('do_not_execute_production_in_this_phase'),  '[A-23] do_not_execute safe');
assert(PREPROD_SAFE_NEXT_ACTIONS.includes('prepare_future_real_manual_execution_contract'), '[A-24] future_phase safe');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = buildFinalPreProductionSafetyReport({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                        '[B-01] returns object');
assert(fix.pre_production_status     === 'PREPROD_REPORT_READY',                      '[B-02] status=PREPROD_REPORT_READY');
assert(fix.report_ready              === true,                                         '[B-03] report_ready=true');
assert(fix.schema_version            === 'v69.0',                                     '[B-04] schema=v69.0');
assert(typeof fix.report_id          === 'string' && fix.report_id.length === 24,     '[B-05] id 24 chars');
assert(fix.human_review_required     === true,                                         '[B-06] human_review_required=true');
assert(fix.explicit_final_execution_required === true,                                 '[B-07] explicit_final_execution=true');
assert(fix.blocking_reason           === null,                                         '[B-08] blocking_reason=null');
assert(fix.chain_valid               === true,                                         '[B-09] chain_valid=true');
assert(Array.isArray(fix.blocked_actions) && fix.blocked_actions.length === 10,       '[B-10] 10 blocked_actions');
assert(Array.isArray(fix.safe_next_actions) && fix.safe_next_actions.length === 6,    '[B-11] 6 safe_next_actions');
assert(fix.created_at                === TS,                                          '[B-12] created_at=TS');

// ─── Suite C: Missing contract ────────────────────────────────────
console.log('\n[Suite C] Missing contract');
const noC = buildFinalPreProductionSafetyReport({ controlled_authority: GOOD_AUTHORITY, controlled_binding: GOOD_BINDING, controlled_evidence_package: GOOD_EVIDENCE, _mock_timestamp: TS });
assert(noC.report_ready              === false,                                        '[C-01] blocked');
assert(noC.pre_production_status     === 'PREPROD_REPORT_BLOCKED_CONTRACT',           '[C-02] status BLOCKED_CONTRACT');

// ─── Suite D: Missing authority ───────────────────────────────────
console.log('\n[Suite D] Missing authority');
const noA = buildFinalPreProductionSafetyReport({ controlled_contract: GOOD_CONTRACT, controlled_binding: GOOD_BINDING, controlled_evidence_package: GOOD_EVIDENCE, _mock_timestamp: TS });
assert(noA.pre_production_status     === 'PREPROD_REPORT_BLOCKED_AUTHORITY',          '[D-01] BLOCKED_AUTHORITY');

// ─── Suite E: Missing binding ─────────────────────────────────────
console.log('\n[Suite E] Missing binding');
const noB = buildFinalPreProductionSafetyReport({ controlled_contract: GOOD_CONTRACT, controlled_authority: GOOD_AUTHORITY, controlled_evidence_package: GOOD_EVIDENCE, _mock_timestamp: TS });
assert(noB.pre_production_status     === 'PREPROD_REPORT_BLOCKED_BINDING',            '[E-01] BLOCKED_BINDING');

// ─── Suite F: Missing evidence ────────────────────────────────────
console.log('\n[Suite F] Missing evidence');
const noE = buildFinalPreProductionSafetyReport({ controlled_contract: GOOD_CONTRACT, controlled_authority: GOOD_AUTHORITY, controlled_binding: GOOD_BINDING, _mock_timestamp: TS });
assert(noE.pre_production_status     === 'PREPROD_REPORT_BLOCKED_EVIDENCE',           '[F-01] BLOCKED_EVIDENCE');

// ─── Suite G: Full report ready ───────────────────────────────────
console.log('\n[Suite G] Full report ready');
const ready = buildFinalPreProductionSafetyReport({
  controlled_contract:        GOOD_CONTRACT,
  controlled_authority:       GOOD_AUTHORITY,
  controlled_binding:         GOOD_BINDING,
  controlled_evidence_package: GOOD_EVIDENCE,
  _mock_timestamp:            TS,
});
assert(ready.report_ready              === true,                                       '[G-01] report_ready=true');
assert(ready.pre_production_status     === 'PREPROD_REPORT_READY',                    '[G-02] status=READY');
assert(ready.controlled_contract_id    === 'cid',                                     '[G-03] contract_id set');
assert(ready.controlled_authority_id   === 'aid',                                     '[G-04] authority_id set');
assert(ready.controlled_binding_id     === 'bid',                                     '[G-05] binding_id set');
assert(ready.evidence_source           === 'go-core',                                 '[G-06] evidence_source=go-core');
assert(ready.blocking_reason           === null,                                       '[G-07] blocking_reason=null');
assert(ready.human_review_required     === true,                                       '[G-08] human_review_required=true');
assert(ready.explicit_final_execution_required === true,                               '[G-09] explicit_final_execution=true');

// ─── Suite H: Invariants ──────────────────────────────────────────
console.log('\n[Suite H] Invariants');
assert(fix.deploy_allowed              === false, '[H-01] deploy_allowed=false');
assert(fix.promotion_allowed           === false, '[H-02] promotion_allowed=false');
assert(fix.stable_allowed              === false, '[H-03] stable_allowed=false');
assert(fix.tag_allowed                 === false, '[H-04] tag_allowed=false');
assert(fix.release_execution_allowed   === false, '[H-05] exec_allowed=false');
assert(fix.release_performed           === false, '[H-06] release_performed=false');
assert(fix.tag_created                 === false, '[H-07] tag_created=false');
assert(fix.stable_promoted             === false, '[H-08] stable_promoted=false');
assert(fix.deploy_performed            === false, '[H-09] deploy_performed=false');
assert(fix.production_execution_locked === true,  '[H-10] production_execution_locked=true');
assert(fix.unlock_executed             === false, '[H-11] unlock_executed=false');
assert(fix.controlled_execution_allowed === false,'[H-12] controlled_execution_allowed=false');
assert(fix.human_review_required       === true,  '[H-13] human_review_required=true');
assert(fix.explicit_final_execution_required === true, '[H-14] explicit_final_execution=true');
assert(fix.final_execution_phase_required    === true, '[H-15] final_execution_phase_required=true');

assert(ready.production_execution_locked  === true,  '[H-16] ready: locked=true');
assert(ready.controlled_execution_allowed === false, '[H-17] ready: allowed=false');
assert(ready.unlock_executed              === false, '[H-18] ready: unlock=false');

// READY does not grant execution
assert(fix.blocked_actions.includes('auto_controlled_execution'), '[H-19] READY: controlled blocked');
assert(fix.safe_next_actions.includes('do_not_execute_production_in_this_phase'), '[H-20] READY: do_not_execute safe');

// ─── Suite I: renderFinalPreProductionSafetyReport ────────────────
console.log('\n[Suite I] Render');
const rendered = renderFinalPreProductionSafetyReport(fix);
assert(typeof rendered === 'string',                                                  '[I-01] returns string');
assert(rendered.includes('PREPROD_REPORT_READY'),                                    '[I-02] status in output');
assert(rendered.includes('production_execution_locked       : true'),                '[I-03] lock in output');
assert(rendered.includes('controlled_execution_allowed      : false'),               '[I-04] allowed=false in output');
assert(rendered.includes('human_review_required             : true'),                '[I-05] human_review in output');
assert(rendered.includes('explicit_final_execution_required : true'),                '[I-06] explicit_final in output');
assert(rendered.includes('final_execution_phase_required    : true'),                '[I-07] final_exec in output');
assert(renderFinalPreProductionSafetyReport(null) === 'final_pre_production_safety_report: null', '[I-08] null → string');

// ─── Suite J: Deterministic ID ────────────────────────────────────
console.log('\n[Suite J] Deterministic ID');
const r1 = buildFinalPreProductionSafetyReport({ controlled_contract: GOOD_CONTRACT, controlled_authority: GOOD_AUTHORITY, controlled_binding: GOOD_BINDING, controlled_evidence_package: GOOD_EVIDENCE, _mock_timestamp: TS });
const r2 = buildFinalPreProductionSafetyReport({ controlled_contract: GOOD_CONTRACT, controlled_authority: GOOD_AUTHORITY, controlled_binding: GOOD_BINDING, controlled_evidence_package: GOOD_EVIDENCE, _mock_timestamp: TS });
assert(r1.report_id === r2.report_id,                                                '[J-01] deterministic id');

// ─── Suite K: Blocked invariants ──────────────────────────────────
console.log('\n[Suite K] Blocked invariants');
const blk = buildFinalPreProductionSafetyReport({ _mock_timestamp: TS });
assert(blk.production_execution_locked  === true,  '[K-01] blocked: locked=true');
assert(blk.controlled_execution_allowed === false, '[K-02] blocked: allowed=false');
assert(blk.unlock_executed              === false, '[K-03] blocked: unlock=false');
assert(blk.final_execution_phase_required === true,'[K-04] blocked: final_exec=true');
assert(blk.human_review_required        === true,  '[K-05] blocked: human_review=true');
assert(blk.explicit_final_execution_required === true, '[K-06] blocked: explicit_final=true');
assert(blk.report_ready                 === false, '[K-07] blocked: report_ready=false');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nfinal-pre-production-safety-report: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
