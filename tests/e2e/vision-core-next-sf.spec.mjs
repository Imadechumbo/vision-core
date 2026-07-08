// @ts-check
/**
 * Vision Core Next - Software Factory smoke tests.
 * All API calls are mocked; no LLM/provider/backend/prod request is allowed.
 *
 * PERMANENT SPEC (not a temp validation spec — see docs/CURRENT_HANDOFF.md):
 * Software Factory is being built across multiple agent handoffs (Codex/
 * OpenCode/Claude Code) with no per-step human review, same rationale as
 * vision-core-next-agent-apply.spec.mjs. Every mocked POST here returns
 * {job_id, status:'pending'} + a follow-up GET /api/sf/job/:id poll — that
 * is the real backend contract (server.js SF_GENERATORS handlers always
 * respond this way, see server.js:4430). Do not go back to mocking a
 * synchronous {ok:true, content:...} response directly on the POST — that
 * shape never happens against the real server and hid the /api/sf/jobs
 * vs /api/sf/job URL mismatch bug found in an earlier session.
 */

import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const NEXT_URL = pathToFileURL(path.resolve('frontend/vision-core-next.html')).toString();
const API = 'https://visioncore-api-gateway.weiganlight.workers.dev';

function mockAsyncSfEndpoints(page, resultsByEndpoint) {
  const posts = [];
  const polls = [];
  const results = new Map();
  let seq = 0;

  async function queueJob(route, body) {
    seq += 1;
    const id = `job-${seq}`;
    posts.push(route.request().postDataJSON());
    results.set(id, body);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, job_id: id })
    });
  }

  return Promise.all([
    page.route(`${API}/api/sf/mission-composer`, (route) => queueJob(route, resultsByEndpoint['mission-composer'])),
    page.route(`${API}/api/sf/deploy-blueprint`, (route) => queueJob(route, resultsByEndpoint['deploy-blueprint'])),
    page.route(`${API}/api/sf/worker-handoff`, (route) => queueJob(route, resultsByEndpoint['worker-handoff'])),
    page.route(`${API}/api/sf/job/**`, async (route) => {
      const id = route.request().url().split('/').pop();
      polls.push(id);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, status: 'done', result: results.get(id) })
      });
    })
  ]).then(() => ({ posts, polls }));
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

test('Software Factory Auto-Pilot runs five steps via real job_id + polling contract', async ({ page }) => {
  const { posts, polls } = await mockAsyncSfEndpoints(page, {
    'mission-composer': { ok: true, content: 'mission composer ok' },
    'deploy-blueprint': { ok: true, files: [{ path: 'src/index.js' }] },
    'worker-handoff':   { ok: true, output: 'worker handoff ok' }
  });

  await page.goto(NEXT_URL);
  await page.locator('[data-feature="factory"]').first().click();
  await page.locator('#vcSfInput').fill('um app de tarefas com login e dashboard');
  await page.getByRole('button', { name: 'Gerar Projeto' }).click();

  await expect(page.locator('#vcSfHistory')).toContainText('Projeto concluído!', { timeout: 10_000 });
  await expect(page.locator('#vcSfProgress')).toContainText('05');
  await expect(page.locator('#vcSfFinal')).toBeVisible();
  await expect(page.locator('#vcSfFinalBody')).toContainText('worker handoff ok');
  expect(posts).toHaveLength(5);
  expect(polls).toHaveLength(5);
  expect(posts[0]).toMatchObject({ autopilot: true, step: 0, total_steps: 5 });
});

test('Software Factory advanced mode sends explicit safe options only', async ({ page }) => {
  const { posts } = await mockAsyncSfEndpoints(page, {
    'mission-composer': { ok: true, content: 'advanced ok' },
    'deploy-blueprint': { ok: true, files: [{ path: 'src/app.js' }] },
    'worker-handoff':   { ok: true, output: 'handoff ok' }
  });

  await page.goto(NEXT_URL);
  await page.locator('[data-feature="factory"]').first().click();
  await page.getByRole('button', { name: 'Modo Avancado' }).click();
  await page.locator('#vcSfProvider').selectOption('groq');
  await page.locator('#vcSfModel').fill('llama-test');
  await page.locator('#vcSfInput').fill('um CRM interno com perfis e auditoria');
  await page.getByRole('button', { name: 'Gerar Projeto' }).click();
  await expect.poll(() => posts.length, { timeout: 10_000 }).toBe(5);
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
    'mission-composer': { ok: true, content: 'async composer ok' },
    'deploy-blueprint': { ok: true, files: [{ path: 'src/async.js' }] },
    'worker-handoff':   { ok: true, output: 'async handoff ok' }
  });

  await page.goto(NEXT_URL);
  await page.locator('[data-feature="factory"]').first().click();
  await page.locator('#vcSfInput').fill('um app async com fila de geração');
  await page.getByRole('button', { name: 'Gerar Projeto' }).click();

  await expect(page.locator('#vcSfHistory')).toContainText('Projeto concluído!', { timeout: 10_000 });
  await expect(page.locator('#vcSfFinalBody')).toContainText('async handoff ok');
  expect(posts).toHaveLength(5);
  expect(polls).toHaveLength(5);
  expect(posts[0].sf_options).toMatchObject({
    real_execution_allowed: false,
    deploy_allowed: false,
    writes_disk: false
  });
});
