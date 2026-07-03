#!/usr/bin/env node
/**
 * Unlock Evidence Review Package — V62.1
 *
 * Builds an evidence review package for unlock governance.
 * Review-only. Does NOT execute unlock, release, tag, stable, or deploy.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 * production_execution_locked=true always. unlock_executed=false always.
 * future_execution_phase_required=true always.
 */

import { sha256, makeLockedFlags } from './_shared/gate-kit.mjs';

const SCHEMA_VERSION = 'v62.1';

export const EVIDENCE_REVIEW_STATUSES = [
  'EVIDENCE_REVIEW_BLOCKED_CONTRACT',
  'EVIDENCE_REVIEW_BLOCKED_AUTHORITY',
  'EVIDENCE_REVIEW_BLOCKED_BINDING',
  'EVIDENCE_REVIEW_BLOCKED_DECISION',
  'EVIDENCE_REVIEW_BLOCKED_BASELINE',
  'EVIDENCE_REVIEW_READY',
];

export const EVIDENCE_REVIEW_SOURCES = [
  'go-core',
  'real_gate_baseline',
  'unlock_contract',
  'unlock_authority',
  'unlock_binding',
  'unlock_decision',
];

function _sha256(input) {
  return sha256(input);
}

function _locked() {
  return {
    ...makeLockedFlags([
      'deploy_allowed',
      'promotion_allowed',
      'stable_allowed',
      'tag_allowed',
      'release_execution_allowed',
      'release_performed',
      'tag_created',
      'stable_promoted',
      'deploy_performed',
      'unlock_executed',
    ]),
    production_execution_locked:     true,
    unlock_review_only:              true,
    future_execution_phase_required: true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:                    SCHEMA_VERSION,
    evidence_review_status:            status,
    evidence_review_ready:             false,
    blocking_reason,
    ...extra,
    ..._locked(),
    deploy_allowed:                    false,
    promotion_allowed:                 false,
    stable_allowed:                    false,
    tag_allowed:                       false,
    release_execution_allowed:         false,
    release_performed:                 false,
    tag_created:                       false,
    stable_promoted:                   false,
    deploy_performed:                  false,
    production_execution_locked:       true,
    unlock_executed:                   false,
    unlock_review_only:                true,
    future_execution_phase_required:   true,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Build unlock evidence review package from all governance artifacts.
 */
export function buildUnlockEvidenceReviewPackage(params = {}) {
  const {
    unlock_contract,
    unlock_authority,
    unlock_binding,
    unlock_decision,
    real_gate_baseline,
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (fixture_mode) {
    const package_id = _sha256(`fixture-evidence-review-package:${now}`).slice(0, 24);
    const package_hash = _sha256(`fixture-evidence-hash:${package_id}:${now}`).slice(0, 48);
    return {
      schema_version:                    SCHEMA_VERSION,
      package_id,
      package_hash,
      evidence_review_status:            'EVIDENCE_REVIEW_READY',
      evidence_review_ready:             true,
      evidence_sources:                  EVIDENCE_REVIEW_SOURCES,
      artifacts: {
        unlock_contract_id:              'fixture-unlock-contract-id',
        unlock_authority_id:             'fixture-unlock-authority-id',
        binding_id:                      'fixture-binding-id',
        decision_id:                     'fixture-decision-id',
        baseline_version:                'v60.0',
      },
      unlock_review_summary: {
        contract_valid:                  true,
        authority_valid:                 true,
        binding_ready:                   true,
        decision_ready_review:           true,
        baseline_ready:                  true,
        evidence_complete:               true,
      },
      created_at:                        now,
      blocking_reason:                   null,
      ..._locked(),
    };
  }

  // Contract required
  if (!unlock_contract || unlock_contract.contract_ready !== true) {
    return _blocked('EVIDENCE_REVIEW_BLOCKED_CONTRACT', 'unlock_contract_not_ready', {
      contract_status: unlock_contract?.contract_status ?? null,
    });
  }

  // Authority required
  if (!unlock_authority || unlock_authority.authority_ready !== true) {
    return _blocked('EVIDENCE_REVIEW_BLOCKED_AUTHORITY', 'unlock_authority_not_ready', {
      authority_status: unlock_authority?.authority_status ?? null,
    });
  }

  // Binding required
  if (!unlock_binding || unlock_binding.binding_ready !== true) {
    return _blocked('EVIDENCE_REVIEW_BLOCKED_BINDING', 'unlock_binding_not_ready', {
      binding_status: unlock_binding?.binding_status ?? null,
    });
  }

  // Decision required
  if (!unlock_decision || unlock_decision.unlock_review_ready !== true) {
    return _blocked('EVIDENCE_REVIEW_BLOCKED_DECISION', 'unlock_decision_not_ready', {
      decision_status: unlock_decision?.unlock_decision_status ?? null,
    });
  }

  // Baseline required
  if (!real_gate_baseline || real_gate_baseline.baseline_ready !== true) {
    return _blocked('EVIDENCE_REVIEW_BLOCKED_BASELINE', 'real_gate_baseline_not_ready', {
      baseline_status: real_gate_baseline?.baseline_status ?? null,
    });
  }

  const package_id = _sha256([
    'evidence-review-package',
    unlock_contract.unlock_contract_id ?? '',
    unlock_authority.unlock_authority_id ?? '',
    unlock_binding.binding_id ?? '',
    unlock_decision.decision_id ?? '',
    now,
  ].join(':')).slice(0, 24);

  const package_hash = _sha256([
    package_id,
    unlock_contract.unlock_contract_id ?? '',
    unlock_authority.unlock_authority_id ?? '',
    unlock_binding.binding_id ?? '',
    unlock_decision.decision_id ?? '',
    real_gate_baseline.baseline_version ?? '',
  ].join(':')).slice(0, 48);

  return {
    schema_version:                    SCHEMA_VERSION,
    package_id,
    package_hash,
    evidence_review_status:            'EVIDENCE_REVIEW_READY',
    evidence_review_ready:             true,
    evidence_sources:                  EVIDENCE_REVIEW_SOURCES,
    artifacts: {
      unlock_contract_id:              unlock_contract.unlock_contract_id ?? null,
      unlock_authority_id:             unlock_authority.unlock_authority_id ?? null,
      binding_id:                      unlock_binding.binding_id ?? null,
      decision_id:                     unlock_decision.decision_id ?? null,
      baseline_version:                real_gate_baseline.baseline_version ?? null,
    },
    unlock_review_summary: {
      contract_valid:                  true,
      authority_valid:                 true,
      binding_ready:                   true,
      decision_ready_review:           true,
      baseline_ready:                  true,
      evidence_complete:               true,
    },
    created_at:                        now,
    blocking_reason:                   null,
    ..._locked(),
  };
}

/**
 * Validate an unlock evidence review package.
 */
export function validateUnlockEvidenceReviewPackage(pkg) {
  if (!pkg) return _blocked('EVIDENCE_REVIEW_BLOCKED_CONTRACT', 'package_null');

  if (pkg.schema_version !== SCHEMA_VERSION) {
    return _blocked('EVIDENCE_REVIEW_BLOCKED_CONTRACT', `schema_version_mismatch:expected_${SCHEMA_VERSION}`);
  }

  if (!pkg.package_id || typeof pkg.package_id !== 'string') {
    return _blocked('EVIDENCE_REVIEW_BLOCKED_CONTRACT', 'package_id_missing');
  }

  if (pkg.production_execution_locked !== true) {
    return _blocked('EVIDENCE_REVIEW_BLOCKED_CONTRACT', 'production_execution_locked_must_be_true');
  }

  if (pkg.unlock_executed !== false) {
    return _blocked('EVIDENCE_REVIEW_BLOCKED_CONTRACT', 'unlock_executed_must_be_false');
  }

  if (pkg.future_execution_phase_required !== true) {
    return _blocked('EVIDENCE_REVIEW_BLOCKED_CONTRACT', 'future_execution_phase_required_must_be_true');
  }

  return { valid: true, package_id: pkg.package_id, ..._locked() };
}

/**
 * Render a human-readable evidence review package summary.
 */
export function renderUnlockEvidenceReviewPackage(pkg) {
  if (!pkg) return 'evidence_review_package: null';
  const lines = [
    `evidence_review_status         : ${pkg.evidence_review_status ?? 'UNKNOWN'}`,
    `package_id                     : ${pkg.package_id ?? 'none'}`,
    `package_hash                   : ${pkg.package_hash ?? 'none'}`,
    `evidence_review_ready          : ${pkg.evidence_review_ready ?? false}`,
    `evidence_sources               : ${pkg.evidence_sources?.length ?? 0}`,
    `production_execution_locked    : true`,
    `unlock_executed                : false`,
    `future_execution_phase_required: true`,
    `unlock_review_only             : true`,
    `blocking_reason                : ${pkg.blocking_reason ?? 'none'}`,
  ];
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('unlock-evidence-review-package.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = buildUnlockEvidenceReviewPackage({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderUnlockEvidenceReviewPackage(result));
  }

  process.exit(result.evidence_review_ready ? 0 : 1);
}
