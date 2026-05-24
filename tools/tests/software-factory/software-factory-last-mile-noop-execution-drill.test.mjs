import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_LAST_MILE_NOOP_EXECUTION_DRILL_STATUSES, build, validate, render } from '../../software-factory/software-factory-last-mile-noop-execution-drill.mjs';

function validInput() {
  return {
    last_mile_noop_execution_drill_id: 'lmned-v372',
    rollback_execution_firewall_id: 'ref-v371',
    rollback_execution_firewall_ready: true,
    drill_items: [
      { drill_id: 'drill-rel-001', drill_type: 'release_noop', drill_mode: 'no-op', drill_hash: 'a'.repeat(64) },
      { drill_id: 'drill-dep-001', drill_type: 'deploy_noop', drill_mode: 'metadata-only', drill_hash: 'b'.repeat(64) },
      { drill_id: 'drill-prod-001', drill_type: 'production_noop', drill_mode: 'dry-run', drill_hash: 'c'.repeat(64) },
    ],
    required_drill_controls: [
      'last-mile-noop-drill-required', 'no-real-release', 'no-real-deploy',
      'no-tag-create', 'no-stable-promotion', 'no-artifact-publish',
      'no-production-touch', 'no-billing-execution', 'no-secret-access', 'no-network',
      'no-real-rollback', 'evidence-required', 'audit-required',
      'human-approval-required', 'pass-gold-required',
    ],
    drill_level: 'level-8',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_LAST_MILE_NOOP_EXECUTION_DRILL_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_LAST_MILE_NOOP_EXECUTION_DRILL_STATUSES.includes('LAST_MILE_NOOP_DRILL_BLOCKED_INPUT')); console.log('  PASS: B_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_LAST_MILE_NOOP_EXECUTION_DRILL_STATUSES.includes('LAST_MILE_NOOP_DRILL_BLOCKED_ROLLBACK')); console.log('  PASS: B_ROLLBACK'); },
  () => { assert.ok(SOFTWARE_FACTORY_LAST_MILE_NOOP_EXECUTION_DRILL_STATUSES.includes('LAST_MILE_NOOP_DRILL_FAIL')); console.log('  PASS: FAIL'); },
  () => { assert.ok(SOFTWARE_FACTORY_LAST_MILE_NOOP_EXECUTION_DRILL_STATUSES.includes('LAST_MILE_NOOP_DRILL_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: val'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: ren'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('LAST_MILE_NOOP_DRILL_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('last_mile_noop_execution_drill_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.rollback_execution_firewall_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('LAST_MILE_NOOP_DRILL_BLOCKED_ROLLBACK')); console.log('  PASS: rollback not ready'); },
  () => { const i = validInput(); delete i.rollback_execution_firewall_id; const r = build(i); assert.ok(r.errors[0].startsWith('LAST_MILE_NOOP_DRILL_BLOCKED_ROLLBACK')); console.log('  PASS: missing rollback id'); },
  () => { const i = validInput(); delete i.drill_items; const r = build(i); assert.ok(r.errors[0].startsWith('LAST_MILE_NOOP_DRILL_FAIL')); console.log('  PASS: missing items'); },
  () => { const i = validInput(); i.drill_items = []; const r = build(i); assert.ok(r.errors[0].startsWith('LAST_MILE_NOOP_DRILL_FAIL')); console.log('  PASS: empty items'); },
  () => { const i = validInput(); i.drill_items = [{ drill_id: 'x', drill_type: 'invalid', drill_mode: 'no-op', drill_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('LAST_MILE_NOOP_DRILL_FAIL')); console.log('  PASS: invalid item type'); },
  () => { const i = validInput(); i.drill_items = [{ drill_id: 'x', drill_type: 'release_noop', drill_mode: 'invalid', drill_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('LAST_MILE_NOOP_DRILL_FAIL')); console.log('  PASS: invalid item mode'); },
  () => { const i = validInput(); i.drill_items = [{ drill_id: 'x', drill_type: 'release_noop', drill_mode: 'no-op', drill_hash: 'short' }]; const r = build(i); assert.ok(r.errors[0].startsWith('LAST_MILE_NOOP_DRILL_FAIL')); console.log('  PASS: invalid item hash'); },
  () => { const i = validInput(); delete i.required_drill_controls; const r = build(i); assert.ok(r.errors[0].startsWith('LAST_MILE_NOOP_DRILL_FAIL')); console.log('  PASS: missing controls'); },
  () => { const i = validInput(); i.required_drill_controls = ['last-mile-noop-drill-required']; const r = build(i); assert.ok(r.errors[0].startsWith('LAST_MILE_NOOP_DRILL_FAIL')); console.log('  PASS: missing required controls'); },
  () => { const i = validInput(); delete i.drill_level; const r = build(i); assert.ok(r.errors[0].startsWith('LAST_MILE_NOOP_DRILL_FAIL')); console.log('  PASS: missing level'); },
  () => { const r = build(validInput()); assert.equal(r.last_mile_noop_execution_drill_ready, true); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.last_mile_noop_execution_drill_hash); assert.equal(r.last_mile_noop_execution_drill_hash.length, 64); console.log('  PASS: hash64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.last_mile_noop_execution_drill_hash, r2.last_mile_noop_execution_drill_hash); console.log('  PASS: det'); },
  () => { const r = build(validInput()); assert.equal(r.drill_items_count, 3); console.log('  PASS: items count 3'); },
  () => { const r = build(validInput()); assert.equal(r.required_drill_controls_count, 15); console.log('  PASS: controls count 15'); },
  () => { const r = build(validInput()); assert.equal(r.release_execution_firewall_enabled, false); console.log('  PASS: fw not enabled'); },
  () => { const r = build(validInput()); assert.equal(r.production_mutation_firewall_locked, false); console.log('  PASS: mutation not locked'); },
  () => { const r = build(validInput()); assert.equal(r.secret_access_firewall_locked, false); console.log('  PASS: secret not locked'); },
  () => { const r = build(validInput()); assert.equal(r.billing_execution_firewall_locked, false); console.log('  PASS: billing not locked'); },
  () => { const r = build(validInput()); assert.equal(r.network_execution_firewall_locked, false); console.log('  PASS: network not locked'); },
  () => { const r = build(validInput()); assert.equal(r.artifact_tag_stable_firewall_locked, false); console.log('  PASS: artifact locked false'); },
  () => { const r = build(validInput()); assert.equal(r.rollback_execution_firewall_locked, false); console.log('  PASS: rollback locked false'); },
  () => { const r = build(validInput()); assert.equal(r.last_mile_noop_drill_completed, false); console.log('  PASS: drill not completed'); },
  () => { const r = build(validInput()); assert.equal(r.artifact_published, false); console.log('  PASS: artifact not published'); },
  () => { const r = build(validInput()); assert.equal(r.rollback_executed, false); console.log('  PASS: rollback not executed'); },
  () => { const r = build(validInput()); assert.equal(r.real_release_execution_command_received, false); console.log('  PASS: command not received'); },
  () => { const r = build(validInput()); assert.equal(r.production_execution_environment_verified, false); console.log('  PASS: env not verified'); },
  () => { const r = build(validInput()); assert.equal(r.real_release_dry_run_verified, false); console.log('  PASS: dry run not verified'); },
  () => { const r = build(validInput()); assert.equal(r.real_release_rollback_ready, false); console.log('  PASS: rollback not ready'); },
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
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('LAST_MILE_NOOP_DRILL_READY')); console.log('  PASS: rend'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('last_mile_noop_execution_drill_hash')); console.log('  PASS: hashren'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('drill_items_count:')); console.log('  PASS: items in render'); },
  () => { const r = build(validInput()); ['release_execution_firewall_enabled','production_mutation_firewall_locked','secret_access_firewall_locked','billing_execution_firewall_locked','network_execution_firewall_locked','artifact_tag_stable_firewall_locked','rollback_execution_firewall_locked','last_mile_noop_drill_completed','firewall_evidence_receipt_published','firewall_final_authority_approved','release_execution_firewall_phase_passed','real_release_execution_command_received','production_execution_environment_verified','real_release_dry_run_verified','real_release_rollback_ready','controlled_real_release_preparation_phase_passed','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','artifact_published','production_touched','billing_executed','secrets_accessed','network_accessed','rollback_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','saas_enabled'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: inv'); },
  () => { const r = build(null); assert.equal(r.last_mile_noop_drill_completed, false); assert.equal(r.real_release_executed, false); console.log('  PASS: binv'); },
];

function run() {
  console.log('\n=== last-mile-noop-execution-drill tests ===\n');
  const sec = [['exports',0,8],['blocked input',8,10],['blocked rollback',10,12],['fail',12,22],['ready',22,44],['validate',44,46],['render',46,51],['invariants',51,53]];
  let p=0,f=0; for (const [l,s,e] of sec) { console.log('--- '+l+' ---'); for (let i=s; i<e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== ${p} passed, ${f} failed ===\n`); process.exit(f>0?1:0); }
run();