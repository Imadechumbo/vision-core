'use strict';
/**
 * _test107_memory_layer_unit.cjs — §107 memory layer unit tests
 * Cobre: tokenize, jaccardOverlap, readLowConfidenceLog,
 *        findSimilarLowConfidenceCases, applyMemoryReordering
 * 17 testes, fixture JSONL temporária em os.tmpdir()
 */

const os   = require('os');
const fs   = require('fs');
const path = require('path');

const {
  tokenize, jaccardOverlap, readLowConfidenceLog,
  findSimilarLowConfidenceCases, applyMemoryReordering
} = require('./backend/hermes-rca');

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

function setEq(a, b) {
  if (a.size !== b.size) return false;
  for (const v of a) { if (!b.has(v)) return false; }
  return true;
}

// ── 1. tokenize ──────────────────────────────────────────────────

console.log('\n[tokenize]');

const t1 = tokenize('race condition in shared state');
assert('tokenize: palavras >=4 chars incluídas', t1.has('race') && t1.has('condition') && t1.has('shared') && t1.has('state'));
assert('tokenize: palavras curtas excluídas (<4 chars)', !t1.has('in'));

const t2 = tokenize('');
assert('tokenize: string vazia → Set vazio', t2.size === 0);

const t3 = tokenize(null);
assert('tokenize: null → Set vazio', t3.size === 0);

const t4 = tokenize('CLOSURE SHADOWING Closure');
// deve normalizar pra minúsculas — 'closure' e 'shadowing'
assert('tokenize: case-insensitive (closure aparece uma vez)', setEq(t4, new Set(['closure', 'shadowing'])));

// ── 2. jaccardOverlap ────────────────────────────────────────────

console.log('\n[jaccardOverlap]');

const sA = new Set(['alpha', 'beta', 'gamma']);
const sB = new Set(['alpha', 'beta', 'gamma']);
const sC = new Set(['delta', 'epsilon']);
const sD = new Set(['alpha', 'delta']);

assert('jaccard: sets idênticos = 1', jaccardOverlap(sA, sB) === 1);
assert('jaccard: sem overlap = 0', jaccardOverlap(sA, sC) === 0);

const partial = jaccardOverlap(sA, sD); // intersect=1, union=4
assert('jaccard: overlap parcial (1/4 = 0.25)', Math.abs(partial - 0.25) < 1e-9);

assert('jaccard: set vazio A retorna 0', jaccardOverlap(new Set(), sA) === 0);
assert('jaccard: set vazio B retorna 0', jaccardOverlap(sA, new Set()) === 0);
assert('jaccard: null/undefined retorna 0', jaccardOverlap(null, sA) === 0);

// ── 3. readLowConfidenceLog ──────────────────────────────────────

console.log('\n[readLowConfidenceLog]');

// 3a: arquivo ausente → []
const fakePath = path.join(os.tmpdir(), 'vc-test107-' + Date.now());
// não existe nada em fakePath — mas readLowConfidenceLog usa cwd()/.vision-memory
// então vamos simular criando um dir temporário e mudando cwd

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vc107-'));
const memDir = path.join(tmpDir, '.vision-memory');
fs.mkdirSync(memDir, { recursive: true });

const savedCwd = process.cwd();
process.chdir(tmpDir);

// sem arquivo ainda
const r0 = readLowConfidenceLog();
assert('readLog: arquivo ausente → []', Array.isArray(r0) && r0.length === 0);

// 3b: escreve 3 entradas conhecidas
const entries3 = [
  { timestamp: '2026-01-01T00:00:00Z', escalated_from: 'openai',     keywords: ['closure', 'shadowing', 'estado', 'compartilhado'], payload_size: 100 },
  { timestamp: '2026-01-02T00:00:00Z', escalated_from: 'groq',       keywords: ['race', 'condition', 'mutex', 'thread'],            payload_size: 200 },
  { timestamp: '2026-01-03T00:00:00Z', escalated_from: 'deepseek',   keywords: ['memory', 'leak', 'heap', 'allocation'],            payload_size: 300 }
];
const logFile = path.join(memDir, 'hermes_low_confidence.jsonl');
for (const e of entries3) { fs.appendFileSync(logFile, JSON.stringify(e) + '\n', 'utf8'); }

const r3 = readLowConfidenceLog();
assert('readLog: lê 3 entradas', r3.length === 3);
assert('readLog: mais recente primeiro (deepseek é [0])', r3[0].escalated_from === 'deepseek');

// 3c: maxEntries limita resultado
const r1 = readLowConfidenceLog(1);
assert('readLog: maxEntries=1 → 1 entrada (a mais recente)', r1.length === 1 && r1[0].escalated_from === 'deepseek');

// 3d: linha corrompida não quebra
fs.appendFileSync(logFile, 'LINHA_INVALIDA_JSON\n', 'utf8');
const r4 = readLowConfidenceLog();
assert('readLog: linha corrompida pula sem quebrar (ainda 3 válidas)', r4.length === 3);

// ── 4. findSimilarLowConfidenceCases ────────────────────────────

console.log('\n[findSimilarLowConfidenceCases]');

const entries = readLowConfidenceLog();

// 4a: input parecido com entry0 (closure/shadowing) → encontra
const simClosure = findSimilarLowConfidenceCases('closure em estado compartilhado causa bug', entries);
assert('findSimilar: detecta caso parecido (closure/estado)', simClosure.length >= 1 && simClosure.some(e => e.escalated_from === 'openai'));

// 4b: input totalmente diferente → não encontra
const simDiff = findSimilarLowConfidenceCases('problema com css layout flex grid button', entries);
assert('findSimilar: input diferente → nenhum match', simDiff.length === 0);

// 4c: entries vazio → []
const simEmpty = findSimilarLowConfidenceCases('closure shared state', []);
assert('findSimilar: entries vazio → []', simEmpty.length === 0);

// 4d: input vazio → []
const simEmptyInput = findSimilarLowConfidenceCases('', entries);
assert('findSimilar: input vazio → []', simEmptyInput.length === 0);

// ── 5. applyMemoryReordering ─────────────────────────────────────

console.log('\n[applyMemoryReordering]');

const order = ['anthropic', 'groq', 'deepseek', 'gemini'];

// 5a: nenhum caso similar → mesma ordem
const r5a = applyMemoryReordering(order, []);
assert('reorder: sem casos similares → mesma ordem', r5a.join(',') === order.join(','));

// 5b: groq no similar → move pra trás, nunca perde
const r5b = applyMemoryReordering(order, [{ escalated_from: 'groq' }]);
assert('reorder: groq movido pro final', r5b.indexOf('groq') === r5b.length - 1);
assert('reorder: groq não removido (ainda na lista)', r5b.includes('groq'));
assert('reorder: contagem preservada (sem duplicata)', r5b.length === order.length);
assert('reorder: elementos sem weak provider mantêm ordem relativa', r5b.indexOf('anthropic') < r5b.indexOf('deepseek'));

// 5c: similarCases com escalated_from nulo/undefined não quebra
const r5c = applyMemoryReordering(order, [{ escalated_from: null }, { escalated_from: undefined }]);
assert('reorder: escalated_from nulo/undefined → mesma ordem', r5c.join(',') === order.join(','));

// ── Cleanup ──────────────────────────────────────────────────────
process.chdir(savedCwd);
fs.rmSync(tmpDir, { recursive: true, force: true });

// ── Resultado ────────────────────────────────────────────────────
console.log('\n─────────────────────────────────────────');
console.log('_test107_memory_layer_unit: ' + passed + '/' + (passed + failed) + ' PASS');
if (failed > 0) {
  console.error(failed + ' teste(s) falharam.');
  process.exit(1);
}
