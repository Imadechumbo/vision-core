#!/usr/bin/env node
/**
 * Hermes Authorization Harness — V15.9
 * Authorization Manifest Test Harness + Signed Approval Simulation
 *
 * REGRA ABSOLUTA: authorization is modeled, not executed.
 * Signed approval simulation only — no real cryptographic production key used.
 * This harness never executes deploy/tag/stable.
 * deploy_allowed/release_allowed/tag_allowed/stable_allowed always false.
 *
 * Exports:
 *   loadAuthorizationFixture
 *   listAuthorizationFixtures
 *   createSignedApprovalSimulation
 *   verifySignedApprovalSimulation
 *   runAuthorizationScenario
 *   runAuthorizationScenarioMatrix
 *   renderAuthorizationScenarioReport
 *   createAuthorizationScenarioSummary
 */

import { createHash }                         from 'crypto';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, join, dirname }              from 'path';
import { fileURLToPath }                       from 'url';
import { validateAuthorizationManifest, evaluateAuthorizationLayer } from './authorization-layer.mjs';
import { createDecisionMatrix }                from './decision-matrix.mjs';

const SCHEMA_VERSION = 'v15.9';
const __dirname_harness = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR      = resolve(__dirname_harness, '../fixtures/authorization');

// ═══════════════════════════════════════════════════════════════════
// SCENARIO DEFINITIONS
// ═══════════════════════════════════════════════════════════════════

const SCENARIO_FIXTURE_MAP = {
  missing_manifest:                null,
  invalid_schema:                  'invalid-schema',
  invalid_action:                  'invalid-action',
  partial_missing_approval:        'partial-missing-approval',
  partial_missing_evidence:        'partial-missing-evidence',
  valid_release_review:            'valid-release-review',
  rejected_release_review:         'rejected-release-review',
  expired_release_review:          'expired-release-review',
  signed_simulated_release_review: 'signed-simulated-release-review',
  tampered_signature:              'signed-simulated-release-review',
};

const EXPECTED_STATUS_MAP = {
  missing_manifest:                'AUTHORIZATION_MISSING',
  invalid_schema:                  'AUTHORIZATION_INVALID',
  invalid_action:                  'AUTHORIZATION_INVALID',
  partial_missing_approval:        'AUTHORIZATION_PARTIAL',
  partial_missing_evidence:        'AUTHORIZATION_PARTIAL',
  valid_release_review:            'AUTHORIZATION_VALID',
  rejected_release_review:         'AUTHORIZATION_REJECTED',
  expired_release_review:          'AUTHORIZATION_EXPIRED',
  signed_simulated_release_review: 'AUTHORIZATION_VALID',
  tampered_signature:              'AUTHORIZATION_INVALID',
};

// ═══════════════════════════════════════════════════════════════════
// FIXTURE LOADING
// ═══════════════════════════════════════════════════════════════════

function loadAuthorizationFixture(name) {
  const filePath = join(FIXTURES_DIR, `${name}.json`);
  if (!existsSync(filePath)) {
    return { name, path: filePath, manifest: null, parse_ok: false, loaded: false, error: `Fixture not found: ${filePath}` };
  }
  try {
    const raw      = readFileSync(filePath, 'utf8');
    const manifest = JSON.parse(raw);
    return { name, path: filePath, manifest, parse_ok: true, loaded: true, error: null };
  } catch (err) {
    return { name, path: filePath, manifest: null, parse_ok: false, loaded: true, error: err.message };
  }
}

function listAuthorizationFixtures() {
  if (!existsSync(FIXTURES_DIR)) return [];
  try {
    return readdirSync(FIXTURES_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  } catch (_) {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════
// SIGNED APPROVAL SIMULATION
// ═══════════════════════════════════════════════════════════════════

function createSignedApprovalSimulation(manifest, options = {}) {
  const signed_by = options.signed_by || 'test-authority';
  // Remove existing signature for canonical payload computation
  const { signature: _removed, ...manifestWithoutSig } = manifest;
  const sortedKeys    = Object.keys(manifestWithoutSig).sort();
  const canonical     = JSON.stringify(manifestWithoutSig, sortedKeys);
  const payloadHash   = createHash('sha256').update(canonical).digest('hex');
  const sigValue      = createHash('sha256').update(`${payloadHash}::simulation::${signed_by}`).digest('hex');
  return {
    ...manifest,
    signature: {
      algorithm:       'simulation-sha256',
      signed_by,
      signed_at:       Date.now(),
      payload_hash:    payloadHash,
      signature_value: sigValue,
      simulation:      true,
      note:            'signed approval simulation only — no real cryptographic production key used',
    },
  };
}

function verifySignedApprovalSimulation(manifest) {
  if (!manifest || !manifest.signature) {
    return { present: false, valid: false, errors: ['No signature block found'], warnings: [], simulation: true, payload_hash: null, signed_by: null, algorithm: null };
  }
  const sig    = manifest.signature;
  const errors = [];

  const validAlgorithms = ['simulation-sha256', 'simulation-hmac-sha256'];
  if (!sig.algorithm || !validAlgorithms.includes(sig.algorithm)) {
    errors.push(`Unknown algorithm "${sig.algorithm}" — expected one of: ${validAlgorithms.join(', ')}`);
    return { present: true, valid: false, errors, warnings: [], simulation: true, payload_hash: sig.payload_hash || null, signed_by: sig.signed_by || null, algorithm: sig.algorithm || null };
  }
  if (sig.simulation !== true) {
    errors.push('signature.simulation must be true — this is a test harness, not production signing');
    return { present: true, valid: false, errors, warnings: [], simulation: true, payload_hash: sig.payload_hash || null, signed_by: sig.signed_by || null, algorithm: sig.algorithm };
  }
  if (!sig.signed_by) {
    errors.push('signature.signed_by is required');
    return { present: true, valid: false, errors, warnings: [], simulation: true, payload_hash: sig.payload_hash || null, signed_by: null, algorithm: sig.algorithm };
  }
  if (!sig.payload_hash) {
    errors.push('signature.payload_hash is required');
    return { present: true, valid: false, errors, warnings: [], simulation: true, payload_hash: null, signed_by: sig.signed_by, algorithm: sig.algorithm };
  }
  if (!sig.signature_value) {
    errors.push('signature.signature_value is required');
    return { present: true, valid: false, errors, warnings: [], simulation: true, payload_hash: sig.payload_hash, signed_by: sig.signed_by, algorithm: sig.algorithm };
  }

  // Recompute canonical payload (excluding signature block)
  const { signature: _removed, ...manifestWithoutSig } = manifest;
  const sortedKeys         = Object.keys(manifestWithoutSig).sort();
  const canonical          = JSON.stringify(manifestWithoutSig, sortedKeys);
  const expectedPayloadHash = createHash('sha256').update(canonical).digest('hex');
  const expectedSigValue    = createHash('sha256').update(`${expectedPayloadHash}::simulation::${sig.signed_by}`).digest('hex');

  if (sig.payload_hash !== expectedPayloadHash) {
    errors.push(`payload_hash mismatch — expected ${expectedPayloadHash.slice(0,12)}…, got ${String(sig.payload_hash).slice(0,12)}… — manifest may have been tampered`);
    return { present: true, valid: false, errors, warnings: [], simulation: true, payload_hash: sig.payload_hash, signed_by: sig.signed_by, algorithm: sig.algorithm };
  }
  if (sig.signature_value !== expectedSigValue) {
    errors.push('signature_value mismatch — signature may have been tampered or corrupted');
    return { present: true, valid: false, errors, warnings: [], simulation: true, payload_hash: sig.payload_hash, signed_by: sig.signed_by, algorithm: sig.algorithm };
  }

  return {
    present:      true,
    valid:        true,
    errors:       [],
    warnings:     ['signed approval simulation only — no real cryptographic production key used'],
    simulation:   true,
    payload_hash: sig.payload_hash,
    signed_by:    sig.signed_by,
    algorithm:    sig.algorithm,
  };
}

// ═══════════════════════════════════════════════════════════════════
// SCENARIO RUNNER
// ═══════════════════════════════════════════════════════════════════

function runAuthorizationScenario(scenarioName, options = {}) {
  // Unknown scenario
  if (!(scenarioName in SCENARIO_FIXTURE_MAP)) {
    return {
      schema_version:               SCHEMA_VERSION,
      scenario:                     scenarioName,
      fixture_path:                 null,
      loaded:                       false,
      parse_ok:                     false,
      expected_status:              null,
      actual_status:                'SCENARIO_ERROR',
      scenario_status:              'SCENARIO_ERROR',
      status_match:                 false,
      signature_present:            false,
      signature_valid:              false,
      authorization_valid:          false,
      release_authorized:           false,
      deploy_authorized:            false,
      tag_authorized:               false,
      stable_promotion_authorized:  false,
      release_allowed:              false,
      deploy_allowed:               false,
      tag_allowed:                  false,
      stable_allowed:               false,
      promotion_allowed:            false,
      pass_gold_candidate:          false,
      hermes_decision_state:        'BLOCKED_RUNTIME',
      errors:                       [`Unknown scenario: ${scenarioName}`],
      warnings:                     [],
      audit_events:                 [],
      safe:                         true,
    };
  }

  const fixtureName    = SCENARIO_FIXTURE_MAP[scenarioName];
  const expectedStatus = EXPECTED_STATUS_MAP[scenarioName];

  let manifest   = null;
  let loaded     = true;
  let parseOk    = true;
  let fixturePath = null;

  if (fixtureName !== null) {
    const fixtureResult = loadAuthorizationFixture(fixtureName);
    manifest    = fixtureResult.manifest;
    fixturePath = fixtureResult.path;
    loaded      = fixtureResult.loaded;
    parseOk     = fixtureResult.parse_ok;
    if (!parseOk) {
      manifest = null;
    }
  }

  // Signed / tamper scenarios
  let sigVerification = { present: false, valid: false, errors: [], warnings: [], simulation: true };

  if (scenarioName === 'signed_simulated_release_review' && manifest) {
    manifest        = createSignedApprovalSimulation(manifest, { signed_by: 'test-authority' });
    sigVerification = verifySignedApprovalSimulation(manifest);
  }

  if (scenarioName === 'tampered_signature' && manifest) {
    manifest = createSignedApprovalSimulation(manifest, { signed_by: 'test-authority' });
    // Tamper: replace payload_hash with wrong value
    manifest = {
      ...manifest,
      signature: {
        ...manifest.signature,
        payload_hash: 'tampered_payload_hash_0000000000000000000000000000000000000000',
      },
    };
    sigVerification = verifySignedApprovalSimulation(manifest);
  }

  // Evaluate authorization
  const dm        = createDecisionMatrix();
  const authLayer = evaluateAuthorizationLayer(manifest, dm, null, null);

  // Determine scenario status
  let scenarioStatus = authLayer.authorization_status;
  // If signature verification failed, override to AUTHORIZATION_INVALID
  if (sigVerification.present && !sigVerification.valid) {
    scenarioStatus = 'AUTHORIZATION_INVALID';
  }

  const statusMatch = scenarioStatus === expectedStatus;

  return {
    schema_version:               SCHEMA_VERSION,
    scenario:                     scenarioName,
    fixture_path:                 fixturePath,
    loaded,
    parse_ok:                     parseOk,
    expected_status:              expectedStatus,
    actual_status:                scenarioStatus,
    scenario_status:              scenarioStatus,
    status_match:                 statusMatch,
    signature_present:            sigVerification.present,
    signature_valid:              sigVerification.valid,
    authorization_valid:          authLayer.authorization_valid && !(sigVerification.present && !sigVerification.valid),
    release_authorized:           authLayer.release_authorized  && !(sigVerification.present && !sigVerification.valid),
    deploy_authorized:            authLayer.deploy_authorized   && !(sigVerification.present && !sigVerification.valid),
    tag_authorized:               authLayer.tag_authorized      && !(sigVerification.present && !sigVerification.valid),
    stable_promotion_authorized:  authLayer.stable_promotion_authorized && !(sigVerification.present && !sigVerification.valid),
    // Invariants — always false
    release_allowed:              false,
    deploy_allowed:               false,
    tag_allowed:                  false,
    stable_allowed:               false,
    promotion_allowed:            false,
    pass_gold_candidate:          false,
    hermes_decision_state:        dm.decision_state || 'BLOCKED_RUNTIME',
    errors:                       [...(authLayer.authorization_errors || []), ...(sigVerification.errors || [])],
    warnings:                     [...(authLayer.authorization_warnings || []), ...(sigVerification.warnings || [])],
    audit_events:                 (authLayer.authorization_audit_trail || []).map(e => e.type),
    safe:                         true,
  };
}

// ═══════════════════════════════════════════════════════════════════
// SCENARIO MATRIX
// ═══════════════════════════════════════════════════════════════════

function runAuthorizationScenarioMatrix(options = {}) {
  const scenarioNames = Object.keys(SCENARIO_FIXTURE_MAP);
  const results       = scenarioNames.map(name => runAuthorizationScenario(name, options));

  const total    = results.length;
  const passed   = results.filter(r => r.status_match).length;
  const failed   = total - passed;
  const allSafe  = results.every(r => r.safe === true);
  const allFalse = results.every(r =>
    r.release_allowed     === false &&
    r.deploy_allowed      === false &&
    r.tag_allowed         === false &&
    r.stable_allowed      === false &&
    r.promotion_allowed   === false &&
    r.pass_gold_candidate === false
  );

  return {
    schema_version:          SCHEMA_VERSION,
    total,
    passed,
    failed,
    all_safe:                allSafe,
    all_allowed_flags_false: allFalse,
    scenarios:               results,
  };
}

// ═══════════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════════

function renderAuthorizationScenarioReport(matrix) {
  if (!matrix) return null;
  return {
    schema_version:          SCHEMA_VERSION,
    total:                   matrix.total,
    passed:                  matrix.passed,
    failed:                  matrix.failed,
    all_safe:                matrix.all_safe,
    all_allowed_flags_false: matrix.all_allowed_flags_false,
    release_allowed:         false,
    deploy_allowed:          false,
    tag_allowed:             false,
    stable_allowed:          false,
    promotion_allowed:       false,
    pass_gold_candidate:     false,
    scenario_summary:        (matrix.scenarios || []).map(s => ({
      scenario:      s.scenario,
      actual_status: s.actual_status,
      status_match:  s.status_match,
      signature:     s.signature_present ? (s.signature_valid ? 'VALID' : 'INVALID') : 'ABSENT',
    })),
    note: 'signed approval simulation only — no real cryptographic production key used — authorization test harness never executes deploy/tag/stable',
  };
}

function createAuthorizationScenarioSummary(matrix) {
  if (!matrix) return null;
  const report = renderAuthorizationScenarioReport(matrix);
  return {
    schema_version:          SCHEMA_VERSION,
    total:                   report.total,
    passed:                  report.passed,
    failed:                  report.failed,
    all_safe:                report.all_safe,
    all_allowed_flags_false: report.all_allowed_flags_false,
    deploy_allowed:          false,
    release_allowed:         false,
    tag_allowed:             false,
    stable_allowed:          false,
    promotion_allowed:       false,
    pass_gold_candidate:     false,
    note:                    report.note,
  };
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

export {
  loadAuthorizationFixture,
  listAuthorizationFixtures,
  createSignedApprovalSimulation,
  verifySignedApprovalSimulation,
  runAuthorizationScenario,
  runAuthorizationScenarioMatrix,
  renderAuthorizationScenarioReport,
  createAuthorizationScenarioSummary,
};
