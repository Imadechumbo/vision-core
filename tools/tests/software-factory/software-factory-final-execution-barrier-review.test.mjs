// Use dynamic import to avoid module resolution issues
const contractModule = await import('file:///C:/Users/imadechumbo/Desktop/vision-core/tools/software-factory/software-factory-final-execution-barrier-review.mjs');
const { build, validate, render, STATUSES } = contractModule;

console.log('CWD:', process.cwd());
console.log('Import meta URL:', import.meta.url);

const MODULE_NAME = 'software-factory-final-execution-barrier-review';

// Helper to create valid base input
function validInput() {
  return {
    final_execution_barrier_review_id: 'valid-review-id-123',
    unlock_decision_evidence_receipt_id: 'valid-receipt-id-123',
    unlock_decision_evidence_receipt_ready: true,
    barrier_review_actor: 'barrier-operator',
    barrier_review_reason: 'test-barrier-reason',
    barrier_review_mode: 'metadata-only',
    barrier_review_items: [
      {
        barrier_review_item_id: 'item1',
        barrier_review_type: 'final_release_execution_barrier_review',
        barrier_review_mode: 'metadata-only',
        barrier_review_hash: 'a'.repeat(64),
      },
    ],
    required_barrier_review_controls: [
      'final-execution-barrier-review-required',
      'unlock-decision-evidence-required',
      'metadata-only-review',
      'barrier-lift-not-granted',
      'barrier-not-lifted',
      'controlled-release-not-unlocked',
      'real-release-not-executed',
      'real-release-command-not-armed',
      'hard-stop-not-lifted',
      'no-real-release',
      'no-real-deploy',
      'no-tag-create',
      'no-stable-promotion',
      'no-artifact-publish',
      'no-production-touch',
      'no-billing-execution',
      'no-secret-access',
      'no-network',
      'no-real-rollback',
      'audit-required',
      'pass-gold-real-required',
    ],
  };
}

// Test suite
console.log('=== TESTING V449 FINAL EXECUTION BARRIER REVIEW ===');

// Test 1: STATUSES exported
console.log('\nTEST: STATUSES exported');
if (typeof STATUSES.FINAL_EXECUTION_BARRIER_REVIEW_BLOCKED_INPUT !== 'string' ||
    typeof STATUSES.FINAL_EXECUTION_BARRIER_REVIEW_BLOCKED_EVIDENCE !== 'string' ||
    typeof STATUSES.FINAL_EXECUTION_BARRIER_REVIEW_FAIL !== 'string' ||
    typeof STATUSES.FINAL_EXECUTION_BARRIER_REVIEW_READY !== 'string') {
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
if (resultNull.status !== STATUSES.FINAL_EXECUTION_BARRIER_REVIEW_BLOCKED_INPUT || !resultNull.errors.includes('INPUT_IS_NULL')) {
  console.error('FAIL: null input not handled correctly');
} else {
  console.log('PASS: null input → BLOCKED_INPUT');
}

// Test 6: empty object → BLOCKED_INPUT
console.log('\nTEST: empty object → BLOCKED_INPUT');
const resultEmpty = build({});
if (resultEmpty.status !== STATUSES.FINAL_EXECUTION_BARRIER_REVIEW_BLOCKED_INPUT || !resultEmpty.errors.includes('MISSING_REQUIRED_FIELD: final_execution_barrier_review_id')) {
  console.error('FAIL: empty object not handled correctly');
  console.error('Actual errors:', resultEmpty.errors);
} else {
  console.log('PASS: empty object → BLOCKED_INPUT');
}

// Test 7: missing review id → BLOCKED_INPUT (truly missing)
console.log('\nTEST: missing review id → BLOCKED_INPUT');
const resultMissingReviewId = { ...validInput() };
delete resultMissingReviewId.final_execution_barrier_review_id;
const test7Result = build(resultMissingReviewId);
console.log('Test7 - Status:', test7Result.status, 'Errors:', test7Result.errors);
if (test7Result.status !== STATUSES.FINAL_EXECUTION_BARRIER_REVIEW_BLOCKED_INPUT || !test7Result.errors.includes('MISSING_REQUIRED_FIELD: final_execution_barrier_review_id')) {
  console.error('FAIL: missing review id not handled correctly');
  console.error('Actual status:', test7Result.status);
  console.error('Actual errors:', test7Result.errors);
} else {
  console.log('PASS: missing review id → BLOCKED_INPUT');
}

// Test 8: missing receipt id → BLOCKED_INPUT (truly missing)
console.log('\nTEST: missing receipt id → BLOCKED_INPUT');
const resultMissingReceiptId = { ...validInput() };
delete resultMissingReceiptId.unlock_decision_evidence_receipt_id;
const test8Result = build(resultMissingReceiptId);
console.log('Test8 - Status:', test8Result.status, 'Errors:', test8Result.errors);
if (test8Result.status !== STATUSES.FINAL_EXECUTION_BARRIER_REVIEW_BLOCKED_INPUT || !test8Result.errors.includes('MISSING_REQUIRED_FIELD: unlock_decision_evidence_receipt_id')) {
  console.error('FAIL: missing receipt id not handled correctly');
  console.error('Actual status:', test8Result.status);
  console.error('Actual errors:', test8Result.errors);
} else {
  console.log('PASS: missing receipt id → BLOCKED_INPUT');
}

// Test 9: missing receipt_ready → BLOCKED_INPUT (truly missing)
console.log('\nTEST: missing receipt_ready → BLOCKED_INPUT');
const resultMissingReceiptReady = { ...validInput() };
delete resultMissingReceiptReady.unlock_decision_evidence_receipt_ready;
const test9Result = build(resultMissingReceiptReady);
console.log('Test9 - Status:', test9Result.status, 'Errors:', test9Result.errors);
if (test9Result.status !== STATUSES.FINAL_EXECUTION_BARRIER_REVIEW_BLOCKED_INPUT || !test9Result.errors.includes('MISSING_REQUIRED_FIELD: unlock_decision_evidence_receipt_ready')) {
  console.error('FAIL: missing receipt_ready not handled correctly');
  console.error('Actual status:', test9Result.status);
  console.error('Actual errors:', test9Result.errors);
} else {
  console.log('PASS: missing receipt_ready → BLOCKED_INPUT');
}

// Test 10: receipt_ready not boolean → BLOCKED_INPUT
console.log('\nTEST: receipt_ready not boolean → BLOCKED_INPUT');
const resultNotBoolean = { ...validInput(), unlock_decision_evidence_receipt_ready: 'not-boolean' };
const test10Result = build(resultNotBoolean);
console.log('Test10 - Status:', test10Result.status, 'Errors:', test10Result.errors);
if (test10Result.status !== STATUSES.FINAL_EXECUTION_BARRIER_REVIEW_BLOCKED_INPUT || !test10Result.errors.includes('INVALID_RECEIPT_READY')) {
  console.error('FAIL: receipt_ready not boolean not handled correctly');
  console.error('Actual status:', test10Result.status);
  console.error('Actual errors:', test10Result.errors);
} else {
  console.log('PASS: receipt_ready not boolean → BLOCKED_INPUT');
}

// Test 11: receipt_ready === false → BLOCKED_EVIDENCE
console.log('\nTEST: receipt_ready === false → BLOCKED_EVIDENCE');
const resultReceiptNotReady = { ...validInput(), unlock_decision_evidence_receipt_ready: false };
const test11Result = build(resultReceiptNotReady);
console.log('Test11 - Status:', test11Result.status, 'Errors:', test11Result.errors);
if (test11Result.status !== STATUSES.FINAL_EXECUTION_BARRIER_REVIEW_BLOCKED_EVIDENCE || !test11Result.errors.includes('EVIDENCE_NOT_READY')) {
  console.error('FAIL: receipt_ready false not handled correctly');
  console.error('Actual status:', test11Result.status);
  console.error('Actual errors:', test11Result.errors);
} else {
  console.log('PASS: receipt_ready === false → BLOCKED_EVIDENCE');
}

// Test 12: missing barrier_review_actor → BLOCKED_INPUT
console.log('\nTEST: missing barrier_review_actor → BLOCKED_INPUT');
const resultMissingActor = { ...validInput() };
delete resultMissingActor.barrier_review_actor;
const test12Result = build(resultMissingActor);
console.log('Test12 - Status:', test12Result.status, 'Errors:', test12Result.errors);
if (test12Result.status !== STATUSES.FINAL_EXECUTION_BARRIER_REVIEW_BLOCKED_INPUT || !test12Result.errors.includes('MISSING_REQUIRED_FIELD: barrier_review_actor')) {
  console.error('FAIL: missing barrier_review_actor not handled correctly');
  console.error('Actual status:', test12Result.status);
  console.error('Actual errors:', test12Result.errors);
} else {
  console.log('PASS: missing barrier_review_actor → BLOCKED_INPUT');
}

// Test 13: missing barrier_review_reason → BLOCKED_INPUT
console.log('\nTEST: missing barrier_review_reason → BLOCKED_INPUT');
const resultMissingReason = { ...validInput() };
delete resultMissingReason.barrier_review_reason;
const test13Result = build(resultMissingReason);
console.log('Test13 - Status:', test13Result.status, 'Errors:', test13Result.errors);
if (test13Result.status !== STATUSES.FINAL_EXECUTION_BARRIER_REVIEW_BLOCKED_INPUT || !test13Result.errors.includes('MISSING_REQUIRED_FIELD: barrier_review_reason')) {
  console.error('FAIL: missing barrier_review_reason not handled correctly');
  console.error('Actual status:', test13Result.status);
  console.error('Actual errors:', test13Result.errors);
} else {
  console.log('PASS: missing barrier_review_reason → BLOCKED_INPUT');
}

// Test 14: invalid barrier_mode → FAIL
console.log('\nTEST: invalid barrier_mode → FAIL');
const inputInvalidMode = {
  ...validInput(),
  barrier_review_items: [
    {
      ...validInput().barrier_review_items[0],
      barrier_review_mode: 'invalid-mode',
    },
  ],
};
const test14Result = build(inputInvalidMode);
console.log('Test14 - Status:', test14Result.status, 'Errors:', test14Result.errors);
if (test14Result.status !== STATUSES.FINAL_EXECUTION_BARRIER_REVIEW_FAIL || !test14Result.errors.includes('BARRIER_REVIEW_ITEM_0_INVALID_MODE')) {
  console.error('FAIL: invalid barrier_mode not handled correctly');
} else {
  console.log('PASS: invalid barrier_mode → FAIL');
}

// Test 15: invalid barrier_type → FAIL
console.log('\nTEST: invalid barrier_type → FAIL');
const inputInvalidType = {
  ...validInput(),
  barrier_review_items: [
    {
      ...validInput().barrier_review_items[0],
      barrier_review_type: 'invalid-type',
    },
  ],
};
const test15Result = build(inputInvalidType);
console.log('Test15 - Status:', test15Result.status, 'Errors:', test15Result.errors);
if (test15Result.status !== STATUSES.FINAL_EXECUTION_BARRIER_REVIEW_FAIL || !test15Result.errors.includes('BARRIER_REVIEW_ITEM_0_INVALID_TYPE')) {
  console.error('FAIL: invalid barrier_type not handled correctly');
} else {
  console.log('PASS: invalid barrier_type → FAIL');
}

// Test 16: missing required controls → BLOCKED_INPUT
console.log('\nTEST: missing required controls → BLOCKED_INPUT');
const resultMissingControls = { ...validInput() };
delete resultMissingControls.required_barrier_review_controls;
const test16Result = build(resultMissingControls);
console.log('Test16 - Status:', test16Result.status, 'Errors:', test16Result.errors);
if (test16Result.status !== STATUSES.FINAL_EXECUTION_BARRIER_REVIEW_BLOCKED_INPUT || !test16Result.errors.includes('MISSING_REQUIRED_FIELD: required_barrier_review_controls')) {
  console.error('FAIL: missing required controls not handled correctly');
  console.error('Actual status:', test16Result.status);
  console.error('Actual errors:', test16Result.errors);
} else {
  console.log('PASS: missing required controls → BLOCKED_INPUT');
}

// Test 17: empty required controls array → FAIL
console.log('\nTEST: empty required controls array → FAIL');
const emptyControlsInput = { ...validInput(), required_barrier_review_controls: [] };
const test17Result = build(emptyControlsInput);
console.log('Test17 - Status:', test17Result.status, 'Errors:', test17Result.errors);
if (test17Result.status !== STATUSES.FINAL_EXECUTION_BARRIER_REVIEW_FAIL || !test17Result.errors.includes('REQUIRED_BARRIER_REVIEW_CONTROLS_EMPTY')) {
  console.error('FAIL: empty required controls array not handled correctly');
} else {
  console.log('PASS: empty required controls array → FAIL');
}

// Test 18: invalid control → FAIL
console.log('\nTEST: invalid control → FAIL');
const inputInvalidControl = {
  ...validInput(),
  required_barrier_review_controls: ['invalid-control'],
};
const test18Result = build(inputInvalidControl);
console.log('Test18 - Status:', test18Result.status, 'Errors:', test18Result.errors);
if (test18Result.status !== STATUSES.FINAL_EXECUTION_BARRIER_REVIEW_FAIL || !test18Result.errors.includes('INVALID_CONTROL: invalid-control')) {
  console.error('FAIL: invalid control not handled correctly');
} else {
  console.log('PASS: invalid control → FAIL');
}

// Test 19: missing required control → FAIL
console.log('\nTEST: missing required control → FAIL');
const inputMissingControl = {
  ...validInput(),
  required_barrier_review_controls: [
    // Intentionally missing some required controls
    'final-execution-barrier-review-required',
    'unlock-decision-evidence-required',
    // Missing 'metadata-only-review' and others
  ],
};
const test19Result = build(inputMissingControl);
console.log('Test19 - Status:', test19Result.status, 'Errors:', test19Result.errors);
if (test19Result.status !== STATUSES.FINAL_EXECUTION_BARRIER_REVIEW_FAIL || !test19Result.errors.some(e => e.startsWith('MISSING_REQUIRED_CONTROL'))) {
  console.error('FAIL: missing required control not handled correctly');
} else {
  console.log('PASS: missing required control → FAIL');
}

// Test 20: duplicate control → FAIL
console.log('\nTEST: duplicate control → FAIL');
const inputDuplicateControl = {
  ...validInput(),
  required_barrier_review_controls: [
    'final-execution-barrier-review-required',
    'final-execution-barrier-review-required', // duplicate
  ],
};
const test20Result = build(inputDuplicateControl);
console.log('Test20 - Status:', test20Result.status, 'Errors:', test20Result.errors);
if (test20Result.status !== STATUSES.FINAL_EXECUTION_BARRIER_REVIEW_FAIL || !test20Result.errors.includes('DUPLICATE_CONTROL: final-execution-barrier-review-required')) {
  console.error('FAIL: duplicate control not handled correctly');
} else {
  console.log('PASS: duplicate control → FAIL');
}

// Test 21: valid input → READY
console.log('\nTEST: valid input → READY');
const resultReady = build(validInput());
if (resultReady.status !== STATUSES.FINAL_EXECUTION_BARRIER_REVIEW_READY || resultReady.errors.length > 0) {
  console.error('FAIL: valid input should be READY');
  console.error('Errors:', resultReady.errors);
} else {
  console.log('PASS: valid input → READY');
}

// Test 22: READY hash 64 chars
console.log('\nTEST: READY hash 64 chars');
if (resultReady.hash && resultReady.hash.length !== 64) {
  console.error('FAIL: READY hash should be 64 chars');
} else {
  console.log('PASS: READY hash 64 chars');
}

// Test 23: READY hash deterministic
console.log('\nTEST: READY hash deterministic');
const resultReady2 = build(validInput());
if (resultReady.hash !== resultReady2.hash) {
  console.error('FAIL: READY hash should be deterministic');
} else {
  console.log('PASS: READY hash deterministic');
}

// Test 24: READY errors empty
console.log('\nTEST: READY errors empty');
if (resultReady.errors.length !== 0) {
  console.error('FAIL: READY should have no errors');
} else {
  console.log('PASS: READY errors empty');
}

// Test 25: READY has final_execution_barrier_reviewed=false
console.log('\nTEST: READY has final_execution_barrier_reviewed=false');
if (resultReady.final_execution_barrier_reviewed !== false) {
  console.error('FAIL: READY should have final_execution_barrier_reviewed=false');
} else {
  console.log('PASS: READY: final_execution_barrier_reviewed=false');
}

// Test 26: validate READY → true
console.log('\nTEST: validate READY → true');
if (!validate(validInput())) {
  console.error('FAIL: validate READY should return true');
} else {
  console.log('PASS: validate READY → true');
}

// Test 27: validate null → false
console.log('\nTEST: validate null → false');
if (validate(null)) {
  console.error('FAIL: validate null should return false');
} else {
  console.log('PASS: validate null → false');
}

// Test 28: validate BLOCKED_INPUT → false
console.log('\nTEST: validate BLOCKED_INPUT → false');
const blockedInput = build({ ...validInput(), unlock_decision_evidence_receipt_ready: 'not-boolean' });
if (validate(blockedInput)) {
  console.error('FAIL: validate BLOCKED_INPUT should return false');
} else {
  console.log('PASS: validate BLOCKED_INPUT → false');
}

// Test 29: validate BLOCKED_EVIDENCE → false
console.log('\nTEST: validate BLOCKED_EVIDENCE → false');
const blockedEvidenceInput = build({ ...validInput(), unlock_decision_evidence_receipt_ready: false });
if (validate(blockedEvidenceInput)) {
  console.error('FAIL: validate BLOCKED_EVIDENCE should return false');
} else {
  console.log('PASS: validate BLOCKED_EVIDENCE → false');
}

// Test 30: validate with extra field → true
console.log('\nTEST: validate with extra field → true');
const extraFieldInput = { ...validInput(), extra_field: true };
if (!validate(extraFieldInput)) {
  console.error('FAIL: validate should ignore extra fields');
} else {
  console.log('PASS: validate ignores extra fields');
}

// Test 31: render null → string with REGRA
console.log('\nTEST: render null → string with REGRA');
const renderNull = render(null);
if (!renderNull.includes('SEM PASS GOLD REAL')) {
  console.error('FAIL: render null should contain REGRA');
} else {
  console.log('PASS: render null → string with REGRA');
}

// Test 32: render READY → contains V449
console.log('\nTEST: render READY → contains V449');
const renderReady = render(resultReady);
if (!renderReady.includes('V449')) {
  console.error('FAIL: render READY should contain V449');
} else {
  console.log('PASS: render READY → contains V449');
}

// Test 33: render READY → REGRA ABSOLUTA
console.log('\nTEST: render READY → REGRA ABSOLUTA');
if (!renderReady.includes('SEM PASS GOLD REAL')) {
  console.error('FAIL: render READY should contain REGRA ABSOLUTA');
} else {
  console.log('PASS: render READY → REGRA ABSOLUTA');
}

// Test 34: render READY → contains status
console.log('\nTEST: render READY → contains status');
if (!renderReady.includes('"status": "FINAL_EXECUTION_BARRIER_REVIEW_READY"')) {
  console.error('FAIL: render READY should contain status');
} else {
  console.log('PASS: render READY → contains status');
}

// Test 35: render READY → contains hash
console.log('\nTEST: render READY → contains hash');
if (!renderReady.includes('"hash":')) {
  console.error('FAIL: render READY should contain hash');
} else {
  console.log('PASS: render READY → contains hash');
}

// Test 36: render READY → contains final_execution_barrier_reviewed=false
console.log('\nTEST: render READY → contains final_execution_barrier_reviewed=false');
if (!renderReady.includes('"final_execution_barrier_reviewed": false')) {
  console.error('FAIL: render READY should contain final_execution_barrier_reviewed=false');
} else {
  console.log('PASS: render READY → contains final_execution_barrier_reviewed=false');
}

console.log('\n=== V449 TESTING COMPLETE ===');