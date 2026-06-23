import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_RELEASE_ROLLBACK_BINDER_STATUSES, build, validate, render } from '../../software-factory/software-factory-release-rollback-binder.mjs';

function validInput() {
  const h = (c) => c.repeat(64);
  return {
    release_rollback_binder_id: 'rrb-v342', deployment_evidence_receipt_id: 'der-v341', deployment_evidence_receipt_ready: true,
    rollback_items: [
      { rollback_id: 'rb1', rollback_type: 'code_rollback', rollback_mode: 'contract-only', rollback_hash: h('a') },
      { rollback_id: 'rb2', rollback_type: 'config_rollback', rollback_mode: 'metadata-only', rollback_hash: h('0') },
      { rollback_id: 'rb3', rollback_type: 'artifact_rollback', rollback_mode: 'dry-run', rollback_hash: h('b') },
      { rollback_id: 'rb4', rollback_type: 'deployment_rollback', rollback_mode: 'planning', rollback_hash: h('c') },
      { rollback_id: 'rb5', rollback_type: 'release_rollback', rollback_mode: 'contract-only', rollback_hash: h('d') },
      { rollback_id: 'rb6', rollback_type: 'tag_rollback', rollback_mode: 'metadata-only', rollback_hash: h('e') },
      { rollback_id: 'rb7', rollback_type: 'stable_rollback', rollback_mode: 'dry-run', rollback_hash: h('f') },
      { rollback_id: 'rb8', rollback_type: 'production_rollback', rollback_mode: 'planning', rollback_hash: h('a') },
      { rollback_id: 'rb9', rollback_type: 'infrastructure_rollback', rollback_mode: 'contract-only', rollback_hash: h('0') },
      { rollback_id: 'rb10', rollback_type: 'database_rollback', rollback_mode: 'metadata-only', rollback_hash: h('b') },
      { rollback_id: 'rb11', rollback_type: 'evidence_rollback', rollback_mode: 'dry-run', rollback_hash: h('c') },
      { rollback_id: 'rb12', rollback_type: 'audit_rollback', rollback_mode: 'planning', rollback_hash: h('d') },
      { rollback_id: 'rb13', rollback_type: 'emergency_stop', rollback_mode: 'contract-only', rollback_hash: h('e') },
    ],
    rollback_level: 'contract-only',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_RELEASE_ROLLBACK_BINDER_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_RELEASE_ROLLBACK_BINDER_STATUSES.includes('RELEASE_ROLLBACK_BINDER_BLOCKED_INPUT')); console.log('  PASS: B_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_RELEASE_ROLLBACK_BINDER_STATUSES.includes('RELEASE_ROLLBACK_BINDER_BLOCKED_EVIDENCE')); console.log('  PASS: B_EVIDENCE'); },
  () => { assert.ok(SOFTWARE_FACTORY_RELEASE_ROLLBACK_BINDER_STATUSES.includes('RELEASE_ROLLBACK_BINDER_FAIL')); console.log('  PASS: FAIL'); },
  () => { assert.ok(SOFTWARE_FACTORY_RELEASE_ROLLBACK_BINDER_STATUSES.includes('RELEASE_ROLLBACK_BINDER_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: val'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: ren'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('RELEASE_ROLLBACK_BINDER_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('release_rollback_binder_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.deployment_evidence_receipt_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_ROLLBACK_BINDER_BLOCKED_EVIDENCE')); console.log('  PASS: evidence not ready'); },
  () => { const i = validInput(); delete i.deployment_evidence_receipt_id; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_ROLLBACK_BINDER_BLOCKED_EVIDENCE')); console.log('  PASS: missing evidence id'); },
  () => { const i = validInput(); i.rollback_items = []; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_ROLLBACK_BINDER_BLOCKED_EVIDENCE')); console.log('  PASS: empty items'); },
  () => { const i = validInput(); i.rollback_level = 'live'; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_ROLLBACK_BINDER_BLOCKED_EVIDENCE')); console.log('  PASS: bad level'); },
  () => { const i = validInput(); i.rollback_items = [{ rollback_id: 'x', rollback_type: 'code_rollback', rollback_mode: 'contract-only', rollback_hash: 'a'.repeat(64) }]; i.required_rollback_controls = []; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_ROLLBACK_BINDER_FAIL')); assert.ok(r.errors[0].includes('missing required rollback controls')); console.log('  PASS: missing controls'); },
  () => { const i = validInput(); i.rollback_items = [{ rollback_id: 'x', rollback_type: 'invalid', rollback_mode: 'contract-only', rollback_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_ROLLBACK_BINDER_FAIL')); console.log('  PASS: bad type'); },
  () => { const i = validInput(); i.rollback_items = [{ rollback_id: 'x', rollback_type: 'code_rollback', rollback_mode: 'invalid', rollback_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_ROLLBACK_BINDER_FAIL')); console.log('  PASS: bad mode'); },
  () => { const i = validInput(); i.rollback_items = [{ rollback_id: 'x', rollback_type: 'code_rollback', rollback_mode: 'contract-only', rollback_hash: 'short' }]; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_ROLLBACK_BINDER_FAIL')); console.log('  PASS: short hash'); },
  () => { const i = validInput(); i.rollback_items = [{ rollback_type: 'code_rollback', rollback_mode: 'contract-only', rollback_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_ROLLBACK_BINDER_FAIL')); console.log('  PASS: missing rollback_id'); },
  () => { const r = build(validInput()); assert.equal(r.release_rollback_binder_ready, true); assert.equal(r.rollback_items_count, 13); assert.equal(r.required_rollback_controls_count, 13); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.release_rollback_hash); assert.equal(r.release_rollback_hash.length, 64); console.log('  PASS: hash64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.release_rollback_hash, r2.release_rollback_hash); console.log('  PASS: det'); },
  () => { const r = build(validInput()); assert.equal(r.release_rollback_bound, false); assert.equal(r.release_execution_allowed, false); console.log('  PASS: rollback not bound'); },
  () => { const r = build(validInput()); assert.equal(r.deployment_execution_allowed, false); assert.equal(r.deployment_scope_bound, false); assert.equal(r.release_artifact_published, false); console.log('  PASS: deploy scope/artifact blocked'); },
  () => { const r = build(validInput()); assert.equal(r.deployment_dry_run_completed, false); assert.equal(r.release_execution_ready, false); assert.equal(r.release_execution_approved, false); assert.equal(r.deployment_evidence_published, false); console.log('  PASS: dry-run/ready/approved/evid blocked'); },
  () => { const r = build(validInput()); assert.equal(r.release_authority_granted, false); assert.equal(r.release_execution_phase_passed, false); console.log('  PASS: auth/phase blocked'); },
  () => { const r = build(validInput()); assert.equal(r.product_activation_execution_allowed, false); assert.equal(r.saas_enabled, false); assert.equal(r.billing_executed, false); assert.equal(r.production_touched, false); console.log('  PASS: activation/SaaS/prod blocked'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: vready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: vblocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('RELEASE_ROLLBACK_BINDER_READY')); console.log('  PASS: rend'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('release_rollback_hash')); console.log('  PASS: hashren'); },
  () => { const r = build(validInput()); ['release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: inv'); },
  () => { const r = build(null); assert.equal(r.release_rollback_bound, false); assert.equal(r.release_execution_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: binv'); },
];

function run() {
  console.log('\n=== release-rollback-binder tests ===\n');
  const sec = [['exports',0,8],['blocked input',8,10],['blocked evidence',10,14],['fail',14,19],['ready',19,27],['validate',27,29],['render',29,33],['invariants',33,35]];
  let p=0,f=0; for (const [l,s,e] of sec) { console.log('--- '+l+' ---'); for (let i=s; i<e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== ${p} passed, ${f} failed ===\n`); process.exit(f>0?1:0); }
run();