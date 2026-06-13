// @ts-check
/**
 * tests/e2e/architect.spec.mjs
 * Vision Core — Playwright E2E tests for ARCH-14/15/16
 *
 * ARCH-14: spec sugerida clicável → módulo SF correto ativa + spec panel abre
 * ARCH-15: stack cards com ícone+label+tooltip (não fallback ⚙️ genérico)
 * ARCH-16: "Pacote Completo" → "Enviar para SF-03" → módulo muda + textarea populado
 *
 * Alvo: https://visioncoreai.pages.dev (produção)
 * Run:  npx playwright test tests/e2e/architect.spec.mjs
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'https://visioncoreai.pages.dev';

// Generous AI timeout — real LLM backend, can take 15–60s
const AI_TIMEOUT_MS = 90_000;

// Message that reliably produces high confidence + specs (validated in ARCH-08/§73.8)
const TEST_MSG = 'quero um SaaS de gestão de projetos com Node.js e React';

/**
 * Shared setup: open SF page, enable Architect mode, send message, wait for response panel.
 * Returns when #vcSfArchitectPanel is visible and contains a response.
 */
async function waitForArchitectPanel(page) {
  await page.goto(BASE_URL);

  // ── Open Software Factory ──────────────────────────────────────────────────
  // The nav button is hidden by responsive CSS in headless Chromium (overflow/display).
  // Use evaluate+dispatchEvent to click it programmatically, bypassing visibility check.
  await page.waitForSelector('[data-open-sf-page]', { state: 'attached', timeout: 12_000 });
  await page.evaluate(() => {
    const btn = document.querySelector('[data-open-sf-page]');
    if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });

  await page.waitForSelector('#vcSoftwareFactoryPage', { state: 'visible', timeout: 8_000 });

  // ── Wait for backend health check → toggle button visible ─────────────────
  // The Architect toggle is hidden until _backendConnected=true (health check)
  const toggleBtn = page.locator('#vcSfArchitectToggleBtn');
  await toggleBtn.waitFor({ state: 'visible', timeout: 35_000 });

  // ── Enable Architect mode ──────────────────────────────────────────────────
  await toggleBtn.click();

  // ── Send message ───────────────────────────────────────────────────────────
  await page.fill('#vcSfChatInput', TEST_MSG);
  await page.click('#vcSfChatSendBtn');

  // ── Wait for AI response panel ─────────────────────────────────────────────
  await page.waitForSelector('#vcSfArchitectPanel', {
    state:   'visible',
    timeout: AI_TIMEOUT_MS,
  });

  // Wait for specs list to populate (confidence >= 0.6 → specs appear)
  await page.waitForSelector('#vcSfArchitectSpecsList', { state: 'visible', timeout: 5_000 });
}

// ── ARCH-14 ─────────────────────────────────────────────────────────────────
test('ARCH-14: spec sugerida clicável → módulo SF correto ativa + spec panel abre + data-spec-id presente', async ({ page }) => {
  test.setTimeout(AI_TIMEOUT_MS + 30_000);

  await waitForArchitectPanel(page);

  // Find first clickable spec item (data-sa-module = target module id)
  const specItem = page.locator('#vcSfArchitectSpecsList [data-sa-module]').first();
  await specItem.waitFor({ state: 'visible', timeout: 5_000 });

  const saModule = await specItem.getAttribute('data-sa-module');
  const saSpec   = await specItem.getAttribute('data-sa-spec');

  expect(saModule, 'data-sa-module should be a non-empty module id').toBeTruthy();
  expect(saSpec,   'data-sa-spec should be a non-empty spec id').toBeTruthy();

  // ── Click the spec ──────────────────────────────────────────────────────────
  await specItem.click();

  // ── Assert: corresponding module button gets .active class ─────────────────
  const moduleBtn = page.locator(`.vc-sf-module-btn[data-sf-module="${saModule}"]`);
  await expect(moduleBtn).toHaveClass(/\bactive\b/, { timeout: 8_000 });

  // ── Assert: spec panel becomes visible (backend fetch for specs) ────────────
  await page.waitForSelector('#vcSfSpecPanel', { state: 'visible', timeout: 20_000 });

  // ── Expand spec list via toggle (collapsed by default) ────────────────────
  // #vcSfSpecList starts with display:none; #vcSfSpecToggleBtn reveals it
  const specToggle = page.locator('#vcSfSpecToggleBtn');
  await specToggle.waitFor({ state: 'visible', timeout: 5_000 });
  await specToggle.click();

  // ── Assert: [data-spec-id] items now visible inside spec list ───────────────
  const firstSpecEl = page.locator('#vcSfSpecList [data-spec-id]').first();
  await expect(firstSpecEl).toBeVisible({ timeout: 8_000 });

  // ── Assert: the clicked spec id is present in the panel (scrolled into view) ─
  const targetSpecEl = page.locator(`#vcSfSpecList [data-spec-id="${saSpec}"]`);
  await expect(targetSpecEl).toBeAttached({ timeout: 5_000 });
});

// ── ARCH-15 ─────────────────────────────────────────────────────────────────
test('ARCH-15: stack cards com ícone+label+tooltip — sem fallback ⚙️ para tags conhecidas', async ({ page }) => {
  test.setTimeout(AI_TIMEOUT_MS + 30_000);

  await waitForArchitectPanel(page);

  // Stack cards are <span title="..."> elements inside #vcSfArchitectExplanation
  const explanEl = page.locator('#vcSfArchitectExplanation');
  await explanEl.waitFor({ state: 'visible', timeout: 5_000 });

  const cards = explanEl.locator('span[title]');
  const count  = await cards.count();

  // ── Assert: at least 1 stack card rendered ──────────────────────────────────
  expect(count, 'Should have at least 1 stack card with title attribute').toBeGreaterThan(0);

  // ── Assert: first card has non-trivial tooltip ──────────────────────────────
  const firstTitle = await cards.first().getAttribute('title');
  expect(firstTitle, 'Stack card title should not be empty').toBeTruthy();
  expect((firstTitle || '').length, 'Stack card title should be a real description (>5 chars)').toBeGreaterThan(5);

  // ── Assert: at least 1 card has a known translated label (not raw tag) ──────
  const knownLabels = [
    'Backend Node.js', 'Interface (React)', 'SaaS Completo', 'Banco de Dados',
    'Autenticação', 'Pagamentos', 'Segurança', 'Painel Admin',
    'TypeScript', 'JavaScript', 'Backend Python', 'Docker', 'Backend Go',
    'Layout (HTML/CSS)', 'Stripe', 'Next.js', 'FastAPI', 'Cache (Redis)',
  ];
  const allTexts = await cards.allTextContents();
  const hasKnownLabel = allTexts.some((text) =>
    knownLabels.some((label) => text.includes(label))
  );
  expect(hasKnownLabel, `Cards should contain at least one known translated label. Got: ${JSON.stringify(allTexts)}`).toBeTruthy();
});

// ── ARCH-16 ─────────────────────────────────────────────────────────────────
test('ARCH-16: Pacote Completo → Enviar para SF-03 → módulo muda + Arquiteto desativa + textarea populado', async ({ page }) => {
  test.setTimeout(AI_TIMEOUT_MS + 30_000);

  await waitForArchitectPanel(page);

  // ── Assert: package toggle visible (confidence >= 0.6 ─ validated in §73.8) ─
  const pkgToggle = page.locator('.vc-arch-pkg-toggle');
  await pkgToggle.waitFor({ state: 'visible', timeout: 5_000 });

  // ── Expand Pacote Completo ──────────────────────────────────────────────────
  await pkgToggle.click();
  const pkgBody = page.locator('.vc-arch-pkg-body');
  await expect(pkgBody).toBeVisible({ timeout: 3_000 });

  // ── SF-03 button must be inside the expanded body ───────────────────────────
  const sf03Btn = pkgBody.locator('.vc-arch-sf03-btn');
  await expect(sf03Btn).toBeVisible({ timeout: 3_000 });

  // ── Click Enviar para SF-03 ────────────────────────────────────────────────
  await sf03Btn.click();

  // ── Assert: mission_composer module button is now active ───────────────────
  const missionBtn = page.locator('.vc-sf-module-btn[data-sf-module="mission_composer"]');
  await expect(missionBtn).toHaveClass(/\bactive\b/, { timeout: 8_000 });

  // ── Assert: textarea populated with structured content ─────────────────────
  const chatInput = page.locator('#vcSfChatInput');
  await page.waitForTimeout(300); // allow 150ms setTimeout from bundle + buffer
  const inputValue = await chatInput.inputValue();
  expect(inputValue, 'Input should contain "Projeto:"').toContain('Projeto:');
  expect(inputValue, 'Input should contain "Stack:"').toContain('Stack:');
  expect(inputValue, 'Input should contain "Specs de referência:"').toContain('Specs de referência:');

  // ── Assert: Architect panel is now hidden (mode turned off) ────────────────
  const archPanel = page.locator('#vcSfArchitectPanel');
  await expect(archPanel).toBeHidden({ timeout: 3_000 });
});
