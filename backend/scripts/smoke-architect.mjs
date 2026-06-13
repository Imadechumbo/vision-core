/**
 * §73.2 — Smoke test: POST /api/architect/interpret
 *
 * Modes:
 *   --mock   Simulate LLM response (no API keys needed). Tests parse + spec-match + format.
 *   --http   Call real endpoint at PORT (server must be running).
 *   (none)   Direct callHermes (needs at least one provider key).
 *
 * Usage:
 *   node backend/scripts/smoke-architect.mjs --mock
 *   PORT=8080 node backend/scripts/smoke-architect.mjs --http
 *   node backend/scripts/smoke-architect.mjs
 */

import { createRequire } from 'module';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require    = createRequire(import.meta.url);
const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const ROOT       = path.resolve(__dirname, '..');
const REPO_ROOT  = path.resolve(ROOT, '..');
const HTTP_MODE  = process.argv.includes('--http');
const MOCK_MODE  = process.argv.includes('--mock') || (!HTTP_MODE);

const CONFIDENCE_THRESHOLD = 0.6;

/* ── Helpers ──────────────────────────────────────────────────────── */

function extractArchitectJson(answer) {
  const stripped = answer.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  return JSON.parse(stripped);
}

function loadSpecCache() {
  const SPEC_DIR = path.join(REPO_ROOT, 'docs', 'spec-library');
  const cache    = { byId: {}, byModule: {} };
  const files    = readdirSync(SPEC_DIR).filter(f => f.endsWith('.json') && !f.startsWith('_'));
  for (const file of files) {
    const mod  = file.replace('.json', '');
    const data = JSON.parse(readFileSync(path.join(SPEC_DIR, file), 'utf8'));
    cache.byModule[mod] = data.specs || [];
    for (const spec of data.specs || []) cache.byId[spec.id] = spec;
  }
  return cache;
}

function matchSpecsByTags(tags, cache, limit = 6) {
  if (!Array.isArray(tags) || tags.length === 0) return [];
  const tagSet = new Set(tags.map(t => t.toLowerCase()));
  const scored = [];
  for (const spec of Object.values(cache.byId)) {
    if (!Array.isArray(spec.tags)) continue;
    const hits = spec.tags.filter(t => tagSet.has(t.toLowerCase())).length;
    if (hits > 0) scored.push({ spec, hits });
  }
  scored.sort((a, b) => b.hits - a.hits);
  return scored.slice(0, limit).map(({ spec, hits }) => ({
    id: spec.id, module: spec.module, title: spec.title, tag_hits: hits
  }));
}

/* ── Test cases + mock LLM answers ───────────────────────────────── */

const TEST_CASES = [
  {
    label: 'Padaria (leigo)',
    message: 'quero um site para minha padaria',
    mockAnswer: JSON.stringify({
      project_type: 'site institucional para pequeno negócio',
      stack: ['html', 'css', 'javascript'],
      tags: ['static-site', 'small-business'],
      confidence: 0.75,
      explanation: 'Padaria geralmente precisa de site simples com cardápio e contato. Stack leve é suficiente. Ver SF-01.',
      open_questions: []
    })
  },
  {
    label: 'API Python (técnico)',
    message: 'preciso de uma API REST em Python para gerenciar estoque',
    mockAnswer: JSON.stringify({
      project_type: 'API de gerenciamento de estoque',
      stack: ['python', 'rest-api'],
      tags: ['api-backend', 'python', 'rest-api', 'database'],
      confidence: 0.9,
      explanation: 'Pedido bem definido: API REST + Python. Encaixa em SF-01-002. Recomendo SF-SEC para segurança.',
      open_questions: []
    })
  },
  {
    label: 'SaaS Node.js (técnico)',
    message: 'quero construir um SaaS de gestão financeira com Node.js e React',
    mockAnswer: JSON.stringify({
      project_type: 'SaaS de gestão financeira',
      stack: ['node-js', 'react'],
      tags: ['saas-fullstack', 'node-js', 'react', 'auth', 'database'],
      confidence: 0.88,
      explanation: 'SaaS fullstack com Node.js + React. Encaixa em SF-01-001. Exige auth robusta (SF-SEC) e banco de dados.',
      open_questions: []
    })
  },
  {
    label: 'Vago (confiança baixa)',
    message: 'quero um app',
    mockAnswer: JSON.stringify({
      project_type: 'aplicativo (tipo indefinido)',
      stack: [],
      tags: [],
      confidence: 0.3,
      explanation: 'Pedido muito vago para classificar com segurança.',
      open_questions: [
        'O app é mobile (Android/iOS) ou web?',
        'Qual problema o app resolve?',
        'Você tem preferência de linguagem ou tecnologia?',
        'Vai precisar de login de usuários?'
      ]
    })
  }
];

/* ── Mode runners ─────────────────────────────────────────────────── */

async function runHttp(tc) {
  const PORT = process.env.PORT || 8080;
  const url  = `http://localhost:${PORT}/api/architect/interpret`;
  const r    = await fetch(url, {
    method:  'POST',
    headers: { 'content-type': 'application/json' },
    body:    JSON.stringify({ message: tc.message })
  });
  return r.json();
}

async function runDirect(tc) {
  const { callHermes } = require('../hermes-rca');
  const systemPrompt   = readFileSync(path.join(ROOT, 'prompts', 'architect-system.md'), 'utf8');
  const cache          = loadSpecCache();

  const hermesResult = await callHermes(systemPrompt, tc.message, { timeout: 30000 });

  if (!hermesResult || hermesResult.ok === false) {
    return { ok: false, error: 'all_providers_exhausted', code: hermesResult?.code };
  }

  let classification;
  try {
    classification = extractArchitectJson(hermesResult.answer);
  } catch (e) {
    return { ok: false, error: 'llm_parse_error', raw: hermesResult.answer.slice(0, 300) };
  }

  const confidence = typeof classification.confidence === 'number'
    ? Math.min(1, Math.max(0, classification.confidence)) : 0.0;
  classification.confidence = confidence;

  const baseResp = {
    ok: true, classification,
    provider_used: hermesResult.provider_used,
    model_used:    hermesResult.model_used,
    mode:          'LOCAL PREVIEW',
    exec_real:     'BLOQUEADA'
  };

  if (confidence < CONFIDENCE_THRESHOLD) {
    return { ...baseResp, specs_suggested: [], open_questions: classification.open_questions || [] };
  }
  const tags = Array.isArray(classification.tags) ? classification.tags : [];
  return { ...baseResp, specs_suggested: matchSpecsByTags(tags, cache), open_questions: [] };
}

async function runMock(tc) {
  const cache = loadSpecCache();
  let classification;
  try {
    classification = extractArchitectJson(tc.mockAnswer);
  } catch (e) {
    return { ok: false, error: 'mock_parse_error', detail: e.message };
  }

  const confidence = typeof classification.confidence === 'number'
    ? Math.min(1, Math.max(0, classification.confidence)) : 0.0;
  classification.confidence = confidence;

  const baseResp = {
    ok: true, classification,
    provider_used: 'mock',
    model_used:    'mock-llm-v1',
    mode:          'LOCAL PREVIEW',
    exec_real:     'BLOQUEADA'
  };

  if (confidence < CONFIDENCE_THRESHOLD) {
    return { ...baseResp, specs_suggested: [], open_questions: classification.open_questions || [] };
  }
  const tags = Array.isArray(classification.tags) ? classification.tags : [];
  return { ...baseResp, specs_suggested: matchSpecsByTags(tags, cache), open_questions: [] };
}

/* ── Assert + print ───────────────────────────────────────────────── */

let PASS = 0;
let FAIL = 0;

async function runCase(tc, idx) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`[${idx + 1}/${TEST_CASES.length}] ${tc.label}`);
  console.log(`Input: "${tc.message}"`);

  let result;
  if (HTTP_MODE)       result = await runHttp(tc);
  else if (MOCK_MODE)  result = await runMock(tc);
  else                 result = await runDirect(tc);

  if (!result.ok) {
    console.log(`❌ FAIL — error: ${result.error} | code: ${result.code || '-'}`);
    FAIL++;
    return;
  }

  const c = result.classification;
  console.log(`✓ provider   : ${result.provider_used} / ${result.model_used}`);
  console.log(`✓ project    : ${c.project_type}`);
  console.log(`✓ stack      : ${(c.stack || []).join(', ') || '—'}`);
  console.log(`✓ tags       : ${(c.tags || []).join(', ') || '—'}`);
  console.log(`✓ confidence : ${c.confidence}`);
  console.log(`✓ explanation: ${(c.explanation || '').slice(0, 120)}`);
  console.log(`✓ mode       : ${result.mode} | exec_real: ${result.exec_real}`);

  if (result.open_questions && result.open_questions.length > 0) {
    console.log(`  open_questions (${result.open_questions.length}):`);
    result.open_questions.forEach((q, i) => console.log(`    ${i + 1}. ${q}`));
  }

  if (result.specs_suggested && result.specs_suggested.length > 0) {
    console.log(`  specs_suggested (${result.specs_suggested.length}):`);
    result.specs_suggested.forEach(s =>
      console.log(`    ${s.id} [${s.tag_hits} hit(s)] — ${s.title}`)
    );
  } else if (c.confidence >= CONFIDENCE_THRESHOLD) {
    console.log(`  specs_suggested: (nenhuma correspondência de tags na library)`);
  }

  const checks = [
    { label: 'ok=true',                   pass: result.ok === true },
    { label: 'project_type set',          pass: !!c.project_type },
    { label: 'confidence in [0,1]',       pass: c.confidence >= 0 && c.confidence <= 1 },
    { label: 'mode=LOCAL PREVIEW',        pass: result.mode === 'LOCAL PREVIEW' },
    { label: 'exec_real=BLOQUEADA',       pass: result.exec_real === 'BLOQUEADA' },
    {
      label: 'low-conf → open_questions',
      pass: c.confidence >= CONFIDENCE_THRESHOLD
        ? true
        : (Array.isArray(result.open_questions) && result.open_questions.length > 0)
    },
    {
      label: 'high-conf → specs array',
      pass: c.confidence < CONFIDENCE_THRESHOLD
        ? true
        : Array.isArray(result.specs_suggested)
    }
  ];

  let casePass = true;
  for (const chk of checks) {
    if (!chk.pass) { console.log(`  ✗ ASSERT FAIL: ${chk.label}`); casePass = false; }
  }

  if (casePass) { console.log('→ PASS'); PASS++; }
  else          { console.log('→ FAIL'); FAIL++; }
}

async function main() {
  console.log('═'.repeat(60));
  console.log('§73.2 — Smoke Test: /api/architect/interpret');
  const modeLabel = HTTP_MODE ? 'HTTP (localhost)' : MOCK_MODE ? 'Mock (no API keys needed)' : 'Direct (callHermes)';
  console.log(`Mode: ${modeLabel}`);
  console.log('═'.repeat(60));

  for (let i = 0; i < TEST_CASES.length; i++) {
    await runCase(TEST_CASES[i], i);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`RESULTS: ${PASS} PASS / ${FAIL} FAIL / ${TEST_CASES.length} TOTAL`);
  console.log('═'.repeat(60));

  if (FAIL > 0) process.exit(1);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
