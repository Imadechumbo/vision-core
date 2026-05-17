#!/usr/bin/env node
/**
 * Manual Promotion Review Gate — Unit Tests V43.1
 */

import { spawnSync } from 'child_process';
import { resolve }   from 'path';
import {
  runManualPromotionReviewGate,
  PROMOTION_REVIEW_STATUSES,
} from '../manual-promotion-review-gate.mjs';
import { buildManualPromotionPackage } from '../manual-promotion-package-builder.mjs';
import { _resetLedgerForTest }         from '../runtime-execution-ledger-binding.mjs';

const CLI = resolve(process.cwd(), 'tools', 'manual-promotion-review-gate.mjs');
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

// Build shared fixture package
_resetLedgerForTest();
const fixturePkg = buildManualPromotionPackage({ fixture_mode: true });

// ─── Suite A: Constants ───────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(PROMOTION_REVIEW_STATUSES),                                              '[A-01] statuses array');
assert(PROMOTION_REVIEW_STATUSES.length === 6,                                                '[A-02] 6 statuses');
assert(PROMOTION_REVIEW_STATUSES.includes('MANUAL_PROMOTION_REVIEW_BLOCKED_NO_PACKAGE'),      '[A-03] BLOCKED_NO_PACKAGE');
assert(PROMOTION_REVIEW_STATUSES.includes('MANUAL_PROMOTION_REVIEW_BLOCKED_PACKAGE_NOT_READY'), '[A-04] BLOCKED_PACKAGE_NOT_READY');
assert(PROMOTION_REVIEW_STATUSES.includes('MANUAL_PROMOTION_REVIEW_BLOCKED_NOT_REQUESTED'),   '[A-05] BLOCKED_NOT_REQUESTED');
assert(PROMOTION_REVIEW_STATUSES.includes('MANUAL_PROMOTION_REVIEW_BLOCKED_REVIEWER'),        '[A-06] BLOCKED_REVIEWER');
assert(PROMOTION_REVIEW_STATUSES.includes('MANUAL_PROMOTION_REVIEW_BLOCKED_INVARIANTS'),      '[A-07] BLOCKED_INVARIANTS');
assert(PROMOTION_REVIEW_STATUSES.includes('MANUAL_PROMOTION_REVIEW_READY'),                   '[A-08] READY');

// ─── Suite B: Blocked — no package ───────────────────────────────
console.log('\n[Suite B] Blocked — no package');
const noPkg = runManualPromotionReviewGate({});
assert(noPkg.promotion_review_status  === 'MANUAL_PROMOTION_REVIEW_BLOCKED_NO_PACKAGE', '[B-01] no package → BLOCKED_NO_PACKAGE');
assert(noPkg.promotion_review_ready   === false,                                        '[B-02] ready=false');
assert(noPkg.review_id                === null,                                         '[B-03] review_id=null');
assert(noPkg.blocking_reason          === 'promotion_package_missing',                  '[B-04] blocking reason');
assert(noPkg.promotion_review_allowed === false,                                        '[B-05] review_allowed=false');
assert(noPkg.deploy_allowed           === false,                                        '[B-06] deploy=false');
assert(noPkg.promotion_allowed        === false,                                        '[B-07] promotion=false');
assert(noPkg.manual_only              === true,                                         '[B-08] manual_only=true');

const explicitNull = runManualPromotionReviewGate({ promotion_package: null });
assert(explicitNull.promotion_review_status === 'MANUAL_PROMOTION_REVIEW_BLOCKED_NO_PACKAGE', '[B-09] explicit null → BLOCKED');

// ─── Suite C: Blocked — package not ready ─────────────────────────
console.log('\n[Suite C] Blocked — package not ready');
const notReadyPkg = runManualPromotionReviewGate({
  promotion_package: {
    promotion_package_ready: false,
    promotion_package_status: 'PROMOTION_PACKAGE_BLOCKED_NO_RC',
    package_hash: null,
    deploy_allowed: false,
    promotion_allowed: false,
  },
  explicit_manual_review_requested: true,
  reviewer_id: 'reviewer-001',
});
assert(notReadyPkg.promotion_review_status  === 'MANUAL_PROMOTION_REVIEW_BLOCKED_PACKAGE_NOT_READY', '[C-01] not-ready pkg → BLOCKED_PACKAGE_NOT_READY');
assert(notReadyPkg.promotion_review_ready   === false,                                               '[C-02] ready=false');
assert(notReadyPkg.blocking_reason          === 'promotion_package_not_ready',                       '[C-03] blocking reason');
assert(notReadyPkg.package_status           === 'PROMOTION_PACKAGE_BLOCKED_NO_RC',                  '[C-04] package_status echoed');
assert(notReadyPkg.promotion_review_allowed === false,                                               '[C-05] review_allowed=false');

// ─── Suite D: Blocked — not requested ─────────────────────────────
console.log('\n[Suite D] Blocked — not requested');
const notRequested = runManualPromotionReviewGate({
  promotion_package: fixturePkg,
  explicit_manual_review_requested: false,
  reviewer_id: 'reviewer-001',
});
assert(notRequested.promotion_review_status  === 'MANUAL_PROMOTION_REVIEW_BLOCKED_NOT_REQUESTED', '[D-01] not requested → BLOCKED_NOT_REQUESTED');
assert(notRequested.promotion_review_ready   === false,                                           '[D-02] ready=false');
assert(notRequested.blocking_reason          === 'explicit_manual_review_not_requested',           '[D-03] blocking reason');
assert(notRequested.promotion_review_allowed === false,                                           '[D-04] review_allowed=false');

const defaultRequested = runManualPromotionReviewGate({
  promotion_package: fixturePkg,
  reviewer_id: 'reviewer-001',
  // no explicit_manual_review_requested → defaults false
});
assert(defaultRequested.promotion_review_status === 'MANUAL_PROMOTION_REVIEW_BLOCKED_NOT_REQUESTED', '[D-05] default not requested → BLOCKED');

// ─── Suite E: Blocked — reviewer missing ─────────────────────────
console.log('\n[Suite E] Blocked — reviewer missing');
const noReviewer = runManualPromotionReviewGate({
  promotion_package: fixturePkg,
  explicit_manual_review_requested: true,
  // no reviewer_id
});
assert(noReviewer.promotion_review_status  === 'MANUAL_PROMOTION_REVIEW_BLOCKED_REVIEWER', '[E-01] no reviewer → BLOCKED_REVIEWER');
assert(noReviewer.promotion_review_ready   === false,                                      '[E-02] ready=false');
assert(noReviewer.blocking_reason          === 'reviewer_id_missing',                      '[E-03] blocking reason');
assert(noReviewer.promotion_review_allowed === false,                                      '[E-04] review_allowed=false');

const emptyReviewer = runManualPromotionReviewGate({
  promotion_package: fixturePkg,
  explicit_manual_review_requested: true,
  reviewer_id: '   ',
});
assert(emptyReviewer.promotion_review_status === 'MANUAL_PROMOTION_REVIEW_BLOCKED_REVIEWER', '[E-05] empty reviewer → BLOCKED_REVIEWER');

// ─── Suite F: Blocked — invariants violated ───────────────────────
console.log('\n[Suite F] Blocked — invariants violated');
const badPkgDeploy = runManualPromotionReviewGate({
  promotion_package: {
    promotion_package_ready: true,
    package_hash: 'abc123',
    deploy_allowed: true,
    promotion_allowed: false,
  },
  explicit_manual_review_requested: true,
  reviewer_id: 'reviewer-001',
});
assert(badPkgDeploy.promotion_review_status  === 'MANUAL_PROMOTION_REVIEW_BLOCKED_INVARIANTS', '[F-01] deploy=true in pkg → BLOCKED_INVARIANTS');
assert(badPkgDeploy.promotion_review_ready   === false,                                        '[F-02] ready=false');
assert(badPkgDeploy.blocking_reason          === 'package_invariants_violated',                '[F-03] blocking reason');
assert(badPkgDeploy.promotion_review_allowed === false,                                        '[F-04] review_allowed=false');
assert(badPkgDeploy.deploy_allowed           === false,                                        '[F-05] invariant re-locked');

const badPkgPromotion = runManualPromotionReviewGate({
  promotion_package: {
    promotion_package_ready: true,
    package_hash: 'abc123',
    deploy_allowed: false,
    promotion_allowed: true,
  },
  explicit_manual_review_requested: true,
  reviewer_id: 'reviewer-001',
});
assert(badPkgPromotion.promotion_review_status === 'MANUAL_PROMOTION_REVIEW_BLOCKED_INVARIANTS', '[F-06] promotion=true in pkg → BLOCKED_INVARIANTS');
assert(badPkgPromotion.promotion_allowed        === false,                                       '[F-07] invariant re-locked');

// ─── Suite G: Ready review ────────────────────────────────────────
console.log('\n[Suite G] Ready review');
const ready = runManualPromotionReviewGate({
  promotion_package:              fixturePkg,
  explicit_manual_review_requested: true,
  reviewer_id:                    'reviewer-430',
  review_notes:                   'Package looks good for staging',
  _mock_timestamp:                TS,
});
assert(ready.promotion_review_status     === 'MANUAL_PROMOTION_REVIEW_READY',  '[G-01] status=READY');
assert(ready.promotion_review_ready      === true,                              '[G-02] ready=true');
assert(typeof ready.review_id            === 'string',                          '[G-03] review_id is string');
assert(ready.review_id.length            === 32,                                '[G-04] review_id length=32');
assert(ready.package_hash                === fixturePkg.package_hash,           '[G-05] package_hash echoed');
assert(ready.rc_id                       === fixturePkg.rc_id,                  '[G-06] rc_id echoed');
assert(ready.evidence_source             === 'go-core',                         '[G-07] evidence_source=go-core');
assert(ready.release_candidate_mode      === 'supervised',                      '[G-08] mode=supervised');
assert(ready.explicit_manual_review_requested === true,                         '[G-09] explicit_review=true');
assert(ready.reviewer_id                 === 'reviewer-430',                    '[G-10] reviewer_id set');
assert(ready.review_notes                === 'Package looks good for staging',  '[G-11] notes set');
assert(ready.reviewed_at                 === TS,                                '[G-12] reviewed_at=mock ts');
assert(ready.blocking_reason             === null,                              '[G-13] blocking_reason=null');
// CRITICAL invariant: promotion_review_allowed=true ONLY when READY
assert(ready.promotion_review_allowed    === true,                              '[G-14] promotion_review_allowed=true when READY');
assert(ready.deploy_allowed              === false,                             '[G-15] deploy=false (REGRA)');
assert(ready.promotion_allowed           === false,                             '[G-16] promotion=false (REGRA)');
assert(ready.stable_allowed              === false,                             '[G-17] stable=false (REGRA)');
assert(ready.tag_allowed                 === false,                             '[G-18] tag=false (REGRA)');
assert(ready.release_performed           === false,                             '[G-19] release_performed=false');
assert(ready.promote_performed           === false,                             '[G-20] promote_performed=false');
assert(ready.manual_only                 === true,                              '[G-21] manual_only=true');
assert(ready.schema_version              === 'v43.1',                           '[G-22] schema=v43.1');

// Deterministic review_id
const ready2 = runManualPromotionReviewGate({
  promotion_package:              fixturePkg,
  explicit_manual_review_requested: true,
  reviewer_id:                    'reviewer-430',
  _mock_timestamp:                TS,
});
assert(ready.review_id === ready2.review_id,                                    '[G-23] review_id deterministic');

// Empty notes → null
assert(ready2.review_notes === null,                                             '[G-24] empty notes → null');

// ─── Suite H: Fixture mode ────────────────────────────────────────
console.log('\n[Suite H] Fixture mode');
const fix = runManualPromotionReviewGate({ fixture_mode: true, _mock_timestamp: TS });
assert(fix.promotion_review_status  === 'MANUAL_PROMOTION_REVIEW_READY', '[H-01] fixture → READY');
assert(fix.promotion_review_ready   === true,                            '[H-02] ready=true');
assert(typeof fix.review_id         === 'string',                        '[H-03] review_id present');
assert(fix.evidence_source          === 'go-core',                       '[H-04] source=go-core');
assert(fix.promotion_review_allowed === true,                            '[H-05] review_allowed=true');
assert(fix.deploy_allowed           === false,                           '[H-06] deploy=false');
assert(fix.promotion_allowed        === false,                           '[H-07] promotion=false');
assert(fix.manual_only              === true,                            '[H-08] manual_only=true');
assert(fix.schema_version           === 'v43.1',                         '[H-09] schema=v43.1');

// ─── Suite I: Invariants across all states ────────────────────────
console.log('\n[Suite I] Invariants');
for (const [label, result] of [
  ['no_pkg', noPkg],
  ['not_ready_pkg', notReadyPkg],
  ['not_requested', notRequested],
  ['no_reviewer', noReviewer],
  ['bad_deploy', badPkgDeploy],
  ['bad_promotion', badPkgPromotion],
  ['ready', ready],
  ['fixture', fix],
]) {
  assert(result.deploy_allowed    === false, `[I] deploy=false (${label})`);
  assert(result.promotion_allowed === false, `[I] promotion=false (${label})`);
  assert(result.stable_allowed    === false, `[I] stable=false (${label})`);
  assert(result.tag_allowed       === false, `[I] tag=false (${label})`);
  assert(result.release_performed === false, `[I] release_performed=false (${label})`);
  assert(result.promote_performed === false, `[I] promote_performed=false (${label})`);
  assert(result.manual_only       === true,  `[I] manual_only=true (${label})`);
}
// promotion_review_allowed only true when READY
for (const [label, result] of [
  ['no_pkg', noPkg],
  ['not_ready_pkg', notReadyPkg],
  ['not_requested', notRequested],
  ['no_reviewer', noReviewer],
  ['bad_deploy', badPkgDeploy],
  ['bad_promotion', badPkgPromotion],
]) {
  assert(result.promotion_review_allowed === false, `[I] review_allowed=false (${label})`);
}

// ─── Suite J: CLI ─────────────────────────────────────────────────
console.log('\n[Suite J] CLI');
const cliDefault = runCLI([]);
assert(cliDefault.exitCode === 1,                                               '[J-01] default → exit 1');
assert(cliDefault.stdout.includes('MANUAL_PROMOTION_REVIEW_BLOCKED'),           '[J-02] stdout BLOCKED');

const cliFixture = runCLI(['--fixture-mode']);
assert(cliFixture.exitCode === 0,                                               '[J-03] --fixture-mode → exit 0');
assert(cliFixture.stdout.includes('MANUAL_PROMOTION_REVIEW_READY'),             '[J-04] stdout READY');

const cliJson = runCLI(['--fixture-mode', '--json']);
assert(cliJson.exitCode === 0,                                                 '[J-05] --json exit 0');
let parsed = null;
try { parsed = JSON.parse(cliJson.stdout); } catch { parsed = null; }
assert(parsed !== null,                                                        '[J-06] JSON parseable');
assert(parsed && parsed.promotion_review_ready    === true,                    '[J-07] ready=true');
assert(parsed && parsed.promotion_review_allowed  === true,                    '[J-08] review_allowed=true');
assert(parsed && parsed.deploy_allowed            === false,                   '[J-09] deploy=false');
assert(parsed && parsed.promotion_allowed         === false,                   '[J-10] promotion=false (REGRA)');
assert(parsed && parsed.stable_allowed            === false,                   '[J-11] stable=false');
assert(parsed && parsed.tag_allowed               === false,                   '[J-12] tag=false');
assert(parsed && parsed.release_performed         === false,                   '[J-13] release_performed=false');
assert(parsed && parsed.promote_performed         === false,                   '[J-14] promote_performed=false');
assert(parsed && parsed.manual_only               === true,                    '[J-15] manual_only=true');
assert(parsed && parsed.evidence_source           === 'go-core',               '[J-16] source=go-core');
assert(parsed && parsed.schema_version            === 'v43.1',                 '[J-17] schema=v43.1');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nmanual-promotion-review-gate: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
