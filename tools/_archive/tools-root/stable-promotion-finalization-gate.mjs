#!/usr/bin/env node
/**
 * Stable Promotion Finalization Gate — V129.0
 *
 * Evaluates whether all confirmation pipeline steps are complete
 * before marking promotion finalized.
 * Does NOT execute any commands.
 *
 * REGRA ABSOLUTA: system_execution_performed=false, automated_promotion_performed=false,
 * stable_promotion_allowed=false, stable_promoted=false,
 * git_push_performed=false, deploy_performed=false, release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v129.0';

export const FINALIZATION_GATE_STATUSES = [
  'FINALIZATION_GATE_BLOCKED',
  'FINALIZATION_GATE_PARTIAL',
  'FINALIZATION_GATE_OPEN',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    system_execution_performed:    false,
    automated_promotion_performed: false,
    stable_promotion_allowed:      false,
    stable_promoted:               false,
    git_push_performed:            false,
    deploy_performed:              false,
    release_performed:             false,
    gate_executes_nothing:         true,
    future_promotion_requires_new_governance_cycle: true,
  };
}

function _gateId(report_id, confirmation_id) {
  return _sha256([report_id || '', confirmation_id || '', 'fpg-v129.0'].join('|'));
}

export function evaluateStablePromotionFinalizationGate(params) {
  const {
    stable_execution_post_promotion_report,
    stable_promotion_confirmation_document,
  } = params || {};

  const report  = stable_execution_post_promotion_report  || {};
  const doc     = stable_promotion_confirmation_document  || {};

  const gates = {
    report_ready:        report.report_ready === true,
    confirmation_issued: doc.document_issued === true,
    all_checks_passed:   report.all_checks_passed === true,
    has_confirmation:    report.has_confirmation === true,
    has_state_verified:  report.has_state_verified === true,
    promotion_finalized: report.promotion_finalized === true,
  };

  const passed_count = Object.values(gates).filter(Boolean).length;
  const total_gates  = Object.keys(gates).length;
  const all_open     = Object.values(gates).every(Boolean);

  const gate_status = all_open
    ? 'FINALIZATION_GATE_OPEN'
    : passed_count > 0
      ? 'FINALIZATION_GATE_PARTIAL'
      : 'FINALIZATION_GATE_BLOCKED';

  const gate_id = _gateId(report.report_id || null, doc.confirmation_id || null);

  return {
    schema_version:   SCHEMA_VERSION,
    gate_id,
    gate_status,
    gate_open:        all_open,
    gates,
    passed_gates:     passed_count,
    total_gates,
    report_id:        report.report_id || null,
    confirmation_id:  doc.confirmation_id || null,
    ..._locked(),
  };
}

export function validateStablePromotionFinalizationGate(gate) {
  if (!gate || typeof gate !== 'object') {
    return { valid: false, errors: ['gate is null/undefined'] };
  }

  const errors = [];

  if (!FINALIZATION_GATE_STATUSES.includes(gate.gate_status)) {
    errors.push(`invalid gate_status: ${gate.gate_status}`);
  }
  if (gate.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (gate.system_execution_performed !== false) errors.push('system_execution_performed must be false');
  if (gate.automated_promotion_performed !== false) errors.push('automated_promotion_performed must be false');
  if (gate.stable_promotion_allowed !== false) errors.push('stable_promotion_allowed must be false');
  if (gate.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (gate.git_push_performed !== false) errors.push('git_push_performed must be false');
  if (gate.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (gate.release_performed !== false) errors.push('release_performed must be false');
  if (gate.gate_executes_nothing !== true) errors.push('gate_executes_nothing must be true');
  if (gate.future_promotion_requires_new_governance_cycle !== true) {
    errors.push('future_promotion_requires_new_governance_cycle must be true');
  }

  return { valid: errors.length === 0, errors };
}

export function renderStablePromotionFinalizationGate(gate) {
  if (!gate) return '[FINALIZATION GATE ERROR] gate is null';

  const lines = [
    `=== STABLE PROMOTION FINALIZATION GATE V129.0 ===`,
    `Schema:                                         ${gate.schema_version}`,
    `Gate ID:                                        ${gate.gate_id}`,
    `Status:                                         ${gate.gate_status}`,
    `Gate Open:                                      ${gate.gate_open}`,
    `Passed Gates:                                   ${gate.passed_gates} / ${gate.total_gates}`,
    `Report ID:                                      ${gate.report_id || 'not set'}`,
    `Confirmation ID:                                ${gate.confirmation_id || 'not set'}`,
    ``,
    `--- GATES ---`,
  ];

  for (const [k, v] of Object.entries(gate.gates || {})) {
    lines.push(`  ${v ? 'PASS' : 'FAIL'} ${k}`);
  }

  lines.push(
    ``,
    `system_execution_performed:                     ${gate.system_execution_performed}`,
    `automated_promotion_performed:                  ${gate.automated_promotion_performed}`,
    `gate_executes_nothing:                          ${gate.gate_executes_nothing}`,
    `future_promotion_requires_new_governance_cycle: ${gate.future_promotion_requires_new_governance_cycle}`,
    `stable_promotion_allowed:                       ${gate.stable_promotion_allowed}`,
  );

  return lines.join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('stable-promotion-finalization-gate.mjs')) {
  const isJson = process.argv.includes('--json');

  const mockReport = {
    report_ready:        true,
    report_id:           'mock-report-v129',
    all_checks_passed:   true,
    has_confirmation:    true,
    has_state_verified:  true,
    promotion_finalized: true,
  };

  const mockDoc = {
    document_issued: true,
    confirmation_id: 'mock-confirmation-v129',
  };

  const gate = evaluateStablePromotionFinalizationGate({
    stable_execution_post_promotion_report:  mockReport,
    stable_promotion_confirmation_document:  mockDoc,
  });

  if (isJson) {
    console.log(JSON.stringify(gate, null, 2));
  } else {
    console.log(renderStablePromotionFinalizationGate(gate));
  }
}
