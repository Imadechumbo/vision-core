#!/usr/bin/env node
/**
 * Tests — Release Impact Manifest V194.0
 */

import {
  buildReleaseImpactManifest,
  validateReleaseImpactManifest,
  renderReleaseImpactManifest,
  RELEASE_IMPACT_MANIFEST_STATUSES,
} from '../release-impact-manifest.mjs';

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
  manifest_id: 'manifest-001',
  risk_classifier_ready: true,
  decision_request_ready: true,
  release_plan_ready: true,
  phase_gate_ready: true,
};

console.log('\n=== release-impact-manifest tests ===\n');

// --- exports ---
console.log('--- exports ---');
assert('STATUSES is array', Array.isArray(RELEASE_IMPACT_MANIFEST_STATUSES));
assert('has IMPACT_MANIFEST_BLOCKED_INPUT', RELEASE_IMPACT_MANIFEST_STATUSES.includes('IMPACT_MANIFEST_BLOCKED_INPUT'));
assert('has IMPACT_MANIFEST_BLOCKED_RISK', RELEASE_IMPACT_MANIFEST_STATUSES.includes('IMPACT_MANIFEST_BLOCKED_RISK'));
assert('has IMPACT_MANIFEST_READY', RELEASE_IMPACT_MANIFEST_STATUSES.includes('IMPACT_MANIFEST_READY'));
assert('build is function', typeof buildReleaseImpactManifest === 'function');
assert('validate is function', typeof validateReleaseImpactManifest === 'function');
assert('render is function', typeof renderReleaseImpactManifest === 'function');

// --- blocked input ---
console.log('--- blocked input ---');
{
  const r = buildReleaseImpactManifest(null);
  assert('null → BLOCKED_INPUT', r.status === 'IMPACT_MANIFEST_BLOCKED_INPUT');
  assert('null: release_allowed=false', r.release_allowed === false);
  assert('null: deploy_allowed=false', r.deploy_allowed === false);
  assert('null: stable_allowed=false', r.stable_allowed === false);
  assert('null: tag_allowed=false', r.tag_allowed === false);
  assert('null: production_touched=false', r.production_touched === false);
  assert('null: impact_manifest_ready=false', r.impact_manifest_ready === false);
}
{
  const r = buildReleaseImpactManifest({});
  assert('no manifest_id → BLOCKED_INPUT', r.status === 'IMPACT_MANIFEST_BLOCKED_INPUT');
}

// --- blocked risk ---
console.log('--- blocked risk ---');
{
  const r = buildReleaseImpactManifest({ ...VALID_INPUT, risk_classifier_ready: false });
  assert('risk_ready=false → BLOCKED_RISK', r.status === 'IMPACT_MANIFEST_BLOCKED_RISK');
  assert('blocked_risk: release_allowed=false', r.release_allowed === false);
  assert('blocked_risk: impact_manifest_ready=false', r.impact_manifest_ready === false);
}
{
  const r = buildReleaseImpactManifest({ ...VALID_INPUT, decision_request_ready: false });
  assert('decision_ready=false → BLOCKED_RISK', r.status === 'IMPACT_MANIFEST_BLOCKED_RISK');
}
{
  const r = buildReleaseImpactManifest({ ...VALID_INPUT, release_plan_ready: false });
  assert('plan_ready=false → BLOCKED_RISK', r.status === 'IMPACT_MANIFEST_BLOCKED_RISK');
}
{
  const r = buildReleaseImpactManifest({ ...VALID_INPUT, phase_gate_ready: false });
  assert('phase_gate=false → BLOCKED_RISK', r.status === 'IMPACT_MANIFEST_BLOCKED_RISK');
}

// --- ready ---
console.log('--- ready ---');
{
  const r = buildReleaseImpactManifest(VALID_INPUT);
  assert('valid → IMPACT_MANIFEST_READY', r.status === 'IMPACT_MANIFEST_READY');
  assert('ready: schema_version=v194.0', r.schema_version === 'v194.0');
  assert('ready: manifest_id set', r.impact_manifest_id === 'manifest-001');
  assert('ready: impacted_modules has 15', r.impacted_modules.length === 15);
  assert('ready: expected_changes non-empty', r.expected_changes.length > 0);
  assert('ready: rollback_requirements non-empty', r.rollback_requirements.length > 0);
  assert('ready: validation_requirements non-empty', r.validation_requirements.length > 0);
  assert('ready: operational_risks non-empty', r.operational_risks.length > 0);
  assert('ready: impact_manifest_ready=true', r.impact_manifest_ready === true);
  assert('ready: release_allowed=false', r.release_allowed === false);
  assert('ready: deploy_allowed=false', r.deploy_allowed === false);
  assert('ready: stable_allowed=false', r.stable_allowed === false);
  assert('ready: tag_allowed=false', r.tag_allowed === false);
  assert('ready: manifest_hash 64 chars', typeof r.manifest_hash === 'string' && r.manifest_hash.length === 64);
  assert('ready: errors empty', r.errors.length === 0);
  assert('ready: production_touched=false', r.production_touched === false);
}

// --- impacted_files passthrough ---
console.log('--- impacted_files ---');
{
  const r = buildReleaseImpactManifest({ ...VALID_INPUT, impacted_files: ['src/main.js', 'src/utils.js'] });
  assert('impacted_files passed through', r.impacted_files.length === 2);
}
{
  const r = buildReleaseImpactManifest(VALID_INPUT);
  assert('no impacted_files → empty array', r.impacted_files.length === 0);
}

// --- hash determinism ---
console.log('--- hash determinism ---');
{
  const r1 = buildReleaseImpactManifest(VALID_INPUT);
  const r2 = buildReleaseImpactManifest(VALID_INPUT);
  assert('hash deterministic', r1.manifest_hash === r2.manifest_hash);
  const r3 = buildReleaseImpactManifest({ ...VALID_INPUT, manifest_id: 'manifest-002' });
  assert('different manifest_id → different hash', r1.manifest_hash !== r3.manifest_hash);
}

// --- validate ---
console.log('--- validate ---');
{
  const r = buildReleaseImpactManifest(VALID_INPUT);
  const v = validateReleaseImpactManifest(r);
  assert('validate ready: valid=true', v.valid === true);
  assert('validate ready: no errors', v.errors.length === 0);
}
{
  const r = buildReleaseImpactManifest(null);
  const v = validateReleaseImpactManifest(r);
  assert('validate blocked: valid=true', v.valid === true);
}
{
  const v = validateReleaseImpactManifest(null);
  assert('validate null: valid=false', v.valid === false);
}

// --- render ---
console.log('--- render ---');
{
  const r = buildReleaseImpactManifest(VALID_INPUT);
  const s = renderReleaseImpactManifest(r);
  assert('render: is string', typeof s === 'string');
  assert('render: contains IMPACT_MANIFEST_READY', s.includes('IMPACT_MANIFEST_READY'));
  assert('render: contains REGRA ABSOLUTA', s.includes('REGRA ABSOLUTA'));
  assert('render: release_allowed false', s.includes('false'));
}
{
  const s = renderReleaseImpactManifest(null);
  assert('render null: returns string', typeof s === 'string');
}

// --- invariants ---
console.log('--- invariants ---');
{
  const cases = [
    buildReleaseImpactManifest(null),
    buildReleaseImpactManifest({}),
    buildReleaseImpactManifest({ ...VALID_INPUT, risk_classifier_ready: false }),
    buildReleaseImpactManifest(VALID_INPUT),
  ];
  assert('all: release_allowed=false', cases.every(r => r.release_allowed === false));
  assert('all: deploy_allowed=false', cases.every(r => r.deploy_allowed === false));
  assert('all: stable_allowed=false', cases.every(r => r.stable_allowed === false));
  assert('all: tag_allowed=false', cases.every(r => r.tag_allowed === false));
  assert('all: production_touched=false', cases.every(r => r.production_touched === false));
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
