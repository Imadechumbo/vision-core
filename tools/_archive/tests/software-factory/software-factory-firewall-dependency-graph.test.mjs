import { STATUSES, build, validate, render } from '../../software-factory/software-factory-firewall-dependency-graph.mjs';

let passed = 0; let failed = 0;
function assert(cond, label) {
  if (cond) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const VERSIONS = ['V365','V366','V367','V368','V369','V370','V371','V372','V373','V374','V375'];
const CONTROLS = ['dependency-graph-required','chain-integrity-required','all-nodes-required','all-edges-required','no-cycle','no-missing-node','no-real-execution','audit-required','pass-gold-required'];
const REQUIRED_EDGES = [
  {from:'V365',to:'V366'},{from:'V366',to:'V367'},{from:'V367',to:'V368'},
  {from:'V368',to:'V369'},{from:'V369',to:'V370'},{from:'V370',to:'V371'},
  {from:'V371',to:'V372'},{from:'V372',to:'V373'},{from:'V373',to:'V374'},{from:'V374',to:'V375'},
];

function makeNodes() {
  return VERSIONS.map(v => ({ node_id: `node-${v.toLowerCase()}`, version: v, node_type: 'firewall_module', node_hash: 'd'.repeat(64) }));
}

function makeEdges() {
  return REQUIRED_EDGES.map(e => ({ ...e, edge_type: 'depends_on' }));
}

function validInput() {
  return {
    firewall_dependency_graph_id: 'graph-001',
    firewall_chain_integrity_verifier_id: 'verifier-001',
    firewall_chain_integrity_verifier_ready: true,
    graph_nodes: makeNodes(),
    graph_edges: makeEdges(),
    required_graph_controls: [...CONTROLS],
    graph_level: 'full-dependency-graph',
  };
}

console.log('\n=== firewall-dependency-graph tests ===\n');

console.log('--- exports ---');
assert(Array.isArray(STATUSES), 'STATUSES');
assert(STATUSES.includes('FIREWALL_DEPENDENCY_GRAPH_BLOCKED_INPUT'), 'B_INPUT');
assert(STATUSES.includes('FIREWALL_DEPENDENCY_GRAPH_BLOCKED_CHAIN'), 'B_CHAIN');
assert(STATUSES.includes('FIREWALL_DEPENDENCY_GRAPH_INCOMPLETE'), 'INCOMPLETE');
assert(STATUSES.includes('FIREWALL_DEPENDENCY_GRAPH_READY'), 'READY');
assert(typeof build === 'function', 'build');
assert(typeof validate === 'function', 'validate');
assert(typeof render === 'function', 'render');

console.log('--- blocked input ---');
assert(build(null).errors[0].startsWith('FIREWALL_DEPENDENCY_GRAPH_BLOCKED_INPUT'), 'null');
assert(build({}).errors[0].startsWith('FIREWALL_DEPENDENCY_GRAPH_BLOCKED_INPUT'), '{}');

console.log('--- blocked chain ---');
const noChain = validInput(); noChain.firewall_chain_integrity_verifier_ready = false;
assert(build(noChain).errors[0].startsWith('FIREWALL_DEPENDENCY_GRAPH_BLOCKED_CHAIN'), 'chain not ready');
const noChainId = validInput(); noChainId.firewall_chain_integrity_verifier_id = null;
assert(build(noChainId).errors[0].startsWith('FIREWALL_DEPENDENCY_GRAPH_BLOCKED_CHAIN'), 'missing chain id');

console.log('--- incomplete ---');
const missingNode = validInput(); missingNode.graph_nodes = makeNodes().filter(n => n.version !== 'V370');
assert(build(missingNode).errors[0].includes('INCOMPLETE'), 'missing node');
const missingEdge = validInput(); missingEdge.graph_edges = makeEdges().filter(e => !(e.from === 'V365' && e.to === 'V366'));
assert(build(missingEdge).errors[0].includes('INCOMPLETE'), 'missing edge');
const badEdgeType = validInput(); badEdgeType.graph_edges[0] = { ...badEdgeType.graph_edges[0], edge_type: 'bad_type' };
assert(build(badEdgeType).errors[0].includes('INCOMPLETE'), 'invalid edge_type');
const shortHash = validInput(); shortHash.graph_nodes[0] = { ...shortHash.graph_nodes[0], node_hash: 'short' };
assert(build(shortHash).errors[0].includes('INCOMPLETE'), 'short hash');
const missingCtrl = validInput(); missingCtrl.required_graph_controls = ['dependency-graph-required'];
assert(build(missingCtrl).errors[0].includes('INCOMPLETE'), 'missing controls');
const noLevel = validInput(); noLevel.graph_level = null;
assert(build(noLevel).errors[0].includes('INCOMPLETE'), 'missing level');

console.log('--- ready ---');
const r = build(validInput());
assert(r.firewall_dependency_graph_ready === true, 'ready');
assert(r.graph_hash && r.graph_hash.length === 64, 'hash64');
assert(r.graph_nodes_count === 11, 'nodes count 11');
assert(r.graph_edges_count === 10, 'edges count 10');
assert(r.missing_nodes.length === 0, 'no missing nodes');
assert(r.missing_edges.length === 0, 'no missing edges');
assert(r.firewall_dependency_graph_published === false, 'graph not published');
assert(r.firewall_chain_integrity_confirmed === false, 'chain not confirmed');
assert(r.unified_firewall_snapshot_published === false, 'snapshot not published');
assert(r.firewall_policy_bound === false, 'policy not bound');
assert(r.release_firewall_consolidation_phase_passed === false, 'consolidation not passed');
assert(r.release_execution_firewall_phase_passed === false, 'exec fw phase not passed');
assert(r.real_release_executed === false, 'not executed');
assert(r.production_touched === false, 'not touched');
assert(r.release_allowed === false, 'no release');
assert(r.deploy_allowed === false, 'no deploy');
assert(r.stable_allowed === false, 'no stable');
assert(r.tag_allowed === false, 'no tag');
assert(r.real_execution_allowed === false, 'no real exec');
assert(r.errors.length === 0, 'no errors');

console.log('--- validate ---');
assert(validate(r).valid === true, 'vready');
assert(validate(null).valid === false, 'vnull');
assert(validate({}).valid === false, 'vblocked');

console.log('--- render ---');
const rend = render(r);
assert(typeof rend === 'string', 'rend string');
assert(rend.includes('FIREWALL_DEPENDENCY_GRAPH_READY'), 'status ready');
assert(rend.includes('REGRA ABSOLUTA'), 'REGRA');
assert(render(null) === 'FIREWALL_DEPENDENCY_GRAPH_BLOCKED_INPUT', 'null render');

console.log('--- invariants ---');
assert(build(validInput()).graph_hash === build(validInput()).graph_hash, 'deterministic hash');

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
