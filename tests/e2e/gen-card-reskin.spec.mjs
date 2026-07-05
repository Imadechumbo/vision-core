// @ts-check
/**
 * tests/e2e/gen-card-reskin.spec.mjs
 * Vision Core — Playwright E2E tests for the Sub-passo 3.2c "cards de chat" reskin.
 *
 * Scope confirmed with the user before implementing (no response within 60s on
 * the clarifying question, proceeded on best judgment matching the original
 * Fase D framing: "mecânico/repetitivo... uma vez que o card existe pra um,
 * replica pros outros 6 rapidamente" — i.e. a visual-only reskin, same location
 * (#projectBuilder / Modo Avançado), same trigger (GERAR button), NOT a move
 * into the #mission-embedded chat (that would require deciding how the chat
 * knows which generator to fire and what feeds type/stack/size without
 * Sections A-D — explicitly deferred to Sub-passo 3.2e).
 *
 * 6 of the 7 generator sections (I/J/K/M/N/O) had the "textarea + GERAR/COPIAR/
 * LIMPAR" pattern reskinned into a bordered "chat card" (dark gradient,
 * inline copy button in the header, matching the card look already used
 * elsewhere in the app) — same IDs, same click handlers, only the physical
 * location of the copy button and the wrapping markup changed. Section G was
 * left untouched: #vcLocalPlanOutput already had its own card-style border/
 * background (confirmed by reading its CSS before deciding — no need to wrap
 * something that's already a card).
 *
 * Alvo: https://visioncoreai.pages.dev (produção)
 * Run:  npx playwright test tests/e2e/gen-card-reskin.spec.mjs
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'https://visioncoreai.pages.dev';

async function openLegacyFullPage(page) {
  await page.evaluate(() => window.showSoftwareFactoryPage());
  await page.waitForSelector('#vcSoftwareFactoryPage', { state: 'visible', timeout: 8_000 });
}

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test('Section I (Mission Composer): generate/copy/clear still work after the reskin', async ({ context, page }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openLegacyFullPage(page);
  await page.evaluate(() => window.setSoftwareFactoryModule('mission_composer'));

  await page.click('#vcGenerateMissionBtn');
  const output = page.locator('#vcMissionPromptOutput');
  await expect(output).not.toHaveClass(/empty/);
  const generatedLen = (await output.inputValue()).length;
  expect(generatedLen).toBeGreaterThan(0);

  // Copy button now lives inside the card's header, not the action row —
  // same id, same handler, must still work.
  const copyBtn = page.locator('#vcCopyMissionBtn');
  await expect(copyBtn).toBeVisible();
  const insideHeader = await page.evaluate(() =>
    !!document.getElementById('vcCopyMissionBtn').closest('.vc-generated-prompt-header')
  );
  expect(insideHeader).toBe(true);
  await copyBtn.click();
  await expect(page.locator('#vcCopyStatus')).toHaveClass(/visible/);
  await expect(page.locator('#vcCopyStatus')).not.toHaveClass(/error/);

  await page.click('#vcClearMissionBtn');
  await expect(output).toHaveClass(/empty/);
});

test('all 6 reskinned sections (I/J/K/M/N/O): copy button moved into the card header, wrapped in .vc-gen-card', async ({ page }) => {
  await openLegacyFullPage(page);

  const cases = [
    { copyBtnId: 'vcCopyMissionBtn',      headerClass: '.vc-generated-prompt-header' },
    { copyBtnId: 'vcCopyHandoffBtn',      headerClass: '.vc-handoff-preview-header' },
    { copyBtnId: 'vcCopyExportBtn',       headerClass: '.vc-export-output-header' },
    { copyBtnId: 'vcCopyCommandPkgBtn',   headerClass: '.vc-real-command-output-header' },
    { copyBtnId: 'vcCopyEvidenceReceiptBtn', headerClass: '.vc-result-output-header' },
    { copyBtnId: 'vcCopyFinalReportBtn',  headerClass: '.vc-final-output-header' },
  ];

  for (const { copyBtnId, headerClass } of cases) {
    const result = await page.evaluate(({ copyBtnId, headerClass }) => {
      const btn = document.getElementById(copyBtnId);
      if (!btn) return { found: false };
      return {
        found: true,
        insideHeader: !!btn.closest(headerClass),
        insideGenCard: !!btn.closest('.vc-gen-card'),
        hasCopyClass: btn.classList.contains('vc-gen-card-copy'),
      };
    }, { copyBtnId, headerClass });
    expect(result.found, `${copyBtnId} should exist`).toBe(true);
    expect(result.insideHeader, `${copyBtnId} should be inside ${headerClass}`).toBe(true);
    expect(result.insideGenCard, `${copyBtnId} should be inside .vc-gen-card`).toBe(true);
    expect(result.hasCopyClass, `${copyBtnId} should have .vc-gen-card-copy`).toBe(true);
  }
});

test('Section G (Local Mission Plan) left untouched — already had its own card styling', async ({ page }) => {
  await openLegacyFullPage(page);
  const output = page.locator('#vcLocalPlanOutput');
  await expect(output).toHaveCount(1);
  // Not wrapped in the new .vc-gen-card — deliberately, per its own pre-existing border/background.
  const wrapped = await page.evaluate(() => !!document.getElementById('vcLocalPlanOutput').closest('.vc-gen-card'));
  expect(wrapped).toBe(false);
});
