#!/usr/bin/env node
/**
 * Local Execution Final Report — V165.1
 * Renders a final human-readable report from a PASS GOLD candidate gate result.
 * No production, no deploy, no stable, no release.
 */

import { createHash } from 'crypto';

export const LOCAL_EXECUTION_FINAL_REPORT_STATUSES = [
  'LOCAL_FINAL_REPORT_BLOCKED_INPUT',
  'LOCAL_FINAL_REPORT_BLOCKED_CANDIDATE',
  'LOCAL_FINAL_REPORT_BLOCKED_PRODUCTION',
  'LOCAL_FINAL_REPORT_PASS',
  'LOCAL_FINAL_REPORT_FAIL',
];

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function blocked(status, extra = {}) {
  return {
    schema_version: 'v165.1',
    report_status: status,
    report_id: null,
    candidate_id: null,
    report_hash: null,
    report_generated: false,
    pass_gold_local: false,
    local_only: true,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
    ...extra,
  };
}

export function buildLocalExecutionFinalReport(input) {
  if (!input || typeof input !== 'object') {
    return blocked('LOCAL_FINAL_REPORT_BLOCKED_INPUT');
  }

  const {
    report_id,
    candidate_gate,
    local_only,
    production_touched,
  } = input;

  if (!report_id || typeof report_id !== 'string' || !report_id.trim()) {
    return blocked('LOCAL_FINAL_REPORT_BLOCKED_INPUT');
  }

  if (local_only === false) {
    return blocked('LOCAL_FINAL_REPORT_BLOCKED_PRODUCTION', {
      blocked_reason: 'local_only must be true',
    });
  }

  if (production_touched === true) {
    return blocked('LOCAL_FINAL_REPORT_BLOCKED_PRODUCTION', {
      blocked_reason: 'production_touched must be false',
    });
  }

  if (!candidate_gate || typeof candidate_gate !== 'object') {
    return blocked('LOCAL_FINAL_REPORT_BLOCKED_CANDIDATE', {
      blocked_reason: 'candidate_gate required',
      report_id,
    });
  }

  const validStatuses = ['LOCAL_PASS_GOLD_CANDIDATE_PASS', 'LOCAL_PASS_GOLD_CANDIDATE_FAIL'];
  if (!validStatuses.includes(candidate_gate.candidate_status)) {
    return blocked('LOCAL_FINAL_REPORT_BLOCKED_CANDIDATE', {
      blocked_reason: `candidate_gate.candidate_status must be PASS or FAIL, got: ${candidate_gate.candidate_status}`,
      report_id,
    });
  }

  if (candidate_gate.local_only !== true) {
    return blocked('LOCAL_FINAL_REPORT_BLOCKED_CANDIDATE', {
      blocked_reason: 'candidate_gate.local_only must be true',
      report_id,
    });
  }

  if (candidate_gate.production_touched !== false) {
    return blocked('LOCAL_FINAL_REPORT_BLOCKED_PRODUCTION', {
      blocked_reason: 'candidate_gate.production_touched must be false',
      report_id,
    });
  }

  const candidate_id = candidate_gate.candidate_id || null;
  const evidence_package_id = candidate_gate.evidence_package_id || null;
  const candidate_hash = candidate_gate.candidate_hash || null;
  const pass_gold_local = candidate_gate.candidate_pass === true;
  const failed_criteria = candidate_gate.failed_criteria || [];

  const report_hash = sha256(
    `${report_id}:${candidate_id}:${candidate_hash}:${pass_gold_local}`
  );

  const base = {
    schema_version: 'v165.1',
    report_id,
    candidate_id,
    evidence_package_id,
    candidate_hash,
    report_hash,
    report_generated: true,
    pass_gold_local,
    failed_criteria,
    local_only: true,
    production_touched: false,
    deploy_performed: false,
    stable_promoted: false,
    release_performed: false,
  };

  if (pass_gold_local) {
    return {
      ...base,
      report_status: 'LOCAL_FINAL_REPORT_PASS',
    };
  }

  return {
    ...base,
    report_status: 'LOCAL_FINAL_REPORT_FAIL',
    blocked_reason: `candidate did not pass: ${failed_criteria.join(', ')}`,
  };
}

export function validateLocalExecutionFinalReport(report) {
  if (!report || typeof report !== 'object') {
    return { valid: false, errors: ['null or non-object input'] };
  }

  const errors = [];

  if (report.production_touched !== false) errors.push('production_touched must be false');
  if (report.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (report.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (report.release_performed !== false) errors.push('release_performed must be false');
  if (report.local_only !== true) errors.push('local_only must be true');

  if (report.report_status === 'LOCAL_FINAL_REPORT_PASS') {
    if (!report.report_id) errors.push('report_id required for PASS');
    if (!report.report_hash) errors.push('report_hash required for PASS');
    if (!report.report_generated) errors.push('report_generated must be true for PASS');
    if (!report.pass_gold_local) errors.push('pass_gold_local must be true for PASS');
    if (!report.candidate_id) errors.push('candidate_id required for PASS');
    if (!report.evidence_package_id) errors.push('evidence_package_id required for PASS');
  }

  return { valid: errors.length === 0, errors };
}

export function renderLocalExecutionFinalReport(report) {
  if (!report || typeof report !== 'object') {
    return '[LOCAL_EXECUTION_FINAL_REPORT] No report data';
  }

  const lines = [
    `[LOCAL_EXECUTION_FINAL_REPORT] ${report.report_status || 'UNKNOWN'}`,
    `  schema_version          : ${report.schema_version || 'n/a'}`,
    `  report_id               : ${report.report_id || 'null'}`,
    `  candidate_id            : ${report.candidate_id || 'null'}`,
    `  evidence_package_id     : ${report.evidence_package_id || 'null'}`,
    `  report_hash             : ${report.report_hash || 'null'}`,
    `  report_generated        : ${report.report_generated}`,
    `  pass_gold_local         : ${report.pass_gold_local}`,
    `  failed_criteria_count   : ${(report.failed_criteria || []).length}`,
    `  local_only              : ${report.local_only}`,
    `  production_touched      : ${report.production_touched}`,
    `  deploy_performed        : ${report.deploy_performed}`,
    `  stable_promoted         : ${report.stable_promoted}`,
    `  release_performed       : ${report.release_performed}`,
  ];

  if (report.blocked_reason) {
    lines.push(`  blocked_reason          : ${report.blocked_reason}`);
  }

  lines.push('  REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.');

  return lines.join('\n');
}

// CLI self-run
if (process.argv[1] && process.argv[1].endsWith('local-execution-final-report.mjs')) {
  const useJson = process.argv.includes('--json');
  const sample = buildLocalExecutionFinalReport({
    report_id: 'report-v1651-001',
    candidate_gate: {
      candidate_status: 'LOCAL_PASS_GOLD_CANDIDATE_PASS',
      candidate_id: 'candidate-v1650-001',
      evidence_package_id: 'evidence-pkg-001',
      candidate_hash: 'abc123def456',
      candidate_pass: true,
      pass_gold_local: true,
      failed_criteria: [],
      local_only: true,
      production_touched: false,
      deploy_performed: false,
      stable_promoted: false,
      release_performed: false,
    },
    local_only: true,
    production_touched: false,
  });
  if (useJson) {
    console.log(JSON.stringify(sample, null, 2));
  } else {
    console.log(renderLocalExecutionFinalReport(sample));
  }
}
