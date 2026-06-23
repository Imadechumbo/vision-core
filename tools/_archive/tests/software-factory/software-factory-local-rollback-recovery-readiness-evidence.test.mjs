import assert from 'node:assert/strict';
import { build, validate, render, STATUSES } from '../../software-factory/software-factory-local-rollback-recovery-readiness-evidence.mjs';

const VALID_INPUT = {
  local_smoke_flow_execution_evidence_ready: true,
  smoke_flow_execution_review_ready: true,
  operator_id: 'op-rte2-001',
  rollback_readiness_id: 'rbr-rte2-001',
  recovery_readiness_id: 'rcr-rte2-001',
  runtime_truth_receipt_id: 'rtr-rte2-001',
  smoke_flow_receipt_id: 'sfr-rte2-001',
};

// STATUSES shape
assert.ok(STATUSES.READY === 'LOCAL_ROLLBACK_RECOVERY_READINESS_EVIDENCE_READY');
assert.ok(STATUSES.BLOCKED_INPUT === 'LOCAL_ROLLBACK_RECOVERY_READINESS_EVIDENCE_BLOCKED_INPUT');
assert.ok(STATUSES.BLOCKED_RTE1 === 'LOCAL_ROLLBACK_RECOVERY_READINESS_EVIDENCE_BLOCKED_RTE1');
assert.ok(STATUSES.FAIL === 'LOCAL_ROLLBACK_RECOVERY_READINESS_EVIDENCE_FAIL');

// BLOCKED_INPUT — missing fields
{
  const r = build({});
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.equal(validate(r), false);
}

// BLOCKED_INPUT — missing operator_id only
{
  const r = build({ ...VALID_INPUT, operator_id: undefined });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.equal(validate(r), false);
}

// BLOCKED_INPUT — missing rollback_readiness_id
{
  const r = build({ ...VALID_INPUT, rollback_readiness_id: undefined });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.equal(validate(r), false);
}

// BLOCKED_INPUT — missing recovery_readiness_id
{
  const r = build({ ...VALID_INPUT, recovery_readiness_id: undefined });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.equal(validate(r), false);
}

// BLOCKED_INPUT — missing runtime_truth_receipt_id
{
  const r = build({ ...VALID_INPUT, runtime_truth_receipt_id: undefined });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.equal(validate(r), false);
}

// BLOCKED_INPUT — missing smoke_flow_receipt_id
{
  const r = build({ ...VALID_INPUT, smoke_flow_receipt_id: undefined });
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.equal(validate(r), false);
}

// BLOCKED_INPUT — no args
{
  const r = build();
  assert.equal(r.status, STATUSES.BLOCKED_INPUT);
  assert.equal(validate(r), false);
}

// BLOCKED_RTE1 — evidence not ready
{
  const r = build({ ...VALID_INPUT, local_smoke_flow_execution_evidence_ready: false });
  assert.equal(r.status, STATUSES.BLOCKED_RTE1);
  assert.equal(validate(r), false);
}

// BLOCKED_RTE1 — review not ready
{
  const r = build({ ...VALID_INPUT, smoke_flow_execution_review_ready: false });
  assert.equal(r.status, STATUSES.BLOCKED_RTE1);
  assert.equal(validate(r), false);
}

// BLOCKED_RTE1 — both false
{
  const r = build({
    ...VALID_INPUT,
    local_smoke_flow_execution_evidence_ready: false,
    smoke_flow_execution_review_ready: false,
  });
  assert.equal(r.status, STATUSES.BLOCKED_RTE1);
  assert.equal(validate(r), false);
}

// FAIL — empty operator_id
{
  const r = build({ ...VALID_INPUT, operator_id: '' });
  assert.equal(r.status, STATUSES.FAIL);
  assert.equal(validate(r), false);
}

// FAIL — empty rollback_readiness_id
{
  const r = build({ ...VALID_INPUT, rollback_readiness_id: '   ' });
  assert.equal(r.status, STATUSES.FAIL);
  assert.equal(validate(r), false);
}

// FAIL — empty recovery_readiness_id
{
  const r = build({ ...VALID_INPUT, recovery_readiness_id: '' });
  assert.equal(r.status, STATUSES.FAIL);
  assert.equal(validate(r), false);
}

// FAIL — empty runtime_truth_receipt_id
{
  const r = build({ ...VALID_INPUT, runtime_truth_receipt_id: '' });
  assert.equal(r.status, STATUSES.FAIL);
  assert.equal(validate(r), false);
}

// FAIL — empty smoke_flow_receipt_id
{
  const r = build({ ...VALID_INPUT, smoke_flow_receipt_id: '' });
  assert.equal(r.status, STATUSES.FAIL);
  assert.equal(validate(r), false);
}

// READY — valid input
{
  const r = build(VALID_INPUT);
  assert.equal(r.status, STATUSES.READY);
  assert.equal(r.module_version, 'RTE-2');

  // 25 evidence fields true
  assert.equal(r.local_scope_declared, true);
  assert.equal(r.operator_supervision_declared, true);
  assert.equal(r.rollback_readiness_declared, true);
  assert.equal(r.recovery_readiness_declared, true);
  assert.equal(r.rollback_execution_external_to_module, true);
  assert.equal(r.recovery_execution_external_to_module, true);
  assert.equal(r.evidence_capture_declared, true);
  assert.equal(r.rollback_target_declared, true);
  assert.equal(r.recovery_target_declared, true);
  assert.equal(r.restore_point_declared, true);
  assert.equal(r.pre_rollback_state_required, true);
  assert.equal(r.post_recovery_state_required, true);
  assert.equal(r.destructive_rollback_blocked, true);
  assert.equal(r.database_mutation_blocked, true);
  assert.equal(r.service_restart_blocked, true);
  assert.equal(r.runtime_truth_dependency_bound, true);
  assert.equal(r.smoke_flow_dependency_bound, true);
  assert.equal(r.production_scope_blocked, true);
  assert.equal(r.external_network_blocked, true);
  assert.equal(r.secrets_blocked, true);
  assert.equal(r.billing_blocked, true);
  assert.equal(r.deploy_release_tag_stable_blocked, true);
  assert.equal(r.pass_gold_real_not_claimed, true);
  assert.equal(r.v471_blocked, true);
  assert.equal(r.rta10_blocked, true);

  // receipt string fields
  assert.equal(r.operator_id, 'op-rte2-001');
  assert.equal(r.rollback_readiness_id, 'rbr-rte2-001');
  assert.equal(r.recovery_readiness_id, 'rcr-rte2-001');
  assert.equal(r.runtime_truth_receipt_id, 'rtr-rte2-001');
  assert.equal(r.smoke_flow_receipt_id, 'sfr-rte2-001');

  // receipt exact values
  assert.equal(r.execution_mode, 'manual-supervised-local');
  assert.equal(r.target_environment, 'local');

  // must-be-false receipt flags
  assert.equal(r.rollback_executed_by_module, false);
  assert.equal(r.recovery_executed_by_module, false);
  assert.equal(r.command_executed_by_module, false);
  assert.equal(r.endpoint_probe_performed_by_module, false);
  assert.equal(r.production_target, false);
  assert.equal(r.external_network_used, false);
  assert.equal(r.secrets_used, false);
  assert.equal(r.billing_used, false);
  assert.equal(r.rollback_executed, false);
  assert.equal(r.recovery_executed, false);
  assert.equal(r.database_mutated, false);
  assert.equal(r.service_restarted, false);
  assert.equal(r.deploy_used, false);
  assert.equal(r.release_used, false);
  assert.equal(r.tag_used, false);
  assert.equal(r.stable_promotion_used, false);

  // controls — all 23
  const requiredControls = [
    'rte1-required',
    'rte-path-chosen',
    'local-rollback-recovery-readiness-evidence-only',
    'manual-supervised-local-only',
    'rollback-execution-external-to-module',
    'recovery-execution-external-to-module',
    'no-module-runtime-execution',
    'no-module-rollback-execution',
    'no-module-recovery-execution',
    'no-endpoint-probe',
    'no-production-target',
    'no-external-network',
    'no-secret-loading',
    'no-billing-access',
    'no-database-mutation',
    'no-service-restart',
    'no-deploy-execution',
    'no-release-execution',
    'no-tag-creation',
    'no-stable-promotion',
    'pass-gold-real-not-claimed',
    'v471-blocked',
    'rta10-blocked',
  ];
  for (const ctrl of requiredControls) {
    assert.ok(r.controls.includes(ctrl), `missing control: ${ctrl}`);
  }

  // evidence hash — 64-char hex
  assert.equal(typeof r.evidence_hash, 'string');
  assert.equal(r.evidence_hash.length, 64);

  // final message exact
  assert.equal(
    r.final_message,
    'RTE-2 local rollback and recovery readiness evidence prepared. Rollback and recovery remain manual-supervised-local and external to the module; PASS GOLD REAL is not claimed.'
  );

  // validate true
  assert.equal(validate(r), true);
}

// validate — false for BLOCKED_INPUT result
{
  const r = build({});
  assert.equal(validate(r), false);
}

// validate — false for BLOCKED_RTE1 result
{
  const r = build({ ...VALID_INPUT, local_smoke_flow_execution_evidence_ready: false });
  assert.equal(validate(r), false);
}

// validate — false for null
assert.equal(validate(null), false);

// validate — false for empty object
assert.equal(validate({}), false);

// Determinism — same input → same hash
{
  const r1 = build(VALID_INPUT);
  const r2 = build(VALID_INPUT);
  assert.equal(r1.evidence_hash, r2.evidence_hash);
}

// Render — returns string with key sections
{
  const r = build(VALID_INPUT);
  const out = render(r);
  assert.equal(typeof out, 'string');
  assert.ok(out.includes('RTE-2'));
  assert.ok(out.includes(STATUSES.READY));
  assert.ok(out.includes('manual-supervised-local'));
  assert.ok(out.includes('local'));
  assert.ok(out.includes('op-rte2-001'));
  assert.ok(out.includes('rbr-rte2-001'));
  assert.ok(out.includes('rcr-rte2-001'));
  assert.ok(out.includes('PASS GOLD REAL is not claimed'));
  assert.ok(out.includes('REGRA ABSOLUTA'));
  assert.ok(out.includes('SEM PASS GOLD REAL'));
}

// Render BLOCKED_INPUT — no crash
{
  const r = build({});
  const out = render(r);
  assert.equal(typeof out, 'string');
  assert.ok(out.includes('RTE-2'));
}

console.log('All RTE-2 tests passed.');
