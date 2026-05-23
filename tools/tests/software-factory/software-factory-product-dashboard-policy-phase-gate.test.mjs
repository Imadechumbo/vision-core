import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_PRODUCT_DASHBOARD_POLICY_PHASE_GATE_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-product-dashboard-policy-phase-gate.mjs';

function validInput() {
  return {
    phase_gate_id: 'pg-v294',
    evidence_projection_id: 'ep-v293',
    dashboard_evidence_projection_ready: true,
    ids: {
      product_dashboard_contract: 'dc-v285',
      product_dashboard_data_model: 'dm-v286',
      multi_project_registry_contract: 'rc-v287',
      project_context_isolation_gate: 'ig-v288',
      policy_vault_contract: 'pv-v289',
      dashboard_view_contract: 'dvc-v290',
      project_policy_binding_contract: 'pb-v291',
      product_audit_ledger_contract: 'al-v292',
      dashboard_evidence_projection: 'ep-v293',
    },
    phase_summary: 'All V285-V294 product dashboard, multi-project, and policy modules verified.',
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_PRODUCT_DASHBOARD_POLICY_PHASE_GATE_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PRODUCT_DASHBOARD_POLICY_PHASE_GATE_STATUSES.includes('PRODUCT_DASHBOARD_POLICY_PHASE_GATE_BLOCKED_INPUT'));
    console.log('  PASS: has BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PRODUCT_DASHBOARD_POLICY_PHASE_GATE_STATUSES.includes('PRODUCT_DASHBOARD_POLICY_PHASE_GATE_BLOCKED_PROJECTION'));
    console.log('  PASS: has BLOCKED_PROJECTION');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PRODUCT_DASHBOARD_POLICY_PHASE_GATE_STATUSES.includes('PRODUCT_DASHBOARD_POLICY_PHASE_GATE_INCOMPLETE'));
    console.log('  PASS: has INCOMPLETE');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PRODUCT_DASHBOARD_POLICY_PHASE_GATE_STATUSES.includes('PRODUCT_DASHBOARD_POLICY_PHASE_GATE_READY'));
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
    assert.equal(r.product_dashboard_policy_phase_gate_ready, false);
    assert.ok(r.errors[0].startsWith('PRODUCT_DASHBOARD_POLICY_PHASE_GATE_BLOCKED_INPUT'));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build({});
    assert.ok(r.errors[0].includes('phase_gate_id'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },

  // --- blocked projection ---
  () => {
    const input = validInput();
    input.dashboard_evidence_projection_ready = false;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PRODUCT_DASHBOARD_POLICY_PHASE_GATE_BLOCKED_PROJECTION'));
    console.log('  PASS: projection not ready -> BLOCKED_PROJECTION');
  },
  () => {
    const input = validInput();
    delete input.evidence_projection_id;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PRODUCT_DASHBOARD_POLICY_PHASE_GATE_BLOCKED_PROJECTION'));
    console.log('  PASS: missing evidence_projection_id -> BLOCKED_PROJECTION');
  },
  () => {
    const input = validInput();
    delete input.phase_summary;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PRODUCT_DASHBOARD_POLICY_PHASE_GATE_BLOCKED_PROJECTION'));
    console.log('  PASS: missing phase_summary -> BLOCKED_PROJECTION');
  },

  // --- incomplete ---
  () => {
    const input = validInput();
    input.ids = { product_dashboard_contract: 'dc-v285' };
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PRODUCT_DASHBOARD_POLICY_PHASE_GATE_INCOMPLETE'));
    assert.ok(r.errors[0].includes('missing modules'));
    assert.ok(Array.isArray(r.modules_verified));
    assert.equal(r.all_modules_present, false);
    console.log('  PASS: missing modules -> INCOMPLETE');
  },
  () => {
    const input = validInput();
    input.ids = {};
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PRODUCT_DASHBOARD_POLICY_PHASE_GATE_INCOMPLETE'));
    console.log('  PASS: empty ids -> INCOMPLETE');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.product_dashboard_policy_phase_gate_ready, true);
    assert.equal(r.all_modules_present, true);
    assert.equal(r.modules_verified.length, 9);
    assert.equal(r.phase_passed, false);
    assert.equal(r.errors.length, 0);
    console.log('  PASS: valid -> READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.phase_gate_hash);
    assert.equal(r.phase_gate_hash.length, 64);
    console.log('  PASS: ready: hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.phase_gate_hash, r2.phase_gate_hash);
    console.log('  PASS: ready: hash deterministic');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.dashboard_enabled, false);
    assert.equal(r.dashboard_deployed, false);
    assert.equal(r.multi_project_enabled, false);
    assert.equal(r.policy_enforced, false);
    console.log('  PASS: ready: dashboard/policy blocked');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.audit_ledger_written, false);
    assert.equal(r.projection_published, false);
    assert.equal(r.phase_passed, false);
    console.log('  PASS: ready: phase_passed false, no writes');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.runtime_execution_allowed, false);
    assert.equal(r.runtime_mission_executed, false);
    assert.equal(r.production_touched, false);
    console.log('  PASS: ready: runtime/production blocked');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.final_message.includes('V285-V294'));
    assert.ok(r.final_message.includes('blocked until explicit V295'));
    console.log('  PASS: ready: final message correct');
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
    assert.ok(r.includes('PRODUCT_DASHBOARD_POLICY_PHASE_GATE_READY'));
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
    assert.ok(r.includes('phase_gate_hash'));
    console.log('  PASS: render: contains phase_gate_hash');
  },
  () => {
    const r = render(build(validInput()));
    assert.ok(r.includes('blocked until explicit V295'));
    console.log('  PASS: render: contains V295 block message');
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
  console.log('\n=== software-factory-product-dashboard-policy-phase-gate tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 10],
    ['--- blocked projection ---', 10, 13],
    ['--- incomplete ---', 13, 15],
    ['--- ready ---', 15, 22],
    ['--- validate ---', 22, 24],
    ['--- render ---', 24, 29],
    ['--- invariants false ---', 29, 31],
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