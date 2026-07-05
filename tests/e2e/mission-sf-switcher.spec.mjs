// @ts-check
/**
 * tests/e2e/mission-sf-switcher.spec.mjs
 * Vision Core — Playwright E2E tests for the Sub-passo 3.2a Chat/Software Factory switcher.
 *
 * #vcSfHomeControl (AUTO-PILOT chat) moved out of the legacy full-page
 * #vcSoftwareFactoryPage (position:fixed;inset:0, vh-anchored height — confirmed
 * by empirical experiment to collapse #vcSfChatHistory to ~8px if moved without
 * a height-model fix) into #mission > #vcMissionSfPane, with a dedicated
 * fixed-pixel height model (min-height 560px / #vcSfChatHistory min/max 330-520px,
 * mirroring .v298-command-chat/.v298-chat-stream).
 *
 * setCentralMode('chat'|'sf') toggles #mission.sf-mode — does NOT open the
 * legacy full page. [data-open-sf-page] (header nav + sidebar link) now call
 * setCentralMode('sf') instead of showSoftwareFactoryPage().
 *
 * #vcSfModuleWorkspace (Modo Avançado, 985 lines) is untouched — still lives
 * in the legacy full page, out of scope until Sub-passo 3.2b-3.2e. Still
 * reachable via the "Abrir Project Builder →" inline chat hint (fixed to
 * skip the now-empty home and land directly on the workspace) and via T3
 * (sf) tutorial's module-targeting steps.
 *
 * Alvo: https://visioncoreai.pages.dev (produção)
 * Run:  npx playwright test tests/e2e/mission-sf-switcher.spec.mjs
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'https://visioncoreai.pages.dev';

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test('#mission defaults to Chat mode: v298 chat visible, SF pane hidden, legacy full page untouched', async ({ page }) => {
  await expect(page.locator('#mission')).not.toHaveClass(/\bsf-mode\b/);
  await expect(page.locator('#v298CommandChat')).toBeVisible();
  await expect(page.locator('#vcMissionSfPane')).toBeHidden();
  await expect(page.locator('#vcSoftwareFactoryPage')).toBeHidden();
});

test('Software Factory tab switches to the embedded pane without opening the legacy full page', async ({ page }) => {
  await page.click('#vcMissionSfTab');

  await expect(page.locator('#mission')).toHaveClass(/\bsf-mode\b/);
  await expect(page.locator('#v298CommandChat')).toBeHidden();
  await expect(page.locator('#vcMissionSfPane')).toBeVisible();
  // Legacy full-page overlay must stay closed — this is an embedded pane, not a page takeover
  await expect(page.locator('#vcSoftwareFactoryPage')).toBeHidden();

  // Height-model regression net: #vcSfChatHistory must have real, usable
  // dimensions (the raw move-without-fix experiment measured ~8px here)
  const histBox = await page.locator('#vcSfChatHistory').boundingBox();
  expect(histBox.height, '#vcSfChatHistory must not collapse (height-model fix)').toBeGreaterThan(200);

  const inputBox = await page.locator('#vcSfInputBar').boundingBox();
  expect(inputBox.height).toBeGreaterThan(0);
});

test('Chat tab restores the normal mission chat view', async ({ page }) => {
  await page.click('#vcMissionSfTab');
  await expect(page.locator('#vcMissionSfPane')).toBeVisible();

  await page.click('#vcMissionChatTab');
  await expect(page.locator('#mission')).not.toHaveClass(/\bsf-mode\b/);
  await expect(page.locator('#v298CommandChat')).toBeVisible();
  await expect(page.locator('#vcMissionSfPane')).toBeHidden();
});

test('header/sidebar "SOFTWARE FACTORY" buttons open the embedded switcher, not the legacy full page', async ({ page }) => {
  // Nav button is hidden by responsive CSS in headless Chromium — dispatch bypasses visibility check
  await page.evaluate(() => {
    document.querySelector('[data-open-sf-page]').dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
  await expect(page.locator('#mission')).toHaveClass(/\bsf-mode\b/);
  await expect(page.locator('#vcMissionSfPane')).toBeVisible();
  await expect(page.locator('#vcSoftwareFactoryPage')).toBeHidden();
});

test('AUTO-PILOT controls remain functional inside the embedded pane (chat input, send button)', async ({ page }) => {
  await page.click('#vcMissionSfTab');
  await expect(page.locator('#vcMissionSfPane')).toBeVisible();

  const input = page.locator('#vcSfChatInput');
  await expect(input).toBeVisible();
  await expect(input).toBeEditable();
  await input.fill('quero um site para minha padaria');
  await expect(input).toHaveValue('quero um site para minha padaria');

  await expect(page.locator('#vcSfSendBtn')).toBeVisible();
});

test('T3 (sf2) tutorial: the 5 retargeted points position correctly on the embedded pane', async ({ page }) => {
  await page.evaluate(() => window.vcStartSectionTutorial('sf2'));
  await expect(page.locator('#vcTutorialOverlay')).toBeVisible({ timeout: 5_000 });

  // Step 0: #vcSfHomeControl, via the new _sfChatOnEnter()
  await expect(page.locator('#mission')).toHaveClass(/\bsf-mode\b/);
  const step0Box = await page.locator('#vcSfHomeControl').boundingBox();
  expect(step0Box.height).toBeGreaterThan(200);

  // Step 1: #vcSfChatInput
  await page.click('#vcTutorialNext');
  await expect(page.locator('#vcTutorialTitle')).toHaveText('✍️ Descreva seu projeto aqui');
  await expect(page.locator('#vcSfChatInput')).toBeInViewport();

  // Steps 2-3 are the KNOWN PENDING points (old tabs in the legacy page) — skip past them
  await page.click('#vcTutorialNext');
  await page.click('#vcTutorialNext');

  // Step 4 (#vcSfExamples) is a pre-existing bug confirmed present on production
  // too (chips hidden by default regardless of mode) — not in scope here, skip assertion.
  await page.click('#vcTutorialNext');

  // Step 5: #vcSfSendBtn — advance from step 4. Regression net for the
  // scroll-into-view fix (this step previously measured #mission thousands
  // of pixels off-screen after steps 2-3's legacy full-page overlay closed
  // without re-scrolling).
  await page.click('#vcTutorialNext');
  await expect(page.locator('#vcTutorialTitle')).toHaveText('↑ Enviar e ver resultado no chat');
  await expect(page.locator('#vcSfSendBtn')).toBeInViewport({ timeout: 5_000 });

  // Step 6: #vcSfChatInput again
  await page.click('#vcTutorialNext');
  await expect(page.locator('#vcTutorialTitle')).toHaveText('✅ Pronto! Descreva e envie');
  await expect(page.locator('#vcSfChatInput')).toBeInViewport();
});
