/**
 * VISION CORE V2.9.10
 * tools/real-validation/real-validation-5-runtime-smoke-execution-barrier.mjs
 * REAL-VALIDATION-5 — Runtime Smoke Execution Barrier
 * ─────────────────────────────────────────────────────────────────
 * Static execution barrier only. Performs static fs checks to determine
 * whether prerequisites from RV1–RV4 are met. Produces a barrier_result.
 * Does NOT execute any real smoke test. Does NOT call backend.
 * Does NOT call endpoints. Does NOT make network calls.
 * Does NOT read secrets. Does NOT touch production.
 * NO child_process. NO fetch. NO XMLHttpRequest. NO http/https.
 * NO PASS GOLD REAL claim. NO deploy. NO release. NO tag.
 * NEVER lifts execution_barrier_lifted. Uses only node:fs / node:path.
 * ─────────────────────────────────────────────────────────────────
 */

import { existsSync } from 'node:fs';
import { resolve }    from 'node:path';

// ── Authority flags — all permanently false ───────────────────────
function makeAuthority() {
  return {
    pass_gold_real_claimed:                false,
    production_touched:                    false,
    backend_called:                        false,
    backend_endpoint_called:               false,
    network_called:                        false,
    external_api_called:                   false,
    secrets_read:                          false,
    env_read:                              false,
    deploy_allowed:                        false,
    release_allowed:                       false,
    tag_allowed:                           false,
    stable_promotion_allowed:              false,
    production_deploy_allowed:             false,
    command_execution_allowed:             false,
    real_runtime_execution_allowed:        false,
    runtime_smoke_executed:                false,
    runtime_smoke_authorized:              false,
    execution_barrier_lifted:              false,
    backend_health_checked:                false,
    frontend_backend_integration_checked:  false,
    auth_enabled:                          false,
    oauth_enabled:                         false,
    billing_enabled:                       false,
    api_connectors_enabled:                false,
  };
}

// ─────────────────────────────────────────────────────────────────
// PREREQUISITE DEFINITIONS
// Static fs checks only — no network, no exec, no secrets.
// ─────────────────────────────────────────────────────────────────
var PREREQUISITE_DEFS = [
  {
    id:     'rv1_prep_gate_docs_auth_saas',
    label:  'docs/auth-saas-decision.md exists',
    check:  'docs/auth-saas-decision.md',
    notes:  'Required by RV1 prep gate. Presence check only — file content not read.',
  },
  {
    id:     'rv1_prep_gate_docs_api_connectors',
    label:  'docs/api-connectors-decision.md exists',
    check:  'docs/api-connectors-decision.md',
    notes:  'Required by RV1 prep gate. Presence check only — file content not read.',
  },
  {
    id:     'rv1_prep_gate_docs_production_checklist',
    label:  'docs/production-checklist.md exists',
    check:  'docs/production-checklist.md',
    notes:  'Required by RV1 prep gate. Presence check only — file content not read.',
  },
  {
    id:     'rv1_prep_gate_docs_runtime_readiness_audit',
    label:  'docs/runtime-readiness-audit.md exists',
    check:  'docs/runtime-readiness-audit.md',
    notes:  'Required by RV1 prep gate. Presence check only — file content not read.',
  },
  {
    id:     'rv1_module_present',
    label:  'tools/real-validation/real-validation-1-prep-gate.mjs exists',
    check:  'tools/real-validation/real-validation-1-prep-gate.mjs',
    notes:  'RV1 prep gate module must be committed before execution gate.',
  },
  {
    id:     'rv2_module_present',
    label:  'tools/real-validation/real-validation-2-runtime-smoke-plan.mjs exists',
    check:  'tools/real-validation/real-validation-2-runtime-smoke-plan.mjs',
    notes:  'RV2 smoke plan module must be committed before execution gate.',
  },
  {
    id:     'rv3_module_present',
    label:  'tools/real-validation/real-validation-3-runtime-smoke-authorization-gate.mjs exists',
    check:  'tools/real-validation/real-validation-3-runtime-smoke-authorization-gate.mjs',
    notes:  'RV3 authorization gate module must be committed before execution gate.',
  },
  {
    id:     'rv4_module_present',
    label:  'tools/real-validation/real-validation-4-runtime-smoke-dry-run-gate.mjs exists',
    check:  'tools/real-validation/real-validation-4-runtime-smoke-dry-run-gate.mjs',
    notes:  'RV4 dry-run gate module must be committed before execution gate.',
  },
  {
    id:     'backend_server_present',
    label:  'backend/server.js exists',
    check:  'backend/server.js',
    notes:  'Backend entry point must be present. File is NOT executed or read for secrets.',
  },
  {
    id:     'backend_env_example_present',
    label:  'backend/.env.example exists (NOT .env — no secrets read)',
    check:  'backend/.env.example',
    notes:  'Environment template must exist. Actual .env NOT checked — no secrets read.',
  },
];

var REQUIRED_FUTURE_AUTHORIZATIONS = [
  'Explicit human GO received in writing from named operator.',
  'All 10 RV3 authorization inputs satisfied and formally reviewed.',
  'RV4 pre-execution checklist fully completed and signed off.',
  'Staging environment confirmed reachable — no production endpoint included.',
  'Rollback plan approved and rollback drill completed before any probe.',
  'Secrets vault provisioned with least-privilege per-connector policies.',
  'Backend health endpoint confirmed on staging (not production) only.',
  'Evidence receipt format confirmed and output path agreed.',
];

// ─────────────────────────────────────────────────────────────────
// BUILD
// ─────────────────────────────────────────────────────────────────
export function buildRealValidation5RuntimeSmokeExecutionBarrier() {
  var repoRoot = resolve('.');

  var prerequisites = PREREQUISITE_DEFS.map(function(def) {
    var fullPath = resolve(repoRoot, def.check);
    var met = existsSync(fullPath);
    return {
      id:    def.id,
      label: def.label,
      met:   met,
      check: def.check + ' (fs.existsSync — NOT read, NOT executed)',
      notes: def.notes,
    };
  });

  var blockingReasons = [];
  for (var i = 0; i < prerequisites.length; i++) {
    if (!prerequisites[i].met) {
      blockingReasons.push('MISSING: ' + prerequisites[i].check + ' — ' + prerequisites[i].label);
    }
  }

  var allPrerequisitesMet = blockingReasons.length === 0;

  var barrierResult = allPrerequisitesMet
    ? 'PREREQUISITES_MET_AWAITING_AUTHORIZATION'
    : 'BLOCKED';

  return {
    phase:                           'REAL-VALIDATION-5-RUNTIME-SMOKE-EXECUTION-BARRIER',
    generated:                       new Date().toISOString(),
    gate_type:                       'STATIC_EXECUTION_BARRIER',
    execution_barrier_active:        true,   // STATUS: barrier IS active and blocking execution
    execution_barrier_lifted:        false,  // always false — never lifted by this module
    runtime_smoke_execution_allowed: false,  // always false
    runtime_smoke_executed:          false,
    backend_called:                  false,
    backend_endpoint_called:         false,
    network_called:                  false,
    external_api_called:             false,
    production_touched:              false,
    pass_gold_real_claimed:          false,
    prerequisites_checked:           prerequisites,
    blocking_reasons:                blockingReasons,
    all_prerequisites_met:           allPrerequisitesMet,
    barrier_result:                  barrierResult,
    required_future_authorizations:  REQUIRED_FUTURE_AUTHORIZATIONS.slice(),
    next_phase_recommendation:
      'REAL-VALIDATION-5 execution barrier complete. When all prerequisites are met ' +
      'AND all RV3 authorization inputs are satisfied AND explicit human GO is received, ' +
      'proceed to REAL-VALIDATION-6 (actual backend health probe — full authorization required).',
    final_message:
      'REAL-VALIDATION-5 execution barrier complete. real runtime execution remains blocked ' +
      'until all prerequisites are met, all authorization inputs are satisfied, and explicit ' +
      'human GO is granted by a named operator. No backend called. No network called. ' +
      'No production touched. PASS GOLD REAL not claimed.',
    authority: makeAuthority(),
  };
}

// ─────────────────────────────────────────────────────────────────
// VALIDATE
// ─────────────────────────────────────────────────────────────────
export function validateRealValidation5RuntimeSmokeExecutionBarrier(result) {
  var issues = [];

  if (!result || typeof result !== 'object') {
    issues.push('result must be an object');
    return { valid: false, issues: issues };
  }

  if (result.phase !== 'REAL-VALIDATION-5-RUNTIME-SMOKE-EXECUTION-BARRIER') {
    issues.push('phase must be REAL-VALIDATION-5-RUNTIME-SMOKE-EXECUTION-BARRIER');
  }

  if (result.gate_type !== 'STATIC_EXECUTION_BARRIER') {
    issues.push('gate_type must be STATIC_EXECUTION_BARRIER');
  }

  if (result.execution_barrier_active !== true) {
    issues.push('execution_barrier_active must be true (barrier is active/safe state)');
  }

  if (result.execution_barrier_lifted !== false) {
    issues.push('execution_barrier_lifted must be false (REGRA ABSOLUTA)');
  }

  if (result.runtime_smoke_execution_allowed !== false) {
    issues.push('runtime_smoke_execution_allowed must be false');
  }

  if (result.runtime_smoke_executed !== false) {
    issues.push('runtime_smoke_executed must be false');
  }

  if (result.backend_called !== false) {
    issues.push('backend_called must be false');
  }

  if (result.network_called !== false) {
    issues.push('network_called must be false');
  }

  if (result.production_touched !== false) {
    issues.push('production_touched must be false');
  }

  if (result.pass_gold_real_claimed !== false) {
    issues.push('pass_gold_real_claimed must be false');
  }

  if (!Array.isArray(result.prerequisites_checked) || result.prerequisites_checked.length < 10) {
    issues.push('prerequisites_checked must be array with >= 10 entries');
  } else {
    for (var i = 0; i < result.prerequisites_checked.length; i++) {
      var p = result.prerequisites_checked[i];
      if (typeof p.id !== 'string' ||
          typeof p.label !== 'string' ||
          typeof p.met !== 'boolean' ||
          typeof p.check !== 'string' ||
          typeof p.notes !== 'string') {
        issues.push('prerequisites_checked[' + i + '] missing required fields (id/label/met/check/notes)');
      }
    }
  }

  if (!Array.isArray(result.blocking_reasons)) {
    issues.push('blocking_reasons must be an array');
  }

  if (typeof result.all_prerequisites_met !== 'boolean') {
    issues.push('all_prerequisites_met must be a boolean');
  }

  if (typeof result.barrier_result !== 'string') {
    issues.push('barrier_result must be a string');
  } else if (result.barrier_result === 'AUTHORIZED' || result.barrier_result === 'LIFTED') {
    issues.push('barrier_result must never be AUTHORIZED or LIFTED');
  } else if (result.barrier_result !== 'BLOCKED' &&
             result.barrier_result !== 'PREREQUISITES_MET_AWAITING_AUTHORIZATION') {
    issues.push('barrier_result must be BLOCKED or PREREQUISITES_MET_AWAITING_AUTHORIZATION');
  }

  if (!Array.isArray(result.required_future_authorizations) ||
      result.required_future_authorizations.length < 3) {
    issues.push('required_future_authorizations must be array with >= 3 entries');
  }

  var auth = result.authority;
  if (!auth || typeof auth !== 'object') {
    issues.push('authority block must be an object');
  } else {
    var keys = Object.keys(auth);
    for (var j = 0; j < keys.length; j++) {
      if (auth[keys[j]] === true) {
        issues.push('REGRA ABSOLUTA violation: authority.' + keys[j] + ' must be false');
      }
    }
  }

  if (typeof result.final_message !== 'string' ||
      result.final_message.indexOf('execution barrier complete') === -1 ||
      result.final_message.indexOf('real runtime execution remains blocked') === -1) {
    issues.push(
      'final_message must include "execution barrier complete" and ' +
      '"real runtime execution remains blocked"'
    );
  }

  return {
    valid:  issues.length === 0,
    issues: issues,
  };
}

// ─────────────────────────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────────────────────────
export function renderRealValidation5RuntimeSmokeExecutionBarrier(result) {
  var auth = result.authority;

  var barrierIcon = result.barrier_result === 'BLOCKED' ? '🔴 BLOCKED' : '🟡 PREREQUISITES_MET_AWAITING_AUTHORIZATION';

  var lines = [
    '# REAL-VALIDATION-5 Runtime Smoke Execution Barrier',
    '',
    '> **Phase:** ' + result.phase,
    '> **Generated:** ' + result.generated,
    '> **Gate type:** ' + result.gate_type,
    '> **Barrier result:** ' + barrierIcon,
    '',
    '---',
    '',
    '## Summary',
    '',
    'This is a **static execution barrier only** (SEM PASS GOLD REAL).',
    'No smoke test is executed. No backend is called. No network is called.',
    'Production is **not touched**. PASS GOLD REAL is **not claimed**.',
    'Real runtime execution remains blocked.',
    '',
    '| Flag | Value |',
    '|------|-------|',
    '| `execution_barrier_active` | **' + result.execution_barrier_active + '** (barrier IS active — safe state) |',
    '| `execution_barrier_lifted` | **' + result.execution_barrier_lifted + '** (never lifted) |',
    '| `runtime_smoke_execution_allowed` | **' + result.runtime_smoke_execution_allowed + '** |',
    '| `runtime_smoke_executed` | **' + result.runtime_smoke_executed + '** |',
    '| `backend_called` | **' + result.backend_called + '** |',
    '| `network_called` | **' + result.network_called + '** |',
    '| `production_touched` | **' + result.production_touched + '** |',
    '| `pass_gold_real_claimed` | **' + result.pass_gold_real_claimed + '** |',
    '| `all_prerequisites_met` | **' + result.all_prerequisites_met + '** |',
    '| `barrier_result` | **' + result.barrier_result + '** |',
    '',
    '---',
    '',
    '## Prerequisites Checked (Static fs Only — NOT Executed)',
    '',
    '| # | ID | Label | Met | Check |',
    '|---|----|-------|-----|-------|',
  ];

  for (var i = 0; i < result.prerequisites_checked.length; i++) {
    var p = result.prerequisites_checked[i];
    var metIcon = p.met ? '✅' : '❌';
    lines.push(
      '| ' + (i + 1) + ' | `' + p.id + '` | ' +
      p.label.replace(/\|/g, '/') + ' | ' +
      metIcon + ' ' + p.met + ' | ' +
      p.check.replace(/\|/g, '/') + ' |'
    );
  }

  if (result.blocking_reasons.length > 0) {
    lines.push(
      '',
      '---',
      '',
      '## Blocking Reasons',
      ''
    );
    for (var j = 0; j < result.blocking_reasons.length; j++) {
      lines.push('- ❌ ' + result.blocking_reasons[j]);
    }
  } else {
    lines.push(
      '',
      '---',
      '',
      '## Blocking Reasons',
      '',
      '✅ No blocking reasons — all prerequisites met.',
      '',
      '> **Note:** Prerequisites met does NOT authorize runtime execution.',
      '> All required future authorizations must be satisfied separately.'
    );
  }

  lines.push(
    '',
    '---',
    '',
    '## Required Future Authorizations (Before Any Real Execution)',
    ''
  );
  for (var k = 0; k < result.required_future_authorizations.length; k++) {
    lines.push('- [ ] ' + result.required_future_authorizations[k]);
  }

  lines.push(
    '',
    '---',
    '',
    '## Authority Flags — REGRA ABSOLUTA (SEM PASS GOLD REAL)',
    '',
    '| Flag | Value |',
    '|------|-------|'
  );

  var authKeys = Object.keys(auth);
  for (var m = 0; m < authKeys.length; m++) {
    lines.push('| `' + authKeys[m] + '` | **' + auth[authKeys[m]] + '** |');
  }

  lines.push(
    '',
    '---',
    '',
    '## Non-Authority Statement',
    '',
    'REAL-VALIDATION-5 is a **static execution barrier only** (SEM PASS GOLD REAL).',
    '',
    '- PASS GOLD REAL is **not claimed**.',
    '- Production is **not touched**.',
    '- No backend is called. No network is called. No secrets are read.',
    '- `execution_barrier_active = true` means the barrier IS active — this is the safe state.',
    '  It does NOT mean execution is authorized.',
    '- `execution_barrier_lifted = false` always — never lifted by this module.',
    '- `runtime_smoke_execution_allowed = false` always — no execution authorized.',
    '- `barrier_result = PREREQUISITES_MET_AWAITING_AUTHORIZATION` means static fs checks passed.',
    '  It does NOT authorize, unlock, or permit any real execution.',
    '- All authority flags remain `false` (REGRA ABSOLUTA).',
    '- Real runtime execution remains blocked until all required future authorizations are granted.',
    '',
    '---',
    '',
    '## Next Phase Recommendation',
    '',
    result.next_phase_recommendation,
    '',
    '---',
    '',
    '## Final Message',
    '',
    result.final_message
  );

  return lines.join('\n');
}
