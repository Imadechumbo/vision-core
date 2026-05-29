/**
 * VISION CORE V2.9.10
 * tools/tests/real-validation/real-validation-4-runtime-smoke-dry-run-gate.test.mjs
 * REAL-VALIDATION-4 — Unit Tests
 * ─────────────────────────────────────────────────────────────────
 * Static test only. No network. No exec. No secrets. No deploy.
 * ─────────────────────────────────────────────────────────────────
 */

import {
  buildRealValidation4RuntimeSmokeDryRunGate,
  validateRealValidation4RuntimeSmokeDryRunGate,
  renderRealValidation4RuntimeSmokeDryRunGate,
} from '../../real-validation/real-validation-4-runtime-smoke-dry-run-gate.mjs';

var passed = 0;
var failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log('  ✅ PASS: ' + label);
    passed++;
  } else {
    console.error('  ❌ FAIL: ' + label);
    failed++;
  }
}

// ── 1. Module imports ─────────────────────────────────────────────
console.log('\n[RV4-DRY-RUN-TEST] Checking module imports...\n');
console.log('── 1-3. Exports ─────────────────────────────────────────────');

assert(true, 'Module imports successfully');

// 2.
assert(typeof buildRealValidation4RuntimeSmokeDryRunGate === 'function',
  'buildRealValidation4RuntimeSmokeDryRunGate is function');

// 3.
assert(typeof validateRealValidation4RuntimeSmokeDryRunGate === 'function',
  'validateRealValidation4RuntimeSmokeDryRunGate is function');

assert(typeof renderRealValidation4RuntimeSmokeDryRunGate === 'function',
  'renderRealValidation4RuntimeSmokeDryRunGate is function');

// ── Run build ─────────────────────────────────────────────────────
console.log('\n[RV4-DRY-RUN-TEST] Running build...\n');
var result;
try {
  result = buildRealValidation4RuntimeSmokeDryRunGate();
} catch (err) {
  console.error('[RV4-DRY-RUN-TEST] build threw:', err.message);
  process.exit(1);
}

// ── 2. phase ─────────────────────────────────────────────────────
console.log('── 2-3. Phase and gate_type ─────────────────────────────────');
assert(result.phase === 'REAL-VALIDATION-4-RUNTIME-SMOKE-DRY-RUN-GATE',
  'phase = REAL-VALIDATION-4-RUNTIME-SMOKE-DRY-RUN-GATE');

// 3. gate_type
assert(result.gate_type === 'STATIC_DRY_RUN_GATE',
  'gate_type = STATIC_DRY_RUN_GATE');

// ── 4–9. Execution and call flags ────────────────────────────────
console.log('\n── 4-9. Execution and call flags ────────────────────────────');
assert(result.dry_run_executed === false,         'dry_run_executed = false');            // 4
assert(result.dry_run_simulated === true,         'dry_run_simulated = true');            // 5
assert(result.backend_called === false,           'backend_called = false');              // 6
assert(result.network_called === false,           'network_called = false');              // 7
assert(result.production_touched === false,       'production_touched = false');          // 8
assert(result.pass_gold_real_claimed === false,   'pass_gold_real_claimed = false');      // 9

// ── 10. All authority flags false ─────────────────────────────────
console.log('\n── 10. All authority flags false (REGRA ABSOLUTA) ───────────');
var auth = result.authority;
assert(typeof auth === 'object' && auth !== null, 'authority is object');

var allFlagsFalse = true;
var authKeys = Object.keys(auth);
for (var k = 0; k < authKeys.length; k++) {
  if (auth[authKeys[k]] === true) {
    allFlagsFalse = false;
    console.error('  ❌ FAIL: authority.' + authKeys[k] + ' = true (FORBIDDEN)');
    failed++;
  }
}
if (allFlagsFalse) {
  console.log('  ✅ PASS: all authority flags are false');
  passed++;
}

// ── 11–16. Plan content ───────────────────────────────────────────
console.log('\n── 11-16. Plan content ──────────────────────────────────────');

// 11. dry_run_steps >= 5
assert(Array.isArray(result.dry_run_steps) && result.dry_run_steps.length >= 5,
  'dry_run_steps is array with >= 5 entries');

// 12. Each step has required fields
var stepsValid = true;
for (var i = 0; i < result.dry_run_steps.length; i++) {
  var s = result.dry_run_steps[i];
  if (typeof s.step !== 'number' ||
      typeof s.action !== 'string' ||
      typeof s.target !== 'string' ||
      typeof s.expected !== 'string' ||
      typeof s.dry_run_only !== 'boolean') {
    stepsValid = false;
    console.error('  ❌ FAIL: step[' + i + '] missing required fields');
    failed++;
  }
}
if (stepsValid) {
  console.log('  ✅ PASS: each step has step/action/target/expected/dry_run_only fields');
  passed++;
}

// 13. dry_run_only = true on every step
var allDryRunOnly = result.dry_run_steps.every(function(s) { return s.dry_run_only === true; });
assert(allDryRunOnly, 'dry_run_only = true on every step');

// 14. expected_outcomes >= 5
assert(Array.isArray(result.expected_outcomes) && result.expected_outcomes.length >= 5,
  'expected_outcomes is array with >= 5 entries');

// 15. rollback_triggers >= 3
assert(Array.isArray(result.rollback_triggers) && result.rollback_triggers.length >= 3,
  'rollback_triggers is array with >= 3 entries');

// 16. pre_execution_checklist >= 5
assert(Array.isArray(result.pre_execution_checklist) && result.pre_execution_checklist.length >= 5,
  'pre_execution_checklist is array with >= 5 entries');

// ── 17. dry_run_verdict ───────────────────────────────────────────
console.log('\n── 17. dry_run_verdict ──────────────────────────────────────');
assert(result.dry_run_verdict === 'DRY_RUN_PLAN_ONLY',
  'dry_run_verdict = DRY_RUN_PLAN_ONLY');

// ── 18–24. Individual authority flags ────────────────────────────
console.log('\n── 18-24. Individual authority flags ────────────────────────');
assert(auth.deploy_allowed === false,                       'deploy_allowed = false');         // 18
assert(auth.release_allowed === false,                      'release_allowed = false');
assert(auth.tag_allowed === false,                          'tag_allowed = false');
assert(auth.stable_promotion_allowed === false,             'stable_promotion_allowed = false');
assert(auth.backend_called === false,                       'backend_called = false');          // 19
assert(auth.backend_endpoint_called === false,              'backend_endpoint_called = false');
assert(auth.network_called === false,                       'network_called = false');          // 20
assert(auth.external_api_called === false,                  'external_api_called = false');
assert(auth.secrets_read === false,                         'secrets_read = false');            // 21
assert(auth.env_read === false,                             'env_read = false');
assert(auth.runtime_smoke_executed === false,               'runtime_smoke_executed = false');  // 22
assert(auth.runtime_smoke_authorized === false,             'runtime_smoke_authorized = false');// 23
assert(auth.auth_enabled === false,                         'auth_enabled = false');            // 24
assert(auth.oauth_enabled === false,                        'oauth_enabled = false');
assert(auth.billing_enabled === false,                      'billing_enabled = false');
assert(auth.api_connectors_enabled === false,               'api_connectors_enabled = false');

// ── 25–28. Render output ──────────────────────────────────────────
console.log('\n── 25-28. Render output ─────────────────────────────────────');
var rendered;
try {
  rendered = renderRealValidation4RuntimeSmokeDryRunGate(result);
} catch (err) {
  console.error('[RV4-DRY-RUN-TEST] render threw:', err.message);
  process.exit(1);
}

// 25. REGRA ABSOLUTA or SEM PASS GOLD REAL
assert(
  rendered.indexOf('REGRA ABSOLUTA') !== -1 || rendered.indexOf('SEM PASS GOLD REAL') !== -1,
  'render includes REGRA ABSOLUTA or SEM PASS GOLD REAL'
);

// 26. PASS GOLD REAL not claimed
assert(rendered.indexOf('not claimed') !== -1,
  'render states PASS GOLD REAL is not claimed');

// 27. production not touched
assert(rendered.indexOf('not touched') !== -1,
  'render states production is not touched');

// 28. real execution remains blocked
assert(
  rendered.indexOf('remains blocked') !== -1 || rendered.indexOf('remain blocked') !== -1,
  'render states real execution remains blocked'
);

// ── 29–30. final_message ──────────────────────────────────────────
console.log('\n── 29-30. final_message ─────────────────────────────────────');
assert(typeof result.final_message === 'string',          'final_message is string');
assert(result.final_message.indexOf('dry-run gate complete') !== -1,
  'final_message includes "dry-run gate complete"');   // 29
assert(result.final_message.indexOf('real execution remains blocked') !== -1,
  'final_message includes "real execution remains blocked"');  // 30

// ── 31. validate() ────────────────────────────────────────────────
console.log('\n── 31. Validate function ────────────────────────────────────');
var validation = validateRealValidation4RuntimeSmokeDryRunGate(result);
assert(validation.valid === true,
  'validateRealValidation4RuntimeSmokeDryRunGate returns valid=true');
assert(
  Array.isArray(validation.issues) && validation.issues.length === 0,
  'issues = []'
);

// ── Phase metadata ─────────────────────────────────────────────────
console.log('\n── Phase metadata ───────────────────────────────────────────');
assert(typeof result.generated === 'string',              'generated is ISO string');
assert(typeof result.recommended_next_phase === 'string', 'recommended_next_phase is string');

// ── Final tally ────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════');
console.log('[RV4-DRY-RUN-TEST] Results: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) {
  console.error('[RV4-DRY-RUN-TEST] ❌ ' + failed + ' test(s) FAILED');
  process.exit(1);
}
console.log('[RV4-DRY-RUN-TEST] ✅ All tests passed');
console.log('[RV4-DRY-RUN-TEST] Authority invariants confirmed: REGRA ABSOLUTA preserved');
