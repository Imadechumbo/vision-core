// Use dynamic import to avoid module resolution issues
const contractModule = await import('file:///C:/Users/imadechumbo/Desktop/vision-core/tools/software-factory/software-factory-post-barrier-integrity-binder.mjs');
const { build, validate, render, STATUSES } = contractModule;

console.log('CWD:', process.cwd());
console.log('Import meta URL:', import.meta.url);

const MODULE_NAME = 'software-factory-post-barrier-integrity-binder';

// Helper to create valid base input
function validInput() {
  return {
    post_barrier_integrity_binder_id: 'valid-integrity-binder-id-123',
    release_readiness_revalidation_contract_id: 'valid-revalidation-contract-id-123',
    release_readiness_revalidation_contract_ready: true,
    integrity_requested_by: 'operator',
    integrity_reason: 'post-barrier integrity check',
    integrity_mode: 'metadata-only',
    integrity_items: [
      {
        integrity_item_id: 'item-1',
        integrity_type: 'release_post_barrier_integrity',
        integrity_mode: 'metadata-only',
        integrity_hash: 'abc123',
      },
      {
        integrity_item_id: 'item-2',
        integrity_type: 'deploy_post_barrier_integrity',
        integrity_mode: 'metadata-only',
        integrity_hash: 'def456',
      },
    ],
    required_integrity_controls: [
      'post-barrier-integrity-required',
      'release-readiness-revalidation-required',
      'metadata-only-integrity',
      'post-barrier-integrity-not-bound',
      'post-barrier-integrity-not-verified',
      'post-barrier-execution-not-authorized',
      'final-real-execution-barrier-not-lifted',
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
console.log('=== TESTING V452 POST-BARRIER INTEGRITY BINDER ===');

// Test 1: STATUSES exported
console.log('\nTEST: STATUSES exported');
if (typeof STATUSES.POST_BARRIER_INTEGRITY_BINDER_BLOCKED_INPUT !== 'string' ||
    typeof STATUSES.POST_BARRIER_INTEGRITY_BINDER_BLOCKED_REVALIDATION !== 'string' ||
    typeof STATUSES.POST_BARRIER_INTEGRITY_BINDER_FAIL !== 'string' ||
    typeof STATUSES.POST_BARRIER_INTEGRITY_BINDER_READY !== 'string') {
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
if (resultNull.status !== STATUSES.POST_BARRIER_INTEGRITY_BINDER_BLOCKED_INPUT || !resultNull.errors.includes('INPUT_IS_NULL')) {
  console.error('FAIL: null input not handled correctly');
} else {
  console.log('PASS: null input → BLOCKED_INPUT');
}

// Test 6: empty object → BLOCKED_INPUT
console.log('\nTEST: empty object → BLOCKED_INPUT');
const resultEmpty = build({});
if (resultEmpty.status !== STATUSES.POST_BARRIER_INTEGRITY_BINDER_BLOCKED_INPUT || !resultEmpty.errors.includes('MISSING_REQUIRED_FIELD: post_barrier_integrity_binder_id')) {
  console.error('FAIL: empty object not handled correctly');
  console.error('Actual errors:', resultEmpty.errors);
} else {
  console.log('PASS: empty object → BLOCKED_INPUT');
}

// Test 7: V451 not ready → BLOCKED_REVALIDATION
console.log('\nTEST: V451 not ready → BLOCKED_REVALIDATION');
const resultV451NotReady = { ...validInput(), release_readiness_revalidation_contract_ready: false };
const test7Result = build(resultV451NotReady);
console.log('Test7 - Status:', test7Result.status, 'Errors:', test7Result.errors);
if (test7Result.status !== STATUSES.POST_BARRIER_INTEGRITY_BINDER_BLOCKED_REVALIDATION || !test7Result.errors.includes('RELEASE_READINESS_REVALIDATION_CONTRACT_NOT_READY')) {
  console.error('FAIL: V451 not ready not handled correctly');
  console.error('Actual status:', test7Result.status);
  console.error('Actual errors:', test7Result.errors);
} else {
  console.log('PASS: V451 not ready → BLOCKED_REVALIDATION');
}

// Test 8: invalid integrity_mode → BLOCKED_INPUT
console.log('\nTEST: invalid integrity_mode → BLOCKED_INPUT');
const resultInvalidMode = { ...validInput(), integrity_mode: 'invalid-mode' };
const test8Result = build(resultInvalidMode);
console.log('Test8 - Status:', test8Result.status, 'Errors:', test8Result.errors);
if (test8Result.status !== STATUSES.POST_BARRIER_INTEGRITY_BINDER_BLOCKED_INPUT || !test8Result.errors.includes('INVALID_INTEGRITY_MODE')) {
  console.error('FAIL: invalid integrity_mode not handled correctly');
  console.error('Actual status:', test8Result.status);
  console.error('Actual errors:', test8Result.errors);
} else {
  console.log('PASS: invalid integrity_mode → BLOCKED_INPUT');
}

// Test 9: integrity_items not array → BLOCKED_INPUT
console.log('\nTEST: integrity_items not array → BLOCKED_INPUT');
const resultItemsNotArray = { ...validInput(), integrity_items: {} };
const test9Result = build(resultItemsNotArray);
console.log('Test9 - Status:', test9Result.status, 'Errors:', test9Result.errors);
if (test9Result.status !== STATUSES.POST_BARRIER_INTEGRITY_BINDER_BLOCKED_INPUT || !test9Result.errors.includes('INTEGRITY_ITEMS_NOT_AN_ARRAY')) {
  console.error('FAIL: integrity_items not array not handled correctly');
  console.error('Actual status:', test9Result.status);
  console.error('Actual errors:', test9Result.errors);
} else {
  console.log('PASS: integrity_items not array → BLOCKED_INPUT');
}

// Test 10: invalid integrity item → FAIL
console.log('\nTEST: invalid integrity item → FAIL');
const resultInvalidItem = {
  ...validInput(),
  integrity_items: [
    {
      integrity_item_id: '',
      integrity_type: 'invalid-type',
      integrity_mode: 'metadata-only',
      integrity_hash: 'abc123',
    },
  ],
};
const test10Result = build(resultInvalidItem);
console.log('Test10 - Status:', test10Result.status, 'Errors:', test10Result.errors);
if (test10Result.status !== STATUSES.POST_BARRIER_INTEGRITY_BINDER_FAIL || !test10Result.errors.includes('INVALID_INTEGRITY_ITEM_ID')) {
  console.error('FAIL: invalid integrity item not handled correctly');
  console.error('Actual status:', test10Result.status);
  console.error('Actual errors:', test10Result.errors);
} else {
  console.log('PASS: invalid integrity item → FAIL');
}

// Test 11: required_integrity_controls not array → BLOCKED_INPUT
console.log('\nTEST: required_integrity_controls not array → BLOCKED_INPUT');
const resultControlsNotArray = { ...validInput(), required_integrity_controls: {} };
const test11Result = build(resultControlsNotArray);
console.log('Test11 - Status:', test11Result.status, 'Errors:', test11Result.errors);
if (test11Result.status !== STATUSES.POST_BARRIER_INTEGRITY_BINDER_BLOCKED_INPUT || !test11Result.errors.includes('REQUIRED_INTEGRITY_CONTROLS_NOT_AN_ARRAY')) {
  console.error('FAIL: required_integrity_controls not array not handled correctly');
  console.error('Actual status:', test11Result.status);
  console.error('Actual errors:', test11Result.errors);
} else {
  console.log('PASS: required_integrity_controls not array → BLOCKED_INPUT');
}

// Test 12: missing required control → FAIL
console.log('\nTEST: missing required control → FAIL');
const resultMissingControl = {
  ...validInput(),
  required_integrity_controls: [
    'post-barrier-integrity-required',
    // Missing others
  ],
};
const test12Result = build(resultMissingControl);
console.log('Test12 - Status:', test12Result.status, 'Errors:', test12Result.errors);
if (test12Result.status !== STATUSES.POST_BARRIER_INTEGRITY_BINDER_FAIL || !test12Result.errors.includes('MISSING_REQUIRED_CONTROL: release-readiness-revalidation-required')) {
  console.error('FAIL: missing required control not handled correctly');
  console.error('Actual status:', test12Result.status);
  console.error('Actual errors:', test12Result.errors);
} else {
  console.log('PASS: missing required control → FAIL');
}

// Test 13: valid input → READY
console.log('\nTEST: valid input → READY');
const resultReady = build(validInput());
if (resultReady.status !== STATUSES.POST_BARRIER_INTEGRITY_BINDER_READY || resultReady.errors.length > 0) {
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

// Test 16: READY integrity_items_verified has same length
console.log('\nTEST: READY integrity_items_verified has same length');
if (!Array.isArray(resultReady.integrity_items_verified) || resultReady.integrity_items_verified.length !== validInput().integrity_items.length) {
  console.error('FAIL: integrity_items_verified should have same length as input');
} else {
  console.log('PASS: READY integrity_items_verified has same length');
}

// Test 17: READY final_message exact
console.log('\nTEST: READY final_message exact');
if (resultReady.final_message !== 'V451-V455 final release execution readiness revalidation and post-barrier integrity complete. Real release execution remains blocked until explicit V456 command.') {
  console.error('FAIL: final_message should be exact');
} else {
  console.log('PASS: READY final_message exact');
}

// Test 18: all critical flags false
console.log('\nTEST: all critical flags false');
const criticalFlags = [
  'post_barrier_integrity_bound',
  'post_barrier_integrity_verified',
  'post_barrier_execution_authorized',
  'final_real_execution_barrier_lifted',
  'controlled_release_execution_unlocked',
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
  'final_integrity_granted',
  'final_integrity_reviewed',
  'release_readiness_revalidation_phase_passed',
  'release_readiness_revalidated',
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
const blockedInput = build({ ...validInput(), integrity_mode: 'invalid-mode' });
if (validate(blockedInput)) {
  console.error('FAIL: validate BLOCKED_INPUT should return false');
} else {
  console.log('PASS: validate BLOCKED_INPUT → false');
}

// Test 22: validate BLOCKED_REVALIDATION → false
console.log('\nTEST: validate BLOCKED_REVALIDATION → false');
const blockedRevalidationInput = build({ ...validInput(), release_readiness_revalidation_contract_ready: false });
if (validate(blockedRevalidationInput)) {
  console.error('FAIL: validate BLOCKED_REVALIDATION should return false');
} else {
  console.log('PASS: validate BLOCKED_REVALIDATION → false');
}

// Test 23: validate FAIL → false
console.log('\nTEST: validate FAIL → false');
const failInput = {
  ...validInput(),
  integrity_items: [{ integrity_item_id: '', integrity_type: 'invalid', integrity_mode: 'metadata-only', integrity_hash: 'abc' }],
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

// Test 25: render READY → contains V451
console.log('\nTEST: render READY → contains V451');
const renderReady = render(resultReady);
if (!renderReady.includes('V451-V455')) {
  console.error('FAIL: render READY should contain V451');
} else {
  console.log('PASS: render READY → contains V451');
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
if (!renderReady.includes('"status": "POST_BARRIER_INTEGRITY_BINDER_READY"')) {
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

// Test 29: render READY → contains integrity_items_verified
console.log('\nTEST: render READY → contains integrity_items_verified');
if (!renderReady.includes('"integrity_items_verified":')) {
  console.error('FAIL: render READY should contain integrity_items_verified');
} else {
  console.log('PASS: render READY → contains integrity_items_verified');
}

// Test 30: render READY → contains final_message
console.log('\nTEST: render READY → contains final_message');
if (!renderReady.includes('V451-V455 final release execution readiness revalidation and post-barrier integrity complete')) {
  console.error('FAIL: render READY should contain final_message');
} else {
  console.log('PASS: render READY → contains final_message');
}

console.log('\n=== V452 TESTING COMPLETE ===');