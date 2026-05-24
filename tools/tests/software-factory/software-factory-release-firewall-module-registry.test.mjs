import { STATUSES, build, validate, render } from '../../software-factory/software-factory-release-firewall-module-registry.mjs';

let passed = 0; let failed = 0;
function assert(cond, label) {
  if (cond) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const VERSIONS = ['V365','V366','V367','V368','V369','V370','V371','V372','V373','V374','V375'];
const TYPES = ['firewall_contract','production_mutation_firewall','secret_access_firewall','billing_execution_firewall','network_execution_firewall','artifact_tag_stable_firewall','rollback_execution_firewall','noop_drill','evidence_receipt','authority_review','phase_gate'];
const CONTROLS = ['registry-required','all-firewall-modules-required','atomic-modules-preserved','no-legacy-deletion','no-real-release','no-real-deploy','no-tag-create','no-stable-promotion','no-artifact-publish','no-production-touch','no-billing-execution','no-secret-access','no-network','no-real-rollback','audit-required','pass-gold-required'];

function makeModules() {
  return VERSIONS.map((v, i) => ({
    module_id: `mod-${v.toLowerCase()}`,
    version: v,
    module_type: TYPES[i % TYPES.length],
    module_slug: `software-factory-${v.toLowerCase()}-firewall`,
    module_hash: 'a'.repeat(64),
    depends_on: i > 0 ? [`mod-${VERSIONS[i-1].toLowerCase()}`] : [],
  }));
}

function validInput() {
  return {
    release_firewall_module_registry_id: 'reg-001',
    release_execution_firewall_phase_gate_id: 'gate-v375',
    release_execution_firewall_phase_gate_ready: true,
    modules: makeModules(),
    required_registry_controls: [...CONTROLS],
    registry_level: 'firewall-consolidation',
  };
}

console.log('\n=== release-firewall-module-registry tests ===\n');

console.log('--- exports ---');
assert(Array.isArray(STATUSES), 'STATUSES');
assert(STATUSES.includes('RELEASE_FIREWALL_MODULE_REGISTRY_BLOCKED_INPUT'), 'B_INPUT');
assert(STATUSES.includes('RELEASE_FIREWALL_MODULE_REGISTRY_BLOCKED_PHASE'), 'B_PHASE');
assert(STATUSES.includes('RELEASE_FIREWALL_MODULE_REGISTRY_INCOMPLETE'), 'INCOMPLETE');
assert(STATUSES.includes('RELEASE_FIREWALL_MODULE_REGISTRY_READY'), 'READY');
assert(typeof build === 'function', 'build');
assert(typeof validate === 'function', 'validate');
assert(typeof render === 'function', 'render');

console.log('--- blocked input ---');
assert(build(null).errors[0].startsWith('RELEASE_FIREWALL_MODULE_REGISTRY_BLOCKED_INPUT'), 'null');
assert(build({}).errors[0].startsWith('RELEASE_FIREWALL_MODULE_REGISTRY_BLOCKED_INPUT'), '{}');

console.log('--- blocked phase ---');
const noPhase = validInput(); noPhase.release_execution_firewall_phase_gate_ready = false;
assert(build(noPhase).errors[0].startsWith('RELEASE_FIREWALL_MODULE_REGISTRY_BLOCKED_PHASE'), 'phase not ready');
const noGateId = validInput(); noGateId.release_execution_firewall_phase_gate_id = null;
assert(build(noGateId).errors[0].startsWith('RELEASE_FIREWALL_MODULE_REGISTRY_BLOCKED_PHASE'), 'missing gate id');

console.log('--- incomplete ---');
const missingV = validInput(); missingV.modules = makeModules().filter(m => m.version !== 'V370');
assert(build(missingV).errors[0].includes('INCOMPLETE'), 'missing version');
const badType = validInput(); badType.modules[0] = { ...badType.modules[0], module_type: 'invalid_type' };
assert(build(badType).errors[0].includes('INCOMPLETE'), 'invalid module_type');
const shortHash = validInput(); shortHash.modules[0] = { ...shortHash.modules[0], module_hash: 'short' };
assert(build(shortHash).errors[0].includes('INCOMPLETE'), 'short hash');
const missingCtrl = validInput(); missingCtrl.required_registry_controls = ['registry-required'];
assert(build(missingCtrl).errors[0].includes('INCOMPLETE'), 'missing controls');
const noLevel = validInput(); noLevel.registry_level = null;
assert(build(noLevel).errors[0].includes('INCOMPLETE'), 'missing level');

console.log('--- ready ---');
const r = build(validInput());
assert(r.release_firewall_module_registry_ready === true, 'ready');
assert(r.registry_hash && r.registry_hash.length === 64, 'hash64');
assert(r.modules_count === 11, 'modules_count 11');
assert(r.required_registry_controls_count === 16, 'controls_count 16');
assert(r.release_firewall_registry_published === false, 'registry not published');
assert(r.unified_firewall_snapshot_published === false, 'snapshot not published');
assert(r.firewall_chain_integrity_confirmed === false, 'chain not confirmed');
assert(r.firewall_dependency_graph_published === false, 'graph not published');
assert(r.firewall_policy_bound === false, 'policy not bound');
assert(r.release_firewall_consolidation_phase_passed === false, 'consolidation not passed');
assert(r.release_execution_firewall_phase_passed === false, 'exec fw phase not passed');
assert(r.release_execution_firewall_enabled === false, 'fw not enabled');
assert(r.production_mutation_firewall_locked === false, 'mutation not locked');
assert(r.secret_access_firewall_locked === false, 'secret not locked');
assert(r.billing_execution_firewall_locked === false, 'billing not locked');
assert(r.network_execution_firewall_locked === false, 'network not locked');
assert(r.real_release_executed === false, 'not executed');
assert(r.production_touched === false, 'not touched');
assert(r.release_allowed === false, 'no release');
assert(r.deploy_allowed === false, 'no deploy');
assert(r.stable_allowed === false, 'no stable');
assert(r.tag_allowed === false, 'no tag');
assert(r.real_execution_allowed === false, 'no real exec');
assert(r.errors.length === 0, 'no errors');

console.log('--- validate ---');
const v = validate(r);
assert(v.valid === true, 'vready');
assert(validate(null).valid === false, 'vnull');
assert(validate({}).valid === false, 'vblocked');

console.log('--- render ---');
const rend = render(r);
assert(typeof rend === 'string', 'rend string');
assert(rend.includes('RELEASE_FIREWALL_MODULE_REGISTRY_READY'), 'status ready');
assert(rend.includes('REGRA ABSOLUTA'), 'REGRA');
assert(render(null) === 'RELEASE_FIREWALL_MODULE_REGISTRY_BLOCKED_INPUT', 'null render');

console.log('--- invariants ---');
const h1 = build(validInput()).registry_hash;
const h2 = build(validInput()).registry_hash;
assert(h1 === h2, 'deterministic hash');
assert(render({ ...r, release_firewall_module_registry_ready: false, errors: ['RELEASE_FIREWALL_MODULE_REGISTRY_BLOCKED_PHASE: x'] }).includes('BLOCKED_PHASE'), 'blocked phase render');
assert(render({ ...r, release_firewall_module_registry_ready: false, errors: ['RELEASE_FIREWALL_MODULE_REGISTRY_INCOMPLETE: x'] }).includes('INCOMPLETE'), 'incomplete render');

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
