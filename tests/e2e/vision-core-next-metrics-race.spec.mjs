// @ts-check
/**
 * Vision Core Next - navigation race between feature tabs (Agentes/Métricas).
 * All API calls are mocked via page.route(); this spec must never touch the
 * real backend or any host outside localhost.
 *
 * PERMANENT SPEC — regression for a real production bug reported live via
 * screenshot: switching tabs fast (Agentes -> Métricas) left a stale async
 * response from the Agentes tab's "Métricas agentes" action render its
 * panel (#vcFeatureViz, "AGENTES — VISUALIZAÇÃO SEGURA") on top of the
 * Métricas tab content, because runFeatureAction()'s apiRequest().then()
 * never checked whether the user had already navigated elsewhere before
 * drawing into the shared #vcFeatureViz node. Same root-cause class
 * (render-after-stale-navigation) also covered here for loadMetrics(),
 * which is the direct suspect for the earlier "Ranking de atividade empty"
 * report — overlapping loadMetrics() calls from rapid tab re-entry could
 * let a stale/slower call's settle() redraw #vcMetricsAgentList after a
 * newer call already painted it.
 *
 * Fix: a module-level navGeneration counter bumped on every selectFeature()
 * call; async work captures it at request time and re-checks it before
 * rendering, discarding stale responses silently.
 */

import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const NEXT_URL = pathToFileURL(path.resolve('frontend/vision-core-next.html')).toString();
const API = 'https://visioncore-api-gateway.weiganlight.workers.dev';

function fulfillJson(route, status, body) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

function agentsPayload(tag) {
  return {
    ok: true,
    agents: [
      { name: tag, status: 'ok', cost_usd: 0.1, active_providers: ['groq'] },
      { name: tag + '-2', status: 'ok', cost_usd: 0.2, active_providers: ['groq', 'openrouter'] }
    ],
    active_llm_providers: ['groq', 'openrouter'],
    anti_stub: true
  };
}

const EMPTY_DORA = {
  ok: true,
  deployment_frequency: 'sem dados PASS-GOLD',
  lead_time: 'sem deploy-log',
  mttr: 'sem falhas registradas',
  change_failure_rate: '0%',
  pass_gold_count_30d: 0,
  total_pass_gold: 0,
  anti_stub: true
};
const DEFAULT_SUMMARY = { ok: true, runtime: { cpu: 10, memory: 20, heap: 15, uptime_s: 60, node_version: 'v24.0.0', platform: 'win32' }, anti_stub: true };
const DEFAULT_MEMORY = { ok: true, total_escalations: 0, by_provider: {}, memory_capable_entries: 0, legacy_entries_without_keywords: 0, last_escalation_at: null, anti_stub: true };
const OFFLINE_STATUS = { ok: true, connected: false, last_seen_ms_ago: null, agent_id: null, mode: 'download_ready', anti_stub: true };

// Registers routes needed by every scenario below: the always-on header
// polls (agent/status, mission/quota) plus the 4 non-agents Métricas
// endpoints (dora/summary/memory/status), which never change across cases
// here. /api/metrics/agents is intentionally left to each test — it is the
// one under race in every scenario.
async function mockCommon(page) {
  await page.route(`${API}/api/mission/quota`, (route) =>
    fulfillJson(route, 200, { ok: true, plan: 'free', remaining: 5 }));
  await page.route(`${API}/api/dora-metrics`, (route) => fulfillJson(route, 200, EMPTY_DORA));
  await page.route(`${API}/api/metrics/summary`, (route) => fulfillJson(route, 200, DEFAULT_SUMMARY));
  await page.route(`${API}/api/metrics/memory`, (route) => fulfillJson(route, 200, DEFAULT_MEMORY));
}

test('stale Agentes-tab response never overlaps the Métricas panel after a fast switch', async ({ page }) => {
  await mockCommon(page);
  // The header's own unconditional /api/agent/status poll (fast) is separate
  // from the Métricas tab's connectivity fetch of the same endpoint — one
  // route handles both, always fast, so it never becomes the race variable.
  await page.route(`${API}/api/agent/status`, (route) => fulfillJson(route, 200, OFFLINE_STATUS));

  let call = 0;
  await page.route(`${API}/api/metrics/agents`, async (route) => {
    call += 1;
    if (call === 1) {
      // Triggered by clicking the Agentes tab's own action button — slow,
      // resolves AFTER the user has already moved to Métricas.
      await new Promise((r) => setTimeout(r, 900));
      return fulfillJson(route, 200, agentsPayload('StaleAgentesTab'));
    }
    // Triggered by Métricas tab's own loadMetrics() on entry — fast.
    await new Promise((r) => setTimeout(r, 100));
    return fulfillJson(route, 200, agentsPayload('RealMetricsTab'));
  });

  await page.goto(NEXT_URL);
  await page.locator('[data-feature="agents"]').click();
  await page.getByRole('button', { name: 'Métricas agentes' }).click();
  // Don't wait for the (slow) response — switch away immediately, exactly
  // the "trocando de aba repetidamente e rápido" scenario from production.
  await page.locator('[data-feature="metrics"]').click();

  // Let both the fast (Métricas) and slow (stale Agentes) responses settle.
  await page.waitForTimeout(1200);

  // The stale panel must never have reappeared on top of Métricas.
  await expect(page.locator('#vcFeatureViz')).toBeHidden();
  const chatText = await page.locator('#vcChatStream').innerText().catch(() => '');
  expect(chatText).not.toContain('StaleAgentesTab');

  // Métricas itself must show its own real, non-empty data — including the
  // Ranking de atividade card (the original "empty ranking" symptom).
  await expect(page.locator('#vcMetricsAgentList')).toContainText('RealMetricsTab');
  await expect(page.locator('#vcMetricsAgentList')).toContainText('Ranking de atividade');
  await expect(page.locator('#vcMetricsAgentList .vc-bar-chart')).toHaveCount(3);
  await expect(page.locator('#vcMetricsAgentList .vc-bar-row')).not.toHaveCount(0);
  await expect(page.locator('.vc-metrics-agent-row')).toHaveCount(2);
});

test('stale Métricas loadMetrics() call never redraws the panel after leaving the tab', async ({ page }) => {
  await mockCommon(page);
  await page.route(`${API}/api/agent/status`, (route) => fulfillJson(route, 200, OFFLINE_STATUS));

  let call = 0;
  await page.route(`${API}/api/metrics/agents`, async (route) => {
    call += 1;
    if (call === 1) {
      // First entry into Métricas — slow, resolves after the user has
      // already left the tab.
      await new Promise((r) => setTimeout(r, 900));
      return fulfillJson(route, 200, agentsPayload('StaleFirstEntry'));
    }
    // Second entry into Métricas — fast, resolves first.
    await new Promise((r) => setTimeout(r, 100));
    return fulfillJson(route, 200, agentsPayload('RealSecondEntry'));
  });

  await page.goto(NEXT_URL);
  await page.locator('[data-feature="metrics"]').click();   // call #1 in flight
  await page.locator('[data-feature="chat"]').click();       // navigate away mid-flight
  await page.locator('[data-feature="metrics"]').click();    // call #2 in flight

  await page.waitForTimeout(1200);

  await expect(page.locator('#vcMetricsAgentList')).toContainText('RealSecondEntry');
  const panelText = await page.locator('#vcMetricsAgentList').innerText();
  expect(panelText).not.toContain('StaleFirstEntry');
  await expect(page.locator('#vcMetricsAgentList')).toContainText('Ranking de atividade');
  await expect(page.locator('.vc-metrics-agent-row')).toHaveCount(2);
});

test('repeated fast Agentes<->Métricas switching under varied network timing never leaves a phantom panel (15 iterations)', async ({ page }) => {
  await mockCommon(page);
  await page.route(`${API}/api/agent/status`, (route) => fulfillJson(route, 200, OFFLINE_STATUS));

  let call = 0;
  await page.route(`${API}/api/metrics/agents`, async (route) => {
    call += 1;
    // Odd calls = the Agentes tab's own "Métricas agentes" action button
    // (slow, varied 250-400ms — always still in flight when the test moves
    // on to Métricas below). Even calls = Métricas tab's own loadMetrics()
    // on entry (fast, varied 20-90ms — always resolves first). This
    // guarantees, every iteration, that the stale Agentes response lands
    // AFTER Métricas is already active — the exact production race —
    // instead of leaving it to chance like a single fixed delay would.
    const delay = call % 2 === 1 ? 250 + ((call * 37) % 150) : 20 + ((call * 17) % 70);
    await new Promise((r) => setTimeout(r, delay));
    return fulfillJson(route, 200, agentsPayload('Iter' + call));
  });

  await page.goto(NEXT_URL);

  for (let i = 0; i < 15; i++) {
    await page.locator('[data-feature="agents"]').click();
    await page.getByRole('button', { name: 'Métricas agentes' }).click(); // slow, odd call
    await page.waitForTimeout((i * 13) % 60);
    await page.locator('[data-feature="metrics"]').click(); // fast, even call
    await page.waitForTimeout(450); // long enough for both calls of this iteration to settle before the invariant check

    // Checked after every single iteration, not just at the end: the stale
    // Agentes response (odd call, still resolving here) must never repaint
    // #vcFeatureViz while Métricas is the active tab.
    await expect(page.locator('#vcFeatureViz'), `iteration ${i}`).toBeHidden();
    await expect(page.locator('#vcMetricsAgentList .vc-bar-chart'), `iteration ${i}`).toHaveCount(3);
    await expect(page.locator('.vc-metrics-agent-row'), `iteration ${i}`).toHaveCount(2);
  }
});
