/**
 * VISION CORE V2.9.10
 * tools/tests/real-validation/real-validation-2-runtime-smoke-plan.test.mjs
 * REAL-VALIDATION-2-RUNTIME-SMOKE-PLAN — Unit Tests
 * ─────────────────────────────────────────────────────────────────
 * Static test only. No network. No exec. No secrets. No deploy.
 * ─────────────────────────────────────────────────────────────────
 */

import {
  buildRealValidation2RuntimeSmokePlan,
  validateRealValidation2RuntimeSmokePlan,
  renderRealValidation2RuntimeSmokePlan,
} from '../../real-validation/real-validation-2-runtime-smoke-plan.mjs';

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

// ── 1–4. Module imports ───────────────────────────────────────────
console.log('\n[RV2-PLAN-TEST] Checking module imports...\n');
console.log('── 1-4. Module imports ──────────────────────────────────────');

// 1. Module imports successfully (proved by reaching this line)
assert(true, 'Module imports successfully');

// 2. buildRealValidation2RuntimeSmokePlan is a function
assert(typeof buildRealValidation2RuntimeSmokePlan === 'function',
  'buildRealValidation2RuntimeSmokePlan is function');

// 3. validateRealValidation2RuntimeSmokePlan is a function
assert(typeof validateRealValidation2RuntimeSmokePlan === 'function',
  'validateRealValidation2RuntimeSmokePlan is function');

// 4. renderRealValidation2RuntimeSmokePlan is a function
assert(typeof renderRealValidation2RuntimeSmokePlan === 'function',
  'renderRealValidation2RuntimeSmokePlan is function');

// ── Run build ─────────────────────────────────────────────────────
console.log('\n[RV2-PLAN-TEST] Running buildRealValidation2RuntimeSmokePlan()...\n');
var result;
try {
  result = buildRealValidation2RuntimeSmokePlan();
} catch (err) {
  console.error('[RV2-PLAN-TEST] buildRealValidation2RuntimeSmokePlan() threw:', err.message);
  process.exit(1);
}

// ── 5. phase field ────────────────────────────────────────────────
console.log('── 5-6. Phase and plan_type ─────────────────────────────────');
assert(result.phase === 'REAL-VALIDATION-2-RUNTIME-SMOKE-PLAN',
  'phase = REAL-VALIDATION-2-RUNTIME-SMOKE-PLAN');

// 6. plan_type
assert(result.plan_type === 'STATIC_RUNTIME_SMOKE_PLAN',
  'plan_type = STATIC_RUNTIME_SMOKE_PLAN');

// ── 7–8. Execution flags ──────────────────────────────────────────
console.log('\n── 7-8. Execution flags ────────────────────────────────────');
assert(result.smoke_execution_performed === false,
  'smoke_execution_performed = false');
assert(result.runtime_execution_allowed === false,
  'runtime_execution_allowed = false');

// ── 9. All authority flags false ──────────────────────────────────
console.log('\n── 9. All authority flags false (REGRA ABSOLUTA) ────────────');
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

// ── 10. pass_gold_real_claimed ────────────────────────────────────
console.log('\n── 10-19. Individual authority flags ────────────────────────');
assert(auth.pass_gold_real_claimed === false,               'pass_gold_real_claimed = false');

// 11. production_touched
assert(auth.production_touched === false,                   'production_touched = false');

// 12. deploy/release/tag/stable
assert(auth.deploy_allowed === false,                       'deploy_allowed = false');
assert(auth.release_allowed === false,                      'release_allowed = false');
assert(auth.tag_allowed === false,                          'tag_allowed = false');
assert(auth.stable_promotion_allowed === false,             'stable_promotion_allowed = false');
assert(auth.production_deploy_allowed === false,            'production_deploy_allowed = false');

// 13. backend
assert(auth.backend_called === false,                       'backend_called = false');
assert(auth.backend_endpoint_called === false,              'backend_endpoint_called = false');

// 14. network
assert(auth.network_called === false,                       'network_called = false');
assert(auth.external_api_called === false,                  'external_api_called = false');

// 15. secrets
assert(auth.secrets_read === false,                         'secrets_read = false');

// 16 (env_read mapped to 15 range) + 16. runtime_smoke_executed
assert(auth.env_read === false,                             'env_read = false');
assert(auth.runtime_smoke_executed === false,               'runtime_smoke_executed = false');

// 17. backend_health_checked
assert(auth.backend_health_checked === false,               'backend_health_checked = false');

// 18. frontend_backend_integration_checked
assert(auth.frontend_backend_integration_checked === false, 'frontend_backend_integration_checked = false');

// 19. auth/oauth/billing/api_connectors flags
assert(auth.auth_enabled === false,                         'auth_enabled = false');
assert(auth.oauth_enabled === false,                        'oauth_enabled = false');
assert(auth.billing_enabled === false,                      'billing_enabled = false');
assert(auth.api_connectors_enabled === false,               'api_connectors_enabled = false');

// ── 20. Smoke targets list ────────────────────────────────────────
console.log('\n── 20-23. Plan content ──────────────────────────────────────');
assert(Array.isArray(result.smoke_targets) && result.smoke_targets.length > 0,
  'smoke_targets is non-empty array (metadata only)');

// Verify each target has required shape (metadata only, no execution)
var targetsValid = true;
for (var t = 0; t < result.smoke_targets.length; t++) {
  var target = result.smoke_targets[t];
  if (typeof target.id !== 'string' ||
      typeof target.label !== 'string' ||
      typeof target.placeholder !== 'string' ||
      typeof target.status !== 'string') {
    targetsValid = false;
    break;
  }
  // Status must be PLAN_ONLY (not EXECUTED)
  if (target.status === 'EXECUTED' || target.status === 'PASSED') {
    targetsValid = false;
    break;
  }
}
assert(targetsValid, 'all smoke_targets have id/label/placeholder/status (no EXECUTED status)');

// 21. Acceptance criteria
assert(Array.isArray(result.acceptance_criteria) && result.acceptance_criteria.length > 0,
  'acceptance_criteria is non-empty array');

// 22. Rollback notes say rollback not executed
assert(Array.isArray(result.rollback_notes) && result.rollback_notes.length > 0,
  'rollback_notes is non-empty array');
var rollbackNotExecuted = result.rollback_notes.some(function(n) {
  return n.toLowerCase().indexOf('not executed') !== -1 ||
         n.toLowerCase().indexOf('no rollback') !== -1 ||
         n.toLowerCase().indexOf('plan only') !== -1;
});
assert(rollbackNotExecuted, 'rollback_notes state rollback is not executed in this phase');

// 23. Blocking conditions
assert(Array.isArray(result.blocking_conditions) && result.blocking_conditions.length >= 3,
  'blocking_conditions is array with >= 3 entries');

// ── 24–26. Render output ──────────────────────────────────────────
console.log('\n── 24-27. Render output ─────────────────────────────────────');
var rendered;
try {
  rendered = renderRealValidation2RuntimeSmokePlan(result);
} catch (err) {
  console.error('[RV2-PLAN-TEST] renderRealValidation2RuntimeSmokePlan() threw:', err.message);
  process.exit(1);
}

// 24. render includes REGRA ABSOLUTA or SEM PASS GOLD REAL
assert(
  rendered.indexOf('REGRA ABSOLUTA') !== -1 || rendered.indexOf('SEM PASS GOLD REAL') !== -1,
  'render includes REGRA ABSOLUTA or SEM PASS GOLD REAL'
);

// 25. render says PASS GOLD REAL not claimed
assert(rendered.indexOf('not claimed') !== -1,
  'render states PASS GOLD REAL is not claimed');

// 26. render says production not touched
assert(rendered.indexOf('not touched') !== -1,
  'render states production is not touched');

// 27. final_message says runtime smoke execution remains blocked
assert(typeof result.final_message === 'string',            'final_message is string');
assert(result.final_message.indexOf('blocked') !== -1,      'final_message contains "blocked"');
assert(result.final_message.indexOf('REAL-VALIDATION-2') !== -1,
  'final_message references REAL-VALIDATION-2');
assert(result.final_message.indexOf('PASS GOLD REAL') !== -1,
  'final_message references PASS GOLD REAL');

// ── 28. validate() returns valid=true ─────────────────────────────
console.log('\n── 28. Validate function ────────────────────────────────────');
var validation = validateRealValidation2RuntimeSmokePlan(result);
assert(validation.valid === true,
  'validateRealValidation2RuntimeSmokePlan returns valid=true');
assert(Array.isArray(validation.issues) && validation.issues.length === 0,
  'no validation issues');

// ── Phase metadata ─────────────────────────────────────────────────
console.log('\n── Phase metadata ───────────────────────────────────────────');
assert(typeof result.generated === 'string',                'generated is ISO string');
assert(typeof result.recommended_next_phase === 'string',   'recommended_next_phase is string');

// ── Final tally ────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════');
console.log('[RV2-PLAN-TEST] Results: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) {
  console.error('[RV2-PLAN-TEST] ❌ ' + failed + ' test(s) FAILED');
  process.exit(1);
}
console.log('[RV2-PLAN-TEST] ✅ All tests passed');
console.log('[RV2-PLAN-TEST] Authority invariants confirmed: REGRA ABSOLUTA preserved');
