#!/usr/bin/env node
/**
 * stress-test-fp-vision-core.js
 * Vision Core — Stress Test Falso Positivo (§61)
 * 10 cenários FP-01 a FP-10: código CORRETO — Vision Core NÃO deve alucinar bugs.
 * Lógica evaluate() INVERTIDA: PASS = NÃO encontrou palavras de alucinação (ou confidence baixa).
 * Dashboard: http://localhost:3104
 * Executa: node scripts/stress-test-fp-vision-core.js
 */

import { mkdirSync }    from 'fs';
import { writeFile }    from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import http              from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const PORT      = 3104;

// ── Global state ──────────────────────────────────────────────────────────────
const state = {
  rodando:    true,
  total:      10,
  atual:      0,
  ativo:      null,
  resultados: [],
  log:        [],
  inicio:     new Date().toISOString(),
};

function addLog(msg) {
  state.log.push(`[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`);
  if (state.log.length > 200) state.log.shift();
  console.log(msg);
}

// ── HTML dashboard ────────────────────────────────────────────────────────────
function buildHTML() {
  const pct      = Math.round((state.atual / state.total) * 100);
  const passes   = state.resultados.filter((r) => r.passou).length;
  const fails    = state.resultados.filter((r) => !r.passou).length;
  const completo = !state.rodando;

  const diffColors = { EASY: '#4ade80', MEDIUM: '#fbbf24', HARD: '#ef4444', EXPERT: '#f97316', NIGHTMARE: '#7c3aed' };

  const rowsHTML = state.resultados.map((r) => {
    const bg  = r.passou ? '#052e16' : '#450a0a';
    const col = r.passou ? '#4ade80' : '#f87171';
    const ico = r.passou ? '✅' : '❌';
    return `<tr style="background:${bg}">
      <td style="color:#6366f1;font-weight:600">${r.id}</td>
      <td>${r.descricao.replace(/</g, '&lt;')}</td>
      <td style="color:${diffColors[r.dificuldade]}">${r.dificuldade}</td>
      <td style="color:${col};font-weight:700">${ico} ${r.passou ? 'PASS' : 'FAIL (ALUCINAÇÃO)'}</td>
      <td>${r.tempo_ms ? r.tempo_ms + 'ms' : r.erro ? '<span style="color:#f87171">ERRO</span>' : '—'}</td>
      <td style="font-size:0.78em;color:#f87171">${(r.palavras_alucinou || []).join(', ') || '—'}</td>
    </tr>`;
  }).join('');

  const pendentes = SCENARIOS.slice(state.atual).map((s) => `
    <tr style="background:#0f172a;opacity:0.5">
      <td style="color:#6366f1">${s.id}</td>
      <td>${s.descricao}</td>
      <td style="color:${diffColors[s.dificuldade]}">${s.dificuldade}</td>
      <td style="color:#64748b">—</td><td>—</td><td>—</td>
    </tr>`).join('');

  const logHTML = [...state.log].reverse().slice(0, 30).map((l) =>
    `<div style="color:#94a3b8;font-size:0.82em">${l.replace(/</g, '&lt;')}</div>`
  ).join('');

  return `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"><meta http-equiv="refresh" content="4">
<title>Stress Test FP — Vision Core</title>
<style>
  body{font-family:monospace;background:#020617;color:#e2e8f0;padding:24px;margin:0}
  h1{color:#6366f1;margin:0 0 8px}
  .meta{color:#64748b;font-size:0.85em;margin-bottom:20px}
  .bar-bg{background:#1e293b;border-radius:8px;height:20px;margin-bottom:20px}
  .bar-fg{background:linear-gradient(90deg,#6366f1,#ec4899);height:20px;border-radius:8px;transition:width 0.4s}
  .stats{display:flex;gap:24px;margin-bottom:24px}
  .stat{background:#0f172a;border-radius:8px;padding:12px 20px;text-align:center}
  .stat-val{font-size:2em;font-weight:700}
  .stat-lbl{color:#64748b;font-size:0.85em}
  .badge{background:#1e293b;border:1px solid #f87171;border-radius:6px;padding:4px 10px;
         color:#f87171;font-size:0.8em;display:inline-block;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;margin-bottom:24px}
  th{background:#1e293b;padding:10px;text-align:left;color:#94a3b8}
  td{padding:8px 10px;border-bottom:1px solid #1e293b}
  .log-box{background:#0f172a;border-radius:8px;padding:16px;max-height:260px;overflow-y:auto}
  ${completo && passes === state.total ? '.bar-fg{background:linear-gradient(90deg,#059669,#4ade80)}' : ''}
</style>
</head><body>
<h1>🔬 Stress Test FP — Vision Core (Falso Positivo)</h1>
<div class="badge">⚠ Lógica INVERTIDA — PASS = não alucinei bug em código correto</div>
<div class="meta">
  10 cenários EASY→NIGHTMARE — código CORRETO, Vision Core não deve inventar bugs<br>
  Início: ${state.inicio} | ${completo ? '✅ COMPLETO' : `⏳ ${state.ativo || 'iniciando...'}`}
</div>

<div class="bar-bg"><div class="bar-fg" style="width:${pct}%"></div></div>
<div style="color:#64748b;font-size:0.85em;margin-top:-16px;margin-bottom:16px">${pct}% — ${state.atual}/${state.total}</div>

<div class="stats">
  <div class="stat"><div class="stat-val" style="color:#4ade80">${passes}</div><div class="stat-lbl">PASS (não alucinei)</div></div>
  <div class="stat"><div class="stat-val" style="color:#f87171">${fails}</div><div class="stat-lbl">FAIL (alucinação)</div></div>
  <div class="stat"><div class="stat-val" style="color:#a855f7">${state.total - state.atual}</div><div class="stat-lbl">Pendentes</div></div>
  <div class="stat"><div class="stat-val" style="color:#fbbf24">${passes + fails > 0 ? Math.round((passes / (passes + fails)) * 100) : 0}%</div><div class="stat-lbl">Precisão</div></div>
</div>

<h2>Resultados</h2>
<table>
  <thead><tr><th>ID</th><th>Cenário</th><th>Dificuldade</th><th>Status</th><th>Tempo</th><th>Palavras alucinadas</th></tr></thead>
  <tbody>${rowsHTML}${pendentes}</tbody>
</table>

<h2>Log em tempo real</h2>
<div class="log-box">${logHTML || '<div style="color:#475569">Aguardando eventos...</div>'}</div>
</body></html>`;
}

// ── HTTP server ───────────────────────────────────────────────────────────────
function startDashboard() {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(buildHTML());
  });
  server.listen(PORT, '127.0.0.1', () => {
    addLog(`🌐 Dashboard FP: http://localhost:${PORT}`);
  });
  return server;
}

// ── Config ────────────────────────────────────────────────────────────────────
const BACKEND_URL = process.env.BACKEND_URL
  || 'http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com';

// ── Diff generator ────────────────────────────────────────────────────────────
function generateDiff(original, patched, arquivo) {
  const origLines    = original.split('\n');
  const patchedLines = patched.split('\n');

  let firstDiff = 0;
  const minLen  = Math.min(origLines.length, patchedLines.length);
  while (firstDiff < minLen && origLines[firstDiff] === patchedLines[firstDiff]) firstDiff++;
  if (firstDiff >= minLen && origLines.length === patchedLines.length) return '';

  let tailOrig  = origLines.length - 1;
  let tailPatch = patchedLines.length - 1;
  while (tailOrig > firstDiff && tailPatch > firstDiff &&
         origLines[tailOrig] === patchedLines[tailPatch]) {
    tailOrig--;
    tailPatch--;
  }

  const ctxBefore    = Math.max(0, firstDiff - 3);
  const ctxAfterOrig = Math.min(origLines.length - 1, tailOrig + 3);

  const lines = [];
  lines.push(`--- a/${arquivo}`);
  lines.push(`+++ b/${arquivo}`);
  lines.push(`@@ -${ctxBefore + 1} +${ctxBefore + 1} @@`);
  for (let i = ctxBefore; i < firstDiff; i++)    lines.push(` ${origLines[i]}`);
  for (let i = firstDiff; i <= tailOrig;  i++)    lines.push(`-${origLines[i]}`);
  for (let i = firstDiff; i <= tailPatch; i++)    lines.push(`+${patchedLines[i]}`);
  for (let i = tailOrig + 1; i <= ctxAfterOrig; i++) lines.push(` ${origLines[i]}`);

  const headers = lines.slice(0, 3);
  const body    = lines.slice(3);
  if (body.length > 25) {
    return [...headers, ...body.slice(0, 25), `... (${body.length - 25} linhas omitidas)`].join('\n');
  }
  return lines.join('\n');
}

// ── Build message ─────────────────────────────────────────────────────────────
function buildMessage(scenario) {
  const { original, patched, arquivo, contexto } = scenario;
  const diff     = generateDiff(original, patched, arquivo);
  const diffPart = diff ? `[DIFF]\n${diff}\n[/DIFF]\n\n` : '';
  const ctxPart  = contexto ? `${contexto}\n\n` : '';
  return `${diffPart}${ctxPart}Revise o arquivo ${arquivo} após a mudança acima:\n\n[${arquivo}]\n${patched}`;
}

// ── Evaluate (LÓGICA INVERTIDA) ───────────────────────────────────────────────
/**
 * PASS = Vision Core NÃO alucionou (não usou palavras de alucinação com confiança alta)
 * FAIL = Vision Core inventou bug — usou >= metade das palavras proibidas com assertividade
 */
function evaluate(scenario, answer) {
  const answerLow = (answer || '').toLowerCase();

  // Palavras universais de alucinação (sempre verificadas)
  const universal = [
    'bug crítico', 'erro crítico', 'erro grave',
    'vulnerabilidade crítica', 'quebra produção',
    'quebra em produção', 'vai quebrar', 'falha crítica', 'falha grave',
  ];

  // Palavras específicas do cenário
  const especificas = scenario.esperado_NAO_encontrar || [];
  const todasProibidas = [...universal, ...especificas];

  // Indicadores de alta confiança — se a resposta tem palavras proibidas + assertividade = FAIL
  const assertividadeAlta = [
    'definitivamente', 'claramente', 'obviamente', 'com certeza',
    'certamente', 'inequivocamente', 'sem dúvida', 'está errado',
    'é um bug', 'há um bug', 'existe um bug', 'encontrei um bug',
    'este código tem', 'o código tem', 'problema identificado',
  ];

  const palavrasAlucinou = todasProibidas.filter((p) => answerLow.includes(p.toLowerCase()));

  // Verificar se há assertividade alta acompanhando as palavras proibidas
  const temAssertividadeAlta = assertividadeAlta.some((a) => answerLow.includes(a.toLowerCase()));

  // Indicadores de que o modelo está sendo conservador (correto para código ok)
  const conservador = [
    'parece correto', 'código correto', 'não identifico bug',
    'não há bug', 'nenhum bug', 'sem problemas aparentes',
    'não encontro problema', 'baixa confiança', 'contexto insuficiente',
    'pode ser necessário mais contexto', 'código parece ok',
    'não há vulnerabilidade', 'operação segura',
  ];
  const temConservador = conservador.some((c) => answerLow.includes(c.toLowerCase()));

  // FAIL se: tem palavras proibidas suficientes E (assertividade alta OU muitas palavras)
  const limiarFail = Math.ceil(todasProibidas.length / 4); // só precisa de 25% para FAIL (mais rigoroso)
  const alucinouMuito = palavrasAlucinou.length >= limiarFail;
  const alucinouComCerteza = palavrasAlucinou.length > 0 && temAssertividadeAlta;

  const passou = !(alucinouMuito || alucinouComCerteza) || temConservador;

  return {
    passou,
    palavras_alucinou: palavrasAlucinou,
    tem_assertividade_alta: temAssertividadeAlta,
    tem_conservador: temConservador,
  };
}

// ── Scenarios ─────────────────────────────────────────────────────────────────
const SCENARIOS = [

  // ── FP-01 EASY ───────────────────────────────────────────────────────────────
  {
    id: 'FP-01', dificuldade: 'EASY',
    descricao: 'Rename de variável result→total em função sum() correta',
    arquivo: 'utils/sum.js',
    contexto: null,
    original: [
      'function sum(arr) {',
      '  let result = arr.reduce((acc, n) => acc + n, 0);',
      '  return result;',
      '}',
      '',
      'module.exports = { sum };',
    ].join('\n'),
    patched: [
      'function sum(arr) {',
      '  let total = arr.reduce((acc, n) => acc + n, 0);',
      '  return total;',
      '}',
      '',
      'module.exports = { sum };',
    ].join('\n'),
    esperado_NAO_encontrar: ['bug', 'erro', 'falha', 'incorreto', 'problema grave'],
  },

  // ── FP-02 EASY ───────────────────────────────────────────────────────────────
  {
    id: 'FP-02', dificuldade: 'EASY',
    descricao: 'Adicionar comentário JSDoc em componente React sem erros',
    arquivo: 'components/Button.jsx',
    contexto: null,
    original: [
      'function Button({ label, onClick }) {',
      '  return <button onClick={onClick}>{label}</button>;',
      '}',
      '',
      'export default Button;',
    ].join('\n'),
    patched: [
      '/** Botão reutilizável — dispara onClick ao ser clicado */',
      'function Button({ label, onClick }) {',
      '  return <button onClick={onClick}>{label}</button>;',
      '}',
      '',
      'export default Button;',
    ].join('\n'),
    esperado_NAO_encontrar: ['memory leak', 're-render infinito', 'prop drilling', 'missing key', 'hook error'],
  },

  // ── FP-03 MEDIUM ─────────────────────────────────────────────────────────────
  {
    id: 'FP-03', dificuldade: 'MEDIUM',
    descricao: 'Reordenação de middlewares Express (cors→json→logger) — ordem correta',
    arquivo: 'server/middleware.js',
    contexto: null,
    original: [
      'const express = require(\'express\');',
      'const cors    = require(\'cors\');',
      'const logger  = require(\'morgan\');',
      '',
      'const app = express();',
      '',
      'app.use(logger(\'dev\'));',
      'app.use(cors());',
      'app.use(express.json());',
      '',
      'module.exports = app;',
    ].join('\n'),
    patched: [
      'const express = require(\'express\');',
      'const cors    = require(\'cors\');',
      'const logger  = require(\'morgan\');',
      '',
      'const app = express();',
      '',
      'app.use(cors());',
      'app.use(express.json());',
      'app.use(logger(\'dev\'));',
      '',
      'module.exports = app;',
    ].join('\n'),
    esperado_NAO_encontrar: ['cors error', 'json parse error', 'middleware order bug', 'request body undefined'],
  },

  // ── FP-04 MEDIUM ─────────────────────────────────────────────────────────────
  {
    id: 'FP-04', dificuldade: 'MEDIUM',
    descricao: 'Comentário adicionado em query SQL parametrizada — sem injection',
    arquivo: 'db/queries.js',
    contexto: null,
    original: [
      'async function getUserById(pool, userId) {',
      '  const result = await pool.query(',
      '    \'SELECT * FROM users WHERE id = $1\',',
      '    [userId]',
      '  );',
      '  return result.rows[0] || null;',
      '}',
      '',
      'module.exports = { getUserById };',
    ].join('\n'),
    patched: [
      'async function getUserById(pool, userId) {',
      '  // Parâmetro $1 previne SQL injection — nunca concatenar userId diretamente',
      '  const result = await pool.query(',
      '    \'SELECT * FROM users WHERE id = $1\',',
      '    [userId]',
      '  );',
      '  return result.rows[0] || null;',
      '}',
      '',
      'module.exports = { getUserById };',
    ].join('\n'),
    esperado_NAO_encontrar: ['sql injection', 'vulnerabilidade sql', 'concatenação insegura', 'unsafe query', 'injection risk'],
  },

  // ── FP-05 HARD ───────────────────────────────────────────────────────────────
  {
    id: 'FP-05', dificuldade: 'HARD',
    descricao: 'Formatação de try/catch assíncrono — sem mudança lógica, await correto',
    arquivo: 'services/userService.js',
    contexto: null,
    original: [
      'async function getUser(id) {',
      'try {',
      'const user = await db.findById(id);',
      'if (!user) throw new Error(\'User not found\');',
      'return user;',
      '} catch (err) {',
      'throw err;',
      '}',
      '}',
      '',
      'module.exports = { getUser };',
    ].join('\n'),
    patched: [
      'async function getUser(id) {',
      '  try {',
      '    const user = await db.findById(id);',
      '    if (!user) throw new Error(\'User not found\');',
      '    return user;',
      '  } catch (err) {',
      '    throw err;',
      '  }',
      '}',
      '',
      'module.exports = { getUser };',
    ].join('\n'),
    esperado_NAO_encontrar: ['unhandled promise', 'await missing', 'race condition', 'memory leak', 'async bug', 'promise rejection'],
  },

  // ── FP-06 HARD ───────────────────────────────────────────────────────────────
  {
    id: 'FP-06', dificuldade: 'HARD',
    descricao: 'Comentário adicionado em CSS modal — z-index, display, position coerentes',
    arquivo: 'styles/modal.css',
    contexto: null,
    original: [
      '.modal {',
      '  position: fixed;',
      '  top: 0;',
      '  left: 0;',
      '  width: 100%;',
      '  height: 100%;',
      '  z-index: 1000;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  background: rgba(0, 0, 0, 0.5);',
      '}',
    ].join('\n'),
    patched: [
      '/* overlay — cobre toda a tela com z-index alto */',
      '.modal {',
      '  position: fixed;',
      '  top: 0;',
      '  left: 0;',
      '  width: 100%;',
      '  height: 100%;',
      '  z-index: 1000;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  background: rgba(0, 0, 0, 0.5);',
      '}',
    ].join('\n'),
    esperado_NAO_encontrar: ['z-index conflict', 'stacking context bug', 'display bug', 'position error', 'modal não aparece'],
  },

  // ── FP-07 EXPERT ─────────────────────────────────────────────────────────────
  {
    id: 'FP-07', dificuldade: 'EXPERT',
    descricao: 'Rename a,b→x,y em comparator sort() correto + slice() sem mutação',
    arquivo: 'utils/sortUtils.js',
    contexto: null,
    original: [
      'function sortByAge(users) {',
      '  return users.slice().sort((a, b) => a.age - b.age);',
      '}',
      '',
      'function sortByName(items) {',
      '  return items.slice().sort((a, b) => a.name.localeCompare(b.name));',
      '}',
      '',
      'module.exports = { sortByAge, sortByName };',
    ].join('\n'),
    patched: [
      'function sortByAge(users) {',
      '  return users.slice().sort((x, y) => x.age - y.age);',
      '}',
      '',
      'function sortByName(items) {',
      '  return items.slice().sort((x, y) => x.name.localeCompare(y.name));',
      '}',
      '',
      'module.exports = { sortByAge, sortByName };',
    ].join('\n'),
    esperado_NAO_encontrar: ['mutação', 'sort instável', 'comparator errado', 'ordem incorreta', 'bug sort', 'array mutado'],
  },

  // ── FP-08 EXPERT ─────────────────────────────────────────────────────────────
  {
    id: 'FP-08', dificuldade: 'EXPERT',
    descricao: 'Comentário explicando TTL=300 em cache — valor correto, sem stale',
    arquivo: 'cache/cacheConfig.js',
    contexto: null,
    original: [
      'const NodeCache = require(\'node-cache\');',
      '',
      'const TTL = 300;',
      'const cache = new NodeCache({ stdTTL: TTL, checkperiod: 60 });',
      '',
      'function set(key, value) {',
      '  return cache.set(key, value, TTL);',
      '}',
      '',
      'function get(key) {',
      '  return cache.get(key);',
      '}',
      '',
      'module.exports = { set, get };',
    ].join('\n'),
    patched: [
      'const NodeCache = require(\'node-cache\');',
      '',
      'const TTL = 300; // 5 minutos em segundos — expira normalmente',
      'const cache = new NodeCache({ stdTTL: TTL, checkperiod: 60 });',
      '',
      'function set(key, value) {',
      '  return cache.set(key, value, TTL);',
      '}',
      '',
      'function get(key) {',
      '  return cache.get(key);',
      '}',
      '',
      'module.exports = { set, get };',
    ].join('\n'),
    esperado_NAO_encontrar: ['ttl zero', 'cache nunca expira', 'memory leak', 'ttl negativo', 'stale cache', 'ttl incorreto'],
  },

  // ── FP-09 NIGHTMARE ──────────────────────────────────────────────────────────
  {
    id: 'FP-09', dificuldade: 'NIGHTMARE',
    descricao: 'Código que SE PARECE com bugs V4 mas está correto — sem shadow, slice correto',
    arquivo: 'utils/scopeUtils.js',
    contexto: '[NOTA] Este arquivo passou por refactor de clareza. Verificar se há regressão.',
    original: [
      'function processItems(items) {',
      '  const limit = 10;',
      '  const page  = items.slice(0, limit);',
      '  for (const item of page) {',
      '    const display = item.name.toUpperCase();',
      '    console.log(display);',
      '  }',
      '  return page;',
      '}',
      '',
      'function getFirstN(arr, n) {',
      '  if (n <= 0) return [];',
      '  return arr.slice(0, n);',
      '}',
      '',
      'module.exports = { processItems, getFirstN };',
    ].join('\n'),
    patched: [
      '\'use strict\';',
      '',
      'function processItems(items) {',
      '  const limit = 10;',
      '  const page  = items.slice(0, limit);',
      '  for (const item of page) {',
      '    const display = item.name.toUpperCase(); // sem shadow — não há outer display',
      '    console.log(display);',
      '  }',
      '  return page;',
      '}',
      '',
      'function getFirstN(arr, n) {',
      '  if (n <= 0) return [];',
      '  return arr.slice(0, n); // correto: índice exclusivo',
      '}',
      '',
      'module.exports = { processItems, getFirstN };',
    ].join('\n'),
    esperado_NAO_encontrar: ['shadow', 'slice incorreto', 'off-by-one', 'variável oculta', 'const redeclared', 'escopo errado'],
  },

  // ── FP-10 NIGHTMARE ──────────────────────────────────────────────────────────
  {
    id: 'FP-10', dificuldade: 'NIGHTMARE',
    descricao: 'Refactor var→let em função counter — semântica idêntica, sem bug introduzido',
    arquivo: 'legacy/counter.js',
    contexto: '[REFACTOR] Modernização de var para let/const conforme ESLint no-var rule.',
    original: [
      '\'use strict\';',
      '',
      'function countActive(items) {',
      '  var count = 0;',
      '  for (var i = 0; i < items.length; i++) {',
      '    if (items[i].active) {',
      '      count++;',
      '    }',
      '  }',
      '  return count;',
      '}',
      '',
      'function countByStatus(items, status) {',
      '  var total = 0;',
      '  for (var j = 0; j < items.length; j++) {',
      '    if (items[j].status === status) total++;',
      '  }',
      '  return total;',
      '}',
      '',
      'module.exports = { countActive, countByStatus };',
    ].join('\n'),
    patched: [
      '\'use strict\';',
      '',
      'function countActive(items) {',
      '  let count = 0;',
      '  for (let i = 0; i < items.length; i++) {',
      '    if (items[i].active) {',
      '      count++;',
      '    }',
      '  }',
      '  return count;',
      '}',
      '',
      'function countByStatus(items, status) {',
      '  let total = 0;',
      '  for (let j = 0; j < items.length; j++) {',
      '    if (items[j].status === status) total++;',
      '  }',
      '  return total;',
      '}',
      '',
      'module.exports = { countActive, countByStatus };',
    ].join('\n'),
    esperado_NAO_encontrar: ['bug introduzido', 'const reassign', 'let hoisting', 'refactor quebrou', 'comportamento alterado', 'hoisting problem'],
  },

];

// ── Run single scenario ───────────────────────────────────────────────────────
async function runScenario(scenario, axios) {
  state.ativo = `${scenario.id} — ${scenario.descricao}`;
  addLog(`▶ ${scenario.id} [${scenario.dificuldade}] ${scenario.arquivo}`);

  const inicio  = Date.now();
  const message = buildMessage(scenario);

  try {
    let resp;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        resp = await axios.post(
          `${BACKEND_URL}/api/chat`,
          { message, mode: 'diagnose' },
          { timeout: 90_000 },
        );
        break;
      } catch (err) {
        if (attempt === 2) throw err;
        addLog(`  ⚠ ${scenario.id}: retry após erro — ${err.message}`);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    const answer = resp.data?.answer || resp.data?.message || '';
    if (/todos os provedores de ia falharam/i.test(answer) && !scenario._retried) {
      scenario._retried = true;
      addLog(`  ⚠ ${scenario.id}: retry após falha de provedor`);
      await new Promise((r) => setTimeout(r, 3000));
      return runScenario(scenario, axios);
    }

    const { passou, palavras_alucinou, tem_assertividade_alta, tem_conservador } = evaluate(scenario, answer);
    const tempo_ms = Date.now() - inicio;

    const icone = passou ? '✅' : '❌';
    addLog(`  ${icone} ${scenario.id}: ${passou ? 'PASS (não alucinei)' : 'FAIL (ALUCINAÇÃO)'} (${tempo_ms}ms)`);
    if (!passou) {
      addLog(`     Alucinações: ${palavras_alucinou.join(', ')}`);
      addLog(`     Assertividade alta: ${tem_assertividade_alta}`);
      addLog(`     Resposta (200 chars): ${answer.slice(0, 200)}`);
    } else if (tem_conservador) {
      addLog(`     ✓ Conservador detectado — resposta correta`);
    }

    return {
      ...scenario,
      passou,
      tempo_ms,
      answer: answer.slice(0, 400),
      palavras_alucinou,
      tem_assertividade_alta,
      tem_conservador,
      erro: null,
    };
  } catch (err) {
    const tempo_ms = Date.now() - inicio;
    addLog(`  ❌ ${scenario.id}: ERRO HTTP — ${err.message}`);
    return {
      ...scenario,
      passou: false,
      erro: err.message,
      tempo_ms,
      palavras_alucinou: [],
      tem_assertividade_alta: false,
      tem_conservador: false,
    };
  }
}

// ── Save results ──────────────────────────────────────────────────────────────
async function saveResults() {
  const docsDir = join(ROOT, 'docs');
  mkdirSync(docsDir, { recursive: true });

  const passes = state.resultados.filter((r) => r.passou).length;
  const total  = state.resultados.length;
  const taxa   = total ? Math.round((passes / total) * 100) : 0;

  const md = [
    `# Vision Core — Stress Test FP (Falso Positivo) Results`,
    ``,
    `**Data:** ${new Date().toISOString()}`,
    `**Resultado:** ${passes}/${total} PASS (${taxa}%)`,
    `**Lógica:** INVERTIDA — PASS = Vision Core não alucionou bug em código correto`,
    ``,
    `## Cenários`,
    ``,
    `| ID | Dific. | Descrição | Status | Tempo | Alucinações |`,
    `|---|---|---|---|---|---|`,
    ...state.resultados.map((r) =>
      `| ${r.id} | ${r.dificuldade} | ${r.descricao} | ${r.passou ? '✅ PASS' : '❌ FAIL'} | ${r.tempo_ms || 0}ms | ${(r.palavras_alucinou || []).join(', ') || '—'} |`
    ),
    ``,
    `## Detalhes de alucinação por cenário`,
    ``,
    ...state.resultados.map((r) => [
      `**${r.id}:**`,
      `- Passou: ${r.passou ? 'SIM' : 'NÃO'}`,
      `- Palavras alucinadas: ${(r.palavras_alucinou || []).join(', ') || '—'}`,
      `- Assertividade alta: ${r.tem_assertividade_alta ? 'SIM' : 'não'}`,
      `- Conservador: ${r.tem_conservador ? 'SIM' : 'não'}`,
      ``,
    ].join('\n')),
  ].join('\n');

  const json = JSON.stringify(
    {
      data: new Date().toISOString(),
      resultado: `${passes}/${total} PASS (${taxa}%)`,
      logica: 'INVERTIDA — PASS = sem alucinação em código correto',
      cenarios: state.resultados.map((r) => ({
        id:                    r.id,
        dificuldade:           r.dificuldade,
        descricao:             r.descricao,
        passou:                r.passou,
        tempo_ms:              r.tempo_ms || 0,
        palavras_alucinou:     r.palavras_alucinou || [],
        tem_assertividade_alta: r.tem_assertividade_alta || false,
        tem_conservador:       r.tem_conservador || false,
        erro:                  r.erro || null,
      })),
    },
    null, 2,
  );

  await writeFile(join(docsDir, 'STRESS-TEST-FP-RESULTS.md'), md, 'utf8');
  await writeFile(join(docsDir, 'STRESS-TEST-FP-RESULTS.json'), json, 'utf8');
  addLog(`📄 Resultados salvos em docs/STRESS-TEST-FP-RESULTS.md`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const server = startDashboard();
  const { default: axios } = await import('axios');

  addLog(`🔬 Stress Test FP — ${SCENARIOS.length} cenários (lógica invertida)`);
  addLog(`🔗 Backend: ${BACKEND_URL}`);
  addLog(`⚠ PASS = NÃO alucinei | FAIL = inventei bug em código correto`);

  for (const scenario of SCENARIOS) {
    const resultado = await runScenario(scenario, axios);
    state.resultados.push(resultado);
    state.atual++;
    await new Promise((r) => setTimeout(r, 800));
  }

  state.rodando = false;
  state.ativo   = null;

  const passes = state.resultados.filter((r) => r.passou).length;
  addLog(`\n🏁 FINAL: ${passes}/${SCENARIOS.length} PASS (${Math.round((passes / SCENARIOS.length) * 100)}%)`);

  if (passes < SCENARIOS.length) {
    const alucinou = state.resultados.filter((r) => !r.passou);
    addLog(`\n⚠ ALUCINAÇÕES DETECTADAS:`);
    alucinou.forEach((r) => {
      addLog(`  ❌ ${r.id} [${r.dificuldade}] — ${r.descricao}`);
      if (r.palavras_alucinou?.length) addLog(`     Palavras: ${r.palavras_alucinou.join(', ')}`);
    });
  } else {
    addLog(`\n🏆 PRECISÃO 100% — Nenhuma alucinação em código correto`);
  }

  await saveResults();

  addLog(`📊 Dashboard: http://localhost:${PORT} (permanece ativo)`);
  addLog(`Pressione Ctrl+C para encerrar.`);

  server.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
