import { STATUSES, build, validate, render } from '../../software-factory/software-factory-pass-gold-real-evidence-revalidation-gate.mjs';

let passed = 0;
let failed = 0;
function assert(label, cond) {
  if (cond) { passed++; }
  else { failed++; console.error(`  FAIL: ${label}`); }
}

const VALID_HASH = 'c'.repeat(63) + '0';
function makeHash(n) { return VALID_HASH.slice(0, 63) + String(n % 10); }

const REQUIRED_CONTROLS = [
  'pass-gold-real-evidence-required',
  'human-authority-binding-required',
  'no-pass-gold-fabrication',
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
    pass_gold_real_evidence_revalidation_gate_id: 'revalidation-gate-001',
    final_human_authority_binding_id: 'binding-v397',
    final_human_authority_binding_ready: true,
    pass_gold_evidence_items: [
      {
        evidence_id: 'ev-001',
        evidence_type: 'pass_gold_receipt',
        evidence_mode: 'metadata-only',
        evidence_hash: makeHash(1),
        source: 'v345-pass-gold-module',
      },
    ],
    required_pass_gold_controls: [...REQUIRED_CONTROLS],
    revalidation_level: 'standard',
    ...overrides,
  };
}

// --- exports ---
assert('exports STATUSES', typeof STATUSES === 'object');
assert('exports build', typeof build === 'function');
assert('exports validate', typeof validate === 'function');
assert('exports render', typeof render === 'function');

// --- statuses ---
assert('STATUSES.BLOCKED_INPUT defined', STATUSES.BLOCKED_INPUT === 'PASS_GOLD_REAL_EVIDENCE_REVALIDATION_BLOCKED_INPUT');
assert('STATUSES.BLOCKED_AUTHORITY defined', STATUSES.BLOCKED_AUTHORITY === 'PASS_GOLD_REAL_EVIDENCE_REVALIDATION_BLOCKED_AUTHORITY');
assert('STATUSES.FAIL defined', STATUSES.FAIL === 'PASS_GOLD_REAL_EVIDENCE_REVALIDATION_FAIL');
assert('STATUSES.READY defined', STATUSES.READY === 'PASS_GOLD_REAL_EVIDENCE_REVALIDATION_READY');

// --- null/undefined/empty input blocked ---
assert('null blocked', build(null).status === STATUSES.BLOCKED_INPUT);
assert('undefined blocked', build(undefined).status === STATUSES.BLOCKED_INPUT);
assert('empty object blocked', build({}).status === STATUSES.BLOCKED_INPUT);
assert('missing gate_id blocked', build(validInput({ pass_gold_real_evidence_revalidation_gate_id: undefined })).status === STATUSES.BLOCKED_INPUT);
assert('missing binding_id blocked', build(validInput({ final_human_authority_binding_id: undefined })).status === STATUSES.BLOCKED_INPUT);
assert('missing revalidation_level blocked', build(validInput({ revalidation_level: undefined })).status === STATUSES.BLOCKED_INPUT);

// --- authority not ready blocked ---
assert('authority_ready false blocked', build(validInput({ final_human_authority_binding_ready: false })).status === STATUSES.BLOCKED_AUTHORITY);
assert('authority_ready undefined blocked', build(validInput({ final_human_authority_binding_ready: undefined })).status === STATUSES.BLOCKED_AUTHORITY);
assert('authority_ready null blocked', build(validInput({ final_human_authority_binding_ready: null })).status === STATUSES.BLOCKED_AUTHORITY);
assert('blocked_authority has errors', build(validInput({ final_human_authority_binding_ready: false })).errors.length > 0);

// --- fail cases ---
assert('empty evidence_items fails', build(validInput({ pass_gold_evidence_items: [] })).status === STATUSES.FAIL);
assert('non-array evidence_items fails', build(validInput({ pass_gold_evidence_items: null })).status === STATUSES.FAIL);
assert('item missing evidence_id fails', build(validInput({ pass_gold_evidence_items: [{ evidence_type: 'pass_gold_receipt', evidence_mode: 'metadata-only', evidence_hash: makeHash(1), source: 's' }] })).status === STATUSES.FAIL);
assert('invalid evidence_type fails', build(validInput({ pass_gold_evidence_items: [{ evidence_id: 'x', evidence_type: 'bad_type', evidence_mode: 'metadata-only', evidence_hash: makeHash(1), source: 's' }] })).status === STATUSES.FAIL);
assert('invalid evidence_mode fails', build(validInput({ pass_gold_evidence_items: [{ evidence_id: 'x', evidence_type: 'pass_gold_receipt', evidence_mode: 'execute', evidence_hash: makeHash(1), source: 's' }] })).status === STATUSES.FAIL);
assert('invalid hash fails', build(validInput({ pass_gold_evidence_items: [{ evidence_id: 'x', evidence_type: 'pass_gold_receipt', evidence_mode: 'metadata-only', evidence_hash: 'bad', source: 's' }] })).status === STATUSES.FAIL);
assert('missing source fails', build(validInput({ pass_gold_evidence_items: [{ evidence_id: 'x', evidence_type: 'pass_gold_receipt', evidence_mode: 'metadata-only', evidence_hash: makeHash(1) }] })).status === STATUSES.FAIL);
assert('missing controls fails', build(validInput({ required_pass_gold_controls: [] })).status === STATUSES.FAIL);
assert('partial controls fails', build(validInput({ required_pass_gold_controls: ['pass-gold-real-evidence-required'] })).status === STATUSES.FAIL);
assert('uppercase hash fails', build(validInput({ pass_gold_evidence_items: [{ evidence_id: 'x', evidence_type: 'pass_gold_receipt', evidence_mode: 'metadata-only', evidence_hash: 'C'.repeat(64), source: 's' }] })).status === STATUSES.FAIL);

// --- allowed evidence_types ---
for (const etype of ['backend_evidence_receipt', 'go_core_evidence_receipt', 'runtime_evidence_receipt', 'pass_gold_receipt', 'audit_receipt', 'release_drill_receipt', 'human_authority_receipt', 'rollback_receipt']) {
  const r = build(validInput({ pass_gold_evidence_items: [{ evidence_id: 'x', evidence_type: etype, evidence_mode: 'metadata-only', evidence_hash: makeHash(1), source: 'src' }] }));
  assert(`evidence_type ${etype} accepted`, r.status === STATUSES.READY);
}

// --- allowed evidence_modes ---
for (const mode of ['blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op']) {
  const r = build(validInput({ pass_gold_evidence_items: [{ evidence_id: 'x', evidence_type: 'pass_gold_receipt', evidence_mode: mode, evidence_hash: makeHash(1), source: 'src' }] }));
  assert(`evidence_mode ${mode} accepted`, r.status === STATUSES.READY);
}

// --- ready path ---
const ready = build(validInput());
assert('ready status', ready.status === STATUSES.READY);
assert('ready errors empty', ready.errors.length === 0);
assert('ready has hash', typeof ready.hash === 'string');
assert('ready hash 64 chars', ready.hash.length === 64);
assert('ready hash hex', /^[0-9a-f]{64}$/.test(ready.hash));
assert('ready schema_version', ready.schema_version === 'v398');
assert('ready gate_id preserved', ready.pass_gold_real_evidence_revalidation_gate_id === 'revalidation-gate-001');
assert('ready binding_id preserved', ready.final_human_authority_binding_id === 'binding-v397');

// --- hash deterministic ---
const ready2 = build(validInput());
assert('hash deterministic', ready.hash === ready2.hash);

// --- hash changes ---
const readyAlt = build(validInput({ pass_gold_real_evidence_revalidation_gate_id: 'gate-002' }));
assert('hash differs on different id', ready.hash !== readyAlt.hash);

// --- validate ---
assert('validate ready true', validate(ready) === true);
assert('validate null false', validate(null) === false);
assert('validate undefined false', validate(undefined) === false);
assert('validate blocked false', validate(build(validInput({ final_human_authority_binding_ready: false }))) === false);
assert('validate fail false', validate(build(validInput({ required_pass_gold_controls: [] }))) === false);

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

// --- PASS GOLD not fabricated ---
assert('pass_gold_real_evidence_revalidated false in blocked', blocked.pass_gold_real_evidence_revalidated === false);
assert('pass_gold_real_evidence_revalidated false in ready', ready.pass_gold_real_evidence_revalidated === false);
assert('release_allowed false in ready', ready.release_allowed === false);
assert('real_execution_allowed false in ready', ready.real_execution_allowed === false);

// --- blocked_authority invariants ---
const blockedAuth = build(validInput({ final_human_authority_binding_ready: false }));
assert('blocked_auth pass_gold_real_evidence_revalidated false', blockedAuth.pass_gold_real_evidence_revalidated === false);
assert('blocked_auth release_allowed false', blockedAuth.release_allowed === false);
assert('blocked_auth production_touched false', blockedAuth.production_touched === false);

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
