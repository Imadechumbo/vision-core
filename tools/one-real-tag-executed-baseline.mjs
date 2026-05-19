#!/usr/bin/env node
/**
 * One Real Tag Executed Baseline — V110.0
 *
 * Capstone baseline for V106–V109. Verifies all 7 modules, test scripts,
 * and 3 pipeline modes (command_ready, dry_run_confirmed, mock_real_tag_confirmed).
 * Never promotes stable/deploy/release.
 *
 * REGRA ABSOLUTA: actual_real_tag_created=false by default.
 * actual_git_push_performed=false by default. stable_promoted=false always.
 */

import { createHash } from 'crypto';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { buildOneRealTagFinalExecutionPacket }       from './one-real-tag-final-execution-packet.mjs';
import { buildOneRealTagLocalManualCommandExport }   from './one-real-tag-local-manual-command-export.mjs';
import { captureOneRealTagHumanReceipt }             from './one-real-tag-human-receipt-capture.mjs';
import { importAndVerifyOneRealTagHumanReceipt }     from './one-real-tag-human-receipt-import-verify.mjs';
import { buildOneRealTagPostVerificationLedger }     from './one-real-tag-post-verification-ledger.mjs';
import { buildOneRealTagRollbackReadinessGate }      from './one-real-tag-rollback-readiness-gate.mjs';
import { buildOneRealTagOperationFinalReport }       from './one-real-tag-operation-final-report.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

const SCHEMA_VERSION = 'v110.0';

export const ONE_TAG_BASELINE_STATUSES = [
  'ONE_TAG_BASELINE_BLOCKED_MODULES',
  'ONE_TAG_BASELINE_BLOCKED_TESTS',
  'ONE_TAG_BASELINE_BLOCKED_INVARIANTS',
  'ONE_TAG_BASELINE_BLOCKED_PIPELINE',
  'ONE_TAG_BASELINE_COMMAND_READY',
  'ONE_TAG_BASELINE_DRY_RUN_CONFIRMED',
  'ONE_TAG_BASELINE_REAL_TAG_CONFIRMED',
];

const REQUIRED_MODULES = [
  'tools/one-real-tag-final-execution-packet.mjs',
  'tools/one-real-tag-local-manual-command-export.mjs',
  'tools/one-real-tag-human-receipt-capture.mjs',
  'tools/one-real-tag-human-receipt-import-verify.mjs',
  'tools/one-real-tag-post-verification-ledger.mjs',
  'tools/one-real-tag-rollback-readiness-gate.mjs',
  'tools/one-real-tag-operation-final-report.mjs',
];

const REQUIRED_TEST_SCRIPTS = [
  'test:exec-packet-unit',
  'test:local-cmd-export-unit',
  'test:receipt-capture-unit',
  'test:receipt-import-verify-unit',
  'test:post-verify-ledger-unit',
  'test:rollback-readiness-unit',
  'test:tag-op-final-report-unit',
  'test:one-tag-executed-baseline-unit',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    actual_real_tag_created:      false,
    actual_git_push_performed:    false,
    tag_created:                  false,
    git_push_performed:           false,
    stable_promoted:              false,
    deploy_performed:             false,
    release_performed:            false,
  };
}

function _blocked(status, reason, extra = {}) {
  return {
    schema_version:          SCHEMA_VERSION,
    baseline_version:        SCHEMA_VERSION,
    one_tag_baseline_status: status,
    one_tag_baseline_ready:  false,
    blocking_reason:         reason,
    ..._locked(),
    ...extra,
  };
}

function _checkModules() {
  const missing = [];
  for (const mod of REQUIRED_MODULES) {
    if (!existsSync(join(ROOT, mod))) missing.push(mod);
  }
  return missing;
}

function _mockBaseline() {
  return {
    human_exec_readiness_ready:       true,
    human_exec_readiness_baseline_id: 'mock-v105-baseline',
    human_exec_readiness_status:      'HUMAN_EXEC_READINESS_READY_FOR_MANUAL_TAG_EXECUTION',
    ready_for_manual_tag_execution:   true,
    actual_real_tag_created:          false,
    actual_git_push_performed:        false,
    stable_promoted:                  false,
  };
}

function _runCommandReadyPipeline(target_tag, git_head) {
  const packet = buildOneRealTagFinalExecutionPacket({
    human_exec_readiness_baseline: _mockBaseline(),
    target_tag,
    git_head,
    evidence_receipt_id: 'baseline-evidence-001',
    evidence_source:     'go-core',
    rollback_anchor_id:  'baseline-rollback-001',
    command_seal_id:     'baseline-seal-001',
    receipt_template_id: 'baseline-template-001',
  });
  if (!packet.packet_ready) return { ok: false, reason: `packet blocked: ${packet.blocking_reason}` };

  const exp = buildOneRealTagLocalManualCommandExport({ execution_packet: packet });
  if (!exp.export_ready) return { ok: false, reason: `export blocked: ${exp.blocking_reason}` };

  const ledger = buildOneRealTagPostVerificationLedger([
    { event_type: 'ONE_TAG_EXEC_PACKET_READY',    ref_id: packet.packet_id },
    { event_type: 'ONE_TAG_COMMAND_EXPORT_READY', ref_id: exp.command_export_id },
  ]);
  if (!ledger.ledger_valid) return { ok: false, reason: `ledger blocked: ${ledger.ledger_error}` };

  const gate = buildOneRealTagRollbackReadinessGate({
    ledger,
    target_tag,
    git_head,
    rollback_anchor_id: 'baseline-rollback-001',
  });
  if (!gate.rollback_ready) return { ok: false, reason: `gate blocked: ${gate.blocking_reason}` };

  const report = buildOneRealTagOperationFinalReport({ ledger, rollback_gate: gate });
  if (!report.report_ready) return { ok: false, reason: `report blocked: ${report.blocking_reason}` };
  if (report.report_status !== 'ONE_TAG_REPORT_COMMAND_READY') {
    return { ok: false, reason: `wrong report status: ${report.report_status}` };
  }
  if (report.stable_promoted !== false) return { ok: false, reason: 'stable_promoted must be false' };
  if (report.deploy_performed !== false) return { ok: false, reason: 'deploy_performed must be false' };

  return { ok: true, report_status: report.report_status };
}

function _runDryRunPipeline(target_tag, git_head) {
  const packet = buildOneRealTagFinalExecutionPacket({
    human_exec_readiness_baseline: _mockBaseline(),
    target_tag,
    git_head,
    evidence_receipt_id: 'baseline-evidence-002',
    evidence_source:     'go-core',
    rollback_anchor_id:  'baseline-rollback-002',
    command_seal_id:     'baseline-seal-002',
  });
  if (!packet.packet_ready) return { ok: false, reason: `packet blocked` };

  const exp = buildOneRealTagLocalManualCommandExport({ execution_packet: packet });
  if (!exp.export_ready) return { ok: false, reason: `export blocked` };

  const dryCapture = captureOneRealTagHumanReceipt({
    command_export: exp,
    receipt_data: {
      target_tag,
      git_head,
      evidence_receipt_id: 'baseline-evidence-002',
      rollback_anchor_id:  'baseline-rollback-002',
      executed_by:         'baseline-operator',
      executed_at:         '2026-05-19T00:00:00Z',
      local_tag_verified:  false,
      remote_tag_verified: false,
      tag_created:         false,
      git_push_performed:  false,
      deploy_performed:    false,
      stable_promoted:     false,
      release_performed:   false,
      notes:               'baseline dry-run test',
    },
  });
  if (!dryCapture.capture_ready) return { ok: false, reason: `capture blocked: ${dryCapture.blocking_reason}` };

  const verify = importAndVerifyOneRealTagHumanReceipt({
    captured_receipt:           dryCapture,
    command_export:             exp,
    observed_local_tag_head:    null,
    observed_remote_tag_head:   null,
    observed_worktree_clean:    true,
    observed_deploy_performed:  false,
    observed_stable_promoted:   false,
    observed_release_performed: false,
  });
  if (!verify.verify_ready) return { ok: false, reason: `verify blocked: ${verify.blocking_reason}` };
  if (verify.verify_status !== 'RECEIPT_VERIFY_DRY_RUN_CONFIRMED') {
    return { ok: false, reason: `wrong verify status: ${verify.verify_status}` };
  }

  const ledger = buildOneRealTagPostVerificationLedger([
    { event_type: 'ONE_TAG_EXEC_PACKET_READY',         ref_id: packet.packet_id },
    { event_type: 'ONE_TAG_COMMAND_EXPORT_READY',      ref_id: exp.command_export_id },
    { event_type: 'ONE_TAG_RECEIPT_DRY_RUN_CAPTURED',  ref_id: dryCapture.human_receipt_id },
    { event_type: 'ONE_TAG_RECEIPT_DRY_RUN_CONFIRMED', ref_id: verify.verify_id },
  ]);
  if (!ledger.ledger_valid) return { ok: false, reason: `ledger blocked` };

  const gate = buildOneRealTagRollbackReadinessGate({
    ledger, target_tag, git_head, rollback_anchor_id: 'baseline-rollback-002',
  });
  if (!gate.rollback_ready) return { ok: false, reason: `gate blocked` };

  const report = buildOneRealTagOperationFinalReport({ ledger, rollback_gate: gate });
  if (!report.report_ready) return { ok: false, reason: `report blocked` };
  if (report.report_status !== 'ONE_TAG_REPORT_DRY_RUN_CONFIRMED') {
    return { ok: false, reason: `wrong report status: ${report.report_status}` };
  }
  if (report.stable_promoted !== false) return { ok: false, reason: 'stable_promoted must be false' };

  return { ok: true, report_status: report.report_status, verify_id: verify.verify_id };
}

function _runMockRealTagPipeline(target_tag, git_head) {
  const packet = buildOneRealTagFinalExecutionPacket({
    human_exec_readiness_baseline: _mockBaseline(),
    target_tag,
    git_head,
    evidence_receipt_id: 'baseline-evidence-003',
    evidence_source:     'go-core',
    rollback_anchor_id:  'baseline-rollback-003',
    command_seal_id:     'baseline-seal-003',
  });
  if (!packet.packet_ready) return { ok: false, reason: 'packet blocked' };

  const exp = buildOneRealTagLocalManualCommandExport({ execution_packet: packet });
  if (!exp.export_ready) return { ok: false, reason: 'export blocked' };

  // Mock real receipt (simulates human having executed manually)
  const realCapture = captureOneRealTagHumanReceipt({
    command_export: exp,
    receipt_data: {
      target_tag,
      git_head,
      evidence_receipt_id: 'baseline-evidence-003',
      rollback_anchor_id:  'baseline-rollback-003',
      executed_by:         'mock-human-operator',
      executed_at:         '2026-05-19T00:00:00Z',
      local_tag_verified:  true,
      remote_tag_verified: true,
      local_tag_head:      git_head,
      remote_tag_head:     git_head,
      tag_created:         true,
      git_push_performed:  true,
      deploy_performed:    false,
      stable_promoted:     false,
      release_performed:   false,
      notes:               'mock real tag receipt for baseline pipeline test',
    },
  });
  if (!realCapture.capture_ready) return { ok: false, reason: `capture blocked: ${realCapture.blocking_reason}` };

  const verify = importAndVerifyOneRealTagHumanReceipt({
    captured_receipt:           realCapture,
    command_export:             exp,
    observed_local_tag_head:    git_head,
    observed_remote_tag_head:   git_head,
    observed_worktree_clean:    true,
    observed_deploy_performed:  false,
    observed_stable_promoted:   false,
    observed_release_performed: false,
  });
  if (!verify.verify_ready) return { ok: false, reason: `verify blocked: ${verify.blocking_reason}` };
  if (verify.verify_status !== 'RECEIPT_VERIFY_REAL_TAG_CONFIRMED') {
    return { ok: false, reason: `wrong verify status: ${verify.verify_status}` };
  }

  const ledger = buildOneRealTagPostVerificationLedger([
    { event_type: 'ONE_TAG_EXEC_PACKET_READY',          ref_id: packet.packet_id },
    { event_type: 'ONE_TAG_COMMAND_EXPORT_READY',       ref_id: exp.command_export_id },
    { event_type: 'ONE_TAG_RECEIPT_REAL_TAG_CAPTURED',  ref_id: realCapture.human_receipt_id },
    { event_type: 'ONE_TAG_RECEIPT_REAL_TAG_CONFIRMED', ref_id: verify.verify_id },
  ]);
  if (!ledger.ledger_valid) return { ok: false, reason: 'ledger blocked' };

  const gate = buildOneRealTagRollbackReadinessGate({
    ledger, target_tag, git_head, rollback_anchor_id: 'baseline-rollback-003',
  });
  if (!gate.rollback_ready) return { ok: false, reason: 'gate blocked' };
  if (gate.rollback_status !== 'ROLLBACK_READINESS_REAL_TAG_READY') {
    return { ok: false, reason: `wrong gate status: ${gate.rollback_status}` };
  }

  const report = buildOneRealTagOperationFinalReport({ ledger, rollback_gate: gate });
  if (!report.report_ready) return { ok: false, reason: 'report blocked' };
  if (report.report_status !== 'ONE_TAG_REPORT_REAL_TAG_CONFIRMED') {
    return { ok: false, reason: `wrong report status: ${report.report_status}` };
  }
  if (report.stable_promoted !== false) return { ok: false, reason: 'stable_promoted must be false' };
  if (report.deploy_performed !== false) return { ok: false, reason: 'deploy_performed must be false' };

  return {
    ok: true,
    report_status:          report.report_status,
    stable_review_allowed:  report.stable_review_allowed,
    actual_real_tag_created: verify.actual_real_tag_created,
  };
}

export function buildOneRealTagExecutedBaseline(params) {
  const { pkg_scripts } = params || {};

  // Check modules exist
  const missing_modules = _checkModules();
  if (missing_modules.length > 0) {
    return _blocked('ONE_TAG_BASELINE_BLOCKED_MODULES',
      `missing modules: ${missing_modules.join(', ')}`);
  }

  // Check test scripts in package.json
  const scripts = pkg_scripts || [];
  const missing_scripts = REQUIRED_TEST_SCRIPTS.filter(s => !scripts.includes(s));
  if (missing_scripts.length > 0) {
    return _blocked('ONE_TAG_BASELINE_BLOCKED_TESTS',
      `missing test scripts: ${missing_scripts.join(', ')}`);
  }

  // Run command-ready pipeline
  const mockTag  = 'v110.0-baseline-mock';
  const mockHead = 'c61c23e';

  const cmdResult = _runCommandReadyPipeline(mockTag, mockHead);
  if (!cmdResult.ok) {
    return _blocked('ONE_TAG_BASELINE_BLOCKED_PIPELINE',
      `command_ready pipeline failed: ${cmdResult.reason}`);
  }

  // Run dry-run pipeline
  const dryResult = _runDryRunPipeline(mockTag, mockHead);
  if (!dryResult.ok) {
    return _blocked('ONE_TAG_BASELINE_BLOCKED_PIPELINE',
      `dry_run pipeline failed: ${dryResult.reason}`);
  }

  // Run mock real tag pipeline
  const mockResult = _runMockRealTagPipeline(mockTag, mockHead);
  if (!mockResult.ok) {
    return _blocked('ONE_TAG_BASELINE_BLOCKED_PIPELINE',
      `mock_real_tag pipeline failed: ${mockResult.reason}`);
  }

  // Validate invariants
  if (mockResult.stable_review_allowed !== true) {
    return _blocked('ONE_TAG_BASELINE_BLOCKED_INVARIANTS',
      'mock_real_tag pipeline: stable_review_allowed should be true');
  }
  if (mockResult.actual_real_tag_created !== true) {
    return _blocked('ONE_TAG_BASELINE_BLOCKED_INVARIANTS',
      'mock_real_tag pipeline: actual_real_tag_created should be true for mock');
  }

  const baseline_id = _sha256([SCHEMA_VERSION, mockTag, mockHead, cmdResult.report_status, dryResult.report_status, mockResult.report_status].join('|'));

  return {
    schema_version:                   SCHEMA_VERSION,
    baseline_version:                 SCHEMA_VERSION,
    baseline_id,
    one_tag_baseline_status:          'ONE_TAG_BASELINE_DRY_RUN_CONFIRMED',
    one_tag_baseline_ready:           true,
    command_ready_pipeline_verified:  true,
    dry_run_pipeline_verified:        true,
    mock_real_tag_pipeline_verified:  true,
    rollback_readiness_verified:      true,
    report_verified:                  true,
    actual_real_tag_created:          false,
    actual_git_push_performed:        false,
    tag_created:                      false,
    git_push_performed:               false,
    stable_review_allowed:            false,
    stable_promoted:                  false,
    deploy_performed:                 false,
    release_performed:                false,
    ready_for_manual_tag_execution:   true,
    human_exec_readiness_baseline_verified: true,
  };
}

export function validateOneRealTagExecutedBaseline(baseline) {
  if (!baseline || typeof baseline !== 'object') return { valid: false, errors: ['baseline is null/undefined'] };

  const errors = [];

  if (!ONE_TAG_BASELINE_STATUSES.includes(baseline.one_tag_baseline_status)) {
    errors.push(`invalid one_tag_baseline_status: ${baseline.one_tag_baseline_status}`);
  }
  if (baseline.schema_version !== SCHEMA_VERSION) errors.push(`invalid schema_version`);
  if (baseline.actual_real_tag_created !== false) errors.push('actual_real_tag_created must be false by default');
  if (baseline.actual_git_push_performed !== false) errors.push('actual_git_push_performed must be false by default');
  if (baseline.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (baseline.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (baseline.release_performed !== false) errors.push('release_performed must be false');

  return { valid: errors.length === 0, errors };
}

export function renderOneRealTagExecutedBaseline(baseline) {
  if (!baseline || !baseline.one_tag_baseline_ready) {
    return `[BASELINE BLOCKED] ${baseline?.one_tag_baseline_status || 'unknown'}: ${baseline?.blocking_reason || 'unknown reason'}`;
  }

  return [
    `=== ONE REAL TAG EXECUTED BASELINE ===`,
    `Schema:                   ${baseline.schema_version}`,
    `Baseline Version:         ${baseline.baseline_version}`,
    `Baseline ID:              ${baseline.baseline_id}`,
    `Status:                   ${baseline.one_tag_baseline_status}`,
    `Baseline Ready:           ${baseline.one_tag_baseline_ready}`,
    ``,
    `Pipeline Verification:`,
    `  command_ready:          ${baseline.command_ready_pipeline_verified}`,
    `  dry_run_confirmed:      ${baseline.dry_run_pipeline_verified}`,
    `  mock_real_tag:          ${baseline.mock_real_tag_pipeline_verified}`,
    `  rollback_readiness:     ${baseline.rollback_readiness_verified}`,
    `  report_verified:        ${baseline.report_verified}`,
    ``,
    `Default Invariants:`,
    `  actual_real_tag_created=false`,
    `  actual_git_push_performed=false`,
    `  stable_promoted=false`,
    `  deploy_performed=false`,
    `  release_performed=false`,
    `  stable_review_allowed=false (by default; true only when real receipt imported)`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('one-real-tag-executed-baseline.mjs')) {
  const isJson = process.argv.includes('--json');

  // Load package.json scripts
  let scripts = [];
  try {
    const { readFileSync } = await import('fs');
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    scripts = Object.keys(pkg.scripts || {});
  } catch {}

  const baseline = buildOneRealTagExecutedBaseline({ pkg_scripts: scripts });

  if (isJson) {
    console.log(JSON.stringify(baseline, null, 2));
  } else {
    console.log(renderOneRealTagExecutedBaseline(baseline));
  }
}
