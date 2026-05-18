#!/usr/bin/env node
/**
 * Real Tag Execution Audit Ledger — V88.1
 *
 * Append-only audit ledger for the real tag execution lifecycle.
 * Each entry contains a hash chain linking entries together.
 * 8 event types cover the full lifecycle.
 *
 * REGRA ABSOLUTA: tag_created=false, deploy_performed=false,
 * stable_promoted=false, release_performed=false always.
 * Ledger only records — never executes.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v88.1';

export const AUDIT_LEDGER_STATUSES = [
  'AUDIT_LEDGER_BLOCKED_RECEIPT',
  'AUDIT_LEDGER_READY',
];

export const AUDIT_EVENT_TYPES = [
  'CONTROLLER_EVALUATED',
  'EXECUTOR_DRY_RUN_COMPLETED',
  'EXECUTOR_REAL_TAG_EXECUTED',
  'VERIFIER_PASSED',
  'VERIFIER_FAILED',
  'ROLLBACK_SIMULATED',
  'ROLLBACK_EXECUTED',
  'RECEIPT_GENERATED',
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
    real_execution_not_performed: true,
  };
}

function _buildEntryHash(prev_hash, event_type, data, timestamp) {
  const content = `${prev_hash}:${event_type}:${JSON.stringify(data)}:${timestamp}`;
  return _sha256(content).slice(0, 32);
}

function _buildEntries(events, timestamp) {
  const entries = [];
  let prev_hash = '0'.repeat(32);
  for (const evt of events) {
    const entry_hash = _buildEntryHash(prev_hash, evt.event_type, evt.data ?? {}, timestamp);
    entries.push({
      entry_index: entries.length,
      event_type:  evt.event_type,
      data:        evt.data ?? {},
      prev_hash,
      entry_hash,
      recorded_at: timestamp,
    });
    prev_hash = entry_hash;
  }
  return entries;
}

export function buildRealTagExecutionAuditLedger(params = {}) {
  const {
    receipt_status,
    receipt_ready          = false,
    receipt_id,
    receipt_type,
    receipt_hash,
    target_tag,
    evidence_receipt_id,
    rollback_anchor_id,
    executor_status,
    verifier_status,
    rollback_status,
    fixture_mode           = false,
    _mock_timestamp,
  } = params ?? {};

  const now       = _mock_timestamp ?? new Date().toISOString();
  const id_tag    = fixture_mode ? 'fixture' : (target_tag ?? 'unknown');
  const ledger_id = _sha256(`audit-ledger:${SCHEMA_VERSION}:${id_tag}:${now}`).slice(0, 24);

  if (fixture_mode) {
    const events = [
      { event_type: 'CONTROLLER_EVALUATED',       data: { target_tag: target_tag ?? 'fixture' } },
      { event_type: 'EXECUTOR_DRY_RUN_COMPLETED', data: { dry_run: true } },
      { event_type: 'RECEIPT_GENERATED',          data: { receipt_type: receipt_type ?? 'dry_run_verified' } },
    ];
    const entries = _buildEntries(events, now);
    return {
      schema_version:      SCHEMA_VERSION,
      ledger_id,
      ledger_status:       'AUDIT_LEDGER_READY',
      ledger_ready:        true,
      entries_count:       entries.length,
      entries,
      ledger_hash:         entries[entries.length - 1].entry_hash,
      blocking_reason:     null,
      target_tag:          target_tag ?? null,
      evidence_receipt_id: evidence_receipt_id ?? null,
      rollback_anchor_id:  rollback_anchor_id ?? null,
      created_at:          now,
      ..._locked(),
    };
  }

  // Gate: receipt must be ready
  if (receipt_ready !== true || !receipt_status || !receipt_id) {
    return {
      schema_version:  SCHEMA_VERSION,
      ledger_id,
      ledger_status:   'AUDIT_LEDGER_BLOCKED_RECEIPT',
      ledger_ready:    false,
      blocking_reason: 'receipt_not_ready',
      entries_count:   0,
      entries:         [],
      ledger_hash:     null,
      created_at:      now,
      ..._locked(),
    };
  }

  // Build event list based on what happened
  const events = [];

  // Controller event
  events.push({
    event_type: 'CONTROLLER_EVALUATED',
    data: { target_tag: target_tag ?? null },
  });

  // Executor event
  if (executor_status === 'LOCAL_EXEC_REAL_TAG_EXECUTED') {
    events.push({ event_type: 'EXECUTOR_REAL_TAG_EXECUTED', data: { executor_status } });
  } else {
    events.push({ event_type: 'EXECUTOR_DRY_RUN_COMPLETED', data: { executor_status: executor_status ?? 'dry_run' } });
  }

  // Verifier event
  if (verifier_status === 'POST_EXEC_VERIFY_PASSED') {
    events.push({ event_type: 'VERIFIER_PASSED', data: { verifier_status } });
  } else if (verifier_status && verifier_status.startsWith('POST_EXEC_VERIFY_BLOCKED')) {
    events.push({ event_type: 'VERIFIER_FAILED', data: { verifier_status } });
  }

  // Rollback event
  if (rollback_status === 'ROLLBACK_EXEC_EXECUTED') {
    events.push({ event_type: 'ROLLBACK_EXECUTED', data: { rollback_status } });
  } else if (rollback_status === 'ROLLBACK_EXEC_SIMULATED') {
    events.push({ event_type: 'ROLLBACK_SIMULATED', data: { rollback_status } });
  }

  // Receipt event
  events.push({
    event_type: 'RECEIPT_GENERATED',
    data: { receipt_id, receipt_type: receipt_type ?? 'dry_run_verified', receipt_hash: receipt_hash ?? null },
  });

  const entries = _buildEntries(events, now);

  return {
    schema_version:      SCHEMA_VERSION,
    ledger_id,
    ledger_status:       'AUDIT_LEDGER_READY',
    ledger_ready:        true,
    entries_count:       entries.length,
    entries,
    ledger_hash:         entries[entries.length - 1].entry_hash,
    blocking_reason:     null,
    target_tag:          target_tag ?? null,
    evidence_receipt_id: evidence_receipt_id ?? null,
    rollback_anchor_id:  rollback_anchor_id ?? null,
    created_at:          now,
    ..._locked(),
  };
}

export function validateAuditLedgerResult(result) {
  if (!result || typeof result !== 'object') return { valid: false, errors: ['result_missing'] };
  const errors = [];
  if (!AUDIT_LEDGER_STATUSES.includes(result.ledger_status)) errors.push('ledger_status_invalid');
  if (result.ledger_ready === true) {
    if (!Array.isArray(result.entries)) errors.push('entries_must_be_array');
    if (result.entries && result.entries.length !== result.entries_count) errors.push('entries_count_mismatch');
    for (const e of (result.entries ?? [])) {
      if (!AUDIT_EVENT_TYPES.includes(e.event_type)) errors.push(`unknown_event_type:${e.event_type}`);
    }
  }
  if (result.tag_created         === true) errors.push('tag_created_must_be_false');
  if (result.deploy_performed    === true) errors.push('deploy_performed_must_be_false');
  if (result.stable_promoted     === true) errors.push('stable_promoted_must_be_false');
  if (result.release_performed   === true) errors.push('release_performed_must_be_false');
  return { valid: errors.length === 0, errors };
}

export function renderAuditLedgerSummary(result) {
  if (!result) return 'real_tag_execution_audit_ledger: null';
  const lines = [
    `ledger_status                 : ${result.ledger_status ?? 'UNKNOWN'}`,
    `ledger_ready                  : ${result.ledger_ready ?? false}`,
    `entries_count                 : ${result.entries_count ?? 0}`,
    `ledger_hash                   : ${result.ledger_hash ?? 'none'}`,
    `tag_created                   : false`,
    `git_push_performed            : false`,
    `deploy_performed              : false`,
    `stable_promoted               : false`,
    `release_performed             : false`,
    `blocking_reason               : ${result.blocking_reason ?? 'none'}`,
  ];
  if (Array.isArray(result.entries)) {
    for (const e of result.entries) {
      lines.push(`  [${e.entry_index}] ${e.event_type} | hash=${e.entry_hash}`);
    }
  }
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-execution-audit-ledger.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = buildRealTagExecutionAuditLedger({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderAuditLedgerSummary(result));
  }

  process.exit(result.ledger_ready ? 0 : 1);
}
