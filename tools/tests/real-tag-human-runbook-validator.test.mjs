#!/usr/bin/env node
/**
 * Real Tag Human Runbook Validator — Unit Tests V91.1
 */

import {
  RUNBOOK_VALIDATOR_STATUSES,
  validateRunbookCompleteness,
  validateRunbookSafety,
  validateRunbookCommands,
  runRealTagHumanRunbookValidator,
  renderRunbookValidatorSummary,
} from '../real-tag-human-runbook-validator.mjs';
import { buildRealTagHumanRunbook } from '../real-tag-human-runbook.mjs';

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log(`  ✓ ${m}`); passed++; }
  else   { console.error(`  ✗ FAIL: ${m}`); failed++; }
}

const TS = '2026-05-19T02:30:00.000Z';
const fixRunbook = buildRealTagHumanRunbook({ fixture_mode: true, _mock_timestamp: TS });

// ─── Suite A: Constants ────────────────────────────────────────────
console.log('\n[Suite A] Constants');
assert(Array.isArray(RUNBOOK_VALIDATOR_STATUSES),                          '[A-01] statuses array');
assert(RUNBOOK_VALIDATOR_STATUSES.length === 5,                            '[A-02] 5 statuses');
assert(RUNBOOK_VALIDATOR_STATUSES.includes('VALIDATOR_BLOCKED_RUNBOOK'),   '[A-03] BLOCKED_RUNBOOK');
assert(RUNBOOK_VALIDATOR_STATUSES.includes('VALIDATOR_BLOCKED_COMPLETENESS'),'[A-04] BLOCKED_COMPLETENESS');
assert(RUNBOOK_VALIDATOR_STATUSES.includes('VALIDATOR_BLOCKED_SAFETY'),    '[A-05] BLOCKED_SAFETY');
assert(RUNBOOK_VALIDATOR_STATUSES.includes('VALIDATOR_BLOCKED_COMMANDS'),  '[A-06] BLOCKED_COMMANDS');
assert(RUNBOOK_VALIDATOR_STATUSES.includes('VALIDATOR_PASSED'),            '[A-07] VALIDATOR_PASSED');

// ─── Suite B: validateRunbookCompleteness ─────────────────────────
console.log('\n[Suite B] validateRunbookCompleteness');
const compOk = validateRunbookCompleteness(fixRunbook);
assert(compOk.passed === true,                                             '[B-01] fixture completeness pass');
assert(Array.isArray(compOk.failures),                                     '[B-02] failures array');
assert(compOk.failures.length === 0,                                       '[B-03] no failures');

const compNull = validateRunbookCompleteness(null);
assert(compNull.passed === false,                                           '[B-04] null → fail');
assert(compNull.failures.includes('runbook_is_null_or_not_object'),        '[B-05] null reason');

const compMissing = validateRunbookCompleteness({ ...fixRunbook, pre_checks: undefined });
assert(compMissing.passed === false,                                        '[B-06] missing pre_checks → fail');

const compEmptyArr = validateRunbookCompleteness({ ...fixRunbook, post_checks: [] });
assert(compEmptyArr.passed === false,                                       '[B-07] empty post_checks → fail');

// ─── Suite C: validateRunbookSafety ───────────────────────────────
console.log('\n[Suite C] validateRunbookSafety');
const safeOk = validateRunbookSafety(fixRunbook);
assert(safeOk.passed === true,                                             '[C-01] fixture safety pass');
assert(safeOk.failures.length === 0,                                       '[C-02] no safety failures');

const safeNull = validateRunbookSafety(null);
assert(safeNull.passed === false,                                           '[C-03] null → fail');

const safeHuman = validateRunbookSafety({ ...fixRunbook, human_required: false });
assert(safeHuman.passed === false,                                          '[C-04] human_required=false → fail');

const safeCI = validateRunbookSafety({ ...fixRunbook, ci_blocked: false });
assert(safeCI.passed === false,                                             '[C-05] ci_blocked=false → fail');

const safeLocal = validateRunbookSafety({ ...fixRunbook, local_interactive_only: false });
assert(safeLocal.passed === false,                                          '[C-06] local_interactive_only=false → fail');

const safeTag = validateRunbookSafety({ ...fixRunbook, tag_created: true });
assert(safeTag.passed === false,                                            '[C-07] tag_created=true → fail');

const safeActual = validateRunbookSafety({ ...fixRunbook, actual_real_tag_created: true });
assert(safeActual.passed === false,                                         '[C-08] actual_real_tag_created=true → fail');

const safeMissingBlock = validateRunbookSafety({
  ...fixRunbook,
  blocked_actions: ['some_action'],
});
assert(safeMissingBlock.passed === false,                                   '[C-09] missing required blocked action → fail');
assert(safeMissingBlock.failures.some(f => f.includes('deploy_to_production')),'[C-10] deploy missing flagged');

// ─── Suite D: validateRunbookCommands ─────────────────────────────
console.log('\n[Suite D] validateRunbookCommands');
const cmdOk = validateRunbookCommands(fixRunbook);
assert(cmdOk.passed === true,                                               '[D-01] fixture commands pass');
assert(cmdOk.failures.length === 0,                                        '[D-02] no command failures');

const cmdNull = validateRunbookCommands(null);
assert(cmdNull.passed === false,                                            '[D-03] null → fail');

const cmdMissFlag = validateRunbookCommands({
  ...fixRunbook,
  real_execution_command_template: 'node tools/controller.mjs --dry-run=false',
});
assert(cmdMissFlag.passed === false,                                        '[D-04] missing --real-tag-one-shot → fail');
assert(cmdMissFlag.failures.some(f => f.includes('--real-tag-one-shot')), '[D-05] flagged missing flag');

const cmdNoDryRunFlag = validateRunbookCommands({
  ...fixRunbook,
  dry_run_command: 'node tools/controller.mjs',
});
assert(cmdNoDryRunFlag.passed === false,                                    '[D-06] dry_run missing --dry-run flag → fail');

// ─── Suite E: runRealTagHumanRunbookValidator fixture mode ────────
console.log('\n[Suite E] Fixture mode');
const fix = runRealTagHumanRunbookValidator({ fixture_mode: true, _mock_timestamp: TS });
assert(fix !== null && typeof fix === 'object',                            '[E-01] returns object');
assert(fix.validator_status === 'VALIDATOR_PASSED',                        '[E-02] VALIDATOR_PASSED');
assert(fix.validator_passed === true,                                       '[E-03] passed=true');
assert(fix.schema_version   === 'v91.1',                                   '[E-04] schema=v91.1');
assert(typeof fix.validator_id === 'string' && fix.validator_id.length === 24,'[E-05] id 24 chars');
assert(fix.blocking_reason  === null,                                       '[E-06] blocking=null');
assert(fix.completeness_passed === true,                                    '[E-07] completeness_passed=true');
assert(fix.safety_passed       === true,                                    '[E-08] safety_passed=true');
assert(fix.commands_verified   === true,                                    '[E-09] commands_verified=true');
assert(Array.isArray(fix.failures) && fix.failures.length === 0,          '[E-10] no failures');
assert(fix.created_at === TS,                                               '[E-11] created_at=TS');

// ─── Suite F: Invariants (REGRA ABSOLUTA) ────────────────────────
console.log('\n[Suite F] Invariants');
assert(fix.tag_created                  === false, '[F-01] tag_created=false');
assert(fix.actual_real_tag_created      === false, '[F-02] actual_real_tag_created=false');
assert(fix.git_push_performed           === false, '[F-03] git_push_performed=false');
assert(fix.deploy_performed             === false, '[F-04] deploy_performed=false');
assert(fix.stable_promoted              === false, '[F-05] stable_promoted=false');
assert(fix.release_performed            === false, '[F-06] release_performed=false');
assert(fix.real_execution_not_performed === true,  '[F-07] real_execution_not_performed=true');

// ─── Suite G: Blocked states ──────────────────────────────────────
console.log('\n[Suite G] Blocked states');

const bNull = runRealTagHumanRunbookValidator({ fixture_mode: false, runbook: null, _mock_timestamp: TS });
assert(bNull.validator_status === 'VALIDATOR_BLOCKED_RUNBOOK',             '[G-01] null runbook → BLOCKED_RUNBOOK');
assert(bNull.validator_passed === false,                                    '[G-02] null: passed=false');
assert(bNull.tag_created === false,                                         '[G-03] null: tag_created=false');

const bNotReady = runRealTagHumanRunbookValidator({
  fixture_mode: false,
  runbook: { ...fixRunbook, runbook_ready: false, runbook_status: 'RUNBOOK_BLOCKED_BASELINE' },
  _mock_timestamp: TS,
});
assert(bNotReady.validator_status === 'VALIDATOR_BLOCKED_RUNBOOK',         '[G-04] not_ready → BLOCKED_RUNBOOK');
assert(bNotReady.blocking_reason === 'runbook_not_ready',                  '[G-05] reason=runbook_not_ready');

const bSafetyViol = runRealTagHumanRunbookValidator({
  fixture_mode: false,
  runbook: { ...fixRunbook, human_required: false },
  _mock_timestamp: TS,
});
assert(bSafetyViol.validator_status === 'VALIDATOR_BLOCKED_SAFETY',        '[G-06] safety violation → BLOCKED_SAFETY');
assert(bSafetyViol.completeness_passed === true,                            '[G-07] completeness passed before safety');

const bCmdIncomplete = runRealTagHumanRunbookValidator({
  fixture_mode: false,
  runbook: {
    ...fixRunbook,
    real_execution_command_template: 'node tools/controller.mjs --some-flag',
  },
  _mock_timestamp: TS,
});
assert(bCmdIncomplete.validator_status === 'VALIDATOR_BLOCKED_COMMANDS',   '[G-08] missing flags → BLOCKED_COMMANDS');
assert(bCmdIncomplete.safety_passed === true,                               '[G-09] safety passed before commands');

// ─── Suite H: Non-fixture PASSED ─────────────────────────────────
console.log('\n[Suite H] Non-fixture PASSED');
const nonFix = runRealTagHumanRunbookValidator({
  fixture_mode: false,
  runbook: fixRunbook,
  _mock_timestamp: TS,
});
assert(nonFix.validator_status === 'VALIDATOR_PASSED',                     '[H-01] non-fixture PASSED');
assert(nonFix.validator_passed === true,                                    '[H-02] passed=true');

// ─── Suite I: Deterministic ID ────────────────────────────────────
console.log('\n[Suite I] Deterministic ID');
const d1 = runRealTagHumanRunbookValidator({ fixture_mode: true, _mock_timestamp: TS });
const d2 = runRealTagHumanRunbookValidator({ fixture_mode: true, _mock_timestamp: TS });
assert(d1.validator_id === d2.validator_id,                                '[I-01] deterministic id');

// ─── Suite J: Render ──────────────────────────────────────────────
console.log('\n[Suite J] Render');
const rendered = renderRunbookValidatorSummary(fix);
assert(typeof rendered === 'string',                                        '[J-01] returns string');
assert(rendered.includes('VALIDATOR_PASSED'),                               '[J-02] status in output');
assert(rendered.includes('tag_created                 : false'),           '[J-03] tag_created=false');
assert(rendered.includes('actual_real_tag_created     : false'),           '[J-04] actual_tag=false');
assert(rendered.includes('real_execution_not_performed: true'),            '[J-05] not_performed=true');
assert(rendered.includes('completeness_passed'),                            '[J-06] completeness field');
assert(rendered.includes('safety_passed'),                                  '[J-07] safety field');
assert(rendered.includes('commands_verified'),                              '[J-08] commands field');

const renderedFail = renderRunbookValidatorSummary(bNull);
assert(renderedFail.includes('BLOCKED_RUNBOOK'),                            '[J-09] blocked status in render');
assert(renderedFail.includes('FAILURES'),                                   '[J-10] failures section in blocked');

assert(renderRunbookValidatorSummary(null) === 'runbook_validator: null',  '[J-11] null → string');

// ─── Summary ──────────────────────────────────────────────────────
console.log(`\nreal-tag-human-runbook-validator: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
