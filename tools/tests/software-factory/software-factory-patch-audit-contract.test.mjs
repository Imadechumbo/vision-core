import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_PATCH_AUDIT_CONTRACT_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-patch-audit-contract.mjs';

function validInput() {
  return {
    audit_id: 'audit-v225',
    contract_id: 'sfc-v225',
    controller_id: 'ctrl-v213',
    software_factory_phase_gate_ready: true,
    patch_controller_ready: true,
    changes_summary: [
      { file_path: 'tools/software-factory/feature.mjs', change_type: 'create', rationale: 'Add new feature module' },
      { file_path: 'tools/tests/software-factory/feature.test.mjs', change_type: 'create', rationale: 'Add tests for feature' },
    ],
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_PATCH_AUDIT_CONTRACT_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PATCH_AUDIT_CONTRACT_STATUSES.includes('PATCH_AUDIT_BLOCKED_INPUT'));
    console.log('  PASS: has PATCH_AUDIT_BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PATCH_AUDIT_CONTRACT_STATUSES.includes('PATCH_AUDIT_BLOCKED_CONTRACT'));
    console.log('  PASS: has PATCH_AUDIT_BLOCKED_CONTRACT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PATCH_AUDIT_CONTRACT_STATUSES.includes('PATCH_AUDIT_READY'));
    console.log('  PASS: has PATCH_AUDIT_READY');
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
    assert.equal(r.patch_audit_ready, false);
    assert.ok(r.errors.includes('PATCH_AUDIT_BLOCKED_INPUT'));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build(null);
    assert.equal(r.release_allowed, false);
    assert.equal(r.real_patch_execution_allowed, false);
    assert.equal(r.production_touched, false);
    console.log('  PASS: null: all forbidden flags false');
  },
  () => {
    const r = build({});
    assert.equal(r.patch_audit_ready, false);
    assert.ok(r.errors[0].startsWith('PATCH_AUDIT_BLOCKED_INPUT'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },
  () => {
    const r = build({ audit_id: 'a', contract_id: 'b' });
    assert.equal(r.patch_audit_ready, false);
    assert.ok(r.errors[0].includes('controller_id'));
    console.log('  PASS: missing controller_id -> BLOCKED_INPUT');
  },

  // --- blocked contract ---
  () => {
    const input = validInput();
    input.software_factory_phase_gate_ready = false;
    const r = build(input);
    assert.equal(r.patch_audit_ready, false);
    assert.ok(r.errors[0].startsWith('PATCH_AUDIT_BLOCKED_CONTRACT'));
    console.log('  PASS: phase_gate not ready -> BLOCKED_CONTRACT');
  },
  () => {
    const input = validInput();
    input.patch_controller_ready = false;
    const r = build(input);
    assert.equal(r.patch_audit_ready, false);
    assert.ok(r.errors[0].startsWith('PATCH_AUDIT_BLOCKED_CONTRACT'));
    console.log('  PASS: controller not ready -> BLOCKED_CONTRACT');
  },

  // --- forbidden file path ---
  () => {
    const input = validInput();
    input.changes_summary.push({ file_path: '.env', change_type: 'modify', rationale: 'test' });
    const r = build(input);
    assert.equal(r.patch_audit_ready, false);
    assert.ok(r.errors.some(e => e.includes('forbidden')));
    console.log('  PASS: .env path blocked');
  },
  () => {
    const input = validInput();
    input.changes_summary.push({ file_path: 'secrets/prod.env', change_type: 'modify', rationale: 'test' });
    const r = build(input);
    assert.equal(r.patch_audit_ready, false);
    assert.ok(r.errors.some(e => e.includes('forbidden')));
    console.log('  PASS: secrets path blocked');
  },

  // --- missing rationale ---
  () => {
    const input = validInput();
    input.changes_summary.push({ file_path: 'tools/x.mjs', change_type: 'modify' });
    const r = build(input);
    assert.equal(r.patch_audit_ready, false);
    assert.ok(r.errors.some(e => e.includes('rationale')));
    console.log('  PASS: missing rationale -> blocked');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.patch_audit_ready, true);
    assert.equal(r.errors.length, 0);
    assert.equal(r.schema_version, 'v225.0');
    console.log('  PASS: valid -> PATCH_AUDIT_READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.audit_id);
    assert.ok(r.contract_id);
    assert.ok(r.controller_id);
    console.log('  PASS: ready: ids set');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.changes_count, 2);
    assert.equal(r.all_rationales_provided, true);
    console.log('  PASS: ready: changes_count and rationales');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.audit_hash);
    assert.equal(r.audit_hash.length, 64);
    console.log('  PASS: ready: audit_hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.audit_hash, r2.audit_hash);
    console.log('  PASS: ready: hash deterministic');
  },

  // --- validate ---
  () => {
    const r = build(validInput());
    const v = validate(r);
    assert.equal(v.valid, true);
    assert.equal(v.errors.length, 0);
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
    assert.ok(r.includes('PATCH_AUDIT_READY'));
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

  // --- invariants false ---
  () => {
    const r = build(validInput());
    assert.equal(r.release_allowed, false);
    assert.equal(r.deploy_allowed, false);
    assert.equal(r.stable_allowed, false);
    assert.equal(r.tag_allowed, false);
    assert.equal(r.real_execution_allowed, false);
    assert.equal(r.real_patch_execution_allowed, false);
    assert.equal(r.production_touched, false);
    console.log('  PASS: all invariants false');
  },
  () => {
    const r = build(null);
    assert.equal(r.release_allowed, false);
    assert.equal(r.real_patch_execution_allowed, false);
    assert.equal(r.production_touched, false);
    console.log('  PASS: blocked: invariants false');
  },
];

function run() {
  console.log('\n=== software-factory-patch-audit-contract tests ===\n');
  const sections = [
    ['--- exports ---', 0, 7],
    ['--- blocked input ---', 7, 11],
    ['--- blocked contract ---', 11, 13],
    ['--- forbidden file path ---', 13, 15],
    ['--- missing rationale ---', 15, 16],
    ['--- ready ---', 16, 21],
    ['--- validate ---', 21, 23],
    ['--- render ---', 23, 26],
    ['--- invariants false ---', 26, 28],
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
