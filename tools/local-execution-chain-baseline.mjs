#!/usr/bin/env node
/**
 * Local Execution Chain Baseline — V166.0 (Capstone)
 * Validates the full local execution chain:
 * proof → receipt → ledger → rollback → post-state → evidence → PASS GOLD → final report.
 * No production, no deploy, no stable, no release.
 */

import { createHash } from 'crypto';

export const LOCAL_EXECUTION_CHAIN_BASELINE_STATUSES = [
  'LOCAL_CHAIN_BASELINE_BLOCKED_INPUT',
  'LOCAL_CHAIN_BASELINE_BLOCKED_PRODUCTION',
  'LOCAL_CHAIN_BASELINE_BLOCKED_CHAIN',
  'LOCAL_CHAIN_BASELINE_READY',
  'LOCAL_CHAIN_BASELINE_FAIL',
];

const SCHEMA_VERSION = 'v166.0';

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function blocked(status, extra = {}) {
  return {
    schema_version: SCHEMA_VERSION,
    baseline_status: status,
    baseline_id: null,
    chain_hash: null,
    baseline_ready: false,
    chain_complete: false,
    local_only: true,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    ...extra,
  };
}

export function buildLocalExecutionChainBaseline(input) {
  if (!input || typeof input !== 'object') {
    return blocked('LOCAL_CHAIN_BASELINE_BLOCKED_INPUT');
  }

  const {
    baseline_id,
    proof,
    receipt,
    ledger,
    rollback_gate,
    post_state,
    evidence_package,
    candidate_gate,
    final_report,
    local_only,
    production_touched,
  } = input;

  if (!baseline_id || typeof baseline_id !== 'string' || !baseline_id.trim()) {
    return blocked('LOCAL_CHAIN_BASELINE_BLOCKED_INPUT');
  }

  if (local_only === false) {
    return blocked('LOCAL_CHAIN_BASELINE_BLOCKED_PRODUCTION', {
      blocked_reason: 'local_only must be true',
    });
  }

  if (production_touched === true) {
    return blocked('LOCAL_CHAIN_BASELINE_BLOCKED_PRODUCTION', {
      blocked_reason: 'production_touched must be false',
    });
  }

  // Validate each chain component
  const chain_checks = {
    proof_captured:
      proof?.proof_status === 'LOCAL_EXECUTION_PROOF_CAPTURED',
    receipt_ready:
      receipt?.receipt_status === 'LOCAL_EXECUTION_RECEIPT_READY',
    ledger_ready:
      ledger?.ledger_status === 'LOCAL_EXECUTION_LEDGER_READY',
    rollback_ready:
      rollback_gate?.rollback_proof_gate_status === 'LOCAL_ROLLBACK_PROOF_GATE_READY' ||
      rollback_gate?.rollback_proof_gate_status === 'LOCAL_ROLLBACK_PROOF_GATE_COMPLETED',
    post_state_verified:
      post_state?.post_state_status === 'LOCAL_POST_STATE_VERIFIED' &&
      post_state?.post_state_verified === true,
    evidence_sealed:
      evidence_package?.evidence_package_status === 'LOCAL_EVIDENCE_SEALED' &&
      evidence_package?.evidence_sealed === true,
    candidate_pass:
      candidate_gate?.candidate_status === 'LOCAL_PASS_GOLD_CANDIDATE_PASS' &&
      candidate_gate?.candidate_pass === true,
    final_report_pass:
      final_report?.report_status === 'LOCAL_FINAL_REPORT_PASS' &&
      final_report?.pass_gold_local === true,
  };

  const failed_checks = Object.entries(chain_checks)
    .filter(([, v]) => v !== true)
    .map(([k]) => k);

  // Validate production invariants across all components
  const components = [proof, receipt, ledger, rollback_gate, post_state, evidence_package, candidate_gate, final_report];
  const production_violations = components
    .filter(c => c && typeof c === 'object')
    .filter(c =>
      c.production_touched === true ||
      c.deploy_performed === true ||
      c.stable_promoted === true ||
      c.release_performed === true ||
      c.local_only === false
    )
    .map((c, i) => `component[${i}]`);

  if (production_violations.length > 0) {
    return blocked('LOCAL_CHAIN_BASELINE_BLOCKED_PRODUCTION', {
      blocked_reason: `production invariant violated in: ${production_violations.join(', ')}`,
      baseline_id,
    });
  }

  const chain_complete = failed_checks.length === 0;

  const chain_hash = sha256(
    `${baseline_id}:${proof?.proof_id || ''}:${receipt?.receipt_id || ''}:${ledger?.ledger_id || ''}:${evidence_package?.evidence_hash || ''}:${final_report?.report_hash || ''}:${chain_complete}`
  );

  const base = {
    schema_version: SCHEMA_VERSION,
    baseline_id,
    proof_id: proof?.proof_id || null,
    receipt_id: receipt?.receipt_id || null,
    ledger_id: ledger?.ledger_id || null,
    rollback_proof_id: rollback_gate?.rollback_proof_id || null,
    post_state_id: post_state?.post_state_id || null,
    evidence_package_id: evidence_package?.evidence_package_id || null,
    candidate_id: candidate_gate?.candidate_id || null,
    report_id: final_report?.report_id || null,
    chain_hash,
    chain_checks,
    failed_checks,
    chain_complete,
    local_only: true,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
  };

  if (!chain_complete) {
    return {
      ...base,
      baseline_status: 'LOCAL_CHAIN_BASELINE_FAIL',
      baseline_ready: false,
      blocked_reason: `chain incomplete: ${failed_checks.join(', ')}`,
    };
  }

  return {
    ...base,
    baseline_status: 'LOCAL_CHAIN_BASELINE_READY',
    baseline_ready: true,
  };
}

export function validateLocalExecutionChainBaseline(baseline) {
  if (!baseline || typeof baseline !== 'object') {
    return { valid: false, errors: ['null or non-object input'] };
  }

  const errors = [];

  if (baseline.production_touched !== false) errors.push('production_touched must be false');
  if (baseline.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (baseline.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (baseline.release_performed !== false) errors.push('release_performed must be false');
  if (baseline.local_only !== true) errors.push('local_only must be true');

  if (baseline.baseline_status === 'LOCAL_CHAIN_BASELINE_READY') {
    if (!baseline.baseline_id) errors.push('baseline_id required for READY');
    if (!baseline.chain_hash) errors.push('chain_hash required for READY');
    if (!baseline.baseline_ready) errors.push('baseline_ready must be true for READY');
    if (!baseline.chain_complete) errors.push('chain_complete must be true for READY');
    if ((baseline.failed_checks || []).length > 0) errors.push('failed_checks must be empty for READY');
  }

  return { valid: errors.length === 0, errors };
}

export function renderLocalExecutionChainBaseline(baseline) {
  if (!baseline || typeof baseline !== 'object') {
    return '[LOCAL_EXECUTION_CHAIN_BASELINE] No baseline data';
  }

  const checks = baseline.chain_checks || {};
  const lines = [
    `[LOCAL_EXECUTION_CHAIN_BASELINE] ${baseline.baseline_status || 'UNKNOWN'}`,
    `  schema_version          : ${baseline.schema_version || 'n/a'}`,
    `  baseline_id             : ${baseline.baseline_id || 'null'}`,
    `  chain_hash              : ${baseline.chain_hash || 'null'}`,
    `  baseline_ready          : ${baseline.baseline_ready}`,
    `  chain_complete          : ${baseline.chain_complete}`,
    `  failed_checks_count     : ${(baseline.failed_checks || []).length}`,
    `  --- chain checks ---`,
    `  proof_captured          : ${checks.proof_captured}`,
    `  receipt_ready           : ${checks.receipt_ready}`,
    `  ledger_ready            : ${checks.ledger_ready}`,
    `  rollback_ready          : ${checks.rollback_ready}`,
    `  post_state_verified     : ${checks.post_state_verified}`,
    `  evidence_sealed         : ${checks.evidence_sealed}`,
    `  candidate_pass          : ${checks.candidate_pass}`,
    `  final_report_pass       : ${checks.final_report_pass}`,
    `  --- invariants ---`,
    `  local_only              : ${baseline.local_only}`,
    `  production_touched      : ${baseline.production_touched}`,
    `  deploy_performed        : ${baseline.deploy_performed}`,
    `  stable_promoted         : ${baseline.stable_promoted}`,
    `  release_performed       : ${baseline.release_performed}`,
  ];

  if (baseline.blocked_reason) {
    lines.push(`  blocked_reason          : ${baseline.blocked_reason}`);
  }

  lines.push('  REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  lines.push(`  LOCAL_EXECUTION_CHAIN_BASELINE_READY=${baseline.baseline_ready}`);

  return lines.join('\n');
}

// CLI self-run
if (process.argv[1] && process.argv[1].endsWith('local-execution-chain-baseline.mjs')) {
  const useJson = process.argv.includes('--json');
  const sample = buildLocalExecutionChainBaseline({
    baseline_id: 'baseline-v1660-001',
    proof: { proof_status: 'LOCAL_EXECUTION_PROOF_CAPTURED', proof_id: 'proof-001', local_only: true, production_touched: false, deploy_performed: false, stable_promoted: false, release_performed: false },
    receipt: { receipt_status: 'LOCAL_EXECUTION_RECEIPT_READY', receipt_id: 'receipt-001', local_only: true, production_touched: false, deploy_performed: false, stable_promoted: false, release_performed: false },
    ledger: { ledger_status: 'LOCAL_EXECUTION_LEDGER_READY', ledger_id: 'ledger-001', local_only: true, production_touched: false, deploy_performed: false, stable_promoted: false, release_performed: false },
    rollback_gate: { rollback_proof_gate_status: 'LOCAL_ROLLBACK_PROOF_GATE_READY', rollback_proof_id: 'rollback-001', local_only: true, production_touched: false, deploy_performed: false, stable_promoted: false, release_performed: false },
    post_state: { post_state_status: 'LOCAL_POST_STATE_VERIFIED', post_state_verified: true, post_state_id: 'post-state-001', local_only: true, production_touched: false, deploy_performed: false, stable_promoted: false, release_performed: false },
    evidence_package: { evidence_package_status: 'LOCAL_EVIDENCE_SEALED', evidence_sealed: true, evidence_package_id: 'evidence-pkg-001', evidence_hash: 'abc123', local_only: true, production_touched: false, deploy_performed: false, stable_promoted: false, release_performed: false },
    candidate_gate: { candidate_status: 'LOCAL_PASS_GOLD_CANDIDATE_PASS', candidate_pass: true, candidate_id: 'candidate-001', local_only: true, production_touched: false, deploy_performed: false, stable_promoted: false, release_performed: false },
    final_report: { report_status: 'LOCAL_FINAL_REPORT_PASS', pass_gold_local: true, report_id: 'report-001', report_hash: 'xyz789', local_only: true, production_touched: false, deploy_performed: false, stable_promoted: false, release_performed: false },
    local_only: true,
    production_touched: false,
  });
  if (useJson) {
    console.log(JSON.stringify(sample, null, 2));
  } else {
    console.log(renderLocalExecutionChainBaseline(sample));
  }
}
