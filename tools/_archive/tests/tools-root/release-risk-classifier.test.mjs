#!/usr/bin/env node
/**
 * Tests — Release Risk Classifier V193.0
 */

import {
  buildReleaseRiskClassifier,
  validateReleaseRiskClassifier,
  renderReleaseRiskClassifier,
  RELEASE_RISK_CLASSIFIER_STATUSES,
  RISK_LEVELS,
} from '../release-risk-classifier.mjs';

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label}`);
    failed++;
  }
}

const VALID_INPUT = {
  classifier_id: 'classifier-001',
  decision_request_ready: true,
  phase_gate_ready: true,
  release_plan_ready: true,
  release_simulation_passed: true,
  rollback_plan_ready: true,
  rollback_drill_passed: true,
};

console.log('\n=== release-risk-classifier tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(RELEASE_RISK_CLASSIFIER_STATUSES));
assert('has RISK_CLASSIFIER_BLOCKED_INPUT', RELEASE_RISK_CLASSIFIER_STATUSES.includes('RISK_CLASSIFIER_BLOCKED_INPUT'));
assert('has RISK_CLASSIFIER_BLOCKED_DECISION_REQUEST', RELEASE_RISK_CLASSIFIER_STATUSES.includes('RISK_CLASSIFIER_BLOCKED_DECISION_REQUEST'));
assert('has RISK_CLASSIFIER_HIGH_RISK', RELEASE_RISK_CLASSIFIER_STATUSES.includes('RISK_CLASSIFIER_HIGH_RISK'));
assert('has RISK_CLASSIFIER_READY', RELEASE_RISK_CLASSIFIER_STATUSES.includes('RISK_CLASSIFIER_READY'));
assert('RISK_LEVELS is array', Array.isArray(RISK_LEVELS));
assert('RISK_LEVELS has LOW', RISK_LEVELS.includes('LOW'));
assert('RISK_LEVELS has HIGH', RISK_LEVELS.includes('HIGH'));
assert('RISK_LEVELS has BLOCKED', RISK_LEVELS.includes('BLOCKED'));
assert('build is function', typeof buildReleaseRiskClassifier === 'function');
assert('validate is function', typeof validateReleaseRiskClassifier === 'function');
assert('render is function', typeof renderReleaseRiskClassifier === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildReleaseRiskClassifier(null);
  assert('null → BLOCKED_INPUT', r.status === 'RISK_CLASSIFIER_BLOCKED_INPUT');
  assert('null: release_allowed=false', r.release_allowed === false);
  assert('null: deploy_allowed=false', r.deploy_allowed === false);
  assert('null: stable_allowed=false', r.stable_allowed === false);
  assert('null: tag_allowed=false', r.tag_allowed === false);
  assert('null: production_touched=false', r.production_touched === false);
}
{
  const r = buildReleaseRiskClassifier({});
  assert('no classifier_id → BLOCKED_INPUT', r.status === 'RISK_CLASSIFIER_BLOCKED_INPUT');
}

// --- blocked decision request ---
console.log('--- blocked decision request ---');
{
  const r = buildReleaseRiskClassifier({ ...VALID_INPUT, decision_request_ready: false });
  assert('decision_ready=false → BLOCKED_DECISION_REQUEST', r.status === 'RISK_CLASSIFIER_BLOCKED_DECISION_REQUEST');
  assert('blocked_decision: release_allowed=false', r.release_allowed === false);
  assert('blocked_decision: risk_level=null', r.risk_level === null);
}
{
  const r = buildReleaseRiskClassifier({ ...VALID_INPUT, phase_gate_ready: false });
  assert('phase_gate=false → BLOCKED_DECISION_REQUEST', r.status === 'RISK_CLASSIFIER_BLOCKED_DECISION_REQUEST');
}

// --- high risk ---
console.log('--- high risk ---');
{
  const r = buildReleaseRiskClassifier({ ...VALID_INPUT, release_simulation_passed: false });
  assert('simulation=false → RISK_CLASSIFIER_HIGH_RISK', r.status === 'RISK_CLASSIFIER_HIGH_RISK');
  assert('high_risk: risk_level=BLOCKED', r.risk_level === 'BLOCKED');
  assert('high_risk: release_allowed=false', r.release_allowed === false);
  assert('high_risk: errors non-empty', r.errors.length > 0);
}
{
  const r = buildReleaseRiskClassifier({ ...VALID_INPUT, rollback_drill_passed: false });
  assert('drill=false → RISK_CLASSIFIER_HIGH_RISK', r.status === 'RISK_CLASSIFIER_HIGH_RISK');
  assert('drill_fail: risk_level=HIGH', r.risk_level === 'HIGH');
}
{
  const r = buildReleaseRiskClassifier({ ...VALID_INPUT, production_touched: true });
  assert('production_touched=true → RISK_CLASSIFIER_HIGH_RISK', r.status === 'RISK_CLASSIFIER_HIGH_RISK');
  assert('prod_touched: risk_level=BLOCKED', r.risk_level === 'BLOCKED');
  assert('prod_touched: production_touched=false in output', r.production_touched === false);
}

// --- ready low risk ---
console.log('--- ready low risk ---');
{
  const r = buildReleaseRiskClassifier(VALID_INPUT);
  assert('valid → RISK_CLASSIFIER_READY', r.status === 'RISK_CLASSIFIER_READY');
  assert('ready: schema_version=v193.0', r.schema_version === 'v193.0');
  assert('ready: classifier_id set', r.risk_classification_id === 'classifier-001');
  assert('ready: risk_level=LOW', r.risk_level === 'LOW');
  assert('ready: risk_reasons empty', r.risk_reasons.length === 0);
  assert('ready: release_allowed=false', r.release_allowed === false);
  assert('ready: deploy_allowed=false', r.deploy_allowed === false);
  assert('ready: stable_allowed=false', r.stable_allowed === false);
  assert('ready: tag_allowed=false', r.tag_allowed === false);
  assert('ready: classifier_hash 64 chars', typeof r.classifier_hash === 'string' && r.classifier_hash.length === 64);
  assert('ready: errors empty', r.errors.length === 0);
  assert('ready: production_touched=false', r.production_touched === false);
}

// --- medium risk ---
console.log('--- medium risk ---');
{
  const r = buildReleaseRiskClassifier({ ...VALID_INPUT, rollback_plan_ready: false });
  assert('no_rollback_plan → READY (MEDIUM)', r.status === 'RISK_CLASSIFIER_READY');
  assert('medium: risk_level=MEDIUM', r.risk_level === 'MEDIUM');
  assert('medium: risk_reasons non-empty', r.risk_reasons.length > 0);
}

// --- hash determinism ---
console.log('--- hash determinism ---');
{
  const r1 = buildReleaseRiskClassifier(VALID_INPUT);
  const r2 = buildReleaseRiskClassifier(VALID_INPUT);
  assert('hash deterministic', r1.classifier_hash === r2.classifier_hash);
  const r3 = buildReleaseRiskClassifier({ ...VALID_INPUT, classifier_id: 'classifier-002' });
  assert('different classifier_id → different hash', r1.classifier_hash !== r3.classifier_hash);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildReleaseRiskClassifier(VALID_INPUT);
  const v = validateReleaseRiskClassifier(r);
  assert('validate ready: valid=true', v.valid === true);
  assert('validate ready: no errors', v.errors.length === 0);
}
{
  const r = buildReleaseRiskClassifier(null);
  const v = validateReleaseRiskClassifier(r);
  assert('validate blocked: valid=true', v.valid === true);
}
{
  const v = validateReleaseRiskClassifier(null);
  assert('validate null: valid=false', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildReleaseRiskClassifier(VALID_INPUT);
  const s = renderReleaseRiskClassifier(r);
  assert('render: is string', typeof s === 'string');
  assert('render: contains RISK_CLASSIFIER_READY', s.includes('RISK_CLASSIFIER_READY'));
  assert('render: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
  assert('render: release_allowed false', s.includes('false'));
}
{
  const s = renderReleaseRiskClassifier(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildReleaseRiskClassifier(null),
    buildReleaseRiskClassifier({}),
    buildReleaseRiskClassifier({ ...VALID_INPUT, decision_request_ready: false }),
    buildReleaseRiskClassifier({ ...VALID_INPUT, release_simulation_passed: false }),
    buildReleaseRiskClassifier(VALID_INPUT),
  ];
  assert('all: release_allowed=false', cases.every(r => r.release_allowed === false));
  assert('all: deploy_allowed=false', cases.every(r => r.deploy_allowed === false));
  assert('all: stable_allowed=false', cases.every(r => r.stable_allowed === false));
  assert('all: tag_allowed=false', cases.every(r => r.tag_allowed === false));
  assert('all: production_touched=false', cases.every(r => r.production_touched === false));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
