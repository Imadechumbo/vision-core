// @ts-check
/**
 * tests/e2e/sf-gen-legacy-dom-independence.spec.mjs
 * Vision Core — Playwright E2E tests for the Sub-passo 3.3a guard fix.
 *
 * Found during the Fase 3 planning audit: renderMissionPrompt()/
 * renderWorkerHandoffPackage()/renderProjectExportPreview() each had an
 * `if (!output) { return; }` early-return BEFORE calling their build*()
 * function — meaning the 3 corresponding chat chips (Prompt de Missão,
 * Handoff, Export Preview) only computed a real value because the legacy
 * page's textarea (#vcMissionPromptOutput/#vcHandoffOutput/#vcExportOutput)
 * happened to still exist in the DOM (always present, just hidden via CSS,
 * since #projectBuilder is static HTML moved into the legacy page's mount
 * only when opened — never actually deleted). The other 3 generators
 * (real_file_command/worker_receipt/final_dashboard) never had this bug —
 * they already computed the value unconditionally, only guarding the
 * optional DOM *write*.
 *
 * Fix: reordered to match the already-safe pattern — compute first, then
 * optionally write to the legacy textarea if it exists. This is the
 * necessary precondition for Sub-passo 3.3d (removing the legacy page
 * entirely) not to silently break these 3 chips.
 *
 * This file proves the decoupling is real, not just a line reorder with no
 * practical effect: each test removes the specific legacy DOM element
 * BEFORE triggering the chip, and confirms the card still renders real
 * content — something that would have failed before this fix (the early
 * return would have produced an empty/undefined value).
 *
 * Alvo: https://visioncoreai.pages.dev (produção)
 * Run:  npx playwright test tests/e2e/sf-gen-legacy-dom-independence.spec.mjs
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'https://visioncoreai.pages.dev';

async function openSfPane(page) {
  await page.click('#vcMissionSfTab');
  await expect(page.locator('#vcMissionSfPane')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
  await openSfPane(page);
});

const CASES = [
  { gen: 'mission_composer',  legacyId: 'vcMissionPromptOutput' },
  { gen: 'worker_handoff',    legacyId: 'vcHandoffOutput' },
  { gen: 'export_preview',    legacyId: 'vcExportOutput' },
];

for (const { gen, legacyId } of CASES) {
  test(`"${gen}" chip still generates real content with #${legacyId} removed from the DOM entirely`, async ({ page }) => {
    // Confirm the legacy element genuinely exists before removing it —
    // otherwise this test would trivially "pass" for the wrong reason.
    const existedBefore = await page.evaluate((id) => !!document.getElementById(id), legacyId);
    expect(existedBefore, `#${legacyId} should exist in the DOM before this test removes it`).toBe(true);

    await page.evaluate((id) => { document.getElementById(id)?.remove(); }, legacyId);
    await expect(page.locator(`#${legacyId}`)).toHaveCount(0);

    await page.click(`#vcSfGenChips [data-gen="${gen}"]`);

    const card = page.locator(`.vc-gen-card[data-gen-id="${gen}"]`);
    await expect(card).toBeVisible();
    const bodyText = await card.locator('.vc-gen-card-body').inputValue();
    expect(bodyText.length, 'card body should contain real generated text, not empty/undefined').toBeGreaterThan(0);
    expect(bodyText).not.toContain('undefined');
  });
}

test('all 3 chips still work normally together when the legacy DOM is fully intact (regression net)', async ({ page }) => {
  for (const { gen } of CASES) {
    await page.click(`#vcSfGenChips [data-gen="${gen}"]`);
    const card = page.locator(`.vc-gen-card[data-gen-id="${gen}"]`);
    await expect(card).toBeVisible();
    expect((await card.locator('.vc-gen-card-body').inputValue()).length).toBeGreaterThan(0);
  }
});
