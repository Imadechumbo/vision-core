// @ts-check
/**
 * tests/e2e/main-chat-architect-hint.spec.mjs
 * Vision Core — Playwright E2E tests for the §81 "Abrir Project Builder →"
 * hint fix in the MAIN cockpit chat (#v298CommandChat, not the SF chat).
 *
 * Bug found and confirmed: the hint's condition read `cls.intent`, a field
 * that never existed anywhere — not in the backend response
 * (server.js's /api/architect/interpret), not in the LLM's own JSON schema
 * (architect-system.md: project_type/stack/tags/confidence/explanation/
 * open_questions — no "intent"). `cls.intent !== 'create'` was always
 * true, so the hint NEVER rendered for any message, ever, since it shipped
 * (§81, commit 960d09a7, 2026-06-14) — but the network call still fired
 * and cost a real LLM call (callHermes(), same multi-provider chain as
 * every other LLM endpoint) on every single main-chat message, for zero
 * user-facing benefit.
 *
 * Fix: read classification.confidence (real field) against the same 0.6
 * threshold already used by the SF AUTO-PILOT guard's Layer 2 (itself
 * matching the backend's own CONFIDENCE_THRESHOLD constant) + require
 * project_type to be non-empty as a sanity check that this is really a
 * project description, not just a confident-sounding non-answer.
 *
 * THIS IS NEW OBSERVABLE BEHAVIOR, not just a bug fix — the hint has never
 * rendered in production before. Its button also needed a retarget: it
 * called showSoftwareFactoryPage() (the legacy full-page overlay) directly
 * — that click path was never exercised before either (dead code behind
 * the always-true condition), so it never got updated during the 3.2a-3.2f
 * retargeting work. Now points to setCentralMode('sf') — the embedded
 * switcher inside #mission, same path used by every real
 * [data-open-sf-page] button since Sub-passo 3.2a.
 *
 * All /api/chat and /api/architect/interpret responses are mocked via
 * page.route() — zero real LLM calls made by running this test file.
 *
 * Alvo: https://visioncoreai.pages.dev (produção)
 * Run:  npx playwright test tests/e2e/main-chat-architect-hint.spec.mjs
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'https://visioncoreai.pages.dev';

async function mockChatReply(page, answer) {
  await page.route('**/api/chat', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ answer, provider: 'anthropic' })
    });
  });
}

async function mockInterpret(page, classification) {
  await page.route('**/api/architect/interpret', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, classification })
    });
  });
}

async function sendMainChatMessage(page, text) {
  await page.locator('#v298Prompt').fill(text);
  await page.click('#v298SendBtn');
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try { localStorage.setItem('vc_tutorial_done', '1'); } catch (e) {}
  });
  await page.goto(BASE_URL);
});

test('high confidence + project_type filled: hint appears with the real project type', async ({ page }) => {
  await mockChatReply(page, 'Resposta de teste.');
  await mockInterpret(page, { project_type: 'API REST de estoque', confidence: 0.82, open_questions: [] });

  await sendMainChatMessage(page, 'quero uma API REST para gerenciar estoque de uma loja');

  const hint = page.locator('#v298ChatStream').getByText('Abrir Project Builder →');
  await expect(hint).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('#v298ChatStream')).toContainText('API REST de estoque');
});

test('clicking the hint opens the embedded switcher (#mission.sf-mode), NOT the legacy full page', async ({ page }) => {
  await mockChatReply(page, 'Resposta de teste.');
  await mockInterpret(page, { project_type: 'site institucional', confidence: 0.9, open_questions: [] });

  await sendMainChatMessage(page, 'quero um site institucional para minha empresa');
  await page.click('#v298ChatStream >> text=Abrir Project Builder →');

  await expect(page.locator('#mission')).toHaveClass(/\bsf-mode\b/);
  await expect(page.locator('#vcMissionSfPane')).toBeVisible();
  await expect(page.locator('#vcSoftwareFactoryPage')).toBeHidden();
});

test('low confidence (< 0.6): hint does not appear', async ({ page }) => {
  await mockChatReply(page, 'Resposta de teste.');
  await mockInterpret(page, { project_type: null, confidence: 0.3, open_questions: ['Que tipo de sistema você imagina?'] });

  await sendMainChatMessage(page, 'oi');

  await page.waitForTimeout(600); // let the parallel §81 fetch resolve
  await expect(page.locator('#v298ChatStream')).not.toContainText('Abrir Project Builder →');
});

test('high confidence but empty project_type: hint does not appear (sanity guard)', async ({ page }) => {
  await mockChatReply(page, 'Resposta de teste.');
  await mockInterpret(page, { project_type: '', confidence: 0.95, open_questions: [] });

  await sendMainChatMessage(page, 'me explica como funciona esse sistema');

  await page.waitForTimeout(600);
  await expect(page.locator('#v298ChatStream')).not.toContainText('Abrir Project Builder →');
});

test('classic project request ("quero criar uma API REST para gerenciar tarefas com autenticação JWT") shows the hint', async ({ page }) => {
  await mockChatReply(page, 'Resposta de teste.');
  await mockInterpret(page, { project_type: 'API de gerenciamento de tarefas', confidence: 0.85, open_questions: [] });

  await sendMainChatMessage(page, 'quero criar uma API REST para gerenciar tarefas com autenticação JWT');

  await expect(page.locator('#v298ChatStream').getByText('Abrir Project Builder →')).toBeVisible({ timeout: 5_000 });
});

test('interpret endpoint error: hint silently does not appear, main chat reply is unaffected', async ({ page }) => {
  await mockChatReply(page, 'Resposta de teste.');
  await page.route('**/api/architect/interpret', (route) => route.fulfill({ status: 500, body: '{}' }));

  await sendMainChatMessage(page, 'quero um app de delivery com pagamento online');

  await expect(page.locator('#v298ChatStream')).toContainText('Resposta de teste.');
  await page.waitForTimeout(600);
  await expect(page.locator('#v298ChatStream')).not.toContainText('Abrir Project Builder →');
});
