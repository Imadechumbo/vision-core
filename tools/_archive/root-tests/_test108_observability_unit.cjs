'use strict';
/**
 * _test108_observability_unit.cjs — §108 observabilidade unit tests
 * Cobre: computeMemoryMetrics (função pura) + wiring estático nos 3 arquivos
 */

const fs   = require('fs');
const path = require('path');

const { computeMemoryMetrics } = require('./backend/hermes-rca');

let passed = 0;
let failed = 0;

function assert(label, cond, extra) {
  if (cond) {
    console.log('  ✅ ' + label);
    passed++;
  } else {
    console.log('  ❌ FAIL: ' + label + (extra ? ' — ' + extra : ''));
    failed++;
  }
}

// ── 1. computeMemoryMetrics ──────────────────────────────────────

console.log('\n[computeMemoryMetrics]');

// 1a: lista vazia
const m0 = computeMemoryMetrics([]);
assert('metrics: lista vazia → total=0', m0.total_escalations === 0);
assert('metrics: lista vazia → by_provider={}', Object.keys(m0.by_provider).length === 0);
assert('metrics: lista vazia → last_escalation_at=null', m0.last_escalation_at === null);

// 1b: null / undefined → trata como lista vazia
const mNull = computeMemoryMetrics(null);
assert('metrics: null → total=0', mNull.total_escalations === 0);
const mUndef = computeMemoryMetrics(undefined);
assert('metrics: undefined → total=0', mUndef.total_escalations === 0);

// 1c: agregação por provider
const entries = [
  { escalated_from: 'groq',      keywords: ['race', 'condition'],   timestamp: '2026-01-02T00:00:00Z' },
  { escalated_from: 'groq',      keywords: ['closure', 'state'],    timestamp: '2026-01-03T00:00:00Z' },
  { escalated_from: 'deepseek',  keywords: [],                      timestamp: '2026-01-01T00:00:00Z' },
  { escalated_from: 'openai',    /* sem keywords */                  timestamp: '2026-01-04T00:00:00Z' },
  null  /* entrada nula — não deve quebrar */
];
const m1 = computeMemoryMetrics(entries);
assert('metrics: total_escalations = comprimento total do array (incl. null)', m1.total_escalations === 5);
assert('metrics: by_provider groq=2', m1.by_provider['groq'] === 2);
assert('metrics: by_provider deepseek=1', m1.by_provider['deepseek'] === 1);
assert('metrics: by_provider openai=1 (via escalated_from ausente → unknown?)', m1.by_provider['openai'] === 1);

// 1d: contagem com/sem keywords
assert('metrics: memory_capable_entries (com keywords não-vazio) = 2', m1.memory_capable_entries === 2);
assert('metrics: legacy_entries_without_keywords = 2 (deepseek[] + openai sem campo)', m1.legacy_entries_without_keywords === 2);

// 1e: timestamp mais recente
assert('metrics: last_escalation_at é o mais recente (openai 2026-01-04)', m1.last_escalation_at === '2026-01-04T00:00:00Z');

// 1f: entry com escalated_from ausente → cai em 'unknown'
const mUnk = computeMemoryMetrics([{ timestamp: '2026-01-01T00:00:00Z' }]);
assert('metrics: escalated_from ausente → by_provider["unknown"]=1', mUnk.by_provider['unknown'] === 1);

// ── 2. Wiring estático (grep nos 3 arquivos) ─────────────────────

console.log('\n[wiring estático]');

const ROOT = path.join(__dirname);

// 2a: /api/metrics/memory em server.js
const serverSrc = fs.readFileSync(path.join(ROOT, 'backend', 'server.js'), 'utf8');
assert('server.js: rota /api/metrics/memory presente', serverSrc.includes('/api/metrics/memory'));
assert('server.js: computeMemoryMetrics importado', serverSrc.includes('computeMemoryMetrics'));
assert('server.js: readLowConfidenceLog importado', serverSrc.includes('readLowConfidenceLog'));
assert('server.js: anti_stub presente no endpoint memory', serverSrc.includes('anti_stub'));

// 2b: initObservabilityPanel107 no bundle
const bundleSrc = fs.readFileSync(path.join(ROOT, 'frontend', 'assets', 'vision-core-bundle.js'), 'utf8');
assert('bundle.js: initObservabilityPanel107 presente', bundleSrc.includes('initObservabilityPanel107'));
assert('bundle.js: referencia /api/metrics/agents', bundleSrc.includes('/api/metrics/agents'));
assert('bundle.js: referencia /api/metrics/summary', bundleSrc.includes('/api/metrics/summary'));
assert('bundle.js: referencia /api/dora-metrics', bundleSrc.includes('/api/dora-metrics'));
assert('bundle.js: referencia /api/metrics/memory', bundleSrc.includes('/api/metrics/memory'));
assert('bundle.js: guard if (!gotAny) return presente', bundleSrc.includes('if (!gotAny) return'));

// ── Resultado ────────────────────────────────────────────────────
console.log('\n─────────────────────────────────────────');
console.log('_test108_observability_unit: ' + passed + '/' + (passed + failed) + ' PASS');
if (failed > 0) {
  console.error(failed + ' teste(s) falharam.');
  process.exit(1);
}
