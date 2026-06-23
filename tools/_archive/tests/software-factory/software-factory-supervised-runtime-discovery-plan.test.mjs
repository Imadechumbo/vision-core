import assert from 'node:assert/strict';
import {
  STATUSES,
  build,
  validate,
  render,
} from '../../software-factory/software-factory-supervised-runtime-discovery-plan.mjs';

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (error) {
    console.error(`FAIL: ${name}`);
    console.error(`  ${error.message}`);
    throw error;
  }
}

test('STATUSES exported', () => {
  assert.ok(STATUSES);
  assert.ok(STATUSES.READY);
  assert.ok(STATUSES.BLOCKED_INPUT);
  assert.ok(STATUSES.BLOCKED_AUTHORIZATION);
  assert.ok(STATUSES.FAIL);
});

test('build exported', () => {
  assert.ok(build);
  assert.equal(typeof build, 'function');
});

test('validate exported', () => {
  assert.ok(validate);
  assert.equal(typeof validate, 'function');
});

test('render exported', () => {
  assert.ok(render);
  assert.equal(typeof render, 'function');
});

test('null input → BLOCKED_INPUT', () => {
  const result = build(null);
  assert.equal(result.status, STATUSES.BLOCKED_INPUT);
  assert.equal(result.ready, false);
  assert.ok(result.errors.includes('INPUT_NOT_OBJECT'));
});

test('rta0_authorization_plan_ready false → BLOCKED_AUTHORIZATION', () => {
  const result = build({
    rta0_authorization_plan_ready: false,
    discovery_plan: {},
    required_evidence: [],
    required_controls: []
  });
  assert.equal(result.status, STATUSES.BLOCKED_AUTHORIZATION);
  assert.equal(result.ready, false);
  assert.ok(result.errors.includes('RTA0_AUTHORIZATION_PLAN_NOT_READY'));
});

test('discovery_plan missing/not object → BLOCKED_INPUT', () => {
  let result = build({
    rta0_authorization_plan_ready: true,
    discovery_plan: null,
    required_evidence: [],
    required_controls: []
  });
  assert.ok(result.errors.includes('DISCOVERY_PLAN_NOT_OBJECT'));

  result = build({
    rta0_authorization_plan_ready: true,
    required_evidence: [],
    required_controls: []
  });
  assert.ok(result.errors.includes('DISCOVERY_PLAN_NOT_OBJECT'));
});

test('required_evidence not array → BLOCKED_INPUT', () => {
  const result = build({
    rta0_authorization_plan_ready: true,
    discovery_plan: {},
    required_evidence: 'not array',
    required_controls: []
  });
  assert.ok(result.errors.includes('REQUIRED_EVIDENCE_NOT_ARRAY'));
});

test('required_controls not array → BLOCKED_INPUT', () => {
  const result = build({
    rta0_authorization_plan_ready: true,
    discovery_plan: {},
    required_evidence: [],
    required_controls: 'not array'
  });
  assert.ok(result.errors.includes('REQUIRED_CONTROLS_NOT_ARRAY'));
});

test('each required discovery field false → FAIL', () => {
  const discovery_plan = {};
  const requiredFields = [
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
    'v471_remains_blocked'
  ];
  
  requiredFields.forEach(field => {
    discovery_plan[field] = false;
  });

  const result = build({
    rta0_authorization_plan_ready: true,
    discovery_plan,
    required_evidence: [],
    required_controls: []
  });

  assert.equal(result.status, STATUSES.FAIL);
  assert.ok(result.errors.some(e => e.includes('REQUIRED_DISCOVERY_FIELD_NOT_TRUE')));
});

test('missing required evidence → FAIL', () => {
  const result = build({
    rta0_authorization_plan_ready: true,
    discovery_plan: {
      package_scripts_inventory_declared: true,
      local_boot_command_candidates_declared: true,
      health_endpoint_candidates_declared: true,
      readiness_endpoint_candidates_declared: true,
      version_endpoint_candidates_declared: true,
      smoke_test_candidates_declared: true,
      rollback_readiness_candidates_declared: true,
      watchdog_signal_candidates_declared: true,
      evidence_capture_plan_declared: true,
      no_runtime_execution: true,
      no_network_probe: true,
      no_production_target: true,
      no_secret_loading: true,
      no_deploy_release_or_stable: true,
      v471_remains_blocked: true
    },
    required_evidence: ['missing-evidence'],
    required_controls: []
  });

  assert.equal(result.status, STATUSES.FAIL);
  assert.ok(result.errors.some(e => e.includes('MISSING_REQUIRED_EVIDENCE')));
});

test('missing required control → FAIL', () => {
  const result = build({
    rta0_authorization_plan_ready: true,
    discovery_plan: {
      package_scripts_inventory_declared: true,
      local_boot_command_candidates_declared: true,
      health_endpoint_candidates_declared: true,
      readiness_endpoint_candidates_declared: true,
      version_endpoint_candidates_declared: true,
      smoke_test_candidates_declared: true,
      rollback_readiness_candidates_declared: true,
      watchdog_signal_candidates_declared: true,
      evidence_capture_plan_declared: true,
      no_runtime_execution: true,
      no_network_probe: true,
      no_production_target: true,
      no_secret_loading: true,
      no_deploy_release_or_stable: true,
      v471_remains_blocked: true
    },
    required_evidence: [],
    required_controls: ['missing-control']
  });

  assert.equal(result.status, STATUSES.FAIL);
  assert.ok(result.errors.some(e => e.includes('MISSING_REQUIRED_CONTROL')));
});

test('valid input → READY', () => {
  const result = build({
    rta0_authorization_plan_ready: true,
    discovery_plan: {
      package_scripts_inventory_declared: true,
      local_boot_command_candidates_declared: true,
      health_endpoint_candidates_declared: true,
      readiness_endpoint_candidates_declared: true,
      version_endpoint_candidates_declared: true,
      smoke_test_candidates_declared: true,
      rollback_readiness_candidates_declared: true,
      watchdog_signal_candidates_declared: true,
      evidence_capture_plan_declared: true,
      no_runtime_execution: true,
      no_network_probe: true,
      no_production_target: true,
      no_secret_loading: true,
      no_deploy_release_or_stable: true,
      v471_remains_blocked: true
    },
    required_evidence: [
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
      'v471-blocked-proof'
    ],
    required_controls: [
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
      'human-authorization-required-before-runtime'
    ]
  });

  assert.equal(result.status, STATUSES.READY);
  assert.equal(result.ready, true);
  assert.equal(result.module_version, 'RTA-1');
  assert.equal(result.supervised_runtime_discovery_plan_ready, true);
  assert.equal(result.rta0_authorization_plan_ready, true);
  assert.equal(result.runtime_execution_authorized, false);
  assert.equal(result.runtime_discovery_execution_allowed, false);
  assert.equal(result.pass_gold_real_achieved, false);
  assert.equal(result.v471_allowed, false);
  assert.equal(result.release_allowed, false);
  assert.equal(result.deploy_allowed, false);
  assert.equal(result.tag_allowed, false);
  assert.equal(result.stable_promotion_allowed, false);
  assert.equal(result.production_touched, false);
  assert.equal(result.billing_execution_allowed, false);
  assert.equal(result.secret_access_allowed, false);
  assert.equal(result.network_allowed, false);
  assert.equal(result.rollback_execution_allowed, false);
});

test('module_version === RTA-1', () => {
  const result = build({
    rta0_authorization_plan_ready: true,
    discovery_plan: {
      package_scripts_inventory_declared: true,
      local_boot_command_candidates_declared: true,
      health_endpoint_candidates_declared: true,
      readiness_endpoint_candidates_declared: true,
      version_endpoint_candidates_declared: true,
      smoke_test_candidates_declared: true,
      rollback_readiness_candidates_declared: true,
      watchdog_signal_candidates_declared: true,
      evidence_capture_plan_declared: true,
      no_runtime_execution: true,
      no_network_probe: true,
      no_production_target: true,
      no_secret_loading: true,
      no_deploy_release_or_stable: true,
      v471_remains_blocked: true
    },
    required_evidence: [
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
      'v471-blocked-proof'
    ],
    required_controls: [
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
      'human-authorization-required-before-runtime'
    ]
  });

  assert.equal(result.module_version, 'RTA-1');
});

test('supervised_runtime_discovery_plan_ready true', () => {
  const result = build({
    rta0_authorization_plan_ready: true,
    discovery_plan: {
      package_scripts_inventory_declared: true,
      local_boot_command_candidates_declared: true,
      health_endpoint_candidates_declared: true,
      readiness_endpoint_candidates_declared: true,
      version_endpoint_candidates_declared: true,
      smoke_test_candidates_declared: true,
      rollback_readiness_candidates_declared: true,
      watchdog_signal_candidates_declared: true,
      evidence_capture_plan_declared: true,
      no_runtime_execution: true,
      no_network_probe: true,
      no_production_target: true,
      no_secret_loading: true,
      no_deploy_release_or_stable: true,
      v471_remains_blocked: true
    },
    required_evidence: [
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
      'v471-blocked-proof'
    ],
    required_controls: [
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
      'human-authorization-required-before-runtime'
    ]
  });

  assert.equal(result.supervised_runtime_discovery_plan_ready, true);
});

test('runtime_execution_authorized false', () => {
  const result = build({
    rta0_authorization_plan_ready: true,
    discovery_plan: {
      package_scripts_inventory_declared: true,
      local_boot_command_candidates_declared: true,
      health_endpoint_candidates_declared: true,
      readiness_endpoint_candidates_declared: true,
      version_endpoint_candidates_declared: true,
      smoke_test_candidates_declared: true,
      rollback_readiness_candidates_declared: true,
      watchdog_signal_candidates_declared: true,
      evidence_capture_plan_declared: true,
      no_runtime_execution: true,
      no_network_probe: true,
      no_production_target: true,
      no_secret_loading: true,
      no_deploy_release_or_stable: true,
      v471_remains_blocked: true
    },
    required_evidence: [
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
      'v471-blocked-proof'
    ],
    required_controls: [
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
      'human-authorization-required-before-runtime'
    ]
  });

  assert.equal(result.runtime_execution_authorized, false);
});

test('runtime_discovery_execution_allowed false', () => {
  const result = build({
    rta0_authorization_plan_ready: true,
    discovery_plan: {
      package_scripts_inventory_declared: true,
      local_boot_command_candidates_declared: true,
      health_endpoint_candidates_declared: true,
      readiness_endpoint_candidates_declared: true,
      version_endpoint_candidates_declared: true,
      smoke_test_candidates_declared: true,
      rollback_readiness_candidates_declared: true,
      watchdog_signal_candidates_declared: true,
      evidence_capture_plan_declared: true,
      no_runtime_execution: true,
      no_network_probe: true,
      no_production_target: true,
      no_secret_loading: true,
      no_deploy_release_or_stable: true,
      v471_remains_blocked: true
    },
    required_evidence: [
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
      'v471-blocked-proof'
    ],
    required_controls: [
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
      'human-authorization-required-before-runtime'
    ]
  });

  assert.equal(result.runtime_discovery_execution_allowed, false);
});

test('pass_gold_real_achieved false', () => {
  const result = build({
    rta0_authorization_plan_ready: true,
    discovery_plan: {
      package_scripts_inventory_declared: true,
      local_boot_command_candidates_declared: true,
      health_endpoint_candidates_declared: true,
      readiness_endpoint_candidates_declared: true,
      version_endpoint_candidates_declared: true,
      smoke_test_candidates_declared: true,
      rollback_readiness_candidates_declared: true,
      watchdog_signal_candidates_declared: true,
      evidence_capture_plan_declared: true,
      no_runtime_execution: true,
      no_network_probe: true,
      no_production_target: true,
      no_secret_loading: true,
      no_deploy_release_or_stable: true,
      v471_remains_blocked: true
    },
    required_evidence: [
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
      'v471-blocked-proof'
    ],
    required_controls: [
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
      'human-authorization-required-before-runtime'
    ]
  });

  assert.equal(result.pass_gold_real_achieved, false);
});

test('v471_allowed false', () => {
  const result = build({
    rta0_authorization_plan_ready: true,
    discovery_plan: {
      package_scripts_inventory_declared: true,
      local_boot_command_candidates_declared: true,
      health_endpoint_candidates_declared: true,
      readiness_endpoint_candidates_declared: true,
      version_endpoint_candidates_declared: true,
      smoke_test_candidates_declared: true,
      rollback_readiness_candidates_declared: true,
      watchdog_signal_candidates_declared: true,
      evidence_capture_plan_declared: true,
      no_runtime_execution: true,
      no_network_probe: true,
      no_production_target: true,
      no_secret_loading: true,
      no_deploy_release_or_stable: true,
      v471_remains_blocked: true
    },
    required_evidence: [
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
      'v471-blocked-proof'
    ],
    required_controls: [
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
      'human-authorization-required-before-runtime'
    ]
  });

  assert.equal(result.v471_allowed, false);
});

test('all dangerous flags false', () => {
  const result = build({
    rta0_authorization_plan_ready: true,
    discovery_plan: {
      package_scripts_inventory_declared: true,
      local_boot_command_candidates_declared: true,
      health_endpoint_candidates_declared: true,
      readiness_endpoint_candidates_declared: true,
      version_endpoint_candidates_declared: true,
      smoke_test_candidates_declared: true,
      rollback_readiness_candidates_declared: true,
      watchdog_signal_candidates_declared: true,
      evidence_capture_plan_declared: true,
      no_runtime_execution: true,
      no_network_probe: true,
      no_production_target: true,
      no_secret_loading: true,
      no_deploy_release_or_stable: true,
      v471_remains_blocked: true
    },
    required_evidence: [
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
      'v471-blocked-proof'
    ],
    required_controls: [
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
      'human-authorization-required-before-runtime'
    ]
  });

  assert.equal(result.release_allowed, false);
  assert.equal(result.deploy_allowed, false);
  assert.equal(result.tag_allowed, false);
  assert.equal(result.stable_promotion_allowed, false);
  assert.equal(result.production_touched, false);
  assert.equal(result.billing_execution_allowed, false);
  assert.equal(result.secret_access_allowed, false);
  assert.equal(result.network_allowed, false);
  assert.equal(result.rollback_execution_allowed, false);
});

test('evidence_hash is 64 chars', () => {
  const result = build({
    rta0_authorization_plan_ready: true,
    discovery_plan: {
      package_scripts_inventory_declared: true,
      local_boot_command_candidates_declared: true,
      health_endpoint_candidates_declared: true,
      readiness_endpoint_candidates_declared: true,
      version_endpoint_candidates_declared: true,
      smoke_test_candidates_declared: true,
      rollback_readiness_candidates_declared: true,
      watchdog_signal_candidates_declared: true,
      evidence_capture_plan_declared: true,
      no_runtime_execution: true,
      no_network_probe: true,
      no_production_target: true,
      no_secret_loading: true,
      no_deploy_release_or_stable: true,
      v471_remains_blocked: true
    },
    required_evidence: [
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
      'v471-blocked-proof'
    ],
    required_controls: [
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
      'human-authorization-required-before-runtime'
    ]
  });

  assert.equal(result.evidence_hash.length, 64);
});

test('evidence_hash deterministic', () => {
  const input1 = {
    rta0_authorization_plan_ready: true,
    discovery_plan: {
      package_scripts_inventory_declared: true,
      local_boot_command_candidates_declared: true,
      health_endpoint_candidates_declared: true,
      readiness_endpoint_candidates_declared: true,
      version_endpoint_candidates_declared: true,
      smoke_test_candidates_declared: true,
      rollback_readiness_candidates_declared: true,
      watchdog_signal_candidates_declared: true,
      evidence_capture_plan_declared: true,
      no_runtime_execution: true,
      no_network_probe: true,
      no_production_target: true,
      no_secret_loading: true,
      no_deploy_release_or_stable: true,
      v471_remains_blocked: true
    },
    required_evidence: [
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
      'v471-blocked-proof'
    ],
    required_controls: [
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
      'human-authorization-required-before-runtime'
    ]
  };

  const input2 = { ...input1 };

  const result1 = build(input1);
  const result2 = build(input2);

  assert.equal(result1.evidence_hash, result2.evidence_hash);
});

test('final_message exact', () => {
  const result = build({
    rta0_authorization_plan_ready: true,
    discovery_plan: {
      package_scripts_inventory_declared: true,
      local_boot_command_candidates_declared: true,
      health_endpoint_candidates_declared: true,
      readiness_endpoint_candidates_declared: true,
      version_endpoint_candidates_declared: true,
      smoke_test_candidates_declared: true,
      rollback_readiness_candidates_declared: true,
      watchdog_signal_candidates_declared: true,
      evidence_capture_plan_declared: true,
      no_runtime_execution: true,
      no_network_probe: true,
      no_production_target: true,
      no_secret_loading: true,
      no_deploy_release_or_stable: true,
      v471_remains_blocked: true
    },
    required_evidence: [
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
      'v471-blocked-proof'
    ],
    required_controls: [
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
      'human-authorization-required-before-runtime'
    ]
  });

  assert.equal(
    result.final_message,
    'RTA-1 supervised runtime discovery plan prepared. Discovery remains metadata-only; runtime execution requires explicit human authorization.'
  );
});

test('validate READY → true', () => {
  const result = build({
    rta0_authorization_plan_ready: true,
    discovery_plan: {
      package_scripts_inventory_declared: true,
      local_boot_command_candidates_declared: true,
      health_endpoint_candidates_declared: true,
      readiness_endpoint_candidates_declared: true,
      version_endpoint_candidates_declared: true,
      smoke_test_candidates_declared: true,
      rollback_readiness_candidates_declared: true,
      watchdog_signal_candidates_declared: true,
      evidence_capture_plan_declared: true,
      no_runtime_execution: true,
      no_network_probe: true,
      no_production_target: true,
      no_secret_loading: true,
      no_deploy_release_or_stable: true,
      v471_remains_blocked: true
    },
    required_evidence: [
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
      'v471-blocked-proof'
    ],
    required_controls: [
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
      'human-authorization-required-before-runtime'
    ]
  });

  assert.equal(validate(result), true);
});

test('validate blocked/invalid → false', () => {
  const blockedResult = build(null);
  assert.equal(validate(blockedResult), false);

  const invalidResult = build({
    rta0_authorization_plan_ready: false,
    discovery_plan: {},
    required_evidence: [],
    required_controls: []
  });
  assert.equal(validate(invalidResult), false);
});

test('render contains RTA-1', () => {
  const result = build({
    rta0_authorization_plan_ready: true,
    discovery_plan: {
      package_scripts_inventory_declared: true,
      local_boot_command_candidates_declared: true,
      health_endpoint_candidates_declared: true,
      readiness_endpoint_candidates_declared: true,
      version_endpoint_candidates_declared: true,
      smoke_test_candidates_declared: true,
      rollback_readiness_candidates_declared: true,
      watchdog_signal_candidates_declared: true,
      evidence_capture_plan_declared: true,
      no_runtime_execution: true,
      no_network_probe: true,
      no_production_target: true,
      no_secret_loading: true,
      no_deploy_release_or_stable: true,
      v471_remains_blocked: true
    },
    required_evidence: [
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
      'v471-blocked-proof'
    ],
    required_controls: [
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
      'human-authorization-required-before-runtime'
    ]
  });

  assert.ok(render(result).includes('RTA-1'));
});

test('render contains RTA-0 authorization', () => {
  const result = build({
    rta0_authorization_plan_ready: true,
    discovery_plan: {
      package_scripts_inventory_declared: true,
      local_boot_command_candidates_declared: true,
      health_endpoint_candidates_declared: true,
      readiness_endpoint_candidates_declared: true,
      version_endpoint_candidates_declared: true,
      smoke_test_candidates_declared: true,
      rollback_readiness_candidates_declared: true,
      watchdog_signal_candidates_declared: true,
      evidence_capture_plan_declared: true,
      no_runtime_execution: true,
      no_network_probe: true,
      no_production_target: true,
      no_secret_loading: true,
      no_deploy_release_or_stable: true,
      v471_remains_blocked: true
    },
    required_evidence: [
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
      'v471-blocked-proof'
    ],
    required_controls: [
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
      'human-authorization-required-before-runtime'
    ]
  });

  assert.ok(render(result).includes('RTA-0 authorization'));
});

test('render contains discovery remains metadata-only', () => {
  const result = build({
    rta0_authorization_plan_ready: true,
    discovery_plan: {
      package_scripts_inventory_declared: true,
      local_boot_command_candidates_declared: true,
      health_endpoint_candidates_declared: true,
      readiness_endpoint_candidates_declared: true,
      version_endpoint_candidates_declared: true,
      smoke_test_candidates_declared: true,
      rollback_readiness_candidates_declared: true,
      watchdog_signal_candidates_declared: true,
      evidence_capture_plan_declared: true,
      no_runtime_execution: true,
      no_network_probe: true,
      no_production_target: true,
      no_secret_loading: true,
      no_deploy_release_or_stable: true,
      v471_remains_blocked: true
    },
    required_evidence: [
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
      'v471-blocked-proof'
    ],
    required_controls: [
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
      'human-authorization-required-before-runtime'
    ]
  });

  assert.ok(render(result).includes('discovery remains metadata-only'));
});

test('render contains runtime execution requires explicit human authorization', () => {
  const result = build({
    rta0_authorization_plan_ready: true,
    discovery_plan: {
      package_scripts_inventory_declared: true,
      local_boot_command_candidates_declared: true,
      health_endpoint_candidates_declared: true,
      readiness_endpoint_candidates_declared: true,
      version_endpoint_candidates_declared: true,
      smoke_test_candidates_declared: true,
      rollback_readiness_candidates_declared: true,
      watchdog_signal_candidates_declared: true,
      evidence_capture_plan_declared: true,
      no_runtime_execution: true,
      no_network_probe: true,
      no_production_target: true,
      no_secret_loading: true,
      no_deploy_release_or_stable: true,
      v471_remains_blocked: true
    },
    required_evidence: [
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
      'v471-blocked-proof'
    ],
    required_controls: [
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
      'human-authorization-required-before-runtime'
    ]
  });

  assert.ok(render(result).includes('runtime execution requires explicit human authorization'));
});

test('render contains V471 blocked', () => {
  const result = build({
    rta0_authorization_plan_ready: true,
    discovery_plan: {
      package_scripts_inventory_declared: true,
      local_boot_command_candidates_declared: true,
      health_endpoint_candidates_declared: true,
      readiness_endpoint_candidates_declared: true,
      version_endpoint_candidates_declared: true,
      smoke_test_candidates_declared: true,
      rollback_readiness_candidates_declared: true,
      watchdog_signal_candidates_declared: true,
      evidence_capture_plan_declared: true,
      no_runtime_execution: true,
      no_network_probe: true,
      no_production_target: true,
      no_secret_loading: true,
      no_deploy_release_or_stable: true,
      v471_remains_blocked: true
    },
    required_evidence: [
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
      'v471-blocked-proof'
    ],
    required_controls: [
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
      'human-authorization-required-before-runtime'
    ]
  });

  assert.ok(render(result).includes('V471 blocked'));
});

test('render contains final_message', () => {
  const result = build({
    rta0_authorization_plan_ready: true,
    discovery_plan: {
      package_scripts_inventory_declared: true,
      local_boot_command_candidates_declared: true,
      health_endpoint_candidates_declared: true,
      readiness_endpoint_candidates_declared: true,
      version_endpoint_candidates_declared: true,
      smoke_test_candidates_declared: true,
      rollback_readiness_candidates_declared: true,
      watchdog_signal_candidates_declared: true,
      evidence_capture_plan_declared: true,
      no_runtime_execution: true,
      no_network_probe: true,
      no_production_target: true,
      no_secret_loading: true,
      no_deploy_release_or_stable: true,
      v471_remains_blocked: true
    },
    required_evidence: [
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
      'v471-blocked-proof'
    ],
    required_controls: [
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
      'human-authorization-required-before-runtime'
    ]
  });

  assert.ok(render(result).includes('final_message='));
});

test('render contains REGRA ABSOLUTA', () => {
  const result = build({
    rta0_authorization_plan_ready: true,
    discovery_plan: {
      package_scripts_inventory_declared: true,
      local_boot_command_candidates_declared: true,
      health_endpoint_candidates_declared: true,
      readiness_endpoint_candidates_declared: true,
      version_endpoint_candidates_declared: true,
      smoke_test_candidates_declared: true,
      rollback_readiness_candidates_declared: true,
      watchdog_signal_candidates_declared: true,
      evidence_capture_plan_declared: true,
      no_runtime_execution: true,
      no_network_probe: true,
      no_production_target: true,
      no_secret_loading: true,
      no_deploy_release_or_stable: true,
      v471_remains_blocked: true
    },
    required_evidence: [
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
      'v471-blocked-proof'
    ],
    required_controls: [
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
      'human-authorization-required-before-runtime'
    ]
  });

  assert.ok(render(result).includes('REGRA ABSOLUTA'));
});

console.log('=== TESTING RTA-1 SUPERVISED RUNTIME DISCOVERY PLAN ===');