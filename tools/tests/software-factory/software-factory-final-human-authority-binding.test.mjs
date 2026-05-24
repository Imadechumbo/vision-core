import { STATUSES, build, validate, render } from '../../software-factory/software-factory-final-human-authority-binding.mjs';

let passed = 0;
let failed = 0;
function assert(label, cond) {
  if (cond) { passed++; }
  else { failed++; console.error(`  FAIL: ${label}`); }
}

const VALID_HASH = 'b'.repeat(63) + '0';
function makeHash(n) { return VALID_HASH.slice(0, 63) + String(n % 10); }

const REQUIRED_CONTROLS = [
  'final-human-authority-required',
  'decision-contract-required',
  'no-authority-grant',
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
  'pass-gold-real-required',
  'audit-required',
];

function validInput(overrides = {}) {
  return {
    final_human_authority_binding_id: 'binding-001',
    real_release_execution_decision_contract_id: 'contract-v396',
    real_release_execution_decision_contract_ready: true,
    authority_id: 'auth-001',
    authority_actor: 'human-release-manager',
    authority_reason: 'post-decision authority binding',
    authority_mode: 'metadata-only',
    authority_items: [
      {
        authority_item_id: 'ai-001',
        authority_type: 'human_operator',
        authority_mode: 'metadata-only',
        authority_hash: makeHash(1),
      },
    ],
    required_authority_controls: [...REQUIRED_CONTROLS],
    ...overrides,
  };
}

// --- exports ---
assert('exports STATUSES', typeof STATUSES === 'object');
assert('exports build', typeof build === 'function');
assert('exports validate', typeof validate === 'function');
assert('exports render', typeof render === 'function');

// --- statuses ---
assert('STATUSES.BLOCKED_INPUT defined', STATUSES.BLOCKED_INPUT === 'FINAL_HUMAN_AUTHORITY_BINDING_BLOCKED_INPUT');
assert('STATUSES.BLOCKED_DECISION defined', STATUSES.BLOCKED_DECISION === 'FINAL_HUMAN_AUTHORITY_BINDING_BLOCKED_DECISION');
assert('STATUSES.FAIL defined', STATUSES.FAIL === 'FINAL_HUMAN_AUTHORITY_BINDING_FAIL');
assert('STATUSES.READY defined', STATUSES.READY === 'FINAL_HUMAN_AUTHORITY_BINDING_READY');

// --- null/undefined/empty input blocked ---
assert('null blocked', build(null).status === STATUSES.BLOCKED_INPUT);
assert('undefined blocked', build(undefined).status === STATUSES.BLOCKED_INPUT);
assert('empty object blocked', build({}).status === STATUSES.BLOCKED_INPUT);
assert('missing binding_id blocked', build(validInput({ final_human_authority_binding_id: undefined })).status === STATUSES.BLOCKED_INPUT);
assert('missing contract_id blocked', build(validInput({ real_release_execution_decision_contract_id: undefined })).status === STATUSES.BLOCKED_INPUT);
assert('missing authority_id blocked', build(validInput({ authority_id: undefined })).status === STATUSES.BLOCKED_INPUT);
assert('missing authority_actor blocked', build(validInput({ authority_actor: undefined })).status === STATUSES.BLOCKED_INPUT);
assert('missing authority_reason blocked', build(validInput({ authority_reason: undefined })).status === STATUSES.BLOCKED_INPUT);
assert('missing authority_mode blocked', build(validInput({ authority_mode: undefined })).status === STATUSES.BLOCKED_INPUT);

// --- decision contract not ready blocked ---
assert('contract_ready false blocked', build(validInput({ real_release_execution_decision_contract_ready: false })).status === STATUSES.BLOCKED_DECISION);
assert('contract_ready undefined blocked', build(validInput({ real_release_execution_decision_contract_ready: undefined })).status === STATUSES.BLOCKED_DECISION);
assert('contract_ready null blocked', build(validInput({ real_release_execution_decision_contract_ready: null })).status === STATUSES.BLOCKED_DECISION);
assert('blocked_decision has errors', build(validInput({ real_release_execution_decision_contract_ready: false })).errors.length > 0);

// --- fail cases ---
assert('invalid authority_mode fails', build(validInput({ authority_mode: 'execute' })).status === STATUSES.FAIL);
assert('empty authority_items fails', build(validInput({ authority_items: [] })).status === STATUSES.FAIL);
assert('non-array authority_items fails', build(validInput({ authority_items: null })).status === STATUSES.FAIL);
assert('item missing authority_item_id fails', build(validInput({ authority_items: [{ authority_type: 'human_operator', authority_mode: 'metadata-only', authority_hash: makeHash(1) }] })).status === STATUSES.FAIL);
assert('invalid authority_type fails', build(validInput({ authority_items: [{ authority_item_id: 'x', authority_type: 'super_admin', authority_mode: 'metadata-only', authority_hash: makeHash(1) }] })).status === STATUSES.FAIL);
assert('invalid item authority_mode fails', build(validInput({ authority_items: [{ authority_item_id: 'x', authority_type: 'human_operator', authority_mode: 'execute', authority_hash: makeHash(1) }] })).status === STATUSES.FAIL);
assert('invalid hash fails', build(validInput({ authority_items: [{ authority_item_id: 'x', authority_type: 'human_operator', authority_mode: 'metadata-only', authority_hash: 'bad' }] })).status === STATUSES.FAIL);
assert('missing controls fails', build(validInput({ required_authority_controls: [] })).status === STATUSES.FAIL);
assert('partial controls fails', build(validInput({ required_authority_controls: ['final-human-authority-required'] })).status === STATUSES.FAIL);
assert('uppercase hash fails', build(validInput({ authority_items: [{ authority_item_id: 'x', authority_type: 'human_operator', authority_mode: 'metadata-only', authority_hash: 'A'.repeat(64) }] })).status === STATUSES.FAIL);

// --- allowed modes ---
for (const mode of ['blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op']) {
  assert(`mode ${mode} accepted`, build(validInput({ authority_mode: mode })).status === STATUSES.READY);
}

// --- allowed authority_types ---
for (const atype of ['human_operator', 'release_manager', 'security_reviewer', 'governance_reviewer', 'pass_gold_reviewer', 'rollback_reviewer', 'production_reviewer', 'emergency_stop_reviewer']) {
  const r = build(validInput({ authority_items: [{ authority_item_id: 'x', authority_type: atype, authority_mode: 'metadata-only', authority_hash: makeHash(1) }] }));
  assert(`authority_type ${atype} accepted`, r.status === STATUSES.READY);
}

// --- ready path ---
const ready = build(validInput());
assert('ready status', ready.status === STATUSES.READY);
assert('ready errors empty', ready.errors.length === 0);
assert('ready has hash', typeof ready.hash === 'string');
assert('ready hash 64 chars', ready.hash.length === 64);
assert('ready hash hex', /^[0-9a-f]{64}$/.test(ready.hash));
assert('ready schema_version', ready.schema_version === 'v397');
assert('ready binding_id preserved', ready.final_human_authority_binding_id === 'binding-001');
assert('ready contract_id preserved', ready.real_release_execution_decision_contract_id === 'contract-v396');

// --- hash deterministic ---
const ready2 = build(validInput());
assert('hash deterministic', ready.hash === ready2.hash);

// --- hash changes with different input ---
const readyAlt = build(validInput({ final_human_authority_binding_id: 'binding-002' }));
assert('hash differs on different id', ready.hash !== readyAlt.hash);

// --- validate ---
assert('validate ready true', validate(ready) === true);
assert('validate null false', validate(null) === false);
assert('validate undefined false', validate(undefined) === false);
assert('validate blocked false', validate(build(validInput({ real_release_execution_decision_contract_ready: false }))) === false);
assert('validate fail false', validate(build(validInput({ required_authority_controls: [] }))) === false);

// --- render ---
const rendered = render(ready);
assert('render returns string', typeof rendered === 'string');
assert('render contains REGRA ABSOLUTA', rendered.includes('SEM PASS GOLD REAL → não promove, não libera, não marca stable.'));
assert('render contains status', rendered.includes(STATUSES.READY));
assert('render null safe', typeof render(null) === 'string');
assert('render null contains REGRA ABSOLUTA', render(null).includes('SEM PASS GOLD REAL'));

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

// --- authority not granted ---
assert('authority not granted in blocked', blocked.final_human_authority_granted === false);
assert('authority not granted in ready', ready.final_human_authority_granted === false);
assert('authority not bound in blocked', blocked.final_human_authority_bound === false);
assert('authority not bound in ready', ready.final_human_authority_bound === false);

// --- fail state invariants ---
const fail = build(validInput({ required_authority_controls: [] }));
assert('fail final_human_authority_bound false', fail.final_human_authority_bound === false);
assert('fail final_human_authority_granted false', fail.final_human_authority_granted === false);
assert('fail real_release_execution_authorized false', fail.real_release_execution_authorized === false);
assert('fail production_touched false', fail.production_touched === false);

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
