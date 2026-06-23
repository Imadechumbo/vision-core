#!/usr/bin/env node
/**
 * Controlled GitHub Release Tag Controller — V16.1
 *
 * Controls GitHub release tag creation with strict precondition checks.
 * Default mode: --dry-run. Real execution requires explicit flags.
 *
 * REGRA ABSOLUTA:
 * - tag_created=false always in this automation.
 * - TAG_EXECUTION_BLOCKED_BY_AUTOMATION fires when --execute is passed.
 * - Never tag if: branch != main, git dirty, no evidence, no authority,
 *   tests not confirmed.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v16.1';

// ═══════════════════════════════════════════════════════════════════
// TAG STATUS CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const TAG_STATUSES = [
  'TAG_BLOCKED_BRANCH',                  // not on main branch
  'TAG_BLOCKED_GIT_DIRTY',               // working tree has uncommitted changes
  'TAG_BLOCKED_EVIDENCE',                // evidence receipt missing or invalid
  'TAG_BLOCKED_AUTHORITY',               // authority binding not ready
  'TAG_BLOCKED_TESTS',                   // tests not confirmed passed
  'TAG_DRY_RUN_READY',                   // dry-run classification — tag would be valid
  'TAG_EXECUTION_BLOCKED_BY_AUTOMATION', // --execute present but blocked in automation
];

const REQUIRED_EXECUTION_FLAGS = [
  '--execute',
  '--confirm-pass-gold-real',
  '--confirm-authority-binding',
  '--confirm-release-plan',
  '--confirm-rollback-plan',
  '--confirm-no-deploy',
];

// ═══════════════════════════════════════════════════════════════════
// EVALUATE TAG CONTROLLER
// ═══════════════════════════════════════════════════════════════════

/**
 * @param {Object} input
 * @param {string}  input.branch            - Current branch (must be 'main' for real tag)
 * @param {boolean} input.gitClean          - Working tree clean
 * @param {Object}  input.evidenceReceipt   - { id, source } — must be go-core
 * @param {Object}  input.authorityBinding  - { status, contract_id }
 * @param {Object}  input.testResults       - { quickPass, fullPass, goPass }
 * @param {string}  input.tagName           - Desired tag name (e.g. 'v16.1.0')
 * @param {string}  input.gitHead           - Current git HEAD SHA
 * @param {boolean} input.dryRun            - true = dry-run only (default true)
 * @param {Object}  input.executionFlags    - Flags for real execution
 */
function evaluateTagController(input = {}) {
  const {
    branch           = null,
    gitClean         = false,
    evidenceReceipt  = null,
    authorityBinding = null,
    testResults      = null,
    tagName          = null,
    gitHead          = null,
    dryRun           = true,
    executionFlags   = {},
  } = input;

  const ef = executionFlags || {};

  // ── Evaluate preconditions ───────────────────────────────────────
  const onMain       = branch === 'main';
  const evidenceOk   = !!(evidenceReceipt?.id) && evidenceReceipt?.source === 'go-core';
  const authorityOk  = authorityBinding?.status === 'BINDING_READY';
  const testsOk      = testResults?.quickPass === true
                       && testResults?.fullPass === true
                       && testResults?.goPass   === true;
  const executeRequested = ef.execute === true;

  // ── Collect blockers ─────────────────────────────────────────────
  const blockers = [];
  if (!onMain)      blockers.push('MUST_BE_ON_MAIN_BRANCH');
  if (!gitClean)    blockers.push('GIT_TREE_MUST_BE_CLEAN');
  if (!evidenceOk)  blockers.push('EVIDENCE_MISSING_OR_INVALID');
  if (!authorityOk) blockers.push('AUTHORITY_BINDING_NOT_READY');
  if (!testsOk)     blockers.push('TESTS_NOT_CONFIRMED_PASSED');

  // ── Determine tag status ─────────────────────────────────────────
  let tagStatus;
  if (!onMain) {
    tagStatus = 'TAG_BLOCKED_BRANCH';
  } else if (!gitClean) {
    tagStatus = 'TAG_BLOCKED_GIT_DIRTY';
  } else if (!evidenceOk) {
    tagStatus = 'TAG_BLOCKED_EVIDENCE';
  } else if (!authorityOk) {
    tagStatus = 'TAG_BLOCKED_AUTHORITY';
  } else if (!testsOk) {
    tagStatus = 'TAG_BLOCKED_TESTS';
  } else if (executeRequested) {
    tagStatus = 'TAG_EXECUTION_BLOCKED_BY_AUTOMATION';
  } else {
    tagStatus = 'TAG_DRY_RUN_READY';
  }

  const dryRunReady = tagStatus === 'TAG_DRY_RUN_READY';
  const tagAllowed  = dryRunReady;

  return {
    schema_version:  SCHEMA_VERSION,
    tag_controller_id: _buildId(gitHead, branch),
    tag_status:      tagStatus,
    tag_dry_run:     dryRun !== false,
    tag_name:        tagName || null,
    tag_allowed:     tagAllowed,
    tag_created:     false,
    tag_blockers:    blockers,
    created_at:      new Date().toISOString(),
    git_head:        gitHead,
    branch:          branch,

    inputs_evaluated: {
      on_main_branch:          onMain,
      git_clean:               gitClean,
      evidence_receipt_id:     evidenceReceipt?.id     || null,
      evidence_source:         evidenceReceipt?.source || null,
      authority_binding_status: authorityBinding?.status || null,
      authority_contract_id:   authorityBinding?.contract_id || null,
      tests_quick_pass:        testResults?.quickPass  || false,
      tests_full_pass:         testResults?.fullPass   || false,
      tests_go_pass:           testResults?.goPass     || false,
    },

    execution_flags_present: {
      execute:                    ef.execute                 === true,
      confirm_pass_gold_real:     ef.confirmPassGoldReal     === true,
      confirm_authority_binding:  ef.confirmAuthorityBinding === true,
      confirm_release_plan:       ef.confirmReleasePlan      === true,
      confirm_rollback_plan:      ef.confirmRollbackPlan     === true,
      confirm_no_deploy:          ef.confirmNoDeploy         === true,
    },

    required_execution_flags: REQUIRED_EXECUTION_FLAGS,

    // Explicit invariants — always false
    deploy_performed:   false,
    deploy_allowed:     false,
    stable_allowed:     false,
    stable_promoted:    false,
    release_performed:  false,
    promotion_allowed:  false,

    note: 'Tag controller is dry-run classification only — tag_created=false always in V16.1 automation',
  };
}

function _buildId(gitHead, branch) {
  const nonce = Math.random().toString(36).slice(2, 10);
  const raw   = `${gitHead || 'unknown'}:${branch || 'unknown'}:${Date.now()}:${nonce}`;
  return `tagctrl_${createHash('sha256').update(raw).digest('hex').slice(0, 12)}`;
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRYPOINT
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('github-release-tag-controller.mjs')) {
  _runCLI();
}

function _parseCLIArgs(argv) {
  const args  = argv.slice(2);
  const flags = {
    dryRun: true, json: false, branch: null, gitClean: false,
    evidenceReceiptId: null, evidenceSource: null,
    authorityBindingReady: false, authorityContractId: null,
    testsQuickPass: false, testsFullPass: false, testsGoPass: false,
    tagName: null, gitHead: null,
    execute: false, confirmPassGoldReal: false, confirmAuthorityBinding: false,
    confirmReleasePlan: false, confirmRollbackPlan: false, confirmNoDeploy: false,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    switch (a) {
      case '--dry-run':                  flags.dryRun               = true;  break;
      case '--json':                     flags.json                 = true;  break;
      case '--git-clean':               flags.gitClean             = true;  break;
      case '--authority-binding-ready': flags.authorityBindingReady = true; break;
      case '--tests-quick-pass':        flags.testsQuickPass       = true;  break;
      case '--tests-full-pass':         flags.testsFullPass        = true;  break;
      case '--tests-go-pass':           flags.testsGoPass          = true;  break;
      case '--execute':                 flags.execute              = true;  break;
      case '--confirm-pass-gold-real':  flags.confirmPassGoldReal  = true;  break;
      case '--confirm-authority-binding': flags.confirmAuthorityBinding = true; break;
      case '--confirm-release-plan':    flags.confirmReleasePlan   = true;  break;
      case '--confirm-rollback-plan':   flags.confirmRollbackPlan  = true;  break;
      case '--confirm-no-deploy':       flags.confirmNoDeploy      = true;  break;
      case '--branch':                  flags.branch               = args[++i] || null; break;
      case '--evidence-receipt-id':     flags.evidenceReceiptId    = args[++i] || null; break;
      case '--evidence-source':         flags.evidenceSource       = args[++i] || null; break;
      case '--authority-contract-id':   flags.authorityContractId  = args[++i] || null; break;
      case '--tag-name':                flags.tagName              = args[++i] || null; break;
      case '--git-head':                flags.gitHead              = args[++i] || null; break;
      default: break;
    }
  }
  return flags;
}

function _runCLI() {
  const flags = _parseCLIArgs(process.argv);
  const result = evaluateTagController({
    branch:           flags.branch,
    gitClean:         flags.gitClean,
    evidenceReceipt:  flags.evidenceReceiptId ? { id: flags.evidenceReceiptId, source: flags.evidenceSource } : null,
    authorityBinding: flags.authorityBindingReady ? { status: 'BINDING_READY', contract_id: flags.authorityContractId } : null,
    testResults:      { quickPass: flags.testsQuickPass, fullPass: flags.testsFullPass, goPass: flags.testsGoPass },
    tagName:          flags.tagName,
    gitHead:          flags.gitHead,
    dryRun:           flags.dryRun,
    executionFlags: {
      execute: flags.execute, confirmPassGoldReal: flags.confirmPassGoldReal,
      confirmAuthorityBinding: flags.confirmAuthorityBinding,
      confirmReleasePlan: flags.confirmReleasePlan, confirmRollbackPlan: flags.confirmRollbackPlan,
      confirmNoDeploy: flags.confirmNoDeploy,
    },
  });
  if (flags.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else {
    process.stdout.write(`tag_status: ${result.tag_status}\ntag_created: ${result.tag_created}\n`);
    if (result.tag_blockers.length) process.stdout.write(`blockers: ${result.tag_blockers.join(', ')}\n`);
  }
  process.exit(result.tag_allowed ? 0 : 2);
}

export {
  evaluateTagController,
  TAG_STATUSES,
  REQUIRED_EXECUTION_FLAGS as TAG_REQUIRED_EXECUTION_FLAGS,
  SCHEMA_VERSION as TAG_SCHEMA_VERSION,
};
