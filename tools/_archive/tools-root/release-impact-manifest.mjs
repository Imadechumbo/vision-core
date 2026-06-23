#!/usr/bin/env node
/**
 * Release Impact Manifest — V194.0
 * Generates impact manifest of a possible release. Does not execute anything.
 * Does NOT deploy, promote, release, or create tags. release_allowed=false always.
 */

import { createHash } from 'crypto';

export const RELEASE_IMPACT_MANIFEST_STATUSES = [
  'IMPACT_MANIFEST_BLOCKED_INPUT',
  'IMPACT_MANIFEST_BLOCKED_RISK',
  'IMPACT_MANIFEST_READY',
];

const SCHEMA_VERSION = 'v194.0';

const IMPACTED_MODULES = [
  'scope_contract', 'pre_state_snapshot', 'apply_controller',
  'physical_apply_proof', 'diff_truth_binding', 'test_lane',
  'rollback_plan', 'rollback_drill', 'evidence_receipt',
  'ledger', 'final_report', 'pass_gold_candidate_gate',
  'baseline', 'archive_record', 'execution_baseline',
];

const EXPECTED_CHANGES = [
  'apply_patch_to_target_files',
  'update_baseline_hash',
  'update_archive_record',
  'update_execution_baseline',
  'emit_ledger_event',
];

const ROLLBACK_REQUIREMENTS = [
  'pre_state_snapshot_must_exist',
  'rollback_plan_must_be_ready',
  'rollback_drill_must_have_passed',
  'restore_capability_must_be_verified',
];

const VALIDATION_REQUIREMENTS = [
  'chain_integrity_must_be_verified',
  'evidence_graph_must_be_ready',
  'replay_verifier_must_pass',
  'human_approval_must_be_bound',
  'rc_dry_run_must_be_ready',
];

const OPERATIONAL_RISKS = [
  'partial_apply_if_interrupted',
  'rollback_required_on_test_failure',
  'ledger_must_record_all_events',
  'archive_record_must_be_immutable',
];

function sha256(s) {
  return createHash('sha256').update(String(s)).digest('hex');
}

function blockedInput(reason) {
  return {
    schema_version: SCHEMA_VERSION,
    impact_manifest_id: null,
    impacted_modules: [],
    impacted_files: [],
    expected_changes: [],
    rollback_requirements: [],
    validation_requirements: [],
    operational_risks: [],
    impact_manifest_ready: false,
    release_allowed: false,
    deploy_allowed: false,
    stable_allowed: false,
    tag_allowed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    manifest_hash: null,
    status: 'IMPACT_MANIFEST_BLOCKED_INPUT',
    errors: [reason],
  };
}

export function buildReleaseImpactManifest(input) {
  if (!input || typeof input !== 'object') {
    return blockedInput('input is null or not an object');
  }

  const {
    manifest_id,
    risk_classifier_ready,
    decision_request_ready,
    release_plan_ready,
    phase_gate_ready,
  } = input;

  if (!manifest_id || typeof manifest_id !== 'string' || !manifest_id.trim()) {
    return blockedInput('Missing or invalid manifest_id');
  }

  if (!risk_classifier_ready || !decision_request_ready || !release_plan_ready || !phase_gate_ready) {
    return {
      schema_version: SCHEMA_VERSION,
      impact_manifest_id: manifest_id,
      impacted_modules: [],
      impacted_files: [],
      expected_changes: [],
      rollback_requirements: [],
      validation_requirements: [],
      operational_risks: [],
      impact_manifest_ready: false,
      release_allowed: false,
      deploy_allowed: false,
      stable_allowed: false,
      tag_allowed: false,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      manifest_hash: null,
      status: 'IMPACT_MANIFEST_BLOCKED_RISK',
      errors: ['risk_classifier_ready, decision_request_ready, release_plan_ready, and phase_gate_ready must all be true'],
    };
  }

  const impacted_files = Array.isArray(input.impacted_files) ? input.impacted_files : [];

  const manifest_hash = sha256(`${manifest_id}:${IMPACTED_MODULES.join(',')}`);

  return {
    schema_version: SCHEMA_VERSION,
    impact_manifest_id: manifest_id,
    impacted_modules: IMPACTED_MODULES,
    impacted_files,
    expected_changes: EXPECTED_CHANGES,
    rollback_requirements: ROLLBACK_REQUIREMENTS,
    validation_requirements: VALIDATION_REQUIREMENTS,
    operational_risks: OPERATIONAL_RISKS,
    impact_manifest_ready: true,
    release_allowed: false,
    deploy_allowed: false,
    stable_allowed: false,
    tag_allowed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    manifest_hash,
    status: 'IMPACT_MANIFEST_READY',
    errors: [],
  };
}

export function validateReleaseImpactManifest(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  if (result.release_allowed !== false) errors.push('release_allowed must be false');
  if (result.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (result.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (result.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  if (result.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (result.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!RELEASE_IMPACT_MANIFEST_STATUSES.includes(result.status)) {
    errors.push(`Invalid status: ${result.status}`);
  }
  if (result.status === 'IMPACT_MANIFEST_READY' &&
      (!result.manifest_hash || result.manifest_hash.length !== 64)) {
    errors.push('IMPACT_MANIFEST_READY requires 64-char manifest_hash');
  }
  return { valid: errors.length === 0, errors };
}

export function renderReleaseImpactManifest(result) {
  if (!result || typeof result !== 'object') return '[ReleaseImpactManifest: null]';
  const lines = [
    `=== Release Impact Manifest ${SCHEMA_VERSION} ===`,
    `Status              : ${result.status}`,
    `Manifest ID         : ${result.impact_manifest_id ?? 'N/A'}`,
    `Impacted Modules    : ${(result.impacted_modules || []).length}`,
    `Expected Changes    : ${(result.expected_changes || []).length}`,
    `Rollback Reqs       : ${(result.rollback_requirements || []).length}`,
    `Operational Risks   : ${(result.operational_risks || []).length}`,
    `Manifest Ready      : ${result.impact_manifest_ready}`,
    `Release Allowed     : ${result.release_allowed}`,
    `Manifest Hash       : ${result.manifest_hash ?? 'N/A'}`,
    `Prod Touched        : ${result.production_touched}`,
  ];
  if (result.errors && result.errors.length) lines.push(`Errors              : ${result.errors.join('; ')}`);
  lines.push('--- REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable ---');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('release-impact-manifest.mjs')) {
  const demo = buildReleaseImpactManifest({
    manifest_id: 'manifest-demo-001',
    risk_classifier_ready: true,
    decision_request_ready: true,
    release_plan_ready: true,
    phase_gate_ready: true,
  });
  console.log(renderReleaseImpactManifest(demo));
  const v = validateReleaseImpactManifest(demo);
  console.log(`\nValidation: ${v.valid ? 'OK' : 'FAIL'}`);
}
