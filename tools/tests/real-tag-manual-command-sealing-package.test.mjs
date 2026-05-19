#!/usr/bin/env node
/**
 * Real Tag Manual Command Sealing Package — Unit Tests V101.1
 */

import {
  COMMAND_SEAL_STATUSES,
  buildRealTagManualCommandSealingPackage,
  validateRealTagManualCommandSealingPackage,
  renderRealTagManualCommandSealingPackage,
} from '../real-tag-manual-command-sealing-package.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else   { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS      = '2026-05-19T15:30:00.000Z';
const SHA     = 'abc1234def567890abc12345';

const RUNBOOK_FIXTURE = {
  runbook_ready:             true,
  runbook_id:                'runbook-test-001',
  target_tag:                'v1.0.0',
  git_head:                  SHA,
  evidence_receipt_id:       'receipt-001',
  rollback_anchor_id:        'anchor-001',
  exact_manual_commands:     ['git status --porcelain', `git tag -a v1.0.0 ${SHA} -m "Release v1.0.0"`, `git push origin refs/tags/v1.0.0`],
  rollback_commands:         [`git tag -d v1.0.0`, `git push origin :refs/tags/v1.0.0`],
  human_receipt_instructions: 'Fill in the receipt template.',
};

const RUNBOOK_ALT = {
  ...RUNBOOK_FIXTURE,
  exact_manual_commands: ['git status --porcelain', 'git tag -a v2.0.0 def456 -m "Release v2.0.0"'],
};

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(COMMAND_SEAL_STATUSES),                                          '[A-01] statuses array');
assert(COMMAND_SEAL_STATUSES.length === 3,                                             '[A-02] 3 statuses');
assert(COMMAND_SEAL_STATUSES.includes('COMMAND_SEAL_BLOCKED_RUNBOOK'),                '[A-03] BLOCKED_RUNBOOK');
assert(COMMAND_SEAL_STATUSES.includes('COMMAND_SEAL_BLOCKED_HASH'),                   '[A-04] BLOCKED_HASH');
assert(COMMAND_SEAL_STATUSES.includes('COMMAND_SEAL_READY'),                          '[A-05] COMMAND_SEAL_READY');

// ─── Suite B: Fixture mode ────────────────────────────────────────
console.log('\n[Suite B] Fixture mode');
const fix = buildRealTagManualCommandSealingPackage({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                                       '[B-01] returns object');
assert(fix.seal_status       === 'COMMAND_SEAL_READY',                               '[B-02] fixture=READY');
assert(fix.command_seal_valid === true,                                               '[B-03] seal_valid=true');
assert(fix.schema_version    === 'v101.1',                                            '[B-04] schema=v101.1');
assert(typeof fix.seal_id === 'string' && fix.seal_id.length === 24,                 '[B-05] id 24 chars');
assert(fix.blocking_reason   === null,                                                '[B-06] blocking=null');
assert(fix.immutable         === true,                                                '[B-07] immutable=true');
assert(typeof fix.command_hash === 'string' && fix.command_hash.length === 32,       '[B-08] command_hash 32 chars');
assert(typeof fix.rollback_hash === 'string' && fix.rollback_hash.length === 32,     '[B-09] rollback_hash 32 chars');
assert(typeof fix.seal_hash === 'string' && fix.seal_hash.length === 32,             '[B-10] seal_hash 32 chars');
assert(Array.isArray(fix.sealed_manual_commands) && fix.sealed_manual_commands.length >= 2, '[B-11] commands array');
assert(Array.isArray(fix.sealed_rollback_commands) && fix.sealed_rollback_commands.length >= 1, '[B-12] rollback array');
assert(typeof fix.receipt_template === 'string',                                     '[B-13] receipt_template string');
assert(fix.created_at        === TS,                                                  '[B-14] created_at=TS');

// ─── Suite C: Invariants ──────────────────────────────────────────
console.log('\n[Suite C] Invariants');
assert(fix.tag_created                  === false, '[C-01] tag_created=false');
assert(fix.git_push_performed           === false, '[C-02] git_push_performed=false');
assert(fix.actual_real_tag_created      === false, '[C-03] actual_real_tag_created=false');
assert(fix.deploy_performed             === false, '[C-04] deploy_performed=false');
assert(fix.stable_promoted              === false, '[C-05] stable_promoted=false');
assert(fix.release_performed            === false, '[C-06] release_performed=false');
assert(fix.real_execution_not_performed === true,  '[C-07] real_execution_not_performed=true');

// ─── Suite D: BLOCKED_RUNBOOK ──────────────────────────────────────
console.log('\n[Suite D] BLOCKED_RUNBOOK');
const bNoRunbook = buildRealTagManualCommandSealingPackage({ fixture_mode: false, _mock_timestamp: TS });
assert(bNoRunbook.seal_status      === 'COMMAND_SEAL_BLOCKED_RUNBOOK',               '[D-01] no runbook → BLOCKED_RUNBOOK');
assert(bNoRunbook.command_seal_valid === false,                                       '[D-02] seal_valid=false');
const bBadRunbook = buildRealTagManualCommandSealingPackage({
  fixture_mode: false, runbook_result: { runbook_ready: false }, _mock_timestamp: TS,
});
assert(bBadRunbook.seal_status === 'COMMAND_SEAL_BLOCKED_RUNBOOK',                   '[D-03] bad runbook → BLOCKED_RUNBOOK');

// ─── Suite E: Full seal ready ──────────────────────────────────────
console.log('\n[Suite E] Full seal ready');
const seal = buildRealTagManualCommandSealingPackage({
  fixture_mode: false, runbook_result: RUNBOOK_FIXTURE, _mock_timestamp: TS,
});
assert(seal.seal_status       === 'COMMAND_SEAL_READY',                              '[E-01] READY with runbook');
assert(seal.command_seal_valid === true,                                              '[E-02] seal_valid=true');
assert(seal.immutable          === true,                                              '[E-03] immutable=true');
assert(seal.final_runbook_id   === 'runbook-test-001',                               '[E-04] runbook_id linked');
assert(seal.target_tag         === 'v1.0.0',                                         '[E-05] target_tag');
assert(seal.git_head           === SHA,                                               '[E-06] git_head');
assert(seal.sealed_manual_commands.length >= 2,                                      '[E-07] commands present');
assert(seal.sealed_rollback_commands.length >= 1,                                    '[E-08] rollback present');
assert(seal.tag_created        === false,                                             '[E-09] tag=false');
assert(seal.stable_promoted    === false,                                             '[E-10] stable=false');

// ─── Suite F: Hash determinism ────────────────────────────────────
console.log('\n[Suite F] Hash determinism');
const s1 = buildRealTagManualCommandSealingPackage({ fixture_mode: false, runbook_result: RUNBOOK_FIXTURE, _mock_timestamp: TS });
const s2 = buildRealTagManualCommandSealingPackage({ fixture_mode: false, runbook_result: RUNBOOK_FIXTURE, _mock_timestamp: TS });
assert(s1.command_hash === s2.command_hash,                                          '[F-01] command_hash deterministic');
assert(s1.seal_hash    === s2.seal_hash,                                             '[F-02] seal_hash deterministic');

// ─── Suite G: Hash changes when commands change ────────────────────
console.log('\n[Suite G] Hash changes');
const sAlt = buildRealTagManualCommandSealingPackage({
  fixture_mode: false, runbook_result: RUNBOOK_ALT, _mock_timestamp: TS,
});
assert(sAlt.command_hash !== seal.command_hash,                                      '[G-01] hash changes with different commands');
assert(sAlt.seal_hash    !== seal.seal_hash,                                         '[G-02] seal_hash changes too');

// ─── Suite H: Validate ────────────────────────────────────────────
console.log('\n[Suite H] Validate');
assert(validateRealTagManualCommandSealingPackage(fix).length === 0,                 '[H-01] fixture passes');
assert(validateRealTagManualCommandSealingPackage(null).length > 0,                  '[H-02] null fails');
assert(validateRealTagManualCommandSealingPackage({ ...fix, tag_created: true }).length > 0,    '[H-03] tag=true fails');
assert(validateRealTagManualCommandSealingPackage({ ...fix, stable_promoted: true }).length > 0, '[H-04] stable=true fails');
assert(validateRealTagManualCommandSealingPackage(seal).length === 0,                '[H-05] seal passes');

// ─── Suite I: Render ─────────────────────────────────────────────
console.log('\n[Suite I] Render');
const rendered = renderRealTagManualCommandSealingPackage(fix);
assert(typeof rendered === 'string',                                                  '[I-01] returns string');
assert(rendered.includes('COMMAND_SEAL_READY'),                                      '[I-02] status in output');
assert(rendered.includes('tag_created              : false'),                        '[I-03] tag=false in output');
assert(rendered.includes('stable_promoted          : false'),                        '[I-04] stable=false in output');
assert(rendered.includes('SEALED COMMANDS'),                                         '[I-05] commands section');
assert(renderRealTagManualCommandSealingPackage(null) === 'real_tag_manual_command_sealing_package: null', '[I-06] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-manual-command-sealing-package: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
