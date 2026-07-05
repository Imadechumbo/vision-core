// @ts-check
/**
 * tests/e2e/human-approval-card.spec.mjs
 * Vision Core — Playwright E2E tests for the Sub-passo 3.2e simplified
 * Human Approval Gate.
 *
 * Before: Section L was a checklist of 12 acknowledgement checkboxes + a
 * grid of 12 "locked capability" cards + a generated-receipt textarea with
 * copy/clear/reset buttons — none of it reachable from the live chat-based
 * UI (it lived inside the abandoned legacy #projectBuilder page). Confirmed
 * via code reading before implementing that this wasn't 100% cosmetic:
 * isHumanApprovalGateReadyForCommand() (= "all 12 acks checked") is read by
 * generator M ("⚙ Comando Real") to decide a STATUS line
 * (READY/BLOCKED) in the generated command package text, and by generator O
 * ("📊 Relatório Final")'s artifact-readiness list. Both are live via the
 * 3.2c chat chips.
 *
 * Mechanism chosen without a response to the clarifying question within
 * 60s (three-option choice: chat card / blocking modal before "⚙ Comando
 * Real" / drawer) — went with the explicitly recommended, lowest-risk
 * option: a card in the chat stream (same #vcSfChatHistory + .vc-gen-card
 * visual family as the 6 generators), NOT a blocking modal — it does not
 * change today's behavior (the command package always generated regardless
 * of gate state; this preserves that, only the STATUS text differs).
 *
 * The 12 acknowledgements' real substance (review the artifacts + understand
 * the boundaries) is preserved in ONE honest sentence + ONE confirm button —
 * not a rubber-stamp, not silently hardcoded true.
 *
 * Alvo: https://visioncoreai.pages.dev (produção)
 * Run:  npx playwright test tests/e2e/human-approval-card.spec.mjs
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

test('"🔒 Aprovação Humana" inserts a card with the confirmation sentence and an enabled Confirm button', async ({ page }) => {
  await page.click('#vcOpenHumanApprovalCardBtn');

  const card = page.locator('.vc-gen-card[data-gen-id="human_approval"]');
  await expect(card).toBeVisible();
  await expect(card.locator('.vc-gen-card-title')).toHaveText('🔒 Aprovação Humana');
  await expect(card.locator('.vc-human-approval-card-body')).toContainText('NÃO cria arquivos');
  await expect(card.locator('.vc-human-approval-card-body')).toContainText('evidência local');

  const confirmBtn = card.locator('.vc-gen-card-copy');
  await expect(confirmBtn).toHaveText('✅ Confirmar');
  await expect(confirmBtn).toBeEnabled();
});

test('clicking Confirm marks the card as confirmed and disables the button', async ({ page }) => {
  await page.click('#vcOpenHumanApprovalCardBtn');
  const card = page.locator('.vc-gen-card[data-gen-id="human_approval"]');
  const confirmBtn = card.locator('.vc-gen-card-copy');

  await confirmBtn.click();
  await expect(confirmBtn).toHaveText('✅ Confirmado');
  await expect(confirmBtn).toBeDisabled();
});

test('BEFORE confirming: generator M ("⚙ Comando Real") reports STATUS BLOCKED', async ({ page }) => {
  await page.click('#vcSfGenChips [data-gen="real_file_command"]');
  const body = page.locator('.vc-gen-card[data-gen-id="real_file_command"] .vc-gen-card-body');
  // .vc-gen-card-body is a <textarea> — its rendered text lives in .value,
  // not .textContent, so toContainText() (DOM text) always reads empty here.
  expect(await body.inputValue()).toContain('BLOCKED UNTIL HUMAN APPROVAL GATE READY');
});

test('AFTER confirming: generator M ("⚙ Comando Real") reports STATUS READY — real external contract preserved', async ({ page }) => {
  await page.click('#vcOpenHumanApprovalCardBtn');
  await page.locator('.vc-gen-card[data-gen-id="human_approval"] .vc-gen-card-copy').click();

  await page.click('#vcSfGenChips [data-gen="real_file_command"]');
  const body = page.locator('.vc-gen-card[data-gen-id="real_file_command"] .vc-gen-card-body');
  expect(await body.inputValue()).toContain('READY FOR EXTERNAL HUMAN-CONTROLLED WORKER');
});

test('AFTER confirming: generator O ("📊 Relatório Final") artifact-readiness line flips from WAITING to READY', async ({ page }) => {
  await page.click('#vcOpenHumanApprovalCardBtn');
  await page.locator('.vc-gen-card[data-gen-id="human_approval"] .vc-gen-card-copy').click();

  await page.click('#vcSfGenChips [data-gen="final_dashboard"]');
  const body = page.locator('.vc-gen-card[data-gen-id="final_dashboard"] .vc-gen-card-body');
  await expect(body).not.toHaveValue('⏳ Consultando backend...', { timeout: 10_000 });
  expect(await body.inputValue()).toContain('Human Approval Confirmed — READY');
});

test('re-triggering the card after already confirmed shows it pre-confirmed — no re-asking, no false reset', async ({ page }) => {
  await page.click('#vcOpenHumanApprovalCardBtn');
  await page.locator('.vc-gen-card[data-gen-id="human_approval"] .vc-gen-card-copy').first().click();

  // Trigger a second card (module-level flag persists across cards)
  await page.click('#vcOpenHumanApprovalCardBtn');
  const cards = page.locator('.vc-gen-card[data-gen-id="human_approval"]');
  await expect(cards).toHaveCount(2);
  const secondConfirmBtn = cards.nth(1).locator('.vc-gen-card-copy');
  await expect(secondConfirmBtn).toHaveText('✅ Confirmado');
  await expect(secondConfirmBtn).toBeDisabled();
});
