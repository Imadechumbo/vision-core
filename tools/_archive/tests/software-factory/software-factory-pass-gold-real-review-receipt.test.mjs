import assert from 'node:assert';
import { build, validate, STATUSES } from '../../software-factory/software-factory-pass-gold-real-review-receipt.mjs';

async function test_case(description, input, expected) {
  console.log(`Testing: ${description}`);
  try {
    const result = build(input);
    const validationResult = validate(result);
    
    if (expected === 'BLOCKED_INPUT') {
      assert.strictEqual(result.status, STATUSES.BLOCKED_INPUT, 'Should be BLOCKED_INPUT');
      assert.strictEqual(result.ready, false, 'Should not be ready');
      assert.strictEqual(result.blocked_input, true, 'Should have blocked_input true');
    } else if (expected === 'BLOCKED_RTP1') {
      assert.strictEqual(result.status, STATUSES.BLOCKED_RTP1, 'Should be BLOCKED_RTP1');
      assert.strictEqual(result.ready, false, 'Should not be ready');
      assert.strictEqual(result.blocked_rtp1, true, 'Should have blocked_rtp1 true');
    } else if (expected === 'FAIL') {
      assert.strictEqual(result.status, STATUSES.FAIL, 'Should be FAIL');
      assert.strictEqual(result.ready, false, 'Should not be ready');
      assert.strictEqual(result.fail, true, 'Should have fail true');
    } else if (expected === 'READY') {
      assert.strictEqual(result.status, STATUSES.READY, 'Should be READY');
      assert.strictEqual(result.ready, true, 'Should be ready');
      assert.strictEqual(result.pass_gold_real_review_receipt_ready, true, 'Should have pass_gold_real_review_receipt_ready true');
      assert.strictEqual(result.smoke_flow_rollback_readiness_evidence_ready, true, 'Should have smoke_flow_rollback_readiness_evidence_ready true');
      assert.strictEqual(result.runtime_truth_probe_result_bound, true, 'Should have runtime_truth_probe_result_bound true');
      assert.strictEqual(result.smoke_flow_result_bound, true, 'Should have smoke_flow_result_bound true');
      assert.strictEqual(result.rollback_readiness_result_bound, true, 'Should have rollback_readiness_result_bound true');
      assert.strictEqual(result.human_authority_bound, true, 'Should have human_authority_bound true');
      assert.strictEqual(result.pass_gold_real_review_ready, true, 'Should have pass_gold_real_review_ready true');
      assert.strictEqual(result.pass_gold_real_achieved, false, 'Should have pass_gold_real_achieved false');
      assert.strictEqual(result.stable_promotion_allowed, false, 'Should have stable_promotion_allowed false');
      assert.strictEqual(result.release_allowed, false, 'Should have release_allowed false');
      assert.strictEqual(result.deploy_allowed, false, 'Should have deploy_allowed false');
      assert.strictEqual(result.tag_allowed, false, 'Should have tag_allowed false');
      assert.strictEqual(result.production_touched, false, 'Should have production_touched false');
      assert.strictEqual(result.billing_execution_allowed, false, 'Should have billing_execution_allowed false');
      assert.strictEqual(result.secret_access_allowed, false, 'Should have secret_access_allowed false');
      assert.strictEqual(result.network_allowed, false, 'Should have network_allowed false');
      assert.strictEqual(result.rollback_execution_allowed, false, 'Should have rollback_execution_allowed false');
      assert.strictEqual(result.v471_allowed, false, 'Should have v471_allowed false');
      assert.strictEqual(result.rta10_allowed, false, 'Should have rta10_allowed false');
      assert.strictEqual(result.evidence_hash.length, 64, 'Should have 64 character evidence hash');
      assert.strictEqual(result.final_message, 'RTP-2 PASS GOLD REAL review receipt prepared. Evidence is review-ready, but PASS GOLD REAL is not claimed and stable promotion remains blocked.', 'Should have correct final message');
    }
    
    assert.strictEqual(validationResult, true, 'Validation should pass');
    console.log('✓ PASS');
  } catch (error) {
    console.log(`✗ FAIL: ${error.message}`);
    throw error;
  }
}

console.log('=== RTP-2 PASS GOLD REAL Review Receipt Tests ===\n');

(async () => {

// Dependency false blocks
await test_case('smoke_flow_rollback_readiness_evidence_ready false blocks', {
  smoke_flow_rollback_readiness_evidence_ready: false,
  runtime_truth_probe_result_bound: true,
  smoke_flow_result_bound: true,
  rollback_readiness_result_bound: true,
  human_authority_bound: true
}, 'BLOCKED_INPUT');

await test_case('runtime_truth_probe_result_bound blocks', {
  smoke_flow_rollback_readiness_evidence_ready: true,
  runtime_truth_probe_result_bound: false,
  smoke_flow_result_bound: true,
  rollback_readiness_result_bound: true,
  human_authority_bound: true
}, 'BLOCKED_RTP1');

// missing results fail
await test_case('missing smoke flow result fails', {
  smoke_flow_rollback_readiness_evidence_ready: true,
  runtime_truth_probe_result_bound: true,
  smoke_flow_result_bound: false,
  rollback_readiness_result_bound: true,
  human_authority_bound: true
}, 'FAIL');

await test_case('missing rollback readiness result fails', {
  smoke_flow_rollback_readiness_evidence_ready: true,
  runtime_truth_probe_result_bound: true,
  smoke_flow_result_bound: true,
  rollback_readiness_result_bound: false,
  human_authority_bound: true
}, 'FAIL');

// missing human authority fails
await test_case('missing human authority fails', {
  smoke_flow_rollback_readiness_evidence_ready: true,
  runtime_truth_probe_result_bound: true,
  smoke_flow_result_bound: true,
  rollback_readiness_result_bound: true,
  human_authority_bound: false
}, 'FAIL');

// pass_gold_real_achieved true fails
await test_case('pass_gold_real_achieved true fails', {
  smoke_flow_rollback_readiness_evidence_ready: true,
  runtime_truth_probe_result_bound: true,
  smoke_flow_result_bound: true,
  rollback_readiness_result_bound: true,
  human_authority_bound: true,
  pass_gold_real_achieved: true
}, 'FAIL');

// stable_promotion_allowed true fails
await test_case('stable_promotion_allowed true fails', {
  smoke_flow_rollback_readiness_evidence_ready: true,
  runtime_truth_probe_result_bound: true,
  smoke_flow_result_bound: true,
  rollback_readiness_result_bound: true,
  human_authority_bound: true,
  stable_promotion_allowed: true
}, 'FAIL');

// release/deploy/tag true fails
await test_case('release allowed fails', {
  smoke_flow_rollback_readiness_evidence_ready: true,
  runtime_truth_probe_result_bound: true,
  smoke_flow_result_bound: true,
  rollback_readiness_result_bound: true,
  human_authority_bound: true,
  release_allowed: true
}, 'FAIL');

await test_case('deploy allowed fails', {
  smoke_flow_rollback_readiness_evidence_ready: true,
  runtime_truth_probe_result_bound: true,
  smoke_flow_result_bound: true,
  rollback_readiness_result_bound: true,
  human_authority_bound: true,
  deploy_allowed: true
}, 'FAIL');

await test_case('tag allowed fails', {
  smoke_flow_rollback_readiness_evidence_ready: true,
  runtime_truth_probe_result_bound: true,
  smoke_flow_result_bound: true,
  rollback_readiness_result_bound: true,
  human_authority_bound: true,
  tag_allowed: true
}, 'FAIL');

// production touched fails
await test_case('production touched fails', {
  smoke_flow_rollback_readiness_evidence_ready: true,
  runtime_truth_probe_result_bound: true,
  smoke_flow_result_bound: true,
  rollback_readiness_result_bound: true,
  human_authority_bound: true,
  production_touched: true
}, 'FAIL');

// access controls fail at review stage
await test_case('billing execution allowed fails', {
  smoke_flow_rollback_readiness_evidence_ready: true,
  runtime_truth_probe_result_bound: true,
  smoke_flow_result_bound: true,
  rollback_readiness_result_bound: true,
  human_authority_bound: true,
  billing_execution_allowed: true
}, 'FAIL');

await test_case('secret access allowed fails', {
  smoke_flow_rollback_readiness_evidence_ready: true,
  runtime_truth_probe_result_bound: true,
  smoke_flow_result_bound: true,
  rollback_readiness_result_bound: true,
  human_authority_bound: true,
  secret_access_allowed: true
}, 'FAIL');

await test_case('network access allowed fails', {
  smoke_flow_rollback_readiness_evidence_ready: true,
  runtime_truth_probe_result_bound: true,
  smoke_flow_result_bound: true,
  rollback_readiness_result_bound: true,
  human_authority_bound: true,
  network_allowed: true
}, 'FAIL');

await test_case('rollback execution allowed fails', {
  smoke_flow_rollback_readiness_evidence_ready: true,
  runtime_truth_probe_result_bound: true,
  smoke_flow_result_bound: true,
  rollback_readiness_result_bound: true,
  human_authority_bound: true,
  rollback_execution_allowed: true
}, 'FAIL');

// valid input ready
await test_case('valid input ready', {
  smoke_flow_rollback_readiness_evidence_ready: true,
  runtime_truth_probe_result_bound: true,
  smoke_flow_result_bound: true,
  rollback_readiness_result_bound: true,
  human_authority_bound: true
}, 'READY');

// Test evidence hash deterministic
console.log('\nTesting evidence hash deterministic property...');
const input1 = {
  smoke_flow_rollback_readiness_evidence_ready: true,
  runtime_truth_probe_result_bound: true,
  smoke_flow_result_bound: true,
  rollback_readiness_result_bound: true,
  human_authority_bound: true
};
const result1 = build(input1);
const result2 = build(input1);
assert.strictEqual(result1.evidence_hash, result2.evidence_hash, 'Evidence hash should be deterministic for same input');
console.log('✓ PASS: Evidence hash is deterministic');

// Test missing controls fail
console.log('\nTesting missing controls...');
try {
  const result = build({
    smoke_flow_rollback_readiness_evidence_ready: true,
    runtime_truth_probe_result_bound: true,
    smoke_flow_result_bound: true,
    rollback_readiness_result_bound: true,
    human_authority_bound: true
  });
  
  // Modify result to remove required field
  delete result.pass_gold_real_review_receipt_ready;
  const validationResult = validate(result);
  assert.strictEqual(validationResult, false, 'Validation should fail with missing field');
  console.log('✓ PASS: Missing controls fail validation');
} catch (error) {
  console.log('✗ FAIL: Missing controls test failed');
  throw error;
}

// Test pass_gold_real_review_ready true
console.log('\nTesting pass_gold_real_review_ready true...');
const safeResult = build({
  smoke_flow_rollback_readiness_evidence_ready: true,
  runtime_truth_probe_result_bound: true,
  smoke_flow_result_bound: true,
  rollback_readiness_result_bound: true,
  human_authority_bound: true
});
assert.strictEqual(safeResult.pass_gold_real_review_ready, true, 'pass_gold_real_review_ready should be true');
console.log('✓ PASS: pass_gold_real_review_ready is true');

// Test pass_gold_real_achieved false
console.log('\nTesting pass_gold_real_achieved false...');
assert.strictEqual(safeResult.pass_gold_real_achieved, false, 'pass_gold_real_achieved should be false');
console.log('✓ PASS: pass_gold_real_achieved is false');

// Test stable_promotion_allowed false
console.log('\nTesting stable_promotion_allowed false...');
assert.strictEqual(safeResult.stable_promotion_allowed, false, 'stable_promotion_allowed should be false');
console.log('✓ PASS: stable_promotion_allowed is false');

// Test all dangerous flags false
console.log('\nTesting all dangerous flags are false...');
const dangerousFlags = [
  'stable_promotion_allowed',
  'release_allowed',
  'deploy_allowed',
  'tag_allowed',
  'production_touched',
  'billing_execution_allowed',
  'secret_access_allowed',
  'network_allowed',
  'rollback_execution_allowed',
  'v471_allowed',
  'rta10_allowed'
];

for (const flag of dangerousFlags) {
  assert.strictEqual(safeResult[flag], false, `${flag} should be false`);
}
console.log('✓ PASS: All dangerous flags are false');

// Test final_message exact
console.log('\nTesting final message exact...');
assert.strictEqual(safeResult.final_message, 'RTP-2 PASS GOLD REAL review receipt prepared. Evidence is review-ready, but PASS GOLD REAL is not claimed and stable promotion remains blocked.', 'Final message should be exact');
console.log('✓ PASS: Final message is exact');

// Test render contains required elements
console.log('\nTesting render contains required elements...');
const module = await import('../../software-factory/software-factory-pass-gold-real-review-receipt.mjs');
const rendered = module.render(safeResult);
assert(rendered.includes('RTP-2 PASS GOLD REAL Review Receipt'), 'Render should contain RTP-2 title');
assert(rendered.includes('RTP-1 Evidence Dependency'), 'Render should contain RTP-1 dependency');
assert(rendered.includes('PASS GOLD REAL Review Status:'), 'Render should contain review status');
assert(rendered.includes('Evidence is review-ready'), 'Render should contain review-ready');
assert(rendered.includes('PASS GOLD REAL is not claimed'), 'Render should contain not claimed');
assert(rendered.includes('Stable Promotion: BLOCKED'), 'Render should contain stable promotion blocked');
assert(rendered.includes('V471 Allowed: FALSE'), 'Render should contain V471 blocked');
assert(rendered.includes('RTA-10 Allowed: FALSE'), 'Render should contain RTA-10 blocked');
assert(rendered.includes('REGRA ABSOLUTA'), 'Render should contain REGRA ABSOLUTA');
console.log('✓ PASS: Render contains all required elements');

console.log('\n=== All RTP-2 Tests Completed Successfully ===');
})();