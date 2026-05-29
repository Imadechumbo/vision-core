import crypto from 'node:crypto';

const MODULE_VERSION = 'RTP-2';

export const STATUSES = Object.freeze({
  READY: 'PASS_GOLD_REAL_REVIEW_RECEIPT_READY',
  BLOCKED_INPUT: 'PASS_GOLD_REAL_REVIEW_RECEIPT_BLOCKED_INPUT',
  BLOCKED_RTP1: 'PASS_GOLD_REAL_REVIEW_RECEIPT_BLOCKED_RTP1',
  FAIL: 'PASS_GOLD_REAL_REVIEW_RECEIPT_FAIL'
});

export function build(input = {}) {
  const {
    smoke_flow_rollback_readiness_evidence_ready = false,
    runtime_truth_probe_result_bound = false,
    smoke_flow_result_bound = false,
    rollback_readiness_result_bound = false,
    human_authority_bound = false,
    pass_gold_real_achieved = false,
    stable_promotion_allowed = false,
    release_allowed = false,
    deploy_allowed = false,
    tag_allowed = false,
    production_touched = false,
    billing_execution_allowed = false,
    secret_access_allowed = false,
    network_allowed = false,
    rollback_execution_allowed = false
  } = input;

  const evidence_hash = crypto.createHash('sha256')
    .update(JSON.stringify({
      module_version: MODULE_VERSION,
      smoke_flow_rollback_readiness_evidence_ready,
      runtime_truth_probe_result_bound,
      smoke_flow_result_bound,
      rollback_readiness_result_bound,
      human_authority_bound,
      pass_gold_real_achieved,
      stable_promotion_allowed,
      release_allowed,
      deploy_allowed,
      tag_allowed,
      production_touched,
      billing_execution_allowed,
      secret_access_allowed,
      network_allowed,
      rollback_execution_allowed,
      hash_schema: 'rtp2-pass-gold-real-review-receipt-v1'
    }))
    .digest('hex');

  if (!smoke_flow_rollback_readiness_evidence_ready) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      blocked_input: true,
      message: 'Smoke flow rollback readiness evidence not ready',
      evidence_hash
    };
  }

  if (!runtime_truth_probe_result_bound) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_RTP1,
      ready: false,
      blocked_rtp1: true,
      message: 'Runtime truth probe result not bound',
      evidence_hash
    };
  }

  if (!smoke_flow_result_bound) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      message: 'Smoke flow result not bound',
      evidence_hash
    };
  }

  if (!rollback_readiness_result_bound) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      message: 'Rollback readiness result not bound',
      evidence_hash
    };
  }

  if (!human_authority_bound) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      message: 'Human authority not bound',
      evidence_hash
    };
  }

  if (pass_gold_real_achieved) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      message: 'PASS GOLD REAL must not be achieved at review stage',
      evidence_hash
    };
  }

  if (stable_promotion_allowed) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      message: 'Stable promotion must not be allowed at review stage',
      evidence_hash
    };
  }

  if (release_allowed) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      message: 'Release must not be allowed at review stage',
      evidence_hash
    };
  }

  if (deploy_allowed) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      message: 'Deploy must not be allowed at review stage',
      evidence_hash
    };
  }

  if (tag_allowed) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      message: 'Tag must not be allowed at review stage',
      evidence_hash
    };
  }

  if (production_touched) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      message: 'Production must not be touched at review stage',
      evidence_hash
    };
  }

  if (billing_execution_allowed) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      message: 'Billing execution must not be allowed at review stage',
      evidence_hash
    };
  }

  if (secret_access_allowed) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      message: 'Secret access must not be allowed at review stage',
      evidence_hash
    };
  }

  if (network_allowed) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      message: 'Network access must not be allowed at review stage',
      evidence_hash
    };
  }

  if (rollback_execution_allowed) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      fail: true,
      message: 'Rollback execution must not be allowed at review stage',
      evidence_hash
    };
  }

  return {
    module_version: MODULE_VERSION,
    status: STATUSES.READY,
    ready: true,
    pass_gold_real_review_receipt_ready: true,
    smoke_flow_rollback_readiness_evidence_ready: true,
    runtime_truth_probe_result_bound: true,
    smoke_flow_result_bound: true,
    rollback_readiness_result_bound: true,
    human_authority_bound: true,
    pass_gold_real_review_ready: true,
    pass_gold_real_achieved: false,
    stable_promotion_allowed: false,
    release_allowed: false,
    deploy_allowed: false,
    tag_allowed: false,
    production_touched: false,
    billing_execution_allowed: false,
    secret_access_allowed: false,
    network_allowed: false,
    rollback_execution_allowed: false,
    v471_allowed: false,
    rta10_allowed: false,
    evidence_hash,
    final_message: 'RTP-2 PASS GOLD REAL review receipt prepared. Evidence is review-ready, but PASS GOLD REAL is not claimed and stable promotion remains blocked.'
  };
}

export function validate(result) {
  if (typeof result !== 'object' || result === null) {
    return false;
  }

  if (result.module_version !== MODULE_VERSION) {
    return false;
  }

  if (!Object.values(STATUSES).includes(result.status)) {
    return false;
  }

  if (typeof result.ready !== 'boolean') {
    return false;
  }

  if (result.status === STATUSES.READY) {
    const requiredFields = [
      'pass_gold_real_review_receipt_ready',
      'smoke_flow_rollback_readiness_evidence_ready',
      'runtime_truth_probe_result_bound',
      'smoke_flow_result_bound',
      'rollback_readiness_result_bound',
      'human_authority_bound',
      'pass_gold_real_review_ready',
      'pass_gold_real_achieved',
      'stable_promotion_allowed',
      'release_allowed',
      'deploy_allowed',
      'tag_allowed',
      'production_touched',
      'billing_execution_allowed',
      'secret_access_allowed',
      'network_allowed',
      'rollback_execution_allowed',
      'v471_allowed',
      'rta10_allowed',
      'evidence_hash',
      'final_message'
    ];

    for (const field of requiredFields) {
      if (!(field in result)) {
        return false;
      }
    }

    if (result.evidence_hash.length !== 64) {
      return false;
    }

    if (result.final_message !== 'RTP-2 PASS GOLD REAL review receipt prepared. Evidence is review-ready, but PASS GOLD REAL is not claimed and stable promotion remains blocked.') {
      return false;
    }

    if (result.pass_gold_real_review_receipt_ready !== true ||
        result.smoke_flow_rollback_readiness_evidence_ready !== true ||
        result.runtime_truth_probe_result_bound !== true ||
        result.smoke_flow_result_bound !== true ||
        result.rollback_readiness_result_bound !== true ||
        result.human_authority_bound !== true ||
        result.pass_gold_real_review_ready !== true ||
        result.pass_gold_real_achieved !== false ||
        result.stable_promotion_allowed !== false ||
        result.release_allowed !== false ||
        result.deploy_allowed !== false ||
        result.tag_allowed !== false ||
        result.production_touched !== false ||
        result.billing_execution_allowed !== false ||
        result.secret_access_allowed !== false ||
        result.network_allowed !== false ||
        result.rollback_execution_allowed !== false ||
        result.v471_allowed !== false ||
        result.rta10_allowed !== false) {
      return false;
    }
  }

  return true;
}

export function render(result) {
  const lines = [
    `=== RTP-2 PASS GOLD REAL Review Receipt ===`,
    `Module: ${result.module_version}`,
    `Status: ${result.status}`,
    `Ready: ${result.ready}`,
    ``,
    `Evidence Review Readiness:`,
    `  Smoke Flow Rollback Readiness: ${result.smoke_flow_rollback_readiness_evidence_ready ? 'READY' : 'NOT READY'}`,
    `  Runtime Truth Probe Result: ${result.runtime_truth_probe_result_bound ? 'BOUND' : 'NOT BOUND'}`,
    `  Smoke Flow Result: ${result.smoke_flow_result_bound ? 'BOUND' : 'NOT BOUND'}`,
    `  Rollback Readiness Result: ${result.rollback_readiness_result_bound ? 'BOUND' : 'NOT BOUND'}`,
    `  Human Authority Bound: ${result.human_authority_bound ? 'BOUND' : 'NOT BOUND'}`,
    ``,
    `PASS GOLD REAL Review Status:`,
    `  Review Receipt Ready: ${result.pass_gold_real_review_receipt_ready ? 'READY' : 'NOT READY'}`,
    `  Review Ready: ${result.pass_gold_real_review_ready ? 'READY' : 'NOT READY'}`,
    `  PASS GOLD REAL Achieved: ${result.pass_gold_real_achieved ? 'TRUE (INVALID)' : 'FALSE'}`,
    ``,
    `Review Stage Controls:`,
    `  Stable Promotion: ${result.stable_promotion_allowed ? 'ALLOWED (INVALID)' : 'BLOCKED'}`,
    `  Release: ${result.release_allowed ? 'ALLOWED (INVALID)' : 'BLOCKED'}`,
    `  Deploy: ${result.deploy_allowed ? 'ALLOWED (INVALID)' : 'BLOCKED'}`,
    `  Tag: ${result.tag_allowed ? 'ALLOWED (INVALID)' : 'BLOCKED'}`,
    `  Production Touched: ${result.production_touched ? 'YES (INVALID)' : 'NO'}`,
    ``,
    `Access Controls at Review Stage:`,
    `  Billing Execution: ${result.billing_execution_allowed ? 'ALLOWED (INVALID)' : 'BLOCKED'}`,
    `  Secret Access: ${result.secret_access_allowed ? 'ALLOWED (INVALID)' : 'BLOCKED'}`,
    `  Network Access: ${result.network_allowed ? 'ALLOWED (INVALID)' : 'BLOCKED'}`,
    `  Rollback Execution: ${result.rollback_execution_allowed ? 'ALLOWED (INVALID)' : 'BLOCKED'}`,
    ``,
    `Safety Controls:`,
    `  V471 Allowed: ${result.v471_allowed ? 'TRUE (BLOCKED)' : 'FALSE'}`,
    `  RTA-10 Allowed: ${result.rta10_allowed ? 'TRUE (BLOCKED)' : 'FALSE'}`,
    ``,
    `Evidence Hash: ${result.evidence_hash}`,
    ``,
    `Final Message: ${result.final_message}`,
    ``,
    `=== RTP-1 Evidence Dependency ===`,
    `RTP-1 smoke flow and rollback readiness evidence must be completed and bound.`,
    ``,
    `=== REGRA ABSOLUTA ===`,
    `SEM PASS GOLD REAL → não promove, não libera, não marca stable.`
  ];

  return lines.join('\n');
}

export default { STATUSES, build, validate, render };