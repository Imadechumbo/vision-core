import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_DEPLOYMENT_SCOPE_BOUNDARY_CONTRACT_STATUSES, build, validate, render } from '../../software-factory/software-factory-deployment-scope-boundary-contract.mjs';

function validInput() {
  const h = (c) => c.repeat(64);
  return {
    deployment_scope_boundary_id: 'dsbc-v336', release_execution_command_id: 'recc-v335', release_execution_command_ready: true,
    deployment_scope_items: [
      { scope_id: 's1', scope_type: 'frontend', scope_mode: 'blocked', scope_hash: h('a') },
      { scope_id: 's2', scope_type: 'backend', scope_mode: 'metadata-only', scope_hash: h('0') },
      { scope_id: 's3', scope_type: 'go_core', scope_mode: 'dry-run', scope_hash: h('b') },
      { scope_id: 's4', scope_type: 'workflow', scope_mode: 'planning', scope_hash: h('c') },
      { scope_id: 's5', scope_type: 'infrastructure', scope_mode: 'blocked', scope_hash: h('d') },
      { scope_id: 's6', scope_type: 'container', scope_mode: 'metadata-only', scope_hash: h('e') },
      { scope_id: 's7', scope_type: 'database', scope_mode: 'dry-run', scope_hash: h('f') },
      { scope_id: 's8', scope_type: 'secrets', scope_mode: 'blocked', scope_hash: h('a') },
      { scope_id: 's9', scope_type: 'release', scope_mode: 'planning', scope_hash: h('0') },
      { scope_id: 's10', scope_type: 'tag', scope_mode: 'blocked', scope_hash: h('b') },
      { scope_id: 's11', scope_type: 'stable', scope_mode: 'blocked', scope_hash: h('c') },
      { scope_id: 's12', scope_type: 'production', scope_mode: 'blocked', scope_hash: h('d') },
      { scope_id: 's13', scope_type: 'rollback', scope_mode: 'planning', scope_hash: h('e') },
      { scope_id: 's14', scope_type: 'audit', scope_mode: 'metadata-only', scope_hash: h('f') },
    ],
    scope_level: 'contract-only',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_DEPLOYMENT_SCOPE_BOUNDARY_CONTRACT_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_DEPLOYMENT_SCOPE_BOUNDARY_CONTRACT_STATUSES.includes('DEPLOYMENT_SCOPE_BOUNDARY_BLOCKED_INPUT')); console.log('  PASS: B_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_DEPLOYMENT_SCOPE_BOUNDARY_CONTRACT_STATUSES.includes('DEPLOYMENT_SCOPE_BOUNDARY_BLOCKED_COMMAND')); console.log('  PASS: B_COMMAND'); },
  () => { assert.ok(SOFTWARE_FACTORY_DEPLOYMENT_SCOPE_BOUNDARY_CONTRACT_STATUSES.includes('DEPLOYMENT_SCOPE_BOUNDARY_FAIL')); console.log('  PASS: FAIL'); },
  () => { assert.ok(SOFTWARE_FACTORY_DEPLOYMENT_SCOPE_BOUNDARY_CONTRACT_STATUSES.includes('DEPLOYMENT_SCOPE_BOUNDARY_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: val'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: ren'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('DEPLOYMENT_SCOPE_BOUNDARY_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('deployment_scope_boundary_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.release_execution_command_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('DEPLOYMENT_SCOPE_BOUNDARY_BLOCKED_COMMAND')); console.log('  PASS: command not ready'); },
  () => { const i = validInput(); delete i.release_execution_command_id; const r = build(i); assert.ok(r.errors[0].startsWith('DEPLOYMENT_SCOPE_BOUNDARY_BLOCKED_COMMAND')); console.log('  PASS: missing command id'); },
  () => { const i = validInput(); i.deployment_scope_items = []; const r = build(i); assert.ok(r.errors[0].startsWith('DEPLOYMENT_SCOPE_BOUNDARY_BLOCKED_COMMAND')); console.log('  PASS: empty items'); },
  () => { const i = validInput(); i.scope_level = 'live'; const r = build(i); assert.ok(r.errors[0].startsWith('DEPLOYMENT_SCOPE_BOUNDARY_BLOCKED_COMMAND')); console.log('  PASS: bad level'); },
  () => { const i = validInput(); i.deployment_scope_items = [{ scope_id: 'x', scope_type: 'frontend', scope_mode: 'blocked', scope_hash: 'a'.repeat(64) }]; i.required_scope_controls = []; const r = build(i); assert.ok(r.errors[0].startsWith('DEPLOYMENT_SCOPE_BOUNDARY_FAIL')); assert.ok(r.errors[0].includes('missing required scope controls')); console.log('  PASS: missing controls'); },
  () => { const i = validInput(); i.deployment_scope_items = [{ scope_id: 'x', scope_type: 'invalid', scope_mode: 'blocked', scope_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('DEPLOYMENT_SCOPE_BOUNDARY_FAIL')); console.log('  PASS: bad type'); },
  () => { const i = validInput(); i.deployment_scope_items = [{ scope_id: 'x', scope_type: 'frontend', scope_mode: 'invalid', scope_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('DEPLOYMENT_SCOPE_BOUNDARY_FAIL')); console.log('  PASS: bad mode'); },
  () => { const i = validInput(); i.deployment_scope_items = [{ scope_id: 'x', scope_type: 'frontend', scope_mode: 'blocked', scope_hash: 'short' }]; const r = build(i); assert.ok(r.errors[0].startsWith('DEPLOYMENT_SCOPE_BOUNDARY_FAIL')); console.log('  PASS: short hash'); },
  () => { const i = validInput(); i.deployment_scope_items = [{ scope_type: 'frontend', scope_mode: 'blocked', scope_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('DEPLOYMENT_SCOPE_BOUNDARY_FAIL')); console.log('  PASS: missing scope_id'); },
  () => { const r = build(validInput()); assert.equal(r.deployment_scope_boundary_contract_ready, true); assert.equal(r.deployment_scope_items_count, 14); assert.equal(r.required_scope_controls_count, 14); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.deployment_scope_boundary_hash); assert.equal(r.deployment_scope_boundary_hash.length, 64); console.log('  PASS: hash64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.deployment_scope_boundary_hash, r2.deployment_scope_boundary_hash); console.log('  PASS: det'); },
  () => { const r = build(validInput()); assert.equal(r.deployment_scope_bound, false); assert.equal(r.deployment_execution_allowed, false); console.log('  PASS: scope not bound'); },
  () => { const r = build(validInput()); assert.equal(r.release_execution_allowed, false); assert.equal(r.release_artifact_published, false); assert.equal(r.deployment_dry_run_completed, false); console.log('  PASS: release/artifact/dry-run blocked'); },
  () => { const r = build(validInput()); assert.equal(r.release_execution_ready, false); assert.equal(r.release_execution_approved, false); assert.equal(r.deployment_evidence_published, false); console.log('  PASS: ready/approved/evid blocked'); },
  () => { const r = build(validInput()); assert.equal(r.release_rollback_bound, false); assert.equal(r.release_authority_granted, false); assert.equal(r.release_execution_phase_passed, false); console.log('  PASS: rollback/auth/phase blocked'); },
  () => { const r = build(validInput()); assert.equal(r.product_activation_execution_allowed, false); assert.equal(r.saas_enabled, false); assert.equal(r.billing_executed, false); assert.equal(r.production_touched, false); console.log('  PASS: activation/SaaS/prod blocked'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: vready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: vblocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('DEPLOYMENT_SCOPE_BOUNDARY_READY')); console.log('  PASS: rend'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('deployment_scope_boundary_hash')); console.log('  PASS: hashren'); },
  () => { const r = build(validInput()); ['release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','production_readiness_confirmed','activation_dry_run_completed','activation_risk_accepted','activation_authority_granted','product_activation_phase_passed','activation_policy_enforced','activation_report_published','activation_evidence_published','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: inv'); },
  () => { const r = build(null); assert.equal(r.release_execution_allowed, false); assert.equal(r.deployment_scope_bound, false); assert.equal(r.production_touched, false); console.log('  PASS: binv'); },
];

function run() {
  console.log('\n=== deployment-scope-boundary-contract tests ===\n');
  const sec = [['exports',0,8],['blocked input',8,10],['blocked command',10,14],['fail',14,19],['ready',19,27],['validate',27,29],['render',29,33],['invariants',33,35]];
  let p=0,f=0; for (const [l,s,e] of sec) { console.log('--- '+l+' ---'); for (let i=s; i<e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== ${p} passed, ${f} failed ===\n`); process.exit(f>0?1:0); }
run();