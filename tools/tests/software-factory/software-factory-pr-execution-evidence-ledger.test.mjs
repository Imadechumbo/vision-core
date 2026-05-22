import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_PR_EXECUTION_EVIDENCE_LEDGER_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-pr-execution-evidence-ledger.mjs';

function validEntry(n) {
  return { evidence_type: `type_${n}`, timestamp: `2026-05-22T0${n}:00:00Z`, source: `source-${n}` };
}

function validInput() {
  return {
    ledger_id: 'peel-v252-test',
    drill_id: 'drill-v252-test',
    supervised_real_pr_execution_drill_ready: true,
    evidence_entries: [validEntry(1), validEntry(2)],
  };
}

const TESTS = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_PR_EXECUTION_EVIDENCE_LEDGER_STATUSES)); console.log('  PASS: STATUSES is array'); },
  () => { assert.ok(SOFTWARE_FACTORY_PR_EXECUTION_EVIDENCE_LEDGER_STATUSES.includes('PR_EXEC_EVIDENCE_LEDGER_BLOCKED_INPUT')); console.log('  PASS: has PR_EXEC_EVIDENCE_LEDGER_BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_PR_EXECUTION_EVIDENCE_LEDGER_STATUSES.includes('PR_EXEC_EVIDENCE_LEDGER_BLOCKED_DRILL')); console.log('  PASS: has PR_EXEC_EVIDENCE_LEDGER_BLOCKED_DRILL'); },
  () => { assert.ok(SOFTWARE_FACTORY_PR_EXECUTION_EVIDENCE_LEDGER_STATUSES.includes('PR_EXEC_EVIDENCE_LEDGER_READY')); console.log('  PASS: has PR_EXEC_EVIDENCE_LEDGER_READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build is function'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate is function'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render is function'); },

  () => { const r = build(null); assert.equal(r.pr_execution_evidence_ledger_ready, false); assert.ok(r.errors.some(e => e.includes('PR_EXEC_EVIDENCE_LEDGER_BLOCKED_INPUT'))); console.log('  PASS: null -> BLOCKED_INPUT'); },
  () => { const r = build(null); assert.equal(r.real_pr_creation_allowed, false); assert.equal(r.release_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: null: all flags false'); },
  () => { const r = build({}); assert.equal(r.pr_execution_evidence_ledger_ready, false); console.log('  PASS: {} -> BLOCKED_INPUT'); },
  () => { const i = validInput(); delete i.ledger_id; const r = build(i); assert.equal(r.pr_execution_evidence_ledger_ready, false); assert.ok(r.errors.some(e => e.includes('missing ledger_id'))); console.log('  PASS: no ledger_id -> BLOCKED_INPUT'); },
  () => { const i = validInput(); delete i.drill_id; const r = build(i); assert.equal(r.pr_execution_evidence_ledger_ready, false); assert.ok(r.errors.some(e => e.includes('missing drill_id'))); console.log('  PASS: no drill_id -> BLOCKED_INPUT'); },

  () => { const i = validInput(); i.supervised_real_pr_execution_drill_ready = false; const r = build(i); assert.equal(r.pr_execution_evidence_ledger_ready, false); assert.ok(r.errors.some(e => e.startsWith('PR_EXEC_EVIDENCE_LEDGER_BLOCKED_DRILL'))); console.log('  PASS: drill not ready -> BLOCKED_DRILL'); },
  () => { const i = validInput(); i.evidence_entries = []; const r = build(i); assert.equal(r.pr_execution_evidence_ledger_ready, false); assert.ok(r.errors.some(e => e.includes('evidence_entries required'))); console.log('  PASS: empty entries -> BLOCKED_DRILL'); },
  () => { const i = validInput(); i.evidence_entries = [{ timestamp: 't', source: 's' }]; const r = build(i); assert.equal(r.pr_execution_evidence_ledger_ready, false); assert.ok(r.errors.some(e => e.includes('evidence_type'))); console.log('  PASS: entry missing evidence_type -> BLOCKED_DRILL'); },
  () => { const i = validInput(); i.evidence_entries = [{ evidence_type: 'x', source: 's' }]; const r = build(i); assert.equal(r.pr_execution_evidence_ledger_ready, false); assert.ok(r.errors.some(e => e.includes('timestamp'))); console.log('  PASS: entry missing timestamp -> BLOCKED_DRILL'); },
  () => { const i = validInput(); i.evidence_entries = [{ evidence_type: 'x', timestamp: 't' }]; const r = build(i); assert.equal(r.pr_execution_evidence_ledger_ready, false); assert.ok(r.errors.some(e => e.includes('source'))); console.log('  PASS: entry missing source -> BLOCKED_DRILL'); },

  () => { const r = build(validInput()); assert.equal(r.pr_execution_evidence_ledger_ready, true); console.log('  PASS: valid -> PR_EXEC_EVIDENCE_LEDGER_READY'); },
  () => { const r = build(validInput()); assert.equal(r.schema_version, 'v252.0'); console.log('  PASS: schema_version=v252.0'); },
  () => { const r = build(validInput()); assert.ok(r.ledger_id); assert.ok(r.drill_id); console.log('  PASS: ids set'); },
  () => { const r = build(validInput()); assert.equal(r.entries_count, 2); console.log('  PASS: entries_count=2'); },
  () => { const r = build(validInput()); assert.equal(r.evidence_complete, true); console.log('  PASS: evidence_complete=true'); },
  () => { const r = build(validInput()); assert.ok(r.ledger_hash && r.ledger_hash.length === 64); console.log('  PASS: ledger_hash 64 chars'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.ledger_hash, r2.ledger_hash); console.log('  PASS: hash deterministic'); },
  () => { const r = build(validInput()); assert.equal(r.release_allowed, false); assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false); assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false); assert.equal(r.real_pr_creation_allowed, false); assert.equal(r.production_touched, false); console.log('  PASS: all flags false'); },
  () => { const r = build(validInput()); assert.deepEqual(r.errors, []); console.log('  PASS: errors empty'); },

  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate ready: valid=true'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.errors.length, 0); console.log('  PASS: validate ready: no errors'); },
  () => { const v = validate(null); assert.equal(v.valid, false); console.log('  PASS: validate null: valid=false'); },

  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); console.log('  PASS: render: is string'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: render: contains REGRA ABSOLUTA'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('real_pr_creation_allowed')); console.log('  PASS: render: contains real_pr_creation_allowed'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: render null: returns string with REGRA ABSOLUTA'); },

  () => {
    const cases = [build(validInput()), build(null), build({})];
    for (const r of cases) {
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
console.log('\n=== software-factory-pr-execution-evidence-ledger tests ===\n');
for (const test of TESTS) {
  try { test(); passed++; } catch (e) { console.log('  FAIL:', e.message); failed++; }
}
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
