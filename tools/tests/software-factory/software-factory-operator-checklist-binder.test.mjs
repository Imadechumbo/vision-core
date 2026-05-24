import { STATUSES, build, validate, render } from '../../software-factory/software-factory-operator-checklist-binder.mjs';

let passed = 0;
let failed = 0;
function assert(label, cond) {
  if (cond) { passed++; }
  else { failed++; console.error(`  FAIL: ${label}`); }
}

const VALID_HASH = 'b'.repeat(63) + '0';
function makeHash(n) { return VALID_HASH.slice(0, 63) + String(n % 10); }

const REQUIRED_CONTROLS = [
  'operator-checklist-required',
  'dry-run-command-required',
  'checklist-not-approved',
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
    operator_checklist_binder_id: 'checklist-001',
    real_release_command_dry_run_contract_id: 'dry-run-v401',
    real_release_command_dry_run_contract_ready: true,
    operator_id: 'op-001',
    operator_role: 'release-manager',
    checklist_reason: 'pre-release operator checklist binding',
    checklist_mode: 'metadata-only',
    checklist_items: [
      {
        checklist_item_id: 'ci-001',
        checklist_type: 'operator_identity_check',
        checklist_mode: 'metadata-only',
        checklist_hash: makeHash(1),
      },
    ],
    required_checklist_controls: [...REQUIRED_CONTROLS],
    ...overrides,
  };
}

// --- exports ---
assert('exports STATUSES', typeof STATUSES === 'object');
assert('exports build', typeof build === 'function');
assert('exports validate', typeof validate === 'function');
assert('exports render', typeof render === 'function');

// --- statuses ---
assert('STATUSES.BLOCKED_INPUT', STATUSES.BLOCKED_INPUT === 'OPERATOR_CHECKLIST_BINDER_BLOCKED_INPUT');
assert('STATUSES.BLOCKED_DRY_RUN', STATUSES.BLOCKED_DRY_RUN === 'OPERATOR_CHECKLIST_BINDER_BLOCKED_DRY_RUN');
assert('STATUSES.FAIL', STATUSES.FAIL === 'OPERATOR_CHECKLIST_BINDER_FAIL');
assert('STATUSES.READY', STATUSES.READY === 'OPERATOR_CHECKLIST_BINDER_READY');

// --- null/empty blocked ---
assert('null blocked', build(null).status === STATUSES.BLOCKED_INPUT);
assert('undefined blocked', build(undefined).status === STATUSES.BLOCKED_INPUT);
assert('empty object blocked', build({}).status === STATUSES.BLOCKED_INPUT);
assert('missing binder_id blocked', build(validInput({ operator_checklist_binder_id: undefined })).status === STATUSES.BLOCKED_INPUT);
assert('missing contract_id blocked', build(validInput({ real_release_command_dry_run_contract_id: undefined })).status === STATUSES.BLOCKED_INPUT);
assert('missing operator_id blocked', build(validInput({ operator_id: undefined })).status === STATUSES.BLOCKED_INPUT);
assert('missing operator_role blocked', build(validInput({ operator_role: undefined })).status === STATUSES.BLOCKED_INPUT);
assert('missing checklist_reason blocked', build(validInput({ checklist_reason: undefined })).status === STATUSES.BLOCKED_INPUT);
assert('missing checklist_mode blocked', build(validInput({ checklist_mode: undefined })).status === STATUSES.BLOCKED_INPUT);

// --- dry run not ready ---
assert('dry_run_ready false blocked', build(validInput({ real_release_command_dry_run_contract_ready: false })).status === STATUSES.BLOCKED_DRY_RUN);
assert('dry_run_ready undefined blocked', build(validInput({ real_release_command_dry_run_contract_ready: undefined })).status === STATUSES.BLOCKED_DRY_RUN);
assert('dry_run_ready null blocked', build(validInput({ real_release_command_dry_run_contract_ready: null })).status === STATUSES.BLOCKED_DRY_RUN);
assert('blocked_dry_run has errors', build(validInput({ real_release_command_dry_run_contract_ready: false })).errors.length > 0);

// --- fail cases ---
assert('invalid checklist_mode fails', build(validInput({ checklist_mode: 'execute' })).status === STATUSES.FAIL);
assert('empty items fails', build(validInput({ checklist_items: [] })).status === STATUSES.FAIL);
assert('non-array items fails', build(validInput({ checklist_items: null })).status === STATUSES.FAIL);
assert('item missing id fails', build(validInput({ checklist_items: [{ checklist_type: 'operator_identity_check', checklist_mode: 'metadata-only', checklist_hash: makeHash(1) }] })).status === STATUSES.FAIL);
assert('invalid checklist_type fails', build(validInput({ checklist_items: [{ checklist_item_id: 'x', checklist_type: 'super_check', checklist_mode: 'metadata-only', checklist_hash: makeHash(1) }] })).status === STATUSES.FAIL);
assert('invalid item mode fails', build(validInput({ checklist_items: [{ checklist_item_id: 'x', checklist_type: 'operator_identity_check', checklist_mode: 'execute', checklist_hash: makeHash(1) }] })).status === STATUSES.FAIL);
assert('invalid hash fails', build(validInput({ checklist_items: [{ checklist_item_id: 'x', checklist_type: 'operator_identity_check', checklist_mode: 'metadata-only', checklist_hash: 'bad' }] })).status === STATUSES.FAIL);
assert('missing controls fails', build(validInput({ required_checklist_controls: [] })).status === STATUSES.FAIL);
assert('uppercase hash fails', build(validInput({ checklist_items: [{ checklist_item_id: 'x', checklist_type: 'operator_identity_check', checklist_mode: 'metadata-only', checklist_hash: 'B'.repeat(64) }] })).status === STATUSES.FAIL);

// --- allowed modes ---
for (const mode of ['blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op']) {
  assert(`mode ${mode} accepted`, build(validInput({ checklist_mode: mode })).status === STATUSES.READY);
}

// --- allowed checklist_types ---
for (const ctype of ['operator_identity_check', 'release_scope_check', 'pass_gold_check', 'rollback_check', 'environment_check', 'artifact_check', 'production_check', 'billing_check', 'secret_check', 'network_check', 'emergency_stop_check', 'final_confirmation_check']) {
  const r = build(validInput({ checklist_items: [{ checklist_item_id: 'x', checklist_type: ctype, checklist_mode: 'metadata-only', checklist_hash: makeHash(1) }] }));
  assert(`checklist_type ${ctype} accepted`, r.status === STATUSES.READY);
}

// --- ready path ---
const ready = build(validInput());
assert('ready status', ready.status === STATUSES.READY);
assert('ready errors empty', ready.errors.length === 0);
assert('ready hash 64', ready.hash.length === 64);
assert('ready hash hex', /^[0-9a-f]{64}$/.test(ready.hash));
assert('ready schema_version v402', ready.schema_version === 'v402');
assert('ready binder_id preserved', ready.operator_checklist_binder_id === 'checklist-001');

// --- hash deterministic ---
const ready2 = build(validInput());
assert('hash deterministic', ready.hash === ready2.hash);
const readyAlt = build(validInput({ operator_checklist_binder_id: 'checklist-002' }));
assert('hash differs', ready.hash !== readyAlt.hash);

// --- validate ---
assert('validate ready true', validate(ready) === true);
assert('validate null false', validate(null) === false);
assert('validate undefined false', validate(undefined) === false);
assert('validate blocked false', validate(build(validInput({ real_release_command_dry_run_contract_ready: false }))) === false);
assert('validate fail false', validate(build(validInput({ required_checklist_controls: [] }))) === false);

// --- render ---
const rendered = render(ready);
assert('render string', typeof rendered === 'string');
assert('render REGRA ABSOLUTA', rendered.includes('SEM PASS GOLD REAL → não promove, não libera, não marca stable.'));
assert('render status', rendered.includes(STATUSES.READY));
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
assert('blocked operator_checklist_bound false', blocked.operator_checklist_bound === false);
assert('blocked operator_checklist_approved false', blocked.operator_checklist_approved === false);
assert('blocked operator_go_decision_granted false', blocked.operator_go_decision_granted === false);
assert('blocked real_release_command_executed false', blocked.real_release_command_executed === false);
assert('blocked real_release_execution_allowed false', blocked.real_release_execution_allowed === false);
assert('blocked operator_go_no_go_phase_passed false', blocked.operator_go_no_go_phase_passed === false);

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
assert('ready operator_checklist_bound false', ready.operator_checklist_bound === false);
assert('ready operator_checklist_approved false', ready.operator_checklist_approved === false);
assert('ready operator_go_decision_granted false', ready.operator_go_decision_granted === false);
assert('ready real_release_command_executed false', ready.real_release_command_executed === false);
assert('ready real_release_execution_allowed false', ready.real_release_execution_allowed === false);
assert('ready operator_go_no_go_phase_passed false', ready.operator_go_no_go_phase_passed === false);

// --- checklist not approved ---
assert('checklist not approved in blocked', blocked.operator_checklist_approved === false);
assert('checklist not approved in ready', ready.operator_checklist_approved === false);
assert('go decision not granted in blocked', blocked.operator_go_decision_granted === false);
assert('go decision not granted in ready', ready.operator_go_decision_granted === false);

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
