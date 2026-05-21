#!/usr/bin/env node
/**
 * First Real Human-Approved Local Execution Drill — V161.0
 * Local-only, reversible drill. No production, no deploy, no stable, no release.
 */

import { createHash } from 'crypto';

export const FIRST_REAL_LOCAL_EXECUTION_DRILL_STATUSES = [
  'FIRST_REAL_LOCAL_DRILL_BLOCKED_INPUT',
  'FIRST_REAL_LOCAL_DRILL_BLOCKED_BASELINE',
  'FIRST_REAL_LOCAL_DRILL_BLOCKED_HUMAN_APPROVAL',
  'FIRST_REAL_LOCAL_DRILL_BLOCKED_SNAPSHOT',
  'FIRST_REAL_LOCAL_DRILL_BLOCKED_ROLLBACK',
  'FIRST_REAL_LOCAL_DRILL_READY',
  'FIRST_REAL_LOCAL_DRILL_EXECUTED_LOCAL_ONLY',
  'FIRST_REAL_LOCAL_DRILL_ROLLBACK_READY',
];

const FORBIDDEN_FILES = [
  '.env',
  'production.json',
  'prod.json',
  'deploy.sh',
  'release.sh',
  '.npmrc',
];

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function blocked(reason, extra = {}) {
  return {
    schema_version: 'v161.0',
    drill_status: reason,
    drill_id: null,
    drill_id_hash: null,
    first_real_local_execution_drill_ready: false,
    baseline_v160_confirmed: false,
    anti_hallucination_confirmed: false,
    human_approval_verified: false,
    pass_gold_confirmed: false,
    evidence_receipt_confirmed: false,
    snapshot_confirmed: false,
    rollback_confirmed: false,
    local_only: true,
    production_touched: false,
    local_execution_proof_required: true,
    rollback_drill_required: true,
    future_production_execution_required: true,
    execution_performed: false,
    stable_promoted: false,
    deploy_performed: false,
    release_performed: false,
    blocked_reason: reason,
    ...extra,
  };
}

export function buildFirstRealHumanApprovedLocalExecutionDrill(input) {
  if (!input || typeof input !== 'object') {
    return blocked('FIRST_REAL_LOCAL_DRILL_BLOCKED_INPUT');
  }

  const {
    drill_id,
    baseline_v160_confirmed,
    anti_hallucination_confirmed,
    human_approval_verified,
    human_approval_token,
    pass_gold_verified,
    evidence_receipt_id,
    snapshot_ready,
    rollback_ready,
    local_only,
    touched_files = [],
    initiated_at,
    executed_local,
  } = input;

  if (!drill_id || typeof drill_id !== 'string' || !drill_id.trim()) {
    return blocked('FIRST_REAL_LOCAL_DRILL_BLOCKED_INPUT');
  }

  if (!baseline_v160_confirmed) {
    return blocked('FIRST_REAL_LOCAL_DRILL_BLOCKED_BASELINE');
  }

  if (!anti_hallucination_confirmed) {
    return blocked('FIRST_REAL_LOCAL_DRILL_BLOCKED_BASELINE');
  }

  if (!human_approval_verified || !human_approval_token) {
    return blocked('FIRST_REAL_LOCAL_DRILL_BLOCKED_HUMAN_APPROVAL');
  }

  if (!pass_gold_verified) {
    return blocked('FIRST_REAL_LOCAL_DRILL_BLOCKED_HUMAN_APPROVAL');
  }

  if (!evidence_receipt_id) {
    return blocked('FIRST_REAL_LOCAL_DRILL_BLOCKED_HUMAN_APPROVAL');
  }

  if (!snapshot_ready) {
    return blocked('FIRST_REAL_LOCAL_DRILL_BLOCKED_SNAPSHOT');
  }

  if (!rollback_ready) {
    return blocked('FIRST_REAL_LOCAL_DRILL_BLOCKED_ROLLBACK');
  }

  if (local_only === false) {
    return blocked('FIRST_REAL_LOCAL_DRILL_BLOCKED_INPUT', {
      blocked_reason: 'local_only must be true',
    });
  }

  const forbidden = (touched_files || []).filter((f) =>
    FORBIDDEN_FILES.some((fb) => String(f).includes(fb))
  );
  if (forbidden.length > 0) {
    return blocked('FIRST_REAL_LOCAL_DRILL_BLOCKED_INPUT', {
      blocked_reason: `forbidden files touched: ${forbidden.join(', ')}`,
      forbidden_files_detected: forbidden,
    });
  }

  const ts = initiated_at || new Date().toISOString();
  const drill_id_hash = sha256(`${drill_id}:${ts}`);
  const approval_token_hash = sha256(human_approval_token);

  const base = {
    schema_version: 'v161.0',
    drill_id,
    drill_id_hash,
    evidence_receipt_id,
    approval_token_hash,
    initiated_at: ts,
    baseline_v160_confirmed: true,
    anti_hallucination_confirmed: true,
    human_approval_verified: true,
    pass_gold_confirmed: true,
    evidence_receipt_confirmed: true,
    snapshot_confirmed: true,
    rollback_confirmed: true,
    local_only: true,
    production_touched: false,
    local_execution_proof_required: true,
    rollback_drill_required: true,
    future_production_execution_required: true,
    execution_performed: false,
    stable_promoted: false,
    deploy_performed: false,
    release_performed: false,
  };

  if (executed_local === true) {
    return {
      ...base,
      drill_status: 'FIRST_REAL_LOCAL_DRILL_EXECUTED_LOCAL_ONLY',
      first_real_local_execution_drill_ready: true,
      local_execution_confirmed: true,
      rollback_drill_pending: true,
    };
  }

  return {
    ...base,
    drill_status: 'FIRST_REAL_LOCAL_DRILL_READY',
    first_real_local_execution_drill_ready: true,
    local_execution_confirmed: false,
    rollback_drill_pending: false,
  };
}

export function validateFirstRealHumanApprovedLocalExecutionDrill(drill) {
  if (!drill || typeof drill !== 'object') {
    return { valid: false, errors: ['null or non-object input'] };
  }

  const errors = [];

  if (drill.production_touched !== false) errors.push('production_touched must be false');
  if (drill.execution_performed !== false) errors.push('execution_performed must be false');
  if (drill.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (drill.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (drill.release_performed !== false) errors.push('release_performed must be false');
  if (drill.local_only !== true) errors.push('local_only must be true');

  const readyStatus = 'FIRST_REAL_LOCAL_DRILL_READY';
  const executedStatus = 'FIRST_REAL_LOCAL_DRILL_EXECUTED_LOCAL_ONLY';

  if (drill.drill_status === readyStatus || drill.drill_status === executedStatus) {
    if (!drill.baseline_v160_confirmed) errors.push('baseline_v160_confirmed required for READY');
    if (!drill.human_approval_verified) errors.push('human_approval_verified required for READY');
    if (!drill.pass_gold_confirmed) errors.push('pass_gold_confirmed required for READY');
    if (!drill.snapshot_confirmed) errors.push('snapshot_confirmed required for READY');
    if (!drill.rollback_confirmed) errors.push('rollback_confirmed required for READY');
    if (!drill.drill_id) errors.push('drill_id required for READY');
  }

  return { valid: errors.length === 0, errors };
}

export function renderFirstRealHumanApprovedLocalExecutionDrill(drill) {
  if (!drill || typeof drill !== 'object') {
    return '[FIRST_REAL_LOCAL_DRILL] No drill data';
  }

  const lines = [
    `[FIRST_REAL_LOCAL_DRILL] ${drill.drill_status || 'UNKNOWN'}`,
    `  schema_version        : ${drill.schema_version || 'n/a'}`,
    `  drill_id              : ${drill.drill_id || 'null'}`,
    `  baseline_v160         : ${drill.baseline_v160_confirmed}`,
    `  human_approval        : ${drill.human_approval_verified}`,
    `  pass_gold             : ${drill.pass_gold_confirmed}`,
    `  snapshot              : ${drill.snapshot_confirmed}`,
    `  rollback              : ${drill.rollback_confirmed}`,
    `  local_only            : ${drill.local_only}`,
    `  production_touched    : ${drill.production_touched}`,
    `  execution_performed   : ${drill.execution_performed}`,
    `  stable_promoted       : ${drill.stable_promoted}`,
    `  deploy_performed      : ${drill.deploy_performed}`,
    `  release_performed     : ${drill.release_performed}`,
  ];

  if (drill.blocked_reason) {
    lines.push(`  blocked_reason        : ${drill.blocked_reason}`);
  }

  lines.push('  REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.');

  return lines.join('\n');
}
