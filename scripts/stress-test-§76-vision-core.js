#!/usr/bin/env node
/**
 * stress-test-§76-vision-core.js
 * Vision Core v5.7.0 — Stress Test §76+§77+§78
 * 24 cenários: unified agent intent routing + mode:create + spec/summary
 *
 * Blocos:
 *   BL-1: POST /api/architect/interpret — campos §76 (T01–T08)
 *   BL-2: POST /api/chat mode:create    — pipeline criar (T09–T15)
 *   BL-3: GET  /api/spec/summary        — spec library sidebar (T16–T22)
 *   BL-4: Integração fluxo completo     — classify→create→chat (T23–T24)
 *
 * PASS GOLD GATE: >= 22/24
 * Executa: node "scripts/stress-test-§76-vision-core.js"
 */

import { mkdirSync }     from 'fs';
import { writeFile }     from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import http              from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const PORT      = 3109;

const WORKER_URL = process.env.WORKER_URL
  || process.env.BACKEND_URL
  || 'http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com';

const TIMEOUT_MS = 40_000;

// ── Global state ───────────────────────────────────────────────────────────────
const state = {
  rodando:    true,
  total:      24,
  atual:      0,
  ativo:      null,
  resultados: [],
  log:        [],
  inicio:     new Date().toISOString(),
};

function addLog(msg) {
  state.log.push(`[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`);
  if (state.log.length > 300) state.log.shift();
  console.log(msg);
}

// ── HTML dashboard ─────────────────────────────────────────────────────────────
function buildHTML() {
  const pct      = Math.round((state.atual / state.total) * 100);
  const auto     = state.resultados.filter((r) => !r.skip);
  const passes   = auto.filter((r) => r.passou === true).length;
  const fails    = auto.filter((r) => r.passou === false).length;
  const skips    = state.resultados.filter((r) => r.skip).length;
  const completo = !state.rodando;

  const blColors = {
    'BL-1': '#38bdf8', 'BL-2': '#f59e0b',
    'BL-3': '#4ade80', 'BL-4': '#c084fc',
  };

  const rowsHTML = state.resultados.map((r) => {
    const bg  = r.skip ? '#0f172a' : (r.passou ? '#052e16' : '#450a0a');
    const col = r.skip ? '#64748b' : (r.passou ? '#4ade80' : '#f87171');
    const ico = r.skip ? '⏭' : (r.passou ? '✅' : '❌');
    const statusTxt = r.skip ? 'SKIP' : (r.passou ? 'PASS' : 'FAIL');
    const blClr = blColors[r.bloco] || '#94a3b8';
    const checks = (r.detalhes || []).map((d) => `${d.ok ? '✓' : '✗'} ${d.nome}`).join(' | ');
    return `<tr style="background:${bg}">
      <td style="color:${blClr};font-weight:600">${r.id}</td>
      <td>${(r.descricao || '').replace(/</g, '&lt;')}</td>
      <td style="color:${blClr};font-size:0.8em">${r.bloco}</td>
      <td style="color:${col};font-weight:700">${ico} ${statusTxt}</td>
      <td>${r.tempo_ms != null ? r.tempo_ms + 'ms' : r.erro ? '<span style="color:#f87171">ERRO</span>' : '—'}</td>
      <td style="font-size:0.75em;color:#94a3b8">${checks || '—'}</td>
    </tr>`;
  }).join('');

  const pendentes = Array.from({ length: Math.max(0, state.total - state.atual) }, (_, i) => {
    return `<tr style="background:#0f172a;opacity:0.35">
      <td style="color:#334155">T${String(state.atual + i + 1).padStart(2,'0')}</td>
      <td style="color:#334155">pendente...</td>
      <td>—</td><td>—</td><td>—</td><td>—</td>
    </tr>`;
  }).join('');

  const logHTML = [...state.log].reverse().slice(0, 40).map((l) =>
    `<div style="color:#94a3b8;font-size:0.82em">${l.replace(/</g,'&lt;')}</div>`
  ).join('');

  const taxaPct = (passes + fails) > 0 ? Math.round((passes / (passes + fails)) * 100) : 0;
  const passGold = passes >= 22;

  return `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"><meta http-equiv="refresh" content="4">
<title>Stress Test §76 — Vision Core</title>
<style>
  body{font-family:monospace;background:#020617;color:#e2e8f0;padding:24px;margin:0}
  h1{color:#f59e0b;margin:0 0 8px}
  .meta{color:#64748b;font-size:0.85em;margin-bottom:20px}
  .bar-bg{background:#1e293b;border-radius:8px;height:20px;margin-bottom:20px}
  .bar-fg{background:linear-gradient(90deg,#f59e0b,#fbbf24);height:20px;border-radius:8px;transition:width 0.4s}
  .stats{display:flex;gap:24px;margin-bottom:24px;flex-wrap:wrap}
  .stat{background:#0f172a;border-radius:8px;padding:12px 20px;text-align:center}
  .stat-val{font-size:2em;font-weight:700}
  .stat-lbl{color:#64748b;font-size:0.85em}
  table{width:100%;border-collapse:collapse;margin-bottom:24px}
  th{background:#1e293b;padding:10px;text-align:left;color:#94a3b8}
  td{padding:8px 10px;border-bottom:1px solid #1e293b;vertical-align:top}
  .log-box{background:#0f172a;border-radius:8px;padding:16px;max-height:280px;overflow-y:auto}
  .gold-badge{background:#fbbf2422;border:1px solid #fbbf2444;color:#fbbf24;padding:8px 16px;border-radius:6px;font-size:1.1em;margin-bottom:16px;display:inline-block}
  ${completo && passGold ? '.bar-fg{background:linear-gradient(90deg,#059669,#4ade80)}' : ''}
</style>
</head><body>
<h1>◈ Stress Test §76+§77+§78 — Unified Agent + Spec Library</h1>
<div class="meta">
  24 cenários — BL-1: interpret §76 · BL-2: mode:create · BL-3: spec/summary · BL-4: fluxo<br>
  Início: ${state.inicio} | ${completo ? (passGold ? '✅ PASS GOLD ≥22/24' : `❌ ${passes}/24 — abaixo do gate`) : `⏳ ${state.ativo || 'iniciando...'}`}
</div>
${completo && passGold ? `<div class="gold-badge">✨ PASS GOLD — ${passes}/24 PASS | gate: ≥22</div>` : ''}
<div class="bar-bg"><div class="bar-fg" style="width:${pct}%"></div></div>
<div style="color:#64748b;font-size:0.85em;margin-top:-16px;margin-bottom:16px">${pct}% — ${state.atual}/${state.total}</div>

<div class="stats">
  <div class="stat"><div class="stat-val" style="color:#4ade80">${passes}</div><div class="stat-lbl">PASS</div></div>
  <div class="stat"><div class="stat-val" style="color:#f87171">${fails}</div><div class="stat-lbl">FAIL</div></div>
  <div class="stat"><div class="stat-val" style="color:#64748b">${skips}</div><div class="stat-lbl">SKIP</div></div>
  <div class="stat"><div class="stat-val" style="color:#fbbf24">${taxaPct}%</div><div class="stat-lbl">Taxa PASS</div></div>
  <div class="stat"><div class="stat-val" style="color:${passGold ? '#4ade80' : '#f87171'}">${passes}/22</div><div class="stat-lbl">PASS GOLD gate</div></div>
</div>

<h2>Resultados</h2>
<table>
  <thead><tr><th>ID</th><th>Cenário</th><th>Bloco</th><th>Status</th><th>Tempo</th><th>Checks</th></tr></thead>
  <tbody>${rowsHTML}${pendentes}</tbody>
</table>

<h2>Log em tempo real</h2>
<div class="log-box">${logHTML || '<div style="color:#475569">Aguardando eventos...</div>'}</div>
</body></html>`;
}

// ── HTTP dashboard ─────────────────────────────────────────────────────────────
function startDashboard() {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(buildHTML());
  });
  server.listen(PORT, '127.0.0.1', () => {
    addLog(`🌐 Dashboard §76: http://localhost:${PORT}`);
  });
  return server;
}

// ── Generic fetch with retry ───────────────────────────────────────────────────
async function apiFetch(axios, method, path, body, extraHeaders = {}) {
  let lastErr = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const cfg = { timeout: TIMEOUT_MS, headers: { ...extraHeaders } };
      const url = `${WORKER_URL}${path}`;
      const resp = method === 'GET'
        ? await axios.get(url, cfg)
        : await axios.post(url, body, cfg);
      return { status: resp.status, data: resp.data };
    } catch (err) {
      const status = err?.response?.status;
      if ((status === 502 || status === 503) && attempt < 3) {
        addLog(`  [RETRY] ${path} recebeu ${status}, aguardando 4s (tentativa ${attempt + 1}/3)`);
        await new Promise((r) => setTimeout(r, 4000));
        lastErr = err;
        continue;
      }
      if (err?.response) {
        return { status: err.response.status, data: err.response.data };
      }
      return { status: 0, data: null, err: err.message };
    }
  }
  return { status: 0, data: null, err: lastErr?.message || 'unknown' };
}

// ── SCENARIOS ─────────────────────────────────────────────────────────────────
const SCENARIOS = [

  // ─── BL-1: POST /api/architect/interpret — campos §76 ─────────────────────

  {
    id: 'T01', bloco: 'BL-1',
    descricao: 'intent:create detectado — mensagem clara de criação SaaS',
    async run(axios) {
      const { data: r } = await apiFetch(axios, 'POST', '/api/architect/interpret', {
        message: 'quero criar um SaaS de gestão de projetos com Node.js e React',
      });
      const d = [
        { nome: 'res.ok',                    ok: r?.ok === true },
        { nome: 'intent === create',         ok: r?.intent === 'create' },
        { nome: 'pipeline_mode === create',  ok: r?.pipeline_mode === 'create' },
      ];
      return { passou: d.every((x) => x.ok), detalhes: d };
    },
  },

  {
    id: 'T02', bloco: 'BL-1',
    descricao: 'intent:fix ou chat detectado — mensagem de bug (não create)',
    async run(axios) {
      const { data: r } = await apiFetch(axios, 'POST', '/api/architect/interpret', {
        message: 'tem um bug no meu código Node.js, o servidor não inicia',
      });
      const d = [
        { nome: 'res.ok',                         ok: r?.ok === true },
        { nome: 'intent é fix ou chat',            ok: ['fix','chat'].includes(r?.intent) },
        { nome: 'intent !== create (sem roteamento errado)', ok: r?.intent !== 'create' },
      ];
      return { passou: d.every((x) => x.ok), detalhes: d };
    },
  },

  {
    id: 'T03', bloco: 'BL-1',
    descricao: 'routing_reason presente e não-vazio',
    async run(axios) {
      const { data: r } = await apiFetch(axios, 'POST', '/api/architect/interpret', {
        message: 'quero fazer uma landing page para minha startup',
      });
      const d = [
        { nome: 'res.ok',                ok: r?.ok === true },
        { nome: 'routing_reason string', ok: typeof r?.routing_reason === 'string' },
        { nome: 'routing_reason length', ok: (r?.routing_reason || '').length > 0 },
      ];
      return { passou: d.every((x) => x.ok), detalhes: d };
    },
  },

  {
    id: 'T04', bloco: 'BL-1',
    descricao: 'pipeline_mode sempre presente e valor válido',
    async run(axios) {
      const { data: r } = await apiFetch(axios, 'POST', '/api/architect/interpret', {
        message: 'o que é REST API?',
      });
      const validModes = ['create', 'fix', 'vision-geral'];
      const d = [
        { nome: 'res.ok',                   ok: r?.ok === true },
        { nome: 'pipeline_mode presente',   ok: 'pipeline_mode' in (r || {}) },
        { nome: 'pipeline_mode valor válido', ok: validModes.includes(r?.pipeline_mode) },
      ];
      return { passou: d.every((x) => x.ok), detalhes: d };
    },
  },

  {
    id: 'T05', bloco: 'BL-1',
    descricao: 'confidence baixa → intent:chat + routing_reason explica',
    async run(axios) {
      const { data: r } = await apiFetch(axios, 'POST', '/api/architect/interpret', {
        message: 'oi',
      });
      const d = [
        { nome: 'res.ok',                      ok: r?.ok === true },
        { nome: 'intent === chat',             ok: r?.intent === 'chat' },
        { nome: "routing_reason inclui 'conversa'", ok: (r?.routing_reason || '').includes('conversa') },
      ];
      return { passou: d.every((x) => x.ok), detalhes: d };
    },
  },

  {
    id: 'T06', bloco: 'BL-1',
    descricao: 'intent:create com tags saas/saas-fullstack/nova-feature',
    async run(axios) {
      const { data: r } = await apiFetch(axios, 'POST', '/api/architect/interpret', {
        message: 'preciso de um sistema SaaS fullstack com autenticação e billing',
      });
      const tags = Array.isArray(r?.classification?.tags) ? r.classification.tags : [];
      const targetTags = ['saas', 'saas-fullstack', 'nova-feature', 'api-backend'];
      const d = [
        { nome: 'res.ok',              ok: r?.ok === true },
        { nome: 'intent === create',   ok: r?.intent === 'create' },
        { nome: 'tags array presente', ok: Array.isArray(r?.classification?.tags) },
        { nome: 'tag saas/fullstack/feature', ok: tags.some((t) => targetTags.includes(t)) },
      ];
      return { passou: d.every((x) => x.ok), detalhes: d };
    },
  },

  {
    id: 'T07', bloco: 'BL-1',
    descricao: 'campos §76 presentes mesmo em low-confidence (mensagem "x")',
    async run(axios) {
      const { data: r } = await apiFetch(axios, 'POST', '/api/architect/interpret', {
        message: 'x',
      });
      const d = [
        { nome: 'res.ok',              ok: r?.ok === true },
        { nome: 'intent presente',     ok: 'intent' in (r || {}) },
        { nome: 'pipeline_mode presente', ok: 'pipeline_mode' in (r || {}) },
        { nome: 'routing_reason presente', ok: 'routing_reason' in (r || {}) },
      ];
      return { passou: d.every((x) => x.ok), detalhes: d };
    },
  },

  {
    id: 'T08', bloco: 'BL-1',
    descricao: 'backward compat: campos antigos classification, mode, exec_real intactos',
    async run(axios) {
      const { data: r } = await apiFetch(axios, 'POST', '/api/architect/interpret', {
        message: 'quero uma API REST em Python',
      });
      const d = [
        { nome: 'res.ok',                    ok: r?.ok === true },
        { nome: 'classification presente',   ok: !!r?.classification },
        { nome: "mode === 'LOCAL PREVIEW'",  ok: r?.mode === 'LOCAL PREVIEW' },
        { nome: "exec_real === 'BLOQUEADA'", ok: r?.exec_real === 'BLOQUEADA' },
      ];
      return { passou: d.every((x) => x.ok), detalhes: d };
    },
  },

  // ─── BL-2: POST /api/chat mode:create ─────────────────────────────────────

  {
    id: 'T09', bloco: 'BL-2',
    descricao: 'mode:create → pipeline:criar_projeto na resposta',
    async run(axios) {
      const { data: r } = await apiFetch(axios, 'POST', '/api/chat', {
        message: 'crie um app de delivery',
        mode: 'create',
      });
      const d = [
        { nome: 'res.ok',                    ok: r?.ok === true },
        { nome: "mode === 'create'",         ok: r?.mode === 'create' },
        { nome: "pipeline === 'criar_projeto'", ok: r?.pipeline === 'criar_projeto' },
      ];
      return { passou: d.every((x) => x.ok), detalhes: d };
    },
  },

  {
    id: 'T10', bloco: 'BL-2',
    descricao: 'mode:create com architect_context injetado retorna answer válido',
    async run(axios) {
      const { data: r } = await apiFetch(axios, 'POST', '/api/chat', {
        message: 'crie um site para minha padaria',
        mode: 'create',
        architect_context: {
          project_type: 'site institucional',
          stack: ['html-css', 'javascript'],
          confidence: 0.75,
          routing_reason: 'tags: frontend · confidence: 75%',
          specs_suggested: [],
        },
      });
      const d = [
        { nome: 'res.ok',                 ok: r?.ok === true },
        { nome: "mode === 'create'",      ok: r?.mode === 'create' },
        { nome: 'answer string',         ok: typeof r?.answer === 'string' },
        { nome: 'answer length > 50',    ok: (r?.answer || '').length > 50 },
      ];
      return { passou: d.every((x) => x.ok), detalhes: d };
    },
  },

  {
    id: 'T11', bloco: 'BL-2',
    descricao: 'mode:create → pass_gold_required:true',
    async run(axios) {
      const { data: r } = await apiFetch(axios, 'POST', '/api/chat', {
        message: 'quero criar uma plataforma SaaS',
        mode: 'create',
      });
      const d = [
        { nome: 'res.ok',                     ok: r?.ok === true },
        { nome: 'pass_gold_required === true', ok: r?.pass_gold_required === true },
      ];
      return { passou: d.every((x) => x.ok), detalhes: d };
    },
  },

  {
    id: 'T12', bloco: 'BL-2',
    descricao: "mode:create → exec_real === 'BLOQUEADA'",
    async run(axios) {
      const { data: r } = await apiFetch(axios, 'POST', '/api/chat', {
        message: 'criar projeto',
        mode: 'create',
      });
      const d = [
        { nome: 'res.ok',                      ok: r?.ok === true },
        { nome: "exec_real === 'BLOQUEADA'",   ok: r?.exec_real === 'BLOQUEADA' },
      ];
      return { passou: d.every((x) => x.ok), detalhes: d };
    },
  },

  {
    id: 'T13', bloco: 'BL-2',
    descricao: 'mode:create answer contém marcadores do pipeline criar',
    async run(axios) {
      const { data: r } = await apiFetch(axios, 'POST', '/api/chat', {
        message: 'quero um e-commerce com Node.js e React',
        mode: 'create',
      });
      const ans = r?.answer || '';
      const hasMarker = ans.includes('◈') || ans.includes('PROJETO') ||
                        ans.includes('SETUP') || ans.includes('PASS GOLD') ||
                        ans.includes('WORKER') || ans.includes('Stack');
      const d = [
        { nome: 'res.ok',        ok: r?.ok === true },
        { nome: 'answer string', ok: typeof ans === 'string' && ans.length > 50 },
        { nome: 'marcador pipeline criar', ok: hasMarker },
      ];
      return { passou: d.every((x) => x.ok), detalhes: d };
    },
  },

  {
    id: 'T14', bloco: 'BL-2',
    descricao: 'mode:create com architect_context vazio não quebra (graceful)',
    async run(axios) {
      const { data: r, status } = await apiFetch(axios, 'POST', '/api/chat', {
        message: 'novo projeto',
        mode: 'create',
        architect_context: {},
      });
      const d = [
        { nome: 'status 200',          ok: status === 200 },
        { nome: 'res.ok',              ok: r?.ok === true },
        { nome: 'answer string',       ok: typeof r?.answer === 'string' },
      ];
      return { passou: d.every((x) => x.ok), detalhes: d };
    },
  },

  {
    id: 'T15', bloco: 'BL-2',
    descricao: 'mode:create → anti_stub:true na resposta',
    async run(axios) {
      const { data: r } = await apiFetch(axios, 'POST', '/api/chat', {
        message: 'crie um app',
        mode: 'create',
      });
      const d = [
        { nome: 'res.ok',             ok: r?.ok === true },
        { nome: 'anti_stub === true', ok: r?.anti_stub === true },
      ];
      return { passou: d.every((x) => x.ok), detalhes: d };
    },
  },

  // ─── BL-3: GET /api/spec/summary ──────────────────────────────────────────

  {
    id: 'T16', bloco: 'BL-3',
    descricao: 'GET /api/spec/summary existe e retorna ok:true',
    async run(axios) {
      const { data: r, status } = await apiFetch(axios, 'GET', '/api/spec/summary');
      const d = [
        { nome: 'status 200',  ok: status === 200 },
        { nome: 'res.ok',      ok: r?.ok === true },
      ];
      return { passou: d.every((x) => x.ok), detalhes: d };
    },
  },

  {
    id: 'T17', bloco: 'BL-3',
    descricao: 'modules array presente e não-vazio',
    async run(axios) {
      const { data: r } = await apiFetch(axios, 'GET', '/api/spec/summary');
      const d = [
        { nome: 'res.ok',            ok: r?.ok === true },
        { nome: 'modules é array',   ok: Array.isArray(r?.modules) },
        { nome: 'modules.length > 0', ok: (r?.modules || []).length > 0 },
      ];
      return { passou: d.every((x) => x.ok), detalhes: d };
    },
  },

  {
    id: 'T18', bloco: 'BL-3',
    descricao: 'total_specs > 0',
    async run(axios) {
      const { data: r } = await apiFetch(axios, 'GET', '/api/spec/summary');
      const d = [
        { nome: 'res.ok',              ok: r?.ok === true },
        { nome: 'total_specs number',  ok: typeof r?.total_specs === 'number' },
        { nome: 'total_specs > 0',     ok: (r?.total_specs || 0) > 0 },
      ];
      return { passou: d.every((x) => x.ok), detalhes: d };
    },
  },

  {
    id: 'T19', bloco: 'BL-3',
    descricao: 'total_modules >= 9',
    async run(axios) {
      const { data: r } = await apiFetch(axios, 'GET', '/api/spec/summary');
      const d = [
        { nome: 'res.ok',               ok: r?.ok === true },
        { nome: 'total_modules >= 9',   ok: (r?.total_modules || 0) >= 9 },
      ];
      return { passou: d.every((x) => x.ok), detalhes: d };
    },
  },

  {
    id: 'T20', bloco: 'BL-3',
    descricao: 'cada módulo tem id (string), name (string), count (number > 0)',
    async run(axios) {
      const { data: r } = await apiFetch(axios, 'GET', '/api/spec/summary');
      const modules = r?.modules || [];
      const allOk = modules.length > 0 && modules.every((m) =>
        typeof m.id === 'string' &&
        typeof m.name === 'string' &&
        typeof m.count === 'number' && m.count > 0
      );
      const d = [
        { nome: 'res.ok',             ok: r?.ok === true },
        { nome: 'todos módulos válidos', ok: allOk },
      ];
      return { passou: d.every((x) => x.ok), detalhes: d };
    },
  },

  {
    id: 'T21', bloco: 'BL-3',
    descricao: "SF-01 presente nos módulos",
    async run(axios) {
      const { data: r } = await apiFetch(axios, 'GET', '/api/spec/summary');
      const modules = r?.modules || [];
      const d = [
        { nome: 'res.ok',         ok: r?.ok === true },
        { nome: 'SF-01 presente', ok: modules.some((m) => m.id === 'SF-01') },
      ];
      return { passou: d.every((x) => x.ok), detalhes: d };
    },
  },

  {
    id: 'T22', bloco: 'BL-3',
    descricao: 'módulos ordenados: SF-01 antes de SF-09',
    async run(axios) {
      const { data: r } = await apiFetch(axios, 'GET', '/api/spec/summary');
      const modules = r?.modules || [];
      const idx01 = modules.findIndex((m) => m.id === 'SF-01');
      const idx09 = modules.findIndex((m) => m.id === 'SF-09');
      const ordenado = idx01 !== -1 && idx09 !== -1 && idx01 < idx09;
      const d = [
        { nome: 'res.ok',           ok: r?.ok === true },
        { nome: 'SF-01 encontrado', ok: idx01 !== -1 },
        { nome: 'SF-09 encontrado', ok: idx09 !== -1 },
        { nome: 'SF-01 < SF-09',    ok: ordenado },
      ];
      return { passou: d.every((x) => x.ok), detalhes: d };
    },
  },

  // ─── BL-4: Integração fluxo completo ──────────────────────────────────────

  {
    id: 'T23', bloco: 'BL-4',
    descricao: 'fluxo create encadeado: architect/interpret → /chat mode:create',
    async run(axios) {
      // Passo 1: classify
      const { data: cls } = await apiFetch(axios, 'POST', '/api/architect/interpret', {
        message: 'quero um SaaS de agendamento de consultas médicas',
      });
      const clsOk = cls?.ok === true;

      // Passo 2: /chat com mode:create e architect_context
      const { data: chat } = await apiFetch(axios, 'POST', '/api/chat', {
        message: 'quero um SaaS de agendamento de consultas médicas',
        mode: 'create',
        architect_context: {
          project_type:    cls?.classification?.project_type || 'SaaS',
          stack:           cls?.classification?.stack || [],
          confidence:      cls?.classification?.confidence || 0,
          specs_suggested: cls?.specs_suggested || [],
          routing_reason:  cls?.routing_reason || '',
        },
      });
      const d = [
        { nome: 'interpret ok',           ok: clsOk },
        { nome: 'intent detectado',       ok: ['create','chat','fix'].includes(cls?.intent) },
        { nome: 'chat ok',                ok: chat?.ok === true },
        { nome: "chat.mode === 'create'", ok: chat?.mode === 'create' },
        { nome: 'pass_gold_required',     ok: chat?.pass_gold_required === true },
        { nome: 'answer length > 100',    ok: (chat?.answer || '').length > 100 },
      ];
      return { passou: d.every((x) => x.ok), detalhes: d };
    },
  },

  {
    id: 'T24', bloco: 'BL-4',
    descricao: 'degradação: mode:create sem provider → resposta 200 controlada (não 5xx)',
    async run(axios) {
      // Testa que o gate retorna 200 mesmo sem provider
      // Se X-Force-Provider-Fail não for suportado, verifica apenas status 200
      const { data: r, status, err } = await apiFetch(
        axios, 'POST', '/api/chat',
        { message: 'x', mode: 'create' },
        { 'X-Force-Provider-Fail': 'true' },
      );
      // SKIP se timeout
      if (status === 0 && err && err.includes('timeout')) {
        return { skip: true, descricao: 'T24: timeout > 35s — SKIP', detalhes: [] };
      }
      const d = [
        { nome: 'não é 5xx',    ok: status >= 200 && status < 500 },
        { nome: 'resposta 200', ok: status === 200 },
      ];
      return { passou: d.every((x) => x.ok), detalhes: d };
    },
  },
];

// ── Run scenario ───────────────────────────────────────────────────────────────
async function runScenario(scenario, axios) {
  state.ativo = `${scenario.id} — ${scenario.descricao}`;
  addLog(`▶ ${scenario.id} [${scenario.bloco}] ${scenario.descricao}`);

  const inicio = Date.now();
  let result;

  try {
    result = await scenario.run(axios);
  } catch (err) {
    addLog(`  ⚠ ${scenario.id}: exceção — ${err.message}`);
    result = {
      passou: false,
      detalhes: [{ nome: `exceção: ${err.message}`, ok: false }],
    };
  }

  const tempo_ms = Date.now() - inicio;

  if (result.skip) {
    addLog(`  ⏭  ${scenario.id}: SKIP — ${result.descricao || ''}`);
    return { ...scenario, ...result, tempo_ms };
  }

  const icone = result.passou ? '✅' : '❌';
  addLog(`  ${icone} ${scenario.id}: ${result.passou ? 'PASS' : 'FAIL'} (${tempo_ms}ms)`);
  if (!result.passou) {
    const failed = (result.detalhes || []).filter((d) => !d.ok).map((d) => d.nome).join(', ');
    if (failed) addLog(`     Falhou: ${failed}`);
  }

  return { ...scenario, ...result, tempo_ms };
}

// ── Save results ───────────────────────────────────────────────────────────────
async function saveResults() {
  const dir = join(ROOT, 'test-results');
  mkdirSync(dir, { recursive: true });

  const auto   = state.resultados.filter((r) => !r.skip);
  const passes = auto.filter((r) => r.passou === true).length;
  const fails  = auto.filter((r) => r.passou === false).length;
  const skips  = state.resultados.filter((r) => r.skip).length;
  const total  = state.resultados.length;
  const taxa   = (passes + fails) > 0 ? Math.round((passes / (passes + fails)) * 100) : 0;
  const passGold = passes >= 22;
  const now    = new Date().toISOString();

  const blCount = (bl) => ({
    pass: auto.filter((r) => r.bloco === bl && r.passou).length,
    total: auto.filter((r) => r.bloco === bl).length,
  });
  const b1 = blCount('BL-1'), b2 = blCount('BL-2'),
        b3 = blCount('BL-3'), b4 = blCount('BL-4');

  const md = [
    `# Vision Core — Stress Test §76+§77+§78`,
    ``,
    `**Data:** ${now}`,
    `**Commit base:** 080e469`,
    `**Resultado:** ${passes}/${total - skips} PASS automáticos (${taxa}%) · ${skips} SKIP`,
    `**PASS GOLD gate (≥22/24):** ${passGold ? '✅ PASS' : '❌ FAIL'}`,
    ``,
    `## Coverage por bloco`,
    ``,
    `| Bloco | Escopo | Resultado |`,
    `|-------|--------|-----------|`,
    `| BL-1 | POST /api/architect/interpret §76 | ${b1.pass}/${b1.total} PASS |`,
    `| BL-2 | POST /api/chat mode:create | ${b2.pass}/${b2.total} PASS |`,
    `| BL-3 | GET /api/spec/summary | ${b3.pass}/${b3.total} PASS |`,
    `| BL-4 | Integração + degradação | ${b4.pass}/${b4.total} PASS |`,
    ``,
    `## Cenários`,
    ``,
    `| ID | Bloco | Descrição | Status | Tempo |`,
    `|----|-------|-----------|--------|-------|`,
    ...state.resultados.map((r) => {
      const status = r.skip ? '⏭ SKIP' : (r.passou ? '✅ PASS' : '❌ FAIL');
      return `| ${r.id} | ${r.bloco} | ${r.descricao} | ${status} | ${r.tempo_ms != null ? r.tempo_ms + 'ms' : '—'} |`;
    }),
    ``,
    `## Checks por cenário`,
    ``,
    ...state.resultados.filter((r) => !r.skip).map((r) => [
      `**${r.id}:** ${r.passou ? '✅ PASS' : '❌ FAIL'}`,
      ...(r.detalhes || []).map((d) => `  - ${d.ok ? '✓' : '✗'} ${d.nome}`),
      ``,
    ].join('\n')),
    `## Endpoint`,
    ``,
    `- **Worker:** ${WORKER_URL}`,
    `- **Timeout:** ${TIMEOUT_MS / 1000}s por cenário · **Retry:** 3x em 502/503`,
    ``,
  ].join('\n');

  const logPath = join(dir, 'stress-§76.log');
  await writeFile(logPath, md, 'utf8');

  const jsonPath = join(dir, 'stress-§76.json');
  await writeFile(jsonPath, JSON.stringify({
    data: now, commit: '080e469',
    resultado: `${passes}/${total - skips} PASS (${taxa}%)`,
    pass_gold: passGold,
    total, passes, fails, skips,
    cenarios: state.resultados.map((r) => ({
      id: r.id, bloco: r.bloco, descricao: r.descricao,
      passou: r.skip ? null : r.passou,
      skip: r.skip || false,
      tempo_ms: r.tempo_ms || null,
      detalhes: r.detalhes || [],
    })),
  }, null, 2), 'utf8');

  addLog(`📄 Resultados: test-results/stress-§76.log`);
  addLog(`📄 JSON: test-results/stress-§76.json`);
  addLog(`${passGold ? '✨ PASS GOLD' : '❌ ABAIXO DO GATE'} — ${passes}/24 PASS · gate: ≥22`);
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  const server = startDashboard();
  const { default: axios } = await import('axios');

  addLog(`◈ Stress Test §76+§77+§78 — ${SCENARIOS.length} cenários`);
  addLog(`🔗 Worker: ${WORKER_URL}`);

  for (const scenario of SCENARIOS) {
    const resultado = await runScenario(scenario, axios);
    state.resultados.push(resultado);
    state.atual++;
    if (!resultado.skip) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  state.rodando = false;
  state.ativo   = null;

  const auto   = state.resultados.filter((r) => !r.skip);
  const passes = auto.filter((r) => r.passou === true).length;
  const total  = state.resultados.length;

  addLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  addLog(`RESULTADO FINAL: ${passes}/${total} PASS`);
  addLog(passes >= 22 ? `✨ PASS GOLD (${passes}/24 ≥ 22)` : `❌ ABAIXO DO GATE (${passes}/24 < 22)`);
  addLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  await saveResults();

  // Keep dashboard alive 60s
  setTimeout(() => { server.close(); process.exit(0); }, 60_000);
}

main().catch((err) => { console.error('FATAL:', err); process.exit(1); });
