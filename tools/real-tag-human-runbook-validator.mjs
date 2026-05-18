#!/usr/bin/env node
/**
 * Real Tag Human Runbook Validator — V91.1
 *
 * Validates completeness and safety of a real-tag human runbook result.
 * 5 statuses: VALIDATOR_BLOCKED_RUNBOOK, VALIDATOR_BLOCKED_COMPLETENESS,
 *             VALIDATOR_BLOCKED_SAFETY, VALIDATOR_BLOCKED_COMMANDS, VALIDATOR_PASSED.
 *
 * REGRA ABSOLUTA: tag_created=false always. actual_real_tag_created=false always.
 */

import { createHash } from 'crypto';
import { buildRealTagHumanRunbook } from './real-tag-human-runbook.mjs';

const SCHEMA_VERSION = 'v91.1';

export const RUNBOOK_VALIDATOR_STATUSES = [
  'VALIDATOR_BLOCKED_RUNBOOK',
  'VALIDATOR_BLOCKED_COMPLETENESS',
  'VALIDATOR_BLOCKED_SAFETY',
  'VALIDATOR_BLOCKED_COMMANDS',
  'VALIDATOR_PASSED',
];

const REQUIRED_RUNBOOK_FIELDS = [
  'runbook_status',
  'runbook_id',
  'human_required',
  'local_interactive_only',
  'ci_blocked',
  'pre_checks',
  'dry_run_command',
  'real_execution_command_template',
  'post_checks',
  'rollback_commands',
  'blocked_actions',
];

const REQUIRED_BLOCKED_ACTIONS = [
  'deploy_to_production',
  'promote_to_stable',
  'release_to_users',
  'run_in_ci',
];

const REQUIRED_COMMAND_FLAGS = [
  '--real-tag-one-shot',
  '--execute-real-tag',
  '--i-understand-this-creates-a-real-git-tag',
  '--confirm-no-deploy',
  '--confirm-no-stable-promotion',
  '--confirm-no-release',
  '--local-interactive-only',
  '--dry-run=false',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    tag_created:                  false,
    git_push_performed:           false,
    deploy_performed:             false,
    stable_promoted:              false,
    release_performed:            false,
    actual_real_tag_created:      false,
    real_execution_not_performed: true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:  SCHEMA_VERSION,
    validator_status: status,
    validator_passed: false,
    blocking_reason,
    ...extra,
    ..._locked(),
  };
}

export function validateRunbookCompleteness(runbook) {
  const failures = [];
  if (!runbook || typeof runbook !== 'object') {
    return { passed: false, failures: ['runbook_is_null_or_not_object'] };
  }
  for (const field of REQUIRED_RUNBOOK_FIELDS) {
    if (runbook[field] === undefined || runbook[field] === null) {
      failures.push(`missing_field:${field}`);
    }
  }
  if (!Array.isArray(runbook.pre_checks) || runbook.pre_checks.length === 0) {
    failures.push('pre_checks_empty_or_not_array');
  }
  if (!Array.isArray(runbook.post_checks) || runbook.post_checks.length === 0) {
    failures.push('post_checks_empty_or_not_array');
  }
  if (!Array.isArray(runbook.rollback_commands) || runbook.rollback_commands.length === 0) {
    failures.push('rollback_commands_empty_or_not_array');
  }
  if (!Array.isArray(runbook.blocked_actions) || runbook.blocked_actions.length === 0) {
    failures.push('blocked_actions_empty_or_not_array');
  }
  return { passed: failures.length === 0, failures };
}

export function validateRunbookSafety(runbook) {
  const failures = [];
  if (!runbook || typeof runbook !== 'object') {
    return { passed: false, failures: ['runbook_is_null_or_not_object'] };
  }
  if (runbook.human_required !== true)        failures.push('human_required_not_true');
  if (runbook.local_interactive_only !== true) failures.push('local_interactive_only_not_true');
  if (runbook.ci_blocked !== true)             failures.push('ci_blocked_not_true');
  if (runbook.tag_created === true)            failures.push('tag_created_must_be_false');
  if (runbook.actual_real_tag_created === true) failures.push('actual_real_tag_created_must_be_false');
  if (runbook.git_push_performed === true)     failures.push('git_push_performed_must_be_false');
  if (Array.isArray(runbook.blocked_actions)) {
    for (const req of REQUIRED_BLOCKED_ACTIONS) {
      if (!runbook.blocked_actions.includes(req)) {
        failures.push(`blocked_action_missing:${req}`);
      }
    }
  } else {
    failures.push('blocked_actions_not_array');
  }
  return { passed: failures.length === 0, failures };
}

export function validateRunbookCommands(runbook) {
  const failures = [];
  if (!runbook || typeof runbook !== 'object') {
    return { passed: false, failures: ['runbook_is_null_or_not_object'] };
  }
  const tmpl = runbook.real_execution_command_template ?? '';
  for (const flag of REQUIRED_COMMAND_FLAGS) {
    if (!tmpl.includes(flag)) {
      failures.push(`command_missing_flag:${flag}`);
    }
  }
  const dryRun = runbook.dry_run_command ?? '';
  if (!dryRun.includes('--dry-run')) {
    failures.push('dry_run_command_missing_flag:--dry-run');
  }
  return { passed: failures.length === 0, failures };
}

export function runRealTagHumanRunbookValidator(params = {}) {
  const {
    fixture_mode    = false,
    runbook,
    _mock_timestamp,
  } = params ?? {};

  const now          = _mock_timestamp ?? new Date().toISOString();
  const validator_id = _sha256(`runbook-validator:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  const eff_runbook = fixture_mode
    ? buildRealTagHumanRunbook({ fixture_mode: true, _mock_timestamp: now })
    : runbook;

  // ── 1. Runbook gate ──────────────────────────────────────────────
  if (!eff_runbook || typeof eff_runbook !== 'object') {
    return _blocked('VALIDATOR_BLOCKED_RUNBOOK', 'runbook_null_or_not_object', {
      validator_id,
      completeness_passed: false,
      safety_passed:       false,
      commands_verified:   false,
      failures:            ['runbook_null_or_not_object'],
      created_at:          now,
    });
  }

  if (!fixture_mode && eff_runbook.runbook_ready !== true) {
    return _blocked('VALIDATOR_BLOCKED_RUNBOOK', 'runbook_not_ready', {
      validator_id,
      runbook_status:      eff_runbook.runbook_status ?? null,
      completeness_passed: false,
      safety_passed:       false,
      commands_verified:   false,
      failures:            [`runbook_status:${eff_runbook.runbook_status ?? 'unknown'}`],
      created_at:          now,
    });
  }

  // ── 2. Completeness check ────────────────────────────────────────
  const completeness = validateRunbookCompleteness(eff_runbook);
  if (!completeness.passed) {
    return _blocked('VALIDATOR_BLOCKED_COMPLETENESS', 'runbook_incomplete', {
      validator_id,
      completeness_passed: false,
      safety_passed:       false,
      commands_verified:   false,
      failures:            completeness.failures,
      created_at:          now,
    });
  }

  // ── 3. Safety check ──────────────────────────────────────────────
  const safety = validateRunbookSafety(eff_runbook);
  if (!safety.passed) {
    return _blocked('VALIDATOR_BLOCKED_SAFETY', 'runbook_safety_violations', {
      validator_id,
      completeness_passed: true,
      safety_passed:       false,
      commands_verified:   false,
      failures:            safety.failures,
      created_at:          now,
    });
  }

  // ── 4. Commands check ────────────────────────────────────────────
  const commands = validateRunbookCommands(eff_runbook);
  if (!commands.passed) {
    return _blocked('VALIDATOR_BLOCKED_COMMANDS', 'command_template_incomplete', {
      validator_id,
      completeness_passed: true,
      safety_passed:       true,
      commands_verified:   false,
      failures:            commands.failures,
      created_at:          now,
    });
  }

  return {
    schema_version:   SCHEMA_VERSION,
    validator_id,
    validator_status: 'VALIDATOR_PASSED',
    validator_passed: true,
    blocking_reason:  null,
    completeness_passed: true,
    safety_passed:       true,
    commands_verified:   true,
    failures:            [],
    created_at:          now,
    ..._locked(),
  };
}

export function renderRunbookValidatorSummary(result) {
  if (!result) return 'runbook_validator: null';
  const lines = [
    `validator_status            : ${result.validator_status ?? 'UNKNOWN'}`,
    `validator_id                : ${result.validator_id ?? 'none'}`,
    `validator_passed            : ${result.validator_passed ?? false}`,
    `completeness_passed         : ${result.completeness_passed ?? false}`,
    `safety_passed               : ${result.safety_passed ?? false}`,
    `commands_verified           : ${result.commands_verified ?? false}`,
    `tag_created                 : false`,
    `actual_real_tag_created     : false`,
    `git_push_performed          : false`,
    `real_execution_not_performed: true`,
    `blocking_reason             : ${result.blocking_reason ?? 'none'}`,
  ];
  if (result.failures && result.failures.length > 0) {
    lines.push('');
    lines.push('── FAILURES ─────────────────────────────────────────────');
    result.failures.forEach(f => lines.push(`  FAIL: ${f}`));
  }
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-human-runbook-validator.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = runRealTagHumanRunbookValidator({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRunbookValidatorSummary(result));
  }

  process.exit(result.validator_passed ? 0 : 1);
}
