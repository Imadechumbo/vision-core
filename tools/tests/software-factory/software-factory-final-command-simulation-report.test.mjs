import { STATUSES, build, validate, render } from '../../software-factory/software-factory-final-command-simulation-report.mjs';

let passed = 0;
let failed = 0;
function assert(label, cond) {
  if (cond) { passed++; }
  else { failed++; console.error(`  FAIL: ${label}`); }
}

const VALID_HASH = 'd'.repeat(63) + '0';
function makeHash(n) { return VALID_HASH.slice(0, 63) + String(n % 10); }

const REQUIRED_CONTROLS = [
  'final-command-simulation-report-required',
  'environment-snapshot-required',
  'report-not-published',
  'command-not-executed',
  'no-real-release',
  'no-real-deploy',
  'no-tag-create',
  'no-stable-promotion',
  'no-artifact-publish',
  'no-production-touch',
  'no-billing-execution',
  'no-secret-access',
  'no-network',
  'no-real-rollback',
  'audit-required',
  'pass-gold-real-required',
];

function validInput(overrides = {}) {
  return {
    final_command_simulation_report_id: 'sim-report-001',
    release_environment_readiness_snapshot_id: 'env-snapshot-v403',
    release_environment_readiness_snapshot_ready: true,
    simulation_report_items: [
      {
        simulation_item_id: 'sri-001',
        simulation_type: 'release_command_simulation',
        simulation_mode: 'metadata-only',
        simulation_hash: makeHash(1),
      },
    ],
    required_simulation_controls: [...REQUIRED_CONTROLS],
    simulation_level: 'full',
    ...overrides,
  };
}

// --- exports ---
assert('exports STATUSES', typeof STATUSES === 'object');
assert('exports build', typeof build === 'function');
assert('exports validate', typeof validate === 'function');
assert('exports render', typeof render === 'function');

// --- statuses ---
assert('STATUSES.BLOCKED_INPUT', STATUSES.BLOCKED_INPUT === 'FINAL_COMMAND_SIMULATION_REPORT_BLOCKED_INPUT');
assert('STATUSES.BLOCKED_ENVIRONMENT', STATUSES.BLOCKED_ENVIRONMENT === 'FINAL_COMMAND_SIMULATION_REPORT_BLOCKED_ENVIRONMENT');
assert('STATUSES.FAIL', STATUSES.FAIL === 'FINAL_COMMAND_SIMULATION_REPORT_FAIL');
assert('STATUSES.READY', STATUSES.READY === 'FINAL_COMMAND_SIMULATION_REPORT_READY');

// --- null/empty blocked ---
assert('null blocked', build(null).status === STATUSES.BLOCKED_INPUT);
assert('undefined blocked', build(undefined).status === STATUSES.BLOCKED_INPUT);
assert('empty object blocked', build({}).status === STATUSES.BLOCKED_INPUT);
assert('missing report_id blocked', build(validInput({ final_command_simulation_report_id: undefined })).status === STATUSES.BLOCKED_INPUT);
assert('missing snapshot_id blocked', build(validInput({ release_environment_readiness_snapshot_id: undefined })).status === STATUSES.BLOCKED_INPUT);
assert('missing simulation_level blocked', build(validInput({ simulation_level: undefined })).status === STATUSES.BLOCKED_INPUT);

// --- environment not ready ---
assert('env_ready false blocked', build(validInput({ release_environment_readiness_snapshot_ready: false })).status === STATUSES.BLOCKED_ENVIRONMENT);
assert('env_ready undefined blocked', build(validInput({ release_environment_readiness_snapshot_ready: undefined })).status === STATUSES.BLOCKED_ENVIRONMENT);
assert('env_ready null blocked', build(validInput({ release_environment_readiness_snapshot_ready: null })).status === STATUSES.BLOCKED_ENVIRONMENT);
assert('blocked_env has errors', build(validInput({ release_environment_readiness_snapshot_ready: false })).errors.length > 0);

// --- fail cases ---
assert('empty items fails', build(validInput({ simulation_report_items: [] })).status === STATUSES.FAIL);
assert('non-array items fails', build(validInput({ simulation_report_items: null })).status === STATUSES.FAIL);
assert('item missing id fails', build(validInput({ simulation_report_items: [{ simulation_type: 'release_command_simulation', simulation_mode: 'metadata-only', simulation_hash: makeHash(1) }] })).status === STATUSES.FAIL);
assert('invalid sim_type fails', build(validInput({ simulation_report_items: [{ simulation_item_id: 'x', simulation_type: 'bad_sim', simulation_mode: 'metadata-only', simulation_hash: makeHash(1) }] })).status === STATUSES.FAIL);
assert('invalid sim_mode fails', build(validInput({ simulation_report_items: [{ simulation_item_id: 'x', simulation_type: 'release_command_simulation', simulation_mode: 'execute', simulation_hash: makeHash(1) }] })).status === STATUSES.FAIL);
assert('invalid hash fails', build(validInput({ simulation_report_items: [{ simulation_item_id: 'x', simulation_type: 'release_command_simulation', simulation_mode: 'metadata-only', simulation_hash: 'bad' }] })).status === STATUSES.FAIL);
assert('missing controls fails', build(validInput({ required_simulation_controls: [] })).status === STATUSES.FAIL);
assert('uppercase hash fails', build(validInput({ simulation_report_items: [{ simulation_item_id: 'x', simulation_type: 'release_command_simulation', simulation_mode: 'metadata-only', simulation_hash: 'D'.repeat(64) }] })).status === STATUSES.FAIL);

// --- allowed simulation_types ---
for (const stype of ['release_command_simulation', 'deploy_command_simulation', 'tag_command_simulation', 'stable_command_simulation', 'artifact_command_simulation', 'production_command_simulation', 'rollback_command_simulation', 'operator_simulation', 'pass_gold_simulation', 'environment_simulation', 'emergency_stop_simulation']) {
  const r = build(validInput({ simulation_report_items: [{ simulation_item_id: 'x', simulation_type: stype, simulation_mode: 'metadata-only', simulation_hash: makeHash(1) }] }));
  assert(`sim_type ${stype} accepted`, r.status === STATUSES.READY);
}

// --- allowed simulation_modes ---
for (const mode of ['blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op']) {
  const r = build(validInput({ simulation_report_items: [{ simulation_item_id: 'x', simulation_type: 'release_command_simulation', simulation_mode: mode, simulation_hash: makeHash(1) }] }));
  assert(`sim_mode ${mode} accepted`, r.status === STATUSES.READY);
}

// --- ready path ---
const ready = build(validInput());
assert('ready status', ready.status === STATUSES.READY);
assert('ready errors empty', ready.errors.length === 0);
assert('ready hash 64', ready.hash.length === 64);
assert('ready hash hex', /^[0-9a-f]{64}$/.test(ready.hash));
assert('ready schema_version v404', ready.schema_version === 'v404');
assert('ready report_id preserved', ready.final_command_simulation_report_id === 'sim-report-001');

// --- hash deterministic ---
const ready2 = build(validInput());
assert('hash deterministic', ready.hash === ready2.hash);
const readyAlt = build(validInput({ final_command_simulation_report_id: 'sim-report-002' }));
assert('hash differs', ready.hash !== readyAlt.hash);

// --- validate ---
assert('validate ready true', validate(ready) === true);
assert('validate null false', validate(null) === false);
assert('validate undefined false', validate(undefined) === false);
assert('validate blocked false', validate(build(validInput({ release_environment_readiness_snapshot_ready: false }))) === false);
assert('validate fail false', validate(build(validInput({ required_simulation_controls: [] }))) === false);

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
assert('blocked billing_executed false', blocked.billing_executed === false);
assert('blocked secrets_accessed false', blocked.secrets_accessed === false);
assert('blocked network_accessed false', blocked.network_accessed === false);
assert('blocked rollback_executed false', blocked.rollback_executed === false);
assert('blocked final_command_simulation_report_published false', blocked.final_command_simulation_report_published === false);
assert('blocked real_release_command_executed false', blocked.real_release_command_executed === false);
assert('blocked operator_go_decision_granted false', blocked.operator_go_decision_granted === false);
assert('blocked operator_go_no_go_phase_passed false', blocked.operator_go_no_go_phase_passed === false);

// --- invariants false ready ---
assert('ready release_allowed false', ready.release_allowed === false);
assert('ready deploy_allowed false', ready.deploy_allowed === false);
assert('ready stable_allowed false', ready.stable_allowed === false);
assert('ready tag_allowed false', ready.tag_allowed === false);
assert('ready real_execution_allowed false', ready.real_execution_allowed === false);
assert('ready production_touched false', ready.production_touched === false);
assert('ready billing_executed false', ready.billing_executed === false);
assert('ready secrets_accessed false', ready.secrets_accessed === false);
assert('ready network_accessed false', ready.network_accessed === false);
assert('ready rollback_executed false', ready.rollback_executed === false);
assert('ready final_command_simulation_report_published false', ready.final_command_simulation_report_published === false);
assert('ready real_release_command_executed false', ready.real_release_command_executed === false);
assert('ready operator_go_decision_granted false', ready.operator_go_decision_granted === false);
assert('ready operator_go_no_go_phase_passed false', ready.operator_go_no_go_phase_passed === false);
assert('ready real_release_execution_allowed false', ready.real_release_execution_allowed === false);

// --- report not published ---
assert('report not published in blocked', blocked.final_command_simulation_report_published === false);
assert('report not published in ready', ready.final_command_simulation_report_published === false);
assert('command not executed in blocked', blocked.real_release_command_executed === false);
assert('command not executed in ready', ready.real_release_command_executed === false);

// --- blocked env invariants ---
const blockedEnv = build(validInput({ release_environment_readiness_snapshot_ready: false }));
assert('blocked_env final_command_simulation_report_published false', blockedEnv.final_command_simulation_report_published === false);
assert('blocked_env real_release_command_executed false', blockedEnv.real_release_command_executed === false);
assert('blocked_env production_touched false', blockedEnv.production_touched === false);

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
