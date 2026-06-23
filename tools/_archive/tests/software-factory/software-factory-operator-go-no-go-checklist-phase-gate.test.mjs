import { STATUSES, build, validate, render } from '../../software-factory/software-factory-operator-go-no-go-checklist-phase-gate.mjs';

let passed = 0;
let failed = 0;
function assert(label, cond) {
  if (cond) { passed++; }
  else { failed++; console.error(`  FAIL: ${label}`); }
}

const EXACT_FINAL_MESSAGE =
  'V401-V405 real release command dry-run and operator checklist complete. Real release execution remains blocked until explicit V406 command.';

function validIds(overrides = {}) {
  return {
    real_release_command_dry_run_contract: 'id-v401',
    operator_checklist_binder: 'id-v402',
    release_environment_readiness_snapshot: 'id-v403',
    final_command_simulation_report: 'id-v404',
    ...overrides,
  };
}

function validInput(overrides = {}) {
  return {
    operator_go_no_go_checklist_phase_gate_id: 'phase-gate-001',
    final_command_simulation_report_id: 'sim-report-v404',
    final_command_simulation_report_ready: true,
    ids: validIds(),
    phase_summary: 'All V401-V404 modules verified. Operator checklist phase gate ready.',
    ...overrides,
  };
}

// --- exports ---
assert('exports STATUSES', typeof STATUSES === 'object');
assert('exports build', typeof build === 'function');
assert('exports validate', typeof validate === 'function');
assert('exports render', typeof render === 'function');

// --- statuses ---
assert('STATUSES.BLOCKED_INPUT', STATUSES.BLOCKED_INPUT === 'OPERATOR_GO_NO_GO_CHECKLIST_PHASE_GATE_BLOCKED_INPUT');
assert('STATUSES.BLOCKED_REPORT', STATUSES.BLOCKED_REPORT === 'OPERATOR_GO_NO_GO_CHECKLIST_PHASE_GATE_BLOCKED_REPORT');
assert('STATUSES.INCOMPLETE', STATUSES.INCOMPLETE === 'OPERATOR_GO_NO_GO_CHECKLIST_PHASE_GATE_INCOMPLETE');
assert('STATUSES.READY', STATUSES.READY === 'OPERATOR_GO_NO_GO_CHECKLIST_PHASE_GATE_READY');

// --- null/empty blocked ---
assert('null blocked', build(null).status === STATUSES.BLOCKED_INPUT);
assert('undefined blocked', build(undefined).status === STATUSES.BLOCKED_INPUT);
assert('empty object blocked', build({}).status === STATUSES.BLOCKED_INPUT);
assert('missing gate_id blocked', build(validInput({ operator_go_no_go_checklist_phase_gate_id: undefined })).status === STATUSES.BLOCKED_INPUT);
assert('missing report_id blocked', build(validInput({ final_command_simulation_report_id: undefined })).status === STATUSES.BLOCKED_INPUT);
assert('missing phase_summary blocked', build(validInput({ phase_summary: undefined })).status === STATUSES.BLOCKED_INPUT);
assert('empty phase_summary blocked', build(validInput({ phase_summary: '' })).status === STATUSES.BLOCKED_INPUT);

// --- report not ready ---
assert('report_ready false blocked', build(validInput({ final_command_simulation_report_ready: false })).status === STATUSES.BLOCKED_REPORT);
assert('report_ready undefined blocked', build(validInput({ final_command_simulation_report_ready: undefined })).status === STATUSES.BLOCKED_REPORT);
assert('report_ready null blocked', build(validInput({ final_command_simulation_report_ready: null })).status === STATUSES.BLOCKED_REPORT);
assert('blocked_report has errors', build(validInput({ final_command_simulation_report_ready: false })).errors.length > 0);

// --- incomplete cases ---
assert('missing ids object incomplete', build(validInput({ ids: null })).status === STATUSES.INCOMPLETE);
assert('empty ids incomplete', build(validInput({ ids: {} })).status === STATUSES.INCOMPLETE);
assert('missing v401 id incomplete', build(validInput({ ids: validIds({ real_release_command_dry_run_contract: undefined }) })).status === STATUSES.INCOMPLETE);
assert('missing v402 id incomplete', build(validInput({ ids: validIds({ operator_checklist_binder: undefined }) })).status === STATUSES.INCOMPLETE);
assert('missing v403 id incomplete', build(validInput({ ids: validIds({ release_environment_readiness_snapshot: undefined }) })).status === STATUSES.INCOMPLETE);
assert('missing v404 id incomplete', build(validInput({ ids: validIds({ final_command_simulation_report: undefined }) })).status === STATUSES.INCOMPLETE);
assert('empty string v401 incomplete', build(validInput({ ids: validIds({ real_release_command_dry_run_contract: '' }) })).status === STATUSES.INCOMPLETE);
assert('whitespace v402 incomplete', build(validInput({ ids: validIds({ operator_checklist_binder: '   ' }) })).status === STATUSES.INCOMPLETE);

// --- ready path ---
const ready = build(validInput());
assert('ready status', ready.status === STATUSES.READY);
assert('ready errors empty', ready.errors.length === 0);
assert('ready hash 64', ready.hash.length === 64);
assert('ready hash hex', /^[0-9a-f]{64}$/.test(ready.hash));
assert('ready schema_version v405', ready.schema_version === 'v405');
assert('ready gate_id preserved', ready.operator_go_no_go_checklist_phase_gate_id === 'phase-gate-001');
assert('ready report_id preserved', ready.final_command_simulation_report_id === 'sim-report-v404');
assert('ready has final_message', typeof ready.final_message === 'string');
assert('ready final_message exact', ready.final_message === EXACT_FINAL_MESSAGE);
assert('ready ids all present', ready.ids.real_release_command_dry_run_contract === 'id-v401');

// --- hash deterministic ---
const ready2 = build(validInput());
assert('hash deterministic', ready.hash === ready2.hash);
const readyAlt = build(validInput({ operator_go_no_go_checklist_phase_gate_id: 'phase-gate-002' }));
assert('hash differs', ready.hash !== readyAlt.hash);

// --- validate ---
assert('validate ready true', validate(ready) === true);
assert('validate null false', validate(null) === false);
assert('validate undefined false', validate(undefined) === false);
assert('validate blocked_report false', validate(build(validInput({ final_command_simulation_report_ready: false }))) === false);
assert('validate incomplete false', validate(build(validInput({ ids: {} }))) === false);

// --- render ---
const rendered = render(ready);
assert('render string', typeof rendered === 'string');
assert('render REGRA ABSOLUTA', rendered.includes('SEM PASS GOLD REAL → não promove, não libera, não marca stable.'));
assert('render status', rendered.includes(STATUSES.READY));
assert('render final_message', rendered.includes('V401-V405'));
assert('render null safe', typeof render(null) === 'string');
assert('render null REGRA', render(null).includes('SEM PASS GOLD REAL'));
assert('render blocked string', typeof render(build(validInput({ final_command_simulation_report_ready: false }))) === 'string');
assert('render incomplete string', typeof render(build(validInput({ ids: {} }))) === 'string');

// --- invariants false blocked ---
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
assert('blocked operator_go_no_go_phase_passed false', blocked.operator_go_no_go_phase_passed === false);
assert('blocked operator_go_decision_granted false', blocked.operator_go_decision_granted === false);
assert('blocked real_release_command_executed false', blocked.real_release_command_executed === false);
assert('blocked real_release_execution_allowed false', blocked.real_release_execution_allowed === false);
assert('blocked operator_checklist_approved false', blocked.operator_checklist_approved === false);
assert('blocked final_command_simulation_report_published false', blocked.final_command_simulation_report_published === false);

// --- invariants false ready ---
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
assert('ready operator_go_no_go_phase_passed false', ready.operator_go_no_go_phase_passed === false);
assert('ready operator_go_decision_granted false', ready.operator_go_decision_granted === false);
assert('ready real_release_command_executed false', ready.real_release_command_executed === false);
assert('ready real_release_execution_allowed false', ready.real_release_execution_allowed === false);
assert('ready operator_checklist_approved false', ready.operator_checklist_approved === false);
assert('ready final_command_simulation_report_published false', ready.final_command_simulation_report_published === false);

// --- gate not passed even in ready ---
assert('phase not passed in ready', ready.operator_go_no_go_phase_passed === false);
assert('go decision not granted in ready', ready.operator_go_decision_granted === false);
assert('command not executed in ready', ready.real_release_command_executed === false);

// --- incomplete invariants ---
const incomplete = build(validInput({ ids: {} }));
assert('incomplete operator_go_no_go_phase_passed false', incomplete.operator_go_no_go_phase_passed === false);
assert('incomplete operator_go_decision_granted false', incomplete.operator_go_decision_granted === false);
assert('incomplete real_release_command_executed false', incomplete.real_release_command_executed === false);
assert('incomplete production_touched false', incomplete.production_touched === false);

// --- blocked_report invariants ---
const blockedReport = build(validInput({ final_command_simulation_report_ready: false }));
assert('blocked_report operator_go_no_go_phase_passed false', blockedReport.operator_go_no_go_phase_passed === false);
assert('blocked_report real_release_command_executed false', blockedReport.real_release_command_executed === false);
assert('blocked_report production_touched false', blockedReport.production_touched === false);

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
