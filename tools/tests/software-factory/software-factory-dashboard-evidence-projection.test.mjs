import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_DASHBOARD_EVIDENCE_PROJECTION_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-dashboard-evidence-projection.mjs';

function validEvidence(id, type, mode, hashChar) {
  return { evidence_id: id, evidence_type: type, projection_mode: mode, evidence_hash: hashChar.repeat(64) };
}

function validInput() {
  return {
    evidence_projection_id: 'ep-v293',
    audit_ledger_id: 'al-v292',
    product_audit_ledger_contract_ready: true,
    projected_evidence: [
      validEvidence('ev1', 'runtime_gate', 'read-only', 'a'),
      validEvidence('ev2', 'policy_vault', 'read-only', 'b'),
      validEvidence('ev3', 'audit_ledger', 'read-only', 'c'),
      validEvidence('ev4', 'dashboard_view', 'read-only', 'd'),
      validEvidence('ev5', 'policy_binding', 'read-only', 'e'),
      validEvidence('ev6', 'evidence_receipt', 'read-only', 'f'),
    ],
    required_evidence_types: ['runtime_gate', 'policy_vault', 'audit_ledger', 'dashboard_view', 'policy_binding', 'evidence_receipt'],
    projection_level: 'contract-only',
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_DASHBOARD_EVIDENCE_PROJECTION_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_DASHBOARD_EVIDENCE_PROJECTION_STATUSES.includes('DASHBOARD_EVIDENCE_PROJECTION_BLOCKED_INPUT'));
    console.log('  PASS: has BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_DASHBOARD_EVIDENCE_PROJECTION_STATUSES.includes('DASHBOARD_EVIDENCE_PROJECTION_BLOCKED_LEDGER'));
    console.log('  PASS: has BLOCKED_LEDGER');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_DASHBOARD_EVIDENCE_PROJECTION_STATUSES.includes('DASHBOARD_EVIDENCE_PROJECTION_FAIL'));
    console.log('  PASS: has FAIL');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_DASHBOARD_EVIDENCE_PROJECTION_STATUSES.includes('DASHBOARD_EVIDENCE_PROJECTION_READY'));
    console.log('  PASS: has READY');
  },
  () => {
    assert.equal(typeof build, 'function');
    console.log('  PASS: build is function');
  },
  () => {
    assert.equal(typeof validate, 'function');
    console.log('  PASS: validate is function');
  },
  () => {
    assert.equal(typeof render, 'function');
    console.log('  PASS: render is function');
  },

  // --- blocked input ---
  () => {
    const r = build(null);
    assert.equal(r.dashboard_evidence_projection_ready, false);
    assert.ok(r.errors[0].startsWith('DASHBOARD_EVIDENCE_PROJECTION_BLOCKED_INPUT'));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build({});
    assert.ok(r.errors[0].includes('evidence_projection_id'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },

  // --- blocked ledger ---
  () => {
    const input = validInput();
    input.product_audit_ledger_contract_ready = false;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('DASHBOARD_EVIDENCE_PROJECTION_BLOCKED_LEDGER'));
    console.log('  PASS: ledger not ready -> BLOCKED_LEDGER');
  },
  () => {
    const input = validInput();
    delete input.audit_ledger_id;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('DASHBOARD_EVIDENCE_PROJECTION_BLOCKED_LEDGER'));
    console.log('  PASS: missing audit_ledger_id -> BLOCKED_LEDGER');
  },
  () => {
    const input = validInput();
    input.projection_level = 'live';
    const r = build(input);
    assert.ok(r.errors[0].startsWith('DASHBOARD_EVIDENCE_PROJECTION_BLOCKED_LEDGER'));
    console.log('  PASS: invalid projection_level -> BLOCKED_LEDGER');
  },
  () => {
    const input = validInput();
    input.projected_evidence = [];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('DASHBOARD_EVIDENCE_PROJECTION_BLOCKED_LEDGER'));
    console.log('  PASS: empty projected_evidence -> BLOCKED_LEDGER');
  },

  // --- fail ---
  () => {
    const input = validInput();
    input.projected_evidence = [{ evidence_type: 'runtime_gate', projection_mode: 'read-only', evidence_hash: 'a'.repeat(64) }];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('DASHBOARD_EVIDENCE_PROJECTION_FAIL'));
    assert.ok(r.errors[0].includes('evidence_id'));
    console.log('  PASS: missing evidence_id -> FAIL');
  },
  () => {
    const input = validInput();
    input.projected_evidence = [{ evidence_id: 'ev1', evidence_type: 'invalid', projection_mode: 'read-only', evidence_hash: 'a'.repeat(64) }];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('DASHBOARD_EVIDENCE_PROJECTION_FAIL'));
    assert.ok(r.errors[0].includes('evidence_type'));
    console.log('  PASS: invalid evidence_type -> FAIL');
  },
  () => {
    const input = validInput();
    input.projected_evidence = [{ evidence_id: 'ev1', evidence_type: 'runtime_gate', projection_mode: 'write', evidence_hash: 'a'.repeat(64) }];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('DASHBOARD_EVIDENCE_PROJECTION_FAIL'));
    assert.ok(r.errors[0].includes('projection_mode'));
    console.log('  PASS: invalid projection_mode -> FAIL');
  },
  () => {
    const input = validInput();
    input.projected_evidence = [{ evidence_id: 'ev1', evidence_type: 'runtime_gate', projection_mode: 'read-only', evidence_hash: 'short' }];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('DASHBOARD_EVIDENCE_PROJECTION_FAIL'));
    assert.ok(r.errors[0].includes('evidence_hash'));
    console.log('  PASS: short evidence_hash -> FAIL');
  },
  () => {
    const input = validInput();
    input.required_evidence_types = ['runtime_gate'];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('DASHBOARD_EVIDENCE_PROJECTION_FAIL'));
    assert.ok(r.errors[0].includes('missing required evidence types'));
    console.log('  PASS: missing required evidence types -> FAIL');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.dashboard_evidence_projection_ready, true);
    assert.equal(r.projected_evidence_count, 6);
    assert.equal(r.required_evidence_types_count, 6);
    assert.equal(r.errors.length, 0);
    console.log('  PASS: valid -> READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.projection_hash);
    assert.equal(r.projection_hash.length, 64);
    console.log('  PASS: ready: hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.projection_hash, r2.projection_hash);
    console.log('  PASS: ready: hash deterministic');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.projection_published, false);
    assert.equal(r.audit_ledger_written, false);
    assert.equal(r.dashboard_enabled, false);
    console.log('  PASS: ready: projection not published');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.runtime_execution_allowed, false);
    assert.equal(r.runtime_mission_executed, false);
    console.log('  PASS: ready: runtime execution still blocked');
  },

  // --- validate ---
  () => {
    const r = build(validInput());
    const v = validate(r);
    assert.equal(v.valid, true);
    console.log('  PASS: validate ready: valid=true');
  },
  () => {
    const r = build(null);
    const v = validate(r);
    assert.equal(v.valid, false);
    console.log('  PASS: validate blocked: valid=false');
  },

  // --- render ---
  () => {
    const r = render(build(validInput()));
    assert.equal(typeof r, 'string');
    assert.ok(r.includes('DASHBOARD_EVIDENCE_PROJECTION_READY'));
    console.log('  PASS: render: is string');
  },
  () => {
    const r = render(build(validInput()));
    assert.ok(r.includes('REGRA ABSOLUTA'));
    console.log('  PASS: render: contains REGRA ABSOLUTA');
  },
  () => {
    const r = render(null);
    assert.equal(typeof r, 'string');
    console.log('  PASS: render null: returns string');
  },
  () => {
    const r = render(build(validInput()));
    assert.ok(r.includes('projection_hash'));
    console.log('  PASS: render: contains projection_hash');
  },

  // --- invariants false ---
  () => {
    const r = build(validInput());
    assert.equal(r.dashboard_enabled, false);
    assert.equal(r.dashboard_deployed, false);
    assert.equal(r.multi_project_enabled, false);
    assert.equal(r.policy_enforced, false);
    assert.equal(r.audit_ledger_written, false);
    assert.equal(r.projection_published, false);
    assert.equal(r.release_allowed, false);
    assert.equal(r.deploy_allowed, false);
    assert.equal(r.stable_allowed, false);
    assert.equal(r.tag_allowed, false);
    assert.equal(r.real_execution_allowed, false);
    assert.equal(r.runtime_execution_allowed, false);
    assert.equal(r.runtime_mission_executed, false);
    assert.equal(r.real_pr_creation_allowed, false);
    assert.equal(r.real_patch_execution_allowed, false);
    assert.equal(r.real_patch_applied, false);
    assert.equal(r.production_touched, false);
    console.log('  PASS: all invariants false');
  },
  () => {
    const r = build(null);
    assert.equal(r.dashboard_enabled, false);
    assert.equal(r.dashboard_deployed, false);
    assert.equal(r.audit_ledger_written, false);
    assert.equal(r.projection_published, false);
    assert.equal(r.runtime_execution_allowed, false);
    assert.equal(r.runtime_mission_executed, false);
    assert.equal(r.production_touched, false);
    console.log('  PASS: blocked: invariants false');
  },
];

function run() {
  console.log('\n=== software-factory-dashboard-evidence-projection tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 10],
    ['--- blocked ledger ---', 10, 14],
    ['--- fail ---', 14, 19],
    ['--- ready ---', 19, 24],
    ['--- validate ---', 24, 26],
    ['--- render ---', 26, 30],
    ['--- invariants false ---', 30, 32],
  ];
  let passed = 0;
  let failed = 0;
  for (const [label, start, end] of sections) {
    console.log(label);
    for (let i = start; i < end; i++) {
      try { TESTS[i](); passed++; } catch (e) { console.error(`  FAIL: ${e.message}`); failed++; }
    }
  }
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run();