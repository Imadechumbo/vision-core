#!/usr/bin/env node
/**
 * Immutable Release Rehearsal Plan — V52.0
 *
 * Creates an immutable, deterministic rehearsal plan from sandbox +
 * command simulator outputs. Never executes any real release action.
 *
 * REGRA ABSOLUTA: All execution flags false always.
 * immutable=true, rehearsal_only=true, local_only=true always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v52.0';

export const REHEARSAL_PLAN_STATUSES = [
  'REHEARSAL_PLAN_BLOCKED_SANDBOX',
  'REHEARSAL_PLAN_BLOCKED_SIMULATOR',
  'REHEARSAL_PLAN_BLOCKED_EVIDENCE',
  'REHEARSAL_PLAN_BLOCKED_HASH',
  'REHEARSAL_PLAN_READY',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

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
    immutable:                 true,
    rehearsal_only:            true,
    local_only:                true,
  };
}

function _blocked(status, blocking_reason = 'blocked', extra = {}) {
  return {
    schema_version:          SCHEMA_VERSION,
    rehearsal_plan_status:   status,
    rehearsal_plan_ready:    false,
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
    immutable:                 true,
    rehearsal_only:            true,
    local_only:                true,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

/**
 * Build an immutable release rehearsal plan.
 */
export function buildImmutableReleaseRehearsalPlan(params = {}) {
  const {
    sandbox,
    simulator,
    fixture_mode = false,
    _mock_timestamp,
  } = params ?? {};

  const now = _mock_timestamp ?? new Date().toISOString();

  if (fixture_mode) {
    const rehearsal_plan_id = _sha256(`fixture-plan:${now}`).slice(0, 24);
    const plan_hash = _sha256(`fixture:fixture-sandbox-id:fixture-handoff-id:fixture-receipt-id:v1.0.0-fixture:${now}`).slice(0, 48);
    return {
      schema_version:          SCHEMA_VERSION,
      rehearsal_plan_id,
      rehearsal_plan_status:   'REHEARSAL_PLAN_READY',
      rehearsal_plan_ready:    true,
      sandbox_id:              'fixture-sandbox-id',
      handoff_id:              'fixture-handoff-id',
      request_id:              'fixture-request-id',
      evidence_receipt_id:     'fixture-receipt-id',
      evidence_source:         'go-core',
      target_version:          '1.0.0-fixture',
      target_branch:           'main',
      git_head:                'fixture-head-sha',
      simulated_commands:      [
        { command_type: 'git_status',           simulated: true, executed: false, real_action: false },
        { command_type: 'git_rev_parse_head',   simulated: true, executed: false, real_action: false },
        { command_type: 'git_tag_annotated',    simulated: true, executed: false, real_action: false },
        { command_type: 'git_push_tag',         simulated: true, executed: false, real_action: false },
        { command_type: 'update_stable_pointer',simulated: true, executed: false, real_action: false },
        { command_type: 'generate_release_notes',simulated: true, executed: false, real_action: false },
        { command_type: 'create_rollback_anchor',simulated: true, executed: false, real_action: false },
      ],
      blocked_operations:      ['git_tag_create', 'git_push', 'deploy_execute', 'stable_promote', 'production_write', 'evidence_override', 'go_core_override'],
      expected_artifacts:      ['sandbox-report', 'rehearsal-ledger'],
      rollback_anchor:         'rollback anchor @ fixture-head-sha',
      release_notes_preview:   'Release v1.0.0-fixture\n[SIMULATED release notes for branch main]',
      plan_hash,
      created_at:              now,
      blocking_reason:         null,
      ..._locked(),
    };
  }

  // Require sandbox
  if (!sandbox || !sandbox.sandbox_ready) {
    return _blocked('REHEARSAL_PLAN_BLOCKED_SANDBOX', 'sandbox_not_ready', {
      sandbox_status: sandbox?.sandbox_status ?? null,
    });
  }

  // Require evidence_source=go-core
  if (sandbox.evidence_source && sandbox.evidence_source !== 'go-core') {
    return _blocked('REHEARSAL_PLAN_BLOCKED_EVIDENCE', 'evidence_source_must_be_go_core', {
      evidence_source: sandbox.evidence_source,
    });
  }

  // Require simulator
  if (!simulator || !simulator.simulator_ready) {
    return _blocked('REHEARSAL_PLAN_BLOCKED_SIMULATOR', 'simulator_not_ready', {
      simulator_status: simulator?.simulator_status ?? null,
    });
  }

  const rehearsal_plan_id = _sha256(`plan:${sandbox.sandbox_id ?? 'x'}:${sandbox.handoff_id ?? 'x'}:${now}`).slice(0, 24);

  const plan_hash = _sha256(
    `${sandbox.sandbox_id ?? ''}:${sandbox.handoff_id ?? ''}:${sandbox.evidence_receipt_id ?? ''}:${sandbox.target_version ?? ''}:${now}`
  ).slice(0, 48);

  return {
    schema_version:          SCHEMA_VERSION,
    rehearsal_plan_id,
    rehearsal_plan_status:   'REHEARSAL_PLAN_READY',
    rehearsal_plan_ready:    true,
    sandbox_id:              sandbox.sandbox_id ?? null,
    handoff_id:              sandbox.handoff_id ?? null,
    request_id:              sandbox.request_id ?? null,
    evidence_receipt_id:     sandbox.evidence_receipt_id ?? null,
    evidence_source:         'go-core',
    target_version:          sandbox.target_version ?? null,
    target_branch:           sandbox.target_branch ?? null,
    git_head:                sandbox.git_head ?? null,
    simulated_commands:      simulator.simulated_commands ?? [],
    blocked_operations:      simulator.blocked_commands ?? [],
    expected_artifacts:      ['sandbox-report', 'rehearsal-ledger'],
    rollback_anchor:         simulator.simulated_rollback_anchor ?? null,
    release_notes_preview:   simulator.simulated_release_notes ?? null,
    plan_hash,
    created_at:              now,
    blocking_reason:         null,
    ..._locked(),
  };
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('immutable-release-rehearsal-plan.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = buildImmutableReleaseRehearsalPlan({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`rehearsal_plan_status  : ${result.rehearsal_plan_status}`);
    console.log(`rehearsal_plan_id      : ${result.rehearsal_plan_id ?? 'none'}`);
    console.log(`plan_hash              : ${result.plan_hash ?? 'none'}`);
    console.log(`immutable              : true`);
    console.log(`deploy_allowed         : false`);
    console.log(`blocking_reason        : ${result.blocking_reason ?? 'none'}`);
  }

  process.exit(result.rehearsal_plan_ready ? 0 : 1);
}
