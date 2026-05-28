/**
 * VISION CORE V2.9.10
 * tools/real-validation/real-validation-1-prep-gate.mjs
 * REAL-VALIDATION-1-PREP — Preparation Gate
 * ─────────────────────────────────────────────────────────────────
 * Static document-presence gate only.
 * NO network calls. NO backend execution. NO secret reads.
 * NO deploy. NO release. NO tag. NO stable promotion.
 * NO PASS GOLD REAL claim. NO production touch.
 * NO child_process. NO fetch. NO XMLHttpRequest.
 * ─────────────────────────────────────────────────────────────────
 */

import { existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

// ── Required docs list ────────────────────────────────────────────
const REQUIRED_DOCS = [
  'docs/auth-saas-decision.md',
  'docs/api-connectors-decision.md',
  'docs/production-checklist.md',
  'docs/runtime-readiness-audit.md',
];

// ── Authority flags — all permanently false ───────────────────────
function makeAuthority() {
  return {
    pass_gold_real_claimed:         false,
    production_touched:             false,
    backend_called:                 false,
    backend_endpoint_called:        false,
    network_called:                 false,
    external_api_called:            false,
    secrets_read:                   false,
    env_read:                       false,
    deploy_allowed:                 false,
    release_allowed:                false,
    tag_allowed:                    false,
    stable_promotion_allowed:       false,
    production_deploy_allowed:      false,
    command_execution_allowed:      false,
    real_runtime_execution_allowed: false,
  };
}

// ─────────────────────────────────────────────────────────────────
// BUILD — static filesystem check only
// ─────────────────────────────────────────────────────────────────
export function buildRealValidation1PrepGate() {
  const docStatuses = REQUIRED_DOCS.map(function(doc) {
    return {
      path:    doc,
      present: existsSync(join(ROOT, doc)),
    };
  });

  const allPresent = docStatuses.every(function(d) { return d.present; });

  return {
    phase:                    'REAL-VALIDATION-1-PREP',
    generated:                new Date().toISOString(),
    required_docs:            REQUIRED_DOCS.slice(),
    doc_statuses:             docStatuses,
    all_required_docs_present: allPresent,
    rv1_prep_gate_passed:     allPresent,
    recommended_next_phase:   allPresent
      ? 'REAL-VALIDATION-1 (docs ready — human authorization required before runtime execution)'
      : 'Complete missing required docs before proceeding to REAL-VALIDATION-1',
    final_message:
      'REAL-VALIDATION-1 preparation gate complete. Runtime execution, production deploy, and PASS GOLD REAL remain blocked until explicit future authorization.',
    authority: makeAuthority(),
  };
}

// ─────────────────────────────────────────────────────────────────
// VALIDATE — structural + authority invariant check
// ─────────────────────────────────────────────────────────────────
export function validateRealValidation1PrepGate(result) {
  var issues = [];

  if (!result || typeof result !== 'object') {
    issues.push('result must be an object');
    return { valid: false, issues };
  }

  if (result.phase !== 'REAL-VALIDATION-1-PREP') {
    issues.push('phase must be REAL-VALIDATION-1-PREP');
  }

  if (!Array.isArray(result.required_docs) || result.required_docs.length !== 4) {
    issues.push('required_docs must be an array of exactly 4 entries');
  }

  if (!Array.isArray(result.doc_statuses) || result.doc_statuses.length !== 4) {
    issues.push('doc_statuses must be an array of exactly 4 entries');
  }

  var auth = result.authority;
  if (!auth || typeof auth !== 'object') {
    issues.push('authority block must be an object');
  } else {
    var dangerousFlags = [
      'pass_gold_real_claimed',
      'production_touched',
      'backend_called',
      'backend_endpoint_called',
      'network_called',
      'external_api_called',
      'secrets_read',
      'env_read',
      'deploy_allowed',
      'release_allowed',
      'tag_allowed',
      'stable_promotion_allowed',
      'production_deploy_allowed',
      'command_execution_allowed',
      'real_runtime_execution_allowed',
    ];
    for (var i = 0; i < dangerousFlags.length; i++) {
      var flag = dangerousFlags[i];
      if (auth[flag] === true) {
        issues.push('REGRA ABSOLUTA violation: authority.' + flag + ' must be false');
      }
    }
  }

  if (typeof result.final_message !== 'string' || !result.final_message.includes('remain blocked')) {
    issues.push('final_message must state that execution remains blocked');
  }

  return {
    valid:  issues.length === 0,
    issues: issues,
  };
}

// ─────────────────────────────────────────────────────────────────
// RENDER — markdown report
// ─────────────────────────────────────────────────────────────────
export function renderRealValidation1PrepGate(result) {
  var auth = result.authority;
  var lines = [
    '# REAL-VALIDATION-1 Preparation Gate',
    '',
    '> **Phase:** ' + result.phase,
    '> **Generated:** ' + result.generated,
    '',
    '---',
    '',
    '## Required Documents',
    '',
    '| Document | Status |',
    '|----------|--------|',
  ];

  for (var i = 0; i < result.doc_statuses.length; i++) {
    var ds = result.doc_statuses[i];
    var icon = ds.present ? '✅ PRESENT' : '❌ MISSING';
    lines.push('| `' + ds.path + '` | ' + icon + ' |');
  }

  lines.push(
    '',
    '**All required docs present:** ' + (result.all_required_docs_present ? '✅ YES' : '❌ NO'),
    '',
    '**Gate passed:** ' + (result.rv1_prep_gate_passed
      ? '✅ YES — docs present (does NOT authorize runtime execution or production deploy)'
      : '❌ NO — missing required documents'),
    '',
    '---',
    '',
    '## Recommended Next Phase',
    '',
    result.recommended_next_phase,
    '',
    '---',
    '',
    '## Authority Flags — REGRA ABSOLUTA (SEM PASS GOLD REAL)',
    '',
    '| Flag | Value |',
    '|------|-------|'
  );

  var authEntries = Object.keys(auth);
  for (var j = 0; j < authEntries.length; j++) {
    var flagName = authEntries[j];
    lines.push('| `' + flagName + '` | **' + auth[flagName] + '** |');
  }

  lines.push(
    '',
    '---',
    '',
    '## Non-Authority Statement',
    '',
    'REAL-VALIDATION-1-PREP is a **static document presence gate only**.',
    '',
    '- PASS GOLD REAL is **not claimed** (SEM PASS GOLD REAL).',
    '- Production is **not touched**.',
    '- No backend is called. No network is called. No secrets are read.',
    '- No deploy, release, tag, or stable promotion is performed.',
    '- `rv1_prep_gate_passed = true` means required docs are present only.',
    '  It does **not** authorize runtime execution, production deployment,',
    '  or any real validation action.',
    '- All authority flags remain `false` (REGRA ABSOLUTA).',
    '',
    '---',
    '',
    '## Final Message',
    '',
    result.final_message
  );

  return lines.join('\n');
}
