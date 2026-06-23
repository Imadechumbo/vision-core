import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_RELEASE_EXECUTION_FIREWALL_CONTRACT_STATUSES, build, validate, render } from '../../software-factory/software-factory-release-execution-firewall-contract.mjs';

function validInput() {
  return {
    release_execution_firewall_contract_id: 'refc-v365',
    controlled_real_release_preparation_phase_gate_id: 'crreppg-v364',
    controlled_real_release_preparation_phase_gate_ready: true,
    firewall_items: [
      { firewall_id: 'fw-release-001', firewall_type: 'release_execution', firewall_mode: 'blocked', firewall_hash: 'a'.repeat(64) },
      { firewall_id: 'fw-deploy-001', firewall_type: 'deployment_execution', firewall_mode: 'metadata-only', firewall_hash: 'b'.repeat(64) },
      { firewall_id: 'fw-tag-001', firewall_type: 'tag_creation', firewall_mode: 'contract-only', firewall_hash: 'c'.repeat(64) },
    ],
    required_firewall_controls: [
      'firewall-required', 'barrier-closed-required', 'no-real-release', 'no-real-deploy',
      'no-tag-create', 'no-stable-promotion', 'no-artifact-publish', 'no-production-touch',
      'no-billing-execution', 'no-secret-access', 'no-network', 'no-real-rollback',
      'rollback-required', 'evidence-required', 'audit-required', 'human-approval-required',
      'pass-gold-required',
    ],
    firewall_level: 'level-1',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_RELEASE_EXECUTION_FIREWALL_CONTRACT_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_RELEASE_EXECUTION_FIREWALL_CONTRACT_STATUSES.includes('RELEASE_EXECUTION_FIREWALL_BLOCKED_INPUT')); console.log('  PASS: B_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_RELEASE_EXECUTION_FIREWALL_CONTRACT_STATUSES.includes('RELEASE_EXECUTION_FIREWALL_BLOCKED_PREPARATION')); console.log('  PASS: B_PREPARATION'); },
  () => { assert.ok(SOFTWARE_FACTORY_RELEASE_EXECUTION_FIREWALL_CONTRACT_STATUSES.includes('RELEASE_EXECUTION_FIREWALL_FAIL')); console.log('  PASS: FAIL'); },
  () => { assert.ok(SOFTWARE_FACTORY_RELEASE_EXECUTION_FIREWALL_CONTRACT_STATUSES.includes('RELEASE_EXECUTION_FIREWALL_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: val'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: ren'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_FIREWALL_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('release_execution_firewall_contract_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.controlled_real_release_preparation_phase_gate_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_FIREWALL_BLOCKED_PREPARATION')); console.log('  PASS: phase not ready'); },
  () => { const i = validInput(); delete i.controlled_real_release_preparation_phase_gate_id; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_FIREWALL_BLOCKED_PREPARATION')); console.log('  PASS: missing phase id'); },
  () => { const i = validInput(); delete i.firewall_items; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_FIREWALL_FAIL')); console.log('  PASS: missing items'); },
  () => { const i = validInput(); i.firewall_items = []; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_FIREWALL_FAIL')); console.log('  PASS: empty items'); },
  () => { const i = validInput(); i.firewall_items = [{ firewall_id: 'x', firewall_type: 'invalid', firewall_mode: 'blocked', firewall_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_FIREWALL_FAIL')); console.log('  PASS: invalid item type'); },
  () => { const i = validInput(); i.firewall_items = [{ firewall_id: 'x', firewall_type: 'release_execution', firewall_mode: 'invalid', firewall_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_FIREWALL_FAIL')); console.log('  PASS: invalid item mode'); },
  () => { const i = validInput(); i.firewall_items = [{ firewall_id: 'x', firewall_type: 'release_execution', firewall_mode: 'blocked', firewall_hash: 'short' }]; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_FIREWALL_FAIL')); console.log('  PASS: invalid item hash'); },
  () => { const i = validInput(); delete i.required_firewall_controls; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_FIREWALL_FAIL')); console.log('  PASS: missing controls'); },
  () => { const i = validInput(); i.required_firewall_controls = ['firewall-required']; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_FIREWALL_FAIL')); console.log('  PASS: missing required controls'); },
  () => { const i = validInput(); delete i.firewall_level; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_FIREWALL_FAIL')); console.log('  PASS: missing level'); },
  () => { const r = build(validInput()); assert.equal(r.release_execution_firewall_contract_ready, true); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.release_execution_firewall_contract_hash); assert.equal(r.release_execution_firewall_contract_hash.length, 64); console.log('  PASS: hash64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.release_execution_firewall_contract_hash, r2.release_execution_firewall_contract_hash); console.log('  PASS: det'); },
  () => { const r = build(validInput()); assert.equal(r.firewall_items_count, 3); console.log('  PASS: items count 3'); },
  () => { const r = build(validInput()); assert.equal(r.required_firewall_controls_count, 17); console.log('  PASS: controls count 17'); },
  () => { const r = build(validInput()); assert.equal(r.release_execution_firewall_enabled, false); console.log('  PASS: fw not enabled'); },
  () => { const r = build(validInput()); assert.equal(r.production_mutation_firewall_locked, false); console.log('  PASS: mutation not locked'); },
  () => { const r = build(validInput()); assert.equal(r.secret_access_firewall_locked, false); console.log('  PASS: secret not locked'); },
  () => { const r = build(validInput()); assert.equal(r.billing_execution_firewall_locked, false); console.log('  PASS: billing not locked'); },
  () => { const r = build(validInput()); assert.equal(r.network_execution_firewall_locked, false); console.log('  PASS: network not locked'); },
  () => { const r = build(validInput()); assert.equal(r.real_release_execution_command_received, false); console.log('  PASS: command not received'); },
  () => { const r = build(validInput()); assert.equal(r.production_execution_environment_verified, false); console.log('  PASS: env not verified'); },
  () => { const r = build(validInput()); assert.equal(r.real_release_dry_run_verified, false); console.log('  PASS: dry run not verified'); },
  () => { const r = build(validInput()); assert.equal(r.real_release_rollback_ready, false); console.log('  PASS: rollback not ready'); },
  () => { const r = build(validInput()); assert.equal(r.controlled_real_release_preparation_phase_passed, false); console.log('  PASS: phase not passed'); },
  () => { const r = build(validInput()); assert.equal(r.real_release_execution_ready, false); console.log('  PASS: exec not ready'); },
  () => { const r = build(validInput()); assert.equal(r.real_release_execution_allowed, false); assert.equal(r.real_deployment_execution_allowed, false); console.log('  PASS: no real exec allowed'); },
  () => { const r = build(validInput()); assert.equal(r.real_tag_creation_allowed, false); assert.equal(r.real_stable_promotion_allowed, false); console.log('  PASS: no tag/stable allowed'); },
  () => { const r = build(validInput()); assert.equal(r.real_release_executed, false); assert.equal(r.real_deploy_executed, false); assert.equal(r.real_tag_created, false); assert.equal(r.real_stable_promoted, false); console.log('  PASS: no executed'); },
  () => { const r = build(validInput()); assert.equal(r.production_touched, false); console.log('  PASS: not touched'); },
  () => { const r = build(validInput()); assert.equal(r.billing_executed, false); console.log('  PASS: not billed'); },
  () => { const r = build(validInput()); assert.equal(r.secrets_accessed, false); console.log('  PASS: not accessed secrets'); },
  () => { const r = build(validInput()); assert.equal(r.network_accessed, false); console.log('  PASS: not accessed network'); },
  () => { const r = build(validInput()); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); console.log('  PASS: no allowed'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: vready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: vblocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('RELEASE_EXECUTION_FIREWALL_READY')); console.log('  PASS: rend'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('release_execution_firewall_contract_hash')); console.log('  PASS: hashren'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('firewall_items_count:')); console.log('  PASS: items in render'); },
  () => { const r = build(validInput()); ['release_execution_firewall_enabled','production_mutation_firewall_locked','secret_access_firewall_locked','billing_execution_firewall_locked','network_execution_firewall_locked','artifact_tag_stable_firewall_locked','rollback_execution_firewall_locked','last_mile_noop_drill_completed','firewall_evidence_receipt_published','firewall_final_authority_approved','release_execution_firewall_phase_passed','real_release_execution_command_received','production_execution_environment_verified','real_release_dry_run_verified','real_release_rollback_ready','controlled_real_release_preparation_phase_passed','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','artifact_published','production_touched','billing_executed','secrets_accessed','network_accessed','rollback_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','saas_enabled'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: inv'); },
  () => { const r = build(null); assert.equal(r.release_execution_firewall_enabled, false); assert.equal(r.production_touched, false); console.log('  PASS: binv'); },
];

function run() {
  console.log('\n=== release-execution-firewall-contract tests ===\n');
  const sec = [['exports',0,8],['blocked input',8,10],['blocked preparation',10,12],['fail',12,22],['ready',22,42],['validate',42,44],['render',44,49],['invariants',49,51]];
  let p=0,f=0; for (const [l,s,e] of sec) { console.log('--- '+l+' ---'); for (let i=s; i<e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== ${p} passed, ${f} failed ===\n`); process.exit(f>0?1:0); }
run();