import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_POLICY_VAULT_CONTRACT_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-policy-vault-contract.mjs';

function validPolicy(id, type, severity, hashChar) {
  return { policy_id: id, policy_type: type, severity: severity, policy_hash: hashChar.repeat(64) };
}

function validInput() {
  return {
    policy_vault_id: 'pv-v289',
    isolation_gate_id: 'ig-v288',
    project_context_isolation_gate_ready: true,
    policies: [
      validPolicy('pol-1', 'pass_gold', 'blocking', 'a'),
      validPolicy('pol-2', 'no_deploy', 'critical', 'b'),
      validPolicy('pol-3', 'no_release', 'critical', 'c'),
      validPolicy('pol-4', 'no_stable', 'critical', 'd'),
      validPolicy('pol-5', 'no_real_execution', 'blocking', 'e'),
      validPolicy('pol-6', 'no_production_touch', 'critical', 'f'),
      validPolicy('pol-7', 'human_approval_required', 'critical', '7'),
    ],
    required_policy_types: ['pass_gold', 'no_deploy', 'no_release', 'no_stable', 'no_real_execution', 'no_production_touch', 'human_approval_required'],
    enforcement_mode: 'contract-only',
  };
}

const TESTS = [
  // --- exports ---
  () => {
    assert.ok(Array.isArray(SOFTWARE_FACTORY_POLICY_VAULT_CONTRACT_STATUSES));
    console.log('  PASS: STATUSES is array');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_POLICY_VAULT_CONTRACT_STATUSES.includes('POLICY_VAULT_CONTRACT_BLOCKED_INPUT'));
    console.log('  PASS: has BLOCKED_INPUT');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_POLICY_VAULT_CONTRACT_STATUSES.includes('POLICY_VAULT_CONTRACT_BLOCKED_ISOLATION'));
    console.log('  PASS: has BLOCKED_ISOLATION');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_POLICY_VAULT_CONTRACT_STATUSES.includes('POLICY_VAULT_CONTRACT_FAIL'));
    console.log('  PASS: has FAIL');
  },
  () => {
    assert.ok(SOFTWARE_FACTORY_POLICY_VAULT_CONTRACT_STATUSES.includes('POLICY_VAULT_CONTRACT_READY'));
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
    assert.equal(r.policy_vault_contract_ready, false);
    assert.ok(r.errors[0].startsWith('POLICY_VAULT_CONTRACT_BLOCKED_INPUT'));
    console.log('  PASS: null -> BLOCKED_INPUT');
  },
  () => {
    const r = build({});
    assert.ok(r.errors[0].includes('policy_vault_id'));
    console.log('  PASS: {} -> BLOCKED_INPUT');
  },

  // --- blocked isolation ---
  () => {
    const input = validInput();
    input.project_context_isolation_gate_ready = false;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('POLICY_VAULT_CONTRACT_BLOCKED_ISOLATION'));
    console.log('  PASS: isolation not ready -> BLOCKED_ISOLATION');
  },
  () => {
    const input = validInput();
    delete input.isolation_gate_id;
    const r = build(input);
    assert.ok(r.errors[0].startsWith('POLICY_VAULT_CONTRACT_BLOCKED_ISOLATION'));
    console.log('  PASS: missing isolation_gate_id -> BLOCKED_ISOLATION');
  },
  () => {
    const input = validInput();
    input.enforcement_mode = 'live';
    const r = build(input);
    assert.ok(r.errors[0].startsWith('POLICY_VAULT_CONTRACT_BLOCKED_ISOLATION'));
    console.log('  PASS: invalid enforcement_mode -> BLOCKED_ISOLATION');
  },
  () => {
    const input = validInput();
    input.policies = [];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('POLICY_VAULT_CONTRACT_BLOCKED_ISOLATION'));
    console.log('  PASS: empty policies -> BLOCKED_ISOLATION');
  },

  // --- fail ---
  () => {
    const input = validInput();
    input.policies = [{ policy_type: 'pass_gold', severity: 'blocking', policy_hash: 'a'.repeat(64) }];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('POLICY_VAULT_CONTRACT_FAIL'));
    assert.ok(r.errors[0].includes('policy_id'));
    console.log('  PASS: missing policy_id -> FAIL');
  },
  () => {
    const input = validInput();
    input.policies = [{ policy_id: 'p1', policy_type: 'invalid', severity: 'blocking', policy_hash: 'a'.repeat(64) }];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('POLICY_VAULT_CONTRACT_FAIL'));
    assert.ok(r.errors[0].includes('policy_type'));
    console.log('  PASS: invalid policy_type -> FAIL');
  },
  () => {
    const input = validInput();
    input.policies = [{ policy_id: 'p1', policy_type: 'pass_gold', severity: 'unknown', policy_hash: 'a'.repeat(64) }];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('POLICY_VAULT_CONTRACT_FAIL'));
    assert.ok(r.errors[0].includes('severity'));
    console.log('  PASS: invalid severity -> FAIL');
  },
  () => {
    const input = validInput();
    input.policies = [{ policy_id: 'p1', policy_type: 'pass_gold', severity: 'blocking', policy_hash: 'short' }];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('POLICY_VAULT_CONTRACT_FAIL'));
    assert.ok(r.errors[0].includes('policy_hash'));
    console.log('  PASS: short policy_hash -> FAIL');
  },
  () => {
    const input = validInput();
    input.required_policy_types = ['pass_gold'];
    const r = build(input);
    assert.ok(r.errors[0].startsWith('POLICY_VAULT_CONTRACT_FAIL'));
    assert.ok(r.errors[0].includes('missing required policy types'));
    console.log('  PASS: missing required policy types -> FAIL');
  },

  // --- ready ---
  () => {
    const r = build(validInput());
    assert.equal(r.policy_vault_contract_ready, true);
    assert.equal(r.policies_count, 7);
    assert.equal(r.required_policy_types_count, 7);
    assert.equal(r.errors.length, 0);
    console.log('  PASS: valid -> READY');
  },
  () => {
    const r = build(validInput());
    assert.ok(r.policy_vault_hash);
    assert.equal(r.policy_vault_hash.length, 64);
    console.log('  PASS: ready: hash 64 chars');
  },
  () => {
    const r1 = build(validInput());
    const r2 = build(validInput());
    assert.equal(r1.policy_vault_hash, r2.policy_vault_hash);
    console.log('  PASS: ready: hash deterministic');
  },
  () => {
    const r = build(validInput());
    assert.equal(r.policy_enforced, false);
    assert.equal(r.multi_project_enabled, false);
    assert.equal(r.dashboard_enabled, false);
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
    assert.ok(r.includes('POLICY_VAULT_CONTRACT_READY'));
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
    assert.ok(r.includes('policy_vault_hash'));
    console.log('  PASS: render: contains policy_vault_hash');
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
  console.log('\n=== software-factory-policy-vault-contract tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8],
    ['--- blocked input ---', 8, 10],
    ['--- blocked isolation ---', 10, 14],
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