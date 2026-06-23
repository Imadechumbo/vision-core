#!/usr/bin/env node
/**
 * Controlled Execution Evidence Package — Unit Tests V67.1
 */

import {
  buildControlledExecutionEvidencePackage,
  validateControlledExecutionEvidencePackage,
  renderControlledExecutionEvidencePackageSummary,
  CONTROLLED_EVIDENCE_STATUSES,
} from '../controlled-execution-evidence-package.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T00:00:00.000Z';

const GOOD_RISK = {
  controlled_execution_review_ready: true,
  controlled_risk_status: 'CONTROLLED_RISK_READY_REVIEW',
  risk_matrix_id: 'rmid-123',
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(CONTROLLED_EVIDENCE_STATUSES),                                    '[A-01] statuses array');
assert(CONTROLLED_EVIDENCE_STATUSES.length === 5,                                      '[A-02] 5 statuses');
assert(CONTROLLED_EVIDENCE_STATUSES.includes('CONTROLLED_EVIDENCE_BLOCKED_RISK'),      '[A-03] BLOCKED_RISK');
assert(CONTROLLED_EVIDENCE_STATUSES.includes('CONTROLLED_EVIDENCE_BLOCKED_EVIDENCE'),  '[A-04] BLOCKED_EVIDENCE');
assert(CONTROLLED_EVIDENCE_STATUSES.includes('CONTROLLED_EVIDENCE_BLOCKED_LEDGER'),    '[A-05] BLOCKED_LEDGER');
assert(CONTROLLED_EVIDENCE_STATUSES.includes('CONTROLLED_EVIDENCE_BLOCKED_HASH'),      '[A-06] BLOCKED_HASH');
assert(CONTROLLED_EVIDENCE_STATUSES.includes('CONTROLLED_EVIDENCE_READY_REVIEW'),      '[A-07] READY_REVIEW');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = buildControlledExecutionEvidencePackage({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                        '[B-01] returns object');
assert(fix.evidence_package_status       === 'CONTROLLED_EVIDENCE_READY_REVIEW',      '[B-02] status=READY_REVIEW');
assert(fix.evidence_review_ready         === true,                                     '[B-03] evidence_review_ready=true');
assert(fix.schema_version                === 'v67.1',                                 '[B-04] schema=v67.1');
assert(typeof fix.controlled_evidence_package_id === 'string' && fix.controlled_evidence_package_id.length === 24, '[B-05] id 24 chars');
assert(fix.evidence_source               === 'go-core',                               '[B-06] evidence_source=go-core');
assert(typeof fix.package_hash           === 'string' && fix.package_hash.length === 48, '[B-07] hash 48 chars');
assert(fix.immutable                     === true,                                     '[B-08] immutable=true');
assert(fix.controlled_review_only        === true,                                     '[B-09] controlled_review_only=true');
assert(fix.blocking_reason               === null,                                     '[B-10] blocking_reason=null');
assert(fix.created_at                    === TS,                                      '[B-11] created_at=TS');
assert(Array.isArray(fix.ledger_chain_refs),                                           '[B-12] ledger_chain_refs array');

// ─── Suite C: Missing risk ────────────────────────────────────────
console.log('\n[Suite C] Missing risk');
const noRisk = buildControlledExecutionEvidencePackage({ evidence_source: 'go-core', _mock_timestamp: TS });
assert(noRisk.evidence_review_ready      === false,                                    '[C-01] blocked no risk');
assert(noRisk.evidence_package_status    === 'CONTROLLED_EVIDENCE_BLOCKED_RISK',      '[C-02] status BLOCKED_RISK');

const badRisk = buildControlledExecutionEvidencePackage({ controlled_risk: { controlled_execution_review_ready: false }, evidence_source: 'go-core', _mock_timestamp: TS });
assert(badRisk.evidence_package_status   === 'CONTROLLED_EVIDENCE_BLOCKED_RISK',      '[C-03] not ready→BLOCKED_RISK');

// ─── Suite D: Wrong evidence source ───────────────────────────────
console.log('\n[Suite D] Wrong evidence source');
const backendSrc = buildControlledExecutionEvidencePackage({ controlled_risk: GOOD_RISK, evidence_source: 'backend', _mock_timestamp: TS });
assert(backendSrc.evidence_review_ready  === false,                                    '[D-01] blocked backend source');
assert(backendSrc.evidence_package_status === 'CONTROLLED_EVIDENCE_BLOCKED_EVIDENCE', '[D-02] status BLOCKED_EVIDENCE');

const noSrc = buildControlledExecutionEvidencePackage({ controlled_risk: GOOD_RISK, _mock_timestamp: TS });
assert(noSrc.evidence_package_status     === 'CONTROLLED_EVIDENCE_BLOCKED_EVIDENCE',  '[D-03] no source→BLOCKED');

// ─── Suite E: Valid package ───────────────────────────────────────
console.log('\n[Suite E] Valid package');
const valid = buildControlledExecutionEvidencePackage({
  controlled_risk:            GOOD_RISK,
  evidence_source:            'go-core',
  evidence_receipt_id:        'receipt-abc',
  ledger_chain_refs:          ['ref-1', 'ref-2', 'ref-3'],
  _mock_timestamp:            TS,
});
assert(valid.evidence_review_ready         === true,                                   '[E-01] evidence_review_ready=true');
assert(valid.evidence_package_status       === 'CONTROLLED_EVIDENCE_READY_REVIEW',    '[E-02] status=READY_REVIEW');
assert(valid.evidence_source               === 'go-core',                             '[E-03] evidence_source=go-core');
assert(valid.evidence_receipt_id           === 'receipt-abc',                         '[E-04] receipt_id set');
assert(valid.ledger_chain_refs.length      === 3,                                     '[E-05] 3 ledger refs');
assert(typeof valid.package_hash           === 'string' && valid.package_hash.length === 48, '[E-06] hash 48 chars');
assert(valid.blocking_reason               === null,                                   '[E-07] blocking_reason=null');
assert(valid.controlled_risk_status        === 'CONTROLLED_RISK_READY_REVIEW',        '[E-08] risk_status propagated');

// ─── Suite F: Invariants ──────────────────────────────────────────
console.log('\n[Suite F] Invariants');
assert(fix.deploy_allowed              === false, '[F-01] deploy_allowed=false');
assert(fix.promotion_allowed           === false, '[F-02] promotion_allowed=false');
assert(fix.stable_allowed              === false, '[F-03] stable_allowed=false');
assert(fix.tag_allowed                 === false, '[F-04] tag_allowed=false');
assert(fix.release_execution_allowed   === false, '[F-05] exec_allowed=false');
assert(fix.release_performed           === false, '[F-06] release_performed=false');
assert(fix.tag_created                 === false, '[F-07] tag_created=false');
assert(fix.stable_promoted             === false, '[F-08] stable_promoted=false');
assert(fix.deploy_performed            === false, '[F-09] deploy_performed=false');
assert(fix.production_execution_locked === true,  '[F-10] production_execution_locked=true');
assert(fix.unlock_executed             === false, '[F-11] unlock_executed=false');
assert(fix.controlled_execution_allowed === false,'[F-12] controlled_execution_allowed=false');
assert(fix.immutable                   === true,  '[F-13] immutable=true');
assert(fix.final_execution_phase_required === true,'[F-14] final_execution_phase_required=true');

assert(valid.production_execution_locked  === true,  '[F-15] valid: locked=true');
assert(valid.controlled_execution_allowed === false, '[F-16] valid: allowed=false');
assert(valid.unlock_executed              === false, '[F-17] valid: unlock=false');
assert(valid.immutable                    === true,  '[F-18] valid: immutable=true');
assert(valid.final_execution_phase_required === true,'[F-19] valid: final_exec=true');

// ─── Suite G: validateControlledExecutionEvidencePackage ──────────
console.log('\n[Suite G] Validate');
const vNull = validateControlledExecutionEvidencePackage(null);
assert(vNull.evidence_package_status === 'CONTROLLED_EVIDENCE_BLOCKED_RISK',          '[G-01] null→BLOCKED_RISK');
assert(vNull.evidence_review_ready   === false,                                        '[G-02] null ready=false');

const vOk = validateControlledExecutionEvidencePackage(fix);
assert(vOk.valid === true,                                                            '[G-03] fixture valid');
assert(vOk.controlled_evidence_package_id === fix.controlled_evidence_package_id,    '[G-04] id propagated');
assert(vOk.production_execution_locked === true,                                      '[G-05] locked=true');
assert(vOk.immutable === true,                                                        '[G-06] immutable=true');

// ─── Suite H: renderControlledExecutionEvidencePackageSummary ─────
console.log('\n[Suite H] Render');
const rendered = renderControlledExecutionEvidencePackageSummary(fix);
assert(typeof rendered === 'string',                                                  '[H-01] returns string');
assert(rendered.includes('CONTROLLED_EVIDENCE_READY_REVIEW'),                        '[H-02] status in output');
assert(rendered.includes('production_execution_locked       : true'),                '[H-03] lock in output');
assert(rendered.includes('controlled_execution_allowed      : false'),               '[H-04] allowed=false in output');
assert(rendered.includes('final_execution_phase_required    : true'),                '[H-05] final_exec in output');
assert(rendered.includes('immutable                         : true'),                '[H-06] immutable in output');
assert(renderControlledExecutionEvidencePackageSummary(null) === 'controlled_execution_evidence_package: null', '[H-07] null → string');

// ─── Suite I: Deterministic hash ──────────────────────────────────
console.log('\n[Suite I] Deterministic hash');
const p1 = buildControlledExecutionEvidencePackage({ controlled_risk: GOOD_RISK, evidence_source: 'go-core', evidence_receipt_id: 'r1', _mock_timestamp: TS });
const p2 = buildControlledExecutionEvidencePackage({ controlled_risk: GOOD_RISK, evidence_source: 'go-core', evidence_receipt_id: 'r1', _mock_timestamp: TS });
assert(p1.controlled_evidence_package_id === p2.controlled_evidence_package_id,     '[I-01] deterministic id');
assert(p1.package_hash === p2.package_hash,                                          '[I-02] deterministic hash');

// ─── Suite J: Blocked invariants ──────────────────────────────────
console.log('\n[Suite J] Blocked invariants');
const blk = buildControlledExecutionEvidencePackage({ _mock_timestamp: TS });
assert(blk.production_execution_locked  === true,  '[J-01] blocked: locked=true');
assert(blk.controlled_execution_allowed === false, '[J-02] blocked: allowed=false');
assert(blk.unlock_executed              === false, '[J-03] blocked: unlock=false');
assert(blk.final_execution_phase_required === true,'[J-04] blocked: final_exec=true');
assert(blk.immutable                    === true,  '[J-05] blocked: immutable=true');
assert(blk.evidence_review_ready        === false, '[J-06] blocked: ready=false');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\ncontrolled-execution-evidence-package: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
