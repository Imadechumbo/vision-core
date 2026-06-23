#!/usr/bin/env node
/**
 * Filesystem Reality Check — V146.1
 *
 * Validates local filesystem reality before accepting any agent claim.
 * No external access. No deploy. No stable promotion. No release.
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v146.1';

export const FILESYSTEM_REALITY_STATUSES = [
  'FS_REALITY_BLOCKED_PATH',
  'FS_REALITY_MISSING_EXPECTED_FILE',
  'FS_REALITY_MISSING_PACKAGE_SCRIPT',
  'FS_REALITY_MISSING_SYNTAX_ENTRY',
  'FS_REALITY_READY',
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

export function runFilesystemRealityCheck(params) {
  const {
    check_id,
    local_repo_path           = null,
    expected_paths            = [],
    unexpected_paths          = [],
    package_scripts_required  = [],
    syntax_entries_required   = [],
    file_exists_map           = {},
    file_hash_map             = {},
    file_size_map             = {},
    package_scripts_present   = [],
    syntax_entries_present    = [],
    checked_at,
  } = params || {};

  const checkKey = [
    check_id, local_repo_path,
    JSON.stringify(expected_paths),
    JSON.stringify(package_scripts_required),
    JSON.stringify(syntax_entries_required),
  ].join('|');
  const check_id_hash = _sha256(checkKey);

  if (!check_id || String(check_id).trim() === '') {
    return {
      check_id_hash,
      schema_version:          SCHEMA_VERSION,
      fs_reality_status:       'FS_REALITY_BLOCKED_PATH',
      fs_reality_ready:        false,
      blocked_reason:          'check_id is required.',
      missing_expected_files:  [],
      present_unexpected_files: [],
      missing_package_scripts: [],
      missing_syntax_entries:  [],
      ..._locked(),
    };
  }

  if (!local_repo_path || String(local_repo_path).trim() === '') {
    return {
      check_id_hash,
      schema_version:          SCHEMA_VERSION,
      fs_reality_status:       'FS_REALITY_BLOCKED_PATH',
      fs_reality_ready:        false,
      check_id,
      blocked_reason:          'local_repo_path is required.',
      missing_expected_files:  [],
      present_unexpected_files: [],
      missing_package_scripts: [],
      missing_syntax_entries:  [],
      ..._locked(),
    };
  }

  const paths = Array.isArray(expected_paths) ? expected_paths : [];
  const missing_expected_files = paths.filter(p => file_exists_map[p] !== true);

  if (missing_expected_files.length > 0) {
    return {
      check_id_hash,
      schema_version:          SCHEMA_VERSION,
      fs_reality_status:       'FS_REALITY_MISSING_EXPECTED_FILE',
      fs_reality_ready:        false,
      check_id,
      local_repo_path,
      missing_expected_files,
      present_unexpected_files: [],
      missing_package_scripts: [],
      missing_syntax_entries:  [],
      blocked_reason:          `Missing files: ${missing_expected_files.join(', ')}`,
      checked_at:              checked_at ?? new Date().toISOString(),
      ..._locked(),
    };
  }

  const scripts = Array.isArray(package_scripts_required) ? package_scripts_required : [];
  const presentScripts = Array.isArray(package_scripts_present) ? package_scripts_present : [];
  const missing_package_scripts = scripts.filter(s => !presentScripts.includes(s));

  if (missing_package_scripts.length > 0) {
    return {
      check_id_hash,
      schema_version:          SCHEMA_VERSION,
      fs_reality_status:       'FS_REALITY_MISSING_PACKAGE_SCRIPT',
      fs_reality_ready:        false,
      check_id,
      local_repo_path,
      missing_expected_files:  [],
      present_unexpected_files: [],
      missing_package_scripts,
      missing_syntax_entries:  [],
      blocked_reason:          `Missing package scripts: ${missing_package_scripts.join(', ')}`,
      checked_at:              checked_at ?? new Date().toISOString(),
      ..._locked(),
    };
  }

  const syntaxRequired = Array.isArray(syntax_entries_required) ? syntax_entries_required : [];
  const syntaxPresent  = Array.isArray(syntax_entries_present)  ? syntax_entries_present  : [];
  const missing_syntax_entries = syntaxRequired.filter(e => !syntaxPresent.includes(e));

  if (missing_syntax_entries.length > 0) {
    return {
      check_id_hash,
      schema_version:          SCHEMA_VERSION,
      fs_reality_status:       'FS_REALITY_MISSING_SYNTAX_ENTRY',
      fs_reality_ready:        false,
      check_id,
      local_repo_path,
      missing_expected_files:  [],
      present_unexpected_files: [],
      missing_package_scripts: [],
      missing_syntax_entries,
      blocked_reason:          `Missing syntax entries: ${missing_syntax_entries.join(', ')}`,
      checked_at:              checked_at ?? new Date().toISOString(),
      ..._locked(),
    };
  }

  const unexpectedPaths = Array.isArray(unexpected_paths) ? unexpected_paths : [];
  const present_unexpected_files = unexpectedPaths.filter(p => file_exists_map[p] === true);

  const file_count     = paths.length;
  const verified_files = paths.filter(p => file_exists_map[p] === true);
  const file_hashes    = Object.fromEntries(
    Object.entries(file_hash_map).filter(([p]) => paths.includes(p))
  );
  const file_sizes = Object.fromEntries(
    Object.entries(file_size_map).filter(([p]) => paths.includes(p))
  );

  return {
    check_id_hash,
    schema_version:           SCHEMA_VERSION,
    fs_reality_status:        'FS_REALITY_READY',
    fs_reality_ready:         true,
    check_id,
    local_repo_path,
    file_count,
    verified_file_count:      verified_files.length,
    verified_files,
    file_hashes,
    file_sizes,
    present_unexpected_files,
    missing_expected_files:   [],
    missing_package_scripts:  [],
    missing_syntax_entries:   [],
    package_scripts_verified: scripts,
    syntax_entries_verified:  syntaxRequired,
    local_repo_path_confirmed: true,
    checked_at:               checked_at ?? new Date().toISOString(),
    ..._locked(),
  };
}

export function validateFilesystemRealityCheck(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'check_id_hash', 'schema_version', 'fs_reality_status',
    'fs_reality_ready',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.stable_promoted   !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed  !== false) errors.push('deploy_performed must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!FILESYSTEM_REALITY_STATUSES.includes(result.fs_reality_status)) {
    errors.push(`invalid fs_reality_status: ${result.fs_reality_status}`);
  }
  return { valid: errors.length === 0, errors };
}

export function renderFilesystemRealityCheck(result) {
  if (!result || typeof result !== 'object') {
    return '[FILESYSTEM_REALITY_CHECK] No result to render.';
  }
  const lines = [
    `=== Filesystem Reality Check [${SCHEMA_VERSION}] ===`,
    `Status:                   ${result.fs_reality_status ?? 'N/A'}`,
    `Check ID:                 ${result.check_id ?? 'N/A'}`,
    `Repo path:                ${result.local_repo_path ?? 'N/A'}`,
    `Ready:                    ${result.fs_reality_ready}`,
    `Files verified:           ${result.verified_file_count ?? 0} / ${result.file_count ?? 0}`,
    `Missing expected files:   ${(result.missing_expected_files ?? []).join(', ') || 'none'}`,
    `Missing scripts:          ${(result.missing_package_scripts ?? []).join(', ') || 'none'}`,
    `Missing syntax entries:   ${(result.missing_syntax_entries ?? []).join(', ') || 'none'}`,
    `Unexpected present:       ${(result.present_unexpected_files ?? []).join(', ') || 'none'}`,
    `Checked at:               ${result.checked_at ?? 'N/A'}`,
    `--- REGRA ABSOLUTA ---`,
    `stable_promoted=false | deploy_performed=false | release_performed=false`,
  ];
  return lines.join('\n');
}
