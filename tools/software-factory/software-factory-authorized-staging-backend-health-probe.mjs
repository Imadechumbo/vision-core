/**
 * VISION CORE V2.9.10
 * tools/software-factory/software-factory-authorized-staging-backend-health-probe.mjs
 * RTP-3 — Authorized Staging Backend Health Probe Contract
 * ─────────────────────────────────────────────────────────────────
 * Validates the contract for a future supervised staging health probe.
 * Does NOT execute the probe. Does NOT call backend. Does NOT call
 * any endpoint. Does NOT make network calls. Does NOT read secrets.
 * Does NOT touch production. NO child_process. NO fetch.
 * NO XMLHttpRequest. NO http/https. NO exec. NO spawn.
 * NO PASS GOLD REAL claim. NO deploy. NO release. NO tag.
 * ─────────────────────────────────────────────────────────────────
 */

import crypto from 'node:crypto';

const MODULE_VERSION = 'RTP-3';
const HASH_SCHEMA    = 'rtp3-authorized-staging-backend-health-probe-v1';

export const STATUSES = Object.freeze({
  READY:              'AUTHORIZED_STAGING_BACKEND_HEALTH_PROBE_READY',
  BLOCKED_DEPENDENCY: 'AUTHORIZED_STAGING_BACKEND_HEALTH_PROBE_BLOCKED_DEPENDENCY',
  BLOCKED_INPUT:      'AUTHORIZED_STAGING_BACKEND_HEALTH_PROBE_BLOCKED_INPUT',
  FAIL:               'AUTHORIZED_STAGING_BACKEND_HEALTH_PROBE_FAIL',
});

// ── Dangerous defaults — all permanently false ────────────────────
function dangerousFlags() {
  return {
    staging_probe_contract_ready:  false,
    runtime_probe_executed:        false,
    backend_called:                false,
    network_called:                false,
    secrets_read:                  false,
    pass_gold_real_claimed:        false,
    pass_gold_real_achieved:       false,
    release_allowed:               false,
    deploy_allowed:                false,
    tag_allowed:                   false,
    stable_promotion_allowed:      false,
    production_touched:            false,
    rollback_execution_allowed:    false,
  };
}

// ── Endpoint validation ───────────────────────────────────────────
function validateEndpoint(ep) {
  if (typeof ep !== 'string' || ep.trim() === '') {
    return 'staging_endpoint must be a non-empty string';
  }
  if (!ep.startsWith('https://')) {
    return 'staging_endpoint must start with https://';
  }
  const lower = ep.toLowerCase();
  if (lower.includes('localhost')) {
    return 'staging_endpoint must not contain localhost';
  }
  if (lower.includes('127.0.0.1')) {
    return 'staging_endpoint must not contain 127.0.0.1';
  }
  if (lower.includes('production')) {
    return 'staging_endpoint must not contain "production"';
  }
  if (lower.includes('/prod') || lower.split('//')[1].startsWith('prod')) {
    return 'staging_endpoint must not contain "prod"';
  }
  return null;
}

export function build(input = {}) {
  const {
    rtp0_ready                  = false,
    rtp1_ready                  = false,
    rtp2_ready                  = false,
    human_authorization_explicit = false,
    staging_endpoint            = '',
    probe_scope                 = '',
    timeout_ms                  = 0,
    http_method                 = '',
    no_secrets_printed          = false,
    evidence_capture_plan       = '',
    rollback_noop_guaranteed    = false,
  } = input;

  // Deterministic hash — no Date.now, no random
  const evidence_hash = crypto.createHash('sha256')
    .update(JSON.stringify({
      module_version:              MODULE_VERSION,
      hash_schema:                 HASH_SCHEMA,
      rtp0_ready,
      rtp1_ready,
      rtp2_ready,
      human_authorization_explicit,
      staging_endpoint,
      probe_scope,
      timeout_ms,
      http_method,
      no_secrets_printed,
      evidence_capture_plan,
      rollback_noop_guaranteed,
    }))
    .digest('hex');

  const flags = dangerousFlags();

  // ── Dependency blocks ────────────────────────────────────────────
  if (!rtp0_ready) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_DEPENDENCY,
      ready: false,
      message: 'RTP-0 not ready. Complete RTP-0 before authorized staging probe.',
      evidence_hash,
      ...flags,
    };
  }

  if (!rtp1_ready) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_DEPENDENCY,
      ready: false,
      message: 'RTP-1 not ready. Complete RTP-1 before authorized staging probe.',
      evidence_hash,
      ...flags,
    };
  }

  if (!rtp2_ready) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_DEPENDENCY,
      ready: false,
      message: 'RTP-2 not ready. Complete RTP-2 before authorized staging probe.',
      evidence_hash,
      ...flags,
    };
  }

  // ── Authorization block ──────────────────────────────────────────
  if (!human_authorization_explicit) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      message: 'human_authorization_explicit must be true. Explicit named-operator GO required.',
      evidence_hash,
      ...flags,
    };
  }

  // ── Endpoint validation ──────────────────────────────────────────
  const endpointErr = validateEndpoint(staging_endpoint);
  if (endpointErr) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      message: endpointErr,
      evidence_hash,
      ...flags,
    };
  }

  // ── Method validation ────────────────────────────────────────────
  if (http_method !== 'GET') {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      message: 'http_method must be GET. Only GET is permitted for health probe.',
      evidence_hash,
      ...flags,
    };
  }

  // ── Timeout validation ───────────────────────────────────────────
  const ms = Number(timeout_ms);
  if (!Number.isFinite(ms) || ms < 1000) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      message: 'timeout_ms must be >= 1000.',
      evidence_hash,
      ...flags,
    };
  }
  if (ms > 10000) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      message: 'timeout_ms must be <= 10000.',
      evidence_hash,
      ...flags,
    };
  }

  // ── Probe scope ──────────────────────────────────────────────────
  if (typeof probe_scope !== 'string' || probe_scope.trim() === '') {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      message: 'probe_scope must be a non-empty string.',
      evidence_hash,
      ...flags,
    };
  }

  // ── Evidence capture plan ────────────────────────────────────────
  if (typeof evidence_capture_plan !== 'string' || evidence_capture_plan.trim() === '') {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      message: 'evidence_capture_plan must be a non-empty string.',
      evidence_hash,
      ...flags,
    };
  }

  // ── Safety invariants ────────────────────────────────────────────
  if (!no_secrets_printed) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      message: 'no_secrets_printed must be true. Confirm no secrets will be printed.',
      evidence_hash,
      ...flags,
    };
  }

  if (!rollback_noop_guaranteed) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      message: 'rollback_noop_guaranteed must be true. Confirm rollback is noop-safe.',
      evidence_hash,
      ...flags,
    };
  }

  // ── READY ────────────────────────────────────────────────────────
  return {
    module_version:               MODULE_VERSION,
    status:                       STATUSES.READY,
    ready:                        true,
    message:
      'RTP-3 authorized staging backend health probe contract ready. ' +
      'No probe executed. No runtime call performed. PASS GOLD REAL not claimed.',
    evidence_hash,
    // Contract fields
    staging_endpoint,
    http_method,
    timeout_ms:                   ms,
    probe_scope:                  probe_scope.trim(),
    evidence_capture_plan:        evidence_capture_plan.trim(),
    no_secrets_printed,
    rollback_noop_guaranteed,
    human_authorization_explicit,
    // All dangerous flags — staging_probe_contract_ready true only on READY path
    staging_probe_contract_ready: true,
    runtime_probe_executed:       false,
    backend_called:               false,
    network_called:               false,
    secrets_read:                 false,
    pass_gold_real_claimed:       false,
    pass_gold_real_achieved:      false,
    release_allowed:              false,
    deploy_allowed:               false,
    tag_allowed:                  false,
    stable_promotion_allowed:     false,
    production_touched:           false,
    rollback_execution_allowed:   false,
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

  // Dangerous flags — must always be false
  const alwaysFalse = [
    'runtime_probe_executed', 'backend_called', 'network_called', 'secrets_read',
    'pass_gold_real_claimed', 'pass_gold_real_achieved', 'release_allowed',
    'deploy_allowed', 'tag_allowed', 'stable_promotion_allowed',
    'production_touched', 'rollback_execution_allowed',
  ];
  for (const flag of alwaysFalse) {
    if (!(flag in result)) {
      issues.push('missing required field: ' + flag);
    } else if (result[flag] !== false) {
      issues.push('REGRA ABSOLUTA violation: ' + flag + ' must be false');
    }
  }

  // staging_probe_contract_ready must be boolean
  if (typeof result.staging_probe_contract_ready !== 'boolean') {
    issues.push('staging_probe_contract_ready must be boolean');
  }

  return { valid: issues.length === 0, issues };
}

export function render(result) {
  const statusIcon = result.ready ? '✅ READY' : '🔴 BLOCKED';

  const lines = [
    '# RTP-3 Authorized Staging Backend Health Probe Contract',
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
      '| `no_secrets_printed` | **' + result.no_secrets_printed + '** |',
      '| `rollback_noop_guaranteed` | **' + result.rollback_noop_guaranteed + '** |',
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
    '| `staging_probe_contract_ready` | **' + result.staging_probe_contract_ready + '** |',
    '| `runtime_probe_executed` | **' + result.runtime_probe_executed + '** |',
    '| `backend_called` | **' + result.backend_called + '** |',
    '| `network_called` | **' + result.network_called + '** |',
    '| `secrets_read` | **' + result.secrets_read + '** |',
    '| `production_touched` | **' + result.production_touched + '** |',
    '| `pass_gold_real_claimed` | **' + result.pass_gold_real_claimed + '** |',
    '| `pass_gold_real_achieved` | **' + result.pass_gold_real_achieved + '** |',
    '| `release_allowed` | **' + result.release_allowed + '** |',
    '| `deploy_allowed` | **' + result.deploy_allowed + '** |',
    '| `tag_allowed` | **' + result.tag_allowed + '** |',
    '| `stable_promotion_allowed` | **' + result.stable_promotion_allowed + '** |',
    '| `rollback_execution_allowed` | **' + result.rollback_execution_allowed + '** |',
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
    '- This module validates the contract only.',
    '  Actual probe execution requires separate future authorized operator action.',
    '- All dangerous flags remain `false` (REGRA ABSOLUTA).',
  );

  return lines.join('\n');
}

export default { STATUSES, build, validate, render };
