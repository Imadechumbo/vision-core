#!/usr/bin/env node
/**
 * Post-Tag Audit Ledger Binding — V98.0
 *
 * Append-only hash-chained ledger for post-tag audit events.
 * Records preflight snapshot, command package, receipt import,
 * receipt verification. Does not execute any operations.
 *
 * REGRA ABSOLUTA: actual_real_tag_created=false always. tag_created=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v98.0';

export const POST_TAG_LEDGER_STATUSES = [
  'POST_TAG_LEDGER_BLOCKED_VERIFIER',
  'POST_TAG_LEDGER_READY',
];

export const POST_TAG_AUDIT_EVENT_TYPES = [
  'FINAL_PREFLIGHT_SNAPSHOT_READY',
  'FINAL_COMMAND_PACKAGE_READY',
  'HUMAN_RECEIPT_IMPORT_GATE_DRY_RUN_READY',
  'HUMAN_RECEIPT_IMPORT_GATE_REAL_TAG_READY',
  'HUMAN_RECEIPT_VERIFY_DRY_RUN_CONFIRMED',
  'HUMAN_RECEIPT_VERIFY_REAL_TAG_CONFIRMED',
  'POST_TAG_OPERATION_BLOCKED',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    actual_real_tag_created:      false,
    tag_created:                  false,
    git_push_performed:           false,
    real_execution_not_performed: true,
    deploy_performed:             false,
    stable_promoted:              false,
    release_performed:            false,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version:  SCHEMA_VERSION,
    ledger_status:   status,
    ledger_ready:    false,
    blocking_reason,
    ...extra,
    ..._locked(),
  };
}

function _buildEntry(event_type, data, timestamp, prev_hash) {
  const entry_id   = _sha256(`entry:${event_type}:${timestamp}`).slice(0, 24);
  const entry_hash = _sha256(`${prev_hash}:${event_type}:${JSON.stringify(data)}:${timestamp}`).slice(0, 32);
  return {
    entry_id,
    event_type,
    data,
    timestamp,
    prev_hash,
    entry_hash,
  };
}

function _buildChain(events, now) {
  const entries = [];
  let prev_hash  = '0'.repeat(32);
  for (const { event_type, data } of events) {
    const entry = _buildEntry(event_type, data, now, prev_hash);
    entries.push(entry);
    prev_hash = entry.entry_hash;
  }
  return entries;
}

export function buildPostTagAuditLedgerBinding(params = {}) {
  const {
    fixture_mode        = false,
    verifier_result,
    snapshot_result,
    command_package_result,
    import_gate_result,
    _mock_timestamp,
  } = params ?? {};

  const now       = _mock_timestamp ?? new Date().toISOString();
  const ledger_id = _sha256(`post-tag-ledger:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  if (fixture_mode) {
    const events = [
      { event_type: 'FINAL_PREFLIGHT_SNAPSHOT_READY',          data: { snapshot_id: 'fixture-snap',    tag_created: false, actual_real_tag_created: false } },
      { event_type: 'FINAL_COMMAND_PACKAGE_READY',             data: { package_id:  'fixture-pkg',     tag_created: false } },
      { event_type: 'HUMAN_RECEIPT_IMPORT_GATE_DRY_RUN_READY', data: { gate_id:     'fixture-gate',    is_real_tag_receipt: false } },
      { event_type: 'HUMAN_RECEIPT_VERIFY_DRY_RUN_CONFIRMED',  data: { verify_id:   'fixture-verify',  is_real_tag_verified: false } },
      { event_type: 'FINAL_PREFLIGHT_SNAPSHOT_READY',          data: { deploy_blocked: true, stable_blocked: true, release_blocked: true } },
    ];
    const entries = _buildChain(events, now);
    const last_hash = entries[entries.length - 1].entry_hash;
    return {
      schema_version:    SCHEMA_VERSION,
      ledger_id,
      ledger_status:     'POST_TAG_LEDGER_READY',
      ledger_ready:      true,
      blocking_reason:   null,
      entries,
      entry_count:       entries.length,
      hash_chain_valid:  true,
      last_entry_hash:   last_hash,
      verifier_verified: true,
      created_at:        now,
      ..._locked(),
    };
  }

  const eff_verifier = verifier_result !== undefined ? verifier_result : null;

  // ── Gate 1: verifier ready ─────────────────────────────────
  if (!eff_verifier || eff_verifier.verify_ready !== true) {
    return _blocked('POST_TAG_LEDGER_BLOCKED_VERIFIER', 'receipt_verifier_not_ready', {
      ledger_id,
      verifier_verified: false,
      created_at:        now,
    });
  }

  const events = [];

  // Snapshot event
  if (snapshot_result) {
    events.push({
      event_type: 'FINAL_PREFLIGHT_SNAPSHOT_READY',
      data: {
        snapshot_id:            snapshot_result.snapshot_id ?? null,
        target_tag:             snapshot_result.target_tag  ?? null,
        git_head:               snapshot_result.git_head    ?? null,
        evidence_source:        snapshot_result.evidence_source ?? null,
        tag_created:            false,
        actual_real_tag_created: false,
      },
    });
  }

  // Command package event
  if (command_package_result) {
    events.push({
      event_type: 'FINAL_COMMAND_PACKAGE_READY',
      data: {
        package_id:  command_package_result.command_package_id ?? null,
        target_tag:  command_package_result.target_tag         ?? null,
        tag_created: false,
      },
    });
  }

  // Import gate event
  if (import_gate_result) {
    const gate_type = import_gate_result.is_real_tag_receipt === true
      ? 'HUMAN_RECEIPT_IMPORT_GATE_REAL_TAG_READY'
      : 'HUMAN_RECEIPT_IMPORT_GATE_DRY_RUN_READY';
    events.push({
      event_type: gate_type,
      data: {
        gate_id:             import_gate_result.gate_id          ?? null,
        is_real_tag_receipt: import_gate_result.is_real_tag_receipt ?? false,
        deploy_performed:    false,
        stable_promoted:     false,
        release_performed:   false,
      },
    });
  }

  // Verifier event
  const verify_type = eff_verifier.is_real_tag_verified === true
    ? 'HUMAN_RECEIPT_VERIFY_REAL_TAG_CONFIRMED'
    : 'HUMAN_RECEIPT_VERIFY_DRY_RUN_CONFIRMED';
  events.push({
    event_type: verify_type,
    data: {
      verify_id:            eff_verifier.verify_id           ?? null,
      is_real_tag_verified: eff_verifier.is_real_tag_verified ?? false,
      tag_created:          false,
      actual_real_tag_created: false,
      deploy_performed:     false,
      stable_promoted:      false,
      release_performed:    false,
    },
  });

  const entries    = _buildChain(events, now);
  const last_hash  = entries[entries.length - 1].entry_hash;

  return {
    schema_version:    SCHEMA_VERSION,
    ledger_id,
    ledger_status:     'POST_TAG_LEDGER_READY',
    ledger_ready:      true,
    blocking_reason:   null,
    entries,
    entry_count:       entries.length,
    hash_chain_valid:  true,
    last_entry_hash:   last_hash,
    verifier_verified: true,
    created_at:        now,
    ..._locked(),
  };
}

export function validatePostTagAuditLedgerBinding(result) {
  const failures = [];
  if (!result) { failures.push('result_null'); return failures; }
  if (result.actual_real_tag_created === true) failures.push('actual_real_tag_created must be false');
  if (result.tag_created             === true) failures.push('tag_created must be false');
  if (result.deploy_performed        === true) failures.push('deploy_performed must be false');
  if (result.stable_promoted         === true) failures.push('stable_promoted must be false');
  if (result.release_performed       === true) failures.push('release_performed must be false');
  // Verify hash chain integrity
  if (result.entries && Array.isArray(result.entries)) {
    let prev_hash = '0'.repeat(32);
    for (const entry of result.entries) {
      const expected = _sha256(`${prev_hash}:${entry.event_type}:${JSON.stringify(entry.data)}:${result.created_at}`).slice(0, 32);
      if (entry.entry_hash !== expected) {
        failures.push(`hash_chain_broken at ${entry.event_type}`);
      }
      if (entry.prev_hash !== prev_hash) {
        failures.push(`prev_hash_broken at ${entry.event_type}`);
      }
      prev_hash = entry.entry_hash;
    }
  }
  return failures;
}

export function renderPostTagAuditLedgerBinding(result) {
  if (!result) return 'post_tag_audit_ledger_binding: null';
  const lines = [
    `ledger_status              : ${result.ledger_status ?? 'UNKNOWN'}`,
    `ledger_id                  : ${result.ledger_id ?? 'none'}`,
    `ledger_ready               : ${result.ledger_ready ?? false}`,
    `entry_count                : ${result.entry_count ?? 0}`,
    `hash_chain_valid           : ${result.hash_chain_valid ?? false}`,
    `verifier_verified          : ${result.verifier_verified ?? false}`,
    `actual_real_tag_created    : false`,
    `tag_created                : false`,
    `deploy_performed           : false`,
    `stable_promoted            : false`,
    `release_performed          : false`,
    `real_execution_not_performed: true`,
    `blocking_reason            : ${result.blocking_reason ?? 'none'}`,
  ];
  if (result.ledger_ready && result.entries) {
    lines.push('');
    lines.push('── AUDIT ENTRIES ──────────────────────────────────────────────');
    (result.entries ?? []).forEach((e, i) => {
      lines.push(`  [${i + 1}] ${e.event_type} | hash: ${e.entry_hash?.slice(0, 8)}...`);
    });
  }
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('post-tag-audit-ledger-binding.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = buildPostTagAuditLedgerBinding({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderPostTagAuditLedgerBinding(result));
  }

  process.exit(result.ledger_ready ? 0 : 1);
}
