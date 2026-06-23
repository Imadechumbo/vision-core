import { STATUSES, build, validate, render } from '../../software-factory/software-factory-real-release-execution-decision-contract.mjs';

let passed = 0;
let failed = 0;
function assert(label, cond) {
  if (cond) { passed++; }
  else { failed++; console.error(`  FAIL: ${label}`); }
}

const VALID_HASH = 'a'.repeat(63) + '0';
function makeHash(n) { return VALID_HASH.slice(0, 63) + String(n % 10); }

const REQUIRED_CONTROLS = [
  'real-release-decision-contract-required',
  'supervised-drill-required',
  'metadata-only-decision',
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
  'human-authority-required',
  'pass-gold-real-required',
  'audit-required',
];

function validInput(overrides = {}) {
  return {
    real_release_execution_decision_contract_id: 'contract-001',
    supervised_release_drill_phase_gate_id: 'gate-v395',
    supervised_release_drill_phase_gate_ready: true,
    decision_requested_by: 'human-operator',
    decision_reason: 'post-drill decision contract',
    decision_mode: 'metadata-only',
    decision_items: [
      {
        decision_id: 'di-001',
        decision_type: 'release_decision',
        decision_mode: 'metadata-only',
        decision_hash: makeHash(1),
      },
    ],
    required_decision_controls: [...REQUIRED_CONTROLS],
    ...overrides,
  };
}

// --- exports ---
assert('exports STATUSES', typeof STATUSES === 'object');
assert('exports build', typeof build === 'function');
assert('exports validate', typeof validate === 'function');
assert('exports render', typeof render === 'function');

// --- statuses ---
assert('STATUSES.BLOCKED_INPUT defined', STATUSES.BLOCKED_INPUT === 'REAL_RELEASE_EXECUTION_DECISION_BLOCKED_INPUT');
assert('STATUSES.BLOCKED_DRILL defined', STATUSES.BLOCKED_DRILL === 'REAL_RELEASE_EXECUTION_DECISION_BLOCKED_DRILL');
assert('STATUSES.FAIL defined', STATUSES.FAIL === 'REAL_RELEASE_EXECUTION_DECISION_FAIL');
assert('STATUSES.READY defined', STATUSES.READY === 'REAL_RELEASE_EXECUTION_DECISION_READY');

// --- null/undefined/empty input blocked ---
assert('null blocked', build(null).status === STATUSES.BLOCKED_INPUT);
assert('undefined blocked', build(undefined).status === STATUSES.BLOCKED_INPUT);
assert('empty object blocked', build({}).status === STATUSES.BLOCKED_INPUT);
assert('missing contract_id blocked', build(validInput({ real_release_execution_decision_contract_id: undefined })).status === STATUSES.BLOCKED_INPUT);
assert('missing gate_id blocked', build(validInput({ supervised_release_drill_phase_gate_id: undefined })).status === STATUSES.BLOCKED_INPUT);
assert('missing decision_requested_by blocked', build(validInput({ decision_requested_by: undefined })).status === STATUSES.BLOCKED_INPUT);
assert('missing decision_reason blocked', build(validInput({ decision_reason: undefined })).status === STATUSES.BLOCKED_INPUT);
assert('missing decision_mode blocked', build(validInput({ decision_mode: undefined })).status === STATUSES.BLOCKED_INPUT);

// --- drill not ready blocked ---
assert('gate_ready false blocked drill', build(validInput({ supervised_release_drill_phase_gate_ready: false })).status === STATUSES.BLOCKED_DRILL);
assert('gate_ready undefined blocked drill', build(validInput({ supervised_release_drill_phase_gate_ready: undefined })).status === STATUSES.BLOCKED_DRILL);
assert('gate_ready null blocked drill', build(validInput({ supervised_release_drill_phase_gate_ready: null })).status === STATUSES.BLOCKED_DRILL);
assert('blocked drill contains error', build(validInput({ supervised_release_drill_phase_gate_ready: false })).errors.length > 0);

// --- fail cases ---
assert('invalid decision_mode fails', build(validInput({ decision_mode: 'execute' })).status === STATUSES.FAIL);
assert('empty decision_items fails', build(validInput({ decision_items: [] })).status === STATUSES.FAIL);
assert('non-array decision_items fails', build(validInput({ decision_items: null })).status === STATUSES.FAIL);
assert('item missing decision_id fails', build(validInput({ decision_items: [{ decision_type: 'release_decision', decision_mode: 'metadata-only', decision_hash: makeHash(1) }] })).status === STATUSES.FAIL);
assert('invalid item decision_type fails', build(validInput({ decision_items: [{ decision_id: 'x', decision_type: 'invalid_type', decision_mode: 'metadata-only', decision_hash: makeHash(1) }] })).status === STATUSES.FAIL);
assert('invalid item decision_mode fails', build(validInput({ decision_items: [{ decision_id: 'x', decision_type: 'release_decision', decision_mode: 'execute', decision_hash: makeHash(1) }] })).status === STATUSES.FAIL);
assert('invalid hash fails', build(validInput({ decision_items: [{ decision_id: 'x', decision_type: 'release_decision', decision_mode: 'metadata-only', decision_hash: 'tooshort' }] })).status === STATUSES.FAIL);
assert('missing controls fails', build(validInput({ required_decision_controls: [] })).status === STATUSES.FAIL);
assert('partial controls fails', build(validInput({ required_decision_controls: ['real-release-decision-contract-required'] })).status === STATUSES.FAIL);
assert('hash uppercase fails', build(validInput({ decision_items: [{ decision_id: 'x', decision_type: 'release_decision', decision_mode: 'metadata-only', decision_hash: 'A'.repeat(64) }] })).status === STATUSES.FAIL);

// --- allowed modes ---
for (const mode of ['blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op']) {
  assert(`mode ${mode} accepted`, build(validInput({ decision_mode: mode })).status === STATUSES.READY);
}

// --- allowed decision_types ---
for (const dtype of ['release_decision', 'deployment_decision', 'tag_decision', 'stable_decision', 'artifact_decision', 'production_decision', 'rollback_decision', 'authority_decision', 'pass_gold_decision', 'emergency_stop_decision']) {
  const r = build(validInput({ decision_items: [{ decision_id: 'x', decision_type: dtype, decision_mode: 'metadata-only', decision_hash: makeHash(1) }] }));
  assert(`decision_type ${dtype} accepted`, r.status === STATUSES.READY);
}

// --- ready path ---
const ready = build(validInput());
assert('ready status', ready.status === STATUSES.READY);
assert('ready errors empty', ready.errors.length === 0);
assert('ready has hash', typeof ready.hash === 'string');
assert('ready hash 64 chars', ready.hash.length === 64);
assert('ready hash hex', /^[0-9a-f]{64}$/.test(ready.hash));
assert('ready schema_version', ready.schema_version === 'v396');
assert('ready contract_id preserved', ready.real_release_execution_decision_contract_id === 'contract-001');
assert('ready gate_id preserved', ready.supervised_release_drill_phase_gate_id === 'gate-v395');

// --- hash deterministic ---
const ready2 = build(validInput());
assert('hash deterministic', ready.hash === ready2.hash);

// --- hash changes with different input ---
const readyAlt = build(validInput({ real_release_execution_decision_contract_id: 'contract-002' }));
assert('hash differs on different id', ready.hash !== readyAlt.hash);

// --- validate ---
assert('validate ready true', validate(ready) === true);
assert('validate null false', validate(null) === false);
assert('validate undefined false', validate(undefined) === false);
assert('validate blocked false', validate(build(validInput({ supervised_release_drill_phase_gate_ready: false }))) === false);
assert('validate fail false', validate(build(validInput({ required_decision_controls: [] }))) === false);

// --- render ---
const rendered = render(ready);
assert('render returns string', typeof rendered === 'string');
assert('render contains REGRA ABSOLUTA', rendered.includes('SEM PASS GOLD REAL → não promove, não libera, não marca stable.'));
assert('render contains status', rendered.includes(STATUSES.READY));
assert('render null safe', typeof render(null) === 'string');
assert('render null contains REGRA ABSOLUTA', render(null).includes('SEM PASS GOLD REAL'));
assert('render blocked string', typeof render(build(validInput({ supervised_release_drill_phase_gate_ready: false }))) === 'string');

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

// --- no execution in blocked_drill ---
const blockedDrill = build(validInput({ supervised_release_drill_phase_gate_ready: false }));
assert('blocked_drill real_release_execution_decision_received false', blockedDrill.real_release_execution_decision_received === false);
assert('blocked_drill real_release_execution_authorized false', blockedDrill.real_release_execution_authorized === false);
assert('blocked_drill production_touched false', blockedDrill.production_touched === false);

// --- fail state invariants ---
const fail = build(validInput({ required_decision_controls: [] }));
assert('fail real_release_execution_decision_received false', fail.real_release_execution_decision_received === false);
assert('fail real_release_execution_authorized false', fail.real_release_execution_authorized === false);
assert('fail real_release_execution_allowed false', fail.real_release_execution_allowed === false);
assert('fail production_touched false', fail.production_touched === false);

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
