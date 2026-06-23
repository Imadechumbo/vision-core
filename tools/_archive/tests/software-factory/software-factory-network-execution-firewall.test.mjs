import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_NETWORK_EXECUTION_FIREWALL_STATUSES, build, validate, render } from '../../software-factory/software-factory-network-execution-firewall.mjs';

function validInput() {
  return {
    network_execution_firewall_id: 'nef-v369',
    billing_execution_firewall_id: 'bef-v368',
    billing_execution_firewall_ready: true,
    network_items: [
      { network_id: 'net-http-001', network_type: 'http_request', network_mode: 'blocked', network_hash: 'a'.repeat(64) },
      { network_id: 'net-fetch-001', network_type: 'fetch_call', network_mode: 'metadata-only', network_hash: 'b'.repeat(64) },
      { network_id: 'net-github-001', network_type: 'github_api', network_mode: 'contract-only', network_hash: 'c'.repeat(64) },
    ],
    required_network_controls: [
      'network-execution-firewall-required', 'no-network', 'no-fetch', 'no-http',
      'no-provider-api', 'no-github-api', 'no-cloud-api', 'no-deployment-api',
      'no-billing-api', 'no-llm-api', 'no-webhook-call', 'no-artifact-upload',
      'no-production-touch', 'no-real-release', 'no-real-deploy', 'evidence-required',
      'audit-required', 'human-approval-required', 'pass-gold-required',
    ],
    network_level: 'level-5',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_NETWORK_EXECUTION_FIREWALL_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_NETWORK_EXECUTION_FIREWALL_STATUSES.includes('NETWORK_EXECUTION_FIREWALL_BLOCKED_INPUT')); console.log('  PASS: B_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_NETWORK_EXECUTION_FIREWALL_STATUSES.includes('NETWORK_EXECUTION_FIREWALL_BLOCKED_BILLING')); console.log('  PASS: B_BILLING'); },
  () => { assert.ok(SOFTWARE_FACTORY_NETWORK_EXECUTION_FIREWALL_STATUSES.includes('NETWORK_EXECUTION_FIREWALL_FAIL')); console.log('  PASS: FAIL'); },
  () => { assert.ok(SOFTWARE_FACTORY_NETWORK_EXECUTION_FIREWALL_STATUSES.includes('NETWORK_EXECUTION_FIREWALL_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: val'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: ren'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('NETWORK_EXECUTION_FIREWALL_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('network_execution_firewall_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.billing_execution_firewall_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('NETWORK_EXECUTION_FIREWALL_BLOCKED_BILLING')); console.log('  PASS: billing not ready'); },
  () => { const i = validInput(); delete i.billing_execution_firewall_id; const r = build(i); assert.ok(r.errors[0].startsWith('NETWORK_EXECUTION_FIREWALL_BLOCKED_BILLING')); console.log('  PASS: missing billing id'); },
  () => { const i = validInput(); delete i.network_items; const r = build(i); assert.ok(r.errors[0].startsWith('NETWORK_EXECUTION_FIREWALL_FAIL')); console.log('  PASS: missing items'); },
  () => { const i = validInput(); i.network_items = []; const r = build(i); assert.ok(r.errors[0].startsWith('NETWORK_EXECUTION_FIREWALL_FAIL')); console.log('  PASS: empty items'); },
  () => { const i = validInput(); i.network_items = [{ network_id: 'x', network_type: 'invalid', network_mode: 'blocked', network_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('NETWORK_EXECUTION_FIREWALL_FAIL')); console.log('  PASS: invalid item type'); },
  () => { const i = validInput(); i.network_items = [{ network_id: 'x', network_type: 'http_request', network_mode: 'invalid', network_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('NETWORK_EXECUTION_FIREWALL_FAIL')); console.log('  PASS: invalid item mode'); },
  () => { const i = validInput(); i.network_items = [{ network_id: 'x', network_type: 'http_request', network_mode: 'blocked', network_hash: 'short' }]; const r = build(i); assert.ok(r.errors[0].startsWith('NETWORK_EXECUTION_FIREWALL_FAIL')); console.log('  PASS: invalid item hash'); },
  () => { const i = validInput(); delete i.required_network_controls; const r = build(i); assert.ok(r.errors[0].startsWith('NETWORK_EXECUTION_FIREWALL_FAIL')); console.log('  PASS: missing controls'); },
  () => { const i = validInput(); i.required_network_controls = ['network-execution-firewall-required']; const r = build(i); assert.ok(r.errors[0].startsWith('NETWORK_EXECUTION_FIREWALL_FAIL')); console.log('  PASS: missing required controls'); },
  () => { const i = validInput(); delete i.network_level; const r = build(i); assert.ok(r.errors[0].startsWith('NETWORK_EXECUTION_FIREWALL_FAIL')); console.log('  PASS: missing level'); },
  () => { const r = build(validInput()); assert.equal(r.network_execution_firewall_ready, true); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.network_execution_firewall_hash); assert.equal(r.network_execution_firewall_hash.length, 64); console.log('  PASS: hash64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.network_execution_firewall_hash, r2.network_execution_firewall_hash); console.log('  PASS: det'); },
  () => { const r = build(validInput()); assert.equal(r.network_items_count, 3); console.log('  PASS: items count 3'); },
  () => { const r = build(validInput()); assert.equal(r.required_network_controls_count, 19); console.log('  PASS: controls count 19'); },
  () => { const r = build(validInput()); assert.equal(r.release_execution_firewall_enabled, false); console.log('  PASS: fw not enabled'); },
  () => { const r = build(validInput()); assert.equal(r.production_mutation_firewall_locked, false); console.log('  PASS: mutation not locked'); },
  () => { const r = build(validInput()); assert.equal(r.secret_access_firewall_locked, false); console.log('  PASS: secret not locked'); },
  () => { const r = build(validInput()); assert.equal(r.billing_execution_firewall_locked, false); console.log('  PASS: billing not locked'); },
  () => { const r = build(validInput()); assert.equal(r.network_execution_firewall_locked, false); console.log('  PASS: network not locked'); },
  () => { const r = build(validInput()); assert.equal(r.network_accessed, false); console.log('  PASS: network not accessed'); },
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
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('NETWORK_EXECUTION_FIREWALL_READY')); console.log('  PASS: rend'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('network_execution_firewall_hash')); console.log('  PASS: hashren'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('network_items_count:')); console.log('  PASS: items in render'); },
  () => { const r = build(validInput()); ['release_execution_firewall_enabled','production_mutation_firewall_locked','secret_access_firewall_locked','billing_execution_firewall_locked','network_execution_firewall_locked','artifact_tag_stable_firewall_locked','rollback_execution_firewall_locked','last_mile_noop_drill_completed','firewall_evidence_receipt_published','firewall_final_authority_approved','release_execution_firewall_phase_passed','real_release_execution_command_received','production_execution_environment_verified','real_release_dry_run_verified','real_release_rollback_ready','controlled_real_release_preparation_phase_passed','real_release_execution_ready','real_release_execution_allowed','real_deployment_execution_allowed','real_tag_creation_allowed','real_stable_promotion_allowed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','artifact_published','production_touched','billing_executed','secrets_accessed','network_accessed','rollback_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','saas_enabled'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: inv'); },
  () => { const r = build(null); assert.equal(r.network_execution_firewall_locked, false); assert.equal(r.network_accessed, false); console.log('  PASS: binv'); },
];

function run() {
  console.log('\n=== network-execution-firewall tests ===\n');
  const sec = [['exports',0,8],['blocked input',8,10],['blocked billing',10,12],['fail',12,22],['ready',22,42],['validate',42,44],['render',44,49],['invariants',49,51]];
  let p=0,f=0; for (const [l,s,e] of sec) { console.log('--- '+l+' ---'); for (let i=s; i<e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== ${p} passed, ${f} failed ===\n`); process.exit(f>0?1:0); }
run();