import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_PASS_GOLD_RELEASE_EVIDENCE_CONTRACT_STATUSES, build, validate, render } from '../../software-factory/software-factory-pass-gold-release-evidence-contract.mjs';

function validInput() {
  return {
    pass_gold_release_evidence_contract_id: 'pgrec-v345',
    controlled_release_execution_phase_gate_ready: true,
    controlled_release_execution_phase_gate_id: 'crepg-v344',
    pass_gold_evidence_items: [
      { evidence_id: 'ev-pass-gold-status', evidence_type: 'pass_gold_status', evidence_mode: 'contract-only', evidence_hash: 'a'.repeat(64) },
      { evidence_id: 'ev-pass-gold-receipt', evidence_type: 'pass_gold_receipt', evidence_mode: 'contract-only', evidence_hash: 'b'.repeat(64) },
      { evidence_id: 'ev-release-phase-gate', evidence_type: 'release_phase_gate', evidence_mode: 'metadata-only', evidence_hash: 'c'.repeat(64) },
      { evidence_id: 'ev-deployment-blocker', evidence_type: 'deployment_blocker', evidence_mode: 'dry-run', evidence_hash: 'd'.repeat(64) },
      { evidence_id: 'ev-stable-blocker', evidence_type: 'stable_blocker', evidence_mode: 'planning', evidence_hash: 'e'.repeat(64) },
      { evidence_id: 'ev-tag-blocker', evidence_type: 'tag_blocker', evidence_mode: 'contract-only', evidence_hash: 'f'.repeat(64) },
      { evidence_id: 'ev-production-blocker', evidence_type: 'production_blocker', evidence_mode: 'metadata-only', evidence_hash: '0'.repeat(64) },
      { evidence_id: 'ev-rollback-blocker', evidence_type: 'rollback_blocker', evidence_mode: 'dry-run', evidence_hash: '1'.repeat(64) },
      { evidence_id: 'ev-audit-record', evidence_type: 'audit_record', evidence_mode: 'planning', evidence_hash: '2'.repeat(64) },
      { evidence_id: 'ev-authority-record', evidence_type: 'authority_record', evidence_mode: 'contract-only', evidence_hash: '3'.repeat(64) },
      { evidence_id: 'ev-final-blocker', evidence_type: 'final_blocker', evidence_mode: 'metadata-only', evidence_hash: '4'.repeat(64) },
    ],
    required_evidence_types: [
      'pass_gold_status', 'pass_gold_receipt', 'release_phase_gate',
      'deployment_blocker', 'stable_blocker', 'tag_blocker',
      'production_blocker', 'rollback_blocker', 'audit_record',
      'authority_record', 'final_blocker',
    ],
    evidence_level: 'contract-only',
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_PASS_GOLD_RELEASE_EVIDENCE_CONTRACT_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_PASS_GOLD_RELEASE_EVIDENCE_CONTRACT_STATUSES.includes('PASS_GOLD_RELEASE_EVIDENCE_BLOCKED_INPUT')); console.log('  PASS: B_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_PASS_GOLD_RELEASE_EVIDENCE_CONTRACT_STATUSES.includes('PASS_GOLD_RELEASE_EVIDENCE_BLOCKED_PHASE')); console.log('  PASS: B_PHASE'); },
  () => { assert.ok(SOFTWARE_FACTORY_PASS_GOLD_RELEASE_EVIDENCE_CONTRACT_STATUSES.includes('PASS_GOLD_RELEASE_EVIDENCE_FAIL')); console.log('  PASS: FAIL'); },
  () => { assert.ok(SOFTWARE_FACTORY_PASS_GOLD_RELEASE_EVIDENCE_CONTRACT_STATUSES.includes('PASS_GOLD_RELEASE_EVIDENCE_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: val'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: ren'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('PASS_GOLD_RELEASE_EVIDENCE_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('pass_gold_release_evidence_contract_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.controlled_release_execution_phase_gate_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('PASS_GOLD_RELEASE_EVIDENCE_BLOCKED_PHASE')); console.log('  PASS: phase not ready'); },
  () => { const i = validInput(); delete i.controlled_release_execution_phase_gate_id; const r = build(i); assert.ok(r.errors[0].startsWith('PASS_GOLD_RELEASE_EVIDENCE_BLOCKED_PHASE')); console.log('  PASS: missing phase id'); },
  () => { const i = validInput(); delete i.pass_gold_evidence_items; const r = build(i); assert.ok(r.errors[0].startsWith('PASS_GOLD_RELEASE_EVIDENCE_FAIL')); console.log('  PASS: missing items'); },
  () => { const i = validInput(); i.pass_gold_evidence_items = []; const r = build(i); assert.ok(r.errors[0].startsWith('PASS_GOLD_RELEASE_EVIDENCE_FAIL')); console.log('  PASS: empty items'); },
  () => { const i = validInput(); delete i.pass_gold_evidence_items[0].evidence_id; const r = build(i); assert.ok(r.errors[0].startsWith('PASS_GOLD_RELEASE_EVIDENCE_FAIL')); console.log('  PASS: missing evidence_id'); },
  () => { const i = validInput(); i.pass_gold_evidence_items[0].evidence_type = 'invalid'; const r = build(i); assert.ok(r.errors[0].startsWith('PASS_GOLD_RELEASE_EVIDENCE_FAIL')); console.log('  PASS: invalid evidence_type'); },
  () => { const i = validInput(); i.pass_gold_evidence_items[0].evidence_mode = 'invalid'; const r = build(i); assert.ok(r.errors[0].startsWith('PASS_GOLD_RELEASE_EVIDENCE_FAIL')); console.log('  PASS: invalid evidence_mode'); },
  () => { const i = validInput(); i.pass_gold_evidence_items[0].evidence_hash = 'tooshort'; const r = build(i); assert.ok(r.errors[0].startsWith('PASS_GOLD_RELEASE_EVIDENCE_FAIL')); console.log('  PASS: short hash'); },
  () => { const i = validInput(); i.required_evidence_types = ['pass_gold_status']; const r = build(i); assert.ok(r.errors[0].startsWith('PASS_GOLD_RELEASE_EVIDENCE_FAIL')); console.log('  PASS: missing required types'); },
  () => { const i = validInput(); i.evidence_level = 'invalid'; const r = build(i); assert.ok(r.errors[0].startsWith('PASS_GOLD_RELEASE_EVIDENCE_FAIL')); console.log('  PASS: invalid level'); },
  () => { const i = validInput(); delete i.required_evidence_types; const r = build(i); assert.ok(r.errors[0].startsWith('PASS_GOLD_RELEASE_EVIDENCE_FAIL')); console.log('  PASS: missing required_evidence_types'); },
  () => { const i = validInput(); delete i.evidence_level; const r = build(i); assert.ok(r.errors[0].startsWith('PASS_GOLD_RELEASE_EVIDENCE_FAIL')); console.log('  PASS: missing evidence_level'); },
  () => { const r = build(validInput()); assert.equal(r.pass_gold_release_evidence_contract_ready, true); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.pass_gold_release_evidence_hash); assert.equal(r.pass_gold_release_evidence_hash.length, 64); console.log('  PASS: hash64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.pass_gold_release_evidence_hash, r2.pass_gold_release_evidence_hash); console.log('  PASS: det'); },
  () => { const r = build(validInput()); assert.equal(r.pass_gold_release_evidence_bound, false); console.log('  PASS: evidence not bound'); },
  () => { const r = build(validInput()); assert.equal(r.release_go_decision, false); assert.equal(r.release_no_go_decision, false); console.log('  PASS: go/no-go false'); },
  () => { const r = build(validInput()); assert.equal(r.production_release_scope_locked, false); console.log('  PASS: scope not locked'); },
  () => { const r = build(validInput()); assert.equal(r.release_candidate_integrity_bound, false); console.log('  PASS: integrity not bound'); },
  () => { const r = build(validInput()); assert.equal(r.final_release_ready, false); console.log('  PASS: final not ready'); },
  () => { const r = build(validInput()); assert.equal(r.human_release_authority_bound, false); console.log('  PASS: human authority not bound'); },
  () => { const r = build(validInput()); assert.equal(r.release_execution_plan_published, false); console.log('  PASS: plan not published'); },
  () => { const r = build(validInput()); assert.equal(r.final_rollback_authority_bound, false); console.log('  PASS: rollback auth not bound'); },
  () => { const r = build(validInput()); assert.equal(r.production_release_final_review_approved, false); console.log('  PASS: final review not approved'); },
  () => { const r = build(validInput()); assert.equal(r.pass_gold_release_authority_phase_passed, false); console.log('  PASS: phase not passed'); },
  () => { const r = build(validInput()); assert.equal(r.release_execution_allowed, false); assert.equal(r.deployment_execution_allowed, false); console.log('  PASS: exec not allowed'); },
  () => { const r = build(validInput()); assert.equal(r.release_artifact_published, false); assert.equal(r.deployment_dry_run_completed, false); console.log('  PASS: artifact/dry-run blocked'); },
  () => { const r = build(validInput()); assert.equal(r.release_execution_ready, false); assert.equal(r.release_execution_approved, false); console.log('  PASS: ready/approved blocked'); },
  () => { const r = build(validInput()); assert.equal(r.release_authority_granted, false); console.log('  PASS: authority not granted'); },
  () => { const r = build(validInput()); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); console.log('  PASS: no deploy/release/tag/stable'); },
  () => { const r = build(validInput()); assert.equal(r.real_execution_allowed, false); assert.equal(r.runtime_execution_allowed, false); assert.equal(r.runtime_mission_executed, false); console.log('  PASS: no real execution'); },
  () => { const r = build(validInput()); assert.equal(r.production_touched, false); console.log('  PASS: production not touched'); },
  () => { const r = build(validInput()); assert.equal(r.product_activation_execution_allowed, false); assert.equal(r.production_touch_allowed, false); assert.equal(r.activation_execution_phase_passed, false); assert.equal(r.product_activation_allowed, false); assert.equal(r.saas_enablement_allowed, false); assert.equal(r.saas_enabled, false); assert.equal(r.billing_executed, false); console.log('  PASS: activation/SaaS/prod blocked'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: vready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: vblocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('PASS_GOLD_RELEASE_EVIDENCE_READY')); console.log('  PASS: rend'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('pass_gold_release_evidence_hash')); console.log('  PASS: hashren'); },
  () => { const r = build(validInput()); ['pass_gold_release_evidence_bound','release_go_decision','release_no_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_authority_phase_passed','release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: inv'); },
  () => { const r = build(null); assert.equal(r.pass_gold_release_evidence_bound, false); assert.equal(r.release_go_decision, false); assert.equal(r.production_touched, false); console.log('  PASS: binv'); },
];

function run() {
  console.log('\n=== pass-gold-release-evidence-contract tests ===\n');
  const sec = [['exports',0,8],['blocked input',8,10],['blocked phase',10,14],['fail',14,26],['ready',26,47],['validate',47,49],['render',49,51],['invariants',51,51]];
  let p=0,f=0; for (const [l,s,e] of sec) { console.log('--- '+l+' ---'); for (let i=s; i<e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== ${p} passed, ${f} failed ===\n`); process.exit(f>0?1:0); }
run();