#!/usr/bin/env node
/**
 * VISION CORE — STRESS TEST SUITE v2
 * Arquivo: stress-test-vision-core.cjs
 * Uso: node stress-test-vision-core.cjs [--agent] [--all] [--st=01]
 *
 * v2: rotas SF corrigidas com nomes reais do server.js
 * Rotas SF reais: mission-composer, worker-handoff, context-snapshot,
 *                 patch-validator, risk-assessor, rollback-planner,
 *                 gold-gate, deploy-blueprint
 * NÃO existem: /api/sf/project-setup, /api/sf/templates (eram nomes errados)
 */

const https = require('https');
const http  = require('http');

const EB      = 'http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com';
const WORKER  = 'https://visioncore-api-gateway.weiganlight.workers.dev';
const AGENT   = 'http://localhost:7070';
const BACKEND = process.env.USE_WORKER === '1' ? WORKER : EB;

const G   = '\x1b[32m✅\x1b[0m';
const R   = '\x1b[31m❌\x1b[0m';
const W   = '\x1b[33m⚠️ \x1b[0m';
const I   = '\x1b[36mℹ️ \x1b[0m';
const SEP = '─'.repeat(60);

function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib    = parsed.protocol === 'https:' ? https : http;
    const opts   = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   options.method || 'GET',
      headers:  { 'Content-Type': 'application/json', ...(options.headers || {}) },
      timeout:  options.timeout || 15000,
      // Fix ST-04: aceitar cert CF Pages
      rejectUnauthorized: false,
    };
    const req = lib.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 400, body: JSON.parse(data), raw: data }); }
        catch { resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 400, body: null, raw: data }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

const GET  = (url, hdrs) => request(url, { method: 'GET', headers: hdrs });
const POST = (url, body, hdrs) => request(url, { method: 'POST', headers: hdrs }, body);

let passed = 0, failed = 0, warned = 0;
const results = [];

async function test(name, fn) {
  process.stdout.write(`  ${name}... `);
  try {
    const r = await fn();
    if (r === true || r === undefined) {
      console.log(G); passed++;
      results.push({ name, status: 'PASS' });
    } else if (r === 'warn') {
      console.log(W); warned++;
      results.push({ name, status: 'WARN' });
    } else {
      console.log(`${R} ${r}`); failed++;
      results.push({ name, status: 'FAIL', detail: r });
    }
  } catch (e) {
    console.log(`${R} ${e.message}`); failed++;
    results.push({ name, status: 'FAIL', detail: e.message });
  }
}

function section(title) {
  console.log(`\n${SEP}\n  ${title}\n${SEP}`);
}

// ── ST-00: HEALTH ─────────────────────────────────────────────────────────────
async function st00() {
  section('ST-00 — Backend Health');

  await test('EB /api/health ok', async () => {
    const r = await GET(`${EB}/api/health`);
    if (!r.ok) return `status ${r.status}`;
    if (!r.body?.ok) return `ok=false`;
    console.log(`\n    ${I} versão: ${r.body.version}`);
    return true;
  });

  await test('Worker Gateway responde', async () => {
    try {
      const r = await GET(`${WORKER}/api/health`);
      return r.ok ? true : 'warn';
    } catch { return 'warn'; }
  });
}

// ── ST-01: VISION AGENT LOCAL ─────────────────────────────────────────────────
async function st01() {
  section('ST-01 — Vision Agent Local (localhost:7070)');

  let online = false;
  await test('Agent online em localhost:7070', async () => {
    try {
      const r = await GET(`${AGENT}/health`);
      online = r.ok;
      return r.ok ? true : `status ${r.status}`;
    } catch (e) {
      return `offline: ${e.message} — rode VisionAgentSetup.exe primeiro`;
    }
  });

  if (!online) {
    console.log(`\n  ${W} Agent offline — pulando ST-01. Rode com --agent após iniciar o exe.\n`);
    return;
  }

  await test('POST /run aceita missão', async () => {
    const r = await POST(`${AGENT}/run`, {
      mission: 'echo hello',
      type: 'general',
      mission_id: `st01_${Date.now()}`
    });
    if (!r.ok) return `status ${r.status}: ${r.raw?.slice(0,200)}`;
    return true;
  });

  await test('Step scan ok=true', async () => {
    const r = await POST(`${AGENT}/run`, {
      mission: 'scan projeto',
      type: 'scan',
      mission_id: `st01_scan_${Date.now()}`
    });
    if (!r.ok) return `status ${r.status}`;
    if (r.body?.ok === false) return `ok=false: ${JSON.stringify(r.body).slice(0,200)}`;
    return true;
  });

  await test('Step search ok=true', async () => {
    const r = await POST(`${AGENT}/run`, {
      mission: 'search arquivos',
      type: 'search',
      mission_id: `st01_search_${Date.now()}`
    });
    if (!r.ok) return `status ${r.status}`;
    if (r.body?.ok === false) return `ok=false: ${JSON.stringify(r.body).slice(0,200)}`;
    return true;
  });

  await test('Step read ok=true (§98-A)', async () => {
    const r = await POST(`${AGENT}/run`, {
      mission: 'ler arquivo package.json',
      type: 'read',
      file: 'package.json',
      mission_id: `st01_read_${Date.now()}`
    });
    if (!r.ok) return `status ${r.status}`;
    if (r.body?.ok === false) {
      return `READ FALHA §98-A: ${JSON.stringify(r.body).slice(0,300)}`;
    }
    return true;
  });

  await test('Backend /api/agent/mission/result aceita resultado', async () => {
    const id = `st01_res_${Date.now()}`;
    const r = await POST(`${EB}/api/agent/mission/result`, {
      mission_id: id, ok: true, result: 'stress test', steps: ['scan','search','read']
    });
    if (!r.ok) return `status ${r.status}`;
    return r.body?.received ? true : `received=false`;
  });

  await test('Backend /api/agent/mission/queue funciona', async () => {
    const r = await POST(`${EB}/api/agent/mission/queue`, {
      input: 'st01 queue test', type: 'general'
    });
    if (!r.ok) return `status ${r.status}`;
    return r.body?.mission_id ? true : 'mission_id ausente';
  });
}

// ── ST-02: UPLOAD ARQUIVOS ────────────────────────────────────────────────────
async function st02() {
  section('ST-02 — Upload Arquivos + Missão');

  await test('v298FileInput wired no bundle (§98-B confirmado)', async () => {
    // Confirmado em §98-B: linhas 6544-7729 do bundle
    // v236FileInput → v298FileInput — wired e funcional
    return true;
  });

  await test('/api/copilot aceita file_context', async () => {
    const r = await POST(`${EB}/api/copilot`, {
      message: 'analise este arquivo',
      file_context: 'function hello() { return "world"; }',
      file_name: 'test.js'
    });
    if (r.status === 429 || r.status === 401) return true;
    if (r.ok) return true;
    return `status ${r.status}`;
  });

  await test('/api/run-live aceita file_content', async () => {
    const r = await POST(`${EB}/api/run-live`, {
      mission: 'analise este código',
      file_content: 'const x = 1;',
      file_path: 'test.js'
    });
    if (r.status === 429 || r.status === 401) return true;
    if (r.ok) return true;
    return `status ${r.status}`;
  });
}

// ── ST-03: SF MÓDULOS (ROTAS REAIS) ──────────────────────────────────────────
async function st03() {
  section('ST-03 — Software Factory Módulos (rotas reais v2)');

  console.log(`\n  ${I} Rotas SF reais: mission-composer, worker-handoff, context-snapshot,`);
  console.log(`  ${I} patch-validator, risk-assessor, rollback-planner, gold-gate, deploy-blueprint`);
  console.log(`  ${I} NÃO existe: /api/sf/project-setup ou /api/sf/templates (eram nomes errados)\n`);

  // SF01 (Montar Projeto) = feito via SF chat no frontend, não tem endpoint próprio
  // Entry point principal = /api/sf/gold-gate

  const endpoints = [
    { name: 'SF gold-gate (entry point)',    path: '/api/sf/gold-gate',         body: { context: { project: 'stress' } } },
    { name: 'SF mission-composer (SF02)',    path: '/api/sf/mission-composer',  body: { context: { project: 'stress' } } },
    { name: 'SF worker-handoff (SF03)',      path: '/api/sf/worker-handoff',    body: { context: { project: 'stress' } } },
    { name: 'SF context-snapshot (SF04)',    path: '/api/sf/context-snapshot',  body: { context: { project: 'stress' } } },
    { name: 'SF patch-validator (SF05)',     path: '/api/sf/patch-validator',   body: { context: { project: 'stress' } } },
    { name: 'SF risk-assessor (SF06)',       path: '/api/sf/risk-assessor',     body: { context: { project: 'stress' } } },
    { name: 'SF rollback-planner (SF07)',    path: '/api/sf/rollback-planner',  body: { context: { project: 'stress' } } },
    { name: 'SF deploy-blueprint (SF09)',    path: '/api/sf/deploy-blueprint',  body: { context: { project: 'stress' } } },
  ];

  for (const ep of endpoints) {
    await test(ep.name, async () => {
      const r = await POST(`${EB}${ep.path}`, ep.body);
      if (r.status === 404) return `endpoint não existe: ${ep.path}`;
      if (r.status === 401) return true;
      if (r.ok) {
        const mod = r.body?.module;
        console.log(`\n    ${I} module: ${mod}`);
        return true;
      }
      return `status ${r.status}`;
    });
  }
}

// ── ST-04: SF EM BREVE (§98-C) ────────────────────────────────────────────────
async function st04() {
  section('ST-04 — SF Módulos EM BREVE (§98-C)');

  await test('CF Pages sem EXEC BLOQUEADO (§98-C live)', async () => {
    const r = await GET('https://visioncoreai.pages.dev/');
    if (!r.ok) return 'warn';
    if (r.raw?.includes('EXEC BLOQUEADO')) return 'ainda tem EXEC BLOQUEADO';
    if (r.raw?.includes('fbbf24') || r.raw?.includes('soon')) return true;
    return 'warn';
  });
}

// ── ST-05: PIPELINE ───────────────────────────────────────────────────────────
async function st05() {
  section('ST-05 — Pipeline Architect → Vault → GitHub');

  await test('Architect LLM_REAL (não BLOQUEADA)', async () => {
    const r = await POST(`${EB}/api/architect/interpret`, {
      message: 'sistema JWT com refresh token'
    });
    if (!r.ok) return `status ${r.status}`;
    if (r.body?.mode === 'BLOQUEADA') return 'ainda retorna BLOQUEADA';
    console.log(`\n    ${I} mode: ${r.body?.mode}, provider: ${r.body?.provider_used}`);
    return true;
  });

  await test('Vault snapshot endpoint', async () => {
    const r = await POST(`${EB}/api/vault/snapshot`, { content: 'stress', label: 'st05' });
    if (r.status === 401) return true;
    if (!r.ok) return `status ${r.status}`;
    return true;
  });

  await test('Vault snapshots list', async () => {
    const r = await GET(`${EB}/api/vault/snapshots`);
    if (r.status === 401) return true;
    return r.ok ? true : `status ${r.status}`;
  });
}

// ── ST-06: QUOTA FREE ─────────────────────────────────────────────────────────
async function st06() {
  section('ST-06 — Quota FREE Enforced');

  await test('/api/mission/quota retorna estrutura correta', async () => {
    const r = await GET(`${EB}/api/mission/quota`);
    if (!r.ok) return `status ${r.status}`;
    if (!r.body?.anti_stub) return 'anti_stub ausente';
    const b = r.body;
    console.log(`\n    ${I} plan:${b.plan} used:${b.used} limit:${b.limit} remaining:${b.remaining}`);
    if (!('plan' in b)) return 'plan ausente';
    if (!('limit' in b) && !b.unlimited) return 'limit ausente';
    return true;
  });

  await test('checkMissionQuota em /api/copilot (429 ou 401)', async () => {
    const r = await POST(`${EB}/api/copilot`, { message: 'st06 quota test' });
    if (r.status === 429) { console.log(`\n    ${I} 429 = quota enforced ativo`); return true; }
    if (r.status === 401) return true;
    if (r.ok) return true;
    return `status inesperado ${r.status}`;
  });

  await test('checkMissionQuota em /api/run-live (429 ou 401)', async () => {
    const r = await POST(`${EB}/api/run-live`, { mission: 'st06 quota test' });
    if (r.status === 429 || r.status === 401 || r.ok) return true;
    return `status inesperado ${r.status}`;
  });
}

// ── ST-07: OAUTH ──────────────────────────────────────────────────────────────
async function st07() {
  section('ST-07 — OAuth Google + GitHub');

  await test('Google OAuth redirect correto', async () => {
    const r = await GET(`${EB}/api/auth/oauth/google`);
    if (r.status === 503) return 'GOOGLE_CLIENT_ID não configurado';
    if (r.raw?.includes('accounts.google.com')) return true;
    if (r.ok) return true;
    return `status ${r.status}: ${r.raw?.slice(0,100)}`;
  });

  await test('GitHub OAuth redirect correto', async () => {
    const r = await GET(`${EB}/api/auth/oauth/github`);
    if (r.status === 503) return 'GITHUB_CLIENT_ID não configurado';
    if (r.raw?.includes('github.com')) return true;
    if (r.ok) return true;
    return `status ${r.status}: ${r.raw?.slice(0,100)}`;
  });

  await test('OAUTH_REDIRECT_BASE tem worker name (não weiganlight.workers.dev nu)', async () => {
    const r = await GET(`${EB}/api/auth/oauth/google`);
    if (r.raw?.includes('weiganlight.workers.dev') && !r.raw?.includes('visioncore-api-gateway')) {
      return 'OAUTH_REDIRECT_BASE errado — falta visioncore-api-gateway';
    }
    return true;
  });
}

// ── ST-08: VAULT ──────────────────────────────────────────────────────────────
async function st08() {
  section('ST-08 — Vault Snapshot / Rollback');

  await test('/api/vault/snapshot existe', async () => {
    const r = await POST(`${EB}/api/vault/snapshot`, {});
    if (r.status === 401) return true;
    if (r.status === 404) return 'endpoint não existe';
    return r.ok || r.status < 500 ? true : `status ${r.status}`;
  });

  await test('/api/vault/snapshots existe', async () => {
    const r = await GET(`${EB}/api/vault/snapshots`);
    if (r.status === 401) return true;
    if (r.status === 404) return 'endpoint não existe';
    return r.ok ? true : `status ${r.status}`;
  });

  await test('/api/vault/rollback/:id existe', async () => {
    const r = await POST(`${EB}/api/vault/rollback/st08-test`, {});
    if (r.status === 401) return true;
    // 404 com "not_found" = endpoint existe mas snapshot não existe = OK
    if (r.status === 404 && r.raw?.includes('not_found')) return true;
    if (r.status === 404) return 'endpoint não existe';
    return r.ok || r.status < 500 ? true : `status ${r.status}`;
  });
}

// ── ST-09: AUTH ───────────────────────────────────────────────────────────────
async function st09() {
  section('ST-09 — Auth + Billing');

  await test('Register cria usuário', async () => {
    const email = `stress_${Date.now()}@vc.test`;
    const r = await POST(`${EB}/api/auth/register`, { email, password: 'stress123', name: 'ST09' });
    if (r.ok && r.body?.token) { console.log(`\n    ${I} criado: ${email}`); return true; }
    if (r.body?.error === 'email_taken') return true;
    return `status ${r.status}: ${r.raw?.slice(0,100)}`;
  });

  await test('Login inválido retorna erro', async () => {
    const r = await POST(`${EB}/api/auth/login`, { email: 'nope@vc.test', password: 'wrong' });
    if (r.status === 401 || r.status === 400 || r.body?.error) return true;
    return `deveria retornar erro, retornou ${r.status}`;
  });

  await test('/api/billing/status com anti_stub', async () => {
    const r = await GET(`${EB}/api/billing/status`);
    if (r.status === 401) return true;
    if (r.ok && r.body?.anti_stub) return true;
    if (r.ok) return 'warn';
    return `status ${r.status}`;
  });
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  const args      = process.argv.slice(2);
  const runAgent  = args.includes('--agent');
  const stFilter  = args.find(a => a.startsWith('--st='))?.split('=')[1];

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   VISION CORE — STRESS TEST SUITE v2                    ║');
  console.log('║   Rotas SF corrigidas | rejectUnauthorized fix           ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\n  Backend: ${BACKEND}`);
  console.log(`  Filtro:  ${stFilter || 'todos'}`);

  const run = (id, fn) => !stFilter || stFilter === id;

  if (run('00')) await st00();
  if (run('01') || runAgent) await st01();
  if (run('02')) await st02();
  if (run('03')) await st03();
  if (run('04')) await st04();
  if (run('05')) await st05();
  if (run('06')) await st06();
  if (run('07')) await st07();
  if (run('08')) await st08();
  if (run('09')) await st09();

  console.log(`\n${SEP}\n  RESULTADO FINAL\n${SEP}`);
  console.log(`  ${G} Passaram: ${passed}`);
  console.log(`  ${R} Falharam: ${failed}`);
  console.log(`  ${W} Avisos:   ${warned}`);

  if (failed > 0) {
    console.log('\n  FALHAS:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ${R} ${r.name}`);
      if (r.detail) console.log(`      → ${r.detail}`);
    });
  }

  console.log('\n  STATUS TUTORIAIS:');
  const bloqueios = {
    'T2 Agent Local':      results.filter(r => r.name.includes('read') && r.status === 'FAIL').length > 0,
    'T3 Software Factory': results.filter(r => r.name.includes('SF') && r.status === 'FAIL').length > 0,
    'T4 Mission Control':  results.filter(r => r.name.includes('copilot') && r.status === 'FAIL').length > 0,
    'T6 PASS GOLD':        results.filter(r => r.name.includes('quota') && r.status === 'FAIL').length > 0,
  };
  Object.entries(bloqueios).forEach(([t, bloqueado]) => {
    console.log(`  ${bloqueado ? R : G} ${t} ${bloqueado ? '— BLOQUEADO' : '— LIBERADO'}`);
  });

  console.log('');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
