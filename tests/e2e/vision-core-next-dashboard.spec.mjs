// @ts-check
/**
 * Vision Core Next - Dashboard fusion contract.
 * Dashboard is no longer a sidebar tab. Its full-width value now lives inside
 * Metricas as a local toggle that reuses the existing --wide classes.
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
  await page.route(`${API}/api/dora-metrics`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, pass_gold_count_30d: 0, total_pass_gold: 0 }) }));
  await page.route(`${API}/api/metrics/summary`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }));
  await page.route(`${API}/api/metrics/memory`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }));
});

test('Dashboard is not a standalone navigation target or DOM panel anymore', async ({ page }) => {
  await page.goto(NEXT_URL);

  await expect(page.locator('[data-feature="dashboard"]')).toHaveCount(0);
  await expect(page.locator('#vcDashboardPanel')).toHaveCount(0);
  await expect(page.locator('#vcDashboardRefresh')).toHaveCount(0);
});

test('Metricas keeps the former dashboard full-width value through a local toggle', async ({ page }) => {
  await page.goto(NEXT_URL);
  await page.locator('[data-feature="metrics"]').click();

  await expect(page.locator('#vcMetricsPanel')).toBeVisible();
  await expect(page.locator('#vcMetricsWideToggle')).toBeVisible();
  await expect(page.locator('#vcFeaturePanel')).not.toHaveClass(/vc-feature-panel--wide/);
  await expect(page.locator('.vc-chat-stage')).not.toHaveClass(/vc-chat-stage--wide/);

  await page.locator('#vcMetricsWideToggle').click();

  await expect(page.locator('#vcFeaturePanel')).toHaveClass(/vc-feature-panel--wide/);
  await expect(page.locator('.vc-chat-stage')).toHaveClass(/vc-chat-stage--wide/);
  await expect(page.locator('#vcMetricsWideToggle')).toHaveText('Largura normal');
  await expect(page.locator('#vcMetricsAgentList')).toContainText('Custo por agente');
  await expect(page.locator('#vcMetricsConn .vc-chart-timeline')).toBeVisible();
});
