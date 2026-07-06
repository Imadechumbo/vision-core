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
 *  - T7 (_cockpitScroll): tutorial step onEnter forces cockpit visible + scrolls target into view
 *  - T3 (_sfOnEnter) originally covered here too — removed in Sub-passo 3.3b
 *    along with STEPS_SF itself (see note below).
 *
 * Sub-passo 2 adds: #vcNavSidebar moved out of #vcCockpitView/#vcSoftwareFactoryPage
 * in the DOM (true persistent sibling). showMainCockpitPage()/showSoftwareFactoryPage()
 * were NOT changed to manage it — visibility is 100% CSS, via a `:has()` rule reacting
 * to the aria-hidden attribute those two functions already toggle on #vcSoftwareFactoryPage
 * for their own (unrelated) reasons. Revalidated: _cockpitScroll still works unchanged
 * (T7 above covers that) — the sidebar's DOM location was never something that helper
 * depended on.
 *
 * Sub-passo 3.2a: [data-open-sf-page] (header nav + sidebar link) no longer opens
 * this legacy full page — it now calls setCentralMode('sf'), opening the embedded
 * Chat/Software Factory switcher inside #mission instead (see
 * tests/e2e/mission-sf-switcher.spec.mjs). showSoftwareFactoryPage() itself is
 * UNCHANGED and still real — invoked internally by the legacy page's own module
 * nav. openSfPage() below was updated to invoke it directly instead of through
 * the now-repointed button, preserving this suite's original intent: exercising
 * the legacy full page's own show/hide contract.
 *
 * Sub-passo 3.3b: STEPS_SF (the 'sf' tutorial that used to drive T3's
 * module-targeting steps here) was retired — its only trigger (the sidebar
 * "Software Factory" menu item) was repointed to STEPS_SF2 (the correct,
 * embedded-UI tutorial — see tests/e2e/mission-sf-switcher.spec.mjs for its
 * full walkthrough). The T3 test that used to live in this file was removed
 * along with it; a small regression net confirming 'sf' no longer resolves
 * to anything lives in mission-sf-switcher.spec.mjs instead.
 *
 * Alvo: https://visioncoreai.pages.dev (produção)
 * Run:  npx playwright test tests/e2e/sf-cockpit-nav.spec.mjs
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'https://visioncoreai.pages.dev';

/** Sub-passo 3.2a: invoke the legacy full page directly — the real UI button
 *  now opens the embedded switcher instead (see mission-sf-switcher.spec.mjs). */
async function openSfPage(page) {
  await page.evaluate(() => window.showSoftwareFactoryPage());
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
// Sub-passo 3.2a: #vcSfHomeControl moved out of the legacy full page into
// #mission. showSoftwareFactoryPage() (invoked directly here, via openSfPage())
// still hides #vcCockpitView as its first step — which now, as a structural
// side effect of the move, ALSO hides #vcSfHomeControl (nested inside #mission,
// inside the cockpit). _sfShowHome() still runs and still sets its inline
// style to 'flex' (confirmed — see mission-sf-switcher.spec.mjs, which asserts
// this same element becomes genuinely visible when reached via setCentralMode(),
// the only path that keeps the cockpit visible). Testing "home becomes visible"
// through THIS specific path (opening the legacy page in isolation, without an
// immediate module switch) is no longer meaningful: it doesn't correspond to
// any real, currently-exercised trigger — the two real callers of
// showSoftwareFactoryPage() alone are the "Abrir Project Builder →" chat hint
// (which immediately calls setSoftwareFactoryModule('project_builder') right
// after, masking this) and T3 (sf)'s tutorial steps (which only spotlight
// buttons, indifferent to home's content visibility). #vcSfModuleWorkspace
// itself was NOT moved — it stays a sibling of #vcCockpitView, so its own
// reset-on-open behavior (the actual point of this test: discarding prior
// module state) is completely unaffected and still verified below.
test('showSoftwareFactoryPage() always resets away from a stale module on open', async ({ page }) => {
  const workspace = page.locator('#vcSfModuleWorkspace');

  // ── Open SF (1st time) ──────────────────────────────────────────────────────
  await openSfPage(page);
  await expect(workspace).toBeHidden();

  // ── Navigate away from home to a module (simulates prior user activity) ────
  await page.evaluate(() => window.setSoftwareFactoryModule('mission_composer'));
  await expect(workspace).toBeVisible();

  // ── Leave SF without resetting state manually ───────────────────────────────
  await page.click('#vcSfBackBtn');
  await expect(page.locator('#vcSoftwareFactoryPage')).toBeHidden();

  // ── Reopen SF: reset happens automatically as part of navigate, no explicit
  //    "go home" action taken by the test — this is the side-effect under test ─
  await openSfPage(page);
  await expect(workspace).toBeHidden();

  // Module nav no longer shows the previously active module as active
  const missionBtn = page.locator('.vc-sf-module-btn[data-sf-module="mission_composer"]');
  await expect(missionBtn).not.toHaveClass(/\bactive\b/);
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
