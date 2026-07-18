// @ts-check
/**
 * Vision Core Next - GitHub PR panel (POST /api/github/create-pr).
 * All API calls are mocked via page.route(); this spec must never touch the
 * real backend, GitHub, LLM providers, or any host outside localhost.
 *
 * PERMANENT SPEC (not a temp validation spec — see docs/CURRENT_STATE.md):
 * this endpoint creates a real branch+commit+PR — irreversible per
 * API_CONTRACT.md ("Irreversível — cria branch+commit+PR real"). Double
 * confirmation in the UI is the only safety net, same tier as Apply-Fix /
 * Vault Rollback. Same criterion already used for those: governance-relevant
 * surface with no per-step human review.
 *
 * Origin: Ponytail A1 self-review (2026-07-10) — the A1 refactor
 * (renderConfirmOrBusy() shared by GitHub PR/Apply-Fix/Vault Rollback/
 * Agent-Apply/Dry-Run) had zero automated regression coverage for this
 * panel specifically; only validated by a temp spec written, run and
 * discarded in an earlier session (per the project's normal "roda e apaga"
 * convention for non-permanent specs). This spec closes that gap so a
 * future change to renderConfirmOrBusy() has a real regression test on
 * this panel, not just on the 2 that already had one.
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

async function openGithubTab(page) {
  await page.locator('a[data-feature="github"]').evaluate((el) => el.click());
}

async function openGithubPrWithFields(page, { repo = 'owner/repo', title = 'Fix bug' } = {}) {
  await page.goto(NEXT_URL);
  // "github" has both a sidebar nav link and a composer chip button sharing
  // the same [data-feature] attribute — scope to the sidebar link (same
  // ambiguity already documented in vision-core-next-vault-rollback.spec.mjs
  // for "vault").
  await openGithubTab(page);
  await page.locator('#vcPrRepo').fill(repo);
  // #vcPrBranch already ships with value="main" in the HTML — prFieldsValid()
  // requires repo+branch+title+mission ID, so branch is valid untouched.
  await page.locator('#vcPrTitle').fill(title);
  await page.locator('#vcPrMissionId').fill('mission-pass-gold-1');
}

test('panel hidden by default, visible only under the GitHub tab', async ({ page }) => {
  await page.goto(NEXT_URL);
  await expect(page.locator('#vcGithubPrForm')).toBeHidden();
  await openGithubTab(page);
  await expect(page.locator('#vcGithubPrForm')).toBeVisible();
});

test('create button disabled until repo+branch+title filled, confirm appears only after clicking it, cancel returns to idle without a request', async ({ page }) => {
  let prCalls = 0;
  await page.route(`${API}/api/github/create-pr`, (route) => { prCalls += 1; return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); });
  await page.goto(NEXT_URL);
  await openGithubTab(page);

  const createBtn = page.locator('#vcPrActions button', { hasText: 'Criar PR' });
  await expect(createBtn).toBeDisabled();
  await page.locator('#vcPrRepo').fill('owner/repo');
  await expect(createBtn).toBeDisabled();
  await page.locator('#vcPrTitle').fill('Fix bug');
  await expect(createBtn).toBeDisabled();
  await page.locator('#vcPrMissionId').fill('mission-pass-gold-1');
  await expect(createBtn).toBeEnabled();

  await createBtn.click();
  const confirmBtn = page.locator('#vcPrActions button', { hasText: 'Confirmar criação de PR em owner/repo' });
  await expect(confirmBtn).toBeVisible();

  await page.locator('#vcPrActions button', { hasText: 'Cancelar' }).click();
  await expect(confirmBtn).toBeHidden();
  await expect(page.locator('#vcPrActions button', { hasText: 'Criar PR' })).toBeVisible();
  expect(prCalls).toBe(0);
});

test('fast double-click on confirm fires exactly one POST /api/github/create-pr and shows a disabled busy button', async ({ page }) => {
  let prCalls = 0;
  await page.route(`${API}/api/github/create-pr`, async (route) => {
    prCalls += 1;
    // Hold the response open briefly so a genuinely fast second click lands
    // while the first request is still in flight — the real-world race the
    // prRequestInFlight guard exists for.
    await new Promise((resolve) => setTimeout(resolve, 300));
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, pr_url: 'https://github.com/owner/repo/pull/1' })
    });
  });
  await openGithubPrWithFields(page);

  const createBtn = page.locator('#vcPrActions button', { hasText: 'Criar PR' });
  await createBtn.click();
  const confirmBtn = page.locator('#vcPrActions button', { hasText: 'Confirmar criação de PR' });
  await expect(confirmBtn).toBeVisible();

  // Same technique as vision-core-next-vault-rollback.spec.mjs: a real fast
  // double-click fires two 'click' events on the same DOM node before the
  // first handler's synchronous render pass replaces it. Two separate
  // locator.click() calls are flaky here (the node gets detached mid-render),
  // so we call the native .click() twice on the same node reference
  // synchronously in one evaluate.
  await page.evaluate(() => {
    const btn = document.querySelector('#vcPrActions button');
    btn.click();
    btn.click();
  });

  const busyBtn = page.locator('#vcPrActions button', { hasText: 'Criando PR...' });
  await expect(busyBtn).toBeVisible();
  await expect(busyBtn).toBeDisabled();

  await expect(page.locator('#vcPrStatus')).toContainText('PR criado', { timeout: 5000 });
  expect(prCalls).toBe(1);

  // Success clears the form fields so a stray re-submit can't repeat the PR.
  await expect(page.locator('#vcPrRepo')).toHaveValue('');
  await expect(page.locator('#vcPrBranch')).toHaveValue('main');
  await expect(page.locator('#vcPrTitle')).toHaveValue('');
  await expect(page.locator('#vcPrMissionId')).toHaveValue('');
});

test('error response re-enables the create flow and does not leave the panel stuck on the busy button', async ({ page }) => {
  await page.route(`${API}/api/github/create-pr`, (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'github_create_pr_failed' }) }));
  await openGithubPrWithFields(page);

  await page.locator('#vcPrActions button', { hasText: 'Criar PR' }).click();
  await page.locator('#vcPrActions button', { hasText: 'Confirmar criação de PR' }).click();

  await expect(page.locator('#vcPrStatus')).toContainText('Erro ao criar PR', { timeout: 5000 });
  await expect(page.locator('#vcPrActions button', { hasText: 'Criando PR...' })).toBeHidden();
  await expect(page.locator('#vcPrActions button', { hasText: 'Criar PR' })).toBeVisible();
});
