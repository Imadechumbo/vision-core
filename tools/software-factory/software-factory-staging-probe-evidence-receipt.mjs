/**
 * VISION CORE V2.9.10
 * tools/software-factory/software-factory-staging-probe-evidence-receipt.mjs
 * RTP-5 — Staging Probe Evidence Receipt
 * ─────────────────────────────────────────────────────────────────
 * Creates a declarative evidence receipt for a future supervised
 * staging probe execution. Does NOT execute the probe. Does NOT call
 * backend. Does NOT call endpoints. Does NOT make network calls.
 * Does NOT read secrets. Does NOT touch production. Does NOT store
 * raw body or headers. Does NOT print secrets.
 * NO child_process. NO fetch. NO XMLHttpRequest. NO http/https.
 * NO exec. NO spawn. NO PASS GOLD REAL claim. NO deploy. NO release.
 * NO tag.
 * ─────────────────────────────────────────────────────────────────
 */

import crypto from 'node:crypto';

const MODULE_VERSION = 'RTP-5';
const HASH_SCHEMA    = 'rtp5-staging-probe-evidence-receipt-v1';

export const STATUSES = Object.freeze({
  READY:              'STAGING_PROBE_EVIDENCE_RECEIPT_READY',
  BLOCKED_DEPENDENCY: 'STAGING_PROBE_EVIDENCE_RECEIPT_BLOCKED_DEPENDENCY',
  BLOCKED_INPUT:      'STAGING_PROBE_EVIDENCE_RECEIPT_BLOCKED_INPUT',
  FAIL:               'STAGING_PROBE_EVIDENCE_RECEIPT_FAIL',
});

// ── Allowed evidence fields whitelist ────────────────────────────
const ALLOWED_EVIDENCE_FIELDS = Object.freeze([
  'status_code',
  'response_time_ms',
  'sanitized_body_hash',
  'sanitized_headers_hash',
  'probe_started_at',
  'probe_finished_at',
  'no_secret_leak_detected',
  'endpoint_fingerprint',
]);

// ── Always-false dangerous defaults ──────────────────────────────
function dangerousDefaults() {
  return {
    staging_probe_evidence_receipt_ready: false,
    runtime_probe_executed:               false,
    execution_performed:                  false,
    backend_called:                       false,
    endpoint_called:                      false,
    network_called:                       false,
    secrets_read:                         false,
    secrets_printed:                      false,
    raw_body_stored:                      false,
    raw_headers_stored:                   false,
    pass_gold_real_claimed:               false,
    pass_gold_real_achieved:              false,
    release_allowed:                      false,
    deploy_allowed:                       false,
    tag_allowed:                          false,
    stable_promotion_allowed:             false,
    production_touched:                   false,
  };
}

// ── Endpoint validation ───────────────────────────────────────────
function endpointError(ep) {
  if (typeof ep !== 'string' || ep.trim() === '') {
    return 'staging_endpoint must be a non-empty string';
  }
  if (!ep.startsWith('https://')) {
    return 'staging_endpoint must start with https://';
  }
  const lower = ep.toLowerCase();
  if (lower.includes('localhost'))  return 'staging_endpoint must not contain localhost';
  if (lower.includes('127.0.0.1')) return 'staging_endpoint must not contain 127.0.0.1';
  if (lower.includes('production')) return 'staging_endpoint must not contain "production"';
  const host = ep.replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
  if (host.startsWith('prod') || host.includes('.prod') || lower.includes('/prod')) {
    return 'staging_endpoint must not contain "prod"';
  }
  return null;
}

// ── Evidence fields validation ────────────────────────────────────
function evidenceFieldsError(fields) {
  if (!Array.isArray(fields) || fields.length === 0) {
    return 'expected_evidence_fields must be a non-empty array';
  }
  for (const field of fields) {
    if (!ALLOWED_EVIDENCE_FIELDS.includes(field)) {
      return 'expected_evidence_fields contains disallowed field: "' + field +
        '". Allowed: ' + ALLOWED_EVIDENCE_FIELDS.join(', ');
    }
  }
  return null;
}

export function build(input = {}) {
  const {
    rtp0_ready                   = false,
    rtp1_ready                   = false,
    rtp2_ready                   = false,
    rtp3_ready                   = false,
    rtp4_ready                   = false,
    human_authorization_explicit = false,
    staging_endpoint             = '',
    http_method                  = '',
    timeout_ms                   = 0,
    probe_scope                  = '',
    evidence_capture_plan        = '',
    expected_evidence_fields     = [],
    sanitizer_required           = false,
    noop_mode                    = false,
    execution_performed          = false,
  } = input;

  // Deterministic hash — no Date.now, no random
  const evidence_hash = crypto.createHash('sha256')
    .update(JSON.stringify({
      module_version:              MODULE_VERSION,
      hash_schema:                 HASH_SCHEMA,
      rtp0_ready,
      rtp1_ready,
      rtp2_ready,
      rtp3_ready,
      rtp4_ready,
      human_authorization_explicit,
      staging_endpoint,
      http_method,
      timeout_ms,
      probe_scope,
      evidence_capture_plan,
      expected_evidence_fields:    Array.isArray(expected_evidence_fields)
        ? expected_evidence_fields.slice().sort()
        : expected_evidence_fields,
      sanitizer_required,
      noop_mode,
      execution_performed,
    }))
    .digest('hex');

  const blocked = (status, message) => ({
    module_version: MODULE_VERSION,
    status,
    ready: false,
    message,
    evidence_hash,
    ...dangerousDefaults(),
  });

  // ── Dependency blocks ─────────────────────────────────────────
  if (!rtp0_ready) return blocked(STATUSES.BLOCKED_DEPENDENCY, 'RTP-0 not ready.');
  if (!rtp1_ready) return blocked(STATUSES.BLOCKED_DEPENDENCY, 'RTP-1 not ready.');
  if (!rtp2_ready) return blocked(STATUSES.BLOCKED_DEPENDENCY, 'RTP-2 not ready.');
  if (!rtp3_ready) return blocked(STATUSES.BLOCKED_DEPENDENCY, 'RTP-3 not ready.');
  if (!rtp4_ready) return blocked(STATUSES.BLOCKED_DEPENDENCY, 'RTP-4 not ready.');

  // ── Authorization ────────────────────────────────────────────
  if (!human_authorization_explicit) {
    return blocked(STATUSES.BLOCKED_INPUT,
      'human_authorization_explicit must be true. Named-operator GO required.');
  }

  // ── execution_performed must be false ────────────────────────
  if (execution_performed) {
    return blocked(STATUSES.BLOCKED_INPUT,
      'execution_performed must be false. Receipt is declarative only; no real execution permitted.');
  }

  // ── noop_mode must be true ───────────────────────────────────
  if (!noop_mode) {
    return blocked(STATUSES.BLOCKED_INPUT,
      'noop_mode must be true. No real execution permitted at receipt phase.');
  }

  // ── sanitizer_required must be true ─────────────────────────
  if (!sanitizer_required) {
    return blocked(STATUSES.BLOCKED_INPUT,
      'sanitizer_required must be true. All captured data must be sanitized before storage.');
  }

  // ── Endpoint ─────────────────────────────────────────────────
  const epErr = endpointError(staging_endpoint);
  if (epErr) return blocked(STATUSES.BLOCKED_INPUT, epErr);

  // ── Method ───────────────────────────────────────────────────
  if (http_method !== 'GET') {
    return blocked(STATUSES.BLOCKED_INPUT,
      'http_method must be GET. Only GET is permitted for health probe.');
  }

  // ── Timeout ──────────────────────────────────────────────────
  const ms = Number(timeout_ms);
  if (!Number.isFinite(ms) || ms < 1000) {
    return blocked(STATUSES.BLOCKED_INPUT, 'timeout_ms must be >= 1000.');
  }
  if (ms > 10000) {
    return blocked(STATUSES.BLOCKED_INPUT, 'timeout_ms must be <= 10000.');
  }

  // ── Probe scope ──────────────────────────────────────────────
  if (typeof probe_scope !== 'string' || probe_scope.trim() === '') {
    return blocked(STATUSES.BLOCKED_INPUT, 'probe_scope must be a non-empty string.');
  }

  // ── Evidence capture plan ────────────────────────────────────
  if (typeof evidence_capture_plan !== 'string' || evidence_capture_plan.trim() === '') {
    return blocked(STATUSES.BLOCKED_INPUT, 'evidence_capture_plan must be a non-empty string.');
  }

  // ── Expected evidence fields ─────────────────────────────────
  const fieldsErr = evidenceFieldsError(expected_evidence_fields);
  if (fieldsErr) return blocked(STATUSES.BLOCKED_INPUT, fieldsErr);

  // ── READY ────────────────────────────────────────────────────
  return {
    module_version:                       MODULE_VERSION,
    status:                               STATUSES.READY,
    ready:                                true,
    message:
      'RTP-5 staging probe evidence receipt prepared. ' +
      'No probe executed. No runtime call performed. PASS GOLD REAL not claimed. ' +
      'Raw body and headers are not stored. Secrets are not printed.',
    evidence_hash,
    // Contract fields
    staging_endpoint,
    http_method,
    timeout_ms:                           ms,
    probe_scope:                          probe_scope.trim(),
    evidence_capture_plan:                evidence_capture_plan.trim(),
    expected_evidence_fields:             expected_evidence_fields.slice(),
    allowed_evidence_fields:              ALLOWED_EVIDENCE_FIELDS.slice(),
    sanitizer_required,
    noop_mode,
    human_authorization_explicit,
    // Dangerous flags
    staging_probe_evidence_receipt_ready: true,
    runtime_probe_executed:               false,
    execution_performed:                  false,
    backend_called:                       false,
    endpoint_called:                      false,
    network_called:                       false,
    secrets_read:                         false,
    secrets_printed:                      false,
    raw_body_stored:                      false,
    raw_headers_stored:                   false,
    pass_gold_real_claimed:               false,
    pass_gold_real_achieved:              false,
    release_allowed:                      false,
    deploy_allowed:                       false,
    tag_allowed:                          false,
    stable_promotion_allowed:             false,
    production_touched:                   false,
  };
}

export function validate(result) {
  const issues = [];

  if (!result || typeof result !== 'object') {
    return { valid: false, issues: ['result must be an object'] };
  }

  if (result.module_version !== MODULE_VERSION) {
    issues.push('module_version must be ' + MODULE_VERSION);
  }

  const validStatuses = Object.values(STATUSES);
  if (!validStatuses.includes(result.status)) {
    issues.push('status must be one of: ' + validStatuses.join(', '));
  }

  if (typeof result.ready !== 'boolean') {
    issues.push('ready must be boolean');
  }

  if (typeof result.evidence_hash !== 'string' || result.evidence_hash.length !== 64) {
    issues.push('evidence_hash must be 64-char hex string');
  }

  if (typeof result.message !== 'string' || result.message.trim() === '') {
    issues.push('message must be a non-empty string');
  }

  // Always-false flags
  const alwaysFalse = [
    'runtime_probe_executed', 'execution_performed', 'backend_called',
    'endpoint_called', 'network_called', 'secrets_read', 'secrets_printed',
    'raw_body_stored', 'raw_headers_stored', 'pass_gold_real_claimed',
    'pass_gold_real_achieved', 'release_allowed', 'deploy_allowed',
    'tag_allowed', 'stable_promotion_allowed', 'production_touched',
  ];
  for (const flag of alwaysFalse) {
    if (!(flag in result)) {
      issues.push('missing required field: ' + flag);
    } else if (result[flag] !== false) {
      issues.push('REGRA ABSOLUTA violation: ' + flag + ' must be false');
    }
  }

  if (typeof result.staging_probe_evidence_receipt_ready !== 'boolean') {
    issues.push('staging_probe_evidence_receipt_ready must be boolean');
  }

  return { valid: issues.length === 0, issues };
}

export function render(result) {
  const statusIcon = result.ready ? '✅ READY' : '🔴 BLOCKED';

  const lines = [
    '# RTP-5 Staging Probe Evidence Receipt',
    '',
    '> **Module:** ' + result.module_version,
    '> **Status:** ' + statusIcon,
    '> **Evidence Hash:** ' + (result.evidence_hash || 'N/A'),
    '',
    '---',
    '',
    '## Summary',
    '',
    'Declarative evidence receipt only — no probe executed. No backend called.',
    'No network called. No raw body or headers stored. No secrets printed.',
    'PASS GOLD REAL is **not claimed**. Production is **not touched**.',
    '',
    '**Message:** ' + result.message,
    '',
    '---',
  ];

  if (result.ready) {
    const fields = Array.isArray(result.expected_evidence_fields)
      ? result.expected_evidence_fields.join(', ')
      : 'N/A';
    lines.push(
      '',
      '## Receipt Parameters',
      '',
      '| Field | Value |',
      '|-------|-------|',
      '| `staging_endpoint` | `' + result.staging_endpoint + '` |',
      '| `http_method` | **' + result.http_method + '** (GET only) |',
      '| `timeout_ms` | ' + result.timeout_ms + ' ms |',
      '| `probe_scope` | ' + result.probe_scope + ' |',
      '| `evidence_capture_plan` | ' + result.evidence_capture_plan + ' |',
      '| `expected_evidence_fields` | ' + fields + ' |',
      '| `sanitizer_required` | **' + result.sanitizer_required + '** |',
      '| `noop_mode` | **' + result.noop_mode + '** |',
      '| `human_authorization_explicit` | **' + result.human_authorization_explicit + '** |',
      '',
      '---',
    );
  }

  lines.push(
    '',
    '## Execution Flags',
    '',
    '| Flag | Value |',
    '|------|-------|',
    '| `staging_probe_evidence_receipt_ready` | **' + result.staging_probe_evidence_receipt_ready + '** |',
    '| `runtime_probe_executed` | **' + result.runtime_probe_executed + '** |',
    '| `execution_performed` | **' + result.execution_performed + '** |',
    '| `backend_called` | **' + result.backend_called + '** |',
    '| `endpoint_called` | **' + result.endpoint_called + '** |',
    '| `network_called` | **' + result.network_called + '** |',
    '| `secrets_read` | **' + result.secrets_read + '** |',
    '| `secrets_printed` | **' + result.secrets_printed + '** |',
    '| `raw_body_stored` | **' + result.raw_body_stored + '** |',
    '| `raw_headers_stored` | **' + result.raw_headers_stored + '** |',
    '| `production_touched` | **' + result.production_touched + '** |',
    '| `pass_gold_real_claimed` | **' + result.pass_gold_real_claimed + '** |',
    '| `pass_gold_real_achieved` | **' + result.pass_gold_real_achieved + '** |',
    '| `release_allowed` | **' + result.release_allowed + '** |',
    '| `deploy_allowed` | **' + result.deploy_allowed + '** |',
    '| `tag_allowed` | **' + result.tag_allowed + '** |',
    '| `stable_promotion_allowed` | **' + result.stable_promotion_allowed + '** |',
    '',
    '---',
    '',
    '## Non-Authority Statement — REGRA ABSOLUTA',
    '',
    '**SEM PASS GOLD REAL → não promove, não libera, não marca stable.**',
    '',
    '- PASS GOLD REAL is **not claimed**.',
    '- Production is **not touched**. `production_touched = false`.',
    '- No backend called. No network called. No secrets read.',
    '- `runtime_probe_executed = false` — no probe was executed.',
    '- `execution_performed = false` — this is a declarative receipt only.',
    '- `raw_body_stored = false` — raw body is never stored.',
    '- `raw_headers_stored = false` — raw headers are never stored.',
    '- `secrets_printed = false` — secrets are never printed.',
    '- `sanitizer_required = true` required — all data must be sanitized.',
    '- All dangerous flags remain `false` (REGRA ABSOLUTA).',
  );

  return lines.join('\n');
}

export default { STATUSES, build, validate, render };
