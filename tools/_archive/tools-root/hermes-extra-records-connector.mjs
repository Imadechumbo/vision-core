#!/usr/bin/env node
/**
 * Hermes Extra Records Connector — V144.0
 *
 * Connects Hermes to extra records: graph memory, prompt cache ledger,
 * agent usage ledger, budget receipt, pass_gold record, rollback record,
 * evidence receipt, RCA record.
 *
 * Critical: evidence_receipt + pass_gold_record.
 * Optional: all others.
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v144.0';

export const CONNECTOR_STATUSES = [
  'CONNECTOR_BLOCKED_INPUT',
  'CONNECTOR_BLOCKED_CRITICAL_MISSING',
  'CONNECTOR_PARTIAL',
  'CONNECTOR_READY',
];

export const RECORD_TYPES = [
  'graph_memory',
  'prompt_cache_ledger',
  'agent_usage_ledger',
  'budget_receipt',
  'pass_gold_record',
  'rollback_record',
  'evidence_receipt',
  'rca_record',
];

const CRITICAL_RECORDS = ['evidence_receipt', 'pass_gold_record'];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    stable_promoted:   false,
    deploy_performed:  false,
    release_performed: false,
  };
}

export function connectExtraRecords(params) {
  const {
    mission_id,
    graph_memory             = null,
    prompt_cache_ledger      = null,
    agent_usage_ledger       = null,
    budget_receipt           = null,
    pass_gold_record         = null,
    rollback_record          = null,
    evidence_receipt         = null,
    rca_record               = null,
    connected_at,
  } = params || {};

  const connectorKey = [
    mission_id,
    graph_memory !== null ? 'y' : 'n',
    prompt_cache_ledger !== null ? 'y' : 'n',
    agent_usage_ledger !== null ? 'y' : 'n',
    budget_receipt !== null ? 'y' : 'n',
    pass_gold_record !== null ? 'y' : 'n',
    rollback_record !== null ? 'y' : 'n',
    evidence_receipt !== null ? 'y' : 'n',
    rca_record !== null ? 'y' : 'n',
  ].join('|');
  const connector_id = _sha256(connectorKey);

  if (!mission_id || String(mission_id).trim() === '') {
    return {
      connector_id,
      schema_version:         SCHEMA_VERSION,
      connector_status:       'CONNECTOR_BLOCKED_INPUT',
      connected_record_count: 0,
      missing_critical:       [],
      blocked_reason:         'mission_id is required.',
      ..._locked(),
    };
  }

  const recordMap = {
    graph_memory,
    prompt_cache_ledger,
    agent_usage_ledger,
    budget_receipt,
    pass_gold_record,
    rollback_record,
    evidence_receipt,
    rca_record,
  };

  const connected = RECORD_TYPES.filter(r => recordMap[r] !== null && recordMap[r] !== undefined);
  const missing_critical = CRITICAL_RECORDS.filter(r => !recordMap[r]);

  if (missing_critical.length > 0) {
    return {
      connector_id,
      schema_version:         SCHEMA_VERSION,
      connector_status:       'CONNECTOR_BLOCKED_CRITICAL_MISSING',
      connected_record_count: connected.length,
      connected_records:      connected,
      missing_critical,
      mission_id,
      blocked_reason:         `Critical records missing: ${missing_critical.join(', ')}.`,
      connected_at:           connected_at ?? new Date().toISOString(),
      ..._locked(),
    };
  }

  const optional_missing = RECORD_TYPES.filter(r =>
    !CRITICAL_RECORDS.includes(r) && !recordMap[r]
  );

  const connector_status = optional_missing.length > 0 ? 'CONNECTOR_PARTIAL' : 'CONNECTOR_READY';

  return {
    connector_id,
    schema_version:           SCHEMA_VERSION,
    connector_status,
    connected_record_count:   connected.length,
    connected_records:        connected,
    missing_optional_records: optional_missing,
    mission_id,
    graph_memory_connected:      graph_memory !== null,
    prompt_cache_ledger_connected: prompt_cache_ledger !== null,
    agent_usage_ledger_connected: agent_usage_ledger !== null,
    budget_receipt_connected:    budget_receipt !== null,
    pass_gold_record_connected:  pass_gold_record !== null,
    rollback_record_connected:   rollback_record !== null,
    evidence_receipt_connected:  evidence_receipt !== null,
    rca_record_connected:        rca_record !== null,
    connected_at:                connected_at ?? new Date().toISOString(),
    ..._locked(),
  };
}

export function validateExtraRecordsConnector(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'connector_id', 'schema_version', 'connector_status',
    'connected_record_count',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.stable_promoted   !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed  !== false) errors.push('deploy_performed must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!CONNECTOR_STATUSES.includes(result.connector_status)) {
    errors.push(`invalid connector_status: ${result.connector_status}`);
  }
  return { valid: errors.length === 0, errors };
}

export function renderExtraRecordsConnector(result) {
  if (!result || typeof result !== 'object') {
    return '[HERMES_EXTRA_RECORDS_CONNECTOR] No result to render.';
  }
  const lines = [
    `=== Hermes Extra Records Connector [${SCHEMA_VERSION}] ===`,
    `Connector status:     ${result.connector_status ?? 'N/A'}`,
    `Mission:              ${result.mission_id ?? 'N/A'}`,
    `Connected records:    ${result.connected_record_count ?? 0}`,
    `--- Records ---`,
    `graph_memory:         ${result.graph_memory_connected ?? false}`,
    `prompt_cache_ledger:  ${result.prompt_cache_ledger_connected ?? false}`,
    `agent_usage_ledger:   ${result.agent_usage_ledger_connected ?? false}`,
    `budget_receipt:       ${result.budget_receipt_connected ?? false}`,
    `pass_gold_record:     ${result.pass_gold_record_connected ?? false}`,
    `rollback_record:      ${result.rollback_record_connected ?? false}`,
    `evidence_receipt:     ${result.evidence_receipt_connected ?? false}`,
    `rca_record:           ${result.rca_record_connected ?? false}`,
    `Connected at:         ${result.connected_at ?? 'N/A'}`,
    `--- REGRA ABSOLUTA ---`,
    `stable_promoted=false | deploy_performed=false | release_performed=false`,
  ];
  return lines.join('\n');
}
