import { STATUSES, build, validate, render } from '../../software-factory/software-factory-real-release-execution-final-barrier.mjs';

let passed = 0;
let failed = 0;
function assert(label, cond) {
  if (cond) { passed++; }
  else { failed++; console.error(`  FAIL: ${label}`); }
}

const EXACT_FINAL_MESSAGE =
  'V396-V400 real release execution decision barrier complete. Real release execution remains blocked until explicit V401 command.';

function validIds(overrides = {}) {
  return {
    real_release_execution_decision_contract: 'id-v396',
    final_human_authority_binding: 'id-v397',
    pass_gold_real_evidence_revalidation_gate: 'id-v398',
    production_release_command_lock: 'id-v399',
    ...overrides,
  };
}

function validInput(overrides = {}) {
  return {
    real_release_execution_final_barrier_id: 'barrier-001',
    production_release_command_lock_id: 'cmd-lock-v399',
    production_release_command_lock_ready: true,
    ids: validIds(),
    barrier_summary: 'All V396-V399 modules verified. Barrier ready.',
    ...overrides,
  };
}

// --- exports ---
assert('exports STATUSES', typeof STATUSES === 'object');
assert('exports build', typeof build === 'function');
assert('exports validate', typeof validate === 'function');
assert('exports render', typeof render === 'function');

// --- statuses ---
assert('STATUSES.BLOCKED_INPUT defined', STATUSES.BLOCKED_INPUT === 'REAL_RELEASE_EXECUTION_FINAL_BARRIER_BLOCKED_INPUT');
assert('STATUSES.BLOCKED_LOCK defined', STATUSES.BLOCKED_LOCK === 'REAL_RELEASE_EXECUTION_FINAL_BARRIER_BLOCKED_LOCK');
assert('STATUSES.INCOMPLETE defined', STATUSES.INCOMPLETE === 'REAL_RELEASE_EXECUTION_FINAL_BARRIER_INCOMPLETE');
assert('STATUSES.READY defined', STATUSES.READY === 'REAL_RELEASE_EXECUTION_FINAL_BARRIER_READY');

// --- null/undefined/empty input blocked ---
assert('null blocked', build(null).status === STATUSES.BLOCKED_INPUT);
assert('undefined blocked', build(undefined).status === STATUSES.BLOCKED_INPUT);
assert('empty object blocked', build({}).status === STATUSES.BLOCKED_INPUT);
assert('missing barrier_id blocked', build(validInput({ real_release_execution_final_barrier_id: undefined })).status === STATUSES.BLOCKED_INPUT);
assert('missing lock_id blocked', build(validInput({ production_release_command_lock_id: undefined })).status === STATUSES.BLOCKED_INPUT);
assert('missing barrier_summary blocked', build(validInput({ barrier_summary: undefined })).status === STATUSES.BLOCKED_INPUT);
assert('empty barrier_summary blocked', build(validInput({ barrier_summary: '' })).status === STATUSES.BLOCKED_INPUT);

// --- lock not ready blocked ---
assert('lock_ready false blocked', build(validInput({ production_release_command_lock_ready: false })).status === STATUSES.BLOCKED_LOCK);
assert('lock_ready undefined blocked', build(validInput({ production_release_command_lock_ready: undefined })).status === STATUSES.BLOCKED_LOCK);
assert('lock_ready null blocked', build(validInput({ production_release_command_lock_ready: null })).status === STATUSES.BLOCKED_LOCK);
assert('blocked_lock has errors', build(validInput({ production_release_command_lock_ready: false })).errors.length > 0);

// --- incomplete cases ---
assert('missing ids object incomplete', build(validInput({ ids: null })).status === STATUSES.INCOMPLETE);
assert('empty ids incomplete', build(validInput({ ids: {} })).status === STATUSES.INCOMPLETE);
assert('missing v396 id incomplete', build(validInput({ ids: validIds({ real_release_execution_decision_contract: undefined }) })).status === STATUSES.INCOMPLETE);
assert('missing v397 id incomplete', build(validInput({ ids: validIds({ final_human_authority_binding: undefined }) })).status === STATUSES.INCOMPLETE);
assert('missing v398 id incomplete', build(validInput({ ids: validIds({ pass_gold_real_evidence_revalidation_gate: undefined }) })).status === STATUSES.INCOMPLETE);
assert('missing v399 id incomplete', build(validInput({ ids: validIds({ production_release_command_lock: undefined }) })).status === STATUSES.INCOMPLETE);
assert('empty string v396 id incomplete', build(validInput({ ids: validIds({ real_release_execution_decision_contract: '' }) })).status === STATUSES.INCOMPLETE);
assert('empty string v397 id incomplete', build(validInput({ ids: validIds({ final_human_authority_binding: '   ' }) })).status === STATUSES.INCOMPLETE);

// --- ready path ---
const ready = build(validInput());
assert('ready status', ready.status === STATUSES.READY);
assert('ready errors empty', ready.errors.length === 0);
assert('ready has hash', typeof ready.hash === 'string');
assert('ready hash 64 chars', ready.hash.length === 64);
assert('ready hash hex', /^[0-9a-f]{64}$/.test(ready.hash));
assert('ready schema_version', ready.schema_version === 'v400');
assert('ready barrier_id preserved', ready.real_release_execution_final_barrier_id === 'barrier-001');
assert('ready lock_id preserved', ready.production_release_command_lock_id === 'cmd-lock-v399');
assert('ready ids preserved', ready.ids.real_release_execution_decision_contract === 'id-v396');
assert('ready has final_message', typeof ready.final_message === 'string');
assert('ready final_message exact', ready.final_message === EXACT_FINAL_MESSAGE);

// --- hash deterministic ---
const ready2 = build(validInput());
assert('hash deterministic', ready.hash === ready2.hash);

// --- hash changes ---
const readyAlt = build(validInput({ real_release_execution_final_barrier_id: 'barrier-002' }));
assert('hash differs on different id', ready.hash !== readyAlt.hash);

// --- validate ---
assert('validate ready true', validate(ready) === true);
assert('validate null false', validate(null) === false);
assert('validate undefined false', validate(undefined) === false);
assert('validate blocked_lock false', validate(build(validInput({ production_release_command_lock_ready: false }))) === false);
assert('validate incomplete false', validate(build(validInput({ ids: {} }))) === false);

// --- render ---
const rendered = render(ready);
assert('render returns string', typeof rendered === 'string');
assert('render contains REGRA ABSOLUTA', rendered.includes('SEM PASS GOLD REAL → não promove, não libera, não marca stable.'));
assert('render contains status', rendered.includes(STATUSES.READY));
assert('render contains final_message', rendered.includes('V396-V400'));
assert('render null safe', typeof render(null) === 'string');
assert('render null contains REGRA ABSOLUTA', render(null).includes('SEM PASS GOLD REAL'));
assert('render blocked string', typeof render(build(validInput({ production_release_command_lock_ready: false }))) === 'string');
assert('render incomplete string', typeof render(build(validInput({ ids: {} }))) === 'string');

// --- invariants false in blocked states ---
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
assert('blocked supervised_release_drill_phase_passed false', blocked.supervised_release_drill_phase_passed === false);
assert('blocked real_release_execution_decision_received false', blocked.real_release_execution_decision_received === false);
assert('blocked final_human_authority_bound false', blocked.final_human_authority_bound === false);
assert('blocked final_human_authority_granted false', blocked.final_human_authority_granted === false);
assert('blocked pass_gold_real_evidence_revalidated false', blocked.pass_gold_real_evidence_revalidated === false);
assert('blocked production_release_command_locked false', blocked.production_release_command_locked === false);
assert('blocked production_release_command_executed false', blocked.production_release_command_executed === false);
assert('blocked real_release_execution_final_barrier_passed false', blocked.real_release_execution_final_barrier_passed === false);
assert('blocked real_release_execution_authorized false', blocked.real_release_execution_authorized === false);
assert('blocked real_release_execution_allowed false', blocked.real_release_execution_allowed === false);

// --- invariants false in ready state ---
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
assert('ready supervised_release_drill_phase_passed false', ready.supervised_release_drill_phase_passed === false);
assert('ready real_release_execution_decision_received false', ready.real_release_execution_decision_received === false);
assert('ready final_human_authority_bound false', ready.final_human_authority_bound === false);
assert('ready final_human_authority_granted false', ready.final_human_authority_granted === false);
assert('ready pass_gold_real_evidence_revalidated false', ready.pass_gold_real_evidence_revalidated === false);
assert('ready production_release_command_locked false', ready.production_release_command_locked === false);
assert('ready production_release_command_executed false', ready.production_release_command_executed === false);
assert('ready real_release_execution_final_barrier_passed false', ready.real_release_execution_final_barrier_passed === false);
assert('ready real_release_execution_authorized false', ready.real_release_execution_authorized === false);
assert('ready real_release_execution_allowed false', ready.real_release_execution_allowed === false);

// --- incomplete state invariants ---
const incomplete = build(validInput({ ids: {} }));
assert('incomplete real_release_execution_final_barrier_passed false', incomplete.real_release_execution_final_barrier_passed === false);
assert('incomplete real_release_execution_authorized false', incomplete.real_release_execution_authorized === false);
assert('incomplete real_release_execution_allowed false', incomplete.real_release_execution_allowed === false);
assert('incomplete production_touched false', incomplete.production_touched === false);

// --- barrier not passed even in ready ---
assert('barrier not passed in ready', ready.real_release_execution_final_barrier_passed === false);
assert('not authorized in ready', ready.real_release_execution_authorized === false);
assert('not allowed in ready', ready.real_release_execution_allowed === false);

// --- blocked_lock invariants ---
const blockedLock = build(validInput({ production_release_command_lock_ready: false }));
assert('blocked_lock real_release_execution_final_barrier_passed false', blockedLock.real_release_execution_final_barrier_passed === false);
assert('blocked_lock real_release_execution_authorized false', blockedLock.real_release_execution_authorized === false);
assert('blocked_lock production_touched false', blockedLock.production_touched === false);

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
