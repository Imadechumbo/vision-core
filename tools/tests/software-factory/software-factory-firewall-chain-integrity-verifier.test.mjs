import { STATUSES, build, validate, render } from '../../software-factory/software-factory-firewall-chain-integrity-verifier.mjs';

let passed = 0; let failed = 0;
function assert(cond, label) {
  if (cond) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const VERSIONS = ['V365','V366','V367','V368','V369','V370','V371','V372','V373','V374','V375'];
const TYPES = ['firewall_contract','mutation_boundary','secret_boundary','billing_boundary','network_boundary','artifact_boundary','rollback_boundary','noop_drill','evidence_receipt','authority_review','phase_gate'];
const CONTROLS = ['chain-integrity-required','all-versions-required','no-missing-module','no-duplicate-module','no-chain-break','atomic-modules-preserved','registry-required','snapshot-required','no-real-execution','audit-required','pass-gold-required'];

function makeChainItems() {
  return VERSIONS.map((v, i) => ({
    chain_id: `chain-${v.toLowerCase()}`,
    version: v,
    chain_type: TYPES[i % TYPES.length],
    chain_hash: 'c'.repeat(64),
    previous_version: i > 0 ? VERSIONS[i-1] : null,
    next_version: i < VERSIONS.length-1 ? VERSIONS[i+1] : null,
  }));
}

function validInput() {
  return {
    firewall_chain_integrity_verifier_id: 'verifier-001',
    unified_release_firewall_snapshot_id: 'snap-001',
    unified_release_firewall_snapshot_ready: true,
    chain_items: makeChainItems(),
    required_chain_controls: [...CONTROLS],
    chain_level: 'full-chain-verification',
  };
}

console.log('\n=== firewall-chain-integrity-verifier tests ===\n');

console.log('--- exports ---');
assert(Array.isArray(STATUSES), 'STATUSES');
assert(STATUSES.includes('FIREWALL_CHAIN_INTEGRITY_BLOCKED_INPUT'), 'B_INPUT');
assert(STATUSES.includes('FIREWALL_CHAIN_INTEGRITY_BLOCKED_SNAPSHOT'), 'B_SNAPSHOT');
assert(STATUSES.includes('FIREWALL_CHAIN_INTEGRITY_INCOMPLETE'), 'INCOMPLETE');
assert(STATUSES.includes('FIREWALL_CHAIN_INTEGRITY_READY'), 'READY');
assert(typeof build === 'function', 'build');
assert(typeof validate === 'function', 'validate');
assert(typeof render === 'function', 'render');

console.log('--- blocked input ---');
assert(build(null).errors[0].startsWith('FIREWALL_CHAIN_INTEGRITY_BLOCKED_INPUT'), 'null');
assert(build({}).errors[0].startsWith('FIREWALL_CHAIN_INTEGRITY_BLOCKED_INPUT'), '{}');

console.log('--- blocked snapshot ---');
const noSnap = validInput(); noSnap.unified_release_firewall_snapshot_ready = false;
assert(build(noSnap).errors[0].startsWith('FIREWALL_CHAIN_INTEGRITY_BLOCKED_SNAPSHOT'), 'snapshot not ready');
const noSnapId = validInput(); noSnapId.unified_release_firewall_snapshot_id = null;
assert(build(noSnapId).errors[0].startsWith('FIREWALL_CHAIN_INTEGRITY_BLOCKED_SNAPSHOT'), 'missing snapshot id');

console.log('--- incomplete ---');
const missingV = validInput(); missingV.chain_items = makeChainItems().filter(it => it.version !== 'V370');
assert(build(missingV).errors[0].includes('INCOMPLETE'), 'missing version');
const dupeV = validInput(); dupeV.chain_items = [...makeChainItems(), { ...makeChainItems()[0], chain_id: 'dupe' }];
assert(build(dupeV).errors[0].includes('INCOMPLETE'), 'duplicate version');
const badType = validInput(); badType.chain_items[0] = { ...badType.chain_items[0], chain_type: 'bad_type' };
assert(build(badType).errors[0].includes('INCOMPLETE'), 'invalid chain_type');
const shortHash = validInput(); shortHash.chain_items[0] = { ...shortHash.chain_items[0], chain_hash: 'short' };
assert(build(shortHash).errors[0].includes('INCOMPLETE'), 'short hash');
const missingCtrl = validInput(); missingCtrl.required_chain_controls = ['chain-integrity-required'];
assert(build(missingCtrl).errors[0].includes('INCOMPLETE'), 'missing controls');
const noLevel = validInput(); noLevel.chain_level = null;
assert(build(noLevel).errors[0].includes('INCOMPLETE'), 'missing level');

console.log('--- ready ---');
const r = build(validInput());
assert(r.firewall_chain_integrity_verifier_ready === true, 'ready');
assert(r.chain_hash && r.chain_hash.length === 64, 'hash64');
assert(r.chain_items_count === 11, 'items count 11');
assert(r.required_chain_controls_count === 11, 'controls count 11');
assert(r.missing_versions.length === 0, 'no missing versions');
assert(r.firewall_chain_integrity_confirmed === false, 'chain not confirmed');
assert(r.unified_firewall_snapshot_published === false, 'snapshot not published');
assert(r.release_firewall_registry_published === false, 'registry not published');
assert(r.firewall_dependency_graph_published === false, 'graph not published');
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
assert(rend.includes('FIREWALL_CHAIN_INTEGRITY_READY'), 'status ready');
assert(rend.includes('REGRA ABSOLUTA'), 'REGRA');
assert(render(null) === 'FIREWALL_CHAIN_INTEGRITY_BLOCKED_INPUT', 'null render');

console.log('--- invariants ---');
assert(build(validInput()).chain_hash === build(validInput()).chain_hash, 'deterministic hash');

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
