// @ts-check
/**
 * tests/e2e/sf-cockpit-nav.spec.mjs
 * Vision Core — Playwright E2E characterization tests for cockpit <-> Software Factory navigation.
 *
 * Sub-passo 0: covers CURRENT behavior only. Zero production code changed.
 * Covers:
 *  - open SF via [data-open-sf-page] hides #vcCockpitView
 *  - #vcSfBackBtn returns to cockpit, hides SF page
 *  - critical side-effect: showSoftwareFactoryPage() ALWAYS resets to home view on
 *    every open (vision-core-bundle.js:5989 "Always reset to home view on every open"),
 *    discarding whatever module was active before the page was last closed — the
 *    reset is bundled into navigate, not a separate user action.
 *  - T3 (_sfOnEnter): tutorial step onEnter opens SF page + activates target module
 *  - T7 (_cockpitScroll): tutorial step onEnter forces cockpit visible + scrolls target into view
 *
 * Sub-passo 2 adds: #vcNavSidebar moved out of #vcCockpitView/#vcSoftwareFactoryPage
 * in the DOM (true persistent sibling). showMainCockpitPage()/showSoftwareFactoryPage()
 * were NOT changed to manage it — visibility is 100% CSS, via a `:has()` rule reacting
 * to the aria-hidden attribute those two functions already toggle on #vcSoftwareFactoryPage
 * for their own (unrelated) reasons. Revalidated: _cockpitScroll/_sfOnEnter still work
 * unchanged (T3/T7 above already cover that) — the sidebar's DOM location was never
 * something those helpers depended on.
 *
 * Alvo: https://visioncoreai.pages.dev (produção)
 * Run:  npx playwright test tests/e2e/sf-cockpit-nav.spec.mjs
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'https://visioncoreai.pages.dev';

/** Nav button is hidden by responsive CSS in headless Chromium — click programmatically. */
async function openSfPage(page) {
  await page.waitForSelector('[data-open-sf-page]', { state: 'attached', timeout: 12_000 });
  await page.evaluate(() => {
    const btn = document.querySelector('[data-open-sf-page]');
    if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
  await page.waitForSelector('#vcSoftwareFactoryPage', { state: 'visible', timeout: 8_000 });
}

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

// ── Round trip: open hides cockpit, back button restores it ────────────────────
test('SF open/close round trip: opening hides #vcCockpitView, #vcSfBackBtn restores it', async ({ page }) => {
  const cockpit = page.locator('#vcCockpitView');
  const sfPage  = page.locator('#vcSoftwareFactoryPage');

  // ── Before opening: cockpit visible, SF page hidden ─────────────────────────
  await expect(cockpit).toBeVisible();
  await expect(sfPage).toBeHidden();

  // ── Open SF ──────────────────────────────────────────────────────────────────
  await openSfPage(page);
  await expect(cockpit).toBeHidden();
  await expect(cockpit).toHaveAttribute('aria-hidden', 'true');
  await expect(sfPage).toBeVisible();
  await expect(sfPage).not.toHaveAttribute('aria-hidden', 'true');

  // ── Back to cockpit ──────────────────────────────────────────────────────────
  await page.click('#vcSfBackBtn');
  await expect(sfPage).toBeHidden();
  await expect(sfPage).toHaveAttribute('aria-hidden', 'true');
  await expect(cockpit).toBeVisible();
  await expect(cockpit).not.toHaveAttribute('aria-hidden', 'true');
});

// ── Critical side-effect: reset-to-home is bundled into every navigate/open ────
test('showSoftwareFactoryPage() always resets to home view on open, discarding prior module state', async ({ page }) => {
  const homeCtrl  = page.locator('#vcSfHomeControl');
  const workspace = page.locator('#vcSfModuleWorkspace');

  // ── Open SF (1st time) — starts on home by default ─────────────────────────
  await openSfPage(page);
  await expect(homeCtrl).toBeVisible();
  await expect(workspace).toBeHidden();

  // ── Navigate away from home to a module (simulates prior user activity) ────
  await page.evaluate(() => window.setSoftwareFactoryModule('mission_composer'));
  await expect(workspace).toBeVisible();
  await expect(homeCtrl).toBeHidden();

  // ── Leave SF without resetting state manually ───────────────────────────────
  await page.click('#vcSfBackBtn');
  await expect(page.locator('#vcSoftwareFactoryPage')).toBeHidden();

  // ── Reopen SF: reset happens automatically as part of navigate, no explicit
  //    "go home" action taken by the test — this is the side-effect under test ─
  await openSfPage(page);
  await expect(homeCtrl).toBeVisible();
  await expect(workspace).toBeHidden();

  // Module nav no longer shows the previously active module as active
  const missionBtn = page.locator('.vc-sf-module-btn[data-sf-module="mission_composer"]');
  await expect(missionBtn).not.toHaveClass(/\bactive\b/);
});

// ── T3: _sfOnEnter opens SF page + activates the target module per step ────────
test('T3 tutorial (sf): step onEnter opens SF page and activates the matching module', async ({ page }) => {
  // Start from cockpit (tutorial can be triggered from anywhere)
  await expect(page.locator('#vcCockpitView')).toBeVisible();

  await page.evaluate(() => window.vcStartSectionTutorial('sf'));

  const overlay = page.locator('#vcTutorialOverlay');
  await expect(overlay).toBeVisible({ timeout: 5_000 });

  // ── Step 0: target #vcSfHomeBtn, onEnter = _sfOnEnter(null) → just opens SF ──
  await expect(page.locator('#vcSoftwareFactoryPage')).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('#vcTutorialTitle')).toHaveText('◈ Bem-vindo à Software Factory');

  // ── Advance to step 1: target [data-sf-module="project_builder"],
  //    onEnter = _sfOnEnter('project_builder') → activates that module ─────────
  await page.click('#vcTutorialNext');
  await expect(page.locator('#vcTutorialTitle')).toHaveText('01 — Montar Projeto do Zero');

  const moduleBtn = page.locator('.vc-sf-module-btn[data-sf-module="project_builder"]');
  await expect(moduleBtn).toHaveClass(/\bactive\b/, { timeout: 5_000 });
  await expect(page.locator('#vcSfModuleWorkspace')).toBeVisible();
  await expect(page.locator('#vcSfHomeControl')).toBeHidden();
});

// ── T7: _cockpitScroll forces cockpit visible + scrolls target into view ───────
test('T7 tutorial (github): step onEnter forces cockpit visible and scrolls target into view', async ({ page }) => {
  // Start from the SF page — proves _cockpitScroll navigates back to cockpit
  await openSfPage(page);
  await expect(page.locator('#vcSoftwareFactoryPage')).toBeVisible();

  await page.evaluate(() => window.vcStartSectionTutorial('github'));

  const overlay = page.locator('#vcTutorialOverlay');
  await expect(overlay).toBeVisible({ timeout: 5_000 });

  // ── Step 0: target #githubPanel, onEnter = _cockpitScroll('#githubPanel') ───
  await expect(page.locator('#vcSoftwareFactoryPage')).toBeHidden({ timeout: 5_000 });
  await expect(page.locator('#vcCockpitView')).toBeVisible();
  await expect(page.locator('#githubPanel')).toBeInViewport({ timeout: 5_000 });
});

// ── Sub-passo 2: #vcNavSidebar is a persistent sibling, not owned by either
//    toggle function — visibility is CSS-only, keyed off #vcSoftwareFactoryPage's
//    own aria-hidden attribute ────────────────────────────────────────────────
test('Sub-passo 2: nav sidebar lives outside #vcCockpitView/#vcSoftwareFactoryPage, hidden only while SF page is open', async ({ page }) => {
  const sidebar = page.locator('#vcNavSidebar');

  // ── Structural: sidebar is NOT a descendant of either page container ───────
  const insideCockpit = await page.evaluate(() => !!document.querySelector('#vcCockpitView #vcNavSidebar'));
  const insideSfPage  = await page.evaluate(() => !!document.querySelector('#vcSoftwareFactoryPage #vcNavSidebar'));
  expect(insideCockpit, '#vcNavSidebar must not be nested inside #vcCockpitView').toBe(false);
  expect(insideSfPage,  '#vcNavSidebar must not be nested inside #vcSoftwareFactoryPage').toBe(false);

  // ── Cockpit active on load → sidebar visible ────────────────────────────────
  await expect(sidebar).toBeVisible();

  // ── Open SF: sidebar disappears (CSS :has() reacting to SF page's aria-hidden,
  //    not any code path inside showSoftwareFactoryPage() touching the sidebar) ─
  await openSfPage(page);
  await expect(sidebar).toBeHidden();

  // ── Back to cockpit: sidebar reappears, same CSS mechanism in reverse ──────
  await page.click('#vcSfBackBtn');
  await expect(page.locator('#vcSoftwareFactoryPage')).toBeHidden();
  await expect(sidebar).toBeVisible();
});
