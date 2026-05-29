/**
 * VISION CORE V2.9.10
 * tools/software-factory/software-factory-local-runtime-probe-evidence-binder.mjs
 * RTP-1 — Local Runtime Probe Evidence Binder
 * ─────────────────────────────────────────────────────────────────
 * Static evidence binder only. Structures local declarative evidence for
 * future supervised runtime probe execution. Does NOT execute runtime.
 * Does NOT call backend. Does NOT call endpoints. Does NOT make network
 * calls. Does NOT read secrets. Does NOT touch production.
 * NO child_process. NO fetch. NO XMLHttpRequest. NO http/https.
 * NO PASS GOLD REAL claim. NO deploy. NO release. NO tag.
 * ─────────────────────────────────────────────────────────────────
 */

import crypto from 'node:crypto';

const MODULE_VERSION = 'RTP-1';

export const STATUSES = Object.freeze({
  READY:               'LOCAL_RUNTIME_PROBE_EVIDENCE_BINDER_READY',
  BLOCKED_INPUT:       'LOCAL_RUNTIME_PROBE_EVIDENCE_BINDER_BLOCKED_INPUT',
  BLOCKED_DEPENDENCY:  'LOCAL_RUNTIME_PROBE_EVIDENCE_BINDER_BLOCKED_DEPENDENCY',
  FAIL:                'LOCAL_RUNTIME_PROBE_EVIDENCE_BINDER_FAIL',
});

export function build(input = {}) {
  const {
    rtp0_ready                   = false,
    local_probe_plan_declared    = false,
    evidence_source              = '',
    operator_scope               = '',
    runtime_target_declared      = false,
  } = input;

  // Deterministic hash — no timestamps, no random values
  const evidence_hash = crypto.createHash('sha256')
    .update(JSON.stringify({
      module_version:           MODULE_VERSION,
      rtp0_ready,
      local_probe_plan_declared,
      evidence_source,
      operator_scope,
      runtime_target_declared,
      hash_schema:              'rtp1-local-runtime-probe-evidence-binder-v1',
    }))
    .digest('hex');

  // ── Blocking: dependency ────────────────────────────────────────
  if (!rtp0_ready) {
    return {
      module_version:                  MODULE_VERSION,
      status:                          STATUSES.BLOCKED_DEPENDENCY,
      ready:                           false,
      blocked_dependency:              true,
      blocked_input:                   false,
      message:                         'RTP-0 not ready. Complete RTP-0 before binding local evidence.',
      evidence_hash,
      runtime_execution_authorized:    false,
      backend_called:                  false,
      endpoint_called:                 false,
      network_called:                  false,
      secrets_read:                    false,
      pass_gold_real_achieved:         false,
      pass_gold_real_claimed:          false,
      release_allowed:                 false,
      deploy_allowed:                  false,
      tag_allowed:                     false,
      stable_promotion_allowed:        false,
      production_touched:              false,
    };
  }

  // ── Blocking: probe plan not declared ───────────────────────────
  if (!local_probe_plan_declared) {
    return {
      module_version:                  MODULE_VERSION,
      status:                          STATUSES.BLOCKED_INPUT,
      ready:                           false,
      blocked_dependency:              false,
      blocked_input:                   true,
      message:                         'local_probe_plan_declared must be true before binding evidence.',
      evidence_hash,
      runtime_execution_authorized:    false,
      backend_called:                  false,
      endpoint_called:                 false,
      network_called:                  false,
      secrets_read:                    false,
      pass_gold_real_achieved:         false,
      pass_gold_real_claimed:          false,
      release_allowed:                 false,
      deploy_allowed:                  false,
      tag_allowed:                     false,
      stable_promotion_allowed:        false,
      production_touched:              false,
    };
  }

  // ── Blocking: evidence_source empty ────────────────────────────
  if (!evidence_source || String(evidence_source).trim() === '') {
    return {
      module_version:                  MODULE_VERSION,
      status:                          STATUSES.BLOCKED_INPUT,
      ready:                           false,
      blocked_dependency:              false,
      blocked_input:                   true,
      message:                         'evidence_source must not be empty.',
      evidence_hash,
      runtime_execution_authorized:    false,
      backend_called:                  false,
      endpoint_called:                 false,
      network_called:                  false,
      secrets_read:                    false,
      pass_gold_real_achieved:         false,
      pass_gold_real_claimed:          false,
      release_allowed:                 false,
      deploy_allowed:                  false,
      tag_allowed:                     false,
      stable_promotion_allowed:        false,
      production_touched:              false,
    };
  }

  // ── Ready ───────────────────────────────────────────────────────
  return {
    module_version:                MODULE_VERSION,
    status:                        STATUSES.READY,
    ready:                         true,
    blocked_dependency:            false,
    blocked_input:                 false,
    message:
      'RTP-1 local runtime probe evidence binder prepared. ' +
      'No runtime execution performed. PASS GOLD REAL not claimed.',
    evidence_hash,
    evidence_source:               String(evidence_source).trim(),
    operator_scope:                String(operator_scope).trim(),
    runtime_target_declared,
    bound_at:                      'static-bind-no-timestamp',
    // ── All dangerous flags — permanently false ──────────────────
    runtime_execution_authorized:  false,
    backend_called:                false,
    endpoint_called:               false,
    network_called:                false,
    secrets_read:                  false,
    pass_gold_real_achieved:       false,
    pass_gold_real_claimed:        false,
    release_allowed:               false,
    deploy_allowed:                false,
    tag_allowed:                   false,
    stable_promotion_allowed:      false,
    production_touched:            false,
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

  // Dangerous flags — all must be false
  const dangerous = [
    'runtime_execution_authorized', 'backend_called', 'endpoint_called',
    'network_called', 'secrets_read', 'pass_gold_real_achieved',
    'pass_gold_real_claimed', 'release_allowed', 'deploy_allowed',
    'tag_allowed', 'stable_promotion_allowed', 'production_touched',
  ];
  for (const flag of dangerous) {
    if (!(flag in result)) {
      issues.push('missing required field: ' + flag);
    } else if (result[flag] !== false) {
      issues.push('REGRA ABSOLUTA violation: ' + flag + ' must be false');
    }
  }

  return { valid: issues.length === 0, issues };
}

export function render(result) {
  const statusIcon = result.ready ? '✅ READY' : '🔴 BLOCKED';
  const lines = [
    '# RTP-1 Local Runtime Probe Evidence Binder',
    '',
    '> **Module:** ' + result.module_version,
    '> **Status:** ' + statusIcon,
    '> **Evidence Hash:** ' + (result.evidence_hash || 'N/A'),
    '',
    '---',
    '',
    '## Summary',
    '',
    'Static evidence binder only — no runtime execution performed.',
    'PASS GOLD REAL is **not claimed**. Production is **not touched**.',
    'All dangerous flags remain `false`.',
    '',
    '**Message:** ' + result.message,
    '',
    '---',
    '',
    '## Control Flags — REGRA ABSOLUTA (SEM PASS GOLD REAL)',
    '',
    '| Flag | Value |',
    '|------|-------|',
    '| `runtime_execution_authorized` | **' + result.runtime_execution_authorized + '** |',
    '| `backend_called` | **' + result.backend_called + '** |',
    '| `endpoint_called` | **' + result.endpoint_called + '** |',
    '| `network_called` | **' + result.network_called + '** |',
    '| `secrets_read` | **' + result.secrets_read + '** |',
    '| `pass_gold_real_achieved` | **' + result.pass_gold_real_achieved + '** |',
    '| `pass_gold_real_claimed` | **' + result.pass_gold_real_claimed + '** |',
    '| `release_allowed` | **' + result.release_allowed + '** |',
    '| `deploy_allowed` | **' + result.deploy_allowed + '** |',
    '| `tag_allowed` | **' + result.tag_allowed + '** |',
    '| `stable_promotion_allowed` | **' + result.stable_promotion_allowed + '** |',
    '| `production_touched` | **' + result.production_touched + '** |',
    '',
    '---',
    '',
    '## Non-Authority Statement',
    '',
    '- PASS GOLD REAL is **not claimed**.',
    '- Production is **not touched**.',
    '- No backend called. No network called. No secrets read.',
    '- No runtime execution performed.',
    '- All dangerous flags remain `false` (REGRA ABSOLUTA).',
    '- SEM PASS GOLD REAL — não promove, não libera, não marca stable.',
  ];

  if (result.ready) {
    lines.push(
      '',
      '---',
      '',
      '## Bound Evidence',
      '',
      '| Field | Value |',
      '|-------|-------|',
      '| `evidence_source` | ' + result.evidence_source + ' |',
      '| `operator_scope` | ' + result.operator_scope + ' |',
      '| `runtime_target_declared` | **' + result.runtime_target_declared + '** |',
      '| `bound_at` | ' + result.bound_at + ' |',
    );
  }

  return lines.join('\n');
}

export default { STATUSES, build, validate, render };
