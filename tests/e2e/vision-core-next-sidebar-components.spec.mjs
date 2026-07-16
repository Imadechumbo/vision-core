// @ts-check
/**
 * Vision Core Next - right sidebar reusable components (metric card /
 * timeline), added on top of the Atomic Core sidebar (DECISION-031).
 *
 * PERMANENT SPEC (not a temp validation spec — see docs/CURRENT_STATE.md).
 *
 * #vcAtomicSidebarExtras renders real DORA metrics + the last 5 mission
 * timeline entries above the protected HUD panel (#vcAtomicCorePanel).
 * It must never invade the HUD's fixed 224px footprint, must hide with the
 * rest of the sidebar outside Chat, and must hide on collapse — same rules
 * already enforced for the HUD itself.
 */

import { test, expect } from '@playwright/test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('frontend');
const API = 'https://visioncore-api-gateway.weiganlight.workers.dev';

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };

let server;
let baseURL;

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const filePath = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseURL = `http://127.0.0.1:${server.address().port}`;
});

test.afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

const NEXT_URL = () => `${baseURL}/vision-core-next.html`;

const DORA_FIXTURE = {
  deployment_frequency: '3 deploys/30d (0.10/day)',
  lead_time: '2.4h',
  mttr: '18min',
  change_failure_rate: '5%',
  pass_gold_count_30d: 12,
  total_pass_gold: 87
};

const MISSIONS_FIXTURE = {
  entries: [
    { id: 'm1', ts: new Date().toISOString(), source: 'chat', input: 'fix bug', summary: 'Corrigido overflow no composer', status: 'PASS_GOLD', pass_gold: true, agent: 'Hermes', mission_id: 'mm1' },
    { id: 'm2', ts: new Date(Date.now() - 3600e3).toISOString(), source: 'chat', input: 'add feature', summary: 'Nova rota adicionada', status: 'DONE', pass_gold: false, agent: 'PatchEngine', mission_id: 'mm2' }
  ],
  count: 2,
  authenticated: true,
  anti_stub: true
};

test.beforeEach(async ({ page }) => {
  await page.route(`${API}/api/agent/status`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, connected: false }) }));
  await page.route(`${API}/api/mission/quota`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, plan: 'free', remaining: 5 }) }));
  await page.route(`${API}/api/dora-metrics`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(DORA_FIXTURE) }));
  await page.route(`${API}/api/mission/timeline*`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MISSIONS_FIXTURE) }));
});

test('sidebar extras render real DORA metric cards and mission timeline on Chat', async ({ page }) => {
  await page.goto(NEXT_URL());
  await expect(page.locator('#vcAtomicSidebarMetrics .vc-metric-card')).toHaveCount(3);
  await expect(page.locator('#vcAtomicSidebarTimeline .vc-timeline-item')).toHaveCount(2);
  const text = await page.locator('#vcAtomicSidebarTimeline').innerText();
  expect(text).toContain('Corrigido overflow no composer');
  expect(text).toContain('Hermes');
});

test('sidebar extras never invade the HUD panel footprint', async ({ page }) => {
  await page.goto(NEXT_URL());
  await expect(page.locator('#vcAtomicSidebarMetrics .vc-metric-card').first()).toBeVisible();
  const geometry = await page.evaluate(() => {
    const extras = document.getElementById('vcAtomicSidebarExtras').getBoundingClientRect();
    const panel = document.getElementById('vcAtomicCorePanel').getBoundingClientRect();
    const sidebar = document.getElementById('vcAtomicSidebar').getBoundingClientRect();
    return { extrasBottom: extras.bottom, panelTop: panel.top, panelHeight: panel.height, sidebarHeight: sidebar.height, viewportHeight: window.innerHeight };
  });
  expect(geometry.extrasBottom).toBeLessThanOrEqual(geometry.panelTop);
  expect(geometry.panelHeight).toBe(224);
  // sidebar must stay full 100vh (DECISION-031 follow-up, next-clean-112) — never shrink to content like next-clean-111 did.
  expect(geometry.sidebarHeight).toBe(geometry.viewportHeight);
});

test('sidebar extras hide on collapse and outside the Chat tab, same as the HUD', async ({ page }) => {
  await page.goto(NEXT_URL());
  await expect(page.locator('#vcAtomicSidebarMetrics .vc-metric-card').first()).toBeVisible();

  await page.click('#vcAtomicPanelToggle');
  await expect(page.locator('#vcAtomicSidebarExtras')).toBeHidden();

  await page.click('#vcAtomicPanelToggle');
  await expect(page.locator('#vcAtomicSidebarExtras')).toBeVisible();

  await page.click('[data-feature="metrics"]');
  await expect(page.locator('#vcAtomicSidebar')).toBeHidden();
});

test('metric card and timeline builders degrade honestly on empty/failed data, no fake rows', async ({ page }) => {
  await page.unroute(`${API}/api/mission/timeline*`);
  await page.route(`${API}/api/mission/timeline*`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ entries: [], count: 0, authenticated: true, anti_stub: true }) }));
  await page.goto(NEXT_URL());
  await expect(page.locator('#vcAtomicSidebarMetrics .vc-metric-card')).toHaveCount(3);
  await expect(page.locator('#vcAtomicSidebarTimeline .vc-timeline-item')).toHaveCount(0);
  await expect(page.locator('#vcAtomicSidebarTimeline .vc-timeline-empty')).toBeVisible();
});
