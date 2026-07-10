// @ts-check
/**
 * Vision Core Next - App shell additions: Mission Input (floating, collapsible,
 * local-only) and Security Lab (Safe Status panel + Secret Guard governance card).
 * All API calls are mocked via page.route(); this spec must never touch the
 * real backend or any host outside localhost.
 *
 * PERMANENT SPEC (not a temp validation spec — see docs/CURRENT_HANDOFF.md):
 * same criterion as the other permanent Next specs — governance-relevant
 * surface (a "no destructive call" guarantee + a spec-only governance card)
 * built across agent handoffs with no per-step human review. This spec was
 * written picking up an interrupted prior agent's uncommitted work (found
 * sitting in the tree with a real mojibake bug, fixed separately) — it locks
 * the intended behavior down so a future handoff can't regress it silently.
 *
 * Mission Input is 100% local: it only rewrites the composer textarea and
 * appends a chat message, never calls fetch. Security Lab's Safe Status panel
 * only issues GET requests to a fixed allowlist (server.js:2607 confirms none
 * of the 5 paths exist today — every one 404s via the generic /api/* catch-
 * all, so "local" fallback rows are what real users see right now, not a
 * hypothetical edge case).
 */

import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const NEXT_URL = pathToFileURL(path.resolve('frontend/vision-core-next.html')).toString();
const API = 'https://visioncore-api-gateway.weiganlight.workers.dev';

const SAFE_STATUS_PATHS = ['/api/status', '/api/queue/status', '/api/agents/status', '/api/jobs/latest', '/api/heartbeat'];

test.beforeEach(async ({ page }) => {
  await page.route(`${API}/api/agent/status`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, connected: false }) }));
  await page.route(`${API}/api/mission/quota`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, plan: 'free', remaining: 5 }) }));
});

test('Mission Input: collapses/expands and persists the choice in localStorage', async ({ page }) => {
  await page.goto(NEXT_URL);
  const panel = page.locator('#vcMissionInput');
  const toggle = page.locator('#vcMissionInputToggle');

  await expect(panel).toHaveAttribute('data-collapsed', 'false');
  await expect(page.locator('#vcMissionInputBody')).toBeVisible();

  await toggle.click();
  await expect(panel).toHaveAttribute('data-collapsed', 'true');
  await expect(page.locator('#vcMissionInputBody')).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('vc_mission_input_collapsed'))).toBe('true');

  await page.reload();
  await expect(page.locator('#vcMissionInput')).toHaveAttribute('data-collapsed', 'true');

  await page.locator('#vcMissionInputToggle').click();
  await expect(page.locator('#vcMissionInput')).toHaveAttribute('data-collapsed', 'false');
});

test('Mission Input: "Adicionar ao chat" only rewrites the composer and appends a local message — never a network call', async ({ page }) => {
  await page.goto(NEXT_URL);

  let extraRequests = 0;
  page.on('request', (req) => {
    const url = req.url();
    if (url.startsWith(API) && !url.includes('/api/agent/status') && !url.includes('/api/mission/quota')) extraRequests += 1;
  });

  await page.locator('#vcMissionQuickInput').fill('validar governança sem executar nada');
  await page.locator('#vcMissionQuickSend').click();

  await expect(page.locator('#vcPrompt')).toHaveValue(/^Missão: validar governança sem executar nada/);
  await expect(page.locator('.vc-message-pending').last()).toContainText('Objetivo adicionado ao composer. Nada foi executado.');
  await expect(page.locator('#vcMissionQuickInput')).toHaveValue('');
  expect(extraRequests).toBe(0);
});

test('Security Lab: renders governance card with correct (non-mojibake) copy, hidden outside the tab', async ({ page }) => {
  await page.goto(NEXT_URL);
  await expect(page.locator('#vcSecretGuardCard')).toBeHidden();

  await page.locator('[data-feature="security"]').click();
  const card = page.locator('#vcSecretGuardCard');
  await expect(card).toBeVisible();
  await expect(card).toContainText('vc-secret-guard');
  await expect(card).toContainText('SPEC / PLANEJADO');
  await expect(card).toContainText('Rust core');
  await expect(card).toContainText('PLANEJADO');
  await expect(card).toContainText('Scanner integration');
  await expect(card).toContainText('FUTURA');
  await expect(card).toContainText('Governança visual apenas: nenhum binário Rust é executado por esta tela.');
  await expect(card).not.toContainText('Ã');

  await page.locator('[data-feature="chat"]').click();
  await expect(card).toBeHidden();
});

test('Security Lab: Safe Status panel issues GET-only requests to the fixed allowlist and renders honest ok/local rows', async ({ page }) => {
  await page.goto(NEXT_URL);

  const seenMethods = [];
  await page.route(`${API}/api/status`, (route) => {
    seenMethods.push(route.request().method());
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, status: 'online' }) });
  });
  await page.route(`${API}/api/queue/status`, (route) => {
    seenMethods.push(route.request().method());
    route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ ok: false }) });
  });
  await page.route(`${API}/api/agents/status`, (route) => {
    seenMethods.push(route.request().method());
    route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ ok: false }) });
  });
  await page.route(`${API}/api/jobs/latest`, (route) => {
    seenMethods.push(route.request().method());
    route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ ok: false }) });
  });
  await page.route(`${API}/api/heartbeat`, (route) => {
    seenMethods.push(route.request().method());
    route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ ok: false }) });
  });

  await page.locator('[data-feature="security"]').click();

  const list = page.locator('#vcSafeStatusList');
  await expect(list.locator('[data-state="ok"]')).toHaveCount(2); // 'policy' row (always ok) + /api/status
  await expect(list.locator('[data-state="local"]')).toHaveCount(4);
  await expect(list).toContainText('/api/status');
  await expect(list).toContainText('online');
  await expect(list).toContainText('indisponível localmente — fallback visual seguro');

  expect(seenMethods.every((m) => m === 'GET')).toBe(true);
  expect(seenMethods.length).toBe(SAFE_STATUS_PATHS.length);
});

test('Security Lab: none of the 5 endpoints existing yet on the real backend still renders a calm, non-error fallback', async ({ page }) => {
  // No route registered for the 5 SAFE_STATUS_PATHS — Playwright lets the
  // request through to the real gateway. This documents production reality
  // today (server.js:2607 catch-all -> 404 for all 5) without needing a
  // real network call to prove it: apiRequest() throws on any non-2xx,
  // which is exactly the branch under test here via a synthetic 500 mock
  // (network-shape-equivalent to a real 404, both are "not ok").
  await page.goto(NEXT_URL);
  for (const p of SAFE_STATUS_PATHS) {
    await page.route(`${API}${p}`, (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }));
  }

  await page.locator('[data-feature="security"]').click();
  const list = page.locator('#vcSafeStatusList');
  await expect(list.locator('[data-state="local"]')).toHaveCount(5);
  await expect(page.locator('#vcSafeStatusPanel')).not.toContainText('Erro');
  await expect(page.locator('#vcSafeStatusPanel')).not.toContainText('undefined');
});
