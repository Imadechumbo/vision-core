#!/usr/bin/env node
/**
 * Release Execution Sandbox Contract — V51.0
 *
 * Models an isolated sandbox for release rehearsal. Never touches production,
 * never creates real tags, never pushes, never deploys.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 * sandbox_only=true, rehearsal_only=true, local_only=true always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v51.0';

export const SANDBOX_STATUSES = [
  'SANDBOX_MISSING',
  'SANDBOX_INVALID',
  'SANDBOX_EXPIRED',
  'SANDBOX_BLOCKED_HANDOFF',
  'SANDBOX_BLOCKED_EVIDENCE',
  'SANDBOX_BLOCKED_WRITE_ROOT',
  'SANDBOX_READY',
];

export const SANDBOX_DENIED_OPERATIONS = [
  'git_tag_create',
  'git_push',
  'deploy_execute',
  'stable_promote',
  'production_write',
  'evidence_override',
  'go_core_override',
];

const ALLOWED_WRITE_ROOT_PREFIXES = [
  'temp/sandbox/',
  'temp/rehearsal/',
  '.sandbox/',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    deploy_allowed:            false,
    promotion_allowed:         false,
    stable_allowed:            false,
    tag_allowed:               false,
    release_execution_allowed: false,
    release_performed:         false,
    tag_created:               false,
    stable_promoted:           false,
    deploy_performed:          false,
    sandbox_only:              true,
    rehearsal_only:            true,
    local_only:                true,
  };
}

function _blocked(status, blocking_reason = 'blocked', extra = {}) {
  return {
    schema_version:    SCHEMA_VERSION,
    sandbox_status:    status,
    sandbox_ready:     false,
    blocking_reason,
    ..._locked(),
    ...extra,
    deploy_allowed:            false,
    promotion_allowed:         false,
    stable_allowed:            false,
    tag_allowed:               false,
    release_execution_allowed: false,
    release_performed:         false,
    tag_created:               false,
    stable_promoted:           false,
    deploy_performed:          false,
    sandbox_only:              true,
    rehearsal_only:            true,
    local_only:                true,
  };
}

function _isAllowedWriteRoot(root) {
  if (!root || typeof root !== 'string') return false;
  const normalized = root.replace(/\\/g, '/').toLowerCase();
  return ALLOWED_WRITE_ROOT_PREFIXES.some(prefix => normalized.startsWith(prefix));
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Create a release execution sandbox.
 *
 * @param {Object} params
 * @param {boolean} [params.fixture_mode] - Use fixture data
 * @param {Object}  [params.handoff_package] - Manual release handoff package result
 * @param {string}  [params.sandbox_root]
 * @param {string[]} [params.allowed_write_roots]
 * @param {string}  [params._mock_timestamp]
 * @returns {Object} Sandbox result
 */
export function createReleaseExecutionSandbox(params = {}) {
  const {
    fixture_mode = false,
    handoff_package,
    sandbox_root,
    allowed_write_roots,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (fixture_mode) {
    const sandbox_id = _sha256(`fixture-sandbox:${now}`).slice(0, 24);
    const expires_at = new Date(new Date(now).getTime() + 3600 * 1000).toISOString();
    return {
      schema_version:      SCHEMA_VERSION,
      sandbox_id,
      sandbox_status:      'SANDBOX_READY',
      sandbox_ready:       true,
      handoff_id:          'fixture-handoff-id',
      request_id:          'fixture-request-id',
      preflight_id:        'fixture-preflight-id',
      dry_run_report_id:   'fixture-dry-run-id',
      evidence_receipt_id: 'fixture-receipt-id',
      evidence_source:     'go-core',
      target_version:      '1.0.0-fixture',
      target_branch:       'main',
      git_head:            'fixture-head-sha',
      sandbox_root:        'temp/sandbox/fixture',
      allowed_write_roots: ['temp/sandbox/fixture', 'temp/rehearsal/fixture'],
      denied_operations:   SANDBOX_DENIED_OPERATIONS,
      created_at:          now,
      expires_at,
      blocking_reason:     null,
      ..._locked(),
    };
  }

  // Require handoff_package
  if (!handoff_package) {
    return _blocked('SANDBOX_BLOCKED_HANDOFF', 'handoff_package_required');
  }
  if (handoff_package.handoff_ready !== true) {
    return _blocked('SANDBOX_BLOCKED_HANDOFF', 'handoff_not_ready', {
      handoff_status: handoff_package.handoff_status ?? null,
    });
  }

  // Require evidence_source=go-core
  if (handoff_package.evidence_source && handoff_package.evidence_source !== 'go-core') {
    return _blocked('SANDBOX_BLOCKED_EVIDENCE', 'evidence_source_must_be_go_core', {
      evidence_source: handoff_package.evidence_source,
    });
  }

  // Validate sandbox_root
  const root = sandbox_root ?? 'temp/sandbox/default';
  if (!_isAllowedWriteRoot(root)) {
    return _blocked('SANDBOX_BLOCKED_WRITE_ROOT', 'sandbox_root_not_in_allowed_roots', {
      sandbox_root: root,
    });
  }

  // Validate allowed_write_roots
  const writeRoots = allowed_write_roots ?? [root];
  for (const wr of writeRoots) {
    if (!_isAllowedWriteRoot(wr)) {
      return _blocked('SANDBOX_BLOCKED_WRITE_ROOT', 'write_root_not_allowed', {
        invalid_write_root: wr,
      });
    }
  }

  const sandbox_id = _sha256(`sandbox:${handoff_package.handoff_id ?? 'unknown'}:${now}`).slice(0, 24);
  const expires_at = new Date(new Date(now).getTime() + 3600 * 1000).toISOString();

  return {
    schema_version:      SCHEMA_VERSION,
    sandbox_id,
    sandbox_status:      'SANDBOX_READY',
    sandbox_ready:       true,
    handoff_id:          handoff_package.handoff_id ?? null,
    request_id:          handoff_package.request_id ?? null,
    preflight_id:        handoff_package.preflight_id ?? null,
    dry_run_report_id:   handoff_package.dry_run_report_id ?? null,
    evidence_receipt_id: handoff_package.evidence_receipt_id ?? null,
    evidence_source:     'go-core',
    target_version:      handoff_package.target_version ?? null,
    target_branch:       handoff_package.target_branch ?? null,
    git_head:            handoff_package.git_head ?? null,
    sandbox_root:        root,
    allowed_write_roots: writeRoots,
    denied_operations:   SANDBOX_DENIED_OPERATIONS,
    created_at:          now,
    expires_at,
    blocking_reason:     null,
    ..._locked(),
  };
}

/**
 * Validate a sandbox result object.
 */
export function validateReleaseExecutionSandbox(sandbox) {
  if (!sandbox || typeof sandbox !== 'object') {
    return _blocked('SANDBOX_MISSING', 'sandbox_null_or_not_object');
  }

  if (sandbox.schema_version !== SCHEMA_VERSION) {
    return _blocked('SANDBOX_INVALID', 'schema_version_mismatch', {
      expected: SCHEMA_VERSION,
      got:      sandbox.schema_version ?? null,
    });
  }

  if (!sandbox.sandbox_id || typeof sandbox.sandbox_id !== 'string') {
    return _blocked('SANDBOX_INVALID', 'sandbox_id_missing_or_invalid');
  }

  if (sandbox.evidence_source && sandbox.evidence_source !== 'go-core') {
    return _blocked('SANDBOX_BLOCKED_EVIDENCE', 'evidence_source_must_be_go_core', {
      evidence_source: sandbox.evidence_source,
    });
  }

  // Check denied_operations present
  if (!Array.isArray(sandbox.denied_operations) || sandbox.denied_operations.length === 0) {
    return _blocked('SANDBOX_INVALID', 'denied_operations_missing');
  }

  // Check expiry
  if (sandbox.expires_at) {
    const now = new Date();
    const expires = new Date(sandbox.expires_at);
    if (!isNaN(expires.getTime()) && expires < now) {
      return _blocked('SANDBOX_EXPIRED', 'sandbox_expired', {
        expires_at: sandbox.expires_at,
      });
    }
  }

  return {
    schema_version:  SCHEMA_VERSION,
    sandbox_status:  'SANDBOX_READY',
    sandbox_ready:   true,
    sandbox_id:      sandbox.sandbox_id,
    evidence_source: sandbox.evidence_source ?? 'go-core',
    blocking_reason: null,
    ..._locked(),
  };
}

/**
 * Normalize a sandbox for downstream use.
 */
export function normalizeReleaseExecutionSandbox(sandbox) {
  if (!sandbox || typeof sandbox !== 'object') return null;
  return {
    sandbox_id:          sandbox.sandbox_id ?? null,
    handoff_id:          sandbox.handoff_id ?? null,
    request_id:          sandbox.request_id ?? null,
    evidence_receipt_id: sandbox.evidence_receipt_id ?? null,
    evidence_source:     sandbox.evidence_source ?? 'go-core',
    target_version:      sandbox.target_version ?? null,
    sandbox_root:        sandbox.sandbox_root ?? null,
    denied_operations:   sandbox.denied_operations ?? SANDBOX_DENIED_OPERATIONS,
    sandbox_ready:       sandbox.sandbox_ready === true,
    ..._locked(),
  };
}

/**
 * Render a human-readable sandbox summary.
 */
export function renderReleaseExecutionSandboxSummary(sandbox) {
  if (!sandbox) return 'sandbox: null';
  const lines = [
    `sandbox_status       : ${sandbox.sandbox_status ?? 'UNKNOWN'}`,
    `sandbox_id           : ${sandbox.sandbox_id ?? 'none'}`,
    `handoff_id           : ${sandbox.handoff_id ?? 'none'}`,
    `evidence_source      : ${sandbox.evidence_source ?? 'none'}`,
    `sandbox_root         : ${sandbox.sandbox_root ?? 'none'}`,
    `denied_operations    : ${Array.isArray(sandbox.denied_operations) ? sandbox.denied_operations.join(', ') : 'none'}`,
    `sandbox_only         : true`,
    `rehearsal_only       : true`,
    `deploy_allowed       : false`,
    `release_performed    : false`,
    `blocking_reason      : ${sandbox.blocking_reason ?? 'none'}`,
  ];
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('release-execution-sandbox-contract.mjs')) {
  const args = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = createReleaseExecutionSandbox({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderReleaseExecutionSandboxSummary(result));
  }

  process.exit(result.sandbox_ready ? 0 : 1);
}
