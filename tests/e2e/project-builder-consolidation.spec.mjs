// @ts-check
/**
 * tests/e2e/project-builder-consolidation.spec.mjs
 * Vision Core — Playwright E2E tests for the Sub-passo 3.2b consolidations
 * inside the legacy #projectBuilder (Modo Avançado, reached via
 * window.showSoftwareFactoryPage() directly since Sub-passo 3.2a repointed
 * the real [data-open-sf-page] buttons to the embedded switcher instead).
 *
 * 1. Agent Matrix (Section E) removed — pbState.agentModes (local, never
 *    read back) replaced by getAgentModeFromBoard(), reading #agentsBoard's
 *    real cards (the ones that persist via POST /api/agents/:id/mode).
 *    Confirmed by test below: setting an agent's mode via #agentsBoard is
 *    reflected in Section F's "Agentes ON/AUTO/OFF" preview — the exact
 *    thing pbState.agentModes could never do (it was a separate, divergent
 *    cache that only updated on its own now-removed matrix clicks).
 * 2. The 5 duplicated context summaries (F/K/L/M/O) trimmed to their
 *    section-unique fields only; F stays canonical for
 *    Tipo/Template/Stack/Tamanho/Agentes. Fixed 3 real bugs found while
 *    investigating: getHumanApprovalContext() (L), getRealFileCommandContext()
 *    (M) and getFinalProductContext() (O) all read pbState.selectedType/
 *    selectedStack/selectedSize/activeAgents and pbTemplateState.selectedTemplate
 *    — properties that never existed on those objects (real shape:
 *    selectedProjectType/selectedStacks/selectedProjectSize/selectedTemplateId).
 *    These always returned '—'/0, INCLUDING in the actual generated
 *    receipt/package/report text (not just the redundant display), confirmed
 *    by reading each build*() function before deciding what to keep vs cut.
 * 3. The 5 near-duplicate "authority" grids (K/L/M/N/O) consolidated —
 *    O's #vcFinalAuthorityGrid (11 cards) is canonical; K/L/N replaced
 *    entirely by a lightweight note+anchor; M kept only its 3
 *    package-specific descriptive cards (not duplicated elsewhere).
 * 4. ~330 lines of dead MODULE 01-09 placeholder panels deleted (zero JS
 *    references confirmed before deleting — #vcSoftwareFactoryPage
 *    .vc-sf-module-panel{display:none!important} made them permanently
 *    inert regardless).
 *
 * Alvo: https://visioncoreai.pages.dev (produção)
 * Run:  npx playwright test tests/e2e/project-builder-consolidation.spec.mjs
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'https://visioncoreai.pages.dev';

/** Sub-passo 3.2a: the legacy full page is no longer opened by the real UI
 *  buttons — invoke it directly, same as sf-cockpit-nav.spec.mjs's openSfPage(). */
async function openLegacyFullPage(page) {
  await page.evaluate(() => window.showSoftwareFactoryPage());
  await page.waitForSelector('#vcSoftwareFactoryPage', { state: 'visible', timeout: 8_000 });
  await page.evaluate(() => window.setSoftwareFactoryModule('project_builder'));
}

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test('item 1: Agent Matrix removed, setting a mode via #agentsBoard is reflected in Section F preview', async ({ page }) => {
  await expect(page.locator('.vc-agent-matrix-row')).toHaveCount(0);

  // Set backend agent to ON via the real, persisted control (#agentsBoard)
  const backendCard = page.locator('.vc-reserve-card[data-agent-id="backend"]');
  await backendCard.locator('.vc-mode-btn[data-mode="on"]').click();
  await expect(backendCard.locator('.vc-mode-btn.active-on')).toBeVisible();

  await openLegacyFullPage(page);
  await page.locator('.vc-project-type-card[data-type-id="saas_fullstack"]').click();

  // Section F ("Resumo do Projeto") must reflect #agentsBoard's real state —
  // this is exactly what pbState.agentModes (removed) could never do, since
  // it only updated from the now-deleted matrix's own clicks.
  await expect(page.locator('#vcPreviewAgentsOn')).toContainText('Backend');
});

test('item 4: dead MODULE 01-09 placeholder panels are gone', async ({ page }) => {
  await openLegacyFullPage(page);
  await expect(page.locator('.vc-sf-module-panel')).toHaveCount(0);
});

test('item 2: redundant context summaries trimmed to section-unique fields; F stays canonical', async ({ page }) => {
  await openLegacyFullPage(page);

  await expect(page.locator('#vcExportSourceSummary .vc-export-source-item')).toHaveCount(1);
  await expect(page.locator('#vcExportSourceSummary')).toContainText('Handoff Target');

  // Expand the engineer-only <details> to reach Section L
  await page.evaluate(() => { document.querySelector('.vc-engineer-details').open = true; });
  await expect(page.locator('#vcHumanSummaryGrid .vc-human-summary-card')).toHaveCount(3);
  await expect(page.locator('#vcHumanSummaryGrid')).toContainText('Aprovação');
  await expect(page.locator('#vcHumanSummaryGrid')).not.toContainText('Tipo de Projeto');

  await expect(page.locator('#vcRealReadinessGrid .vc-real-readiness-card')).toHaveCount(3);
  await expect(page.locator('#vcRealReadinessGrid')).toContainText('Export Preview');

  await expect(page.locator('#vcFinalContextGrid .vc-final-context-card')).toHaveCount(3);
  await expect(page.locator('#vcFinalContextGrid')).toContainText('Worker Target');
  await expect(page.locator('#vcFinalContextGrid')).not.toContainText('Tipo de Projeto');
});

test('item 2 (bug fix): generated receipt/report text reflects real selections, not always "—"', async ({ page }) => {
  await openLegacyFullPage(page);
  await page.locator('.vc-project-type-card[data-type-id="saas_fullstack"]').click();
  await page.locator('.vc-stack-chip[data-stack-id="React"]').click();

  // Section F confirms the shared, correct source (getSelectedProjectContext())
  // now feeds real values — the same source L/M/O's fixed getters call too.
  await expect(page.locator('#vcPreviewType')).not.toHaveText('—');
  await expect(page.locator('#vcPreviewStack')).toContainText('React');

  // Direct regression net for the actual bug: Section M's generated command
  // package text used to always show "Tipo: —, Stack: —" (getRealFileCommandContext
  // read pbState.selectedType/selectedStack, which never existed) regardless
  // of what was picked above. Generate it and confirm the real values appear.
  await page.click('#vcGenerateCommandPkgBtn');
  const pkgText = await page.locator('#vcRealCommandOutput').inputValue();
  expect(pkgText).not.toContain('Tipo de Projeto  : —');
  expect(pkgText).toContain('React');
});

test('item 3: authority grids consolidated — only #vcFinalAuthorityGrid (Section O) keeps the full 11-card matrix', async ({ page }) => {
  await openLegacyFullPage(page);

  await expect(page.locator('#vcFinalAuthorityGrid .vc-final-authority-card')).toHaveCount(11);

  // K, N: fully replaced by note + anchor to Section O
  await expect(page.locator('.vc-export-lock-grid')).toHaveCount(0);
  await expect(page.locator('.vc-result-authority-grid')).toHaveCount(0);

  // M: kept only its 3 package-specific descriptive cards (not the 5 generic "locked" ones)
  await expect(page.locator('.vc-real-authority-card')).toHaveCount(3);
  await expect(page.locator('.vc-real-authority-grid')).toContainText('Worker Externo');

  // L (inside the engineer-only <details>): fully replaced by note too
  await page.evaluate(() => { document.querySelector('.vc-engineer-details').open = true; });
  await expect(page.locator('.vc-human-lock-grid')).toHaveCount(0);

  // The anchor link target used by the notes must resolve to a real element
  const anchorTarget = await page.evaluate(() => !!document.getElementById('vcFinalAuthorityGrid'));
  expect(anchorTarget).toBe(true);
});
