// @ts-check
/**
 * tests/e2e/gen-card-chat-triggers.spec.mjs
 * Vision Core — Playwright E2E tests for the REAL Sub-passo 3.2c: the 6
 * generators (I/J/K/M/N/O) invoked from inside the embedded chat
 * (#vcMissionSfPane), not the legacy #projectBuilder panels.
 *
 * Scope correction: an earlier version of 3.2c (commit a43e0663) only
 * reskinned the panels in place inside #projectBuilder — the user corrected
 * this after the fact: the generators must be genuinely reachable from the
 * chat, consistent with the "reconstrução completa, sem página legada"
 * decision made before Sub-passo 3.2a. That commit's HTML changes were
 * reverted; only its .vc-gen-card CSS survives, reused here as the visual
 * skin of the chat response card. The 6 build*()/render*() functions
 * themselves are UNCHANGED — this only adds a new caller.
 *
 * Mechanism (approved by the user — Opção C, built as a whole, not phased):
 * - 6 explicit chips above the chat input (#vcSfGenChips) — same visual
 *   pattern as the pre-existing 3 example chips.
 * - A local Portuguese keyword map (GEN_KEYWORDS) — if free text typed by
 *   the user matches, it fires the exact same trigger function the chip
 *   uses (triggerGenCard), never a separate/duplicated code path.
 * - 5 of 6 generators fire immediately with their existing sensible
 *   defaults (claude_code / full_mission / folder_tree / etc.) — no
 *   pre-generation form. Worker Result Receipt (N) is the one exception:
 *   it has no default-able input (a real external report has to be pasted),
 *   so it asks a conversational follow-up question first.
 * - Each generated card gets an inline "trocar X ▾" select in its footer
 *   that regenerates the SAME card in place (never appends a duplicate).
 *
 * Alvo: https://visioncoreai.pages.dev (produção)
 * Run:  npx playwright test tests/e2e/gen-card-chat-triggers.spec.mjs
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

const SIMPLE_CASES = [
  { gen: 'mission_composer',  title: '📝 Prompt de Missão' },
  { gen: 'worker_handoff',    title: '📦 Pacote de Handoff' },
  { gen: 'export_preview',    title: '👁 Export Preview' },
  { gen: 'real_file_command', title: '⚙ Comando Real' },
];

for (const { gen, title } of SIMPLE_CASES) {
  test(`chip "${gen}": generates its card in the chat stream with the default state, no form needed`, async ({ page }) => {
    await page.click(`#vcSfGenChips [data-gen="${gen}"]`);
    const card = page.locator(`.vc-gen-card[data-gen-id="${gen}"]`);
    await expect(card).toBeVisible();
    await expect(card.locator('.vc-gen-card-title')).toHaveText(title);
    const body = card.locator('.vc-gen-card-body');
    expect((await body.inputValue()).length).toBeGreaterThan(0);
    // Card must live inside the chat history stream, not a legacy panel
    await expect(page.locator('#vcSfChatHistory .vc-gen-card').first()).toBeVisible();
  });
}

test('chip "final_dashboard": generates its card after the real async backend status check', async ({ page }) => {
  await page.click('#vcSfGenChips [data-gen="final_dashboard"]');
  const card = page.locator('.vc-gen-card[data-gen-id="final_dashboard"]');
  await expect(card).toBeVisible();
  const body = card.locator('.vc-gen-card-body');
  await expect(body).not.toHaveValue('⏳ Consultando backend...', { timeout: 10_000 });
  expect((await body.inputValue()).length).toBeGreaterThan(0);
});

test('chip "worker_receipt": asks for the pasted report BEFORE generating — no default bypasses real content', async ({ page }) => {
  await page.click('#vcSfGenChips [data-gen="worker_receipt"]');

  await expect(page.locator('#vcSfChatHistory')).toContainText('Cole o relatório do worker');
  await expect(page.locator('.vc-gen-card[data-gen-id="worker_receipt"]')).toHaveCount(0);

  await page.locator('#vcSfChatInput').fill('Testes 100% passando. Build OK. Deploy realizado com sucesso.');
  await page.click('#vcSfSendBtn');

  const card = page.locator('.vc-gen-card[data-gen-id="worker_receipt"]');
  await expect(card).toBeVisible();
  expect((await card.locator('.vc-gen-card-body').inputValue()).length).toBeGreaterThan(0);
});

test('keyword "gera o pacote de handoff pro Claude Code": fires the SAME trigger as the chip — identical output, not a reimplementation', async ({ page }) => {
  await page.click('#vcSfGenChips [data-gen="worker_handoff"]');
  const chipCard = page.locator('.vc-gen-card[data-gen-id="worker_handoff"]');
  await expect(chipCard).toBeVisible();
  const chipText = await chipCard.locator('.vc-gen-card-body').inputValue();

  await page.locator('#vcSfChatInput').fill('gera o pacote de handoff pro Claude Code');
  await page.click('#vcSfSendBtn');

  const cards = page.locator('.vc-gen-card[data-gen-id="worker_handoff"]');
  await expect(cards).toHaveCount(2);
  const keywordText = await cards.nth(1).locator('.vc-gen-card-body').inputValue();
  expect(keywordText).toBe(chipText);
});

test('keyword "gera o relatório final do produto": routes to the generator trigger, never falls through to the free-form Arquiteto chat', async ({ page }) => {
  await page.locator('#vcSfChatInput').fill('gera o relatório final do produto');
  await page.click('#vcSfSendBtn');

  const card = page.locator('.vc-gen-card[data-gen-id="final_dashboard"]');
  await expect(card).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#vcSfChatHistory')).not.toContainText('arquiteto analisando');
});

test('inline "trocar alvo" control regenerates the SAME card in place — no duplicate card, content actually changes', async ({ page }) => {
  await page.click('#vcSfGenChips [data-gen="worker_handoff"]');
  const cards = page.locator('.vc-gen-card[data-gen-id="worker_handoff"]');
  await expect(cards).toHaveCount(1);

  const card = cards.first();
  const body = card.locator('.vc-gen-card-body');
  const select = card.locator('.vc-gen-card-change-select');
  await expect(select).toBeVisible();

  const originalValue = await select.inputValue();
  const originalText = await body.inputValue();
  const optionValues = await select.locator('option').evaluateAll((els) => els.map((e) => e.value));
  const otherValue = optionValues.find((v) => v !== originalValue);
  expect(otherValue, 'change control should offer at least 2 real options').toBeTruthy();

  await select.selectOption(otherValue);

  await expect(cards).toHaveCount(1); // still just one card — regenerated, not duplicated
  await expect(select).toHaveValue(otherValue);
  const newText = await body.inputValue();
  expect(newText).not.toBe(originalText); // the swapped target is reflected in the generated text
});
