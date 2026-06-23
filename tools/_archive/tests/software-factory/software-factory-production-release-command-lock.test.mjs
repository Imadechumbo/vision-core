import { STATUSES, build, validate, render } from '../../software-factory/software-factory-production-release-command-lock.mjs';

let passed = 0;
let failed = 0;
function assert(label, cond) {
  if (cond) { passed++; }
  else { failed++; console.error(`  FAIL: ${label}`); }
}

const VALID_HASH = 'd'.repeat(63) + '0';
function makeHash(n) { return VALID_HASH.slice(0, 63) + String(n % 10); }

const REQUIRED_CONTROLS = [
  'production-release-command-lock-required',
  'pass-gold-revalidation-required',
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
];

function validInput(overrides = {}) {
  return {
    production_release_command_lock_id: 'cmd-lock-001',
    pass_gold_real_evidence_revalidation_gate_id: 'revalidation-v398',
    pass_gold_real_evidence_revalidation_gate_ready: true,
    command_lock_items: [
      {
        lock_id: 'lock-001',
        lock_type: 'release_command_lock',
        lock_mode: 'metadata-only',
        lock_hash: makeHash(1),
      },
    ],
    required_command_lock_controls: [...REQUIRED_CONTROLS],
    command_lock_level: 'production',
    ...overrides,
  };
}

// --- exports ---
assert('exports STATUSES', typeof STATUSES === 'object');
assert('exports build', typeof build === 'function');
assert('exports validate', typeof validate === 'function');
assert('exports render', typeof render === 'function');

// --- statuses ---
assert('STATUSES.BLOCKED_INPUT defined', STATUSES.BLOCKED_INPUT === 'PRODUCTION_RELEASE_COMMAND_LOCK_BLOCKED_INPUT');
assert('STATUSES.BLOCKED_PASS_GOLD defined', STATUSES.BLOCKED_PASS_GOLD === 'PRODUCTION_RELEASE_COMMAND_LOCK_BLOCKED_PASS_GOLD');
assert('STATUSES.FAIL defined', STATUSES.FAIL === 'PRODUCTION_RELEASE_COMMAND_LOCK_FAIL');
assert('STATUSES.READY defined', STATUSES.READY === 'PRODUCTION_RELEASE_COMMAND_LOCK_READY');

// --- null/undefined/empty input blocked ---
assert('null blocked', build(null).status === STATUSES.BLOCKED_INPUT);
assert('undefined blocked', build(undefined).status === STATUSES.BLOCKED_INPUT);
assert('empty object blocked', build({}).status === STATUSES.BLOCKED_INPUT);
assert('missing lock_id blocked', build(validInput({ production_release_command_lock_id: undefined })).status === STATUSES.BLOCKED_INPUT);
assert('missing gate_id blocked', build(validInput({ pass_gold_real_evidence_revalidation_gate_id: undefined })).status === STATUSES.BLOCKED_INPUT);
assert('missing lock_level blocked', build(validInput({ command_lock_level: undefined })).status === STATUSES.BLOCKED_INPUT);

// --- pass gold gate not ready blocked ---
assert('gate_ready false blocked', build(validInput({ pass_gold_real_evidence_revalidation_gate_ready: false })).status === STATUSES.BLOCKED_PASS_GOLD);
assert('gate_ready undefined blocked', build(validInput({ pass_gold_real_evidence_revalidation_gate_ready: undefined })).status === STATUSES.BLOCKED_PASS_GOLD);
assert('gate_ready null blocked', build(validInput({ pass_gold_real_evidence_revalidation_gate_ready: null })).status === STATUSES.BLOCKED_PASS_GOLD);
assert('blocked_pass_gold has errors', build(validInput({ pass_gold_real_evidence_revalidation_gate_ready: false })).errors.length > 0);

// --- fail cases ---
assert('empty lock_items fails', build(validInput({ command_lock_items: [] })).status === STATUSES.FAIL);
assert('non-array lock_items fails', build(validInput({ command_lock_items: null })).status === STATUSES.FAIL);
assert('item missing lock_id fails', build(validInput({ command_lock_items: [{ lock_type: 'release_command_lock', lock_mode: 'metadata-only', lock_hash: makeHash(1) }] })).status === STATUSES.FAIL);
assert('invalid lock_type fails', build(validInput({ command_lock_items: [{ lock_id: 'x', lock_type: 'bad_lock', lock_mode: 'metadata-only', lock_hash: makeHash(1) }] })).status === STATUSES.FAIL);
assert('invalid lock_mode fails', build(validInput({ command_lock_items: [{ lock_id: 'x', lock_type: 'release_command_lock', lock_mode: 'execute', lock_hash: makeHash(1) }] })).status === STATUSES.FAIL);
assert('invalid lock_hash fails', build(validInput({ command_lock_items: [{ lock_id: 'x', lock_type: 'release_command_lock', lock_mode: 'metadata-only', lock_hash: 'bad' }] })).status === STATUSES.FAIL);
assert('missing controls fails', build(validInput({ required_command_lock_controls: [] })).status === STATUSES.FAIL);
assert('partial controls fails', build(validInput({ required_command_lock_controls: ['production-release-command-lock-required'] })).status === STATUSES.FAIL);
assert('uppercase hash fails', build(validInput({ command_lock_items: [{ lock_id: 'x', lock_type: 'release_command_lock', lock_mode: 'metadata-only', lock_hash: 'D'.repeat(64) }] })).status === STATUSES.FAIL);

// --- allowed lock_types ---
for (const ltype of ['release_command_lock', 'deploy_command_lock', 'tag_command_lock', 'stable_command_lock', 'artifact_command_lock', 'production_command_lock', 'rollback_command_lock', 'emergency_stop_lock']) {
  const r = build(validInput({ command_lock_items: [{ lock_id: 'x', lock_type: ltype, lock_mode: 'metadata-only', lock_hash: makeHash(1) }] }));
  assert(`lock_type ${ltype} accepted`, r.status === STATUSES.READY);
}

// --- allowed lock_modes ---
for (const mode of ['blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op']) {
  const r = build(validInput({ command_lock_items: [{ lock_id: 'x', lock_type: 'release_command_lock', lock_mode: mode, lock_hash: makeHash(1) }] }));
  assert(`lock_mode ${mode} accepted`, r.status === STATUSES.READY);
}

// --- ready path ---
const ready = build(validInput());
assert('ready status', ready.status === STATUSES.READY);
assert('ready errors empty', ready.errors.length === 0);
assert('ready has hash', typeof ready.hash === 'string');
assert('ready hash 64 chars', ready.hash.length === 64);
assert('ready hash hex', /^[0-9a-f]{64}$/.test(ready.hash));
assert('ready schema_version', ready.schema_version === 'v399');
assert('ready lock_id preserved', ready.production_release_command_lock_id === 'cmd-lock-001');
assert('ready gate_id preserved', ready.pass_gold_real_evidence_revalidation_gate_id === 'revalidation-v398');

// --- hash deterministic ---
const ready2 = build(validInput());
assert('hash deterministic', ready.hash === ready2.hash);

// --- hash changes ---
const readyAlt = build(validInput({ production_release_command_lock_id: 'cmd-lock-002' }));
assert('hash differs on different id', ready.hash !== readyAlt.hash);

// --- validate ---
assert('validate ready true', validate(ready) === true);
assert('validate null false', validate(null) === false);
assert('validate undefined false', validate(undefined) === false);
assert('validate blocked false', validate(build(validInput({ pass_gold_real_evidence_revalidation_gate_ready: false }))) === false);
assert('validate fail false', validate(build(validInput({ required_command_lock_controls: [] }))) === false);

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

// --- command not executed ---
assert('production_release_command_locked false blocked', blocked.production_release_command_locked === false);
assert('production_release_command_locked false ready', ready.production_release_command_locked === false);
assert('production_release_command_executed false blocked', blocked.production_release_command_executed === false);
assert('production_release_command_executed false ready', ready.production_release_command_executed === false);

// --- blocked_pass_gold invariants ---
const blockedPG = build(validInput({ pass_gold_real_evidence_revalidation_gate_ready: false }));
assert('blocked_pg production_release_command_locked false', blockedPG.production_release_command_locked === false);
assert('blocked_pg production_release_command_executed false', blockedPG.production_release_command_executed === false);
assert('blocked_pg real_release_execution_allowed false', blockedPG.real_release_execution_allowed === false);
assert('blocked_pg production_touched false', blockedPG.production_touched === false);

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
