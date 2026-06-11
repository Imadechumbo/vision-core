#!/usr/bin/env node
/**
 * stress-test-retry-failures.js
 * Vision Core — Retry dos 17 cenários que falharam no run #34 (§66)
 * Roda APENAS esses 17 em vez dos 80 completos — ciclo rápido para
 * validar fixes de tiered routing / CoT checklist.
 *
 * Scenarios: STRESS-11/12/13/16/22/25 (V2) · STRESS-28/29/32 (V3)
 *            STRESS-41/42/50/52/53 (V4) · SF-STRESS-04/08/11 (SF)
 *
 * Dashboard: http://localhost:3105
 * Executa:   node scripts/stress-test-retry-failures.js
 */

import http             from 'http';
import https            from 'https';
import { mkdirSync }    from 'fs';
import { writeFile }    from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const PORT      = 3105;

const BACKEND_URL = process.env.BACKEND_URL
  || 'http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com';

// ── Global state ──────────────────────────────────────────────────────────────
const state = {
  rodando:    true,
  total:      17,
  atual:      0,
  ativo:      null,
  resultados: [],
  log:        [],
  inicio:     new Date().toISOString(),
  zipBuffer:  null,   // cached once, shared across V2/V3/V4
};

function addLog(msg) {
  state.log.push(`[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`);
  if (state.log.length > 300) state.log.shift();
  console.log(msg);
}

// ── HTML dashboard ────────────────────────────────────────────────────────────
function buildHTML() {
  const pct      = Math.round((state.atual / state.total) * 100);
  const passes   = state.resultados.filter((r) => r.passou).length;
  const fails    = state.resultados.filter((r) => !r.passou).length;
  const completo = !state.rodando;
  const diffColors = { MEDIUM: '#fbbf24', HARD: '#ef4444', EXPERT: '#f97316', NIGHTMARE: '#7c3aed' };

  const rowsHTML = state.resultados.map((r) => {
    const bg = r.passou ? '#052e16' : '#450a0a';
    const col = r.passou ? '#4ade80' : '#f87171';
    return `<tr style="background:${bg}">
      <td style="color:#6366f1;font-weight:600">${r.id}</td>
      <td>${r.descricao.replace(/</g, '&lt;')}</td>
      <td style="color:${diffColors[r.dificuldade] || '#94a3b8'}">${r.dificuldade}</td>
      <td style="color:${col};font-weight:700">${r.passou ? '✅ PASS' : '❌ FAIL'}</td>
      <td>${r.tempo_ms ? r.tempo_ms + 'ms' : r.erro ? '<span style="color:#f87171">ERRO</span>' : '—'}</td>
      <td style="font-size:0.78em;color:#94a3b8">${(r.palavras_encontradas || []).join(', ') || '—'}</td>
    </tr>`;
  }).join('');

  const pending = SCENARIOS.slice(state.atual).map((s) => `
    <tr style="background:#0f172a;opacity:0.5">
      <td style="color:#6366f1">${s.id}</td>
      <td>${s.descricao}</td>
      <td style="color:${diffColors[s.dificuldade] || '#94a3b8'}">${s.dificuldade}</td>
      <td style="color:#64748b">—</td><td>—</td><td>—</td>
    </tr>`).join('');

  const logHTML = [...state.log].reverse().slice(0, 30).map((l) =>
    `<div style="color:#94a3b8;font-size:0.82em">${l.replace(/</g, '&lt;')}</div>`
  ).join('');

  return `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"><meta http-equiv="refresh" content="4">
<title>Retry Failures §66 — Vision Core</title>
<style>
  body{font-family:monospace;background:#020617;color:#e2e8f0;padding:24px;margin:0}
  h1{color:#6366f1;margin:0 0 4px}
  .badge{background:#1e293b;border:1px solid #7c3aed;border-radius:6px;padding:3px 10px;color:#a78bfa;font-size:0.8em;display:inline-block;margin-bottom:16px}
  .bar-bg{background:#1e293b;border-radius:8px;height:20px;margin-bottom:20px}
  .bar-fg{background:linear-gradient(90deg,#6366f1,#ec4899);height:20px;border-radius:8px;transition:width 0.4s}
  .stats{display:flex;gap:24px;margin-bottom:24px}
  .stat{background:#0f172a;border-radius:8px;padding:12px 20px;text-align:center}
  .stat-val{font-size:2em;font-weight:700}
  .stat-lbl{color:#64748b;font-size:0.85em}
  table{width:100%;border-collapse:collapse;margin-bottom:24px}
  th{background:#1e293b;padding:10px;text-align:left;color:#94a3b8}
  td{padding:8px 10px;border-bottom:1px solid #1e293b}
  .log-box{background:#0f172a;border-radius:8px;padding:16px;max-height:260px;overflow-y:auto}
  ${completo && passes === state.total ? '.bar-fg{background:linear-gradient(90deg,#059669,#4ade80)}' : ''}
</style>
</head><body>
<h1>🔄 Retry Failures §66 — Vision Core</h1>
<div class="badge">17 cenários · MEDIUM→NIGHTMARE · V2/V3/V4/SF</div>
<div style="color:#64748b;font-size:0.85em;margin-bottom:16px">
  Início: ${state.inicio} | ${completo ? '✅ COMPLETO' : `⏳ ${state.ativo || 'iniciando...'}`}
</div>

<div class="bar-bg"><div class="bar-fg" style="width:${pct}%"></div></div>
<div style="color:#64748b;font-size:0.85em;margin-top:-16px;margin-bottom:16px">${pct}% — ${state.atual}/${state.total}</div>

<div class="stats">
  <div class="stat"><div class="stat-val" style="color:#4ade80">${passes}</div><div class="stat-lbl">PASS</div></div>
  <div class="stat"><div class="stat-val" style="color:#f87171">${fails}</div><div class="stat-lbl">FAIL</div></div>
  <div class="stat"><div class="stat-val" style="color:#a855f7">${state.total - state.atual}</div><div class="stat-lbl">Pendentes</div></div>
  <div class="stat"><div class="stat-val" style="color:#fbbf24">${passes + fails > 0 ? Math.round((passes / (passes + fails)) * 100) : 0}%</div><div class="stat-lbl">Taxa</div></div>
</div>

<table>
  <thead><tr><th>ID</th><th>Cenário</th><th>Dific.</th><th>Status</th><th>Tempo</th><th>Palavras encontradas</th></tr></thead>
  <tbody>${rowsHTML}${pending}</tbody>
</table>

<h2>Log em tempo real</h2>
<div class="log-box">${logHTML || '<div style="color:#475569">Aguardando...</div>'}</div>
</body></html>`;
}

// ── HTTP server ───────────────────────────────────────────────────────────────
function startDashboard() {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(buildHTML());
  });
  server.listen(PORT, '127.0.0.1', () => addLog(`🌐 Dashboard: http://localhost:${PORT}`));
  return server;
}

// ── Fetch ZIP from GitHub (cached) ───────────────────────────────────────────
function fetchZip(token) {
  return new Promise((resolve, reject) => {
    const hdrs = {
      Authorization: `Bearer ${token}`,
      Accept:        'application/vnd.github+json',
      'User-Agent':  'vision-core-retry/1.0',
    };
    function follow(url, hops) {
      if (hops > 5) return reject(new Error('Too many redirects'));
      const mod   = url.startsWith('https') ? https : http;
      const parts = new URL(url);
      const req   = mod.get(
        { hostname: parts.hostname, path: parts.pathname + parts.search,
          rejectUnauthorized: false,
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
         origLines[tailOrig] === patchedLines[tailPatch]) { tailOrig--; tailPatch--; }
  const ctxBefore    = Math.max(0, firstDiff - 3);
  const ctxAfterOrig = Math.min(origLines.length - 1, tailOrig + 3);
  const lines = [];
  lines.push(`--- a/${arquivo}`);
  lines.push(`+++ b/${arquivo}`);
  lines.push(`@@ -${ctxBefore + 1} +${ctxBefore + 1} @@`);
  for (let i = ctxBefore; i < firstDiff; i++) lines.push(` ${origLines[i]}`);
  for (let i = firstDiff; i <= tailOrig;  i++) lines.push(`-${origLines[i]}`);
  for (let i = firstDiff; i <= tailPatch; i++) lines.push(`+${patchedLines[i]}`);
  for (let i = tailOrig + 1; i <= ctxAfterOrig; i++) lines.push(` ${origLines[i]}`);
  const headers = lines.slice(0, 3);
  const body    = lines.slice(3);
  if (body.length > 25) return [...headers, ...body.slice(0, 25), `... (${body.length - 25} linhas omitidas)`].join('\n');
  return lines.join('\n');
}

function windowContent(original, patched, maxLines = 120) {
  const origLines    = original.split('\n');
  const patchedLines = patched.split('\n');
  let firstDiff = 0;
  const minLen  = Math.min(origLines.length, patchedLines.length);
  while (firstDiff < minLen && origLines[firstDiff] === patchedLines[firstDiff]) firstDiff++;
  const half  = Math.floor(maxLines / 2);
  const start = Math.max(0, firstDiff - half);
  const end   = Math.min(patchedLines.length, firstDiff + half);
  const before = start > 0 ? [`/* ... ${start} linhas omitidas ... */`] : [];
  const after  = end < patchedLines.length ? [`/* ... ${patchedLines.length - end} linhas omitidas ... */`] : [];
  return [...before, ...patchedLines.slice(start, end), ...after].join('\n');
}

// ── Evaluate ──────────────────────────────────────────────────────────────────
function evaluate(text, esperado) {
  const lc = (text || '').toLowerCase();
  const encontradas = esperado.filter((w) => lc.includes(w.toLowerCase()));
  return {
    passou:               encontradas.length >= Math.ceil(esperado.length / 2),
    palavras_encontradas: encontradas,
  };
}

// ── Scenarios ─────────────────────────────────────────────────────────────────
// V2/V3/V4: ZIP-based with patch functions
// SF: inline original/patched

const SCENARIOS = [

  // ─── V2 ─────────────────────────────────────────────────────────────────────
  {
    id: 'STRESS-11', suite: 'V2', dificuldade: 'HARD',
    descricao: 'Bug em 2 arquivos JS — capas somem + menu quebrado',
    tipo: 'zip',
    arquivos: [
      { arquivo: 'front/assets/js/games-2026-feature.js',
        patch: (src) => src.replace(/^(\s*const LOCAL_REAL_COVERS\s*=)/m, '// $1') },
      { arquivo: 'front/assets/js/main.js',
        patch: (src) => src.replace(
          "  const menuToggle = document.querySelector('[data-menu-toggle]');",
          "  // const menuToggle = document.querySelector('[data-menu-toggle]');" ) },
    ],
    esperado: ['LOCAL_REAL_COVERS', 'menu', 'menuToggle', 'múltiplos'],
  },
  {
    id: 'STRESS-12', suite: 'V2', dificuldade: 'EXPERT',
    descricao: 'Bug JS + CSS — rank errado + cor vermelho',
    tipo: 'zip',
    arquivos: [
      { arquivo: 'front/assets/js/games-2026-feature.js',
        patch: (src) => src.replace(/rank:\s*1,(\s*title:\s*'Grand Theft Auto VI')/, 'rank: 99,$1') },
      { arquivo: 'front/assets/css/styles.css',
        patch: (src) => src.replace('--accent: #2dd881;', '--accent: #ff0000;') },
    ],
    esperado: ['rank', 'accent', 'color', 'CSS'],
  },
  {
    id: 'STRESS-13', suite: 'V2', dificuldade: 'EXPERT',
    descricao: 'Bug em 3 arquivos — capas + ranking + cor',
    tipo: 'zip',
    arquivos: [
      { arquivo: 'front/assets/js/games-2026-feature.js',
        patch: (src) => src.replace(/const LOCAL_REAL_COVERS\s*=\s*\{/, 'const LOCAL_REAL_COVERS = undefined; const _UNUSED_ = {') },
      { arquivo: 'front/assets/js/games-hub.js',
        patch: (src) => src.replace(/rank:\s*1,(\s*\n\s*name:\s*'HadesPlays')/, 'rank: 99,$1') },
      { arquivo: 'front/assets/css/styles.css',
        patch: (src) => src.replace('--accent: #2dd881;', '--accent: #ff0000;') },
    ],
    esperado: ['múltiplos', 'LOCAL_REAL_COVERS', 'rank', 'accent'],
  },
  {
    id: 'STRESS-16', suite: 'V2', dificuldade: 'MEDIUM',
    descricao: 'z-index: -1 em main/header — header some atrás',
    tipo: 'zip',
    arquivos: [
      { arquivo: 'front/assets/css/styles.css',
        patch: (src) => src.replace(
          'main, header, footer, .topbar { position: relative; z-index: 1; }',
          'main, header, footer, .topbar { position: relative; z-index: -1; }' ) },
    ],
    esperado: ['z-index', '-1', 'main', 'header'],
  },
  {
    id: 'STRESS-22', suite: 'V2', dificuldade: 'EXPERT',
    descricao: 'Descrição do Analista Técnico zerada',
    tipo: 'zip',
    arquivos: [
      { arquivo: 'front/assets/js/main.js',
        patch: (src) => src.replace(
          "desc: 'Monitora software, plataformas, arquitetura e infraestrutura do ecossistema tech.',",
          "desc: ''," ) },
    ],
    esperado: ['desc', 'vazio', 'descrição', 'Analista'],
  },
  {
    id: 'STRESS-25', suite: 'V2', dificuldade: 'EXPERT',
    descricao: 'import resolveGameCover comentado — ReferenceError',
    tipo: 'zip',
    arquivos: [
      { arquivo: 'backend/src/routes/gamesRoutes.js',
        patch: (src) => src.replace(
          "import { clearGameCoverCache, resolveGameCover } from '../services/gameCoverService.js';",
          "// import { clearGameCoverCache, resolveGameCover } from '../services/gameCoverService.js';" ) },
    ],
    esperado: ['import', 'resolveGameCover', 'undefined', 'ReferenceError'],
  },

  // ─── V3 ─────────────────────────────────────────────────────────────────────
  {
    id: 'STRESS-28', suite: 'V3', dificuldade: 'EXPERT',
    descricao: 'hideEmptyContainer setTimeout 260ms → 0ms — animação pulada',
    tipo: 'zip',
    arquivos: [
      { arquivo: 'front/assets/js/feeds.js',
        patch: (src) => src.replace('        }, 260);', '        }, 0);') },
    ],
    esperado: ['setTimeout', '260', 'delay', 'animation'],
  },
  {
    id: 'STRESS-29', suite: 'V3', dificuldade: 'EXPERT',
    descricao: 'rankGameCoverCandidates — sort confidence asc em vez de desc',
    tipo: 'zip',
    arquivos: [
      { arquivo: 'backend/src/services/gameCoverService.js',
        patch: (src) => src.replace(
          '      return b.confidence - a.confidence;',
          '      return a.confidence - b.confidence;' ) },
    ],
    esperado: ['confidence', 'sort', 'invertido', 'b.confidence'],
  },
  {
    id: 'STRESS-32', suite: 'V3', dificuldade: 'HARD',
    descricao: 'safeLimit max(120) → max(0) — zero itens em todas as rotas',
    tipo: 'zip',
    arquivos: [
      { arquivo: 'backend/src/routes/newsRoutes.js',
        patch: (src) => src.replace('  return Math.min(parsed, 120);', '  return Math.min(parsed, 0);') },
    ],
    esperado: ['safeLimit', 'Math.min', '0', 'limit'],
  },

  // ─── V4 ─────────────────────────────────────────────────────────────────────
  {
    id: 'STRESS-41', suite: 'V4', dificuldade: 'NIGHTMARE',
    descricao: 'variable shadowing — const selected dentro do loop oculta array externo',
    tipo: 'zip',
    arquivos: [
      { arquivo: 'backend/src/services/feedService.js',
        patch: (src) => src.replace(
          '  for (const item of items) {\n    const domain = extractDomain(item.url || item.sourceUrl || \'\') || item.sourceSlug || \'unknown\';',
          '  for (const item of items) {\n    const selected = []; // bug: shadow — oculta array externo; selected.push nunca popula outer\n    const domain = extractDomain(item.url || item.sourceUrl || \'\') || item.sourceSlug || \'unknown\';' ) },
    ],
    esperado: ['selected', 'shadow', 'diversifyCollection', 'selected.push'],
  },
  {
    id: 'STRESS-42', suite: 'V4', dificuldade: 'NIGHTMARE',
    descricao: 'off-by-one — summarizeTrends usa .slice(1,6) em vez de .slice(0,6)',
    tipo: 'zip',
    arquivos: [
      { arquivo: 'backend/src/services/hermesService.js',
        patch: (src) => src.replace('    .slice(0, 6)', '    .slice(1, 6) // bug: off-by-one — categoria mais popular sempre omitida') },
    ],
    esperado: ['slice', 'summarizeTrends', '0', '6'],
  },
  {
    id: 'STRESS-50', suite: 'V4', dificuldade: 'NIGHTMARE',
    descricao: 'async fire-and-forget — translationSession.persist() sem await descartado silenciosamente',
    tipo: 'zip',
    arquivos: [
      { arquivo: 'backend/src/services/feedService.js',
        patch: (src) => src.replace(
          '    await translationSession.persist();\n\n    const deduped = dedupeItems(enrichedItems);',
          '    translationSession.persist(); // bug: await omitido — fire-and-forget; erros de persist silenciados\n\n    const deduped = dedupeItems(enrichedItems);' ) },
    ],
    esperado: ['await', 'persist', 'translationSession', 'fire'],
  },
  {
    id: 'STRESS-52', suite: 'V4', dificuldade: 'EXPERT',
    descricao: 'variável de módulo nunca atualizada — const local shadow impede guard de jobStarted',
    tipo: 'zip',
    arquivos: [
      { arquivo: 'backend/src/jobs/hermesCron.js',
        patch: (src) => src.replace('  jobStarted = true;', '  const jobStarted = true; // bug: const local — shadow da variável de módulo; guard nunca ativa') },
    ],
    esperado: ['jobStarted', 'const', 'shadow', 'cron'],
  },
  {
    id: 'STRESS-53', suite: 'V4', dificuldade: 'NIGHTMARE',
    descricao: 'closure com estado compartilhado — enrichedCount em escopo de módulo nunca reinicia',
    tipo: 'zip',
    arquivos: [
      { arquivo: 'backend/src/services/feedService.js',
        patch: (src) => src.replace(
          'async function hydrateMissingImages(items = []) {\n  const limit = Number(process.env.IMAGE_ENRICH_LIMIT || 10);\n  let enrichedCount = 0;',
          'let enrichedCount = 0; // bug: escopo de módulo — counter compartilhado entre chamadas\nasync function hydrateMissingImages(items = []) {\n  const limit = Number(process.env.IMAGE_ENRICH_LIMIT || 10);' ) },
    ],
    esperado: ['enrichedCount', 'módulo', 'compartilhado', 'hydrateMissingImages'],
  },

  // ─── SF ─────────────────────────────────────────────────────────────────────
  {
    id: 'SF-STRESS-04', suite: 'SF', dificuldade: 'EXPERT',
    descricao: 'SF-08 painel final com pass_gold_real_claimed=true — nunca deve ser true no frontend',
    tipo: 'inline',
    modulo: 'SF-08 (Painel Final)',
    arquivo: 'sf-08-painel-final.json',
    original: ['{\n  "modulo": "SF-08",\n  "cadeia_completa": true,\n  "pass_gold_real_claimed": false,\n  "production_touched": false,\n  "deploy_allowed": false,\n  "release_allowed": false,\n  "command_execution_allowed": false,\n  "summary_only": true,\n  "nota": "PASS GOLD real é gate server-side — nunca reivindicado no frontend"\n}'],
    patched: ['{\n  "modulo": "SF-08",\n  "cadeia_completa": true,\n  "pass_gold_real_claimed": true,\n  "production_touched": false,\n  "deploy_allowed": false,\n  "release_allowed": false,\n  "command_execution_allowed": false,\n  "summary_only": true,\n  "nota": "PASS GOLD validado — produto pronto para produção"\n}'],
    esperado: ['não autorizado', 'frontend', 'pass gold', 'falso'],
  },
  {
    id: 'SF-STRESS-08', suite: 'SF', dificuldade: 'HARD',
    descricao: 'SF-03 Worker Humano recebe prompt técnico com bash — deve ser checklist',
    tipo: 'inline',
    modulo: 'SF-03 (Compositor de Missão)',
    arquivo: 'sf-03-worker-humano-output.md',
    original: ['## Pacote para Worker: HUMANO\n\n## Checklist de Ações\n- [ ] Verificar se SF-01 e SF-02 estão completos\n- [ ] Revisar o blueprint gerado\n- [ ] Confirmar stack e tipo do projeto\n- [ ] Selecionar worker técnico adequado\n- [ ] Passar o pacote para o worker selecionado\n- [ ] Validar recibo após execução\n\n**Nota:** Worker humano não executa código — apenas coordena.'],
    patched: ['## Pacote para Worker: HUMANO\n\n## Instruções Técnicas\n```bash\ngit clone https://github.com/org/repo\ncd repo && npm install\nnpm run build && npm run deploy\n```\n\n## Código a implementar\n```javascript\nconst jwt = require("jsonwebtoken");\nmodule.exports = { sign: (p) => jwt.sign(p, process.env.JWT_SECRET) };\n```'],
    esperado: ['checklist', 'humano', 'não técnico', 'incompatível'],
  },
  {
    id: 'SF-STRESS-11', suite: 'SF', dificuldade: 'HARD',
    descricao: 'SF-02 template SDDF sem estrutura de pastas — blueprint incompleto',
    tipo: 'inline',
    modulo: 'SF-02 (Templates de Projeto)',
    arquivo: 'sf-02-blueprint.md',
    original: ['## Blueprint — SDDF Standard\n\n## Agentes reserva\n- Backend Agent, DB Agent, Auth Agent, Frontend Agent\n\n## Estrutura de Pastas\n```\nsrc/\n  auth/\n  routes/\n  services/\ntests/\ndocs/\n```\n\n## Arquivos iniciais\nindex.js, package.json, .env.example, README.md\n\n## Sequência de prompts\n1. Setup inicial 2. Auth 3. Rotas 4. Testes'],
    patched: ['## Blueprint — SDDF Standard\n\n## Agentes reserva\n- Backend Agent, DB Agent, Auth Agent, Frontend Agent\n\n## Arquivos iniciais\nindex.js, package.json, .env.example, README.md\n\n## Sequência de prompts\n1. Setup inicial 2. Auth 3. Rotas 4. Testes'],
    esperado: ['incompleto', 'estrutura', 'pastas', 'faltando'],
  },
];

// ── Apply zip patches ─────────────────────────────────────────────────────────
function applyZipPatches(AdmZip, zipBuffer, scenario) {
  const zip  = new AdmZip(zipBuffer);
  const defs = scenario.arquivos;
  return defs.map(({ arquivo, patch }) => {
    const entry = zip.getEntries().find((e) => e.entryName.includes(arquivo) && !e.isDirectory);
    if (!entry) throw new Error(`Entry not found: ${arquivo}`);
    const original = entry.getData().toString('utf8');
    const patched  = patch(original);
    if (patched === original) throw new Error(`Patch had no effect: ${arquivo}`);
    return { arquivo, original, patched };
  });
}

// ── Build message ─────────────────────────────────────────────────────────────
function buildZipMessage(patches, dificuldade) {
  const tag = `[DIFICULDADE: ${dificuldade}]\n\n`;
  const multiFile = patches.length > 1;
  if (multiFile) {
    const blocks = patches.map(({ arquivo, original, patched }) => {
      const diff    = generateDiff(original, patched, arquivo);
      const content = windowContent(original, patched, 120);
      return `${diff ? `[DIFF]\n${diff}\n[/DIFF]\n\n` : ''}[${arquivo}]\n${content}`;
    });
    return `${tag}o site está com problema — múltiplos arquivos com bugs\n\n${blocks.join('\n\n')}`;
  }
  const { arquivo, original, patched } = patches[0];
  const diff    = generateDiff(original, patched, arquivo);
  const content = patched.length > 30000 ? windowContent(original, patched, 120) : patched;
  return `${tag}o site está com problema\n\n${diff ? `[DIFF]\n${diff}\n[/DIFF]\n\n` : ''}[${arquivo}]\n${content}`;
}

function buildInlineMessage(scenario) {
  const orig    = Array.isArray(scenario.original) ? scenario.original[0] : scenario.original;
  const patched = Array.isArray(scenario.patched) ? scenario.patched[0] : scenario.patched;
  const diff    = generateDiff(orig, patched, scenario.arquivo);
  const tag     = `[DIFICULDADE: ${scenario.dificuldade}]\n\n`;
  const diffPart = diff ? `[DIFF]\n${diff}\n[/DIFF]\n\n` : '';
  return `${tag}${diffPart}o output do módulo ${scenario.modulo} da Software Factory foi produzido com um problema:\n\n[${scenario.arquivo}]\n${patched}`;
}

// ── Run single scenario ───────────────────────────────────────────────────────
async function runScenario(scenario, axios, AdmZip) {
  state.ativo = `${scenario.id} [${scenario.dificuldade}] ${scenario.descricao}`;
  addLog(`▶ ${scenario.id} [${scenario.suite}/${scenario.dificuldade}]`);

  const inicio = Date.now();
  let message;

  try {
    if (scenario.tipo === 'zip') {
      if (!state.zipBuffer) throw new Error('ZIP not loaded');
      const patches = applyZipPatches(AdmZip, state.zipBuffer, scenario);
      message = buildZipMessage(patches, scenario.dificuldade);
    } else {
      message = buildInlineMessage(scenario);
    }
  } catch (err) {
    addLog(`  ❌ ${scenario.id}: build error — ${err.message}`);
    return { ...scenario, passou: false, erro: err.message, tempo_ms: Date.now() - inicio, palavras_encontradas: [] };
  }

  const mode = scenario.suite === 'SF' ? 'diagnose' : 'fix';

  try {
    let resp;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        resp = await axios.post(
          `${BACKEND_URL}/api/chat`,
          { message, mode },
          { timeout: 120_000 }
        );
        break;
      } catch (err) {
        if (attempt === 2) throw err;
        addLog(`  ⚠ ${scenario.id}: retry — ${err.message}`);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    const answer = resp.data?.answer || resp.data?.message || '';
    if (/todos os provedores de ia falharam/i.test(answer) && !scenario._retried) {
      scenario._retried = true;
      addLog(`  ⚠ ${scenario.id}: todos falharam — retry em 3s`);
      await new Promise((r) => setTimeout(r, 3000));
      return runScenario(scenario, axios, AdmZip);
    }

    const { passou, palavras_encontradas } = evaluate(answer, scenario.esperado);
    const tempo_ms = Date.now() - inicio;
    addLog(`  ${passou ? '✅' : '❌'} ${scenario.id}: ${passou ? 'PASS' : 'FAIL'} (${tempo_ms}ms) [${palavras_encontradas.join(', ') || 'none'}]`);
    if (!passou) {
      addLog(`     esperado: ${scenario.esperado.join(', ')}`);
      addLog(`     resposta: ${answer.slice(0, 200)}`);
    }
    return { ...scenario, passou, tempo_ms, palavras_encontradas, palavras_esperadas: scenario.esperado, diagnostico_recebido: answer.slice(0, 500), erro: null };
  } catch (err) {
    addLog(`  ❌ ${scenario.id}: HTTP error — ${err.message}`);
    return { ...scenario, passou: false, erro: err.message, tempo_ms: Date.now() - inicio, palavras_encontradas: [] };
  }
}

// ── Save results ──────────────────────────────────────────────────────────────
async function saveResults() {
  const docsDir = join(ROOT, 'docs');
  mkdirSync(docsDir, { recursive: true });

  const passes = state.resultados.filter((r) => r.passou).length;
  const total  = state.resultados.length;
  const taxa   = total ? Math.round((passes / total) * 100) : 0;

  const json = JSON.stringify({
    data:      new Date().toISOString(),
    resultado: `${passes}/${total} PASS (${taxa}%)`,
    cenarios:  state.resultados.map((r) => ({
      id:                    r.id,
      suite:                 r.suite,
      dificuldade:           r.dificuldade,
      descricao:             r.descricao,
      passou:                r.passou,
      tempo_ms:              r.tempo_ms || 0,
      palavras_esperadas:    r.palavras_esperadas || [],
      palavras_encontradas:  r.palavras_encontradas || [],
      diagnostico_recebido:  r.diagnostico_recebido || '',
      erro:                  r.erro || null,
    })),
  }, null, 2);

  await writeFile(join(docsDir, 'STRESS-TEST-RETRY-RESULTS.json'), json, 'utf8');
  addLog(`📄 Resultados salvos em docs/STRESS-TEST-RETRY-RESULTS.json`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const server = startDashboard();

  const [{ default: axios }, { default: AdmZip }] = await Promise.all([
    import('axios'),
    import('adm-zip'),
  ]);

  addLog(`🔄 Retry Failures §66 — ${SCENARIOS.length} cenários (17/80 que falharam no run #34)`);
  addLog(`🔗 Backend: ${BACKEND_URL}`);

  // Fetch ZIP once (shared by V2/V3/V4)
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
  if (!token) {
    addLog('⚠ GITHUB_TOKEN não configurado — cenários ZIP podem falhar');
  } else {
    addLog('📦 Baixando ZIP do technetgamev2...');
    try {
      state.zipBuffer = await fetchZip(token);
      addLog(`   ZIP: ${Math.round(state.zipBuffer.length / 1024)}KB ✅`);
    } catch (e) {
      addLog(`❌ ZIP download falhou: ${e.message} — cenários V2/V3/V4 vão falhar`);
    }
  }

  for (const scenario of SCENARIOS) {
    const resultado = await runScenario(scenario, axios, AdmZip);
    state.resultados.push(resultado);
    state.atual++;
    await new Promise((r) => setTimeout(r, 600));
  }

  state.rodando = false;
  state.ativo   = null;

  const passes = state.resultados.filter((r) => r.passou).length;
  addLog(`\n🏁 FINAL: ${passes}/${SCENARIOS.length} PASS (${Math.round((passes / SCENARIOS.length) * 100)}%)`);

  const still_failing = state.resultados.filter((r) => !r.passou);
  if (still_failing.length > 0) {
    addLog(`\n⚠ Ainda falhando (${still_failing.length}):`);
    still_failing.forEach((r) => addLog(`  ❌ ${r.id} [${r.dificuldade}] — ${r.descricao}`));
  } else {
    addLog(`\n🏆 TODOS 17 PASS — rodar suíte completa (80) agora!`);
  }

  await saveResults();
  addLog(`📊 Dashboard: http://localhost:${PORT}`);
  addLog('Pressione Ctrl+C para encerrar.');

  server.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
