/**
 * VISION CORE V2.9.10
 * tools/tests/real-validation/real-validation-5-runtime-smoke-execution-barrier.test.mjs
 * REAL-VALIDATION-5 — Unit Tests
 * ─────────────────────────────────────────────────────────────────
 * Static test only. No network. No exec. No secrets. No deploy.
 * ─────────────────────────────────────────────────────────────────
 */

import {
  buildRealValidation5RuntimeSmokeExecutionBarrier,
  validateRealValidation5RuntimeSmokeExecutionBarrier,
  renderRealValidation5RuntimeSmokeExecutionBarrier,
} from '../../real-validation/real-validation-5-runtime-smoke-execution-barrier.mjs';

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
console.log('\n[RV5-EXEC-BARRIER-TEST] Checking module imports...\n');
console.log('── 1-3. Exports ─────────────────────────────────────────────');

assert(true, 'Module imports successfully');

// 2.
assert(typeof buildRealValidation5RuntimeSmokeExecutionBarrier === 'function',
  'buildRealValidation5RuntimeSmokeExecutionBarrier is function');

// 3.
assert(typeof validateRealValidation5RuntimeSmokeExecutionBarrier === 'function',
  'validateRealValidation5RuntimeSmokeExecutionBarrier is function');

assert(typeof renderRealValidation5RuntimeSmokeExecutionBarrier === 'function',
  'renderRealValidation5RuntimeSmokeExecutionBarrier is function');

// ── Run build ─────────────────────────────────────────────────────
console.log('\n[RV5-EXEC-BARRIER-TEST] Running build...\n');
var result;
try {
  result = buildRealValidation5RuntimeSmokeExecutionBarrier();
} catch (err) {
  console.error('[RV5-EXEC-BARRIER-TEST] build threw:', err.message);
  process.exit(1);
}

// ── 2. phase ─────────────────────────────────────────────────────
console.log('── 2-3. Phase and gate_type ─────────────────────────────────');
assert(result.phase === 'REAL-VALIDATION-5-RUNTIME-SMOKE-EXECUTION-BARRIER',
  'phase = REAL-VALIDATION-5-RUNTIME-SMOKE-EXECUTION-BARRIER');

// 3. gate_type
assert(result.gate_type === 'STATIC_EXECUTION_BARRIER',
  'gate_type = STATIC_EXECUTION_BARRIER');

// ── 4–11. Core flags ─────────────────────────────────────────────
console.log('\n── 4-11. Core flags ─────────────────────────────────────────');
assert(result.execution_barrier_active === true,          'execution_barrier_active = true');    // 4
assert(result.execution_barrier_lifted === false,         'execution_barrier_lifted = false');   // 5
assert(result.runtime_smoke_execution_allowed === false,  'runtime_smoke_execution_allowed = false'); // 6
assert(result.runtime_smoke_executed === false,           'runtime_smoke_executed = false');     // 7
assert(result.backend_called === false,                   'backend_called = false');              // 8
assert(result.network_called === false,                   'network_called = false');              // 9
assert(result.production_touched === false,               'production_touched = false');          // 10
assert(result.pass_gold_real_claimed === false,           'pass_gold_real_claimed = false');      // 11

// ── 12. All authority flags false ─────────────────────────────────
console.log('\n── 12. All authority flags false (REGRA ABSOLUTA) ───────────');
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

// ── 13–17. Prerequisites ──────────────────────────────────────────
console.log('\n── 13-17. Prerequisites ─────────────────────────────────────');

// 13. prerequisites_checked >= 10
assert(
  Array.isArray(result.prerequisites_checked) && result.prerequisites_checked.length >= 10,
  'prerequisites_checked is array with >= 10 entries'
);

// 14. Each prerequisite has id/label/met/check/notes
var prereqsValid = true;
for (var i = 0; i < result.prerequisites_checked.length; i++) {
  var p = result.prerequisites_checked[i];
  if (typeof p.id !== 'string' ||
      typeof p.label !== 'string' ||
      typeof p.met !== 'boolean' ||
      typeof p.check !== 'string' ||
      typeof p.notes !== 'string') {
    prereqsValid = false;
    console.error('  ❌ FAIL: prerequisites_checked[' + i + '] missing required fields');
    failed++;
  }
}
if (prereqsValid) {
  console.log('  ✅ PASS: each prerequisite has id/label/met/check/notes fields');
  passed++;
}

// 15. barrier_result is string, never 'AUTHORIZED' or 'LIFTED'
assert(
  typeof result.barrier_result === 'string' &&
  result.barrier_result !== 'AUTHORIZED' &&
  result.barrier_result !== 'LIFTED',
  'barrier_result is string, never AUTHORIZED or LIFTED'
);

// 15b. barrier_result is one of the two valid values
assert(
  result.barrier_result === 'BLOCKED' ||
  result.barrier_result === 'PREREQUISITES_MET_AWAITING_AUTHORIZATION',
  'barrier_result is BLOCKED or PREREQUISITES_MET_AWAITING_AUTHORIZATION'
);

// 16. blocking_reasons is array
assert(Array.isArray(result.blocking_reasons), 'blocking_reasons is array');

// 17. all_prerequisites_met is boolean
assert(typeof result.all_prerequisites_met === 'boolean',
  'all_prerequisites_met is boolean');

// ── 18. execution_barrier_lifted always false ─────────────────────
console.log('\n── 18. execution_barrier_lifted invariant ───────────────────');
// Even if prerequisites met, barrier_lifted must still be false
assert(result.execution_barrier_lifted === false,
  'execution_barrier_lifted = false regardless of all_prerequisites_met');

// ── 19. required_future_authorizations ───────────────────────────
console.log('\n── 19. required_future_authorizations ───────────────────────');
assert(
  Array.isArray(result.required_future_authorizations) &&
  result.required_future_authorizations.length >= 3,
  'required_future_authorizations is array with >= 3 entries'
);

// ── 20-23. Render output ──────────────────────────────────────────
console.log('\n── 20-23. Render output ─────────────────────────────────────');
var rendered;
try {
  rendered = renderRealValidation5RuntimeSmokeExecutionBarrier(result);
} catch (err) {
  console.error('[RV5-EXEC-BARRIER-TEST] render threw:', err.message);
  process.exit(1);
}

// 20. REGRA ABSOLUTA or SEM PASS GOLD REAL
assert(
  rendered.indexOf('REGRA ABSOLUTA') !== -1 || rendered.indexOf('SEM PASS GOLD REAL') !== -1,
  'render includes REGRA ABSOLUTA or SEM PASS GOLD REAL'
);

// 21. PASS GOLD REAL not claimed
assert(rendered.indexOf('not claimed') !== -1,
  'render states PASS GOLD REAL is not claimed');

// 22. production not touched
assert(rendered.indexOf('not touched') !== -1,
  'render states production is not touched');

// 23. real runtime execution remains blocked
assert(
  rendered.indexOf('remains blocked') !== -1 || rendered.indexOf('remain blocked') !== -1,
  'render states real runtime execution remains blocked'
);

// ── 24–25. final_message ──────────────────────────────────────────
console.log('\n── 24-25. final_message ─────────────────────────────────────');
assert(typeof result.final_message === 'string', 'final_message is string');
assert(result.final_message.indexOf('execution barrier complete') !== -1,
  'final_message includes "execution barrier complete"');      // 24
assert(result.final_message.indexOf('real runtime execution remains blocked') !== -1,
  'final_message includes "real runtime execution remains blocked"');  // 25

// ── 26. validate() ────────────────────────────────────────────────
console.log('\n── 26. Validate function ────────────────────────────────────');
var validation = validateRealValidation5RuntimeSmokeExecutionBarrier(result);
assert(validation.valid === true,
  'validateRealValidation5RuntimeSmokeExecutionBarrier returns valid=true');
assert(
  Array.isArray(validation.issues) && validation.issues.length === 0,
  'issues = []'
);

// ── 27. Deploy/release/tag/stable flags ──────────────────────────
console.log('\n── 27. Deploy / release / tag / stable flags ────────────────');
assert(auth.deploy_allowed === false,               'deploy_allowed = false');
assert(auth.release_allowed === false,              'release_allowed = false');
assert(auth.tag_allowed === false,                  'tag_allowed = false');
assert(auth.stable_promotion_allowed === false,     'stable_promotion_allowed = false');
assert(auth.production_deploy_allowed === false,    'production_deploy_allowed = false');

// ── 28. Secrets and env flags ─────────────────────────────────────
console.log('\n── 28. Secrets and env flags ────────────────────────────────');
assert(auth.secrets_read === false,                 'secrets_read = false');
assert(auth.env_read === false,                     'env_read = false');

// ── Authority extras ──────────────────────────────────────────────
console.log('\n── Authority extras ─────────────────────────────────────────');
assert(auth.execution_barrier_lifted === false,     'authority.execution_barrier_lifted = false');
assert(auth.runtime_smoke_authorized === false,     'authority.runtime_smoke_authorized = false');
assert(auth.backend_health_checked === false,       'authority.backend_health_checked = false');
assert(auth.auth_enabled === false,                 'authority.auth_enabled = false');
assert(auth.oauth_enabled === false,                'authority.oauth_enabled = false');
assert(auth.billing_enabled === false,              'authority.billing_enabled = false');
assert(auth.api_connectors_enabled === false,       'authority.api_connectors_enabled = false');

// ── Phase metadata ─────────────────────────────────────────────────
console.log('\n── Phase metadata ───────────────────────────────────────────');
assert(typeof result.generated === 'string',                  'generated is ISO string');
assert(typeof result.next_phase_recommendation === 'string',  'next_phase_recommendation is string');

// ── Final tally ────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════');
console.log('[RV5-EXEC-BARRIER-TEST] Results: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) {
  console.error('[RV5-EXEC-BARRIER-TEST] ❌ ' + failed + ' test(s) FAILED');
  process.exit(1);
}
console.log('[RV5-EXEC-BARRIER-TEST] ✅ All tests passed');
console.log('[RV5-EXEC-BARRIER-TEST] execution_barrier_active: true');
console.log('[RV5-EXEC-BARRIER-TEST] execution_barrier_lifted: false');
console.log('[RV5-EXEC-BARRIER-TEST] runtime_smoke_execution_allowed: false');
console.log('[RV5-EXEC-BARRIER-TEST] Authority invariants confirmed: REGRA ABSOLUTA preserved');
