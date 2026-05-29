/**
 * VISION CORE V2.9.10
 * tools/software-factory/software-factory-authorized-staging-probe-executor-contract.mjs
 * RTP-4 — Authorized Staging Probe Executor Contract
 * ─────────────────────────────────────────────────────────────────
 * Validates the contract for a future supervised staging probe execution.
 * Does NOT execute the probe. Does NOT call backend. Does NOT call
 * any endpoint. Does NOT make network calls. Does NOT read secrets.
 * Does NOT touch production. NO child_process. NO fetch.
 * NO XMLHttpRequest. NO http/https. NO exec. NO spawn.
 * NO PASS GOLD REAL claim. NO deploy. NO release. NO tag.
 * ─────────────────────────────────────────────────────────────────
 */

import crypto from 'node:crypto';

const MODULE_VERSION = 'RTP-4';
const HASH_SCHEMA    = 'rtp4-authorized-staging-probe-executor-contract-v1';

export const STATUSES = Object.freeze({
  READY:              'AUTHORIZED_STAGING_PROBE_EXECUTOR_CONTRACT_READY',
  BLOCKED_DEPENDENCY: 'AUTHORIZED_STAGING_PROBE_EXECUTOR_CONTRACT_BLOCKED_DEPENDENCY',
  BLOCKED_INPUT:      'AUTHORIZED_STAGING_PROBE_EXECUTOR_CONTRACT_BLOCKED_INPUT',
  FAIL:               'AUTHORIZED_STAGING_PROBE_EXECUTOR_CONTRACT_FAIL',
});

// ── Always-false dangerous flags ──────────────────────────────────
function dangerousDefaults() {
  return {
    staging_probe_executor_contract_ready: false,
    runtime_probe_executed:                false,
    backend_called:                        false,
    endpoint_called:                       false,
    network_called:                        false,
    secrets_read:                          false,
    pass_gold_real_claimed:                false,
    pass_gold_real_achieved:               false,
    release_allowed:                       false,
    deploy_allowed:                        false,
    tag_allowed:                           false,
    stable_promotion_allowed:              false,
    production_touched:                    false,
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
  if (lower.includes('localhost'))  { return 'staging_endpoint must not contain localhost'; }
  if (lower.includes('127.0.0.1')) { return 'staging_endpoint must not contain 127.0.0.1'; }
  if (lower.includes('production')) { return 'staging_endpoint must not contain "production"'; }
  // Block "prod" as hostname prefix or path segment
  const host = ep.replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
  if (host.startsWith('prod') || host.includes('.prod') || lower.includes('/prod')) {
    return 'staging_endpoint must not contain "prod"';
  }
  return null;
}

export function build(input = {}) {
  const {
    rtp0_ready                   = false,
    rtp1_ready                   = false,
    rtp2_ready                   = false,
    rtp3_ready                   = false,
    human_authorization_explicit = false,
    staging_endpoint             = '',
    http_method                  = '',
    timeout_ms                   = 0,
    probe_scope                  = '',
    evidence_capture_plan        = '',
    noop_mode                    = false,
    execution_requested          = false,
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
      human_authorization_explicit,
      staging_endpoint,
      http_method,
      timeout_ms,
      probe_scope,
      evidence_capture_plan,
      noop_mode,
      execution_requested,
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

  // ── Dependency blocks ────────────────────────────────────────────
  if (!rtp0_ready) return blocked(STATUSES.BLOCKED_DEPENDENCY, 'RTP-0 not ready.');
  if (!rtp1_ready) return blocked(STATUSES.BLOCKED_DEPENDENCY, 'RTP-1 not ready.');
  if (!rtp2_ready) return blocked(STATUSES.BLOCKED_DEPENDENCY, 'RTP-2 not ready.');
  if (!rtp3_ready) return blocked(STATUSES.BLOCKED_DEPENDENCY, 'RTP-3 not ready.');

  // ── Authorization ────────────────────────────────────────────────
  if (!human_authorization_explicit) {
    return blocked(STATUSES.BLOCKED_INPUT,
      'human_authorization_explicit must be true. Explicit named-operator GO required.');
  }

  // ── execution_requested must be false ────────────────────────────
  if (execution_requested) {
    return blocked(STATUSES.BLOCKED_INPUT,
      'execution_requested must be false. This module validates contract only; actual execution is blocked.');
  }

  // ── noop_mode must be true ───────────────────────────────────────
  if (!noop_mode) {
    return blocked(STATUSES.BLOCKED_INPUT,
      'noop_mode must be true. No real execution permitted at this contract phase.');
  }

  // ── Endpoint ─────────────────────────────────────────────────────
  const epErr = endpointError(staging_endpoint);
  if (epErr) return blocked(STATUSES.BLOCKED_INPUT, epErr);

  // ── Method ───────────────────────────────────────────────────────
  if (http_method !== 'GET') {
    return blocked(STATUSES.BLOCKED_INPUT,
      'http_method must be GET. Only GET is permitted for health probe.');
  }

  // ── Timeout ──────────────────────────────────────────────────────
  const ms = Number(timeout_ms);
  if (!Number.isFinite(ms) || ms < 1000) {
    return blocked(STATUSES.BLOCKED_INPUT, 'timeout_ms must be >= 1000.');
  }
  if (ms > 10000) {
    return blocked(STATUSES.BLOCKED_INPUT, 'timeout_ms must be <= 10000.');
  }

  // ── Scope + evidence plan ────────────────────────────────────────
  if (typeof probe_scope !== 'string' || probe_scope.trim() === '') {
    return blocked(STATUSES.BLOCKED_INPUT, 'probe_scope must be a non-empty string.');
  }
  if (typeof evidence_capture_plan !== 'string' || evidence_capture_plan.trim() === '') {
    return blocked(STATUSES.BLOCKED_INPUT, 'evidence_capture_plan must be a non-empty string.');
  }

  // ── READY ────────────────────────────────────────────────────────
  return {
    module_version:                        MODULE_VERSION,
    status:                                STATUSES.READY,
    ready:                                 true,
    message:
      'RTP-4 authorized staging probe executor contract ready. ' +
      'No probe executed. No runtime call performed. PASS GOLD REAL not claimed.',
    evidence_hash,
    // Contract fields
    staging_endpoint,
    http_method,
    timeout_ms:                            ms,
    probe_scope:                           probe_scope.trim(),
    evidence_capture_plan:                 evidence_capture_plan.trim(),
    noop_mode,
    human_authorization_explicit,
    // Dangerous flags
    staging_probe_executor_contract_ready: true,
    runtime_probe_executed:                false,
    backend_called:                        false,
    endpoint_called:                       false,
    network_called:                        false,
    secrets_read:                          false,
    pass_gold_real_claimed:                false,
    pass_gold_real_achieved:               false,
    release_allowed:                       false,
    deploy_allowed:                        false,
    tag_allowed:                           false,
    stable_promotion_allowed:              false,
    production_touched:                    false,
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
    'runtime_probe_executed', 'backend_called', 'endpoint_called',
    'network_called', 'secrets_read', 'pass_gold_real_claimed',
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

  if (typeof result.staging_probe_executor_contract_ready !== 'boolean') {
    issues.push('staging_probe_executor_contract_ready must be boolean');
  }

  return { valid: issues.length === 0, issues };
}

export function render(result) {
  const statusIcon = result.ready ? '✅ READY' : '🔴 BLOCKED';

  const lines = [
    '# RTP-4 Authorized Staging Probe Executor Contract',
    '',
    '> **Module:** ' + result.module_version,
    '> **Status:** ' + statusIcon,
    '> **Evidence Hash:** ' + (result.evidence_hash || 'N/A'),
    '',
    '---',
    '',
    '## Summary',
    '',
    'Contract validation only — no probe executed. No backend called. No network called.',
    'PASS GOLD REAL is **not claimed**. Production is **not touched**.',
    'All dangerous flags remain `false`.',
    '',
    '**Message:** ' + result.message,
    '',
    '---',
  ];

  if (result.ready) {
    lines.push(
      '',
      '## Contract Parameters',
      '',
      '| Field | Value |',
      '|-------|-------|',
      '| `staging_endpoint` | `' + result.staging_endpoint + '` |',
      '| `http_method` | **' + result.http_method + '** (GET only) |',
      '| `timeout_ms` | ' + result.timeout_ms + ' ms |',
      '| `probe_scope` | ' + result.probe_scope + ' |',
      '| `evidence_capture_plan` | ' + result.evidence_capture_plan + ' |',
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
    '| `staging_probe_executor_contract_ready` | **' + result.staging_probe_executor_contract_ready + '** |',
    '| `runtime_probe_executed` | **' + result.runtime_probe_executed + '** |',
    '| `backend_called` | **' + result.backend_called + '** |',
    '| `endpoint_called` | **' + result.endpoint_called + '** |',
    '| `network_called` | **' + result.network_called + '** |',
    '| `secrets_read` | **' + result.secrets_read + '** |',
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
    '- `execution_requested` must be `false` for contract to pass.',
    '- `noop_mode` must be `true` — no real execution permitted.',
    '- All dangerous flags remain `false` (REGRA ABSOLUTA).',
  );

  return lines.join('\n');
}

export default { STATUSES, build, validate, render };
