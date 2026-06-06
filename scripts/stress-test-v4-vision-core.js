#!/usr/bin/env node
/**
 * stress-test-v4-vision-core.js
 * Vision Core — Stress Test V4 (15 cenários: bugs invisíveis, async/promise, estado/memória)
 * Todos EXPERT ou NIGHTMARE. Patches verificados contra technetgamev2/main.
 * Dashboard: http://localhost:3102
 * Executa: node scripts/stress-test-v4-vision-core.js
 */

import { mkdirSync }                      from 'fs';
import { writeFile }                      from 'fs/promises';
import { join, dirname }                  from 'path';
import { fileURLToPath }                  from 'url';
import https                              from 'https';
import http                               from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const PORT      = 3102;

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

  const diffColors  = { EXPERT: '#ef4444', NIGHTMARE: '#7c3aed' };
  const blocoColors = { H: '#f472b6', I: '#38bdf8', J: '#fb923c' };

  const rowsHTML = state.resultados.map((r) => {
    const bg  = r.passou ? '#052e16' : '#450a0a';
    const col = r.passou ? '#4ade80' : '#f87171';
    const ico = r.passou ? '✅' : '❌';
    return `<tr style="background:${bg}">
      <td style="color:${blocoColors[r.bloco]};font-weight:600">${r.id}</td>
      <td>${r.descricao.replace(/</g, '&lt;')}</td>
      <td style="color:${diffColors[r.dificuldade]}">${r.dificuldade}</td>
      <td style="color:${col};font-weight:700">${ico} ${r.passou ? 'PASS' : 'FAIL'}</td>
      <td>${r.tempo_ms ? r.tempo_ms + 'ms' : r.erro ? '<span style="color:#f87171">ERRO</span>' : '—'}</td>
      <td style="font-size:0.78em;color:#94a3b8">${(r.palavras_encontradas || []).join(', ') || '—'}</td>
    </tr>`;
  });

  const pendentes = SCENARIOS.slice(state.atual).map((s) => `
    <tr style="background:#0f172a;opacity:0.5">
      <td style="color:${blocoColors[s.bloco]}">${s.id}</td>
      <td>${s.descricao}</td>
      <td style="color:${diffColors[s.dificuldade]}">${s.dificuldade}</td>
      <td style="color:#64748b">—</td><td>—</td><td>—</td>
    </tr>`).join('');

  const logHTML = [...state.log].reverse().slice(0, 30).map((l) =>
    `<div style="color:#94a3b8;font-size:0.82em">${l.replace(/</g, '&lt;')}</div>`
  ).join('');

  return `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"><meta http-equiv="refresh" content="4">
<title>Stress Test V4 — Vision Core</title>
<style>
  body{font-family:monospace;background:#020617;color:#e2e8f0;padding:24px;margin:0}
  h1{color:#7c3aed;margin:0 0 8px}
  .meta{color:#64748b;font-size:0.85em;margin-bottom:20px}
  .bar-bg{background:#1e293b;border-radius:8px;height:20px;margin-bottom:20px}
  .bar-fg{background:linear-gradient(90deg,#7c3aed,#f472b6);height:20px;border-radius:8px;transition:width 0.4s}
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
<h1>🔬 Stress Test V4 — Vision Core</h1>
<div class="meta">
  15 cenários EXPERT/NIGHTMARE — Bugs Invisíveis + Async/Promise + Estado/Memória<br>
  Início: ${state.inicio} | ${completo ? '✅ COMPLETO' : `⏳ ${state.ativo || 'iniciando...'}`}
</div>

<div class="bar-bg"><div class="bar-fg" style="width:${pct}%"></div></div>
<div style="color:#64748b;font-size:0.85em;margin-top:-16px;margin-bottom:16px">${pct}% — ${state.atual}/${state.total}</div>

<div class="stats">
  <div class="stat"><div class="stat-val" style="color:#4ade80">${passes}</div><div class="stat-lbl">PASS</div></div>
  <div class="stat"><div class="stat-val" style="color:#f87171">${fails}</div><div class="stat-lbl">FAIL</div></div>
  <div class="stat"><div class="stat-val" style="color:#a855f7">${state.total - state.atual}</div><div class="stat-lbl">Pendentes</div></div>
  <div class="stat"><div class="stat-val" style="color:#fbbf24">${passes + fails > 0 ? Math.round((passes / (passes + fails)) * 100) : 0}%</div><div class="stat-lbl">Taxa acerto</div></div>
</div>

<h2>Resultados</h2>
<table>
  <thead><tr><th>ID</th><th>Cenário</th><th>Dificuldade</th><th>Status</th><th>Tempo</th><th>Palavras encontradas</th></tr></thead>
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
    addLog(`🌐 Dashboard V4: http://localhost:${PORT}`);
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

  // ═══ BLOCO H: BUGS INVISÍVEIS (sem erro no console) ════════════════════════
  {
    id: 'STRESS-41', bloco: 'H', dificuldade: 'NIGHTMARE',
    descricao: 'variable shadowing — const selected dentro do loop oculta array externo',
    arquivo: 'backend/src/services/feedService.js',
    patch: (src) => src.replace(
      '  for (const item of items) {\n    const domain = extractDomain(item.url || item.sourceUrl || \'\') || item.sourceSlug || \'unknown\';',
      '  for (const item of items) {\n    const selected = []; // bug: shadow — oculta array externo; selected.push nunca popula outer\n    const domain = extractDomain(item.url || item.sourceUrl || \'\') || item.sourceSlug || \'unknown\';'
    ),
    sintoma: 'diversifyCollection retorna array vazio — news feed fica sem itens sem qualquer erro',
    esperado: ['selected', 'shadow', 'diversifyCollection', 'selected.push'],
  },

  {
    id: 'STRESS-42', bloco: 'H', dificuldade: 'NIGHTMARE',
    descricao: 'off-by-one — summarizeTrends usa .slice(1,6) em vez de .slice(0,6)',
    arquivo: 'backend/src/services/hermesService.js',
    patch: (src) => src.replace(
      '    .slice(0, 6)',
      '    .slice(1, 6) // bug: off-by-one — categoria mais popular sempre omitida'
    ),
    sintoma: 'categoria com mais notícias sumida dos trends — relatório Hermes sistematicamente impreciso',
    esperado: ['slice', 'summarizeTrends', '0', '6'],
  },

  {
    id: 'STRESS-43', bloco: 'H', dificuldade: 'NIGHTMARE',
    descricao: 'assignment em vez de comparison — if (item.category = \'hardware\') muta todos os itens',
    arquivo: 'backend/src/services/feedService.js',
    patch: (src) => src.replace(
      "      return item.category === 'hardware';",
      "      return item.category = 'hardware'; // bug: atribuição em vez de comparação — muta categoria de todos os itens"
    ),
    sintoma: 'todas as categorias retornam vazio exceto hardware — itens têm category sobrescrita para \'hardware\'',
    esperado: ['categoryMatch', '===', 'hardware', 'mutation'],
  },

  {
    id: 'STRESS-44', bloco: 'H', dificuldade: 'NIGHTMARE',
    descricao: 'string concat em vez de soma — \'\'+score+1 produz strings em vez de números',
    arquivo: 'backend/src/services/hermesService.js',
    patch: (src) => src.replace(
      "    scores.set(agent, (scores.get(agent) || 0) + 1);",
      "    scores.set(agent, '' + (scores.get(agent) || 0) + 1); // bug: '' + causa concatenação string — scores viram '01', '011'"
    ),
    sintoma: 'ranking Hermes aleatório — scores são strings, sort b.score-a.score retorna NaN',
    esperado: ['score', 'string', 'calculateRanking', '+'],
  },

  {
    id: 'STRESS-45', bloco: 'H', dificuldade: 'EXPERT',
    descricao: 'objeto mutado sem cópia — items.sort() sem spread muta array original',
    arquivo: 'backend/src/services/feedService.js',
    patch: (src) => src.replace(
      '  const sorted = [...items].sort(compareByDateDesc);',
      '  const sorted = items.sort(compareByDateDesc); // bug: sem spread — sort muta o array de entrada diretamente'
    ),
    sintoma: 'array items reordenado in-place em dedupeItems — chamadores que reusam items não recebem ordem original',
    esperado: ['sort', 'spread', 'items', 'dedupeItems'],
  },

  // ═══ BLOCO I: ASYNC/PROMISE (bugs sutis) ════════════════════════════════════
  {
    id: 'STRESS-46', bloco: 'I', dificuldade: 'NIGHTMARE',
    descricao: 'await esquecido em getCache — cache é Promise não objeto, always fallback',
    arquivo: 'backend/src/services/feedService.js',
    patch: (src) => src.replace(
      '  const cache = await readCache();',
      '  const cache = readCache(); // bug: await omitido — cache é Promise; Array.isArray(cache?.items) sempre false'
    ),
    sintoma: 'cache de disco nunca lido — sempre usa buildFallbackCache() com seed items apenas',
    esperado: ['await', 'readCache', 'Promise', 'getCache'],
  },

  {
    id: 'STRESS-47', bloco: 'I', dificuldade: 'NIGHTMARE',
    descricao: 'Promise.allSettled → Promise.all — result.status nunca é \'fulfilled\'',
    arquivo: 'backend/src/services/gameCoverService.js',
    patch: (src) => src.replace(
      '  const sourceResults = await Promise.allSettled(',
      '  const sourceResults = await Promise.all( // bug: allSettled→all — result.status é undefined; todos candidatos ignorados'
    ),
    sintoma: 'resolveGameCover sempre retorna candidates vazio — check result.status !== \'fulfilled\' descarta tudo',
    esperado: ['allSettled', 'Promise.all', 'fulfilled', 'sourceResults'],
  },

  {
    id: 'STRESS-48', bloco: 'I', dificuldade: 'EXPERT',
    descricao: 'catch swallowing — erro de fetch retorna status \'ok\' sem error.message',
    arquivo: 'backend/src/services/feedService.js',
    patch: (src) => src.replace(
      "  } catch (error) {\n    return { source: source.slug, status: 'error', error: error.message, count: 0, items: [] };\n  }",
      "  } catch {\n    return { source: source.slug, status: 'ok', count: 0, items: [] }; // bug: catch swallowing — erros aparecem como ok\n  }"
    ),
    sintoma: 'fontes com falha aparecem como status ok com 0 itens — impossível debugar quais feeds quebraram',
    esperado: ['catch', 'error.message', 'status', 'ok'],
  },

  {
    id: 'STRESS-49', bloco: 'I', dificuldade: 'EXPERT',
    descricao: 'return omitido em .then — diskCacheWritePromise chain quebrada, cache nunca salvo',
    arquivo: 'backend/src/services/imageService.js',
    patch: (src) => src.replace(
      "  diskCacheWritePromise = diskCacheWritePromise.then(() => writeImageCache({ generatedAt: new Date().toISOString(), items }));",
      "  diskCacheWritePromise = diskCacheWritePromise.then(() => { writeImageCache({ generatedAt: new Date().toISOString(), items }); }); // bug: return omitido — then retorna undefined"
    ),
    sintoma: 'image cache nunca persistido no disco — then chain resolve undefined em vez de Promise do writeImageCache',
    esperado: ['return', 'writeImageCache', 'then', 'persistImageCache'],
  },

  {
    id: 'STRESS-50', bloco: 'I', dificuldade: 'NIGHTMARE',
    descricao: 'async fire-and-forget — translationSession.persist() sem await descartado silenciosamente',
    arquivo: 'backend/src/services/feedService.js',
    patch: (src) => src.replace(
      '    await translationSession.persist();\n\n    const deduped = dedupeItems(enrichedItems);',
      '    translationSession.persist(); // bug: await omitido — fire-and-forget; erros de persist silenciados\n\n    const deduped = dedupeItems(enrichedItems);'
    ),
    sintoma: 'erros de persistência de tradução silenciados; função retorna antes de persist concluir',
    esperado: ['await', 'persist', 'translationSession', 'fire'],
  },

  // ═══ BLOCO J: ESTADO/MEMÓRIA ════════════════════════════════════════════════
  {
    id: 'STRESS-51', bloco: 'J', dificuldade: 'NIGHTMARE',
    descricao: 'Map.get sem fallback — sourceTierFor retorna undefined para fontes desconhecidas',
    arquivo: 'backend/src/services/gameCoverService.js',
    patch: (src) => src.replace(
      '  return SOURCE_TIERS.get(key) || 9;',
      '  return SOURCE_TIERS.get(key); // bug: fallback 9 removido — fontes desconhecidas retornam undefined → NaN'
    ),
    sintoma: 'candidatos de fontes não listadas em SOURCE_TIERS rejeitados — sourceTier NaN ≤ 2 é false',
    esperado: ['sourceTierFor', '|| 9', 'undefined', 'NaN'],
  },

  {
    id: 'STRESS-52', bloco: 'J', dificuldade: 'EXPERT',
    descricao: 'variável de módulo nunca atualizada — const local shadow impede guard de jobStarted',
    arquivo: 'backend/src/jobs/hermesCron.js',
    patch: (src) => src.replace(
      '  jobStarted = true;',
      '  const jobStarted = true; // bug: const local — shadow da variável de módulo; guard nunca ativa'
    ),
    sintoma: 'startHermesCron() registra cron jobs duplicados a cada chamada — jobStarted de módulo sempre false',
    esperado: ['jobStarted', 'const', 'shadow', 'cron'],
  },

  {
    id: 'STRESS-53', bloco: 'J', dificuldade: 'NIGHTMARE',
    descricao: 'closure com estado compartilhado — enrichedCount em escopo de módulo nunca reinicia',
    arquivo: 'backend/src/services/feedService.js',
    patch: (src) => src.replace(
      'async function hydrateMissingImages(items = []) {\n  const limit = Number(process.env.IMAGE_ENRICH_LIMIT || 10);\n  let enrichedCount = 0;',
      'let enrichedCount = 0; // bug: escopo de módulo — counter compartilhado entre chamadas\nasync function hydrateMissingImages(items = []) {\n  const limit = Number(process.env.IMAGE_ENRICH_LIMIT || 10);'
    ),
    sintoma: 'após primeiro refresh com 10+ itens, hydrateMissingImages nunca mais enriquece imagens',
    esperado: ['enrichedCount', 'módulo', 'compartilhado', 'hydrateMissingImages'],
  },

  {
    id: 'STRESS-54', bloco: 'J', dificuldade: 'EXPERT',
    descricao: 'array.push muta parâmetro — withSeedFallback modifica fetchedItems do caller',
    arquivo: 'backend/src/services/feedService.js',
    patch: (src) => src.replace(
      '  return [...fetchedItems, ...CURATED_SEED_ITEMS].sort(compareByDateDesc);',
      '  fetchedItems.push(...CURATED_SEED_ITEMS); // bug: push muta fetchedItems — sem cópia defensiva\n  return fetchedItems.sort(compareByDateDesc);'
    ),
    sintoma: 'array fetchedItems do caller é mutado — seeds adicionados in-place; contagem liveItems incorreta',
    esperado: ['push', 'spread', 'fetchedItems', 'withSeedFallback'],
  },

  {
    id: 'STRESS-55', bloco: 'J', dificuldade: 'NIGHTMARE',
    descricao: 'cron task sem stop — startRefreshScheduler acumula tasks sem parar o anterior',
    arquivo: 'backend/src/jobs/refreshScheduler.js',
    patch: (src) => src.replace(
      '  if (scheduledTask) {\n    scheduledTask.stop();\n  }\n\n  scheduledTask = cron.schedule(cronExpr, async () => {',
      '  scheduledTask = cron.schedule(cronExpr, async () => { // bug: scheduledTask anterior não parado — acúmulo de cron jobs'
    ),
    sintoma: 'cada chamada a startRefreshScheduler cria novo cron job sem parar o anterior — refresh duplicado/acumulado',
    esperado: ['scheduledTask', 'stop', 'cron.schedule', 'acumulando'],
  },
];

// ── Fetch ZIP ─────────────────────────────────────────────────────────────────
function fetchZipBuffer(token) {
  return new Promise((resolve, reject) => {
    const hdrs = {
      Authorization: `Bearer ${token}`,
      Accept:        'application/vnd.github+json',
      'User-Agent':  'vision-core-stress-test-v4/1.0',
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

// ── Apply patch ────────────────────────────────────────────────────────────────
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
  const diffPart = diff ? `[DIFF]\n${diff}\n[/DIFF]\n\n` : '';

  let content;
  if (original.length > MAX_FILE_BYTES) {
    content = windowContent(original, patched, 120);
  } else {
    content = patched;
  }

  return `${diffPart}o site está com problema, o arquivo ${arquivo} foi alterado:\n\n[${arquivo}]\n${content}`;
}

// ── Evaluate LLM response ────────────────────────────────────────────────────
function evaluate(scenario, answer) {
  const answerLow = (answer || '').toLowerCase();
  const palavrasEncontradas = scenario.esperado.filter((palavra) =>
    answerLow.includes(palavra.toLowerCase())
  );
  const needed = Math.ceil(scenario.esperado.length / 2);
  return {
    passou:             palavrasEncontradas.length >= needed,
    palavras_encontradas: palavrasEncontradas,
    palavras_esperadas:   scenario.esperado,
  };
}

// ── Run single scenario ───────────────────────────────────────────────────────
async function runScenario(scenario, AdmZip, axios, zipBuffer) {
  state.ativo = `${scenario.id} — ${scenario.descricao}`;
  addLog(`▶ ${scenario.id} [${scenario.dificuldade}] ${scenario.arquivo || ''}`);

  const inicio = Date.now();
  let patches;

  try {
    patches = applyPatches(AdmZip, zipBuffer, scenario);
  } catch (err) {
    addLog(`  ❌ PATCH ERROR: ${err.message}`);
    return {
      ...scenario,
      passou: false,
      erro: err.message,
      tempo_ms: Date.now() - inicio,
      palavras_encontradas: [],
    };
  }

  const message = buildMessage(patches);

  try {
    const resp = await axios.post(
      `${BACKEND_URL}/api/chat`,
      { message, mode: 'diagnose' },
      { timeout: 90_000 }
    );

    const answer = resp.data?.answer || resp.data?.message || '';
    const { passou, palavras_encontradas, palavras_esperadas } = evaluate(scenario, answer);
    const tempo_ms = Date.now() - inicio;

    const icone = passou ? '✅' : '❌';
    addLog(`  ${icone} ${scenario.id}: ${passou ? 'PASS' : 'FAIL'} (${tempo_ms}ms) [${palavras_encontradas.join(', ')}]`);
    if (!passou) {
      addLog(`     Esperados: ${palavras_esperadas.join(', ')}`);
      addLog(`     Resposta: ${answer.slice(0, 200)}`);
    }

    return {
      ...scenario,
      passou,
      tempo_ms,
      answer: answer.slice(0, 400),
      palavras_encontradas,
      palavras_esperadas,
    };
  } catch (err) {
    const tempo_ms = Date.now() - inicio;
    addLog(`  ❌ ${scenario.id}: ERRO HTTP — ${err.message}`);
    return {
      ...scenario,
      passou: false,
      erro: err.message,
      tempo_ms,
      palavras_encontradas: [],
    };
  }
}

// ── Save results ─────────────────────────────────────────────────────────────
async function saveResults() {
  const docsDir = join(ROOT, 'docs');
  mkdirSync(docsDir, { recursive: true });

  const passes = state.resultados.filter((r) => r.passou).length;
  const total  = state.resultados.length;
  const taxa   = total ? Math.round((passes / total) * 100) : 0;

  const md = [
    `# Vision Core — Stress Test V4 Results`,
    ``,
    `**Data:** ${new Date().toISOString()}`,
    `**Resultado:** ${passes}/${total} PASS (${taxa}%)`,
    ``,
    `## Cenários`,
    ``,
    `| ID | Bloco | Dific. | Arquivo | Status | Tempo | Palavras encontradas |`,
    `|---|---|---|---|---|---|---|`,
    ...state.resultados.map((r) =>
      `| ${r.id} | ${r.bloco} | ${r.dificuldade} | ${r.arquivo || ''} | ${r.passou ? '✅ PASS' : '❌ FAIL'} | ${r.tempo_ms}ms | ${(r.palavras_encontradas || []).join(', ')} |`
    ),
    ``,
    `## Resumo`,
    ``,
    `- PASS: ${passes}/${total} (${taxa}%)`,
    `- Blocos: H=${state.resultados.filter((r) => r.bloco === 'H' && r.passou).length}/5, I=${state.resultados.filter((r) => r.bloco === 'I' && r.passou).length}/5, J=${state.resultados.filter((r) => r.bloco === 'J' && r.passou).length}/5`,
  ].join('\n');

  await writeFile(join(docsDir, 'STRESS-TEST-V4-RESULTS.md'), md, 'utf-8');
  await writeFile(
    join(docsDir, 'STRESS-TEST-V4-RESULTS.json'),
    JSON.stringify({ passes, total, taxa, resultados: state.resultados }, null, 2),
    'utf-8'
  );

  addLog(`📄 Resultados salvos em docs/STRESS-TEST-V4-RESULTS.md`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const server = startDashboard();

  addLog('📦 Carregando dependências...');
  const { AdmZip, axios } = await loadDeps();

  addLog('🔑 Verificando token GitHub...');
  const token = getGithubToken();

  addLog('⬇️  Baixando ZIP technetgamev2/main...');
  const zipBuffer = await fetchZipBuffer(token);
  addLog(`✅ ZIP baixado: ${(zipBuffer.length / 1024).toFixed(0)} KB`);

  // Pre-verificação de todos os patches
  addLog('🔍 Verificando patches antes de iniciar...');
  let allValid = true;
  for (const sc of SCENARIOS) {
    try {
      const patches = applyPatches(AdmZip, zipBuffer, sc);
      for (const p of patches) {
        if (p.patched === p.original) throw new Error('sem efeito');
      }
      addLog(`  ✅ ${sc.id} patch OK`);
    } catch (err) {
      addLog(`  ❌ ${sc.id} PATCH INVÁLIDO: ${err.message}`);
      allValid = false;
    }
  }

  if (!allValid) {
    addLog('⛔ Patches inválidos detectados — abortando');
    state.rodando = false;
    state.ativo = 'ABORTADO — patches inválidos';
    await saveResults();
    server.close();
    return;
  }
  addLog('✅ Todos os 15 patches verificados — iniciando testes');

  for (const scenario of SCENARIOS) {
    const result = await runScenario(scenario, AdmZip, axios, zipBuffer);
    state.resultados.push(result);
    state.atual += 1;
  }

  state.rodando = false;
  state.ativo   = null;

  const passes = state.resultados.filter((r) => r.passou).length;
  addLog(`\n🏁 CONCLUÍDO: ${passes}/15 PASS (${Math.round((passes / 15) * 100)}%)`);
  addLog(`   H: ${state.resultados.filter((r) => r.bloco === 'H' && r.passou).length}/5`);
  addLog(`   I: ${state.resultados.filter((r) => r.bloco === 'I' && r.passou).length}/5`);
  addLog(`   J: ${state.resultados.filter((r) => r.bloco === 'J' && r.passou).length}/5`);

  await saveResults();
  server.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
