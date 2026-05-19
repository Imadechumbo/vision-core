#!/usr/bin/env node
/**
 * Real Tag Post-Execution Governance Ledger — V104.0
 *
 * Append-only hash-chain ledger for the full V101–V103 governance chain.
 * Does not execute anything. Records events, does not perform actions.
 *
 * REGRA ABSOLUTA: stable_promoted=false always. deploy_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v104.0';

export const POST_EXEC_GOVERNANCE_EVENT_TYPES = [
  'FINAL_RUNBOOK_READY',
  'COMMAND_SEAL_READY',
  'RECEIPT_TEMPLATE_READY',
  'MANUAL_RECEIPT_DRY_RUN_IMPORTED',
  'MANUAL_RECEIPT_REAL_TAG_IMPORTED',
  'VERIFIED_STATE_DRY_RUN_IMPORTED',
  'VERIFIED_STATE_REAL_TAG_VERIFIED',
  'STABLE_REVIEW_ELIGIBILITY_READY',
  'POST_EXECUTION_BLOCKED',
];

export const POST_EXEC_GOVERNANCE_LEDGER_STATUSES = [
  'POST_EXEC_LEDGER_BLOCKED_ELIGIBILITY',
  'POST_EXEC_LEDGER_READY',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    tag_created:                  false,
    git_push_performed:           false,
    actual_real_tag_created:      false,
    actual_git_push_performed:    false,
    deploy_performed:             false,
    stable_promoted:              false,
    release_performed:            false,
    real_execution_not_performed: true,
  };
}

function _blocked(status, blocking_reason, extra = {}) {
  return {
    schema_version: SCHEMA_VERSION,
    ledger_status:  status,
    ledger_ready:   false,
    blocking_reason,
    hash_chain_valid: false,
    entries:        [],
    ...extra,
    ..._locked(),
  };
}

function _buildEntry(seq, event_type, data, timestamp, prev_hash) {
  const entry_hash = _sha256(`${prev_hash}:${event_type}:${JSON.stringify(data)}:${timestamp}`).slice(0, 32);
  return { seq, event_type, data, timestamp, prev_hash, entry_hash };
}

export function buildRealTagPostExecutionGovernanceLedger(params = {}) {
  const {
    fixture_mode        = false,
    runbook_result,
    seal_result,
    template_result,
    import_result,
    state_result,
    eligibility_result,
    _mock_timestamp,
  } = params ?? {};

  const now       = _mock_timestamp ?? new Date().toISOString();
  const ledger_id = _sha256(`post-exec-governance-ledger:${SCHEMA_VERSION}:${now}`).slice(0, 24);

  if (fixture_mode) {
    let prev_hash = '0'.repeat(32);
    const entries = [];
    const events = [
      ['FINAL_RUNBOOK_READY',             { runbook_id: 'fixture-runbook-001',   target_tag: 'v1.0.0' }],
      ['COMMAND_SEAL_READY',              { seal_id:    'fixture-seal-001',       target_tag: 'v1.0.0' }],
      ['RECEIPT_TEMPLATE_READY',          { template_id: 'fixture-template-001', target_tag: 'v1.0.0' }],
      ['MANUAL_RECEIPT_DRY_RUN_IMPORTED', { import_id:  'fixture-import-001',    is_real_tag: false   }],
      ['VERIFIED_STATE_DRY_RUN_IMPORTED', { state_id:   'fixture-state-001',     real_tag_verified: false }],
      ['STABLE_REVIEW_ELIGIBILITY_READY', { eligibility_id: 'fixture-elig-001',  stable_review_phase_allowed: true }],
    ];
    events.forEach(([event_type, data], i) => {
      const entry = _buildEntry(i + 1, event_type, data, now, prev_hash);
      entries.push(entry);
      prev_hash = entry.entry_hash;
    });
    return {
      schema_version:   SCHEMA_VERSION,
      ledger_id,
      ledger_status:    'POST_EXEC_LEDGER_READY',
      ledger_ready:     true,
      blocking_reason:  null,
      hash_chain_valid: true,
      entry_count:      entries.length,
      entries,
      created_at:       now,
      ..._locked(),
    };
  }

  const eff_eligibility = eligibility_result !== undefined ? eligibility_result : null;

  if (!eff_eligibility || eff_eligibility.eligibility_ready !== true) {
    return _blocked('POST_EXEC_LEDGER_BLOCKED_ELIGIBILITY', 'eligibility_not_ready', {
      ledger_id, created_at: now,
    });
  }

  let prev_hash = '0'.repeat(32);
  const entries = [];

  // Add entry for each present+ready result
  if (runbook_result?.runbook_ready === true) {
    const e = _buildEntry(entries.length + 1, 'FINAL_RUNBOOK_READY', {
      runbook_id: runbook_result.runbook_id ?? null,
      target_tag: runbook_result.target_tag ?? null,
    }, now, prev_hash);
    entries.push(e); prev_hash = e.entry_hash;
  }

  if (seal_result?.command_seal_valid === true) {
    const e = _buildEntry(entries.length + 1, 'COMMAND_SEAL_READY', {
      seal_id:    seal_result.seal_id   ?? null,
      seal_hash:  seal_result.seal_hash ?? null,
    }, now, prev_hash);
    entries.push(e); prev_hash = e.entry_hash;
  }

  if (template_result?.template_ready === true) {
    const e = _buildEntry(entries.length + 1, 'RECEIPT_TEMPLATE_READY', {
      template_id: template_result.template_id ?? null,
      target_tag:  template_result.target_tag  ?? null,
    }, now, prev_hash);
    entries.push(e); prev_hash = e.entry_hash;
  }

  if (import_result?.import_ready === true) {
    const evt = import_result.is_real_tag === true
      ? 'MANUAL_RECEIPT_REAL_TAG_IMPORTED'
      : 'MANUAL_RECEIPT_DRY_RUN_IMPORTED';
    const e = _buildEntry(entries.length + 1, evt, {
      import_id:   import_result.import_id  ?? null,
      is_real_tag: import_result.is_real_tag ?? false,
    }, now, prev_hash);
    entries.push(e); prev_hash = e.entry_hash;
  }

  if (state_result?.state_ready === true) {
    const evt = state_result.real_tag_verified === true
      ? 'VERIFIED_STATE_REAL_TAG_VERIFIED'
      : 'VERIFIED_STATE_DRY_RUN_IMPORTED';
    const e = _buildEntry(entries.length + 1, evt, {
      state_id:         state_result.state_id         ?? null,
      real_tag_verified: state_result.real_tag_verified ?? false,
    }, now, prev_hash);
    entries.push(e); prev_hash = e.entry_hash;
  }

  {
    const e = _buildEntry(entries.length + 1, 'STABLE_REVIEW_ELIGIBILITY_READY', {
      eligibility_id:              eff_eligibility.eligibility_id              ?? null,
      stable_review_phase_allowed: eff_eligibility.stable_review_phase_allowed ?? false,
      real_tag_verified:           eff_eligibility.real_tag_verified            ?? false,
    }, now, prev_hash);
    entries.push(e); prev_hash = e.entry_hash;
  }

  return {
    schema_version:   SCHEMA_VERSION,
    ledger_id,
    ledger_status:    'POST_EXEC_LEDGER_READY',
    ledger_ready:     true,
    blocking_reason:  null,
    hash_chain_valid: true,
    entry_count:      entries.length,
    entries,
    created_at:       now,
    ..._locked(),
  };
}

export function validateRealTagPostExecutionGovernanceLedger(result) {
  const failures = [];
  if (!result) { failures.push('result_null'); return failures; }
  if (result.stable_promoted         === true) failures.push('stable_promoted must be false');
  if (result.deploy_performed        === true) failures.push('deploy_performed must be false');
  if (result.release_performed       === true) failures.push('release_performed must be false');
  if (result.actual_real_tag_created === true) failures.push('actual_real_tag_created must be false');
  if (result.ledger_ready === true && result.entries) {
    // Re-derive hash chain to detect tampering
    let prev_hash = '0'.repeat(32);
    for (const entry of result.entries) {
      const expected = _sha256(`${prev_hash}:${entry.event_type}:${JSON.stringify(entry.data)}:${entry.timestamp}`).slice(0, 32);
      if (expected !== entry.entry_hash) {
        failures.push(`tampered entry seq=${entry.seq} event=${entry.event_type}`);
        break;
      }
      prev_hash = entry.entry_hash;
    }
  }
  return failures;
}

export function renderRealTagPostExecutionGovernanceLedger(result) {
  if (!result) return 'real_tag_post_execution_governance_ledger: null';
  const lines = [
    `ledger_status            : ${result.ledger_status ?? 'UNKNOWN'}`,
    `ledger_id                : ${result.ledger_id ?? 'none'}`,
    `ledger_ready             : ${result.ledger_ready ?? false}`,
    `hash_chain_valid         : ${result.hash_chain_valid ?? false}`,
    `entry_count              : ${result.entry_count ?? 0}`,
    `stable_promoted          : false`,
    `deploy_performed         : false`,
    `actual_real_tag_created  : false`,
    `blocking_reason          : ${result.blocking_reason ?? 'none'}`,
  ];
  if (result.ledger_ready) {
    lines.push('');
    lines.push('── LEDGER ENTRIES ─────────────────────────────────────────────');
    (result.entries ?? []).forEach(e => lines.push(`  [${e.seq}] ${e.event_type} hash=${e.entry_hash}`));
  }
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-tag-post-execution-governance-ledger.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const fixture = args.includes('--fixture');

  const result = buildRealTagPostExecutionGovernanceLedger({ fixture_mode: fixture });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderRealTagPostExecutionGovernanceLedger(result));
  }

  process.exit(result.ledger_ready ? 0 : 1);
}
