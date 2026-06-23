#!/usr/bin/env node
/**
 * Pre-Execution Snapshot Contract — V153.1
 *
 * Captures a pre-execution state snapshot: git HEAD SHA, baseline ID, and
 * snapshot timestamp. Required before any controlled execution may begin.
 *
 * Statuses:
 *   SNAPSHOT_BLOCKED_INPUT    — missing snapshot_id or other required inputs
 *   SNAPSHOT_BLOCKED_GIT_HEAD — git_head_sha missing or unverified
 *   SNAPSHOT_BLOCKED_BASELINE — baseline_id missing or baseline not ready
 *   SNAPSHOT_READY            — snapshot captured and verified
 *
 * REGRA ABSOLUTA: snapshot_required=true, execution_performed=false,
 * stable_promoted=false, deploy_performed=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v153.1';

export const SNAPSHOT_CONTRACT_STATUSES = [
  'SNAPSHOT_BLOCKED_INPUT',
  'SNAPSHOT_BLOCKED_GIT_HEAD',
  'SNAPSHOT_BLOCKED_BASELINE',
  'SNAPSHOT_READY',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    snapshot_required:   true,
    execution_performed: false,
    stable_promoted:     false,
    deploy_performed:    false,
    release_performed:   false,
  };
}

export function buildPreExecutionSnapshotContract(params) {
  const {
    snapshot_id,
    git_head_sha,
    git_head_verified          = false,
    baseline_id,
    baseline_ready             = false,
    snapshot_metadata          = null,
    captured_at,
  } = params || {};

  const snapshot_id_hash = _sha256([snapshot_id, git_head_sha, baseline_id].join('|'));
  const ts = captured_at ?? new Date().toISOString();

  if (!snapshot_id || String(snapshot_id).trim() === '') {
    return {
      snapshot_id_hash,
      schema_version:           SCHEMA_VERSION,
      snapshot_contract_status: 'SNAPSHOT_BLOCKED_INPUT',
      blocked_reason:           'snapshot_id is required.',
      snapshot_ready:           false,
      captured_at:              ts,
      ..._locked(),
    };
  }

  if (!git_head_sha || String(git_head_sha).trim() === '' || !git_head_verified) {
    return {
      snapshot_id_hash,
      schema_version:           SCHEMA_VERSION,
      snapshot_contract_status: 'SNAPSHOT_BLOCKED_GIT_HEAD',
      blocked_reason:           'git_head_sha and git_head_verified=true required.',
      snapshot_ready:           false,
      snapshot_id,
      git_head_verified,
      captured_at:              ts,
      ..._locked(),
    };
  }

  if (!baseline_id || String(baseline_id).trim() === '' || !baseline_ready) {
    return {
      snapshot_id_hash,
      schema_version:           SCHEMA_VERSION,
      snapshot_contract_status: 'SNAPSHOT_BLOCKED_BASELINE',
      blocked_reason:           'baseline_id and baseline_ready=true required.',
      snapshot_ready:           false,
      snapshot_id,
      git_head_sha,
      git_head_verified,
      baseline_ready,
      captured_at:              ts,
      ..._locked(),
    };
  }

  return {
    snapshot_id_hash,
    schema_version:            SCHEMA_VERSION,
    snapshot_contract_status:  'SNAPSHOT_READY',
    snapshot_ready:            true,
    snapshot_id,
    git_head_sha,
    git_head_verified,
    baseline_id,
    baseline_ready,
    snapshot_metadata:         snapshot_metadata ?? null,
    captured_at:               ts,
    ..._locked(),
  };
}

export function validatePreExecutionSnapshotContract(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'snapshot_id_hash', 'schema_version', 'snapshot_contract_status',
    'snapshot_ready',
    'snapshot_required', 'execution_performed',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.snapshot_required   !== true)  errors.push('snapshot_required must be true');
  if (result.execution_performed !== false) errors.push('execution_performed must be false');
  if (result.stable_promoted     !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed    !== false) errors.push('deploy_performed must be false');
  if (result.release_performed   !== false) errors.push('release_performed must be false');
  if (!SNAPSHOT_CONTRACT_STATUSES.includes(result.snapshot_contract_status)) {
    errors.push(`invalid snapshot_contract_status: ${result.snapshot_contract_status}`);
  }
  if (result.snapshot_contract_status === 'SNAPSHOT_READY') {
    if (result.snapshot_ready !== true) errors.push('READY requires snapshot_ready=true');
    if (!result.git_head_verified) errors.push('READY requires git_head_verified=true');
    if (!result.baseline_ready) errors.push('READY requires baseline_ready=true');
  }
  return { valid: errors.length === 0, errors };
}

export function renderPreExecutionSnapshotContract(result) {
  if (!result || typeof result !== 'object') {
    return '[PRE_EXECUTION_SNAPSHOT_CONTRACT] No result to render.';
  }
  const lines = [
    `=== Pre-Execution Snapshot Contract [${SCHEMA_VERSION}] ===`,
    `Status:                    ${result.snapshot_contract_status ?? 'N/A'}`,
    `Snapshot ID:               ${result.snapshot_id ?? 'N/A'}`,
    `Snapshot ready:            ${result.snapshot_ready}`,
    `--- Git state ---`,
    `git_head_sha:              ${result.git_head_sha ?? 'N/A'}`,
    `git_head_verified:         ${result.git_head_verified}`,
    `--- Baseline ---`,
    `baseline_id:               ${result.baseline_id ?? 'N/A'}`,
    `baseline_ready:            ${result.baseline_ready}`,
    `--- REGRA ABSOLUTA ---`,
    `snapshot_required=true | execution_performed=false | stable_promoted=false`,
  ];
  if (result.blocked_reason) lines.splice(2, 0, `Blocked reason:            ${result.blocked_reason}`);
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('pre-execution-snapshot-contract.mjs')) {
  const showJson = process.argv.includes('--json');
  const result = buildPreExecutionSnapshotContract({
    snapshot_id:       'v153.1-snapshot',
    git_head_sha:      'abc123def456' + '0'.repeat(28),
    git_head_verified: true,
    baseline_id:       'v150.0-anti-hallucination',
    baseline_ready:    true,
  });
  if (showJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderPreExecutionSnapshotContract(result));
  }
  const v = validatePreExecutionSnapshotContract(result);
  if (!v.valid) {
    process.stderr.write(`Validation failed: ${v.errors.join(', ')}\n`);
    process.exit(1);
  }
}
