// Use dynamic import to avoid module resolution issues
const contractModule = await import('file:///C:/Users/imadechumbo/Desktop/vision-core/tools/software-factory/software-factory-controlled-release-unlock-request-contract.mjs');
const { build, validate, render, STATUSES } = contractModule;

console.log('CWD:', process.cwd());
console.log('Import meta URL:', import.meta.url);

const MODULE_NAME = 'software-factory-controlled-release-unlock-request-contract';

// Helper to create valid base input
function validInput() {
  return {
    controlled_release_unlock_request_contract_id: 'valid-contract-id-123',
    controlled_execution_lock_phase_gate_id: 'valid-phase-gate-id-456',
    controlled_execution_lock_phase_gate_ready: true,
    unlock_requested_by: 'test-operator',
    unlock_reason: 'test-release-unlock',
    unlock_mode: 'metadata-only',
    unlock_items: [
      {
        unlock_item_id: 'item1',
        unlock_type: 'release_execution_unlock_request',
        unlock_mode: 'metadata-only',
        unlock_hash: 'a'.repeat(64),
      },
    ],
    required_unlock_controls: [
      'controlled-release-unlock-request-required',
      'controlled-execution-lock-phase-required',
      'metadata-only-unlock-request',
      'unlock-request-not-created',
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
console.log('=== TESTING V441 CONTROLLED RELEASE UNLOCK REQUEST CONTRACT ===');

// Test 1: STATUSES exported
console.log('\nTEST: STATUSES exported');
if (typeof STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_BLOCKED_INPUT !== 'string' ||
    typeof STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_BLOCKED_LOCK_PHASE !== 'string' ||
    typeof STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_FAIL !== 'string' ||
    typeof STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_READY !== 'string') {
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
if (resultNull.status !== STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_BLOCKED_INPUT || !resultNull.errors.includes('INPUT_IS_NULL')) {
  console.error('FAIL: null input not handled correctly');
} else {
  console.log('PASS: null input → BLOCKED_INPUT');
}

// Test 6: empty object → BLOCKED_INPUT
console.log('\nTEST: empty object → BLOCKED_INPUT');
const resultEmpty = build({});
if (resultEmpty.status !== STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_BLOCKED_INPUT || !resultEmpty.errors.includes('MISSING_REQUIRED_FIELD: controlled_release_unlock_request_contract_id')) {
  console.error('FAIL: empty object not handled correctly');
  console.error('Actual errors:', resultEmpty.errors);
} else {
  console.log('PASS: empty object → BLOCKED_INPUT');
}

// Test 7: missing contract id → BLOCKED_INPUT (truly missing)
console.log('\nTEST: missing contract id → BLOCKED_INPUT');
const resultMissingContractId = { ...validInput() };
delete resultMissingContractId.controlled_release_unlock_request_contract_id;
const test7Result = build(resultMissingContractId);
console.log('Test7 - Status:', test7Result.status, 'Errors:', test7Result.errors);
if (test7Result.status !== STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_BLOCKED_INPUT || !test7Result.errors.includes('MISSING_REQUIRED_FIELD: controlled_release_unlock_request_contract_id')) {
  console.error('FAIL: missing contract id not handled correctly');
  console.error('Actual status:', test7Result.status);
  console.error('Actual errors:', test7Result.errors);
} else {
  console.log('PASS: missing contract id → BLOCKED_INPUT');
}

// Test 8: missing phase gate id → BLOCKED_INPUT (truly missing)
console.log('\nTEST: missing phase gate id → BLOCKED_INPUT');
const resultMissingPhaseId = { ...validInput() };
delete resultMissingPhaseId.controlled_execution_lock_phase_gate_id;
const test8Result = build(resultMissingPhaseId);
console.log('Test8 - Status:', test8Result.status, 'Errors:', test8Result.errors);
if (test8Result.status !== STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_BLOCKED_INPUT || !test8Result.errors.includes('MISSING_REQUIRED_FIELD: controlled_execution_lock_phase_gate_id')) {
  console.error('FAIL: missing phase gate id not handled correctly');
  console.error('Actual status:', test8Result.status);
  console.error('Actual errors:', test8Result.errors);
} else {
  console.log('PASS: missing phase gate id → BLOCKED_INPUT');
}

// Test 9: missing phase gate ready → BLOCKED_INPUT (truly missing)
console.log('\nTEST: missing phase gate ready → BLOCKED_INPUT');
const resultMissingReady = { ...validInput() };
delete resultMissingReady.controlled_execution_lock_phase_gate_ready;
const test9Result = build(resultMissingReady);
console.log('Test9 - Status:', test9Result.status, 'Errors:', test9Result.errors);
if (test9Result.status !== STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_BLOCKED_INPUT || !test9Result.errors.includes('MISSING_REQUIRED_FIELD: controlled_execution_lock_phase_gate_ready')) {
  console.error('FAIL: missing phase gate ready not handled correctly');
  console.error('Actual status:', test9Result.status);
  console.error('Actual errors:', test9Result.errors);
} else {
  console.log('PASS: missing phase gate ready → BLOCKED_INPUT');
}

// Test 10: missing unlock_requested_by → BLOCKED_INPUT (truly missing)
console.log('\nTEST: missing unlock_requested_by → BLOCKED_INPUT');
const resultMissingRequested = { ...validInput() };
delete resultMissingRequested.unlock_requested_by;
const test10Result = build(resultMissingRequested);
console.log('Test10 - Status:', test10Result.status, 'Errors:', test10Result.errors);
if (test10Result.status !== STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_BLOCKED_INPUT || !test10Result.errors.includes('MISSING_REQUIRED_FIELD: unlock_requested_by')) {
  console.error('FAIL: missing unlock_requested_by not handled correctly');
  console.error('Actual status:', test10Result.status);
  console.error('Actual errors:', test10Result.errors);
} else {
  console.log('PASS: missing unlock_requested_by → BLOCKED_INPUT');
}

// Test 11: missing unlock_reason → BLOCKED_INPUT (truly missing)
console.log('\nTEST: missing unlock_reason → BLOCKED_INPUT');
const resultMissingReason = { ...validInput() };
delete resultMissingReason.unlock_reason;
const test11Result = build(resultMissingReason);
console.log('Test11 - Status:', test11Result.status, 'Errors:', test11Result.errors);
if (test11Result.status !== STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_BLOCKED_INPUT || !test11Result.errors.includes('MISSING_REQUIRED_FIELD: unlock_reason')) {
  console.error('FAIL: missing unlock_reason not handled correctly');
  console.error('Actual status:', test11Result.status);
  console.error('Actual errors:', test11Result.errors);
} else {
  console.log('PASS: missing unlock_reason → BLOCKED_INPUT');
}

// Test 12: unlock_items not array → FAIL
console.log('\nTEST: unlock_items not array → FAIL');
const resultItemsNotArray = build({ ...validInput(), unlock_items: 'not-an-array' });
if (resultItemsNotArray.status !== STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_FAIL || !resultItemsNotArray.errors.includes('UNLOCK_ITEMS_NOT_AN_ARRAY')) {
  console.error('FAIL: unlock_items not array not handled correctly');
  console.error('Actual status:', resultItemsNotArray.status);
  console.error('Actual errors:', resultItemsNotArray.errors);
} else {
  console.log('PASS: unlock_items not array → FAIL');
}

// Test 13: invalid unlock_type in item → FAIL
console.log('\nTEST: invalid unlock_type in item → FAIL');
const resultInvalidType = build({
  ...validInput(),
  unlock_items: [
    { ...validInput().unlock_items[0], unlock_type: 'invalid-type' },
  ],
});
if (resultInvalidType.status !== STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_FAIL || !resultInvalidType.errors.includes('UNLOCK_ITEM_0_INVALID_TYPE')) {
  console.error('FAIL: invalid unlock_type in item not handled correctly');
  console.error('Actual status:', resultInvalidType.status);
  console.error('Actual errors:', resultInvalidType.errors);
} else {
  console.log('PASS: invalid unlock_type in item → FAIL');
}

// Test 14: non-object item → FAIL
console.log('\nTEST: non-object item → FAIL');
const resultNonObjectItem = build({
  ...validInput(),
  unlock_items: [
    { ...validInput().unlock_items[0], unlock_item_id: 123 },
  ],
});
if (resultNonObjectItem.status !== STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_FAIL || !resultNonObjectItem.errors.includes('UNLOCK_ITEM_0_MISSING_ID')) {
  console.error('FAIL: non-object item not handled correctly');
  console.error('Actual status:', resultNonObjectItem.status);
  console.error('Actual errors:', resultNonObjectItem.errors);
} else {
  console.log('PASS: non-object item → FAIL');
}

// Test 15: empty controls → FAIL
console.log('\nTEST: empty controls → FAIL');
const resultEmptyControls = build({
  ...validInput(),
  required_unlock_controls: [''],
});
if (resultEmptyControls.status !== STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_FAIL || !resultEmptyControls.errors.includes('INVALID_CONTROL: ')) {
  console.error('FAIL: empty controls not handled correctly');
} else {
  console.log('PASS: empty controls → FAIL');
}

// Test 16: partial controls → FAIL
console.log('\nTEST: partial controls → FAIL');
const resultPartialControls = build({
  ...validInput(),
  required_unlock_controls: ['invalid-control', 'controlled-release-unlock-request-required'],
});
if (resultPartialControls.status !== STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_FAIL || !resultPartialControls.errors.includes('INVALID_CONTROL: invalid-control')) {
  console.error('FAIL: partial controls not handled correctly');
} else {
  console.log('PASS: partial controls → FAIL');
}

// Test 17: phase gate not ready → BLOCKED_LOCK_PHASE
console.log('\nTEST: phase gate not ready → BLOCKED_LOCK_PHASE');
const resultPhaseNotReady = build({ ...validInput(), controlled_execution_lock_phase_gate_ready: false });
if (resultPhaseNotReady.status !== STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_BLOCKED_LOCK_PHASE || !resultPhaseNotReady.errors.includes('PHASE_GATE_NOT_READY')) {
  console.error('FAIL: phase gate not ready not handled correctly');
  console.error('Actual status:', resultPhaseNotReady.status);
  console.error('Actual errors:', resultPhaseNotReady.errors);
} else {
  console.log('PASS: phase gate not ready → BLOCKED_LOCK_PHASE');
}

// Test 18: valid input → READY
console.log('\nTEST: valid input → READY');
const resultReady = build(validInput());
if (resultReady.status !== STATUSES.CONTROLLED_RELEASE_UNLOCK_REQUEST_READY || resultReady.errors.length > 0) {
  console.error('FAIL: valid input should be READY');
  console.error('Errors:', resultReady.errors);
} else {
  console.log('PASS: valid input → READY');
}

// Test 19: READY hash 64 chars
console.log('\nTEST: READY hash 64 chars');
if (resultReady.hash && resultReady.hash.length !== 64) {
  console.error('FAIL: READY hash should be 64 chars');
} else {
  console.log('PASS: READY hash 64 chars');
}

// Test 20: READY hash deterministic
console.log('\nTEST: READY hash deterministic');
const resultReady2 = build(validInput());
if (resultReady.hash !== resultReady2.hash) {
  console.error('FAIL: READY hash should be deterministic');
} else {
  console.log('PASS: READY hash deterministic');
}

// Test 21: READY errors empty
console.log('\nTEST: READY errors empty');
if (resultReady.errors.length !== 0) {
  console.error('FAIL: READY should have no errors');
} else {
  console.log('PASS: READY errors empty');
}

// Test 22: READY has controlled_release_unlock_requested=false
console.log('\nTEST: READY has controlled_release_unlock_requested=false');
if (!resultReady.controlled_release_unlock_requested === false) {
  console.error('FAIL: READY should have controlled_release_unlock_requested=false');
} else {
  console.log('PASS: READY: controlled_release_unlock_requested=false');
}

// Test 23: validate READY → true
console.log('\nTEST: validate READY → true');
if (!validate(validInput())) {
  console.error('FAIL: validate READY should return true');
} else {
  console.log('PASS: validate READY → true');
}

// Test 24: validate null → false
console.log('\nTEST: validate null → false');
if (validate(null)) {
  console.error('FAIL: validate null should return false');
} else {
  console.log('PASS: validate null → false');
}

// Test 25: validate BLOCKED → false
console.log('\nTEST: validate BLOCKED → false');
const blockedInput = build({ ...validInput(), controlled_execution_lock_phase_gate_ready: false });
if (validate(blockedInput)) {
  console.error('FAIL: validate BLOCKED should return false');
} else {
  console.log('PASS: validate BLOCKED → false');
}

// Test 26: validate with extra field → true
console.log('\nTEST: validate with extra field → true');
const extraFieldInput = { ...validInput(), extra_field: true };
if (!validate(extraFieldInput)) {
  console.error('FAIL: validate should ignore extra fields');
} else {
  console.log('PASS: validate ignores extra fields');
}

// Test 27: render null → string with REGRA
console.log('\nTEST: render null → string with REGRA');
const renderNull = render(null);
if (!renderNull.includes('SEM PASS GOLD REAL')) {
  console.error('FAIL: render null should contain REGRA');
} else {
  console.log('PASS: render null → string with REGRA');
}

// Test 28: render READY → contains V441
console.log('\nTEST: render READY → contains V441');
const renderReady = render(resultReady);
if (!renderReady.includes('V441')) {
  console.error('FAIL: render READY should contain V441');
} else {
  console.log('PASS: render READY → contains V441');
}

// Test 29: render READY → REGRA ABSOLUTA
console.log('\nTEST: render READY → REGRA ABSOLUTA');
if (!renderReady.includes('SEM PASS GOLD REAL')) {
  console.error('FAIL: render READY should contain REGRA ABSOLUTA');
} else {
  console.log('PASS: render READY → REGRA ABSOLUTA');
}

// Test 30: render READY → contains status
console.log('\nTEST: render READY → contains status');
if (!renderReady.includes('"status": "CONTROLLED_RELEASE_UNLOCK_REQUEST_READY"')) {
  console.error('FAIL: render READY should contain status');
} else {
  console.log('PASS: render READY → contains status');
}

// Test 31: render READY → contains hash
console.log('\nTEST: render READY → contains hash');
if (!renderReady.includes('"hash":')) {
  console.error('FAIL: render READY should contain hash');
} else {
  console.log('PASS: render READY → contains hash');
}

// Test 32: render READY → contains controlled_release_unlock_requested=false
console.log('\nTEST: render READY → contains controlled_release_unlock_requested=false');
if (!renderReady.includes('"controlled_release_unlock_requested": false')) {
  console.error('FAIL: render READY should contain controlled_release_unlock_requested=false');
} else {
  console.log('PASS: render READY → contains controlled_release_unlock_requested=false');
}

console.log('\n=== V441 TESTING COMPLETE ===');