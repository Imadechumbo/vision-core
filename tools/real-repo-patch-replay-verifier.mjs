#!/usr/bin/env node
/**
 * Real Repo Patch Replay Verifier — V183.0
 * Verifies that the pipeline chain can be reconstructed from graph evidence.
 * Does NOT deploy, promote, or release.
 */

import { createHash } from 'crypto';

export const REAL_REPO_PATCH_REPLAY_VERIFIER_STATUSES = [
  'REPLAY_BLOCKED_INPUT',
  'REPLAY_BLOCKED_GRAPH',
  'REPLAY_FAIL',
  'REPLAY_VERIFIED',
];

const SCHEMA_VERSION = 'v183.0';

const REQUIRED_NODES = [
  'scope_contract',
  'pre_state_snapshot',
  'apply_controller',
  'physical_apply_proof',
  'diff_truth_binding',
  'test_lane',
  'rollback_plan',
  'rollback_drill',
  'evidence_receipt',
  'ledger',
  'final_report',
  'pass_gold_candidate_gate',
  'baseline',
  'archive_record',
  'execution_baseline',
];

const REQUIRED_EDGES = [
  'scope_contract->pre_state_snapshot',
  'pre_state_snapshot->apply_controller',
  'apply_controller->physical_apply_proof',
  'physical_apply_proof->diff_truth_binding',
  'baseline->archive_record',
  'archive_record->execution_baseline',
];

const REPLAY_ORDER = [
  'scope_contract',
  'pre_state_snapshot',
  'apply_controller',
  'physical_apply_proof',
  'diff_truth_binding',
  'test_lane',
  'rollback_plan',
  'rollback_drill',
  'evidence_receipt',
  'ledger',
  'final_report',
  'pass_gold_candidate_gate',
  'baseline',
  'archive_record',
  'execution_baseline',
];

function sha256(s) {
  return createHash('sha256').update(String(s)).digest('hex');
}

function blockedInput(reason) {
  return {
    schema_version: SCHEMA_VERSION,
    replay_id: null,
    replay_verified: false,
    replay_order: [],
    replay_hash: null,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    status: 'REPLAY_BLOCKED_INPUT',
    errors: [reason],
  };
}

export function buildRealRepoPatchReplayVerifier(input) {
  if (!input || typeof input !== 'object') {
    return blockedInput('input is null or not an object');
  }

  const { replay_id, graph_hash, nodes, edges, expected_execution_baseline_id } = input;

  if (!replay_id || typeof replay_id !== 'string' || !replay_id.trim()) {
    return blockedInput('Missing or invalid replay_id');
  }
  if (!expected_execution_baseline_id || typeof expected_execution_baseline_id !== 'string') {
    return blockedInput('Missing expected_execution_baseline_id');
  }

  if (!input.evidence_graph_ready) {
    return {
      schema_version: SCHEMA_VERSION,
      replay_id,
      replay_verified: false,
      replay_order: [],
      replay_hash: null,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      status: 'REPLAY_BLOCKED_GRAPH',
      errors: ['evidence_graph_ready must be true'],
    };
  }

  const errors = [];

  // Validate graph_hash
  if (!graph_hash || typeof graph_hash !== 'string' || graph_hash.length !== 64) {
    errors.push('graph_hash must be 64-char hex string');
  }

  // Validate nodes
  if (!Array.isArray(nodes)) {
    errors.push('nodes must be an array');
  } else {
    const nodeIds = nodes.map(n => (typeof n === 'object' ? n.id : n));
    for (const rn of REQUIRED_NODES) {
      if (!nodeIds.includes(rn)) {
        errors.push(`Missing required node: ${rn}`);
      }
    }
  }

  // Validate edges
  if (!Array.isArray(edges)) {
    errors.push('edges must be an array');
  } else {
    const edgePairs = edges.map(e =>
      typeof e === 'object' ? `${e.from}->${e.to}` : e
    );
    for (const re of REQUIRED_EDGES) {
      if (!edgePairs.includes(re)) {
        errors.push(`Missing required edge: ${re}`);
      }
    }
  }

  // Validate root
  if (Array.isArray(nodes)) {
    const ebNode = nodes.find(n => (typeof n === 'object' ? n.id : n) === 'execution_baseline');
    if (ebNode && typeof ebNode === 'object' && ebNode.ref_id) {
      if (ebNode.ref_id !== expected_execution_baseline_id) {
        errors.push('execution_baseline node ref_id does not match expected_execution_baseline_id');
      }
    }
  }

  if (errors.length > 0) {
    return {
      schema_version: SCHEMA_VERSION,
      replay_id,
      replay_verified: false,
      replay_order: [],
      replay_hash: null,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      status: 'REPLAY_FAIL',
      errors,
    };
  }

  const replay_hash = sha256(`${replay_id}:${graph_hash}:${REPLAY_ORDER.join(',')}`);

  return {
    schema_version: SCHEMA_VERSION,
    replay_id,
    replay_verified: true,
    replay_order: REPLAY_ORDER,
    replay_hash,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    status: 'REPLAY_VERIFIED',
    errors: [],
  };
}

export function validateRealRepoPatchReplayVerifier(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  if (result.production_touched !== false) errors.push('production_touched must be false');
  if (result.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (result.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!REAL_REPO_PATCH_REPLAY_VERIFIER_STATUSES.includes(result.status)) {
    errors.push(`Invalid status: ${result.status}`);
  }
  if (result.status === 'REPLAY_VERIFIED' && !result.replay_verified) {
    errors.push('REPLAY_VERIFIED requires replay_verified=true');
  }
  if (result.status === 'REPLAY_VERIFIED' && (!result.replay_hash || result.replay_hash.length !== 64)) {
    errors.push('REPLAY_VERIFIED requires 64-char replay_hash');
  }
  return { valid: errors.length === 0, errors };
}

export function renderRealRepoPatchReplayVerifier(result) {
  if (!result || typeof result !== 'object') return '[ReplayVerifier: null]';
  const lines = [
    `=== Real Repo Patch Replay Verifier ${SCHEMA_VERSION} ===`,
    `Status              : ${result.status}`,
    `Replay ID           : ${result.replay_id ?? 'N/A'}`,
    `Replay Verified     : ${result.replay_verified}`,
    `Replay Order Steps  : ${(result.replay_order || []).length}`,
    `Replay Hash         : ${result.replay_hash ?? 'N/A'}`,
    `Prod Touched        : ${result.production_touched}`,
  ];
  if (result.errors && result.errors.length) lines.push(`Errors              : ${result.errors.join('; ')}`);
  lines.push('--- REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable ---');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-repo-patch-replay-verifier.mjs')) {
  const demo = buildRealRepoPatchReplayVerifier({
    replay_id: 'replay-demo-001',
    evidence_graph_ready: true,
    graph_hash: 'a'.repeat(64),
    nodes: [{ id: 'scope_contract' }, { id: 'pre_state_snapshot' }, { id: 'apply_controller' },
            { id: 'physical_apply_proof' }, { id: 'diff_truth_binding' }, { id: 'test_lane' },
            { id: 'rollback_plan' }, { id: 'rollback_drill' }, { id: 'evidence_receipt' },
            { id: 'ledger' }, { id: 'final_report' }, { id: 'pass_gold_candidate_gate' },
            { id: 'baseline' }, { id: 'archive_record' }, { id: 'execution_baseline', ref_id: 'exec-001' }],
    edges: [{ from: 'scope_contract', to: 'pre_state_snapshot' },
            { from: 'pre_state_snapshot', to: 'apply_controller' },
            { from: 'apply_controller', to: 'physical_apply_proof' },
            { from: 'physical_apply_proof', to: 'diff_truth_binding' },
            { from: 'baseline', to: 'archive_record' },
            { from: 'archive_record', to: 'execution_baseline' }],
    expected_execution_baseline_id: 'exec-001',
  });
  console.log(renderRealRepoPatchReplayVerifier(demo));
}
