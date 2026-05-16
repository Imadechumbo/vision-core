#!/usr/bin/env node
/**
 * Authority Review Fast Unit Tests — V15.11-pre
 * No subprocess spawning. No pi-harness invocation.
 * Covers authority-review.mjs contract logic directly.
 */

import {
  createAuthorityRoleRegistry,
  createHumanApprovalContract,
  validateHumanApprovalContract,
  evaluateAuthorityReviewGate,
  deriveAuthorityRequirements,
  deriveAuthorityConflicts,
  deriveAuthorityAuditTrail,
  renderAuthorityReviewSummary,
  renderAuthorityReviewGate,
} from '../hermes/authority-review.mjs';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

// ═══════════════════════════════════════════════════════════════
// Suite A — Authority Role Registry
// ═══════════════════════════════════════════════════════════════

console.log('\n[Suite A] Authority Role Registry');

const registry = createAuthorityRoleRegistry();

assert(registry !== null && typeof registry === 'object',                            '[A-01] registry is object');
assert(registry.schema_version === 'v15.10',                                         '[A-02] schema_version = v15.10');
assert(typeof registry.roles === 'object',                                           '[A-03] roles object present');
assert(Object.keys(registry.roles).length === 6,                                     '[A-04] 6 roles defined');
assert(registry.roles.observer    !== undefined,                                     '[A-05] observer role exists');
assert(registry.roles.reviewer    !== undefined,                                     '[A-06] reviewer role exists');
assert(registry.roles.release_authority  !== undefined,                              '[A-07] release_authority role exists');
assert(registry.roles.deploy_authority   !== undefined,                              '[A-08] deploy_authority role exists');
assert(registry.roles.stable_authority   !== undefined,                              '[A-09] stable_authority role exists');
assert(registry.roles.pass_gold_authority !== undefined,                             '[A-10] pass_gold_authority role exists');
assert(registry.roles.observer.can_review === true,                                  '[A-11] observer.can_review = true');
assert(registry.roles.observer.can_authorize_deploy === false,                       '[A-12] observer cannot deploy');
assert(registry.roles.stable_authority.can_authorize_stable === true,                '[A-13] stable_authority.can_authorize_stable = true');
assert(registry.roles.pass_gold_authority.can_override_evidence === false,           '[A-14] pass_gold_authority.can_override_evidence = false');
assert(registry.invariants.authority_cannot_override_pass_gold === true,             '[A-15] invariant: cannot override PASS GOLD');
assert(registry.invariants.authority_cannot_create_evidence === true,                '[A-16] invariant: cannot create evidence');
assert(registry.invariants.authority_cannot_execute_deploy === true,                 '[A-17] invariant: cannot execute deploy');

// ═══════════════════════════════════════════════════════════════
// Suite B — Contract Creation
// ═══════════════════════════════════════════════════════════════

console.log('\n[Suite B] Contract Creation');

const contractDefaults = createHumanApprovalContract({});

assert(contractDefaults.schema_version === 'v15.10',                                 '[B-01] schema_version = v15.10');
assert(typeof contractDefaults.contract_id === 'string',                             '[B-02] contract_id is string');
assert(contractDefaults.contract_id.startsWith('contract_'),                         '[B-03] contract_id prefix correct');
assert(contractDefaults.requested_action === 'review_only',                          '[B-04] default action = review_only');
assert(Array.isArray(contractDefaults.requested_scope),                              '[B-05] requested_scope is array');
assert(Array.isArray(contractDefaults.evidence_refs),                                '[B-06] evidence_refs is array');
assert(contractDefaults.review_decision === null,                                    '[B-07] review_decision defaults to null');
assert(contractDefaults.reviewed_by === null,                                        '[B-08] reviewed_by defaults to null');
assert(contractDefaults.status === 'CONTRACT_MISSING',                               '[B-09] initial status = CONTRACT_MISSING');
assert(contractDefaults.constraints.deploy_allowed === false,                        '[B-10] constraints.deploy_allowed = false');
assert(contractDefaults.constraints.tag_allowed === false,                           '[B-11] constraints.tag_allowed = false');
assert(contractDefaults.constraints.stable_allowed === false,                        '[B-12] constraints.stable_allowed = false');

const contractOverrides = createHumanApprovalContract({
  requested_action: 'release_review',
  reviewer_role: 'reviewer',
  reviewed_by: 'tester',
  review_decision: 'approved',
  evidence_refs: ['decision_matrix_ref', 'runtime_evidence_ref', 'authorization_manifest_ref'],
});
assert(contractOverrides.requested_action === 'release_review',                      '[B-13] override requested_action');
assert(contractOverrides.reviewer_role === 'reviewer',                               '[B-14] override reviewer_role');
assert(contractOverrides.reviewed_by === 'tester',                                   '[B-15] override reviewed_by');
assert(contractOverrides.review_decision === 'approved',                             '[B-16] override review_decision');
assert(contractOverrides.evidence_refs.length === 3,                                 '[B-17] evidence_refs 3 items');

// ═══════════════════════════════════════════════════════════════
// Suite C — Validate Human Approval Contract
// ═══════════════════════════════════════════════════════════════

console.log('\n[Suite C] Validate Human Approval Contract');

const vNull = validateHumanApprovalContract(null, {});
assert(vNull.status === 'CONTRACT_MISSING',                                          '[C-01] null contract → CONTRACT_MISSING');
assert(vNull.ok === false,                                                           '[C-02] null contract → ok=false');
assert(vNull.authority_sufficient === false,                                         '[C-03] null contract → authority_sufficient=false');
assert(vNull.invariants.deploy_allowed === false,                                    '[C-04] null contract → deploy_allowed=false');
assert(vNull.invariants.release_allowed === false,                                   '[C-05] null contract → release_allowed=false');

const cBadSchema = createHumanApprovalContract({ requested_action: 'review_only' });
cBadSchema.schema_version = 'v0.0.0';
const vBadSchema = validateHumanApprovalContract(cBadSchema, {});
assert(vBadSchema.status === 'CONTRACT_INVALID',                                     '[C-06] bad schema → CONTRACT_INVALID');
assert(vBadSchema.ok === false,                                                      '[C-07] bad schema → ok=false');
assert(vBadSchema.errors.length > 0,                                                 '[C-08] bad schema → errors non-empty');

const cBadAction = createHumanApprovalContract({ requested_action: 'delete_everything' });
const vBadAction = validateHumanApprovalContract(cBadAction, {});
assert(vBadAction.status === 'CONTRACT_INVALID',                                     '[C-09] unknown action → CONTRACT_INVALID');
assert(vBadAction.ok === false,                                                      '[C-10] unknown action → ok=false');
assert(vBadAction.errors.some(e => e.includes('invalid')),                           '[C-11] unknown action error contains "invalid"');

const cRejected = createHumanApprovalContract({ reviewer_role: 'reviewer', requested_action: 'release_review', review_decision: 'rejected' });
const vRejected = validateHumanApprovalContract(cRejected, {});
assert(vRejected.status === 'CONTRACT_REJECTED',                                     '[C-12] rejected → CONTRACT_REJECTED');
assert(vRejected.ok === false,                                                       '[C-13] rejected → ok=false');

const cExpired = createHumanApprovalContract({ reviewer_role: 'reviewer', requested_action: 'release_review', expires_at: Date.now() - 10000 });
const vExpired = validateHumanApprovalContract(cExpired, {});
assert(vExpired.status === 'CONTRACT_EXPIRED',                                       '[C-15] expired → CONTRACT_EXPIRED');
assert(vExpired.ok === false,                                                        '[C-16] expired → ok=false');
assert(vExpired.temporal_valid === false,                                            '[C-17] expired → temporal_valid=false');

const cForbiddenScope = createHumanApprovalContract({ reviewer_role: 'reviewer', requested_action: 'release_review', requested_scope: ['production_deploy'] });
const vForbiddenScope = validateHumanApprovalContract(cForbiddenScope, {});
assert(vForbiddenScope.status === 'CONTRACT_SCOPE_MISMATCH',                         '[C-18] forbidden scope → CONTRACT_SCOPE_MISMATCH');
assert(vForbiddenScope.ok === false,                                                  '[C-19] forbidden scope → ok=false');
assert(vForbiddenScope.scope_valid === false,                                         '[C-20] forbidden scope → scope_valid=false');

const cRoleInsufficient = createHumanApprovalContract({ reviewer_role: 'observer', requested_action: 'release_review' });
const vRoleInsufficient = validateHumanApprovalContract(cRoleInsufficient, {});
assert(vRoleInsufficient.status === 'CONTRACT_AUTHORITY_INSUFFICIENT',               '[C-21] insufficient role → CONTRACT_AUTHORITY_INSUFFICIENT');
assert(vRoleInsufficient.ok === false,                                               '[C-22] insufficient role → ok=false');
assert(vRoleInsufficient.authority_sufficient === false,                             '[C-23] insufficient role → authority_sufficient=false');

const cNoEvidence = createHumanApprovalContract({
  reviewer_role: 'reviewer',
  requested_action: 'release_review',
  evidence_refs: [],
  required_evidence_refs: ['decision_matrix_ref', 'runtime_evidence_ref', 'authorization_manifest_ref'],
});
const vNoEvidence = validateHumanApprovalContract(cNoEvidence, {});
assert(vNoEvidence.status === 'CONTRACT_EVIDENCE_MISSING',                           '[C-24] no evidence → CONTRACT_EVIDENCE_MISSING');
assert(vNoEvidence.ok === false,                                                     '[C-25] no evidence → ok=false');
assert(vNoEvidence.missing_evidence.length > 0,                                      '[C-26] no evidence → missing_evidence non-empty');

const cValid = createHumanApprovalContract({
  reviewer_role: 'reviewer',
  requested_action: 'release_review',
  reviewed_by: 'tester',
  review_decision: 'approved',
  evidence_refs: ['decision_matrix_ref', 'runtime_evidence_ref', 'authorization_manifest_ref'],
});
const vValid = validateHumanApprovalContract(cValid, {});
assert(vValid.status === 'CONTRACT_VALID',                                           '[C-27] valid contract → CONTRACT_VALID');
assert(vValid.ok === true,                                                           '[C-28] valid contract → ok=true');
assert(vValid.authority_sufficient === true,                                         '[C-29] valid contract → authority_sufficient=true');
assert(vValid.invariants.deploy_allowed === false,                                   '[C-30] valid contract → deploy_allowed=false (invariant)');

const baseOpts = {
  reviewer_role: 'reviewer',
  requested_action: 'release_review',
  reviewed_by: 'tester',
  evidence_refs: ['decision_matrix_ref', 'runtime_evidence_ref', 'authorization_manifest_ref'],
};

const cPending = createHumanApprovalContract({ ...baseOpts, review_decision: 'pending' });
const vPending = validateHumanApprovalContract(cPending, {});
assert(vPending.status === 'CONTRACT_PARTIAL',                                       '[C-31] pending → CONTRACT_PARTIAL (not VALID)');
assert(vPending.ok === false,                                                        '[C-32] pending → ok=false');

const cDenied = createHumanApprovalContract({ ...baseOpts, review_decision: 'denied' });
const vDenied = validateHumanApprovalContract(cDenied, {});
assert(vDenied.status === 'CONTRACT_PARTIAL',                                        '[C-33] denied → CONTRACT_PARTIAL (not VALID)');
assert(vDenied.ok === false,                                                         '[C-34] denied → ok=false');

const cUnknown = createHumanApprovalContract({ ...baseOpts, review_decision: 'unknown_value' });
const vUnknown = validateHumanApprovalContract(cUnknown, {});
assert(vUnknown.status === 'CONTRACT_PARTIAL',                                       '[C-35] unknown decision → CONTRACT_PARTIAL (not VALID)');
assert(vUnknown.ok === false,                                                        '[C-36] unknown decision → ok=false');

const cEmpty = createHumanApprovalContract({ ...baseOpts, review_decision: '' });
const vEmpty = validateHumanApprovalContract(cEmpty, {});
assert(vEmpty.status === 'CONTRACT_PARTIAL',                                         '[C-37] empty string decision → CONTRACT_PARTIAL');
assert(vEmpty.ok === false,                                                          '[C-38] empty string decision → ok=false');

const cApproved = createHumanApprovalContract({ ...baseOpts, review_decision: 'approved' });
const vApproved = validateHumanApprovalContract(cApproved, {});
assert(vApproved.status === 'CONTRACT_VALID',                                        '[C-39] approved + valid gates → CONTRACT_VALID');
assert(vApproved.ok === true,                                                        '[C-40] approved + valid gates → ok=true');

// ═══════════════════════════════════════════════════════════════
// Suite D — Evaluate Authority Review Gate (invariants)
// ═══════════════════════════════════════════════════════════════

console.log('\n[Suite D] Evaluate Authority Review Gate — invariants');

const gateNull = evaluateAuthorityReviewGate(null, {});
assert(gateNull.deploy_allowed === false,                                            '[D-01] null contract → deploy_allowed=false');
assert(gateNull.release_allowed === false,                                           '[D-02] null contract → release_allowed=false');
assert(gateNull.tag_allowed === false,                                               '[D-03] null contract → tag_allowed=false');
assert(gateNull.stable_allowed === false,                                            '[D-04] null contract → stable_allowed=false');
assert(gateNull.promotion_allowed === false,                                         '[D-05] null contract → promotion_allowed=false');

const gateValid = evaluateAuthorityReviewGate(cApproved, {});
assert(gateValid.deploy_allowed === false,                                           '[D-06] valid contract → deploy_allowed=false (invariant)');
assert(gateValid.release_allowed === false,                                          '[D-07] valid contract → release_allowed=false (invariant)');
assert(gateValid.tag_allowed === false,                                              '[D-08] valid contract → tag_allowed=false (invariant)');
assert(gateValid.stable_allowed === false,                                           '[D-09] valid contract → stable_allowed=false (invariant)');
assert(gateValid.promotion_allowed === false,                                        '[D-10] valid contract → promotion_allowed=false (invariant)');
assert(typeof gateValid.authority_review_valid === 'boolean',                        '[D-11] authority_review_valid is boolean');
assert(gateValid.enabled === true,                                                   '[D-12] gate.enabled = true');
assert(typeof gateValid.schema_version === 'string',                                 '[D-13] schema_version present');
assert(gateValid.note.includes('not execution'),                                     '[D-14] note contains "not execution"');

const cPassGold = createHumanApprovalContract({
  reviewer_role: 'pass_gold_authority',
  requested_action: 'pass_gold_confirmation',
  reviewed_by: 'gold-reviewer',
  review_decision: 'approved',
  evidence_refs: ['decision_matrix_ref'],
});
const gatePassGold = evaluateAuthorityReviewGate(cPassGold, {});
assert(gatePassGold.deploy_allowed === false,                                        '[D-15] pass_gold no go_core → deploy_allowed=false');
assert(gatePassGold.pass_gold_confirmed === false,                                   '[D-16] pass_gold no go_core → pass_gold_confirmed=false');

// ═══════════════════════════════════════════════════════════════
// Suite E — Derive Authority Requirements
// ═══════════════════════════════════════════════════════════════

console.log('\n[Suite E] Derive Authority Requirements');

const reqs = deriveAuthorityRequirements('release_review', null, null);
assert(Array.isArray(reqs),                                                          '[E-01] requirements is array');
assert(reqs.length === 13,                                                           '[E-02] 13 requirements defined');
assert(reqs.every(r => typeof r.id === 'string'),                                    '[E-03] all requirements have id');
assert(reqs.every(r => typeof r.required === 'boolean'),                             '[E-04] all requirements have required flag');
assert(reqs.every(r => typeof r.blocking_if_missing === 'boolean'),                  '[E-05] all requirements have blocking_if_missing flag');
assert(reqs.some(r => r.id === 'no_fake_evidence'),                                  '[E-06] no_fake_evidence requirement present');
assert(reqs.some(r => r.id === 'no_allowed_flags_true'),                             '[E-07] no_allowed_flags_true requirement present');
assert(reqs.some(r => r.id === 'no_conflict_with_pass_gold'),                        '[E-08] no_conflict_with_pass_gold requirement present');

// ═══════════════════════════════════════════════════════════════
// Suite F — Derive Authority Conflicts
// ═══════════════════════════════════════════════════════════════

console.log('\n[Suite F] Derive Authority Conflicts');

const conflictsNull = deriveAuthorityConflicts(null, {});
assert(Array.isArray(conflictsNull),                                                 '[F-01] null contract → empty conflicts array');
assert(conflictsNull.length === 0,                                                   '[F-02] null contract → 0 conflicts');

const cBackend = createHumanApprovalContract({
  reviewer_role: 'reviewer',
  requested_action: 'release_review',
  evidence_refs: ['backend_receipt_123'],
});
const conflictsBackend = deriveAuthorityConflicts(cBackend, {});
assert(conflictsBackend.some(c => c.severity === 'critical'),                        '[F-03] backend evidence → critical conflict');
assert(conflictsBackend.some(c => c.id === 'authority_attempts_to_create_evidence'), '[F-04] correct conflict id for backend evidence');

const cRej = createHumanApprovalContract({ reviewer_role: 'reviewer', requested_action: 'release_review', review_decision: 'rejected' });
const conflictsRej = deriveAuthorityConflicts(cRej, {});
assert(conflictsRej.some(c => c.id === 'authority_rejected_but_used'),               '[F-05] rejected → authority_rejected_but_used conflict');

// ═══════════════════════════════════════════════════════════════
// Suite G — Render Functions
// ═══════════════════════════════════════════════════════════════

console.log('\n[Suite G] Render Functions');

const gateFull = evaluateAuthorityReviewGate(cApproved, {});
const summary = renderAuthorityReviewSummary(gateFull);
const rendered = renderAuthorityReviewGate(gateFull);

assert(summary !== null,                                                             '[G-01] summary not null');
assert(summary.deploy_allowed === false,                                             '[G-02] summary.deploy_allowed = false');
assert(summary.release_allowed === false,                                            '[G-03] summary.release_allowed = false');
assert(summary.tag_allowed === false,                                                '[G-04] summary.tag_allowed = false');
assert(summary.stable_allowed === false,                                             '[G-05] summary.stable_allowed = false');
assert(summary.promotion_allowed === false,                                          '[G-06] summary.promotion_allowed = false');
assert(summary.schema_version === 'v15.10',                                          '[G-07] summary.schema_version = v15.10');
assert(typeof summary.missing_evidence_count === 'number',                           '[G-08] summary.missing_evidence_count is number');
assert(typeof summary.conflict_count === 'number',                                   '[G-09] summary.conflict_count is number');

assert(rendered !== null,                                                            '[G-10] rendered not null');
assert(rendered.deploy_allowed === false,                                            '[G-11] rendered.deploy_allowed = false');
assert(rendered.release_allowed === false,                                           '[G-12] rendered.release_allowed = false');
assert(Array.isArray(rendered.approved_actions),                                     '[G-13] rendered.approved_actions is array');
assert(Array.isArray(rendered.missing_evidence),                                     '[G-14] rendered.missing_evidence is array');

assert(renderAuthorityReviewSummary(null) === null,                                  '[G-15] null gate → null summary');
assert(renderAuthorityReviewGate(null) === null,                                     '[G-16] null gate → null rendered');

// ═══════════════════════════════════════════════════════════════
// Suite J — Schema Invariants Across All Statuses
// ═══════════════════════════════════════════════════════════════

console.log('\n[Suite J] Schema Invariants — all gate outputs');

const allGates = [
  evaluateAuthorityReviewGate(null, {}),
  evaluateAuthorityReviewGate(cBadSchema, {}),
  evaluateAuthorityReviewGate(cRejected, {}),
  evaluateAuthorityReviewGate(cExpired, {}),
  evaluateAuthorityReviewGate(cForbiddenScope, {}),
  evaluateAuthorityReviewGate(cRoleInsufficient, {}),
  evaluateAuthorityReviewGate(cNoEvidence, {}),
  evaluateAuthorityReviewGate(cValid, {}),
  evaluateAuthorityReviewGate(cApproved, {}),
];

for (const g of allGates) {
  assert(g.deploy_allowed === false,    `[J] deploy_allowed=false for status=${g.authority_review_status}`);
  assert(g.release_allowed === false,   `[J] release_allowed=false for status=${g.authority_review_status}`);
  assert(g.tag_allowed === false,       `[J] tag_allowed=false for status=${g.authority_review_status}`);
  assert(g.stable_allowed === false,    `[J] stable_allowed=false for status=${g.authority_review_status}`);
  assert(g.promotion_allowed === false, `[J] promotion_allowed=false for status=${g.authority_review_status}`);
}

// ═══════════════════════════════════════════════════════════════
// Result
// ═══════════════════════════════════════════════════════════════

console.log(`\nAuthority Unit Tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
