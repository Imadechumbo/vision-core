// @ts-check
/**
 * Vision Core Next - Dashboard (largura total).
 * All API calls are mocked via page.route(); this spec must never touch the
 * real backend or any host outside localhost.
 *
 * PERMANENT SPEC. ARCHITECTURAL PRINCIPLE-004 (No Fixed Viewport Layout, ver
 * DECISIONS.md) first applied to a dedicated dashboard: Timeline (reuses the
 * exact same Conectividade heartbeat timeline), Custo por Agente + Ranking de
 * Atividade (reuses buildAgentCharts(), the same function already used by
 * Metricas -> Agentes) -- no new chart logic, only a full-width container.
 */

import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const NEXT_URL = pathToFileURL(path.resolve('frontend/vision-core-next.html')).toString();
const API = 'https://visioncore-api-gateway.weiganlight.workers.dev';

test.beforeEach(async ({ page }) => {
  await page.route(`${API}/api/agent/status`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, connected: true, last_seen_ms_ago: 4200 }) }));
  await page.route(`${API}/api/mission/quota`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, plan: 'free', remaining: 5 }) }));
  await page.route(`${API}/api/metrics/agents`, (route) =>
    route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({
        ok: true,
        agents: [{ name: 'hermes', status: 'ok', cost_usd: 0.42, active_providers: ['anthropic'] }],
        active_llm_providers: ['anthropic']
      })
    }));
});

test('hidden by default, reachable from the sidebar like every other feature', async ({ page }) => {
  await page.goto(NEXT_URL);
  await expect(page.locator('#vcDashboardPanel')).toBeHidden();
  await expect(page.locator('a[data-feature="dashboard"]')).toBeVisible();
});

test('opens full-width, breaking the 940px chat-stage cap only while active, and loads Timeline + agent charts', async ({ page }) => {
  await page.goto(NEXT_URL);
  await page.locator('a[data-feature="dashboard"]').click();

  await expect(page.locator('#vcDashboardPanel')).toBeVisible();
  await expect(page.locator('.vc-chat-stage')).toHaveClass(/vc-chat-stage--wide/);
  await expect(page.locator('#vcFeaturePanel')).toHaveClass(/vc-feature-panel--wide/);

  await expect(page.locator('#vcDashboardTimeline .vc-chart-timeline')).toBeVisible();
  await expect(page.locator('#vcDashboardTimeline')).toContainText('Último heartbeat');
  await expect(page.locator('#vcDashboardAgents')).toContainText('Custo por agente');
  await expect(page.locator('#vcDashboardAgents')).toContainText('Ranking de atividade');
  await expect(page.locator('#vcDashboardAgents')).toContainText('hermes');
});

test('leaving the dashboard restores the normal chat-stage width', async ({ page }) => {
  await page.goto(NEXT_URL);
  await page.locator('a[data-feature="dashboard"]').click();
  await expect(page.locator('.vc-chat-stage')).toHaveClass(/vc-chat-stage--wide/);

  await page.locator('a[data-feature="chat"]').click();
  await expect(page.locator('.vc-chat-stage')).not.toHaveClass(/vc-chat-stage--wide/);
  await expect(page.locator('#vcFeaturePanel')).not.toHaveClass(/vc-feature-panel--wide/);
  await expect(page.locator('#vcDashboardPanel')).toBeHidden();
});

test('agents endpoint failure surfaces a readable message instead of an empty silent panel', async ({ page }) => {
  await page.route(`${API}/api/metrics/agents`, (route) => route.fulfill({ status: 500, body: '{}' }));
  await page.goto(NEXT_URL);
  await page.locator('a[data-feature="dashboard"]').click();
  await expect(page.locator('#vcDashboardStatus')).toContainText(/falha/i);
});

test('refresh button reloads both Timeline and agent charts on demand', async ({ page }) => {
  let agentCalls = 0;
  await page.route(`${API}/api/metrics/agents`, (route) => {
    agentCalls += 1;
    route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({
        ok: true, agents: [{ name: 'scanner', status: 'ok', cost_usd: 0.1, active_providers: [] }], active_llm_providers: []
      })
    });
  });
  await page.goto(NEXT_URL);
  await page.locator('a[data-feature="dashboard"]').click();
  await expect(page.locator('#vcDashboardAgents')).toContainText('scanner');
  expect(agentCalls).toBe(1);

  await page.locator('#vcDashboardRefresh').click();
  await expect.poll(() => agentCalls).toBe(2);
});

// Regra dura #12 (VISION_CORE_NEXT_FRONTEND_SPEC.md): conteudo alto dentro de
// #vcFeaturePanel nunca pode nascer escondido atras do #vcComposer sticky.
// Reescrita apos ARCHITECTURAL PRINCIPLE-004 (2026-07-12): a garantia antes
// vinha do overflow isolado de #vcChatScroll; agora vem do padding-bottom
// sincronizado via ResizeObserver com a altura real do composer. O Dashboard
// e o cenario real de conteudo alto (Timeline + 4 graficos) usado aqui como
// prova.
test('Dashboard tall content never renders hidden behind the sticky composer (regra dura #12)', async ({ page }) => {
  await page.goto(NEXT_URL);
  await page.locator('a[data-feature="dashboard"]').click();
  await expect(page.locator('#vcDashboardAgents')).not.toBeEmpty();

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(150);

  const overlap = await page.evaluate(() => {
    const composer = document.getElementById('vcComposer');
    const panel = document.getElementById('vcDashboardPanel');
    const c = composer.getBoundingClientRect();
    const p = panel.getBoundingClientRect();
    return { composerTop: c.top, panelBottom: p.bottom, overlaps: !(c.top > p.bottom) };
  });
  expect(overlap.overlaps, `composer top (${overlap.composerTop}) must be at/after the dashboard content bottom (${overlap.panelBottom}), never covering it`).toBe(false);
});
