// @ts-check
/**
 * Vision Core Next - Tools "Apply Fix" panel (POST /api/security/apply-fix).
 * All API calls are mocked via page.route(); this spec must never touch the
 * real backend, GitHub, LLM providers, or any host outside localhost.
 *
 * PERMANENT SPEC (not a temp validation spec — see docs/CURRENT_STATE.md):
 * this is a real disk-write endpoint (server.js:1533, writes the file and a
 * .bak backup unconditionally once validation passes — no dry-run flag, no
 * AGENT_APPLY_ENABLED-style kill switch). Double confirmation in the UI is
 * the *only* safety net, same tier as GitHub PR creation. A future agent
 * silently collapsing that to one click is exactly the kind of regression a
 * permanent spec exists to catch, per the criterion already used for
 * agent-apply/sf: governance-relevant surface with no per-step human review.
 *
 * Replaces an earlier version of this spec that used a local static-file
 * server (tests/e2e/preview-server.mjs, now deleted) to try to mock the API.
 * That never worked: apiRequest() in vision-core-next-clean.js always
 * targets the fixed absolute API_BASE_URL (the production gateway), never a
 * path relative to however the page itself was served — so the local
 * server's mock handler was dead code, and the original spec had no test
 * that ever exercised the real submit path (success or error). Found and
 * fixed during a routine handoff audit, 2026-07-08.
 */

import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const NEXT_URL = pathToFileURL(path.resolve('frontend/vision-core-next.html')).toString();
const API = 'https://visioncore-api-gateway.weiganlight.workers.dev';
const CONFIRM_TEXT = 'APLICAR FIX';

// vision-core-next.html polls /api/agent/status and /api/mission/quota
// unconditionally on load (header/sidebar badges) — unmocked, both leak a
// real request to the production gateway on every test.
test.beforeEach(async ({ page }) => {
  await page.route(`${API}/api/agent/status`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, connected: false }) }));
  await page.route(`${API}/api/mission/quota`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, plan: 'free', remaining: 5 }) }));
});

async function openToolsWithFields(page, { file = 'test.txt', line = '5', content = 'console.log("fixed");' } = {}) {
  await page.goto(NEXT_URL);
  await page.locator('[data-feature="tools"]').click();
  await page.locator('#vcApplyFixFile').fill(file);
  await page.locator('#vcApplyFixLine').fill(line);
  await page.locator('#vcApplyFixContent').fill(content);
}

test('form elements exist and are hidden by default', async ({ page }) => {
  await page.goto(NEXT_URL);
  await expect(page.locator('#vcApplyFixForm')).toBeHidden();
  await expect(page.locator('#vcApplyFixFile')).toBeHidden();
  await expect(page.locator('#vcApplyFixLine')).toBeHidden();
  await expect(page.locator('#vcApplyFixContent')).toBeHidden();
  await expect(page.locator('#vcApplyFixConfirm')).toBeHidden();
  await expect(page.locator('#vcApplyFixActions')).toBeHidden();
  await expect(page.locator('#vcApplyFixStatus')).toBeHidden();
});

test('clicking Tools nav shows the form, hidden again outside Tools', async ({ page }) => {
  await page.goto(NEXT_URL);
  await page.locator('[data-feature="tools"]').click();
  await expect(page.locator('#vcApplyFixForm')).toBeVisible();
  await expect(page.locator('#vcApplyFixForm h4')).toHaveText(/Apply Fix/);

  await page.locator('[data-feature="chat"]').click();
  await expect(page.locator('#vcApplyFixForm')).toBeHidden();
});

test('prepare button disabled until all required fields filled', async ({ page }) => {
  await page.goto(NEXT_URL);
  await page.locator('[data-feature="tools"]').click();
  const prepareBtn = page.locator('#vcApplyFixActions button');
  await expect(prepareBtn).toBeDisabled();
  await page.locator('#vcApplyFixFile').fill('test.txt');
  await expect(prepareBtn).toBeDisabled();
  await page.locator('#vcApplyFixLine').fill('1');
  await expect(prepareBtn).toBeDisabled();
  await page.locator('#vcApplyFixContent').fill('fixed line');
  await expect(prepareBtn).toBeEnabled();
});

test('double confirmation gate: prepare then explicit confirm text required', async ({ page }) => {
  let posted = 0;
  await page.route(`${API}/api/security/apply-fix`, async (route) => { posted += 1; await route.fulfill({ status: 500, body: '{}' }); });

  await openToolsWithFields(page);
  await page.locator('#vcApplyFixActions button').click();
  await expect(page.locator('#vcApplyFixStatus')).toContainText('Confirme');
  const confirmBtn = page.locator('#vcApplyFixActions button').first();
  await expect(confirmBtn).toBeDisabled();
  expect(posted).toBe(0);

  await page.locator('#vcApplyFixConfirm').fill(CONFIRM_TEXT);
  await expect(confirmBtn).toBeEnabled();
  await expect(confirmBtn).toContainText('APLICAR FIX em test.txt');
  expect(posted).toBe(0); // typing the phrase alone must not fire the request
});

test('cancel resets confirmation without ever posting', async ({ page }) => {
  let posted = 0;
  await page.route(`${API}/api/security/apply-fix`, async (route) => { posted += 1; await route.fulfill({ status: 500, body: '{}' }); });

  await openToolsWithFields(page);
  await page.locator('#vcApplyFixActions button').click();
  await expect(page.locator('#vcApplyFixStatus')).toContainText('Confirme');
  await page.locator('#vcApplyFixActions button').filter({ hasText: 'Cancelar' }).click();
  await expect(page.locator('#vcApplyFixStatus')).toHaveText('');
  await expect(page.locator('#vcApplyFixActions button')).toHaveText('Preparar Apply Fix');
  expect(posted).toBe(0);
});

test('confirmed submit posts the real payload shape and renders the diff preview', async ({ page }) => {
  let body = null;
  await page.route(`${API}/api/security/apply-fix`, async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true, file: 'test.txt', line: 5, rule_id: '',
        before: 'old line', after: 'console.log("fixed");',
        diff_preview: { before: 'a\nold line\nb', after: 'a\nconsole.log("fixed");\nb' },
        backup_created: '/tmp/test.txt.bak-s135-123'
      })
    });
  });

  await openToolsWithFields(page);
  await page.locator('#vcApplyFixActions button').click();
  await page.locator('#vcApplyFixConfirm').fill(CONFIRM_TEXT);
  await page.locator('#vcApplyFixActions button').first().click();

  await expect(page.locator('#vcApplyFixStatus')).toContainText('Fix aplicado em test.txt:5');
  await expect(page.locator('#vcApplyFixStatus')).toContainText('bak-s135-123');
  await expect(page.locator('#vcApplyFixDiffBefore')).toContainText('old line');
  await expect(page.locator('#vcApplyFixDiffAfter')).toContainText('console.log("fixed")');
  // fields clear after success so a stray double-click can't repeat the fix
  await expect(page.locator('#vcApplyFixFile')).toHaveValue('');
  await expect(page.locator('#vcApplyFixConfirm')).toHaveValue('');

  expect(body).toMatchObject({
    violation: { file: 'test.txt', line: 5, rule_id: '' },
    fix: { after: 'console.log("fixed");' }
  });
});

test('backend error surfaces a readable message and does not clear the form', async ({ page }) => {
  await page.route(`${API}/api/security/apply-fix`, async (route) => {
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'apply_fix_file_not_found' }) });
  });

  await openToolsWithFields(page);
  await page.locator('#vcApplyFixActions button').click();
  await page.locator('#vcApplyFixConfirm').fill(CONFIRM_TEXT);
  await page.locator('#vcApplyFixActions button').first().click();

  await expect(page.locator('#vcApplyFixStatus')).toContainText('Erro ao aplicar fix');
  await expect(page.locator('#vcApplyFixStatus')).toContainText('apply_fix_file_not_found');
  await expect(page.locator('#vcApplyFixFile')).toHaveValue('test.txt'); // not silently wiped on failure
});
