import assert from 'node:assert';
import { build, validate, STATUSES } from '../../software-factory/software-factory-real-runtime-truth-probe-contract.mjs';

function test_case(description, input, expected) {
  console.log(`Testing: ${description}`);
  try {
    const result = build(input);
    const validationResult = validate(result);
    
    if (expected === 'BLOCKED_INPUT') {
      assert.strictEqual(result.status, STATUSES.BLOCKED_INPUT, 'Should be BLOCKED_INPUT');
      assert.strictEqual(result.ready, false, 'Should not be ready');
      assert.strictEqual(result.blocked_input, true, 'Should have blocked_input true');
    } else if (expected === 'BLOCKED_DEPENDENCY') {
      assert.strictEqual(result.status, STATUSES.BLOCKED_DEPENDENCY, 'Should be BLOCKED_DEPENDENCY');
      assert.strictEqual(result.ready, false, 'Should not be ready');
      assert.strictEqual(result.blocked_dependency, true, 'Should have blocked_dependency true');
    } else if (expected === 'FAIL') {
      assert.strictEqual(result.status, STATUSES.FAIL, 'Should be FAIL');
      assert.strictEqual(result.ready, false, 'Should not be ready');
      assert.strictEqual(result.fail, true, 'Should have fail true');
    } else if (expected === 'READY') {
      assert.strictEqual(result.status, STATUSES.READY, 'Should be READY');
      assert.strictEqual(result.ready, true, 'Should be ready');
      assert.strictEqual(result.real_runtime_truth_probe_contract_ready, true, 'Should have real_runtime_truth_probe_contract_ready true');
      assert.strictEqual(result.runtime_authorization_phase_gate_ready, true, 'Should have runtime_authorization_phase_gate_ready true');
      assert.strictEqual(result.rta_final_gate, true, 'Should have rta_final_gate true');
      assert.strictEqual(result.chosen_path, 'RTP', 'Should have chosen_path RTP');
      assert.strictEqual(result.local_scope_only, true, 'Should have local_scope_only true');
      assert.strictEqual(result.supervised_execution_plan_ready, true, 'Should have supervised_execution_plan_ready true');
      assert.strictEqual(result.runtime_truth_probe_prepared, true, 'Should have runtime_truth_probe_prepared true');
      assert.strictEqual(result.runtime_execution_authorized, false, 'Should have runtime_execution_authorized false');
      assert.strictEqual(result.command_execution_allowed, false, 'Should have command_execution_allowed false');
      assert.strictEqual(result.endpoint_probe_allowed, false, 'Should have endpoint_probe_allowed false');
      assert.strictEqual(result.external_network_allowed, false, 'Should have external_network_allowed false');
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
      assert.strictEqual(result.final_message, 'RTP-0 real runtime truth probe contract prepared. Local supervised execution plan declared; PASS GOLD REAL not claimed.', 'Should have correct final message');
    }
    
    assert.strictEqual(validationResult, true, 'Validation should pass');
    console.log('✓ PASS');
  } catch (error) {
    console.log(`✗ FAIL: ${error.message}`);
    throw error;
  }
}

console.log('=== RTP-0 Real Runtime Truth Probe Contract Tests ===\n');

// Dependency false blocks
test_case('runtime_authorization_phase_gate_ready false blocks', {
  runtime_authorization_phase_gate_ready: false,
  rta_final_gate: true,
  chosen_path: 'RTP'
}, 'BLOCKED_INPUT');

test_case('rta_final_gate false blocks', {
  runtime_authorization_phase_gate_ready: true,
  rta_final_gate: false,
  chosen_path: 'RTP'
}, 'BLOCKED_DEPENDENCY');

// rta10_allowed true fails
test_case('rta10_allowed true fails', {
  runtime_authorization_phase_gate_ready: true,
  rta_final_gate: true,
  chosen_path: 'RTP',
  rta10_allowed: true
}, 'FAIL');

// chosen_path not RTP fails
test_case('chosen_path not RTP fails', {
  runtime_authorization_phase_gate_ready: true,
  rta_final_gate: true,
  chosen_path: 'RC'
}, 'FAIL');

// valid input ready
test_case('valid input ready', {
  runtime_authorization_phase_gate_ready: true,
  rta_final_gate: true,
  chosen_path: 'RTP'
}, 'READY');

// Test evidence hash deterministic
console.log('\nTesting evidence hash deterministic property...');
const input1 = {
  runtime_authorization_phase_gate_ready: true,
  rta_final_gate: true,
  chosen_path: 'RTP'
};
const result1 = build(input1);
const result2 = build(input1);
assert.strictEqual(result1.evidence_hash, result2.evidence_hash, 'Evidence hash should be deterministic for same input');
console.log('✓ PASS: Evidence hash is deterministic');

// Test missing controls fail
console.log('\nTesting missing controls...');
try {
  const result = build({
    runtime_authorization_phase_gate_ready: true,
    rta_final_gate: true,
    chosen_path: 'RTP'
  });
  
  // Modify result to remove required field
  delete result.real_runtime_truth_probe_contract_ready;
  const validationResult = validate(result);
  assert.strictEqual(validationResult, false, 'Validation should fail with missing field');
  console.log('✓ PASS: Missing controls fail validation');
} catch (error) {
  console.log('✗ FAIL: Missing controls test failed');
  throw error;
}

// Test invalid execution plan fails
console.log('\nTesting invalid execution plan...');
try {
  const result = build({
    runtime_authorization_phase_gate_ready: true,
    rta_final_gate: true,
    chosen_path: 'RTP'
  });
  
  // Modify result to have invalid execution plan
  result.supervised_execution_plan_ready = false;
  const validationResult = validate(result);
  assert.strictEqual(validationResult, false, 'Validation should fail with invalid execution plan');
  console.log('✓ PASS: Invalid execution plan fails validation');
} catch (error) {
  console.log('✗ FAIL: Invalid execution plan test failed');
  throw error;
}

// Test all dangerous flags false
console.log('\nTesting all dangerous flags are false...');
const safeResult = build({
  runtime_authorization_phase_gate_ready: true,
  rta_final_gate: true,
  chosen_path: 'RTP'
});

const dangerousFlags = [
  'runtime_execution_authorized',
  'command_execution_allowed', 
  'endpoint_probe_allowed',
  'external_network_allowed',
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
assert.strictEqual(safeResult.final_message, 'RTP-0 real runtime truth probe contract prepared. Local supervised execution plan declared; PASS GOLD REAL not claimed.', 'Final message should be exact');
console.log('✓ PASS: Final message is exact');

// Test render contains required elements
console.log('\nTesting render contains required elements...');
const module = await import('../../software-factory/software-factory-real-runtime-truth-probe-contract.mjs');
const rendered = module.render(safeResult);
assert(rendered.includes('RTP-0 Real Runtime Truth Probe Contract'), 'Render should contain RTP-0 title');
assert(rendered.includes('RTA-9 Final Phase Gate Status'), 'Render should contain RTA-9 status');
assert(rendered.includes('Path A (RTP) selection'), 'Render should contain Path A RTP selection');
assert(rendered.includes('Local Scope Only: true'), 'Render should contain local scope only');
assert(rendered.includes('V471 Allowed: FALSE'), 'Render should contain V471 blocked');
assert(rendered.includes('RTA-10 Allowed: FALSE'), 'Render should contain RTA-10 blocked');
assert(rendered.includes('REGRA ABSOLUTA'), 'Render should contain REGRA ABSOLUTA');
console.log('✓ PASS: Render contains all required elements');

console.log('\n=== All RTP-0 Tests Completed Successfully ===');