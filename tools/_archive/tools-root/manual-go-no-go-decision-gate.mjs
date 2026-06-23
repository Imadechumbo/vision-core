#!/usr/bin/env node
/**
 * Manual GO / NO-GO Decision Gate — V195.0
 * Formal human GO/NO-GO decision gate. Does NOT execute release even on GO.
 * release_allowed=false always.
 */

import { createHash } from 'crypto';

export const MANUAL_GO_NO_GO_STATUSES = [
  'GO_NO_GO_BLOCKED_INPUT',
  'GO_NO_GO_BLOCKED_MANIFEST',
  'GO_NO_GO_NO_GO',
  'GO_NO_GO_GO_DRY',
];

const SCHEMA_VERSION = 'v195.0';

function sha256(s) {
  return createHash('sha256').update(String(s)).digest('hex');
}

function blockedInput(reason) {
  return {
    schema_version: SCHEMA_VERSION,
    go_no_go_decision_id: null,
    decision: null,
    decided_by: null,
    decision_reason: null,
    go_dry_ready: false,
    next_release_preparation_allowed: false,
    real_execution_allowed: false,
    release_allowed: false,
    deploy_allowed: false,
    stable_allowed: false,
    tag_allowed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    decision_hash: null,
    status: 'GO_NO_GO_BLOCKED_INPUT',
    errors: [reason],
  };
}

export function buildManualGoNoGoDecisionGate(input) {
  if (!input || typeof input !== 'object') {
    return blockedInput('input is null or not an object');
  }

  const {
    decision_id,
    impact_manifest_ready,
    risk_classifier_ready,
    decision_request_ready,
    decision,
    decided_by,
    decision_reason,
    production_touched,
    deploy_performed,
    stable_promoted,
    release_performed,
  } = input;

  if (!decision_id || typeof decision_id !== 'string' || !decision_id.trim()) {
    return blockedInput('Missing or invalid decision_id');
  }

  const manifestErrors = [];
  if (!impact_manifest_ready) manifestErrors.push('impact_manifest_ready must be true');
  if (!risk_classifier_ready) manifestErrors.push('risk_classifier_ready must be true');
  if (!decision_request_ready) manifestErrors.push('decision_request_ready must be true');
  if (production_touched) manifestErrors.push('production_touched must be false');
  if (deploy_performed) manifestErrors.push('deploy_performed must be false');
  if (stable_promoted) manifestErrors.push('stable_promoted must be false');
  if (release_performed) manifestErrors.push('release_performed must be false');

  if (manifestErrors.length > 0) {
    return {
      schema_version: SCHEMA_VERSION,
      go_no_go_decision_id: decision_id,
      decision: null,
      decided_by: null,
      decision_reason: null,
      go_dry_ready: false,
      next_release_preparation_allowed: false,
      real_execution_allowed: false,
      release_allowed: false,
      deploy_allowed: false,
      stable_allowed: false,
      tag_allowed: false,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      decision_hash: null,
      status: 'GO_NO_GO_BLOCKED_MANIFEST',
      errors: manifestErrors,
    };
  }

  const errors = [];
  if (!decision || !['GO', 'NO_GO'].includes(decision)) {
    errors.push(`decision must be "GO" or "NO_GO"${decision ? `, got: ${decision}` : ''}`);
  }
  if (!decided_by || typeof decided_by !== 'string' || !decided_by.trim()) {
    errors.push('Missing or invalid decided_by');
  }
  if (!decision_reason || typeof decision_reason !== 'string' || !decision_reason.trim()) {
    errors.push('Missing or invalid decision_reason');
  }

  if (errors.length > 0) {
    return { ...blockedInput(errors[0]), errors, go_no_go_decision_id: decision_id };
  }

  const decision_hash = sha256(`${decision_id}:${decision}:${decided_by}`);

  if (decision === 'NO_GO') {
    return {
      schema_version: SCHEMA_VERSION,
      go_no_go_decision_id: decision_id,
      decision,
      decided_by,
      decision_reason,
      go_dry_ready: false,
      next_release_preparation_allowed: false,
      real_execution_allowed: false,
      release_allowed: false,
      deploy_allowed: false,
      stable_allowed: false,
      tag_allowed: false,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      decision_hash,
      status: 'GO_NO_GO_NO_GO',
      errors: [],
    };
  }

  return {
    schema_version: SCHEMA_VERSION,
    go_no_go_decision_id: decision_id,
    decision,
    decided_by,
    decision_reason,
    go_dry_ready: true,
    next_release_preparation_allowed: true,
    real_execution_allowed: false,
    release_allowed: false,
    deploy_allowed: false,
    stable_allowed: false,
    tag_allowed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    decision_hash,
    status: 'GO_NO_GO_GO_DRY',
    errors: [],
  };
}

export function validateManualGoNoGoDecisionGate(result) {
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
  if (!MANUAL_GO_NO_GO_STATUSES.includes(result.status)) {
    errors.push(`Invalid status: ${result.status}`);
  }
  if (['GO_NO_GO_GO_DRY', 'GO_NO_GO_NO_GO'].includes(result.status) &&
      (!result.decision_hash || result.decision_hash.length !== 64)) {
    errors.push('Completed decision requires 64-char decision_hash');
  }
  return { valid: errors.length === 0, errors };
}

export function renderManualGoNoGoDecisionGate(result) {
  if (!result || typeof result !== 'object') return '[ManualGoNoGoDecisionGate: null]';
  const lines = [
    `=== Manual GO/NO-GO Decision Gate ${SCHEMA_VERSION} ===`,
    `Status              : ${result.status}`,
    `Decision ID         : ${result.go_no_go_decision_id ?? 'N/A'}`,
    `Decision            : ${result.decision ?? 'N/A'}`,
    `Decided By          : ${result.decided_by ?? 'N/A'}`,
    `GO Dry Ready        : ${result.go_dry_ready}`,
    `Next Prep Allowed   : ${result.next_release_preparation_allowed}`,
    `Real Exec Allowed   : ${result.real_execution_allowed}`,
    `Release Allowed     : ${result.release_allowed}`,
    `Decision Hash       : ${result.decision_hash ?? 'N/A'}`,
    `Prod Touched        : ${result.production_touched}`,
  ];
  if (result.errors && result.errors.length) lines.push(`Errors              : ${result.errors.join('; ')}`);
  lines.push('--- REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable ---');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('manual-go-no-go-decision-gate.mjs')) {
  const demo = buildManualGoNoGoDecisionGate({
    decision_id: 'decision-demo-001',
    impact_manifest_ready: true,
    risk_classifier_ready: true,
    decision_request_ready: true,
    decision: 'GO',
    decided_by: 'operator-01',
    decision_reason: 'All checks passed, proceeding to tag plan',
  });
  console.log(renderManualGoNoGoDecisionGate(demo));
  const v = validateManualGoNoGoDecisionGate(demo);
  console.log(`\nValidation: ${v.valid ? 'OK' : 'FAIL'}`);
}
