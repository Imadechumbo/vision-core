// Use dynamic import to avoid module resolution issues
const contractModule = await import('file:///C:/Users/imadechumbo/Desktop/vision-core/tools/software-factory/software-factory-release-freeze-integrity-binder.mjs');
const { build, validate, render, STATUSES } = contractModule;

console.log('CWD:', process.cwd());
console.log('Import meta URL:', import.meta.url);

const MODULE_NAME = 'software-factory-release-freeze-integrity-binder';

// Helper to create valid base input
function validInput() {
  return {
    release_freeze_integrity_binder_id: 'valid-freeze-integrity-binder-id-123',
    final_execution_lock_verification_id: 'valid-lock-verification-id-123',
    final_execution_lock_verification_ready: true,
    freeze_integrity_requested_by: 'operator',
    freeze_integrity_reason: 'release freeze integrity',
    freeze_integrity_mode: 'metadata-only',
    freeze_integrity_items: [
      {
        freeze_integrity_item_id: 'item-1',
        freeze_integrity_type: 'release_freeze_integrity',
        freeze_integrity_mode: 'metadata-only',
        freeze_integrity_hash: 'abc123',
      },
      {
        freeze_integrity_item_id: 'item-2',
        freeze_integrity_type: 'deploy_freeze_integrity',
        freeze_integrity_mode: 'metadata-only',
        freeze_integrity_hash: 'def456',
      },
    ],
    required_freeze_integrity_controls: [
      'release-freeze-integrity-required',
      'final-execution-lock-verification-required',
      'metadata-only-freeze-integrity',
      'release-freeze-integrity-not-bound',
      'release-freeze-integrity-not-verified',
      'release-freeze-not-lifted',
      'release-execution-not-unfrozen',
      'final-release-execution-not-unlocked',
      'final-real-execution-barrier-not-lifted',
      'post-barrier-execution-not-authorized',
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
console.log('=== TESTING V462 RELEASE FREEZE INTEGRITY BINDER ===');

// Test 1: STATUSES exported
console.log('\nTEST: STATUSES exported');
if (typeof STATUSES.RELEASE_FREEZE_INTEGRITY_BINDER_BLOCKED_INPUT !== 'string' ||
    typeof STATUSES.RELEASE_FREEZE_INTEGRITY_BINDER_BLOCKED_LOCK !== 'string' ||
    typeof STATUSES.RELEASE_FREEZE_INTEGRITY_BINDER_FAIL !== 'string' ||
    typeof STATUSES.RELEASE_FREEZE_INTEGRITY_BINDER_READY !== 'string') {
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
if (resultNull.status !== STATUSES.RELEASE_FREEZE_INTEGRITY_BINDER_BLOCKED_INPUT || !resultNull.errors.includes('INPUT_IS_NULL')) {
  console.error('FAIL: null input not handled correctly');
} else {
  console.log('PASS: null input → BLOCKED_INPUT');
}

// Test 6: empty object → BLOCKED_INPUT
console.log('\nTEST: empty object → BLOCKED_INPUT');
const resultEmpty = build({});
if (resultEmpty.status !== STATUSES.RELEASE_FREEZE_INTEGRITY_BINDER_BLOCKED_INPUT || !resultEmpty.errors.includes('MISSING_REQUIRED_FIELD: release_freeze_integrity_binder_id')) {
  console.error('FAIL: empty object not handled correctly');
  console.error('Actual errors:', resultEmpty.errors);
} else {
  console.log('PASS: empty object → BLOCKED_INPUT');
}

// Test 7: V461 not ready → BLOCKED_LOCK
console.log('\nTEST: V461 not ready → BLOCKED_LOCK');
const resultV461NotReady = { ...validInput(), final_execution_lock_verification_ready: false };
const test7Result = build(resultV461NotReady);
console.log('Test7 - Status:', test7Result.status, 'Errors:', test7Result.errors);
if (test7Result.status !== STATUSES.RELEASE_FREEZE_INTEGRITY_BINDER_BLOCKED_LOCK || !test7Result.errors.includes('FINAL_EXECUTION_LOCK_VERIFICATION_NOT_READY')) {
  console.error('FAIL: V461 not ready not handled correctly');
  console.error('Actual status:', test7Result.status);
  console.error('Actual errors:', test7Result.errors);
} else {
  console.log('PASS: V461 not ready → BLOCKED_LOCK');
}

// Test 8: invalid freeze_integrity_mode → BLOCKED_INPUT
console.log('\nTEST: invalid freeze_integrity_mode → BLOCKED_INPUT');
const resultInvalidMode = { ...validInput(), freeze_integrity_mode: 'invalid-mode' };
const test8Result = build(resultInvalidMode);
console.log('Test8 - Status:', test8Result.status, 'Errors:', test8Result.errors);
if (test8Result.status !== STATUSES.RELEASE_FREEZE_INTEGRITY_BINDER_BLOCKED_INPUT || !test8Result.errors.includes('INVALID_FREEZE_INTEGRITY_MODE')) {
  console.error('FAIL: invalid freeze_integrity_mode not handled correctly');
  console.error('Actual status:', test8Result.status);
  console.error('Actual errors:', test8Result.errors);
} else {
  console.log('PASS: invalid freeze_integrity_mode → BLOCKED_INPUT');
}

// Test 9: freeze_integrity_items not array → BLOCKED_INPUT
console.log('\nTEST: freeze_integrity_items not array → BLOCKED_INPUT');
const resultItemsNotArray = { ...validInput(), freeze_integrity_items: {} };
const test9Result = build(resultItemsNotArray);
console.log('Test9 - Status:', test9Result.status, 'Errors:', test9Result.errors);
if (test9Result.status !== STATUSES.RELEASE_FREEZE_INTEGRITY_BINDER_BLOCKED_INPUT || !test9Result.errors.includes('FREEZE_INTEGRITY_ITEMS_NOT_AN_ARRAY')) {
  console.error('FAIL: freeze_integrity_items not array not handled correctly');
  console.error('Actual status:', test9Result.status);
  console.error('Actual errors:', test9Result.errors);
} else {
  console.log('PASS: freeze_integrity_items not array → BLOCKED_INPUT');
}

// Test 10: invalid freeze integrity item → FAIL
console.log('\nTEST: invalid freeze integrity item → FAIL');
const resultInvalidItem = {
  ...validInput(),
  freeze_integrity_items: [
    {
      freeze_integrity_item_id: '',
      freeze_integrity_type: 'invalid-type',
      freeze_integrity_mode: 'metadata-only',
      freeze_integrity_hash: 'abc123',
    },
  ],
};
const test10Result = build(resultInvalidItem);
console.log('Test10 - Status:', test10Result.status, 'Errors:', test10Result.errors);
if (test10Result.status !== STATUSES.RELEASE_FREEZE_INTEGRITY_BINDER_FAIL || !test10Result.errors.includes('INVALID_FREEZE_INTEGRITY_ITEM_ID')) {
  console.error('FAIL: invalid freeze integrity item not handled correctly');
  console.error('Actual status:', test10Result.status);
  console.error('Actual errors:', test10Result.errors);
} else {
  console.log('PASS: invalid freeze integrity item → FAIL');
}

// Test 11: required_freeze_integrity_controls not array → BLOCKED_INPUT
console.log('\nTEST: required_freeze_integrity_controls not array → BLOCKED_INPUT');
const resultControlsNotArray = { ...validInput(), required_freeze_integrity_controls: {} };
const test11Result = build(resultControlsNotArray);
console.log('Test11 - Status:', test11Result.status, 'Errors:', test11Result.errors);
if (test11Result.status !== STATUSES.RELEASE_FREEZE_INTEGRITY_BINDER_BLOCKED_INPUT || !test11Result.errors.includes('REQUIRED_FREEZE_INTEGRITY_CONTROLS_NOT_AN_ARRAY')) {
  console.error('FAIL: required_freeze_integrity_controls not array not handled correctly');
  console.error('Actual status:', test11Result.status);
  console.error('Actual errors:', test11Result.errors);
} else {
  console.log('PASS: required_freeze_integrity_controls not array → BLOCKED_INPUT');
}

// Test 12: missing required control → FAIL
console.log('\nTEST: missing required control → FAIL');
const resultMissingControl = {
  ...validInput(),
  required_freeze_integrity_controls: [
    'release-freeze-integrity-required',
    // Missing others
  ],
};
const test12Result = build(resultMissingControl);
console.log('Test12 - Status:', test12Result.status, 'Errors:', test12Result.errors);
if (test12Result.status !== STATUSES.RELEASE_FREEZE_INTEGRITY_BINDER_FAIL || !test12Result.errors.includes('MISSING_REQUIRED_CONTROL: final-execution-lock-verification-required')) {
  console.error('FAIL: missing required control not handled correctly');
  console.error('Actual status:', test12Result.status);
  console.error('Actual errors:', test12Result.errors);
} else {
  console.log('PASS: missing required control → FAIL');
}

// Test 13: valid input → READY
console.log('\nTEST: valid input → READY');
const resultReady = build(validInput());
if (resultReady.status !== STATUSES.RELEASE_FREEZE_INTEGRITY_BINDER_READY || resultReady.errors.length > 0) {
  console.error('FAIL: valid input should be READY');
  console.error('Errors:', resultReady.errors);
} else {
  console.log('PASS: valid input → READY');
}

// Test 14: READY hash 64 chars
console.log('\nTEST: READY hash 64 chars');
if (resultReady.hash && resultReady.hash.length !== 64) {
  console.error('FAIL: READY hash should be 64 chars');
} else {
  console.log('PASS: READY hash 64 chars');
}

// Test 15: READY hash deterministic
console.log('\nTEST: READY hash deterministic');
const resultReady2 = build(validInput());
if (resultReady.hash !== resultReady2.hash) {
  console.error('FAIL: READY hash should be deterministic');
} else {
  console.log('PASS: READY hash deterministic');
}

// Test 16: READY freeze_integrity_items_verified has same length
console.log('\nTEST: READY freeze_integrity_items_verified has same length');
if (!Array.isArray(resultReady.freeze_integrity_items_verified) || resultReady.freeze_integrity_items_verified.length !== validInput().freeze_integrity_items.length) {
  console.error('FAIL: freeze_integrity_items_verified should have same length as input');
} else {
  console.log('PASS: READY freeze_integrity_items_verified has same length');
}

// Test 17: READY final_message exact
console.log('\nTEST: READY final_message exact');
if (resultReady.final_message !== 'V461-V465 final execution lock verification and release freeze integrity complete. Real release execution remains blocked until explicit V466 command.') {
  console.error('FAIL: final_message should be exact');
} else {
  console.log('PASS: READY final_message exact');
}

// Test 18: all critical flags false
console.log('\nTEST: all critical flags false');
const criticalFlags = [
  'release_freeze_integrity_bound',
  'release_freeze_integrity_verified',
  'release_freeze_lifted',
  'release_execution_unfrozen',
  'final_release_lock_verified',
  'final_release_lock_granted',
  'final_release_execution_unlocked',
  'final_real_execution_barrier_lifted',
  'real_release_execution_allowed',
  'real_release_executed',
  'real_deploy_executed',
  'real_tag_created',
  'real_stable_promoted',
  'artifact_published',
  'production_touched',
  'billing_executed',
  'secrets_accessed',
  'network_accessed',
  'rollback_executed',
  'controlled_unlock_decision_phase_passed',
  'final_execution_barrier_granted',
  'release_readiness_revalidation_phase_passed',
  'release_readiness_revalidated',
  'post_barrier_integrity_bound',
  'post_barrier_integrity_verified',
  'revalidation_evidence_receipt_published',
  'final_integrity_reviewed',
  'hard_stop_lifted',
  'release_command_armed',
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

// Test 19: validate READY → true
console.log('\nTEST: validate READY → true');
if (!validate(validInput())) {
  console.error('FAIL: validate READY should return true');
} else {
  console.log('PASS: validate READY → true');
}

// Test 20: validate null → false
console.log('\nTEST: validate null → false');
if (validate(null)) {
  console.error('FAIL: validate null should return false');
} else {
  console.log('PASS: validate null → false');
}

// Test 21: validate BLOCKED_INPUT → false
console.log('\nTEST: validate BLOCKED_INPUT → false');
const blockedInput = build({ ...validInput(), freeze_integrity_mode: 'invalid-mode' });
if (validate(blockedInput)) {
  console.error('FAIL: validate BLOCKED_INPUT should return false');
} else {
  console.log('PASS: validate BLOCKED_INPUT → false');
}

// Test 22: validate BLOCKED_LOCK → false
console.log('\nTEST: validate BLOCKED_LOCK → false');
const blockedLockInput = build({ ...validInput(), final_execution_lock_verification_ready: false });
if (validate(blockedLockInput)) {
  console.error('FAIL: validate BLOCKED_LOCK should return false');
} else {
  console.log('PASS: validate BLOCKED_LOCK → false');
}

// Test 23: validate FAIL → false
console.log('\nTEST: validate FAIL → false');
const failInput = {
  ...validInput(),
  freeze_integrity_items: [{ freeze_integrity_item_id: '', freeze_integrity_type: 'invalid', freeze_integrity_mode: 'metadata-only', freeze_integrity_hash: 'abc' }],
};
if (validate(failInput)) {
  console.error('FAIL: validate FAIL should return false');
} else {
  console.log('PASS: validate FAIL → false');
}

// Test 24: render null → string with REGRA
console.log('\nTEST: render null → string with REGRA');
const renderNull = render(null);
if (!renderNull.includes('SEM PASS GOLD REAL')) {
  console.error('FAIL: render null should contain REGRA');
} else {
  console.log('PASS: render null → string with REGRA');
}

// Test 25: render READY → contains V461
console.log('\nTEST: render READY → contains V461');
const renderReady = render(resultReady);
if (!renderReady.includes('V461-V465')) {
  console.error('FAIL: render READY should contain V461');
} else {
  console.log('PASS: render READY → contains V461');
}

// Test 26: render READY → REGRA ABSOLUTA
console.log('\nTEST: render READY → REGRA ABSOLUTA');
if (!renderReady.includes('SEM PASS GOLD REAL')) {
  console.error('FAIL: render READY should contain REGRA ABSOLUTA');
} else {
  console.log('PASS: render READY → REGRA ABSOLUTA');
}

// Test 27: render READY → contains status
console.log('\nTEST: render READY → contains status');
if (!renderReady.includes('"status": "RELEASE_FREEZE_INTEGRITY_BINDER_READY"')) {
  console.error('FAIL: render READY should contain status');
} else {
  console.log('PASS: render READY → contains status');
}

// Test 28: render READY → contains hash
console.log('\nTEST: render READY → contains hash');
if (!renderReady.includes('"hash":')) {
  console.error('FAIL: render READY should contain hash');
} else {
  console.log('PASS: render READY → contains hash');
}

// Test 29: render READY → contains freeze_integrity_items_verified
console.log('\nTEST: render READY → contains freeze_integrity_items_verified');
if (!renderReady.includes('"freeze_integrity_items_verified":')) {
  console.error('FAIL: render READY should contain freeze_integrity_items_verified');
} else {
  console.log('PASS: render READY → contains freeze_integrity_items_verified');
}

// Test 30: render READY → contains final_message
console.log('\nTEST: render READY → contains final_message');
if (!renderReady.includes('V461-V465 final execution lock verification and release freeze integrity complete')) {
  console.error('FAIL: render READY should contain final_message');
} else {
  console.log('PASS: render READY → contains final_message');
}

console.log('\n=== V461 TESTING COMPLETE ===');