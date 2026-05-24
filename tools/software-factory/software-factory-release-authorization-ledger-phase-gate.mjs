/**
 * V415 — Release Authorization Ledger Phase Gate
 * Consolidates V411–V415. Hard stop NOT lifted. Execution NOT allowed.
 * release_authorization_ledger_phase_passed=false always.
 * manual_release_execution_authorized=false always.
 * real_release_execution_allowed=false always.
 * real_release_hard_stop_lifted=false always.
 */

import { createHash } from 'crypto';

export const STATUSES = {
  RELEASE_AUTHORIZATION_LEDGER_PHASE_GATE_BLOCKED_INPUT: 'RELEASE_AUTHORIZATION_LEDGER_PHASE_GATE_BLOCKED_INPUT',
  RELEASE_AUTHORIZATION_LEDGER_PHASE_GATE_BLOCKED_INTENT: 'RELEASE_AUTHORIZATION_LEDGER_PHASE_GATE_BLOCKED_INTENT',
  RELEASE_AUTHORIZATION_LEDGER_PHASE_GATE_INCOMPLETE: 'RELEASE_AUTHORIZATION_LEDGER_PHASE_GATE_INCOMPLETE',
  RELEASE_AUTHORIZATION_LEDGER_PHASE_GATE_READY: 'RELEASE_AUTHORIZATION_LEDGER_PHASE_GATE_READY',
};

const REQUIRED_IDS = [
  'release_authorization_ledger_contract',
  'manual_command_seal_binder',
  'final_authorization_evidence_ledger',
  'manual_execution_intent_review',
];

const FINAL_MESSAGE = 'V411-V415 final release execution authorization ledger and manual command seal complete. Real release execution remains blocked until explicit V416 command.';

function invariants() {
  return {
    release_allowed: false,
    deploy_allowed: false,
    stable_allowed: false,
    tag_allowed: false,
    real_execution_allowed: false,
    real_release_executed: false,
    real_deploy_executed: false,
    real_tag_created: false,
    real_stable_promoted: false,
    artifact_published: false,
    production_touched: false,
    billing_executed: false,
    secrets_accessed: false,
    network_accessed: false,
    rollback_executed: false,
    real_release_hard_stop_phase_passed: false,
    real_release_hard_stop_lifted: false,
    operator_go_decision_granted: false,
    real_release_command_executed: false,
    real_release_execution_allowed: false,
    release_authorization_ledger_created: false,
    manual_command_seal_bound: false,
    manual_command_seal_verified: false,
    final_authorization_evidence_ledger_published: false,
    manual_execution_intent_reviewed: false,
    manual_execution_intent_approved: false,
    release_authorization_ledger_phase_passed: false,
    manual_release_execution_authorized: false,
  };
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return {
      schema_version: 'v415',
      status: STATUSES.RELEASE_AUTHORIZATION_LEDGER_PHASE_GATE_BLOCKED_INPUT,
      errors: ['input required'],
      final_message: FINAL_MESSAGE,
      ...invariants(),
    };
  }

  const {
    release_authorization_ledger_phase_gate_id,
    manual_execution_intent_review_id,
    manual_execution_intent_review_ready,
    ids,
    phase_summary,
  } = input;

  const errors = [];

  if (!release_authorization_ledger_phase_gate_id) errors.push('release_authorization_ledger_phase_gate_id required');
  if (!manual_execution_intent_review_id) errors.push('manual_execution_intent_review_id required');
  if (!phase_summary) errors.push('phase_summary required');
  if (!ids || typeof ids !== 'object') errors.push('ids required');

  if (errors.length > 0) {
    return {
      schema_version: 'v415',
      status: STATUSES.RELEASE_AUTHORIZATION_LEDGER_PHASE_GATE_BLOCKED_INPUT,
      errors,
      final_message: FINAL_MESSAGE,
      ...invariants(),
    };
  }

  const missingIds = [];
  for (const key of REQUIRED_IDS) {
    if (!ids[key]) missingIds.push(key);
  }

  if (missingIds.length > 0) {
    return {
      schema_version: 'v415',
      status: STATUSES.RELEASE_AUTHORIZATION_LEDGER_PHASE_GATE_INCOMPLETE,
      errors: missingIds.map(k => `ids.${k} required`),
      final_message: FINAL_MESSAGE,
      ...invariants(),
    };
  }

  if (!manual_execution_intent_review_ready) {
    return {
      schema_version: 'v415',
      status: STATUSES.RELEASE_AUTHORIZATION_LEDGER_PHASE_GATE_BLOCKED_INTENT,
      errors: ['manual_execution_intent_review must be READY'],
      final_message: FINAL_MESSAGE,
      ...invariants(),
    };
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({
      release_authorization_ledger_phase_gate_id,
      manual_execution_intent_review_id,
      ids,
      phase_summary,
    }))
    .digest('hex');

  return {
    schema_version: 'v415',
    status: STATUSES.RELEASE_AUTHORIZATION_LEDGER_PHASE_GATE_READY,
    release_authorization_ledger_phase_gate_id,
    manual_execution_intent_review_id,
    ids,
    phase_summary,
    modules_consolidated: REQUIRED_IDS.length,
    hash,
    errors: [],
    final_message: FINAL_MESSAGE,
    ...invariants(),
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.status !== STATUSES.RELEASE_AUTHORIZATION_LEDGER_PHASE_GATE_READY) return false;
  if (result.release_authorization_ledger_phase_passed !== false) return false;
  if (result.manual_release_execution_authorized !== false) return false;
  if (result.real_release_execution_allowed !== false) return false;
  if (result.real_release_hard_stop_lifted !== false) return false;
  if (!result.hash || result.hash.length !== 64) return false;
  if (result.final_message !== FINAL_MESSAGE) return false;
  return true;
}

export function render(result) {
  if (!result || typeof result !== 'object') {
    return `[V415] Release Authorization Ledger Phase Gate — no result\n${FINAL_MESSAGE}\nSEM PASS GOLD REAL → não promove, não libera, não marca stable.`;
  }
  const lines = [
    '=== V415 Release Authorization Ledger Phase Gate ===',
    `Status: ${result.status}`,
    `Schema: ${result.schema_version || 'v415'}`,
  ];
  if (result.release_authorization_ledger_phase_gate_id) lines.push(`Gate ID: ${result.release_authorization_ledger_phase_gate_id}`);
  if (result.modules_consolidated !== undefined) lines.push(`Modules Consolidated: ${result.modules_consolidated}`);
  if (result.ids) {
    lines.push('Module IDs:');
    for (const [k, v] of Object.entries(result.ids)) {
      lines.push(`  ${k}: ${v}`);
    }
  }
  if (result.hash) lines.push(`Hash: ${result.hash}`);
  if (result.errors && result.errors.length > 0) lines.push(`Errors: ${result.errors.join(', ')}`);
  lines.push('');
  lines.push('INVARIANTS:');
  lines.push(`  release_authorization_ledger_phase_passed: ${result.release_authorization_ledger_phase_passed}`);
  lines.push(`  manual_release_execution_authorized: ${result.manual_release_execution_authorized}`);
  lines.push(`  real_release_execution_allowed: ${result.real_release_execution_allowed}`);
  lines.push(`  real_release_hard_stop_lifted: ${result.real_release_hard_stop_lifted}`);
  lines.push(`  manual_execution_intent_approved: ${result.manual_execution_intent_approved}`);
  lines.push(`  production_touched: ${result.production_touched}`);
  lines.push('');
  lines.push(`FINAL: ${result.final_message || FINAL_MESSAGE}`);
  lines.push('');
  lines.push('SEM PASS GOLD REAL → não promove, não libera, não marca stable.');
  return lines.join('\n');
}
