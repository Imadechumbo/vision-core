#!/usr/bin/env node
/**
 * Local Execution Proof Capture — V162.0
 * Captures structured proof of a controlled local execution. No production.
 */

import { createHash } from 'crypto';

export const LOCAL_EXECUTION_PROOF_CAPTURE_STATUSES = [
  'LOCAL_EXECUTION_PROOF_BLOCKED_INPUT',
  'LOCAL_EXECUTION_PROOF_BLOCKED_DRILL',
  'LOCAL_EXECUTION_PROOF_BLOCKED_SCOPE',
  'LOCAL_EXECUTION_PROOF_BLOCKED_COMMAND',
  'LOCAL_EXECUTION_PROOF_CAPTURED',
  'LOCAL_EXECUTION_PROOF_INVALID',
];

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function blocked(status, extra = {}) {
  return {
    schema_version: 'v162.0',
    proof_status: status,
    proof_id: null,
    proof_id_hash: null,
    local_execution_proof_captured: false,
    drill_id: null,
    mission_id: null,
    command_hash: null,
    command_text_redacted: null,
    stdout_hash: null,
    stderr_hash: null,
    exit_code: null,
    duration_ms: null,
    before_hash: null,
    after_hash: null,
    changed_files_count: 0,
    touched_files: [],
    forbidden_files_detected: [],
    local_only: true,
    production_touched: false,
    execution_proven_local_only: false,
    production_execution_blocked: true,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    ...extra,
  };
}

const FORBIDDEN_FILES = [
  '.env',
  'production.json',
  'prod.json',
  'deploy.sh',
  'release.sh',
  '.npmrc',
];

export function buildLocalExecutionProofCapture(input) {
  if (!input || typeof input !== 'object') {
    return blocked('LOCAL_EXECUTION_PROOF_BLOCKED_INPUT');
  }

  const {
    proof_id,
    drill_id,
    mission_id,
    command_hash,
    command_text_redacted,
    allowed_working_directory,
    allowed_files = [],
    forbidden_files = [],
    touched_files = [],
    stdout_hash,
    stderr_hash,
    exit_code,
    started_at,
    finished_at,
    duration_ms,
    before_hash,
    after_hash,
    local_only,
    production_touched,
    drill_status,
    human_approval_verified,
    baseline_v160_confirmed,
    anti_hallucination_confirmed,
    pass_gold_confirmed,
    evidence_receipt_confirmed,
  } = input;

  if (!proof_id || typeof proof_id !== 'string' || !proof_id.trim()) {
    return blocked('LOCAL_EXECUTION_PROOF_BLOCKED_INPUT');
  }
  if (!drill_id || typeof drill_id !== 'string' || !drill_id.trim()) {
    return blocked('LOCAL_EXECUTION_PROOF_BLOCKED_INPUT');
  }
  if (!mission_id || typeof mission_id !== 'string' || !mission_id.trim()) {
    return blocked('LOCAL_EXECUTION_PROOF_BLOCKED_INPUT');
  }
  if (!command_hash || typeof command_hash !== 'string' || !command_hash.trim()) {
    return blocked('LOCAL_EXECUTION_PROOF_BLOCKED_COMMAND');
  }
  if (!command_text_redacted || typeof command_text_redacted !== 'string') {
    return blocked('LOCAL_EXECUTION_PROOF_BLOCKED_COMMAND');
  }

  const validDrillStatuses = ['READY', 'EXECUTED_LOCAL_ONLY', 'FIRST_REAL_LOCAL_DRILL_READY', 'FIRST_REAL_LOCAL_DRILL_EXECUTED_LOCAL_ONLY'];
  if (!drill_status || !validDrillStatuses.includes(drill_status)) {
    return blocked('LOCAL_EXECUTION_PROOF_BLOCKED_DRILL');
  }

  if (!human_approval_verified) {
    return blocked('LOCAL_EXECUTION_PROOF_BLOCKED_DRILL');
  }
  if (!baseline_v160_confirmed) {
    return blocked('LOCAL_EXECUTION_PROOF_BLOCKED_DRILL');
  }
  if (!anti_hallucination_confirmed) {
    return blocked('LOCAL_EXECUTION_PROOF_BLOCKED_DRILL');
  }
  if (!pass_gold_confirmed) {
    return blocked('LOCAL_EXECUTION_PROOF_BLOCKED_DRILL');
  }
  if (!evidence_receipt_confirmed) {
    return blocked('LOCAL_EXECUTION_PROOF_BLOCKED_DRILL');
  }

  if (local_only === false) {
    return blocked('LOCAL_EXECUTION_PROOF_BLOCKED_SCOPE', {
      blocked_reason: 'local_only must be true',
    });
  }
  if (production_touched === true) {
    return blocked('LOCAL_EXECUTION_PROOF_BLOCKED_SCOPE', {
      blocked_reason: 'production_touched must be false',
    });
  }

  const allForbidden = [...FORBIDDEN_FILES, ...(forbidden_files || [])];
  const detected = (touched_files || []).filter((f) =>
    allForbidden.some((fb) => String(f).includes(fb))
  );
  if (detected.length > 0) {
    return blocked('LOCAL_EXECUTION_PROOF_BLOCKED_SCOPE', {
      blocked_reason: `forbidden files touched: ${detected.join(', ')}`,
      forbidden_files_detected: detected,
    });
  }

  if (!before_hash || !after_hash) {
    return blocked('LOCAL_EXECUTION_PROOF_BLOCKED_INPUT', {
      blocked_reason: 'before_hash and after_hash required',
    });
  }

  const proof_id_hash = sha256(`${proof_id}:${drill_id}:${command_hash}:${before_hash}:${after_hash}`);

  const base = {
    schema_version: 'v162.0',
    proof_id,
    proof_id_hash,
    drill_id,
    mission_id,
    command_hash,
    command_text_redacted,
    stdout_hash: stdout_hash || sha256(''),
    stderr_hash: stderr_hash || sha256(''),
    exit_code: exit_code !== undefined ? exit_code : null,
    duration_ms: duration_ms !== undefined ? duration_ms : null,
    before_hash,
    after_hash,
    changed_files_count: (touched_files || []).length,
    touched_files: touched_files || [],
    forbidden_files_detected: [],
    local_only: true,
    production_touched: false,
    execution_proven_local_only: true,
    production_execution_blocked: true,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
  };

  if (exit_code === 0) {
    return {
      ...base,
      proof_status: 'LOCAL_EXECUTION_PROOF_CAPTURED',
      local_execution_proof_captured: true,
    };
  }

  return {
    ...base,
    proof_status: 'LOCAL_EXECUTION_PROOF_INVALID',
    local_execution_proof_captured: false,
    blocked_reason: `non-zero exit_code: ${exit_code}`,
  };
}

export function validateLocalExecutionProofCapture(proof) {
  if (!proof || typeof proof !== 'object') {
    return { valid: false, errors: ['null or non-object input'] };
  }

  const errors = [];

  if (proof.production_touched !== false) errors.push('production_touched must be false');
  if (proof.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (proof.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (proof.release_performed !== false) errors.push('release_performed must be false');
  if (proof.local_only !== true) errors.push('local_only must be true');
  if (proof.production_execution_blocked !== true) errors.push('production_execution_blocked must be true');

  if (proof.proof_status === 'LOCAL_EXECUTION_PROOF_CAPTURED') {
    if (!proof.proof_id) errors.push('proof_id required for CAPTURED');
    if (!proof.proof_id_hash) errors.push('proof_id_hash required for CAPTURED');
    if (!proof.local_execution_proof_captured) errors.push('local_execution_proof_captured must be true for CAPTURED');
    if (!proof.execution_proven_local_only) errors.push('execution_proven_local_only must be true for CAPTURED');
    if (!proof.before_hash) errors.push('before_hash required for CAPTURED');
    if (!proof.after_hash) errors.push('after_hash required for CAPTURED');
  }

  return { valid: errors.length === 0, errors };
}

export function renderLocalExecutionProofCapture(proof) {
  if (!proof || typeof proof !== 'object') {
    return '[LOCAL_EXECUTION_PROOF_CAPTURE] No proof data';
  }

  const lines = [
    `[LOCAL_EXECUTION_PROOF_CAPTURE] ${proof.proof_status || 'UNKNOWN'}`,
    `  schema_version              : ${proof.schema_version || 'n/a'}`,
    `  proof_id                    : ${proof.proof_id || 'null'}`,
    `  drill_id                    : ${proof.drill_id || 'null'}`,
    `  mission_id                  : ${proof.mission_id || 'null'}`,
    `  exit_code                   : ${proof.exit_code}`,
    `  duration_ms                 : ${proof.duration_ms}`,
    `  before_hash                 : ${proof.before_hash || 'null'}`,
    `  after_hash                  : ${proof.after_hash || 'null'}`,
    `  changed_files_count         : ${proof.changed_files_count}`,
    `  local_only                  : ${proof.local_only}`,
    `  production_touched          : ${proof.production_touched}`,
    `  execution_proven_local_only : ${proof.execution_proven_local_only}`,
    `  production_execution_blocked: ${proof.production_execution_blocked}`,
    `  deploy_performed            : ${proof.deploy_performed}`,
    `  stable_promoted             : ${proof.stable_promoted}`,
    `  release_performed           : ${proof.release_performed}`,
    `  local_execution_proof_captured: ${proof.local_execution_proof_captured}`,
  ];

  if (proof.blocked_reason) {
    lines.push(`  blocked_reason              : ${proof.blocked_reason}`);
  }
  if (proof.forbidden_files_detected && proof.forbidden_files_detected.length > 0) {
    lines.push(`  forbidden_files_detected    : ${proof.forbidden_files_detected.join(', ')}`);
  }

  lines.push('  REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.');

  return lines.join('\n');
}

// CLI self-run
if (process.argv[1] && process.argv[1].endsWith('local-execution-proof-capture.mjs')) {
  const useJson = process.argv.includes('--json');
  const sample = buildLocalExecutionProofCapture({
    proof_id: 'proof-v162-001',
    drill_id: 'drill-v161-001',
    mission_id: 'mission-001',
    command_hash: 'abc123def456',
    command_text_redacted: 'node tools/[REDACTED].mjs --dry-run',
    allowed_working_directory: '.vision/sandbox',
    touched_files: ['tools/sandbox-module.mjs'],
    stdout_hash: 'stdout-hash-001',
    stderr_hash: 'stderr-hash-001',
    exit_code: 0,
    started_at: '2026-05-21T10:00:00.000Z',
    finished_at: '2026-05-21T10:00:01.000Z',
    duration_ms: 1000,
    before_hash: 'before-hash-001',
    after_hash: 'after-hash-001',
    local_only: true,
    production_touched: false,
    drill_status: 'FIRST_REAL_LOCAL_DRILL_EXECUTED_LOCAL_ONLY',
    human_approval_verified: true,
    baseline_v160_confirmed: true,
    anti_hallucination_confirmed: true,
    pass_gold_confirmed: true,
    evidence_receipt_confirmed: true,
  });
  if (useJson) {
    console.log(JSON.stringify(sample, null, 2));
  } else {
    console.log(renderLocalExecutionProofCapture(sample));
  }
}
