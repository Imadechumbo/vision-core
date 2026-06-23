#!/usr/bin/env node
/**
 * Tests — Real Repo Patch Trusted Evidence Graph V182.0
 */

import {
  buildRealRepoPatchEvidenceGraph,
  validateRealRepoPatchEvidenceGraph,
  renderRealRepoPatchEvidenceGraph,
  REAL_REPO_PATCH_EVIDENCE_GRAPH_STATUSES,
} from '../real-repo-patch-evidence-graph.mjs';

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label}`);
    failed++;
  }
}

const VALID_INPUT = {
  graph_id: 'graph-001',
  chain_integrity_ready: true,
  execution_baseline_id: 'exec-baseline-001',
  archive_record_id: 'archive-001',
  baseline_id: 'baseline-001',
  pass_gold_candidate_id: 'pg-001',
  final_report_id: 'report-001',
  ledger_id: 'ledger-001',
  evidence_receipt_id: 'receipt-001',
};

console.log('\n=== real-repo-patch-evidence-graph tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(REAL_REPO_PATCH_EVIDENCE_GRAPH_STATUSES));
assert('has BLOCKED_INPUT', REAL_REPO_PATCH_EVIDENCE_GRAPH_STATUSES.includes('EVIDENCE_GRAPH_BLOCKED_INPUT'));
assert('has BLOCKED_INTEGRITY', REAL_REPO_PATCH_EVIDENCE_GRAPH_STATUSES.includes('EVIDENCE_GRAPH_BLOCKED_INTEGRITY'));
assert('has READY', REAL_REPO_PATCH_EVIDENCE_GRAPH_STATUSES.includes('EVIDENCE_GRAPH_READY'));
assert('build is function', typeof buildRealRepoPatchEvidenceGraph === 'function');
assert('validate is function', typeof validateRealRepoPatchEvidenceGraph === 'function');
assert('render is function', typeof renderRealRepoPatchEvidenceGraph === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildRealRepoPatchEvidenceGraph(null);
  assert('null → BLOCKED_INPUT', r.status === 'EVIDENCE_GRAPH_BLOCKED_INPUT');
  assert('null: graph_ready=false', r.graph_ready === false);
  assert('null: production_touched=false', r.production_touched === false);
  assert('null: deploy_performed=false', r.deploy_performed === false);
  assert('null: stable_promoted=false', r.stable_promoted === false);
  assert('null: release_performed=false', r.release_performed === false);
}
{
  const r = buildRealRepoPatchEvidenceGraph({});
  assert('no graph_id → BLOCKED_INPUT', r.status === 'EVIDENCE_GRAPH_BLOCKED_INPUT');
}
{
  const r = buildRealRepoPatchEvidenceGraph({ graph_id: 'g', chain_integrity_ready: true });
  assert('no execution_baseline_id → BLOCKED_INPUT', r.status === 'EVIDENCE_GRAPH_BLOCKED_INPUT');
}

// --- blocked integrity ---
console.log('--- blocked integrity ---');
{
  const r = buildRealRepoPatchEvidenceGraph({ ...VALID_INPUT, chain_integrity_ready: false });
  assert('integrity=false → BLOCKED_INTEGRITY', r.status === 'EVIDENCE_GRAPH_BLOCKED_INTEGRITY');
  assert('blocked_integrity: graph_ready=false', r.graph_ready === false);
  assert('blocked_integrity: nodes empty', r.nodes.length === 0);
  assert('blocked_integrity: production_touched=false', r.production_touched === false);
}
{
  const r = buildRealRepoPatchEvidenceGraph({ ...VALID_INPUT, chain_integrity_ready: undefined });
  assert('integrity=undefined → BLOCKED_INTEGRITY', r.status === 'EVIDENCE_GRAPH_BLOCKED_INTEGRITY');
}

// --- ready ---
console.log('--- ready ---');
{
  const r = buildRealRepoPatchEvidenceGraph(VALID_INPUT);
  assert('valid → EVIDENCE_GRAPH_READY', r.status === 'EVIDENCE_GRAPH_READY');
  assert('ready: graph_ready=true', r.graph_ready === true);
  assert('ready: schema_version=v182.0', r.schema_version === 'v182.0');
  assert('ready: graph_id set', r.graph_id === 'graph-001');
  assert('ready: root_execution_baseline_id set', r.root_execution_baseline_id === 'exec-baseline-001');
  assert('ready: graph_hash 64 chars', typeof r.graph_hash === 'string' && r.graph_hash.length === 64);
  assert('ready: nodes has 15 entries', r.nodes.length === 15);
  assert('ready: edges non-empty', r.edges.length > 0);
  assert('ready: errors empty', r.errors.length === 0);
  assert('ready: production_touched=false', r.production_touched === false);
  assert('ready: deploy_performed=false', r.deploy_performed === false);
  assert('ready: stable_promoted=false', r.stable_promoted === false);
  assert('ready: release_performed=false', r.release_performed === false);
}

// --- nodes and edges ---
console.log('--- nodes and edges ---');
{
  const r = buildRealRepoPatchEvidenceGraph(VALID_INPUT);
  const nodeIds = r.nodes.map(n => n.id);
  assert('nodes: has scope_contract', nodeIds.includes('scope_contract'));
  assert('nodes: has execution_baseline', nodeIds.includes('execution_baseline'));
  assert('nodes: has evidence_receipt', nodeIds.includes('evidence_receipt'));
  const edgePairs = r.edges.map(e => `${e.from}->${e.to}`);
  assert('edges: has scope→pre_state', edgePairs.includes('scope_contract->pre_state_snapshot'));
  assert('edges: has archive→execution_baseline', edgePairs.includes('archive_record->execution_baseline'));
  assert('edges: has pass_gold→baseline', edgePairs.includes('pass_gold_candidate_gate->baseline'));
}

// --- hash determinism ---
console.log('--- hash determinism ---');
{
  const r1 = buildRealRepoPatchEvidenceGraph(VALID_INPUT);
  const r2 = buildRealRepoPatchEvidenceGraph(VALID_INPUT);
  assert('hash deterministic', r1.graph_hash === r2.graph_hash);
  const r3 = buildRealRepoPatchEvidenceGraph({ ...VALID_INPUT, execution_baseline_id: 'exec-002' });
  assert('different exec_id → different hash', r1.graph_hash !== r3.graph_hash);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildRealRepoPatchEvidenceGraph(VALID_INPUT);
  const v = validateRealRepoPatchEvidenceGraph(r);
  assert('validate ready: valid=true', v.valid === true);
  assert('validate ready: no errors', v.errors.length === 0);
}
{
  const r = buildRealRepoPatchEvidenceGraph(null);
  const v = validateRealRepoPatchEvidenceGraph(r);
  assert('validate blocked: valid=true', v.valid === true);
}
{
  const v = validateRealRepoPatchEvidenceGraph(null);
  assert('validate null: valid=false', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildRealRepoPatchEvidenceGraph(VALID_INPUT);
  const s = renderRealRepoPatchEvidenceGraph(r);
  assert('render: is string', typeof s === 'string');
  assert('render: contains EVIDENCE_GRAPH_READY', s.includes('EVIDENCE_GRAPH_READY'));
  assert('render: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
  assert('render: contains 15', s.includes('15'));
}
{
  const s = renderRealRepoPatchEvidenceGraph(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildRealRepoPatchEvidenceGraph(null),
    buildRealRepoPatchEvidenceGraph({}),
    buildRealRepoPatchEvidenceGraph({ ...VALID_INPUT, chain_integrity_ready: false }),
    buildRealRepoPatchEvidenceGraph(VALID_INPUT),
  ];
  assert('all: production_touched=false', cases.every(r => r.production_touched === false));
  assert('all: deploy_performed=false', cases.every(r => r.deploy_performed === false));
  assert('all: stable_promoted=false', cases.every(r => r.stable_promoted === false));
  assert('all: release_performed=false', cases.every(r => r.release_performed === false));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
