#!/usr/bin/env node
/**
 * Runtime Evidence Ledger Integration — V23.0
 *
 * Registers runtime evidence events into the append-only release audit ledger.
 * Preserves hash chain integrity. No secrets/tokens stored.
 * Event types: RUNTIME_EVIDENCE_COLLECTED, GO_CORE_RECEIPT_VALIDATED,
 *              PASS_GOLD_RUNTIME_BOUND, LOCAL_PASS_GOLD_DRILL_EXECUTED.
 *
 * REGRA ABSOLUTA:
 * - Ledger is append-only. Never modifies existing entries.
 * - No secrets, no tokens in ledger.
 * - Ledger never creates deploy, tag, or stable promotion.
 * - deploy_allowed=false always.
 * - promotion_allowed=false always.
 */

import { ReleaseLedger, validateLedgerChain, readLedger } from './release-audit-ledger.mjs';

const SCHEMA_VERSION = 'v23.0';

export const RUNTIME_LEDGER_EVENTS = [
  'RUNTIME_EVIDENCE_COLLECTED',
  'GO_CORE_RECEIPT_VALIDATED',
  'PASS_GOLD_RUNTIME_BOUND',
  'LOCAL_PASS_GOLD_DRILL_EXECUTED',
];

// ═══════════════════════════════════════════════════════════════════
// INTEGRATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Appends a RUNTIME_EVIDENCE_COLLECTED event to the ledger.
 *
 * @param {Object} params
 * @param {string}      params.ledgerPath         - Path to ledger file
 * @param {string}      params.actor              - Who collected the evidence
 * @param {string|null} params.gitHead
 * @param {string|null} params.branch
 * @param {Object}      params.runtimeEvidenceResult - Output of activateRuntimeEvidence()
 * @returns {Object} Appended event
 */
export function appendRuntimeEvidenceCollected({ ledgerPath, actor = 'system', gitHead = null, branch = null, runtimeEvidenceResult = {} } = {}) {
  const ledger = new ReleaseLedger(ledgerPath);
  return ledger.appendEvent({
    eventType:     'RUNTIME_EVIDENCE_COLLECTED',
    actor,
    gitHead,
    branch,
    evidenceRefs:  {
      mission_id:          runtimeEvidenceResult.mission_id          || null,
      evidence_receipt_id: runtimeEvidenceResult.evidence_receipt_id || null,
      evidence_source:     runtimeEvidenceResult.evidence_source     || null,
    },
    authorityRefs: {},
    payload: {
      runtime_evidence_status: runtimeEvidenceResult.runtime_evidence_status || null,
      runtime_evidence_ready:  runtimeEvidenceResult.runtime_evidence_ready  || false,
      backend_alive:           runtimeEvidenceResult.backend_alive           || false,
      backend_stub:            runtimeEvidenceResult.backend_stub            !== false,
      deploy_allowed:          false,
      promotion_allowed:       false,
    },
  });
}

/**
 * Appends a GO_CORE_RECEIPT_VALIDATED event to the ledger.
 */
export function appendGoCorReceiptValidated({ ledgerPath, actor = 'system', gitHead = null, branch = null, receiptResult = {} } = {}) {
  const ledger = new ReleaseLedger(ledgerPath);
  return ledger.appendEvent({
    eventType:    'GO_CORE_RECEIPT_VALIDATED',
    actor,
    gitHead,
    branch,
    evidenceRefs: {
      receipt_id:  receiptResult.receipt_id  || null,
      mission_id:  receiptResult.mission_id  || null,
      source:      receiptResult.source      || null,
    },
    authorityRefs: {},
    payload: {
      receipt_status:   receiptResult.receipt_status  || null,
      receipt_valid:    receiptResult.receipt_valid   || false,
      hash_verified:    receiptResult.hash_verified   || false,
      deploy_allowed:   false,
      promotion_allowed: false,
    },
  });
}

/**
 * Appends a PASS_GOLD_RUNTIME_BOUND event to the ledger.
 */
export function appendPassGoldRuntimeBound({ ledgerPath, actor = 'system', gitHead = null, branch = null, bindingResult = {} } = {}) {
  const ledger = new ReleaseLedger(ledgerPath);
  return ledger.appendEvent({
    eventType:    'PASS_GOLD_RUNTIME_BOUND',
    actor,
    gitHead,
    branch,
    evidenceRefs: {
      mission_id:          bindingResult.mission_id          || null,
      evidence_receipt_id: bindingResult.evidence_receipt_id || null,
      evidence_source:     bindingResult.evidence_source     || null,
    },
    authorityRefs: {},
    payload: {
      binding_status:                  bindingResult.pass_gold_runtime_binding_status || null,
      binding_valid:                   bindingResult.pass_gold_runtime_binding_valid  || false,
      pass_gold_candidate_allowed:     bindingResult.pass_gold_candidate_allowed      || false,
      deploy_allowed:                  false,
      promotion_allowed:               false,
    },
  });
}

/**
 * Appends a LOCAL_PASS_GOLD_DRILL_EXECUTED event to the ledger.
 */
export function appendLocalPassGoldDrillExecuted({ ledgerPath, actor = 'system', gitHead = null, branch = null, drillResult = {} } = {}) {
  const ledger = new ReleaseLedger(ledgerPath);
  return ledger.appendEvent({
    eventType:    'LOCAL_PASS_GOLD_DRILL_EXECUTED',
    actor,
    gitHead,
    branch,
    evidenceRefs: {
      mission_id:          drillResult.mission_id          || null,
      evidence_receipt_id: drillResult.evidence_receipt_id || null,
      evidence_source:     drillResult.evidence_source     || null,
    },
    authorityRefs: {},
    payload: {
      drill_status:                drillResult.drill_status                || null,
      drill_ready:                 drillResult.drill_ready                 || false,
      local_only:                  drillResult.local_only                  || true,
      pass_gold_candidate_allowed: drillResult.pass_gold_candidate_allowed || false,
      temp_root_removed:           drillResult.temp_root_removed           || false,
      deploy_allowed:              false,
      promotion_allowed:           false,
    },
  });
}

/**
 * Validates the ledger chain and returns integrity check.
 */
export function validateRuntimeLedger(ledgerPath) {
  return validateLedgerChain(ledgerPath);
}

/**
 * Reads all events from the ledger.
 */
export function readRuntimeLedger(ledgerPath) {
  return readLedger(ledgerPath);
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY
// ═══════════════════════════════════════════════════════════════════

if (process.argv[1] && process.argv[1].endsWith('runtime-evidence-ledger-integration.mjs')) {
  const args   = process.argv.slice(2);
  const json   = args.includes('--json');

  const result = {
    schema_version:         SCHEMA_VERSION,
    runtime_ledger_events:  RUNTIME_LEDGER_EVENTS,
    events_registered:      RUNTIME_LEDGER_EVENTS.length,
    deploy_allowed:         false,
    promotion_allowed:      false,
  };

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`schema_version     : ${result.schema_version}`);
    console.log(`events_registered  : ${result.events_registered}`);
    console.log(`deploy_allowed     : ${result.deploy_allowed}`);
  }

  process.exit(0);
}
