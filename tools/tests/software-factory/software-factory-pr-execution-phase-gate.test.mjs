import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_PR_EXECUTION_PHASE_GATE_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-pr-execution-phase-gate.mjs';

function validInput() {
  return {
    gate_id: 'pepg-v254-test',
    final_review_id: 'pefar-v254-test',
    pr_execution_final_authority_review_ready: true,
    authority_contract_id: 'ac-v254',
    command_binder_id: 'cb-v254',
    sandbox_id: 'sb-v254',
    dry_run_verifier_id: 'drv-v254',
    approval_gate_id: 'ag-v254',
    execution_barrier_id: 'eb-v254',
    execution_drill_id: 'ed-v254',
    evidence_ledger_id: 'el-v254',
  };
}

const TESTS = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_PR_EXECUTION_PHASE_GATE_STATUSES)); console.log('  PASS: STATUSES is array'); },
  () => { assert.ok(SOFTWARE_FACTORY_PR_EXECUTION_PHASE_GATE_STATUSES.includes('PR_EXEC_PHASE_GATE_BLOCKED_INPUT')); console.log('  PASS: has PR_EXEC_PHASE_GATE_BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_PR_EXECUTION_PHASE_GATE_STATUSES.includes('PR_EXEC_PHASE_GATE_BLOCKED_REVIEW')); console.log('  PASS: has PR_EXEC_PHASE_GATE_BLOCKED_REVIEW'); },
  () => { assert.ok(SOFTWARE_FACTORY_PR_EXECUTION_PHASE_GATE_STATUSES.includes('PR_EXEC_PHASE_GATE_INCOMPLETE')); console.log('  PASS: has PR_EXEC_PHASE_GATE_INCOMPLETE'); },
  () => { assert.ok(SOFTWARE_FACTORY_PR_EXECUTION_PHASE_GATE_STATUSES.includes('PR_EXEC_PHASE_GATE_READY')); console.log('  PASS: has PR_EXEC_PHASE_GATE_READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build is function'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate is function'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render is function'); },

  () => { const r = build(null); assert.equal(r.pr_execution_phase_gate_ready, false); assert.ok(r.errors.some(e => e.includes('PR_EXEC_PHASE_GATE_BLOCKED_INPUT'))); console.log('  PASS: null -> BLOCKED_INPUT'); },
  () => { const r = build(null); assert.equal(r.real_pr_creation_allowed, false); assert.equal(r.release_allowed, false); assert.equal(r.production_touched, false); assert.equal(r.phase_passed, false); console.log('  PASS: null: all flags false'); },
  () => { const r = build({}); assert.equal(r.pr_execution_phase_gate_ready, false); console.log('  PASS: {} -> BLOCKED_INPUT'); },
  () => { const i = validInput(); delete i.gate_id; const r = build(i); assert.equal(r.pr_execution_phase_gate_ready, false); assert.ok(r.errors.some(e => e.includes('missing gate_id'))); console.log('  PASS: no gate_id -> BLOCKED_INPUT'); },
  () => { const i = validInput(); delete i.final_review_id; const r = build(i); assert.equal(r.pr_execution_phase_gate_ready, false); assert.ok(r.errors.some(e => e.includes('missing final_review_id'))); console.log('  PASS: no final_review_id -> BLOCKED_INPUT'); },

  () => { const i = validInput(); i.pr_execution_final_authority_review_ready = false; const r = build(i); assert.equal(r.pr_execution_phase_gate_ready, false); assert.ok(r.errors.some(e => e.startsWith('PR_EXEC_PHASE_GATE_BLOCKED_REVIEW'))); console.log('  PASS: review not ready -> BLOCKED_REVIEW'); },

  () => { const i = validInput(); delete i.authority_contract_id; const r = build(i); assert.equal(r.pr_execution_phase_gate_ready, false); assert.ok(r.errors.some(e => e.includes('authority_contract_id'))); console.log('  PASS: missing authority_contract_id -> INCOMPLETE'); },
  () => { const i = validInput(); delete i.command_binder_id; const r = build(i); assert.equal(r.pr_execution_phase_gate_ready, false); assert.ok(r.errors.some(e => e.includes('command_binder_id'))); console.log('  PASS: missing command_binder_id -> INCOMPLETE'); },
  () => { const i = validInput(); delete i.sandbox_id; const r = build(i); assert.equal(r.pr_execution_phase_gate_ready, false); assert.ok(r.errors.some(e => e.includes('sandbox_id'))); console.log('  PASS: missing sandbox_id -> INCOMPLETE'); },
  () => { const i = validInput(); delete i.dry_run_verifier_id; const r = build(i); assert.equal(r.pr_execution_phase_gate_ready, false); assert.ok(r.errors.some(e => e.includes('dry_run_verifier_id'))); console.log('  PASS: missing dry_run_verifier_id -> INCOMPLETE'); },
  () => { const i = validInput(); delete i.approval_gate_id; const r = build(i); assert.equal(r.pr_execution_phase_gate_ready, false); assert.ok(r.errors.some(e => e.includes('approval_gate_id'))); console.log('  PASS: missing approval_gate_id -> INCOMPLETE'); },
  () => { const i = validInput(); delete i.execution_barrier_id; const r = build(i); assert.equal(r.pr_execution_phase_gate_ready, false); assert.ok(r.errors.some(e => e.includes('execution_barrier_id'))); console.log('  PASS: missing execution_barrier_id -> INCOMPLETE'); },
  () => { const i = validInput(); delete i.execution_drill_id; const r = build(i); assert.equal(r.pr_execution_phase_gate_ready, false); assert.ok(r.errors.some(e => e.includes('execution_drill_id'))); console.log('  PASS: missing execution_drill_id -> INCOMPLETE'); },
  () => { const i = validInput(); delete i.evidence_ledger_id; const r = build(i); assert.equal(r.pr_execution_phase_gate_ready, false); assert.ok(r.errors.some(e => e.includes('evidence_ledger_id'))); console.log('  PASS: missing evidence_ledger_id -> INCOMPLETE'); },

  () => { const r = build(validInput()); assert.equal(r.pr_execution_phase_gate_ready, true); console.log('  PASS: valid -> PR_EXEC_PHASE_GATE_READY'); },
  () => { const r = build(validInput()); assert.equal(r.schema_version, 'v254.0'); console.log('  PASS: schema_version=v254.0'); },
  () => { const r = build(validInput()); assert.ok(r.gate_id); assert.ok(r.final_review_id); console.log('  PASS: ids set'); },
  () => { const r = build(validInput()); assert.equal(r.modules_verified, 9); console.log('  PASS: modules_verified=9'); },
  () => { const r = build(validInput()); assert.equal(r.all_modules_present, true); console.log('  PASS: all_modules_present=true'); },
  () => { const r = build(validInput()); assert.equal(r.phase_passed, false); console.log('  PASS: phase_passed=false always'); },
  () => { const r = build(validInput()); assert.ok(r.gate_hash && r.gate_hash.length === 64); console.log('  PASS: gate_hash 64 chars'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.gate_hash, r2.gate_hash); console.log('  PASS: hash deterministic'); },
  () => { const r = build(validInput()); assert.ok(r.final_message.includes('V245-V254')); assert.ok(r.final_message.includes('V255')); console.log('  PASS: final_message correct'); },
  () => { const r = build(validInput()); assert.equal(r.real_pr_creation_allowed, false); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: all flags false'); },
  () => { const r = build(validInput()); assert.deepEqual(r.errors, []); console.log('  PASS: errors empty'); },

  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate ready: valid=true'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.errors.length, 0); console.log('  PASS: validate ready: no errors'); },
  () => { const v = validate(null); assert.equal(v.valid, false); console.log('  PASS: validate null: valid=false'); },

  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); console.log('  PASS: render: is string'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: render: contains REGRA ABSOLUTA'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('real_pr_creation_allowed')); console.log('  PASS: render: contains real_pr_creation_allowed'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('final_message')); console.log('  PASS: render: contains final_message'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('V255')); console.log('  PASS: render: contains V255 reference'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: render null: returns string with REGRA ABSOLUTA'); },

  () => {
    const cases = [build(validInput()), build(null), build({})];
    for (const r of cases) {
      assert.equal(r.phase_passed, false);
      assert.equal(r.real_pr_creation_allowed, false);
      assert.equal(r.release_allowed, false);
      assert.equal(r.deploy_allowed, false);
      assert.equal(r.stable_allowed, false);
      assert.equal(r.tag_allowed, false);
      assert.equal(r.real_execution_allowed, false);
      assert.equal(r.production_touched, false);
    }
    console.log('  PASS: invariants: all flags always false');
  },
];

let passed = 0; let failed = 0;
console.log('\n=== software-factory-pr-execution-phase-gate tests ===\n');
for (const test of TESTS) {
  try { test(); passed++; } catch (e) { console.log('  FAIL:', e.message); failed++; }
}
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
