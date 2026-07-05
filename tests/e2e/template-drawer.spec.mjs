// @ts-check
/**
 * tests/e2e/template-drawer.spec.mjs
 * Vision Core — Playwright E2E tests for the Sub-passo 3.2d Templates
 * painel lateral (drawer).
 *
 * Section H (Project Template Packs — 12 templates, each with 9 content
 * blocks: stack, folder tree, initial files, reserve agents, prompt
 * sequence, validation checklist, risk warnings, forbidden actions, next
 * safe action) was moved out of the legacy #projectBuilder into a
 * standalone drawer (#vcTemplateDrawer), opened via an inline chat button
 * ("📐 Ver templates disponíveis", #vcOpenTemplateDrawerBtn). Confirmed via
 * code reading before implementing: this content is genuinely
 * navigation/comparison-shaped (a 12-card grid + a 9-section detail view),
 * consistent with the original Fase B reasoning that it doesn't belong in
 * a chat bubble.
 *
 * Layout mechanism (chosen without a response to the clarifying question
 * within 60s — proceeded on the most literal reading of "painel deslizante
 * lateral", the exact wording used in the question itself, and the option
 * with the least CSS/responsive risk): the drawer slides in from the right
 * edge, floats over the chat with a dimmed backdrop behind it. Closes via
 * the ✕ button, a backdrop click, or ESC. #vcTemplatePacks (grid + detail)
 * was moved wholesale, unchanged — initTemplatePacks() already populates it
 * unconditionally at load (line ~10800), regardless of the drawer's
 * visibility.
 *
 * Alvo: https://visioncoreai.pages.dev (produção)
 * Run:  npx playwright test tests/e2e/template-drawer.spec.mjs
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'https://visioncoreai.pages.dev';

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
  await page.click('#vcMissionSfTab');
  await expect(page.locator('#vcMissionSfPane')).toBeVisible();
});

test('drawer starts closed: hidden, no backdrop, off-screen (not just transparent)', async ({ page }) => {
  await expect(page.locator('#vcTemplateDrawer')).toBeHidden();
  await expect(page.locator('#vcTemplateDrawerBackdrop')).toBeHidden();
});

test('"Ver templates disponíveis" opens the drawer with backdrop, grid pre-populated with all 12 templates', async ({ page }) => {
  await page.click('#vcOpenTemplateDrawerBtn');

  const drawer = page.locator('#vcTemplateDrawer');
  await expect(drawer).toBeVisible();
  await expect(drawer).toHaveClass(/\bopen\b/);
  await expect(page.locator('#vcTemplateDrawerBackdrop')).toBeVisible();

  // Grid was already populated by initTemplatePacks() at load — no fetch/spinner needed
  await expect(page.locator('#vcTemplateGrid .vc-template-card')).toHaveCount(12);
});

test('the drawer floats OVER the chat (fixed, right edge) — chat stays in the DOM behind it, not replaced', async ({ page }) => {
  await page.click('#vcOpenTemplateDrawerBtn');
  await expect(page.locator('#vcTemplateDrawer')).toBeVisible();

  // The SF chat pane is still there underneath — this is an overlay, not a mode switch
  await expect(page.locator('#vcMissionSfPane')).toBeVisible();
  await expect(page.locator('#mission')).toHaveClass(/\bsf-mode\b/);

  const drawerBox = await page.locator('#vcTemplateDrawer').boundingBox();
  const viewport = page.viewportSize();
  expect(drawerBox.x + drawerBox.width, 'drawer should be flush against the right edge').toBeGreaterThanOrEqual(viewport.width - 5);
});

test('clicking a template card shows its detail — stack, folder tree, files, agents all populated', async ({ page }) => {
  await page.click('#vcOpenTemplateDrawerBtn');
  await page.click('#vcTemplateGrid [data-tpl-id="tpl_saas_fullstack"]');

  const detail = page.locator('#vcTemplateDetail');
  await expect(detail).toHaveClass(/\bvisible\b/);
  await expect(page.locator('#vcTplDetailName')).toHaveText('SaaS Fullstack Starter');
  await expect(page.locator('#vcTplDetailStack .vc-tpl-stack-chip').first()).toBeVisible();
  await expect(page.locator('#vcTplDetailTree .vc-tpl-tree-item').first()).toBeVisible();
  await expect(page.locator('#vcTplDetailFiles .vc-tpl-file-item').first()).toBeVisible();
  await expect(page.locator('#vcTplDetailAgents .vc-tpl-agent-chip').first()).toBeVisible();
});

test('navigating between templates updates the SAME detail panel — selected card highlight moves, no duplicate panel', async ({ page }) => {
  await page.click('#vcOpenTemplateDrawerBtn');

  await page.click('#vcTemplateGrid [data-tpl-id="tpl_saas_fullstack"]');
  await expect(page.locator('#vcTplDetailName')).toHaveText('SaaS Fullstack Starter');
  await expect(page.locator('#vcTemplateGrid [data-tpl-id="tpl_saas_fullstack"]')).toHaveClass(/\bselected\b/);

  await page.click('#vcTemplateGrid [data-tpl-id="tpl_api_backend"]');
  await expect(page.locator('#vcTplDetailName')).toHaveText('API Backend Starter');
  await expect(page.locator('#vcTemplateGrid [data-tpl-id="tpl_api_backend"]')).toHaveClass(/\bselected\b/);
  await expect(page.locator('#vcTemplateGrid [data-tpl-id="tpl_saas_fullstack"]')).not.toHaveClass(/\bselected\b/);

  // Still exactly one detail panel — navigation updates in place
  await expect(page.locator('#vcTemplateDetail')).toHaveCount(1);
});

test('close button (✕) hides the drawer and backdrop', async ({ page }) => {
  await page.click('#vcOpenTemplateDrawerBtn');
  await expect(page.locator('#vcTemplateDrawer')).toHaveClass(/\bopen\b/);

  await page.click('#vcCloseTemplateDrawerBtn');
  await expect(page.locator('#vcTemplateDrawer')).not.toHaveClass(/\bopen\b/);
  await expect(page.locator('#vcTemplateDrawerBackdrop')).toBeHidden();
});

test('clicking the backdrop closes the drawer', async ({ page }) => {
  await page.click('#vcOpenTemplateDrawerBtn');
  await expect(page.locator('#vcTemplateDrawer')).toHaveClass(/\bopen\b/);

  await page.locator('#vcTemplateDrawerBackdrop').click({ position: { x: 5, y: 5 } });
  await expect(page.locator('#vcTemplateDrawer')).not.toHaveClass(/\bopen\b/);
});

test('ESC key closes the drawer', async ({ page }) => {
  await page.click('#vcOpenTemplateDrawerBtn');
  await expect(page.locator('#vcTemplateDrawer')).toHaveClass(/\bopen\b/);

  await page.keyboard.press('Escape');
  await expect(page.locator('#vcTemplateDrawer')).not.toHaveClass(/\bopen\b/);
});

test('re-opening the drawer after closing preserves the previously selected template detail', async ({ page }) => {
  await page.click('#vcOpenTemplateDrawerBtn');
  await page.click('#vcTemplateGrid [data-tpl-id="tpl_ecommerce"]');
  await expect(page.locator('#vcTplDetailName')).toHaveText('E-commerce Starter');

  await page.click('#vcCloseTemplateDrawerBtn');
  await page.click('#vcOpenTemplateDrawerBtn');

  await expect(page.locator('#vcTplDetailName')).toHaveText('E-commerce Starter');
});
