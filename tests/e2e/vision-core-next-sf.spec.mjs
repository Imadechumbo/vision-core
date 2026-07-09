// @ts-check
/**
 * Vision Core Next - Software Factory smoke tests.
 * All API calls are mocked; no LLM/provider/backend/prod request is allowed.
 *
 * PERMANENT SPEC (not a temp validation spec — see docs/CURRENT_HANDOFF.md):
 * Software Factory is being built across multiple agent handoffs (Codex/
 * OpenCode/Claude Code) with no per-step human review, same rationale as
 * vision-core-next-agent-apply.spec.mjs.
 *
 * Every mocked POST returns {job_id, status:'pending'} + a follow-up GET
 * /api/sf/job/:id poll — that is the real backend contract (SF_GENERATORS
 * handlers always respond this way, server.js:4436-4439). The poll mock's
 * `result` field is a PLAIN STRING, not an object with content/files/output
 * sub-fields: GET /api/sf/job/:id does `result: job.result.result` at the
 * top level (server.js:4449), i.e. it unwraps to the raw generator text.
 * `files` only gets populated for the unrelated /api/sf/project-files
 * endpoint (§187), never for mission-composer/deploy-blueprint/worker-
 * handoff/gold-gate — do not mock `.files` on those, it never happens
 * against the real server. Verified by reading server.js directly, not
 * assumed.
 */

import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const NEXT_URL = pathToFileURL(path.resolve('frontend/vision-core-next.html')).toString();
const API = 'https://visioncore-api-gateway.weiganlight.workers.dev';

// vision-core-next.html polls /api/agent/status (10s interval, header badge)
// and /api/mission/quota (sidebar badge) unconditionally on load — every test
// that goes to NEXT_URL must mock both or it leaks a real request to the
// production gateway. Confirmed empirically (page.on('request') listener)
// before adding this, not assumed.
test.beforeEach(async ({ page }) => {
  await page.route(`${API}/api/agent/status`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, connected: false }) }));
  await page.route(`${API}/api/mission/quota`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, plan: 'free', remaining: 5 }) }));
});

function mockAsyncSfEndpoints(page, textByEndpoint) {
  const posts = [];
  const polls = [];
  const results = new Map();
  let seq = 0;

  async function queueJob(route, text) {
    seq += 1;
    const id = `job-${seq}`;
    posts.push(route.request().postDataJSON());
    results.set(id, text);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, job_id: id })
    });
  }

  const routes = [
    page.route(`${API}/api/sf/mission-composer`, (route) => queueJob(route, textByEndpoint['mission-composer'])),
    page.route(`${API}/api/sf/worker-handoff`, (route) => queueJob(route, textByEndpoint['worker-handoff'])),
    page.route(`${API}/api/sf/job/**`, async (route) => {
      const id = route.request().url().split('/').pop();
      polls.push(id);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, status: 'done', result: results.get(id) || null, files: null, provider: 'mock' })
      });
    })
  ];
  if (textByEndpoint['deploy-blueprint']) {
    routes.push(page.route(`${API}/api/sf/deploy-blueprint`, (route) => queueJob(route, textByEndpoint['deploy-blueprint'])));
  }
  const extraEndpointKeys = ['context-snapshot', 'patch-validator', 'risk-assessor', 'rollback-planner'];
  for (const key of extraEndpointKeys) {
    if (textByEndpoint[key]) {
      routes.push(page.route(`${API}/api/sf/${key}`, (route) => queueJob(route, textByEndpoint[key])));
    }
  }
  if (textByEndpoint['gold-gate']) {
    routes.push(page.route(`${API}/api/sf/gold-gate`, (route) => queueJob(route, textByEndpoint['gold-gate'])));
  }
  return Promise.all(routes).then(() => ({ posts, polls }));
}

test('Software Factory opens from sidebar and hides the chat stage', async ({ page }) => {
  await page.goto(NEXT_URL);
  await expect(page.locator('.vc-chat-stage')).toBeVisible();
  await expect(page.locator('#factory')).toBeHidden();

  await page.locator('[data-feature="factory"]').first().click();
  await expect(page.locator('#factory')).toBeVisible();
  await expect(page.locator('.vc-chat-stage')).toBeHidden();
  await expect(page.locator('#vcSfComposer')).toBeVisible();
  await expect(page.locator('#vcSfLog')).toBeHidden();
  await expect(page.locator('#vcSfFinal')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Auto-Pilot' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Modo Avancado' })).toBeVisible();

  await page.locator('[data-feature="chat"]').first().click();
  await expect(page.locator('.vc-chat-stage')).toBeVisible();
  await expect(page.locator('#factory')).toBeHidden();
});

test('URL context: rejects invalid URL without calling fetch-url', async ({ page }) => {
  let called = false;
  await page.route(`${API}/api/sf/fetch-url`, async (route) => { called = true; await route.abort(); });

  await page.goto(NEXT_URL);
  await page.locator('[data-feature="factory"]').first().click();
  await expect(page.locator('#vcSfUrlFetchBtn')).toBeDisabled();
  await page.locator('#vcSfUrlContext').fill('not-a-url');
  await page.locator('#vcSfUrlFetchBtn').click();
  await expect(page.locator('#vcSfUrlStatus')).toContainText('URL http(s) válida');
  expect(called).toBe(false);
});

test('URL context: fetches real contract shape and includes it in the next mission', async ({ page }) => {
  let fetchedUrl = null;
  await page.route(`${API}/api/sf/fetch-url`, async (route) => {
    fetchedUrl = route.request().postDataJSON().url;
    // POST /api/sf/fetch-url is synchronous — {ok, content, url}, no job_id
    // (server.js:4485-4520, verified before writing this mock).
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, content: 'Documento de referência: usar arquitetura hexagonal.', url: fetchedUrl })
    });
  });
  const { posts } = await mockAsyncSfEndpoints(page, {
    'mission-composer': 'mission composer ok',
    'deploy-blueprint': 'deploy blueprint ok',
    'worker-handoff':   'worker handoff ok'
  });

  await page.goto(NEXT_URL);
  await page.locator('[data-feature="factory"]').first().click();
  await page.locator('#vcSfPassGold').uncheck();
  await page.locator('#vcSfUrlContext').fill('https://exemplo.com/doc');
  await page.locator('#vcSfUrlFetchBtn').click();
  await expect(page.locator('#vcSfUrlStatus')).toContainText('Contexto capturado');
  expect(fetchedUrl).toBe('https://exemplo.com/doc');

  await page.locator('#vcSfInput').fill('um app seguindo o documento de referência');
  await page.getByRole('button', { name: 'Gerar Projeto' }).click();
  await expect(page.locator('#vcSfHistory')).toContainText('Projeto concluído!', { timeout: 10_000 });
  await expect(page.locator('#vcSfLog')).toContainText('URL_CONTEXT incluído');
  // full_context só vai a partir do 2o passo (idx > 0) — mesmo padrão já usado pro contexto acumulado de steps anteriores.
  expect(posts[1].full_context).toContain('Documento de referência: usar arquitetura hexagonal.');
});

test('URL context: backend error surfaces a readable message, mission still works without it', async ({ page }) => {
  await page.route(`${API}/api/sf/fetch-url`, async (route) => {
    await route.fulfill({ status: 408, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'timeout' }) });
  });
  await mockAsyncSfEndpoints(page, {
    'mission-composer': 'mission composer ok',
    'deploy-blueprint': 'deploy blueprint ok',
    'worker-handoff':   'worker handoff ok'
  });

  await page.goto(NEXT_URL);
  await page.locator('[data-feature="factory"]').first().click();
  await page.locator('#vcSfPassGold').uncheck();
  await page.locator('#vcSfUrlContext').fill('https://exemplo.com/timeout');
  await page.locator('#vcSfUrlFetchBtn').click();
  await expect(page.locator('#vcSfUrlStatus')).toContainText('Erro ao buscar URL');

  await page.locator('#vcSfInput').fill('um app mesmo sem o contexto da URL');
  await page.getByRole('button', { name: 'Gerar Projeto' }).click();
  await expect(page.locator('#vcSfHistory')).toContainText('Projeto concluído!', { timeout: 10_000 });
});

test('Software Factory Auto-Pilot runs six steps (5 + PASS GOLD default-on) via real job_id + polling contract', async ({ page }) => {
  const { posts, polls } = await mockAsyncSfEndpoints(page, {
    'mission-composer': 'mission composer ok',
    'deploy-blueprint': 'deploy blueprint ok',
    'worker-handoff':   'worker handoff ok',
    'gold-gate':        'GOLD GATE CHECKLIST\nVEREDICTO: PASS GOLD'
  });

  await page.goto(NEXT_URL);
  await page.locator('[data-feature="factory"]').first().click();
  // PASS GOLD vem marcado por padrão no HTML — Auto-Pilot deve rodar o 6o passo sem o usuário mexer em nada.
  await expect(page.locator('#vcSfPassGold')).toBeChecked();
  await page.locator('#vcSfInput').fill('um app de tarefas com login e dashboard');
  await page.getByRole('button', { name: 'Gerar Projeto' }).click();

  await expect(page.locator('#vcSfHistory')).toContainText('Projeto concluído!', { timeout: 10_000 });
  await expect(page.locator('#vcSfProgress')).toContainText('06 — Validar PASS GOLD');
  await expect(page.locator('#vcSfFinal')).toBeVisible();
  await expect(page.locator('#vcSfFinalBody')).toContainText('worker handoff ok');
  await expect(page.locator('#vcSfFinalBody')).toContainText('VEREDICTO: PASS GOLD');
  expect(posts).toHaveLength(6);
  expect(polls).toHaveLength(6);
  expect(posts[0]).toMatchObject({ autopilot: true, step: 0, total_steps: 6 });
  expect(posts[5]).toMatchObject({ module: 'gold_gate', step: 5, total_steps: 6 });
});

test('Software Factory runs selected optional generator steps before PASS GOLD', async ({ page }) => {
  const { posts, polls } = await mockAsyncSfEndpoints(page, {
    'mission-composer': 'mission composer ok',
    'deploy-blueprint': 'deploy blueprint ok',
    'worker-handoff':   'worker handoff ok',
    'context-snapshot': 'context snapshot ok',
    'risk-assessor':    'risk assessor ok',
    'gold-gate':        'GOLD GATE CHECKLIST\nVEREDICTO: PASS GOLD'
  });

  await page.goto(NEXT_URL);
  await page.locator('[data-feature="factory"]').first().click();
  await page.locator('[data-sf-extra-step="context-snapshot"]').check();
  await page.locator('[data-sf-extra-step="risk-assessor"]').check();
  await page.locator('#vcSfInput').fill('um app com snapshot de contexto e risco');
  await page.getByRole('button', { name: 'Gerar Projeto' }).click();

  await expect.poll(() => posts.length, { timeout: 10_000 }).toBe(8);
  await expect(page.locator('#vcSfProgress')).toContainText('E1');
  await expect(page.locator('#vcSfProgress')).toContainText('E3');
  await expect(page.locator('#vcSfFinalBody')).toContainText('context snapshot ok');
  await expect(page.locator('#vcSfFinalBody')).toContainText('risk assessor ok');
  expect(posts).toHaveLength(8);
  expect(polls).toHaveLength(8);
  expect(posts.map((post) => post.module)).toEqual([
    'project_builder',
    'export_preview',
    'project_templates',
    'mission_composer',
    'worker_handoff',
    'context_snapshot',
    'risk_assessor',
    'gold_gate'
  ]);
  expect(posts[5]).toMatchObject({ module: 'context_snapshot', step: 5, total_steps: 8 });
  expect(posts[6]).toMatchObject({ module: 'risk_assessor', step: 6, total_steps: 8 });
  expect(posts[7]).toMatchObject({ module: 'gold_gate', step: 7, total_steps: 8 });
  expect(posts[0].sf_options).toMatchObject({
    extra_steps: ['context-snapshot', 'risk-assessor'],
    real_execution_allowed: false,
    deploy_allowed: false,
    writes_disk: false
  });
});
test('Software Factory skips gold-gate step when PASS GOLD is unchecked', async ({ page }) => {
  const { posts } = await mockAsyncSfEndpoints(page, {
    'mission-composer': 'mission composer ok',
    'deploy-blueprint': 'deploy blueprint ok',
    'worker-handoff':   'worker handoff ok'
  });
  let goldGateCalled = false;
  await page.route(`${API}/api/sf/gold-gate`, async (route) => { goldGateCalled = true; await route.abort(); });

  await page.goto(NEXT_URL);
  await page.locator('[data-feature="factory"]').first().click();
  await page.locator('#vcSfPassGold').uncheck();
  await page.locator('#vcSfInput').fill('um app sem validacao de gold gate');
  await page.getByRole('button', { name: 'Gerar Projeto' }).click();

  await expect(page.locator('#vcSfHistory')).toContainText('Projeto concluído!', { timeout: 10_000 });
  expect(posts).toHaveLength(5);
  expect(goldGateCalled).toBe(false);
});

test('Software Factory advanced mode sends explicit safe options only', async ({ page }) => {
  const { posts } = await mockAsyncSfEndpoints(page, {
    'mission-composer': 'advanced ok',
    'deploy-blueprint': 'deploy blueprint advanced ok',
    'worker-handoff':   'handoff ok',
    'gold-gate':        'GOLD GATE CHECKLIST\nVEREDICTO: PASS GOLD'
  });

  await page.goto(NEXT_URL);
  await page.locator('[data-feature="factory"]').first().click();
  await page.getByRole('button', { name: 'Modo Avancado' }).click();
  await page.locator('#vcSfProvider').selectOption('groq');
  await page.locator('#vcSfModel').fill('llama-test');
  await page.locator('#vcSfInput').fill('um CRM interno com perfis e auditoria');
  await page.getByRole('button', { name: 'Gerar Projeto' }).click();
  await expect.poll(() => posts.length, { timeout: 10_000 }).toBe(6);
  await expect(page.locator('#vcSfLog')).toContainText('real_execution_allowed=false');
  await expect(page.locator('#vcSfLog')).toContainText('provider=groq');
  await expect(page.locator('#vcSfFinal')).toBeVisible();
  await expect(page.locator('#vcSfFinalBody')).toContainText('handoff ok');
  expect(posts[0].sf_options).toMatchObject({
    mode: 'advanced',
    provider: 'groq',
    model: 'llama-test',
    dry_run: true,
    pass_gold: true,
    real_execution_allowed: false,
    deploy_allowed: false,
    writes_disk: false
  });
});

test('Software Factory follows async job_id polling without real network', async ({ page }) => {
  const { posts, polls } = await mockAsyncSfEndpoints(page, {
    'mission-composer': 'async composer ok',
    'deploy-blueprint': 'async deploy blueprint ok',
    'worker-handoff':   'async handoff ok',
    'gold-gate':        'GOLD GATE CHECKLIST\nVEREDICTO: PASS GOLD'
  });

  await page.goto(NEXT_URL);
  await page.locator('[data-feature="factory"]').first().click();
  await page.locator('#vcSfInput').fill('um app async com fila de geração');
  await page.getByRole('button', { name: 'Gerar Projeto' }).click();

  await expect(page.locator('#vcSfHistory')).toContainText('Projeto concluído!', { timeout: 10_000 });
  await expect(page.locator('#vcSfFinalBody')).toContainText('async handoff ok');
  expect(posts).toHaveLength(6);
  expect(polls).toHaveLength(6);
  expect(posts[0].sf_options).toMatchObject({
    real_execution_allowed: false,
    deploy_allowed: false,
    writes_disk: false
  });
});
