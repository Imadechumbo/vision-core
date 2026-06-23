// Use dynamic import to avoid module resolution issues
const contractModule = await import('file:///C:/Users/imadechumbo/Desktop/vision-core/tools/software-factory/software-factory-unlock-request-evidence-receipt.mjs');
const { build, validate, render, STATUSES } = contractModule;

console.log('CWD:', process.cwd());
console.log('Import meta URL:', import.meta.url);

const MODULE_NAME = 'software-factory-unlock-request-evidence-receipt';

// Helper to create valid base input
function validInput() {
  return {
    unlock_request_evidence_receipt_id: 'valid-receipt-id-123',
    final_release_interlock_binder_id: 'valid-binder-id-123',
    final_release_interlock_binder_ready: true,
    unlock_evidence_items: [
      {
        unlock_evidence_id: 'evidence-item-1',
        unlock_evidence_type: 'release_unlock_request_evidence',
        unlock_evidence_mode: 'metadata-only',
        unlock_evidence_hash: 'a'.repeat(64),
      },
    ],
    required_unlock_evidence_controls: [
      'unlock-request-evidence-receipt-required',
      'final-release-interlock-required',
      'metadata-only-evidence',
      'unlock-evidence-not-published',
      'interlock-not-verified',
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
    unlock_evidence_level: 'level-1',
  };
}

// Test suite
console.log('=== TESTING V443 UNLOCK REQUEST EVIDENCE RECEIPT ===');

// Test 1: STATUSES exported
console.log('\nTEST: STATUSES exported');
if (typeof STATUSES.UNLOCK_REQUEST_EVIDENCE_RECEIPT_BLOCKED_INPUT !== 'string' ||
    typeof STATUSES.UNLOCK_REQUEST_EVIDENCE_RECEIPT_BLOCKED_INTERLOCK !== 'string' ||
    typeof STATUSES.UNLOCK_REQUEST_EVIDENCE_RECEIPT_FAIL !== 'string' ||
    typeof STATUSES.UNLOCK_REQUEST_EVIDENCE_RECEIPT_READY !== 'string') {
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
if (resultNull.status !== STATUSES.UNLOCK_REQUEST_EVIDENCE_RECEIPT_BLOCKED_INPUT || !resultNull.errors.includes('INPUT_IS_NULL')) {
  console.error('FAIL: null input not handled correctly');
} else {
  console.log('PASS: null input → BLOCKED_INPUT');
}

// Test 6: empty object → BLOCKED_INPUT
console.log('\nTEST: empty object → BLOCKED_INPUT');
const resultEmpty = build({});
if (resultEmpty.status !== STATUSES.UNLOCK_REQUEST_EVIDENCE_RECEIPT_BLOCKED_INPUT || !resultEmpty.errors.includes('MISSING_REQUIRED_FIELD: unlock_request_evidence_receipt_id')) {
  console.error('FAIL: empty object not handled correctly');
  console.error('Actual errors:', resultEmpty.errors);
} else {
  console.log('PASS: empty object → BLOCKED_INPUT');
}

// Test 7: missing receipt id → BLOCKED_INPUT (truly missing)
console.log('\nTEST: missing receipt id → BLOCKED_INPUT');
const resultMissingReceiptId = { ...validInput() };
delete resultMissingReceiptId.unlock_request_evidence_receipt_id;
const test7Result = build(resultMissingReceiptId);
console.log('Test7 - Status:', test7Result.status, 'Errors:', test7Result.errors);
if (test7Result.status !== STATUSES.UNLOCK_REQUEST_EVIDENCE_RECEIPT_BLOCKED_INPUT || !test7Result.errors.includes('MISSING_REQUIRED_FIELD: unlock_request_evidence_receipt_id')) {
  console.error('FAIL: missing receipt id not handled correctly');
  console.error('Actual status:', test7Result.status);
  console.error('Actual errors:', test7Result.errors);
} else {
  console.log('PASS: missing receipt id → BLOCKED_INPUT');
}

// Test 8: missing binder id → BLOCKED_INPUT (truly missing)
console.log('\nTEST: missing binder id → BLOCKED_INPUT');
const resultMissingBinderId = { ...validInput() };
delete resultMissingBinderId.final_release_interlock_binder_id;
const test8Result = build(resultMissingBinderId);
console.log('Test8 - Status:', test8Result.status, 'Errors:', test8Result.errors);
if (test8Result.status !== STATUSES.UNLOCK_REQUEST_EVIDENCE_RECEIPT_BLOCKED_INPUT || !test8Result.errors.includes('MISSING_REQUIRED_FIELD: final_release_interlock_binder_id')) {
  console.error('FAIL: missing binder id not handled correctly');
  console.error('Actual status:', test8Result.status);
  console.error('Actual errors:', test8Result.errors);
} else {
  console.log('PASS: missing binder id → BLOCKED_INPUT');
}

// Test 9: missing binder_ready → BLOCKED_INPUT (truly missing)
console.log('\nTEST: missing binder_ready → BLOCKED_INPUT');
const resultMissingBinderReady = { ...validInput() };
delete resultMissingBinderReady.final_release_interlock_binder_ready;
const test9Result = build(resultMissingBinderReady);
console.log('Test9 - Status:', test9Result.status, 'Errors:', test9Result.errors);
if (test9Result.status !== STATUSES.UNLOCK_REQUEST_EVIDENCE_RECEIPT_BLOCKED_INPUT || !test9Result.errors.includes('MISSING_REQUIRED_FIELD: final_release_interlock_binder_ready')) {
  console.error('FAIL: missing binder_ready not handled correctly');
  console.error('Actual status:', test9Result.status);
  console.error('Actual errors:', test9Result.errors);
} else {
  console.log('PASS: missing binder_ready → BLOCKED_INPUT');
}

// Test 10: binder_ready not boolean → BLOCKED_INPUT
console.log('\nTEST: binder_ready not boolean → BLOCKED_INPUT');
const resultNotBoolean = { ...validInput(), final_release_interlock_binder_ready: 'not-boolean' };
const test10Result = build(resultNotBoolean);
console.log('Test10 - Status:', test10Result.status, 'Errors:', test10Result.errors);
if (test10Result.status !== STATUSES.UNLOCK_REQUEST_EVIDENCE_RECEIPT_BLOCKED_INPUT || !test10Result.errors.includes('INVALID_BINDER_READY')) {
  console.error('FAIL: binder_ready not boolean not handled correctly');
  console.error('Actual status:', test10Result.status);
  console.error('Actual errors:', test10Result.errors);
} else {
  console.log('PASS: binder_ready not boolean → BLOCKED_INPUT');
}

// Test 11: binder_ready === false → BLOCKED_INTERLOCK
console.log('\nTEST: binder_ready === false → BLOCKED_INTERLOCK');
const resultBinderNotReady = { ...validInput(), final_release_interlock_binder_ready: false };
const test11Result = build(resultBinderNotReady);
console.log('Test11 - Status:', test11Result.status, 'Errors:', test11Result.errors);
if (test11Result.status !== STATUSES.UNLOCK_REQUEST_EVIDENCE_RECEIPT_BLOCKED_INTERLOCK || !test11Result.errors.includes('INTERLOCK_NOT_READY')) {
  console.error('FAIL: binder_ready false not handled correctly');
  console.error('Actual status:', test11Result.status);
  console.error('Actual errors:', test11Result.errors);
} else {
  console.log('PASS: binder_ready === false → BLOCKED_INTERLOCK');
}

// Test 12: missing evidence items → BLOCKED_INPUT
console.log('\nTEST: missing evidence items → BLOCKED_INPUT');
const resultMissingItems = { ...validInput() };
delete resultMissingItems.unlock_evidence_items;
const test12Result = build(resultMissingItems);
console.log('Test12 - Status:', test12Result.status, 'Errors:', test12Result.errors);
if (test12Result.status !== STATUSES.UNLOCK_REQUEST_EVIDENCE_RECEIPT_BLOCKED_INPUT || !test12Result.errors.includes('MISSING_REQUIRED_FIELD: unlock_evidence_items')) {
  console.error('FAIL: missing evidence items not handled correctly');
  console.error('Actual status:', test12Result.status);
  console.error('Actual errors:', test12Result.errors);
} else {
  console.log('PASS: missing evidence items → BLOCKED_INPUT');
}

// Test 13: evidence items not array → FAIL
console.log('\nTEST: evidence items not array → FAIL');
const inputItemsNotArray = { ...validInput(), unlock_evidence_items: 'not-an-array' };
const test13Result = build(inputItemsNotArray);
console.log('Test13 - Status:', test13Result.status, 'Errors:', test13Result.errors);
if (test13Result.status !== STATUSES.UNLOCK_REQUEST_EVIDENCE_RECEIPT_FAIL || !test13Result.errors.includes('UNLOCK_EVIDENCE_ITEMS_NOT_AN_ARRAY')) {
  console.error('FAIL: evidence items not array not handled correctly');
} else {
  console.log('PASS: evidence items not array → FAIL');
}

// Test 14: missing required controls → BLOCKED_INPUT
console.log('\nTEST: missing required controls → BLOCKED_INPUT');
const resultMissingControls = { ...validInput() };
delete resultMissingControls.required_unlock_evidence_controls;
const test14Result = build(resultMissingControls);
console.log('Test14 - Status:', test14Result.status, 'Errors:', test14Result.errors);
if (test14Result.status !== STATUSES.UNLOCK_REQUEST_EVIDENCE_RECEIPT_BLOCKED_INPUT || !test14Result.errors.includes('MISSING_REQUIRED_FIELD: required_unlock_evidence_controls')) {
  console.error('FAIL: missing required controls not handled correctly');
  console.error('Actual status:', test14Result.status);
  console.error('Actual errors:', test14Result.errors);
} else {
  console.log('PASS: missing required controls → BLOCKED_INPUT');
}

// Test 15: empty required controls array → FAIL
console.log('\nTEST: empty required controls array → FAIL');
const emptyControlsInput = { ...validInput(), required_unlock_evidence_controls: [] };
const test15Result = build(emptyControlsInput);
console.log('Test15 - Status:', test15Result.status, 'Errors:', test15Result.errors);
if (test15Result.status !== STATUSES.UNLOCK_REQUEST_EVIDENCE_RECEIPT_FAIL || !test15Result.errors.includes('REQUIRED_UNLOCK_EVIDENCE_CONTROLS_EMPTY')) {
  console.error('FAIL: empty required controls array not handled correctly');
} else {
  console.log('PASS: empty required controls array → FAIL');
}

// Test 16: invalid evidence mode → FAIL
console.log('\nTEST: invalid evidence mode → FAIL');
const inputInvalidMode = {
  ...validInput(),
  unlock_evidence_items: [
    {
      ...validInput().unlock_evidence_items[0],
      unlock_evidence_mode: 'invalid-mode',
    },
  ],
};
const test16Result = build(inputInvalidMode);
console.log('Test16 - Status:', test16Result.status, 'Errors:', test16Result.errors);
if (test16Result.status !== STATUSES.UNLOCK_REQUEST_EVIDENCE_RECEIPT_FAIL || !test16Result.errors.includes('UNLOCK_EVIDENCE_ITEM_0_INVALID_MODE')) {
  console.error('FAIL: invalid evidence mode not handled correctly');
} else {
  console.log('PASS: invalid evidence mode → FAIL');
}

// Test 17: invalid evidence type → FAIL
console.log('\nTEST: invalid evidence type → FAIL');
const inputInvalidType = {
  ...validInput(),
  unlock_evidence_items: [
    {
      ...validInput().unlock_evidence_items[0],
      unlock_evidence_type: 'invalid-type',
    },
  ],
};
const test17Result = build(inputInvalidType);
console.log('Test17 - Status:', test17Result.status, 'Errors:', test17Result.errors);
if (test17Result.status !== STATUSES.UNLOCK_REQUEST_EVIDENCE_RECEIPT_FAIL || !test17Result.errors.includes('UNLOCK_EVIDENCE_ITEM_0_INVALID_TYPE')) {
  console.error('FAIL: invalid evidence type not handled correctly');
} else {
  console.log('PASS: invalid evidence type → FAIL');
}

// Test 18: invalid control → FAIL
console.log('\nTEST: invalid control → FAIL');
const inputInvalidControl = {
  ...validInput(),
  required_unlock_evidence_controls: ['invalid-control'],
};
const test18Result = build(inputInvalidControl);
console.log('Test18 - Status:', test18Result.status, 'Errors:', test18Result.errors);
if (test18Result.status !== STATUSES.UNLOCK_REQUEST_EVIDENCE_RECEIPT_FAIL || !test18Result.errors.includes('INVALID_CONTROL: invalid-control')) {
  console.error('FAIL: invalid control not handled correctly');
} else {
  console.log('PASS: invalid control → FAIL');
}

// Test 19: missing required control → FAIL
console.log('\nTEST: missing required control → FAIL');
const inputMissingControl = {
  ...validInput(),
  required_unlock_evidence_controls: [
    // Intentionally missing some required controls
    'unlock-request-evidence-receipt-required',
    'final-release-interlock-required',
    // Missing 'metadata-only-evidence' and others
  ],
};
const test19Result = build(inputMissingControl);
console.log('Test19 - Status:', test19Result.status, 'Errors:', test19Result.errors);
if (test19Result.status !== STATUSES.UNLOCK_REQUEST_EVIDENCE_RECEIPT_FAIL || !test19Result.errors.some(e => e.startsWith('MISSING_REQUIRED_CONTROL'))) {
  console.error('FAIL: missing required control not handled correctly');
} else {
  console.log('PASS: missing required control → FAIL');
}

// Test 20: duplicate control → FAIL
console.log('\nTEST: duplicate control → FAIL');
const inputDuplicateControl = {
  ...validInput(),
  required_unlock_evidence_controls: [
    'unlock-request-evidence-receipt-required',
    'unlock-request-evidence-receipt-required', // duplicate
  ],
};
const test20Result = build(inputDuplicateControl);
console.log('Test20 - Status:', test20Result.status, 'Errors:', test20Result.errors);
if (test20Result.status !== STATUSES.UNLOCK_REQUEST_EVIDENCE_RECEIPT_FAIL || !test20Result.errors.includes('DUPLICATE_CONTROL: unlock-request-evidence-receipt-required')) {
  console.error('FAIL: duplicate control not handled correctly');
} else {
  console.log('PASS: duplicate control → FAIL');
}

// Test 21: valid input → READY
console.log('\nTEST: valid input → READY');
const resultReady = build(validInput());
if (resultReady.status !== STATUSES.UNLOCK_REQUEST_EVIDENCE_RECEIPT_READY || resultReady.errors.length > 0) {
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

// Test 25: READY has unlock_request_evidence_receipt_published=false
console.log('\nTEST: READY has unlock_request_evidence_receipt_published=false');
if (resultReady.unlock_request_evidence_receipt_published !== false) {
  console.error('FAIL: READY should have unlock_request_evidence_receipt_published=false');
} else {
  console.log('PASS: READY: unlock_request_evidence_receipt_published=false');
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

// Test 28: validate BLOCKED → false
console.log('\nTEST: validate BLOCKED → false');
const blockedInput = build({ ...validInput(), final_release_interlock_binder_ready: false });
if (validate(blockedInput)) {
  console.error('FAIL: validate BLOCKED should return false');
} else {
  console.log('PASS: validate BLOCKED → false');
}

// Test 29: validate with extra field → true
console.log('\nTEST: validate with extra field → true');
const extraFieldInput = { ...validInput(), extra_field: true };
if (!validate(extraFieldInput)) {
  console.error('FAIL: validate should ignore extra fields');
} else {
  console.log('PASS: validate ignores extra fields');
}

// Test 30: render null → string with REGRA
console.log('\nTEST: render null → string with REGRA');
const renderNull = render(null);
if (!renderNull.includes('SEM PASS GOLD REAL')) {
  console.error('FAIL: render null should contain REGRA');
} else {
  console.log('PASS: render null → string with REGRA');
}

// Test 31: render READY → contains V443
console.log('\nTEST: render READY → contains V443');
const renderReady = render(resultReady);
if (!renderReady.includes('V443')) {
  console.error('FAIL: render READY should contain V443');
} else {
  console.log('PASS: render READY → contains V443');
}

// Test 32: render READY → REGRA ABSOLUTA
console.log('\nTEST: render READY → REGRA ABSOLUTA');
if (!renderReady.includes('SEM PASS GOLD REAL')) {
  console.error('FAIL: render READY should contain REGRA ABSOLUTA');
} else {
  console.log('PASS: render READY → REGRA ABSOLUTA');
}

// Test 33: render READY → contains status
console.log('\nTEST: render READY → contains status');
if (!renderReady.includes('"status": "UNLOCK_REQUEST_EVIDENCE_RECEIPT_READY"')) {
  console.error('FAIL: render READY should contain status');
} else {
  console.log('PASS: render READY → contains status');
}

// Test 34: render READY → contains hash
console.log('\nTEST: render READY → contains hash');
if (!renderReady.includes('"hash":')) {
  console.error('FAIL: render READY should contain hash');
} else {
  console.log('PASS: render READY → contains hash');
}

// Test 35: render READY → contains unlock_evidence_level
console.log('\nTEST: render READY → contains unlock_evidence_level');
if (!renderReady.includes('"unlock_evidence_level": "level-1"')) {
  console.error('FAIL: render READY should contain unlock_evidence_level');
} else {
  console.log('PASS: render READY → contains unlock_evidence_level');
}

// Test 36: render READY → contains unlock_request_evidence_receipt_published=false
console.log('\nTEST: render READY → contains unlock_request_evidence_receipt_published=false');
if (!renderReady.includes('"unlock_request_evidence_receipt_published": false')) {
  console.error('FAIL: render READY should contain unlock_request_evidence_receipt_published=false');
} else {
  console.log('PASS: render READY → contains unlock_request_evidence_receipt_published=false');
}

console.log('\n=== V443 TESTING COMPLETE ===');