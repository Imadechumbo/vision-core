/**
 * VISION CORE V2.9.10
 * tools/software-factory/software-factory-staging-probe-operator-signoff-contract.mjs
 * RTP-6 — Staging Probe Operator Sign-Off Contract
 * ─────────────────────────────────────────────────────────────────
 * Records a declarative operator sign-off for a completed staging probe
 * evidence receipt. Does NOT execute the probe. Does NOT call backend.
 * Does NOT call endpoints. Does NOT make network calls. Does NOT read
 * secrets. Does NOT touch production. Does NOT store raw body or headers.
 * Does NOT print secrets.
 * NO child_process. NO fetch. NO XMLHttpRequest. NO http/https.
 * NO exec. NO spawn. NO PASS GOLD REAL claim. NO deploy. NO release.
 * NO tag.
 * ─────────────────────────────────────────────────────────────────
 */

import crypto from 'node:crypto';

const MODULE_VERSION = 'RTP-6';
const HASH_SCHEMA    = 'rtp6-staging-probe-operator-signoff-contract-v1';

export const STATUSES = Object.freeze({
  READY:              'STAGING_PROBE_OPERATOR_SIGNOFF_CONTRACT_READY',
  BLOCKED_DEPENDENCY: 'STAGING_PROBE_OPERATOR_SIGNOFF_CONTRACT_BLOCKED_DEPENDENCY',
  BLOCKED_INPUT:      'STAGING_PROBE_OPERATOR_SIGNOFF_CONTRACT_BLOCKED_INPUT',
  FAIL:               'STAGING_PROBE_OPERATOR_SIGNOFF_CONTRACT_FAIL',
});

// ── Always-false dangerous defaults ──────────────────────────────
function dangerousDefaults() {
  return {
    staging_probe_operator_signoff_ready: false,
    operator_signoff_recorded:            false,
    runtime_probe_executed:               false,
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

// ── evidence_receipt_hash validation ─────────────────────────────
function receiptHashError(hash) {
  if (typeof hash !== 'string' || hash.length !== 64) {
    return 'evidence_receipt_hash must be a 64-character hex string';
  }
  if (!/^[0-9a-f]{64}$/.test(hash)) {
    return 'evidence_receipt_hash must be a lowercase hex string (0-9, a-f)';
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
    rtp5_ready                   = false,
    human_operator_identity      = '',
    human_operator_go            = false,
    operator_review_scope        = '',
    evidence_receipt_hash        = '',
    evidence_receipt_ready       = false,
    evidence_sanitized           = false,
    no_secret_leak_detected      = false,
    raw_body_stored              = false,
    raw_headers_stored           = false,
    production_touched           = false,
    pass_gold_real_requested     = false,
  } = input;

  // Deterministic hash — no Date.now, no random
  const evidence_hash = crypto.createHash('sha256')
    .update(JSON.stringify({
      module_version:          MODULE_VERSION,
      hash_schema:             HASH_SCHEMA,
      rtp0_ready,
      rtp1_ready,
      rtp2_ready,
      rtp3_ready,
      rtp4_ready,
      rtp5_ready,
      human_operator_identity,
      human_operator_go,
      operator_review_scope,
      evidence_receipt_hash,
      evidence_receipt_ready,
      evidence_sanitized,
      no_secret_leak_detected,
      raw_body_stored,
      raw_headers_stored,
      production_touched,
      pass_gold_real_requested,
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
  if (!rtp5_ready) return blocked(STATUSES.BLOCKED_DEPENDENCY, 'RTP-5 not ready.');

  // ── Safety invariants: input flags that must be false ─────────
  if (raw_body_stored) {
    return blocked(STATUSES.BLOCKED_INPUT,
      'raw_body_stored must be false. Raw body must never be stored.');
  }
  if (raw_headers_stored) {
    return blocked(STATUSES.BLOCKED_INPUT,
      'raw_headers_stored must be false. Raw headers must never be stored.');
  }
  if (production_touched) {
    return blocked(STATUSES.BLOCKED_INPUT,
      'production_touched must be false. Production must not be touched.');
  }
  if (pass_gold_real_requested) {
    return blocked(STATUSES.BLOCKED_INPUT,
      'pass_gold_real_requested must be false. PASS GOLD REAL is not claimed at this stage.');
  }

  // ── Operator identity ─────────────────────────────────────────
  if (typeof human_operator_identity !== 'string' || human_operator_identity.trim() === '') {
    return blocked(STATUSES.BLOCKED_INPUT,
      'human_operator_identity must be a non-empty string.');
  }

  // ── Operator GO ───────────────────────────────────────────────
  if (!human_operator_go) {
    return blocked(STATUSES.BLOCKED_INPUT,
      'human_operator_go must be true. Named-operator explicit GO required.');
  }

  // ── Review scope ──────────────────────────────────────────────
  if (typeof operator_review_scope !== 'string' || operator_review_scope.trim() === '') {
    return blocked(STATUSES.BLOCKED_INPUT,
      'operator_review_scope must be a non-empty string.');
  }

  // ── Evidence receipt hash ─────────────────────────────────────
  const hashErr = receiptHashError(evidence_receipt_hash);
  if (hashErr) return blocked(STATUSES.BLOCKED_INPUT, hashErr);

  // ── Evidence receipt ready ────────────────────────────────────
  if (!evidence_receipt_ready) {
    return blocked(STATUSES.BLOCKED_INPUT,
      'evidence_receipt_ready must be true. RTP-5 evidence receipt must be ready before sign-off.');
  }

  // ── Evidence sanitized ────────────────────────────────────────
  if (!evidence_sanitized) {
    return blocked(STATUSES.BLOCKED_INPUT,
      'evidence_sanitized must be true. All captured evidence must be sanitized before sign-off.');
  }

  // ── No secret leak ────────────────────────────────────────────
  if (!no_secret_leak_detected) {
    return blocked(STATUSES.BLOCKED_INPUT,
      'no_secret_leak_detected must be true. Secret leak check must pass before sign-off.');
  }

  // ── READY ────────────────────────────────────────────────────
  return {
    module_version:                       MODULE_VERSION,
    status:                               STATUSES.READY,
    ready:                                true,
    message:
      'RTP-6 staging probe operator sign-off contract ready. ' +
      'No probe executed. No runtime call performed. PASS GOLD REAL not claimed. ' +
      'Raw body and headers are not stored. Secrets are not printed. ' +
      'Operator sign-off recorded declaratively.',
    evidence_hash,
    // Contract fields
    human_operator_identity:              human_operator_identity.trim(),
    human_operator_go,
    operator_review_scope:                operator_review_scope.trim(),
    evidence_receipt_hash,
    evidence_receipt_ready,
    evidence_sanitized,
    no_secret_leak_detected,
    // Dangerous flags
    staging_probe_operator_signoff_ready: true,
    operator_signoff_recorded:            true,
    runtime_probe_executed:               false,
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
    'runtime_probe_executed', 'backend_called', 'endpoint_called',
    'network_called', 'secrets_read', 'secrets_printed',
    'raw_body_stored', 'raw_headers_stored',
    'pass_gold_real_claimed', 'pass_gold_real_achieved',
    'release_allowed', 'deploy_allowed', 'tag_allowed',
    'stable_promotion_allowed', 'production_touched',
  ];
  for (const flag of alwaysFalse) {
    if (!(flag in result)) {
      issues.push('missing required field: ' + flag);
    } else if (result[flag] !== false) {
      issues.push('REGRA ABSOLUTA violation: ' + flag + ' must be false');
    }
  }

  if (typeof result.staging_probe_operator_signoff_ready !== 'boolean') {
    issues.push('staging_probe_operator_signoff_ready must be boolean');
  }

  if (typeof result.operator_signoff_recorded !== 'boolean') {
    issues.push('operator_signoff_recorded must be boolean');
  }

  return { valid: issues.length === 0, issues };
}

export function render(result) {
  const statusIcon = result.ready ? '✅ READY' : '🔴 BLOCKED';

  const lines = [
    '# RTP-6 Staging Probe Operator Sign-Off Contract',
    '',
    '> **Module:** ' + result.module_version,
    '> **Status:** ' + statusIcon,
    '> **Evidence Hash:** ' + (result.evidence_hash || 'N/A'),
    '',
    '---',
    '',
    '## Summary',
    '',
    'Declarative operator sign-off only — no probe executed. No backend called.',
    'No network called. No raw body or headers stored. No secrets printed.',
    'PASS GOLD REAL is **not claimed**. Production is **not touched**.',
    '',
    '**Message:** ' + result.message,
    '',
    '---',
  ];

  if (result.ready) {
    lines.push(
      '',
      '## Sign-Off Parameters',
      '',
      '| Field | Value |',
      '|-------|-------|',
      '| `human_operator_identity` | ' + result.human_operator_identity + ' |',
      '| `human_operator_go` | **' + result.human_operator_go + '** |',
      '| `operator_review_scope` | ' + result.operator_review_scope + ' |',
      '| `evidence_receipt_hash` | `' + result.evidence_receipt_hash + '` |',
      '| `evidence_receipt_ready` | **' + result.evidence_receipt_ready + '** |',
      '| `evidence_sanitized` | **' + result.evidence_sanitized + '** |',
      '| `no_secret_leak_detected` | **' + result.no_secret_leak_detected + '** |',
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
    '| `staging_probe_operator_signoff_ready` | **' + result.staging_probe_operator_signoff_ready + '** |',
    '| `operator_signoff_recorded` | **' + result.operator_signoff_recorded + '** |',
    '| `runtime_probe_executed` | **' + result.runtime_probe_executed + '** |',
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
    '- `operator_signoff_recorded = true` only on READY path — declarative record only.',
    '- `raw_body_stored = false` — raw body is never stored.',
    '- `raw_headers_stored = false` — raw headers are never stored.',
    '- `secrets_printed = false` — secrets are never printed.',
    '- All dangerous flags remain `false` (REGRA ABSOLUTA).',
  );

  return lines.join('\n');
}

export default { STATUSES, build, validate, render };
