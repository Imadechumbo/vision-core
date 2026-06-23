#!/usr/bin/env node
/**
 * Tests — Cache Hit/Miss Reporter V132.1
 */

import {
  buildCacheHitMissReport,
  validateCacheHitMissReport,
  renderCacheHitMissReport,
  REPORTER_STATUSES,
} from '../cache-hit-miss-reporter.mjs';
import {
  buildPromptCacheLedger,
  appendPromptCacheLedgerEvent,
  sealPromptCacheLedger,
} from '../prompt-cache-ledger.mjs';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

function buildActiveLedger(events = []) {
  let l = buildPromptCacheLedger({ mission_id: 'test-m', contract_id: 'c1', store_id: 's1' });
  for (const [type, data] of events) {
    l = appendPromptCacheLedgerEvent(l, type, data).ledger;
  }
  return l;
}

console.log('\n=== cache-hit-miss-reporter tests ===\n');

console.log('--- null ledger ---');
{
  const r = buildCacheHitMissReport({ ledger: null });
  assert(r.reporter_status === 'REPORTER_BLOCKED_LEDGER', 'null → BLOCKED_LEDGER');
  assert(r.reporter_ready === false, 'reporter_ready false');
  assert(r.stable_promoted === false, 'stable_promoted=false');
  assert(r.deploy_performed === false, 'deploy_performed=false');
  assert(r.release_performed === false, 'release_performed=false');
}

console.log('--- null params ---');
{
  const r = buildCacheHitMissReport(null);
  assert(r.reporter_status === 'REPORTER_BLOCKED_LEDGER', 'null params → BLOCKED_LEDGER');
}

console.log('--- empty ledger ---');
{
  const l = buildPromptCacheLedger({ mission_id: 'm1' });
  const r = buildCacheHitMissReport({ ledger: l });
  assert(r.reporter_status === 'REPORTER_EMPTY', 'empty → REPORTER_EMPTY');
  assert(r.reporter_ready === false, 'reporter_ready false');
  assert(r.hit_count === 0, 'hit_count 0');
  assert(r.total_reads === 0, 'total_reads 0');
  assert(r.hit_rate_pct === 0, 'hit_rate 0');
}

console.log('--- ready: hits only ---');
{
  const l = buildActiveLedger([
    ['CACHE_HIT', { entry_key: 'k1' }],
    ['CACHE_HIT', { entry_key: 'k2' }],
  ]);
  const r = buildCacheHitMissReport({ ledger: l });
  assert(r.reporter_status === 'REPORTER_READY', 'ready status');
  assert(r.reporter_ready === true, 'reporter_ready true');
  assert(r.schema_version === 'v132.1', 'schema version');
  assert(typeof r.report_id === 'string' && r.report_id.length === 64, 'report_id sha256');
  assert(r.hit_count === 2, 'hit_count 2');
  assert(r.miss_count === 0, 'miss_count 0');
  assert(r.total_reads === 2, 'total_reads 2');
  assert(r.hit_rate_pct === 100, 'hit_rate 100%');
  assert(r.miss_rate_pct === 0, 'miss_rate 0%');
  assert(r.cache_efficient === true, 'cache_efficient true');
}

console.log('--- ready: mixed events ---');
{
  const l = buildActiveLedger([
    ['CACHE_HIT',          { entry_key: 'k1' }],
    ['CACHE_MISS',         { entry_key: 'k2' }],
    ['CACHE_MISS',         { entry_key: 'k3' }],
    ['CACHE_STALE',        { entry_key: 'k4' }],
    ['CACHE_WRITE_SUCCESS',{ entry_key: 'k5' }],
  ]);
  const r = buildCacheHitMissReport({ ledger: l });
  assert(r.hit_count === 1, 'hit_count 1');
  assert(r.miss_count === 2, 'miss_count 2');
  assert(r.stale_count === 1, 'stale_count 1');
  assert(r.write_count === 1, 'write_count 1');
  assert(r.total_reads === 4, 'total_reads 4 (hit+miss+stale)');
  assert(r.hit_rate_pct === 25, 'hit_rate 25%');
  assert(r.miss_rate_pct === 50, 'miss_rate 50%');
  assert(r.stale_rate_pct === 25, 'stale_rate 25%');
  assert(r.cache_efficient === false, 'cache_efficient false (<50%)');
}

console.log('--- ready: 50% threshold ---');
{
  const l = buildActiveLedger([
    ['CACHE_HIT',  { entry_key: 'k1' }],
    ['CACHE_MISS', { entry_key: 'k2' }],
  ]);
  const r = buildCacheHitMissReport({ ledger: l });
  assert(r.hit_rate_pct === 50, 'hit_rate 50%');
  assert(r.cache_efficient === true, 'cache_efficient true at 50%');
}

console.log('--- mission_id passthrough ---');
{
  const l = buildActiveLedger([['CACHE_HIT', {}]]);
  const r = buildCacheHitMissReport({ ledger: l, mission_id: 'override-m' });
  assert(r.mission_id === 'override-m', 'mission_id override');
}

console.log('--- mission_id from ledger ---');
{
  const l = buildActiveLedger([['CACHE_HIT', {}]]);
  const r = buildCacheHitMissReport({ ledger: l });
  assert(r.mission_id === 'test-m', 'mission_id from ledger');
}

console.log('--- report_context ---');
{
  const l = buildActiveLedger([['CACHE_HIT', {}]]);
  const r = buildCacheHitMissReport({ ledger: l, report_context: 'unit-test' });
  assert(r.report_context === 'unit-test', 'report_context stored');
}

console.log('--- sealed ledger ---');
{
  let l = buildActiveLedger([['CACHE_HIT', { entry_key: 'k1' }]]);
  l = sealPromptCacheLedger(l).ledger;
  const r = buildCacheHitMissReport({ ledger: l });
  assert(r.reporter_status === 'REPORTER_READY', 'sealed → READY');
  assert(r.ledger_status === 'LEDGER_SEALED', 'ledger_status propagated');
}

console.log('--- deterministic report_id ---');
{
  const l = buildActiveLedger([['CACHE_HIT', { entry_key: 'k1' }]]);
  const r1 = buildCacheHitMissReport({ ledger: l });
  const r2 = buildCacheHitMissReport({ ledger: l });
  assert(r1.report_id === r2.report_id, 'report_id deterministic');
}

console.log('--- REGRA invariants ---');
{
  const l = buildActiveLedger([['CACHE_HIT', {}]]);
  const r = buildCacheHitMissReport({ ledger: l });
  assert(r.stable_promoted === false, 'stable_promoted=false');
  assert(r.deploy_performed === false, 'deploy_performed=false');
  assert(r.release_performed === false, 'release_performed=false');
}

console.log('--- validate: ready ---');
{
  const l = buildActiveLedger([['CACHE_HIT', {}]]);
  const r = buildCacheHitMissReport({ ledger: l });
  const v = validateCacheHitMissReport(r);
  assert(v.valid === true, 'valid=true');
  assert(v.errors.length === 0, 'no errors');
}

console.log('--- validate: null ---');
{
  const v = validateCacheHitMissReport(null);
  assert(v.valid === false, 'null → invalid');
}

console.log('--- validate: blocked ---');
{
  const r = buildCacheHitMissReport({ ledger: null });
  const v = validateCacheHitMissReport(r);
  assert(v.valid === true, 'blocked report valid struct');
}

console.log('--- render: ready ---');
{
  const l = buildActiveLedger([['CACHE_HIT', {}], ['CACHE_MISS', {}]]);
  const r = buildCacheHitMissReport({ ledger: l, report_context: 'test' });
  const txt = renderCacheHitMissReport(r);
  assert(typeof txt === 'string', 'render string');
  assert(txt.includes('CACHE HIT/MISS REPORT V132.1'), 'render title');
  assert(txt.includes('REPORTER_READY'), 'status in output');
  assert(txt.includes('hit_rate_pct') || txt.includes('Hits:'), 'hits in output');
  assert(txt.includes('stable_promoted:'), 'invariant in output');
}

console.log('--- render: blocked ---');
{
  const r = buildCacheHitMissReport({ ledger: null });
  const txt = renderCacheHitMissReport(r);
  assert(txt.includes('BLOCKED'), 'blocked message');
}

console.log('--- render: null ---');
{
  const txt = renderCacheHitMissReport(null);
  assert(txt.includes('null'), 'null renders gracefully');
}

console.log('--- statuses export ---');
{
  assert(REPORTER_STATUSES.includes('REPORTER_BLOCKED_LEDGER'), 'BLOCKED in statuses');
  assert(REPORTER_STATUSES.includes('REPORTER_EMPTY'), 'EMPTY in statuses');
  assert(REPORTER_STATUSES.includes('REPORTER_READY'), 'READY in statuses');
  assert(REPORTER_STATUSES.length === 3, 'exactly 3 statuses');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
