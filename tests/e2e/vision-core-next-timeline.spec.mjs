// @ts-check
/**
 * Vision Core Next - Timeline tab (reaproveita Mission History de Missions).
 * All API calls are mocked via page.route(); this spec must never touch the
 * real backend or any host outside localhost.
 *
 * PERMANENT SPEC. Achado real (2026-07-13): a aba Timeline usava um botão
 * safe-read genérico ("Carregar timeline") sem nenhum caso de renderização
 * para o formato real de /api/mission/timeline ({entries:[...]}) -- caía
 * sempre no texto de fallback genérico, mesmo com missões reais gravadas
 * (round-trip POST->GET confirmado funcionando contra produção real antes
 * do fix). Fix: reaproveita o MESMO widget já funcional de Missions ->
 * Mission History (loadMissionHistory(), mesmo elemento DOM
 * #vcMissionHistory) -- carrega sozinho ao abrir a aba Timeline, sem
 * exigir clique. Missions continua com o comportamento idêntico de antes
 * (nenhuma mudança visível lá).
 *
 * Achado real da RCA adversarial: como Timeline não tem os 3 formulários
 * exclusivos de Missions acima do histórico, o painel nasce curto o
 * bastante pra cair inteiro atrás do #vcComposer sticky (regra dura #12) --
 * só em Timeline, nunca em Missions (que sempre teve conteúdo suficiente
 * acima para evitar isso). Fix: loadMissionHistory(scrollAfterLoad) chama
 * scrollIntoView({block:'start'}) só quando vem da aba Timeline.
 */

import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const NEXT_URL = pathToFileURL(path.resolve('frontend/vision-core-next.html')).toString();
const API = 'https://visioncore-api-gateway.weiganlight.workers.dev';

const ONE_MISSION = {
  ok: true,
  entries: [
    { id: 'mt-1', ts: '2026-07-13T10:14:29.002Z', source: 'sf-autopilot-next', title: 'Auto-Pilot: um app de tarefas com login e dashboard', input: 'um app de tarefas com login e dashboard', summary: 'um app de tarefas com login e dashboard', status: 'PASS_GOLD', pass_gold: true, agent: null, mission_id: null }
  ],
  count: 1,
  authenticated: true,
  anti_stub: true
};

test.beforeEach(async ({ page }) => {
  await page.route(`${API}/api/agent/status`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, connected: false }) }));
  await page.route(`${API}/api/mission/quota`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, plan: 'free', remaining: 5 }) }));
});

test('Timeline loads the mission list automatically on tab open, no click required', async ({ page }) => {
  await page.route(`${API}/api/mission/timeline*`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ONE_MISSION) }));

  await page.goto(NEXT_URL);
  await expect(page.locator('#vcMissionHistory')).toBeHidden();

  await page.locator('a[data-feature="timeline"]').click();
  await expect(page.locator('#vcMissionHistory')).toBeVisible();
  await expect(page.locator('.vc-mh-item')).toHaveCount(1);
  await expect(page.locator('.vc-mh-item')).toContainText('Auto-Pilot: um app de tarefas com login e dashboard');
  await expect(page.locator('.vc-mh-item')).toContainText('PASS_GOLD');

  // No leftover generic safe-read button/action for this tab.
  await expect(page.locator('#vcFeatureActions button', { hasText: 'Carregar timeline' })).toHaveCount(0);
});

test('Timeline shows the honest empty state when there are no missions yet', async ({ page }) => {
  await page.route(`${API}/api/mission/timeline*`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, entries: [], count: 0, authenticated: true, anti_stub: true }) }));

  await page.goto(NEXT_URL);
  await page.locator('a[data-feature="timeline"]').click();
  await expect(page.locator('#vcMissionHistoryList')).toContainText('Nenhuma missão registrada ainda.');
});

// Achado real da RCA adversarial: sem os formulários extras de Missions
// acima, o painel de histórico nasce curto o bastante pra ficar inteiro
// atrás do composer sticky (regra dura #12) -- só reproduzível medindo a
// sobreposição real, não só checando `hidden`.
test('Timeline mission list is never hidden behind the sticky composer on load (regra dura #12)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route(`${API}/api/mission/timeline*`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ONE_MISSION) }));

  await page.goto(NEXT_URL);
  await page.locator('a[data-feature="timeline"]').click();
  await expect(page.locator('.vc-mh-item')).toHaveCount(1);

  const overlap = await page.evaluate(() => {
    const composer = document.getElementById('vcComposer');
    const hist = document.getElementById('vcMissionHistory');
    const c = composer.getBoundingClientRect();
    const h = hist.getBoundingClientRect();
    const overlapY = Math.min(c.bottom, h.bottom) - Math.max(c.top, h.top);
    return { overlapY, composerTop: c.top, histBottom: h.bottom };
  });
  expect(overlap.overlapY, 'mission history must not overlap the sticky composer on first render').toBeLessThan(0);
});

// Escopo do pedido: só a aba Timeline muda -- Missions/Mission History
// continua com o comportamento idêntico de antes (sem scrollIntoView
// automático, sem overlap pré-existente -- já tinha conteúdo suficiente
// acima do histórico).
test('Missions -> Mission History keeps working exactly as before (no regression)', async ({ page }) => {
  await page.route(`${API}/api/mission/timeline*`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ONE_MISSION) }));

  await page.goto(NEXT_URL);
  await page.locator('a[data-feature="missions"]').click();
  await expect(page.locator('#vcMissionHistory')).toBeVisible();
  await expect(page.locator('.vc-mh-item')).toHaveCount(1);

  await page.locator('.vc-mh-item').click();
  await expect(page.locator('#vcMissionDetail')).toBeVisible();
  await expect(page.locator('#vcMissionDetailTitle')).toContainText('Auto-Pilot: um app de tarefas com login e dashboard');

  await page.locator('#vcMissionDetailBack').click();
  await expect(page.locator('#vcMissionHistoryList')).toBeVisible();

  // Leaving Missions hides the shared widget again, same as before.
  await page.locator('a[data-feature="chat"]').click();
  await expect(page.locator('#vcMissionHistory')).toBeHidden();
});
