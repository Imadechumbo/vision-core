#!/usr/bin/env node
/**
 * Real Release Decision Request — V192.0
 * Formal decision request for a real release, pending manual decision.
 * Does NOT deploy, promote, release, or create tags. release_allowed=false always.
 */

import { createHash } from 'crypto';

export const REAL_RELEASE_DECISION_REQUEST_STATUSES = [
  'RELEASE_DECISION_BLOCKED_INPUT',
  'RELEASE_DECISION_BLOCKED_AUTHORITY',
  'RELEASE_DECISION_PENDING',
  'RELEASE_DECISION_REQUEST_READY',
];

const SCHEMA_VERSION = 'v192.0';

function sha256(s) {
  return createHash('sha256').update(String(s)).digest('hex');
}

function blockedInput(reason) {
  return {
    schema_version: SCHEMA_VERSION,
    release_decision_request_id: null,
    requested_by: null,
    requested_version: null,
    requested_scope: null,
    decision_request_ready: false,
    decision_status: null,
    release_allowed: false,
    deploy_allowed: false,
    stable_allowed: false,
    tag_allowed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    request_hash: null,
    status: 'RELEASE_DECISION_BLOCKED_INPUT',
    errors: [reason],
  };
}

export function buildRealReleaseDecisionRequest(input) {
  if (!input || typeof input !== 'object') {
    return blockedInput('input is null or not an object');
  }

  const {
    release_request_id,
    manual_authority_granted_dry,
    phase_gate_ready,
    certification_ready,
    authority_review_approved,
    requested_by,
    requested_reason,
    requested_version,
    requested_scope,
  } = input;

  if (!release_request_id || typeof release_request_id !== 'string' || !release_request_id.trim()) {
    return blockedInput('Missing or invalid release_request_id');
  }

  if (!manual_authority_granted_dry || !phase_gate_ready || !certification_ready || !authority_review_approved) {
    return {
      schema_version: SCHEMA_VERSION,
      release_decision_request_id: release_request_id,
      requested_by: null,
      requested_version: null,
      requested_scope: null,
      decision_request_ready: false,
      decision_status: null,
      release_allowed: false,
      deploy_allowed: false,
      stable_allowed: false,
      tag_allowed: false,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      request_hash: null,
      status: 'RELEASE_DECISION_BLOCKED_AUTHORITY',
      errors: ['manual_authority_granted_dry, phase_gate_ready, certification_ready, and authority_review_approved must all be true'],
    };
  }

  const errors = [];
  if (!requested_by || typeof requested_by !== 'string' || !requested_by.trim()) {
    errors.push('Missing or invalid requested_by');
  }
  if (!requested_reason || typeof requested_reason !== 'string' || !requested_reason.trim()) {
    errors.push('Missing or invalid requested_reason');
  }
  if (!requested_version || typeof requested_version !== 'string' || !requested_version.trim()) {
    errors.push('Missing or invalid requested_version');
  }
  if (!requested_scope || typeof requested_scope !== 'string' || !requested_scope.trim()) {
    errors.push('Missing or invalid requested_scope');
  }

  if (errors.length > 0) {
    return { ...blockedInput(errors[0]), errors, release_decision_request_id: release_request_id };
  }

  if (input.decision_pending === false) {
    const request_hash = sha256(`${release_request_id}:${requested_by}:${requested_version}`);
    return {
      schema_version: SCHEMA_VERSION,
      release_decision_request_id: release_request_id,
      requested_by,
      requested_reason,
      requested_version,
      requested_scope,
      decision_request_ready: true,
      decision_status: 'PENDING_MANUAL_DECISION',
      release_allowed: false,
      deploy_allowed: false,
      stable_allowed: false,
      tag_allowed: false,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      request_hash,
      status: 'RELEASE_DECISION_PENDING',
      errors: [],
    };
  }

  const request_hash = sha256(`${release_request_id}:${requested_by}:${requested_version}`);

  return {
    schema_version: SCHEMA_VERSION,
    release_decision_request_id: release_request_id,
    requested_by,
    requested_reason,
    requested_version,
    requested_scope,
    decision_request_ready: true,
    decision_status: 'PENDING_MANUAL_DECISION',
    release_allowed: false,
    deploy_allowed: false,
    stable_allowed: false,
    tag_allowed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    request_hash,
    status: 'RELEASE_DECISION_REQUEST_READY',
    errors: [],
  };
}

export function validateRealReleaseDecisionRequest(result) {
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
  if (!REAL_RELEASE_DECISION_REQUEST_STATUSES.includes(result.status)) {
    errors.push(`Invalid status: ${result.status}`);
  }
  if (result.status === 'RELEASE_DECISION_REQUEST_READY' &&
      (!result.request_hash || result.request_hash.length !== 64)) {
    errors.push('RELEASE_DECISION_REQUEST_READY requires 64-char request_hash');
  }
  return { valid: errors.length === 0, errors };
}

export function renderRealReleaseDecisionRequest(result) {
  if (!result || typeof result !== 'object') return '[RealReleaseDecisionRequest: null]';
  const lines = [
    `=== Real Release Decision Request ${SCHEMA_VERSION} ===`,
    `Status              : ${result.status}`,
    `Request ID          : ${result.release_decision_request_id ?? 'N/A'}`,
    `Requested By        : ${result.requested_by ?? 'N/A'}`,
    `Requested Version   : ${result.requested_version ?? 'N/A'}`,
    `Decision Status     : ${result.decision_status ?? 'N/A'}`,
    `Decision Ready      : ${result.decision_request_ready}`,
    `Release Allowed     : ${result.release_allowed}`,
    `Request Hash        : ${result.request_hash ?? 'N/A'}`,
    `Prod Touched        : ${result.production_touched}`,
  ];
  if (result.errors && result.errors.length) lines.push(`Errors              : ${result.errors.join('; ')}`);
  lines.push('--- REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable ---');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('real-release-decision-request.mjs')) {
  const demo = buildRealReleaseDecisionRequest({
    release_request_id: 'request-demo-001',
    manual_authority_granted_dry: true,
    phase_gate_ready: true,
    certification_ready: true,
    authority_review_approved: true,
    requested_by: 'operator-01',
    requested_reason: 'Controlled release after full V191 authority chain',
    requested_version: 'v1.0.0',
    requested_scope: 'full',
  });
  console.log(renderRealReleaseDecisionRequest(demo));
  const v = validateRealReleaseDecisionRequest(demo);
  console.log(`\nValidation: ${v.valid ? 'OK' : 'FAIL'}`);
}
