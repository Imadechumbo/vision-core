// @ts-check
/**
 * Vision Core Next - Software Factory "PACOTE FINAL": project-files +
 * generate-zip. All API calls are mocked; no LLM/provider/backend/prod
 * request is allowed.
 *
 * PERMANENT SPEC (not a temp validation spec — see docs/CURRENT_STATE.md):
 * same criterion as the other permanent Next specs — Software Factory is
 * built across agent handoffs with no per-step human review.
 *
 * Contract verified by reading backend/server.js directly before coding
 * (server.js:4600 project-files, server.js:4724 generate-zip, server.js:4467
 * the shared job poll handler), never assumed by name:
 *   - POST /api/sf/project-files is async like the other SF modules
 *     ({job_id}), but GET /api/sf/job/:id exposes the result in `files`
 *     (array of {name, content}), not `result` (null for this endpoint
 *     specifically — server.js:4474, "§187 — project-files expõe files[]").
 *   - POST /api/sf/generate-zip is SYNCHRONOUS and returns a binary ZIP
 *     (Content-Type: application/zip), never JSON — first Next flow
 *     handling a binary response (blob download via <a download>).
 */

import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const NEXT_URL = pathToFileURL(path.resolve('frontend/vision-core-next.html')).toString();
const API = 'https://visioncore-api-gateway.weiganlight.workers.dev';

test.beforeEach(async ({ page }) => {
  await page.route(`${API}/api/agent/status`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, connected: false }) }));
  await page.route(`${API}/api/mission/quota`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, plan: 'free', remaining: 5 }) }));
});

async function mockCoreSfSteps(page) {
  const jobResults = new Map();
  let seq = 0;
  for (const key of ['mission-composer', 'deploy-blueprint', 'worker-handoff']) {
    await page.route(`${API}/api/sf/${key}`, async (route) => {
      seq += 1;
      const id = `job-${seq}`;
      jobResults.set(id, `${key} ok`);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, job_id: id }) });
    });
  }
  await page.route(`${API}/api/sf/job/**`, async (route) => {
    const id = route.request().url().split('/').pop();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, status: 'done', result: jobResults.get(id) || null, files: null, provider: 'mock' })
    });
  });
}

async function runToFinalPanel(page, description = 'um app de tarefas com login') {
  await mockCoreSfSteps(page);
  await page.goto(NEXT_URL);
  await page.locator('[data-feature="factory"]').first().click();
  await page.locator('#vcSfPassGold').uncheck();
  await page.locator('#vcPrompt').fill(description);
  await page.getByRole('button', { name: 'Gerar Projeto com o composer' }).click();
  await expect(page.locator('#vcSfFinal')).toBeVisible({ timeout: 10_000 });
}

test('project-files/generate-zip buttons hidden until a run completes', async ({ page }) => {
  await mockCoreSfSteps(page);
  await page.goto(NEXT_URL);
  await page.locator('[data-feature="factory"]').first().click();
  await expect(page.locator('#vcSfFilesBtn')).toBeHidden();
  await expect(page.locator('#vcSfZipActions')).toBeHidden();
});

test('"Gerar Lista de Arquivos" posts the real project-files payload and renders the file list', async ({ page }) => {
  await runToFinalPanel(page, 'app de delivery com React e Node');

  let capturedBody = null;
  await page.route(`${API}/api/sf/project-files`, async (route) => {
    capturedBody = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, job_id: 'pf-job-1' }) });
  });
  await page.route(`${API}/api/sf/job/pf-job-1`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        status: 'done',
        result: null,
        files: [{ name: 'src/index.js', content: 'ok' }, { name: 'README.md', content: '# readme' }],
        provider: 'mock',
        complexity: 'standard'
      })
    });
  });

  await expect(page.locator('#vcSfFilesBtn')).toBeVisible();
  await expect(page.locator('#vcSfZipActions')).toBeHidden();
  await page.locator('#vcSfFilesBtn').click();

  await expect(page.locator('#vcSfFilesList')).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('#vcSfFilesList')).toContainText('src/index.js');
  await expect(page.locator('#vcSfFilesList')).toContainText('README.md');
  await expect(page.locator('#vcSfFilesStatus')).toContainText('2 arquivo(s) gerado(s).');
  await expect(page.locator('#vcSfZipActions')).toBeVisible();
  await expect(page.locator('#vcSfFilesBtn')).toBeEnabled();

  expect(capturedBody).toMatchObject({ description: 'app de delivery com React e Node' });
  expect(typeof capturedBody.accumulated_context).toBe('string');
});

test('project-files failure (no files) surfaces a readable error, never a silent success', async ({ page }) => {
  await runToFinalPanel(page);

  await page.route(`${API}/api/sf/project-files`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, job_id: 'pf-job-2' }) });
  });
  await page.route(`${API}/api/sf/job/pf-job-2`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, status: 'error', result: null, files: null, error: 'llm_unavailable' })
    });
  });

  await page.locator('#vcSfFilesBtn').click();
  await expect(page.locator('#vcSfFilesStatus')).toContainText('Erro', { timeout: 5_000 });
  await expect(page.locator('#vcSfFilesStatus')).toHaveAttribute('data-state', 'error');
  await expect(page.locator('#vcSfFilesList')).toBeHidden();
  await expect(page.locator('#vcSfZipActions')).toBeHidden();
  await expect(page.locator('#vcSfFilesBtn')).toBeEnabled();
});

test('"Baixar ZIP" posts the generated files to generate-zip and triggers a real blob download', async ({ page }) => {
  await runToFinalPanel(page);

  await page.route(`${API}/api/sf/project-files`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, job_id: 'pf-job-3' }) });
  });
  await page.route(`${API}/api/sf/job/pf-job-3`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, status: 'done', result: null, files: [{ name: 'app.js', content: 'console.log(1)' }], provider: 'mock' })
    });
  });
  await page.locator('#vcSfFilesBtn').click();
  await expect(page.locator('#vcSfZipActions')).toBeVisible({ timeout: 5_000 });

  let capturedBody = null;
  let capturedMethod = null;
  await page.route(`${API}/api/sf/generate-zip`, async (route) => {
    capturedMethod = route.request().method();
    capturedBody = route.request().postDataJSON();
    // Corpo binário mínimo — só precisa ser um blob real para o navegador
    // aceitar o download; conteúdo não é interpretado como ZIP de verdade.
    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="projeto-vision-core.zip"'
      },
      body: Buffer.from('PK-fake-zip-content')
    });
  });

  const downloadPromise = page.waitForEvent('download');
  await page.locator('#vcSfZipBtn').click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('projeto-vision-core.zip');
  expect(capturedMethod).toBe('POST');
  expect(capturedBody).toMatchObject({ files: [{ name: 'app.js', content: 'console.log(1)' }] });
  await expect(page.locator('#vcSfZipBtn')).toBeEnabled();
});

test('generate-zip network failure surfaces a readable error instead of a silent no-op', async ({ page }) => {
  await runToFinalPanel(page);
  await page.route(`${API}/api/sf/project-files`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, job_id: 'pf-job-4' }) });
  });
  await page.route(`${API}/api/sf/job/pf-job-4`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, status: 'done', result: null, files: [{ name: 'app.js', content: 'x' }], provider: 'mock' })
    });
  });
  await page.locator('#vcSfFilesBtn').click();
  await expect(page.locator('#vcSfZipActions')).toBeVisible({ timeout: 5_000 });

  await page.route(`${API}/api/sf/generate-zip`, (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }));

  await page.locator('#vcSfZipBtn').click();
  await expect(page.locator('#vcSfFilesStatus')).toContainText('Erro ao baixar ZIP', { timeout: 5_000 });
  await expect(page.locator('#vcSfZipBtn')).toBeEnabled();
});

test('starting a new Auto-Pilot run resets a previous file list and hides the ZIP button', async ({ page }) => {
  await runToFinalPanel(page, 'primeira descrição');
  await page.route(`${API}/api/sf/project-files`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, job_id: 'pf-job-5' }) });
  });
  await page.route(`${API}/api/sf/job/pf-job-5`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, status: 'done', result: null, files: [{ name: 'a.js', content: 'x' }], provider: 'mock' })
    });
  });
  await page.locator('#vcSfFilesBtn').click();
  await expect(page.locator('#vcSfZipActions')).toBeVisible({ timeout: 5_000 });

  // Segunda geração — reaproveita os mesmos mocks de core steps já registrados.
  await page.locator('#vcPrompt').fill('segunda descrição, projeto diferente');
  await page.getByRole('button', { name: 'Gerar Projeto com o composer' }).click();
  await expect(page.locator('#vcSfFinal')).toBeVisible({ timeout: 10_000 });

  await expect(page.locator('#vcSfFilesList')).toBeHidden();
  await expect(page.locator('#vcSfZipActions')).toBeHidden();
  await expect(page.locator('#vcSfFilesStatus')).toHaveText('');
});

test('SF local execution target_exists recovery offers a new dedicated folder, never overwrite', async ({ page }) => {
  await runToFinalPanel(page, 'app com pasta travada');

  await page.route(`${API}/api/sf/project-files`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, job_id: 'pf-job-recovery' }) });
  });
  await page.route(`${API}/api/sf/job/pf-job-recovery`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, status: 'done', result: null, files: [{ name: 'src/index.js', content: 'console.log("ok")' }], provider: 'mock' })
    });
  });
  await page.locator('#vcSfFilesBtn').click();
  await expect(page.locator('#vcSfRealExec')).toBeVisible({ timeout: 5_000 });

  const requests = [];
  await page.route(`${API}/api/sf/execute-project`, async (route) => {
    const body = route.request().postDataJSON();
    requests.push(body);
    const suffix = requests.length === 1 ? 'locked' : 'retry';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        intent: { intent_hash: `intent-${suffix}`, mission_id: `mission-${suffix}`, status: 'queued', target_root: `VisionCoreProjects/demo-${suffix}` },
        receipt: { committed: false, target_root: `VisionCoreProjects/demo-${suffix}` },
        queued: true
      })
    });
  });
  await page.route(`${API}/api/sf/execution-intent/intent-locked`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        intent: { intent_hash: 'intent-locked', status: 'sf_create_project_target_exists', target_root: 'VisionCoreProjects/demo-locked' },
        receipt: { target_root: 'VisionCoreProjects/demo-locked' },
        agent_result: { ok: false, action: 'sf_create_project_target_exists', target_root: 'VisionCoreProjects/demo-locked' }
      })
    });
  });
  await page.route(`${API}/api/sf/execution-intent/intent-retry`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, intent: { intent_hash: 'intent-retry', status: 'queued', target_root: 'VisionCoreProjects/demo-retry' }, receipt: { target_root: 'VisionCoreProjects/demo-retry' }, agent_result: null })
    });
  });

  await page.locator('#vcSfAgentId').fill('agent-test');
  await page.locator('#vcSfAgentSecret').fill('secret-test');
  await page.locator('#vcSfExecuteLocalBtn').click();

  await expect(page.locator('#vcSfRecovery')).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('#vcSfRecovery')).toContainText('nao sobrescreveu nada');
  await expect(page.locator('#vcSfRecoveryPath')).toContainText('VisionCoreProjects/demo-locked');

  await page.locator('#vcSfRetryNewTargetBtn').click();
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1].project_id).not.toBe(requests[0].project_id);
  expect(requests[1].project_id).toContain('retry-1');
  await expect(page.locator('#vcSfRecovery')).toBeHidden();
});