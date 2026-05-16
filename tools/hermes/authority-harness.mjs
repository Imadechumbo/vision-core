#!/usr/bin/env node
/**
 * Hermes Authority Harness — V15.10
 * Authority Review Gate + Human Approval Contract Test Harness
 *
 * REGRA ABSOLUTA: authority review is validation, not execution.
 * human approval cannot override PASS GOLD.
 * deploy/tag/stable remain blocked in V15.10.
 * all_allowed_flags_false=true always.
 *
 * Exports:
 *   loadAuthorityFixture
 *   listAuthorityFixtures
 *   runAuthorityScenario
 *   runAuthorityScenarioMatrix
 *   renderAuthorityScenarioReport
 *   createAuthorityScenarioSummary
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, join, dirname }                from 'path';
import { fileURLToPath }                         from 'url';
import {
  evaluateAuthorityReviewGate,
  createAuthorityRoleRegistry,
} from './authority-review.mjs';
import { createDecisionMatrix } from './decision-matrix.mjs';

const SCHEMA_VERSION     = 'v15.10';
const __dirname_harness  = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR       = resolve(__dirname_harness, '../fixtures/authority');

// ═══════════════════════════════════════════════════════════════════
// SCENARIO DEFINITIONS
// ═══════════════════════════════════════════════════════════════════

const SCENARIO_FIXTURE_MAP = {
  missing_contract:                null,
  invalid_schema:                  'invalid-schema',
  insufficient_role_release:       'insufficient-role-release',
  valid_release_review_contract:   'valid-release-review-contract',
  valid_release_authority_contract:'valid-release-authority-contract',
  rejected_contract:               'rejected-contract',
  expired_contract:                'expired-contract',
  scope_mismatch_contract:         'scope-mismatch-contract',
  evidence_missing_contract:       'evidence-missing-contract',
  pass_gold_without_go_core:       'pass-gold-confirmation-without-go-core',
  conflicting_runtime_contract:    'conflicting-runtime-contract',
};

const EXPECTED_STATUS_MAP = {
  missing_contract:                'CONTRACT_MISSING',
  invalid_schema:                  'CONTRACT_INVALID',
  insufficient_role_release:       'CONTRACT_AUTHORITY_INSUFFICIENT',
  valid_release_review_contract:   'CONTRACT_VALID',
  valid_release_authority_contract:'CONTRACT_VALID',
  rejected_contract:               'CONTRACT_REJECTED',
  expired_contract:                'CONTRACT_EXPIRED',
  scope_mismatch_contract:         'CONTRACT_SCOPE_MISMATCH',
  evidence_missing_contract:       'CONTRACT_EVIDENCE_MISSING',
  pass_gold_without_go_core:       'CONTRACT_CONFLICTING',
  conflicting_runtime_contract:    'CONTRACT_VALID',
};

// ═══════════════════════════════════════════════════════════════════
// FIXTURE LOADING
// ═══════════════════════════════════════════════════════════════════

function loadAuthorityFixture(name) {
  const filePath = join(FIXTURES_DIR, `${name}.json`);
  if (!existsSync(filePath)) {
    return { name, path: filePath, contract: null, parse_ok: false, loaded: false, error: `Fixture not found: ${filePath}` };
  }
  try {
    const raw      = readFileSync(filePath, 'utf8');
    const contract = JSON.parse(raw);
    return { name, path: filePath, contract, parse_ok: true, loaded: true, error: null };
  } catch (err) {
    return { name, path: filePath, contract: null, parse_ok: false, loaded: true, error: err.message };
  }
}

function listAuthorityFixtures() {
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
// SCENARIO RUNNER
// ═══════════════════════════════════════════════════════════════════

function runAuthorityScenario(scenarioName, options = {}) {
  if (!(scenarioName in SCENARIO_FIXTURE_MAP)) {
    return {
      schema_version:                SCHEMA_VERSION,
      scenario:                      scenarioName,
      fixture_path:                  null,
      loaded:                        false,
      parse_ok:                      false,
      expected_status:               null,
      actual_status:                 'SCENARIO_ERROR',
      scenario_status:               'SCENARIO_ERROR',
      status_match:                  false,
      authority_role:                null,
      authority_sufficient:          false,
      scope_valid:                   false,
      temporal_valid:                false,
      authority_review_valid:        false,
      human_approval_contract_valid: false,
      release_authorized:            false,
      deploy_authorized:             false,
      tag_authorized:                false,
      stable_promotion_authorized:   false,
      pass_gold_confirmed:           false,
      release_allowed:               false,
      deploy_allowed:                false,
      tag_allowed:                   false,
      stable_allowed:                false,
      promotion_allowed:             false,
      pass_gold_candidate:           false,
      errors:                        [`Unknown scenario: ${scenarioName}`],
      warnings:                      [],
      safe:                          true,
    };
  }

  const fixtureName    = SCENARIO_FIXTURE_MAP[scenarioName];
  const expectedStatus = EXPECTED_STATUS_MAP[scenarioName];

  let contract    = null;
  let loaded      = true;
  let parseOk     = true;
  let fixturePath = null;

  if (fixtureName !== null) {
    const fixtureResult = loadAuthorityFixture(fixtureName);
    contract    = fixtureResult.contract;
    fixturePath = fixtureResult.path;
    loaded      = fixtureResult.loaded;
    parseOk     = fixtureResult.parse_ok;
    if (!parseOk) contract = null;
  }

  const dm      = createDecisionMatrix();
  const context = { decisionMatrix: dm, authorityRegistry: createAuthorityRoleRegistry() };
  const gate    = evaluateAuthorityReviewGate(contract, context);

  const actualStatus = gate.authority_review_status;
  const statusMatch  = actualStatus === expectedStatus;

  return {
    schema_version:                SCHEMA_VERSION,
    scenario:                      scenarioName,
    fixture_path:                  fixturePath,
    loaded,
    parse_ok:                      parseOk,
    expected_status:               expectedStatus,
    actual_status:                 actualStatus,
    scenario_status:               actualStatus,
    status_match:                  statusMatch,
    authority_role:                gate.authority_role,
    authority_sufficient:          gate.authority_sufficient,
    scope_valid:                   gate.scope_valid,
    temporal_valid:                gate.temporal_valid,
    authority_review_valid:        gate.authority_review_valid,
    human_approval_contract_valid: gate.human_approval_contract_valid,
    release_authorized:            gate.release_authorized,
    deploy_authorized:             gate.deploy_authorized,
    tag_authorized:                gate.tag_authorized,
    stable_promotion_authorized:   gate.stable_promotion_authorized,
    pass_gold_confirmed:           gate.pass_gold_confirmed,
    // Invariants — always false
    release_allowed:               false,
    deploy_allowed:                false,
    tag_allowed:                   false,
    stable_allowed:                false,
    promotion_allowed:             false,
    pass_gold_candidate:           false,
    errors:                        (gate.authority_conflicts || []).filter(c => c.severity === 'critical').map(c => c.message),
    warnings:                      (gate.authority_conflicts || []).filter(c => c.severity !== 'critical').map(c => c.message),
    safe:                          true,
  };
}

// ═══════════════════════════════════════════════════════════════════
// SCENARIO MATRIX
// ═══════════════════════════════════════════════════════════════════

function runAuthorityScenarioMatrix(options = {}) {
  const scenarioNames = Object.keys(SCENARIO_FIXTURE_MAP);
  const results       = scenarioNames.map(name => runAuthorityScenario(name, options));

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

function renderAuthorityScenarioReport(matrix) {
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
      scenario:              s.scenario,
      actual_status:         s.actual_status,
      status_match:          s.status_match,
      authority_role:        s.authority_role,
      authority_review_valid: s.authority_review_valid,
    })),
    note: 'authority review is validation, not execution — human approval cannot override PASS GOLD — deploy/tag/stable remain blocked in V15.10',
  };
}

function createAuthorityScenarioSummary(matrix) {
  if (!matrix) return null;
  const report = renderAuthorityScenarioReport(matrix);
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
  loadAuthorityFixture,
  listAuthorityFixtures,
  runAuthorityScenario,
  runAuthorityScenarioMatrix,
  renderAuthorityScenarioReport,
  createAuthorityScenarioSummary,
};
