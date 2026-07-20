#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync, rmSync, chmodSync } from 'node:fs';
import { resolve, join } from 'node:path';
import os from 'node:os';

const ROOT = resolve(process.cwd());
const PORT = 18739;
const BASE = `http://127.0.0.1:${PORT}`;

// Backup real data files the server may touch, restore in finally (mesmo padrao de agent-pairing.test.mjs).
const TRACKED_FILES = ['users.json', 'audit-log.json', 'operation-log.json', 'agent-pairings.json', 'sf-execution-intents.json', 'agent-queue.sqlite'].map((f) => resolve(ROOT, 'data', f));
const backups = TRACKED_FILES.map((f) => (existsSync(f) ? readFileSync(f) : null));
function restoreTrackedFiles() {
  TRACKED_FILES.forEach((f, i) => {
    if (backups[i]) writeFileSync(f, backups[i]);
    else if (existsSync(f)) unlinkSync(f);
  });
}

// --- fake "aws" CLI: intercepta so os 2 formatos reais que _s3PutAsync/_s3LoadSync usam ---
// O bin fake e compartilhado (sem estado); cada cenario ganha seu proprio "bucket" (fakeS3Root),
// senao um cenario acha dado deixado pelo outro (achado real ao rodar a 1a versao deste teste).
const FAKE_BIN_DIR = resolve(os.tmpdir(), 'vc-fake-aws-bin-' + Date.now());
mkdirSync(FAKE_BIN_DIR, { recursive: true });

const mockScript = `#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const BUCKET_ROOT = process.env.FAKE_S3_ROOT;
const args = process.argv.slice(2);
if (args[0] !== 's3' || args[1] !== 'cp') { process.stderr.write('unsupported\\n'); process.exit(1); }
const src = args[2];
const dst = args[3];
function parseUri(u) { const m = /^s3:\\/\\/([^/]+)\\/(.+)$/.exec(u); return m ? { bucket: m[1], key: m[2] } : null; }
if (dst && dst.startsWith('s3://')) {
  const t = parseUri(dst);
  const destPath = path.join(BUCKET_ROOT, t.bucket, t.key);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  const content = fs.readFileSync(src);
  fs.writeFileSync(destPath, content);
  process.exit(0);
} else if (src && src.startsWith('s3://') && dst === '-') {
  const t = parseUri(src);
  const srcPath = path.join(BUCKET_ROOT, t.bucket, t.key);
  if (!fs.existsSync(srcPath)) { process.stderr.write('NoSuchKey\\n'); process.exit(1); }
  process.stdout.write(fs.readFileSync(srcPath));
  process.exit(0);
} else {
  process.stderr.write('unsupported direction\\n');
  process.exit(1);
}
`;
writeFileSync(join(FAKE_BIN_DIR, 'aws-mock.js'), mockScript, 'utf8');

const isWindows = process.platform === 'win32';
if (isWindows) {
  writeFileSync(join(FAKE_BIN_DIR, 'aws.cmd'), '@echo off\r\nnode "%~dp0aws-mock.js" %*\r\n', 'utf8');
} else {
  const shPath = join(FAKE_BIN_DIR, 'aws');
  writeFileSync(shPath, '#!/usr/bin/env bash\nnode "$(dirname "$0")/aws-mock.js" "$@"\n', 'utf8');
  chmodSync(shPath, 0o755);
}

async function request(path, opts = {}) {
  const response = await fetch(BASE + path, {
    method: opts.method || 'GET',
    headers: Object.assign({}, opts.body ? { 'Content-Type': 'application/json' } : {}, opts.headers || {}),
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let body;
  try { body = await response.json(); } catch { body = null; }
  return { status: response.status, body };
}

async function spawnServer(logHolder, fakeS3Root, extraEnv = {}) {
  const proc = spawn(process.execPath, ['--no-deprecation', 'backend/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(PORT),
      AWS_S3_BUCKET: 'fake-test-bucket',
      FAKE_S3_ROOT: fakeS3Root,
      PATH: FAKE_BIN_DIR + (isWindows ? ';' : ':') + process.env.PATH,
      SESSION_SECRET: 's3-mechanics-test-session-secret-32chars',
      PROVIDER_VAULT_SECRET: 's3-mechanics-test-vault-secret-32chars',
      ...extraEnv,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => { logHolder.log += d; });
  proc.stderr.on('data', (d) => { logHolder.log += d; });
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try { if ((await fetch(BASE + '/api/health')).ok) return proc; } catch { /* ainda subindo */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('server did not become healthy in time');
}

async function killServer(proc) {
  if (!proc) return;
  proc.kill('SIGTERM');
  await new Promise((r) => proc.once('exit', r));
}

function fakeS3Read(fakeS3Root, bucket, key) {
  const p = join(fakeS3Root, bucket, key);
  if (!existsSync(p)) return null;
  return readFileSync(p, 'utf8');
}

async function waitForFakeS3Key(fakeS3Root, bucket, key, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const content = fakeS3Read(fakeS3Root, bucket, key);
    if (content) return content;
    await new Promise((r) => setTimeout(r, 150));
  }
  return null;
}

// Cada cenario roda isolado: seu proprio spawn/kill de servidor, seu proprio "bucket" S3 fake
// (senao o item 2 encontra o audit-log.json ja escrito pelo item 1 e devolve conteudo velho
// sem o marcador, achado real ao rodar a 1a versao deste teste), seu proprio conjunto de
// asserts -- uma falha num cenario nao impede o outro de rodar e reportar seu proprio resultado.
async function runScenario(name, fn, extraEnv = {}) {
  console.log(`\n[s3-mechanics] ${name}`);
  const results = [];
  function check(condition, message) {
    results.push({ message, ok: !!condition });
    console.log(`  ${condition ? '✓' : '✗'} ${message}`);
  }
  const logHolder = { log: '' };
  const fakeS3Root = resolve(os.tmpdir(), 'vc-fake-s3-bucket-' + Date.now() + '-' + Math.random().toString(16).slice(2, 8));
  mkdirSync(fakeS3Root, { recursive: true });
  let child;
  try {
    child = await spawnServer(logHolder, fakeS3Root, extraEnv);
    await fn({
      check,
      child: () => child,
      setChild: (c) => { child = c; },
      logHolder,
      readKey: (bucket, key) => fakeS3Read(fakeS3Root, bucket, key),
      waitKey: (bucket, key, timeoutMs) => waitForFakeS3Key(fakeS3Root, bucket, key, timeoutMs),
      respawn: (env) => spawnServer(logHolder, fakeS3Root, env || extraEnv),
    });
  } catch (error) {
    results.push({ message: `erro inesperado: ${error.message}`, ok: false });
    console.log(`  ✗ erro inesperado: ${error.message}`);
    if (logHolder.log) console.error(logHolder.log.slice(-2000));
  } finally {
    await killServer(child);
    restoreTrackedFiles();
    try { rmSync(fakeS3Root, { recursive: true, force: true }); } catch { /* best effort */ }
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`  -> ${results.length - failed.length}/${results.length} PASS`);
  return { name, total: results.length, failed: failed.length };
}

const summary = [];

summary.push(await runScenario(
  'item 1 — escrita concorrente pra stores diferentes nao contamina nem perde dados',
  async ({ check, waitKey }) => {
    // /api/auth/register tem rate limit de 5/hora/IP -- fica em 4 pra nao estourar.
    // /api/agent/register nao tem rate limit -- usado em paralelo pra maximizar pressao real
    // de escrita concorrente entre USERS_DB/OPERATION_LOG_DB e AGENT_PAIRINGS_DB.
    const AUTH_BURST = 4;
    const AGENT_BURST = 20;
    const emails = Array.from({ length: AUTH_BURST }, (_, i) => `s3mech-${Date.now()}-${i}-${Math.random().toString(16).slice(2, 8)}@example.com`);
    const [regs, agentRegs] = await Promise.all([
      Promise.all(emails.map((email) => request('/api/auth/register', { method: 'POST', body: { email, password: 'TestS3Mechanics2026!' } }))),
      Promise.all(Array.from({ length: AGENT_BURST }, () => request('/api/agent/register', { method: 'POST' }))),
    ]);
    check(regs.every((r) => r.status === 200), `${AUTH_BURST} registros de usuario concorrentes completam com 200`);
    check(agentRegs.every((r) => r.status === 200), `${AGENT_BURST} registros de agent concorrentes completam com 200`);

    const pairingsRaw = await waitKey('fake-test-bucket', 'data/agent-pairings.json');
    check(!!pairingsRaw, 'agent-pairings.json aparece no S3 fake apos o burst');
    let pairingsParsed = null;
    try { pairingsParsed = JSON.parse(pairingsRaw); } catch { /* fica null */ }
    check(pairingsParsed !== null, 'agent-pairings.json no S3 fake e JSON valido (nao truncado/misturado)');
    check(pairingsParsed !== null && !Array.isArray(pairingsParsed) && typeof pairingsParsed === 'object', 'agent-pairings.json no S3 fake tem o schema certo (objeto agent_id->secret)');
    check(!(pairingsRaw && pairingsRaw.includes('"password_hash"')), 'agent-pairings.json nao contem fragmento de users.json (sem contaminacao cruzada)');

    const usersRaw = await waitKey('fake-test-bucket', 'data/users.json');
    check(!!usersRaw, 'users.json aparece no S3 fake apos o burst');
    let usersParsed = null;
    try { usersParsed = JSON.parse(usersRaw); } catch { /* fica null */ }
    check(usersParsed !== null, 'users.json no S3 fake e JSON valido (nao truncado/misturado)');
    check(Array.isArray(usersParsed && usersParsed.users), 'users.json no S3 fake tem o schema certo ({users:[...]})');
    const usersList = (usersParsed && usersParsed.users) || [];
    check(usersList.every((u) => typeof u.email === 'string' && typeof u.password_hash === 'string'), 'todas as entradas de users.json tem o formato de usuario (email/password_hash), sem mistura de outro schema');
    const missingEmails = emails.filter((e) => !usersList.some((u) => u.email === e));
    check(missingEmails.length === 0, `todos os ${AUTH_BURST} emails registrados no burst estao presentes no users.json final (nenhum perdido por corrida de escrita) [achado extra, fora do escopo original do Item 1: ${missingEmails.length} perdido(s) se falhar]`);

    const auditRaw = await waitKey('fake-test-bucket', 'data/audit-log.json');
    check(!!auditRaw, 'audit-log.json aparece no S3 fake apos o burst');
    let auditParsed = null;
    try { auditParsed = JSON.parse(auditRaw); } catch { /* fica null */ }
    check(auditParsed !== null, 'audit-log.json no S3 fake e JSON valido (nao truncado/misturado)');
    check(Array.isArray(auditParsed && auditParsed.entries), 'audit-log.json no S3 fake tem o schema certo ({entries:[...]})');
    const auditEntries = (auditParsed && auditParsed.entries) || [];
    check(auditEntries.every((e) => typeof e.action === 'string' && typeof e.ts === 'string'), 'todas as entradas de audit-log.json tem o formato de log de auditoria (action/ts), sem mistura de outro schema');
    check(!(usersRaw && usersRaw.includes('"action"') && usersRaw.includes('"entries"')), 'users.json nao contem fragmento de audit-log (sem contaminacao cruzada)');
    check(!(auditRaw && auditRaw.includes('"password_hash"')), 'audit-log.json nao contem fragmento de users.json (sem contaminacao cruzada)');
  }
));

summary.push(await runScenario(
  'item 2 — AUDIT_LOG_FILE sobrevive a "restart" (pull do S3, nao so disco local)',
  async ({ check, child, setChild, waitKey, respawn }) => {
    const marker = `s3mech-marker-${Date.now()}`;
    const markerReg = await request('/api/auth/register', { method: 'POST', body: { email: `${marker}@example.com`, password: 'TestS3Mechanics2026!' } });
    check(markerReg.status === 200, 'registro-marcador completa com 200');

    const auditBeforeRestart = await waitKey('fake-test-bucket', 'data/audit-log.json');
    check(!!auditBeforeRestart && auditBeforeRestart.includes(marker), 'marcador realmente chegou no S3 fake antes de simular o restart');

    await killServer(child());
    // Simula "Renaming /var/app/staging/ to /var/app/current/": apaga o disco local,
    // so o S3 fake sobrevive -- o mesmo mecanismo real confirmado em producao.
    const localAuditFile = resolve(ROOT, 'data', 'audit-log.json');
    if (existsSync(localAuditFile)) unlinkSync(localAuditFile);

    setChild(await respawn());
    const localAuditAfterRestart = existsSync(localAuditFile) ? readFileSync(localAuditFile, 'utf8') : null;
    check(!!localAuditAfterRestart, 'data/audit-log.json local existe depois do "restart" (puxado do S3 no boot)');
    check(!!localAuditAfterRestart && localAuditAfterRestart.includes(marker), 'o marcador escrito antes do "restart" esta presente depois -- AUDIT_LOG_FILE sobrevive de verdade');
  }
));

summary.push(await runScenario(
  'item 3 — sfExecutionIntents e agent-queue.sqlite sobrevivem a "restart" (pull do S3, nao so disco local)',
  async ({ check, child, setChild, waitKey, readKey, respawn }) => {
    // Passo 1: registra um agente pra descobrir o agent_id real antes de poder
    // configurar o allowlist (agent_id e sempre gerado pelo servidor, nao pelo cliente).
    const agentReg = await request('/api/agent/register', { method: 'POST' });
    check(agentReg.status === 200, 'agente registrado com sucesso');
    const agentId = agentReg.body.agent_id;
    const agentSecret = agentReg.body.agent_secret;

    // Passo 2: sobe de novo com o allowlist agora apontando pro agent_id real.
    // O pareamento (agentPairings) ja sobrevive a esse respawn (fix de sessao anterior).
    await killServer(child());
    setChild(await respawn({ SF_REAL_EXECUTION_ENABLED: 'true', SF_REAL_EXECUTION_ALLOWED_AGENTS: agentId }));

    const userReg = await request('/api/auth/register', { method: 'POST', body: { email: `sf-durability-${Date.now()}@example.com`, password: 'TestSfDurability2026!' } });
    check(userReg.status === 200, 'usuario registrado com sucesso');
    const token = userReg.body.token;
    const authHeaders = { Authorization: `Bearer ${token}` };

    const marker = `sf-durability-marker-${Date.now()}`;
    const execReq = await request('/api/sf/execute-project', {
      method: 'POST',
      headers: authHeaders,
      body: {
        description: marker,
        project_id: `sf-durability-${Date.now()}`,
        agent_id: agentId,
        agent_secret: agentSecret,
        audit_mode: 'deterministic', // evita depender de LLM real neste teste
        files: [{ name: 'src/index.js', content: 'console.log("' + marker + '")' }]
      }
    });
    check(execReq.status === 200 && execReq.body.queued === true, 'intent real criada e enfileirada com 200');
    const intentHash = execReq.body.intent && execReq.body.intent.intent_hash;
    check(!!intentHash, 'resposta traz intent_hash real');

    const intentsRaw = await waitKey('fake-test-bucket', 'data/sf-execution-intents.json');
    check(!!intentsRaw && intentsRaw.includes(marker), 'sf-execution-intents.json aparece no S3 fake com a intent real antes de simular o restart');
    const queueSqliteBefore = await waitKey('fake-test-bucket', 'data/agent-queue.sqlite');
    check(!!queueSqliteBefore && queueSqliteBefore.length > 0, 'agent-queue.sqlite aparece no S3 fake (missao real enfileirada) antes de simular o restart');

    // Simula "Renaming /var/app/staging/ to /var/app/current/": apaga o disco
    // local das 2 stores, so o S3 fake sobrevive -- mesmo mecanismo real ja
    // confirmado pro bug do agentPairings, agora estendido pra estas 2.
    await killServer(child());
    const localIntentsFile = resolve(ROOT, 'data', 'sf-execution-intents.json');
    const localQueueSqlite = resolve(ROOT, 'data', 'agent-queue.sqlite');
    if (existsSync(localIntentsFile)) unlinkSync(localIntentsFile);
    if (existsSync(localQueueSqlite)) unlinkSync(localQueueSqlite);

    setChild(await respawn({ SF_REAL_EXECUTION_ENABLED: 'true', SF_REAL_EXECUTION_ALLOWED_AGENTS: agentId }));

    const intentAfterRestart = await request(`/api/sf/execution-intent/${intentHash}`, { headers: authHeaders });
    check(intentAfterRestart.status === 200, 'intent continua encontravel (200, nao 404) depois do "restart" -- sfExecutionIntents restaurado do S3');
    check(intentAfterRestart.body && intentAfterRestart.body.intent && intentAfterRestart.body.intent.status === 'queued', 'intent restaurada preserva o status real (queued), nao um estado generico/vazio');

    const pendingAfterRestart = await request(`/api/agent/mission/pending?agent_id=${agentId}&agent_secret=${agentSecret}`);
    check(pendingAfterRestart.status === 200 && pendingAfterRestart.body.mission && pendingAfterRestart.body.mission.intent_hash === intentHash, 'missao real continua na fila depois do "restart" -- agent-queue.sqlite restaurado do S3, nao so o pareamento');
  },
  { SF_REAL_EXECUTION_ENABLED: 'true', SF_REAL_EXECUTION_ALLOWED_AGENTS: '' }
));

try { rmSync(FAKE_BIN_DIR, { recursive: true, force: true }); } catch { /* best effort */ }

console.log('\n=== RESUMO ===');
let anyFailed = false;
for (const s of summary) {
  const ok = s.failed === 0;
  if (!ok) anyFailed = true;
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${s.name} (${s.total - s.failed}/${s.total})`);
}
process.exitCode = anyFailed ? 1 : 0;
