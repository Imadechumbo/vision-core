#!/usr/bin/env node
/**
 * Controlled Stable Promotion Gate — Unit Tests V74.0
 */

import {
  evaluateControlledStablePromotionGate,
  renderControlledStablePromotionGate,
  STABLE_GATE_STATUSES,
  STABLE_GATE_VALID_TARGETS,
} from '../controlled-stable-promotion-gate.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T06:00:00.000Z';

const GOOD_TAG_DRY_RUN = { tag_dry_run_status: 'TAG_DRY_RUN_READY', tag_dry_run_id: 'tdr-id' };
const GOOD_PARAMS = {
  tag_dry_run:         GOOD_TAG_DRY_RUN,
  evidence_receipt_id: 'rcpt-id',
  evidence_source:     'go-core',
  target_stable_ref:   'stable',
  target_tag:          'v1.2.3',
  _mock_timestamp:     TS,
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(STABLE_GATE_STATUSES),                                            '[A-01] statuses array');
assert(STABLE_GATE_STATUSES.length === 4,                                              '[A-02] 4 statuses');
assert(STABLE_GATE_STATUSES.includes('STABLE_GATE_READY_REQUIRES_COMMAND'),           '[A-03] READY_REQUIRES_COMMAND');
assert(STABLE_GATE_STATUSES.includes('STABLE_GATE_BLOCKED_TAG'),                      '[A-04] BLOCKED_TAG');
assert(STABLE_GATE_STATUSES.includes('STABLE_GATE_BLOCKED_EVIDENCE'),                 '[A-05] BLOCKED_EVIDENCE');
assert(STABLE_GATE_STATUSES.includes('STABLE_GATE_BLOCKED_TARGET'),                   '[A-06] BLOCKED_TARGET');

assert(Array.isArray(STABLE_GATE_VALID_TARGETS),                                       '[A-07] valid targets array');
assert(STABLE_GATE_VALID_TARGETS.length === 3,                                         '[A-08] 3 valid targets');
assert(STABLE_GATE_VALID_TARGETS.includes('stable'),                                   '[A-09] stable');
assert(STABLE_GATE_VALID_TARGETS.includes('production/stable'),                        '[A-10] production/stable');
assert(STABLE_GATE_VALID_TARGETS.includes('refs/heads/stable'),                        '[A-11] refs/heads/stable');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = evaluateControlledStablePromotionGate({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                        '[B-01] returns object');
assert(fix.stable_gate_status    === 'STABLE_GATE_READY_REQUIRES_COMMAND',            '[B-02] status=READY_REQUIRES_COMMAND');
assert(fix.stable_promotion_ready === true,                                            '[B-03] promotion_ready=true');
assert(fix.schema_version         === 'v74.0',                                         '[B-04] schema=v74.0');
assert(typeof fix.stable_gate_id === 'string' && fix.stable_gate_id.length === 24,    '[B-05] id 24 chars');
assert(fix.evidence_source        === 'go-core',                                       '[B-06] evidence_source=go-core');
assert(fix.tag_dry_run_ready      === true,                                            '[B-07] tag_dry_run_ready=true');
assert(fix.blocking_reason        === null,                                            '[B-08] blocking_reason=null');
assert(fix.created_at             === TS,                                              '[B-09] created_at=TS');
assert(fix.target_stable_ref      === 'stable',                                        '[B-10] target_stable_ref set');

// ─── Suite C: Blocked — missing tag dry-run ──────────────────────
console.log('\n[Suite C] Missing tag dry-run');
const noT = evaluateControlledStablePromotionGate({ ...GOOD_PARAMS, tag_dry_run: null });
assert(noT.stable_gate_status === 'STABLE_GATE_BLOCKED_TAG',                          '[C-01] BLOCKED_TAG');

const badT = evaluateControlledStablePromotionGate({ ...GOOD_PARAMS, tag_dry_run: { tag_dry_run_status: 'BLOCKED' } });
assert(badT.stable_gate_status === 'STABLE_GATE_BLOCKED_TAG',                         '[C-02] BLOCKED_TAG bad status');

// ─── Suite D: Blocked — bad evidence ─────────────────────────────
console.log('\n[Suite D] Bad evidence');
const badE = evaluateControlledStablePromotionGate({ ...GOOD_PARAMS, evidence_source: 'backend' });
assert(badE.stable_gate_status === 'STABLE_GATE_BLOCKED_EVIDENCE',                    '[D-01] BLOCKED_EVIDENCE source');

const noR = evaluateControlledStablePromotionGate({ ...GOOD_PARAMS, evidence_receipt_id: null });
assert(noR.stable_gate_status === 'STABLE_GATE_BLOCKED_EVIDENCE',                     '[D-02] BLOCKED_EVIDENCE receipt');

// ─── Suite E: Blocked — bad target ───────────────────────────────
console.log('\n[Suite E] Bad target');
const badRef = evaluateControlledStablePromotionGate({ ...GOOD_PARAMS, target_stable_ref: 'main' });
assert(badRef.stable_gate_status === 'STABLE_GATE_BLOCKED_TARGET',                    '[E-01] BLOCKED_TARGET bad ref');

const noRef = evaluateControlledStablePromotionGate({ ...GOOD_PARAMS, target_stable_ref: null });
assert(noRef.stable_gate_status === 'STABLE_GATE_BLOCKED_TARGET',                     '[E-02] BLOCKED_TARGET null');

// ─── Suite F: Full gate ready ─────────────────────────────────────
console.log('\n[Suite F] Full gate ready');
const ready = evaluateControlledStablePromotionGate(GOOD_PARAMS);
assert(ready.stable_promotion_ready === true,                                          '[F-01] promotion_ready=true');
assert(ready.stable_gate_status  === 'STABLE_GATE_READY_REQUIRES_COMMAND',            '[F-02] status=READY_REQUIRES_COMMAND');
assert(ready.target_stable_ref   === 'stable',                                         '[F-03] target_stable_ref set');
assert(ready.target_tag          === 'v1.2.3',                                         '[F-04] target_tag set');
assert(ready.explicit_real_command_required === true,                                  '[F-05] explicit_required=true');

// production/stable and refs/heads/stable also valid
const r2 = evaluateControlledStablePromotionGate({ ...GOOD_PARAMS, target_stable_ref: 'production/stable' });
assert(r2.stable_gate_status === 'STABLE_GATE_READY_REQUIRES_COMMAND',               '[F-06] production/stable valid');

const r3 = evaluateControlledStablePromotionGate({ ...GOOD_PARAMS, target_stable_ref: 'refs/heads/stable' });
assert(r3.stable_gate_status === 'STABLE_GATE_READY_REQUIRES_COMMAND',               '[F-07] refs/heads/stable valid');

// ─── Suite G: Invariants ──────────────────────────────────────────
console.log('\n[Suite G] Invariants');
assert(fix.stable_promoted          === false, '[G-01] stable_promoted=false');
assert(fix.git_push_performed       === false, '[G-02] push=false');
assert(fix.production_execution_locked === true, '[G-03] locked=true');
assert(fix.unlock_executed          === false, '[G-04] unlock=false');
assert(fix.deploy_allowed           === false, '[G-05] deploy_allowed=false');
assert(fix.promotion_allowed        === false, '[G-06] promotion_allowed=false');
assert(fix.stable_allowed           === false, '[G-07] stable_allowed=false');
assert(fix.tag_created              === false, '[G-08] tag_created=false');
assert(fix.release_execution_allowed === false, '[G-09] release_exec=false');
assert(fix.deploy_performed         === false, '[G-10] deploy_performed=false');
assert(fix.release_performed        === false, '[G-11] release_performed=false');

assert(noT.stable_promoted          === false, '[G-12] blocked: stable=false');
assert(noT.git_push_performed       === false, '[G-13] blocked: push=false');
assert(noT.production_execution_locked === true, '[G-14] blocked: locked=true');

// ─── Suite H: Render ─────────────────────────────────────────────
console.log('\n[Suite H] Render');
const rendered = renderControlledStablePromotionGate(fix);
assert(typeof rendered === 'string',                                                    '[H-01] returns string');
assert(rendered.includes('STABLE_GATE_READY_REQUIRES_COMMAND'),                       '[H-02] status in output');
assert(rendered.includes('stable_promoted                : false'),                   '[H-03] stable=false in output');
assert(rendered.includes('git_push_performed             : false'),                   '[H-04] push=false in output');
assert(rendered.includes('explicit_real_command_required : true'),                    '[H-05] explicit in output');
assert(renderControlledStablePromotionGate(null) === 'controlled_stable_promotion_gate: null', '[H-06] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\ncontrolled-stable-promotion-gate: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
