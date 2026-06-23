import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_RELEASE_GO_NO_GO_DECISION_GATE_STATUSES, build, validate, render } from '../../software-factory/software-factory-release-go-no-go-decision-gate.mjs';

function validInput() {
  return {
    release_go_no_go_decision_gate_id: 'rgngdg-v346',
    pass_gold_release_evidence_contract_id: 'pgrec-v345',
    pass_gold_release_evidence_contract_ready: true,
    release_decision: 'go',
    decision_reason: 'All PASS GOLD evidence verified, no blockers detected',
    decision_mode: 'contract-only',
    required_decision_controls: [
      'pass-gold-required', 'human-authority-required', 'no-production-touch',
      'no-real-release', 'no-real-deploy', 'no-tag-create', 'no-stable-promotion',
      'rollback-required', 'evidence-required', 'audit-required',
    ],
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_RELEASE_GO_NO_GO_DECISION_GATE_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_RELEASE_GO_NO_GO_DECISION_GATE_STATUSES.includes('RELEASE_GO_NO_GO_BLOCKED_INPUT')); console.log('  PASS: B_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_RELEASE_GO_NO_GO_DECISION_GATE_STATUSES.includes('RELEASE_GO_NO_GO_BLOCKED_EVIDENCE')); console.log('  PASS: B_EVIDENCE'); },
  () => { assert.ok(SOFTWARE_FACTORY_RELEASE_GO_NO_GO_DECISION_GATE_STATUSES.includes('RELEASE_GO_NO_GO_DENIED')); console.log('  PASS: DENIED'); },
  () => { assert.ok(SOFTWARE_FACTORY_RELEASE_GO_NO_GO_DECISION_GATE_STATUSES.includes('RELEASE_GO_NO_GO_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: val'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: ren'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('RELEASE_GO_NO_GO_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('release_go_no_go_decision_gate_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.pass_gold_release_evidence_contract_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_GO_NO_GO_BLOCKED_EVIDENCE')); console.log('  PASS: evidence not ready'); },
  () => { const i = validInput(); delete i.pass_gold_release_evidence_contract_id; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_GO_NO_GO_BLOCKED_EVIDENCE')); console.log('  PASS: missing evidence id'); },
  () => { const i = validInput(); i.release_decision = 'no-go'; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_GO_NO_GO_DENIED')); console.log('  PASS: no-go decision'); },
  () => { const i = validInput(); i.release_decision = 'blocked'; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_GO_NO_GO_DENIED')); console.log('  PASS: blocked decision'); },
  () => { const i = validInput(); i.release_decision = 'invalid'; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_GO_NO_GO_DENIED')); console.log('  PASS: invalid decision'); },
  () => { const i = validInput(); delete i.decision_reason; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_GO_NO_GO_DENIED')); console.log('  PASS: missing reason'); },
  () => { const i = validInput(); i.decision_mode = 'invalid'; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_GO_NO_GO_DENIED')); console.log('  PASS: invalid mode'); },
  () => { const i = validInput(); delete i.required_decision_controls; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_GO_NO_GO_DENIED')); console.log('  PASS: missing controls'); },
  () => { const i = validInput(); i.required_decision_controls = ['pass-gold-required']; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_GO_NO_GO_DENIED')); console.log('  PASS: missing required controls'); },
  () => { const r = build(validInput()); assert.equal(r.release_go_no_go_decision_gate_ready, true); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.release_go_no_go_hash); assert.equal(r.release_go_no_go_hash.length, 64); console.log('  PASS: hash64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.release_go_no_go_hash, r2.release_go_no_go_hash); console.log('  PASS: det'); },
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
  () => { const r = build(validInput()); assert.equal(r.deployment_scope_bound, false); assert.equal(r.release_artifact_published, false); assert.equal(r.deployment_dry_run_completed, false); console.log('  PASS: scope/artifact/dry-run blocked'); },
  () => { const r = build(validInput()); assert.equal(r.release_execution_ready, false); assert.equal(r.release_execution_approved, false); assert.equal(r.deployment_evidence_published, false); console.log('  PASS: ready/approved/evid blocked'); },
  () => { const r = build(validInput()); assert.equal(r.release_rollback_bound, false); assert.equal(r.release_authority_granted, false); assert.equal(r.release_execution_phase_passed, false); console.log('  PASS: rollback/auth/phase blocked'); },
  () => { const r = build(validInput()); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); console.log('  PASS: no deploy/release/tag/stable'); },
  () => { const r = build(validInput()); assert.equal(r.real_execution_allowed, false); assert.equal(r.runtime_execution_allowed, false); assert.equal(r.runtime_mission_executed, false); console.log('  PASS: no real execution'); },
  () => { const r = build(validInput()); assert.equal(r.production_touched, false); console.log('  PASS: production not touched'); },
  () => { const r = build(validInput()); assert.equal(r.product_activation_execution_allowed, false); assert.equal(r.production_touch_allowed, false); assert.equal(r.activation_execution_phase_passed, false); assert.equal(r.product_activation_allowed, false); assert.equal(r.saas_enablement_allowed, false); assert.equal(r.saas_enabled, false); assert.equal(r.billing_executed, false); console.log('  PASS: activation/SaaS/prod blocked'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: vready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: vblocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('RELEASE_GO_NO_GO_READY')); console.log('  PASS: rend'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('release_go_no_go_hash')); console.log('  PASS: hashren'); },
  () => { const r = build(validInput()); ['pass_gold_release_evidence_bound','release_go_decision','release_no_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_authority_phase_passed','release_execution_allowed','deployment_execution_allowed','deployment_scope_bound','release_artifact_published','deployment_dry_run_completed','release_execution_ready','release_execution_approved','deployment_evidence_published','release_rollback_bound','release_authority_granted','release_execution_phase_passed','product_activation_execution_allowed','production_touch_allowed','activation_execution_phase_passed','product_activation_allowed','saas_enablement_allowed','saas_enabled','billing_executed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: inv'); },
  () => { const r = build(null); assert.equal(r.pass_gold_release_evidence_bound, false); assert.equal(r.release_go_decision, false); assert.equal(r.production_touched, false); console.log('  PASS: binv'); },
];

function run() {
  console.log('\n=== release-go-no-go-decision-gate tests ===\n');
  const sec = [['exports',0,8],['blocked input',8,10],['blocked evidence',10,12],['denied',12,20],['ready',20,41],['validate',41,43],['render',43,47],['invariants',47,48]];
  let p=0,f=0; for (const [l,s,e] of sec) { console.log('--- '+l+' ---'); for (let i=s; i<e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== ${p} passed, ${f} failed ===\n`); process.exit(f>0?1:0); }
run();