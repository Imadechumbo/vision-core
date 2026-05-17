#!/usr/bin/env node
/**
 * Manual Promotion Package Builder — Unit Tests V43.0
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  buildManualPromotionPackage,
  PROMOTION_PACKAGE_STATUSES,
} from '../manual-promotion-package-builder.mjs';
import { runSupervisedReleaseCandidateController } from '../supervised-release-candidate-controller.mjs';
import { _resetLedgerForTest }                     from '../runtime-execution-ledger-binding.mjs';

const CLI = resolve(process.cwd(), 'tools', 'manual-promotion-package-builder.mjs');
let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else    { console.error(`  ✗ FAIL: ${m}`); failed++; }
}
function runCLI(args = []) {
  const r = spawnSync(process.execPath, ['--no-deprecation', CLI, ...args], { encoding: 'utf-8', timeout: 15000 });
  return { stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.status };
}

const TS = '2026-05-17T12:00:00.000Z';

// Build shared fixture RC
_resetLedgerForTest();
const fixtureRC = runSupervisedReleaseCandidateController({ fixture_mode: true });

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(PROMOTION_PACKAGE_STATUSES),                                     '[A-01] statuses array');
assert(PROMOTION_PACKAGE_STATUSES.length === 5,                                       '[A-02] 5 statuses');
assert(PROMOTION_PACKAGE_STATUSES.includes('PROMOTION_PACKAGE_BLOCKED_NO_RC'),        '[A-03] BLOCKED_NO_RC');
assert(PROMOTION_PACKAGE_STATUSES.includes('PROMOTION_PACKAGE_BLOCKED_RC_NOT_READY'), '[A-04] BLOCKED_RC_NOT_READY');
assert(PROMOTION_PACKAGE_STATUSES.includes('PROMOTION_PACKAGE_BLOCKED_EVIDENCE'),     '[A-05] BLOCKED_EVIDENCE');
assert(PROMOTION_PACKAGE_STATUSES.includes('PROMOTION_PACKAGE_BLOCKED_INVARIANTS'),   '[A-06] BLOCKED_INVARIANTS');
assert(PROMOTION_PACKAGE_STATUSES.includes('PROMOTION_PACKAGE_READY'),                '[A-07] READY');

// ─── Suite B: Blocked — no RC ─────────────────────────────────────
console.log('\n[Suite B] Blocked — no RC');
const noRC = buildManualPromotionPackage({});
assert(noRC.promotion_package_status  === 'PROMOTION_PACKAGE_BLOCKED_NO_RC', '[B-01] null rc → BLOCKED_NO_RC');
assert(noRC.promotion_package_ready   === false,                             '[B-02] ready=false');
assert(noRC.package_hash              === null,                              '[B-03] hash=null');
assert(noRC.blocking_reason           === 'supervised_rc_result_missing',   '[B-04] blocking reason');
assert(noRC.deploy_allowed            === false,                             '[B-05] deploy=false');
assert(noRC.promotion_allowed         === false,                             '[B-06] promotion=false');
assert(noRC.manual_only               === true,                              '[B-07] manual_only=true');

const explicitNull = buildManualPromotionPackage({ supervised_rc_result: null });
assert(explicitNull.promotion_package_status === 'PROMOTION_PACKAGE_BLOCKED_NO_RC', '[B-08] explicit null rc → BLOCKED_NO_RC');

// ─── Suite C: Blocked — RC not ready ─────────────────────────────
console.log('\n[Suite C] Blocked — RC not ready');
const notReadyRC = buildManualPromotionPackage({
  supervised_rc_result: {
    supervised_release_candidate_ready: false,
    supervised_release_candidate_status: 'SUPERVISED_RC_BLOCKED_CANDIDATE',
    evidence_source: 'go-core',
    deploy_allowed: false,
    promotion_allowed: false,
    rc_id: 'rc-blocked',
  },
});
assert(notReadyRC.promotion_package_status === 'PROMOTION_PACKAGE_BLOCKED_RC_NOT_READY', '[C-01] not-ready RC → BLOCKED_RC_NOT_READY');
assert(notReadyRC.promotion_package_ready  === false,                                    '[C-02] ready=false');
assert(notReadyRC.rc_status                === 'SUPERVISED_RC_BLOCKED_CANDIDATE',        '[C-03] rc_status echoed');
assert(notReadyRC.blocking_reason          === 'supervised_rc_not_ready',                '[C-04] blocking reason');
assert(notReadyRC.deploy_allowed           === false,                                    '[C-05] deploy=false');
assert(notReadyRC.promotion_allowed        === false,                                    '[C-06] promotion=false');

// ─── Suite D: Blocked — bad evidence source ───────────────────────
console.log('\n[Suite D] Blocked — bad evidence source');
const badEvidence = buildManualPromotionPackage({
  supervised_rc_result: {
    supervised_release_candidate_ready: true,
    evidence_source: 'backend',
    deploy_allowed: false,
    promotion_allowed: false,
    rc_id: 'rc-bad-evidence',
  },
});
assert(badEvidence.promotion_package_status === 'PROMOTION_PACKAGE_BLOCKED_EVIDENCE', '[D-01] bad source → BLOCKED_EVIDENCE');
assert(badEvidence.promotion_package_ready  === false,                                '[D-02] ready=false');
assert(badEvidence.blocking_reason.includes('evidence_source_invalid'),              '[D-03] blocking mentions invalid source');
assert(badEvidence.deploy_allowed           === false,                                '[D-04] deploy=false');

const nullEvidence = buildManualPromotionPackage({
  supervised_rc_result: {
    supervised_release_candidate_ready: true,
    evidence_source: null,
    deploy_allowed: false,
    promotion_allowed: false,
  },
});
assert(nullEvidence.promotion_package_status === 'PROMOTION_PACKAGE_BLOCKED_EVIDENCE', '[D-05] null source → BLOCKED_EVIDENCE');

// ─── Suite E: Blocked — invariants violated ───────────────────────
console.log('\n[Suite E] Blocked — invariants violated');
const deployTrue = buildManualPromotionPackage({
  supervised_rc_result: {
    supervised_release_candidate_ready: true,
    evidence_source: 'go-core',
    deploy_allowed: true,
    promotion_allowed: false,
    rc_id: 'rc-bad-inv',
  },
});
assert(deployTrue.promotion_package_status === 'PROMOTION_PACKAGE_BLOCKED_INVARIANTS', '[E-01] deploy=true → BLOCKED_INVARIANTS');
assert(deployTrue.promotion_package_ready  === false,                                  '[E-02] ready=false');
assert(deployTrue.blocking_reason          === 'rc_invariants_violated',               '[E-03] blocking reason');
assert(deployTrue.deploy_allowed           === false,                                  '[E-04] invariant re-locked');

const promotionTrue = buildManualPromotionPackage({
  supervised_rc_result: {
    supervised_release_candidate_ready: true,
    evidence_source: 'go-core',
    deploy_allowed: false,
    promotion_allowed: true,
    rc_id: 'rc-bad-inv2',
  },
});
assert(promotionTrue.promotion_package_status === 'PROMOTION_PACKAGE_BLOCKED_INVARIANTS', '[E-05] promotion=true → BLOCKED_INVARIANTS');
assert(promotionTrue.promotion_allowed         === false,                                 '[E-06] invariant re-locked');

// ─── Suite F: Ready package ───────────────────────────────────────
console.log('\n[Suite F] Ready package');
const ready = buildManualPromotionPackage({
  supervised_rc_result: fixtureRC,
  requested_by:         'test-operator-430',
  target_environment:   'staging',
  notes:                'Ready for manual review',
  _mock_timestamp:      TS,
});
assert(ready.promotion_package_status  === 'PROMOTION_PACKAGE_READY',  '[F-01] status=PROMOTION_PACKAGE_READY');
assert(ready.promotion_package_ready   === true,                        '[F-02] ready=true');
assert(typeof ready.package_hash       === 'string',                    '[F-03] package_hash is string');
assert(ready.package_hash.length       === 32,                          '[F-04] hash length=32');
assert(ready.rc_id                     === fixtureRC.rc_id,             '[F-05] rc_id echoed');
assert(ready.intent_id                 === fixtureRC.intent_id,         '[F-06] intent_id echoed');
assert(ready.evidence_source           === 'go-core',                   '[F-07] evidence_source=go-core');
assert(ready.release_candidate_mode    === 'supervised',                '[F-08] mode=supervised');
assert(ready.requested_by              === 'test-operator-430',         '[F-09] requested_by set');
assert(ready.target_environment        === 'staging',                   '[F-10] target_environment set');
assert(ready.notes                     === 'Ready for manual review',   '[F-11] notes set');
assert(ready.built_at                  === TS,                          '[F-12] built_at=mock ts');
assert(ready.blocking_reason           === null,                        '[F-13] blocking_reason=null');
assert(ready.deploy_allowed            === false,                       '[F-14] deploy=false');
assert(ready.promotion_allowed         === false,                       '[F-15] promotion=false');
assert(ready.stable_allowed            === false,                       '[F-16] stable=false');
assert(ready.tag_allowed               === false,                       '[F-17] tag=false');
assert(ready.release_performed         === false,                       '[F-18] release_performed=false');
assert(ready.promote_performed         === false,                       '[F-19] promote_performed=false');
assert(ready.manual_only               === true,                        '[F-20] manual_only=true');
assert(ready.schema_version            === 'v43.0',                     '[F-21] schema=v43.0');

// Deterministic hash
const ready2 = buildManualPromotionPackage({
  supervised_rc_result: fixtureRC,
  _mock_timestamp:      TS,
});
assert(ready.package_hash === ready2.package_hash,                      '[F-22] hash deterministic');

// Empty notes → null
const noNotes = buildManualPromotionPackage({
  supervised_rc_result: fixtureRC,
  _mock_timestamp:      TS,
});
assert(noNotes.notes === null,                                           '[F-23] empty notes → null');

// ─── Suite G: Fixture mode ────────────────────────────────────────
console.log('\n[Suite G] Fixture mode');
const fix = buildManualPromotionPackage({ fixture_mode: true, _mock_timestamp: TS });
assert(fix.promotion_package_status === 'PROMOTION_PACKAGE_READY',    '[G-01] fixture → READY');
assert(fix.promotion_package_ready  === true,                          '[G-02] ready=true');
assert(typeof fix.package_hash      === 'string',                      '[G-03] hash present');
assert(fix.evidence_source          === 'go-core',                     '[G-04] source=go-core');
assert(fix.deploy_allowed           === false,                         '[G-05] deploy=false');
assert(fix.promotion_allowed        === false,                         '[G-06] promotion=false');
assert(fix.manual_only              === true,                          '[G-07] manual_only=true');
assert(fix.schema_version           === 'v43.0',                       '[G-08] schema=v43.0');

// ─── Suite H: Invariants across all states ────────────────────────
console.log('\n[Suite H] Invariants');
for (const [label, result] of [
  ['no_rc', noRC],
  ['not_ready_rc', notReadyRC],
  ['bad_evidence', badEvidence],
  ['deploy_true', deployTrue],
  ['promotion_true', promotionTrue],
  ['ready', ready],
  ['fixture', fix],
]) {
  assert(result.deploy_allowed      === false, `[H] deploy=false (${label})`);
  assert(result.promotion_allowed   === false, `[H] promotion=false (${label})`);
  assert(result.stable_allowed      === false, `[H] stable=false (${label})`);
  assert(result.tag_allowed         === false, `[H] tag=false (${label})`);
  assert(result.release_performed   === false, `[H] release_performed=false (${label})`);
  assert(result.promote_performed   === false, `[H] promote_performed=false (${label})`);
  assert(result.manual_only         === true,  `[H] manual_only=true (${label})`);
}

// ─── Suite I: CLI ─────────────────────────────────────────────────
console.log('\n[Suite I] CLI');
const cliDefault = runCLI([]);
assert(cliDefault.exitCode === 1,                                          '[I-01] default → exit 1');
assert(cliDefault.stdout.includes('PROMOTION_PACKAGE_BLOCKED'),            '[I-02] stdout BLOCKED');

const cliFixture = runCLI(['--fixture-mode']);
assert(cliFixture.exitCode === 0,                                          '[I-03] --fixture-mode → exit 0');
assert(cliFixture.stdout.includes('PROMOTION_PACKAGE_READY'),              '[I-04] stdout READY');

const cliJson = runCLI(['--fixture-mode', '--json']);
assert(cliJson.exitCode === 0,                                             '[I-05] --json exit 0');
let parsed = null;
try { parsed = JSON.parse(cliJson.stdout); } catch { parsed = null; }
assert(parsed !== null,                                                    '[I-06] JSON parseable');
assert(parsed && parsed.promotion_package_ready  === true,                 '[I-07] ready=true');
assert(parsed && parsed.deploy_allowed           === false,                '[I-08] deploy=false');
assert(parsed && parsed.promotion_allowed        === false,                '[I-09] promotion=false');
assert(parsed && parsed.stable_allowed           === false,                '[I-10] stable=false');
assert(parsed && parsed.tag_allowed              === false,                '[I-11] tag=false');
assert(parsed && parsed.release_performed        === false,                '[I-12] release_performed=false');
assert(parsed && parsed.promote_performed        === false,                '[I-13] promote_performed=false');
assert(parsed && parsed.manual_only              === true,                 '[I-14] manual_only=true');
assert(parsed && parsed.evidence_source          === 'go-core',            '[I-15] source=go-core');
assert(parsed && parsed.schema_version           === 'v43.0',              '[I-16] schema=v43.0');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nmanual-promotion-package-builder: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
