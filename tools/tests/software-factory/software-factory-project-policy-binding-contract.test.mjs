import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_PROJECT_POLICY_BINDING_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-project-policy-binding-contract.mjs';

function validBinding(projectId, policyId, mode, hashChar) {
  return { project_id: projectId, policy_id: policyId, binding_mode: mode, binding_hash: hashChar.repeat(64) };
}

function validInput() {
  return {
    policy_binding_id: 'pb-v291',
    dashboard_view_contract_id: 'dvc-v290',
    dashboard_view_contract_ready: true,
    bindings: [
      validBinding('p1', 'pol-1', 'read-only', 'a'),
      validBinding('p2', 'pol-2', 'metadata-only', 'b'),
    ],
    required_binding_controls: ['pass-gold-required', 'human-approval-required', 'no-deploy', 'no-release', 'no-stable-promotion', 'no-production-touch', 'no-real-execution', 'no-cross-project-write'],
    binding_level: 'contract-only',
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_PROJECT_POLICY_BINDING_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PROJECT_POLICY_BINDING_STATUSES.includes('PROJECT_POLICY_BINDING_BLOCKED_INPUT'));
    console.log('  PASS: has BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PROJECT_POLICY_BINDING_STATUSES.includes('PROJECT_POLICY_BINDING_BLOCKED_VIEW'));
    console.log('  PASS: has BLOCKED_VIEW');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PROJECT_POLICY_BINDING_STATUSES.includes('PROJECT_POLICY_BINDING_FAIL'));
    console.log('  PASS: has FAIL');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_PROJECT_POLICY_BINDING_STATUSES.includes('PROJECT_POLICY_BINDING_READY'));
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
    assert.equal(r.project_policy_binding_contract_ready, false);
    assert.ok(r.errors[0].startsWith('PROJECT_POLICY_BINDING_BLOCKED_INPUT'));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build({});
    assert.ok(r.errors[0].includes('policy_binding_id'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },

  // --- blocked view ---
  () => {
    const input = validInput();
    input.dashboard_view_contract_ready = false;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PROJECT_POLICY_BINDING_BLOCKED_VIEW'));
    console.log('  PASS: view not ready -> BLOCKED_VIEW');
  },
  () => {
    const input = validInput();
    delete input.dashboard_view_contract_id;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PROJECT_POLICY_BINDING_BLOCKED_VIEW'));
    console.log('  PASS: missing dashboard_view_contract_id -> BLOCKED_VIEW');
  },
  () => {
    const input = validInput();
    input.binding_level = 'live';
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PROJECT_POLICY_BINDING_BLOCKED_VIEW'));
    console.log('  PASS: invalid binding_level -> BLOCKED_VIEW');
  },
  () => {
    const input = validInput();
    input.bindings = [];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PROJECT_POLICY_BINDING_BLOCKED_VIEW'));
    console.log('  PASS: empty bindings -> BLOCKED_VIEW');
  },

  // --- fail ---
  () => {
    const input = validInput();
    input.bindings = [{ policy_id: 'pol-1', binding_mode: 'read-only', binding_hash: 'a'.repeat(64) }];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PROJECT_POLICY_BINDING_FAIL'));
    assert.ok(r.errors[0].includes('project_id'));
    console.log('  PASS: missing project_id -> FAIL');
  },
  () => {
    const input = validInput();
    input.bindings = [{ project_id: 'p1', binding_mode: 'read-only', binding_hash: 'a'.repeat(64) }];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PROJECT_POLICY_BINDING_FAIL'));
    assert.ok(r.errors[0].includes('policy_id'));
    console.log('  PASS: missing policy_id -> FAIL');
  },
  () => {
    const input = validInput();
    input.bindings = [{ project_id: 'p1', policy_id: 'pol-1', binding_mode: 'write', binding_hash: 'a'.repeat(64) }];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PROJECT_POLICY_BINDING_FAIL'));
    assert.ok(r.errors[0].includes('binding_mode'));
    console.log('  PASS: invalid binding_mode -> FAIL');
  },
  () => {
    const input = validInput();
    input.bindings = [{ project_id: 'p1', policy_id: 'pol-1', binding_mode: 'read-only', binding_hash: 'short' }];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PROJECT_POLICY_BINDING_FAIL'));
    assert.ok(r.errors[0].includes('binding_hash'));
    console.log('  PASS: short binding_hash -> FAIL');
  },
  () => {
    const input = validInput();
    input.required_binding_controls = ['pass-gold-required'];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('PROJECT_POLICY_BINDING_FAIL'));
    assert.ok(r.errors[0].includes('missing required binding controls'));
    console.log('  PASS: missing required controls -> FAIL');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.project_policy_binding_contract_ready, true);
    assert.equal(r.bindings_count, 2);
    assert.equal(r.required_binding_controls_count, 8);
    assert.equal(r.errors.length, 0);
    console.log('  PASS: valid -> READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.policy_binding_hash);
    assert.equal(r.policy_binding_hash.length, 64);
    console.log('  PASS: ready: hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.policy_binding_hash, r2.policy_binding_hash);
    console.log('  PASS: ready: hash deterministic');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.policy_enforced, false);
    assert.equal(r.multi_project_enabled, false);
    console.log('  PASS: ready: policy not enforced');
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
    assert.ok(r.includes('PROJECT_POLICY_BINDING_READY'));
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
    assert.ok(r.includes('policy_binding_hash'));
    console.log('  PASS: render: contains policy_binding_hash');
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
  console.log('\n=== software-factory-project-policy-binding-contract tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 10],
    ['--- blocked view ---', 10, 14],
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