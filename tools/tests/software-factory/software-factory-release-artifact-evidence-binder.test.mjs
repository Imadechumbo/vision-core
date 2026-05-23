import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_RELEASE_ARTIFACT_EVIDENCE_BINDER_STATUSES, build, validate, render } from '../../software-factory/software-factory-release-artifact-evidence-binder.mjs';

function validInput() {
  const h = (c) => c.repeat(64);
  return {
    release_artifact_evidence_binder_id: 'raeb-v337', deployment_scope_boundary_id: 'dsbc-v336', deployment_scope_boundary_contract_ready: true,
    artifact_items: [
      { artifact_id: 'a1', artifact_type: 'source_snapshot', artifact_mode: 'contract-only', artifact_hash: h('a') },
      { artifact_id: 'a2', artifact_type: 'build_manifest', artifact_mode: 'metadata-only', artifact_hash: h('0') },
      { artifact_id: 'a3', artifact_type: 'test_report', artifact_mode: 'dry-run', artifact_hash: h('b') },
      { artifact_id: 'a4', artifact_type: 'syntax_report', artifact_mode: 'planning', artifact_hash: h('c') },
      { artifact_id: 'a5', artifact_type: 'pass_gold_status', artifact_mode: 'contract-only', artifact_hash: h('d') },
      { artifact_id: 'a6', artifact_type: 'deployment_plan', artifact_mode: 'metadata-only', artifact_hash: h('e') },
      { artifact_id: 'a7', artifact_type: 'release_notes', artifact_mode: 'dry-run', artifact_hash: h('f') },
      { artifact_id: 'a8', artifact_type: 'rollback_plan', artifact_mode: 'planning', artifact_hash: h('a') },
      { artifact_id: 'a9', artifact_type: 'audit_record', artifact_mode: 'contract-only', artifact_hash: h('0') },
      { artifact_id: 'a10', artifact_type: 'blocker_record', artifact_mode: 'metadata-only', artifact_hash: h('b') },
      { artifact_id: 'a11', artifact_type: 'artifact_digest', artifact_mode: 'dry-run', artifact_hash: h('c') },
    ],
    artifact_level: 'contract-only',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_RELEASE_ARTIFACT_EVIDENCE_BINDER_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_RELEASE_ARTIFACT_EVIDENCE_BINDER_STATUSES.includes('RELEASE_ARTIFACT_EVIDENCE_BINDER_BLOCKED_INPUT')); console.log('  PASS: B_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_RELEASE_ARTIFACT_EVIDENCE_BINDER_STATUSES.includes('RELEASE_ARTIFACT_EVIDENCE_BINDER_BLOCKED_SCOPE')); console.log('  PASS: B_SCOPE'); },
  () => { assert.ok(SOFTWARE_FACTORY_RELEASE_ARTIFACT_EVIDENCE_BINDER_STATUSES.includes('RELEASE_ARTIFACT_EVIDENCE_BINDER_FAIL')); console.log('  PASS: FAIL'); },
  () => { assert.ok(SOFTWARE_FACTORY_RELEASE_ARTIFACT_EVIDENCE_BINDER_STATUSES.includes('RELEASE_ARTIFACT_EVIDENCE_BINDER_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: val'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: ren'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('RELEASE_ARTIFACT_EVIDENCE_BINDER_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('release_artifact_evidence_binder_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.deployment_scope_boundary_contract_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_ARTIFACT_EVIDENCE_BINDER_BLOCKED_SCOPE')); console.log('  PASS: scope not ready'); },
  () => { const i = validInput(); delete i.deployment_scope_boundary_id; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_ARTIFACT_EVIDENCE_BINDER_BLOCKED_SCOPE')); console.log('  PASS: missing scope id'); },
  () => { const i = validInput(); i.artifact_items = []; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_ARTIFACT_EVIDENCE_BINDER_BLOCKED_SCOPE')); console.log('  PASS: empty items'); },
  () => { const i = validInput(); i.artifact_level = 'live'; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_ARTIFACT_EVIDENCE_BINDER_BLOCKED_SCOPE')); console.log('  PASS: bad level'); },
  () => { const i = validInput(); i.artifact_items = [{ artifact_id: 'x', artifact_type: 'source_snapshot', artifact_mode: 'contract-only', artifact_hash: 'a'.repeat(64) }]; i.required_artifact_controls = []; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_ARTIFACT_EVIDENCE_BINDER_FAIL')); assert.ok(r.errors[0].includes('missing required artifact controls')); console.log('  PASS: missing controls'); },
  () => { const i = validInput(); i.artifact_items = [{ artifact_id: 'x', artifact_type: 'invalid', artifact_mode: 'contract-only', artifact_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_ARTIFACT_EVIDENCE_BINDER_FAIL')); console.log('  PASS: bad type'); },
  () => { const i = validInput(); i.artifact_items = [{ artifact_id: 'x', artifact_type: 'source_snapshot', artifact_mode: 'invalid', artifact_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_ARTIFACT_EVIDENCE_BINDER_FAIL')); console.log('  PASS: bad mode'); },
  () => { const i = validInput(); i.artifact_items = [{ artifact_id: 'x', artifact_type: 'source_snapshot', artifact_mode: 'contract-only', artifact_hash: 'short' }]; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_ARTIFACT_EVIDENCE_BINDER_FAIL')); console.log('  PASS: short hash'); },
  () => { const i = validInput(); i.artifact_items = [{ artifact_type: 'source_snapshot', artifact_mode: 'contract-only', artifact_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_ARTIFACT_EVIDENCE_BINDER_FAIL')); console.log('  PASS: missing artifact_id'); },
  () => { const r = build(validInput()); assert.equal(r.release_artifact_evidence_binder_ready, true); assert.equal(r.artifact_items_count, 11); assert.equal(r.required_artifact_controls_count, 10); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.release_artifact_evidence_hash); assert.equal(r.release_artifact_evidence_hash.length, 64); console.log('  PASS: hash64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.release_artifact_evidence_hash, r2.release_artifact_evidence_hash); console.log('  PASS: det'); },
  () => { const r = build(validInput()); assert.equal(r.release_artifact_published, false); assert.equal(r.release_execution_allowed, false); console.log('  PASS: artifact not published'); },
  () => { const r = build(validInput()); assert.equal(r.deployment_execution_allowed, false); assert.equal(r.deployment_scope_bound, false); assert.equal(r.deployment_dry_run_completed, false); console.log('  PASS: deploy scope/dry-run blocked'); },
  () => { const r = build(validInput()); assert.equal(r.release_execution_ready, false); assert.equal(r.release_execution_approved, false); assert.equal(r.deployment_evidence_published, false); console.log('  PASS: ready/approved/evid blocked'); },
  () => { const r = build(validInput()); assert.equal(r.release_rollback_bound, false); assert.equal(r.release_authority_granted, false); assert.equal(r.release_execution_phase_passed, false); console.log('  PASS: rollback/auth/phase blocked'); },
  () => { const r = build(validInput()); assert.equal(r.product_activation_execution_allowed, false); assert.equal(r.saas_enabled, false); assert.equal(r.billing_executed, false); assert.equal(r.production_touched, false); console.log('  PASS: activation/SaaS/prod blocked'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: vready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: vblocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('RELEASE_ARTIFACT_EVIDENCE_BINDER_READY')); console.log('  PASS: rend'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('release_artifact_evidence_hash')); console.log('  PASS: hashren'); },
  () => { const r = build(validInput()); ['release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: inv'); },
  () => { const r = build(null); assert.equal(r.release_artifact_published, false); assert.equal(r.release_execution_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: binv'); },
];

function run() {
  console.log('\n=== release-artifact-evidence-binder tests ===\n');
  const sec = [['exports',0,8],['blocked input',8,10],['blocked scope',10,14],['fail',14,19],['ready',19,27],['validate',27,29],['render',29,33],['invariants',33,35]];
  let p=0,f=0; for (const [l,s,e] of sec) { console.log('--- '+l+' ---'); for (let i=s; i<e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== ${p} passed, ${f} failed ===\n`); process.exit(f>0?1:0); }
run();