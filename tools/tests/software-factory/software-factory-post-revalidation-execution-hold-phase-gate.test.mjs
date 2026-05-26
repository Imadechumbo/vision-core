// Use dynamic import to avoid module resolution issues
const contractModule = await import('file:///C:/Users/imadechumbo/Desktop/vision-core/tools/software-factory/software-factory-post-revalidation-execution-hold-phase-gate.mjs');
const { build, validate, render, STATUSES } = contractModule;

console.log('CWD:', process.cwd());
console.log('Import meta URL:', import.meta.url);

const MODULE_NAME = 'software-factory-post-revalidation-execution-hold-phase-gate';

// Helper to create valid base input
function validInput() {
  return {
    post_revalidation_execution_hold_phase_gate_id: 'valid-phase-gate-id-123',
    final_release_lock_review_id: 'valid-lock-review-id-123',
    final_release_lock_review_ready: true,
    ids: {
      post_revalidation_execution_hold_contract: 'valid-execution-hold-contract-id-123',
      final_release_lock_binder: 'valid-lock-binder-id-123',
      execution_hold_evidence_receipt: 'valid-evidence-receipt-id-123',
      final_release_lock_review: 'valid-integrity-review-id-123',
    },
    phase_summary: 'Test phase summary',
  };
}

// Test suite
console.log('=== TESTING V460 POST-REVALIDATION EXECUTION HOLD PHASE GATE ===');

// Test 1: STATUSES exported
console.log('\nTEST: STATUSES exported');
if (typeof STATUSES.POST_REVALIDATION_EXECUTION_HOLD_PHASE_GATE_BLOCKED_INPUT !== 'string' ||
    typeof STATUSES.POST_REVALIDATION_EXECUTION_HOLD_PHASE_GATE_BLOCKED_REVIEW !== 'string' ||
    typeof STATUSES.POST_REVALIDATION_EXECUTION_HOLD_PHASE_GATE_INCOMPLETE !== 'string' ||
    typeof STATUSES.POST_REVALIDATION_EXECUTION_HOLD_PHASE_GATE_READY !== 'string') {
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
if (resultNull.status !== STATUSES.POST_REVALIDATION_EXECUTION_HOLD_PHASE_GATE_BLOCKED_INPUT || !resultNull.errors.includes('INPUT_IS_NULL')) {
  console.error('FAIL: null input not handled correctly');
} else {
  console.log('PASS: null input → BLOCKED_INPUT');
}

// Test 6: empty object → BLOCKED_INPUT
console.log('\nTEST: empty object → BLOCKED_INPUT');
const resultEmpty = build({});
if (resultEmpty.status !== STATUSES.POST_REVALIDATION_EXECUTION_HOLD_PHASE_GATE_BLOCKED_INPUT || !resultEmpty.errors.includes('MISSING_REQUIRED_FIELD: post_revalidation_execution_hold_phase_gate_id')) {
  console.error('FAIL: empty object not handled correctly');
  console.error('Actual errors:', resultEmpty.errors);
} else {
  console.log('PASS: empty object → BLOCKED_INPUT');
}

// Test 7: V459 not ready → BLOCKED_REVIEW
console.log('\nTEST: V459 not ready → BLOCKED_REVIEW');
const resultV459NotReady = { ...validInput(), final_release_lock_review_ready: false };
const test7Result = build(resultV459NotReady);
console.log('Test7 - Status:', test7Result.status, 'Errors:', test7Result.errors);
if (test7Result.status !== STATUSES.POST_REVALIDATION_EXECUTION_HOLD_PHASE_GATE_BLOCKED_REVIEW || !test7Result.errors.includes('FINAL_RELEASE_LOCK_REVIEW_NOT_READY')) {
  console.error('FAIL: V459 not ready not handled correctly');
  console.error('Actual status:', test7Result.status);
  console.error('Actual errors:', test7Result.errors);
} else {
  console.log('PASS: V459 not ready → BLOCKED_REVIEW');
}

// Test 8: ids not object → BLOCKED_INPUT
console.log('\nTEST: ids not object → BLOCKED_INPUT');
const resultIdsNotObject = { ...validInput(), ids: 'not-an-object' };
const test8Result = build(resultIdsNotObject);
console.log('Test8 - Status:', test8Result.status, 'Errors:', test8Result.errors);
if (test8Result.status !== STATUSES.POST_REVALIDATION_EXECUTION_HOLD_PHASE_GATE_BLOCKED_INPUT || !test8Result.errors.includes('IDS_NOT_AN_OBJECT')) {
  console.error('FAIL: ids not object not handled correctly');
  console.error('Actual status:', test8Result.status);
  console.error('Actual errors:', test8Result.errors);
} else {
  console.log('PASS: ids not object → BLOCKED_INPUT');
}

// Test 9: missing required module ID → INCOMPLETE
console.log('\nTEST: missing required module ID → INCOMPLETE');
const resultMissingModuleId = {
  ...validInput(),
  ids: {
    post_revalidation_execution_hold_contract: 'valid-execution-hold-contract-id-123',
    final_release_lock_binder: 'valid-lock-binder-id-123',
    // Missing execution_hold_evidence_receipt
    final_release_lock_review: 'valid-integrity-review-id-123',
  },
};
const test9Result = build(resultMissingModuleId);
console.log('Test9 - Status:', test9Result.status, 'Errors:', test9Result.errors);
if (test9Result.status !== STATUSES.POST_REVALIDATION_EXECUTION_HOLD_PHASE_GATE_INCOMPLETE || !test9Result.errors.includes('MISSING_REQUIRED_ID: execution_hold_evidence_receipt')) {
  console.error('FAIL: missing required module ID not handled correctly');
  console.error('Actual status:', test9Result.status);
  console.error('Actual errors:', test9Result.errors);
} else {
  console.log('PASS: missing required module ID → INCOMPLETE');
}

// Test 10: empty string module ID → INCOMPLETE
console.log('\nTEST: empty string module ID → INCOMPLETE');
const resultEmptyModuleId = {
  ...validInput(),
  ids: {
    post_revalidation_execution_hold_contract: 'valid-execution-hold-contract-id-123',
    final_release_lock_binder: 'valid-lock-binder-id-123',
    execution_hold_evidence_receipt: '',
    final_release_lock_review: 'valid-integrity-review-id-123',
  },
};
const test10Result = build(resultEmptyModuleId);
console.log('Test10 - Status:', test10Result.status, 'Errors:', test10Result.errors);
if (test10Result.status !== STATUSES.POST_REVALIDATION_EXECUTION_HOLD_PHASE_GATE_INCOMPLETE || !test10Result.errors.includes('INVALID_EXECUTION_HOLD_EVIDENCE_RECEIPT_ID')) {
  console.error('FAIL: empty string module ID not handled correctly');
  console.error('Actual status:', test10Result.status);
  console.error('Actual errors:', test10Result.errors);
} else {
  console.log('PASS: empty string module ID → INCOMPLETE');
}

// Test 11: invalid phase_summary → INCOMPLETE
console.log('\nTEST: invalid phase_summary → INCOMPLETE');
const resultInvalidSummary = { ...validInput(), phase_summary: '' };
const test11Result = build(resultInvalidSummary);
console.log('Test11 - Status:', test11Result.status, 'Errors:', test11Result.errors);
if (test11Result.status !== STATUSES.POST_REVALIDATION_EXECUTION_HOLD_PHASE_GATE_INCOMPLETE || !test11Result.errors.includes('INVALID_PHASE_SUMMARY')) {
  console.error('FAIL: invalid phase_summary not handled correctly');
  console.error('Actual status:', test11Result.status);
  console.error('Actual errors:', test11Result.errors);
} else {
  console.log('PASS: invalid phase_summary → INCOMPLETE');
}

// Test 12: valid input → READY
console.log('\nTEST: valid input → READY');
const resultReady = build(validInput());
if (resultReady.status !== STATUSES.POST_REVALIDATION_EXECUTION_HOLD_PHASE_GATE_READY || resultReady.errors.length > 0) {
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

// Test 15: READY modules_verified has 4 entries
console.log('\nTEST: READY modules_verified has 4 entries');
if (!Array.isArray(resultReady.modules_verified) || resultReady.modules_verified.length !== 4) {
  console.error('FAIL: modules_verified should have 4 entries');
} else {
  console.log('PASS: READY modules_verified has 4 entries');
}

// Test 16: READY final_message exact
console.log('\nTEST: READY final_message exact');
if (resultReady.final_message !== 'V456-V460 post-revalidation execution hold and final release lock complete. Real release execution remains blocked until explicit V461 command.') {
  console.error('FAIL: final_message should be exact');
} else {
  console.log('PASS: READY final_message exact');
}

// Test 17: all critical flags false
console.log('\nTEST: all critical flags false');
const criticalFlags = [
  'post_revalidation_execution_hold_phase_passed',
  'final_release_lock_granted',
  'final_release_execution_locked',
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
const blockedInput = build({ ...validInput(), ids: 'not-an-object' });
if (validate(blockedInput)) {
  console.error('FAIL: validate BLOCKED_INPUT should return false');
} else {
  console.log('PASS: validate BLOCKED_INPUT → false');
}

// Test 21: validate BLOCKED_REVIEW → false
console.log('\nTEST: validate BLOCKED_REVIEW → false');
const blockedReviewInput = build({ ...validInput(), final_release_lock_review_ready: false });
if (validate(blockedReviewInput)) {
  console.error('FAIL: validate BLOCKED_REVIEW should return false');
} else {
  console.log('PASS: validate BLOCKED_REVIEW → false');
}

// Test 22: validate INCOMPLETE → false
console.log('\nTEST: validate INCOMPLETE → false');
const incompleteInput = {
  ...validInput(),
  ids: {
    post_revalidation_execution_hold_contract: 'valid-execution-hold-contract-id-123',
    final_release_lock_binder: 'valid-lock-binder-id-123',
    // Missing execution_hold_evidence_receipt
    final_release_lock_review: 'valid-integrity-review-id-123',
  },
};
if (validate(incompleteInput)) {
  console.error('FAIL: validate INCOMPLETE should return false');
} else {
  console.log('PASS: validate INCOMPLETE → false');
}

// Test 23: render null → string with REGRA
console.log('\nTEST: render null → string with REGRA');
const renderNull = render(null);
if (!renderNull.includes('SEM PASS GOLD REAL')) {
  console.error('FAIL: render null should contain REGRA');
} else {
  console.log('PASS: render null → string with REGRA');
}

// Test 24: render READY → contains V456
console.log('\nTEST: render READY → contains V456');
const renderReady = render(resultReady);
if (!renderReady.includes('V456-V460')) {
  console.error('FAIL: render READY should contain V456');
} else {
  console.log('PASS: render READY → contains V456');
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
if (!renderReady.includes('"status": "POST_REVALIDATION_EXECUTION_HOLD_PHASE_GATE_READY"')) {
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

// Test 28: render READY → contains modules_verified
console.log('\nTEST: render READY → contains modules_verified');
if (!renderReady.includes('"modules_verified":')) {
  console.error('FAIL: render READY should contain modules_verified');
} else {
  console.log('PASS: render READY → contains modules_verified');
}

// Test 29: render READY → contains final_message
console.log('\nTEST: render READY → contains final_message');
if (!renderReady.includes('V456-V460 post-revalidation execution hold and final release lock complete')) {
  console.error('FAIL: render READY should contain final_message');
} else {
  console.log('PASS: render READY → contains final_message');
}

console.log('\n=== V460 TESTING COMPLETE ===');