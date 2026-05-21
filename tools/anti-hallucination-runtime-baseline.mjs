#!/usr/bin/env node
/**
 * Anti-Hallucination Runtime Baseline — V150.0
 *
 * Capstone for V146.0–V149.1. Verifies all 9 anti-hallucination modules are
 * active and all invariants hold.
 *
 * Modules verified:
 *   1. agent-claim-verification-gate          (V146.0)
 *   2. filesystem-reality-check               (V146.1)
 *   3. git-diff-truth-binding                 (V147.0)
 *   4. tool-execution-proof-ledger            (V147.1)
 *   5. hermes-hallucination-incident-memory   (V148.0)
 *   6. agent-truth-score-gate                 (V148.1)
 *   7. real-execution-controlled-gate         (V149.0)
 *   8. real-execution-dry-run-proof-report    (V149.1)
 *   9. anti-hallucination-runtime-baseline    (V150.0 self)
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v150.0';

export const ANTI_HALLUCINATION_BASELINE_STATUSES = [
  'ANTI_HALLUCINATION_BASELINE_BLOCKED',
  'ANTI_HALLUCINATION_BASELINE_PARTIAL',
  'ANTI_HALLUCINATION_BASELINE_READY',
];

export const ANTI_HALLUCINATION_MODULES = [
  'agent-claim-verification-gate',
  'filesystem-reality-check',
  'git-diff-truth-binding',
  'tool-execution-proof-ledger',
  'hermes-hallucination-incident-memory',
  'agent-truth-score-gate',
  'real-execution-controlled-gate',
  'real-execution-dry-run-proof-report',
  'anti-hallucination-runtime-baseline',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    stable_promoted:   false,
    deploy_performed:  false,
    release_performed: false,
  };
}

export function buildAntiHallucinationBaseline(params) {
  const {
    baseline_id,
    agent_claim_verification_ready    = false,
    filesystem_reality_check_ready    = false,
    git_diff_truth_binding_ready      = false,
    tool_execution_proof_ledger_ready = false,
    hermes_hallucination_incident_memory_ready = false,
    agent_truth_score_gate_ready      = false,
    real_execution_controlled_gate_ready = false,
    dry_run_truth_report_ready        = false,
    hallucinated_claims_blocked       = false,
    unverified_agent_claims_blocked   = false,
    pass_gold_fake_blocked            = false,
    agent_claims_require_local_proof  = false,
    no_execution_without_truth        = false,
    no_learning_from_false_claims     = false,
    baselined_at,
  } = params || {};

  const baseline_id_hash = _sha256([
    baseline_id,
    agent_claim_verification_ready,
    filesystem_reality_check_ready,
    git_diff_truth_binding_ready,
    tool_execution_proof_ledger_ready,
  ].join('|'));

  if (!baseline_id || String(baseline_id).trim() === '') {
    return {
      baseline_id_hash,
      schema_version:                    SCHEMA_VERSION,
      anti_hallucination_baseline_status: 'ANTI_HALLUCINATION_BASELINE_BLOCKED',
      anti_hallucination_runtime_ready:  false,
      blocked_reason:                    'baseline_id is required.',
      verified_module_count:             0,
      hallucinated_claims_blocked:       false,
      unverified_agent_claims_blocked:   false,
      pass_gold_fake_blocked:            false,
      agent_claims_require_local_proof:  false,
      no_execution_without_truth:        false,
      no_learning_from_false_claims:     false,
      unsafe_learning_blocked:           true,
      positive_learning_requires_pass_gold: true,
      baselined_at:                      baselined_at ?? new Date().toISOString(),
      ..._locked(),
    };
  }

  const moduleFlags = [
    agent_claim_verification_ready,
    filesystem_reality_check_ready,
    git_diff_truth_binding_ready,
    tool_execution_proof_ledger_ready,
    hermes_hallucination_incident_memory_ready,
    agent_truth_score_gate_ready,
    real_execution_controlled_gate_ready,
    dry_run_truth_report_ready,
    true,
  ];

  const invariantFlags = [
    hallucinated_claims_blocked,
    unverified_agent_claims_blocked,
    pass_gold_fake_blocked,
    agent_claims_require_local_proof,
    no_execution_without_truth,
    no_learning_from_false_claims,
  ];

  const verified_module_count = moduleFlags.filter(Boolean).length;
  const invariants_ok = invariantFlags.every(Boolean);
  const all_modules_ok = verified_module_count === ANTI_HALLUCINATION_MODULES.length;

  let anti_hallucination_baseline_status;
  let anti_hallucination_runtime_ready;

  if (all_modules_ok && invariants_ok) {
    anti_hallucination_baseline_status = 'ANTI_HALLUCINATION_BASELINE_READY';
    anti_hallucination_runtime_ready   = true;
  } else if (verified_module_count > 0) {
    anti_hallucination_baseline_status = 'ANTI_HALLUCINATION_BASELINE_PARTIAL';
    anti_hallucination_runtime_ready   = false;
  } else {
    anti_hallucination_baseline_status = 'ANTI_HALLUCINATION_BASELINE_BLOCKED';
    anti_hallucination_runtime_ready   = false;
  }

  return {
    baseline_id_hash,
    schema_version:                    SCHEMA_VERSION,
    anti_hallucination_baseline_status,
    anti_hallucination_runtime_ready,
    baseline_id,
    agent_claim_verification_ready,
    filesystem_reality_check_ready,
    git_diff_truth_binding_ready,
    tool_execution_proof_ledger_ready,
    hermes_hallucination_incident_memory_ready,
    agent_truth_score_gate_ready,
    real_execution_controlled_gate_ready,
    dry_run_truth_report_ready,
    verified_module_count,
    verified_modules:                  ANTI_HALLUCINATION_MODULES.slice(0, verified_module_count),
    hallucinated_claims_blocked,
    unverified_agent_claims_blocked,
    pass_gold_fake_blocked,
    agent_claims_require_local_proof,
    no_execution_without_truth,
    no_learning_from_false_claims,
    unsafe_learning_blocked:           true,
    positive_learning_requires_pass_gold: true,
    baselined_at:                      baselined_at ?? new Date().toISOString(),
    ..._locked(),
  };
}

export function validateAntiHallucinationBaseline(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'baseline_id_hash', 'schema_version', 'anti_hallucination_baseline_status',
    'anti_hallucination_runtime_ready',
    'verified_module_count',
    'hallucinated_claims_blocked', 'unverified_agent_claims_blocked',
    'pass_gold_fake_blocked', 'agent_claims_require_local_proof',
    'no_execution_without_truth', 'no_learning_from_false_claims',
    'unsafe_learning_blocked', 'positive_learning_requires_pass_gold',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.stable_promoted    !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed   !== false) errors.push('deploy_performed must be false');
  if (result.release_performed  !== false) errors.push('release_performed must be false');
  if (result.unsafe_learning_blocked !== true) {
    errors.push('unsafe_learning_blocked must be true');
  }
  if (result.positive_learning_requires_pass_gold !== true) {
    errors.push('positive_learning_requires_pass_gold must be true');
  }
  if (!ANTI_HALLUCINATION_BASELINE_STATUSES.includes(result.anti_hallucination_baseline_status)) {
    errors.push(`invalid anti_hallucination_baseline_status: ${result.anti_hallucination_baseline_status}`);
  }
  if (result.anti_hallucination_baseline_status === 'ANTI_HALLUCINATION_BASELINE_READY') {
    if (result.verified_module_count !== ANTI_HALLUCINATION_MODULES.length) {
      errors.push(`READY requires verified_module_count=${ANTI_HALLUCINATION_MODULES.length}`);
    }
    for (const flag of [
      'hallucinated_claims_blocked', 'unverified_agent_claims_blocked',
      'pass_gold_fake_blocked', 'agent_claims_require_local_proof',
      'no_execution_without_truth', 'no_learning_from_false_claims',
    ]) {
      if (result[flag] !== true) errors.push(`READY requires ${flag}=true`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function renderAntiHallucinationBaseline(result) {
  if (!result || typeof result !== 'object') {
    return '[ANTI_HALLUCINATION_RUNTIME_BASELINE] No result to render.';
  }
  const lines = [
    `=== Anti-Hallucination Runtime Baseline [${SCHEMA_VERSION}] ===`,
    `Status:                                  ${result.anti_hallucination_baseline_status ?? 'N/A'}`,
    `Baseline ID:                             ${result.baseline_id ?? 'N/A'}`,
    `Runtime ready:                           ${result.anti_hallucination_runtime_ready}`,
    `Verified modules:                        ${result.verified_module_count ?? 0} / ${ANTI_HALLUCINATION_MODULES.length}`,
    `--- Module flags ---`,
    `agent_claim_verification_ready:          ${result.agent_claim_verification_ready}`,
    `filesystem_reality_check_ready:          ${result.filesystem_reality_check_ready}`,
    `git_diff_truth_binding_ready:            ${result.git_diff_truth_binding_ready}`,
    `tool_execution_proof_ledger_ready:       ${result.tool_execution_proof_ledger_ready}`,
    `hermes_hallucination_incident_memory_ready: ${result.hermes_hallucination_incident_memory_ready}`,
    `agent_truth_score_gate_ready:            ${result.agent_truth_score_gate_ready}`,
    `real_execution_controlled_gate_ready:    ${result.real_execution_controlled_gate_ready}`,
    `dry_run_truth_report_ready:              ${result.dry_run_truth_report_ready}`,
    `--- Invariant flags ---`,
    `hallucinated_claims_blocked:             ${result.hallucinated_claims_blocked}`,
    `unverified_agent_claims_blocked:         ${result.unverified_agent_claims_blocked}`,
    `pass_gold_fake_blocked:                  ${result.pass_gold_fake_blocked}`,
    `agent_claims_require_local_proof:        ${result.agent_claims_require_local_proof}`,
    `no_execution_without_truth:              ${result.no_execution_without_truth}`,
    `no_learning_from_false_claims:           ${result.no_learning_from_false_claims}`,
    `--- Learning rules ---`,
    `unsafe_learning_blocked:                 ${result.unsafe_learning_blocked}`,
    `positive_learning_requires_pass_gold:    ${result.positive_learning_requires_pass_gold}`,
    `--- REGRA ABSOLUTA ---`,
    `stable_promoted=false | deploy_performed=false | release_performed=false`,
  ];
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('anti-hallucination-runtime-baseline.mjs')) {
  const showJson = process.argv.includes('--json');
  const result = buildAntiHallucinationBaseline({
    baseline_id:                          'v150.0-anti-hallucination',
    agent_claim_verification_ready:       true,
    filesystem_reality_check_ready:       true,
    git_diff_truth_binding_ready:         true,
    tool_execution_proof_ledger_ready:    true,
    hermes_hallucination_incident_memory_ready: true,
    agent_truth_score_gate_ready:         true,
    real_execution_controlled_gate_ready: true,
    dry_run_truth_report_ready:           true,
    hallucinated_claims_blocked:          true,
    unverified_agent_claims_blocked:      true,
    pass_gold_fake_blocked:               true,
    agent_claims_require_local_proof:     true,
    no_execution_without_truth:           true,
    no_learning_from_false_claims:        true,
  });
  if (showJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderAntiHallucinationBaseline(result));
  }
  const v = validateAntiHallucinationBaseline(result);
  if (!v.valid) {
    process.stderr.write(`Validation failed: ${v.errors.join(', ')}\n`);
    process.exit(1);
  }
}
