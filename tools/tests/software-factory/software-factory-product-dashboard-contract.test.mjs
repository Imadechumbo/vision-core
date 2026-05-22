import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_PRODUCT_DASHBOARD_CONTRACT_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-product-dashboard-contract.mjs';

function validInput() {
  return {
    dashboard_contract_id: 'dc-v285',
    runtime_mission_execution_phase_gate_ready: true,
    phase_gate_id: 'pg-v284',
    explicit_v285_command: true,
    requested_by: 'vision-core-admin',
    dashboard_goal: 'Prepare product dashboard for mission oversight',
    dashboard_scope: 'mission_status, project_registry, policy_status',
    dashboard_mode: 'contract-only',
    dashboard_surfaces: ['mission_status', 'project_registry', 'policy_status', 'evidence_summary', 'audit_ledger'],
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_PRODUCT_DASHBOARD_CONTRACT_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PRODUCT_DASHBOARD_CONTRACT_STATUSES.includes('PRODUCT_DASHBOARD_CONTRACT_BLOCKED_INPUT'));
    console.log('  PASS: has BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PRODUCT_DASHBOARD_CONTRACT_STATUSES.includes('PRODUCT_DASHBOARD_CONTRACT_BLOCKED_PHASE_GATE'));
    console.log('  PASS: has BLOCKED_PHASE_GATE');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PRODUCT_DASHBOARD_CONTRACT_STATUSES.includes('PRODUCT_DASHBOARD_CONTRACT_DENIED'));
    console.log('  PASS: has DENIED');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PRODUCT_DASHBOARD_CONTRACT_STATUSES.includes('PRODUCT_DASHBOARD_CONTRACT_READY'));
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
    assert.equal(r.product_dashboard_contract_ready, false);
    assert.ok(r.errors[0].startsWith('PRODUCT_DASHBOARD_CONTRACT_BLOCKED_INPUT'));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build({});
    assert.ok(r.errors[0].includes('dashboard_contract_id'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },

  // --- blocked phase gate ---
  () => {
    const input = validInput();
    input.runtime_mission_execution_phase_gate_ready = false;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PRODUCT_DASHBOARD_CONTRACT_BLOCKED_PHASE_GATE'));
    console.log('  PASS: phase gate not ready -> BLOCKED_PHASE_GATE');
  },
  () => {
    const input = validInput();
    delete input.phase_gate_id;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PRODUCT_DASHBOARD_CONTRACT_BLOCKED_PHASE_GATE'));
    console.log('  PASS: missing phase_gate_id -> BLOCKED_PHASE_GATE');
  },

  // --- denied ---
  () => {
    const input = validInput();
    input.explicit_v285_command = false;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PRODUCT_DASHBOARD_CONTRACT_DENIED'));
    console.log('  PASS: explicit_v285_command=false -> DENIED');
  },
  () => {
    const input = validInput();
    delete input.requested_by;
    const r = build(input);
    assert.ok(r.errors[0].includes('requested_by'));
    console.log('  PASS: missing requested_by -> DENIED');
  },
  () => {
    const input = validInput();
    delete input.dashboard_goal;
    const r = build(input);
    assert.ok(r.errors[0].includes('dashboard_goal'));
    console.log('  PASS: missing dashboard_goal -> DENIED');
  },
  () => {
    const input = validInput();
    delete input.dashboard_scope;
    const r = build(input);
    assert.ok(r.errors[0].includes('dashboard_scope'));
    console.log('  PASS: missing dashboard_scope -> DENIED');
  },
  () => {
    const input = validInput();
    input.dashboard_mode = 'production';
    const r = build(input);
    assert.ok(r.errors[0].includes('dashboard_mode'));
    console.log('  PASS: invalid dashboard_mode -> DENIED');
  },
  () => {
    const input = validInput();
    input.dashboard_surfaces = [];
    const r = build(input);
    assert.ok(r.errors[0].includes('dashboard_surfaces'));
    console.log('  PASS: empty dashboard_surfaces -> DENIED');
  },
  () => {
    const input = validInput();
    input.dashboard_surfaces = ['invalid_surface'];
    const r = build(input);
    assert.ok(r.errors[0].includes('invalid surfaces'));
    console.log('  PASS: invalid dashboard_surface -> DENIED');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.product_dashboard_contract_ready, true);
    assert.equal(r.explicit_command_received, true);
    assert.equal(r.dashboard_surfaces_count, 5);
    assert.equal(r.errors.length, 0);
    console.log('  PASS: valid -> READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.contract_hash);
    assert.equal(r.contract_hash.length, 64);
    console.log('  PASS: ready: hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.contract_hash, r2.contract_hash);
    console.log('  PASS: ready: hash deterministic');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.dashboard_enabled, false);
    assert.equal(r.dashboard_deployed, false);
    assert.equal(r.multi_project_enabled, false);
    assert.equal(r.policy_enforced, false);
    console.log('  PASS: ready: dashboard not enabled/deployed');
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
    assert.ok(r.includes('PRODUCT_DASHBOARD_CONTRACT_READY'));
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
    assert.ok(r.includes('contract_hash'));
    console.log('  PASS: render: contains contract_hash');
  },

  // --- invariants false ---
  () => {
    const r = build(validInput());
    assert.equal(r.dashboard_enabled, false);
    assert.equal(r.dashboard_deployed, false);
    assert.equal(r.multi_project_enabled, false);
    assert.equal(r.policy_enforced, false);
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
    assert.equal(r.multi_project_enabled, false);
    assert.equal(r.policy_enforced, false);
    assert.equal(r.runtime_execution_allowed, false);
    assert.equal(r.runtime_mission_executed, false);
    assert.equal(r.production_touched, false);
    console.log('  PASS: blocked: invariants false');
  },
];

function run() {
  console.log('\n=== software-factory-product-dashboard-contract tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 10],
    ['--- blocked phase gate ---', 10, 12],
    ['--- denied ---', 12, 19],
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
