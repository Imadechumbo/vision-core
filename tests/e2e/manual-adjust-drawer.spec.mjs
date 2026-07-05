// @ts-check
/**
 * tests/e2e/manual-adjust-drawer.spec.mjs
 * Vision Core — Playwright E2E tests for the Sub-passo 3.2e "Ajustar
 * Projeto Manualmente" painel lateral.
 *
 * Sections A-D (Tipo de Projeto / Tamanho-Risco / Stack Tecnológico / Modo
 * de Orquestração) moved out of the legacy #projectBuilder into a drawer
 * (#vcManualAdjustDrawer), opened via an inline chat trigger
 * (#vcOpenManualAdjustDrawerBtn). Same mechanism as the Templates drawer
 * (3.2d) — the user compared the two directly when approving this scope.
 * For an advanced user who wants to override what AUTO-PILOT already infers
 * from the free-text description.
 *
 * Confirmed via code reading before implementing: pbState.selectedProjectType/
 * selectedProjectSize/selectedStacks/selectedMode is the canonical backing
 * store already read by getSelectedProjectContext()/getSelectedStackForMission()
 * — the same accessor layer every generator (F/I/K/M/O) already depends on.
 * No new storage needed — the 4 setter functions (setProjectType/
 * setProjectSize/toggleStack/setOrchestrationMode) are called by the SAME
 * global querySelectorAll wiring in initProjectBuilder() (runs
 * unconditionally at load) regardless of where the DOM elements physically
 * live — pure relocation, not reimplementation, same pattern as Section H
 * (Templates) in 3.2d. Section F (live "current selection" summary) was
 * deliberately NOT moved into this drawer — the user's decision named only
 * Sections A-D; expanding scope to F was flagged, not assumed.
 *
 * Selections apply live on click (no separate "Salvar" step) — same as the
 * original Section A-D UI always worked.
 *
 * Alvo: https://visioncoreai.pages.dev (produção)
 * Run:  npx playwright test tests/e2e/manual-adjust-drawer.spec.mjs
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'https://visioncoreai.pages.dev';

async function openManualAdjustDrawer(page) {
  await page.click('#vcMissionSfTab');
  await page.click('#vcOpenManualAdjustDrawerBtn');
  await expect(page.locator('#vcManualAdjustDrawer')).toHaveClass(/\bopen\b/);
}

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test('drawer starts closed', async ({ page }) => {
  await expect(page.locator('#vcManualAdjustDrawer')).toBeHidden();
  await expect(page.locator('#vcManualAdjustDrawerBackdrop')).toBeHidden();
});

test('"Ajustar projeto manualmente" opens the drawer with all 4 sections and real content pre-wired', async ({ page }) => {
  await openManualAdjustDrawer(page);

  await expect(page.locator('#vcManualAdjustDrawer .vc-project-type-card')).toHaveCount(12);
  await expect(page.locator('#vcManualAdjustDrawer .vc-size-chip')).toHaveCount(5);
  await expect(page.locator('#vcManualAdjustDrawer .vc-stack-chip')).toHaveCount(14);
  await expect(page.locator('#vcManualAdjustDrawer .vc-mode-chip')).toHaveCount(5);
});

test('selecting a project type applies live — no save button — and updates Section F immediately', async ({ page }) => {
  await openManualAdjustDrawer(page);

  await page.locator('.vc-project-type-card[data-type-id="ecommerce"]').click();
  await expect(page.locator('.vc-project-type-card[data-type-id="ecommerce"]')).toHaveClass(/\bselected\b/);

  // Section F stays in #projectBuilder (not moved) — text assertion works
  // regardless of visibility, exactly like the other generators already rely on.
  await expect(page.locator('#vcPreviewType')).toContainText('E-commerce');
});

test('stack chips are multi-select and reflect immediately in Section F', async ({ page }) => {
  await openManualAdjustDrawer(page);

  await page.locator('.vc-stack-chip[data-stack-id="Node/Express"]').click();
  await page.locator('.vc-stack-chip[data-stack-id="PostgreSQL"]').click();

  await expect(page.locator('.vc-stack-chip[data-stack-id="Node/Express"]')).toHaveClass(/\bselected\b/);
  await expect(page.locator('.vc-stack-chip[data-stack-id="PostgreSQL"]')).toHaveClass(/\bselected\b/);
  await expect(page.locator('#vcPreviewStack')).toContainText('Node/Express');
  await expect(page.locator('#vcPreviewStack')).toContainText('PostgreSQL');
});

test('project size selection updates the hint text and Section F', async ({ page }) => {
  await openManualAdjustDrawer(page);

  await page.locator('.vc-size-chip[data-size-id="enterprise"]').click();

  await expect(page.locator('#vcSizeHint')).toContainText('Modo sugerido');
  await expect(page.locator('#vcPreviewSize')).toContainText('Enterprise');
});

test('orchestration mode selection updates the description and Section F', async ({ page }) => {
  await openManualAdjustDrawer(page);

  await page.locator('.vc-mode-chip[data-orch-mode="cirurgico"]').click();

  await expect(page.locator('.vc-mode-chip[data-orch-mode="cirurgico"]')).toHaveClass(/\bselected\b/);
  await expect(page.locator('#vcOrchModeDesc')).toHaveClass(/\bactive\b/);
  await expect(page.locator('#vcPreviewMode')).toContainText('Cirúrgico');
});

test('close button, backdrop click, and ESC all close the drawer (shared drawer mechanism)', async ({ page }) => {
  await openManualAdjustDrawer(page);
  await page.click('#vcCloseManualAdjustDrawerBtn');
  await expect(page.locator('#vcManualAdjustDrawer')).not.toHaveClass(/\bopen\b/);

  await openManualAdjustDrawer(page);
  await page.locator('#vcManualAdjustDrawerBackdrop').click({ position: { x: 5, y: 5 } });
  await expect(page.locator('#vcManualAdjustDrawer')).not.toHaveClass(/\bopen\b/);

  await openManualAdjustDrawer(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('#vcManualAdjustDrawer')).not.toHaveClass(/\bopen\b/);
});

test('selections persist across closing and reopening the drawer', async ({ page }) => {
  await openManualAdjustDrawer(page);
  await page.locator('.vc-project-type-card[data-type-id="mobile_app"]').click();
  await page.click('#vcCloseManualAdjustDrawerBtn');

  await openManualAdjustDrawer(page);
  await expect(page.locator('.vc-project-type-card[data-type-id="mobile_app"]')).toHaveClass(/\bselected\b/);
});

test('opening the Templates drawer and the manual-adjust drawer are independent (shared drawer mechanism, distinct instances)', async ({ page }) => {
  await page.click('#vcMissionSfTab');
  await page.click('#vcOpenTemplateDrawerBtn');
  await expect(page.locator('#vcTemplateDrawer')).toHaveClass(/\bopen\b/);
  await expect(page.locator('#vcManualAdjustDrawer')).not.toHaveClass(/\bopen\b/);

  await page.click('#vcCloseTemplateDrawerBtn');
  await page.click('#vcOpenManualAdjustDrawerBtn');
  await expect(page.locator('#vcManualAdjustDrawer')).toHaveClass(/\bopen\b/);
  await expect(page.locator('#vcTemplateDrawer')).not.toHaveClass(/\bopen\b/);
});
