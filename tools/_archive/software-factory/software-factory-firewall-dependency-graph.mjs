import { createHash } from 'crypto';

export const STATUSES = [
  'FIREWALL_DEPENDENCY_GRAPH_BLOCKED_INPUT',
  'FIREWALL_DEPENDENCY_GRAPH_BLOCKED_CHAIN',
  'FIREWALL_DEPENDENCY_GRAPH_INCOMPLETE',
  'FIREWALL_DEPENDENCY_GRAPH_READY',
];

const REQUIRED_VERSIONS = ['V365','V366','V367','V368','V369','V370','V371','V372','V373','V374','V375'];

const REQUIRED_EDGES = [
  { from: 'V365', to: 'V366' },
  { from: 'V366', to: 'V367' },
  { from: 'V367', to: 'V368' },
  { from: 'V368', to: 'V369' },
  { from: 'V369', to: 'V370' },
  { from: 'V370', to: 'V371' },
  { from: 'V371', to: 'V372' },
  { from: 'V372', to: 'V373' },
  { from: 'V373', to: 'V374' },
  { from: 'V374', to: 'V375' },
];

const ALLOWED_EDGE_TYPES = new Set([
  'depends_on','blocks_before','evidence_for','authority_for','phase_for',
]);

const REQUIRED_CONTROLS = [
  'dependency-graph-required','chain-integrity-required','all-nodes-required',
  'all-edges-required','no-cycle','no-missing-node','no-real-execution',
  'audit-required','pass-gold-required',
];

const BASE = {
  schema_version: 'v380.0',
  firewall_dependency_graph_id: null,
  firewall_dependency_graph_ready: false,
  firewall_chain_integrity_verifier_id: null,
  firewall_chain_integrity_verifier_ready: false,
  graph_nodes: [],
  graph_nodes_count: 0,
  graph_edges: [],
  graph_edges_count: 0,
  missing_nodes: [],
  missing_edges: [],
  required_graph_controls: [],
  required_graph_controls_count: 0,
  graph_level: null,
  graph_hash: null,
  release_firewall_registry_published: false,
  unified_firewall_snapshot_published: false,
  firewall_chain_integrity_confirmed: false,
  firewall_dependency_graph_published: false,
  firewall_policy_bound: false,
  unified_release_authority_report_published: false,
  firewall_evidence_index_published: false,
  firewall_drift_detected: false,
  firewall_regression_guard_enabled: false,
  unified_firewall_final_review_approved: false,
  release_firewall_consolidation_phase_passed: false,
  release_execution_firewall_phase_passed: false,
  release_execution_firewall_enabled: false,
  production_mutation_firewall_locked: false,
  secret_access_firewall_locked: false,
  billing_execution_firewall_locked: false,
  network_execution_firewall_locked: false,
  artifact_tag_stable_firewall_locked: false,
  rollback_execution_firewall_locked: false,
  last_mile_noop_drill_completed: false,
  firewall_evidence_receipt_published: false,
  firewall_final_authority_approved: false,
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
  release_allowed: false,
  deploy_allowed: false,
  stable_allowed: false,
  tag_allowed: false,
  real_execution_allowed: false,
  errors: [],
};

function hash(d) { return createHash('sha256').update(JSON.stringify(d)).digest('hex'); }

function findMissingNodes(nodes) {
  const found = new Set((nodes || []).map(n => n && n.version));
  return REQUIRED_VERSIONS.filter(v => !found.has(v));
}

function findMissingEdges(edges) {
  const edgeSet = new Set((edges || []).map(e => e && `${e.from}->${e.to}`));
  return REQUIRED_EDGES.filter(re => !edgeSet.has(`${re.from}->${re.to}`));
}

export function build(input) {
  if (!input || typeof input !== 'object') {
    return { ...BASE, errors: ['FIREWALL_DEPENDENCY_GRAPH_BLOCKED_INPUT'] };
  }
  if (!input.firewall_dependency_graph_id || typeof input.firewall_dependency_graph_id !== 'string') {
    return { ...BASE, errors: ['FIREWALL_DEPENDENCY_GRAPH_BLOCKED_INPUT: missing firewall_dependency_graph_id'] };
  }
  if (input.firewall_chain_integrity_verifier_ready !== true) {
    return { ...BASE, firewall_dependency_graph_id: input.firewall_dependency_graph_id, errors: ['FIREWALL_DEPENDENCY_GRAPH_BLOCKED_CHAIN: firewall_chain_integrity_verifier_ready must be true'] };
  }
  if (!input.firewall_chain_integrity_verifier_id || typeof input.firewall_chain_integrity_verifier_id !== 'string') {
    return { ...BASE, firewall_dependency_graph_id: input.firewall_dependency_graph_id, errors: ['FIREWALL_DEPENDENCY_GRAPH_BLOCKED_CHAIN: missing firewall_chain_integrity_verifier_id'] };
  }
  const nodes = input.graph_nodes || [];
  const edges = input.graph_edges || [];
  const missingNodes = findMissingNodes(nodes);
  const missingEdges = findMissingEdges(edges);
  if (missingNodes.length > 0) {
    return { ...BASE, firewall_dependency_graph_id: input.firewall_dependency_graph_id, firewall_chain_integrity_verifier_id: input.firewall_chain_integrity_verifier_id, firewall_chain_integrity_verifier_ready: true, missing_nodes: missingNodes, errors: [`FIREWALL_DEPENDENCY_GRAPH_INCOMPLETE: missing nodes: ${missingNodes.join(', ')}`] };
  }
  if (missingEdges.length > 0) {
    const desc = missingEdges.map(e => `${e.from}->${e.to}`);
    return { ...BASE, firewall_dependency_graph_id: input.firewall_dependency_graph_id, firewall_chain_integrity_verifier_id: input.firewall_chain_integrity_verifier_id, firewall_chain_integrity_verifier_ready: true, missing_edges: desc, errors: [`FIREWALL_DEPENDENCY_GRAPH_INCOMPLETE: missing edges: ${desc.join(', ')}`] };
  }
  const errors = [];
  for (const n of nodes) {
    if (!n || !n.node_id || typeof n.node_id !== 'string') { errors.push('FIREWALL_DEPENDENCY_GRAPH_INCOMPLETE: node missing node_id'); continue; }
    if (!n.node_hash || typeof n.node_hash !== 'string' || n.node_hash.length !== 64) { errors.push(`FIREWALL_DEPENDENCY_GRAPH_INCOMPLETE: node ${n.node_id} invalid node_hash`); }
  }
  for (const e of edges) {
    if (!e || !e.from || !e.to) { errors.push('FIREWALL_DEPENDENCY_GRAPH_INCOMPLETE: edge missing from/to'); continue; }
    if (!ALLOWED_EDGE_TYPES.has(e.edge_type)) { errors.push(`FIREWALL_DEPENDENCY_GRAPH_INCOMPLETE: edge ${e.from}->${e.to} invalid edge_type`); }
  }
  const controls = input.required_graph_controls || [];
  const missingControls = REQUIRED_CONTROLS.filter(c => !controls.includes(c));
  if (missingControls.length > 0) { errors.push(`FIREWALL_DEPENDENCY_GRAPH_INCOMPLETE: missing controls: ${missingControls.join(', ')}`); }
  if (!input.graph_level || typeof input.graph_level !== 'string') { errors.push('FIREWALL_DEPENDENCY_GRAPH_INCOMPLETE: missing graph_level'); }
  if (errors.length > 0) return { ...BASE, firewall_dependency_graph_id: input.firewall_dependency_graph_id, firewall_chain_integrity_verifier_id: input.firewall_chain_integrity_verifier_id, firewall_chain_integrity_verifier_ready: true, errors };
  const h = hash({ id: input.firewall_dependency_graph_id, nodes, edges, controls, level: input.graph_level });
  return {
    ...BASE,
    firewall_dependency_graph_id: input.firewall_dependency_graph_id,
    firewall_dependency_graph_ready: true,
    firewall_chain_integrity_verifier_id: input.firewall_chain_integrity_verifier_id,
    firewall_chain_integrity_verifier_ready: true,
    graph_nodes: input.graph_nodes,
    graph_nodes_count: input.graph_nodes.length,
    graph_edges: input.graph_edges,
    graph_edges_count: input.graph_edges.length,
    missing_nodes: [],
    missing_edges: [],
    required_graph_controls: controls,
    required_graph_controls_count: controls.length,
    graph_level: input.graph_level,
    graph_hash: h,
    errors: [],
  };
}

export function validate(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['null result'] };
  const e = [];
  if (!result.firewall_dependency_graph_id) e.push('missing firewall_dependency_graph_id');
  const MUST_FALSE = [
    'release_firewall_registry_published','unified_firewall_snapshot_published',
    'firewall_chain_integrity_confirmed','firewall_dependency_graph_published',
    'firewall_policy_bound','unified_release_authority_report_published',
    'firewall_evidence_index_published','firewall_drift_detected',
    'firewall_regression_guard_enabled','unified_firewall_final_review_approved',
    'release_firewall_consolidation_phase_passed','release_execution_firewall_phase_passed',
    'release_execution_firewall_enabled','production_mutation_firewall_locked',
    'secret_access_firewall_locked','billing_execution_firewall_locked',
    'network_execution_firewall_locked','artifact_tag_stable_firewall_locked',
    'rollback_execution_firewall_locked','last_mile_noop_drill_completed',
    'firewall_evidence_receipt_published','firewall_final_authority_approved',
    'real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted',
    'artifact_published','production_touched','billing_executed','secrets_accessed',
    'network_accessed','rollback_executed','release_allowed','deploy_allowed',
    'stable_allowed','tag_allowed','real_execution_allowed',
  ];
  MUST_FALSE.forEach(k => { if (result[k] !== false) e.push(`${k} must be false`); });
  if (result.errors?.length > 0) e.push('build has errors');
  return { valid: e.length === 0, errors: e };
}

export function render(result) {
  if (!result || typeof result !== 'object') return 'FIREWALL_DEPENDENCY_GRAPH_BLOCKED_INPUT';
  let status;
  if (result.firewall_dependency_graph_ready) status = 'FIREWALL_DEPENDENCY_GRAPH_READY';
  else if (result.errors?.some(e => e.startsWith('FIREWALL_DEPENDENCY_GRAPH_BLOCKED_CHAIN'))) status = 'FIREWALL_DEPENDENCY_GRAPH_BLOCKED_CHAIN';
  else if (result.errors?.some(e => e.startsWith('FIREWALL_DEPENDENCY_GRAPH_INCOMPLETE'))) status = 'FIREWALL_DEPENDENCY_GRAPH_INCOMPLETE';
  else status = 'FIREWALL_DEPENDENCY_GRAPH_BLOCKED_INPUT';
  let out = `=== ${status} ===\nfirewall_dependency_graph_id: ${result.firewall_dependency_graph_id || '(none)'}\nfirewall_dependency_graph_ready: ${result.firewall_dependency_graph_ready}\nfirewall_chain_integrity_verifier_id: ${result.firewall_chain_integrity_verifier_id || '(none)'}\nfirewall_chain_integrity_verifier_ready: ${result.firewall_chain_integrity_verifier_ready}\ngraph_nodes_count: ${result.graph_nodes_count}\ngraph_edges_count: ${result.graph_edges_count}\ngraph_level: ${result.graph_level || '(none)'}\n`;
  if (result.graph_hash) out += `graph_hash: ${result.graph_hash}\n`;
  if (result.missing_nodes?.length) out += `missing_nodes: ${result.missing_nodes.join(', ')}\n`;
  if (result.missing_edges?.length) out += `missing_edges: ${result.missing_edges.join(', ')}\n`;
  ['firewall_dependency_graph_published','release_firewall_consolidation_phase_passed','release_execution_firewall_phase_passed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','production_touched','artifact_published','billing_executed','secrets_accessed','network_accessed','rollback_executed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted'].forEach(k => { out += `${k}: ${result[k]}\n`; });
  out += 'REGRA ABSOLUTA: SEM PASS GOLD REAL — nao promove, nao libera, nao marca stable\n';
  if (result.errors?.length) out += `errors: ${result.errors.join('; ')}\n`;
  return out;
}
