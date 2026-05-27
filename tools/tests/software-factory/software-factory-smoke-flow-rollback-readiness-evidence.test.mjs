import assert from 'node:assert';
import { build, validate, STATUSES } from '../../software-factory/software-factory-smoke-flow-rollback-readiness-evidence.mjs';

async function test_case(description, input, expected) {
  console.log(`Testing: ${description}`);
  try {
    const result = build(input);
    const validationResult = validate(result);
    
    if (expected === 'BLOCKED_INPUT') {
      assert.strictEqual(result.status, STATUSES.BLOCKED_INPUT, 'Should be BLOCKED_INPUT');
      assert.strictEqual(result.ready, false, 'Should not be ready');
      assert.strictEqual(result.blocked_input, true, 'Should have blocked_input true');
    } else if (expected === 'BLOCKED_RTP0') {
      assert.strictEqual(result.status, STATUSES.BLOCKED_RTP0, 'Should be BLOCKED_RTP0');
      assert.strictEqual(result.ready, false, 'Should not be ready');
      assert.strictEqual(result.blocked_rtp0, true, 'Should have blocked_rtp0 true');
    } else if (expected === 'FAIL') {
      assert.strictEqual(result.status, STATUSES.FAIL, 'Should be FAIL');
      assert.strictEqual(result.ready, false, 'Should not be ready');
      assert.strictEqual(result.fail, true, 'Should have fail true');
    } else if (expected === 'READY') {
      assert.strictEqual(result.status, STATUSES.READY, 'Should be READY');
      assert.strictEqual(result.ready, true, 'Should be ready');
      assert.strictEqual(result.smoke_flow_rollback_readiness_evidence_ready, true, 'Should have smoke_flow_rollback_readiness_evidence_ready true');
      assert.strictEqual(result.local_runtime_truth_probe_execution_ready, true, 'Should have local_runtime_truth_probe_execution_ready true');
      assert.strictEqual(result.runtime_truth_probe_result_bound, true, 'Should have runtime_truth_probe_result_bound true');
      assert.strictEqual(result.smoke_flow_evidence_plan_ready, true, 'Should have smoke_flow_evidence_plan_ready true');
      assert.strictEqual(result.rollback_readiness_evidence_plan_ready, true, 'Should have rollback_readiness_evidence_plan_ready true');
      assert.strictEqual(result.smoke_execution_performed, false, 'Should have smoke_execution_performed false');
      assert.strictEqual(result.rollback_execution_performed, false, 'Should have rollback_execution_performed false');
      assert.strictEqual(result.runtime_execution_authorized, false, 'Should have runtime_execution_authorized false');
      assert.strictEqual(result.command_execution_allowed, false, 'Should have command_execution_allowed false');
      assert.strictEqual(result.endpoint_probe_allowed, false, 'Should have endpoint_probe_allowed false');
      assert.strictEqual(result.pass_gold_real_achieved, false, 'Should have pass_gold_real_achieved false');
      assert.strictEqual(result.v471_allowed, false, 'Should have v471_allowed false');
      assert.strictEqual(result.rta10_allowed, false, 'Should have rta10_allowed false');
      assert.strictEqual(result.release_allowed, false, 'Should have release_allowed false');
      assert.strictEqual(result.deploy_allowed, false, 'Should have deploy_allowed false');
      assert.strictEqual(result.tag_allowed, false, 'Should have tag_allowed false');
      assert.strictEqual(result.stable_promotion_allowed, false, 'Should have stable_promotion_allowed false');
      assert.strictEqual(result.production_touched, false, 'Should have production_touched false');
      assert.strictEqual(result.billing_execution_allowed, false, 'Should have billing_execution_allowed false');
      assert.strictEqual(result.secret_access_allowed, false, 'Should have secret_access_allowed false');
      assert.strictEqual(result.network_allowed, false, 'Should have network_allowed false');
      assert.strictEqual(result.rollback_execution_allowed, false, 'Should have rollback_execution_allowed false');
      assert.strictEqual(result.evidence_hash.length, 64, 'Should have 64 character evidence hash');
      assert.strictEqual(result.final_message, 'RTP-1 smoke flow and rollback readiness evidence plan prepared. Smoke execution and rollback execution remain pending explicit operator evidence; PASS GOLD REAL is not claimed.', 'Should have correct final message');
    }
    
    assert.strictEqual(validationResult, true, 'Validation should pass');
    console.log('✓ PASS');
  } catch (error) {
    console.log(`✗ FAIL: ${error.message}`);
    throw error;
  }
}

console.log('=== RTP-1 Smoke Flow + Rollback Readiness Evidence Plan Tests ===\n');

(async () => {

// Dependency false blocks
await test_case('local_runtime_truth_probe_execution_ready false blocks', {
  local_runtime_truth_probe_execution_ready: false,
  runtime_truth_probe_result_bound: true,
  pass_gold_real_achieved: false
}, 'BLOCKED_INPUT');

await test_case('runtime_truth_probe_result_bound blocks', {
  local_runtime_truth_probe_execution_ready: true,
  runtime_truth_probe_result_bound: false,
  pass_gold_real_achieved: false
}, 'BLOCKED_RTP0');

// pass_gold_real_achieved true fails
await test_case('pass_gold_real_achieved true fails', {
  local_runtime_truth_probe_execution_ready: true,
  runtime_truth_probe_result_bound: true,
  pass_gold_real_achieved: true
}, 'FAIL');

// smoke execution true fails
await test_case('smoke execution true fails', {
  local_runtime_truth_probe_execution_ready: true,
  runtime_truth_probe_result_bound: true,
  pass_gold_real_achieved: false,
  smoke_execution_performed: true
}, 'FAIL');

// rollback execution true fails
await test_case('rollback execution true fails', {
  local_runtime_truth_probe_execution_ready: true,
  runtime_truth_probe_result_bound: true,
  pass_gold_real_achieved: false,
  rollback_execution_performed: true
}, 'FAIL');

// valid input ready
await test_case('valid input ready', {
  local_runtime_truth_probe_execution_ready: true,
  runtime_truth_probe_result_bound: true,
  pass_gold_real_achieved: false
}, 'READY');

// Test evidence hash deterministic
console.log('\nTesting evidence hash deterministic property...');
const input1 = {
  local_runtime_truth_probe_execution_ready: true,
  runtime_truth_probe_result_bound: true,
  pass_gold_real_achieved: false
};
const result1 = build(input1);
const result2 = build(input1);
assert.strictEqual(result1.evidence_hash, result2.evidence_hash, 'Evidence hash should be deterministic for same input');
console.log('✓ PASS: Evidence hash is deterministic');

// Test missing controls fail
console.log('\nTesting missing controls...');
try {
  const result = build({
    local_runtime_truth_probe_execution_ready: true,
    runtime_truth_probe_result_bound: true,
    pass_gold_real_achieved: false
  });
  
  // Modify result to remove required field
  delete result.smoke_flow_rollback_readiness_evidence_ready;
  const validationResult = validate(result);
  assert.strictEqual(validationResult, false, 'Validation should fail with missing field');
  console.log('✓ PASS: Missing controls fail validation');
} catch (error) {
  console.log('✗ FAIL: Missing controls test failed');
  throw error;
}

// Test invalid smoke evidence plan fails
console.log('\nTesting invalid smoke evidence plan...');
try {
  const result = build({
    local_runtime_truth_probe_execution_ready: true,
    runtime_truth_probe_result_bound: true,
    pass_gold_real_achieved: false
  });
  
  // Modify result to have invalid smoke evidence plan
  result.smoke_flow_evidence_plan_ready = false;
  const validationResult = validate(result);
  assert.strictEqual(validationResult, false, 'Validation should fail with invalid smoke evidence plan');
  console.log('✓ PASS: Invalid smoke evidence plan fails validation');
} catch (error) {
  console.log('✗ FAIL: Invalid smoke evidence plan test failed');
  throw error;
}

// Test invalid rollback readiness plan fails
console.log('\nTesting invalid rollback readiness plan...');
try {
  const result = build({
    local_runtime_truth_probe_execution_ready: true,
    runtime_truth_probe_result_bound: true,
    pass_gold_real_achieved: false
  });
  
  // Modify result to have invalid rollback readiness plan
  result.rollback_readiness_evidence_plan_ready = false;
  const validationResult = validate(result);
  assert.strictEqual(validationResult, false, 'Validation should fail with invalid rollback readiness plan');
  console.log('✓ PASS: Invalid rollback readiness plan fails validation');
} catch (error) {
  console.log('✗ FAIL: Invalid rollback readiness plan test failed');
  throw error;
}

// Test all dangerous flags false
console.log('\nTesting all dangerous flags are false...');
const safeResult = build({
  local_runtime_truth_probe_execution_ready: true,
  runtime_truth_probe_result_bound: true,
  pass_gold_real_achieved: false
});

const dangerousFlags = [
  'runtime_execution_authorized',
  'command_execution_allowed', 
  'endpoint_probe_allowed',
  'pass_gold_real_achieved',
  'v471_allowed',
  'rta10_allowed',
  'release_allowed',
  'deploy_allowed',
  'tag_allowed',
  'stable_promotion_allowed',
  'production_touched',
  'billing_execution_allowed',
  'secret_access_allowed',
  'network_allowed',
  'rollback_execution_allowed'
];

for (const flag of dangerousFlags) {
  assert.strictEqual(safeResult[flag], false, `${flag} should be false`);
}
console.log('✓ PASS: All dangerous flags are false');

// Test PASS GOLD REAL not claimed
console.log('\nTesting PASS GOLD REAL not claimed...');
assert.strictEqual(safeResult.pass_gold_real_achieved, false, 'PASS GOLD REAL should not be claimed');
console.log('✓ PASS: PASS GOLD REAL is not claimed');

// Test final_message exact
console.log('\nTesting final message exact...');
assert.strictEqual(safeResult.final_message, 'RTP-1 smoke flow and rollback readiness evidence plan prepared. Smoke execution and rollback execution remain pending explicit operator evidence; PASS GOLD REAL is not claimed.', 'Final message should be exact');
console.log('✓ PASS: Final message is exact');

// Test render contains required elements
console.log('\nTesting render contains required elements...');
const module = await import('../../software-factory/software-factory-smoke-flow-rollback-readiness-evidence.mjs');
const rendered = module.render(safeResult);
assert(rendered.includes('RTP-1 Smoke Flow + Rollback Readiness Evidence Plan'), 'Render should contain RTP-1 title');
assert(rendered.includes('RTP-0 Dependency Status'), 'Render should contain RTP-0 status');
assert(rendered.includes('Smoke Flow + Rollback Readiness Evidence: READY'), 'Render should contain smoke flow readiness');
assert(rendered.includes('Smoke Execution Performed: FALSE'), 'Render should contain smoke not executed');
assert(rendered.includes('Rollback Execution Performed: FALSE'), 'Render should contain rollback not executed');
assert(rendered.includes('V471 Allowed: FALSE'), 'Render should contain V471 blocked');
assert(rendered.includes('RTA-10 Allowed: FALSE'), 'Render should contain RTA-10 blocked');
assert(rendered.includes('REGRA ABSOLUTA'), 'Render should contain REGRA ABSOLUTA');
console.log('✓ PASS: Render contains all required elements');

console.log('\n=== All RTP-1 Tests Completed Successfully ===');
})();