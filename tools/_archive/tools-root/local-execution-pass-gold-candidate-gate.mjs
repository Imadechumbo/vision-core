#!/usr/bin/env node
/**
 * Local Execution PASS GOLD Candidate Gate — V165.0
 * Evaluates a sealed local execution evidence package for PASS GOLD candidacy.
 * No production, no deploy, no stable, no release. Local-only candidacy assessment.
 */

import { createHash } from 'crypto';

export const LOCAL_EXECUTION_PASS_GOLD_CANDIDATE_STATUSES = [
  'LOCAL_PASS_GOLD_BLOCKED_INPUT',
  'LOCAL_PASS_GOLD_BLOCKED_EVIDENCE',
  'LOCAL_PASS_GOLD_BLOCKED_PRODUCTION',
  'LOCAL_PASS_GOLD_CANDIDATE_PASS',
  'LOCAL_PASS_GOLD_CANDIDATE_FAIL',
];

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function blocked(status, extra = {}) {
  return {
    schema_version: 'v165.0',
    candidate_status: status,
    candidate_id: null,
    evidence_package_id: null,
    candidate_hash: null,
    candidate_pass: false,
    pass_gold_local: false,
    local_only: true,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    ...extra,
  };
}

export function buildLocalExecutionPassGoldCandidateGate(input) {
  if (!input || typeof input !== 'object') {
    return blocked('LOCAL_PASS_GOLD_BLOCKED_INPUT');
  }

  const {
    candidate_id,
    evidence_package,
    local_only,
    production_touched,
    gate_criteria = {},
  } = input;

  if (!candidate_id || typeof candidate_id !== 'string' || !candidate_id.trim()) {
    return blocked('LOCAL_PASS_GOLD_BLOCKED_INPUT');
  }

  if (local_only === false) {
    return blocked('LOCAL_PASS_GOLD_BLOCKED_PRODUCTION', {
      blocked_reason: 'local_only must be true',
    });
  }

  if (production_touched === true) {
    return blocked('LOCAL_PASS_GOLD_BLOCKED_PRODUCTION', {
      blocked_reason: 'production_touched must be false',
    });
  }

  if (!evidence_package || typeof evidence_package !== 'object') {
    return blocked('LOCAL_PASS_GOLD_BLOCKED_EVIDENCE', {
      blocked_reason: 'evidence_package required',
      candidate_id,
    });
  }

  if (evidence_package.evidence_package_status !== 'LOCAL_EVIDENCE_SEALED') {
    return blocked('LOCAL_PASS_GOLD_BLOCKED_EVIDENCE', {
      blocked_reason: `evidence_package_status must be LOCAL_EVIDENCE_SEALED, got: ${evidence_package.evidence_package_status}`,
      candidate_id,
    });
  }

  if (!evidence_package.evidence_sealed) {
    return blocked('LOCAL_PASS_GOLD_BLOCKED_EVIDENCE', {
      blocked_reason: 'evidence_sealed must be true',
      candidate_id,
    });
  }

  if (evidence_package.local_only !== true) {
    return blocked('LOCAL_PASS_GOLD_BLOCKED_EVIDENCE', {
      blocked_reason: 'evidence_package.local_only must be true',
      candidate_id,
    });
  }

  if (evidence_package.production_touched !== false) {
    return blocked('LOCAL_PASS_GOLD_BLOCKED_PRODUCTION', {
      blocked_reason: 'evidence_package.production_touched must be false',
      candidate_id,
    });
  }

  const evidence_package_id = evidence_package.evidence_package_id || null;
  const evidence_hash = evidence_package.evidence_hash || null;

  // Evaluate gate criteria
  const required_criteria = {
    evidence_sealed: evidence_package.evidence_sealed === true,
    local_only_enforced: evidence_package.local_only === true,
    no_production_touch: evidence_package.production_touched === false,
    no_deploy: evidence_package.deploy_performed === false,
    no_stable_promote: evidence_package.stable_promoted === false,
    no_release: evidence_package.release_performed === false,
    has_proof_id: Boolean(evidence_package.proof_id),
    has_receipt_id: Boolean(evidence_package.receipt_id),
    has_ledger_id: Boolean(evidence_package.ledger_id),
    has_post_state_id: Boolean(evidence_package.post_state_id),
    has_evidence_hash: Boolean(evidence_hash),
    ...gate_criteria,
  };

  const failed_criteria = Object.entries(required_criteria)
    .filter(([, v]) => v !== true)
    .map(([k]) => k);

  const candidate_pass = failed_criteria.length === 0;

  const candidate_hash = sha256(
    `${candidate_id}:${evidence_package_id}:${evidence_hash}:${candidate_pass}`
  );

  const base = {
    schema_version: 'v165.0',
    candidate_id,
    evidence_package_id,
    evidence_hash,
    candidate_hash,
    candidate_pass,
    pass_gold_local: candidate_pass,
    criteria_evaluated: required_criteria,
    failed_criteria,
    local_only: true,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
  };

  if (candidate_pass) {
    return {
      ...base,
      candidate_status: 'LOCAL_PASS_GOLD_CANDIDATE_PASS',
    };
  }

  return {
    ...base,
    candidate_status: 'LOCAL_PASS_GOLD_CANDIDATE_FAIL',
    blocked_reason: `failed criteria: ${failed_criteria.join(', ')}`,
  };
}

export function validateLocalExecutionPassGoldCandidateGate(gate) {
  if (!gate || typeof gate !== 'object') {
    return { valid: false, errors: ['null or non-object input'] };
  }

  const errors = [];

  if (gate.production_touched !== false) errors.push('production_touched must be false');
  if (gate.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (gate.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (gate.release_performed !== false) errors.push('release_performed must be false');
  if (gate.local_only !== true) errors.push('local_only must be true');

  if (gate.candidate_status === 'LOCAL_PASS_GOLD_CANDIDATE_PASS') {
    if (!gate.candidate_id) errors.push('candidate_id required for PASS');
    if (!gate.candidate_hash) errors.push('candidate_hash required for PASS');
    if (!gate.candidate_pass) errors.push('candidate_pass must be true for PASS');
    if (!gate.pass_gold_local) errors.push('pass_gold_local must be true for PASS');
    if (!gate.evidence_package_id) errors.push('evidence_package_id required for PASS');
  }

  return { valid: errors.length === 0, errors };
}

export function renderLocalExecutionPassGoldCandidateGate(gate) {
  if (!gate || typeof gate !== 'object') {
    return '[LOCAL_EXECUTION_PASS_GOLD_CANDIDATE_GATE] No gate data';
  }

  const lines = [
    `[LOCAL_EXECUTION_PASS_GOLD_CANDIDATE_GATE] ${gate.candidate_status || 'UNKNOWN'}`,
    `  schema_version          : ${gate.schema_version || 'n/a'}`,
    `  candidate_id            : ${gate.candidate_id || 'null'}`,
    `  evidence_package_id     : ${gate.evidence_package_id || 'null'}`,
    `  candidate_hash          : ${gate.candidate_hash || 'null'}`,
    `  candidate_pass          : ${gate.candidate_pass}`,
    `  pass_gold_local         : ${gate.pass_gold_local}`,
    `  local_only              : ${gate.local_only}`,
    `  production_touched      : ${gate.production_touched}`,
    `  deploy_performed        : ${gate.deploy_performed}`,
    `  stable_promoted         : ${gate.stable_promoted}`,
    `  release_performed       : ${gate.release_performed}`,
    `  failed_criteria_count   : ${(gate.failed_criteria || []).length}`,
  ];

  if (gate.blocked_reason) {
    lines.push(`  blocked_reason          : ${gate.blocked_reason}`);
  }

  lines.push('  REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.');

  return lines.join('\n');
}

// CLI self-run
if (process.argv[1] && process.argv[1].endsWith('local-execution-pass-gold-candidate-gate.mjs')) {
  const useJson = process.argv.includes('--json');
  const sample = buildLocalExecutionPassGoldCandidateGate({
    candidate_id: 'candidate-v1650-001',
    evidence_package: {
      evidence_package_status: 'LOCAL_EVIDENCE_SEALED',
      evidence_package_id: 'evidence-pkg-001',
      evidence_hash: 'abc123def456',
      evidence_sealed: true,
      local_only: true,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      proof_id: 'proof-001',
      receipt_id: 'receipt-001',
      ledger_id: 'ledger-001',
      rollback_proof_id: 'rollback-001',
      post_state_id: 'post-state-001',
    },
    local_only: true,
    production_touched: false,
  });
  if (useJson) {
    console.log(JSON.stringify(sample, null, 2));
  } else {
    console.log(renderLocalExecutionPassGoldCandidateGate(sample));
  }
}
