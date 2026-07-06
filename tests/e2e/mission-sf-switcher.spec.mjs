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

test('T3 (sf2) tutorial: all 7 steps position correctly, chips become genuinely visible, tab restores afterward (Sub-passo 3.2f + 3.3b)', async ({ page }) => {
  await page.evaluate(() => window.vcStartSectionTutorial('sf2'));
  await expect(page.locator('#vcTutorialOverlay')).toBeVisible({ timeout: 5_000 });

  // Sanity: tour starts from the real default — AUTO-PILOT active, chips hidden
  await expect(page.locator('#vcSfTabAutopilot')).toHaveClass(/\bactive\b/);
  await expect(page.locator('#vcSfExamples')).toBeHidden();

  // Step 0: #vcSfHomeControl, via _sfChatOnEnter()
  await expect(page.locator('#mission')).toHaveClass(/\bsf-mode\b/);
  const step0Box = await page.locator('#vcSfHomeControl').boundingBox();
  expect(step0Box.height).toBeGreaterThan(200);

  // Step 1: #vcSfChatInput
  await page.click('#vcTutorialNext');
  await expect(page.locator('#vcTutorialTitle')).toHaveText('✍️ Descreva seu projeto aqui');
  await expect(page.locator('#vcSfChatInput')).toBeInViewport();

  // Step 2 (Sub-passo 3.2f): consolidates the old PENDING "AUTO-PILOT tab"/
  // "MODO AVANÇADO tab" steps — #vcSfTabAutopilot/#vcSfTabAdvanced never
  // left the legacy page header, no 1:1 equivalent in the embedded UI.
  // #vcSfGenChips (always visible regardless of mode) is the real
  // functional equivalent of the old "MODO AVANÇADO" (manual control).
  await page.click('#vcTutorialNext');
  await expect(page.locator('#vcTutorialTitle')).toHaveText('🚀 Automático por padrão, manual quando você quiser');
  await expect(page.locator('#vcSfGenChips')).toBeInViewport();

  // Step 3 (Sub-passo 3.3b): NEW — .vc-sf-templates-trigger (Templates/
  // Ajustar Manualmente/Aprovação Humana) never had tutorial coverage since
  // the 2 drawers (3.2d/3.2e) and the approval card (3.2e) shipped. Content
  // gap closed before exposing this tutorial for the first time. Always
  // visible regardless of AUTO-PILOT/MODO AVANÇADO tab.
  await page.click('#vcTutorialNext');
  await expect(page.locator('#vcTutorialTitle')).toHaveText('📐 Templates, ajustes manuais e aprovação');
  await expect(page.locator('.vc-sf-templates-trigger')).toBeVisible();
  await expect(page.locator('.vc-sf-templates-trigger')).toBeInViewport();
  await expect(page.locator('#vcOpenTemplateDrawerBtn')).toBeVisible();
  await expect(page.locator('#vcOpenManualAdjustDrawerBtn')).toBeVisible();
  await expect(page.locator('#vcOpenHumanApprovalCardBtn')).toBeVisible();

  // Step 4: #vcSfExamples — pre-existing production bug fixed in 3.2f.
  // _sfExamplesOnEnter() forces MODO AVANÇADO active (real .click(), same
  // listener a user would trigger) so the chips are genuinely visible for
  // the spotlight, not just structurally present.
  await page.click('#vcTutorialNext');
  await expect(page.locator('#vcTutorialTitle')).toHaveText('📋 Chips de exemplo — clique para preencher');
  await expect(page.locator('#vcSfTabAdvanced')).toHaveClass(/\bactive\b/);
  await expect(page.locator('#vcSfExamples')).toBeVisible();
  await expect(page.locator('#vcSfExamples')).toBeInViewport();

  // Step 5: #vcSfSendBtn — _sfRestoreTabOnEnter() undoes the forced switch:
  // the tour must not leave the user stuck in a tab they didn't choose.
  await page.click('#vcTutorialNext');
  await expect(page.locator('#vcTutorialTitle')).toHaveText('↑ Enviar e ver resultado no chat');
  await expect(page.locator('#vcSfSendBtn')).toBeInViewport({ timeout: 5_000 });
  await expect(page.locator('#vcSfTabAutopilot')).toHaveClass(/\bactive\b/);
  await expect(page.locator('#vcSfExamples')).toBeHidden();

  // Step 6: #vcSfChatInput again — last step, tour closes cleanly
  await page.click('#vcTutorialNext');
  await expect(page.locator('#vcTutorialTitle')).toHaveText('✅ Pronto! Descreva e envie');
  await expect(page.locator('#vcSfChatInput')).toBeInViewport();
  await expect(page.locator('#vcTutorialNext')).toHaveText('Fechar');
  await page.click('#vcTutorialNext');
  await expect(page.locator('#vcTutorialOverlay')).toBeHidden();
});

test('T3 (sf2) tutorial: does NOT restore the tab if the user had already switched to MODO AVANÇADO before starting the tour', async ({ page }) => {
  // Simulate a user who had already manually switched tabs before opening the tour
  await page.click('#vcMissionSfTab');
  await page.evaluate(() => document.getElementById('vcSfTabAdvanced').click());
  await expect(page.locator('#vcSfTabAdvanced')).toHaveClass(/\bactive\b/);

  await page.evaluate(() => window.vcStartSectionTutorial('sf2'));
  await expect(page.locator('#vcTutorialOverlay')).toBeVisible({ timeout: 5_000 });

  await page.click('#vcTutorialNext'); // step 1
  await page.click('#vcTutorialNext'); // step 2
  await page.click('#vcTutorialNext'); // step 3 (templates/manual/approval — new in 3.3b)
  await page.click('#vcTutorialNext'); // step 4 (chips) — already MODO AVANÇADO, no switch needed
  await page.click('#vcTutorialNext'); // step 5 (restore point)

  // The tour never switched the tab (it was already like this) — must not touch it either
  await expect(page.locator('#vcSfTabAdvanced')).toHaveClass(/\bactive\b/);
});

test('T3 (sf2) tutorial: the "Software factory" sidebar menu item now triggers sf2, not the retired sf tutorial (Sub-passo 3.3b)', async ({ page }) => {
  // STEPS_SF ('sf') was removed entirely — vcStartSectionTutorial('sf')
  // must no longer do anything (console.warn + no-op), confirming the
  // retirement is real, not just unreachable-but-still-registered.
  const warnings = [];
  page.on('console', (msg) => { if (msg.type() === 'warning') warnings.push(msg.text()); });
  await page.evaluate(() => window.vcStartSectionTutorial('sf'));
  await expect(page.locator('#vcTutorialOverlay')).toBeHidden();

  // The real sidebar menu item triggers 'sf2' now
  await page.evaluate(() => {
    document.querySelector('a.vc-tut-item[onclick*="sf2"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
  await expect(page.locator('#vcTutorialOverlay')).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('#vcTutorialTitle')).toHaveText('🏭 Software Factory — seu assistente de projetos');
});
