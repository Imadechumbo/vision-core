// @ts-check
/**
 * Vision Core Next - Dry-Run real panel (POST /api/agent/mission/queue,
 * type:'sf_dry_run_real', + GET /api/agent/mission/result/:id polling).
 * All API calls are mocked via page.route(); this spec must never touch the
 * real backend, Vision Agent Local, or any host outside localhost.
 *
 * PERMANENT SPEC (not a temp validation spec — see docs/CURRENT_STATE.md):
 * this is the only panel of the 5 confirm/busy panels that queues a real job
 * for an external process (the Vision Agent Local) to execute — always in
 * simulation mode per SOFTWARE_FACTORY_SPEC.md, but still a real enqueue
 * against production infrastructure once confirmed. Double confirmation in
 * the UI is the only safety net, same tier as GitHub PR / Apply-Fix / Vault
 * Rollback.
 *
 * Origin: Ponytail A1 self-review (2026-07-10) — same gap as
 * vision-core-next-github-pr.spec.mjs: this panel had zero automated
 * regression coverage for the A1 refactor (renderConfirmOrBusy() shared by
 * GitHub PR/Apply-Fix/Vault Rollback/Agent-Apply/Dry-Run); only validated by
 * a temp spec written, run and discarded in an earlier session. This spec
 * closes that gap.
 */

import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const NEXT_URL = pathToFileURL(path.resolve('frontend/vision-core-next.html')).toString();
const API = 'https://visioncore-api-gateway.weiganlight.workers.dev';

// vision-core-next.html polls /api/agent/status and /api/mission/quota
// unconditionally on load (header/sidebar badges) — unmocked, both leak a
// real request to the production gateway on every test.
test.beforeEach(async ({ page }) => {
  await page.route(`${API}/api/agent/status`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, connected: false }) }));
  await page.route(`${API}/api/mission/quota`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, plan: 'free', remaining: 5 }) }));
});

async function openDryRunWithTarget(page, targetPath = 'C:\\projetos\\meu-repo') {
  await page.goto(NEXT_URL);
  // "missions" only has a sidebar nav link (no composer chip shares the
  // attribute for this key, unlike "vault"/"github"), but scoping to the
  // link keeps this consistent with the other two panel specs.
  await page.locator('a[data-feature="missions"]').click();
  await page.locator('#vcDryRunTargetPath').fill(targetPath);
}

test('panel hidden by default, visible only under the Missions tab', async ({ page }) => {
  await page.goto(NEXT_URL);
  await expect(page.locator('#vcDryRunForm')).toBeHidden();
  await page.locator('a[data-feature="missions"]').click();
  await expect(page.locator('#vcDryRunForm')).toBeVisible();
});

test('run button disabled until target path filled, confirm appears only after clicking it, cancel returns to idle without a request', async ({ page }) => {
  let queueCalls = 0;
  await page.route(`${API}/api/agent/mission/queue`, (route) => { queueCalls += 1; return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); });
  await page.goto(NEXT_URL);
  await page.locator('a[data-feature="missions"]').click();

  const runBtn = page.locator('#vcDryRunActions button', { hasText: 'Rodar Dry-Run' });
  await expect(runBtn).toBeDisabled();
  await page.locator('#vcDryRunTargetPath').fill('C:\\projetos\\meu-repo');
  await expect(runBtn).toBeEnabled();

  await runBtn.click();
  const confirmBtn = page.locator('#vcDryRunActions button', { hasText: 'Confirmar dry-run em C:\\projetos\\meu-repo' });
  await expect(confirmBtn).toBeVisible();

  await page.locator('#vcDryRunActions button', { hasText: 'Cancelar' }).click();
  await expect(confirmBtn).toBeHidden();
  await expect(page.locator('#vcDryRunActions button', { hasText: 'Rodar Dry-Run' })).toBeVisible();
  expect(queueCalls).toBe(0);
});

test('fast double-click on confirm fires exactly one POST /api/agent/mission/queue and shows a disabled busy button', async ({ page }) => {
  let queueCalls = 0;
  let releaseQueue;
  const queueGate = new Promise((resolve) => { releaseQueue = resolve; });
  await page.route(`${API}/api/agent/mission/queue`, async (route) => {
    queueCalls += 1;
    // Hold the response open briefly so a genuinely fast second click lands
    // while the first request is still in flight — the real-world race the
    // dryRunRequestInFlight guard exists for.
    await queueGate;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, mission_id: 'm-dry-1' }) });
  });
  // Once queued, the panel starts polling GET /api/agent/mission/result/:id
  // (a different state, not busy/confirm) — mocked here so it resolves
  // immediately instead of leaking a real repeating poll against production.
  await page.route(`${API}/api/agent/mission/result/m-dry-1`, (route) =>
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, action: 'sf_dry_run_listing', files: 1, output: 'ok' })
    }));
  await openDryRunWithTarget(page);

  const runBtn = page.locator('#vcDryRunActions button', { hasText: 'Rodar Dry-Run' });
  await runBtn.click();
  const confirmBtn = page.locator('#vcDryRunActions button', { hasText: 'Confirmar dry-run' });
  await expect(confirmBtn).toBeVisible();

  // Same technique as vision-core-next-vault-rollback.spec.mjs /
  // vision-core-next-github-pr.spec.mjs: a real fast double-click fires two
  // 'click' events on the same DOM node before the first handler's
  // synchronous render pass replaces it.
  await page.evaluate(() => {
    const btn = document.querySelector('#vcDryRunActions button');
    btn.click();
    btn.click();
  });

  const busyBtn = page.locator('#vcDryRunActions button', { hasText: 'Enfileirando...' });
  await expect(busyBtn).toBeVisible();
  await expect(busyBtn).toBeDisabled();
  releaseQueue();

  // Success transitions into polling ("Cancelar acompanhamento"), then the
  // mocked result endpoint resolves it to a concluded status.
  await expect(page.locator('#vcDryRunStatus')).toHaveText(/Dry-run concluído/, { timeout: 5000 });
  expect(queueCalls).toBe(1);
});

test('error response re-enables the run flow and does not leave the panel stuck on the busy button', async ({ page }) => {
  await page.route(`${API}/api/agent/mission/queue`, (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'queue_failed' }) }));
  await openDryRunWithTarget(page);

  await page.locator('#vcDryRunActions button', { hasText: 'Rodar Dry-Run' }).click();
  await page.locator('#vcDryRunActions button', { hasText: 'Confirmar dry-run' }).click();

  await expect(page.locator('#vcDryRunStatus')).toContainText('Erro ao enfileirar', { timeout: 5000 });
  await expect(page.locator('#vcDryRunActions button', { hasText: 'Enfileirando...' })).toBeHidden();
  await expect(page.locator('#vcDryRunActions button', { hasText: 'Rodar Dry-Run' })).toBeVisible();
});
