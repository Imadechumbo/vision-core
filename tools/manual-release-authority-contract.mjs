#!/usr/bin/env node
/**
 * Manual Release Authority Contract — V191.0
 * Explicit authority contract for future controlled release decisions.
 * Does NOT deploy, promote, release, or create tags. release_allowed=false always.
 */

import { createHash } from 'crypto';

export const MANUAL_RELEASE_AUTHORITY_STATUSES = [
  'MANUAL_AUTHORITY_BLOCKED_INPUT',
  'MANUAL_AUTHORITY_BLOCKED_PHASE_GATE',
  'MANUAL_AUTHORITY_REQUIRED',
  'MANUAL_AUTHORITY_GRANTED_DRY',
];

const SCHEMA_VERSION = 'v191.0';

function sha256(s) {
  return createHash('sha256').update(String(s)).digest('hex');
}

function blockedInput(reason) {
  return {
    schema_version: SCHEMA_VERSION,
    manual_authority_contract_id: null,
    requester: null,
    reason: null,
    target_scope: null,
    manual_authority_granted_dry: false,
    next_decision_allowed: false,
    real_execution_allowed: false,
    release_allowed: false,
    deploy_allowed: false,
    stable_allowed: false,
    tag_allowed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    contract_hash: null,
    status: 'MANUAL_AUTHORITY_BLOCKED_INPUT',
    errors: [reason],
  };
}

export function buildManualReleaseAuthorityContract(input) {
  if (!input || typeof input !== 'object') {
    return blockedInput('input is null or not an object');
  }

  const {
    contract_id,
    phase_gate_ready,
    phase_certified,
    v171_v190_certified,
    manual_authority_requested,
    requester,
    reason,
    target_scope,
  } = input;

  if (!contract_id || typeof contract_id !== 'string' || !contract_id.trim()) {
    return blockedInput('Missing or invalid contract_id');
  }

  if (!phase_gate_ready || !phase_certified || !v171_v190_certified) {
    return {
      schema_version: SCHEMA_VERSION,
      manual_authority_contract_id: contract_id,
      requester: null,
      reason: null,
      target_scope: null,
      manual_authority_granted_dry: false,
      next_decision_allowed: false,
      real_execution_allowed: false,
      release_allowed: false,
      deploy_allowed: false,
      stable_allowed: false,
      tag_allowed: false,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      contract_hash: null,
      status: 'MANUAL_AUTHORITY_BLOCKED_PHASE_GATE',
      errors: ['phase_gate_ready, phase_certified, and v171_v190_certified must all be true'],
    };
  }

  if (!manual_authority_requested) {
    return {
      schema_version: SCHEMA_VERSION,
      manual_authority_contract_id: contract_id,
      requester: null,
      reason: null,
      target_scope: null,
      manual_authority_granted_dry: false,
      next_decision_allowed: false,
      real_execution_allowed: false,
      release_allowed: false,
      deploy_allowed: false,
      stable_allowed: false,
      tag_allowed: false,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
      contract_hash: null,
      status: 'MANUAL_AUTHORITY_REQUIRED',
      errors: ['manual_authority_requested must be true to proceed'],
    };
  }

  const errors = [];
  if (!requester || typeof requester !== 'string' || !requester.trim()) {
    errors.push('Missing or invalid requester');
  }
  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    errors.push('Missing or invalid reason');
  }
  if (!target_scope || typeof target_scope !== 'string' || !target_scope.trim()) {
    errors.push('Missing or invalid target_scope');
  }

  if (errors.length > 0) {
    return {
      ...blockedInput(errors[0]),
      errors,
      manual_authority_contract_id: contract_id,
    };
  }

  const contract_hash = sha256(`${contract_id}:${requester}:${target_scope}`);

  return {
    schema_version: SCHEMA_VERSION,
    manual_authority_contract_id: contract_id,
    requester,
    reason,
    target_scope,
    manual_authority_granted_dry: true,
    next_decision_allowed: true,
    real_execution_allowed: false,
    release_allowed: false,
    deploy_allowed: false,
    stable_allowed: false,
    tag_allowed: false,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    contract_hash,
    status: 'MANUAL_AUTHORITY_GRANTED_DRY',
    errors: [],
  };
}

export function validateManualReleaseAuthorityContract(result) {
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
  if (!MANUAL_RELEASE_AUTHORITY_STATUSES.includes(result.status)) {
    errors.push(`Invalid status: ${result.status}`);
  }
  if (result.status === 'MANUAL_AUTHORITY_GRANTED_DRY' &&
      (!result.contract_hash || result.contract_hash.length !== 64)) {
    errors.push('MANUAL_AUTHORITY_GRANTED_DRY requires 64-char contract_hash');
  }
  return { valid: errors.length === 0, errors };
}

export function renderManualReleaseAuthorityContract(result) {
  if (!result || typeof result !== 'object') return '[ManualReleaseAuthorityContract: null]';
  const lines = [
    `=== Manual Release Authority Contract ${SCHEMA_VERSION} ===`,
    `Status              : ${result.status}`,
    `Contract ID         : ${result.manual_authority_contract_id ?? 'N/A'}`,
    `Requester           : ${result.requester ?? 'N/A'}`,
    `Target Scope        : ${result.target_scope ?? 'N/A'}`,
    `Authority Granted   : ${result.manual_authority_granted_dry}`,
    `Next Decision OK    : ${result.next_decision_allowed}`,
    `Real Exec Allowed   : ${result.real_execution_allowed}`,
    `Release Allowed     : ${result.release_allowed}`,
    `Contract Hash       : ${result.contract_hash ?? 'N/A'}`,
    `Prod Touched        : ${result.production_touched}`,
  ];
  if (result.errors && result.errors.length) lines.push(`Errors              : ${result.errors.join('; ')}`);
  lines.push('--- REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable ---');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('manual-release-authority-contract.mjs')) {
  const demo = buildManualReleaseAuthorityContract({
    contract_id: 'contract-demo-001',
    phase_gate_ready: true,
    phase_certified: true,
    v171_v190_certified: true,
    manual_authority_requested: true,
    requester: 'operator-01',
    reason: 'Controlled release after full V171-V190 certification',
    target_scope: 'v1.0.0-rc1',
  });
  console.log(renderManualReleaseAuthorityContract(demo));
  const v = validateManualReleaseAuthorityContract(demo);
  console.log(`\nValidation: ${v.valid ? 'OK' : 'FAIL'}`);
}
