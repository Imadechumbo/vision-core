#!/usr/bin/env node
/**
 * Runtime Evidence CI Contract — V29.0
 *
 * Validates that a CI environment meets all prerequisites for runtime
 * evidence collection. Checks environment signals, required variables,
 * and gates absence of fake/stub evidence.
 *
 * REGRA ABSOLUTA:
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 * - ci_contract_enforced=true when CI_RUNTIME_EVIDENCE_CONTRACT=1.
 * - ci_contract_skipped=true when not in CI or contract not enforced.
 */

const SCHEMA_VERSION = 'v29.0';

export const CI_CONTRACT_STATUSES = [
  'CI_CONTRACT_SKIPPED',
  'CI_CONTRACT_BLOCKED_ENV',
  'CI_CONTRACT_BLOCKED_STUB',
  'CI_CONTRACT_BLOCKED_RECEIPT',
  'CI_CONTRACT_READY',
];

// Required env variables when CI contract is enforced
const REQUIRED_CI_VARS = [
  'CI',
  'GITHUB_RUN_ID',
  'GITHUB_SHA',
];

// Stub/fake markers that invalidate CI evidence
const STUB_MARKERS = ['stub', 'mock', 'fake', 'dummy', 'test-only', 'dry-run', 'placeholder'];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function _blocked(status, extra = {}) {
  return {
    schema_version:        SCHEMA_VERSION,
    ci_contract_status:    status,
    ci_contract_valid:     false,
    ci_contract_enforced:  extra.ci_contract_enforced ?? false,
    ci_contract_skipped:   status === 'CI_CONTRACT_SKIPPED',
    missing_vars:          extra.missing_vars ?? [],
    stub_detected:         extra.stub_detected ?? false,
    blocking_reason:       extra.blocking_reason ?? 'blocked',
    deploy_allowed:        false,
    promotion_allowed:     false,
    stable_allowed:        false,
    ...extra,
  };
}

function _detectStubInValue(value) {
  if (typeof value !== 'string') return false;
  const lower = value.toLowerCase();
  return STUB_MARKERS.some(m => lower.includes(m));
}

// ═══════════════════════════════════════════════════════════════════
// CORE FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Validates CI environment runtime evidence contract.
 *
 * @param {Object}  options
 * @param {boolean} options.enforce              - Enforce contract (default: auto-detect from env)
 * @param {Object}  options.env                  - Environment variables (default: process.env)
 * @param {Object|null} options.runtime_evidence - Runtime evidence to validate (optional)
 * @param {Object|null} options.go_core_receipt  - Go Core receipt to validate (optional)
 * @param {boolean} options.allow_skip           - Allow skip when not in CI (default: true)
 * @returns {Object} Contract validation result
 */
export function validateRuntimeEvidenceCIContract(options = {}) {
  const {
    enforce         = null,
    env             = process.env,
    runtime_evidence = null,
    go_core_receipt  = null,
    allow_skip       = true,
  } = options;

  // Determine if contract is enforced
  const isCI       = env.CI === 'true' || env.CI === '1';
  const contractOn = env.CI_RUNTIME_EVIDENCE_CONTRACT === '1' || env.CI_RUNTIME_EVIDENCE_CONTRACT === 'true';
  const enforced   = enforce !== null ? Boolean(enforce) : (isCI && contractOn);

  // If not enforced and skip allowed → SKIPPED (safe default)
  if (!enforced && allow_skip) {
    return {
      schema_version:       SCHEMA_VERSION,
      ci_contract_status:   'CI_CONTRACT_SKIPPED',
      ci_contract_valid:    false,
      ci_contract_enforced: false,
      ci_contract_skipped:  true,
      missing_vars:         [],
      stub_detected:        false,
      blocking_reason:      null,
      is_ci:                isCI,
      deploy_allowed:       false,
      promotion_allowed:    false,
      stable_allowed:       false,
    };
  }

  // Gate 1: required CI env vars must be present
  const missingVars = REQUIRED_CI_VARS.filter(v => !env[v]);
  if (missingVars.length > 0) {
    return _blocked('CI_CONTRACT_BLOCKED_ENV', {
      ci_contract_enforced: enforced,
      missing_vars:         missingVars,
      blocking_reason:      `missing_ci_vars:${missingVars.join(',')}`,
      is_ci:                isCI,
    });
  }

  // Gate 2: stub/fake detection in runtime evidence (scan values only, not keys)
  if (runtime_evidence) {
    const { mission_id: _omit, ...evidenceRest } = runtime_evidence;
    const valueText = Object.values(evidenceRest)
      .filter(v => typeof v === 'string')
      .join(' ')
      .toLowerCase();
    const hasStub = STUB_MARKERS.some(m => valueText.includes(m));
    if (hasStub || runtime_evidence.backend_stub === true) {
      return _blocked('CI_CONTRACT_BLOCKED_STUB', {
        ci_contract_enforced: enforced,
        stub_detected:        true,
        blocking_reason:      'stub_evidence_detected',
        is_ci:                isCI,
      });
    }
  }

  // Gate 3: receipt must be valid and from go-core
  if (go_core_receipt !== null && go_core_receipt !== undefined) {
    if (!go_core_receipt.receipt_valid || go_core_receipt.source !== 'go-core') {
      return _blocked('CI_CONTRACT_BLOCKED_RECEIPT', {
        ci_contract_enforced: enforced,
        blocking_reason:      'receipt_invalid_or_not_go_core',
        is_ci:                isCI,
        receipt_valid:        go_core_receipt.receipt_valid ?? false,
        receipt_source:       go_core_receipt.source ?? null,
      });
    }
    // Check receipt value for stubs
    if (_detectStubInValue(go_core_receipt.receipt_id)) {
      return _blocked('CI_CONTRACT_BLOCKED_STUB', {
        ci_contract_enforced: enforced,
        stub_detected:        true,
        blocking_reason:      'stub_receipt_id_detected',
        is_ci:                isCI,
      });
    }
  }

  // All gates passed → CI_CONTRACT_READY
  return {
    schema_version:       SCHEMA_VERSION,
    ci_contract_status:   'CI_CONTRACT_READY',
    ci_contract_valid:    true,
    ci_contract_enforced: enforced,
    ci_contract_skipped:  false,
    missing_vars:         [],
    stub_detected:        false,
    blocking_reason:      null,
    is_ci:                isCI,
    ci_run_id:            env.GITHUB_RUN_ID ?? null,
    ci_sha:               env.GITHUB_SHA ?? null,
    runtime_evidence_present: runtime_evidence !== null && runtime_evidence !== undefined,
    receipt_present:          go_core_receipt !== null && go_core_receipt !== undefined,
    deploy_allowed:       false,
    promotion_allowed:    false,
    stable_allowed:       false,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('runtime-evidence-ci-contract.mjs')) {
  const args    = process.argv.slice(2);
  const json    = args.includes('--json');
  const enforce = args.includes('--enforce');

  const result = validateRuntimeEvidenceCIContract({
    enforce: enforce ? true : null,
  });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`ci_contract_status   : ${result.ci_contract_status}`);
    console.log(`ci_contract_valid    : ${result.ci_contract_valid}`);
    console.log(`ci_contract_enforced : ${result.ci_contract_enforced}`);
    console.log(`ci_contract_skipped  : ${result.ci_contract_skipped}`);
    console.log(`deploy_allowed       : ${result.deploy_allowed}`);
    console.log(`promotion_allowed    : ${result.promotion_allowed}`);
  }

  process.exit(result.ci_contract_valid || result.ci_contract_skipped ? 0 : 1);
}
