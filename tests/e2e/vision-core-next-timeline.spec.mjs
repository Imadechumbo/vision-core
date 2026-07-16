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
  // scoped to #vcMissionHistoryList — the right sidebar also renders a
  // compact .vc-timeline-item copy of the same real data (renderAtomicSidebarExtras).
  const missionItems = page.locator('#vcMissionHistoryList .vc-timeline-item');
  await expect(missionItems).toHaveCount(1);
  await expect(missionItems).toContainText('Auto-Pilot: app de tarefas');
  await expect(missionItems).toContainText('PASS_GOLD');

  await missionItems.click();
  await expect(page.locator('#vcMissionDetail')).toBeVisible();
  await expect(page.locator('#vcMissionDetailTitle')).toContainText('Auto-Pilot: app de tarefas');

  await page.locator('#vcMissionDetailBack').click();
  await expect(page.locator('#vcMissionHistoryList')).toBeVisible();
});

test('Mission detail renders a real pipeline from persisted stages[], with friendly step labels', async ({ page }) => {
  const WITH_STAGES = {
    ok: true,
    entries: [{
      id: 'mt-2', ts: '2026-07-16T10:14:29.002Z', source: 'sf-autopilot-next', title: 'Auto-Pilot: app com stages',
      input: 'app com stages', summary: 'app com stages', status: 'PASS_GOLD', pass_gold: true, agent: null, mission_id: null,
      stages: [
        { name: 'project_builder', status: 'done', started_at: '2026-07-16T10:00:00.000Z', completed_at: '2026-07-16T10:00:02.500Z' },
        { name: 'gold_gate', status: 'done', started_at: '2026-07-16T10:00:02.500Z', completed_at: '2026-07-16T10:00:05.000Z' }
      ]
    }],
    count: 1, authenticated: true, anti_stub: true
  };
  await page.route(`${API}/api/mission/timeline*`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(WITH_STAGES) }));

  await page.goto(NEXT_URL);
  await page.locator('a[data-feature="missions"]').click();
  await page.locator('#vcMissionHistoryList .vc-timeline-item').click();
  await expect(page.locator('#vcMissionDetail')).toBeVisible();

  const pipeline = page.locator('#vcMissionDetailPipeline');
  await expect(pipeline).toBeVisible();
  const steps = pipeline.locator('.vc-pipeline-step');
  await expect(steps).toHaveCount(2);
  // Nomes técnicos (module) viram os labels amigáveis já usados no Auto-Pilot,
  // nunca o module cru nem um rótulo inventado.
  await expect(steps.nth(0)).toContainText('Analisar projeto e sugerir stack');
  await expect(steps.nth(1)).toContainText('Validar PASS GOLD');
  await expect(steps.nth(0)).toContainText('2.5s');
  await expect(steps.nth(1)).toContainText('2.5s');
  await expect(steps.nth(0)).toHaveAttribute('data-status', 'done');
});

test('Mission detail without stages never shows a fabricated pipeline', async ({ page }) => {
  await page.route(`${API}/api/mission/timeline*`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ONE_MISSION) }));

  await page.goto(NEXT_URL);
  await page.locator('a[data-feature="missions"]').click();
  await page.locator('#vcMissionHistoryList .vc-timeline-item').click();
  await expect(page.locator('#vcMissionDetail')).toBeVisible();
  await expect(page.locator('#vcMissionDetailPipeline')).toBeHidden();
});

test('Missions history keeps the honest empty state', async ({ page }) => {
  await page.route(`${API}/api/mission/timeline*`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, entries: [], count: 0, authenticated: true, anti_stub: true }) }));

  await page.goto(NEXT_URL);
  await page.locator('a[data-feature="missions"]').click();
  await expect(page.locator('#vcMissionHistoryList')).toContainText('Nenhuma');
});
