#!/usr/bin/env node

import { createHash } from 'crypto';

export const SOFTWARE_FACTORY_CONTRACT_STATUSES = [
  'SOFTWARE_FACTORY_BLOCKED_INPUT',
  'SOFTWARE_FACTORY_BLOCKED_SCOPE',
  'SOFTWARE_FACTORY_READY',
];

const SCHEMA_VERSION = 'v201.0';

function sha256(s) {
  return createHash('sha256').update(String(s)).digest('hex');
}

function blockedInput(reason) {
  return {
    schema_version: SCHEMA_VERSION,
    contract_id: null,
    mission_id: null,
    mission_type: null,
    requested_by: null,
    target_project: null,
    allowed_files: [],
    forbidden_files: [],
    safety_mode: false,
    pass_gold_required: false,
    rollback_required: false,
    scope_validated: false,
    contract_hash: null,
    real_execution_allowed: false,
    release_allowed: false,
    deploy_allowed: false,
    stable_allowed: false,
    tag_allowed: false,
    status: 'SOFTWARE_FACTORY_BLOCKED_INPUT',
    errors: [reason],
  };
}

export function buildSoftwareFactoryContract(input) {
  if (!input || typeof input !== 'object') {
    return blockedInput('input is null or not an object');
  }

  const {
    contract_id,
    mission_id,
    mission_type,
    requested_by,
    target_project,
    allowed_files,
    forbidden_files,
    safety_mode,
    pass_gold_required,
    rollback_required,
  } = input;

  if (!contract_id || typeof contract_id !== 'string' || !contract_id.trim()) {
    return blockedInput('Missing or invalid contract_id');
  }
  if (!mission_id || typeof mission_id !== 'string' || !mission_id.trim()) {
    return blockedInput('Missing or invalid mission_id');
  }
  if (!mission_type || typeof mission_type !== 'string' || !mission_type.trim()) {
    return blockedInput('Missing or invalid mission_type');
  }
  if (!requested_by || typeof requested_by !== 'string' || !requested_by.trim()) {
    return blockedInput('Missing or invalid requested_by');
  }
  if (!target_project || typeof target_project !== 'string' || !target_project.trim()) {
    return blockedInput('Missing or invalid target_project');
  }

  const scopeErrors = [];
  if (!Array.isArray(allowed_files) || allowed_files.length === 0) {
    scopeErrors.push('allowed_files must be a non-empty array');
  }
  if (!Array.isArray(forbidden_files)) {
    scopeErrors.push('forbidden_files must be an array');
  }
  if (safety_mode !== true) scopeErrors.push('safety_mode must be true');
  if (pass_gold_required !== true) scopeErrors.push('pass_gold_required must be true');
  if (rollback_required !== true) scopeErrors.push('rollback_required must be true');

  if (scopeErrors.length > 0) {
    return {
      schema_version: SCHEMA_VERSION,
      contract_id,
      mission_id,
      mission_type,
      requested_by,
      target_project,
      allowed_files: allowed_files || [],
      forbidden_files: forbidden_files || [],
      safety_mode: safety_mode === true,
      pass_gold_required: pass_gold_required === true,
      rollback_required: rollback_required === true,
      scope_validated: false,
      contract_hash: null,
      real_execution_allowed: false,
      release_allowed: false,
      deploy_allowed: false,
      stable_allowed: false,
      tag_allowed: false,
      status: 'SOFTWARE_FACTORY_BLOCKED_SCOPE',
      errors: scopeErrors,
    };
  }

  const contract_hash = sha256(`${contract_id}:${mission_id}:${mission_type}:${target_project}`);

  return {
    schema_version: SCHEMA_VERSION,
    contract_id,
    mission_id,
    mission_type,
    requested_by,
    target_project,
    allowed_files,
    forbidden_files,
    safety_mode: true,
    pass_gold_required: true,
    rollback_required: true,
    scope_validated: true,
    contract_hash,
    real_execution_allowed: false,
    release_allowed: false,
    deploy_allowed: false,
    stable_allowed: false,
    tag_allowed: false,
    status: 'SOFTWARE_FACTORY_READY',
    errors: [],
  };
}

export function validateSoftwareFactoryContract(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  if (result.real_execution_allowed !== false) errors.push('real_execution_allowed must be false');
  if (result.release_allowed !== false) errors.push('release_allowed must be false');
  if (result.deploy_allowed !== false) errors.push('deploy_allowed must be false');
  if (result.stable_allowed !== false) errors.push('stable_allowed must be false');
  if (result.tag_allowed !== false) errors.push('tag_allowed must be false');
  if (!SOFTWARE_FACTORY_CONTRACT_STATUSES.includes(result.status)) {
    errors.push(`Invalid status: ${result.status}`);
  }
  if (result.status === 'SOFTWARE_FACTORY_READY' && (!result.contract_hash || result.contract_hash.length !== 64)) {
    errors.push('Ready requires 64-char contract_hash');
  }
  return { valid: errors.length === 0, errors };
}

export function renderSoftwareFactoryContract(result) {
  if (!result || typeof result !== 'object') return '[SoftwareFactoryContract: null]';
  const lines = [
    `=== Software Factory Contract ${SCHEMA_VERSION} ===`,
    `Status              : ${result.status}`,
    `Contract ID         : ${result.contract_id ?? 'N/A'}`,
    `Mission ID          : ${result.mission_id ?? 'N/A'}`,
    `Mission Type        : ${result.mission_type ?? 'N/A'}`,
    `Requested By        : ${result.requested_by ?? 'N/A'}`,
    `Target Project      : ${result.target_project ?? 'N/A'}`,
    `Safety Mode         : ${result.safety_mode}`,
    `PASS GOLD Required  : ${result.pass_gold_required}`,
    `Rollback Required   : ${result.rollback_required}`,
    `Scope Validated     : ${result.scope_validated}`,
    `Contract Hash       : ${result.contract_hash ?? 'N/A'}`,
  ];
  if (result.errors && result.errors.length) lines.push(`Errors              : ${result.errors.join('; ')}`);
  lines.push('--- REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable ---');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('software-factory-contract.mjs')) {
  const demo = buildSoftwareFactoryContract({
    contract_id: 'sf-contract-001',
    mission_id: 'mission-001',
    mission_type: 'feature',
    requested_by: 'human-operator',
    target_project: 'vision-core',
    allowed_files: ['tools/software-factory/', 'tools/tests/software-factory/'],
    forbidden_files: ['tools/deploy/', 'tools/release/'],
    safety_mode: true,
    pass_gold_required: true,
    rollback_required: true,
  });
  console.log(renderSoftwareFactoryContract(demo));
  const v = validateSoftwareFactoryContract(demo);
  console.log(`\nValidation: ${v.valid ? 'OK' : 'FAIL'}`);
}
