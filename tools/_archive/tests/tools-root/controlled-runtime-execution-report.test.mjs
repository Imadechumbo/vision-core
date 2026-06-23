#!/usr/bin/env node
/**
 * Tests — Controlled Runtime Execution Report V155.1
 */

import {
  buildControlledRuntimeExecutionReport,
  validateControlledRuntimeExecutionReport,
  renderControlledRuntimeExecutionReport,
  EXECUTION_REPORT_STATUSES,
} from '../controlled-runtime-execution-report.mjs';

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

const FULL_READY = {
  report_id:               'v155.1-report',
  ledger_id:               'v155.0-ledger',
  evidence_package_id:     'v154.1-package',
  ledger_event_count:      9,
  ledger_closed:           true,
  evidence_package_sealed: true,
  dry_run_confirmed:       true,
  reported_at:             '2026-05-21T20:00:00.000Z',
};

console.log('\n=== controlled-runtime-execution-report tests ===\n');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildControlledRuntimeExecutionReport({});
  assert('no report_id → BLOCKED_INPUT', r.execution_report_status === 'EXECUTION_REPORT_BLOCKED_INPUT');
  assert('future_execution_ready=false', r.future_execution_ready === false);
  assert('human_command_required=true', r.human_command_required === true);
  assert('execution_performed=false', r.execution_performed === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
}
{
  const r = buildControlledRuntimeExecutionReport({ report_id: 'r1' });
  assert('report_id but no ledger_id → BLOCKED_INPUT', r.execution_report_status === 'EXECUTION_REPORT_BLOCKED_INPUT');
}
{
  const r = buildControlledRuntimeExecutionReport(null);
  assert('null → BLOCKED_INPUT', r.execution_report_status === 'EXECUTION_REPORT_BLOCKED_INPUT');
}

// --- partial ---
console.log('--- partial ---');
{
  const r = buildControlledRuntimeExecutionReport({ report_id: 'r1', ledger_id: 'l1' });
  assert('no events + no pkg → PARTIAL', r.execution_report_status === 'EXECUTION_REPORT_PARTIAL');
  assert('future_execution_ready=false', r.future_execution_ready === false);
  assert('missing_conditions is array', Array.isArray(r.missing_conditions));
  assert('missing_conditions has 3 items', r.missing_conditions.length === 3);
}
{
  const r = buildControlledRuntimeExecutionReport({
    ...FULL_READY,
    evidence_package_sealed: false,
    dry_run_confirmed: false,
  });
  assert('no pkg + no dry-run → PARTIAL', r.execution_report_status === 'EXECUTION_REPORT_PARTIAL');
}
{
  const r = buildControlledRuntimeExecutionReport({
    ...FULL_READY,
    ledger_event_count: 0,
  });
  assert('0 events → PARTIAL', r.execution_report_status === 'EXECUTION_REPORT_PARTIAL');
}
{
  const r = buildControlledRuntimeExecutionReport({
    ...FULL_READY,
    evidence_package_status: 'EVIDENCE_PACKAGE_SEALED',
    evidence_package_sealed: undefined,
  });
  assert('evidence_package_status=SEALED counts as sealed → READY', r.execution_report_status === 'EXECUTION_REPORT_READY');
}

// --- ready ---
console.log('--- ready ---');
{
  const r = buildControlledRuntimeExecutionReport({ ...FULL_READY });
  assert('all ready → EXECUTION_REPORT_READY', r.execution_report_status === 'EXECUTION_REPORT_READY');
  assert('schema_version=v155.1', r.schema_version === 'v155.1');
  assert('report_id propagated', r.report_id === 'v155.1-report');
  assert('ledger_id propagated', r.ledger_id === 'v155.0-ledger');
  assert('evidence_package_id propagated', r.evidence_package_id === 'v154.1-package');
  assert('ledger_event_count=9', r.ledger_event_count === 9);
  assert('ledger_closed=true', r.ledger_closed === true);
  assert('evidence_package_sealed=true', r.evidence_package_sealed === true);
  assert('dry_run_confirmed=true', r.dry_run_confirmed === true);
  assert('future_execution_ready=true', r.future_execution_ready === true);
  assert('human_command_required=true', r.human_command_required === true);
  assert('execution_performed=false', r.execution_performed === false);
  assert('stable_promoted=false', r.stable_promoted === false);
  assert('deploy_performed=false', r.deploy_performed === false);
  assert('release_performed=false', r.release_performed === false);
  assert('reported_at propagated', r.reported_at === '2026-05-21T20:00:00.000Z');
  assert('report_id_hash sha256', /^[a-f0-9]{64}$/.test(r.report_id_hash));
}

// --- summary field ---
{
  const r = buildControlledRuntimeExecutionReport({ ...FULL_READY, summary: 'All good.' });
  assert('summary propagated', r.summary === 'All good.');
}
{
  const r = buildControlledRuntimeExecutionReport({ ...FULL_READY });
  assert('no summary → null', r.summary === null);
}

// --- deterministic hash ---
console.log('--- deterministic hash ---');
{
  const r1 = buildControlledRuntimeExecutionReport({ ...FULL_READY });
  const r2 = buildControlledRuntimeExecutionReport({ ...FULL_READY });
  assert('report_id_hash deterministic', r1.report_id_hash === r2.report_id_hash);
}
{
  const r1 = buildControlledRuntimeExecutionReport({ ...FULL_READY, report_id: 'a' });
  const r2 = buildControlledRuntimeExecutionReport({ ...FULL_READY, report_id: 'b' });
  assert('different report_id → different hash', r1.report_id_hash !== r2.report_id_hash);
}

// --- reported_at default ---
{
  const r = buildControlledRuntimeExecutionReport({ report_id: 'rx', ledger_id: 'lx' });
  assert('no reported_at → auto ISO', typeof r.reported_at === 'string' && r.reported_at.length > 0);
}

// --- REGRA ABSOLUTA ---
console.log('--- REGRA ABSOLUTA ---');
{
  const cases = [
    buildControlledRuntimeExecutionReport({}),
    buildControlledRuntimeExecutionReport({ ...FULL_READY }),
    buildControlledRuntimeExecutionReport({ report_id: 'rx', ledger_id: 'lx' }),
  ];
  for (const r of cases) {
    assert(`human_command_required=true [${r.execution_report_status}]`, r.human_command_required === true);
    assert(`execution_performed=false [${r.execution_report_status}]`, r.execution_performed === false);
    assert(`stable_promoted=false [${r.execution_report_status}]`, r.stable_promoted === false);
    assert(`deploy_performed=false [${r.execution_report_status}]`, r.deploy_performed === false);
    assert(`release_performed=false [${r.execution_report_status}]`, r.release_performed === false);
  }
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildControlledRuntimeExecutionReport({ ...FULL_READY });
  const v = validateControlledRuntimeExecutionReport(r);
  assert('validate ready → valid=true', v.valid === true);
  assert('no errors', v.errors.length === 0);
}
{
  const r = buildControlledRuntimeExecutionReport({});
  const v = validateControlledRuntimeExecutionReport(r);
  assert('validate blocked → valid=true', v.valid === true);
}
{
  const r = buildControlledRuntimeExecutionReport({ report_id: 'r1', ledger_id: 'l1' });
  const v = validateControlledRuntimeExecutionReport(r);
  assert('validate partial → valid=true', v.valid === true);
}
{
  assert('validate null → invalid', validateControlledRuntimeExecutionReport(null).valid === false);
}
{
  const r = buildControlledRuntimeExecutionReport({ ...FULL_READY });
  assert('human_command_required tampered → invalid', validateControlledRuntimeExecutionReport({ ...r, human_command_required: false }).valid === false);
}
{
  const r = buildControlledRuntimeExecutionReport({ ...FULL_READY });
  assert('execution_performed tampered → invalid', validateControlledRuntimeExecutionReport({ ...r, execution_performed: true }).valid === false);
}
{
  const r = buildControlledRuntimeExecutionReport({ ...FULL_READY });
  assert('READY with future_execution_ready=false → invalid', validateControlledRuntimeExecutionReport({ ...r, future_execution_ready: false }).valid === false);
}
{
  const r = buildControlledRuntimeExecutionReport({ ...FULL_READY });
  assert('READY with evidence_package_sealed=false → invalid', validateControlledRuntimeExecutionReport({ ...r, evidence_package_sealed: false }).valid === false);
}
{
  const r = buildControlledRuntimeExecutionReport({});
  assert('BLOCKED with future_execution_ready=true → invalid', validateControlledRuntimeExecutionReport({ ...r, future_execution_ready: true }).valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildControlledRuntimeExecutionReport({ ...FULL_READY, summary: 'Test summary.' });
  const s = renderControlledRuntimeExecutionReport(r);
  assert('render string', typeof s === 'string');
  assert('render shows READY', s.includes('EXECUTION_REPORT_READY'));
  assert('render shows REGRA', s.includes('human_command_required=true'));
  assert('render shows report_id', s.includes('v155.1-report'));
  assert('render shows summary', s.includes('Test summary.'));
}
{
  const r = buildControlledRuntimeExecutionReport({});
  const s = renderControlledRuntimeExecutionReport(r);
  assert('blocked render shows blocked_reason', s.includes('Blocked reason') || s.includes('blocked_reason'));
}
{
  const r = buildControlledRuntimeExecutionReport({ report_id: 'r1', ledger_id: 'l1' });
  const s = renderControlledRuntimeExecutionReport(r);
  assert('partial render shows missing', s.includes('Missing') || s.includes('missing'));
}
{
  assert('render null graceful', typeof renderControlledRuntimeExecutionReport(null) === 'string');
}

// --- exports ---
console.log('--- exports ---');
{
  assert('EXECUTION_REPORT_STATUSES is array', Array.isArray(EXECUTION_REPORT_STATUSES));
  assert('EXECUTION_REPORT_STATUSES length=3', EXECUTION_REPORT_STATUSES.length === 3);
  for (const s of ['EXECUTION_REPORT_BLOCKED_INPUT', 'EXECUTION_REPORT_PARTIAL', 'EXECUTION_REPORT_READY']) {
    assert(`status present: ${s}`, EXECUTION_REPORT_STATUSES.includes(s));
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
