#!/usr/bin/env node

import { createHash } from 'crypto';

export const RELEASE_AUTHORITY_FINAL_REPORT_STATUSES = [
  'AUTHORITY_REPORT_BLOCKED_INPUT',
  'AUTHORITY_REPORT_BLOCKED_PRE_RELEASE',
  'AUTHORITY_REPORT_READY',
];

const SCHEMA_VERSION = 'v199.0';

const AUTHORITY_CHAIN = [
  'manual_release_authority_contract',
  'real_release_decision_request',
  'release_risk_classifier',
  'release_impact_manifest',
  'manual_go_no_go_decision_gate',
  'controlled_tag_plan',
  'controlled_release_plan_lock',
  'pre_release_final_verifier',
];

const FINAL_RECOMMENDATION = 'READY_FOR_EXPLICIT_V200_RELEASE_EXECUTION_DECISION';

function sha256(s) {
  return createHash('sha256').update(String(s)).digest('hex');
}

function blockedInput(reason) {
  return {
    schema_version: SCHEMA_VERSION,
    release_authority_report_id: null,
    report_ready: false,
    authority_chain: [],
    final_recommendation: null,
    report_hash: null,
    real_execution_allowed: false,
    release_allowed: false,
    deploy_allowed: false,
    stable_allowed: false,
    tag_allowed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    status: 'AUTHORITY_REPORT_BLOCKED_INPUT',
    errors: [reason],
  };
}

export function buildReleaseAuthorityFinalReport(input) {
  if (!input || typeof input !== 'object') {
    return blockedInput('input is null or not an object');
  }

  const {
    authority_report_id,
    pre_release_ready,
    release_plan_locked,
    go_dry_ready,
    impact_manifest_ready,
    risk_classifier_ready,
    decision_request_ready,
    manual_authority_granted_dry,
    production_touched,
    deploy_performed,
    stable_promoted,
    release_performed,
  } = input;

  if (!authority_report_id || typeof authority_report_id !== 'string' || !authority_report_id.trim()) {
    return blockedInput('Missing or invalid authority_report_id');
  }

  const prereqErrors = [];
  if (pre_release_ready !== true) prereqErrors.push('pre_release_ready must be true');
  if (release_plan_locked !== true) prereqErrors.push('release_plan_locked must be true');
  if (go_dry_ready !== true) prereqErrors.push('go_dry_ready must be true');
  if (impact_manifest_ready !== true) prereqErrors.push('impact_manifest_ready must be true');
  if (risk_classifier_ready !== true) prereqErrors.push('risk_classifier_ready must be true');
  if (decision_request_ready !== true) prereqErrors.push('decision_request_ready must be true');
  if (manual_authority_granted_dry !== true) prereqErrors.push('manual_authority_granted_dry must be true');
  if (production_touched) prereqErrors.push('production_touched must be false');
  if (deploy_performed) prereqErrors.push('deploy_performed must be false');
  if (stable_promoted) prereqErrors.push('stable_promoted must be false');
  if (release_performed) prereqErrors.push('release_performed must be false');

  if (prereqErrors.length > 0) {
    return {
      schema_version: SCHEMA_VERSION,
      release_authority_report_id: authority_report_id,
      report_ready: false,
      authority_chain: [],
      final_recommendation: null,
      report_hash: null,
      real_execution_allowed: false,
      release_allowed: false,
      deploy_allowed: false,
      stable_allowed: false,
      tag_allowed: false,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      status: 'AUTHORITY_REPORT_BLOCKED_PRE_RELEASE',
      errors: prereqErrors,
    };
  }

  const report_hash = sha256(`${authority_report_id}:${SCHEMA_VERSION}:${AUTHORITY_CHAIN.join(',')}`);

  return {
    schema_version: SCHEMA_VERSION,
    release_authority_report_id: authority_report_id,
    report_ready: true,
    authority_chain: AUTHORITY_CHAIN,
    final_recommendation: FINAL_RECOMMENDATION,
    report_hash,
    real_execution_allowed: false,
    release_allowed: false,
    deploy_allowed: false,
    stable_allowed: false,
    tag_allowed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    status: 'AUTHORITY_REPORT_READY',
    errors: [],
  };
}

export function validateReleaseAuthorityFinalReport(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  if (result.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (result.release_allowed !== false) errors.push('release_allowed must be false');
  if (result.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (result.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (result.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (result.production_touched !== false) errors.push('production_touched must be false');
  if (result.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (result.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (result.release_performed !== false) errors.push('release_performed must be false');
  if (!RELEASE_AUTHORITY_FINAL_REPORT_STATUSES.includes(result.status)) {
    errors.push(`Invalid status: ${result.status}`);
  }
  if (result.status === 'AUTHORITY_REPORT_READY' && (!result.report_hash || result.report_hash.length !== 64)) {
    errors.push('Ready requires 64-char report_hash');
  }
  return { valid: errors.length === 0, errors };
}

export function renderReleaseAuthorityFinalReport(result) {
  if (!result || typeof result !== 'object') return '[ReleaseAuthorityFinalReport: null]';
  const lines = [
    `=== Release Authority Final Report ${SCHEMA_VERSION} ===`,
    `Status                  : ${result.status}`,
    `Report ID               : ${result.release_authority_report_id ?? 'N/A'}`,
    `Report Ready            : ${result.report_ready}`,
    `Final Recommendation    : ${result.final_recommendation ?? 'N/A'}`,
    `Authority Chain         : ${(result.authority_chain || []).join(' -> ') || 'N/A'}`,
    `Report Hash             : ${result.report_hash ?? 'N/A'}`,
    `Release Allowed         : ${result.release_allowed}`,
    `Real Exec Allowed       : ${result.real_execution_allowed}`,
  ];
  if (result.errors && result.errors.length) lines.push(`Errors                  : ${result.errors.join('; ')}`);
  lines.push('--- REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable ---');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('release-authority-final-report.mjs')) {
  const demo = buildReleaseAuthorityFinalReport({
    authority_report_id: 'report-001',
    pre_release_ready: true,
    release_plan_locked: true,
    go_dry_ready: true,
    impact_manifest_ready: true,
    risk_classifier_ready: true,
    decision_request_ready: true,
    manual_authority_granted_dry: true,
  });
  console.log(renderReleaseAuthorityFinalReport(demo));
  const v = validateReleaseAuthorityFinalReport(demo);
  console.log(`\nValidation: ${v.valid ? 'OK' : 'FAIL'}`);
}
