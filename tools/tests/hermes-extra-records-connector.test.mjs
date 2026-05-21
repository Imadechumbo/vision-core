#!/usr/bin/env node
/**
 * Tests — Hermes Extra Records Connector V144.0
 */

import {
  connectExtraRecords,
  validateExtraRecordsConnector,
  renderExtraRecordsConnector,
  CONNECTOR_STATUSES,
  RECORD_TYPES,
} from '../hermes-extra-records-connector.mjs';

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label}`);
    failed++;
  }
}

const FULL = {
  mission_id:          'connector-1',
  graph_memory:        { type: 'graph', data: {} },
  prompt_cache_ledger: { ledger_id: 'l1' },
  agent_usage_ledger:  { ledger_id: 'l2' },
  budget_receipt:      { receipt_id: 'r1' },
  pass_gold_record:    { pass_gold: true },
  rollback_record:     { rollback_id: 'rb1' },
  evidence_receipt:    { receipt_id: 'er1' },
  rca_record:          { rca_id: 'rca1' },
  connected_at:        '2026-05-20T15:00:00.000Z',
};

console.log('\n=== hermes-extra-records-connector tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = connectExtraRecords({ ...FULL, mission_id: '' });
  assert('empty mission_id → CONNECTOR_BLOCKED_INPUT', r.connector_status === 'CONNECTOR_BLOCKED_INPUT');
  assert('connected_record_count=0', r.connected_record_count === 0);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = connectExtraRecords({});
  assert('no params → CONNECTOR_BLOCKED_INPUT', r.connector_status === 'CONNECTOR_BLOCKED_INPUT');
}

// --- critical missing ---
console.log('--- critical missing ---');
{
  const r = connectExtraRecords({ ...FULL, evidence_receipt: null });
  assert('no evidence_receipt → CONNECTOR_BLOCKED_CRITICAL_MISSING', r.connector_status === 'CONNECTOR_BLOCKED_CRITICAL_MISSING');
  assert('missing_critical includes evidence_receipt', r.missing_critical.includes('evidence_receipt'));
}
{
  const r = connectExtraRecords({ ...FULL, pass_gold_record: null });
  assert('no pass_gold_record → CONNECTOR_BLOCKED_CRITICAL_MISSING', r.connector_status === 'CONNECTOR_BLOCKED_CRITICAL_MISSING');
  assert('missing_critical includes pass_gold_record', r.missing_critical.includes('pass_gold_record'));
}
{
  const r = connectExtraRecords({ ...FULL, evidence_receipt: null, pass_gold_record: null });
  assert('both critical missing → BLOCKED', r.connector_status === 'CONNECTOR_BLOCKED_CRITICAL_MISSING');
  assert('missing_critical.length=2', r.missing_critical.length === 2);
}
{
  // Only critical records present, nothing else
  const r = connectExtraRecords({
    mission_id: 'x',
    evidence_receipt: { id: 'e' },
    pass_gold_record: { pass_gold: true },
  });
  assert('only critical → CONNECTOR_PARTIAL', r.connector_status === 'CONNECTOR_PARTIAL');
}

// --- partial ---
console.log('--- partial ---');
{
  const r = connectExtraRecords({
    mission_id:       'x',
    evidence_receipt: { id: 'e' },
    pass_gold_record: { pass_gold: true },
    graph_memory:     { data: {} },
  });
  assert('some optional missing → CONNECTOR_PARTIAL', r.connector_status === 'CONNECTOR_PARTIAL');
  assert('missing_optional_records present', Array.isArray(r.missing_optional_records));
  assert('graph_memory_connected=true', r.graph_memory_connected === true);
}

// --- ready ---
console.log('--- ready ---');
{
  const r = connectExtraRecords({ ...FULL });
  assert('all connected → CONNECTOR_READY', r.connector_status === 'CONNECTOR_READY');
  assert('schema_version=v144.0', r.schema_version === 'v144.0');
  assert('mission_id propagated', r.mission_id === 'connector-1');
  assert('connected_at propagated', r.connected_at === '2026-05-20T15:00:00.000Z');
  assert('connected_record_count=8', r.connected_record_count === 8);
  assert('graph_memory_connected=true', r.graph_memory_connected === true);
  assert('prompt_cache_ledger_connected=true', r.prompt_cache_ledger_connected === true);
  assert('agent_usage_ledger_connected=true', r.agent_usage_ledger_connected === true);
  assert('budget_receipt_connected=true', r.budget_receipt_connected === true);
  assert('pass_gold_record_connected=true', r.pass_gold_record_connected === true);
  assert('rollback_record_connected=true', r.rollback_record_connected === true);
  assert('evidence_receipt_connected=true', r.evidence_receipt_connected === true);
  assert('rca_record_connected=true', r.rca_record_connected === true);
  assert('missing_optional_records empty', r.missing_optional_records.length === 0);
}

// --- REGRA invariants ---
console.log('--- REGRA invariants ---');
{
  const cases = [
    connectExtraRecords({ ...FULL }),
    connectExtraRecords({ ...FULL, mission_id: '' }),
    connectExtraRecords({ ...FULL, evidence_receipt: null }),
    connectExtraRecords({ mission_id: 'x', evidence_receipt: {id:'e'}, pass_gold_record: {pg:true} }),
  ];
  for (const r of cases) {
    assert(`stable_promoted=false [${r.connector_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.connector_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.connector_status}]`, r.release_performed === false);
  }
}

// --- deterministic connector_id ---
console.log('--- deterministic connector_id ---');
{
  const r1 = connectExtraRecords({ ...FULL });
  const r2 = connectExtraRecords({ ...FULL });
  assert('connector_id deterministic', r1.connector_id === r2.connector_id);
  assert('connector_id sha256', /^[a-f0-9]{64}$/.test(r1.connector_id));
}

// --- validate ---
console.log('--- validate ---');
{
  const r = connectExtraRecords({ ...FULL });
  const v = validateExtraRecordsConnector(r);
  assert('validate ready → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = connectExtraRecords({ ...FULL, evidence_receipt: null });
  const v = validateExtraRecordsConnector(r);
  assert('validate critical missing → valid=true struct', v.valid === true);
}
{
  const v = validateExtraRecordsConnector(null);
  assert('validate null → invalid', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = connectExtraRecords({ ...FULL });
  const s = renderExtraRecordsConnector(r);
  assert('render string', typeof s === 'string');
  assert('render shows CONNECTOR_READY', s.includes('CONNECTOR_READY'));
  assert('render shows REGRA', s.includes('stable_promoted=false'));
  assert('render shows graph_memory', s.includes('graph_memory:'));
}
{
  const r = connectExtraRecords({ ...FULL, evidence_receipt: null });
  const s = renderExtraRecordsConnector(r);
  assert('render blocked', s.includes('CONNECTOR_BLOCKED_CRITICAL_MISSING'));
}
{
  const s = renderExtraRecordsConnector(null);
  assert('render null graceful', typeof s === 'string');
}

// --- exports ---
console.log('--- exports ---');
{
  assert('CONNECTOR_STATUSES is array', Array.isArray(CONNECTOR_STATUSES));
  assert('CONNECTOR_STATUSES length=4', CONNECTOR_STATUSES.length === 4);
  assert('RECORD_TYPES is array', Array.isArray(RECORD_TYPES));
  assert('RECORD_TYPES length=8', RECORD_TYPES.length === 8);
  for (const t of [
    'graph_memory', 'prompt_cache_ledger', 'agent_usage_ledger', 'budget_receipt',
    'pass_gold_record', 'rollback_record', 'evidence_receipt', 'rca_record',
  ]) {
    assert(`record type present: ${t}`, RECORD_TYPES.includes(t));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
