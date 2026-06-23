#!/usr/bin/env node
/**
 * Real Repo Patch Trusted Evidence Graph — V182.0
 * Generates a graph of evidence connecting each pipeline stage by ID, hash, and dependency.
 * Does NOT deploy, promote, or release.
 */

import { createHash } from 'crypto';

export const REAL_REPO_PATCH_EVIDENCE_GRAPH_STATUSES = [
  'EVIDENCE_GRAPH_BLOCKED_INPUT',
  'EVIDENCE_GRAPH_BLOCKED_INTEGRITY',
  'EVIDENCE_GRAPH_READY',
];

const SCHEMA_VERSION = 'v182.0';

const GRAPH_NODES = [
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

const GRAPH_EDGES = [
  ['scope_contract', 'pre_state_snapshot'],
  ['pre_state_snapshot', 'apply_controller'],
  ['apply_controller', 'physical_apply_proof'],
  ['physical_apply_proof', 'diff_truth_binding'],
  ['diff_truth_binding', 'test_lane'],
  ['diff_truth_binding', 'rollback_plan'],
  ['rollback_plan', 'rollback_drill'],
  ['test_lane', 'evidence_receipt'],
  ['rollback_drill', 'evidence_receipt'],
  ['evidence_receipt', 'ledger'],
  ['evidence_receipt', 'final_report'],
  ['ledger', 'pass_gold_candidate_gate'],
  ['final_report', 'pass_gold_candidate_gate'],
  ['pass_gold_candidate_gate', 'baseline'],
  ['baseline', 'archive_record'],
  ['archive_record', 'execution_baseline'],
];

function sha256(s) {
  return createHash('sha256').update(String(s)).digest('hex');
}

function blockedInput(reason) {
  return {
    schema_version: SCHEMA_VERSION,
    graph_id: null,
    root_execution_baseline_id: null,
    nodes: [],
    edges: [],
    graph_hash: null,
    graph_ready: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    status: 'EVIDENCE_GRAPH_BLOCKED_INPUT',
    errors: [reason],
  };
}

export function buildRealRepoPatchEvidenceGraph(input) {
  if (!input || typeof input !== 'object') {
    return blockedInput('input is null or not an object');
  }

  const {
    graph_id,
    chain_integrity_ready,
    execution_baseline_id,
    archive_record_id,
    baseline_id,
    pass_gold_candidate_id,
    final_report_id,
    ledger_id,
    evidence_receipt_id,
  } = input;

  if (!graph_id || typeof graph_id !== 'string' || !graph_id.trim()) {
    return blockedInput('Missing or invalid graph_id');
  }
  if (!execution_baseline_id || typeof execution_baseline_id !== 'string') {
    return blockedInput('Missing execution_baseline_id');
  }

  if (!chain_integrity_ready) {
    return {
      schema_version: SCHEMA_VERSION,
      graph_id,
      root_execution_baseline_id: null,
      nodes: [],
      edges: [],
      graph_hash: null,
      graph_ready: false,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      status: 'EVIDENCE_GRAPH_BLOCKED_INTEGRITY',
      errors: ['chain_integrity_ready must be true'],
    };
  }

  const nodes = GRAPH_NODES.map(name => ({
    id: name,
    ref_id: input[`${name}_id`] ?? null,
  }));

  const edges = GRAPH_EDGES.map(([from, to]) => ({ from, to }));

  const graph_hash = sha256(
    `${graph_id}:${execution_baseline_id}:${GRAPH_NODES.join(',')}`
  );

  return {
    schema_version: SCHEMA_VERSION,
    graph_id,
    root_execution_baseline_id: execution_baseline_id,
    nodes,
    edges,
    graph_hash,
    graph_ready: true,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    status: 'EVIDENCE_GRAPH_READY',
    errors: [],
  };
}

export function validateRealRepoPatchEvidenceGraph(graph) {
  if (!graph || typeof graph !== 'object') {
    return { valid: false, errors: ['graph is null or not an object'] };
  }
  const errors = [];
  if (graph.production_touched !== false) errors.push('production_touched must be false');
  if (graph.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (graph.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (graph.release_performed !== false) errors.push('release_performed must be false');
  if (!REAL_REPO_PATCH_EVIDENCE_GRAPH_STATUSES.includes(graph.status)) {
    errors.push(`Invalid status: ${graph.status}`);
  }
  if (graph.status === 'EVIDENCE_GRAPH_READY' && !graph.graph_ready) {
    errors.push('EVIDENCE_GRAPH_READY requires graph_ready=true');
  }
  if (graph.status === 'EVIDENCE_GRAPH_READY' && (!graph.graph_hash || graph.graph_hash.length !== 64)) {
    errors.push('EVIDENCE_GRAPH_READY requires 64-char graph_hash');
  }
  return { valid: errors.length === 0, errors };
}

export function renderRealRepoPatchEvidenceGraph(graph) {
  if (!graph || typeof graph !== 'object') return '[EvidenceGraph: null]';
  const lines = [
    `=== Real Repo Patch Evidence Graph ${SCHEMA_VERSION} ===`,
    `Status              : ${graph.status}`,
    `Graph ID            : ${graph.graph_id ?? 'N/A'}`,
    `Root Exec Baseline  : ${graph.root_execution_baseline_id ?? 'N/A'}`,
    `Nodes               : ${(graph.nodes || []).length}`,
    `Edges               : ${(graph.edges || []).length}`,
    `Graph Hash          : ${graph.graph_hash ?? 'N/A'}`,
    `Graph Ready         : ${graph.graph_ready}`,
    `Prod Touched        : ${graph.production_touched}`,
  ];
  if (graph.errors && graph.errors.length) lines.push(`Errors              : ${graph.errors.join('; ')}`);
  lines.push('--- REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable ---');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-repo-patch-evidence-graph.mjs')) {
  const demo = buildRealRepoPatchEvidenceGraph({
    graph_id: 'graph-demo-001',
    chain_integrity_ready: true,
    execution_baseline_id: 'exec-baseline-demo-001',
  });
  console.log(renderRealRepoPatchEvidenceGraph(demo));
  const v = validateRealRepoPatchEvidenceGraph(demo);
  console.log(`\nValidation: ${v.valid ? 'OK' : 'FAIL'}`);
}
