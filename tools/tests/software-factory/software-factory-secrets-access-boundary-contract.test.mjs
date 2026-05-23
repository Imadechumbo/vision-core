import * as assert from 'assert/strict';
import {
  SOFTWARE_FACTORY_SECRETS_ACCESS_BOUNDARY_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-secrets-access-boundary-contract.mjs';

function validBoundary(id, type, mode, hashChar) {
  return { boundary_id: id, secret_type: type, access_mode: mode, boundary_hash: hashChar.repeat(64) };
}

function validInput() {
  return {
    secrets_boundary_id: 'sb-v296',
    enterprise_security_contract_id: 'esc-v295',
    enterprise_security_contract_ready: true,
    secret_boundaries: [
      validBoundary('b1', 'api_key', 'no-access', 'a'),
      validBoundary('b2', 'token', 'metadata-only', 'b'),
      validBoundary('b3', 'env_var', 'redacted-only', 'c'),
    ],
    required_controls: ['no-secret-read','no-secret-write','no-env-read','no-credential-export','no-token-print','no-network-exfiltration','redaction-required','audit-required'],
    boundary_mode: 'contract-only',
  };
}

const TESTS = [
  () => { assert.ok(Array.isArray(SOFTWARE_FACTORY_SECRETS_ACCESS_BOUNDARY_STATUSES)); console.log('  PASS: STATUSES is array'); },
  () => { assert.ok(SOFTWARE_FACTORY_SECRETS_ACCESS_BOUNDARY_STATUSES.includes('SECRETS_ACCESS_BOUNDARY_BLOCKED_INPUT')); console.log('  PASS: has BLOCKED_INPUT'); },
  () => { assert.ok(SOFTWARE_FACTORY_SECRETS_ACCESS_BOUNDARY_STATUSES.includes('SECRETS_ACCESS_BOUNDARY_BLOCKED_SECURITY')); console.log('  PASS: has BLOCKED_SECURITY'); },
  () => { assert.ok(SOFTWARE_FACTORY_SECRETS_ACCESS_BOUNDARY_STATUSES.includes('SECRETS_ACCESS_BOUNDARY_FAIL')); console.log('  PASS: has FAIL'); },
  () => { assert.ok(SOFTWARE_FACTORY_SECRETS_ACCESS_BOUNDARY_STATUSES.includes('SECRETS_ACCESS_BOUNDARY_READY')); console.log('  PASS: has READY'); },
  () => { assert.equal(typeof build, 'function'); console.log('  PASS: build is function'); },
  () => { assert.equal(typeof validate, 'function'); console.log('  PASS: validate is function'); },
  () => { assert.equal(typeof render, 'function'); console.log('  PASS: render is function'); },
  () => { const r = build(null); assert.equal(r.secrets_access_boundary_contract_ready, false); assert.ok(r.errors[0].startsWith('SECRETS_ACCESS_BOUNDARY_BLOCKED_INPUT')); console.log('  PASS: null -> BLOCKED_INPUT'); },
  () => { const r = build({}); assert.ok(r.errors[0].includes('secrets_boundary_id')); console.log('  PASS: {} -> BLOCKED_INPUT'); },
  () => { const i = validInput(); i.enterprise_security_contract_ready = false; const r = build(i); assert.ok(r.errors[0].startsWith('SECRETS_ACCESS_BOUNDARY_BLOCKED_SECURITY')); console.log('  PASS: security not ready -> BLOCKED_SECURITY'); },
  () => { const i = validInput(); delete i.enterprise_security_contract_id; const r = build(i); assert.ok(r.errors[0].startsWith('SECRETS_ACCESS_BOUNDARY_BLOCKED_SECURITY')); console.log('  PASS: missing esc id -> BLOCKED_SECURITY'); },
  () => { const i = validInput(); i.boundary_mode = 'live'; const r = build(i); assert.ok(r.errors[0].startsWith('SECRETS_ACCESS_BOUNDARY_BLOCKED_SECURITY')); console.log('  PASS: invalid boundary_mode -> BLOCKED_SECURITY'); },
  () => { const i = validInput(); i.secret_boundaries = []; const r = build(i); assert.ok(r.errors[0].startsWith('SECRETS_ACCESS_BOUNDARY_BLOCKED_SECURITY')); console.log('  PASS: empty boundaries -> BLOCKED_SECURITY'); },
  () => { const i = validInput(); i.secret_boundaries = [{ secret_type: 'api_key', access_mode: 'no-access', boundary_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('SECRETS_ACCESS_BOUNDARY_FAIL')); assert.ok(r.errors[0].includes('boundary_id')); console.log('  PASS: missing boundary_id -> FAIL'); },
  () => { const i = validInput(); i.secret_boundaries = [{ boundary_id: 'b1', secret_type: 'invalid', access_mode: 'no-access', boundary_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('SECRETS_ACCESS_BOUNDARY_FAIL')); assert.ok(r.errors[0].includes('secret_type')); console.log('  PASS: invalid secret_type -> FAIL'); },
  () => { const i = validInput(); i.secret_boundaries = [{ boundary_id: 'b1', secret_type: 'api_key', access_mode: 'full', boundary_hash: 'a'.repeat(64) }]; const r = build(i); assert.ok(r.errors[0].startsWith('SECRETS_ACCESS_BOUNDARY_FAIL')); assert.ok(r.errors[0].includes('access_mode')); console.log('  PASS: invalid access_mode -> FAIL'); },
  () => { const i = validInput(); i.secret_boundaries = [{ boundary_id: 'b1', secret_type: 'api_key', access_mode: 'no-access', boundary_hash: 'short' }]; const r = build(i); assert.ok(r.errors[0].startsWith('SECRETS_ACCESS_BOUNDARY_FAIL')); assert.ok(r.errors[0].includes('boundary_hash')); console.log('  PASS: short hash -> FAIL'); },
  () => { const i = validInput(); i.required_controls = ['no-secret-read']; const r = build(i); assert.ok(r.errors[0].startsWith('SECRETS_ACCESS_BOUNDARY_FAIL')); assert.ok(r.errors[0].includes('missing required controls')); console.log('  PASS: missing controls -> FAIL'); },
  () => { const r = build(validInput()); assert.equal(r.secrets_access_boundary_contract_ready, true); assert.equal(r.secret_boundaries_count, 3); assert.equal(r.required_controls_count, 8); assert.equal(r.errors.length, 0); console.log('  PASS: valid -> READY'); },
  () => { const r = build(validInput()); assert.ok(r.secrets_boundary_hash); assert.equal(r.secrets_boundary_hash.length, 64); console.log('  PASS: ready: hash 64 chars'); },
  () => { const r1 = build(validInput()); const r2 = build(validInput()); assert.equal(r1.secrets_boundary_hash, r2.secrets_boundary_hash); console.log('  PASS: ready: hash deterministic'); },
  () => { const r = build(validInput()); assert.equal(r.secrets_accessed, false); assert.equal(r.enterprise_security_enabled, false); console.log('  PASS: ready: secrets not accessed'); },
  () => { const r = build(validInput()); assert.equal(r.runtime_execution_allowed, false); assert.equal(r.runtime_mission_executed, false); console.log('  PASS: ready: runtime blocked'); },
  () => { const r = build(validInput()); const v = validate(r); assert.equal(v.valid, true); console.log('  PASS: validate ready: valid=true'); },
  () => { const r = build(null); const v = validate(r); assert.equal(v.valid, false); console.log('  PASS: validate blocked: valid=false'); },
  () => { const r = render(build(validInput())); assert.equal(typeof r, 'string'); assert.ok(r.includes('SECRETS_ACCESS_BOUNDARY_READY')); console.log('  PASS: render: is string'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('REGRA ABSOLUTA')); console.log('  PASS: render: contains REGRA ABSOLUTA'); },
  () => { const r = render(null); assert.equal(typeof r, 'string'); console.log('  PASS: render null: returns string'); },
  () => { const r = render(build(validInput())); assert.ok(r.includes('secrets_boundary_hash')); console.log('  PASS: render: contains hash'); },
  () => {
    const r = build(validInput());
    ['enterprise_security_enabled','compliance_enforced','security_scan_executed','secrets_accessed','security_policy_enforced','dashboard_enabled','dashboard_deployed','multi_project_enabled','policy_enforced','audit_ledger_written','projection_published','release_allowed','deploy_allowed','stable_allowed','tag_allowed','real_execution_allowed','runtime_execution_allowed','runtime_mission_executed','real_pr_creation_allowed','real_patch_execution_allowed','real_patch_applied','production_touched'].forEach(k => assert.equal(r[k], false, `${k} must be false`));
    console.log('  PASS: all invariants false');
  },
  () => {
    const r = build(null);
    assert.equal(r.enterprise_security_enabled, false); assert.equal(r.secrets_accessed, false);
    assert.equal(r.dashboard_enabled, false); assert.equal(r.runtime_execution_allowed, false);
    assert.equal(r.runtime_mission_executed, false); assert.equal(r.production_touched, false);
    console.log('  PASS: blocked: invariants false');
  },
];

function run() {
  console.log('\n=== software-factory-secrets-access-boundary-contract tests ===\n');
  const sections = [
    ['--- exports ---', 0, 8], ['--- blocked input ---', 8, 10],
    ['--- blocked security ---', 10, 14], ['--- fail ---', 14, 19],
    ['--- ready ---', 19, 24], ['--- validate ---', 24, 26],
    ['--- render ---', 26, 30], ['--- invariants false ---', 30, 32],
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