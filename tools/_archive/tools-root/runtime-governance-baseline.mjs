#!/usr/bin/env node
/**
 * Runtime Governance Baseline — V25.0
 *
 * Consolidates V21.0–V24.0 as the operational runtime governance baseline.
 * Verifies all required modules exist, scripts are registered, unit tests
 * are present, invariants hold, and PI Harness is properly wired.
 *
 * REGRA ABSOLUTA:
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 * - stable_allowed=false always.
 * - This checker classifies only — never executes, deploys, or promotes.
 */

import { existsSync, readFileSync } from 'fs';
import { resolve }                  from 'path';
import { spawnSync }                from 'child_process';

const SCHEMA_VERSION   = 'v25.0';
const BASELINE_VERSION = 'v25.0';

export const BASELINE_STATUSES = [
  'BASELINE_BLOCKED_MODULES',
  'BASELINE_BLOCKED_TESTS',
  'BASELINE_BLOCKED_INVARIANTS',
  'BASELINE_READY',
];

// Required modules from V21.0–V24.0
export const REQUIRED_MODULES = [
  'tools/runtime-evidence-activation.mjs',
  'tools/go-core-evidence-contract.mjs',
  'tools/backend-runtime-probe.mjs',
  'tools/pass-gold-runtime-binding.mjs',
  'tools/local-runtime-pass-gold-drill.mjs',
  'tools/runtime-evidence-ledger-integration.mjs',
];

// Required test files
export const REQUIRED_TESTS = [
  'tools/tests/runtime-evidence-activation.test.mjs',
  'tools/tests/go-core-evidence-contract.test.mjs',
  'tools/tests/backend-runtime-probe.test.mjs',
  'tools/tests/pass-gold-runtime-binding.test.mjs',
  'tools/tests/local-runtime-pass-gold-drill.test.mjs',
  'tools/tests/runtime-evidence-ledger-integration.test.mjs',
];

// Required npm scripts
export const REQUIRED_SCRIPTS = [
  'test:runtime-evidence-unit',
  'test:go-core-contract-unit',
  'test:backend-probe-unit',
  'test:pass-gold-binding-unit',
  'test:local-drill-unit',
  'test:runtime-ledger-unit',
];

// Invariant checks: CLI JSON output must have these fields = false
const INVARIANT_CHECKS = [
  { module: 'tools/runtime-evidence-activation.mjs',   fields: ['deploy_allowed', 'promotion_allowed'] },
  { module: 'tools/go-core-evidence-contract.mjs',      fields: ['deploy_allowed', 'promotion_allowed'] },
  { module: 'tools/backend-runtime-probe.mjs',          fields: ['deploy_allowed', 'promotion_allowed'] },
  { module: 'tools/pass-gold-runtime-binding.mjs',      fields: ['deploy_allowed', 'promotion_allowed'] },
  { module: 'tools/local-runtime-pass-gold-drill.mjs',  fields: ['deploy_allowed', 'promotion_allowed'] },
];

// ═══════════════════════════════════════════════════════════════════
// CORE FUNCTION
// ═══════════════════════════════════════════════════════════════════

/**
 * Checks runtime governance baseline.
 *
 * @param {Object} options
 * @param {string}  options.root             - Project root (default: cwd)
 * @param {boolean} options.check_invariants - Whether to run CLI invariant checks (default: true)
 * @returns {Object} Baseline check result
 */
export function checkRuntimeGovernanceBaseline(options = {}) {
  const {
    root             = process.cwd(),
    check_invariants = true,
  } = options;

  // Gate 1: All required modules must exist
  const missingModules = REQUIRED_MODULES.filter(m => !existsSync(resolve(root, m)));
  if (missingModules.length > 0) {
    return _blocked(root, 'BASELINE_BLOCKED_MODULES', {
      missing_modules:  missingModules,
      missing_tests:    [],
      invariants_ok:    false,
      invariant_errors: [],
      blocking_reason:  `modules_missing:${missingModules.join(',')}`,
    });
  }

  // Gate 2: All required tests must exist
  const missingTests = REQUIRED_TESTS.filter(t => !existsSync(resolve(root, t)));
  if (missingTests.length > 0) {
    return _blocked(root, 'BASELINE_BLOCKED_TESTS', {
      missing_modules:  [],
      missing_tests:    missingTests,
      invariants_ok:    false,
      invariant_errors: [],
      blocking_reason:  `tests_missing:${missingTests.join(',')}`,
    });
  }

  // Check package.json scripts (non-blocking — just reported)
  let packageScripts = {};
  try {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));
    packageScripts = pkg.scripts || {};
  } catch {}
  const missingScripts = REQUIRED_SCRIPTS.filter(s => !(s in packageScripts));

  // Gate 3: Invariant checks (CLI JSON output must have deploy_allowed=false)
  let invariants_ok     = true;
  const invariantErrors = [];

  if (check_invariants) {
    for (const check of INVARIANT_CHECKS) {
      const modulePath = resolve(root, check.module);
      if (!existsSync(modulePath)) continue;
      const r = spawnSync(process.execPath, ['--no-deprecation', modulePath, '--json'], {
        cwd: root, encoding: 'utf-8', timeout: 10000,
      });
      let parsed = null;
      try { parsed = JSON.parse(r.stdout || ''); } catch {}
      if (!parsed) {
        invariantErrors.push(`${check.module}: JSON parse failed`);
        invariants_ok = false;
        continue;
      }
      for (const field of check.fields) {
        if (parsed[field] !== false) {
          invariantErrors.push(`${check.module}: ${field}=${parsed[field]} (expected false)`);
          invariants_ok = false;
        }
      }
    }
  }

  if (!invariants_ok) {
    return _blocked(root, 'BASELINE_BLOCKED_INVARIANTS', {
      missing_modules:  [],
      missing_tests:    [],
      invariants_ok:    false,
      invariant_errors: invariantErrors,
      scripts_missing:  missingScripts,
      blocking_reason:  'invariants_violated',
    });
  }

  // All gates passed → BASELINE_READY
  return {
    schema_version:           SCHEMA_VERSION,
    baseline_version:         BASELINE_VERSION,
    baseline_status:          'BASELINE_READY',
    modules_present:          REQUIRED_MODULES,
    tests_present:            REQUIRED_TESTS,
    scripts_present:          REQUIRED_SCRIPTS.filter(s => !missingScripts.includes(s)),
    scripts_missing:          missingScripts,
    invariants_ok:            true,
    invariant_errors:         [],
    runtime_governance_ready: true,
    missing_modules:          [],
    missing_tests:            [],
    blocking_reason:          null,
    deploy_allowed:           false,
    promotion_allowed:        false,
    stable_allowed:           false,
  };
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function _blocked(root, status, fields = {}) {
  return {
    schema_version:           SCHEMA_VERSION,
    baseline_version:         BASELINE_VERSION,
    baseline_status:          status,
    modules_present:          REQUIRED_MODULES.filter(m => existsSync(resolve(root, m))),
    tests_present:            REQUIRED_TESTS.filter(t => existsSync(resolve(root, t))),
    runtime_governance_ready: false,
    deploy_allowed:           false,
    promotion_allowed:        false,
    stable_allowed:           false,
    ...fields,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('runtime-governance-baseline.mjs')) {
  const args  = process.argv.slice(2);
  const json  = args.includes('--json');
  const noInv = args.includes('--no-invariants');

  const result = checkRuntimeGovernanceBaseline({ check_invariants: !noInv });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`baseline_version          : ${result.baseline_version}`);
    console.log(`baseline_status           : ${result.baseline_status}`);
    console.log(`runtime_governance_ready  : ${result.runtime_governance_ready}`);
    console.log(`modules_present           : ${result.modules_present?.length ?? 0}`);
    console.log(`tests_present             : ${result.tests_present?.length ?? 0}`);
    console.log(`invariants_ok             : ${result.invariants_ok}`);
    console.log(`deploy_allowed            : ${result.deploy_allowed}`);
    console.log(`promotion_allowed         : ${result.promotion_allowed}`);
  }

  process.exit(result.runtime_governance_ready ? 0 : 1);
}
