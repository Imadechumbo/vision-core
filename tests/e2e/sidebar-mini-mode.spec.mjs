// @ts-check
/**
 * tests/e2e/sidebar-mini-mode.spec.mjs
 * Vision Core — Playwright E2E tests for the Sub-passo 3.1 sidebar mini-mode.
 *
 * #vcNavSidebar (persistent since Sub-passo 2) now starts collapsed (icon-only,
 * "mini") by default on desktop (>=1181px) and expands via #vcNavSidebarToggle.
 * Icon/label are now separate spans (.vc-menu-ico / .vc-menu-lbl) across the
 * ~33 menu entries so mini mode can hide just the label.
 *
 * Covers:
 *  - sidebar starts in mini mode (class "mini" present, narrow width, labels hidden)
 *  - toggle button expands/collapses it
 *  - menu items are functionally clickable in BOTH modes (not just visually present) —
 *    icon-only buttons/links in mini mode still fire their click/href
 *  - group sub-items stay reachable in mini mode regardless of their .open/closed
 *    state (decision: group collapse only matters once the sidebar is expanded)
 *  - existing group-collapse (vcToggleMenuGroup, Fase 1) still works once expanded
 *  - mini mode only applies >=1181px — untouched below that breakpoint
 *
 * Sub-passo 3.2a: the sidebar's SF link now opens the embedded Chat/Software
 * Factory switcher (#mission.sf-mode), not the legacy full page — updated
 * below to match (see tests/e2e/mission-sf-switcher.spec.mjs).
 *
 * Alvo: https://visioncoreai.pages.dev (produção)
 * Run:  npx playwright test tests/e2e/sidebar-mini-mode.spec.mjs
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'https://visioncoreai.pages.dev';

test('sidebar starts in mini mode by default on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto(BASE_URL);

  const sidebar = page.locator('#vcNavSidebar');
  await expect(sidebar).toHaveClass(/\bmini\b/);

  const box = await sidebar.boundingBox();
  expect(box.width, 'mini sidebar should be narrow (icon-only), not the ~282px expanded width').toBeLessThan(80);

  // Labels hidden, icons visible
  await expect(page.locator('#vcNavSidebar .vc-menu-lbl').first()).toBeHidden();
  await expect(page.locator('#vcNavSidebar .vc-menu-ico').first()).toBeVisible();
});

test('toggle button expands and re-collapses the sidebar', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto(BASE_URL);

  const sidebar = page.locator('#vcNavSidebar');
  const toggle  = page.locator('#vcNavSidebarToggle');

  await expect(sidebar).toHaveClass(/\bmini\b/);
  await expect(toggle).toBeVisible();

  // ── Expand ───────────────────────────────────────────────────────────────
  await toggle.click();
  await expect(sidebar).not.toHaveClass(/\bmini\b/);
  const expandedBox = await sidebar.boundingBox();
  expect(expandedBox.width, 'expanded sidebar should be back to the ~282px width').toBeGreaterThan(200);
  await expect(page.locator('#vcNavSidebar .vc-menu-lbl').first()).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');

  // ── Collapse again ───────────────────────────────────────────────────────
  await toggle.click();
  await expect(sidebar).toHaveClass(/\bmini\b/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('menu items are functionally clickable in mini mode, not just icon-visible', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto(BASE_URL);

  await expect(page.locator('#vcNavSidebar')).toHaveClass(/\bmini\b/);

  // Top-level item: clicking the icon-only SF button in the sidebar still fires
  // its handler. Sub-passo 3.2a: this now opens the embedded Chat/Software
  // Factory switcher in #mission (setCentralMode('sf')), not the legacy full
  // page (see tests/e2e/mission-sf-switcher.spec.mjs) — updated to match.
  const sfSidebarBtn = page.locator('#vcNavSidebar [data-open-sf-page]');
  await expect(sfSidebarBtn).toBeVisible();
  await sfSidebarBtn.click();
  await expect(page.locator('#mission')).toHaveClass(/\bsf-mode\b/);
  await expect(page.locator('#vcMissionSfPane')).toBeVisible({ timeout: 5_000 });
  await page.click('#vcMissionChatTab');
  await expect(page.locator('#mission')).not.toHaveClass(/\bsf-mode\b/);

  // Group sub-item (inside .vc-menu-grp-items, forced visible in mini mode per
  // design decision — group collapse only matters once expanded): DIAGNOSTICS/HERMES
  // anchor should have real, clickable dimensions even though its label is hidden.
  const hermesLink = page.locator('#vcNavSidebar a[href="#hermes"]');
  const box = await hermesLink.boundingBox();
  expect(box, '#hermes sub-item must have real clickable dimensions in mini mode').not.toBeNull();
  expect(box.width).toBeGreaterThan(0);
  expect(box.height).toBeGreaterThan(0);
});

test('group sub-items stay visible in mini mode regardless of open/closed state', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto(BASE_URL);

  // ROADMAP group starts closed (no "open" class) even in expanded mode —
  // confirm its sub-item (#v10) is still reachable while mini.
  const roadmapItems = page.locator('#vcMenuGrpItems-roadmap');
  await expect(roadmapItems).not.toHaveClass(/\bopen\b/);

  const v10Link = page.locator('#vcNavSidebar a[href="#v10"]');
  await expect(v10Link).toBeVisible();
  const box = await v10Link.boundingBox();
  expect(box.width).toBeGreaterThan(0);
});

test('existing group-collapse (vcToggleMenuGroup) still works once sidebar is expanded', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto(BASE_URL);

  await page.click('#vcNavSidebarToggle'); // expand
  await expect(page.locator('#vcNavSidebar')).not.toHaveClass(/\bmini\b/);

  const items = page.locator('#vcMenuGrpItems-qualidade');
  const chev  = page.locator('#vcMenuGrpChev-qualidade');
  await expect(items).toHaveClass(/\bopen\b/); // starts open
  await expect(items).toBeVisible();

  await page.click('.vc-menu-grp-lbl:has-text("QUALIDADE")');
  await expect(items).not.toHaveClass(/\bopen\b/);
  await expect(items).toBeHidden();
  await expect(chev).not.toHaveClass(/\bopen\b/);
});

test('mini mode does not apply below the 1181px breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 900 });
  await page.goto(BASE_URL);

  const sidebar = page.locator('#vcNavSidebar');
  // "mini" class may still be present in the DOM (it's the default), but the CSS
  // rule is scoped to >=1181px — confirm labels are visible and width is not narrow.
  await expect(page.locator('#vcNavSidebar .vc-menu-lbl').first()).toBeVisible();
  const box = await sidebar.boundingBox();
  expect(box.width, 'below 1181px the sidebar should stack full-width, unaffected by mini mode').toBeGreaterThan(200);

  // The toggle control itself should not show where it has no effect
  await expect(page.locator('#vcNavSidebarToggle')).toBeHidden();
});
