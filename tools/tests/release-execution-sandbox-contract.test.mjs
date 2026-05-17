#!/usr/bin/env node
/**
 * Release Execution Sandbox Contract — Unit Tests V51.0
 */

import {
  createReleaseExecutionSandbox,
  validateReleaseExecutionSandbox,
  normalizeReleaseExecutionSandbox,
  renderReleaseExecutionSandboxSummary,
  SANDBOX_STATUSES,
  SANDBOX_DENIED_OPERATIONS,
} from '../release-execution-sandbox-contract.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-17T12:00:00.000Z';

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(SANDBOX_STATUSES),                              '[A-01] statuses array');
assert(SANDBOX_STATUSES.length === 7,                                '[A-02] 7 statuses');
assert(SANDBOX_STATUSES.includes('SANDBOX_MISSING'),                 '[A-03] SANDBOX_MISSING');
assert(SANDBOX_STATUSES.includes('SANDBOX_INVALID'),                 '[A-04] SANDBOX_INVALID');
assert(SANDBOX_STATUSES.includes('SANDBOX_EXPIRED'),                 '[A-05] SANDBOX_EXPIRED');
assert(SANDBOX_STATUSES.includes('SANDBOX_BLOCKED_HANDOFF'),         '[A-06] BLOCKED_HANDOFF');
assert(SANDBOX_STATUSES.includes('SANDBOX_BLOCKED_EVIDENCE'),        '[A-07] BLOCKED_EVIDENCE');
assert(SANDBOX_STATUSES.includes('SANDBOX_BLOCKED_WRITE_ROOT'),      '[A-08] BLOCKED_WRITE_ROOT');
assert(SANDBOX_STATUSES.includes('SANDBOX_READY'),                   '[A-09] SANDBOX_READY');
assert(Array.isArray(SANDBOX_DENIED_OPERATIONS),                     '[A-10] denied ops array');
assert(SANDBOX_DENIED_OPERATIONS.includes('git_tag_create'),         '[A-11] git_tag_create denied');
assert(SANDBOX_DENIED_OPERATIONS.includes('git_push'),               '[A-12] git_push denied');
assert(SANDBOX_DENIED_OPERATIONS.includes('deploy_execute'),         '[A-13] deploy_execute denied');
assert(SANDBOX_DENIED_OPERATIONS.includes('stable_promote'),         '[A-14] stable_promote denied');
assert(SANDBOX_DENIED_OPERATIONS.includes('production_write'),       '[A-15] production_write denied');
assert(SANDBOX_DENIED_OPERATIONS.includes('evidence_override'),      '[A-16] evidence_override denied');
assert(SANDBOX_DENIED_OPERATIONS.includes('go_core_override'),       '[A-17] go_core_override denied');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = createReleaseExecutionSandbox({ fixture_mode: true, _mock_timestamp: TS });
assert(fix.sandbox_status                === 'SANDBOX_READY',        '[B-01] status=READY');
assert(fix.sandbox_ready                 === true,                   '[B-02] ready=true');
assert(typeof fix.sandbox_id             === 'string',               '[B-03] sandbox_id string');
assert(fix.evidence_source               === 'go-core',             '[B-04] evidence_source=go-core');
assert(fix.sandbox_only                  === true,                   '[B-05] sandbox_only=true');
assert(fix.rehearsal_only                === true,                   '[B-06] rehearsal_only=true');
assert(fix.local_only                    === true,                   '[B-07] local_only=true');
assert(fix.deploy_allowed                === false,                  '[B-08] deploy=false');
assert(fix.promotion_allowed             === false,                  '[B-09] promotion=false');
assert(fix.stable_allowed                === false,                  '[B-10] stable=false');
assert(fix.tag_allowed                   === false,                  '[B-11] tag=false');
assert(fix.release_execution_allowed     === false,                  '[B-12] release_execution_allowed=false');
assert(fix.release_performed             === false,                  '[B-13] release_performed=false');
assert(fix.tag_created                   === false,                  '[B-14] tag_created=false');
assert(fix.stable_promoted               === false,                  '[B-15] stable_promoted=false');
assert(fix.deploy_performed              === false,                  '[B-16] deploy_performed=false');
assert(Array.isArray(fix.denied_operations),                         '[B-17] denied_operations array');
assert(fix.denied_operations.includes('git_tag_create'),             '[B-18] git_tag_create in denied');
assert(fix.denied_operations.includes('deploy_execute'),             '[B-19] deploy_execute in denied');
assert(Array.isArray(fix.allowed_write_roots),                       '[B-20] allowed_write_roots array');
assert(fix.schema_version                === 'v51.0',                '[B-21] schema=v51.0');
assert(fix.blocking_reason               === null,                   '[B-22] blocking_reason=null');

// ─── Suite C: Missing handoff blocked ────────────────────────────
console.log('\n[Suite C] Blocked — missing handoff');
const noHandoff = createReleaseExecutionSandbox({ _mock_timestamp: TS });
assert(noHandoff.sandbox_status          === 'SANDBOX_BLOCKED_HANDOFF', '[C-01] status=BLOCKED_HANDOFF');
assert(noHandoff.sandbox_ready           === false,                  '[C-02] ready=false');
assert(noHandoff.deploy_allowed          === false,                  '[C-03] deploy=false');

const notReadyHandoff = createReleaseExecutionSandbox({
  handoff_package: { handoff_ready: false, handoff_status: 'HANDOFF_MISSING' },
  _mock_timestamp: TS,
});
assert(notReadyHandoff.sandbox_status    === 'SANDBOX_BLOCKED_HANDOFF', '[C-04] not-ready handoff blocked');

// ─── Suite D: Blocked — bad evidence source ───────────────────────
console.log('\n[Suite D] Blocked — evidence source');
const backendSrc = createReleaseExecutionSandbox({
  handoff_package: { handoff_ready: true, evidence_source: 'backend', handoff_id: 'h1' },
  sandbox_root: 'temp/sandbox/test',
  _mock_timestamp: TS,
});
assert(backendSrc.sandbox_status         === 'SANDBOX_BLOCKED_EVIDENCE', '[D-01] backend source blocked');
assert(backendSrc.deploy_allowed         === false,                  '[D-02] deploy=false');

// ─── Suite E: Blocked — invalid write root ────────────────────────
console.log('\n[Suite E] Blocked — invalid write root');
const badRoot = createReleaseExecutionSandbox({
  handoff_package: { handoff_ready: true, evidence_source: 'go-core', handoff_id: 'h1' },
  sandbox_root: '/var/production/releases',
  _mock_timestamp: TS,
});
assert(badRoot.sandbox_status            === 'SANDBOX_BLOCKED_WRITE_ROOT', '[E-01] bad root blocked');
assert(badRoot.deploy_allowed            === false,                  '[E-02] deploy=false');

const badWriteRoot = createReleaseExecutionSandbox({
  handoff_package: { handoff_ready: true, evidence_source: 'go-core', handoff_id: 'h1' },
  sandbox_root: 'temp/sandbox/ok',
  allowed_write_roots: ['temp/sandbox/ok', '/etc/production'],
  _mock_timestamp: TS,
});
assert(badWriteRoot.sandbox_status       === 'SANDBOX_BLOCKED_WRITE_ROOT', '[E-03] bad write_root in list blocked');

// ─── Suite F: Valid sandbox from handoff ──────────────────────────
console.log('\n[Suite F] Valid sandbox from handoff');
const goodHandoff = {
  handoff_ready:       true,
  handoff_id:          'hid-001',
  request_id:          'rid-001',
  preflight_id:        'pid-001',
  dry_run_report_id:   'drid-001',
  evidence_receipt_id: 'eid-001',
  evidence_source:     'go-core',
  target_version:      '2.0.0',
  target_branch:       'main',
  git_head:            'abc123',
};
const valid = createReleaseExecutionSandbox({
  handoff_package:     goodHandoff,
  sandbox_root:        'temp/sandbox/v2',
  allowed_write_roots: ['temp/sandbox/v2', 'temp/rehearsal/v2'],
  _mock_timestamp:     TS,
});
assert(valid.sandbox_status              === 'SANDBOX_READY',        '[F-01] status=READY');
assert(valid.sandbox_ready               === true,                   '[F-02] ready=true');
assert(valid.handoff_id                  === 'hid-001',              '[F-03] handoff_id propagated');
assert(valid.evidence_receipt_id         === 'eid-001',              '[F-04] evidence_receipt_id propagated');
assert(valid.evidence_source             === 'go-core',             '[F-05] source=go-core');
assert(valid.target_version              === '2.0.0',                '[F-06] target_version propagated');
assert(valid.sandbox_root                === 'temp/sandbox/v2',      '[F-07] sandbox_root set');
assert(valid.denied_operations.length    === 7,                      '[F-08] 7 denied ops');
assert(valid.deploy_allowed              === false,                  '[F-09] deploy=false');
assert(valid.release_execution_allowed   === false,                  '[F-10] exec=false');

// ─── Suite G: Validate ────────────────────────────────────────────
console.log('\n[Suite G] Validate');
const valNull = validateReleaseExecutionSandbox(null);
assert(valNull.sandbox_status            === 'SANDBOX_MISSING',      '[G-01] null → MISSING');

const valBadSchema = validateReleaseExecutionSandbox({ schema_version: 'v1.0', sandbox_id: 'x', denied_operations: ['a'] });
assert(valBadSchema.sandbox_status       === 'SANDBOX_INVALID',      '[G-02] wrong schema → INVALID');

const expired = {
  schema_version:    'v51.0',
  sandbox_id:        'sid',
  evidence_source:   'go-core',
  denied_operations: SANDBOX_DENIED_OPERATIONS,
  expires_at:        '2020-01-01T00:00:00.000Z',
};
const valExpired = validateReleaseExecutionSandbox(expired);
assert(valExpired.sandbox_status         === 'SANDBOX_EXPIRED',      '[G-03] expired → EXPIRED');

const good = {
  schema_version:    'v51.0',
  sandbox_id:        'sid-001',
  evidence_source:   'go-core',
  denied_operations: SANDBOX_DENIED_OPERATIONS,
  expires_at:        '2099-01-01T00:00:00.000Z',
};
const valGood = validateReleaseExecutionSandbox(good);
assert(valGood.sandbox_status            === 'SANDBOX_READY',        '[G-04] valid → READY');
assert(valGood.deploy_allowed            === false,                  '[G-05] deploy=false');

// ─── Suite H: Normalize ───────────────────────────────────────────
console.log('\n[Suite H] Normalize');
const norm = normalizeReleaseExecutionSandbox(fix);
assert(norm !== null,                                                '[H-01] normalize not null');
assert(norm.sandbox_ready                === true,                   '[H-02] sandbox_ready=true');
assert(norm.evidence_source              === 'go-core',             '[H-03] source=go-core');
assert(norm.deploy_allowed               === false,                  '[H-04] deploy=false');
assert(normalizeReleaseExecutionSandbox(null) === null,              '[H-05] null → null');

// ─── Suite I: Render ──────────────────────────────────────────────
console.log('\n[Suite I] Render');
const summary = renderReleaseExecutionSandboxSummary(fix);
assert(typeof summary                    === 'string',               '[I-01] summary string');
assert(summary.includes('SANDBOX_READY'),                           '[I-02] summary has status');
assert(summary.includes('go-core'),                                  '[I-03] summary has source');
assert(renderReleaseExecutionSandboxSummary(null) === 'sandbox: null', '[I-04] null → null string');

// ─── Suite J: Invariants ──────────────────────────────────────────
console.log('\n[Suite J] Invariants — all results');
const allResults = [fix, noHandoff, backendSrc, badRoot, valid, valGood];
for (const r of allResults) {
  assert(r.deploy_allowed            === false, `[J] ${r.sandbox_status}: deploy=false`);
  assert(r.release_performed         === false, `[J] ${r.sandbox_status}: release_performed=false`);
  assert(r.tag_created               === false, `[J] ${r.sandbox_status}: tag_created=false`);
  assert(r.stable_promoted           === false, `[J] ${r.sandbox_status}: stable_promoted=false`);
  assert(r.deploy_performed          === false, `[J] ${r.sandbox_status}: deploy_performed=false`);
}

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nrelease-execution-sandbox-contract: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
