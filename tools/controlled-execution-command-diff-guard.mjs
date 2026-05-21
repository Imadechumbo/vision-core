#!/usr/bin/env node
/**
 * Controlled Execution Command Diff Guard — V157.1
 *
 * Verifies the command hash at execution time matches the sealed hash
 * and that no forbidden files would be touched by the execution.
 *
 * Forbidden file patterns (never allowed to be modified):
 *   - Production secrets (.env, *.key, *.pem, credentials.*)
 *   - CI/CD pipeline configurations (*.yml in .github/workflows)
 *   - Core governance files (CLAUDE.md, *.lock, package-lock.json)
 *
 * Statuses:
 *   DIFF_GUARD_BLOCKED_INPUT   — missing guard_id or command_hash
 *   DIFF_GUARD_MISMATCH        — provided hash does not match sealed hash
 *   DIFF_GUARD_FORBIDDEN_FILE  — diff would touch a forbidden file
 *   DIFF_GUARD_GUARDED         — hash matches and no forbidden files
 *
 * Invariants:
 *   command_executed = false (always)
 *   execution_performed = false (always)
 *   stable_promoted = false (always)
 *   deploy_performed = false (always)
 *   release_performed = false (always)
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v157.1';

export const DIFF_GUARD_STATUSES = [
  'DIFF_GUARD_BLOCKED_INPUT',
  'DIFF_GUARD_MISMATCH',
  'DIFF_GUARD_FORBIDDEN_FILE',
  'DIFF_GUARD_GUARDED',
];

export const FORBIDDEN_FILE_PATTERNS = [
  /\.env$/i,
  /\.env\./i,
  /\.key$/i,
  /\.pem$/i,
  /credentials\./i,
  /\.github\/workflows\/.*\.ya?ml$/i,
  /^CLAUDE\.md$/i,
  /package-lock\.json$/i,
  /yarn\.lock$/i,
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    command_executed:    false,
    execution_performed: false,
    stable_promoted:     false,
    deploy_performed:    false,
    release_performed:   false,
  };
}

function _isForbiddenFile(filePath) {
  return FORBIDDEN_FILE_PATTERNS.some(p => p.test(filePath));
}

export function buildControlledExecutionCommandDiffGuard(params) {
  const {
    guard_id,
    command_hash,
    sealed_command_hash,
    diff_files,
    sealer_id,
    guarded_at,
  } = params || {};

  const ts = guarded_at ?? new Date().toISOString();

  if (!guard_id || String(guard_id).trim() === '' ||
      !command_hash || String(command_hash).trim() === '') {
    return {
      schema_version:        SCHEMA_VERSION,
      diff_guard_status:     'DIFF_GUARD_BLOCKED_INPUT',
      blocked_reason:        'guard_id and command_hash are required.',
      guard_id:              guard_id ?? null,
      guard_id_hash:         _sha256(guard_id ?? ''),
      guarded_at:            ts,
      ..._locked(),
    };
  }

  // Hash mismatch check
  if (sealed_command_hash && command_hash !== sealed_command_hash) {
    return {
      schema_version:        SCHEMA_VERSION,
      diff_guard_status:     'DIFF_GUARD_MISMATCH',
      blocked_reason:        'command_hash does not match sealed_command_hash.',
      guard_id,
      guard_id_hash:         _sha256(guard_id),
      command_hash,
      sealed_command_hash,
      guarded_at:            ts,
      ..._locked(),
    };
  }

  // Forbidden file check
  const safeFiles = Array.isArray(diff_files) ? diff_files : [];
  const forbiddenFiles = safeFiles.filter(f => _isForbiddenFile(String(f)));
  if (forbiddenFiles.length > 0) {
    return {
      schema_version:        SCHEMA_VERSION,
      diff_guard_status:     'DIFF_GUARD_FORBIDDEN_FILE',
      blocked_reason:        `forbidden files detected: ${forbiddenFiles.join(', ')}`,
      guard_id,
      guard_id_hash:         _sha256(guard_id),
      command_hash,
      forbidden_files:       forbiddenFiles,
      diff_file_count:       safeFiles.length,
      guarded_at:            ts,
      ..._locked(),
    };
  }

  return {
    schema_version:        SCHEMA_VERSION,
    diff_guard_status:     'DIFF_GUARD_GUARDED',
    guard_id,
    guard_id_hash:         _sha256(guard_id),
    command_hash,
    sealed_command_hash:   sealed_command_hash ?? null,
    sealer_id:             sealer_id ?? null,
    diff_files:            safeFiles,
    diff_file_count:       safeFiles.length,
    forbidden_files:       [],
    hash_verified:         sealed_command_hash ? command_hash === sealed_command_hash : null,
    guarded_at:            ts,
    ..._locked(),
  };
}

export function validateControlledExecutionCommandDiffGuard(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'schema_version', 'diff_guard_status', 'guard_id_hash', 'guarded_at',
    'command_executed', 'execution_performed',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const f of required) {
    if (!(f in result)) errors.push(`missing field: ${f}`);
  }
  if (result.command_executed    !== false) errors.push('command_executed must be false');
  if (result.execution_performed !== false) errors.push('execution_performed must be false');
  if (result.stable_promoted     !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed    !== false) errors.push('deploy_performed must be false');
  if (result.release_performed   !== false) errors.push('release_performed must be false');
  if (!DIFF_GUARD_STATUSES.includes(result.diff_guard_status)) {
    errors.push(`invalid diff_guard_status: ${result.diff_guard_status}`);
  }
  if (result.diff_guard_status === 'DIFF_GUARD_GUARDED') {
    if (!result.command_hash) errors.push('GUARDED requires command_hash');
    if (!Array.isArray(result.diff_files)) errors.push('GUARDED requires diff_files array');
    if (!Array.isArray(result.forbidden_files)) errors.push('GUARDED requires forbidden_files array');
  }
  return { valid: errors.length === 0, errors };
}

export function renderControlledExecutionCommandDiffGuard(result) {
  if (!result || typeof result !== 'object') {
    return '[CONTROLLED_EXECUTION_COMMAND_DIFF_GUARD] No result to render.';
  }
  const lines = [
    `=== Controlled Execution Command Diff Guard [${SCHEMA_VERSION}] ===`,
    `Status:              ${result.diff_guard_status ?? 'N/A'}`,
    `Guard ID:            ${result.guard_id ?? 'N/A'}`,
    `Command hash:        ${result.command_hash ?? 'N/A'}`,
    `Hash verified:       ${result.hash_verified ?? 'N/A'}`,
    `Diff file count:     ${result.diff_file_count ?? 0}`,
    `Forbidden files:     ${(result.forbidden_files ?? []).join(', ') || 'none'}`,
    `--- REGRA ABSOLUTA ---`,
    `command_executed=false | execution_performed=false | stable_promoted=false`,
  ];
  if (result.blocked_reason) lines.splice(2, 0, `Blocked reason:      ${result.blocked_reason}`);
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('controlled-execution-command-diff-guard.mjs')) {
  const showJson = process.argv.includes('--json');
  const hash = _sha256('v157.0-sealer|git tag v1.33.0|CONTROLLED_RUNTIME_EXECUTION|2026-05-21T22:00:00.000Z');
  const result = buildControlledExecutionCommandDiffGuard({
    guard_id:             'v157.1-guard',
    command_hash:         hash,
    sealed_command_hash:  hash,
    sealer_id:            'v157.0-sealer',
    diff_files:           ['src/main.go', 'go.mod'],
  });
  if (showJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderControlledExecutionCommandDiffGuard(result));
  }
  const v = validateControlledExecutionCommandDiffGuard(result);
  if (!v.valid) {
    process.stderr.write(`Validation failed: ${v.errors.join(', ')}\n`);
    process.exit(1);
  }
}
