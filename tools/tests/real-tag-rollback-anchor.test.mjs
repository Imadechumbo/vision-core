#!/usr/bin/env node
/**
 * Real Tag Rollback Anchor — Unit Tests V77.1
 */

import {
  createRealTagRollbackAnchor,
  validateRealTagRollbackAnchor,
  renderRealTagRollbackAnchor,
  TAG_ROLLBACK_ANCHOR_STATUSES,
} from '../real-tag-rollback-anchor.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-18T11:00:00.000Z';

const GOOD_SAFETY = {
  tag_safety_ready:   true,
  tag_safety_status:  'TAG_SAFETY_REQUIRES_EXPLICIT_REAL_COMMAND',
};

const GOOD_PARAMS = {
  safety_result:       GOOD_SAFETY,
  target_tag:          'v1.2.3',
  git_head_before_tag: 'abc1234def5678901234567890123456789012ab',
  current_branch:      'main',
  remote_name:         'origin',
  evidence_receipt_id: 'receipt-test-id',
  evidence_source:     'go-core',
  _mock_timestamp:     TS,
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(TAG_ROLLBACK_ANCHOR_STATUSES),                                  '[A-01] statuses array');
assert(TAG_ROLLBACK_ANCHOR_STATUSES.length === 4,                                    '[A-02] 4 statuses');
assert(TAG_ROLLBACK_ANCHOR_STATUSES.includes('TAG_ROLLBACK_ANCHOR_BLOCKED_SAFETY'),  '[A-03] BLOCKED_SAFETY');
assert(TAG_ROLLBACK_ANCHOR_STATUSES.includes('TAG_ROLLBACK_ANCHOR_BLOCKED_EVIDENCE'),'[A-04] BLOCKED_EVIDENCE');
assert(TAG_ROLLBACK_ANCHOR_STATUSES.includes('TAG_ROLLBACK_ANCHOR_BLOCKED_HASH'),    '[A-05] BLOCKED_HASH');
assert(TAG_ROLLBACK_ANCHOR_STATUSES.includes('TAG_ROLLBACK_ANCHOR_READY'),           '[A-06] READY');

// ─── Suite B: Fixture mode ─────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = createRealTagRollbackAnchor({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                      '[B-01] returns object');
assert(fix.rollback_anchor_status === 'TAG_ROLLBACK_ANCHOR_READY',                  '[B-02] status=READY');
assert(fix.anchor_ready           === true,                                          '[B-03] ready=true');
assert(fix.schema_version         === 'v77.1',                                       '[B-04] schema=v77.1');
assert(typeof fix.rollback_anchor_id === 'string' && fix.rollback_anchor_id.length === 24, '[B-05] id 24 chars');
assert(typeof fix.anchor_hash === 'string' && fix.anchor_hash.length === 32,        '[B-06] hash 32 chars');
assert(Array.isArray(fix.rollback_commands_preview),                                 '[B-07] commands array');
assert(fix.rollback_commands_preview.length === 2,                                   '[B-08] 2 commands');
assert(fix.rollback_commands_preview[0].includes('v1.2.3'),                          '[B-09] tag in delete cmd');
assert(fix.rollback_commands_preview[1].includes('v1.2.3'),                          '[B-10] tag in push cmd');
assert(fix.created_at             === TS,                                            '[B-11] created_at=TS');
assert(fix.blocking_reason        === null,                                          '[B-12] blocking=null');

// ─── Suite C: Blocked safety ──────────────────────────────────────
console.log('\n[Suite C] Blocked safety');
const noSafety = createRealTagRollbackAnchor({ ...GOOD_PARAMS, safety_result: null });
assert(noSafety.rollback_anchor_status === 'TAG_ROLLBACK_ANCHOR_BLOCKED_SAFETY',     '[C-01] BLOCKED_SAFETY null');

const badSafety = createRealTagRollbackAnchor({ ...GOOD_PARAMS, safety_result: { tag_safety_ready: false } });
assert(badSafety.rollback_anchor_status === 'TAG_ROLLBACK_ANCHOR_BLOCKED_SAFETY',    '[C-02] BLOCKED_SAFETY false');

// ─── Suite D: Blocked evidence ────────────────────────────────────
console.log('\n[Suite D] Blocked evidence');
const badSource = createRealTagRollbackAnchor({ ...GOOD_PARAMS, evidence_source: 'backend' });
assert(badSource.rollback_anchor_status === 'TAG_ROLLBACK_ANCHOR_BLOCKED_EVIDENCE',  '[D-01] BLOCKED_EVIDENCE backend');

const nullSource = createRealTagRollbackAnchor({ ...GOOD_PARAMS, evidence_source: null });
assert(nullSource.rollback_anchor_status === 'TAG_ROLLBACK_ANCHOR_BLOCKED_EVIDENCE', '[D-02] BLOCKED_EVIDENCE null');

// ─── Suite E: Blocked hash ────────────────────────────────────────
console.log('\n[Suite E] Blocked hash');
const noTag = createRealTagRollbackAnchor({ ...GOOD_PARAMS, target_tag: null });
assert(noTag.rollback_anchor_status === 'TAG_ROLLBACK_ANCHOR_BLOCKED_HASH',          '[E-01] BLOCKED_HASH no tag');

const noHead = createRealTagRollbackAnchor({ ...GOOD_PARAMS, git_head_before_tag: null });
assert(noHead.rollback_anchor_status === 'TAG_ROLLBACK_ANCHOR_BLOCKED_HASH',         '[E-02] BLOCKED_HASH no head');

// ─── Suite F: Full anchor ready ───────────────────────────────────
console.log('\n[Suite F] Full anchor ready');
const ready = createRealTagRollbackAnchor(GOOD_PARAMS);
assert(ready.anchor_ready               === true,                                    '[F-01] ready=true');
assert(ready.rollback_anchor_status     === 'TAG_ROLLBACK_ANCHOR_READY',             '[F-02] READY');
assert(ready.target_tag                 === 'v1.2.3',                                '[F-03] tag preserved');
assert(ready.git_head_before_tag        === GOOD_PARAMS.git_head_before_tag,         '[F-04] head preserved');
assert(typeof ready.anchor_hash === 'string' && ready.anchor_hash.length === 32,     '[F-05] hash 32 chars');
assert(Array.isArray(ready.rollback_commands_preview),                               '[F-06] commands present');
assert(ready.rollback_commands_preview[0].startsWith('git tag -d'),                  '[F-07] delete cmd correct');
assert(ready.rollback_commands_preview[1].includes(':refs/tags/'),                   '[F-08] push delete cmd correct');

// ─── Suite G: Deterministic hash ──────────────────────────────────
console.log('\n[Suite G] Deterministic hash');
const g1 = createRealTagRollbackAnchor(GOOD_PARAMS);
const g2 = createRealTagRollbackAnchor(GOOD_PARAMS);
assert(g1.anchor_hash === g2.anchor_hash,                                            '[G-01] deterministic hash');

// ─── Suite H: Invariants ──────────────────────────────────────────
console.log('\n[Suite H] Invariants');
assert(fix.tag_created        === false, '[H-01] fix: tag_created=false');
assert(fix.rollback_executed  === false, '[H-02] fix: rollback_executed=false');
assert(fix.git_push_performed === false, '[H-03] fix: push=false');
assert(fix.deploy_performed   === false, '[H-04] fix: deploy=false');
assert(fix.stable_promoted    === false, '[H-05] fix: stable=false');
assert(fix.release_performed  === false, '[H-06] fix: release=false');

assert(ready.tag_created      === false, '[H-07] ready: tag_created=false');
assert(ready.rollback_executed=== false, '[H-08] ready: rollback=false');
assert(ready.git_push_performed=== false,'[H-09] ready: push=false');

assert(noSafety.tag_created   === false, '[H-10] blocked: tag_created=false');
assert(noSafety.rollback_executed === false, '[H-11] blocked: rollback=false');

// ─── Suite I: Validate ────────────────────────────────────────────
console.log('\n[Suite I] Validate');
assert(validateRealTagRollbackAnchor(fix).valid === true,                            '[I-01] valid=true');
assert(validateRealTagRollbackAnchor(null).valid === false,                          '[I-02] null invalid');
assert(validateRealTagRollbackAnchor({ rollback_anchor_status: 'BAD', rollback_executed: false, tag_created: false, git_push_performed: false }).valid === false, '[I-03] bad status');

// ─── Suite J: Render ─────────────────────────────────────────────
console.log('\n[Suite J] Render');
const rendered = renderRealTagRollbackAnchor(fix);
assert(typeof rendered === 'string',                                                  '[J-01] returns string');
assert(rendered.includes('TAG_ROLLBACK_ANCHOR_READY'),                               '[J-02] status in output');
assert(rendered.includes('rollback_executed           : false'),                     '[J-03] rollback=false');
assert(rendered.includes('tag_created                 : false'),                     '[J-04] tag=false');
assert(rendered.includes('git_push_performed          : false'),                     '[J-05] push=false');
assert(rendered.includes('rollback_commands_preview'),                               '[J-06] commands in output');
assert(renderRealTagRollbackAnchor(null) === 'real_tag_rollback_anchor: null',       '[J-07] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-rollback-anchor: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
