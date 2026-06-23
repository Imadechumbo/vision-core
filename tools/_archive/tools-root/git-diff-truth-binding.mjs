#!/usr/bin/env node
/**
 * Git Diff Truth Binding — V147.0
 *
 * Binds agent claims to the actual git diff.
 * Rejects claims where diff is empty, scope is violated,
 * or forbidden files are touched.
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v147.0';

export const DIFF_TRUTH_STATUSES = [
  'DIFF_TRUTH_BLOCKED_EMPTY_DIFF',
  'DIFF_TRUTH_BLOCKED_SCOPE',
  'DIFF_TRUTH_BLOCKED_FORBIDDEN_FILE',
  'DIFF_TRUTH_MISMATCH',
  'DIFF_TRUTH_BOUND',
];

const DEFAULT_FORBIDDEN_FILES = [
  'deploy.sh', '.env', '.env.local', '.env.production',
  'secrets.json', 'credentials.json',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    stable_promoted:   false,
    deploy_performed:  false,
    release_performed: false,
  };
}

export function bindGitDiffTruth(params) {
  const {
    binding_id,
    claimed_changed_files     = [],
    actual_name_status        = [],
    actual_diff_stat          = null,
    expected_scope            = null,
    allowed_files             = [],
    forbidden_files           = [],
    branch_name               = null,
    base_ref                  = null,
    head_ref                  = null,
    bound_at,
  } = params || {};

  const bindingKey = [
    binding_id, branch_name, base_ref, head_ref,
    JSON.stringify(claimed_changed_files),
    JSON.stringify(actual_name_status),
  ].join('|');
  const truth_binding_id = _sha256(bindingKey);

  if (!binding_id || String(binding_id).trim() === '') {
    return {
      truth_binding_id,
      schema_version:        SCHEMA_VERSION,
      truth_binding_status:  'DIFF_TRUTH_BLOCKED_EMPTY_DIFF',
      diff_matches_claim:    false,
      scope_valid:           false,
      forbidden_file_touched: false,
      missing_claimed_files: [],
      unexpected_changed_files: [],
      blocked_reason:        'binding_id is required.',
      ..._locked(),
    };
  }

  const actualFiles = Array.isArray(actual_name_status) ? actual_name_status : [];
  const hasDiff = actualFiles.length > 0 || (actual_diff_stat && actual_diff_stat !== 'empty' && actual_diff_stat !== '');

  if (!hasDiff) {
    return {
      truth_binding_id,
      schema_version:          SCHEMA_VERSION,
      truth_binding_status:    'DIFF_TRUTH_BLOCKED_EMPTY_DIFF',
      diff_matches_claim:      false,
      scope_valid:             false,
      forbidden_file_touched:  false,
      missing_claimed_files:   Array.isArray(claimed_changed_files) ? claimed_changed_files : [],
      unexpected_changed_files: [],
      binding_id,
      branch_name,
      blocked_reason:          'Diff is empty. No real changes detected.',
      ..._locked(),
    };
  }

  const allForbidden = [
    ...DEFAULT_FORBIDDEN_FILES,
    ...(Array.isArray(forbidden_files) ? forbidden_files : []),
  ];
  const touchedForbidden = actualFiles.filter(f => allForbidden.some(fb => f.endsWith(fb) || f === fb));

  if (touchedForbidden.length > 0) {
    return {
      truth_binding_id,
      schema_version:           SCHEMA_VERSION,
      truth_binding_status:     'DIFF_TRUTH_BLOCKED_FORBIDDEN_FILE',
      diff_matches_claim:       false,
      scope_valid:              false,
      forbidden_file_touched:   true,
      touched_forbidden_files:  touchedForbidden,
      missing_claimed_files:    [],
      unexpected_changed_files: [],
      binding_id,
      branch_name,
      blocked_reason:           `Forbidden files touched: ${touchedForbidden.join(', ')}`,
      bound_at:                 bound_at ?? new Date().toISOString(),
      ..._locked(),
    };
  }

  const claimedFiles = Array.isArray(claimed_changed_files) ? claimed_changed_files : [];
  const missing_claimed_files = claimedFiles.filter(f => !actualFiles.includes(f));

  if (missing_claimed_files.length > 0) {
    return {
      truth_binding_id,
      schema_version:           SCHEMA_VERSION,
      truth_binding_status:     'DIFF_TRUTH_MISMATCH',
      diff_matches_claim:       false,
      scope_valid:              true,
      forbidden_file_touched:   false,
      missing_claimed_files,
      unexpected_changed_files: [],
      binding_id,
      branch_name,
      blocked_reason:           `Claimed files not in diff: ${missing_claimed_files.join(', ')}`,
      bound_at:                 bound_at ?? new Date().toISOString(),
      ..._locked(),
    };
  }

  const allowedList = Array.isArray(allowed_files) ? allowed_files : [];
  let scope_valid = true;
  let unexpected_changed_files = [];

  if (expected_scope && allowedList.length > 0) {
    unexpected_changed_files = actualFiles.filter(f => !allowedList.includes(f));
    if (unexpected_changed_files.length > 0) {
      scope_valid = false;
      return {
        truth_binding_id,
        schema_version:           SCHEMA_VERSION,
        truth_binding_status:     'DIFF_TRUTH_BLOCKED_SCOPE',
        diff_matches_claim:       false,
        scope_valid:              false,
        forbidden_file_touched:   false,
        missing_claimed_files:    [],
        unexpected_changed_files,
        binding_id,
        branch_name,
        base_ref,
        head_ref,
        blocked_reason:           `Scope violation: unexpected files changed: ${unexpected_changed_files.join(', ')}`,
        bound_at:                 bound_at ?? new Date().toISOString(),
        ..._locked(),
      };
    }
  }

  return {
    truth_binding_id,
    schema_version:           SCHEMA_VERSION,
    truth_binding_status:     'DIFF_TRUTH_BOUND',
    diff_matches_claim:       true,
    scope_valid,
    forbidden_file_touched:   false,
    missing_claimed_files:    [],
    unexpected_changed_files,
    binding_id,
    branch_name,
    base_ref,
    head_ref,
    actual_file_count:        actualFiles.length,
    claimed_file_count:       claimedFiles.length,
    verified_changed_files:   claimedFiles,
    bound_at:                 bound_at ?? new Date().toISOString(),
    ..._locked(),
  };
}

export function validateGitDiffTruthBinding(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'truth_binding_id', 'schema_version', 'truth_binding_status',
    'diff_matches_claim', 'scope_valid', 'forbidden_file_touched',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.stable_promoted   !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed  !== false) errors.push('deploy_performed must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!DIFF_TRUTH_STATUSES.includes(result.truth_binding_status)) {
    errors.push(`invalid truth_binding_status: ${result.truth_binding_status}`);
  }
  return { valid: errors.length === 0, errors };
}

export function renderGitDiffTruthBinding(result) {
  if (!result || typeof result !== 'object') {
    return '[GIT_DIFF_TRUTH_BINDING] No result to render.';
  }
  const lines = [
    `=== Git Diff Truth Binding [${SCHEMA_VERSION}] ===`,
    `Status:                   ${result.truth_binding_status ?? 'N/A'}`,
    `Binding ID:               ${result.binding_id ?? 'N/A'}`,
    `Branch:                   ${result.branch_name ?? 'N/A'}`,
    `Diff matches claim:       ${result.diff_matches_claim}`,
    `Scope valid:              ${result.scope_valid}`,
    `Forbidden file touched:   ${result.forbidden_file_touched}`,
    `Missing claimed files:    ${(result.missing_claimed_files ?? []).join(', ') || 'none'}`,
    `Unexpected changed files: ${(result.unexpected_changed_files ?? []).join(', ') || 'none'}`,
    `Bound at:                 ${result.bound_at ?? 'N/A'}`,
    `--- REGRA ABSOLUTA ---`,
    `stable_promoted=false | deploy_performed=false | release_performed=false`,
  ];
  return lines.join('\n');
}
