// Use dynamic import to avoid module resolution issues
const contractModule = await import('file:///C:/Users/imadechumbo/Desktop/vision-core/tools/software-factory/software-factory-controlled-release-unlock-request-phase-gate.mjs');
const { build, validate, render, STATUSES } = contractModule;

console.log('CWD:', process.cwd());
console.log('Import meta URL:', import.meta.url);

const MODULE_NAME = 'software-factory-controlled-release-unlock-request-phase-gate';

// Helper to create valid base input
function validInput() {
  return {
    controlled_release_unlock_request_phase_gate_id: 'valid-phase-gate-id-123',
    final_unlock_authority_review_id: 'valid-review-id-123',
    final_unlock_authority_review_ready: true,
    ids: {
      controlled_release_unlock_request_contract: 'valid-contract-id-123',
      final_release_interlock_binder: 'valid-binder-id-123',
      unlock_request_evidence_receipt: 'valid-receipt-id-123',
      final_unlock_authority_review: 'valid-phase-gate-id-123',
    },
    phase_summary: 'Test phase summary',
  };
}

// Test suite
console.log('=== TESTING V445 CONTROLLED RELEASE UNLOCK REQUEST PHASE GATE ===');

// Test 1: STATUSES exported
console.log('\nTEST: STATUSES exported');
if (typeof STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_BLOCKED_INPUT !== 'string' ||
    typeof STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_BLOCKED_REVIEW !== 'string' ||
    typeof STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_INCOMPLETE !== 'string' ||
    typeof STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_READY !== 'string') {
  console.error('FAIL: STATUSES not properly exported');
} else {
  console.log('PASS: STATUSES exported');
}

// Test 2: build exported
console.log('\nTEST: build exported');
if (typeof build !== 'function') {
  console.error('FAIL: build not a function');
} else {
  console.log('PASS: build exported');
}

// Test 3: validate exported
console.log('\nTEST: validate exported');
if (typeof validate !== 'function') {
  console.error('FAIL: validate not a function');
} else {
  console.log('PASS: validate exported');
}

// Test 4: render exported
console.log('\nTEST: render exported');
if (typeof render !== 'function') {
  console.error('FAIL: render not a function');
} else {
  console.log('PASS: render exported');
}

// Test 5: null input → BLOCKED_INPUT
console.log('\nTEST: null input → BLOCKED_INPUT');
const resultNull = build(null);
if (resultNull.status !== STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_BLOCKED_INPUT || !resultNull.errors.includes('INPUT_IS_NULL')) {
  console.error('FAIL: null input not handled correctly');
} else {
  console.log('PASS: null input → BLOCKED_INPUT');
}

// Test 6: empty object → BLOCKED_INPUT
console.log('\nTEST: empty object → BLOCKED_INPUT');
const resultEmpty = build({});
if (resultEmpty.status !== STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_BLOCKED_INPUT || !resultEmpty.errors.includes('MISSING_REQUIRED_FIELD: controlled_release_unlock_request_phase_gate_id')) {
  console.error('FAIL: empty object not handled correctly');
  console.error('Actual errors:', resultEmpty.errors);
} else {
  console.log('PASS: empty object → BLOCKED_INPUT');
}

// Test 7: missing phase_gate_id → BLOCKED_INPUT (truly missing)
console.log('\nTEST: missing phase_gate_id → BLOCKED_INPUT');
const resultMissingPhaseGateId = { ...validInput() };
delete resultMissingPhaseGateId.controlled_release_unlock_request_phase_gate_id;
const test7Result = build(resultMissingPhaseGateId);
console.log('Test7 - Status:', test7Result.status, 'Errors:', test7Result.errors);
if (test7Result.status !== STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_BLOCKED_INPUT || !test7Result.errors.includes('MISSING_REQUIRED_FIELD: controlled_release_unlock_request_phase_gate_id')) {
  console.error('FAIL: missing phase_gate_id not handled correctly');
  console.error('Actual status:', test7Result.status);
  console.error('Actual errors:', test7Result.errors);
} else {
  console.log('PASS: missing phase_gate_id → BLOCKED_INPUT');
}

// Test 8: missing review_id → BLOCKED_INPUT (truly missing)
console.log('\nTEST: missing review_id → BLOCKED_INPUT');
const resultMissingReviewId = { ...validInput() };
delete resultMissingReviewId.final_unlock_authority_review_id;
const test8Result = build(resultMissingReviewId);
console.log('Test8 - Status:', test8Result.status, 'Errors:', test8Result.errors);
if (test8Result.status !== STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_BLOCKED_INPUT || !test8Result.errors.includes('MISSING_REQUIRED_FIELD: final_unlock_authority_review_id')) {
  console.error('FAIL: missing review_id not handled correctly');
  console.error('Actual status:', test8Result.status);
  console.error('Actual errors:', test8Result.errors);
} else {
  console.log('PASS: missing review_id → BLOCKED_INPUT');
}

// Test 9: missing review_ready → BLOCKED_INPUT (truly missing)
console.log('\nTEST: missing review_ready → BLOCKED_INPUT');
const resultMissingReviewReady = { ...validInput() };
delete resultMissingReviewReady.final_unlock_authority_review_ready;
const test9Result = build(resultMissingReviewReady);
console.log('Test9 - Status:', test9Result.status, 'Errors:', test9Result.errors);
if (test9Result.status !== STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_BLOCKED_INPUT || !test9Result.errors.includes('MISSING_REQUIRED_FIELD: final_unlock_authority_review_ready')) {
  console.error('FAIL: missing review_ready not handled correctly');
  console.error('Actual status:', test9Result.status);
  console.error('Actual errors:', test9Result.errors);
} else {
  console.log('PASS: missing review_ready → BLOCKED_INPUT');
}

// Test 10: review_ready not boolean → BLOCKED_INPUT
console.log('\nTEST: review_ready not boolean → BLOCKED_INPUT');
const resultNotBoolean = { ...validInput(), final_unlock_authority_review_ready: 'not-boolean' };
const test10Result = build(resultNotBoolean);
console.log('Test10 - Status:', test10Result.status, 'Errors:', test10Result.errors);
if (test10Result.status !== STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_BLOCKED_INPUT || !test10Result.errors.includes('INVALID_REVIEW_READY')) {
  console.error('FAIL: review_ready not boolean not handled correctly');
  console.error('Actual status:', test10Result.status);
  console.error('Actual errors:', test10Result.errors);
} else {
  console.log('PASS: review_ready not boolean → BLOCKED_INPUT');
}

// Test 11: review_ready === false → BLOCKED_REVIEW
console.log('\nTEST: review_ready === false → BLOCKED_REVIEW');
const resultReviewNotReady = { ...validInput(), final_unlock_authority_review_ready: false };
const test11Result = build(resultReviewNotReady);
console.log('Test11 - Status:', test11Result.status, 'Errors:', test11Result.errors);
if (test11Result.status !== STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_BLOCKED_REVIEW || !test11Result.errors.includes('REVIEW_NOT_READY')) {
  console.error('FAIL: review_ready false not handled correctly');
  console.error('Actual status:', test11Result.status);
  console.error('Actual errors:', test11Result.errors);
} else {
  console.log('PASS: review_ready === false → BLOCKED_REVIEW');
}

// Test 12: ids not an object → BLOCKED_INPUT
console.log('\nTEST: ids not an object → BLOCKED_INPUT');
const resultIdsNotObject = { ...validInput(), ids: 'not-an-object' };
const test12Result = build(resultIdsNotObject);
console.log('Test12 - Status:', test12Result.status, 'Errors:', test12Result.errors);
if (test12Result.status !== STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_BLOCKED_INPUT || !test12Result.errors.includes('IDS_NOT_AN_OBJECT')) {
  console.error('FAIL: ids not an object not handled correctly');
} else {
  console.log('PASS: ids not an object → BLOCKED_INPUT');
}

// Test 13: missing contract ID → INCOMPLETE
console.log('\nTEST: missing contract ID → INCOMPLETE');
const resultMissingContractId = { ...validInput() };
delete resultMissingContractId.ids.controlled_release_unlock_request_contract;
const test13Result = build(resultMissingContractId);
console.log('Test13 - Status:', test13Result.status, 'Errors:', test13Result.errors);
if (test13Result.status !== STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_INCOMPLETE || !test13Result.errors.includes('MISSING_REQUIRED_ID: controlled_release_unlock_request_contract')) {
  console.error('FAIL: missing contract ID not handled correctly');
} else {
  console.log('PASS: missing contract ID → INCOMPLETE');
}

// Test 14: missing binder ID → INCOMPLETE
console.log('\nTEST: missing binder ID → INCOMPLETE');
const resultMissingBinderId = { ...validInput() };
delete resultMissingBinderId.ids.final_release_interlock_binder;
const test14Result = build(resultMissingBinderId);
console.log('Test14 - Status:', test14Result.status, 'Errors:', test14Result.errors);
if (test14Result.status !== STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_INCOMPLETE || !test14Result.errors.includes('MISSING_REQUIRED_ID: final_release_interlock_binder')) {
  console.error('FAIL: missing binder ID not handled correctly');
} else {
  console.log('PASS: missing binder ID → INCOMPLETE');
}

// Test 15: missing receipt ID → INCOMPLETE
console.log('\nTEST: missing receipt ID → INCOMPLETE');
const resultMissingReceiptId = { ...validInput() };
delete resultMissingReceiptId.ids.unlock_request_evidence_receipt;
const test15Result = build(resultMissingReceiptId);
console.log('Test15 - Status:', test15Result.status, 'Errors:', test15Result.errors);
if (test15Result.status !== STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_INCOMPLETE || !test15Result.errors.includes('MISSING_REQUIRED_ID: unlock_request_evidence_receipt')) {
  console.error('FAIL: missing receipt ID not handled correctly');
} else {
  console.log('PASS: missing receipt ID → INCOMPLETE');
}

// Test 16: missing review ID → INCOMPLETE
console.log('\nTEST: missing review ID → INCOMPLETE');
const resultMissingPhaseGateId2 = { ...validInput() };
delete resultMissingPhaseGateId2.ids.final_unlock_authority_review;
const test16Result = build(resultMissingPhaseGateId2);
console.log('Test16 - Status:', test16Result.status, 'Errors:', test16Result.errors);
if (test16Result.status !== STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_INCOMPLETE || !test16Result.errors.includes('MISSING_REQUIRED_ID: final_unlock_authority_review')) {
  console.error('FAIL: missing review ID not handled correctly');
} else {
  console.log('PASS: missing review ID → INCOMPLETE');
}

// Test 17: empty string contract ID → INCOMPLETE
console.log('\nTEST: empty string contract ID → INCOMPLETE');
const resultEmptyContractId = { ...validInput() };
resultEmptyContractId.ids.controlled_release_unlock_request_contract = '';
const test17Result = build(resultEmptyContractId);
console.log('Test17 - Status:', test17Result.status, 'Errors:', test17Result.errors);
if (test17Result.status !== STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_INCOMPLETE || !test17Result.errors.includes('INVALID_CONTROLLED_RELEASE_UNLOCK_REQUEST_CONTRACT_ID')) {
  console.error('FAIL: empty contract ID not handled correctly');
} else {
  console.log('PASS: empty string contract ID → INCOMPLETE');
}

// Test 18: empty string binder ID → INCOMPLETE
console.log('\nTEST: empty string binder ID → INCOMPLETE');
const resultEmptyBinderId = { ...validInput() };
resultEmptyBinderId.ids.final_release_interlock_binder = '';
const test18Result = build(resultEmptyBinderId);
console.log('Test18 - Status:', test18Result.status, 'Errors:', test18Result.errors);
if (test18Result.status !== STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_INCOMPLETE || !test18Result.errors.includes('INVALID_FINAL_RELEASE_INTERLOCK_BINDER_ID')) {
  console.error('FAIL: empty binder ID not handled correctly');
} else {
  console.log('PASS: empty string binder ID → INCOMPLETE');
}

// Test 19: empty string receipt ID → INCOMPLETE
console.log('\nTEST: empty string receipt ID → INCOMPLETE');
const resultEmptyReceiptId = { ...validInput() };
resultEmptyReceiptId.ids.unlock_request_evidence_receipt = '';
const test19Result = build(resultEmptyReceiptId);
console.log('Test19 - Status:', test19Result.status, 'Errors:', test19Result.errors);
if (test19Result.status !== STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_INCOMPLETE || !test19Result.errors.includes('INVALID_UNLOCK_REQUEST_EVIDENCE_RECEIPT_ID')) {
  console.error('FAIL: empty receipt ID not handled correctly');
} else {
  console.log('PASS: empty string receipt ID → INCOMPLETE');
}

// Test 20: empty string review ID → INCOMPLETE
console.log('\nTEST: empty string review ID → INCOMPLETE');
const resultEmptyReviewId = { ...validInput() };
resultEmptyReviewId.ids.final_unlock_authority_review = '';
const test20Result = build(resultEmptyReviewId);
console.log('Test20 - Status:', test20Result.status, 'Errors:', test20Result.errors);
if (test20Result.status !== STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_INCOMPLETE || !test20Result.errors.includes('INVALID_FINAL_UNLOCK_AUTHORITY_REVIEW_ID')) {
  console.error('FAIL: empty review ID not handled correctly');
} else {
  console.log('PASS: empty string review ID → INCOMPLETE');
}

// Test 21: invalid phase_summary → INCOMPLETE
console.log('\nTEST: invalid phase_summary → INCOMPLETE');
const resultInvalidSummary = { ...validInput(), phase_summary: '' };
const test21Result = build(resultInvalidSummary);
console.log('Test21 - Status:', test21Result.status, 'Errors:', test21Result.errors);
if (test21Result.status !== STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_INCOMPLETE || !test21Result.errors.includes('INVALID_PHASE_SUMMARY')) {
  console.error('FAIL: invalid phase_summary not handled correctly');
} else {
  console.log('PASS: invalid phase_summary → INCOMPLETE');
}

// Test 22: valid input → READY
console.log('\nTEST: valid input → READY');
const resultReady = build(validInput());
if (resultReady.status !== STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_PHASE_GATE_READY || resultReady.errors.length > 0) {
  console.error('FAIL: valid input should be READY');
  console.error('Errors:', resultReady.errors);
} else {
  console.log('PASS: valid input → READY');
}

// Test 23: READY hash 64 chars
console.log('\nTEST: READY hash 64 chars');
if (resultReady.hash && resultReady.hash.length !== 64) {
  console.error('FAIL: READY hash should be 64 chars');
} else {
  console.log('PASS: READY hash 64 chars');
}

// Test 24: READY hash deterministic
console.log('\nTEST: READY hash deterministic');
const resultReady2 = build(validInput());
if (resultReady.hash !== resultReady2.hash) {
  console.error('FAIL: READY hash should be deterministic');
} else {
  console.log('PASS: READY hash deterministic');
}

// Test 25: READY modules_verified has 4 entries
console.log('\nTEST: READY modules_verified has 4 entries');
if (!Array.isArray(resultReady.modules_verified) || resultReady.modules_verified.length !== 4) {
  console.error('FAIL: modules_verified should have 4 entries');
} else {
  console.log('PASS: modules_verified has 4 entries');
}

// Test 26: READY final_message exact
console.log('\nTEST: READY final_message exact');
if (resultReady.final_message !== 'V441-V445 controlled release execution unlock request and final release interlock complete. Real release execution remains blocked until explicit V446 command.') {
  console.error('FAIL: final_message should be exact');
} else {
  console.log('PASS: final_message exact');
}

// Test 27: all critical flags false
console.log('\nTEST: all critical flags false');
const criticalFlags = [
  'release_allowed', 'deploy_allowed', 'stable_allowed', 'tag_allowed',
  'real_execution_allowed', 'real_release_executed', 'real_deploy_executed',
  'real_tag_created', 'real_stable_promoted', 'artifact_published',
  'production_touched', 'billing_executed', 'secrets_accessed',
  'network_accessed', 'rollback_executed', 'controlled_execution_lock_phase_passed',
  'controlled_real_release_execution_unlocked', 'final_controlled_execution_granted',
  'real_release_execution_allowed', 'real_release_hard_stop_lifted',
  'real_release_command_armed', 'controlled_release_unlock_requested',
  'final_release_interlock_bound', 'final_release_interlock_verified',
  'unlock_request_evidence_receipt_published', 'final_unlock_authority_reviewed',
  'final_unlock_authority_granted', 'controlled_release_unlock_request_phase_passed',
  'controlled_release_execution_unlocked',
];
let allFalse = true;
for (const flag of criticalFlags) {
  if (resultReady[flag] !== false) {
    allFalse = false;
    break;
  }
}
if (!allFalse) {
  console.error('FAIL: all critical flags should be false');
} else {
  console.log('PASS: all critical flags false');
}

// Test 28: validate READY → true
console.log('\nTEST: validate READY → true');
if (!validate(validInput())) {
  console.error('FAIL: validate READY should return true');
} else {
  console.log('PASS: validate READY → true');
}

// Test 29: validate null → false
console.log('\nTEST: validate null → false');
if (validate(null)) {
  console.error('FAIL: validate null should return false');
} else {
  console.log('PASS: validate null → false');
}

// Test 30: validate BLOCKED_INPUT → false
console.log('\nTEST: validate BLOCKED_INPUT → false');
const blockedInput = build({ ...validInput(), final_unlock_authority_review_ready: 'not-boolean' });
if (validate(blockedInput)) {
  console.error('FAIL: validate BLOCKED_INPUT should return false');
} else {
  console.log('PASS: validate BLOCKED_INPUT → false');
}

// Test 31: validate BLOCKED_REVIEW → false
console.log('\nTEST: validate BLOCKED_REVIEW → false');
const blockedReviewInput = build({ ...validInput(), final_unlock_authority_review_ready: false });
if (validate(blockedReviewInput)) {
  console.error('FAIL: validate BLOCKED_REVIEW should return false');
} else {
  console.log('PASS: validate BLOCKED_REVIEW → false');
}

// Test 32: validate INCOMPLETE → false
console.log('\nTEST: validate INCOMPLETE → false');
const incompleteInput = { ...validInput() };
delete incompleteInput.ids.controlled_release_unlock_request_contract;
const test32Result = build(incompleteInput);
if (validate(test32Result)) {
  console.error('FAIL: validate INCOMPLETE should return false');
} else {
  console.log('PASS: validate INCOMPLETE → false');
}

// Test 33: tamper flags true → validate false
console.log('\nTEST: tamper flags true → validate false');
const tamperedInput = {
  ...validInput(),
  release_allowed: true,
};
const tamperedResult = build(tamperedInput);
if (validate(tamperedResult)) {
  console.error('FAIL: tampered flags should cause validate false');
} else {
  console.log('PASS: tamper flags true → validate false');
}

// Test 34: wrong final_message → validate false
console.log('\nTEST: wrong final_message → validate false');
const wrongMessageInput = {
  ...validInput(),
  final_message: 'wrong message',
};
const wrongMessageResult = build(wrongMessageInput);
if (validate(wrongMessageResult)) {
  console.error('FAIL: wrong final_message should cause validate false');
} else {
  console.log('PASS: wrong final_message → validate false');
}

// Test 35: render contains REGRA ABSOLUTA
console.log('\nTEST: render contains REGRA ABSOLUTA');
const renderNull = render(null);
if (!renderNull.includes('SEM PASS GOLD REAL')) {
  console.error('FAIL: render null should contain REGRA');
} else {
  console.log('PASS: render contains REGRA ABSOLUTA');
}

// Test 36: render READY contains V445
console.log('\nTEST: render READY contains V445');
const renderReady = render(resultReady);
if (!renderReady.includes('V445')) {
  console.error('FAIL: render READY should contain V445');
} else {
  console.log('PASS: render READY contains V445');
}

// Test 37: render READY contains final_message
console.log('\nTEST: render READY contains final_message');
if (!renderReady.includes('V441-V445 controlled release execution unlock request and final release interlock complete')) {
  console.error('FAIL: render READY should contain final_message');
} else {
  console.log('PASS: render READY contains final_message');
}

// Test 38: render READY contains modules_verified
console.log('\nTEST: render READY contains modules_verified');
if (!renderReady.includes('"modules_verified":')) {
  console.error('FAIL: render READY should contain modules_verified');
} else {
  console.log('PASS: render READY contains modules_verified');
}

console.log('\n=== V445 TESTING COMPLETE ===');