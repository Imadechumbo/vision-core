import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_PRODUCT_AUDIT_LEDGER_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-product-audit-ledger-contract.mjs';

function validEntry(id, type, severity, hashChar) {
  return { entry_id: id, entry_type: type, severity: severity, entry_hash: hashChar.repeat(64) };
}

function validInput() {
  return {
    audit_ledger_id: 'al-v292',
    policy_binding_id: 'pb-v291',
    project_policy_binding_contract_ready: true,
    ledger_entries: [
      validEntry('e1', 'dashboard_contract', 'info', 'a'),
      validEntry('e2', 'data_model', 'info', 'b'),
      validEntry('e3', 'project_registry', 'info', 'c'),
      validEntry('e4', 'policy_vault', 'info', 'd'),
      validEntry('e5', 'dashboard_view', 'info', 'e'),
      validEntry('e6', 'policy_binding', 'info', 'f'),
      validEntry('e7', 'runtime_gate', 'warning', '0'),
      validEntry('e8', 'evidence', 'info', '1'),
    ],
    required_entry_types: ['dashboard_contract', 'data_model', 'project_registry', 'policy_vault', 'dashboard_view', 'policy_binding', 'runtime_gate', 'evidence'],
    ledger_mode: 'contract-only',
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_PRODUCT_AUDIT_LEDGER_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PRODUCT_AUDIT_LEDGER_STATUSES.includes('PRODUCT_AUDIT_LEDGER_BLOCKED_INPUT'));
    console.log('  PASS: has BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PRODUCT_AUDIT_LEDGER_STATUSES.includes('PRODUCT_AUDIT_LEDGER_BLOCKED_BINDING'));
    console.log('  PASS: has BLOCKED_BINDING');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PRODUCT_AUDIT_LEDGER_STATUSES.includes('PRODUCT_AUDIT_LEDGER_FAIL'));
    console.log('  PASS: has FAIL');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PRODUCT_AUDIT_LEDGER_STATUSES.includes('PRODUCT_AUDIT_LEDGER_READY'));
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
    assert.equal(r.product_audit_ledger_contract_ready, false);
    assert.ok(r.errors[0].startsWith('PRODUCT_AUDIT_LEDGER_BLOCKED_INPUT'));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build({});
    assert.ok(r.errors[0].includes('audit_ledger_id'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },

  // --- blocked binding ---
  () => {
    const input = validInput();
    input.project_policy_binding_contract_ready = false;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PRODUCT_AUDIT_LEDGER_BLOCKED_BINDING'));
    console.log('  PASS: binding not ready -> BLOCKED_BINDING');
  },
  () => {
    const input = validInput();
    delete input.policy_binding_id;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PRODUCT_AUDIT_LEDGER_BLOCKED_BINDING'));
    console.log('  PASS: missing policy_binding_id -> BLOCKED_BINDING');
  },
  () => {
    const input = validInput();
    input.ledger_mode = 'live';
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PRODUCT_AUDIT_LEDGER_BLOCKED_BINDING'));
    console.log('  PASS: invalid ledger_mode -> BLOCKED_BINDING');
  },
  () => {
    const input = validInput();
    input.ledger_entries = [];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PRODUCT_AUDIT_LEDGER_BLOCKED_BINDING'));
    console.log('  PASS: empty ledger_entries -> BLOCKED_BINDING');
  },

  // --- fail ---
  () => {
    const input = validInput();
    input.ledger_entries = [{ entry_type: 'data_model', severity: 'info', entry_hash: 'a'.repeat(64) }];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PRODUCT_AUDIT_LEDGER_FAIL'));
    assert.ok(r.errors[0].includes('entry_id'));
    console.log('  PASS: missing entry_id -> FAIL');
  },
  () => {
    const input = validInput();
    input.ledger_entries = [{ entry_id: 'e1', entry_type: 'invalid', severity: 'info', entry_hash: 'a'.repeat(64) }];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PRODUCT_AUDIT_LEDGER_FAIL'));
    assert.ok(r.errors[0].includes('entry_type'));
    console.log('  PASS: invalid entry_type -> FAIL');
  },
  () => {
    const input = validInput();
    input.ledger_entries = [{ entry_id: 'e1', entry_type: 'data_model', severity: 'unknown', entry_hash: 'a'.repeat(64) }];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PRODUCT_AUDIT_LEDGER_FAIL'));
    assert.ok(r.errors[0].includes('severity'));
    console.log('  PASS: invalid severity -> FAIL');
  },
  () => {
    const input = validInput();
    input.ledger_entries = [{ entry_id: 'e1', entry_type: 'data_model', severity: 'info', entry_hash: 'short' }];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PRODUCT_AUDIT_LEDGER_FAIL'));
    assert.ok(r.errors[0].includes('entry_hash'));
    console.log('  PASS: short entry_hash -> FAIL');
  },
  () => {
    const input = validInput();
    input.required_entry_types = ['dashboard_contract'];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PRODUCT_AUDIT_LEDGER_FAIL'));
    assert.ok(r.errors[0].includes('missing required entry types'));
    console.log('  PASS: missing required entry types -> FAIL');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.product_audit_ledger_contract_ready, true);
    assert.equal(r.ledger_entries_count, 8);
    assert.equal(r.required_entry_types_count, 8);
    assert.equal(r.errors.length, 0);
    console.log('  PASS: valid -> READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.audit_ledger_hash);
    assert.equal(r.audit_ledger_hash.length, 64);
    console.log('  PASS: ready: hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.audit_ledger_hash, r2.audit_ledger_hash);
    console.log('  PASS: ready: hash deterministic');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.audit_ledger_written, false);
    assert.equal(r.dashboard_enabled, false);
    console.log('  PASS: ready: audit ledger not written');
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
    assert.ok(r.includes('PRODUCT_AUDIT_LEDGER_READY'));
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
    assert.ok(r.includes('audit_ledger_hash'));
    console.log('  PASS: render: contains audit_ledger_hash');
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
  console.log('\n=== software-factory-product-audit-ledger-contract tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 10],
    ['--- blocked binding ---', 10, 14],
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