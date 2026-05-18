#!/usr/bin/env node
/**
 * Real Tag Actual Command Gate — V92.0
 *
 * Evaluates 9 gates before presenting the real git tag execution command to a human.
 * READY_FOR_HUMAN_COMMAND presents the command but does NOT execute it.
 *
 * REGRA ABSOLUTA: tag_created=false always. actual_real_tag_created=false always.
 * Gate presents command — human must run it manually.
 */

import { createHash } from 'crypto';
import { buildRealTagHumanRunbook } from './real-tag-human-runbook.mjs';
import { runRealTagHumanRunbookValidator } from './real-tag-human-runbook-validator.mjs';

const SCHEMA_VERSION = 'v92.0';

export const COMMAND_GATE_STATUSES = [
  'COMMAND_GATE_BLOCKED_RUNBOOK',
  'COMMAND_GATE_BLOCKED_VALIDATOR',
  'COMMAND_GATE_BLOCKED_BASELINE',
  'COMMAND_GATE_BLOCKED_CI',
  'COMMAND_GATE_BLOCKED_CONFIRMATION',
  'COMMAND_GATE_BLOCKED_TARGET_TAG',
  'COMMAND_GATE_BLOCKED_GIT_HEAD',
  'COMMAND_GATE_BLOCKED_EVIDENCE',
  'COMMAND_GATE_BLOCKED_ROLLBACK_ANCHOR',
  'COMMAND_GATE_READY_FOR_HUMAN_COMMAND',
];

export const COMMAND_GATE_CONFIRMATION_PHRASE =
  'I CONFIRM THIS GATE IS FOR LOCAL INTERACTIVE REAL TAG ONE-SHOT AND DOES NOT CREATE DEPLOY STABLE OR RELEASE';

const TAG_PATTERN = /^v\d+\.\d+(\.\d+)?(-[a-zA-Z0-9._-]+)?$/;
const SHA_PATTERN = /^[0-9a-f]{7,40}$/i;

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _buildCommand(tag, head, receipt, anchor) {
  return [
    'node tools/real-tag-one-shot-execution-controller.mjs',
    '  --real-tag-one-shot',
    '  --execute-real-tag',
    '  --i-understand-this-creates-a-real-git-tag',
    `  --confirm-target-tag ${tag}`,
    `  --confirm-git-head ${head}`,
    `  --confirm-evidence-receipt ${receipt}`,
    `  --confirm-rollback-anchor ${anchor}`,
    '  --confirm-no-deploy',
    '  --confirm-no-stable-promotion',
    '  --confirm-no-release',
    '  --local-interactive-only',
    '  --dry-run=false',
  ].join(' \\\n');
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
    schema_version:       SCHEMA_VERSION,
    command_gate_status:  status,
    gate_ready:           false,
    blocking_reason,
    command_presented:    null,
    ...extra,
    ..._locked(),
  };
}

export function evaluateRealTagCommandGate(params = {}) {
  const {
    fixture_mode       = false,
    runbook,
    validator_result,
    baseline_status,
    is_ci              = false,
    confirmation_phrase,
    target_tag,
    git_head,
    evidence_receipt,
    rollback_anchor,
    _mock_timestamp,
  } = params ?? {};

  const now         = _mock_timestamp ?? new Date().toISOString();
  const gate_id     = _sha256(`real-tag-command-gate:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  if (fixture_mode) {
    return {
      schema_version:              SCHEMA_VERSION,
      command_gate_id:             gate_id,
      command_gate_status:         'COMMAND_GATE_READY_FOR_HUMAN_COMMAND',
      gate_ready:                  true,
      blocking_reason:             null,
      runbook_verified:            true,
      validator_verified:          true,
      baseline_verified:           true,
      ci_gate_passed:              true,
      confirmation_verified:       true,
      target_tag_verified:         true,
      git_head_verified:           true,
      evidence_verified:           true,
      rollback_anchor_verified:    true,
      command_presented:           _buildCommand('<target_tag>', '<git_head_sha>', '<evidence_receipt_id>', '<rollback_anchor_id>'),
      created_at:                  now,
      ..._locked(),
    };
  }

  // ── Gate 1: Runbook ────────────────────────────────────────────
  const eff_runbook = runbook ?? buildRealTagHumanRunbook({ fixture_mode: false });
  if (!eff_runbook || eff_runbook.runbook_ready !== true) {
    return _blocked('COMMAND_GATE_BLOCKED_RUNBOOK', 'runbook_not_ready', {
      command_gate_id:          gate_id,
      runbook_verified:         false,
      validator_verified:       false,
      baseline_verified:        false,
      ci_gate_passed:           false,
      confirmation_verified:    false,
      target_tag_verified:      false,
      git_head_verified:        false,
      evidence_verified:        false,
      rollback_anchor_verified: false,
      created_at:               now,
    });
  }

  // ── Gate 2: Validator ─────────────────────────────────────────
  const eff_validator = validator_result !== undefined
    ? validator_result
    : runRealTagHumanRunbookValidator({ fixture_mode: false, runbook: eff_runbook });
  if (!eff_validator || eff_validator.validator_passed !== true) {
    return _blocked('COMMAND_GATE_BLOCKED_VALIDATOR', 'runbook_validator_not_passed', {
      command_gate_id:          gate_id,
      runbook_verified:         true,
      validator_verified:       false,
      baseline_verified:        false,
      ci_gate_passed:           false,
      confirmation_verified:    false,
      target_tag_verified:      false,
      git_head_verified:        false,
      evidence_verified:        false,
      rollback_anchor_verified: false,
      created_at:               now,
    });
  }

  // ── Gate 3: Baseline ──────────────────────────────────────────
  if (baseline_status !== 'EXEC_BASELINE_READY_DRY_RUN_AND_MOCK_REAL') {
    return _blocked('COMMAND_GATE_BLOCKED_BASELINE', 'baseline_not_ready', {
      command_gate_id:          gate_id,
      baseline_status:          baseline_status ?? null,
      runbook_verified:         true,
      validator_verified:       true,
      baseline_verified:        false,
      ci_gate_passed:           false,
      confirmation_verified:    false,
      target_tag_verified:      false,
      git_head_verified:        false,
      evidence_verified:        false,
      rollback_anchor_verified: false,
      created_at:               now,
    });
  }

  // ── Gate 4: CI check ──────────────────────────────────────────
  if (is_ci === true) {
    return _blocked('COMMAND_GATE_BLOCKED_CI', 'ci_environment_detected', {
      command_gate_id:          gate_id,
      runbook_verified:         true,
      validator_verified:       true,
      baseline_verified:        true,
      ci_gate_passed:           false,
      confirmation_verified:    false,
      target_tag_verified:      false,
      git_head_verified:        false,
      evidence_verified:        false,
      rollback_anchor_verified: false,
      created_at:               now,
    });
  }

  // ── Gate 5: Confirmation phrase ───────────────────────────────
  if (confirmation_phrase !== COMMAND_GATE_CONFIRMATION_PHRASE) {
    return _blocked('COMMAND_GATE_BLOCKED_CONFIRMATION', 'confirmation_phrase_missing_or_invalid', {
      command_gate_id:          gate_id,
      runbook_verified:         true,
      validator_verified:       true,
      baseline_verified:        true,
      ci_gate_passed:           true,
      confirmation_verified:    false,
      target_tag_verified:      false,
      git_head_verified:        false,
      evidence_verified:        false,
      rollback_anchor_verified: false,
      created_at:               now,
    });
  }

  // ── Gate 6: Target tag ────────────────────────────────────────
  if (!target_tag || !TAG_PATTERN.test(target_tag)) {
    return _blocked('COMMAND_GATE_BLOCKED_TARGET_TAG', 'target_tag_missing_or_invalid', {
      command_gate_id:          gate_id,
      target_tag:               target_tag ?? null,
      runbook_verified:         true,
      validator_verified:       true,
      baseline_verified:        true,
      ci_gate_passed:           true,
      confirmation_verified:    true,
      target_tag_verified:      false,
      git_head_verified:        false,
      evidence_verified:        false,
      rollback_anchor_verified: false,
      created_at:               now,
    });
  }

  // ── Gate 7: Git HEAD ─────────────────────────────────────────
  if (!git_head || !SHA_PATTERN.test(git_head)) {
    return _blocked('COMMAND_GATE_BLOCKED_GIT_HEAD', 'git_head_missing_or_invalid', {
      command_gate_id:          gate_id,
      runbook_verified:         true,
      validator_verified:       true,
      baseline_verified:        true,
      ci_gate_passed:           true,
      confirmation_verified:    true,
      target_tag_verified:      true,
      git_head_verified:        false,
      evidence_verified:        false,
      rollback_anchor_verified: false,
      created_at:               now,
    });
  }

  // ── Gate 8: Evidence receipt ─────────────────────────────────
  if (!evidence_receipt || typeof evidence_receipt !== 'string' || evidence_receipt.length < 8) {
    return _blocked('COMMAND_GATE_BLOCKED_EVIDENCE', 'evidence_receipt_missing_or_invalid', {
      command_gate_id:          gate_id,
      runbook_verified:         true,
      validator_verified:       true,
      baseline_verified:        true,
      ci_gate_passed:           true,
      confirmation_verified:    true,
      target_tag_verified:      true,
      git_head_verified:        true,
      evidence_verified:        false,
      rollback_anchor_verified: false,
      created_at:               now,
    });
  }

  // ── Gate 9: Rollback anchor ───────────────────────────────────
  if (!rollback_anchor || typeof rollback_anchor !== 'string' || rollback_anchor.length < 4) {
    return _blocked('COMMAND_GATE_BLOCKED_ROLLBACK_ANCHOR', 'rollback_anchor_missing_or_invalid', {
      command_gate_id:          gate_id,
      runbook_verified:         true,
      validator_verified:       true,
      baseline_verified:        true,
      ci_gate_passed:           true,
      confirmation_verified:    true,
      target_tag_verified:      true,
      git_head_verified:        true,
      evidence_verified:        true,
      rollback_anchor_verified: false,
      created_at:               now,
    });
  }

  return {
    schema_version:              SCHEMA_VERSION,
    command_gate_id:             gate_id,
    command_gate_status:         'COMMAND_GATE_READY_FOR_HUMAN_COMMAND',
    gate_ready:                  true,
    blocking_reason:             null,
    runbook_verified:            true,
    validator_verified:          true,
    baseline_verified:           true,
    ci_gate_passed:              true,
    confirmation_verified:       true,
    target_tag_verified:         true,
    git_head_verified:           true,
    evidence_verified:           true,
    rollback_anchor_verified:    true,
    command_presented:           _buildCommand(target_tag, git_head, evidence_receipt, rollback_anchor),
    created_at:                  now,
    ..._locked(),
  };
}

export function renderCommandGateSummary(result) {
  if (!result) return 'real_tag_command_gate: null';
  const lines = [
    `command_gate_status         : ${result.command_gate_status ?? 'UNKNOWN'}`,
    `command_gate_id             : ${result.command_gate_id ?? 'none'}`,
    `gate_ready                  : ${result.gate_ready ?? false}`,
    `runbook_verified            : ${result.runbook_verified ?? false}`,
    `validator_verified          : ${result.validator_verified ?? false}`,
    `baseline_verified           : ${result.baseline_verified ?? false}`,
    `ci_gate_passed              : ${result.ci_gate_passed ?? false}`,
    `confirmation_verified       : ${result.confirmation_verified ?? false}`,
    `target_tag_verified         : ${result.target_tag_verified ?? false}`,
    `git_head_verified           : ${result.git_head_verified ?? false}`,
    `evidence_verified           : ${result.evidence_verified ?? false}`,
    `rollback_anchor_verified    : ${result.rollback_anchor_verified ?? false}`,
    `tag_created                 : false`,
    `actual_real_tag_created     : false`,
    `git_push_performed          : false`,
    `real_execution_not_performed: true`,
    `blocking_reason             : ${result.blocking_reason ?? 'none'}`,
  ];
  if (result.gate_ready && result.command_presented) {
    lines.push('');
    lines.push('── COMMAND TO RUN (HUMAN ONLY) ───────────────────────────');
    lines.push(result.command_presented);
    lines.push('─────────────────────────────────────────────────────────');
    lines.push('NOTE: Copy and run the command above manually.');
    lines.push('      This gate does NOT execute it automatically.');
  }
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-actual-command-gate.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = evaluateRealTagCommandGate({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderCommandGateSummary(result));
  }

  process.exit(result.gate_ready ? 0 : 1);
}
