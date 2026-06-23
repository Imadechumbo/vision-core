#!/usr/bin/env node
/**
 * Real Tag Actual Command Renderer — Unit Tests V92.1
 */

import {
  COMMAND_RENDERER_STATUSES,
  buildRealTagActualCommandRenderer,
  renderCommandBlock,
  renderCommandRendererSummary,
} from '../real-tag-actual-command-renderer.mjs';
import {
  evaluateRealTagCommandGate,
  COMMAND_GATE_CONFIRMATION_PHRASE,
} from '../real-tag-actual-command-gate.mjs';
import { buildRealTagHumanRunbook } from '../real-tag-human-runbook.mjs';
import { runRealTagHumanRunbookValidator } from '../real-tag-human-runbook-validator.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else   { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-19T03:30:00.000Z';
const fixRunbook   = buildRealTagHumanRunbook({ fixture_mode: true, _mock_timestamp: TS });
const fixValidator = runRealTagHumanRunbookValidator({ fixture_mode: true, _mock_timestamp: TS });
const readyGate    = evaluateRealTagCommandGate({
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
});
const blockedGate  = evaluateRealTagCommandGate({ fixture_mode: false, _mock_timestamp: TS });

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(COMMAND_RENDERER_STATUSES),                               '[A-01] statuses array');
assert(COMMAND_RENDERER_STATUSES.length === 2,                                 '[A-02] 2 statuses');
assert(COMMAND_RENDERER_STATUSES.includes('RENDERER_BLOCKED_GATE'),            '[A-03] RENDERER_BLOCKED_GATE');
assert(COMMAND_RENDERER_STATUSES.includes('RENDERER_READY'),                   '[A-04] RENDERER_READY');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = buildRealTagActualCommandRenderer({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                '[B-01] returns object');
assert(fix.renderer_status === 'RENDERER_READY',                               '[B-02] RENDERER_READY');
assert(fix.renderer_ready  === true,                                           '[B-03] ready=true');
assert(fix.schema_version  === 'v92.1',                                        '[B-04] schema=v92.1');
assert(typeof fix.renderer_id === 'string' && fix.renderer_id.length === 24,  '[B-05] id 24 chars');
assert(fix.blocking_reason === null,                                            '[B-06] blocking=null');
assert(fix.gate_verified   === true,                                           '[B-07] gate_verified=true');
assert(typeof fix.command_block === 'string',                                  '[B-08] command_block string');
assert(fix.command_block.includes('REAL TAG EXECUTION COMMAND'),               '[B-09] header in block');
assert(fix.command_block.includes('--real-tag-one-shot'),                     '[B-10] flag in block');
assert(fix.command_block.includes('--dry-run=false'),                         '[B-11] dry-run=false in block');
assert(fix.command_block.includes('git tag -d'),                              '[B-12] rollback hint in block');
assert(fix.created_at === TS,                                                  '[B-13] created_at=TS');

// ─── Suite C: Invariants (REGRA ABSOLUTA) ────────────────────────
console.log('\n[Suite C] Invariants');
assert(fix.tag_created                  === false, '[C-01] tag_created=false');
assert(fix.actual_real_tag_created      === false, '[C-02] actual_real_tag_created=false');
assert(fix.git_push_performed           === false, '[C-03] git_push_performed=false');
assert(fix.deploy_performed             === false, '[C-04] deploy_performed=false');
assert(fix.stable_promoted              === false, '[C-05] stable_promoted=false');
assert(fix.release_performed            === false, '[C-06] release_performed=false');
assert(fix.real_execution_not_performed === true,  '[C-07] real_execution_not_performed=true');

// ─── Suite D: Blocked states ──────────────────────────────────────
console.log('\n[Suite D] Blocked states');
const bNoGate = buildRealTagActualCommandRenderer({ fixture_mode: false, _mock_timestamp: TS });
assert(bNoGate.renderer_status === 'RENDERER_BLOCKED_GATE',                    '[D-01] no gate → BLOCKED_GATE');
assert(bNoGate.renderer_ready  === false,                                      '[D-02] ready=false');
assert(bNoGate.blocking_reason === 'command_gate_not_ready',                   '[D-03] reason=command_gate_not_ready');
assert(bNoGate.command_block   === null,                                       '[D-04] command_block=null when blocked');
assert(bNoGate.tag_created     === false,                                      '[D-05] tag_created=false in blocked');

const bBlockedGate = buildRealTagActualCommandRenderer({
  fixture_mode: false,
  gate_result:  blockedGate,
  _mock_timestamp: TS,
});
assert(bBlockedGate.renderer_status === 'RENDERER_BLOCKED_GATE',               '[D-06] blocked gate → RENDERER_BLOCKED_GATE');
assert(bBlockedGate.gate_status === 'COMMAND_GATE_BLOCKED_RUNBOOK',            '[D-07] gate_status reflected');

// ─── Suite E: Non-fixture READY ───────────────────────────────────
console.log('\n[Suite E] Non-fixture READY');
const rdy = buildRealTagActualCommandRenderer({
  fixture_mode: false,
  gate_result:  readyGate,
  _mock_timestamp: TS,
});
assert(rdy.renderer_status === 'RENDERER_READY',                               '[E-01] non-fixture READY');
assert(rdy.renderer_ready  === true,                                           '[E-02] ready=true');
assert(rdy.command_block.includes('v99.0.0'),                                 '[E-03] target_tag in block');
assert(rdy.command_block.includes('abc123def456'),                            '[E-04] git_head in block');
assert(rdy.command_block.includes('WARNING'),                                 '[E-05] WARNING in header');
assert(rdy.command_block.includes('No deploy. No stable.'),                  '[E-06] safety warning in header');
assert(rdy.tag_created === false,                                              '[E-07] tag_created=false even when READY');

// ─── Suite F: Deterministic ID ────────────────────────────────────
console.log('\n[Suite F] Deterministic ID');
const f1 = buildRealTagActualCommandRenderer({ fixture_mode: true, _mock_timestamp: TS });
const f2 = buildRealTagActualCommandRenderer({ fixture_mode: true, _mock_timestamp: TS });
assert(f1.renderer_id === f2.renderer_id,                                      '[F-01] deterministic id');

// ─── Suite G: renderCommandBlock ─────────────────────────────────
console.log('\n[Suite G] renderCommandBlock');
const block = renderCommandBlock(fix);
assert(typeof block === 'string',                                              '[G-01] returns string');
assert(block.includes('REAL TAG EXECUTION COMMAND'),                          '[G-02] header present');
assert(block.includes('--real-tag-one-shot'),                                '[G-03] flag present');
assert(block.includes('git tag -d'),                                         '[G-04] rollback present');
assert(!block.includes('renderer_status'),                                    '[G-05] no metadata fields');

const blockBlocked = renderCommandBlock(bNoGate);
assert(blockBlocked.includes('renderer_status'),                              '[G-06] blocked: shows status');
assert(!blockBlocked.includes('REAL TAG EXECUTION COMMAND'),                  '[G-07] blocked: no command header');

assert(renderCommandBlock(null) === 'real_tag_command_renderer: null',        '[G-08] null → string');

// ─── Suite H: renderCommandRendererSummary ────────────────────────
console.log('\n[Suite H] renderCommandRendererSummary');
const summary = renderCommandRendererSummary(fix);
assert(typeof summary === 'string',                                            '[H-01] returns string');
assert(summary.includes('RENDERER_READY'),                                    '[H-02] status in summary');
assert(summary.includes('tag_created                 : false'),               '[H-03] tag_created=false');
assert(summary.includes('actual_real_tag_created     : false'),               '[H-04] actual_tag=false');
assert(summary.includes('real_execution_not_performed: true'),                '[H-05] not_performed=true');
assert(summary.includes('gate_verified'),                                     '[H-06] gate_verified field');
assert(summary.includes('REAL TAG EXECUTION COMMAND'),                        '[H-07] command block in summary');

const summaryBlocked = renderCommandRendererSummary(bNoGate);
assert(!summaryBlocked.includes('REAL TAG EXECUTION COMMAND'),                '[H-08] blocked: no command in summary');

assert(renderCommandRendererSummary(null) === 'real_tag_command_renderer: null','[H-09] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-actual-command-renderer: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
