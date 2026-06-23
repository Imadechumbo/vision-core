#!/usr/bin/env node
/**
 * Stable Promotion Gate — Unit Tests V16.2
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  evaluateStablePromotionGate,
  STABLE_GATE_STATUSES,
  STABLE_SCHEMA_VERSION,
} from '../stable-promotion-gate.mjs';

const CLI = resolve(process.cwd(), 'tools', 'stable-promotion-gate.mjs');
let passed = 0, failed = 0;
function assert(c, m) { if (c) { console.log(`  ✓ ${m}`); passed++; } else { console.error(`  ✗ FAIL: ${m}`); failed++; } }
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 10000 });
  return { stdout: r.stdout || '', exitCode: r.status };
}

const goodTag      = { tag_status: 'TAG_DRY_RUN_READY', tag_name: 'v16.2.0', tag_allowed: true };
const badTag       = { tag_status: 'TAG_BLOCKED_EVIDENCE', tag_allowed: false };
const goodDrill    = { rollback_drill_status: 'ROLLBACK_DRY_RUN_READY', rollback_ready: true };
const badDrill     = { rollback_drill_status: 'ROLLBACK_BLOCKED_PLAN', rollback_ready: false };
const goodAuth     = { status: 'BINDING_READY', contract_id: 'contract_v162' };
const badAuth      = { status: 'BINDING_BLOCKED', contract_id: null };
const goodLedger   = { ledger_updated: true, last_event_type: 'TAG_DRY_RUN_CHECKED' };
const badLedger    = { ledger_updated: false };

const fullInput = {
  tagValidation: goodTag, rollbackDrill: goodDrill,
  authorityBinding: goodAuth, ledgerEvidence: goodLedger,
  manualApproval: true, gitHead: 'abc123', branch: 'main',
};

// ─── Suite A ─────────────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(STABLE_SCHEMA_VERSION === 'v16.2',                            '[A-01] schema=v16.2');
assert(Array.isArray(STABLE_GATE_STATUSES) && STABLE_GATE_STATUSES.length === 5, '[A-02] 5 statuses');
assert(STABLE_GATE_STATUSES.includes('STABLE_READY_MANUAL_PROMOTION'), '[A-03] STABLE_READY_MANUAL_PROMOTION');
assert(STABLE_GATE_STATUSES.includes('STABLE_BLOCKED_NO_TAG'),       '[A-04] STABLE_BLOCKED_NO_TAG');
assert(STABLE_GATE_STATUSES.includes('STABLE_BLOCKED_NO_ROLLBACK'),  '[A-05] STABLE_BLOCKED_NO_ROLLBACK');
assert(STABLE_GATE_STATUSES.includes('STABLE_BLOCKED_NO_AUTHORITY'), '[A-06] STABLE_BLOCKED_NO_AUTHORITY');
assert(STABLE_GATE_STATUSES.includes('STABLE_BLOCKED_NO_LEDGER'),    '[A-07] STABLE_BLOCKED_NO_LEDGER');

// ─── Suite B: Invariants ──────────────────────────────────────────
console.log('\n[Suite B] Invariants — always false');
const anyR = evaluateStablePromotionGate({});
assert(anyR.stable_promoted   === false, '[B-01] stable_promoted=false always');
assert(anyR.deploy_performed  === false, '[B-02] deploy_performed=false');
assert(anyR.deploy_allowed    === false, '[B-03] deploy_allowed=false');
assert(anyR.tag_created       === false, '[B-04] tag_created=false');
assert(anyR.release_performed === false, '[B-05] release_performed=false');
assert(anyR.schema_version === 'v16.2',  '[B-06] schema=v16.2');

const readyR = evaluateStablePromotionGate(fullInput);
assert(readyR.stable_promoted  === false, '[B-07] READY → stable_promoted=false');
assert(readyR.deploy_performed === false, '[B-08] READY → deploy_performed=false');
assert(readyR.tag_created      === false, '[B-09] READY → tag_created=false');

// ─── Suite C: Blocked scenarios ──────────────────────────────────
console.log('\n[Suite C] Blocked scenarios');
const pNoTag  = evaluateStablePromotionGate({ ...fullInput, tagValidation: badTag });
assert(pNoTag.stable_gate_status === 'STABLE_BLOCKED_NO_TAG',        '[C-01] bad tag → STABLE_BLOCKED_NO_TAG');
assert(pNoTag.stable_gate_ready  === false,                          '[C-02] bad tag → gate_ready=false');
assert(pNoTag.stable_allowed     === false,                          '[C-03] bad tag → stable_allowed=false');

const pNullTag = evaluateStablePromotionGate({ ...fullInput, tagValidation: null });
assert(pNullTag.stable_gate_status === 'STABLE_BLOCKED_NO_TAG',      '[C-04] null tag → STABLE_BLOCKED_NO_TAG');

const pNoDrill = evaluateStablePromotionGate({ ...fullInput, rollbackDrill: badDrill });
assert(pNoDrill.stable_gate_status === 'STABLE_BLOCKED_NO_ROLLBACK', '[C-05] bad drill → STABLE_BLOCKED_NO_ROLLBACK');

const pNullDrill = evaluateStablePromotionGate({ ...fullInput, rollbackDrill: null });
assert(pNullDrill.stable_gate_status === 'STABLE_BLOCKED_NO_ROLLBACK','[C-06] null drill → STABLE_BLOCKED_NO_ROLLBACK');

const pNoAuth = evaluateStablePromotionGate({ ...fullInput, authorityBinding: badAuth });
assert(pNoAuth.stable_gate_status === 'STABLE_BLOCKED_NO_AUTHORITY', '[C-07] bad auth → STABLE_BLOCKED_NO_AUTHORITY');

const pNullAuth = evaluateStablePromotionGate({ ...fullInput, authorityBinding: null });
assert(pNullAuth.stable_gate_status === 'STABLE_BLOCKED_NO_AUTHORITY','[C-08] null auth → STABLE_BLOCKED_NO_AUTHORITY');

const pNoLedger = evaluateStablePromotionGate({ ...fullInput, ledgerEvidence: badLedger });
assert(pNoLedger.stable_gate_status === 'STABLE_BLOCKED_NO_LEDGER',  '[C-09] bad ledger → STABLE_BLOCKED_NO_LEDGER');

const pNullLedger = evaluateStablePromotionGate({ ...fullInput, ledgerEvidence: null });
assert(pNullLedger.stable_gate_status === 'STABLE_BLOCKED_NO_LEDGER','[C-10] null ledger → STABLE_BLOCKED_NO_LEDGER');

// ─── Suite D: STABLE_READY_MANUAL_PROMOTION ───────────────────────
console.log('\n[Suite D] STABLE_READY_MANUAL_PROMOTION');
const s = evaluateStablePromotionGate(fullInput);
assert(s.stable_gate_status === 'STABLE_READY_MANUAL_PROMOTION',     '[D-01] all conditions → STABLE_READY_MANUAL_PROMOTION');
assert(s.stable_gate_ready  === true,                                '[D-02] gate_ready=true');
assert(s.stable_allowed     === true,                                '[D-03] stable_allowed=true (classification)');
assert(s.stable_promoted    === false,                               '[D-04] stable_promoted=false invariant');
assert(s.stable_gate_blockers.length === 0,                          '[D-05] no blockers');
assert(typeof s.stable_gate_id === 'string',                         '[D-06] gate_id is string');
assert(s.stable_gate_id.startsWith('stablegate_'),                   '[D-07] id starts with stablegate_');
assert(typeof s.note === 'string',                                   '[D-08] note present');

// ─── Suite E: Inputs evaluated ───────────────────────────────────
console.log('\n[Suite E] Inputs');
const inp = s.inputs_evaluated;
assert(inp.tag_status === 'TAG_DRY_RUN_READY',                       '[E-01] tag_status populated');
assert(inp.tag_allowed === true,                                     '[E-02] tag_allowed=true');
assert(inp.rollback_drill_status === 'ROLLBACK_DRY_RUN_READY',       '[E-03] drill_status populated');
assert(inp.rollback_ready === true,                                  '[E-04] rollback_ready=true');
assert(inp.authority_binding_status === 'BINDING_READY',             '[E-05] binding_status populated');
assert(inp.ledger_updated === true,                                  '[E-06] ledger_updated=true');

// ─── Suite F: CLI ────────────────────────────────────────────────
console.log('\n[Suite F] CLI');
const cliNone = runCLI(['--json']);
assert(cliNone.exitCode === 2,                                       '[F-01] no flags → exit 2');
assert(cliNone.stdout.length > 0,                                    '[F-02] stdout non-empty');
(() => {
  try {
    const o = JSON.parse(cliNone.stdout);
    assert(o.stable_promoted === false,                              '[F-03] stable_promoted=false');
    assert(o.stable_allowed  === false,                              '[F-04] stable_allowed=false');
  } catch { assert(false, '[F-03..04] valid JSON'); }
})();

const cliReady = runCLI(['--json', '--tag-allowed', '--rollback-ready', '--authority-ready', '--ledger-updated']);
assert(cliReady.exitCode === 0,                                      '[F-05] all flags → exit 0');
(() => {
  try {
    const o = JSON.parse(cliReady.stdout);
    assert(o.stable_gate_status === 'STABLE_READY_MANUAL_PROMOTION','[F-06] → STABLE_READY_MANUAL_PROMOTION');
    assert(o.stable_promoted === false,                              '[F-07] promoted=false invariant');
  } catch { assert(false, '[F-06..07] valid JSON'); }
})();

// ─── Result ───────────────────────────────────────────────────────
console.log(`\nStable Promotion Gate Tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
