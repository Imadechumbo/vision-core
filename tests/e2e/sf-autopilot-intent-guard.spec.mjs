// @ts-check
/**
 * tests/e2e/sf-autopilot-intent-guard.spec.mjs
 * Vision Core — Playwright E2E tests for the 2nd layer of the AUTO-PILOT
 * cost safeguard: real intent classification via /api/architect/interpret.
 *
 * Layer 1 (sf-autopilot-trivial-guard.spec.mjs, already shipped): free,
 * synchronous, catches the obvious case ("oi", <20 chars). Layer 2 (this
 * file): reuses /api/architect/interpret — the SAME endpoint already used
 * by the §81 hint in the main chat, not a new endpoint — to catch
 * non-trivial-looking text that still isn't a real project description
 * (e.g. "isso é só um teste do sistema, ignora" — 34 chars, passes Layer 1,
 * but isn't a real request).
 *
 * Threshold (0.6) matches the backend's own CONFIDENCE_THRESHOLD constant
 * (server.js) — the same number the backend already uses to decide
 * between returning specs_suggested or open_questions. Not an arbitrary
 * new number.
 *
 * Adjacent finding (documented in code, not fixed here — out of scope):
 * the existing §81 hint reads `cls.intent`, a field that does not exist
 * anywhere in the backend response or the architect-system.md prompt
 * schema — that condition is always true, so the hint never shows for any
 * message (the network call still fires and costs real money, the result
 * is just discarded). This file's guard reads `classification.confidence`
 * (a real field) instead — not the same broken pattern.
 *
 * All backend responses are mocked via page.route() — zero real LLM calls
 * made by running this test file.
 *
 * Alvo: https://visioncoreai.pages.dev (produção)
 * Run:  npx playwright test tests/e2e/sf-autopilot-intent-guard.spec.mjs
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'https://visioncoreai.pages.dev';

async function openSfPane(page) {
  await page.click('#vcMissionSfTab');
  await expect(page.locator('#vcMissionSfPane')).toBeVisible();
}

async function mockInterpret(page, responseBody, status = 200) {
  await page.route('**/api/architect/interpret', (route) => {
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(responseBody) });
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
  await openSfPane(page);
});

test('high confidence (>= 0.6): proceeds to AUTO-PILOT normally', async ({ page }) => {
  await mockInterpret(page, {
    ok: true,
    classification: { project_type: 'API REST', confidence: 0.75, open_questions: [] }
  });

  await page.locator('#vcSfChatInput').fill('quero criar uma API REST para gerenciar tarefas com autenticação JWT');
  await page.click('#vcSfSendBtn');

  // "Verificando sua descrição..." is a transient typing indicator, removed
  // as soon as the mocked response resolves — not asserted here since it's
  // inherently racy to catch (may already be gone by the time we check).
  await expect(page.locator('#vcSfChatHistory')).toContainText('Arquiteto analisando', { timeout: 5_000 });
  await expect(page.locator('#vcSfAutoPilotProgress')).toBeVisible();
});

test('low confidence (< 0.6) WITH open_questions: shows the LLM\'s own clarifying questions, does not fire the pipeline', async ({ page }) => {
  await mockInterpret(page, {
    ok: true,
    classification: { project_type: null, confidence: 0.2, open_questions: [] },
    open_questions: ['Que tipo de sistema você imagina?', 'Já tem uma stack em mente?']
  });

  await page.locator('#vcSfChatInput').fill('isso é só um teste do sistema, ignora esse texto aqui por favor');
  await page.click('#vcSfSendBtn');

  await expect(page.locator('#vcSfChatHistory')).toContainText('Ainda não captei uma descrição clara de projeto');
  await expect(page.locator('#vcSfChatHistory')).toContainText('Que tipo de sistema você imagina?');
  await expect(page.locator('#vcSfChatHistory')).not.toContainText('Arquiteto analisando');
  await expect(page.locator('#vcSfAutoPilotProgress')).toBeHidden();
});

test('low confidence WITHOUT open_questions: falls back to a generic clarifying message', async ({ page }) => {
  await mockInterpret(page, {
    ok: true,
    classification: { project_type: null, confidence: 0.1, open_questions: [] },
    open_questions: []
  });

  await page.locator('#vcSfChatInput').fill('preciso de uma coisa mas nao sei bem o que ainda');
  await page.click('#vcSfSendBtn');

  await expect(page.locator('#vcSfChatHistory')).toContainText('Pode detalhar melhor o tipo de projeto');
  await expect(page.locator('#vcSfChatHistory')).not.toContainText('Arquiteto analisando');
});

test('backend error (500): fails open — proceeds to AUTO-PILOT rather than blocking a legitimate request', async ({ page }) => {
  await mockInterpret(page, { ok: false, error: 'all_providers_exhausted' }, 500);

  await page.locator('#vcSfChatInput').fill('quero um marketplace de produtos artesanais com carrinho e checkout');
  await page.click('#vcSfSendBtn');

  await expect(page.locator('#vcSfChatHistory')).toContainText('Arquiteto analisando', { timeout: 5_000 });
  await expect(page.locator('#vcSfAutoPilotProgress')).toBeVisible();
});

test('network failure (aborted request): fails open — proceeds to AUTO-PILOT', async ({ page }) => {
  await page.route('**/api/architect/interpret', (route) => route.abort('failed'));

  await page.locator('#vcSfChatInput').fill('quero um sistema de agendamento para clínicas com lembretes por email');
  await page.click('#vcSfSendBtn');

  await expect(page.locator('#vcSfChatHistory')).toContainText('Arquiteto analisando', { timeout: 5_000 });
  await expect(page.locator('#vcSfAutoPilotProgress')).toBeVisible();
});

test('trivial input (Layer 1) never reaches Layer 2 — zero calls to /api/architect/interpret', async ({ page }) => {
  let interceptCount = 0;
  await page.route('**/api/architect/interpret', (route) => { interceptCount++; route.continue(); });

  await page.locator('#vcSfChatInput').fill('oi');
  await page.click('#vcSfSendBtn');

  await expect(page.locator('#vcSfChatHistory')).toContainText('Me conta um pouco mais sobre o projeto');
  expect(interceptCount).toBe(0);
});
