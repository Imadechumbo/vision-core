import { STATUSES, build, validate, render } from '../../software-factory/software-factory-firewall-policy-binding.mjs';

let passed = 0; let failed = 0;
function assert(cond, label) {
  if (cond) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const CONTROLS = ['firewall-policy-required','dependency-graph-required','no-real-policy-enforcement','no-real-release','no-real-deploy','no-tag-create','no-stable-promotion','no-artifact-publish','no-production-touch','no-billing-execution','no-secret-access','no-network','no-real-rollback','audit-required','pass-gold-required'];

function makeItem(id, type = 'release_policy', mode = 'blocked') {
  return { policy_id: id, policy_type: type, policy_mode: mode, policy_hash: 'e'.repeat(64) };
}

function validInput() {
  return {
    firewall_policy_binding_id: 'policy-001',
    firewall_dependency_graph_id: 'graph-001',
    firewall_dependency_graph_ready: true,
    policy_items: [
      makeItem('p1','release_policy','blocked'),
      makeItem('p2','deployment_policy','metadata-only'),
      makeItem('p3','tag_policy','contract-only'),
    ],
    required_policy_controls: [...CONTROLS],
    policy_level: 'firewall-policy-binding',
  };
}

console.log('\n=== firewall-policy-binding tests ===\n');

console.log('--- exports ---');
assert(Array.isArray(STATUSES), 'STATUSES');
assert(STATUSES.includes('FIREWALL_POLICY_BINDING_BLOCKED_INPUT'), 'B_INPUT');
assert(STATUSES.includes('FIREWALL_POLICY_BINDING_BLOCKED_GRAPH'), 'B_GRAPH');
assert(STATUSES.includes('FIREWALL_POLICY_BINDING_FAIL'), 'FAIL');
assert(STATUSES.includes('FIREWALL_POLICY_BINDING_READY'), 'READY');
assert(typeof build === 'function', 'build');
assert(typeof validate === 'function', 'validate');
assert(typeof render === 'function', 'render');

console.log('--- blocked input ---');
assert(build(null).errors[0].startsWith('FIREWALL_POLICY_BINDING_BLOCKED_INPUT'), 'null');
assert(build({}).errors[0].startsWith('FIREWALL_POLICY_BINDING_BLOCKED_INPUT'), '{}');

console.log('--- blocked graph ---');
const noGraph = validInput(); noGraph.firewall_dependency_graph_ready = false;
assert(build(noGraph).errors[0].startsWith('FIREWALL_POLICY_BINDING_BLOCKED_GRAPH'), 'graph not ready');
const noGraphId = validInput(); noGraphId.firewall_dependency_graph_id = null;
assert(build(noGraphId).errors[0].startsWith('FIREWALL_POLICY_BINDING_BLOCKED_GRAPH'), 'missing graph id');

console.log('--- fail ---');
const empty = validInput(); empty.policy_items = [];
assert(build(empty).errors[0].includes('FAIL'), 'empty items');
const badType = validInput(); badType.policy_items[0] = { ...badType.policy_items[0], policy_type: 'bad_type' };
assert(build(badType).errors[0].includes('FAIL'), 'invalid policy_type');
const badMode = validInput(); badMode.policy_items[0] = { ...badMode.policy_items[0], policy_mode: 'real' };
assert(build(badMode).errors[0].includes('FAIL'), 'invalid policy_mode');
const shortHash = validInput(); shortHash.policy_items[0] = { ...shortHash.policy_items[0], policy_hash: 'short' };
assert(build(shortHash).errors[0].includes('FAIL'), 'short hash');
const missingCtrl = validInput(); missingCtrl.required_policy_controls = ['firewall-policy-required'];
assert(build(missingCtrl).errors[0].includes('FAIL'), 'missing controls');
const noLevel = validInput(); noLevel.policy_level = null;
assert(build(noLevel).errors[0].includes('FAIL'), 'missing level');

console.log('--- ready ---');
const r = build(validInput());
assert(r.firewall_policy_binding_ready === true, 'ready');
assert(r.policy_hash && r.policy_hash.length === 64, 'hash64');
assert(r.policy_items_count === 3, 'items count 3');
assert(r.required_policy_controls_count === 15, 'controls count 15');
assert(r.firewall_policy_bound === false, 'policy not bound');
assert(r.firewall_dependency_graph_published === false, 'graph not published');
assert(r.firewall_chain_integrity_confirmed === false, 'chain not confirmed');
assert(r.unified_firewall_snapshot_published === false, 'snapshot not published');
assert(r.release_firewall_registry_published === false, 'registry not published');
assert(r.release_firewall_consolidation_phase_passed === false, 'consolidation not passed');
assert(r.release_execution_firewall_phase_passed === false, 'exec fw phase not passed');
assert(r.release_execution_firewall_enabled === false, 'fw not enabled');
assert(r.real_release_executed === false, 'not executed');
assert(r.production_touched === false, 'not touched');
assert(r.billing_executed === false, 'not billed');
assert(r.secrets_accessed === false, 'secrets not accessed');
assert(r.network_accessed === false, 'network not accessed');
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
assert(rend.includes('FIREWALL_POLICY_BINDING_READY'), 'status ready');
assert(rend.includes('REGRA ABSOLUTA'), 'REGRA');
assert(render(null) === 'FIREWALL_POLICY_BINDING_BLOCKED_INPUT', 'null render');

console.log('--- invariants ---');
assert(build(validInput()).policy_hash === build(validInput()).policy_hash, 'deterministic hash');
assert(render({ ...r, firewall_policy_binding_ready: false, errors: ['FIREWALL_POLICY_BINDING_BLOCKED_GRAPH: x'] }).includes('BLOCKED_GRAPH'), 'blocked graph render');
assert(render({ ...r, firewall_policy_binding_ready: false, errors: ['FIREWALL_POLICY_BINDING_FAIL: x'] }).includes('FAIL'), 'fail render');

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
