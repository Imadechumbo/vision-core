// @ts-check
/**
 * Vision Core Next - Vault Rollback panel (POST /api/vault/rollback/:snapshotId).
 * All API calls are mocked via page.route(); this spec must never touch the
 * real backend, GitHub, LLM providers, or any host outside localhost.
 *
 * PERMANENT SPEC (not a temp validation spec — see docs/CURRENT_STATE.md):
 * this endpoint overwrites the current projects.json state with a snapshot —
 * irreversible per API_CONTRACT.md ("Irreversível — sobrescreve o estado
 * atual"). Double confirmation in the UI is the only safety net, same tier
 * as GitHub PR creation / Apply-Fix. Same criterion already used for
 * agent-apply/sf/apply-fix: governance-relevant surface with no per-step
 * human review.
 *
 * Origin: Ponytail audit finding C1 (2026-07-10) — renderVaultActions() had
 * no in-flight/busy branch, unlike the other 4 double-confirmation panels
 * (GitHub PR, Apply-Fix, Agent-Apply, Dry-Run), so a fast double-click could
 * fire two overlapping POST /api/vault/rollback/:id calls against this
 * irreversible endpoint. Fixed by mirroring the vaultRollbackRequestInFlight
 * guard already used by submitApplyFix. This spec is the regression test for
 * that specific gap.
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

const SNAPSHOTS = [{ id: 'snap-1', label: 'Antes do deploy', project: 'vision-core', created_at: '2026-07-01T00:00:00Z' }];

async function openVaultWithSnapshot(page) {
  await page.route(`${API}/api/vault/snapshots`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, snapshots: SNAPSHOTS }) }));
  await page.goto(NEXT_URL);
  // "vault" has both a sidebar nav link and a composer chip button sharing
  // the same [data-feature] attribute — scope to the sidebar link.
  await page.locator('a[data-feature="vault"]').click();
  await page.locator('#vcVaultSnapshotList button', { hasText: 'Rollback' }).click();
}

test('panel hidden by default, visible only under the Vault tab', async ({ page }) => {
  await page.route(`${API}/api/vault/snapshots`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, snapshots: SNAPSHOTS }) }));
  await page.goto(NEXT_URL);
  await expect(page.locator('#vcVaultRollback')).toBeHidden();
  await page.locator('a[data-feature="vault"]').click();
  await expect(page.locator('#vcVaultRollback')).toBeVisible();
});

test('confirm button appears only after clicking Rollback on a snapshot, cancel returns to idle without a request', async ({ page }) => {
  let rollbackCalls = 0;
  await page.route(`${API}/api/vault/rollback/**`, (route) => { rollbackCalls += 1; return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); });
  await openVaultWithSnapshot(page);

  const confirmBtn = page.locator('#vcVaultActions button', { hasText: 'Confirmar rollback' });
  await expect(confirmBtn).toBeVisible();

  await page.locator('#vcVaultActions button', { hasText: 'Cancelar' }).click();
  await expect(confirmBtn).toBeHidden();
  expect(rollbackCalls).toBe(0);
});

test('fast double-click on confirm fires exactly one POST /api/vault/rollback/:id and shows a disabled busy button', async ({ page }) => {
  let rollbackCalls = 0;
  await page.route(`${API}/api/vault/rollback/**`, async (route) => {
    rollbackCalls += 1;
    // Hold the response open briefly so a genuinely fast second click lands
    // while the first request is still in flight — the real-world race this
    // guard exists for.
    await new Promise((resolve) => setTimeout(resolve, 300));
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await openVaultWithSnapshot(page);

  const confirmBtn = page.locator('#vcVaultActions button', { hasText: 'Confirmar rollback' });
  await expect(confirmBtn).toBeVisible();

  // A real fast double-click fires two 'click' events on the same DOM node
  // before the first handler's synchronous render pass replaces it. Driving
  // that via two separate locator.click() calls is flaky (Playwright's
  // actionability check loses the element mid-render), so we call the
  // native .click() twice on the same node reference synchronously in one
  // evaluate — the listener stays bound to that node even after
  // renderVaultActions() detaches it, which is exactly the race the
  // in-flight guard has to survive.
  await page.evaluate(() => {
    const btn = document.querySelector('#vcVaultActions button');
    btn.click();
    btn.click();
  });

  const busyBtn = page.locator('#vcVaultActions button', { hasText: 'Aplicando rollback...' });
  await expect(busyBtn).toBeVisible();
  await expect(busyBtn).toBeDisabled();

  await expect(page.locator('#vcVaultStatus')).toHaveText(/Rollback concluído/, { timeout: 5000 });
  expect(rollbackCalls).toBe(1);
});

test('error response re-enables the confirm flow and does not leave the panel stuck on the busy button', async ({ page }) => {
  await page.route(`${API}/api/vault/rollback/**`, (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'rollback_failed' }) }));
  await openVaultWithSnapshot(page);

  await page.locator('#vcVaultActions button', { hasText: 'Confirmar rollback' }).click();
  await expect(page.locator('#vcVaultStatus')).toHaveText(/Erro no rollback/, { timeout: 5000 });
  await expect(page.locator('#vcVaultActions button', { hasText: 'Aplicando rollback...' })).toBeHidden();
});
