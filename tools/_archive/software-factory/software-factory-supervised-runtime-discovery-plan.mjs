import crypto from 'node:crypto';

const MODULE_VERSION = 'RTA-1';

export const STATUSES = Object.freeze({
  READY: 'SUPERVISED_RUNTIME_DISCOVERY_PLAN_READY',
  BLOCKED_INPUT: 'SUPERVISED_RUNTIME_DISCOVERY_PLAN_BLOCKED_INPUT',
  BLOCKED_AUTHORIZATION: 'SUPERVISED_RUNTIME_DISCOVERY_PLAN_BLOCKED_AUTHORIZATION',
  FAIL: 'SUPERVISED_RUNTIME_DISCOVERY_PLAN_FAIL',
});

const REQUIRED_DISCOVERY_FIELDS = Object.freeze([
  'package_scripts_inventory_declared',
  'local_boot_command_candidates_declared',
  'health_endpoint_candidates_declared',
  'readiness_endpoint_candidates_declared',
  'version_endpoint_candidates_declared',
  'smoke_test_candidates_declared',
  'rollback_readiness_candidates_declared',
  'watchdog_signal_candidates_declared',
  'evidence_capture_plan_declared',
  'no_runtime_execution',
  'no_network_probe',
  'no_production_target',
  'no_secret_loading',
  'no_deploy_release_or_stable',
  'v471_remains_blocked',
]);

const REQUIRED_EVIDENCE = Object.freeze([
  'package-scripts-inventory',
  'local-boot-command-candidates',
  'health-endpoint-candidates',
  'readiness-endpoint-candidates',
  'version-endpoint-candidates',
  'smoke-test-candidates',
  'rollback-readiness-candidates',
  'watchdog-signal-candidates',
  'evidence-capture-plan',
  'no-runtime-execution-proof',
  'no-network-probe-proof',
  'no-production-target-proof',
  'v471-blocked-proof',
]);

const REQUIRED_CONTROLS = Object.freeze([
  'rta0-required',
  'runtime-discovery-only',
  'no-runtime-execution',
  'no-network-probe',
  'no-production-target',
  'no-secret-loading',
  'no-deploy-execution',
  'no-release-execution',
  'no-tag-creation',
  'no-stable-promotion',
  'no-real-rollback',
  'v471-blocked',
  'human-authorization-required-before-runtime',
]);

const FINAL_MESSAGE = 'RTA-1 supervised runtime discovery plan prepared. Discovery remains metadata-only; runtime execution requires explicit human authorization.';

export function build(input = {}) {
  const errors = [];

  // 1. Check if input is object
  if (typeof input !== 'object' || input === null) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_INPUT,
      ready: false,
      errors: ['INPUT_NOT_OBJECT'],
      supervised_runtime_discovery_plan_ready: false,
      rta0_authorization_plan_ready: false,
      runtime_execution_authorized: false,
      runtime_discovery_execution_allowed: false,
      pass_gold_real_achieved: false,
      v471_allowed: false,
      release_allowed: false,
      deploy_allowed: false,
      tag_allowed: false,
      stable_promotion_allowed: false,
      production_touched: false,
      billing_execution_allowed: false,
      secret_access_allowed: false,
      network_allowed: false,
      rollback_execution_allowed: false,
      evidence_hash: 'none',
      final_message: FINAL_MESSAGE,
    };
  }

  // 2. Check RTA-0 authorization plan ready
  if (input.rta0_authorization_plan_ready !== true) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.BLOCKED_AUTHORIZATION,
      ready: false,
      errors: ['RTA0_AUTHORIZATION_PLAN_NOT_READY'],
      supervised_runtime_discovery_plan_ready: false,
      rta0_authorization_plan_ready: false,
      runtime_execution_authorized: false,
      runtime_discovery_execution_allowed: false,
      pass_gold_real_achieved: false,
      v471_allowed: false,
      release_allowed: false,
      deploy_allowed: false,
      tag_allowed: false,
      stable_promotion_allowed: false,
      production_touched: false,
      billing_execution_allowed: false,
      secret_access_allowed: false,
      network_allowed: false,
      rollback_execution_allowed: false,
      evidence_hash: 'none',
      final_message: FINAL_MESSAGE,
    };
  }

  // 3. Check discovery_plan exists and is object
  if (!input.discovery_plan || typeof input.discovery_plan !== 'object') {
    errors.push('DISCOVERY_PLAN_NOT_OBJECT');
  }

  // 4. Check required_evidence is array
  if (!Array.isArray(input.required_evidence)) {
    errors.push('REQUIRED_EVIDENCE_NOT_ARRAY');
  }

  // 5. Check required_controls is array
  if (!Array.isArray(input.required_controls)) {
    errors.push('REQUIRED_CONTROLS_NOT_ARRAY');
  }

  // 6. Check each required discovery_plan field is true
  if (input.discovery_plan) {
    for (const field of REQUIRED_DISCOVERY_FIELDS) {
      if (input.discovery_plan[field] !== true) {
        errors.push(`REQUIRED_DISCOVERY_FIELD_NOT_TRUE: ${field}`);
      }
    }
  }

  // 7. Check missing required evidence
  if (input.required_evidence) {
    for (const evidence of REQUIRED_EVIDENCE) {
      if (!input.required_evidence.includes(evidence)) {
        errors.push(`MISSING_REQUIRED_EVIDENCE: ${evidence}`);
      }
    }
  }

  // 8. Check missing required controls
  if (input.required_controls) {
    for (const control of REQUIRED_CONTROLS) {
      if (!input.required_controls.includes(control)) {
        errors.push(`MISSING_REQUIRED_CONTROL: ${control}`);
      }
    }
  }

  // 9. Return FAIL if errors exist
  if (errors.length > 0) {
    return {
      module_version: MODULE_VERSION,
      status: STATUSES.FAIL,
      ready: false,
      errors,
      supervised_runtime_discovery_plan_ready: false,
      rta0_authorization_plan_ready: true,
      runtime_execution_authorized: false,
      runtime_discovery_execution_allowed: false,
      pass_gold_real_achieved: false,
      v471_allowed: false,
      release_allowed: false,
      deploy_allowed: false,
      tag_allowed: false,
      stable_promotion_allowed: false,
      production_touched: false,
      billing_execution_allowed: false,
      secret_access_allowed: false,
      network_allowed: false,
      rollback_execution_allowed: false,
      evidence_hash: 'none',
      final_message: FINAL_MESSAGE,
    };
  }

  // 10. Build deterministic evidence hash
  const evidence_string = input.required_evidence ? input.required_evidence.join('|') : '';
  const control_string = input.required_controls ? input.required_controls.join('|') : '';
  const hash_input = `${evidence_string}:${control_string}`;
  const evidence_hash = crypto.createHash('sha256').update(hash_input).digest('hex');

  // 11. Return READY
  return {
    module_version: MODULE_VERSION,
    status: STATUSES.READY,
    ready: true,
    supervised_runtime_discovery_plan_ready: true,
    rta0_authorization_plan_ready: true,
    runtime_execution_authorized: false,
    runtime_discovery_execution_allowed: false,
    pass_gold_real_achieved: false,
    v471_allowed: false,
    release_allowed: false,
    deploy_allowed: false,
    tag_allowed: false,
    stable_promotion_allowed: false,
    production_touched: false,
    billing_execution_allowed: false,
    secret_access_allowed: false,
    network_allowed: false,
    rollback_execution_allowed: false,
    evidence_hash,
    final_message: FINAL_MESSAGE,
  };
}

export function validate(result) {
  return Boolean(
    result &&
    result.module_version === MODULE_VERSION &&
    result.status === STATUSES.READY &&
    result.ready === true &&
    result.supervised_runtime_discovery_plan_ready === true &&
    result.rta0_authorization_plan_ready === true &&
    result.runtime_execution_authorized === false &&
    result.runtime_discovery_execution_allowed === false &&
    result.pass_gold_real_achieved === false &&
    result.v471_allowed === false &&
    result.release_allowed === false &&
    result.deploy_allowed === false &&
    result.tag_allowed === false &&
    result.stable_promotion_allowed === false &&
    result.production_touched === false &&
    result.billing_execution_allowed === false &&
    result.secret_access_allowed === false &&
    result.network_allowed === false &&
    result.rollback_execution_allowed === false &&
    result.evidence_hash &&
    result.evidence_hash.length === 64
  );
}

export function render(result) {
  if (!result) {
    return 'RTA-1 Supervised Runtime Discovery Plan: NO RESULT. REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.';
  }

  return [
    'RTA-1 Supervised Runtime Discovery Plan',
    'RTA-0 authorization',
    'discovery remains metadata-only',
    'runtime execution requires explicit human authorization',
    'V471 blocked',
    `status=${result.status}`,
    `ready=${result.ready}`,
    `supervised_runtime_discovery_plan_ready=${result.supervised_runtime_discovery_plan_ready}`,
    `rta0_authorization_plan_ready=${result.rta0_authorization_plan_ready}`,
    `runtime_execution_authorized=${result.runtime_execution_authorized}`,
    `runtime_discovery_execution_allowed=${result.runtime_discovery_execution_allowed}`,
    `pass_gold_real_achieved=${result.pass_gold_real_achieved}`,
    `v471_allowed=${result.v471_allowed}`,
    `release_allowed=${result.release_allowed}`,
    `deploy_allowed=${result.deploy_allowed}`,
    `tag_allowed=${result.tag_allowed}`,
    `stable_promotion_allowed=${result.stable_promotion_allowed}`,
    `production_touched=${result.production_touched}`,
    `billing_execution_allowed=${result.billing_execution_allowed}`,
    `secret_access_allowed=${result.secret_access_allowed}`,
    `network_allowed=${result.network_allowed}`,
    `rollback_execution_allowed=${result.rollback_execution_allowed}`,
    `evidence_hash=${result.evidence_hash || 'none'}`,
    `final_message=${result.final_message || 'none'}`,
    'REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.',
  ].join('\n');
}

export default {
  STATUSES,
  build,
  validate,
  render,
};