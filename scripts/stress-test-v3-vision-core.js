#!/usr/bin/env node
/**
 * stress-test-v3-vision-core.js
 * Vision Core — Stress Test V3 (15 cenários: runtime, dados/api, segurança/config)
 * Todos HARD ou EXPERT. Arquivos verificados contra technetgamev2/main.
 * Dashboard: http://localhost:3101
 * Executa: node scripts/stress-test-v3-vision-core.js
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
const PORT      = 3101;

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
  const blocoColors = { E: '#818cf8', F: '#34d399', G: '#fb923c' };

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
         <div style="color:#86efac">Relatório: <strong>docs/STRESS-TEST-V3-RESULTS.md</strong></div>
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
<title>Vision Core — Stress Test V3</title>
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
  .progress-bar  { background: linear-gradient(90deg,#f97316,#ef4444); height: 100%; border-radius: 999px; transition: width 0.5s; width: ${pct}%; }
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
    <h1>🧪 Vision Core — Stress Test <span style="color:#f97316">V3</span></h1>
    <div style="color:#64748b;font-size:0.82em">Início: ${state.inicio} &nbsp;|&nbsp; Backend: ${BACKEND_URL}</div>
  </div>
  <div class="badge">${state.atual}/${state.total} testes</div>
</div>
<div class="legend">
  <span style="color:#818cf8">■ E: Runtime</span>
  <span style="color:#34d399">■ F: Dados/API</span>
  <span style="color:#fb923c">■ G: Segurança/Config</span>
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
    addLog(`🌐 Dashboard V3: http://localhost:${PORT}`);
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
// Todos os patches verificados contra technetgamev2/main
const SCENARIOS = [

  // ═══ BLOCO E: RUNTIME ═══════════════════════════════════════════════════════
  {
    id: 'STRESS-26', bloco: 'E', dificuldade: 'HARD',
    descricao: 'clearTimeout comentado — AbortController aborta após fetch concluído',
    arquivo: 'backend/src/services/gameCoverService.js',
    patch: (src) => src.replace(
      '    clearTimeout(timer);',
      '    // clearTimeout(timer); // bug: timer não cancelado'
    ),
    sintoma: 'requests concluídas abortadas pelo controller — erros intermitentes',
    esperado: ['clearTimeout', 'timer', 'abort', 'finally'],
  },

  {
    id: 'STRESS-27', bloco: 'E', dificuldade: 'HARD',
    descricao: 'catch em readJson relança erro — crash em cache corrompido',
    arquivo: 'backend/src/services/cacheService.js',
    patch: (src) => src.replace(
      '  } catch {\n    return fallback;\n  }',
      '  } catch (e) {\n    throw new Error(`Cache read failed: ${e.message}`);\n  }'
    ),
    sintoma: 'arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback',
    esperado: ['catch', 'throw', 'fallback', 'SyntaxError'],
  },

  {
    id: 'STRESS-28', bloco: 'E', dificuldade: 'EXPERT',
    descricao: 'hideEmptyContainer setTimeout 260ms → 0ms — animação pulada',
    arquivo: 'front/assets/js/feeds.js',
    patch: (src) => src.replace(
      '        }, 260);',
      '        }, 0);'
    ),
    sintoma: 'feed blocks somem sem animação — layout quebra durante transição',
    esperado: ['setTimeout', '260', 'delay', 'animation'],
  },

  {
    id: 'STRESS-29', bloco: 'E', dificuldade: 'EXPERT',
    descricao: 'rankGameCoverCandidates — sort confidence asc em vez de desc',
    arquivo: 'backend/src/services/gameCoverService.js',
    patch: (src) => src.replace(
      '      return b.confidence - a.confidence;',
      '      return a.confidence - b.confidence;'
    ),
    sintoma: 'capas com menor confiança selecionadas — imagens erradas exibidas',
    esperado: ['confidence', 'sort', 'invertido', 'b.confidence'],
  },

  {
    id: 'STRESS-30', bloco: 'E', dificuldade: 'EXPERT',
    descricao: '__TNG_CONFIG_READY__ await comentado — feeds iniciam sem config',
    arquivo: 'front/assets/js/feeds.js',
    patch: (src) => src.replace(
      '        await (window.__TNG_CONFIG_READY__ || Promise.resolve());',
      '        // await (window.__TNG_CONFIG_READY__ || Promise.resolve()); // bug: init sem esperar config'
    ),
    sintoma: 'feeds inicializam antes da URL da API estar resolvida — requests para URL errada',
    esperado: ['__TNG_CONFIG_READY__', 'await', 'init', 'config'],
  },

  // ═══ BLOCO F: DADOS/API ══════════════════════════════════════════════════════
  {
    id: 'STRESS-31', bloco: 'F', dificuldade: 'HARD',
    descricao: "URL typo '/api/news/latest' → '/api/nwes/latest'",
    arquivo: 'front/assets/js/feeds.js',
    patch: (src) => src.replace(
      "this.fetchJson('/api/news/latest?limit=18'),",
      "this.fetchJson('/api/nwes/latest?limit=18'),"
    ),
    sintoma: 'feed principal retorna 404 — lista de notícias vazia',
    esperado: ['nwes', 'typo', '404', 'latest'],
  },

  {
    id: 'STRESS-32', bloco: 'F', dificuldade: 'HARD',
    descricao: 'safeLimit max(120) → max(0) — zero itens em todas as rotas',
    arquivo: 'backend/src/routes/newsRoutes.js',
    patch: (src) => src.replace(
      '  return Math.min(parsed, 120);',
      '  return Math.min(parsed, 0);'
    ),
    sintoma: 'todas as rotas /latest, /category retornam 0 itens',
    esperado: ['safeLimit', 'Math.min', '0', 'limit'],
  },

  {
    id: 'STRESS-33', bloco: 'F', dificuldade: 'EXPERT',
    descricao: 'COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente',
    arquivo: 'backend/src/services/gameCoverService.js',
    patch: (src) => src.replace(
      'process.env.GAME_COVER_CACHE_TTL_MS || 6 * 60 * 60 * 1000',
      'process.env.GAME_COVER_CACHE_TTL_MS || 0'
    ),
    sintoma: 'cache expira antes de ser lido — API externa chamada a cada request',
    esperado: ['COVER_CACHE_TTL_MS', 'TTL', '0', 'expiresAt'],
  },

  {
    id: 'STRESS-34', bloco: 'F', dificuldade: 'EXPERT',
    descricao: 'hermesService sort score desc → asc — agentes piores rankeados primeiro',
    arquivo: 'backend/src/services/hermesService.js',
    patch: (src) => src.replace(
      '    .sort((a, b) => b.score - a.score);',
      '    .sort((a, b) => a.score - b.score);'
    ),
    sintoma: 'agentes com menor score rankeados primeiro — diagnóstico invertido',
    esperado: ['sort', 'score', 'b.score', 'invertido'],
  },

  {
    id: 'STRESS-35', bloco: 'F', dificuldade: 'EXPERT',
    descricao: 'hasBlockedSource invertido — fontes legítimas bloqueadas',
    arquivo: 'backend/src/services/gameCoverService.js',
    patch: (src) => src.replace(
      '  return source.includes(\'social\') || source.includes(\'fanart\') || type.includes(\'social\') || type.includes(\'fanart\');',
      '  return !(source.includes(\'social\') || source.includes(\'fanart\') || type.includes(\'social\') || type.includes(\'fanart\'));'
    ),
    sintoma: 'rawg/steamgriddb bloqueados — zero capas encontradas',
    esperado: ['hasBlockedSource', 'invertido', 'social', 'fanart'],
  },

  // ═══ BLOCO G: SEGURANÇA/CONFIG ════════════════════════════════════════════════
  {
    id: 'STRESS-36', bloco: 'G', dificuldade: 'HARD',
    descricao: 'CORS allowedOrigins.has() invertido — origens legítimas bloqueadas',
    arquivo: 'backend/src/app.js',
    patch: (src) => src.replace(
      'if (origin && allowedOrigins.has(origin)) {',
      'if (origin && !allowedOrigins.has(origin)) {'
    ),
    sintoma: 'CORS headers ausentes para origens legítimas — browser bloqueia requests',
    esperado: ['CORS', 'allowedOrigins', 'invertido', 'origin'],
  },

  {
    id: 'STRESS-37', bloco: 'G', dificuldade: 'HARD',
    descricao: 'express.json limit "1mb" → "1b" — todos os POSTs falham com 413',
    arquivo: 'backend/src/app.js',
    patch: (src) => src.replace(
      'app.use(express.json({ limit: "1mb" }));',
      'app.use(express.json({ limit: "1b" }));'
    ),
    sintoma: 'qualquer POST com body → 413 Payload Too Large',
    esperado: ['limit', '1b', 'json', 'payload'],
  },

  {
    id: 'STRESS-38', bloco: 'G', dificuldade: 'EXPERT',
    descricao: 'requireRefreshAuth token check invertido — válido rejeitado, inválido aceito',
    arquivo: 'backend/src/routes/newsRoutes.js',
    patch: (src) => src.replace(
      'if (!expectedToken || candidate !== expectedToken) {',
      'if (!expectedToken || candidate === expectedToken) {'
    ),
    sintoma: 'token correto rejeitado; qualquer token inválido aceito no refresh',
    esperado: ['expectedToken', 'invertido', 'auth', 'candidate'],
  },

  {
    id: 'STRESS-39', bloco: 'G', dificuldade: 'EXPERT',
    descricao: 'normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios',
    arquivo: 'backend/src/services/normalizer.js',
    patch: (src) => src.replace(
      '  ).slice(0, 280);',
      '  ).slice(0, 0);'
    ),
    sintoma: 'campo summary de todas as notícias vira string vazia',
    esperado: ['slice', 'summary', '280', 'vazio'],
  },

  {
    id: 'STRESS-40', bloco: 'G', dificuldade: 'EXPERT',
    descricao: 'isHealthy retorna !response.ok — URL saudável descartada',
    arquivo: 'front/assets/js/config.js',
    patch: (src) => src.replace(
      '      return response.ok;',
      '      return !response.ok;'
    ),
    sintoma: 'API principal (200 OK) descartada — fallback para URL inválida selecionada',
    esperado: ['isHealthy', 'response.ok', 'invertido', 'fallback'],
  },
];

// ── Fetch ZIP ─────────────────────────────────────────────────────────────────
function fetchZipBuffer(token) {
  return new Promise((resolve, reject) => {
    const hdrs = {
      Authorization: `Bearer ${token}`,
      Accept:        'application/vnd.github+json',
      'User-Agent':  'vision-core-stress-test-v3/1.0',
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
function windowContent(original, patched, maxLines = 120) {
  const origLines    = original.split('\n');
  const patchedLines = patched.split('\n');

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

// ── Apply patch (single file only — V3 all single-file) ──────────────────────
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
const MAX_FILE_BYTES = 30_000;

function buildMessage(patches) {
  const multiFile = patches.length > 1;

  if (multiFile) {
    const blocks = patches.map(({ arquivo, original, patched }) => {
      const diff    = generateDiff(original, patched, arquivo);
      const content = windowContent(original, patched, 120);
      const diffPart = diff ? `[DIFF]\n${diff}\n[/DIFF]\n\n` : '';
      return `${diffPart}[${arquivo}]\n${content}`;
    });
    return `o site está com problema — múltiplos arquivos com bugs\n\n${blocks.join('\n\n')}`;
  }

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
  const lc          = (text || '').toLowerCase();
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
    const labels = { E: 'Runtime', F: 'Dados/API', G: 'Segurança/Config' };
    const t = v.pass + v.fail;
    return `| ${b} — ${labels[b]} | ${v.pass} | ${v.fail} | ${Math.round((v.pass / t) * 100)}% |`;
  }).join('\n');

  return `# Vision Core — Stress Test V3 Results\n\nData: ${timestamp}\nVision Core URL: ${BACKEND_URL}\nDashboard: http://localhost:${PORT}\n\n## Resumo\n\n| Métrica | Valor |\n|---|---|\n| Total | ${total} |\n| PASS | ${passes} |\n| FAIL | ${fails} |\n| Taxa de acerto | ${taxa}% |\n| Tempo médio | ${avgMs}ms |\n\n## Por Bloco\n\n| Bloco | PASS | FAIL | Taxa |\n|---|---|---|---|\n${blocoTable}\n\n## Resultados Detalhados\n\n${details}\n`;
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

  addLog(`🔧 Vision Core Stress Test V3 iniciado`);
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
      id:                 scenario.id,
      bloco:              scenario.bloco,
      dificuldade:        scenario.dificuldade,
      descricao:          scenario.descricao,
      sintoma:            scenario.sintoma,
      palavras_esperadas: scenario.esperado,
      palavras_encontradas: [],
      passou:             false,
      tempo_ms:           0,
      diagnostico_recebido: '',
      erro:               null,
    };

    try {
      const patches = applyPatches(AdmZip, baseZipBuffer, scenario);
      const totalKB = patches.reduce((s, p) => s + p.patched.length, 0) / 1024;
      addLog(`   [${scenario.id}] Enviando para Vision Core... (~${totalKB.toFixed(0)} KB, ${patches.length} arquivo(s))`);

      const { data, elapsed } = await sendToVisionCore(axios, patches, scenario);
      const answer = data?.answer || '';
      const { passou, palavras_encontradas } = evaluate(answer, scenario.esperado);

      result.tempo_ms              = elapsed;
      result.passou                = passou;
      result.palavras_encontradas  = palavras_encontradas;
      result.diagnostico_recebido  = answer;

      const icon = passou ? '✅' : '❌';
      addLog(`${icon} [${scenario.id}] ${passou ? 'PASS' : 'FAIL'} — ${(elapsed/1000).toFixed(1)}s | encontradas: [${palavras_encontradas.join(', ')}]`);
    } catch (e) {
      result.erro = e.message;
      addLog(`❌ [${scenario.id}] ERRO — ${e.message}`);
    }

    state.resultados.push(result);
    state.atual++;
  }

  state.ativo    = null;
  state.rodando  = false;

  const passes = state.resultados.filter((r) => r.passou).length;
  addLog(`✅ COMPLETO: ${passes}/${state.total} PASS (${Math.round(passes/state.total*100)}%)`);

  const mdReport   = buildReport(state.resultados, timestamp);
  const jsonReport = JSON.stringify({ timestamp, results: state.resultados }, null, 2);
  const docsDir    = join(ROOT, 'docs');

  try { mkdirSync(docsDir, { recursive: true }); } catch (_) {}
  await writeFile(join(docsDir, 'STRESS-TEST-V3-RESULTS.md'),   mdReport,   'utf-8');
  await writeFile(join(docsDir, 'STRESS-TEST-V3-RESULTS.json'), jsonReport, 'utf-8');
  addLog(`📄 docs/STRESS-TEST-V3-RESULTS.md salvo`);

  console.log(`✅ PASS: ${passes}/${state.total} (${Math.round(passes/state.total*100)}%)`);
  console.log(`📄 Relatório: docs/STRESS-TEST-V3-RESULTS.md`);

  server.close();
  process.exit(0);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
