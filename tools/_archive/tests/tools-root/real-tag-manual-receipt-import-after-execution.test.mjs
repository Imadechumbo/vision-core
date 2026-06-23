#!/usr/bin/env node
/**
 * Real Tag Manual Receipt Import After Execution — Unit Tests V102.1
 */

import {
  MANUAL_RECEIPT_IMPORT_STATUSES,
  importRealTagManualReceiptAfterExecution,
  validateRealTagManualReceiptImportAfterExecution,
  renderRealTagManualReceiptImportAfterExecution,
} from '../real-tag-manual-receipt-import-after-execution.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else   { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS  = '2026-05-19T16:30:00.000Z';
const SHA = 'abc1234def567890abc12345';

const TEMPLATE = {
  template_ready:      true,
  template_id:         'template-test-001',
  target_tag:          'v1.0.0',
  git_head:            SHA,
  evidence_receipt_id: 'receipt-001',
  rollback_anchor_id:  'anchor-001',
  command_seal_id:     'seal-001',
};

const DRY_RECEIPT = {
  schema_version:      'v102.0',
  target_tag:          'v1.0.0',
  git_head:            SHA,
  executed_by:         'Test User',
  executed_at:         TS,
  local_tag_verified:  false,
  remote_tag_verified: false,
  local_tag_head:      null,
  remote_tag_head:     null,
  tag_created:         false,
  git_push_performed:  false,
  deploy_performed:    false,
  stable_promoted:     false,
  release_performed:   false,
};

const REAL_RECEIPT = {
  ...DRY_RECEIPT,
  local_tag_verified:  true,
  remote_tag_verified: true,
  local_tag_head:      SHA,
  remote_tag_head:     SHA,
  tag_created:         true,
  git_push_performed:  true,
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(MANUAL_RECEIPT_IMPORT_STATUSES),                                 '[A-01] statuses array');
assert(MANUAL_RECEIPT_IMPORT_STATUSES.length === 9,                                   '[A-02] 9 statuses');
assert(MANUAL_RECEIPT_IMPORT_STATUSES.includes('MANUAL_RECEIPT_IMPORT_BLOCKED_TEMPLATE'), '[A-03] BLOCKED_TEMPLATE');
assert(MANUAL_RECEIPT_IMPORT_STATUSES.includes('MANUAL_RECEIPT_IMPORT_BLOCKED_SCHEMA'),   '[A-04] BLOCKED_SCHEMA');
assert(MANUAL_RECEIPT_IMPORT_STATUSES.includes('MANUAL_RECEIPT_IMPORT_BLOCKED_TARGET'),   '[A-05] BLOCKED_TARGET');
assert(MANUAL_RECEIPT_IMPORT_STATUSES.includes('MANUAL_RECEIPT_IMPORT_BLOCKED_HEAD'),     '[A-06] BLOCKED_HEAD');
assert(MANUAL_RECEIPT_IMPORT_STATUSES.includes('MANUAL_RECEIPT_IMPORT_BLOCKED_DEPLOY'),   '[A-07] BLOCKED_DEPLOY');
assert(MANUAL_RECEIPT_IMPORT_STATUSES.includes('MANUAL_RECEIPT_IMPORT_BLOCKED_STABLE'),   '[A-08] BLOCKED_STABLE');
assert(MANUAL_RECEIPT_IMPORT_STATUSES.includes('MANUAL_RECEIPT_IMPORT_BLOCKED_RELEASE'),  '[A-09] BLOCKED_RELEASE');
assert(MANUAL_RECEIPT_IMPORT_STATUSES.includes('MANUAL_RECEIPT_IMPORT_DRY_RUN'),          '[A-10] DRY_RUN');
assert(MANUAL_RECEIPT_IMPORT_STATUSES.includes('MANUAL_RECEIPT_IMPORT_REAL_TAG'),         '[A-11] REAL_TAG');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = importRealTagManualReceiptAfterExecution({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                       '[B-01] returns object');
assert(fix.import_status   === 'MANUAL_RECEIPT_IMPORT_DRY_RUN',                      '[B-02] fixture=DRY_RUN');
assert(fix.import_ready    === true,                                                  '[B-03] import_ready=true');
assert(fix.schema_version  === 'v102.1',                                              '[B-04] schema=v102.1');
assert(typeof fix.import_id === 'string' && fix.import_id.length === 24,             '[B-05] id 24 chars');
assert(fix.is_real_tag     === false,                                                 '[B-06] is_real_tag=false');
assert(fix.receipt_validated === true,                                                '[B-07] receipt_validated=true');
assert(fix.deploy_blocked  === true,                                                  '[B-08] deploy_blocked=true');
assert(fix.stable_blocked  === true,                                                  '[B-09] stable_blocked=true');
assert(fix.release_blocked === true,                                                  '[B-10] release_blocked=true');
assert(fix.created_at      === TS,                                                    '[B-11] created_at=TS');

// ─── Suite C: Invariants ──────────────────────────────────────────
console.log('\n[Suite C] Invariants');
assert(fix.actual_real_tag_created      === false, '[C-01] actual_real_tag_created=false');
assert(fix.actual_git_push_performed    === false, '[C-02] actual_git_push_performed=false');
assert(fix.deploy_performed             === false, '[C-03] deploy_performed=false');
assert(fix.stable_promoted              === false, '[C-04] stable_promoted=false');
assert(fix.release_performed            === false, '[C-05] release_performed=false');
assert(fix.real_execution_not_performed === true,  '[C-06] real_execution_not_performed=true');

// ─── Suite D: BLOCKED cases ────────────────────────────────────────
console.log('\n[Suite D] BLOCKED cases');
const bNoTemplate = importRealTagManualReceiptAfterExecution({ fixture_mode: false, _mock_timestamp: TS });
assert(bNoTemplate.import_status === 'MANUAL_RECEIPT_IMPORT_BLOCKED_TEMPLATE',       '[D-01] no template → BLOCKED_TEMPLATE');
assert(bNoTemplate.import_ready  === false,                                           '[D-02] ready=false');

const bBadSchema = importRealTagManualReceiptAfterExecution({
  fixture_mode: false, template_result: TEMPLATE,
  human_receipt: { schema_version: 'v1.0', target_tag: 'v1.0.0', git_head: SHA },
  _mock_timestamp: TS,
});
assert(bBadSchema.import_status === 'MANUAL_RECEIPT_IMPORT_BLOCKED_SCHEMA',          '[D-03] bad schema → BLOCKED_SCHEMA');

const bTargetMismatch = importRealTagManualReceiptAfterExecution({
  fixture_mode: false, template_result: TEMPLATE,
  human_receipt: { ...DRY_RECEIPT, target_tag: 'v2.0.0' }, _mock_timestamp: TS,
});
assert(bTargetMismatch.import_status === 'MANUAL_RECEIPT_IMPORT_BLOCKED_TARGET',     '[D-04] target mismatch → BLOCKED_TARGET');

const bHeadMismatch = importRealTagManualReceiptAfterExecution({
  fixture_mode: false, template_result: TEMPLATE,
  human_receipt: { ...DRY_RECEIPT, git_head: 'wrong123' }, _mock_timestamp: TS,
});
assert(bHeadMismatch.import_status === 'MANUAL_RECEIPT_IMPORT_BLOCKED_HEAD',         '[D-05] head mismatch → BLOCKED_HEAD');

const bDeploy = importRealTagManualReceiptAfterExecution({
  fixture_mode: false, template_result: TEMPLATE,
  human_receipt: { ...DRY_RECEIPT, deploy_performed: true }, _mock_timestamp: TS,
});
assert(bDeploy.import_status === 'MANUAL_RECEIPT_IMPORT_BLOCKED_DEPLOY',             '[D-06] deploy detected → BLOCKED_DEPLOY');

const bStable = importRealTagManualReceiptAfterExecution({
  fixture_mode: false, template_result: TEMPLATE,
  human_receipt: { ...DRY_RECEIPT, stable_promoted: true }, _mock_timestamp: TS,
});
assert(bStable.import_status === 'MANUAL_RECEIPT_IMPORT_BLOCKED_STABLE',             '[D-07] stable detected → BLOCKED_STABLE');

const bRelease = importRealTagManualReceiptAfterExecution({
  fixture_mode: false, template_result: TEMPLATE,
  human_receipt: { ...DRY_RECEIPT, release_performed: true }, _mock_timestamp: TS,
});
assert(bRelease.import_status === 'MANUAL_RECEIPT_IMPORT_BLOCKED_RELEASE',           '[D-08] release detected → BLOCKED_RELEASE');

// ─── Suite E: DRY_RUN import ──────────────────────────────────────
console.log('\n[Suite E] DRY_RUN import');
const dry = importRealTagManualReceiptAfterExecution({
  fixture_mode: false, template_result: TEMPLATE, human_receipt: DRY_RECEIPT, _mock_timestamp: TS,
});
assert(dry.import_status   === 'MANUAL_RECEIPT_IMPORT_DRY_RUN',                      '[E-01] dry-run → DRY_RUN');
assert(dry.import_ready    === true,                                                  '[E-02] ready=true');
assert(dry.is_real_tag     === false,                                                 '[E-03] is_real_tag=false');
assert(dry.receipt_validated === true,                                                '[E-04] validated=true');
assert(dry.actual_real_tag_created === false,                                         '[E-05] actual_tag=false');
assert(dry.deploy_performed        === false,                                         '[E-06] deploy=false');

// ─── Suite F: REAL_TAG import ─────────────────────────────────────
console.log('\n[Suite F] REAL_TAG import');
const real = importRealTagManualReceiptAfterExecution({
  fixture_mode: false, template_result: TEMPLATE, human_receipt: REAL_RECEIPT, _mock_timestamp: TS,
});
assert(real.import_status   === 'MANUAL_RECEIPT_IMPORT_REAL_TAG',                    '[F-01] real tag → REAL_TAG');
assert(real.import_ready    === true,                                                 '[F-02] ready=true');
assert(real.is_real_tag     === true,                                                 '[F-03] is_real_tag=true');
assert(real.receipt_validated === true,                                               '[F-04] validated=true');
assert(real.actual_real_tag_created === false,                                        '[F-05] actual_tag=false even for real');
assert(real.deploy_performed        === false,                                        '[F-06] deploy=false');
assert(real.stable_promoted         === false,                                        '[F-07] stable=false');

// ─── Suite G: Validate ────────────────────────────────────────────
console.log('\n[Suite G] Validate');
assert(validateRealTagManualReceiptImportAfterExecution(fix).length === 0,           '[G-01] fixture passes');
assert(validateRealTagManualReceiptImportAfterExecution(null).length > 0,            '[G-02] null fails');
assert(validateRealTagManualReceiptImportAfterExecution({ ...fix, stable_promoted: true }).length > 0, '[G-03] stable=true fails');
assert(validateRealTagManualReceiptImportAfterExecution(real).length === 0,          '[G-04] real import passes');

// ─── Suite H: Render ─────────────────────────────────────────────
console.log('\n[Suite H] Render');
const rendered = renderRealTagManualReceiptImportAfterExecution(fix);
assert(typeof rendered === 'string',                                                  '[H-01] returns string');
assert(rendered.includes('MANUAL_RECEIPT_IMPORT_DRY_RUN'),                          '[H-02] status in output');
assert(rendered.includes('actual_real_tag_created  : false'),                        '[H-03] actual_tag=false');
assert(rendered.includes('deploy_blocked           : true'),                         '[H-04] deploy_blocked=true');
assert(renderRealTagManualReceiptImportAfterExecution(null) === 'real_tag_manual_receipt_import_after_execution: null', '[H-05] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-manual-receipt-import-after-execution: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
