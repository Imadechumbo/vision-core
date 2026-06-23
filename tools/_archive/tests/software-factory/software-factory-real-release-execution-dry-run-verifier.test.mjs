import { createHash } from 'crypto';
import {
  SOFTWARE_FACTORY_REAL_RELEASE_EXECUTION_DRY_RUN_VERIFIER_STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-real-release-execution-dry-run-verifier.mjs';

let passed = 0; let failed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (e) { failed++; console.error(`FAIL: ${name}\n  ${e.message}`); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function eq(a, b) { assert(a === b, `expected ${JSON.stringify(b)} got ${JSON.stringify(a)}`); }

function h(s) { return createHash('sha256').update(s).digest('hex'); }
const HASH64 = h('test-dry-run');

const CONTROLS = [
  'dry-run-required', 'no-production-touch', 'no-real-release', 'no-real-deploy',
  'no-tag-create', 'no-stable-promotion', 'no-artifact-publish', 'no-billing-execution',
  'no-secret-access', 'no-network', 'rollback-required', 'evidence-required',
  'audit-required', 'human-approval-required', 'pass-gold-required',
];

const ITEMS = [
  { dry_run_id: 'dr-001', dry_run_type: 'release_dry_run', dry_run_mode: 'dry-run', dry_run_hash: HASH64 },
  { dry_run_id: 'dr-002', dry_run_type: 'deployment_dry_run', dry_run_mode: 'metadata-only', dry_run_hash: HASH64 },
];

const BASE_INPUT = {
  real_release_execution_dry_run_verifier_id: 'drv-001',
  production_execution_environment_verifier_ready: true,
  production_execution_environment_verifier_id: 'env-001',
  dry_run_items: ITEMS,
  required_dry_run_controls: CONTROLS,
  dry_run_level: 'dry-run',
};

// exports
test('STATUSES exported as array', () => assert(Array.isArray(SOFTWARE_FACTORY_REAL_RELEASE_EXECUTION_DRY_RUN_VERIFIER_STATUSES)));
test('STATUSES has 4 entries', () => eq(SOFTWARE_FACTORY_REAL_RELEASE_EXECUTION_DRY_RUN_VERIFIER_STATUSES.length, 4));
test('STATUSES includes BLOCKED_INPUT', () => assert(SOFTWARE_FACTORY_REAL_RELEASE_EXECUTION_DRY_RUN_VERIFIER_STATUSES.includes('REAL_RELEASE_DRY_RUN_BLOCKED_INPUT')));
test('STATUSES includes BLOCKED_ENVIRONMENT', () => assert(SOFTWARE_FACTORY_REAL_RELEASE_EXECUTION_DRY_RUN_VERIFIER_STATUSES.includes('REAL_RELEASE_DRY_RUN_BLOCKED_ENVIRONMENT')));
test('STATUSES includes FAIL', () => assert(SOFTWARE_FACTORY_REAL_RELEASE_EXECUTION_DRY_RUN_VERIFIER_STATUSES.includes('REAL_RELEASE_DRY_RUN_FAIL')));
test('STATUSES includes READY', () => assert(SOFTWARE_FACTORY_REAL_RELEASE_EXECUTION_DRY_RUN_VERIFIER_STATUSES.includes('REAL_RELEASE_DRY_RUN_READY')));
test('build is function', () => eq(typeof build, 'function'));
test('validate is function', () => eq(typeof validate, 'function'));
test('render is function', () => eq(typeof render, 'function'));

// blocked input
test('null input → BLOCKED_INPUT', () => {
  const r = build(null);
  assert(r.errors[0].includes('REAL_RELEASE_DRY_RUN_BLOCKED_INPUT'));
  eq(r.real_release_execution_dry_run_verifier_ready, false);
});
test('missing id → BLOCKED_INPUT', () => {
  const r = build({});
  assert(r.errors[0].includes('REAL_RELEASE_DRY_RUN_BLOCKED_INPUT'));
});

// blocked environment
test('env_verifier_ready=false → BLOCKED_ENVIRONMENT', () => {
  const r = build({ ...BASE_INPUT, production_execution_environment_verifier_ready: false });
  assert(r.errors[0].includes('REAL_RELEASE_DRY_RUN_BLOCKED_ENVIRONMENT'));
  eq(r.real_release_execution_dry_run_verifier_ready, false);
});
test('missing env_verifier_id → BLOCKED_ENVIRONMENT', () => {
  const r = build({ ...BASE_INPUT, production_execution_environment_verifier_id: undefined });
  assert(r.errors[0].includes('REAL_RELEASE_DRY_RUN_BLOCKED_ENVIRONMENT'));
});

// fail cases
test('empty dry_run_items → FAIL', () => {
  const r = build({ ...BASE_INPUT, dry_run_items: [] });
  assert(r.errors[0].includes('REAL_RELEASE_DRY_RUN_FAIL'));
});
test('missing dry_run_items → FAIL', () => {
  const r = build({ ...BASE_INPUT, dry_run_items: undefined });
  assert(r.errors[0].includes('REAL_RELEASE_DRY_RUN_FAIL'));
});
test('missing controls → FAIL', () => {
  const r = build({ ...BASE_INPUT, required_dry_run_controls: undefined });
  assert(r.errors[0].includes('REAL_RELEASE_DRY_RUN_FAIL'));
});
test('incomplete controls → FAIL', () => {
  const r = build({ ...BASE_INPUT, required_dry_run_controls: ['dry-run-required'] });
  assert(r.errors[0].includes('REAL_RELEASE_DRY_RUN_FAIL'));
});
test('invalid dry_run_level → FAIL', () => {
  const r = build({ ...BASE_INPUT, dry_run_level: 'INVALID' });
  assert(r.errors[0].includes('REAL_RELEASE_DRY_RUN_FAIL'));
});
test('item missing dry_run_id → FAIL', () => {
  const items = [{ dry_run_type: 'release_dry_run', dry_run_mode: 'dry-run', dry_run_hash: HASH64 }];
  const r = build({ ...BASE_INPUT, dry_run_items: items });
  assert(r.errors[0].includes('REAL_RELEASE_DRY_RUN_FAIL'));
});
test('item invalid dry_run_type → FAIL', () => {
  const items = [{ dry_run_id: 'x', dry_run_type: 'INVALID', dry_run_mode: 'dry-run', dry_run_hash: HASH64 }];
  const r = build({ ...BASE_INPUT, dry_run_items: items });
  assert(r.errors[0].includes('REAL_RELEASE_DRY_RUN_FAIL'));
});
test('item invalid dry_run_mode → FAIL', () => {
  const items = [{ dry_run_id: 'x', dry_run_type: 'release_dry_run', dry_run_mode: 'INVALID', dry_run_hash: HASH64 }];
  const r = build({ ...BASE_INPUT, dry_run_items: items });
  assert(r.errors[0].includes('REAL_RELEASE_DRY_RUN_FAIL'));
});
test('item invalid hash → FAIL', () => {
  const items = [{ dry_run_id: 'x', dry_run_type: 'release_dry_run', dry_run_mode: 'dry-run', dry_run_hash: 'bad' }];
  const r = build({ ...BASE_INPUT, dry_run_items: items });
  assert(r.errors[0].includes('REAL_RELEASE_DRY_RUN_FAIL'));
});

// ready
test('valid input → READY', () => {
  const r = build(BASE_INPUT);
  eq(r.real_release_execution_dry_run_verifier_ready, true);
  eq(r.errors.length, 0);
});
test('ready: id set', () => eq(build(BASE_INPUT).real_release_execution_dry_run_verifier_id, 'drv-001'));
test('ready: items_count', () => eq(build(BASE_INPUT).dry_run_items_count, 2));
test('ready: controls_count', () => eq(build(BASE_INPUT).required_dry_run_controls_count, 15));
test('ready: hash 64 hex', () => assert(/^[0-9a-f]{64}$/.test(build(BASE_INPUT).real_release_execution_dry_run_verifier_hash)));
test('ready: real_release_dry_run_verified=false', () => eq(build(BASE_INPUT).real_release_dry_run_verified, false));
test('ready: production_touched=false', () => eq(build(BASE_INPUT).production_touched, false));
test('ready: real_release_execution_allowed=false', () => eq(build(BASE_INPUT).real_release_execution_allowed, false));
test('ready: real_deployment_execution_allowed=false', () => eq(build(BASE_INPUT).real_deployment_execution_allowed, false));
test('ready: real_tag_creation_allowed=false', () => eq(build(BASE_INPUT).real_tag_creation_allowed, false));
test('ready: real_stable_promotion_allowed=false', () => eq(build(BASE_INPUT).real_stable_promotion_allowed, false));
test('ready: all 11 dry_run_types allowed', () => {
  const types = ['release_dry_run','deployment_dry_run','tag_dry_run','stable_dry_run','artifact_dry_run','production_dry_run','rollback_dry_run','billing_dry_run','secret_boundary_dry_run','network_boundary_dry_run','emergency_stop_dry_run'];
  for (const t of types) {
    const items = [{ dry_run_id: 'x', dry_run_type: t, dry_run_mode: 'dry-run', dry_run_hash: HASH64 }];
    const r = build({ ...BASE_INPUT, dry_run_items: items });
    assert(r.real_release_execution_dry_run_verifier_ready === true, `type ${t} should be valid`);
  }
});
test('ready: all 5 dry_run_modes allowed as level', () => {
  for (const m of ['blocked','metadata-only','dry-run','planning','contract-only']) {
    const r = build({ ...BASE_INPUT, dry_run_level: m });
    assert(r.real_release_execution_dry_run_verifier_ready === true, `mode ${m} should be valid`);
  }
});
test('ready: dry_run_level stored', () => eq(build(BASE_INPUT).dry_run_level, 'dry-run'));
test('ready: schema_version v362.0', () => eq(build(BASE_INPUT).schema_version, 'v362.0'));

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
  assert(r.includes('REAL_RELEASE_DRY_RUN_READY'));
});
test('render includes REGRA ABSOLUTA', () => {
  assert(render(build(BASE_INPUT)).includes('REGRA ABSOLUTA'));
});
test('render BLOCKED_ENVIRONMENT shows correct status', () => {
  const r = build({ ...BASE_INPUT, production_execution_environment_verifier_ready: false });
  assert(render(r).includes('REAL_RELEASE_DRY_RUN_BLOCKED_ENVIRONMENT'));
});
test('render FAIL shows correct status', () => {
  const r = build({ ...BASE_INPUT, dry_run_items: [] });
  assert(render(r).includes('REAL_RELEASE_DRY_RUN_FAIL'));
});
test('render null returns BLOCKED_INPUT string', () => eq(render(null), 'REAL_RELEASE_DRY_RUN_BLOCKED_INPUT'));
test('render ready includes dry_run_items listing', () => {
  assert(render(build(BASE_INPUT)).includes('release_dry_run'));
});

// invariants
test('invariant: real_release_dry_run_verified never true even in ready', () => {
  eq(build(BASE_INPUT).real_release_dry_run_verified, false);
});
test('invariant: production_touched never true', () => eq(build(BASE_INPUT).production_touched, false));

console.log(`\nV362 dry-run-verifier: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
