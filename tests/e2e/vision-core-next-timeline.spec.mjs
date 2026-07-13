// @ts-check
/**
 * Vision Core Next - Timeline fusion contract.
 * Timeline is no longer a standalone sidebar tab. Mission history remains
 * available inside Missions through the same real /api/mission/timeline data.
 */

import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const NEXT_URL = pathToFileURL(path.resolve('frontend/vision-core-next.html')).toString();
const API = 'https://visioncore-api-gateway.weiganlight.workers.dev';

const ONE_MISSION = {
  ok: true,
  entries: [
    { id: 'mt-1', ts: '2026-07-13T10:14:29.002Z', source: 'sf-autopilot-next', title: 'Auto-Pilot: app de tarefas', input: 'app de tarefas', summary: 'app de tarefas', status: 'PASS_GOLD', pass_gold: true, agent: null, mission_id: null }
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

test('Timeline is not a standalone navigation target anymore', async ({ page }) => {
  await page.goto(NEXT_URL);

  await expect(page.locator('[data-feature="timeline"]')).toHaveCount(0);
  await expect(page.locator('a[href="#timeline"]')).toHaveCount(0);
});

test('Missions still loads and exposes Mission History automatically', async ({ page }) => {
  await page.route(`${API}/api/mission/timeline*`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ONE_MISSION) }));

  await page.goto(NEXT_URL);
  await expect(page.locator('#vcMissionHistory')).toBeHidden();

  await page.locator('a[data-feature="missions"]').click();
  await expect(page.locator('#vcMissionHistory')).toBeVisible();
  await expect(page.locator('.vc-mh-item')).toHaveCount(1);
  await expect(page.locator('.vc-mh-item')).toContainText('Auto-Pilot: app de tarefas');
  await expect(page.locator('.vc-mh-item')).toContainText('PASS_GOLD');

  await page.locator('.vc-mh-item').click();
  await expect(page.locator('#vcMissionDetail')).toBeVisible();
  await expect(page.locator('#vcMissionDetailTitle')).toContainText('Auto-Pilot: app de tarefas');

  await page.locator('#vcMissionDetailBack').click();
  await expect(page.locator('#vcMissionHistoryList')).toBeVisible();
});

test('Missions history keeps the honest empty state', async ({ page }) => {
  await page.route(`${API}/api/mission/timeline*`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, entries: [], count: 0, authenticated: true, anti_stub: true }) }));

  await page.goto(NEXT_URL);
  await page.locator('a[data-feature="missions"]').click();
  await expect(page.locator('#vcMissionHistoryList')).toContainText('Nenhuma');
});
