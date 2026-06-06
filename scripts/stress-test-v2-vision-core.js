#!/usr/bin/env node
/**
 * stress-test-v2-vision-core.js
 * Vision Core — Stress Test V2 (15 cenários: multi-arquivo, CSS, backend)
 * Dashboard: http://localhost:3100
 * Executa: node scripts/stress-test-v2-vision-core.js
 */

import { execSync }                     from 'child_process';
import { mkdirSync, existsSync }        from 'fs';
import { writeFile }                    from 'fs/promises';
import { join, dirname }                from 'path';
import { fileURLToPath }                from 'url';
import https                            from 'https';
import http                             from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const PORT      = 3100;

// ── Global state ──────────────────────────────────────────────────────────────
const state = {
  rodando:    true,
  total:      15,
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

  const diffColors = { EASY: '#22c55e', MEDIUM: '#f59e0b', HARD: '#f97316', EXPERT: '#ef4444' };
  const blocoColors = { A: '#818cf8', B: '#34d399', C: '#f59e0b', D: '#f87171' };

  const rowsHTML = state.resultados.map((r) => {
    const bg  = r.passou ? '#052e16' : '#450a0a';
    const col = r.passou ? '#4ade80' : '#f87171';
    const ico = r.passou ? '✅' : '❌';
    return `<tr style="background:${bg}">
      <td style="color:${blocoColors[r.bloco]};font-weight:600">${r.id}</td>
      <td>${r.descricao.replace(/</g,'&lt;')}</td>
      <td style="color:${diffColors[r.dificuldade]}">${r.dificuldade}</td>
      <td style="color:${col};font-weight:700">${ico} ${r.passou ? 'PASS' : 'FAIL'}</td>
      <td>${r.tempo_ms ? r.tempo_ms + 'ms' : r.erro ? '<span style="color:#f87171">ERRO</span>' : '—'}</td>
      <td style="font-size:0.78em;color:#94a3b8">${(r.palavras_encontradas||[]).join(', ') || '—'}</td>
    </tr>`;
  }).join('');

  const pendentes = SCENARIOS.slice(state.resultados.length).map((s) => {
    const isAtivo = s.id === state.ativo;
    const bg      = isAtivo ? '#1e3a5f' : '#0f172a';
    const label   = isAtivo ? '⏳ EM ANDAMENTO' : '⌛ aguardando';
    const col     = isAtivo ? '#fbbf24' : '#475569';
    return `<tr style="background:${bg}">
      <td style="color:${blocoColors[s.bloco]};font-weight:600">${s.id}</td>
      <td>${s.descricao.replace(/</g,'&lt;')}</td>
      <td style="color:${diffColors[s.dificuldade]}">${s.dificuldade}</td>
      <td style="color:${col}">${label}</td>
      <td>—</td><td>—</td>
    </tr>`;
  }).join('');

  const logHTML = [...state.log].reverse().slice(0, 30).map((l) => {
    let col = '#94a3b8';
    if (l.includes('✅')) col = '#4ade80';
    if (l.includes('❌')) col = '#f87171';
    if (l.includes('⏳') || l.includes('Enviando')) col = '#fbbf24';
    return `<div style="color:${col};font-family:monospace;font-size:0.78em;padding:1px 0">${l.replace(/</g,'&lt;')}</div>`;
  }).join('');

  const statusBanner = completo
    ? `<div style="background:#052e16;border:2px solid #22c55e;border-radius:10px;padding:18px;text-align:center;margin-bottom:20px">
         <div style="font-size:2em;margin-bottom:6px">✅ COMPLETO</div>
         <div style="color:#86efac">Relatório: <strong>docs/STRESS-TEST-V2-RESULTS.md</strong></div>
         <div style="margin-top:10px;color:#4ade80">Taxa: <strong>${Math.round((passes/state.total)*100)}%</strong> &nbsp;|&nbsp; ${passes} PASS &nbsp;|&nbsp; ${fails} FAIL</div>
       </div>`
    : `<div style="background:#1e1b4b;border:1px solid #4338ca;border-radius:8px;padding:12px;text-align:center;margin-bottom:20px">
         <div style="color:#a5b4fc;font-size:0.9em">🔄 RODANDO — atualiza a cada 2s</div>
         ${state.ativo ? `<div style="color:#fbbf24;margin-top:4px">⏳ Atual: ${state.ativo}</div>` : ''}
       </div>`;

  const refresh = completo ? '' : '<meta http-equiv="refresh" content="2">';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
${refresh}
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vision Core — Stress Test V2</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #020617; color: #e2e8f0; font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; padding: 24px; }
  h1  { font-size: 1.6em; margin-bottom: 4px; }
  h2  { font-size: 1.1em; color: #94a3b8; margin: 20px 0 10px; border-bottom: 1px solid #1e293b; padding-bottom: 6px; }
  .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
  .badge { background: #1e293b; border-radius: 6px; padding: 4px 12px; font-size: 0.8em; color: #94a3b8; }
  .legend { display: flex; gap: 12px; margin-bottom: 12px; font-size: 0.78em; }
  .legend span { padding: 2px 8px; border-radius: 4px; background: #0f172a; }
  .progress-wrap { background: #1e293b; border-radius: 999px; height: 18px; margin-bottom: 8px; overflow: hidden; }
  .progress-bar  { background: linear-gradient(90deg,#6366f1,#a855f7); height: 100%; border-radius: 999px; transition: width 0.5s; width: ${pct}%; }
  .progress-label { text-align: right; font-size: 0.8em; color: #64748b; margin-bottom: 16px; }
  .stats { display: flex; gap: 12px; margin-bottom: 20px; }
  .stat { flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 12px; text-align: center; }
  .stat-val { font-size: 2em; font-weight: 700; }
  .stat-lbl { font-size: 0.75em; color: #64748b; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 0.88em; }
  th  { text-align: left; color: #64748b; font-size: 0.78em; padding: 6px 8px; background: #0f172a; border-bottom: 1px solid #1e293b; }
  td  { padding: 7px 8px; border-bottom: 1px solid #0f172a; vertical-align: top; }
  .log-box { background: #0a0e17; border: 1px solid #1e293b; border-radius: 8px; padding: 12px; max-height: 260px; overflow-y: auto; }
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>🧪 Vision Core — Stress Test <span style="color:#818cf8">V2</span></h1>
    <div style="color:#64748b;font-size:0.82em">Início: ${state.inicio} &nbsp;|&nbsp; Backend: ${BACKEND_URL}</div>
  </div>
  <div class="badge">${state.atual}/${state.total} testes</div>
</div>
<div class="legend">
  <span style="color:#818cf8">■ A: Múltiplos arquivos</span>
  <span style="color:#34d399">■ B: CSS</span>
  <span style="color:#f59e0b">■ C: Backend</span>
  <span style="color:#f87171">■ D: Regressão §53</span>
</div>

${statusBanner}

<div class="progress-wrap"><div class="progress-bar"></div></div>
<div class="progress-label">${pct}% — ${state.atual} de ${state.total}</div>

<div class="stats">
  <div class="stat"><div class="stat-val" style="color:#4ade80">${passes}</div><div class="stat-lbl">PASS</div></div>
  <div class="stat"><div class="stat-val" style="color:#f87171">${fails}</div><div class="stat-lbl">FAIL</div></div>
  <div class="stat"><div class="stat-val" style="color:#a855f7">${state.total - state.atual}</div><div class="stat-lbl">Pendentes</div></div>
  <div class="stat"><div class="stat-val" style="color:#fbbf24">${passes + fails > 0 ? Math.round((passes/(passes+fails))*100) : 0}%</div><div class="stat-lbl">Taxa acerto</div></div>
</div>

<h2>Resultados</h2>
<table>
  <thead><tr><th>ID</th><th>Cenário</th><th>Dificuldade</th><th>Status</th><th>Tempo</th><th>Palavras encontradas</th></tr></thead>
  <tbody>${rowsHTML}${pendentes}</tbody>
</table>

<h2>Log em tempo real</h2>
<div class="log-box">${logHTML || '<div style="color:#475569">Aguardando eventos...</div>'}</div>
</body>
</html>`;
}

// ── HTTP server ───────────────────────────────────────────────────────────────
function startDashboard() {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(buildHTML());
  });
  server.listen(PORT, '127.0.0.1', () => {
    addLog(`🌐 Dashboard V2: http://localhost:${PORT}`);
  });
  return server;
}

// ── Load deps ─────────────────────────────────────────────────────────────────
async function loadDeps() {
  const [AdmZipMod, axiosMod] = await Promise.all([
    import('adm-zip'),
    import('axios'),
  ]);
  return { AdmZip: AdmZipMod.default, axios: axiosMod.default };
}

// ── Config ────────────────────────────────────────────────────────────────────
const BACKEND_URL = process.env.BACKEND_URL
  || 'http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com';

function getGithubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  throw new Error('GITHUB_TOKEN não encontrado — configure a env var');
}

// ── Scenarios ─────────────────────────────────────────────────────────────────
// arquivos: array de {arquivo, patch} → multi-file
// arquivo + patch: single file (backward compat)
const SCENARIOS = [

  // ═══ BLOCO A: MÚLTIPLOS ARQUIVOS ════════════════════════════════════════════
  {
    id: 'STRESS-11', bloco: 'A', dificuldade: 'HARD',
    descricao: 'Bug em 2 arquivos JS — capas somem + menu quebrado',
    arquivos: [
      {
        arquivo: 'front/assets/js/games-2026-feature.js',
        patch: (src) => src.replace(/^(\s*const LOCAL_REAL_COVERS\s*=)/m, '// $1'),
      },
      {
        arquivo: 'front/assets/js/main.js',
        patch: (src) => src.replace(
          "  const menuToggle = document.querySelector('[data-menu-toggle]');",
          "  // const menuToggle = document.querySelector('[data-menu-toggle]');"
        ),
      },
    ],
    sintoma: 'capas somem E menu mobile não abre',
    esperado: ['LOCAL_REAL_COVERS', 'menu', 'menuToggle', 'múltiplos'],
  },

  {
    id: 'STRESS-12', bloco: 'A', dificuldade: 'EXPERT',
    descricao: 'Bug JS + CSS — rank errado + cor vermelho',
    arquivos: [
      {
        arquivo: 'front/assets/js/games-2026-feature.js',
        patch: (src) => src.replace(
          /rank:\s*1,(\s*title:\s*'Grand Theft Auto VI')/,
          'rank: 99,$1'
        ),
      },
      {
        arquivo: 'front/assets/css/styles.css',
        patch: (src) => src.replace('--accent: #2dd881;', '--accent: #ff0000;'),
      },
    ],
    sintoma: 'GTA VI some da lista + cor do site vira vermelha',
    esperado: ['rank', 'accent', 'color', 'CSS'],
  },

  {
    id: 'STRESS-13', bloco: 'A', dificuldade: 'EXPERT',
    descricao: 'Bug em 3 arquivos — capas + ranking + cor',
    arquivos: [
      {
        arquivo: 'front/assets/js/games-2026-feature.js',
        patch: (src) => src.replace(
          /const LOCAL_REAL_COVERS\s*=\s*\{/,
          'const LOCAL_REAL_COVERS = undefined; const _UNUSED_ = {'
        ),
      },
      {
        arquivo: 'front/assets/js/games-hub.js',
        patch: (src) => src.replace(
          /rank:\s*1,(\s*\n\s*name:\s*'HadesPlays')/,
          'rank: 99,$1'
        ),
      },
      {
        arquivo: 'front/assets/css/styles.css',
        patch: (src) => src.replace('--accent: #2dd881;', '--accent: #ff0000;'),
      },
    ],
    sintoma: 'capas somem + rankings errados + cor vermelha',
    esperado: ['múltiplos', 'LOCAL_REAL_COVERS', 'rank', 'accent'],
  },

  // ═══ BLOCO B: CSS ════════════════════════════════════════════════════════════
  {
    id: 'STRESS-14', bloco: 'B', dificuldade: 'EASY',
    descricao: 'display:none no body — página em branco',
    arquivo: 'front/assets/css/styles.css',
    patch: (src) => src.replace(
      /^body \{$/m,
      'body {\n  display: none;'
    ),
    sintoma: 'página completamente branca — body oculto',
    esperado: ['display', 'none', 'body', 'visibilidade'],
  },

  {
    id: 'STRESS-15', bloco: 'B', dificuldade: 'MEDIUM',
    descricao: 'Cor primária --accent: verde → vermelho',
    arquivo: 'front/assets/css/styles.css',
    patch: (src) => src.replace('--accent: #2dd881;', '--accent: #ff0000;'),
    sintoma: 'botões e destaques vermelhos em vez de verdes',
    esperado: ['accent', '#ff0000', '#2dd881', 'CSS'],
  },

  {
    id: 'STRESS-16', bloco: 'B', dificuldade: 'MEDIUM',
    descricao: 'z-index: -1 em main/header — header some atrás',
    arquivo: 'front/assets/css/styles.css',
    patch: (src) => src.replace(
      'main, header, footer, .topbar { position: relative; z-index: 1; }',
      'main, header, footer, .topbar { position: relative; z-index: -1; }'
    ),
    sintoma: 'header e nav somem atrás do grid de fundo',
    esperado: ['z-index', '-1', 'main', 'header'],
  },

  {
    id: 'STRESS-17', bloco: 'B', dificuldade: 'HARD',
    descricao: 'Largura máx --max: 0px — layout colapsa',
    arquivo: 'front/assets/css/styles.css',
    patch: (src) => src.replace('--max: 1440px;', '--max: 0px;'),
    sintoma: 'todo conteúdo colapsa para largura zero',
    esperado: ['--max', '0px', '1440px', 'CSS'],
  },

  // ═══ BLOCO C: BACKEND ════════════════════════════════════════════════════════
  {
    id: 'STRESS-18', bloco: 'C', dificuldade: 'EASY',
    descricao: 'Rota GET /cover retorna 404 em vez de dados',
    arquivo: 'backend/src/routes/gamesRoutes.js',
    patch: (src) => src.replace(
      'return res.json(payload);',
      "return res.status(404).json({ ok: false, error: 'Rota não encontrada' });"
    ),
    sintoma: 'endpoint /cover retorna 404 para todos os jogos',
    esperado: ['404', 'rota', 'cover', 'payload'],
  },

  {
    id: 'STRESS-19', bloco: 'C', dificuldade: 'MEDIUM',
    descricao: 'REQUEST_TIMEOUT_MS = 0 — todas requests falham',
    arquivo: 'backend/src/services/gameCoverService.js',
    patch: (src) => src.replace(
      'process.env.GAME_COVER_REQUEST_TIMEOUT_MS || 12000',
      'process.env.GAME_COVER_REQUEST_TIMEOUT_MS || 0'
    ),
    sintoma: 'timeout zero — requests de capa todas falham',
    esperado: ['timeout', '0', 'REQUEST_TIMEOUT', 'falha'],
  },

  {
    id: 'STRESS-20', bloco: 'C', dificuldade: 'HARD',
    descricao: 'API_BASE_URL → localhost — sem dados em produção',
    arquivo: 'front/assets/js/runtime-config.js',
    patch: (src) => src.replace(
      'API_BASE_URL: "https://api.technetgame.com.br"',
      'API_BASE_URL: "http://localhost:3000"'
    ),
    sintoma: 'sem dados — API apontando para localhost em produção',
    esperado: ['API_BASE_URL', 'localhost', 'produção', 'URL'],
  },

  {
    id: 'STRESS-21', bloco: 'C', dificuldade: 'EXPERT',
    descricao: 'Condição de validação invertida — if (!query) → if (query)',
    arquivo: 'backend/src/routes/gamesRoutes.js',
    patch: (src) => src.replace(
      'if (!query) {',
      'if (query) {'
    ),
    sintoma: 'queries válidas bloqueadas; queries vazias passam',
    esperado: ['condição', 'invertida', 'query', 'validação'],
  },

  // ═══ BLOCO D: REGRESSÃO §53 ══════════════════════════════════════════════════
  {
    id: 'STRESS-22', bloco: 'D', dificuldade: 'EXPERT',
    descricao: 'Descrição do Analista Técnico zerada',
    arquivo: 'front/assets/js/main.js',
    patch: (src) => src.replace(
      "desc: 'Monitora software, plataformas, arquitetura e infraestrutura do ecossistema tech.',",
      "desc: '',"
    ),
    sintoma: 'tooltip do agente técnico aparece completamente vazia',
    esperado: ['desc', 'vazio', 'descrição', 'Analista'],
  },

  {
    id: 'STRESS-23', bloco: 'D', dificuldade: 'EXPERT',
    descricao: 'HERMES_AGENT comentado — referência undefined',
    arquivo: 'front/assets/js/main.js',
    patch: (src) => src.replace(
      'const HERMES_AGENT = {',
      '// const HERMES_AGENT = {'
    ),
    sintoma: 'HERMES_AGENT undefined — erros no console',
    // LLM correto diz: "HERMES_AGENT foi comentado, causando ReferenceError/undefined"
    esperado: ['HERMES_AGENT', 'comentad', 'ReferenceError', 'undefined'],
  },

  {
    id: 'STRESS-24', bloco: 'D', dificuldade: 'EXPERT',
    descricao: 'ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita',
    arquivo: 'backend/src/services/gameCoverService.js',
    patch: (src) => src.replace(
      'process.env.GAME_COVER_ACCEPTANCE_THRESHOLD || 0.7',
      'process.env.GAME_COVER_ACCEPTANCE_THRESHOLD || 7'
    ),
    sintoma: 'threshold impossível — zero capas aceitas',
    esperado: ['ACCEPTANCE_THRESHOLD', 'threshold', '0.7', '7'],
  },

  {
    id: 'STRESS-25', bloco: 'D', dificuldade: 'EXPERT',
    descricao: 'import resolveGameCover comentado — ReferenceError',
    arquivo: 'backend/src/routes/gamesRoutes.js',
    patch: (src) => src.replace(
      "import { clearGameCoverCache, resolveGameCover } from '../services/gameCoverService.js';",
      "// import { clearGameCoverCache, resolveGameCover } from '../services/gameCoverService.js';"
    ),
    sintoma: 'ReferenceError: resolveGameCover is not defined',
    esperado: ['import', 'resolveGameCover', 'undefined', 'ReferenceError'],
  },
];

// ── Fetch ZIP ─────────────────────────────────────────────────────────────────
function fetchZipBuffer(token) {
  return new Promise((resolve, reject) => {
    const hdrs = {
      Authorization: `Bearer ${token}`,
      Accept:        'application/vnd.github+json',
      'User-Agent':  'vision-core-stress-test-v2/1.0',
    };
    function follow(url, hops) {
      if (hops > 5) return reject(new Error('Too many redirects'));
      const mod   = url.startsWith('https') ? https : http;
      const parts = new URL(url);
      const req   = mod.get(
        { hostname: parts.hostname, path: parts.pathname + parts.search,
          headers: hops === 0 ? hdrs : { 'User-Agent': hdrs['User-Agent'] } },
        (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) return follow(res.headers.location, hops + 1);
          if (res.statusCode !== 200) return reject(new Error(`GitHub ZIP HTTP ${res.statusCode}`));
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end',  () => resolve(Buffer.concat(chunks)));
          res.on('error', reject);
        }
      );
      req.on('error', reject);
    }
    follow('https://api.github.com/repos/Imadechumbo/technetgamev2/zipball/main', 0);
  });
}

// ── Generate diff (original → patched) ───────────────────────────────────────
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

// ── Window content — send only ±maxLines around the change ───────────────────
// Prevents 504 timeouts on large files (e.g. styles.css 208KB/6693 linhas).
// The [DIFF] block already has the exact change — windowed content provides context.
function windowContent(original, patched, maxLines = 120) {
  const origLines    = original.split('\n');
  const patchedLines = patched.split('\n');

  // Find first differing line
  let firstDiff = 0;
  const minLen  = Math.min(origLines.length, patchedLines.length);
  while (firstDiff < minLen && origLines[firstDiff] === patchedLines[firstDiff]) firstDiff++;

  const half  = Math.floor(maxLines / 2);
  const start = Math.max(0, firstDiff - half);
  const end   = Math.min(patchedLines.length, firstDiff + half);

  const before = start > 0
    ? [`/* ... ${start} linhas omitidas (irrelevantes ao diagnóstico) ... */`]
    : [];
  const after  = end < patchedLines.length
    ? [`/* ... ${patchedLines.length - end} linhas omitidas (irrelevantes ao diagnóstico) ... */`]
    : [];

  return [...before, ...patchedLines.slice(start, end), ...after].join('\n');
}

// ── Apply patches (single or multi-file) ─────────────────────────────────────
// Returns array of { arquivo, original, patched }
function applyPatches(AdmZip, zipBuffer, scenario) {
  const zip  = new AdmZip(zipBuffer);
  const defs = scenario.arquivos
    ? scenario.arquivos
    : [{ arquivo: scenario.arquivo, patch: scenario.patch }];

  return defs.map(({ arquivo, patch }) => {
    const entry = zip.getEntries().find((e) => e.entryName.includes(arquivo) && !e.isDirectory);
    if (!entry) throw new Error(`Entry not found: ${arquivo}`);
    const original = entry.getData().toString('utf8');
    const patched  = patch(original);
    if (patched === original) throw new Error(`Patch had no effect: ${arquivo}`);
    return { arquivo, original, patched };
  });
}

// ── Build message with [DIFF] + [arquivo] blocks ──────────────────────────────
// Files >30KB are windowed to ±120 lines around the change to prevent 504 timeouts.
// Multi-file: each arquivo gets its OWN [DIFF]...[/DIFF] block immediately before
// its content — backend while loop captures all blocks, LLM sees each bug isolated.
const MAX_FILE_BYTES = 30_000;

function buildMessage(patches) {
  const multiFile = patches.length > 1;

  if (multiFile) {
    // One [DIFF]+[content] pair per file — always window content in multi-file mode
    // so each arquivo shows only its own bug area (±120 lines). Keeps total message
    // small regardless of individual file sizes — prevents LLM from focusing on just one bug.
    const blocks = patches.map(({ arquivo, original, patched }) => {
      const diff    = generateDiff(original, patched, arquivo);
      const content = windowContent(original, patched, 120);
      const diffPart = diff ? `[DIFF]\n${diff}\n[/DIFF]\n\n` : '';
      return `${diffPart}[${arquivo}]\n${content}`;
    });
    return `o site está com problema — múltiplos arquivos com bugs\n\n${blocks.join('\n\n')}`;
  }

  // Single file — flat [DIFF] + content
  const { arquivo, original, patched } = patches[0];
  const diff    = generateDiff(original, patched, arquivo);
  const content = patched.length > MAX_FILE_BYTES
    ? windowContent(original, patched, 120)
    : patched;
  const diffBlock = diff ? `[DIFF]\n${diff}\n[/DIFF]\n\n` : '';
  return `o site está com problema\n\n${diffBlock}[${arquivo}]\n${content}`;
}

// ── POST to /api/chat ─────────────────────────────────────────────────────────
async function sendToVisionCore(axios, patches, _scenario) {
  const message = buildMessage(patches);
  const t0      = Date.now();
  const resp    = await axios.post(
    `${BACKEND_URL}/api/chat`,
    { message, mode: 'fix' },
    { headers: { 'Content-Type': 'application/json' }, timeout: 90000 }
  );
  return { data: resp.data, elapsed: Date.now() - t0 };
}

// ── Evaluate ──────────────────────────────────────────────────────────────────
function evaluate(text, esperado) {
  const lc         = (text || '').toLowerCase();
  const encontradas = esperado.filter((w) => lc.includes(w.toLowerCase()));
  return { passou: encontradas.length >= Math.ceil(esperado.length / 2), palavras_encontradas: encontradas };
}

// ── Markdown report ───────────────────────────────────────────────────────────
function buildReport(results, timestamp) {
  const total  = results.length;
  const passes = results.filter((r) => r.passou).length;
  const fails  = total - passes;
  const taxa   = Math.round((passes / total) * 100);
  const avgMs  = Math.round(results.filter(r=>r.tempo_ms>0).reduce((s, r) => s + r.tempo_ms, 0) / (results.filter(r=>r.tempo_ms>0).length || 1));

  const byBloco = {};
  for (const r of results) {
    if (!byBloco[r.bloco]) byBloco[r.bloco] = { pass: 0, fail: 0 };
    byBloco[r.bloco][r.passou ? 'pass' : 'fail']++;
  }

  const details = results.map((r) => [
    `### ${r.id} — ${r.descricao}`,
    `**Bloco:** ${r.bloco} | **Status:** ${r.passou ? '✅ PASS' : '❌ FAIL'} | **Dificuldade:** ${r.dificuldade} | **Tempo:** ${r.tempo_ms}ms`,
    `**Sintoma:** ${r.sintoma}`,
    `**Esperadas:** ${r.palavras_esperadas.join(', ')}`,
    `**Encontradas:** ${r.palavras_encontradas.length ? r.palavras_encontradas.join(', ') : '_nenhuma_'}`,
    '```', (r.diagnostico_recebido || '').substring(0, 250).replace(/\n/g, ' ') || '(sem resposta)', '```',
    r.erro ? `**Erro:** ${r.erro}` : '', '',
  ].join('\n')).join('\n');

  const blocoTable = Object.entries(byBloco).map(([b, v]) => {
    const labels = { A: 'Múltiplos Arquivos', B: 'CSS', C: 'Backend', D: 'Regressão §53' };
    const t = v.pass + v.fail;
    return `| ${b} — ${labels[b]} | ${v.pass} | ${v.fail} | ${Math.round((v.pass / t) * 100)}% |`;
  }).join('\n');

  return `# Vision Core — Stress Test V2 Results\n\nData: ${timestamp}\nVision Core URL: ${BACKEND_URL}\nDashboard: http://localhost:${PORT}\n\n## Resumo\n\n| Métrica | Valor |\n|---|---|\n| Total | ${total} |\n| PASS | ${passes} |\n| FAIL | ${fails} |\n| Taxa de acerto | ${taxa}% |\n| Tempo médio | ${avgMs}ms |\n\n## Por Bloco\n\n| Bloco | PASS | FAIL | Taxa |\n|---|---|---|---|\n${blocoTable}\n\n## Resultados Detalhados\n\n${details}\n`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const { AdmZip, axios } = await loadDeps();

  const server = startDashboard();

  try {
    const cmd = process.platform === 'win32' ? `start http://localhost:${PORT}`
              : process.platform === 'darwin' ? `open http://localhost:${PORT}`
              : `xdg-open http://localhost:${PORT}`;
    execSync(cmd, { stdio: 'ignore', shell: true });
  } catch (_) { /* ignore */ }

  addLog(`🔧 Vision Core Stress Test V2 iniciado`);
  addLog(`   Backend: ${BACKEND_URL}`);

  let token;
  try {
    token = getGithubToken();
    addLog('   GitHub Token: OK');
  } catch (e) {
    addLog(`❌ ${e.message}`);
    state.rodando = false;
    server.close();
    process.exit(1);
  }

  addLog('📦 Buscando ZIP do technetgamev2...');
  let baseZipBuffer;
  try {
    baseZipBuffer = await fetchZipBuffer(token);
    addLog(`   ZIP recebido: ${(baseZipBuffer.length / 1024).toFixed(0)} KB`);
  } catch (e) {
    addLog(`❌ Falha ao buscar ZIP: ${e.message}`);
    state.rodando = false;
    server.close();
    process.exit(1);
  }

  const timestamp = new Date().toISOString();

  for (const scenario of SCENARIOS) {
    state.ativo = scenario.id;
    addLog(`⏳ [${scenario.id}] ${scenario.descricao}...`);

    const result = {
      id: scenario.id, bloco: scenario.bloco, dificuldade: scenario.dificuldade,
      descricao: scenario.descricao, sintoma: scenario.sintoma,
      palavras_esperadas: scenario.esperado, palavras_encontradas: [],
      passou: false, diagnostico_recebido: '', tempo_ms: 0, erro: null,
    };

    try {
      const patches = applyPatches(AdmZip, baseZipBuffer, scenario);
      const totalKB = (patches.reduce((s, p) => s + p.patched.length, 0) / 1024).toFixed(0);
      addLog(`[${scenario.id}] Enviando para Vision Core... (~${totalKB} KB, ${patches.length} arquivo(s))`);

      const { data, elapsed } = await sendToVisionCore(axios, patches, scenario);
      result.tempo_ms = elapsed;

      const responseText = data?.answer || (typeof data === 'string' ? data : JSON.stringify(data));
      result.diagnostico_recebido = responseText;

      const { passou, palavras_encontradas } = evaluate(responseText, scenario.esperado);
      result.passou             = passou;
      result.palavras_encontradas = palavras_encontradas;

      const secs = (elapsed / 1000).toFixed(1);
      if (passou) {
        addLog(`✅ [${scenario.id}] PASS — ${secs}s | encontradas: [${palavras_encontradas.join(', ')}]`);
      } else {
        addLog(`❌ [${scenario.id}] FAIL — ${secs}s | encontradas: [${palavras_encontradas.join(', ')}]`);
      }
    } catch (e) {
      result.erro   = e.message;
      result.passou = false;
      addLog(`❌ [${scenario.id}] ERRO: ${e.message}`);
    }

    state.resultados.push(result);
    state.atual = state.resultados.length;

    if (scenario !== SCENARIOS[SCENARIOS.length - 1]) {
      addLog(`   ⏸ Aguardando 3s (rate limit)...`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  // ── Write reports ──────────────────────────────────────────────────────────
  const docsDir  = join(ROOT, 'docs');
  if (!existsSync(docsDir)) mkdirSync(docsDir, { recursive: true });

  const mdPath   = join(docsDir, 'STRESS-TEST-V2-RESULTS.md');
  const jsonPath = join(docsDir, 'STRESS-TEST-V2-RESULTS.json');
  const report   = buildReport(state.resultados, timestamp);

  await writeFile(mdPath,   report, 'utf8');
  await writeFile(jsonPath, JSON.stringify({ timestamp, backend_url: BACKEND_URL, results: state.resultados }, null, 2), 'utf8');

  const passes = state.resultados.filter((r) => r.passou).length;
  const taxa   = Math.round((passes / state.total) * 100);

  addLog(`\n══════════════════════════════════`);
  addLog(`✅ COMPLETO: ${passes}/${state.total} PASS (${taxa}%)`);
  addLog(`📄 docs/STRESS-TEST-V2-RESULTS.md salvo`);
  addLog(`🌐 Dashboard disponível em http://localhost:${PORT}`);

  state.rodando = false;
  state.ativo   = null;

  console.log('\n══════════════════════════════════════════════');
  console.log(`✅ PASS: ${passes}/${state.total} (${taxa}%)`);
  console.log(`📄 Relatório: docs/STRESS-TEST-V2-RESULTS.md`);
  console.log(`🌐 Dashboard: http://localhost:${PORT} (Ctrl+C para fechar)`);
  console.log('══════════════════════════════════════════════');
}

main().catch((e) => {
  console.error('Fatal:', e);
  state.rodando = false;
  process.exit(1);
});
