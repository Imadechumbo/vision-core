#!/usr/bin/env node
/**
 * Unlock Governance Baseline — Unit Tests V65.0
 */

import {
  runUnlockGovernanceBaseline,
  renderUnlockGovernanceBaseline,
  UNLOCK_GOVERNANCE_BASELINE_STATUSES,
} from '../unlock-governance-baseline.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T00:00:00.000Z';

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(UNLOCK_GOVERNANCE_BASELINE_STATUSES),                               '[A-01] statuses array');
assert(UNLOCK_GOVERNANCE_BASELINE_STATUSES.length === 6,                                 '[A-02] 6 statuses');
assert(UNLOCK_GOVERNANCE_BASELINE_STATUSES.includes('UNLOCK_GOVERNANCE_BASELINE_BLOCKED_MODULES'),   '[A-03] BLOCKED_MODULES');
assert(UNLOCK_GOVERNANCE_BASELINE_STATUSES.includes('UNLOCK_GOVERNANCE_BASELINE_BLOCKED_CONSTANTS'), '[A-04] BLOCKED_CONSTANTS');
assert(UNLOCK_GOVERNANCE_BASELINE_STATUSES.includes('UNLOCK_GOVERNANCE_BASELINE_BLOCKED_TESTS'),     '[A-05] BLOCKED_TESTS');
assert(UNLOCK_GOVERNANCE_BASELINE_STATUSES.includes('UNLOCK_GOVERNANCE_BASELINE_BLOCKED_INVARIANTS'),'[A-06] BLOCKED_INVARIANTS');
assert(UNLOCK_GOVERNANCE_BASELINE_STATUSES.includes('UNLOCK_GOVERNANCE_BASELINE_BLOCKED_LEDGER'),    '[A-07] BLOCKED_LEDGER');
assert(UNLOCK_GOVERNANCE_BASELINE_STATUSES.includes('UNLOCK_GOVERNANCE_BASELINE_READY'),             '[A-08] READY');

// ─── Suite B: Full baseline ready ─────────────────────────────────
console.log('\n[Suite B] Full baseline ready');
const result = runUnlockGovernanceBaseline({ _mock_timestamp: TS });
assert(result !== null && typeof result === 'object',                                    '[B-01] returns object');
assert(result.baseline_status                === 'UNLOCK_GOVERNANCE_BASELINE_READY',    '[B-02] status=READY');
assert(result.baseline_ready                 === true,                                   '[B-03] baseline_ready=true');
assert(result.schema_version                 === 'v65.0',                                '[B-04] schema=v65.0');
assert(typeof result.baseline_hash           === 'string' && result.baseline_hash.length === 48, '[B-05] baseline_hash 48 chars');
assert(result.module_count                   === 7,                                      '[B-06] 7 modules');
assert(Array.isArray(result.governance_modules) && result.governance_modules.length === 7, '[B-07] governance_modules array');
assert(result.invariants_verified            === true,                                   '[B-08] invariants_verified=true');
assert(result.blocking_reason                === null,                                   '[B-09] blocking_reason=null');

// ─── Suite C: Smoke test results ──────────────────────────────────
console.log('\n[Suite C] Smoke test results');
assert(result.smoke_test_results?.contract_ready    === true,                            '[C-01] contract_ready');
assert(result.smoke_test_results?.authority_ready   === true,                            '[C-02] authority_ready');
assert(result.smoke_test_results?.binding_ready     === true,                            '[C-03] binding_ready');
assert(result.smoke_test_results?.decision_ready    === true,                            '[C-04] decision_ready');
assert(result.smoke_test_results?.evidence_ready    === true,                            '[C-05] evidence_ready');
assert(result.smoke_test_results?.report_ready      === true,                            '[C-06] report_ready');
assert(result.smoke_test_results?.ledger_chain_valid === true,                           '[C-07] ledger_chain_valid');

// ─── Suite D: Governance modules listed ───────────────────────────
console.log('\n[Suite D] Governance modules');
assert(result.governance_modules.includes('production_unlock_contract'),                 '[D-01] production_unlock_contract');
assert(result.governance_modules.includes('unlock_human_authority_contract'),            '[D-02] unlock_human_authority_contract');
assert(result.governance_modules.includes('unlock_contract_authority_binding'),          '[D-03] unlock_contract_authority_binding');
assert(result.governance_modules.includes('unlock_decision_matrix'),                     '[D-04] unlock_decision_matrix');
assert(result.governance_modules.includes('unlock_evidence_review_package'),             '[D-05] unlock_evidence_review_package');
assert(result.governance_modules.includes('unlock_review_ledger'),                       '[D-06] unlock_review_ledger');
assert(result.governance_modules.includes('unlock_review_report'),                       '[D-07] unlock_review_report');

// ─── Suite E: renderUnlockGovernanceBaseline ──────────────────────
console.log('\n[Suite E] Render');
const rendered = renderUnlockGovernanceBaseline(result);
assert(typeof rendered                       === 'string',                               '[E-01] returns string');
assert(rendered.includes('UNLOCK_GOVERNANCE_BASELINE_READY'),                           '[E-02] status in output');
assert(rendered.includes('production_execution_locked    : true'),                      '[E-03] lock in output');
assert(rendered.includes('unlock_executed                : false'),                      '[E-04] unlock_executed in output');
assert(rendered.includes('future_execution_phase_required: true'),                      '[E-05] future_exec in output');
assert(rendered.includes('invariants_verified            : true'),                      '[E-06] invariants in output');
assert(renderUnlockGovernanceBaseline(null)  === 'unlock_governance_baseline: null',    '[E-07] null → string');

// ─── Suite F: Invariants ─────────────────────────────────────────
console.log('\n[Suite F] Invariants');
assert(result.deploy_allowed              === false, '[F-01] deploy_allowed=false');
assert(result.promotion_allowed           === false, '[F-02] promotion_allowed=false');
assert(result.stable_allowed              === false, '[F-03] stable_allowed=false');
assert(result.tag_allowed                 === false, '[F-04] tag_allowed=false');
assert(result.release_execution_allowed   === false, '[F-05] exec_allowed=false');
assert(result.release_performed           === false, '[F-06] release_performed=false');
assert(result.tag_created                 === false, '[F-07] tag_created=false');
assert(result.stable_promoted             === false, '[F-08] stable_promoted=false');
assert(result.deploy_performed            === false, '[F-09] deploy_performed=false');
assert(result.production_execution_locked === true,  '[F-10] production_execution_locked=true');
assert(result.unlock_executed             === false, '[F-11] unlock_executed=false');
assert(result.unlock_review_only          === true,  '[F-12] unlock_review_only=true');
assert(result.future_execution_phase_required === true, '[F-13] future_execution_phase_required=true');

// ─── Suite G: Idempotent ──────────────────────────────────────────
console.log('\n[Suite G] Idempotent');
const result2 = runUnlockGovernanceBaseline({ _mock_timestamp: TS });
assert(result2.baseline_ready             === true,  '[G-01] second run ready');
assert(result2.baseline_status            === 'UNLOCK_GOVERNANCE_BASELINE_READY', '[G-02] second run status=READY');
assert(result2.baseline_hash              === result.baseline_hash, '[G-03] deterministic hash');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nunlock-governance-baseline: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
