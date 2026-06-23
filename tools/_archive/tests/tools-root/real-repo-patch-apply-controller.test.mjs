#!/usr/bin/env node

import {
  buildRealRepoPatchApplyController,
  validateRealRepoPatchApplyController,
  REAL_REPO_PATCH_APPLY_CONTROLLER_STATUSES
} from '../real-repo-patch-apply-controller.mjs';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

console.log('=== real-repo-patch-apply-controller tests ===\n');

// Test 1: Valid controller with human confirmation
const validInput = {
  apply_controller_id: 'ctrl-test-001',
  scope_contract_id: 'scope-001',
  snapshot_id: 'snap-001',
  target_file: 'docs/real-repo-patch-drill-target.md',
  patch_type: 'CREATE_DOC',
  patch_intent: 'Create test file',
  patch_content_hash: 'abc123',
  scope_contract_ready: true,
  pre_state_snapshot_ready: true,
  human_command_confirmed: true
};

const valid = buildRealRepoPatchApplyController(validInput);
assert(valid.status === 'REPO_PATCH_APPLY_READY', 'Status READY when all conditions met');
assert(valid.apply_ready === true, 'Apply ready true');
assert(valid.production_touched === false, 'Production not touched');
assert(valid.schema_version === 'v172.0', 'Correct schema version');

// Test 2: Missing human confirmation
const noHumanInput = {
  ...validInput,
  apply_controller_id: 'ctrl-test-002',
  human_command_confirmed: false
};

const noHuman = buildRealRepoPatchApplyController(noHumanInput);
assert(noHuman.status === 'REPO_PATCH_APPLY_REQUIRES_HUMAN_COMMAND', 'Status REQUIRES_HUMAN_COMMAND');
assert(noHuman.apply_ready === false, 'Apply ready false');

// Test 3: Missing scope ready
const noScopeInput = {
  ...validInput,
  apply_controller_id: 'ctrl-test-003',
  scope_contract_ready: false
};

const noScope = buildRealRepoPatchApplyController(noScopeInput);
assert(noScope.status === 'REPO_PATCH_APPLY_BLOCKED_SCOPE', 'Status BLOCKED_SCOPE');

// Test 4: Missing pre-state ready
const noPreStateInput = {
  ...validInput,
  apply_controller_id: 'ctrl-test-004',
  pre_state_snapshot_ready: false
};

const noPreState = buildRealRepoPatchApplyController(noPreStateInput);
assert(noPreState.status === 'REPO_PATCH_APPLY_BLOCKED_PRE_STATE', 'Status BLOCKED_PRE_STATE');

// Test 5: Invalid target file
const invalidTargetInput = {
  ...validInput,
  apply_controller_id: 'ctrl-test-005',
  target_file: 'src/production.js'
};

const invalidTarget = buildRealRepoPatchApplyController(invalidTargetInput);
assert(invalidTarget.errors.length > 0, 'Errors array not empty');
assert(invalidTarget.status === 'REPO_PATCH_APPLY_BLOCKED_INPUT', 'Status BLOCKED_INPUT');

// Test 6: Missing required fields
const missingFields = buildRealRepoPatchApplyController({
  apply_controller_id: 'ctrl-test-006'
});
assert(missingFields.errors.length >= 3, 'Multiple errors for missing fields');

// Test 7: Validation function
const validation = validateRealRepoPatchApplyController(valid);
assert(validation.valid === true, 'Valid controller passes validation');

// Test 8: NOOP patch type
const noopPatch = buildRealRepoPatchApplyController({
  ...validInput,
  apply_controller_id: 'ctrl-test-007',
  patch_type: 'NOOP',
  human_command_confirmed: true
});
assert(noopPatch.status === 'REPO_PATCH_APPLY_READY', 'NOOP patch accepted');

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
