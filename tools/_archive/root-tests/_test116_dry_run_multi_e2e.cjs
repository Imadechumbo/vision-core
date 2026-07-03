#!/usr/bin/env node
/**
 * §116 — Dry-run multi-arquivo: E2E (sem navegador, sem LLM real)
 *
 * Mesmo harness do _test111_dry_run_real_e2e.cjs: backend STUB com os 4
 * endpoints que o vision-agent.js precisa pra esta missão (fila, poll,
 * resultado) + /api/chat retornando uma resposta determinística por
 * cenário — sem chamar nenhum provider de LLM de verdade, roda sem chave
 * de API e sem depender de rede externa. O agente real é levantado como
 * processo filho, igual antes.
 *
 * Diferença desta suíte: o /api/chat stub devolve o formato multi-arquivo
 * (§115) — "files": [...] no lugar de file/patch único — pra exercitar o
 * ramo novo dentro de sfDryRunRealMission.
 *
 * 5 cenários:
 *   1. CAMINHO FELIZ MULTI: 2 arquivos com bugs conhecidos num repo
 *      temporário → sf_dry_run_multi_completed, diff_preview correto pros
 *      2, ambos os arquivos no disco bit-a-bit idênticos ao original, HEAD
 *      do git inalterado, working tree limpo.
 *   2. FALHA NO PATCH (2º arquivo): a busca do 2º arquivo não existe no
 *      conteúdo real → sf_dry_run_multi_patch_failed, nada no disco/git
 *      afetado (nem o 1º arquivo, que teria simulado com sucesso).
 *   3. FALHA NA VALIDAÇÃO (2º arquivo): patch do 2º arquivo simula um
 *      resultado com JS inválido → sf_dry_run_multi_validation_failed.
 *   4. ARQUIVO NÃO ENCONTRADO: um dos arquivos da leva não existe no
 *      target_path → sf_dry_run_multi_patch_failed (mesma action — falha
 *      de resolução é tratada como falha de patch, nunca expõe diff
 *      parcial), exercita resolveTargetFileInRoot via o caminho real.
 *   5. REGRESSÃO SINGLE-FILE (§111): o formato de 1 arquivo continua
 *      produzindo sf_dry_run_completed exatamente como antes — confirma
 *      que o ramo novo não interferiu no caminho antigo.
 *
 * Uso: node _test116_dry_run_multi_e2e.cjs
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
  console.log('§116 E2E — Dry-Run Multi-Arquivo\n');

  const { srv, port } = await startStubBackend();
  console.log('Backend stub na porta ' + port + '\n');

  // ═══════════════════════════════════════════════════════════════
  // Setup do repo de teste — usado pelos cenários 1-4
  // ═══════════════════════════════════════════════════════════════
  const projDir = mkTempDir('vc-t116-target-project');
  gitRepo(projDir, {
    'calc.js':  'function add(a, b) {\n  return a - b; // bug: deveria ser soma\n}\nmodule.exports = { add };\n',
    'utils.js': 'function dobro(x) {\n  return x - x; // bug: deveria ser x * 2\n}\nmodule.exports = { dobro };\n'
  });
  const calcOriginal  = fs.readFileSync(path.join(projDir, 'calc.js'), 'utf8');
  const utilsOriginal = fs.readFileSync(path.join(projDir, 'utils.js'), 'utf8');
  const headBefore     = gitHead(projDir);

  const agentRoot = mkTempDir('vc-t116-agent-root'); // ROOT do agente é um diretório vazio qualquer, não o projDir
  const agent = startAgent(port, agentRoot);
  await sleep(800);

  // ═══════════════════════════════════════════════════════════════
  // CENÁRIO 1 — CAMINHO FELIZ MULTI
  // ═══════════════════════════════════════════════════════════════
  console.log('=== 1. CAMINHO FELIZ MULTI: 2 arquivos com bugs reais, ZERO escrita real ===');
  nextChatAnswer = 'Diagnóstico: dois operadores trocados em arquivos diferentes.\n\n```json\n{\n' +
    '  "diagnosis": "operadores errados em calc.js e utils.js",\n' +
    '  "files": [\n' +
    '    { "file": "calc.js",  "fix_type": "code_patch", "patch": { "search": "return a - b; // bug: deveria ser soma", "replace": "return a + b;" } },\n' +
    '    { "file": "utils.js", "fix_type": "code_patch", "patch": { "search": "return x - x; // bug: deveria ser x * 2", "replace": "return x * 2;" } }\n' +
    '  ],\n' +
    '  "confidence": 0.9,\n' +
    '  "decisao": "NEEDS_FIX"\n' +
    '}\n```\n';

  const q1 = await httpJson(port, 'POST /api/agent/mission/queue', { type: 'sf_dry_run_real', target_path: projDir, input: 'corrigir os bugs em calc.js e utils.js' });
  const r1 = await waitForResult(q1.body.mission_id, 8000);

  check('action === sf_dry_run_multi_completed', r1 && r1.action === 'sf_dry_run_multi_completed', r1 && JSON.stringify(r1));
  check('real_io true, written_to_disk false, committed false', r1 && r1.real_io === true && r1.written_to_disk === false && r1.committed === false);
  check('files é array com 2 entradas', r1 && Array.isArray(r1.files) && r1.files.length === 2, r1 && JSON.stringify(r1.files));
  check('diff_preview de calc.js correto (before original, after com fix)', r1 && r1.files.some(f => f.file === 'calc.js' && f.diff_preview.before === calcOriginal && f.diff_preview.after.includes('return a + b;')));
  check('diff_preview de utils.js correto (before original, after com fix)', r1 && r1.files.some(f => f.file === 'utils.js' && f.diff_preview.before === utilsOriginal && f.diff_preview.after.includes('return x * 2;')));
  check('calc.js no disco do projeto-alvo é BIT-A-BIT IDÊNTICO ao original', fs.readFileSync(path.join(projDir, 'calc.js'), 'utf8') === calcOriginal);
  check('utils.js no disco do projeto-alvo é BIT-A-BIT IDÊNTICO ao original', fs.readFileSync(path.join(projDir, 'utils.js'), 'utf8') === utilsOriginal);
  check('HEAD do git do projeto-alvo NÃO mudou (zero commits)', gitHead(projDir) === headBefore);
  check('working tree do projeto-alvo está limpo (git status vazio)', gitStatus(projDir) === '');

  // ═══════════════════════════════════════════════════════════════
  // CENÁRIO 2 — FALHA NO PATCH DO 2º ARQUIVO
  // ═══════════════════════════════════════════════════════════════
  console.log('\n=== 2. FALHA NO PATCH (2º arquivo): busca não encontrada — leva inteira é descartada ===');
  nextChatAnswer = '```json\n{\n' +
    '  "diagnosis": "tentativa com busca errada no 2º arquivo",\n' +
    '  "files": [\n' +
    '    { "file": "calc.js",  "fix_type": "code_patch", "patch": { "search": "return a - b; // bug: deveria ser soma", "replace": "return a + b;" } },\n' +
    '    { "file": "utils.js", "fix_type": "code_patch", "patch": { "search": "texto que definitivamente nao existe no arquivo", "replace": "x" } }\n' +
    '  ],\n' +
    '  "confidence": 0.9,\n' +
    '  "decisao": "NEEDS_FIX"\n' +
    '}\n```\n';

  const q2 = await httpJson(port, 'POST /api/agent/mission/queue', { type: 'sf_dry_run_real', target_path: projDir, input: 'corrigir calc.js e utils.js' });
  const r2 = await waitForResult(q2.body.mission_id, 8000);

  check('action === sf_dry_run_multi_patch_failed', r2 && r2.action === 'sf_dry_run_multi_patch_failed', r2 && JSON.stringify(r2.action));
  check('resultado NÃO expõe diff_preview do 1º arquivo (que teria simulado com sucesso) como se fosse válido', r2 && !r2.diff_preview && (!r2.files || typeof r2.files[0] === 'string'), r2 && JSON.stringify(r2.files));
  check('calc.js continua intacto', fs.readFileSync(path.join(projDir, 'calc.js'), 'utf8') === calcOriginal);
  check('utils.js continua intacto', fs.readFileSync(path.join(projDir, 'utils.js'), 'utf8') === utilsOriginal);
  check('HEAD ainda inalterado', gitHead(projDir) === headBefore);
  check('working tree ainda limpo', gitStatus(projDir) === '');

  // ═══════════════════════════════════════════════════════════════
  // CENÁRIO 3 — FALHA NA VALIDAÇÃO DO 2º ARQUIVO
  // ═══════════════════════════════════════════════════════════════
  console.log('\n=== 3. FALHA NA VALIDAÇÃO (2º arquivo): patch válido mas resultado simulado é JS inválido ===');
  nextChatAnswer = '```json\n{\n' +
    '  "diagnosis": "patch do 2º arquivo quebra a sintaxe",\n' +
    '  "files": [\n' +
    '    { "file": "calc.js",  "fix_type": "code_patch", "patch": { "search": "return a - b; // bug: deveria ser soma", "replace": "return a + b;" } },\n' +
    '    { "file": "utils.js", "fix_type": "code_patch", "patch": { "search": "return x - x; // bug: deveria ser x * 2", "replace": "return x - x; function broken(" } }\n' +
    '  ],\n' +
    '  "confidence": 0.9,\n' +
    '  "decisao": "NEEDS_FIX"\n' +
    '}\n```\n';

  const q3 = await httpJson(port, 'POST /api/agent/mission/queue', { type: 'sf_dry_run_real', target_path: projDir, input: 'corrigir calc.js e utils.js' });
  const r3 = await waitForResult(q3.body.mission_id, 8000);

  check('action === sf_dry_run_multi_validation_failed', r3 && r3.action === 'sf_dry_run_multi_validation_failed', r3 && JSON.stringify(r3.action));
  check('calc.js continua intacto (mesmo após simular o 1º arquivo com sucesso)', fs.readFileSync(path.join(projDir, 'calc.js'), 'utf8') === calcOriginal);
  check('utils.js continua intacto', fs.readFileSync(path.join(projDir, 'utils.js'), 'utf8') === utilsOriginal);
  check('HEAD ainda inalterado', gitHead(projDir) === headBefore);
  check('working tree ainda limpo', gitStatus(projDir) === '');

  // ═══════════════════════════════════════════════════════════════
  // CENÁRIO 4 — ARQUIVO NÃO ENCONTRADO NO TARGET_PATH
  // ═══════════════════════════════════════════════════════════════
  console.log('\n=== 4. ARQUIVO NÃO ENCONTRADO: 2º arquivo da leva não existe no projeto-alvo ===');
  nextChatAnswer = '```json\n{\n' +
    '  "diagnosis": "diagnostico menciona um arquivo que nao existe",\n' +
    '  "files": [\n' +
    '    { "file": "calc.js",     "fix_type": "code_patch", "patch": { "search": "return a - b; // bug: deveria ser soma", "replace": "return a + b;" } },\n' +
    '    { "file": "fantasma.js", "fix_type": "code_patch", "patch": { "search": "x", "replace": "y" } }\n' +
    '  ],\n' +
    '  "confidence": 0.7,\n' +
    '  "decisao": "NEEDS_FIX"\n' +
    '}\n```\n';

  const q4 = await httpJson(port, 'POST /api/agent/mission/queue', { type: 'sf_dry_run_real', target_path: projDir, input: 'corrigir calc.js e fantasma.js' });
  const r4 = await waitForResult(q4.body.mission_id, 8000);

  check('action === sf_dry_run_multi_patch_failed (resolução de arquivo é tratada como falha de patch)', r4 && r4.action === 'sf_dry_run_multi_patch_failed', r4 && JSON.stringify(r4.action));
  check('output menciona o arquivo que não foi encontrado', r4 && r4.output && r4.output.includes('fantasma.js'));
  check('calc.js continua intacto', fs.readFileSync(path.join(projDir, 'calc.js'), 'utf8') === calcOriginal);
  check('HEAD ainda inalterado', gitHead(projDir) === headBefore);

  // ═══════════════════════════════════════════════════════════════
  // CENÁRIO 5 — REGRESSÃO SINGLE-FILE (§111) — formato antigo intacto
  // ═══════════════════════════════════════════════════════════════
  console.log('\n=== 5. REGRESSÃO SINGLE-FILE (§111): formato file/patch único continua produzindo sf_dry_run_completed ===');
  nextChatAnswer = 'Diagnóstico: operador trocado.\n\n```json\n{\n  "file": "calc.js",\n  "fix_type": "code_patch",\n  "diagnosis": "operador errado em add()",\n  "patch": { "search": "return a - b; // bug: deveria ser soma", "replace": "return a + b;" }\n}\n```\n';

  const q5 = await httpJson(port, 'POST /api/agent/mission/queue', { type: 'sf_dry_run_real', target_path: projDir, input: 'corrigir o operador errado em calc.js' });
  const r5 = await waitForResult(q5.body.mission_id, 8000);

  check('action === sf_dry_run_completed (caminho single-file inalterado)', r5 && r5.action === 'sf_dry_run_completed', r5 && JSON.stringify(r5.action));
  check('diff_preview (singular, não files[]) presente e correto', r5 && r5.diff_preview && r5.diff_preview.before === calcOriginal && r5.diff_preview.after.includes('return a + b;'));
  check('calc.js no disco continua intacto', fs.readFileSync(path.join(projDir, 'calc.js'), 'utf8') === calcOriginal);
  check('HEAD ainda inalterado', gitHead(projDir) === headBefore);
  check('working tree ainda limpo', gitStatus(projDir) === '');

  agent.kill();
  srv.close();

  console.log('\nTotal: ' + (passed + failed) + ' | Passou: ' + passed + ' | Falhou: ' + failed);
  if (failed === 0) {
    console.log('=== §116 E2E: TODOS OS TESTES PASSARAM ===');
    process.exit(0);
  } else {
    console.log('=== §116 E2E: ALGUNS TESTES FALHARAM ===');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('ERRO FATAL NO TESTE:', e);
  process.exit(1);
});
