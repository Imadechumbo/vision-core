import { STATUSES, build, validate, render } from '../../software-factory/software-factory-real-release-command-dry-run-contract.mjs';

let passed = 0;
let failed = 0;
function assert(label, cond) {
  if (cond) { passed++; }
  else { failed++; console.error(`  FAIL: ${label}`); }
}

const VALID_HASH = 'a'.repeat(63) + '0';
function makeHash(n) { return VALID_HASH.slice(0, 63) + String(n % 10); }

const REQUIRED_CONTROLS = [
  'real-release-command-dry-run-required',
  'final-barrier-required',
  'metadata-only-command',
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
  'operator-checklist-required',
  'audit-required',
  'pass-gold-real-required',
];

function validInput(overrides = {}) {
  return {
    real_release_command_dry_run_contract_id: 'dry-run-001',
    real_release_execution_final_barrier_id: 'barrier-v400',
    real_release_execution_final_barrier_ready: true,
    dry_run_requested_by: 'human-operator',
    dry_run_reason: 'post-barrier dry-run contract',
    dry_run_mode: 'metadata-only',
    dry_run_items: [
      {
        dry_run_id: 'dr-001',
        dry_run_type: 'release_command_dry_run',
        dry_run_mode: 'metadata-only',
        dry_run_hash: makeHash(1),
      },
    ],
    required_dry_run_controls: [...REQUIRED_CONTROLS],
    ...overrides,
  };
}

// --- exports ---
assert('exports STATUSES', typeof STATUSES === 'object');
assert('exports build', typeof build === 'function');
assert('exports validate', typeof validate === 'function');
assert('exports render', typeof render === 'function');

// --- statuses ---
assert('STATUSES.BLOCKED_INPUT', STATUSES.BLOCKED_INPUT === 'REAL_RELEASE_COMMAND_DRY_RUN_BLOCKED_INPUT');
assert('STATUSES.BLOCKED_BARRIER', STATUSES.BLOCKED_BARRIER === 'REAL_RELEASE_COMMAND_DRY_RUN_BLOCKED_BARRIER');
assert('STATUSES.FAIL', STATUSES.FAIL === 'REAL_RELEASE_COMMAND_DRY_RUN_FAIL');
assert('STATUSES.READY', STATUSES.READY === 'REAL_RELEASE_COMMAND_DRY_RUN_READY');

// --- null/empty blocked ---
assert('null blocked', build(null).status === STATUSES.BLOCKED_INPUT);
assert('undefined blocked', build(undefined).status === STATUSES.BLOCKED_INPUT);
assert('empty object blocked', build({}).status === STATUSES.BLOCKED_INPUT);
assert('missing contract_id blocked', build(validInput({ real_release_command_dry_run_contract_id: undefined })).status === STATUSES.BLOCKED_INPUT);
assert('missing barrier_id blocked', build(validInput({ real_release_execution_final_barrier_id: undefined })).status === STATUSES.BLOCKED_INPUT);
assert('missing requested_by blocked', build(validInput({ dry_run_requested_by: undefined })).status === STATUSES.BLOCKED_INPUT);
assert('missing reason blocked', build(validInput({ dry_run_reason: undefined })).status === STATUSES.BLOCKED_INPUT);
assert('missing mode blocked', build(validInput({ dry_run_mode: undefined })).status === STATUSES.BLOCKED_INPUT);

// --- barrier not ready ---
assert('barrier_ready false blocked', build(validInput({ real_release_execution_final_barrier_ready: false })).status === STATUSES.BLOCKED_BARRIER);
assert('barrier_ready undefined blocked', build(validInput({ real_release_execution_final_barrier_ready: undefined })).status === STATUSES.BLOCKED_BARRIER);
assert('barrier_ready null blocked', build(validInput({ real_release_execution_final_barrier_ready: null })).status === STATUSES.BLOCKED_BARRIER);
assert('blocked_barrier has errors', build(validInput({ real_release_execution_final_barrier_ready: false })).errors.length > 0);

// --- fail cases ---
assert('invalid dry_run_mode fails', build(validInput({ dry_run_mode: 'execute' })).status === STATUSES.FAIL);
assert('empty items fails', build(validInput({ dry_run_items: [] })).status === STATUSES.FAIL);
assert('non-array items fails', build(validInput({ dry_run_items: null })).status === STATUSES.FAIL);
assert('item missing dry_run_id fails', build(validInput({ dry_run_items: [{ dry_run_type: 'release_command_dry_run', dry_run_mode: 'metadata-only', dry_run_hash: makeHash(1) }] })).status === STATUSES.FAIL);
assert('invalid dry_run_type fails', build(validInput({ dry_run_items: [{ dry_run_id: 'x', dry_run_type: 'bad_type', dry_run_mode: 'metadata-only', dry_run_hash: makeHash(1) }] })).status === STATUSES.FAIL);
assert('invalid item mode fails', build(validInput({ dry_run_items: [{ dry_run_id: 'x', dry_run_type: 'release_command_dry_run', dry_run_mode: 'execute', dry_run_hash: makeHash(1) }] })).status === STATUSES.FAIL);
assert('invalid hash fails', build(validInput({ dry_run_items: [{ dry_run_id: 'x', dry_run_type: 'release_command_dry_run', dry_run_mode: 'metadata-only', dry_run_hash: 'bad' }] })).status === STATUSES.FAIL);
assert('missing controls fails', build(validInput({ required_dry_run_controls: [] })).status === STATUSES.FAIL);
assert('partial controls fails', build(validInput({ required_dry_run_controls: ['final-barrier-required'] })).status === STATUSES.FAIL);
assert('uppercase hash fails', build(validInput({ dry_run_items: [{ dry_run_id: 'x', dry_run_type: 'release_command_dry_run', dry_run_mode: 'metadata-only', dry_run_hash: 'A'.repeat(64) }] })).status === STATUSES.FAIL);

// --- allowed modes ---
for (const mode of ['blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op']) {
  assert(`mode ${mode} accepted`, build(validInput({ dry_run_mode: mode })).status === STATUSES.READY);
}

// --- allowed dry_run_types ---
for (const dtype of ['release_command_dry_run', 'deploy_command_dry_run', 'tag_command_dry_run', 'stable_command_dry_run', 'artifact_command_dry_run', 'production_command_dry_run', 'rollback_command_dry_run', 'operator_command_dry_run', 'emergency_stop_dry_run']) {
  const r = build(validInput({ dry_run_items: [{ dry_run_id: 'x', dry_run_type: dtype, dry_run_mode: 'metadata-only', dry_run_hash: makeHash(1) }] }));
  assert(`dry_run_type ${dtype} accepted`, r.status === STATUSES.READY);
}

// --- ready path ---
const ready = build(validInput());
assert('ready status', ready.status === STATUSES.READY);
assert('ready errors empty', ready.errors.length === 0);
assert('ready has hash', typeof ready.hash === 'string');
assert('ready hash 64 chars', ready.hash.length === 64);
assert('ready hash hex', /^[0-9a-f]{64}$/.test(ready.hash));
assert('ready schema_version v401', ready.schema_version === 'v401');
assert('ready contract_id preserved', ready.real_release_command_dry_run_contract_id === 'dry-run-001');

// --- hash deterministic ---
const ready2 = build(validInput());
assert('hash deterministic', ready.hash === ready2.hash);
const readyAlt = build(validInput({ real_release_command_dry_run_contract_id: 'dry-run-002' }));
assert('hash differs on different id', ready.hash !== readyAlt.hash);

// --- validate ---
assert('validate ready true', validate(ready) === true);
assert('validate null false', validate(null) === false);
assert('validate undefined false', validate(undefined) === false);
assert('validate blocked false', validate(build(validInput({ real_release_execution_final_barrier_ready: false }))) === false);
assert('validate fail false', validate(build(validInput({ required_dry_run_controls: [] }))) === false);

// --- render ---
const rendered = render(ready);
assert('render returns string', typeof rendered === 'string');
assert('render REGRA ABSOLUTA', rendered.includes('SEM PASS GOLD REAL → não promove, não libera, não marca stable.'));
assert('render contains status', rendered.includes(STATUSES.READY));
assert('render null safe', typeof render(null) === 'string');
assert('render null REGRA', render(null).includes('SEM PASS GOLD REAL'));

// --- invariants false in blocked ---
const blocked = build(null);
assert('blocked release_allowed false', blocked.release_allowed === false);
assert('blocked deploy_allowed false', blocked.deploy_allowed === false);
assert('blocked stable_allowed false', blocked.stable_allowed === false);
assert('blocked tag_allowed false', blocked.tag_allowed === false);
assert('blocked real_execution_allowed false', blocked.real_execution_allowed === false);
assert('blocked production_touched false', blocked.production_touched === false);
assert('blocked real_release_executed false', blocked.real_release_executed === false);
assert('blocked real_tag_created false', blocked.real_tag_created === false);
assert('blocked real_stable_promoted false', blocked.real_stable_promoted === false);
assert('blocked artifact_published false', blocked.artifact_published === false);
assert('blocked billing_executed false', blocked.billing_executed === false);
assert('blocked secrets_accessed false', blocked.secrets_accessed === false);
assert('blocked network_accessed false', blocked.network_accessed === false);
assert('blocked rollback_executed false', blocked.rollback_executed === false);
assert('blocked real_release_execution_final_barrier_passed false', blocked.real_release_execution_final_barrier_passed === false);
assert('blocked real_release_execution_authorized false', blocked.real_release_execution_authorized === false);
assert('blocked real_release_execution_allowed false', blocked.real_release_execution_allowed === false);
assert('blocked real_release_command_dry_run_received false', blocked.real_release_command_dry_run_received === false);
assert('blocked operator_checklist_bound false', blocked.operator_checklist_bound === false);
assert('blocked operator_checklist_approved false', blocked.operator_checklist_approved === false);
assert('blocked release_environment_readiness_confirmed false', blocked.release_environment_readiness_confirmed === false);
assert('blocked final_command_simulation_report_published false', blocked.final_command_simulation_report_published === false);
assert('blocked operator_go_no_go_phase_passed false', blocked.operator_go_no_go_phase_passed === false);
assert('blocked operator_go_decision_granted false', blocked.operator_go_decision_granted === false);
assert('blocked real_release_command_executed false', blocked.real_release_command_executed === false);

// --- invariants false in ready ---
assert('ready release_allowed false', ready.release_allowed === false);
assert('ready deploy_allowed false', ready.deploy_allowed === false);
assert('ready stable_allowed false', ready.stable_allowed === false);
assert('ready tag_allowed false', ready.tag_allowed === false);
assert('ready real_execution_allowed false', ready.real_execution_allowed === false);
assert('ready production_touched false', ready.production_touched === false);
assert('ready real_release_executed false', ready.real_release_executed === false);
assert('ready real_tag_created false', ready.real_tag_created === false);
assert('ready real_stable_promoted false', ready.real_stable_promoted === false);
assert('ready artifact_published false', ready.artifact_published === false);
assert('ready billing_executed false', ready.billing_executed === false);
assert('ready secrets_accessed false', ready.secrets_accessed === false);
assert('ready network_accessed false', ready.network_accessed === false);
assert('ready rollback_executed false', ready.rollback_executed === false);
assert('ready real_release_execution_final_barrier_passed false', ready.real_release_execution_final_barrier_passed === false);
assert('ready real_release_execution_authorized false', ready.real_release_execution_authorized === false);
assert('ready real_release_execution_allowed false', ready.real_release_execution_allowed === false);
assert('ready real_release_command_dry_run_received false', ready.real_release_command_dry_run_received === false);
assert('ready operator_checklist_bound false', ready.operator_checklist_bound === false);
assert('ready operator_checklist_approved false', ready.operator_checklist_approved === false);
assert('ready release_environment_readiness_confirmed false', ready.release_environment_readiness_confirmed === false);
assert('ready final_command_simulation_report_published false', ready.final_command_simulation_report_published === false);
assert('ready operator_go_no_go_phase_passed false', ready.operator_go_no_go_phase_passed === false);
assert('ready operator_go_decision_granted false', ready.operator_go_decision_granted === false);
assert('ready real_release_command_executed false', ready.real_release_command_executed === false);

// --- command not executed ---
assert('command not executed blocked', blocked.real_release_command_executed === false);
assert('command not executed ready', ready.real_release_command_executed === false);

// --- fail invariants ---
const fail = build(validInput({ required_dry_run_controls: [] }));
assert('fail real_release_command_dry_run_received false', fail.real_release_command_dry_run_received === false);
assert('fail real_release_command_executed false', fail.real_release_command_executed === false);
assert('fail real_release_execution_allowed false', fail.real_release_execution_allowed === false);
assert('fail production_touched false', fail.production_touched === false);

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
