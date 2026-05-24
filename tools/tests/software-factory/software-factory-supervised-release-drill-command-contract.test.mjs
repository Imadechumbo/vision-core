import { STATUSES, build, validate, render } from '../../software-factory/software-factory-supervised-release-drill-command-contract.mjs';

let passed = 0; let failed = 0;
function assert(cond, label) {
  if (cond) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const ALL_CONTROLS = [
  'supervised-release-drill-command-required',
  'firewall-consolidation-required',
  'explicit-v387-command-required',
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
  'human-approval-required',
  'pass-gold-required',
];

function validInput() {
  return {
    supervised_release_drill_command_contract_id: 'drill-cmd-v387-001',
    release_firewall_consolidation_phase_gate_id: 'phase-gate-v386-001',
    release_firewall_consolidation_phase_gate_ready: true,
    explicit_v387_drill_command: true,
    requested_by: 'release-authority-human',
    command_reason: 'Supervised drill after firewall consolidation V377-V386',
    command_mode: 'no-op',
    required_command_controls: [...ALL_CONTROLS],
  };
}

const MUST_FALSE_KEYS = [
  'supervised_release_drill_command_received',
  'release_drill_scope_bound', 'release_drill_plan_published',
  'release_drill_noop_executed', 'release_drill_result_verified',
  'release_drill_evidence_receipt_published', 'release_drill_risk_classified',
  'release_drill_final_authority_approved', 'supervised_release_drill_phase_passed',
  'release_firewall_consolidation_phase_passed', 'release_firewall_registry_published',
  'unified_firewall_snapshot_published', 'firewall_chain_integrity_confirmed',
  'firewall_dependency_graph_published', 'firewall_policy_bound',
  'unified_release_authority_report_published', 'firewall_evidence_index_published',
  'firewall_drift_detected', 'firewall_regression_guard_enabled',
  'unified_firewall_final_review_approved', 'release_execution_firewall_phase_passed',
  'release_execution_firewall_enabled', 'production_mutation_firewall_locked',
  'secret_access_firewall_locked', 'billing_execution_firewall_locked',
  'network_execution_firewall_locked', 'artifact_tag_stable_firewall_locked',
  'rollback_execution_firewall_locked', 'last_mile_noop_drill_completed',
  'firewall_evidence_receipt_published', 'firewall_final_authority_approved',
  'real_release_executed', 'real_deploy_executed', 'real_tag_created',
  'real_stable_promoted', 'artifact_published', 'production_touched',
  'billing_executed', 'secrets_accessed', 'network_accessed', 'rollback_executed',
  'release_allowed', 'deploy_allowed', 'stable_allowed', 'tag_allowed',
  'real_execution_allowed',
];

console.log('\n=== supervised-release-drill-command-contract tests ===\n');

console.log('--- exports ---');
assert(Array.isArray(STATUSES), 'STATUSES array');
assert(STATUSES.includes('SUPERVISED_RELEASE_DRILL_COMMAND_BLOCKED_INPUT'), 'B_INPUT status');
assert(STATUSES.includes('SUPERVISED_RELEASE_DRILL_COMMAND_BLOCKED_FIREWALL'), 'B_FIREWALL status');
assert(STATUSES.includes('SUPERVISED_RELEASE_DRILL_COMMAND_DENIED'), 'DENIED status');
assert(STATUSES.includes('SUPERVISED_RELEASE_DRILL_COMMAND_READY'), 'READY status');
assert(typeof build === 'function', 'build fn');
assert(typeof validate === 'function', 'validate fn');
assert(typeof render === 'function', 'render fn');

console.log('--- blocked input ---');
assert(build(null).errors[0].startsWith('SUPERVISED_RELEASE_DRILL_COMMAND_BLOCKED_INPUT'), 'null input');
assert(build({}).errors[0].startsWith('SUPERVISED_RELEASE_DRILL_COMMAND_BLOCKED_INPUT'), 'empty input');
const noId = validInput(); noId.supervised_release_drill_command_contract_id = '';
assert(build(noId).errors[0].startsWith('SUPERVISED_RELEASE_DRILL_COMMAND_BLOCKED_INPUT'), 'empty contract id');

console.log('--- blocked firewall ---');
const noGateId = validInput(); noGateId.release_firewall_consolidation_phase_gate_id = null;
assert(build(noGateId).errors[0].startsWith('SUPERVISED_RELEASE_DRILL_COMMAND_BLOCKED_FIREWALL'), 'missing gate id');
const gateNotReady = validInput(); gateNotReady.release_firewall_consolidation_phase_gate_ready = false;
assert(build(gateNotReady).errors[0].startsWith('SUPERVISED_RELEASE_DRILL_COMMAND_BLOCKED_FIREWALL'), 'gate not ready');

console.log('--- denied ---');
const noCmd = validInput(); noCmd.explicit_v387_drill_command = false;
assert(build(noCmd).errors[0].startsWith('SUPERVISED_RELEASE_DRILL_COMMAND_DENIED'), 'command not explicit');
const noBy = validInput(); noBy.requested_by = null;
assert(build(noBy).errors[0].startsWith('SUPERVISED_RELEASE_DRILL_COMMAND_DENIED'), 'missing requested_by');
const noReason = validInput(); noReason.command_reason = '';
assert(build(noReason).errors[0].startsWith('SUPERVISED_RELEASE_DRILL_COMMAND_DENIED'), 'missing reason');
const badMode = validInput(); badMode.command_mode = 'production';
assert(build(badMode).errors[0].startsWith('SUPERVISED_RELEASE_DRILL_COMMAND_DENIED'), 'bad command_mode');
const missingCtrl = validInput(); missingCtrl.required_command_controls = ['no-real-release'];
assert(build(missingCtrl).errors[0].startsWith('SUPERVISED_RELEASE_DRILL_COMMAND_DENIED'), 'missing controls');

console.log('--- ready ---');
const r = build(validInput());
assert(r.contract_ready === true, 'contract_ready');
assert(r.contract_hash && r.contract_hash.length === 64, 'hash 64 chars');
assert(r.command_mode === 'no-op', 'command_mode no-op');
assert(r.explicit_v387_drill_command === true, 'explicit command true');
assert(r.missing_controls.length === 0, 'no missing controls');
assert(r.final_message && r.final_message.includes('V387'), 'final message V387');
assert(r.final_message.includes('V377-V386'), 'final message references V377-V386');
assert(r.errors.length === 0, 'no errors');

console.log('--- all command modes accepted ---');
['blocked', 'metadata-only', 'contract-only', 'dry-run', 'planning', 'no-op'].forEach(mode => {
  const inp = validInput(); inp.command_mode = mode;
  assert(build(inp).contract_ready === true, `mode accepted: ${mode}`);
});

console.log('--- invariants always false ---');
MUST_FALSE_KEYS.forEach(k => {
  assert(r[k] === false, `${k} === false`);
});

console.log('--- validate ---');
assert(validate(r).valid === true, 'valid ready');
assert(validate(null).valid === false, 'null invalid');
assert(validate({}).valid === false, 'empty invalid');
const withError = { ...r, errors: ['something'] };
assert(validate(withError).valid === false, 'has errors invalid');

console.log('--- render ---');
const rend = render(r);
assert(typeof rend === 'string', 'render string');
assert(rend.includes('SUPERVISED_RELEASE_DRILL_COMMAND_READY'), 'render READY');
assert(rend.includes('REGRA ABSOLUTA'), 'render REGRA');
assert(rend.includes('supervised_release_drill_command_received: false'), 'cmd_received false in render');
assert(rend.includes('supervised_release_drill_phase_passed: false'), 'phase_passed false in render');
assert(render(null) === 'SUPERVISED_RELEASE_DRILL_COMMAND_BLOCKED_INPUT', 'null render');
const bfRend = render({ ...r, contract_ready: false, errors: ['SUPERVISED_RELEASE_DRILL_COMMAND_BLOCKED_FIREWALL: x'] });
assert(bfRend.includes('BLOCKED_FIREWALL'), 'blocked firewall render');
const deniedRend = render({ ...r, contract_ready: false, errors: ['SUPERVISED_RELEASE_DRILL_COMMAND_DENIED: x'] });
assert(deniedRend.includes('DENIED'), 'denied render');

console.log('--- deterministic ---');
assert(build(validInput()).contract_hash === build(validInput()).contract_hash, 'deterministic hash');

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
