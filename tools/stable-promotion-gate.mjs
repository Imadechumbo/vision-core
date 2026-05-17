#!/usr/bin/env node
/**
 * Stable Promotion Gate — V16.2
 *
 * Gate for stable branch promotion. Classifies readiness only.
 * stable_promoted=false always — this gate never promotes.
 *
 * REGRA ABSOLUTA:
 * - stable_promoted=false always.
 * - stable_allowed is readiness classification, not execution.
 * - No automatic stable promotion.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v16.2';

const GATE_STATUSES = [
  'STABLE_BLOCKED_NO_TAG',            // release tag not validated
  'STABLE_BLOCKED_NO_ROLLBACK',       // rollback drill not passed
  'STABLE_BLOCKED_NO_AUTHORITY',      // stable promotion authority missing
  'STABLE_BLOCKED_NO_LEDGER',         // evidence ledger not updated
  'STABLE_READY_MANUAL_PROMOTION',    // all conditions met — human may promote
];

/**
 * @param {Object} input
 * @param {Object}  input.tagValidation     - { tag_status, tag_name, tag_allowed }
 * @param {Object}  input.rollbackDrill     - { rollback_drill_status, rollback_ready }
 * @param {Object}  input.authorityBinding  - { status, contract_id }
 * @param {Object}  input.ledgerEvidence    - { ledger_updated, last_event_type }
 * @param {boolean} input.manualApproval    - Explicit human approval present
 * @param {string}  input.gitHead
 * @param {string}  input.branch
 */
function evaluateStablePromotionGate(input = {}) {
  const {
    tagValidation    = null,
    rollbackDrill    = null,
    authorityBinding = null,
    ledgerEvidence   = null,
    manualApproval   = false,
    gitHead          = null,
    branch           = null,
  } = input;

  const tagOk      = tagValidation?.tag_allowed === true || tagValidation?.tag_status === 'TAG_DRY_RUN_READY';
  const rollbackOk = rollbackDrill?.rollback_ready === true
                     || rollbackDrill?.rollback_drill_status === 'ROLLBACK_DRY_RUN_READY'
                     || rollbackDrill?.rollback_drill_status === 'ROLLBACK_LOCAL_DRILL_PASS';
  const authorityOk = authorityBinding?.status === 'BINDING_READY';
  const ledgerOk    = ledgerEvidence?.ledger_updated === true;

  const blockers = [];
  if (!tagOk)       blockers.push('TAG_NOT_VALIDATED');
  if (!rollbackOk)  blockers.push('ROLLBACK_DRILL_NOT_PASSED');
  if (!authorityOk) blockers.push('STABLE_AUTHORITY_NOT_READY');
  if (!ledgerOk)    blockers.push('LEDGER_NOT_UPDATED');

  let gateStatus;
  if (!tagOk)       gateStatus = 'STABLE_BLOCKED_NO_TAG';
  else if (!rollbackOk) gateStatus = 'STABLE_BLOCKED_NO_ROLLBACK';
  else if (!authorityOk) gateStatus = 'STABLE_BLOCKED_NO_AUTHORITY';
  else if (!ledgerOk)    gateStatus = 'STABLE_BLOCKED_NO_LEDGER';
  else                   gateStatus = 'STABLE_READY_MANUAL_PROMOTION';

  const gateReady    = gateStatus === 'STABLE_READY_MANUAL_PROMOTION';
  const stableAllowed = gateReady;

  return {
    schema_version:        SCHEMA_VERSION,
    stable_gate_id:        _buildId(gitHead, branch),
    stable_gate_status:    gateStatus,
    stable_gate_ready:     gateReady,
    stable_gate_blockers:  blockers,
    stable_allowed:        stableAllowed,
    stable_promoted:       false,
    created_at:            new Date().toISOString(),
    git_head:              gitHead,
    branch:                branch,

    inputs_evaluated: {
      tag_status:              tagValidation?.tag_status      || null,
      tag_allowed:             tagValidation?.tag_allowed     || false,
      rollback_drill_status:   rollbackDrill?.rollback_drill_status || null,
      rollback_ready:          rollbackDrill?.rollback_ready  || false,
      authority_binding_status: authorityBinding?.status      || null,
      authority_contract_id:   authorityBinding?.contract_id || null,
      ledger_updated:          ledgerEvidence?.ledger_updated || false,
      manual_approval:         manualApproval === true,
    },

    deploy_performed:   false,
    deploy_allowed:     false,
    tag_created:        false,
    release_performed:  false,
    promotion_allowed:  stableAllowed,

    note: 'Stable promotion gate is readiness classification only — stable_promoted=false always in V16.2',
  };
}

function _buildId(gitHead, branch) {
  const nonce = Math.random().toString(36).slice(2, 10);
  const raw   = `${gitHead || 'unknown'}:${branch || 'unknown'}:${Date.now()}:${nonce}`;
  return `stablegate_${createHash('sha256').update(raw).digest('hex').slice(0, 12)}`;
}

if (process.argv[1] && process.argv[1].endsWith('stable-promotion-gate.mjs')) {
  _runCLI();
}

function _runCLI() {
  const args  = process.argv.slice(2);
  const flags = { json: false, tagAllowed: false, rollbackReady: false, authorityReady: false, ledgerUpdated: false };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--json':              flags.json           = true; break;
      case '--tag-allowed':       flags.tagAllowed     = true; break;
      case '--rollback-ready':    flags.rollbackReady  = true; break;
      case '--authority-ready':   flags.authorityReady = true; break;
      case '--ledger-updated':    flags.ledgerUpdated  = true; break;
      default: break;
    }
  }
  const result = evaluateStablePromotionGate({
    tagValidation:    { tag_allowed: flags.tagAllowed, tag_status: flags.tagAllowed ? 'TAG_DRY_RUN_READY' : null },
    rollbackDrill:    { rollback_ready: flags.rollbackReady, rollback_drill_status: flags.rollbackReady ? 'ROLLBACK_DRY_RUN_READY' : null },
    authorityBinding: flags.authorityReady ? { status: 'BINDING_READY', contract_id: 'cli_contract' } : null,
    ledgerEvidence:   { ledger_updated: flags.ledgerUpdated },
  });
  if (flags.json) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  else process.stdout.write(`stable_gate_status: ${result.stable_gate_status}\nstable_promoted: ${result.stable_promoted}\n`);
  process.exit(result.stable_gate_ready ? 0 : 2);
}

export {
  evaluateStablePromotionGate,
  GATE_STATUSES as STABLE_GATE_STATUSES,
  SCHEMA_VERSION as STABLE_SCHEMA_VERSION,
};
