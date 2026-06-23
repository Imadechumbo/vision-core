#!/usr/bin/env node
/**
 * Cache Hit/Miss Reporter — V132.1
 *
 * Computes hit-rate statistics from a prompt cache ledger.
 * Does NOT execute real API calls.
 *
 * REGRA ABSOLUTA: stable_promoted=false, deploy_performed=false,
 * release_performed=false always.
 */

import { createHash } from 'crypto';

const SCHEMA_VERSION = 'v132.1';

export const REPORTER_STATUSES = [
  'REPORTER_BLOCKED_LEDGER',
  'REPORTER_EMPTY',
  'REPORTER_READY',
];

function _sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

function _locked() {
  return {
    stable_promoted:   false,
    deploy_performed:  false,
    release_performed: false,
  };
}

function _hitRate(hits, total) {
  if (total === 0) return 0;
  return Math.round((hits / total) * 10000) / 100;
}

function _missRate(misses, total) {
  if (total === 0) return 0;
  return Math.round((misses / total) * 10000) / 100;
}

export function buildCacheHitMissReport(params) {
  const { ledger, mission_id, report_context } = params || {};

  if (!ledger || typeof ledger !== 'object') {
    return {
      schema_version:   SCHEMA_VERSION,
      reporter_status:  'REPORTER_BLOCKED_LEDGER',
      reporter_ready:   false,
      blocking_reason:  'ledger is null/undefined',
      ..._locked(),
    };
  }

  if (!['LEDGER_ACTIVE', 'LEDGER_SEALED'].includes(ledger.ledger_status)) {
    if (ledger.ledger_status === 'LEDGER_EMPTY') {
      return {
        schema_version:   SCHEMA_VERSION,
        reporter_status:  'REPORTER_EMPTY',
        reporter_ready:   false,
        blocking_reason:  'ledger is empty',
        hit_count:        0,
        miss_count:       0,
        stale_count:      0,
        write_count:      0,
        total_reads:      0,
        hit_rate_pct:     0,
        miss_rate_pct:    0,
        stale_rate_pct:   0,
        ..._locked(),
      };
    }
    return {
      schema_version:   SCHEMA_VERSION,
      reporter_status:  'REPORTER_BLOCKED_LEDGER',
      reporter_ready:   false,
      blocking_reason:  `unsupported ledger_status: ${ledger.ledger_status}`,
      ..._locked(),
    };
  }

  const hit_count   = ledger.hit_count   || 0;
  const miss_count  = ledger.miss_count  || 0;
  const stale_count = ledger.stale_count || 0;
  const write_count = ledger.write_count || 0;
  const total_reads = hit_count + miss_count + stale_count;

  const hit_rate_pct   = _hitRate(hit_count, total_reads);
  const miss_rate_pct  = _missRate(miss_count, total_reads);
  const stale_rate_pct = _missRate(stale_count, total_reads);

  const report_id = _sha256([
    ledger.ledger_id || '',
    String(hit_count),
    String(miss_count),
    String(total_reads),
    'hmr-v132.1',
  ].join('|'));

  return {
    schema_version:   SCHEMA_VERSION,
    report_id,
    reporter_status:  'REPORTER_READY',
    reporter_ready:   true,
    mission_id:       mission_id || ledger.mission_id || null,
    ledger_id:        ledger.ledger_id || null,
    ledger_status:    ledger.ledger_status,
    report_context:   report_context || null,
    event_count:      ledger.event_count || 0,
    hit_count,
    miss_count,
    stale_count,
    write_count,
    total_reads,
    hit_rate_pct,
    miss_rate_pct,
    stale_rate_pct,
    cache_efficient:  hit_rate_pct >= 50,
    generated_at:     Date.now(),
    ..._locked(),
  };
}

export function validateCacheHitMissReport(report) {
  if (!report || typeof report !== 'object') {
    return { valid: false, errors: ['report is null/undefined'] };
  }

  const errors = [];

  if (!REPORTER_STATUSES.includes(report.reporter_status)) {
    errors.push(`invalid reporter_status: ${report.reporter_status}`);
  }
  if (report.schema_version !== SCHEMA_VERSION) errors.push('invalid schema_version');
  if (report.stable_promoted !== false) errors.push('stable_promoted must be false');
  if (report.deploy_performed !== false) errors.push('deploy_performed must be false');
  if (report.release_performed !== false) errors.push('release_performed must be false');

  if (report.reporter_ready) {
    if (typeof report.hit_rate_pct !== 'number') errors.push('hit_rate_pct must be number');
    if (typeof report.miss_rate_pct !== 'number') errors.push('miss_rate_pct must be number');
    if (typeof report.total_reads !== 'number') errors.push('total_reads must be number');
  }

  return { valid: errors.length === 0, errors };
}

export function renderCacheHitMissReport(report) {
  if (!report) return '[CACHE HIT/MISS REPORTER] null';

  if (!report.reporter_ready) {
    return `[CACHE HIT/MISS REPORTER BLOCKED] ${report.reporter_status}: ${report.blocking_reason || 'unknown'}`;
  }

  return [
    `=== CACHE HIT/MISS REPORT V132.1 ===`,
    `Schema:          ${report.schema_version}`,
    `Report ID:       ${report.report_id}`,
    `Status:          ${report.reporter_status}`,
    `Mission ID:      ${report.mission_id || 'not set'}`,
    `Ledger ID:       ${report.ledger_id || 'not set'}`,
    `Ledger Status:   ${report.ledger_status}`,
    `Context:         ${report.report_context || 'not set'}`,
    ``,
    `Events:          ${report.event_count}`,
    `Total Reads:     ${report.total_reads}`,
    `Writes:          ${report.write_count}`,
    ``,
    `Hits:            ${report.hit_count} (${report.hit_rate_pct}%)`,
    `Misses:          ${report.miss_count} (${report.miss_rate_pct}%)`,
    `Stale:           ${report.stale_count} (${report.stale_rate_pct}%)`,
    `Cache Efficient: ${report.cache_efficient}`,
    ``,
    `stable_promoted:   ${report.stable_promoted}`,
    `deploy_performed:  ${report.deploy_performed}`,
    `release_performed: ${report.release_performed}`,
  ].join('\n');
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('cache-hit-miss-reporter.mjs')) {
  const { buildPromptCacheLedger, appendPromptCacheLedgerEvent } =
    await import('./prompt-cache-ledger.mjs');

  let ledger = buildPromptCacheLedger({ mission_id: 'mission-v132-cli', contract_id: 'c1', store_id: 's1' });
  ledger = appendPromptCacheLedgerEvent(ledger, 'CACHE_HIT',  { entry_key: 'k1' }).ledger;
  ledger = appendPromptCacheLedgerEvent(ledger, 'CACHE_HIT',  { entry_key: 'k2' }).ledger;
  ledger = appendPromptCacheLedgerEvent(ledger, 'CACHE_MISS', { entry_key: 'k3' }).ledger;

  const isJson = process.argv.includes('--json');
  const report = buildCacheHitMissReport({ ledger, report_context: 'cli-demo' });

  if (isJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(renderCacheHitMissReport(report));
  }
}
