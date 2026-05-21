#!/usr/bin/env node
/**
 * Local Execution Post-State Verifier — V164.0
 * Verifies post-execution local state: hashes, touched files, invariants. No production.
 */

import { createHash } from 'crypto';

export const LOCAL_EXECUTION_POST_STATE_STATUSES = [
  'LOCAL_POST_STATE_BLOCKED_INPUT',
  'LOCAL_POST_STATE_BLOCKED_RECEIPT',
  'LOCAL_POST_STATE_BLOCKED_FORBIDDEN_FILE',
  'LOCAL_POST_STATE_BLOCKED_PRODUCTION',
  'LOCAL_POST_STATE_VERIFIED',
  'LOCAL_POST_STATE_MISMATCH',
];

const FORBIDDEN_FILES = [
  '.env',
  'production.json',
  'prod.json',
  'deploy.sh',
  'release.sh',
  '.npmrc',
];

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function blocked(status, extra = {}) {
  return {
    schema_version: 'v164.0',
    post_state_status: status,
    post_state_id: null,
    receipt_id: null,
    ledger_id: null,
    expected_after_hash: null,
    actual_after_hash: null,
    changed_files: [],
    forbidden_files_detected: [],
    local_only: true,
    production_touched: false,
    post_state_verified: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    ...extra,
  };
}

export function buildLocalExecutionPostStateVerifier(input) {
  if (!input || typeof input !== 'object') {
    return blocked('LOCAL_POST_STATE_BLOCKED_INPUT');
  }

  const {
    post_state_id,
    receipt_id,
    ledger_id,
    expected_after_hash,
    actual_after_hash,
    changed_files = [],
    forbidden_files = [],
    local_only,
    production_touched,
  } = input;

  if (!post_state_id || typeof post_state_id !== 'string' || !post_state_id.trim()) {
    return blocked('LOCAL_POST_STATE_BLOCKED_INPUT');
  }

  if (!receipt_id || typeof receipt_id !== 'string' || !receipt_id.trim()) {
    return blocked('LOCAL_POST_STATE_BLOCKED_RECEIPT', {
      blocked_reason: 'receipt_id required',
    });
  }

  if (!expected_after_hash || !actual_after_hash) {
    return blocked('LOCAL_POST_STATE_BLOCKED_INPUT', {
      blocked_reason: 'expected_after_hash and actual_after_hash required',
    });
  }

  if (local_only === false) {
    return blocked('LOCAL_POST_STATE_BLOCKED_PRODUCTION', {
      blocked_reason: 'local_only must be true',
    });
  }

  if (production_touched === true) {
    return blocked('LOCAL_POST_STATE_BLOCKED_PRODUCTION', {
      blocked_reason: 'production_touched must be false',
    });
  }

  const allForbidden = [...FORBIDDEN_FILES, ...(forbidden_files || [])];
  const detected = (changed_files || []).filter((f) =>
    allForbidden.some((fb) => String(f).includes(fb))
  );

  if (detected.length > 0) {
    return blocked('LOCAL_POST_STATE_BLOCKED_FORBIDDEN_FILE', {
      blocked_reason: `forbidden files detected: ${detected.join(', ')}`,
      forbidden_files_detected: detected,
      post_state_id,
      receipt_id,
      ledger_id: ledger_id || null,
    });
  }

  const base = {
    schema_version: 'v164.0',
    post_state_id,
    receipt_id,
    ledger_id: ledger_id || null,
    expected_after_hash,
    actual_after_hash,
    changed_files: changed_files || [],
    forbidden_files_detected: [],
    local_only: true,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
  };

  if (expected_after_hash === actual_after_hash) {
    return {
      ...base,
      post_state_status: 'LOCAL_POST_STATE_VERIFIED',
      post_state_verified: true,
    };
  }

  return {
    ...base,
    post_state_status: 'LOCAL_POST_STATE_MISMATCH',
    post_state_verified: false,
    blocked_reason: `hash mismatch: expected=${expected_after_hash}, actual=${actual_after_hash}`,
  };
}

export function validateLocalExecutionPostStateVerifier(verifier) {
  if (!verifier || typeof verifier !== 'object') {
    return { valid: false, errors: ['null or non-object input'] };
  }

  const errors = [];

  if (verifier.production_touched !== false) errors.push('production_touched must be false');
  if (verifier.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (verifier.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (verifier.release_performed !== false) errors.push('release_performed must be false');
  if (verifier.local_only !== true) errors.push('local_only must be true');

  if (verifier.post_state_status === 'LOCAL_POST_STATE_VERIFIED') {
    if (!verifier.post_state_id) errors.push('post_state_id required for VERIFIED');
    if (!verifier.receipt_id) errors.push('receipt_id required for VERIFIED');
    if (!verifier.post_state_verified) errors.push('post_state_verified must be true for VERIFIED');
    if (!verifier.expected_after_hash) errors.push('expected_after_hash required for VERIFIED');
    if (!verifier.actual_after_hash) errors.push('actual_after_hash required for VERIFIED');
  }

  return { valid: errors.length === 0, errors };
}

export function renderLocalExecutionPostStateVerifier(verifier) {
  if (!verifier || typeof verifier !== 'object') {
    return '[LOCAL_EXECUTION_POST_STATE_VERIFIER] No verifier data';
  }

  const lines = [
    `[LOCAL_EXECUTION_POST_STATE_VERIFIER] ${verifier.post_state_status || 'UNKNOWN'}`,
    `  schema_version          : ${verifier.schema_version || 'n/a'}`,
    `  post_state_id           : ${verifier.post_state_id || 'null'}`,
    `  receipt_id              : ${verifier.receipt_id || 'null'}`,
    `  ledger_id               : ${verifier.ledger_id || 'null'}`,
    `  expected_after_hash     : ${verifier.expected_after_hash || 'null'}`,
    `  actual_after_hash       : ${verifier.actual_after_hash || 'null'}`,
    `  changed_files_count     : ${(verifier.changed_files || []).length}`,
    `  forbidden_files_detected: ${(verifier.forbidden_files_detected || []).length}`,
    `  post_state_verified     : ${verifier.post_state_verified}`,
    `  local_only              : ${verifier.local_only}`,
    `  production_touched      : ${verifier.production_touched}`,
    `  deploy_performed        : ${verifier.deploy_performed}`,
    `  stable_promoted         : ${verifier.stable_promoted}`,
    `  release_performed       : ${verifier.release_performed}`,
  ];

  if (verifier.blocked_reason) {
    lines.push(`  blocked_reason          : ${verifier.blocked_reason}`);
  }

  lines.push('  REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.');

  return lines.join('\n');
}

// CLI self-run
if (process.argv[1] && process.argv[1].endsWith('local-execution-post-state-verifier.mjs')) {
  const useJson = process.argv.includes('--json');
  const sample = buildLocalExecutionPostStateVerifier({
    post_state_id: 'post-state-001',
    receipt_id: 'receipt-v1621-001',
    ledger_id: 'ledger-v163-001',
    expected_after_hash: 'after-hash-001',
    actual_after_hash: 'after-hash-001',
    changed_files: ['tools/sandbox-module.mjs'],
    local_only: true,
    production_touched: false,
  });
  if (useJson) {
    console.log(JSON.stringify(sample, null, 2));
  } else {
    console.log(renderLocalExecutionPostStateVerifier(sample));
  }
}
