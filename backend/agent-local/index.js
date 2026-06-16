#!/usr/bin/env node
/**
 * Vision Agent Local v1.0.0
 * Ponte entre Vision Core e projetos no PC local.
 * Roda localmente, faz polling no worker, executa missões, retorna resultado.
 *
 * Uso:
 *   node index.js [caminho-do-projeto]
 *   VC_TOKEN=<token> node index.js C:\meu-projeto
 */
'use strict';

const fs    = require('fs');
const path  = require('path');
const http  = require('http');
const https = require('https');

const WORKER_URL  = process.env.VC_WORKER || 'https://visioncore-api-gateway.weiganlight.workers.dev';
const POLL_MS     = Number(process.env.VC_POLL_MS) || 3000;
const VERSION     = '1.0.0';
const LOCAL_PORT  = Number(process.env.VC_PORT) || 7070;

const projectRoot = path.resolve(process.argv[2] || process.cwd());
const agentToken  = process.env.VC_TOKEN || '';

console.log(`\n╔══════════════════════════════════════════╗`);
console.log(`║   VISION AGENT LOCAL v${VERSION}              ║`);
console.log(`╚══════════════════════════════════════════╝`);
console.log(`Projeto : ${projectRoot}`);
console.log(`Worker  : ${WORKER_URL}`);
console.log(`Polling : ${POLL_MS}ms`);
console.log(`Health  : http://localhost:${LOCAL_PORT}\n`);

/* ── HTTP helper ─────────────────────────────────────────────── */
function fetchJson(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const parsed  = new URL(url);
    const mod     = parsed.protocol === 'https:' ? https : http;
    const headers = { 'Content-Type': 'application/json', ...opts.headers };
    if (agentToken) { headers['Authorization'] = `Bearer ${agentToken}`; }
    const body = opts.body ? JSON.stringify(opts.body) : null;
    if (body) { headers['Content-Length'] = Buffer.byteLength(body); }

    const req = mod.request(url, {
      method:  opts.method || 'GET',
      headers,
      rejectUnauthorized: false
    }, (res) => {
      let data = '';
      res.on('data', d => { data += d; });
      res.on('end', () => {
        try   { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) { req.write(body); }
    req.end();
  });
}

/* ── File scanner ────────────────────────────────────────────── */
const TEXT_EXTS = new Set(['.js','.ts','.jsx','.tsx','.json','.html','.css','.md','.txt','.py','.go','.env.example']);
const SKIP_DIRS = new Set(['node_modules','.git','.next','.nuxt','dist','build','coverage','.vscode']);

function walkProject(root, keywords, maxDepth = 4) {
  const hits = [];
  function walk(dir, depth) {
    if (depth > maxDepth) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (SKIP_DIRS.has(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { walk(full, depth + 1); continue; }
      if (!TEXT_EXTS.has(path.extname(e.name).toLowerCase())) continue;
      try {
        const content = fs.readFileSync(full, 'utf8');
        const lc = content.toLowerCase();
        const score = keywords.filter(k => k.length > 3 && lc.includes(k)).length;
        if (score > 0) { hits.push({ file: full, score, content, size: content.length }); }
      } catch {}
    }
  }
  walk(root, 0);
  return hits.sort((a, b) => b.score - a.score);
}

function topLevelListing(root) {
  try {
    return fs.readdirSync(root, { withFileTypes: true })
      .filter(e => !SKIP_DIRS.has(e.name))
      .map(e => `${e.isDirectory() ? '📁' : '📄'} ${e.name}`)
      .join('\n');
  } catch (e) { return `Erro ao listar: ${e.message}`; }
}

/* ── Mission executor ────────────────────────────────────────── */
async function executeMission(mission) {
  const { id, input = '', type = 'general' } = mission;
  console.log(`\n[MISSÃO] ${id}  tipo=${type}`);
  console.log(`Input: ${input.slice(0, 120)}`);

  const steps  = [];
  let output   = '';
  let ok       = false;

  try {
    /* PASSO 1 — Listar projeto */
    const listing = topLevelListing(projectRoot);
    steps.push({ step: 'scan', ok: true, detail: `Raiz: ${projectRoot}` });

    /* PASSO 2 — Buscar arquivos relevantes */
    const keywords = input.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const hits     = keywords.length ? walkProject(projectRoot, keywords) : [];
    steps.push({ step: 'search', ok: true, detail: `${hits.length} arquivo(s) relevante(s) encontrado(s)` });

    if (hits.length > 0) {
      const top = hits[0];
      const rel = path.relative(projectRoot, top.file);
      steps.push({ step: 'read', ok: true, detail: `Lendo ${rel} (${top.size} chars, score=${top.score})` });
      output =
        `Arquivo mais relevante: ${rel}\n` +
        `─────────────────────────────────────────\n` +
        top.content.slice(0, 3000) +
        (top.content.length > 3000 ? '\n\n[... conteúdo truncado]' : '') +
        (hits.length > 1 ? `\n\nOutros arquivos relevantes:\n${hits.slice(1,5).map(h => '  ' + path.relative(projectRoot, h.file)).join('\n')}` : '');
      ok = true;
    } else {
      steps.push({ step: 'read', ok: true, detail: 'Sem match de keywords — retornando estrutura do projeto' });
      output = `Estrutura do projeto (${projectRoot}):\n\n${listing}`;
      ok = true;
    }

  } catch (err) {
    steps.push({ step: 'error', ok: false, detail: err.message });
    output = `Erro durante execução: ${err.message}`;
  }

  console.log(`  ✔ steps: ${steps.map(s => s.step + (s.ok ? '✅' : '❌')).join(', ')}`);
  return { mission_id: id, ok, steps, output, agent: 'vision-agent-local', version: VERSION };
}

/* ── Polling loop ────────────────────────────────────────────── */
let polling = false;

async function poll() {
  if (!polling) {
    polling = true;
    try {
      const res = await fetchJson(`${WORKER_URL}/api/agent/mission/pending`);
      if (res.status === 200 && res.body && res.body.mission) {
        const mission = res.body.mission;
        console.log(`\n📥 Missão: ${mission.id}`);
        const result = await executeMission(mission);
        await fetchJson(`${WORKER_URL}/api/agent/mission/result`, {
          method: 'POST',
          body:   result
        });
        console.log(`📤 Resultado enviado (ok=${result.ok})`);
      }
    } catch (_) { /* worker sem endpoint — silencioso */ }
    polling = false;
  }
  setTimeout(poll, POLL_MS);
}

/* ── Health server ───────────────────────────────────────────── */
http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok:      true,
      agent:   'vision-agent-local',
      version: VERSION,
      project: projectRoot,
      worker:  WORKER_URL,
      time:    new Date().toISOString()
    }));
  } else if (req.url === '/run' && req.method === 'POST') {
    /* Missão local via HTTP direto — sem polling */
    let body = '';
    req.on('data', d => { body += d; });
    req.on('end', async () => {
      try {
        const parsed  = JSON.parse(body);
        // Normalise field: accept `mission`, `message`, `prompt` as aliases for `input`
        if (!parsed.input && (parsed.mission || parsed.message || parsed.prompt)) {
          parsed.input = parsed.mission || parsed.message || parsed.prompt;
        }
        const mission = { id: `local_${Date.now()}`, ...parsed };
        const result  = await executeMission(mission);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end('not found');
  }
}).listen(LOCAL_PORT, () => {
  console.log(`Agent health: http://localhost:${LOCAL_PORT}`);
  console.log(`Missão local: POST http://localhost:${LOCAL_PORT}/run\n`);
  poll();
});
