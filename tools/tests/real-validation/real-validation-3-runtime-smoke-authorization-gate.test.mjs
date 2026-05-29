/**
 * VISION CORE V2.9.10
 * tools/tests/real-validation/real-validation-3-runtime-smoke-authorization-gate.test.mjs
 * REAL-VALIDATION-3 — Unit Tests
 * ─────────────────────────────────────────────────────────────────
 * Static test only. No network. No exec. No secrets. No deploy.
 * ─────────────────────────────────────────────────────────────────
 */

import {
  buildRealValidation3RuntimeSmokeAuthorizationGate,
  validateRealValidation3RuntimeSmokeAuthorizationGate,
  renderRealValidation3RuntimeSmokeAuthorizationGate,
} from '../../real-validation/real-validation-3-runtime-smoke-authorization-gate.mjs';

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

// ── 1. Module imports successfully ───────────────────────────────
console.log('\n[RV3-AUTH-GATE-TEST] Checking module imports...\n');
console.log('── 1-4. Module imports ──────────────────────────────────────');

assert(true, 'Module imports successfully');

// 2. build function
assert(typeof buildRealValidation3RuntimeSmokeAuthorizationGate === 'function',
  'buildRealValidation3RuntimeSmokeAuthorizationGate is function');

// 3. validate function
assert(typeof validateRealValidation3RuntimeSmokeAuthorizationGate === 'function',
  'validateRealValidation3RuntimeSmokeAuthorizationGate is function');

// 4. render function
assert(typeof renderRealValidation3RuntimeSmokeAuthorizationGate === 'function',
  'renderRealValidation3RuntimeSmokeAuthorizationGate is function');

// ── Run build ─────────────────────────────────────────────────────
console.log('\n[RV3-AUTH-GATE-TEST] Running build...\n');
var result;
try {
  result = buildRealValidation3RuntimeSmokeAuthorizationGate();
} catch (err) {
  console.error('[RV3-AUTH-GATE-TEST] build threw:', err.message);
  process.exit(1);
}

// ── 5. phase ─────────────────────────────────────────────────────
console.log('── 5-6. Phase and gate_type ─────────────────────────────────');
assert(result.phase === 'REAL-VALIDATION-3-RUNTIME-SMOKE-AUTHORIZATION-GATE',
  'phase = REAL-VALIDATION-3-RUNTIME-SMOKE-AUTHORIZATION-GATE');

// 6. gate_type
assert(result.gate_type === 'STATIC_RUNTIME_SMOKE_AUTHORIZATION_GATE',
  'gate_type = STATIC_RUNTIME_SMOKE_AUTHORIZATION_GATE');

// ── 7. authorization_gate_passed is boolean ───────────────────────
console.log('\n── 7-10. Gate and execution flags ───────────────────────────');
assert(typeof result.authorization_gate_passed === 'boolean',
  'authorization_gate_passed is boolean');

// 8. runtime_smoke_authorized = false
assert(result.runtime_smoke_authorized === false,
  'runtime_smoke_authorized = false');

// 9. runtime_smoke_executed = false
assert(result.runtime_smoke_executed === false,
  'runtime_smoke_executed = false');

// 10. runtime_execution_allowed = false
assert(result.runtime_execution_allowed === false,
  'runtime_execution_allowed = false');

// ── 11. No dangerous authority flag true ──────────────────────────
console.log('\n── 11. All authority flags false (REGRA ABSOLUTA) ───────────');
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

// ── 12-20. Individual authority flags ────────────────────────────
console.log('\n── 12-20. Individual authority flags ────────────────────────');
assert(auth.pass_gold_real_claimed === false,               'pass_gold_real_claimed = false');          // 12
assert(auth.production_touched === false,                   'production_touched = false');               // 13
assert(auth.deploy_allowed === false,                       'deploy_allowed = false');                   // 14
assert(auth.release_allowed === false,                      'release_allowed = false');
assert(auth.tag_allowed === false,                          'tag_allowed = false');
assert(auth.stable_promotion_allowed === false,             'stable_promotion_allowed = false');
assert(auth.production_deploy_allowed === false,            'production_deploy_allowed = false');
assert(auth.backend_called === false,                       'backend_called = false');                   // 15
assert(auth.backend_endpoint_called === false,              'backend_endpoint_called = false');
assert(auth.network_called === false,                       'network_called = false');                   // 16
assert(auth.external_api_called === false,                  'external_api_called = false');
assert(auth.secrets_read === false,                         'secrets_read = false');                     // 17
assert(auth.env_read === false,                             'env_read = false');
assert(auth.backend_health_checked === false,               'backend_health_checked = false');           // 18
assert(auth.frontend_backend_integration_checked === false, 'frontend_backend_integration_checked = false'); // 19
assert(auth.auth_enabled === false,                         'auth_enabled = false');                     // 20
assert(auth.oauth_enabled === false,                        'oauth_enabled = false');
assert(auth.billing_enabled === false,                      'billing_enabled = false');
assert(auth.api_connectors_enabled === false,               'api_connectors_enabled = false');
assert(auth.runtime_smoke_authorized === false,             'authority.runtime_smoke_authorized = false');
assert(auth.runtime_smoke_executed === false,               'authority.runtime_smoke_executed = false');

// ── 21. Required authorization inputs >= 10 ───────────────────────
console.log('\n── 21-23. Gate content ──────────────────────────────────────');
assert(
  Array.isArray(result.required_authorization_inputs) &&
  result.required_authorization_inputs.length >= 10,
  'required_authorization_inputs is array with >= 10 entries'
);

// Each input has id, label, satisfied, notes
var inputsValid = true;
for (var i = 0; i < result.required_authorization_inputs.length; i++) {
  var inp = result.required_authorization_inputs[i];
  if (typeof inp.id !== 'string' ||
      typeof inp.label !== 'string' ||
      typeof inp.satisfied !== 'boolean') {
    inputsValid = false;
    break;
  }
}
assert(inputsValid, 'all required_authorization_inputs have id/label/satisfied');

// 22. Blocking conditions contain production/PASS GOLD/backend/network blockers
assert(
  Array.isArray(result.blocking_conditions) && result.blocking_conditions.length > 0,
  'blocking_conditions is non-empty array'
);
var blockText = result.blocking_conditions.join(' ').toLowerCase();
assert(blockText.indexOf('production') !== -1,
  'blocking_conditions mentions production');
assert(
  blockText.indexOf('pass gold') !== -1 || blockText.indexOf('pass_gold') !== -1,
  'blocking_conditions mentions PASS GOLD'
);
assert(blockText.indexOf('backend') !== -1,
  'blocking_conditions mentions backend');
assert(blockText.indexOf('network') !== -1,
  'blocking_conditions mentions network');

// 23. Gate does not authorize runtime execution
assert(result.runtime_smoke_authorized === false,
  'gate does not authorize runtime_smoke_authorized');
assert(result.runtime_execution_allowed === false,
  'gate does not set runtime_execution_allowed = true');
assert(auth.real_runtime_execution_allowed === false,
  'authority.real_runtime_execution_allowed = false (no execution authorized)');

// ── 24-27. Render output ──────────────────────────────────────────
console.log('\n── 24-27. Render output ─────────────────────────────────────');
var rendered;
try {
  rendered = renderRealValidation3RuntimeSmokeAuthorizationGate(result);
} catch (err) {
  console.error('[RV3-AUTH-GATE-TEST] render threw:', err.message);
  process.exit(1);
}

// 24. REGRA ABSOLUTA or SEM PASS GOLD REAL
assert(
  rendered.indexOf('REGRA ABSOLUTA') !== -1 || rendered.indexOf('SEM PASS GOLD REAL') !== -1,
  'render includes REGRA ABSOLUTA or SEM PASS GOLD REAL'
);

// 25. PASS GOLD REAL not claimed
assert(rendered.indexOf('not claimed') !== -1,
  'render states PASS GOLD REAL is not claimed');

// 26. Production not touched
assert(rendered.indexOf('not touched') !== -1,
  'render states production is not touched');

// 27. Runtime smoke execution blocked
assert(
  rendered.indexOf('remain blocked') !== -1 || rendered.indexOf('remains blocked') !== -1,
  'render states runtime smoke execution remains blocked'
);

// ── 28. final_message references REAL-VALIDATION-3 ───────────────
console.log('\n── 28-29. final_message ─────────────────────────────────────');
assert(typeof result.final_message === 'string',            'final_message is string');
assert(result.final_message.indexOf('REAL-VALIDATION-3') !== -1,
  'final_message references REAL-VALIDATION-3');

// 29. final_message references backend calls blocked
assert(
  result.final_message.indexOf('backend calls') !== -1 ||
  result.final_message.indexOf('backend') !== -1,
  'final_message references backend calls blocked'
);

assert(result.final_message.indexOf('blocked') !== -1,
  'final_message contains "blocked"');

// ── 30. validate() returns valid=true ─────────────────────────────
console.log('\n── 30. Validate function ────────────────────────────────────');
var validation = validateRealValidation3RuntimeSmokeAuthorizationGate(result);
assert(validation.valid === true,
  'validateRealValidation3RuntimeSmokeAuthorizationGate returns valid=true');
assert(
  Array.isArray(validation.issues) && validation.issues.length === 0,
  'no validation issues'
);

// ── Phase metadata ─────────────────────────────────────────────────
console.log('\n── Phase metadata ───────────────────────────────────────────');
assert(typeof result.generated === 'string',                'generated is ISO string');
assert(typeof result.recommended_next_phase === 'string',   'recommended_next_phase is string');

// ── Final tally ────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════');
console.log('[RV3-AUTH-GATE-TEST] Results: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) {
  console.error('[RV3-AUTH-GATE-TEST] ❌ ' + failed + ' test(s) FAILED');
  process.exit(1);
}
console.log('[RV3-AUTH-GATE-TEST] ✅ All tests passed');
console.log('[RV3-AUTH-GATE-TEST] Authority invariants confirmed: REGRA ABSOLUTA preserved');
