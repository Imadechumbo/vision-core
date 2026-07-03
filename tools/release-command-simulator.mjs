#!/usr/bin/env node
/**
 * Release Command Simulator — V51.2
 *
 * Simulates release commands inside a sandbox without spawning real
 * git tag/push/deploy processes. All command objects are synthetic.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 * real_commands_executed=false always.
 */

import { makeLockedFlags } from './_shared/gate-kit.mjs';

const SCHEMA_VERSION = 'v51.2';

export const COMMAND_SIM_STATUSES = [
  'COMMAND_SIM_BLOCKED_SANDBOX',
  'COMMAND_SIM_BLOCKED_POLICY',
  'COMMAND_SIM_BLOCKED_OPERATION',
  'COMMAND_SIM_READY',
];

export const SIMULATED_COMMAND_TYPES = [
  'git_status',
  'git_rev_parse_head',
  'git_tag_annotated',
  'git_push_tag',
  'update_stable_pointer',
  'generate_release_notes',
  'create_rollback_anchor',
];

function _locked() {
  return {
    ...makeLockedFlags([
      'deploy_allowed',
      'promotion_allowed',
      'stable_allowed',
      'tag_allowed',
      'release_execution_allowed',
      'release_performed',
      'tag_created',
      'stable_promoted',
      'deploy_performed',
      'real_commands_executed',
    ]),
    sandbox_only:   true,
    rehearsal_only: true,
  };
}

function _blocked(status, blocking_reason = 'blocked', extra = {}) {
  return {
    schema_version:         SCHEMA_VERSION,
    simulator_status:       status,
    simulator_ready:        false,
    blocking_reason,
    ..._locked(),
    ...extra,
    deploy_allowed:            false,
    promotion_allowed:         false,
    stable_allowed:            false,
    tag_allowed:               false,
    release_execution_allowed: false,
    release_performed:         false,
    tag_created:               false,
    stable_promoted:           false,
    deploy_performed:          false,
    real_commands_executed:    false,
    sandbox_only:              true,
    rehearsal_only:            true,
  };
}

function _buildSimulatedCommands(version, branch, head) {
  const v = version ?? '0.0.0-simulated';
  const b = branch ?? 'main';
  const h = head ?? 'simulated-head';
  return [
    {
      command_type:   'git_status',
      simulated:      true,
      executed:       false,
      real_action:    false,
      output:         `On branch ${b}\nnothing to commit, working tree clean`,
    },
    {
      command_type:   'git_rev_parse_head',
      simulated:      true,
      executed:       false,
      real_action:    false,
      output:         h,
    },
    {
      command_type:   'git_tag_annotated',
      simulated:      true,
      executed:       false,
      real_action:    false,
      command_args:   [`v${v}`, `-m`, `Release v${v}`],
      output:         `[SIMULATED] git tag -a v${v} -m "Release v${v}"`,
    },
    {
      command_type:   'git_push_tag',
      simulated:      true,
      executed:       false,
      real_action:    false,
      command_args:   ['origin', `v${v}`],
      output:         `[SIMULATED] git push origin v${v}`,
    },
    {
      command_type:   'update_stable_pointer',
      simulated:      true,
      executed:       false,
      real_action:    false,
      output:         `[SIMULATED] stable → v${v} @ ${h}`,
    },
    {
      command_type:   'generate_release_notes',
      simulated:      true,
      executed:       false,
      real_action:    false,
      output:         `Release v${v}\n[SIMULATED release notes for branch ${b}]`,
    },
    {
      command_type:   'create_rollback_anchor',
      simulated:      true,
      executed:       false,
      real_action:    false,
      output:         `[SIMULATED] rollback anchor @ ${h}`,
    },
  ];
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Run the release command simulator.
 */
export function runReleaseCommandSimulator(params = {}) {
  const {
    sandbox,
    policy,
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  if (fixture_mode) {
    const simCmds = _buildSimulatedCommands('1.0.0-fixture', 'main', 'fixture-head-sha');
    return {
      schema_version:          SCHEMA_VERSION,
      simulator_status:        'COMMAND_SIM_READY',
      simulator_ready:         true,
      sandbox_id:              'fixture-sandbox-id',
      simulated_commands:      simCmds,
      blocked_commands:        ['git_tag_create', 'git_push', 'deploy_execute', 'stable_promote'],
      simulated_tag_name:      'v1.0.0-fixture',
      simulated_stable_pointer: 'stable → v1.0.0-fixture @ fixture-head-sha',
      simulated_release_notes:  'Release v1.0.0-fixture\n[SIMULATED release notes for branch main]',
      simulated_rollback_anchor: 'rollback anchor @ fixture-head-sha',
      blocking_reason:          null,
      ..._locked(),
    };
  }

  if (!sandbox || !sandbox.sandbox_ready) {
    return _blocked('COMMAND_SIM_BLOCKED_SANDBOX', 'sandbox_not_ready');
  }

  if (!policy || !policy.policy_ready) {
    return _blocked('COMMAND_SIM_BLOCKED_POLICY', 'policy_not_ready');
  }

  const version = sandbox.target_version;
  const branch  = sandbox.target_branch;
  const head    = sandbox.git_head;

  const simCmds = _buildSimulatedCommands(version, branch, head);

  return {
    schema_version:          SCHEMA_VERSION,
    simulator_status:        'COMMAND_SIM_READY',
    simulator_ready:         true,
    sandbox_id:              sandbox.sandbox_id,
    simulated_commands:      simCmds,
    blocked_commands:        policy.blocked_operations ?? [],
    simulated_tag_name:      `v${version ?? '0.0.0'}`,
    simulated_stable_pointer: `stable → v${version ?? '0.0.0'} @ ${head ?? 'unknown'}`,
    simulated_release_notes:  `Release v${version ?? '0.0.0'}\n[SIMULATED release notes for branch ${branch ?? 'main'}]`,
    simulated_rollback_anchor: `rollback anchor @ ${head ?? 'unknown'}`,
    blocking_reason:          null,
    ..._locked(),
  };
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('release-command-simulator.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = runReleaseCommandSimulator({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`simulator_status       : ${result.simulator_status}`);
    console.log(`simulator_ready        : ${result.simulator_ready}`);
    console.log(`simulated_commands     : ${result.simulated_commands?.length ?? 0}`);
    console.log(`blocked_commands       : ${result.blocked_commands?.length ?? 0}`);
    console.log(`real_commands_executed : false`);
    console.log(`deploy_allowed         : false`);
    console.log(`tag_created            : false`);
  }

  process.exit(result.simulator_ready ? 0 : 1);
}
