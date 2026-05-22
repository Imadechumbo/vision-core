#!/usr/bin/env node
/**
 * Real Repo Patch Human Approval Binding — V184.0
 * Binds a human approval decision to a verified replay receipt.
 * Does NOT deploy, promote, or release.
 */

import { createHash } from 'crypto';

export const REAL_REPO_PATCH_HUMAN_APPROVAL_STATUSES = [
  'HUMAN_APPROVAL_BLOCKED_INPUT',
  'HUMAN_APPROVAL_BLOCKED_REPLAY',
  'HUMAN_APPROVAL_REQUIRED',
  'HUMAN_APPROVAL_BOUND',
];

const SCHEMA_VERSION = 'v184.0';

function sha256(s) {
  return createHash('sha256').update(String(s)).digest('hex');
}

function blockedInput(reason) {
  return {
    schema_version: SCHEMA_VERSION,
    binding_id: null,
    replay_id: null,
    approval_decision: null,
    release_allowed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    binding_hash: null,
    status: 'HUMAN_APPROVAL_BLOCKED_INPUT',
    errors: [reason],
  };
}

export function buildRealRepoPatchHumanApprovalBinding(input) {
  if (!input || typeof input !== 'object') {
    return blockedInput('input is null or not an object');
  }

  const { binding_id, replay_id, replay_verified, approval_decision } = input;

  if (!binding_id || typeof binding_id !== 'string' || !binding_id.trim()) {
    return blockedInput('Missing or invalid binding_id');
  }
  if (!replay_id || typeof replay_id !== 'string' || !replay_id.trim()) {
    return blockedInput('Missing or invalid replay_id');
  }

  if (!replay_verified) {
    return {
      schema_version: SCHEMA_VERSION,
      binding_id,
      replay_id,
      approval_decision: null,
      release_allowed: false,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      binding_hash: null,
      status: 'HUMAN_APPROVAL_BLOCKED_REPLAY',
      errors: ['replay_verified must be true'],
    };
  }

  if (!approval_decision || typeof approval_decision !== 'string') {
    return {
      schema_version: SCHEMA_VERSION,
      binding_id,
      replay_id,
      approval_decision: null,
      release_allowed: false,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      binding_hash: null,
      status: 'HUMAN_APPROVAL_REQUIRED',
      errors: ['approval_decision is required (approved or rejected)'],
    };
  }

  const errors = [];

  if (!['approved', 'rejected'].includes(approval_decision)) {
    errors.push(`approval_decision must be "approved" or "rejected", got: ${approval_decision}`);
  }

  if (errors.length > 0) {
    return {
      schema_version: SCHEMA_VERSION,
      binding_id,
      replay_id,
      approval_decision,
      release_allowed: false,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      binding_hash: null,
      status: 'HUMAN_APPROVAL_BLOCKED_INPUT',
      errors,
    };
  }

  const binding_hash = sha256(`${binding_id}:${replay_id}:${approval_decision}`);

  return {
    schema_version: SCHEMA_VERSION,
    binding_id,
    replay_id,
    approval_decision,
    release_allowed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    binding_hash,
    status: 'HUMAN_APPROVAL_BOUND',
    errors: [],
  };
}

export function validateRealRepoPatchHumanApprovalBinding(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  if (result.release_allowed !== false) errors.push('release_allowed must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  if (result.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (result.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!REAL_REPO_PATCH_HUMAN_APPROVAL_STATUSES.includes(result.status)) {
    errors.push(`Invalid status: ${result.status}`);
  }
  if (result.status === 'HUMAN_APPROVAL_BOUND' && (!result.binding_hash || result.binding_hash.length !== 64)) {
    errors.push('HUMAN_APPROVAL_BOUND requires 64-char binding_hash');
  }
  return { valid: errors.length === 0, errors };
}

export function renderRealRepoPatchHumanApprovalBinding(result) {
  if (!result || typeof result !== 'object') return '[HumanApprovalBinding: null]';
  const lines = [
    `=== Real Repo Patch Human Approval Binding ${SCHEMA_VERSION} ===`,
    `Status              : ${result.status}`,
    `Binding ID          : ${result.binding_id ?? 'N/A'}`,
    `Replay ID           : ${result.replay_id ?? 'N/A'}`,
    `Approval Decision   : ${result.approval_decision ?? 'N/A'}`,
    `Release Allowed     : ${result.release_allowed}`,
    `Binding Hash        : ${result.binding_hash ?? 'N/A'}`,
    `Prod Touched        : ${result.production_touched}`,
  ];
  if (result.errors && result.errors.length) lines.push(`Errors              : ${result.errors.join('; ')}`);
  lines.push('--- REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable ---');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-repo-patch-human-approval-binding.mjs')) {
  const demo = buildRealRepoPatchHumanApprovalBinding({
    binding_id: 'binding-demo-001',
    replay_id: 'replay-demo-001',
    replay_verified: true,
    approval_decision: 'approved',
  });
  console.log(renderRealRepoPatchHumanApprovalBinding(demo));
  const v = validateRealRepoPatchHumanApprovalBinding(demo);
  console.log(`\nValidation: ${v.valid ? 'OK' : 'FAIL'}`);
}
