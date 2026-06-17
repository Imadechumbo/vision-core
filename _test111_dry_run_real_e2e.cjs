#!/usr/bin/env node
/**
 * §111 — Etapa A, Fase 2: E2E do dry-run real (sem navegador, sem LLM real)
 *
 * Sobe um backend STUB (não o server.js real) que implementa só os 4
 * endpoints que o vision-agent.js precisa pra esta missão — fila, poll,
 * resultado, e /api/chat retornando uma resposta determinística (sem
 * chamar nenhum provider de LLM de verdade, então roda sem chave de API
 * e sem depender de rede externa). Isso mantém o teste 100% reproduzível
 * e rápido, igual o espírito de _test105_full_loop_e2e.sh ("não chama
 * LLM nenhum").
 *
 * A validação de QUE o gate anti-alucinação do backend real é respeitado
 * pela mensagem que o agente envia já está coberta separadamente em
 * _test111_dry_run_real_unit.cjs — aqui o foco é a garantia de
 * comportamento da missão em si: zero escrita real, zero commit, e o
 * firewall (§110) bloqueando ANTES de qualquer leitura quando o alvo é
 * o próprio vision-core.
 *
 * 4 cenários:
 *   1. FIREWALL: target_path = raiz do vision-core (este sandbox) →
 *      bloqueado antes de qualquer scan.
 *   2. CAMINHO FELIZ: repo temporário com bug conhecido → diff_preview
 *      correto, arquivo no disco bit-a-bit idêntico ao original, HEAD
 *      do git inalterado, working tree limpo.
 *   3. FALHA NO PATCH: stub retorna um patch cuja busca não existe no
 *      arquivo → sf_dry_run_patch_failed, arquivo/commit intactos.
 *   4. FALHA NA VALIDAÇÃO: stub retorna um patch que produziria JS
 *      inválido → sf_dry_run_validation_failed, arquivo/commit intactos.
 *
 * Uso: node _test111_dry_run_real_e2e.cjs
 * Requer: node, git.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const { execSync, spawn } = require('child_process');

let passed = 0;
let failed = 0;

function check(name, cond, detail) {
  if (cond) {
    console.log('  ✓ ' + name);
    passed++;
  } else {
    console.log('  ✗ ' + name + (detail ? ' — ' + detail : ''));
    failed++;
  }
}

function mkTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix + '-'));
}

function gitRepo(dir, files) {
  execSync('git init -q', { cwd: dir });
  execSync('git config user.email "test@vc.test"', { cwd: dir });
  execSync('git config user.name "VC Test"', { cwd: dir });
  Object.keys(files).forEach((name) => fs.writeFileSync(path.join(dir, name), files[name], 'utf8'));
  execSync('git add -A', { cwd: dir });
  execSync('git commit -q -m "initial"', { cwd: dir });
}

function gitHead(dir) {
  return execSync('git rev-parse HEAD', { cwd: dir, encoding: 'utf8' }).trim();
}

function gitStatus(dir) {
  return execSync('git status --short', { cwd: dir, encoding: 'utf8' }).trim();
}

function httpJson(port, methodAndPath, body) {
  return new Promise((resolve, reject) => {
    const [method, p] = methodAndPath.split(' ');
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost', port: port, path: p, method: method,
      headers: payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}
    }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: null, raw: data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ── Backend STUB — só os endpoints que o agente precisa, /api/chat determinístico ──
let queue = [];
let results = {};
let nextChatAnswer = null; // configurável por cenário

function startStubBackend() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => body += c);
      req.on('end', () => {
        let parsed = {};
        try { parsed = body ? JSON.parse(body) : {}; } catch (e) {}

        function sendJson(obj) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(obj));
        }

        if (req.method === 'POST' && req.url === '/api/agent/mission/queue') {
          const mission = {
            id: 'mission_' + Date.now() + '_' + Math.random().toString(16).slice(2, 6),
            input: parsed.input || '',
            type: parsed.type || 'general',
            target_path: parsed.target_path,
            queued_at: new Date().toISOString()
          };
          queue.push(mission);
          return sendJson({ ok: true, mission_id: mission.id, queued: true });
        }

        if (req.method === 'GET' && req.url === '/api/agent/mission/pending') {
          const mission = queue.shift();
          return sendJson({ ok: true, mission: mission || null });
        }

        if (req.method === 'POST' && req.url === '/api/agent/mission/result') {
          results[parsed.mission_id] = parsed;
          return sendJson({ ok: true, received: true });
        }

        if (req.method === 'GET' && req.url.startsWith('/api/agent/mission/result/')) {
          const id = req.url.split('/').pop();
          return sendJson(results[id] || null);
        }

        if (req.method === 'POST' && req.url === '/api/chat') {
          // Resposta determinística — sem chamar nenhum LLM de verdade.
          return sendJson({ ok: true, answer: nextChatAnswer });
        }

        res.writeHead(404); res.end();
      });
    });
    srv.listen(0, () => resolve({ srv: srv, port: srv.address().port }));
  });
}

function startAgent(port, projDir) {
  const env = Object.assign({}, process.env, {
    VC_WORKER: 'http://localhost:' + port,
    VC_PORT: '0',
    VC_POLL_MS: '500'
  });
  const child = spawn(process.execPath, [path.join(__dirname, 'frontend', 'downloads', 'vision-agent.js'), projDir], { env: env, stdio: ['ignore', 'pipe', 'pipe'] });
  return child;
}

async function waitForResult(missionId, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (results[missionId]) return results[missionId];
    await sleep(150);
  }
  return null;
}

async function main() {
  console.log('§111 E2E — Dry-Run Real (Etapa A, Fase 2)\n');

  const { srv, port } = await startStubBackend();
  console.log('Backend stub na porta ' + port + '\n');

  // ═══════════════════════════════════════════════════════════════
  // CENÁRIO 1 — FIREWALL: target_path = raiz do vision-core (sandbox)
  // ═══════════════════════════════════════════════════════════════
  console.log('=== 1. FIREWALL: target_path apontando pro próprio vision-core ===');
  const visionCoreRoot = path.resolve(__dirname);
  const agent1 = startAgent(port, mkTempDir('vc-t111-agent1-root')); // ROOT do agente é outro, irrelevante aqui
  await sleep(800);

  const q1 = await httpJson(port, 'POST /api/agent/mission/queue', { type: 'sf_dry_run_real', target_path: visionCoreRoot, input: 'tentar self-target' });
  const r1 = await waitForResult(q1.body.mission_id, 6000);
  agent1.kill();

  check('mission_id recebido', !!q1.body.mission_id);
  check('action === sf_dry_run_blocked_self_target', r1 && r1.action === 'sf_dry_run_blocked_self_target', r1 && JSON.stringify(r1.action));
  check('ok === false', r1 && r1.ok === false);
  check('apenas o step Firewall rodou — Scanner nunca chegou a executar', r1 && r1.steps && r1.steps.length === 1 && r1.steps[0].agent === 'Firewall', r1 && JSON.stringify(r1.steps));

  // ═══════════════════════════════════════════════════════════════
  // Setup do repo de teste pros próximos 3 cenários
  // ═══════════════════════════════════════════════════════════════
  const projDir = mkTempDir('vc-t111-target-project');
  gitRepo(projDir, {
    'calc.js': 'function add(a, b) {\n  return a - b; // bug: deveria ser soma\n}\nmodule.exports = { add };\n'
  });
  const originalContent = fs.readFileSync(path.join(projDir, 'calc.js'), 'utf8');
  const headBefore = gitHead(projDir);

  const agentRoot = mkTempDir('vc-t111-agent-root'); // ROOT do agente é um diretório vazio qualquer, não o projDir nem o vision-core
  const agent = startAgent(port, agentRoot);
  await sleep(800);

  // ═══════════════════════════════════════════════════════════════
  // CENÁRIO 2 — CAMINHO FELIZ
  // ═══════════════════════════════════════════════════════════════
  console.log('\n=== 2. CAMINHO FELIZ: bug real, patch válido, diff correto, ZERO escrita real ===');
  nextChatAnswer = 'Diagnóstico: operador trocado.\n\n```json\n{\n  "file": "calc.js",\n  "fix_type": "code_patch",\n  "diagnosis": "operador errado em add()",\n  "patch": { "search": "return a - b; // bug: deveria ser soma", "replace": "return a + b;" }\n}\n```\n';

  const q2 = await httpJson(port, 'POST /api/agent/mission/queue', { type: 'sf_dry_run_real', target_path: projDir, input: 'corrigir o operador errado em calc.js' });
  const r2 = await waitForResult(q2.body.mission_id, 8000);

  check('action === sf_dry_run_completed', r2 && r2.action === 'sf_dry_run_completed', r2 && JSON.stringify(r2));
  check('real_io true, written_to_disk false, committed false', r2 && r2.real_io === true && r2.written_to_disk === false && r2.committed === false);
  check('diff_preview.before é o conteúdo original', r2 && r2.diff_preview && r2.diff_preview.before === originalContent);
  check('diff_preview.after contém a correção esperada', r2 && r2.diff_preview && r2.diff_preview.after.includes('return a + b;'));
  check('arquivo no disco do projeto-alvo é BIT-A-BIT IDÊNTICO ao original', fs.readFileSync(path.join(projDir, 'calc.js'), 'utf8') === originalContent);
  check('HEAD do git do projeto-alvo NÃO mudou (zero commits)', gitHead(projDir) === headBefore);
  check('working tree do projeto-alvo está limpo (git status vazio)', gitStatus(projDir) === '');

  // ═══════════════════════════════════════════════════════════════
  // CENÁRIO 3 — FALHA NO PATCH (busca não encontrada)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n=== 3. FALHA NO PATCH: busca não encontrada no arquivo ===');
  nextChatAnswer = '```json\n{\n  "file": "calc.js",\n  "fix_type": "code_patch",\n  "diagnosis": "tentativa com busca errada",\n  "patch": { "search": "texto que definitivamente nao existe no arquivo", "replace": "x" }\n}\n```\n';

  const q3 = await httpJson(port, 'POST /api/agent/mission/queue', { type: 'sf_dry_run_real', target_path: projDir, input: 'corrigir calc.js' });
  const r3 = await waitForResult(q3.body.mission_id, 8000);

  check('action === sf_dry_run_patch_failed', r3 && r3.action === 'sf_dry_run_patch_failed', r3 && JSON.stringify(r3.action));
  check('arquivo no disco continua intacto', fs.readFileSync(path.join(projDir, 'calc.js'), 'utf8') === originalContent);
  check('HEAD ainda inalterado', gitHead(projDir) === headBefore);

  // ═══════════════════════════════════════════════════════════════
  // CENÁRIO 4 — FALHA NA VALIDAÇÃO (resultado simulado é JS inválido)
  // ═══════════════════════════════════════════════════════════════
  console.log('\n=== 4. FALHA NA VALIDAÇÃO: patch válido mas resultado simulado é sintaxe inválida ===');
  nextChatAnswer = '```json\n{\n  "file": "calc.js",\n  "fix_type": "code_patch",\n  "diagnosis": "patch que quebra sintaxe",\n  "patch": { "search": "return a - b; // bug: deveria ser soma", "replace": "return a - b; function broken(" }\n}\n```\n';

  const q4 = await httpJson(port, 'POST /api/agent/mission/queue', { type: 'sf_dry_run_real', target_path: projDir, input: 'corrigir calc.js' });
  const r4 = await waitForResult(q4.body.mission_id, 8000);

  check('action === sf_dry_run_validation_failed', r4 && r4.action === 'sf_dry_run_validation_failed', r4 && JSON.stringify(r4.action));
  check('arquivo no disco continua intacto (mesmo após simular um patch sintaticamente inválido)', fs.readFileSync(path.join(projDir, 'calc.js'), 'utf8') === originalContent);
  check('HEAD ainda inalterado', gitHead(projDir) === headBefore);
  check('working tree ainda limpo', gitStatus(projDir) === '');

  agent.kill();
  srv.close();

  console.log('\nTotal: ' + (passed + failed) + ' | Passou: ' + passed + ' | Falhou: ' + failed);
  if (failed === 0) {
    console.log('=== §111 E2E: TODOS OS TESTES PASSARAM ===');
    process.exit(0);
  } else {
    console.log('=== §111 E2E: ALGUNS TESTES FALHARAM ===');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('ERRO FATAL NO TESTE:', e);
  process.exit(1);
});
