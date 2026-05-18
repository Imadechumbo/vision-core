#!/usr/bin/env node
/**
 * Real Tag Actual Command Gate — Unit Tests V92.0
 */

import {
  COMMAND_GATE_STATUSES,
  COMMAND_GATE_CONFIRMATION_PHRASE,
  evaluateRealTagCommandGate,
  renderCommandGateSummary,
} from '../real-tag-actual-command-gate.mjs';
import { buildRealTagHumanRunbook } from '../real-tag-human-runbook.mjs';
import { runRealTagHumanRunbookValidator } from '../real-tag-human-runbook-validator.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else   { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-19T03:00:00.000Z';
const fixRunbook   = buildRealTagHumanRunbook({ fixture_mode: true, _mock_timestamp: TS });
const fixValidator = runRealTagHumanRunbookValidator({ fixture_mode: true, _mock_timestamp: TS });

const VALID_PARAMS = {
  fixture_mode:       false,
  runbook:            fixRunbook,
  validator_result:   fixValidator,
  baseline_status:    'EXEC_BASELINE_READY_DRY_RUN_AND_MOCK_REAL',
  is_ci:              false,
  confirmation_phrase: COMMAND_GATE_CONFIRMATION_PHRASE,
  target_tag:         'v99.0.0',
  git_head:           'abc123def456',
  evidence_receipt:   'valid-receipt-id-long-enough',
  rollback_anchor:    'anchor-id',
  _mock_timestamp:    TS,
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(COMMAND_GATE_STATUSES),                                    '[A-01] statuses array');
assert(COMMAND_GATE_STATUSES.length === 10,                                     '[A-02] 10 statuses');
assert(COMMAND_GATE_STATUSES.includes('COMMAND_GATE_BLOCKED_RUNBOOK'),          '[A-03] BLOCKED_RUNBOOK');
assert(COMMAND_GATE_STATUSES.includes('COMMAND_GATE_BLOCKED_VALIDATOR'),        '[A-04] BLOCKED_VALIDATOR');
assert(COMMAND_GATE_STATUSES.includes('COMMAND_GATE_BLOCKED_BASELINE'),         '[A-05] BLOCKED_BASELINE');
assert(COMMAND_GATE_STATUSES.includes('COMMAND_GATE_BLOCKED_CI'),               '[A-06] BLOCKED_CI');
assert(COMMAND_GATE_STATUSES.includes('COMMAND_GATE_BLOCKED_CONFIRMATION'),     '[A-07] BLOCKED_CONFIRMATION');
assert(COMMAND_GATE_STATUSES.includes('COMMAND_GATE_BLOCKED_TARGET_TAG'),       '[A-08] BLOCKED_TARGET_TAG');
assert(COMMAND_GATE_STATUSES.includes('COMMAND_GATE_BLOCKED_GIT_HEAD'),         '[A-09] BLOCKED_GIT_HEAD');
assert(COMMAND_GATE_STATUSES.includes('COMMAND_GATE_BLOCKED_EVIDENCE'),         '[A-10] BLOCKED_EVIDENCE');
assert(COMMAND_GATE_STATUSES.includes('COMMAND_GATE_BLOCKED_ROLLBACK_ANCHOR'),  '[A-11] BLOCKED_ROLLBACK_ANCHOR');
assert(COMMAND_GATE_STATUSES.includes('COMMAND_GATE_READY_FOR_HUMAN_COMMAND'),  '[A-12] READY_FOR_HUMAN_COMMAND');
assert(typeof COMMAND_GATE_CONFIRMATION_PHRASE === 'string',                    '[A-13] confirmation phrase string');
assert(COMMAND_GATE_CONFIRMATION_PHRASE.length > 20,                            '[A-14] phrase non-trivial');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = evaluateRealTagCommandGate({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                 '[B-01] returns object');
assert(fix.command_gate_status === 'COMMAND_GATE_READY_FOR_HUMAN_COMMAND',      '[B-02] READY');
assert(fix.gate_ready         === true,                                         '[B-03] gate_ready=true');
assert(fix.schema_version     === 'v92.0',                                      '[B-04] schema=v92.0');
assert(typeof fix.command_gate_id === 'string' && fix.command_gate_id.length === 24,'[B-05] id 24 chars');
assert(fix.blocking_reason    === null,                                         '[B-06] blocking=null');
assert(fix.runbook_verified   === true,                                         '[B-07] runbook_verified=true');
assert(fix.validator_verified === true,                                         '[B-08] validator_verified=true');
assert(fix.baseline_verified  === true,                                         '[B-09] baseline_verified=true');
assert(fix.ci_gate_passed     === true,                                         '[B-10] ci_gate_passed=true');
assert(fix.confirmation_verified === true,                                      '[B-11] confirmation_verified=true');
assert(fix.target_tag_verified === true,                                        '[B-12] target_tag_verified=true');
assert(fix.git_head_verified  === true,                                         '[B-13] git_head_verified=true');
assert(fix.evidence_verified  === true,                                         '[B-14] evidence_verified=true');
assert(fix.rollback_anchor_verified === true,                                   '[B-15] rollback_anchor_verified=true');
assert(typeof fix.command_presented === 'string',                               '[B-16] command_presented string');
assert(fix.command_presented.includes('--real-tag-one-shot'),                  '[B-17] command has --real-tag-one-shot');
assert(fix.command_presented.includes('--dry-run=false'),                      '[B-18] command has --dry-run=false');
assert(fix.created_at === TS,                                                   '[B-19] created_at=TS');

// ─── Suite C: Invariants (REGRA ABSOLUTA) ────────────────────────
console.log('\n[Suite C] Invariants');
assert(fix.tag_created                  === false, '[C-01] tag_created=false');
assert(fix.actual_real_tag_created      === false, '[C-02] actual_real_tag_created=false');
assert(fix.git_push_performed           === false, '[C-03] git_push_performed=false');
assert(fix.deploy_performed             === false, '[C-04] deploy_performed=false');
assert(fix.stable_promoted              === false, '[C-05] stable_promoted=false');
assert(fix.release_performed            === false, '[C-06] release_performed=false');
assert(fix.real_execution_not_performed === true,  '[C-07] real_execution_not_performed=true');

// ─── Suite D: Gate 1 — Runbook ────────────────────────────────────
console.log('\n[Suite D] Gate 1 — Runbook');
const bNoRunbook = evaluateRealTagCommandGate({ fixture_mode: false, _mock_timestamp: TS });
assert(bNoRunbook.command_gate_status === 'COMMAND_GATE_BLOCKED_RUNBOOK',      '[D-01] no runbook → BLOCKED_RUNBOOK');
assert(bNoRunbook.gate_ready === false,                                         '[D-02] gate_ready=false');
assert(bNoRunbook.tag_created === false,                                        '[D-03] tag_created=false in blocked');

const bRunbookNotReady = evaluateRealTagCommandGate({
  fixture_mode: false,
  runbook: { ...fixRunbook, runbook_ready: false },
  _mock_timestamp: TS,
});
assert(bRunbookNotReady.command_gate_status === 'COMMAND_GATE_BLOCKED_RUNBOOK', '[D-04] not-ready runbook → BLOCKED_RUNBOOK');

// ─── Suite E: Gate 2 — Validator ─────────────────────────────────
console.log('\n[Suite E] Gate 2 — Validator');
const bNoValidator = evaluateRealTagCommandGate({
  ...VALID_PARAMS,
  validator_result: null,
  _mock_timestamp: TS,
});
assert(bNoValidator.command_gate_status === 'COMMAND_GATE_BLOCKED_VALIDATOR',  '[E-01] null validator → BLOCKED_VALIDATOR');

const bValidatorFail = evaluateRealTagCommandGate({
  ...VALID_PARAMS,
  validator_result: { validator_passed: false },
  _mock_timestamp: TS,
});
assert(bValidatorFail.command_gate_status === 'COMMAND_GATE_BLOCKED_VALIDATOR','[E-02] failed validator → BLOCKED_VALIDATOR');
assert(bValidatorFail.runbook_verified === true,                                '[E-03] runbook passed before validator check');

// ─── Suite F: Gate 3 — Baseline ──────────────────────────────────
console.log('\n[Suite F] Gate 3 — Baseline');
const bBadBaseline = evaluateRealTagCommandGate({
  ...VALID_PARAMS,
  baseline_status: 'WRONG',
  _mock_timestamp: TS,
});
assert(bBadBaseline.command_gate_status === 'COMMAND_GATE_BLOCKED_BASELINE',   '[F-01] bad baseline → BLOCKED_BASELINE');
assert(bBadBaseline.validator_verified === true,                                '[F-02] validator passed before baseline');

// ─── Suite G: Gate 4 — CI ─────────────────────────────────────────
console.log('\n[Suite G] Gate 4 — CI');
const bCI = evaluateRealTagCommandGate({
  ...VALID_PARAMS,
  is_ci: true,
  _mock_timestamp: TS,
});
assert(bCI.command_gate_status === 'COMMAND_GATE_BLOCKED_CI',                  '[G-01] is_ci=true → BLOCKED_CI');
assert(bCI.baseline_verified === true,                                          '[G-02] baseline passed before CI check');

// ─── Suite H: Gate 5 — Confirmation ──────────────────────────────
console.log('\n[Suite H] Gate 5 — Confirmation');
const bNoConf = evaluateRealTagCommandGate({
  ...VALID_PARAMS,
  confirmation_phrase: undefined,
  _mock_timestamp: TS,
});
assert(bNoConf.command_gate_status === 'COMMAND_GATE_BLOCKED_CONFIRMATION',    '[H-01] no phrase → BLOCKED_CONFIRMATION');

const bWrongConf = evaluateRealTagCommandGate({
  ...VALID_PARAMS,
  confirmation_phrase: 'wrong phrase',
  _mock_timestamp: TS,
});
assert(bWrongConf.command_gate_status === 'COMMAND_GATE_BLOCKED_CONFIRMATION', '[H-02] wrong phrase → BLOCKED_CONFIRMATION');
assert(bWrongConf.ci_gate_passed === true,                                      '[H-03] CI passed before confirmation');

// ─── Suite I: Gate 6 — Target tag ────────────────────────────────
console.log('\n[Suite I] Gate 6 — Target tag');
const bNoTag = evaluateRealTagCommandGate({
  ...VALID_PARAMS,
  target_tag: undefined,
  _mock_timestamp: TS,
});
assert(bNoTag.command_gate_status === 'COMMAND_GATE_BLOCKED_TARGET_TAG',       '[I-01] no tag → BLOCKED_TARGET_TAG');

const bBadTag = evaluateRealTagCommandGate({
  ...VALID_PARAMS,
  target_tag: 'not-a-tag',
  _mock_timestamp: TS,
});
assert(bBadTag.command_gate_status === 'COMMAND_GATE_BLOCKED_TARGET_TAG',      '[I-02] bad tag → BLOCKED_TARGET_TAG');

// ─── Suite J: Gate 7 — Git HEAD ──────────────────────────────────
console.log('\n[Suite J] Gate 7 — Git HEAD');
const bNoHead = evaluateRealTagCommandGate({
  ...VALID_PARAMS,
  git_head: undefined,
  _mock_timestamp: TS,
});
assert(bNoHead.command_gate_status === 'COMMAND_GATE_BLOCKED_GIT_HEAD',        '[J-01] no head → BLOCKED_GIT_HEAD');
assert(bNoHead.target_tag_verified === true,                                    '[J-02] tag passed before head check');

const bBadHead = evaluateRealTagCommandGate({
  ...VALID_PARAMS,
  git_head: 'not!a!sha',
  _mock_timestamp: TS,
});
assert(bBadHead.command_gate_status === 'COMMAND_GATE_BLOCKED_GIT_HEAD',       '[J-03] bad head format → BLOCKED_GIT_HEAD');

// ─── Suite K: Gate 8 — Evidence ──────────────────────────────────
console.log('\n[Suite K] Gate 8 — Evidence');
const bNoEv = evaluateRealTagCommandGate({
  ...VALID_PARAMS,
  evidence_receipt: undefined,
  _mock_timestamp: TS,
});
assert(bNoEv.command_gate_status === 'COMMAND_GATE_BLOCKED_EVIDENCE',          '[K-01] no evidence → BLOCKED_EVIDENCE');

const bShortEv = evaluateRealTagCommandGate({
  ...VALID_PARAMS,
  evidence_receipt: 'short',
  _mock_timestamp: TS,
});
assert(bShortEv.command_gate_status === 'COMMAND_GATE_BLOCKED_EVIDENCE',       '[K-02] short receipt → BLOCKED_EVIDENCE');

// ─── Suite L: Gate 9 — Rollback anchor ───────────────────────────
console.log('\n[Suite L] Gate 9 — Rollback anchor');
const bNoAnchor = evaluateRealTagCommandGate({
  ...VALID_PARAMS,
  rollback_anchor: undefined,
  _mock_timestamp: TS,
});
assert(bNoAnchor.command_gate_status === 'COMMAND_GATE_BLOCKED_ROLLBACK_ANCHOR','[L-01] no anchor → BLOCKED_ROLLBACK_ANCHOR');
assert(bNoAnchor.evidence_verified === true,                                    '[L-02] evidence passed before anchor');

const bShortAnchor = evaluateRealTagCommandGate({
  ...VALID_PARAMS,
  rollback_anchor: 'ab',
  _mock_timestamp: TS,
});
assert(bShortAnchor.command_gate_status === 'COMMAND_GATE_BLOCKED_ROLLBACK_ANCHOR','[L-03] short anchor → BLOCKED_ROLLBACK_ANCHOR');

// ─── Suite M: READY_FOR_HUMAN_COMMAND ─────────────────────────────
console.log('\n[Suite M] READY_FOR_HUMAN_COMMAND');
const ready = evaluateRealTagCommandGate({ ...VALID_PARAMS, _mock_timestamp: TS });
assert(ready.command_gate_status === 'COMMAND_GATE_READY_FOR_HUMAN_COMMAND',   '[M-01] all gates pass → READY');
assert(ready.gate_ready === true,                                               '[M-02] gate_ready=true');
assert(ready.command_presented.includes('v99.0.0'),                            '[M-03] command has target_tag');
assert(ready.command_presented.includes('abc123def456'),                       '[M-04] command has git_head');
assert(ready.tag_created === false,                                             '[M-05] tag_created=false even when READY');
assert(ready.actual_real_tag_created === false,                                '[M-06] actual_tag=false even when READY');

// ─── Suite N: Deterministic ID ────────────────────────────────────
console.log('\n[Suite N] Deterministic ID');
const n1 = evaluateRealTagCommandGate({ fixture_mode: true, _mock_timestamp: TS });
const n2 = evaluateRealTagCommandGate({ fixture_mode: true, _mock_timestamp: TS });
assert(n1.command_gate_id === n2.command_gate_id,                              '[N-01] deterministic id');

// ─── Suite O: Render ──────────────────────────────────────────────
console.log('\n[Suite O] Render');
const rendered = renderCommandGateSummary(fix);
assert(typeof rendered === 'string',                                            '[O-01] returns string');
assert(rendered.includes('COMMAND_GATE_READY_FOR_HUMAN_COMMAND'),              '[O-02] status in output');
assert(rendered.includes('tag_created                 : false'),               '[O-03] tag_created=false');
assert(rendered.includes('actual_real_tag_created     : false'),               '[O-04] actual_tag=false');
assert(rendered.includes('real_execution_not_performed: true'),                '[O-05] not_performed=true');
assert(rendered.includes('COMMAND TO RUN'),                                    '[O-06] command section');
assert(rendered.includes('does NOT execute'),                                  '[O-07] safety note');
assert(rendered.includes('--real-tag-one-shot'),                               '[O-08] command flags in render');

const renderedBlocked = renderCommandGateSummary(bNoRunbook);
assert(!renderedBlocked.includes('COMMAND TO RUN'),                            '[O-09] blocked: no command section');

assert(renderCommandGateSummary(null) === 'real_tag_command_gate: null',       '[O-10] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-actual-command-gate: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
