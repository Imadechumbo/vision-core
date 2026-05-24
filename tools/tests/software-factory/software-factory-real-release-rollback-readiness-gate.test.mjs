import { createHash } from 'crypto';
import {
  SOFTWARE_FACTORY_REAL_RELEASE_ROLLBACK_READINESS_GATE_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-real-release-rollback-readiness-gate.mjs';

let passed = 0; let failed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (e) { failed++; console.error(`FAIL: ${name}\n  ${e.message}`); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function eq(a, b) { assert(a === b, `expected ${JSON.stringify(b)} got ${JSON.stringify(a)}`); }

function h(s) { return createHash('sha256').update(s).digest('hex'); }
const HASH64 = h('test-rollback');

const CONTROLS = [
  'rollback-readiness-required', 'no-real-rollback', 'no-production-touch', 'no-real-release',
  'no-real-deploy', 'no-tag-create', 'no-stable-promotion', 'no-artifact-publish',
  'no-billing-execution', 'no-secret-access', 'no-network', 'evidence-required',
  'audit-required', 'human-approval-required', 'pass-gold-required',
];

const ITEMS = [
  { rollback_id: 'rb-001', rollback_type: 'release_rollback', rollback_mode: 'dry-run', rollback_hash: HASH64 },
  { rollback_id: 'rb-002', rollback_type: 'deployment_rollback', rollback_mode: 'metadata-only', rollback_hash: HASH64 },
];

const BASE_INPUT = {
  real_release_rollback_readiness_gate_id: 'rrg-001',
  real_release_execution_dry_run_verifier_ready: true,
  real_release_execution_dry_run_verifier_id: 'drv-001',
  rollback_items: ITEMS,
  required_rollback_controls: CONTROLS,
  rollback_level: 'dry-run',
};

// exports
test('STATUSES exported as array', () => assert(Array.isArray(SOFTWARE_FACTORY_REAL_RELEASE_ROLLBACK_READINESS_GATE_STATUSES)));
test('STATUSES has 4 entries', () => eq(SOFTWARE_FACTORY_REAL_RELEASE_ROLLBACK_READINESS_GATE_STATUSES.length, 4));
test('STATUSES includes BLOCKED_INPUT', () => assert(SOFTWARE_FACTORY_REAL_RELEASE_ROLLBACK_READINESS_GATE_STATUSES.includes('REAL_RELEASE_ROLLBACK_READINESS_BLOCKED_INPUT')));
test('STATUSES includes BLOCKED_DRY_RUN', () => assert(SOFTWARE_FACTORY_REAL_RELEASE_ROLLBACK_READINESS_GATE_STATUSES.includes('REAL_RELEASE_ROLLBACK_READINESS_BLOCKED_DRY_RUN')));
test('STATUSES includes FAIL', () => assert(SOFTWARE_FACTORY_REAL_RELEASE_ROLLBACK_READINESS_GATE_STATUSES.includes('REAL_RELEASE_ROLLBACK_READINESS_FAIL')));
test('STATUSES includes READY', () => assert(SOFTWARE_FACTORY_REAL_RELEASE_ROLLBACK_READINESS_GATE_STATUSES.includes('REAL_RELEASE_ROLLBACK_READINESS_READY')));
test('build is function', () => eq(typeof build, 'function'));
test('validate is function', () => eq(typeof validate, 'function'));
test('render is function', () => eq(typeof render, 'function'));

// blocked input
test('null input → BLOCKED_INPUT', () => {
  const r = build(null);
  assert(r.errors[0].includes('REAL_RELEASE_ROLLBACK_READINESS_BLOCKED_INPUT'));
  eq(r.real_release_rollback_readiness_gate_ready, false);
});
test('missing id → BLOCKED_INPUT', () => {
  const r = build({});
  assert(r.errors[0].includes('REAL_RELEASE_ROLLBACK_READINESS_BLOCKED_INPUT'));
});

// blocked dry run
test('dry_run_verifier_ready=false → BLOCKED_DRY_RUN', () => {
  const r = build({ ...BASE_INPUT, real_release_execution_dry_run_verifier_ready: false });
  assert(r.errors[0].includes('REAL_RELEASE_ROLLBACK_READINESS_BLOCKED_DRY_RUN'));
  eq(r.real_release_rollback_readiness_gate_ready, false);
});
test('missing dry_run_verifier_id → BLOCKED_DRY_RUN', () => {
  const r = build({ ...BASE_INPUT, real_release_execution_dry_run_verifier_id: undefined });
  assert(r.errors[0].includes('REAL_RELEASE_ROLLBACK_READINESS_BLOCKED_DRY_RUN'));
});

// fail cases
test('empty rollback_items → FAIL', () => {
  const r = build({ ...BASE_INPUT, rollback_items: [] });
  assert(r.errors[0].includes('REAL_RELEASE_ROLLBACK_READINESS_FAIL'));
});
test('missing rollback_items → FAIL', () => {
  const r = build({ ...BASE_INPUT, rollback_items: undefined });
  assert(r.errors[0].includes('REAL_RELEASE_ROLLBACK_READINESS_FAIL'));
});
test('missing controls → FAIL', () => {
  const r = build({ ...BASE_INPUT, required_rollback_controls: undefined });
  assert(r.errors[0].includes('REAL_RELEASE_ROLLBACK_READINESS_FAIL'));
});
test('incomplete controls → FAIL', () => {
  const r = build({ ...BASE_INPUT, required_rollback_controls: ['rollback-readiness-required'] });
  assert(r.errors[0].includes('REAL_RELEASE_ROLLBACK_READINESS_FAIL'));
});
test('invalid rollback_level → FAIL', () => {
  const r = build({ ...BASE_INPUT, rollback_level: 'INVALID' });
  assert(r.errors[0].includes('REAL_RELEASE_ROLLBACK_READINESS_FAIL'));
});
test('item missing rollback_id → FAIL', () => {
  const items = [{ rollback_type: 'release_rollback', rollback_mode: 'dry-run', rollback_hash: HASH64 }];
  const r = build({ ...BASE_INPUT, rollback_items: items });
  assert(r.errors[0].includes('REAL_RELEASE_ROLLBACK_READINESS_FAIL'));
});
test('item invalid rollback_type → FAIL', () => {
  const items = [{ rollback_id: 'x', rollback_type: 'INVALID', rollback_mode: 'dry-run', rollback_hash: HASH64 }];
  const r = build({ ...BASE_INPUT, rollback_items: items });
  assert(r.errors[0].includes('REAL_RELEASE_ROLLBACK_READINESS_FAIL'));
});
test('item invalid rollback_mode → FAIL', () => {
  const items = [{ rollback_id: 'x', rollback_type: 'release_rollback', rollback_mode: 'INVALID', rollback_hash: HASH64 }];
  const r = build({ ...BASE_INPUT, rollback_items: items });
  assert(r.errors[0].includes('REAL_RELEASE_ROLLBACK_READINESS_FAIL'));
});
test('item invalid hash → FAIL', () => {
  const items = [{ rollback_id: 'x', rollback_type: 'release_rollback', rollback_mode: 'dry-run', rollback_hash: 'bad' }];
  const r = build({ ...BASE_INPUT, rollback_items: items });
  assert(r.errors[0].includes('REAL_RELEASE_ROLLBACK_READINESS_FAIL'));
});

// ready
test('valid input → READY', () => {
  const r = build(BASE_INPUT);
  eq(r.real_release_rollback_readiness_gate_ready, true);
  eq(r.errors.length, 0);
});
test('ready: id set', () => eq(build(BASE_INPUT).real_release_rollback_readiness_gate_id, 'rrg-001'));
test('ready: items_count', () => eq(build(BASE_INPUT).rollback_items_count, 2));
test('ready: controls_count', () => eq(build(BASE_INPUT).required_rollback_controls_count, 15));
test('ready: hash 64 hex', () => assert(/^[0-9a-f]{64}$/.test(build(BASE_INPUT).real_release_rollback_readiness_gate_hash)));
test('ready: real_release_rollback_ready=false', () => eq(build(BASE_INPUT).real_release_rollback_ready, false));
test('ready: production_touched=false', () => eq(build(BASE_INPUT).production_touched, false));
test('ready: real_release_execution_allowed=false', () => eq(build(BASE_INPUT).real_release_execution_allowed, false));
test('ready: real_deployment_execution_allowed=false', () => eq(build(BASE_INPUT).real_deployment_execution_allowed, false));
test('ready: real_tag_creation_allowed=false', () => eq(build(BASE_INPUT).real_tag_creation_allowed, false));
test('ready: real_stable_promotion_allowed=false', () => eq(build(BASE_INPUT).real_stable_promotion_allowed, false));
test('ready: all 11 rollback_types allowed', () => {
  const types = ['release_rollback','deployment_rollback','tag_rollback','stable_rollback','artifact_rollback','production_rollback','billing_rollback','secret_boundary_rollback','network_boundary_rollback','database_rollback','emergency_stop'];
  for (const t of types) {
    const items = [{ rollback_id: 'x', rollback_type: t, rollback_mode: 'dry-run', rollback_hash: HASH64 }];
    const r = build({ ...BASE_INPUT, rollback_items: items });
    assert(r.real_release_rollback_readiness_gate_ready === true, `type ${t} should be valid`);
  }
});
test('ready: all 5 rollback_modes allowed as level', () => {
  for (const m of ['blocked','metadata-only','dry-run','planning','contract-only']) {
    const r = build({ ...BASE_INPUT, rollback_level: m });
    assert(r.real_release_rollback_readiness_gate_ready === true, `mode ${m} should be valid`);
  }
});
test('ready: rollback_level stored', () => eq(build(BASE_INPUT).rollback_level, 'dry-run'));
test('ready: schema_version v363.0', () => eq(build(BASE_INPUT).schema_version, 'v363.0'));

// validate
test('validate ready result → valid', () => {
  const r = build(BASE_INPUT);
  const v = validate(r);
  eq(v.valid, true);
});
test('validate null → invalid', () => eq(validate(null).valid, false));

// render
test('render ready includes READY status', () => {
  const r = render(build(BASE_INPUT));
  assert(r.includes('REAL_RELEASE_ROLLBACK_READINESS_READY'));
});
test('render includes REGRA ABSOLUTA', () => {
  assert(render(build(BASE_INPUT)).includes('REGRA ABSOLUTA'));
});
test('render BLOCKED_DRY_RUN shows correct status', () => {
  const r = build({ ...BASE_INPUT, real_release_execution_dry_run_verifier_ready: false });
  assert(render(r).includes('REAL_RELEASE_ROLLBACK_READINESS_BLOCKED_DRY_RUN'));
});
test('render FAIL shows correct status', () => {
  const r = build({ ...BASE_INPUT, rollback_items: [] });
  assert(render(r).includes('REAL_RELEASE_ROLLBACK_READINESS_FAIL'));
});
test('render null returns BLOCKED_INPUT string', () => eq(render(null), 'REAL_RELEASE_ROLLBACK_READINESS_BLOCKED_INPUT'));
test('render ready includes rollback_items listing', () => {
  assert(render(build(BASE_INPUT)).includes('release_rollback'));
});

// invariants
test('invariant: real_release_rollback_ready never true even in ready', () => {
  eq(build(BASE_INPUT).real_release_rollback_ready, false);
});
test('invariant: production_touched never true', () => eq(build(BASE_INPUT).production_touched, false));

console.log(`\nV363 rollback-readiness-gate: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
