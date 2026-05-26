// Use dynamic import to avoid module resolution issues
const contractModule = await import('file:///C:/Users/imadechumbo/Desktop/vision-core/tools/software-factory/software-factory-release-readiness-revalidation-contract.mjs');
const { build, validate, render, STATUSES } = contractModule;

console.log('CWD:', process.cwd());
console.log('Import meta URL:', import.meta.url);

const MODULE_NAME = 'software-factory-release-readiness-revalidation-contract';

// Helper to create valid base input
function validInput() {
  return {
    release_readiness_revalidation_contract_id: 'valid-revalidation-contract-id-123',
    controlled_unlock_decision_phase_gate_id: 'valid-phase-gate-id-123',
    controlled_unlock_decision_phase_gate_ready: true,
    revalidation_requested_by: 'operator',
    revalidation_reason: 'post-release revalidation',
    revalidation_mode: 'metadata-only',
    revalidation_items: [
      {
        revalidation_item_id: 'item-1',
        revalidation_type: 'release_readiness_revalidation',
        revalidation_mode: 'metadata-only',
        revalidation_hash: 'abc123',
      },
      {
        revalidation_item_id: 'item-2',
        revalidation_type: 'deploy_readiness_revalidation',
        revalidation_mode: 'metadata-only',
        revalidation_hash: 'def456',
      },
    ],
    required_revalidation_controls: [
      'release-readiness-revalidation-required',
      'controlled-unlock-decision-phase-required',
      'metadata-only-revalidation',
      'readiness-not-revalidated',
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
console.log('=== TESTING V451 RELEASE READINESS REVALIDATION CONTRACT ===');

// Test 1: STATUSES exported
console.log('\nTEST: STATUSES exported');
if (typeof STATUSES.RELEASE_READINESS_REVALIDATION_BLOCKED_INPUT !== 'string' ||
    typeof STATUSES.RELEASE_READINESS_REVALIDATION_BLOCKED_UNLOCK_DECISION !== 'string' ||
    typeof STATUSES.RELEASE_READINESS_REVALIDATION_FAIL !== 'string' ||
    typeof STATUSES.RELEASE_READINESS_REVALIDATION_READY !== 'string') {
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
if (resultNull.status !== STATUSES.RELEASE_READINESS_REVALIDATION_BLOCKED_INPUT || !resultNull.errors.includes('INPUT_IS_NULL')) {
  console.error('FAIL: null input not handled correctly');
} else {
  console.log('PASS: null input → BLOCKED_INPUT');
}

// Test 6: empty object → BLOCKED_INPUT
console.log('\nTEST: empty object → BLOCKED_INPUT');
const resultEmpty = build({});
if (resultEmpty.status !== STATUSES.RELEASE_READINESS_REVALIDATION_BLOCKED_INPUT || !resultEmpty.errors.includes('MISSING_REQUIRED_FIELD: release_readiness_revalidation_contract_id')) {
  console.error('FAIL: empty object not handled correctly');
  console.error('Actual errors:', resultEmpty.errors);
} else {
  console.log('PASS: empty object → BLOCKED_INPUT');
}

// Test 7: missing phase_gate_id → BLOCKED_INPUT
console.log('\nTEST: missing phase_gate_id → BLOCKED_INPUT');
const resultMissingPhaseGateId = { ...validInput() };
delete resultMissingPhaseGateId.controlled_unlock_decision_phase_gate_id;
const test7Result = build(resultMissingPhaseGateId);
console.log('Test7 - Status:', test7Result.status, 'Errors:', test7Result.errors);
if (test7Result.status !== STATUSES.RELEASE_READINESS_REVALIDATION_BLOCKED_INPUT || !test7Result.errors.includes('MISSING_REQUIRED_FIELD: controlled_unlock_decision_phase_gate_id')) {
  console.error('FAIL: missing phase_gate_id not handled correctly');
  console.error('Actual status:', test7Result.status);
  console.error('Actual errors:', test7Result.errors);
} else {
  console.log('PASS: missing phase_gate_id → BLOCKED_INPUT');
}

// Test 8: V450 not ready → BLOCKED_UNLOCK_DECISION
    console.log('\nTEST: V450 not ready → BLOCKED_UNLOCK_DECISION');
    const resultV450NotReady = { ...validInput(), controlled_unlock_decision_phase_gate_ready: false };
    const test8Result = build(resultV450NotReady);
    console.log('Test8 - Status:', test8Result.status, 'Errors:', test8Result.errors);
    if (test8Result.status !== STATUSES.RELEASE_READINESS_REVALIDATION_BLOCKED_UNLOCK_DECISION || !test8Result.errors.includes('CONTROLLED_UNLOCK_DECISION_PHASE_GATE_NOT_READY')) {
      console.error('FAIL: V450 not ready not handled correctly');
      console.error('Actual status:', test8Result.status);
      console.error('Actual errors:', test8Result.errors);
    } else {
      console.log('PASS: V450 not ready → BLOCKED_UNLOCK_DECISION');
    }

// Test 9: invalid revalidation_mode → BLOCKED_INPUT
console.log('\nTEST: invalid revalidation_mode → BLOCKED_INPUT');
const resultInvalidMode = { ...validInput(), revalidation_mode: 'invalid-mode' };
const test9Result = build(resultInvalidMode);
console.log('Test9 - Status:', test9Result.status, 'Errors:', test9Result.errors);
if (test9Result.status !== STATUSES.RELEASE_READINESS_REVALIDATION_BLOCKED_INPUT || !test9Result.errors.includes('INVALID_REVALIDATION_MODE')) {
  console.error('FAIL: invalid revalidation_mode not handled correctly');
  console.error('Actual status:', test9Result.status);
  console.error('Actual errors:', test9Result.errors);
} else {
  console.log('PASS: invalid revalidation_mode → BLOCKED_INPUT');
}

// Test 10: revalidation_items not array → BLOCKED_INPUT
console.log('\nTEST: revalidation_items not array → BLOCKED_INPUT');
const resultItemsNotArray = { ...validInput(), revalidation_items: {} };
const test10Result = build(resultItemsNotArray);
console.log('Test10 - Status:', test10Result.status, 'Errors:', test10Result.errors);
if (test10Result.status !== STATUSES.RELEASE_READINESS_REVALIDATION_BLOCKED_INPUT || !test10Result.errors.includes('REVALIDATION_ITEMS_NOT_AN_ARRAY')) {
  console.error('FAIL: revalidation_items not array not handled correctly');
  console.error('Actual status:', test10Result.status);
  console.error('Actual errors:', test10Result.errors);
} else {
  console.log('PASS: revalidation_items not array → BLOCKED_INPUT');
}

// Test 11: invalid revalidation item → FAIL
console.log('\nTEST: invalid revalidation item → FAIL');
const resultInvalidItem = {
  ...validInput(),
  revalidation_items: [
    {
      revalidation_item_id: '',
      revalidation_type: 'invalid-type',
      revalidation_mode: 'metadata-only',
      revalidation_hash: 'abc123',
    },
  ],
};
const test11Result = build(resultInvalidItem);
console.log('Test11 - Status:', test11Result.status, 'Errors:', test11Result.errors);
if (test11Result.status !== STATUSES.RELEASE_READINESS_REVALIDATION_FAIL || !test11Result.errors.includes('INVALID_REVALIDATION_ITEM_ID')) {
  console.error('FAIL: invalid revalidation item not handled correctly');
  console.error('Actual status:', test11Result.status);
  console.error('Actual errors:', test11Result.errors);
} else {
  console.log('PASS: invalid revalidation item → FAIL');
}

// Test 12: required_revalidation_controls not array → BLOCKED_INPUT
console.log('\nTEST: required_revalidation_controls not array → BLOCKED_INPUT');
const resultControlsNotArray = { ...validInput(), required_revalidation_controls: {} };
const test12Result = build(resultControlsNotArray);
console.log('Test12 - Status:', test12Result.status, 'Errors:', test12Result.errors);
if (test12Result.status !== STATUSES.RELEASE_READINESS_REVALIDATION_BLOCKED_INPUT || !test12Result.errors.includes('REQUIRED_REVALIDATION_CONTROLS_NOT_AN_ARRAY')) {
  console.error('FAIL: required_revalidation_controls not array not handled correctly');
  console.error('Actual status:', test12Result.status);
  console.error('Actual errors:', test12Result.errors);
} else {
  console.log('PASS: required_revalidation_controls not array → BLOCKED_INPUT');
}

// Test 13: missing required control → FAIL
console.log('\nTEST: missing required control → FAIL');
const resultMissingControl = {
  ...validInput(),
  required_revalidation_controls: [
    'release-readiness-revalidation-required',
    // Missing others
  ],
};
const test13Result = build(resultMissingControl);
console.log('Test13 - Status:', test13Result.status, 'Errors:', test13Result.errors);
if (test13Result.status !== STATUSES.RELEASE_READINESS_REVALIDATION_FAIL || !test13Result.errors.includes('MISSING_REQUIRED_CONTROL: controlled-unlock-decision-phase-required')) {
  console.error('FAIL: missing required control not handled correctly');
  console.error('Actual status:', test13Result.status);
  console.error('Actual errors:', test13Result.errors);
} else {
  console.log('PASS: missing required control → FAIL');
}

// Test 14: valid input → READY
console.log('\nTEST: valid input → READY');
const resultReady = build(validInput());
if (resultReady.status !== STATUSES.RELEASE_READINESS_REVALIDATION_READY || resultReady.errors.length > 0) {
  console.error('FAIL: valid input should be READY');
  console.error('Errors:', resultReady.errors);
} else {
  console.log('PASS: valid input → READY');
}

// Test 15: READY hash 64 chars
console.log('\nTEST: READY hash 64 chars');
if (resultReady.hash && resultReady.hash.length !== 64) {
  console.error('FAIL: READY hash should be 64 chars');
} else {
  console.log('PASS: READY hash 64 chars');
}

// Test 16: READY hash deterministic
console.log('\nTEST: READY hash deterministic');
const resultReady2 = build(validInput());
if (resultReady.hash !== resultReady2.hash) {
  console.error('FAIL: READY hash should be deterministic');
} else {
  console.log('PASS: READY hash deterministic');
}

// Test 17: READY revalidation_items_verified has same length
console.log('\nTEST: READY revalidation_items_verified has same length');
if (!Array.isArray(resultReady.revalidation_items_verified) || resultReady.revalidation_items_verified.length !== validInput().revalidation_items.length) {
  console.error('FAIL: revalidation_items_verified should have same length as input');
} else {
  console.log('PASS: READY revalidation_items_verified has same length');
}

// Test 18: READY final_message exact
console.log('\nTEST: READY final_message exact');
if (resultReady.final_message !== 'V451-V455 final release execution readiness revalidation and post-barrier integrity complete. Real release execution remains blocked until explicit V456 command.') {
  console.error('FAIL: final_message should be exact');
} else {
  console.log('PASS: READY final_message exact');
}

// Test 19: all critical flags false
console.log('\nTEST: all critical flags false');
const criticalFlags = [
  'release_readiness_revalidated',
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

// Test 20: validate READY → true
console.log('\nTEST: validate READY → true');
if (!validate(validInput())) {
  console.error('FAIL: validate READY should return true');
} else {
  console.log('PASS: validate READY → true');
}

// Test 21: validate null → false
console.log('\nTEST: validate null → false');
if (validate(null)) {
  console.error('FAIL: validate null should return false');
} else {
  console.log('PASS: validate null → false');
}

// Test 22: validate BLOCKED_INPUT → false
console.log('\nTEST: validate BLOCKED_INPUT → false');
const blockedInput = build({ ...validInput(), revalidation_mode: 'invalid-mode' });
if (validate(blockedInput)) {
  console.error('FAIL: validate BLOCKED_INPUT should return false');
} else {
  console.log('PASS: validate BLOCKED_INPUT → false');
}

// Test 23: validate BLOCKED_UNLOCK_DECISION → false
console.log('\nTEST: validate BLOCKED_UNLOCK_DECISION → false');
const blockedUnlockInput = build({ ...validInput(), controlled_unlock_decision_phase_gate_ready: false });
if (validate(blockedUnlockInput)) {
  console.error('FAIL: validate BLOCKED_UNLOCK_DECISION should return false');
} else {
  console.log('PASS: validate BLOCKED_UNLOCK_DECISION → false');
}

// Test 24: validate FAIL → false
console.log('\nTEST: validate FAIL → false');
const failInput = {
  ...validInput(),
  revalidation_items: [{ revalidation_item_id: '', revalidation_type: 'invalid', revalidation_mode: 'metadata-only', revalidation_hash: 'abc' }],
};
if (validate(failInput)) {
  console.error('FAIL: validate FAIL should return false');
} else {
  console.log('PASS: validate FAIL → false');
}

// Test 25: render null → string with REGRA
console.log('\nTEST: render null → string with REGRA');
const renderNull = render(null);
if (!renderNull.includes('SEM PASS GOLD REAL')) {
  console.error('FAIL: render null should contain REGRA');
} else {
  console.log('PASS: render null → string with REGRA');
}

// Test 26: render READY → contains V451
console.log('\nTEST: render READY → contains V451');
const renderReady = render(resultReady);
if (!renderReady.includes('V451-V455')) {
  console.error('FAIL: render READY should contain V451');
} else {
  console.log('PASS: render READY → contains V451');
}

// Test 27: render READY → REGRA ABSOLUTA
console.log('\nTEST: render READY → REGRA ABSOLUTA');
if (!renderReady.includes('SEM PASS GOLD REAL')) {
  console.error('FAIL: render READY should contain REGRA ABSOLUTA');
} else {
  console.log('PASS: render READY → REGRA ABSOLUTA');
}

// Test 28: render READY → contains status
console.log('\nTEST: render READY → contains status');
if (!renderReady.includes('"status": "RELEASE_READINESS_REVALIDATION_READY"')) {
  console.error('FAIL: render READY should contain status');
} else {
  console.log('PASS: render READY → contains status');
}

// Test 29: render READY → contains hash
console.log('\nTEST: render READY → contains hash');
if (!renderReady.includes('"hash":')) {
  console.error('FAIL: render READY should contain hash');
} else {
  console.log('PASS: render READY → contains hash');
}

// Test 30: render READY → contains revalidation_items_verified
console.log('\nTEST: render READY → contains revalidation_items_verified');
if (!renderReady.includes('"revalidation_items_verified":')) {
  console.error('FAIL: render READY should contain revalidation_items_verified');
} else {
  console.log('PASS: render READY → contains revalidation_items_verified');
}

// Test 31: render READY → contains final_message
console.log('\nTEST: render READY → contains final_message');
if (!renderReady.includes('V451-V455 final release execution readiness revalidation and post-barrier integrity complete')) {
  console.error('FAIL: render READY should contain final_message');
} else {
  console.log('PASS: render READY → contains final_message');
}

console.log('\n=== V451 TESTING COMPLETE ===');