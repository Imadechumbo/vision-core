import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_ENTERPRISE_SECURITY_CONTRACT_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-enterprise-security-contract.mjs';

function validInput() {
  return {
    enterprise_security_contract_id: 'esc-v295',
    product_dashboard_policy_phase_gate_ready: true,
    phase_gate_id: 'pg-v294',
    explicit_v295_command: true,
    requested_by: 'enterprise-admin',
    security_scope: 'enterprise-security-baseline',
    security_mode: 'contract-only',
    security_domains: ['secrets', 'dependencies', 'runtime', 'permissions', 'audit', 'compliance', 'policy'],
  };
}

const TESTS = [
  // --- exports ---
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_ENTERPRISE_SECURITY_CONTRACT_STATUSES)); console.log('  PASS: STATUSES is array'); },
  () => { assert.ok(SOFTWARE_FACTORY_ENTERPRISE_SECURITY_CONTRACT_STATUSES.includes('ENTERPRISE_SECURITY_CONTRACT_BLOCKED_INPUT')); console.log('  PASS: has BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_ENTERPRISE_SECURITY_CONTRACT_STATUSES.includes('ENTERPRISE_SECURITY_CONTRACT_BLOCKED_PHASE_GATE')); console.log('  PASS: has BLOCKED_PHASE_GATE'); },
  () => { assert.ok(SOFTWARE_FACTORY_ENTERPRISE_SECURITY_CONTRACT_STATUSES.includes('ENTERPRISE_SECURITY_CONTRACT_DENIED')); console.log('  PASS: has DENIED'); },
  () => { assert.ok(SOFTWARE_FACTORY_ENTERPRISE_SECURITY_CONTRACT_STATUSES.includes('ENTERPRISE_SECURITY_CONTRACT_READY')); console.log('  PASS: has READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build is function'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate is function'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render is function'); },

  // --- blocked input ---
  () => { const r = build(null); assert.equal(r.enterprise_security_contract_ready, false); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_CONTRACT_BLOCKED_INPUT')); console.log('  PASS: null -> BLOCKED_INPUT'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('enterprise_security_contract_id')); console.log('  PASS: {} -> BLOCKED_INPUT'); },

  // --- blocked phase gate ---
  () => { const input = validInput(); input.product_dashboard_policy_phase_gate_ready = false; const r = build(input); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_CONTRACT_BLOCKED_PHASE_GATE')); console.log('  PASS: phase gate not ready -> BLOCKED_PHASE_GATE'); },
  () => { const input = validInput(); delete input.phase_gate_id; const r = build(input); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_CONTRACT_BLOCKED_PHASE_GATE')); console.log('  PASS: missing phase_gate_id -> BLOCKED_PHASE_GATE'); },

  // --- denied ---
  () => { const input = validInput(); input.explicit_v295_command = false; const r = build(input); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_CONTRACT_DENIED')); console.log('  PASS: explicit command false -> DENIED'); },
  () => { const input = validInput(); delete input.requested_by; const r = build(input); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_CONTRACT_DENIED')); console.log('  PASS: missing requested_by -> DENIED'); },
  () => { const input = validInput(); delete input.security_scope; const r = build(input); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_CONTRACT_DENIED')); console.log('  PASS: missing security_scope -> DENIED'); },
  () => { const input = validInput(); input.security_mode = 'live'; const r = build(input); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_CONTRACT_DENIED')); console.log('  PASS: invalid security_mode -> DENIED'); },
  () => { const input = validInput(); input.security_domains = []; const r = build(input); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_CONTRACT_DENIED')); console.log('  PASS: empty security_domains -> DENIED'); },
  () => { const input = validInput(); input.security_domains = ['secrets']; const r = build(input); assert.ok(r.errors[0].startsWith('ENTERPRISE_SECURITY_CONTRACT_DENIED')); assert.ok(r.errors[0].includes('missing required security domains')); console.log('  PASS: missing required domains -> DENIED'); },

  // --- ready ---
  () => { const r = build(validInput()); assert.equal(r.enterprise_security_contract_ready, true); assert.equal(r.explicit_command_received, true); assert.equal(r.security_domains_count, 7); assert.equal(r.errors.length, 0); console.log('  PASS: valid -> READY'); },
  () => { const r = build(validInput()); assert.ok(r.security_contract_hash); assert.equal(r.security_contract_hash.length, 64); console.log('  PASS: ready: hash 64 chars'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.security_contract_hash, r2.security_contract_hash); console.log('  PASS: ready: hash deterministic'); },
  () => { const r = build(validInput()); assert.equal(r.enterprise_security_enabled, false); assert.equal(r.compliance_enforced, false); console.log('  PASS: ready: enterprise security not enabled'); },
  () => { const r = build(validInput()); assert.equal(r.security_scan_executed, false); assert.equal(r.secrets_accessed, false); console.log('  PASS: ready: no scan or secret access'); },

  // --- validate ---
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate ready: valid=true'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: validate blocked: valid=false'); },

  // --- render ---
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('ENTERPRISE_SECURITY_CONTRACT_READY')); console.log('  PASS: render: is string'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: render: contains REGRA ABSOLUTA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: render null: returns string'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('security_contract_hash')); console.log('  PASS: render: contains security_contract_hash'); },

  // --- invariants false ---
  () => {
    const r = build(validInput());
    assert.equal(r.enterprise_security_enabled, false); assert.equal(r.compliance_enforced, false);
    assert.equal(r.security_scan_executed, false); assert.equal(r.secrets_accessed, false);
    assert.equal(r.security_policy_enforced, false); assert.equal(r.dashboard_enabled, false);
    assert.equal(r.dashboard_deployed, false); assert.equal(r.multi_project_enabled, false);
    assert.equal(r.policy_enforced, false); assert.equal(r.audit_ledger_written, false);
    assert.equal(r.projection_published, false); assert.equal(r.release_allowed, false);
    assert.equal(r.deploy_allowed, false); assert.equal(r.stable_allowed, false);
    assert.equal(r.tag_allowed, false); assert.equal(r.real_execution_allowed, false);
    assert.equal(r.runtime_execution_allowed, false); assert.equal(r.runtime_mission_executed, false);
    assert.equal(r.real_pr_creation_allowed, false); assert.equal(r.real_patch_execution_allowed, false);
    assert.equal(r.real_patch_applied, false); assert.equal(r.production_touched, false);
    console.log('  PASS: all invariants false');
  },
  () => {
    const r = build(null);
    assert.equal(r.enterprise_security_enabled, false); assert.equal(r.compliance_enforced, false);
    assert.equal(r.security_scan_executed, false); assert.equal(r.secrets_accessed, false);
    assert.equal(r.dashboard_enabled, false); assert.equal(r.runtime_execution_allowed, false);
    assert.equal(r.runtime_mission_executed, false); assert.equal(r.production_touched, false);
    console.log('  PASS: blocked: invariants false');
  },
];

function run() {
  console.log('\n=== software-factory-enterprise-security-contract tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8], ['--- blocked input ---', 8, 10],
    ['--- blocked phase gate ---', 10, 12], ['--- denied ---', 12, 18],
    ['--- ready ---', 18, 22], ['--- validate ---', 22, 24],
    ['--- render ---', 24, 28], ['--- invariants false ---', 28, 30],
  ];
  let passed = 0, failed = 0;
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