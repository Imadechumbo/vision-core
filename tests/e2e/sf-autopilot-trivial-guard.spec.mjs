// @ts-check
/**
 * tests/e2e/sf-autopilot-trivial-guard.spec.mjs
 * Vision Core — Playwright E2E tests for the trivial-input cost safeguard
 * on AUTO-PILOT (stop-the-bleeding fix, urgent).
 *
 * Found live in production: sending "oi" in the Software Factory tab fired
 * the full 7-module pipeline (each module a real LLM call via callLLM()),
 * ending in a "Gold Gate Checker" with all 4 SDDF gates run — for a
 * one-word greeting. Confirmed by code reading: runSfAutoPilot() (the
 * function AUTO-PILOT mode calls unconditionally from handleSfSend()) had
 * ZERO validation between the raw typed text and firing the pipeline —
 * "qualquer texto = rodar pipeline completo".
 *
 * Not a Fase 2 (Sub-passo 3.2a-3.2f) regression: a minimum-length guard
 * (10 chars) already existed, but on a click handler for #vcSfAutoPilotBtn
 * — a button that no longer exists in index.html since the §164 chat
 * redesign (predates Fase 2 entirely) replaced it with
 * #vcSfSendBtn/handleSfSend(). The guard was orphaned, not carried over.
 *
 * Fix: _sfIsTrivialInput() at the very top of runSfAutoPilot() itself
 * (not in handleSfSend()) — protects all 3 real call sites in one place.
 * Blocks text under 20 chars OR an exact match against a short greeting
 * list, replying with a request for more detail INSTEAD of running any
 * module. Deliberately not sophisticated intent detection — just stops the
 * obvious trivial case before spending real money. A follow-up sub-passo
 * may reuse /api/architect/interpret (already used in the main chat) for
 * real intent detection.
 *
 * Alvo: https://visioncoreai.pages.dev (produção)
 * Run:  npx playwright test tests/e2e/sf-autopilot-trivial-guard.spec.mjs
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

const TRIVIAL_INPUTS = ['oi', 'olá', 'teste', 'oi tudo bem', 'bom dia'];

for (const input of TRIVIAL_INPUTS) {
  test(`trivial input "${input}" asks for more detail instead of firing AUTO-PILOT`, async ({ page }) => {
    await page.locator('#vcSfChatInput').fill(input);
    await page.click('#vcSfSendBtn');

    await expect(page.locator('#vcSfChatHistory')).toContainText('Me conta um pouco mais sobre o projeto', { timeout: 5_000 });
    await expect(page.locator('#vcSfChatHistory')).not.toContainText('Arquiteto analisando');
    await expect(page.locator('#vcSfAutoPilotProgress')).toBeHidden();
  });
}

test('real project description still fires AUTO-PILOT normally — the guard does not block legitimate requests', async ({ page }) => {
  await page.locator('#vcSfChatInput').fill('quero criar uma API REST para gerenciar tarefas com autenticação JWT');
  await page.click('#vcSfSendBtn');

  await expect(page.locator('#vcSfChatHistory')).toContainText('Arquiteto analisando', { timeout: 5_000 });
  await expect(page.locator('#vcSfChatHistory')).not.toContainText('Me conta um pouco mais sobre o projeto');
  await expect(page.locator('#vcSfAutoPilotProgress')).toBeVisible();
});

test('a short but real request ("quero um site para minha padaria", 32 chars) still fires AUTO-PILOT', async ({ page }) => {
  await page.locator('#vcSfChatInput').fill('quero um site para minha padaria');
  await page.click('#vcSfSendBtn');

  await expect(page.locator('#vcSfChatHistory')).toContainText('Arquiteto analisando', { timeout: 5_000 });
  await expect(page.locator('#vcSfAutoPilotProgress')).toBeVisible();
});
