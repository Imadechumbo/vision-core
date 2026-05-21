#!/usr/bin/env node
/**
 * Controlled Runtime Evidence Package — V154.1
 *
 * Assembles and seals all V151–V154 controlled-execution artifacts into a
 * single immutable evidence package.
 *
 * Required artifacts:
 *   contract_id         (V151.0 human execution command contract)
 *   dry_run_id          (V152.0 controlled dry-run)
 *   plan_id             (V152.1 execution plan)
 *   rollback_binding_id (V153.0 rollback plan binding)
 *   snapshot_id         (V153.1 pre-execution snapshot)
 *   proof_receipt_id    (V154.0 execution proof receipt)
 *
 * Statuses:
 *   EVIDENCE_PACKAGE_BLOCKED_INPUT      — missing package_id
 *   EVIDENCE_PACKAGE_BLOCKED_INCOMPLETE — one or more artifact IDs missing
 *   EVIDENCE_PACKAGE_SEALED             — all artifacts present; package sealed
 *
 * REGRA ABSOLUTA: package_sealed=true, execution_performed=false,
 * stable_promoted=false, deploy_performed=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v154.1';

export const RUNTIME_EVIDENCE_PACKAGE_STATUSES = [
  'EVIDENCE_PACKAGE_BLOCKED_INPUT',
  'EVIDENCE_PACKAGE_BLOCKED_INCOMPLETE',
  'EVIDENCE_PACKAGE_SEALED',
];

export const RUNTIME_EVIDENCE_ARTIFACT_FIELDS = [
  'contract_id',
  'dry_run_id',
  'plan_id',
  'rollback_binding_id',
  'snapshot_id',
  'proof_receipt_id',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    package_sealed:      true,
    execution_performed: false,
    stable_promoted:     false,
    deploy_performed:    false,
    release_performed:   false,
  };
}

export function buildControlledRuntimeEvidencePackage(params) {
  const {
    package_id,
    contract_id,
    dry_run_id,
    plan_id,
    rollback_binding_id,
    snapshot_id,
    proof_receipt_id,
    sealed_at,
  } = params || {};

  const package_id_hash = _sha256([
    package_id,
    contract_id,
    dry_run_id,
    plan_id,
  ].join('|'));
  const ts = sealed_at ?? new Date().toISOString();

  if (!package_id || String(package_id).trim() === '') {
    return {
      package_id_hash,
      schema_version:            SCHEMA_VERSION,
      evidence_package_status:   'EVIDENCE_PACKAGE_BLOCKED_INPUT',
      blocked_reason:            'package_id is required.',
      package_complete:          false,
      sealed_at:                 ts,
      ..._locked(),
    };
  }

  const artifactValues = {
    contract_id, dry_run_id, plan_id,
    rollback_binding_id, snapshot_id, proof_receipt_id,
  };
  const missing = RUNTIME_EVIDENCE_ARTIFACT_FIELDS.filter(f => {
    const val = artifactValues[f];
    return !val || String(val).trim() === '';
  });

  if (missing.length > 0) {
    return {
      package_id_hash,
      schema_version:            SCHEMA_VERSION,
      evidence_package_status:   'EVIDENCE_PACKAGE_BLOCKED_INCOMPLETE',
      blocked_reason:            `missing artifacts: ${missing.join(', ')}`,
      package_complete:          false,
      package_id,
      missing_artifacts:         missing,
      sealed_at:                 ts,
      ..._locked(),
    };
  }

  return {
    package_id_hash,
    schema_version:              SCHEMA_VERSION,
    evidence_package_status:     'EVIDENCE_PACKAGE_SEALED',
    package_complete:            true,
    package_id,
    contract_id,
    dry_run_id,
    plan_id,
    rollback_binding_id,
    snapshot_id,
    proof_receipt_id,
    artifact_count:              RUNTIME_EVIDENCE_ARTIFACT_FIELDS.length,
    sealed_at:                   ts,
    ..._locked(),
  };
}

export function validateControlledRuntimeEvidencePackage(result) {
  if (!result || typeof result !== 'object') {
    return { valid: false, errors: ['result is null or not an object'] };
  }
  const errors = [];
  const required = [
    'package_id_hash', 'schema_version', 'evidence_package_status',
    'package_complete',
    'package_sealed', 'execution_performed',
    'stable_promoted', 'deploy_performed', 'release_performed',
  ];
  for (const field of required) {
    if (!(field in result)) errors.push(`missing field: ${field}`);
  }
  if (result.package_sealed      !== true)  errors.push('package_sealed must be true');
  if (result.execution_performed !== false) errors.push('execution_performed must be false');
  if (result.stable_promoted     !== false) errors.push('stable_promoted must be false');
  if (result.deploy_performed    !== false) errors.push('deploy_performed must be false');
  if (result.release_performed   !== false) errors.push('release_performed must be false');
  if (!RUNTIME_EVIDENCE_PACKAGE_STATUSES.includes(result.evidence_package_status)) {
    errors.push(`invalid evidence_package_status: ${result.evidence_package_status}`);
  }
  if (result.evidence_package_status === 'EVIDENCE_PACKAGE_SEALED') {
    if (result.package_complete !== true) errors.push('SEALED requires package_complete=true');
    if (result.artifact_count !== RUNTIME_EVIDENCE_ARTIFACT_FIELDS.length) {
      errors.push(`SEALED requires artifact_count=${RUNTIME_EVIDENCE_ARTIFACT_FIELDS.length}`);
    }
    for (const f of RUNTIME_EVIDENCE_ARTIFACT_FIELDS) {
      if (!result[f] || String(result[f]).trim() === '') errors.push(`SEALED requires ${f}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function renderControlledRuntimeEvidencePackage(result) {
  if (!result || typeof result !== 'object') {
    return '[CONTROLLED_RUNTIME_EVIDENCE_PACKAGE] No result to render.';
  }
  const lines = [
    `=== Controlled Runtime Evidence Package [${SCHEMA_VERSION}] ===`,
    `Status:               ${result.evidence_package_status ?? 'N/A'}`,
    `Package ID:           ${result.package_id ?? 'N/A'}`,
    `Package complete:     ${result.package_complete}`,
    `Artifacts:            ${result.artifact_count ?? 0} / ${RUNTIME_EVIDENCE_ARTIFACT_FIELDS.length}`,
    `--- Artifact IDs ---`,
    `contract_id:          ${result.contract_id ?? 'N/A'}`,
    `dry_run_id:           ${result.dry_run_id ?? 'N/A'}`,
    `plan_id:              ${result.plan_id ?? 'N/A'}`,
    `rollback_binding_id:  ${result.rollback_binding_id ?? 'N/A'}`,
    `snapshot_id:          ${result.snapshot_id ?? 'N/A'}`,
    `proof_receipt_id:     ${result.proof_receipt_id ?? 'N/A'}`,
    `--- REGRA ABSOLUTA ---`,
    `package_sealed=true | execution_performed=false | stable_promoted=false`,
  ];
  if (result.blocked_reason) lines.splice(2, 0, `Blocked reason:       ${result.blocked_reason}`);
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('controlled-runtime-evidence-package.mjs')) {
  const showJson = process.argv.includes('--json');
  const result = buildControlledRuntimeEvidencePackage({
    package_id:          'v154.1-package',
    contract_id:         'v151.0-contract',
    dry_run_id:          'v152.0-dry-run',
    plan_id:             'v152.1-plan',
    rollback_binding_id: 'v153.0-binding',
    snapshot_id:         'v153.1-snapshot',
    proof_receipt_id:    'v154.0-receipt',
  });
  if (showJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderControlledRuntimeEvidencePackage(result));
  }
  const v = validateControlledRuntimeEvidencePackage(result);
  if (!v.valid) {
    process.stderr.write(`Validation failed: ${v.errors.join(', ')}\n`);
    process.exit(1);
  }
}
