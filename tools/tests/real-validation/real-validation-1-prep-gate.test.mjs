/**
 * VISION CORE V2.9.10
 * tools/tests/real-validation/real-validation-1-prep-gate.test.mjs
 * REAL-VALIDATION-1-PREP — Unit Tests
 * ─────────────────────────────────────────────────────────────────
 * Static test only. No network. No exec. No secrets. No deploy.
 * ─────────────────────────────────────────────────────────────────
 */

import {
  buildRealValidation1PrepGate,
  validateRealValidation1PrepGate,
  renderRealValidation1PrepGate,
} from '../../real-validation/real-validation-1-prep-gate.mjs';

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
console.log('\n[RV1-PREP-TEST] Checking module imports...\n');
console.log('── 1. Module imports ────────────────────────────────────────');
assert(typeof buildRealValidation1PrepGate === 'function',     'buildRealValidation1PrepGate is function');
assert(typeof validateRealValidation1PrepGate === 'function',  'validateRealValidation1PrepGate is function');
assert(typeof renderRealValidation1PrepGate === 'function',    'renderRealValidation1PrepGate is function');

// ── Run build ─────────────────────────────────────────────────────
console.log('\n[RV1-PREP-TEST] Running buildRealValidation1PrepGate()...\n');
var result;
try {
  result = buildRealValidation1PrepGate();
} catch (err) {
  console.error('[RV1-PREP-TEST] buildRealValidation1PrepGate() threw:', err.message);
  process.exit(1);
}

// ── 2. Required docs list ─────────────────────────────────────────
var EXPECTED_DOCS = [
  'docs/auth-saas-decision.md',
  'docs/api-connectors-decision.md',
  'docs/production-checklist.md',
  'docs/runtime-readiness-audit.md',
];

console.log('── 2. Required docs list ─────────────────────────────────');
assert(Array.isArray(result.required_docs),                    'required_docs is array');
assert(result.required_docs.length === 4,                      'required_docs has exactly 4 entries');
for (var i = 0; i < EXPECTED_DOCS.length; i++) {
  assert(
    result.required_docs.indexOf(EXPECTED_DOCS[i]) !== -1,
    'required_docs includes: ' + EXPECTED_DOCS[i]
  );
}

// ── 3. Static doc check (path-based, not network/API) ────────────
console.log('\n── 3. Static doc check (fs path only) ───────────────────');
assert(Array.isArray(result.doc_statuses),                     'doc_statuses is array');
assert(result.doc_statuses.length === 4,                       'doc_statuses has 4 entries');
for (var j = 0; j < result.doc_statuses.length; j++) {
  var ds = result.doc_statuses[j];
  assert(
    typeof ds.path === 'string' && typeof ds.present === 'boolean',
    'doc_status entry has path (string) + present (boolean): ' + ds.path
  );
}
assert(
  typeof result.all_required_docs_present === 'boolean',
  'all_required_docs_present is boolean'
);

// ── 4. No dangerous authority flag is true ────────────────────────
console.log('\n── 4. No dangerous authority flag true ──────────────────');
var auth = result.authority;
assert(typeof auth === 'object' && auth !== null,              'authority block is object');
var allFalse = true;
var authKeys = Object.keys(auth);
for (var k = 0; k < authKeys.length; k++) {
  if (auth[authKeys[k]] === true) {
    allFalse = false;
    console.error('  ❌ FAIL: authority.' + authKeys[k] + ' = true (FORBIDDEN)');
    failed++;
  }
}
if (allFalse) {
  console.log('  ✅ PASS: all authority flags are false');
  passed++;
}

// ── 5. pass_gold_real_claimed = false ────────────────────────────
console.log('\n── 5. pass_gold_real_claimed ─────────────────────────────');
assert(auth.pass_gold_real_claimed === false,                  'pass_gold_real_claimed = false');

// ── 6. production_touched = false ────────────────────────────────
console.log('\n── 6. production_touched ─────────────────────────────────');
assert(auth.production_touched === false,                      'production_touched = false');

// ── 7. deploy/release/tag/stable flags = false ───────────────────
console.log('\n── 7. deploy/release/tag/stable flags ───────────────────');
assert(auth.deploy_allowed === false,                          'deploy_allowed = false');
assert(auth.release_allowed === false,                         'release_allowed = false');
assert(auth.tag_allowed === false,                             'tag_allowed = false');
assert(auth.stable_promotion_allowed === false,                'stable_promotion_allowed = false');
assert(auth.production_deploy_allowed === false,               'production_deploy_allowed = false');

// ── 8. backend_called = false ────────────────────────────────────
console.log('\n── 8. backend_called ─────────────────────────────────────');
assert(auth.backend_called === false,                          'backend_called = false');
assert(auth.backend_endpoint_called === false,                 'backend_endpoint_called = false');

// ── 9. network_called = false ────────────────────────────────────
console.log('\n── 9. network_called ─────────────────────────────────────');
assert(auth.network_called === false,                          'network_called = false');
assert(auth.external_api_called === false,                     'external_api_called = false');

// ── 10. secrets_read = false ─────────────────────────────────────
console.log('\n── 10. secrets_read ──────────────────────────────────────');
assert(auth.secrets_read === false,                            'secrets_read = false');

// ── 11. env_read = false ──────────────────────────────────────────
console.log('\n── 11. env_read ──────────────────────────────────────────');
assert(auth.env_read === false,                                'env_read = false');

// ── 12. rv1_prep_gate_passed does not authorize runtime execution ─
console.log('\n── 12. Gate passed ≠ runtime authorized ─────────────────────');
assert(auth.real_runtime_execution_allowed === false,
  'rv1_prep_gate_passed does not lift real_runtime_execution_allowed');
assert(auth.production_deploy_allowed === false,
  'rv1_prep_gate_passed does not lift production_deploy_allowed');
assert(auth.command_execution_allowed === false,
  'rv1_prep_gate_passed does not lift command_execution_allowed');

// ── 13–16. Render output ──────────────────────────────────────────
console.log('\n── 13-16. Render output ─────────────────────────────────');
var rendered;
try {
  rendered = renderRealValidation1PrepGate(result);
} catch (err) {
  console.error('[RV1-PREP-TEST] renderRealValidation1PrepGate() threw:', err.message);
  process.exit(1);
}

// 13. render includes REGRA ABSOLUTA or SEM PASS GOLD REAL
assert(
  rendered.indexOf('REGRA ABSOLUTA') !== -1 || rendered.indexOf('SEM PASS GOLD REAL') !== -1,
  'render includes REGRA ABSOLUTA or SEM PASS GOLD REAL'
);

// 14. render says PASS GOLD REAL not claimed
assert(
  rendered.indexOf('not claimed') !== -1,
  'render states PASS GOLD REAL is not claimed'
);

// 15. render says production not touched
assert(
  rendered.indexOf('not touched') !== -1,
  'render states production is not touched'
);

// 16. final_message matches safe blocked state
assert(typeof result.final_message === 'string',               'final_message is string');
assert(result.final_message.indexOf('remain blocked') !== -1,  'final_message says "remain blocked"');
assert(result.final_message.indexOf('REAL-VALIDATION-1') !== -1, 'final_message references REAL-VALIDATION-1');
assert(result.final_message.indexOf('PASS GOLD REAL') !== -1,  'final_message references PASS GOLD REAL');

// ── Validate function ─────────────────────────────────────────────
console.log('\n── Validate function ─────────────────────────────────────');
var validation = validateRealValidation1PrepGate(result);
assert(validation.valid === true,                              'validateRealValidation1PrepGate returns valid=true');
assert(
  Array.isArray(validation.issues) && validation.issues.length === 0,
  'no validation issues'
);

// ── Phase metadata ────────────────────────────────────────────────
console.log('\n── Phase metadata ───────────────────────────────────────');
assert(result.phase === 'REAL-VALIDATION-1-PREP',              'phase = REAL-VALIDATION-1-PREP');
assert(typeof result.generated === 'string',                   'generated is ISO string');
assert(typeof result.recommended_next_phase === 'string',      'recommended_next_phase is string');
assert(typeof result.rv1_prep_gate_passed === 'boolean',       'rv1_prep_gate_passed is boolean');

// ── Final tally ───────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════');
console.log('[RV1-PREP-TEST] Results: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) {
  console.error('[RV1-PREP-TEST] ❌ ' + failed + ' test(s) FAILED');
  process.exit(1);
}
console.log('[RV1-PREP-TEST] ✅ All tests passed');
console.log('[RV1-PREP-TEST] Authority invariants confirmed: REGRA ABSOLUTA preserved');
