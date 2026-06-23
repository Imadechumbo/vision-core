import * as assert from 'assert/strict';
import { SOFTWARE_FACTORY_RELEASE_EXECUTION_CONSENT_BINDER_STATUSES, build, validate, render } from '../../software-factory/software-factory-release-execution-consent-binder.mjs';

function validInput() {
  return {
    release_execution_consent_binder_id: 'recb-v356',
    explicit_release_execution_command_id: 'erecc-v355',
    explicit_release_execution_command_ready: true,
    consent_decision: 'approved',
    consent_id: 'human-consent-jane',
    consent_reason: 'All checks verified for consent',
    consent_mode: 'contract-only',
    required_consent_controls: [
      'human-consent-required', 'explicit-command-required', 'pass-gold-required',
      'no-production-touch', 'no-real-release', 'no-real-deploy', 'no-tag-create',
      'no-stable-promotion', 'no-artifact-publish', 'no-billing-execution',
      'no-secret-access', 'rollback-required', 'evidence-required', 'audit-required',
    ],
  };
}

const T = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_RELEASE_EXECUTION_CONSENT_BINDER_STATUSES)); console.log('  PASS: STATUSES'); },
  () => { assert.ok(SOFTWARE_FACTORY_RELEASE_EXECUTION_CONSENT_BINDER_STATUSES.includes('RELEASE_EXECUTION_CONSENT_BINDER_BLOCKED_INPUT')); console.log('  PASS: B_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_RELEASE_EXECUTION_CONSENT_BINDER_STATUSES.includes('RELEASE_EXECUTION_CONSENT_BINDER_BLOCKED_COMMAND')); console.log('  PASS: B_COMMAND'); },
  () => { assert.ok(SOFTWARE_FACTORY_RELEASE_EXECUTION_CONSENT_BINDER_STATUSES.includes('RELEASE_EXECUTION_CONSENT_BINDER_DENIED')); console.log('  PASS: DENIED'); },
  () => { assert.ok(SOFTWARE_FACTORY_RELEASE_EXECUTION_CONSENT_BINDER_STATUSES.includes('RELEASE_EXECUTION_CONSENT_BINDER_READY')); console.log('  PASS: READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: val'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: ren'); },
  () => { const r = build(null); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_CONSENT_BINDER_BLOCKED_INPUT')); console.log('  PASS: null'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('release_execution_consent_binder_id')); console.log('  PASS: {}'); },
  () => { const i = validInput(); i.explicit_release_execution_command_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_CONSENT_BINDER_BLOCKED_COMMAND')); console.log('  PASS: command not ready'); },
  () => { const i = validInput(); delete i.explicit_release_execution_command_id; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_CONSENT_BINDER_BLOCKED_COMMAND')); console.log('  PASS: missing command id'); },
  () => { const i = validInput(); i.consent_decision = 'denied'; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_CONSENT_BINDER_DENIED')); console.log('  PASS: denied decision'); },
  () => { const i = validInput(); i.consent_decision = 'blocked'; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_CONSENT_BINDER_DENIED')); console.log('  PASS: blocked decision'); },
  () => { const i = validInput(); i.consent_decision = 'invalid'; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_CONSENT_BINDER_DENIED')); console.log('  PASS: invalid decision'); },
  () => { const i = validInput(); delete i.consent_id; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_CONSENT_BINDER_DENIED')); console.log('  PASS: missing consent_id'); },
  () => { const i = validInput(); delete i.consent_reason; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_CONSENT_BINDER_DENIED')); console.log('  PASS: missing reason'); },
  () => { const i = validInput(); i.consent_mode = 'invalid'; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_CONSENT_BINDER_DENIED')); console.log('  PASS: invalid mode'); },
  () => { const i = validInput(); delete i.required_consent_controls; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_CONSENT_BINDER_DENIED')); console.log('  PASS: missing controls'); },
  () => { const i = validInput(); i.required_consent_controls = ['human-consent-required']; const r = build(i); assert.ok(r.errors[0].startsWith('RELEASE_EXECUTION_CONSENT_BINDER_DENIED')); console.log('  PASS: missing required controls'); },
  () => { const r = build(validInput()); assert.equal(r.release_execution_consent_binder_ready, true); assert.equal(r.errors.length, 0); console.log('  PASS: READY'); },
  () => { const r = build(validInput()); assert.ok(r.release_execution_consent_hash); assert.equal(r.release_execution_consent_hash.length, 64); console.log('  PASS: hash64'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.release_execution_consent_hash, r2.release_execution_consent_hash); console.log('  PASS: det'); },
  () => { const r = build(validInput()); assert.equal(r.release_execution_consent_bound, false); console.log('  PASS: consent not bound'); },
  () => { const r = build(validInput()); assert.equal(r.explicit_release_execution_command_received, false); console.log('  PASS: command not received'); },
  () => { const r = build(validInput()); assert.equal(r.final_production_preflight_passed, false); console.log('  PASS: preflight not passed'); },
  () => { const r = build(validInput()); assert.equal(r.real_release_execution_barrier_open, false); console.log('  PASS: barrier not open'); },
  () => { const r = build(validInput()); assert.equal(r.explicit_release_execution_phase_passed, false); console.log('  PASS: phase not passed'); },
  () => { const r = build(validInput()); assert.equal(r.real_release_executed, false); console.log('  PASS: no real release'); },
  () => { const r = build(validInput()); assert.equal(r.real_deploy_executed, false); console.log('  PASS: no real deploy'); },
  () => { const r = build(validInput()); assert.equal(r.real_tag_created, false); console.log('  PASS: no real tag'); },
  () => { const r = build(validInput()); assert.equal(r.real_stable_promoted, false); console.log('  PASS: no stable'); },
  () => { const r = build(validInput()); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); console.log('  PASS: no deploy/release/tag/stable'); },
  () => { const r = build(validInput()); assert.equal(r.real_execution_allowed, false); assert.equal(r.runtime_execution_allowed, false); console.log('  PASS: no real execution'); },
  () => { const r = build(validInput()); assert.equal(r.production_touched, false); console.log('  PASS: production not touched'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: vready'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: vblocked'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('RELEASE_EXECUTION_CONSENT_BINDER_READY')); console.log('  PASS: rend'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: REGRA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: null'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('release_execution_consent_hash')); console.log('  PASS: hashren'); },
  () => { const r = build(validInput()); ['release_execution_consent_bound','explicit_release_execution_command_received','final_production_preflight_passed','real_release_execution_barrier_open','explicit_release_execution_phase_passed','real_release_executed','real_deploy_executed','real_tag_created','real_stable_promoted','pass_gold_release_authority_phase_passed','human_release_authority_bound','release_execution_plan_published','final_rollback_authority_bound','production_release_final_review_approved','pass_gold_release_evidence_bound','release_go_decision','production_release_scope_locked','release_candidate_integrity_bound','final_release_ready','release_execution_allowed','deployment_execution_allowed','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched','saas_enabled','billing_executed'].forEach(k => assert.equal(r[k], false)); console.log('  PASS: inv'); },
  () => { const r = build(null); assert.equal(r.release_execution_consent_bound, false); assert.equal(r.production_touched, false); console.log('  PASS: binv'); },
];

function run() {
  console.log('\n=== release-execution-consent-binder tests ===\n');
  const sec = [['exports',0,8],['blocked input',8,10],['blocked command',10,12],['denied',12,20],['ready',20,35],['validate',35,37],['render',37,41],['invariants',41,42]];
  let p=0,f=0; for (const [l,s,e] of sec) { console.log('--- '+l+' ---'); for (let i=s; i<e; i++) { try { T[i](); p++; } catch (ex) { console.error(`  FAIL: ${ex.message}`); f++; } } }
  console.log(`\n=== ${p} passed, ${f} failed ===\n`); process.exit(f>0?1:0); }
run();