// @ts-check
/** TEST-004: browser + disposable real backend, with no page.route interception. */
import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';

test.describe.configure({ mode: 'serial' });

const ROOT = resolve(process.cwd());
const FRONTEND = resolve(ROOT, 'frontend');
const DATA_FILES = ['users.json', 'projects.json', 'chat-conversations.json', 'operation-log.json', 'mission-timeline.json', 'token-blacklist.json', 'audit-log.json', 'agent-queue.sqlite'].map((name) => resolve(ROOT, 'data', name));
const backups = DATA_FILES.map((file) => ({ file, bytes: existsSync(file) ? readFileSync(file) : null }));
const API_PORT = 18740;
const API = `http://127.0.0.1:${API_PORT}`;
let nextUrl;
const evidenceDir = resolve(ROOT, 'artifacts', 'next-rc-e2e');
let backend;
let web;
let backendLog = '';
const network = [];
const requestIds = [];

async function waitForHealth() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try { if ((await fetch(`${API}/api/health`)).ok) return; } catch {}
    await new Promise((done) => setTimeout(done, 200));
  }
  throw new Error(`backend did not start: ${backendLog.slice(-2000)}`);
}

test.beforeAll(async () => {
  mkdirSync(evidenceDir, { recursive: true });
  backend = spawn(process.execPath, ['--no-deprecation', 'backend/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(API_PORT),
      AWS_S3_BUCKET: '',
      SESSION_SECRET: 'next-real-e2e-session-secret-32chars',
      PROVIDER_VAULT_SECRET: 'next-real-e2e-vault-secret-32chars',
      ANTHROPIC_API_KEY: '', GROQ_API_KEY: '', OPENROUTER_API_KEY: '', GEMINI_API_KEY: '',
      CEREBRAS_API_KEY: '', OPENAI_API_KEY: '', OLLAMA_BASE_URL: 'http://127.0.0.1:1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  backend.stdout.on('data', (data) => { backendLog += data; });
  backend.stderr.on('data', (data) => { backendLog += data; });
  await waitForHealth();

  const html = readFileSync(resolve(FRONTEND, 'vision-core-next.html'), 'utf8')
    .replace('content="https://visioncore-api-gateway.weiganlight.workers.dev"', `content="${API}"`);
  web = createServer((request, response) => {
    const pathname = new URL(request.url, nextUrl).pathname;
    if (pathname === '/vision-core-next.html') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(html);
      return;
    }
    try {
      const bytes = readFileSync(resolve(FRONTEND, pathname.slice(1)));
      const type = extname(pathname) === '.css' ? 'text/css' : extname(pathname) === '.js' ? 'text/javascript' : extname(pathname) === '.png' ? 'image/png' : 'application/octet-stream';
      response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
      response.end(bytes);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise((done) => web.listen(0, '127.0.0.1', done));
  const address = web.address();
  if (!address || typeof address === 'string') throw new Error('test web server did not expose a TCP port');
  nextUrl = `http://127.0.0.1:${address.port}/vision-core-next.html`;
});

test.afterAll(async () => {
  writeFileSync(resolve(evidenceDir, 'network-manifest.json'), JSON.stringify({ api_origin: API, intercepted_routes: 0, requests: network, request_ids: requestIds }, null, 2));
  if (web) await new Promise((done) => web.close(done));
  if (backend && !backend.killed) {
    backend.kill('SIGTERM');
    await new Promise((done) => backend.once('exit', done));
  }
  for (const backup of backups) {
    if (backup.bytes) writeFileSync(backup.file, backup.bytes);
    else if (existsSync(backup.file)) unlinkSync(backup.file);
  }
});

test.beforeEach(async ({ page }) => {
  page.on('request', (request) => {
    if (request.url().startsWith(API)) network.push({ method: request.method(), path: new URL(request.url()).pathname });
  });
  page.on('response', async (response) => {
    if (!response.url().startsWith(API)) return;
    const id = (await response.allHeaders())['x-request-id'];
    if (id) requestIds.push(id);
  });
});

test('real UI covers auth, project, grounded refusal, history, logs and agent status', async ({ page }) => {
  await page.goto(nextUrl);
  await page.locator('a[data-feature="settings"]').click();
  const email = `next-real-${Date.now()}@example.invalid`;
  await page.locator('#vcAccountEmail').fill(email);
  await page.locator('#vcAccountPassword').fill('next-real-e2e-password');
  await page.locator('#vcAccountRegisterBtn').click();
  await expect(page.locator('#vcAccountCopy')).toHaveText(`Logado como ${email}.`);

  await page.locator('#vcProjectName').fill('Projeto E2E Real');
  await page.locator('#vcProjectCreate').click();
  await expect(page.locator('#vcProjectSelect')).toContainText('Projeto E2E Real');
  await page.locator('#vcConversationNew').click();
  await expect(page.locator('#vcConversationSelect')).not.toHaveValue('');

  await page.locator('a[data-feature="chat"]').click();
  await page.locator('#vcPrompt').fill('sobre o fine tuning do hermes no vision core?');
  await page.locator('#vcComposer').evaluate((form) => form.requestSubmit());
  await expect(page.locator('#vcChatStream')).toContainText('ALL_PROVIDERS_EXHAUSTED', { timeout: 15_000 });
  await expect(page.locator('#vcChatStream')).not.toContainText(/HuggingFace Trainer|hermes_model_path|hermes_fine_tune\.log|learning_rate=3e-5/i);

  const state = await page.evaluate(async (api) => {
    const token = localStorage.getItem('vision_token');
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
    const timeline = await fetch(`${api}/api/mission/timeline`, { method: 'POST', headers, body: JSON.stringify({ type: 'e2e', title: 'Missão E2E Real', description: 'timeline sem mock', status: 'done' }) });
    const agent = await (await fetch(`${api}/api/agent/register`, { method: 'POST' })).json();
    await fetch(`${api}/api/agent/mission/pending?agent_id=${encodeURIComponent(agent.agent_id)}&agent_secret=${encodeURIComponent(agent.agent_secret)}`);
    return { timeline: timeline.status, agent_id: agent.agent_id };
  }, API);
  expect(state.timeline).toBe(200);

  await page.locator('a[data-feature="missions"]').click();
  await expect(page.locator('#vcMissionHistoryList')).toHaveAttribute('data-state', 'success');
  // achado real: /api/mission/timeline nunca persiste type/title (só
  // input/summary/status) — o rótulo agora mostra o summary de verdade
  // ("timeline sem mock") em vez do fallback genérico "Missão" de antes.
  await expect(page.locator('#vcMissionHistoryList')).toContainText('timeline sem mock');
  await expect(page.locator('#vcMissionHistoryList')).toContainText('[DONE]');
  await page.locator('a[data-feature="logs"]').click();
  await expect(page.locator('#vcLogList')).toContainText(/project|conversation/i);
  await page.reload();
  await expect(page.locator('#vcAgentBadge')).toHaveText('Agente conectado');
  await expect(page.locator('#vcAgentBadge')).toHaveAttribute('data-state', 'connected');
  await page.screenshot({ path: resolve(evidenceDir, 'ui-critical.png'), fullPage: true });
  expect(new Set(requestIds).size).toBeGreaterThan(8);
});

test('real SF project-files job produces a real ZIP', async ({ page }) => {
  await page.goto(nextUrl);
  const result = await page.evaluate(async (api) => {
    const queued = await (await fetch(`${api}/api/sf/project-files`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'plataforma jurídica forense para tribunal com LGPD e cadeia de custódia' }),
    })).json();
    let job;
    for (let attempt = 0; attempt < 40; attempt++) {
      job = await (await fetch(`${api}/api/sf/job/${queued.job_id}`)).json();
      if (job.status !== 'pending') break;
      await new Promise((done) => setTimeout(done, 100));
    }
    if (job.status !== 'done') return { job };
    const zipResponse = await fetch(`${api}/api/sf/generate-zip`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: job.files, project: 'e2e-real' }),
    });
    const bytes = new Uint8Array(await zipResponse.arrayBuffer());
    return { job, zip_status: zipResponse.status, zip_type: zipResponse.headers.get('content-type'), signature: [...bytes.slice(0, 4)], zip_bytes: bytes.length };
  }, API);
  expect(result.job.status).toBe('done');
  expect(result.job.files.length).toBeGreaterThanOrEqual(3);
  expect(result.zip_status).toBe(200);
  expect(result.zip_type).toBe('application/zip');
  expect(result.signature).toEqual([80, 75, 3, 4]);
  expect(result.zip_bytes).toBeGreaterThan(500);
});
