#!/usr/bin/env node
/**
 * Sandbox Operation Policy — V51.1
 *
 * Defines which operations are allowed/blocked within a release execution sandbox.
 * Never permits real git tag, push, deploy, or stable promotion.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 */

const SCHEMA_VERSION = 'v51.1';

export const POLICY_STATUSES = [
  'POLICY_BLOCKED_SANDBOX',
  'POLICY_BLOCKED_OPERATION',
  'POLICY_BLOCKED_WRITE_ROOT',
  'POLICY_ALLOWED_SIMULATION',
];

export const SANDBOX_ALLOWED_OPERATIONS = [
  'read_handoff',
  'read_evidence',
  'simulate_tag_name',
  'simulate_release_notes',
  'simulate_stable_pointer',
  'simulate_rollback_anchor',
  'write_sandbox_report',
  'append_sandbox_ledger_event',
];

export const SANDBOX_BLOCKED_OPERATIONS = [
  'git_tag_create',
  'git_push',
  'deploy_execute',
  'stable_promote',
  'production_write',
  'secret_read',
  'token_export',
  'evidence_override',
  'go_core_override',
];

function _locked() {
  return {
    deploy_allowed:            false,
    promotion_allowed:         false,
    stable_allowed:            false,
    tag_allowed:               false,
    release_execution_allowed: false,
    release_performed:         false,
    tag_created:               false,
    stable_promoted:           false,
    deploy_performed:          false,
    sandbox_only:              true,
    rehearsal_only:            true,
    safe_simulation_only:      true,
  };
}

function _isAllowedWriteRoot(root) {
  if (!root || typeof root !== 'string') return false;
  const normalized = root.replace(/\\/g, '/').toLowerCase();
  return (
    normalized.startsWith('temp/sandbox/') ||
    normalized.startsWith('temp/rehearsal/') ||
    normalized.startsWith('.sandbox/')
  );
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Create a sandbox operation policy from a sandbox contract.
 */
export function createSandboxOperationPolicy(params = {}) {
  const { sandbox, fixture_mode = false, _mock_timestamp } = params ?? {};

  if (fixture_mode) {
    return {
      schema_version:       SCHEMA_VERSION,
      policy_status:        'POLICY_ALLOWED_SIMULATION',
      policy_ready:         true,
      sandbox_id:           'fixture-sandbox-id',
      allowed_operations:   SANDBOX_ALLOWED_OPERATIONS,
      blocked_operations:   SANDBOX_BLOCKED_OPERATIONS,
      blocking_reason:      null,
      ..._locked(),
    };
  }

  if (!sandbox || !sandbox.sandbox_ready) {
    return {
      schema_version:       SCHEMA_VERSION,
      policy_status:        'POLICY_BLOCKED_SANDBOX',
      policy_ready:         false,
      blocking_reason:      'sandbox_not_ready',
      ..._locked(),
    };
  }

  return {
    schema_version:       SCHEMA_VERSION,
    policy_status:        'POLICY_ALLOWED_SIMULATION',
    policy_ready:         true,
    sandbox_id:           sandbox.sandbox_id,
    allowed_operations:   SANDBOX_ALLOWED_OPERATIONS,
    blocked_operations:   SANDBOX_BLOCKED_OPERATIONS,
    blocking_reason:      null,
    ..._locked(),
  };
}

/**
 * Evaluate whether a specific operation is allowed.
 */
export function evaluateSandboxOperation(params = {}) {
  const { policy, operation, write_root, fixture_mode = false } = params ?? {};

  if (fixture_mode) {
    const isBlocked = SANDBOX_BLOCKED_OPERATIONS.includes(operation);
    return {
      schema_version:       SCHEMA_VERSION,
      operation,
      operation_allowed:    !isBlocked,
      operation_blocked:    isBlocked,
      blocking_reason:      isBlocked ? `operation_blocked:${operation}` : null,
      simulated:            !isBlocked,
      ..._locked(),
    };
  }

  if (!policy || !policy.policy_ready) {
    return {
      schema_version:       SCHEMA_VERSION,
      operation,
      operation_allowed:    false,
      operation_blocked:    true,
      blocking_reason:      'policy_not_ready',
      ..._locked(),
    };
  }

  if (SANDBOX_BLOCKED_OPERATIONS.includes(operation)) {
    return {
      schema_version:       SCHEMA_VERSION,
      operation,
      operation_allowed:    false,
      operation_blocked:    true,
      blocking_reason:      `operation_blocked:${operation}`,
      simulated:            false,
      ..._locked(),
    };
  }

  // Check write root if provided
  if (write_root && !_isAllowedWriteRoot(write_root)) {
    return {
      schema_version:       SCHEMA_VERSION,
      operation,
      operation_allowed:    false,
      operation_blocked:    true,
      blocking_reason:      `write_root_not_allowed:${write_root}`,
      policy_status:        'POLICY_BLOCKED_WRITE_ROOT',
      ..._locked(),
    };
  }

  return {
    schema_version:       SCHEMA_VERSION,
    operation,
    operation_allowed:    true,
    operation_blocked:    false,
    blocking_reason:      null,
    simulated:            true,
    ..._locked(),
  };
}

/**
 * Validate a policy object.
 */
export function validateSandboxOperationPolicy(policy) {
  if (!policy || typeof policy !== 'object') {
    return {
      schema_version:  SCHEMA_VERSION,
      policy_status:   'POLICY_BLOCKED_SANDBOX',
      policy_ready:    false,
      blocking_reason: 'policy_null_or_not_object',
      ..._locked(),
    };
  }
  if (policy.policy_ready !== true) {
    return {
      schema_version:  SCHEMA_VERSION,
      policy_status:   policy.policy_status ?? 'POLICY_BLOCKED_SANDBOX',
      policy_ready:    false,
      blocking_reason: 'policy_not_ready',
      ..._locked(),
    };
  }
  return {
    schema_version:  SCHEMA_VERSION,
    policy_status:   'POLICY_ALLOWED_SIMULATION',
    policy_ready:    true,
    blocking_reason: null,
    ..._locked(),
  };
}

/**
 * Render policy summary.
 */
export function renderSandboxOperationPolicy(policy) {
  if (!policy) return 'policy: null';
  const lines = [
    `policy_status      : ${policy.policy_status ?? 'UNKNOWN'}`,
    `sandbox_id         : ${policy.sandbox_id ?? 'none'}`,
    `allowed_ops        : ${(policy.allowed_operations ?? []).length}`,
    `blocked_ops        : ${(policy.blocked_operations ?? []).length}`,
    `safe_sim_only      : true`,
    `deploy_allowed     : false`,
    `blocking_reason    : ${policy.blocking_reason ?? 'none'}`,
  ];
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('sandbox-operation-policy.mjs')) {
  const args = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = createSandboxOperationPolicy({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderSandboxOperationPolicy(result));
  }

  process.exit(result.policy_ready ? 0 : 1);
}
