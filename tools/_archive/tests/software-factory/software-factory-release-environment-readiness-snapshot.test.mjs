import { STATUSES, build, validate, render } from '../../software-factory/software-factory-release-environment-readiness-snapshot.mjs';

let passed = 0;
let failed = 0;
function assert(label, cond) {
  if (cond) { passed++; }
  else { failed++; console.error(`  FAIL: ${label}`); }
}

const VALID_HASH = 'c'.repeat(63) + '0';
function makeHash(n) { return VALID_HASH.slice(0, 63) + String(n % 10); }

const REQUIRED_CONTROLS = [
  'environment-readiness-snapshot-required',
  'operator-checklist-required',
  'metadata-only-snapshot',
  'no-real-env-inspection',
  'no-production-touch',
  'no-secret-access',
  'no-network',
  'no-billing-execution',
  'no-real-release',
  'no-real-deploy',
  'no-tag-create',
  'no-stable-promotion',
  'no-real-rollback',
  'audit-required',
  'pass-gold-real-required',
];

function validInput(overrides = {}) {
  return {
    release_environment_readiness_snapshot_id: 'env-snapshot-001',
    operator_checklist_binder_id: 'checklist-v402',
    operator_checklist_binder_ready: true,
    environment_snapshot_items: [
      {
        snapshot_item_id: 'si-001',
        snapshot_type: 'release_environment',
        snapshot_mode: 'metadata-only',
        snapshot_hash: makeHash(1),
      },
    ],
    required_environment_controls: [...REQUIRED_CONTROLS],
    snapshot_level: 'standard',
    ...overrides,
  };
}

// --- exports ---
assert('exports STATUSES', typeof STATUSES === 'object');
assert('exports build', typeof build === 'function');
assert('exports validate', typeof validate === 'function');
assert('exports render', typeof render === 'function');

// --- statuses ---
assert('STATUSES.BLOCKED_INPUT', STATUSES.BLOCKED_INPUT === 'RELEASE_ENVIRONMENT_READINESS_SNAPSHOT_BLOCKED_INPUT');
assert('STATUSES.BLOCKED_CHECKLIST', STATUSES.BLOCKED_CHECKLIST === 'RELEASE_ENVIRONMENT_READINESS_SNAPSHOT_BLOCKED_CHECKLIST');
assert('STATUSES.FAIL', STATUSES.FAIL === 'RELEASE_ENVIRONMENT_READINESS_SNAPSHOT_FAIL');
assert('STATUSES.READY', STATUSES.READY === 'RELEASE_ENVIRONMENT_READINESS_SNAPSHOT_READY');

// --- null/empty blocked ---
assert('null blocked', build(null).status === STATUSES.BLOCKED_INPUT);
assert('undefined blocked', build(undefined).status === STATUSES.BLOCKED_INPUT);
assert('empty object blocked', build({}).status === STATUSES.BLOCKED_INPUT);
assert('missing snapshot_id blocked', build(validInput({ release_environment_readiness_snapshot_id: undefined })).status === STATUSES.BLOCKED_INPUT);
assert('missing binder_id blocked', build(validInput({ operator_checklist_binder_id: undefined })).status === STATUSES.BLOCKED_INPUT);
assert('missing snapshot_level blocked', build(validInput({ snapshot_level: undefined })).status === STATUSES.BLOCKED_INPUT);

// --- checklist not ready ---
assert('checklist_ready false blocked', build(validInput({ operator_checklist_binder_ready: false })).status === STATUSES.BLOCKED_CHECKLIST);
assert('checklist_ready undefined blocked', build(validInput({ operator_checklist_binder_ready: undefined })).status === STATUSES.BLOCKED_CHECKLIST);
assert('checklist_ready null blocked', build(validInput({ operator_checklist_binder_ready: null })).status === STATUSES.BLOCKED_CHECKLIST);
assert('blocked_checklist has errors', build(validInput({ operator_checklist_binder_ready: false })).errors.length > 0);

// --- fail cases ---
assert('empty items fails', build(validInput({ environment_snapshot_items: [] })).status === STATUSES.FAIL);
assert('non-array items fails', build(validInput({ environment_snapshot_items: null })).status === STATUSES.FAIL);
assert('item missing id fails', build(validInput({ environment_snapshot_items: [{ snapshot_type: 'release_environment', snapshot_mode: 'metadata-only', snapshot_hash: makeHash(1) }] })).status === STATUSES.FAIL);
assert('invalid snapshot_type fails', build(validInput({ environment_snapshot_items: [{ snapshot_item_id: 'x', snapshot_type: 'bad_env', snapshot_mode: 'metadata-only', snapshot_hash: makeHash(1) }] })).status === STATUSES.FAIL);
assert('invalid snapshot_mode fails', build(validInput({ environment_snapshot_items: [{ snapshot_item_id: 'x', snapshot_type: 'release_environment', snapshot_mode: 'execute', snapshot_hash: makeHash(1) }] })).status === STATUSES.FAIL);
assert('invalid hash fails', build(validInput({ environment_snapshot_items: [{ snapshot_item_id: 'x', snapshot_type: 'release_environment', snapshot_mode: 'metadata-only', snapshot_hash: 'bad' }] })).status === STATUSES.FAIL);
assert('missing controls fails', build(validInput({ required_environment_controls: [] })).status === STATUSES.FAIL);
assert('uppercase hash fails', build(validInput({ environment_snapshot_items: [{ snapshot_item_id: 'x', snapshot_type: 'release_environment', snapshot_mode: 'metadata-only', snapshot_hash: 'C'.repeat(64) }] })).status === STATUSES.FAIL);

// --- allowed snapshot_types ---
for (const stype of ['release_environment', 'deployment_environment', 'artifact_environment', 'production_environment', 'rollback_environment', 'billing_environment', 'secret_environment', 'network_environment', 'operator_environment', 'audit_environment', 'emergency_stop_environment']) {
  const r = build(validInput({ environment_snapshot_items: [{ snapshot_item_id: 'x', snapshot_type: stype, snapshot_mode: 'metadata-only', snapshot_hash: makeHash(1) }] }));
  assert(`snapshot_type ${stype} accepted`, r.status === STATUSES.READY);
}

// --- allowed snapshot_modes ---
for (const mode of ['blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op']) {
  const r = build(validInput({ environment_snapshot_items: [{ snapshot_item_id: 'x', snapshot_type: 'release_environment', snapshot_mode: mode, snapshot_hash: makeHash(1) }] }));
  assert(`snapshot_mode ${mode} accepted`, r.status === STATUSES.READY);
}

// --- ready path ---
const ready = build(validInput());
assert('ready status', ready.status === STATUSES.READY);
assert('ready errors empty', ready.errors.length === 0);
assert('ready hash 64', ready.hash.length === 64);
assert('ready hash hex', /^[0-9a-f]{64}$/.test(ready.hash));
assert('ready schema_version v403', ready.schema_version === 'v403');
assert('ready snapshot_id preserved', ready.release_environment_readiness_snapshot_id === 'env-snapshot-001');

// --- hash deterministic ---
const ready2 = build(validInput());
assert('hash deterministic', ready.hash === ready2.hash);
const readyAlt = build(validInput({ release_environment_readiness_snapshot_id: 'env-snapshot-002' }));
assert('hash differs', ready.hash !== readyAlt.hash);

// --- validate ---
assert('validate ready true', validate(ready) === true);
assert('validate null false', validate(null) === false);
assert('validate undefined false', validate(undefined) === false);
assert('validate blocked false', validate(build(validInput({ operator_checklist_binder_ready: false }))) === false);
assert('validate fail false', validate(build(validInput({ required_environment_controls: [] }))) === false);

// --- render ---
assert('render string', typeof render(ready) === 'string');
assert('render REGRA ABSOLUTA', render(ready).includes('SEM PASS GOLD REAL → não promove, não libera, não marca stable.'));
assert('render status', render(ready).includes(STATUSES.READY));
assert('render null safe', typeof render(null) === 'string');
assert('render null REGRA', render(null).includes('SEM PASS GOLD REAL'));

// --- invariants false blocked ---
const blocked = build(null);
assert('blocked release_allowed false', blocked.release_allowed === false);
assert('blocked deploy_allowed false', blocked.deploy_allowed === false);
assert('blocked stable_allowed false', blocked.stable_allowed === false);
assert('blocked tag_allowed false', blocked.tag_allowed === false);
assert('blocked real_execution_allowed false', blocked.real_execution_allowed === false);
assert('blocked production_touched false', blocked.production_touched === false);
assert('blocked secrets_accessed false', blocked.secrets_accessed === false);
assert('blocked network_accessed false', blocked.network_accessed === false);
assert('blocked billing_executed false', blocked.billing_executed === false);
assert('blocked rollback_executed false', blocked.rollback_executed === false);
assert('blocked release_environment_readiness_confirmed false', blocked.release_environment_readiness_confirmed === false);
assert('blocked operator_checklist_approved false', blocked.operator_checklist_approved === false);
assert('blocked operator_go_decision_granted false', blocked.operator_go_decision_granted === false);
assert('blocked real_release_command_executed false', blocked.real_release_command_executed === false);
assert('blocked operator_go_no_go_phase_passed false', blocked.operator_go_no_go_phase_passed === false);

// --- invariants false ready ---
assert('ready release_allowed false', ready.release_allowed === false);
assert('ready deploy_allowed false', ready.deploy_allowed === false);
assert('ready stable_allowed false', ready.stable_allowed === false);
assert('ready tag_allowed false', ready.tag_allowed === false);
assert('ready real_execution_allowed false', ready.real_execution_allowed === false);
assert('ready production_touched false', ready.production_touched === false);
assert('ready secrets_accessed false', ready.secrets_accessed === false);
assert('ready network_accessed false', ready.network_accessed === false);
assert('ready billing_executed false', ready.billing_executed === false);
assert('ready rollback_executed false', ready.rollback_executed === false);
assert('ready release_environment_readiness_confirmed false', ready.release_environment_readiness_confirmed === false);
assert('ready operator_checklist_approved false', ready.operator_checklist_approved === false);
assert('ready operator_go_decision_granted false', ready.operator_go_decision_granted === false);
assert('ready real_release_command_executed false', ready.real_release_command_executed === false);
assert('ready operator_go_no_go_phase_passed false', ready.operator_go_no_go_phase_passed === false);
assert('ready real_release_execution_allowed false', ready.real_release_execution_allowed === false);

// --- no real env inspection ---
assert('production not touched in blocked', blocked.production_touched === false);
assert('production not touched in ready', ready.production_touched === false);
assert('secrets not accessed in blocked', blocked.secrets_accessed === false);
assert('secrets not accessed in ready', ready.secrets_accessed === false);
assert('network not accessed in blocked', blocked.network_accessed === false);
assert('network not accessed in ready', ready.network_accessed === false);

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
