// @ts-check
/**
 * Vision Core Next - Software Factory smoke tests.
 * All API calls are mocked; no LLM/provider/backend/prod request is allowed.
 */

import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const NEXT_URL = pathToFileURL(path.resolve('frontend/vision-core-next.html')).toString();
const API = 'https://visioncore-api-gateway.weiganlight.workers.dev';

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

test('Software Factory Auto-Pilot runs five mocked steps without real network', async ({ page }) => {
  const calls = [];
  await page.route(`${API}/api/sf/mission-composer`, async (route) => {
    calls.push(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, content: 'mission composer ok' })
    });
  });
  await page.route(`${API}/api/sf/deploy-blueprint`, async (route) => {
    calls.push(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, files: [{ path: 'src/index.js' }] })
    });
  });
  await page.route(`${API}/api/sf/worker-handoff`, async (route) => {
    calls.push(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, output: 'worker handoff ok' })
    });
  });

  await page.goto(NEXT_URL);
  await page.locator('[data-feature="factory"]').first().click();
  await page.locator('#vcSfInput').fill('um app de tarefas com login e dashboard');
  await page.getByRole('button', { name: 'Gerar Projeto' }).click();

  await expect(page.locator('#vcSfHistory')).toContainText('Projeto concluído!', { timeout: 10_000 });
  await expect(page.locator('#vcSfProgress')).toContainText('05');
  await expect(page.locator('#vcSfFinal')).toBeVisible();
  await expect(page.locator('#vcSfFinalBody')).toContainText('worker handoff ok');
  expect(calls).toHaveLength(5);
  expect(calls[0]).toMatchObject({ autopilot: true, step: 0, total_steps: 5 });
});
test('Software Factory advanced mode sends explicit safe options only', async ({ page }) => {
  const calls = [];
  async function fulfill(route, body) {
    calls.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  }
  await page.route(`${API}/api/sf/mission-composer`, async (route) => fulfill(route, { ok: true, content: 'advanced ok' }));
  await page.route(`${API}/api/sf/deploy-blueprint`, async (route) => fulfill(route, { ok: true, files: [{ path: 'src/app.js' }] }));
  await page.route(`${API}/api/sf/worker-handoff`, async (route) => fulfill(route, { ok: true, output: 'handoff ok' }));

  await page.goto(NEXT_URL);
  await page.locator('[data-feature="factory"]').first().click();
  await page.getByRole('button', { name: 'Modo Avancado' }).click();
  await page.locator('#vcSfProvider').selectOption('groq');
  await page.locator('#vcSfModel').fill('llama-test');
  await page.locator('#vcSfInput').fill('um CRM interno com perfis e auditoria');
  await page.getByRole('button', { name: 'Gerar Projeto' }).click();
  await expect.poll(() => calls.length, { timeout: 10_000 }).toBe(5);
  await expect(page.locator('#vcSfLog')).toContainText('real_execution_allowed=false');
  await expect(page.locator('#vcSfLog')).toContainText('provider=groq');
  await expect(page.locator('#vcSfFinal')).toBeVisible();
  await expect(page.locator('#vcSfFinalBody')).toContainText('handoff ok');
  expect(calls[0].sf_options).toMatchObject({
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
  const posts = [];
  const polls = [];
  const results = new Map();

  async function queueJob(route, body) {
    const id = `job-${posts.length + 1}`;
    posts.push(route.request().postDataJSON());
    results.set(id, body);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, job_id: id })
    });
  }

  await page.route(`${API}/api/sf/mission-composer`, async (route) => queueJob(route, { ok: true, content: 'async composer ok' }));
  await page.route(`${API}/api/sf/deploy-blueprint`, async (route) => queueJob(route, { ok: true, files: [{ path: 'src/async.js' }] }));
  await page.route(`${API}/api/sf/worker-handoff`, async (route) => queueJob(route, { ok: true, output: 'async handoff ok' }));
  await page.route(`${API}/api/sf/job/**`, async (route) => {
    const id = route.request().url().split('/').pop();
    polls.push(id);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, status: 'done', result: results.get(id) })
    });
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
