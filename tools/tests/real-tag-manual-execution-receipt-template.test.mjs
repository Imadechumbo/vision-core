#!/usr/bin/env node
/**
 * Real Tag Manual Execution Receipt Template — Unit Tests V102.0
 */

import {
  RECEIPT_TEMPLATE_STATUSES,
  buildRealTagManualExecutionReceiptTemplate,
  validateRealTagManualExecutionReceiptTemplate,
  renderRealTagManualExecutionReceiptTemplate,
} from '../real-tag-manual-execution-receipt-template.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else   { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS   = '2026-05-19T16:00:00.000Z';
const SHA  = 'abc1234def567890abc12345';

const SEAL_FIXTURE = {
  command_seal_valid: true,
  seal_id:            'seal-test-001',
  final_runbook_id:   'runbook-test-001',
  target_tag:         'v1.0.0',
  git_head:           SHA,
  evidence_receipt_id: 'receipt-001',
  rollback_anchor_id: 'anchor-001',
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(RECEIPT_TEMPLATE_STATUSES),                                       '[A-01] statuses array');
assert(RECEIPT_TEMPLATE_STATUSES.length === 2,                                          '[A-02] 2 statuses');
assert(RECEIPT_TEMPLATE_STATUSES.includes('RECEIPT_TEMPLATE_BLOCKED_SEAL'),            '[A-03] BLOCKED_SEAL');
assert(RECEIPT_TEMPLATE_STATUSES.includes('RECEIPT_TEMPLATE_READY'),                   '[A-04] RECEIPT_TEMPLATE_READY');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = buildRealTagManualExecutionReceiptTemplate({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                       '[B-01] returns object');
assert(fix.template_status  === 'RECEIPT_TEMPLATE_READY',                            '[B-02] fixture=READY');
assert(fix.template_ready   === true,                                                 '[B-03] template_ready=true');
assert(fix.schema_version   === 'v102.0',                                             '[B-04] schema=v102.0');
assert(typeof fix.template_id === 'string' && fix.template_id.length === 24,         '[B-05] id 24 chars');
assert(fix.blocking_reason  === null,                                                 '[B-06] blocking=null');
assert(fix.target_tag       === 'v1.0.0',                                             '[B-07] target_tag present');
assert(fix.git_head         === SHA,                                                  '[B-08] git_head present');
assert(fix.command_seal_id  === 'fixture-seal-001',                                  '[B-09] seal_id present');
assert(typeof fix.template_fields === 'object' && fix.template_fields !== null,      '[B-10] template_fields object');
assert(fix.created_at       === TS,                                                   '[B-11] created_at=TS');

// ─── Suite C: Invariants ──────────────────────────────────────────
console.log('\n[Suite C] Invariants');
assert(fix.tag_created                  === false, '[C-01] tag_created=false');
assert(fix.git_push_performed           === false, '[C-02] git_push_performed=false');
assert(fix.actual_real_tag_created      === false, '[C-03] actual_real_tag_created=false');
assert(fix.deploy_performed             === false, '[C-04] deploy_performed=false');
assert(fix.stable_promoted              === false, '[C-05] stable_promoted=false');
assert(fix.release_performed            === false, '[C-06] release_performed=false');
assert(fix.real_execution_not_performed === true,  '[C-07] real_execution_not_performed=true');

// ─── Suite D: BLOCKED_SEAL ────────────────────────────────────────
console.log('\n[Suite D] BLOCKED_SEAL');
const bNoSeal = buildRealTagManualExecutionReceiptTemplate({ fixture_mode: false, _mock_timestamp: TS });
assert(bNoSeal.template_status === 'RECEIPT_TEMPLATE_BLOCKED_SEAL',                  '[D-01] no seal → BLOCKED_SEAL');
assert(bNoSeal.template_ready  === false,                                             '[D-02] ready=false');
const bBadSeal = buildRealTagManualExecutionReceiptTemplate({
  fixture_mode: false, seal_result: { command_seal_valid: false }, _mock_timestamp: TS,
});
assert(bBadSeal.template_status === 'RECEIPT_TEMPLATE_BLOCKED_SEAL',                 '[D-03] bad seal → BLOCKED_SEAL');

// ─── Suite E: Full template ready ─────────────────────────────────
console.log('\n[Suite E] Full template ready');
const tmpl = buildRealTagManualExecutionReceiptTemplate({
  fixture_mode: false, seal_result: SEAL_FIXTURE, _mock_timestamp: TS,
});
assert(tmpl.template_status === 'RECEIPT_TEMPLATE_READY',                            '[E-01] READY with seal');
assert(tmpl.template_ready  === true,                                                 '[E-02] template_ready=true');
assert(tmpl.command_seal_id === 'seal-test-001',                                     '[E-03] seal_id linked');
assert(tmpl.target_tag      === 'v1.0.0',                                             '[E-04] target_tag');
assert(tmpl.git_head        === SHA,                                                  '[E-05] git_head');
assert(typeof tmpl.template_fields === 'object',                                     '[E-06] template_fields object');
assert(tmpl.tag_created     === false,                                                '[E-07] tag=false');
assert(tmpl.stable_promoted === false,                                                '[E-08] stable=false');

// ─── Suite F: Required fields in template_fields ──────────────────
console.log('\n[Suite F] Template fields');
const f = fix.template_fields;
assert(f.schema_version      === 'v102.0',                                           '[F-01] schema in fields=v102.0');
assert(f.target_tag          === 'v1.0.0',                                           '[F-02] target_tag in fields');
assert(f.git_head            === SHA,                                                 '[F-03] git_head in fields');
assert(f.executed_by         === '<YOUR_NAME>',                                       '[F-04] executed_by placeholder');
assert(f.executed_at         === '<ISO_TIMESTAMP>',                                  '[F-05] executed_at placeholder');
assert(f.local_tag_verified  === false,                                               '[F-06] local_tag_verified default=false');
assert(f.remote_tag_verified === false,                                               '[F-07] remote_tag_verified default=false');
assert(f.tag_created         === false,                                               '[F-08] tag_created default=false');
assert(f.git_push_performed  === false,                                               '[F-09] git_push default=false');
assert(f.deploy_performed    === false,                                               '[F-10] deploy=false LOCKED');
assert(f.stable_promoted     === false,                                               '[F-11] stable=false LOCKED');
assert(f.release_performed   === false,                                               '[F-12] release=false LOCKED');
assert(f.notes               === '<OPTIONAL_NOTES>',                                  '[F-13] notes placeholder');

// ─── Suite G: Deterministic ID ────────────────────────────────────
console.log('\n[Suite G] Deterministic ID');
const g1 = buildRealTagManualExecutionReceiptTemplate({ fixture_mode: true, _mock_timestamp: TS });
const g2 = buildRealTagManualExecutionReceiptTemplate({ fixture_mode: true, _mock_timestamp: TS });
assert(g1.template_id === g2.template_id,                                            '[G-01] deterministic id');

// ─── Suite H: Validate ────────────────────────────────────────────
console.log('\n[Suite H] Validate');
assert(validateRealTagManualExecutionReceiptTemplate(fix).length === 0,              '[H-01] fixture passes');
assert(validateRealTagManualExecutionReceiptTemplate(null).length > 0,               '[H-02] null fails');
assert(validateRealTagManualExecutionReceiptTemplate({ ...fix, stable_promoted: true }).length > 0, '[H-03] stable=true fails');
assert(validateRealTagManualExecutionReceiptTemplate(tmpl).length === 0,             '[H-04] tmpl passes');

// ─── Suite I: Render ─────────────────────────────────────────────
console.log('\n[Suite I] Render');
const rendered = renderRealTagManualExecutionReceiptTemplate(fix);
assert(typeof rendered === 'string',                                                  '[I-01] returns string');
assert(rendered.includes('RECEIPT_TEMPLATE_READY'),                                  '[I-02] status in output');
assert(rendered.includes('tag_created              : false'),                        '[I-03] tag=false in output');
assert(rendered.includes('deploy_performed    : false'),                             '[I-04] deploy=false in fields');
assert(rendered.includes('[LOCKED]'),                                                 '[I-05] LOCKED marker present');
assert(renderRealTagManualExecutionReceiptTemplate(null) === 'real_tag_manual_execution_receipt_template: null', '[I-06] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-manual-execution-receipt-template: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
