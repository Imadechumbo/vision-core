// @ts-check
/**
 * Vision Core Next - Métricas visual layer.
 * All API calls are mocked via page.route(); this spec must never touch the
 * real backend or any host outside localhost.
 *
 * PERMANENT SPEC (not a temp validation spec — see docs/CURRENT_HANDOFF.md):
 * same criterion as the other permanent Next specs — this surface is being
 * built across agent handoffs with no per-step human review.
 *
 * Consumes only the 3 endpoints the Métricas tab already used (as raw-text
 * SAFE READ dumps) before this session — GET /api/metrics/agents,
 * GET /api/dora-metrics, GET /api/agent/status. Backend untouched, contracts
 * verified by reading backend/server.js directly (server.js:2422, 2455,
 * 2523) before writing any mock:
 *   - /api/metrics/agents  -> {ok, agents:[{name, status, cost_usd, note?,
 *     active_providers?}], active_llm_providers, anti_stub}. cost_usd is
 *     currently always null in production (never computed server-side) —
 *     the UI must render that as an honest "sem dados de custo", never "$0".
 *   - /api/dora-metrics    -> {ok, deployment_frequency, lead_time, mttr,
 *     change_failure_rate, pass_gold_count_30d, total_pass_gold,
 *     data_source, anti_stub}. The "sem dados ..." fallback strings are
 *     already baked in server-side — the frontend just renders them as-is,
 *     it does not re-derive emptiness.
 *   - /api/agent/status    -> {ok, connected, last_seen_ms_ago, agent_id,
 *     mode, anti_stub}.
 */

import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const NEXT_URL = pathToFileURL(path.resolve('frontend/vision-core-next.html')).toString();
const API = 'https://visioncore-api-gateway.weiganlight.workers.dev';

// vision-core-next.html polls /api/agent/status and /api/mission/quota
// unconditionally on load (header/sidebar badges) — unmocked, both leak a
// real request to the production gateway on every test. The Métricas tab
// ALSO calls /api/agent/status itself (for the connectivity panel); tests
// that need a specific status payload re-route it after this default,
// which wins per Playwright's last-registered-route-first order.
test.beforeEach(async ({ page }) => {
  await page.route(`${API}/api/agent/status`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, connected: false }) }));
  await page.route(`${API}/api/mission/quota`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, plan: 'free', remaining: 5 }) }));
});

function fulfillJson(route, status, body) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function mockMetrics(page, { agents, dora, status } = {}) {
  const routes = [];
  if (agents !== undefined) routes.push(page.route(`${API}/api/metrics/agents`, (r) => fulfillJson(r, 200, agents)));
  if (dora !== undefined) routes.push(page.route(`${API}/api/dora-metrics`, (r) => fulfillJson(r, 200, dora)));
  if (status !== undefined) routes.push(page.route(`${API}/api/agent/status`, (r) => fulfillJson(r, 200, status)));
  await Promise.all(routes);
}

const EMPTY_DORA = {
  ok: true,
  deployment_frequency: 'sem dados PASS-GOLD',
  lead_time: 'sem deploy-log',
  mttr: 'sem falhas registradas',
  change_failure_rate: '0%',
  pass_gold_count_30d: 0,
  total_pass_gold: 0,
  data_source: 'vault:PASS-GOLD + data/deploy-log.json',
  anti_stub: true
};

const OFFLINE_STATUS = { ok: true, connected: false, last_seen_ms_ago: null, agent_id: null, mode: 'download_ready', anti_stub: true };

async function openMetrics(page) {
  await page.goto(NEXT_URL);
  await page.locator('[data-feature="metrics"]').click();
}

test('panel hidden by default, visible only under the Métricas tab', async ({ page }) => {
  await page.goto(NEXT_URL);
  await expect(page.locator('#vcMetricsPanel')).toBeHidden();
  await page.locator('[data-feature="metrics"]').click();
  await expect(page.locator('#vcMetricsPanel')).toBeVisible();
  await page.locator('[data-feature="chat"]').click();
  await expect(page.locator('#vcMetricsPanel')).toBeHidden();
});

test('(a) full payload renders agent cards, cost bars and DORA cards', async ({ page }) => {
  await page.goto(NEXT_URL);
  await mockMetrics(page, {
    agents: {
      ok: true,
      agents: [
        { name: 'OpenClaw', status: 'ok', cost_usd: 0.12, note: 'orchestration — no LLM cost' },
        { name: 'Hermes RCA', status: 'ok', cost_usd: 0.04, active_providers: ['groq', 'openrouter'] }
      ],
      active_llm_providers: ['groq', 'openrouter'],
      anti_stub: true
    },
    dora: {
      ok: true,
      deployment_frequency: '3 deploys/30d (0.10/day)',
      lead_time: '2.4h avg (últimas 10)',
      mttr: '15 min avg',
      change_failure_rate: '5.0%',
      pass_gold_count_30d: 3,
      total_pass_gold: 40,
      anti_stub: true
    },
    status: { ok: true, connected: true, last_seen_ms_ago: 4000, agent_id: 'agent-abc', mode: 'connected', anti_stub: true }
  });
  await page.locator('[data-feature="metrics"]').click();

  await expect(page.locator('#vcMetricsSourceBadge')).toHaveText('DADOS REAIS');
  await expect(page.locator('.vc-metrics-agent-row')).toHaveCount(2);
  await expect(page.locator('.vc-metrics-bar-fill')).toHaveCount(2);
  await expect(page.locator('.vc-metrics-chip')).toHaveCount(2);
  await expect(page.locator('.vc-metrics-dora-card')).toHaveCount(6);
  await expect(page.locator('#vcMetricsDoraGrid')).toContainText('2.4h avg (últimas 10)');
  await expect(page.locator('#vcMetricsConn')).toContainText('Conectado');
  await expect(page.locator('#vcMetricsConn')).toContainText('agent_id: agent-abc');
});

test('(b) cost_usd null never becomes a bar or "$0" — honest "sem dados de custo"', async ({ page }) => {
  await page.goto(NEXT_URL);
  await mockMetrics(page, {
    agents: {
      ok: true,
      agents: [{ name: 'Scanner', status: 'ok', cost_usd: null, note: 'AST scan — no LLM cost' }],
      anti_stub: true
    },
    dora: EMPTY_DORA,
    status: OFFLINE_STATUS
  });
  await page.locator('[data-feature="metrics"]').click();

  await expect(page.locator('.vc-metrics-bar-fill')).toHaveCount(0);
  await expect(page.locator('.vc-metrics-no-cost')).toHaveText('sem dados de custo');
  await expect(page.locator('#vcMetricsTotal')).toContainText('sem dados de custo');
  await expect(page.locator('.vc-metrics-agent-row')).not.toContainText('$0');
});

test('(c) non-ok status paints amber for binary_not_found/PENDING_EVIDENCE, red for other', async ({ page }) => {
  await page.goto(NEXT_URL);
  await mockMetrics(page, {
    agents: {
      ok: true,
      agents: [
        { name: 'Go Core', status: 'binary_not_found', cost_usd: null },
        { name: 'PASS GOLD', status: 'PENDING_EVIDENCE', cost_usd: null },
        { name: 'Hermes RCA', status: 'no_provider', cost_usd: null }
      ],
      anti_stub: true
    },
    dora: EMPTY_DORA,
    status: OFFLINE_STATUS
  });
  await page.locator('[data-feature="metrics"]').click();

  // Scoped to the agent list: the connectivity panel below also uses
  // .vc-metrics-status-warn (disconnected dot) and would otherwise inflate
  // this count by 1 (OFFLINE_STATUS renders as "warn", not "error").
  const agentList = page.locator('#vcMetricsAgentList');
  await expect(agentList.locator('.vc-metrics-status-dot.vc-metrics-status-warn')).toHaveCount(2);
  await expect(agentList.locator('.vc-metrics-status-dot.vc-metrics-status-error')).toHaveCount(1);
  await expect(agentList.locator('.vc-metrics-status-badge.vc-metrics-status-ok')).toHaveCount(0);
});

test('(d) DORA "sem dados" strings render as honest empty state, not an error', async ({ page }) => {
  await page.goto(NEXT_URL);
  await mockMetrics(page, {
    agents: { ok: true, agents: [], anti_stub: true },
    dora: EMPTY_DORA,
    status: OFFLINE_STATUS
  });
  await page.locator('[data-feature="metrics"]').click();

  await expect(page.locator('#vcMetricsDoraGrid')).toContainText('sem dados PASS-GOLD');
  await expect(page.locator('#vcMetricsDoraGrid')).toContainText('sem deploy-log');
  await expect(page.locator('#vcMetricsDoraGrid')).toContainText('sem falhas registradas');
  await expect(page.locator('#vcMetricsError')).toBeHidden();
  await expect(page.locator('.vc-metrics-empty')).toHaveText('Nenhum agente reportado.');
});

test('(e) total fetch failure shows fallback badge + retry; retry recovers real data', async ({ page }) => {
  await page.goto(NEXT_URL);
  let attempt = 0;
  const okAgents = { ok: true, agents: [{ name: 'OpenClaw', status: 'ok', cost_usd: null }], anti_stub: true };

  await page.route(`${API}/api/metrics/agents`, (route) =>
    attempt === 0 ? fulfillJson(route, 500, { ok: false, error: 'boom' }) : fulfillJson(route, 200, okAgents));
  await page.route(`${API}/api/dora-metrics`, (route) =>
    attempt === 0 ? fulfillJson(route, 500, { ok: false, error: 'boom' }) : fulfillJson(route, 200, EMPTY_DORA));
  await page.route(`${API}/api/agent/status`, (route) =>
    attempt === 0 ? fulfillJson(route, 500, { ok: false, error: 'boom' }) : fulfillJson(route, 200, OFFLINE_STATUS));

  await page.locator('[data-feature="metrics"]').click();
  await expect(page.locator('#vcMetricsError')).toBeVisible();
  await expect(page.locator('#vcMetricsRetry')).toBeVisible();
  await expect(page.locator('#vcMetricsSourceBadge')).toHaveText('FALLBACK LOCAL');
  await expect(page.locator('#vcMetricsBody')).toBeHidden();

  attempt = 1;
  await page.locator('#vcMetricsRetry').click();
  await expect(page.locator('#vcMetricsError')).toBeHidden();
  await expect(page.locator('#vcMetricsSourceBadge')).toHaveText('DADOS REAIS');
  await expect(page.locator('#vcMetricsBody')).toBeVisible();
});

test('(f) raw JSON toggle shows/hides the underlying payload as text', async ({ page }) => {
  await page.goto(NEXT_URL);
  await mockMetrics(page, {
    agents: { ok: true, agents: [{ name: 'OpenClaw', status: 'ok', cost_usd: 0.5 }], anti_stub: true },
    dora: EMPTY_DORA,
    status: { ok: true, connected: true, last_seen_ms_ago: 1000, agent_id: 'a1', mode: 'connected', anti_stub: true }
  });
  await page.locator('[data-feature="metrics"]').click();

  await expect(page.locator('#vcMetricsRaw')).toBeHidden();
  await page.locator('#vcMetricsRawToggle').check();
  await expect(page.locator('#vcMetricsRaw')).toBeVisible();
  await expect(page.locator('#vcMetricsRaw')).toContainText('"name": "OpenClaw"');
  await page.locator('#vcMetricsRawToggle').uncheck();
  await expect(page.locator('#vcMetricsRaw')).toBeHidden();
});
