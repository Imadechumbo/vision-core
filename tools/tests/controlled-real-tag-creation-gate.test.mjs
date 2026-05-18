#!/usr/bin/env node
/**
 * Controlled Real Tag Creation Gate — Unit Tests V73.0
 */

import {
  evaluateControlledRealTagGate,
  validateControlledRealTagGate,
  renderControlledRealTagGate,
  TAG_GATE_STATUSES,
} from '../controlled-real-tag-creation-gate.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T06:00:00.000Z';

const GOOD_DECISION = { real_execution_decision_status: 'REAL_EXEC_DECISION_REQUIRES_EXPLICIT_REAL_COMMAND' };
const GOOD_PARAMS = {
  real_execution_decision: GOOD_DECISION,
  evidence_receipt_id:     'rcpt-id',
  evidence_source:         'go-core',
  target_tag:              'v1.2.3',
  target_version:          'v1.2.3',
  git_head:                'abc1234',
  _mock_timestamp:         TS,
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(TAG_GATE_STATUSES),                                               '[A-01] statuses array');
assert(TAG_GATE_STATUSES.length === 5,                                                 '[A-02] 5 statuses');
assert(TAG_GATE_STATUSES.includes('TAG_GATE_READY_REQUIRES_COMMAND'),                  '[A-03] READY_REQUIRES_COMMAND');
assert(TAG_GATE_STATUSES.includes('TAG_GATE_BLOCKED_DECISION'),                        '[A-04] BLOCKED_DECISION');
assert(TAG_GATE_STATUSES.includes('TAG_GATE_BLOCKED_EVIDENCE'),                        '[A-05] BLOCKED_EVIDENCE');
assert(TAG_GATE_STATUSES.includes('TAG_GATE_BLOCKED_TAG_NAME'),                        '[A-06] BLOCKED_TAG_NAME');
assert(TAG_GATE_STATUSES.includes('TAG_GATE_BLOCKED_GIT_HEAD'),                        '[A-07] BLOCKED_GIT_HEAD');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = evaluateControlledRealTagGate({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                        '[B-01] returns object');
assert(fix.tag_gate_status    === 'TAG_GATE_READY_REQUIRES_COMMAND',                  '[B-02] status=READY_REQUIRES_COMMAND');
assert(fix.tag_creation_ready === true,                                                '[B-03] tag_creation_ready=true');
assert(fix.schema_version     === 'v73.0',                                             '[B-04] schema=v73.0');
assert(typeof fix.tag_gate_id === 'string' && fix.tag_gate_id.length === 24,          '[B-05] id 24 chars');
assert(fix.evidence_source    === 'go-core',                                           '[B-06] evidence_source=go-core');
assert(fix.blocking_reason    === null,                                                '[B-07] blocking_reason=null');
assert(fix.created_at         === TS,                                                  '[B-08] created_at=TS');
assert(fix.target_tag.startsWith('v'),                                                 '[B-09] target_tag starts with v');
assert(typeof fix.git_head    === 'string',                                            '[B-10] git_head set');

// ─── Suite C: Blocked — bad decision ─────────────────────────────
console.log('\n[Suite C] Bad decision');
const noD = evaluateControlledRealTagGate({ ...GOOD_PARAMS, real_execution_decision: null, _mock_timestamp: TS });
assert(noD.tag_gate_status === 'TAG_GATE_BLOCKED_DECISION',                            '[C-01] BLOCKED_DECISION (null)');

const badD = evaluateControlledRealTagGate({ ...GOOD_PARAMS, real_execution_decision: { real_execution_decision_status: 'BLOCKED' }, _mock_timestamp: TS });
assert(badD.tag_gate_status === 'TAG_GATE_BLOCKED_DECISION',                           '[C-02] BLOCKED_DECISION (bad status)');

// ─── Suite D: Blocked — bad evidence ─────────────────────────────
console.log('\n[Suite D] Bad evidence');
const badE = evaluateControlledRealTagGate({ ...GOOD_PARAMS, evidence_source: 'backend', _mock_timestamp: TS });
assert(badE.tag_gate_status === 'TAG_GATE_BLOCKED_EVIDENCE',                           '[D-01] BLOCKED_EVIDENCE source');

const noR = evaluateControlledRealTagGate({ ...GOOD_PARAMS, evidence_receipt_id: null, _mock_timestamp: TS });
assert(noR.tag_gate_status === 'TAG_GATE_BLOCKED_EVIDENCE',                            '[D-02] BLOCKED_EVIDENCE receipt');

// ─── Suite E: Blocked — bad tag name ─────────────────────────────
console.log('\n[Suite E] Bad tag name');
const badTag = evaluateControlledRealTagGate({ ...GOOD_PARAMS, target_tag: 'release-1.0', _mock_timestamp: TS });
assert(badTag.tag_gate_status === 'TAG_GATE_BLOCKED_TAG_NAME',                         '[E-01] BLOCKED_TAG_NAME no v');

const noTag = evaluateControlledRealTagGate({ ...GOOD_PARAMS, target_tag: null, _mock_timestamp: TS });
assert(noTag.tag_gate_status === 'TAG_GATE_BLOCKED_TAG_NAME',                          '[E-02] BLOCKED_TAG_NAME null');

// ─── Suite F: Blocked — missing git head ─────────────────────────
console.log('\n[Suite F] Missing git head');
const noGH = evaluateControlledRealTagGate({ ...GOOD_PARAMS, git_head: null, _mock_timestamp: TS });
assert(noGH.tag_gate_status === 'TAG_GATE_BLOCKED_GIT_HEAD',                           '[F-01] BLOCKED_GIT_HEAD');

// ─── Suite G: Full gate ready ─────────────────────────────────────
console.log('\n[Suite G] Full gate ready');
const ready = evaluateControlledRealTagGate(GOOD_PARAMS);
assert(ready.tag_creation_ready === true,                                              '[G-01] tag_creation_ready=true');
assert(ready.tag_gate_status === 'TAG_GATE_READY_REQUIRES_COMMAND',                   '[G-02] status=READY_REQUIRES_COMMAND');
assert(ready.target_tag  === 'v1.2.3',                                                 '[G-03] target_tag set');
assert(ready.git_head    === 'abc1234',                                                '[G-04] git_head set');
assert(ready.explicit_real_command_required === true,                                  '[G-05] explicit_required=true');

// ─── Suite H: Invariants ──────────────────────────────────────────
console.log('\n[Suite H] Invariants');
assert(fix.tag_created              === false, '[H-01] tag_created=false');
assert(fix.git_push_performed       === false, '[H-02] push=false');
assert(fix.production_execution_locked === true, '[H-03] locked=true');
assert(fix.unlock_executed          === false, '[H-04] unlock=false');
assert(fix.deploy_allowed           === false, '[H-05] deploy_allowed=false');
assert(fix.promotion_allowed        === false, '[H-06] promotion_allowed=false');
assert(fix.stable_allowed           === false, '[H-07] stable_allowed=false');
assert(fix.tag_allowed              === false, '[H-08] tag_allowed=false');
assert(fix.release_execution_allowed === false, '[H-09] release_exec=false');
assert(fix.release_performed        === false, '[H-10] release_performed=false');
assert(fix.stable_promoted          === false, '[H-11] stable_promoted=false');
assert(fix.deploy_performed         === false, '[H-12] deploy_performed=false');

assert(noD.tag_created              === false, '[H-13] blocked: tag=false');
assert(noD.git_push_performed       === false, '[H-14] blocked: push=false');
assert(noD.production_execution_locked === true, '[H-15] blocked: locked=true');

// ─── Suite I: validate + render ───────────────────────────────────
console.log('\n[Suite I] Validate + Render');
const vFix = validateControlledRealTagGate(fix);
assert(vFix.valid  === true,  '[I-01] fixture valid');
assert(vFix.reason === null,  '[I-02] reason null');
assert(validateControlledRealTagGate(null).valid === false, '[I-03] null invalid');

const rendered = renderControlledRealTagGate(fix);
assert(typeof rendered === 'string',                                                    '[I-04] returns string');
assert(rendered.includes('TAG_GATE_READY_REQUIRES_COMMAND'),                           '[I-05] status in output');
assert(rendered.includes('tag_created                    : false'),                   '[I-06] tag=false in output');
assert(rendered.includes('git_push_performed             : false'),                   '[I-07] push=false in output');
assert(rendered.includes('explicit_real_command_required : true'),                    '[I-08] explicit in output');
assert(renderControlledRealTagGate(null) === 'controlled_real_tag_creation_gate: null', '[I-09] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\ncontrolled-real-tag-creation-gate: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
