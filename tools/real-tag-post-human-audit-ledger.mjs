#!/usr/bin/env node
/**
 * Real Tag Post-Human Audit Ledger — V94.0
 *
 * Append-only hash chain ledger for post-human real tag operation events.
 * 8 event types, hash chain starting at '0'.repeat(32).
 *
 * REGRA ABSOLUTA: tag_created=false always. actual_real_tag_created=false always.
 * Ledger records events — does not create tags.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v94.0';

export const POST_HUMAN_LEDGER_STATUSES = [
  'POST_HUMAN_LEDGER_BLOCKED_VERIFIER',
  'POST_HUMAN_LEDGER_READY',
];

export const POST_HUMAN_AUDIT_EVENT_TYPES = [
  'RUNBOOK_BUILT',
  'RUNBOOK_VALIDATED',
  'COMMAND_GATE_EVALUATED',
  'COMMAND_RENDERED',
  'RECEIPT_IMPORTED',
  'RECEIPT_VERIFIED',
  'HUMAN_TAG_OPERATION_RECORDED',
  'STABILIZATION_INITIATED',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _buildEntry(event_type, data, timestamp, prev_hash) {
  const data_str    = JSON.stringify(data ?? {});
  const entry_hash  = _sha256(`${prev_hash}:${event_type}:${data_str}:${timestamp}`).slice(0, 32);
  const entry_id    = _sha256(`entry:${event_type}:${timestamp}`).slice(0, 24);
  return { entry_id, event_type, data, timestamp, prev_hash, entry_hash };
}

function _buildChain(events, now) {
  const entries = [];
  let prev_hash = '0'.repeat(32);
  for (const { event_type, data } of events) {
    const entry = _buildEntry(event_type, data, now, prev_hash);
    entries.push(entry);
    prev_hash = entry.entry_hash;
  }
  return entries;
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
    schema_version: SCHEMA_VERSION,
    ledger_status:  status,
    ledger_ready:   false,
    blocking_reason,
    entries:        [],
    entry_count:    0,
    hash_chain_valid: false,
    ...extra,
    ..._locked(),
  };
}

function _verifyHashChain(entries) {
  if (!entries || entries.length === 0) return true;
  let prev_hash = '0'.repeat(32);
  for (const entry of entries) {
    if (entry.prev_hash !== prev_hash) return false;
    const data_str    = JSON.stringify(entry.data ?? {});
    const expected    = _sha256(`${prev_hash}:${entry.event_type}:${data_str}:${entry.timestamp}`).slice(0, 32);
    if (entry.entry_hash !== expected) return false;
    prev_hash = entry.entry_hash;
  }
  return true;
}

export function buildRealTagPostHumanAuditLedger(params = {}) {
  const {
    fixture_mode     = false,
    verifier_result,
    runbook_result,
    gate_result,
    renderer_result,
    importer_result,
    _mock_timestamp,
  } = params ?? {};

  const now       = _mock_timestamp ?? new Date().toISOString();
  const ledger_id = _sha256(`post-human-audit-ledger:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  const eff_verifier = fixture_mode ? { verifier_passed: true } : (verifier_result !== undefined ? verifier_result : null);

  if (!fixture_mode && (!eff_verifier || eff_verifier.verifier_passed !== true)) {
    return _blocked('POST_HUMAN_LEDGER_BLOCKED_VERIFIER', 'verifier_not_passed', {
      ledger_id,
      verifier_status: eff_verifier?.verifier_status ?? null,
      created_at:      now,
    });
  }

  const events = [
    {
      event_type: 'RUNBOOK_BUILT',
      data: {
        runbook_status: runbook_result?.runbook_status ?? (fixture_mode ? 'RUNBOOK_READY' : null),
        schema:         'v91.0',
      },
    },
    {
      event_type: 'RUNBOOK_VALIDATED',
      data: {
        validator_passed: fixture_mode ? true : (verifier_result?.importer_verified ?? true),
        schema:           'v91.1',
      },
    },
    {
      event_type: 'COMMAND_GATE_EVALUATED',
      data: {
        gate_status: gate_result?.command_gate_status ?? (fixture_mode ? 'COMMAND_GATE_READY_FOR_HUMAN_COMMAND' : null),
        schema:      'v92.0',
      },
    },
    {
      event_type: 'COMMAND_RENDERED',
      data: {
        renderer_status: renderer_result?.renderer_status ?? (fixture_mode ? 'RENDERER_READY' : null),
        schema:          'v92.1',
      },
    },
    {
      event_type: 'RECEIPT_IMPORTED',
      data: {
        importer_status: importer_result?.importer_status ?? (fixture_mode ? 'IMPORTER_READY' : null),
        schema:          'v93.0',
      },
    },
    {
      event_type: 'RECEIPT_VERIFIED',
      data: {
        verifier_status: eff_verifier?.verifier_status ?? (fixture_mode ? 'VERIFIER_PASSED' : null),
        schema:          'v93.1',
      },
    },
    {
      event_type: 'HUMAN_TAG_OPERATION_RECORDED',
      data: {
        tag_created:             false,
        actual_real_tag_created: false,
        real_execution_not_performed: true,
        recorded_at:             now,
      },
    },
    {
      event_type: 'STABILIZATION_INITIATED',
      data: {
        deploy_blocked:  true,
        stable_blocked:  true,
        release_blocked: true,
        initiated_at:    now,
      },
    },
  ];

  const entries       = _buildChain(events, now);
  const hash_chain_valid = _verifyHashChain(entries);

  return {
    schema_version:   SCHEMA_VERSION,
    ledger_id,
    ledger_status:    'POST_HUMAN_LEDGER_READY',
    ledger_ready:     true,
    blocking_reason:  null,
    entries,
    entry_count:      entries.length,
    hash_chain_valid,
    created_at:       now,
    ..._locked(),
  };
}

export function validatePostHumanAuditLedger(result) {
  if (!result || typeof result !== 'object') return { valid: false, reason: 'null_or_not_object' };
  if (result.tag_created                  === true) return { valid: false, reason: 'tag_created_must_be_false' };
  if (result.actual_real_tag_created      === true) return { valid: false, reason: 'actual_real_tag_created_must_be_false' };
  if (!Array.isArray(result.entries))              return { valid: false, reason: 'entries_not_array' };
  if (!result.hash_chain_valid)                    return { valid: false, reason: 'hash_chain_invalid' };
  return { valid: true };
}

export function renderPostHumanAuditLedger(result) {
  if (!result) return 'post_human_audit_ledger: null';
  const lines = [
    `ledger_status               : ${result.ledger_status ?? 'UNKNOWN'}`,
    `ledger_id                   : ${result.ledger_id ?? 'none'}`,
    `ledger_ready                : ${result.ledger_ready ?? false}`,
    `entry_count                 : ${result.entry_count ?? 0}`,
    `hash_chain_valid            : ${result.hash_chain_valid ?? false}`,
    `tag_created                 : false`,
    `actual_real_tag_created     : false`,
    `git_push_performed          : false`,
    `real_execution_not_performed: true`,
    `blocking_reason             : ${result.blocking_reason ?? 'none'}`,
  ];
  if (result.entries && result.entries.length > 0) {
    lines.push('');
    lines.push('── AUDIT ENTRIES ────────────────────────────────────────');
    result.entries.forEach((e, i) => {
      lines.push(`  [${i + 1}] ${e.event_type} | hash: ${e.entry_hash}`);
    });
  }
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-post-human-audit-ledger.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = buildRealTagPostHumanAuditLedger({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderPostHumanAuditLedger(result));
  }

  process.exit(result.ledger_ready ? 0 : 1);
}
