import { STATUSES, build, validate, render } from '../../software-factory/software-factory-unified-release-firewall-snapshot.mjs';

let passed = 0; let failed = 0;
function assert(cond, label) {
  if (cond) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const CONTROLS = ['snapshot-required','registry-required','no-real-publish','no-artifact-publish','no-network','no-secret-access','no-production-touch','no-real-release','no-real-deploy','no-tag-create','no-stable-promotion','no-real-rollback','audit-required','pass-gold-required'];

function makeItem(id, type = 'registry_snapshot', mode = 'metadata-only') {
  return { snapshot_id: id, snapshot_type: type, snapshot_mode: mode, snapshot_hash: 'b'.repeat(64) };
}

function validInput() {
  return {
    unified_release_firewall_snapshot_id: 'snap-001',
    release_firewall_module_registry_id: 'reg-001',
    release_firewall_module_registry_ready: true,
    snapshot_items: [makeItem('s1'), makeItem('s2','firewall_state','blocked'), makeItem('s3','module_state','contract-only')],
    required_snapshot_controls: [...CONTROLS],
    snapshot_level: 'consolidated-firewall',
  };
}

console.log('\n=== unified-release-firewall-snapshot tests ===\n');

console.log('--- exports ---');
assert(Array.isArray(STATUSES), 'STATUSES');
assert(STATUSES.includes('UNIFIED_RELEASE_FIREWALL_SNAPSHOT_BLOCKED_INPUT'), 'B_INPUT');
assert(STATUSES.includes('UNIFIED_RELEASE_FIREWALL_SNAPSHOT_BLOCKED_REGISTRY'), 'B_REGISTRY');
assert(STATUSES.includes('UNIFIED_RELEASE_FIREWALL_SNAPSHOT_FAIL'), 'FAIL');
assert(STATUSES.includes('UNIFIED_RELEASE_FIREWALL_SNAPSHOT_READY'), 'READY');
assert(typeof build === 'function', 'build');
assert(typeof validate === 'function', 'validate');
assert(typeof render === 'function', 'render');

console.log('--- blocked input ---');
assert(build(null).errors[0].startsWith('UNIFIED_RELEASE_FIREWALL_SNAPSHOT_BLOCKED_INPUT'), 'null');
assert(build({}).errors[0].startsWith('UNIFIED_RELEASE_FIREWALL_SNAPSHOT_BLOCKED_INPUT'), '{}');

console.log('--- blocked registry ---');
const noReg = validInput(); noReg.release_firewall_module_registry_ready = false;
assert(build(noReg).errors[0].startsWith('UNIFIED_RELEASE_FIREWALL_SNAPSHOT_BLOCKED_REGISTRY'), 'registry not ready');
const noRegId = validInput(); noRegId.release_firewall_module_registry_id = null;
assert(build(noRegId).errors[0].startsWith('UNIFIED_RELEASE_FIREWALL_SNAPSHOT_BLOCKED_REGISTRY'), 'missing registry id');

console.log('--- fail ---');
const empty = validInput(); empty.snapshot_items = [];
assert(build(empty).errors[0].includes('FAIL'), 'empty items');
const badType = validInput(); badType.snapshot_items[0] = { ...badType.snapshot_items[0], snapshot_type: 'bad_type' };
assert(build(badType).errors[0].includes('FAIL'), 'invalid snapshot_type');
const badMode = validInput(); badMode.snapshot_items[0] = { ...badMode.snapshot_items[0], snapshot_mode: 'real' };
assert(build(badMode).errors[0].includes('FAIL'), 'invalid snapshot_mode');
const shortHash = validInput(); shortHash.snapshot_items[0] = { ...shortHash.snapshot_items[0], snapshot_hash: 'short' };
assert(build(shortHash).errors[0].includes('FAIL'), 'short hash');
const missingCtrl = validInput(); missingCtrl.required_snapshot_controls = ['snapshot-required'];
assert(build(missingCtrl).errors[0].includes('FAIL'), 'missing controls');
const noLevel = validInput(); noLevel.snapshot_level = null;
assert(build(noLevel).errors[0].includes('FAIL'), 'missing level');

console.log('--- ready ---');
const r = build(validInput());
assert(r.unified_release_firewall_snapshot_ready === true, 'ready');
assert(r.snapshot_hash && r.snapshot_hash.length === 64, 'hash64');
assert(r.snapshot_items_count === 3, 'items count 3');
assert(r.required_snapshot_controls_count === 14, 'controls count 14');
assert(r.unified_firewall_snapshot_published === false, 'snapshot not published');
assert(r.release_firewall_registry_published === false, 'registry not published');
assert(r.firewall_chain_integrity_confirmed === false, 'chain not confirmed');
assert(r.firewall_dependency_graph_published === false, 'graph not published');
assert(r.firewall_policy_bound === false, 'policy not bound');
assert(r.release_firewall_consolidation_phase_passed === false, 'consolidation not passed');
assert(r.release_execution_firewall_phase_passed === false, 'exec fw phase not passed');
assert(r.release_execution_firewall_enabled === false, 'fw not enabled');
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
assert(rend.includes('UNIFIED_RELEASE_FIREWALL_SNAPSHOT_READY'), 'status ready');
assert(rend.includes('REGRA ABSOLUTA'), 'REGRA');
assert(render(null) === 'UNIFIED_RELEASE_FIREWALL_SNAPSHOT_BLOCKED_INPUT', 'null render');

console.log('--- invariants ---');
const h1 = build(validInput()).snapshot_hash;
const h2 = build(validInput()).snapshot_hash;
assert(h1 === h2, 'deterministic hash');

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
