#!/usr/bin/env node
/**
 * Real Repo Patch Apply Controller — V172.0
 * Safe controller contract for applying a real permitted patch in the repo.
 * Does NOT perform the physical patch — requires human command confirmation.
 */

import { createHash } from 'crypto';

export const REAL_REPO_PATCH_APPLY_CONTROLLER_STATUSES = [
  'REPO_PATCH_APPLY_BLOCKED_INPUT',
  'REPO_PATCH_APPLY_BLOCKED_SCOPE',
  'REPO_PATCH_APPLY_BLOCKED_PRE_STATE',
  'REPO_PATCH_APPLY_READY',
  'REPO_PATCH_APPLY_REQUIRES_HUMAN_COMMAND'
];

export function buildRealRepoPatchApplyController(input) {
  const errors = [];

  const required = [
    'apply_controller_id',
    'scope_contract_id',
    'snapshot_id',
    'target_file',
    'patch_type',
    'patch_intent',
    'patch_content_hash'
  ];

  for (const field of required) {
    if (!input[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  const allowedFiles = [
    'docs/real-repo-patch-drill-target.md',
    'docs/real-repo-patch-scope-contract.md',
    'docs/real-repo-patch-pre-state-snapshot.md'
  ];

  if (input.target_file && !allowedFiles.includes(input.target_file)) {
    errors.push(`Forbidden target_file: ${input.target_file}. Must be one of: ${allowedFiles.join(', ')}`);
  }

  const validPatchTypes = ['CREATE_DOC', 'UPDATE_DOC', 'NOOP'];
  if (input.patch_type && !validPatchTypes.includes(input.patch_type)) {
    errors.push(`Invalid patch_type: ${input.patch_type}. Must be one of: ${validPatchTypes.join(', ')}`);
  }

  let status = 'REPO_PATCH_APPLY_BLOCKED_INPUT';
  if (errors.length === 0) {
    if (!input.scope_contract_ready) {
      status = 'REPO_PATCH_APPLY_BLOCKED_SCOPE';
    } else if (!input.pre_state_snapshot_ready) {
      status = 'REPO_PATCH_APPLY_BLOCKED_PRE_STATE';
    } else if (!input.human_command_confirmed) {
      status = 'REPO_PATCH_APPLY_REQUIRES_HUMAN_COMMAND';
    } else {
      status = 'REPO_PATCH_APPLY_READY';
    }
  }

  const record = {
    schema_version: 'v172.0',
    apply_controller_id: input.apply_controller_id,
    scope_contract_id: input.scope_contract_id,
    snapshot_id: input.snapshot_id,
    target_file: input.target_file,
    patch_type: input.patch_type,
    patch_intent: input.patch_intent,
    patch_content_hash: input.patch_content_hash,
    human_command_confirmed: input.human_command_confirmed || false,
    apply_ready: status === 'REPO_PATCH_APPLY_READY',
    command_executed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    status,
    errors,
    timestamp: new Date().toISOString(),
    _hash: createHash('sha256').update(JSON.stringify({
      apply_controller_id: input.apply_controller_id,
      target_file: input.target_file,
      patch_type: input.patch_type,
      timestamp: new Date().toISOString()
    })).digest('hex')
  };

  return record;
}

export function validateRealRepoPatchApplyController(controller) {
  const checks = {
    hasSchemaVersion: controller.schema_version === 'v172.0',
    hasValidId: !!controller.apply_controller_id,
    hasValidScopeId: !!controller.scope_contract_id,
    hasValidSnapshotId: !!controller.snapshot_id,
    targetFileAllowed: controller.target_file === 'docs/real-repo-patch-drill-target.md' ||
                       controller.target_file === 'docs/real-repo-patch-scope-contract.md',
    productionNotTouched: controller.production_touched === false,
    deployNotPerformed: controller.deploy_performed === false,
    stableNotPromoted: controller.stable_promoted === false,
    releaseNotPerformed: controller.release_performed === false,
    statusValid: REAL_REPO_PATCH_APPLY_CONTROLLER_STATUSES.includes(controller.status)
  };

  const valid = Object.values(checks).every(v => v === true);
  return { valid, checks };
}

export function renderRealRepoPatchApplyController(controller) {
  const lines = [
    `=== Real Repo Patch Apply Controller ===`,
    `ID: ${controller.apply_controller_id}`,
    `Scope Contract: ${controller.scope_contract_id}`,
    `Snapshot: ${controller.snapshot_id}`,
    `Target: ${controller.target_file}`,
    `Patch Type: ${controller.patch_type}`,
    `Intent: ${controller.patch_intent}`,
    `Status: ${controller.status}`,
    `Apply Ready: ${controller.apply_ready}`,
    `Human Confirmed: ${controller.human_command_confirmed}`,
    `--- Safety Flags ---`,
    `Production Touched: ${controller.production_touched}`,
    `Deploy Performed: ${controller.deploy_performed}`,
    `Stable Promoted: ${controller.stable_promoted}`,
    `Release Performed: ${controller.release_performed}`,
    `--- Hash ---`,
    `Content Hash: ${controller.patch_content_hash.substring(0, 16)}...`,
    `Record Hash: ${controller._hash.substring(0, 16)}...`,
    `Timestamp: ${controller.timestamp}`
  ];

  if (controller.errors.length > 0) {
    lines.push('--- Errors ---');
    controller.errors.forEach(e => lines.push(`  - ${e}`));
  }

  return lines.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const jsonFlag = args.includes('--json');

  const exampleInput = {
    apply_controller_id: `ctrl-${Date.now()}`,
    scope_contract_id: 'scope-1710-001',
    snapshot_id: 'snap-1711-001',
    target_file: 'docs/real-repo-patch-drill-target.md',
    patch_type: 'CREATE_DOC',
    patch_intent: 'Create drill target file for real repo patch testing',
    patch_content_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    scope_contract_ready: true,
    pre_state_snapshot_ready: true,
    human_command_confirmed: true
  };

  const record = buildRealRepoPatchApplyController(exampleInput);
  
  if (jsonFlag) {
    console.log(JSON.stringify(record, null, 2));
  } else {
    console.log(renderRealRepoPatchApplyController(record));
  }
}
