import { createHash } from 'crypto';
import {
  SOFTWARE_FACTORY_CONTROLLED_REAL_RELEASE_EXECUTION_PREPARATION_PHASE_GATE_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-controlled-real-release-execution-preparation-phase-gate.mjs';

let passed = 0; let failed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (e) { failed++; console.error(`FAIL: ${name}\n  ${e.message}`); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function eq(a, b) { assert(a === b, `expected ${JSON.stringify(b)} got ${JSON.stringify(a)}`); }

const FULL_IDS = {
  real_release_execution_command_contract: 'cmd-001',
  production_execution_environment_verifier: 'env-001',
  real_release_execution_dry_run_verifier: 'drv-001',
  real_release_rollback_readiness_gate: 'rrg-001',
};

const BASE_INPUT = {
  phase_gate_id: 'pg-v364-001',
  real_release_rollback_readiness_gate_ready: true,
  real_release_rollback_readiness_gate_id: 'rrg-001',
  ids: FULL_IDS,
  phase_summary: 'V360-V364 preparation complete',
};

// exports
test('STATUSES exported as array', () => assert(Array.isArray(SOFTWARE_FACTORY_CONTROLLED_REAL_RELEASE_EXECUTION_PREPARATION_PHASE_GATE_STATUSES)));
test('STATUSES has 4 entries', () => eq(SOFTWARE_FACTORY_CONTROLLED_REAL_RELEASE_EXECUTION_PREPARATION_PHASE_GATE_STATUSES.length, 4));
test('STATUSES includes BLOCKED_INPUT', () => assert(SOFTWARE_FACTORY_CONTROLLED_REAL_RELEASE_EXECUTION_PREPARATION_PHASE_GATE_STATUSES.includes('CONTROLLED_REAL_RELEASE_PREPARATION_PHASE_GATE_BLOCKED_INPUT')));
test('STATUSES includes BLOCKED_ROLLBACK', () => assert(SOFTWARE_FACTORY_CONTROLLED_REAL_RELEASE_EXECUTION_PREPARATION_PHASE_GATE_STATUSES.includes('CONTROLLED_REAL_RELEASE_PREPARATION_PHASE_GATE_BLOCKED_ROLLBACK')));
test('STATUSES includes INCOMPLETE', () => assert(SOFTWARE_FACTORY_CONTROLLED_REAL_RELEASE_EXECUTION_PREPARATION_PHASE_GATE_STATUSES.includes('CONTROLLED_REAL_RELEASE_PREPARATION_PHASE_GATE_INCOMPLETE')));
test('STATUSES includes READY', () => assert(SOFTWARE_FACTORY_CONTROLLED_REAL_RELEASE_EXECUTION_PREPARATION_PHASE_GATE_STATUSES.includes('CONTROLLED_REAL_RELEASE_PREPARATION_PHASE_GATE_READY')));
test('build is function', () => eq(typeof build, 'function'));
test('validate is function', () => eq(typeof validate, 'function'));
test('render is function', () => eq(typeof render, 'function'));

// blocked input
test('null input → BLOCKED_INPUT', () => {
  const r = build(null);
  assert(r.errors[0].includes('CONTROLLED_REAL_RELEASE_PREPARATION_PHASE_GATE_BLOCKED_INPUT'));
  eq(r.phase_gate_ready, false);
});
test('missing phase_gate_id → BLOCKED_INPUT', () => {
  const r = build({});
  assert(r.errors[0].includes('CONTROLLED_REAL_RELEASE_PREPARATION_PHASE_GATE_BLOCKED_INPUT'));
});

// blocked rollback
test('rollback_ready=false → BLOCKED_ROLLBACK', () => {
  const r = build({ ...BASE_INPUT, real_release_rollback_readiness_gate_ready: false });
  assert(r.errors[0].includes('CONTROLLED_REAL_RELEASE_PREPARATION_PHASE_GATE_BLOCKED_ROLLBACK'));
  eq(r.phase_gate_ready, false);
});
test('missing rollback_gate_id → BLOCKED_ROLLBACK', () => {
  const r = build({ ...BASE_INPUT, real_release_rollback_readiness_gate_id: undefined });
  assert(r.errors[0].includes('CONTROLLED_REAL_RELEASE_PREPARATION_PHASE_GATE_BLOCKED_ROLLBACK'));
});

// incomplete
test('empty ids → INCOMPLETE', () => {
  const r = build({ ...BASE_INPUT, ids: {} });
  assert(r.errors[0].includes('CONTROLLED_REAL_RELEASE_PREPARATION_PHASE_GATE_INCOMPLETE'));
  eq(r.phase_gate_ready, false);
});
test('no ids field → INCOMPLETE', () => {
  const { ids: _, ...rest } = BASE_INPUT;
  const r = build(rest);
  assert(r.errors[0].includes('CONTROLLED_REAL_RELEASE_PREPARATION_PHASE_GATE_INCOMPLETE'));
});
test('missing one id → INCOMPLETE', () => {
  const partial = { ...FULL_IDS };
  delete partial.real_release_rollback_readiness_gate;
  const r = build({ ...BASE_INPUT, ids: partial });
  assert(r.errors[0].includes('CONTROLLED_REAL_RELEASE_PREPARATION_PHASE_GATE_INCOMPLETE'));
  assert(r.missing_ids.includes('real_release_rollback_readiness_gate'));
});
test('missing two ids → INCOMPLETE', () => {
  const partial = { real_release_execution_command_contract: 'cmd-001', production_execution_environment_verifier: 'env-001' };
  const r = build({ ...BASE_INPUT, ids: partial });
  assert(r.errors[0].includes('CONTROLLED_REAL_RELEASE_PREPARATION_PHASE_GATE_INCOMPLETE'));
  eq(r.missing_ids.length, 2);
});
test('incomplete: present_ids_count reflects partial ids', () => {
  const partial = { real_release_execution_command_contract: 'cmd-001', production_execution_environment_verifier: 'env-001' };
  eq(build({ ...BASE_INPUT, ids: partial }).present_ids_count, 2);
});

// ready
test('valid input → READY', () => {
  const r = build(BASE_INPUT);
  eq(r.phase_gate_ready, true);
  eq(r.errors.length, 0);
});
test('ready: phase_gate_id set', () => eq(build(BASE_INPUT).phase_gate_id, 'pg-v364-001'));
test('ready: required_ids_count=4', () => eq(build(BASE_INPUT).required_ids_count, 4));
test('ready: present_ids_count=4', () => eq(build(BASE_INPUT).present_ids_count, 4));
test('ready: missing_ids empty', () => eq(build(BASE_INPUT).missing_ids.length, 0));
test('ready: hash 64 hex', () => assert(/^[0-9a-f]{64}$/.test(build(BASE_INPUT).phase_gate_hash)));
test('ready: phase_passed=false', () => eq(build(BASE_INPUT).phase_passed, false));
test('ready: controlled_real_release_preparation_phase_passed=false', () => eq(build(BASE_INPUT).controlled_real_release_preparation_phase_passed, false));
test('ready: production_touched=false', () => eq(build(BASE_INPUT).production_touched, false));
test('ready: real_release_execution_allowed=false', () => eq(build(BASE_INPUT).real_release_execution_allowed, false));
test('ready: real_deployment_execution_allowed=false', () => eq(build(BASE_INPUT).real_deployment_execution_allowed, false));
test('ready: real_tag_creation_allowed=false', () => eq(build(BASE_INPUT).real_tag_creation_allowed, false));
test('ready: real_stable_promotion_allowed=false', () => eq(build(BASE_INPUT).real_stable_promotion_allowed, false));
test('ready: phase_summary stored', () => eq(build(BASE_INPUT).phase_summary, 'V360-V364 preparation complete'));
test('ready: default FINAL_MESSAGE when no summary', () => {
  const { phase_summary: _, ...rest } = BASE_INPUT;
  const r = build(rest);
  assert(r.phase_summary.includes('V360-V364'));
});
test('ready: schema_version v364.0', () => eq(build(BASE_INPUT).schema_version, 'v364.0'));
test('ready: all 4 required ids must be present', () => {
  for (const rid of ['real_release_execution_command_contract','production_execution_environment_verifier','real_release_execution_dry_run_verifier','real_release_rollback_readiness_gate']) {
    const partial = { ...FULL_IDS };
    delete partial[rid];
    const r = build({ ...BASE_INPUT, ids: partial });
    assert(r.errors[0].includes('INCOMPLETE'), `removing ${rid} should → INCOMPLETE`);
  }
});

// validate
test('validate ready result → valid', () => {
  const r = build(BASE_INPUT);
  const v = validate(r);
  eq(v.valid, true);
});
test('validate null → invalid', () => eq(validate(null).valid, false));
test('validate: phase_passed=true → invalid', () => {
  const r = { ...build(BASE_INPUT), phase_passed: true };
  eq(validate(r).valid, false);
});

// render
test('render ready includes READY status', () => {
  assert(render(build(BASE_INPUT)).includes('CONTROLLED_REAL_RELEASE_PREPARATION_PHASE_GATE_READY'));
});
test('render includes REGRA ABSOLUTA', () => {
  assert(render(build(BASE_INPUT)).includes('REGRA ABSOLUTA'));
});
test('render BLOCKED_ROLLBACK shows correct status', () => {
  const r = build({ ...BASE_INPUT, real_release_rollback_readiness_gate_ready: false });
  assert(render(r).includes('CONTROLLED_REAL_RELEASE_PREPARATION_PHASE_GATE_BLOCKED_ROLLBACK'));
});
test('render INCOMPLETE shows correct status', () => {
  const r = build({ ...BASE_INPUT, ids: {} });
  assert(render(r).includes('CONTROLLED_REAL_RELEASE_PREPARATION_PHASE_GATE_INCOMPLETE'));
});
test('render null returns BLOCKED_INPUT string', () => eq(render(null), 'CONTROLLED_REAL_RELEASE_PREPARATION_PHASE_GATE_BLOCKED_INPUT'));
test('render ready includes phase_gate_hash', () => {
  assert(render(build(BASE_INPUT)).includes('phase_gate_hash:'));
});
test('render INCOMPLETE lists missing ids', () => {
  const partial = { ...FULL_IDS };
  delete partial.real_release_rollback_readiness_gate;
  const r = build({ ...BASE_INPUT, ids: partial });
  assert(render(r).includes('real_release_rollback_readiness_gate'));
});

// invariants
test('invariant: phase_passed never true even in ready', () => eq(build(BASE_INPUT).phase_passed, false));
test('invariant: controlled_real_release_preparation_phase_passed never true', () => eq(build(BASE_INPUT).controlled_real_release_preparation_phase_passed, false));
test('invariant: production_touched never true', () => eq(build(BASE_INPUT).production_touched, false));

console.log(`\nV364 controlled-real-release-preparation-phase-gate: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
