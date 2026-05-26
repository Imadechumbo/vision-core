// Use dynamic import to avoid module resolution issues
const contractModule = await import('file:///C:/Users/imadechumbo/Desktop/vision-core/tools/software-factory/software-factory-freeze-integrity-evidence-receipt.mjs');
const { build, validate, render, STATUSES } = contractModule;

console.log('CWD:', process.cwd());
console.log('Import meta URL:', import.meta.url);

const MODULE_NAME = 'software-factory-freeze-integrity-evidence-receipt';

// Helper to create valid base input
function validInput() {
  return {
    freeze_integrity_evidence_receipt_id: 'valid-evidence-receipt-id-123',
    release_freeze_integrity_binder_id: 'valid-freeze-integrity-binder-id-123',
    release_freeze_integrity_binder_ready: true,
    freeze_integrity_evidence_items: [
      {
        freeze_integrity_evidence_item_id: 'item-1',
        freeze_integrity_evidence_type: 'freeze_integrity_evidence',
        freeze_integrity_evidence_mode: 'metadata-only',
        freeze_integrity_evidence_hash: 'abc123',
      },
      {
        freeze_integrity_evidence_item_id: 'item-2',
        freeze_integrity_evidence_type: 'release_integrity_verification',
        freeze_integrity_evidence_mode: 'metadata-only',
        freeze_integrity_evidence_hash: 'def456',
      },
    ],
    required_freeze_integrity_evidence_controls: [
      'freeze-integrity-evidence-receipt-required',
      'release-freeze-integrity-required',
      'metadata-only-evidence',
      'freeze-integrity-evidence-not-published',
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
    freeze_integrity_evidence_level: 'full',
  };
}

// Test suite
console.log('=== TESTING V462 FREEZE INTEGRITY EVIDENCE RECEIPT ===');

// Test 1: STATUSES exported
console.log('\nTEST: STATUSES exported');
if (typeof STATUSES.FREEZE_INTEGRITY_EVIDENCE_RECEIPT_BLOCKED_INPUT !== 'string' ||
    typeof STATUSES.FREEZE_INTEGRITY_EVIDENCE_RECEIPT_BLOCKED_FREEZE !== 'string' ||
    typeof STATUSES.FREEZE_INTEGRITY_EVIDENCE_RECEIPT_FAIL !== 'string' ||
    typeof STATUSES.FREEZE_INTEGRITY_EVIDENCE_RECEIPT_READY !== 'string') {
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
if (resultNull.status !== STATUSES.FREEZE_INTEGRITY_EVIDENCE_RECEIPT_BLOCKED_INPUT || !resultNull.errors.includes('INPUT_IS_NULL')) {
  console.error('FAIL: null input not handled correctly');
} else {
  console.log('PASS: null input → BLOCKED_INPUT');
}

// Test 6: empty object → BLOCKED_INPUT
console.log('\nTEST: empty object → BLOCKED_INPUT');
const resultEmpty = build({});
if (resultEmpty.status !== STATUSES.FREEZE_INTEGRITY_EVIDENCE_RECEIPT_BLOCKED_INPUT || !resultEmpty.errors.includes('MISSING_REQUIRED_FIELD: freeze_integrity_evidence_receipt_id')) {
  console.error('FAIL: empty object not handled correctly');
  console.error('Actual errors:', resultEmpty.errors);
} else {
  console.log('PASS: empty object → BLOCKED_INPUT');
}

// Test 7: V461 not ready → BLOCKED_FREEZE
console.log('\nTEST: V461 not ready → BLOCKED_FREEZE');
const resultV461NotReady = { ...validInput(), release_freeze_integrity_binder_ready: false };
const test7Result = build(resultV461NotReady);
console.log('Test7 - Status:', test7Result.status, 'Errors:', test7Result.errors);
if (test7Result.status !== STATUSES.FREEZE_INTEGRITY_EVIDENCE_RECEIPT_BLOCKED_FREEZE || !test7Result.errors.includes('RELEASE_FREEZE_INTEGRITY_BINDER_NOT_READY')) {
  console.error('FAIL: V461 not ready not handled correctly');
  console.error('Actual status:', test7Result.status);
  console.error('Actual errors:', test7Result.errors);
} else {
  console.log('PASS: V461 not ready → BLOCKED_FREEZE');
}

// Test 8: freeze_integrity_evidence_items not array → BLOCKED_INPUT
console.log('\nTEST: freeze_integrity_evidence_items not array → BLOCKED_INPUT');
const resultItemsNotArray = { ...validInput(), freeze_integrity_evidence_items: {} };
const test8Result = build(resultItemsNotArray);
console.log('Test8 - Status:', test8Result.status, 'Errors:', test8Result.errors);
if (test8Result.status !== STATUSES.FREEZE_INTEGRITY_EVIDENCE_RECEIPT_BLOCKED_INPUT || !test8Result.errors.includes('FREEZE_INTEGRITY_EVIDENCE_ITEMS_NOT_AN_ARRAY')) {
  console.error('FAIL: freeze_integrity_evidence_items not array not handled correctly');
  console.error('Actual status:', test8Result.status);
  console.error('Actual errors:', test8Result.errors);
} else {
  console.log('PASS: freeze_integrity_evidence_items not array → BLOCKED_INPUT');
}

// Test 9: invalid freeze integrity evidence item → FAIL
console.log('\nTEST: invalid freeze integrity evidence item → FAIL');
const resultInvalidItem = {
  ...validInput(),
  freeze_integrity_evidence_items: [
    {
      freeze_integrity_evidence_item_id: '',
      freeze_integrity_evidence_type: 'invalid-type',
      freeze_integrity_evidence_mode: 'metadata-only',
      freeze_integrity_evidence_hash: 'abc123',
    },
  ],
};
const test9Result = build(resultInvalidItem);
console.log('Test9 - Status:', test9Result.status, 'Errors:', test9Result.errors);
if (test9Result.status !== STATUSES.FREEZE_INTEGRITY_EVIDENCE_RECEIPT_FAIL || !test9Result.errors.includes('INVALID_FREEZE_INTEGRITY_EVIDENCE_ITEM_ID')) {
  console.error('FAIL: invalid freeze integrity evidence item not handled correctly');
  console.error('Actual status:', test9Result.status);
  console.error('Actual errors:', test9Result.errors);
} else {
  console.log('PASS: invalid freeze integrity evidence item → FAIL');
}

// Test 10: required_freeze_integrity_evidence_controls not array → BLOCKED_INPUT
console.log('\nTEST: required_freeze_integrity_evidence_controls not array → BLOCKED_INPUT');
const resultControlsNotArray = { ...validInput(), required_freeze_integrity_evidence_controls: {} };
const test10Result = build(resultControlsNotArray);
console.log('Test10 - Status:', test10Result.status, 'Errors:', test10Result.errors);
if (test10Result.status !== STATUSES.FREEZE_INTEGRITY_EVIDENCE_RECEIPT_BLOCKED_INPUT || !test10Result.errors.includes('REQUIRED_FREEZE_INTEGRITY_EVIDENCE_CONTROLS_NOT_AN_ARRAY')) {
  console.error('FAIL: required_freeze_integrity_evidence_controls not array not handled correctly');
  console.error('Actual status:', test10Result.status);
  console.error('Actual errors:', test10Result.errors);
} else {
  console.log('PASS: required_freeze_integrity_evidence_controls not array → BLOCKED_INPUT');
}

// Test 11: missing required control → FAIL
console.log('\nTEST: missing required control → FAIL');
const resultMissingControl = {
  ...validInput(),
  required_freeze_integrity_evidence_controls: [
    'freeze-integrity-evidence-receipt-required',
    // Missing others
  ],
};
const test11Result = build(resultMissingControl);
console.log('Test11 - Status:', test11Result.status, 'Errors:', test11Result.errors);
if (test11Result.status !== STATUSES.FREEZE_INTEGRITY_EVIDENCE_RECEIPT_FAIL || !test11Result.errors.includes('MISSING_REQUIRED_CONTROL: release-freeze-integrity-required')) {
  console.error('FAIL: missing required control not handled correctly');
  console.error('Actual status:', test11Result.status);
  console.error('Actual errors:', test11Result.errors);
} else {
  console.log('PASS: missing required control → FAIL');
}

// Test 12: valid input → READY
console.log('\nTEST: valid input → READY');
const resultReady = build(validInput());
if (resultReady.status !== STATUSES.FREEZE_INTEGRITY_EVIDENCE_RECEIPT_READY || resultReady.errors.length > 0) {
  console.error('FAIL: valid input should be READY');
  console.error('Errors:', resultReady.errors);
} else {
  console.log('PASS: valid input → READY');
}

// Test 13: READY hash 64 chars
console.log('\nTEST: READY hash 64 chars');
if (resultReady.hash && resultReady.hash.length !== 64) {
  console.error('FAIL: READY hash should be 64 chars');
} else {
  console.log('PASS: READY hash 64 chars');
}

// Test 14: READY hash deterministic
console.log('\nTEST: READY hash deterministic');
const resultReady2 = build(validInput());
if (resultReady.hash !== resultReady2.hash) {
  console.error('FAIL: READY hash should be deterministic');
} else {
  console.log('PASS: READY hash deterministic');
}

// Test 15: READY freeze_integrity_evidence_items_verified has same length
console.log('\nTEST: READY freeze_integrity_evidence_items_verified has same length');
if (!Array.isArray(resultReady.freeze_integrity_evidence_items_verified) || resultReady.freeze_integrity_evidence_items_verified.length !== validInput().freeze_integrity_evidence_items.length) {
  console.error('FAIL: freeze_integrity_evidence_items_verified should have same length as input');
} else {
  console.log('PASS: READY freeze_integrity_evidence_items_verified has same length');
}

// Test 16: READY final_message exact
console.log('\nTEST: READY final_message exact');
if (resultReady.final_message !== 'V462-V465 final execution lock verification and release freeze integrity complete. Real release execution remains blocked until explicit V466 command.') {
  console.error('FAIL: final_message should be exact');
} else {
  console.log('PASS: READY final_message exact');
}

// Test 17: all critical flags false
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
const resultReadyCheck = build(validInput());
for (const flag of criticalFlags) {
  if (resultReadyCheck[flag] !== false) {
    console.error(`FAIL: critical flag ${flag} is not false, value: ${resultReadyCheck[flag]}`);
    allFalse = false;
    break;
  }
}
if (allFalse) {
  console.log('PASS: all critical flags false');
}

// Test 18: validate READY → true
console.log('\nTEST: validate READY → true');
if (!validate(validInput())) {
  console.error('FAIL: validate READY should return true');
} else {
  console.log('PASS: validate READY → true');
}

// Test 19: validate null → false
console.log('\nTEST: validate null → false');
if (validate(null)) {
  console.error('FAIL: validate null should return false');
} else {
  console.log('PASS: validate null → false');
}

// Test 20: validate BLOCKED_INPUT → false
console.log('\nTEST: validate BLOCKED_INPUT → false');
const blockedInput = build({ ...validInput(), freeze_integrity_evidence_items: {} });
if (validate(blockedInput)) {
  console.error('FAIL: validate BLOCKED_INPUT should return false');
} else {
  console.log('PASS: validate BLOCKED_INPUT → false');
}

// Test 21: validate BLOCKED_FREEZE → false
console.log('\nTEST: validate BLOCKED_FREEZE → false');
const blockedFreezeInput = build({ ...validInput(), release_freeze_integrity_binder_ready: false });
if (validate(blockedFreezeInput)) {
  console.error('FAIL: validate BLOCKED_FREEZE should return false');
} else {
  console.log('PASS: validate BLOCKED_FREEZE → false');
}

// Test 22: validate FAIL → false
console.log('\nTEST: validate FAIL → false');
const failInput = {
  ...validInput(),
  freeze_integrity_evidence_items: [{ freeze_integrity_evidence_item_id: '', freeze_integrity_evidence_type: 'invalid', freeze_integrity_evidence_mode: 'metadata-only', freeze_integrity_evidence_hash: 'abc' }],
};
if (validate(failInput)) {
  console.error('FAIL: validate FAIL should return false');
} else {
  console.log('PASS: validate FAIL → false');
}

// Test 23: render null → string with REGRA
console.log('\nTEST: render null → string with REGRA');
const renderNull = render(null);
if (!renderNull.includes('SEM PASS GOLD REAL')) {
  console.error('FAIL: render null should contain REGRA');
} else {
  console.log('PASS: render null → string with REGRA');
}

// Test 24: render READY → contains V462
console.log('\nTEST: render READY → contains V462');
const renderReady = render(resultReady);
if (!renderReady.includes('V462-V465')) {
  console.error('FAIL: render READY should contain V462');
} else {
  console.log('PASS: render READY → contains V462');
}

// Test 25: render READY → REGRA ABSOLUTA
console.log('\nTEST: render READY → REGRA ABSOLUTA');
if (!renderReady.includes('SEM PASS GOLD REAL')) {
  console.error('FAIL: render READY should contain REGRA ABSOLUTA');
} else {
  console.log('PASS: render READY → REGRA ABSOLUTA');
}

// Test 26: render READY → contains status
console.log('\nTEST: render READY → contains status');
if (!renderReady.includes('"status": "FREEZE_INTEGRITY_EVIDENCE_RECEIPT_READY"')) {
  console.error('FAIL: render READY should contain status');
} else {
  console.log('PASS: render READY → contains status');
}

// Test 27: render READY → contains hash
console.log('\nTEST: render READY → contains hash');
if (!renderReady.includes('"hash":')) {
  console.error('FAIL: render READY should contain hash');
} else {
  console.log('PASS: render READY → contains hash');
}

// Test 28: render READY → contains freeze_integrity_evidence_items_verified
console.log('\nTEST: render READY → contains freeze_integrity_evidence_items_verified');
if (!renderReady.includes('"freeze_integrity_evidence_items_verified":')) {
  console.error('FAIL: render READY should contain freeze_integrity_evidence_items_verified');
} else {
  console.log('PASS: render READY → contains freeze_integrity_evidence_items_verified');
}

// Test 29: render READY → contains final_message
console.log('\nTEST: render READY → contains final_message');
if (!renderReady.includes('V462-V465 final execution lock verification and release freeze integrity complete')) {
  console.error('FAIL: render READY should contain final_message');
} else {
  console.log('PASS: render READY → contains final_message');
}

console.log('\n=== V462 TESTING COMPLETE ===');