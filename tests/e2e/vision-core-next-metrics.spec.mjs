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
  await page.route(`${API}/api/metrics/summary`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(DEFAULT_SUMMARY) }));
  await page.route(`${API}/api/metrics/memory`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(DEFAULT_MEMORY) }));
});

function fulfillJson(route, status, body) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function mockMetrics(page, { agents, dora, summary, memory, status } = {}) {
  const routes = [];
  if (agents !== undefined) routes.push(page.route(`${API}/api/metrics/agents`, (r) => fulfillJson(r, 200, agents)));
  if (dora !== undefined) routes.push(page.route(`${API}/api/dora-metrics`, (r) => fulfillJson(r, 200, dora)));
  if (summary !== undefined) routes.push(page.route(`${API}/api/metrics/summary`, (r) => fulfillJson(r, 200, summary)));
  if (memory !== undefined) routes.push(page.route(`${API}/api/metrics/memory`, (r) => fulfillJson(r, 200, memory)));
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
const DEFAULT_SUMMARY = {
  ok: true,
  runtime: { cpu: 17, memory: 42, heap: 31, uptime_s: 120, node_version: 'v24.0.0', platform: 'win32' },
  anti_stub: true
};
const DEFAULT_MEMORY = {
  ok: true,
  total_escalations: 2,
  by_provider: { groq: 1, openrouter: 1 },
  memory_capable_entries: 2,
  legacy_entries_without_keywords: 0,
  last_escalation_at: '2026-07-10T12:00:00.000Z',
  data_source: '.vision-memory/hermes_low_confidence.jsonl',
  anti_stub: true
};

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
    summary: {
      ok: true,
      runtime: { cpu: 8, memory: 55, heap: 34, uptime_s: 3600, node_version: 'v24.1.0', platform: 'linux' },
      anti_stub: true
    },
    memory: {
      ok: true,
      total_escalations: 7,
      by_provider: { anthropic: 3, groq: 4 },
      memory_capable_entries: 6,
      legacy_entries_without_keywords: 1,
      last_escalation_at: '2026-07-10T10:30:00.000Z',
      data_source: '.vision-memory/hermes_low_confidence.jsonl',
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
  await expect(page.locator('#vcMetricsPanel .vc-metric-chart[aria-label]')).toHaveCount(17);
  await expect(page.locator('#vcMetricsPanel')).toContainText('Status dos agentes');
  await expect(page.locator('#vcMetricsPanel')).toContainText('Change failure rate');
  await expect(page.locator('#vcMetricsPanel')).toContainText('Load average');
  await expect(page.locator('#vcMetricsPanel')).toContainText('Entries memory layer');
  await expect(page.locator('#vcMetricsPanel')).toContainText('Disponibilidade');
  await expect(page.locator('#vcMetricsDoraGrid')).toContainText('2.4h avg (últimas 10)');
  await expect(page.locator('#vcMetricsRuntimeGrid')).toContainText('55%');
  await expect(page.locator('#vcMetricsRuntimeGrid')).toContainText('v24.1.0');
  await expect(page.locator('#vcMetricsMemoryGrid')).toContainText('anthropic: 3, groq: 4');
  await expect(page.locator('#vcMetricsMemoryGrid')).toContainText('.vision-memory/hermes_low_confidence.jsonl');
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
  await expect(page.locator('#vcMetricsAgentList')).toContainText('Sem dados numéricos de custo');
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
  await expect(page.locator('#vcMetricsDoraGrid')).toContainText('DORA retornou só estados vazios honestos.');
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
  await page.route(`${API}/api/metrics/summary`, (route) =>
    attempt === 0 ? fulfillJson(route, 500, { ok: false, error: 'boom' }) : fulfillJson(route, 200, DEFAULT_SUMMARY));
  await page.route(`${API}/api/metrics/memory`, (route) =>
    attempt === 0 ? fulfillJson(route, 500, { ok: false, error: 'boom' }) : fulfillJson(route, 200, DEFAULT_MEMORY));
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
  await expect(page.locator('#vcMetricsRaw')).toContainText('"summary"');
  await expect(page.locator('#vcMetricsRaw')).toContainText('"memory"');
  await page.locator('#vcMetricsRawToggle').uncheck();
  await expect(page.locator('#vcMetricsRaw')).toBeHidden();
});

test('(g) Agents safe-read renders charts instead of raw JSON as the main response', async ({ page }) => {
  await page.goto(NEXT_URL);
  await page.route(`${API}/api/metrics/agents`, (route) => fulfillJson(route, 200, {
    ok: true,
    agents: [
      { name: 'Hermes RCA', status: 'ok', cost_usd: 0.2, active_providers: ['groq'] },
      { name: 'Go Core', status: 'binary_not_found', cost_usd: null }
    ],
    active_llm_providers: ['groq'],
    anti_stub: true
  }));

  await page.locator('[data-feature="agents"]').click();
  await page.getByRole('button', { name: 'Métricas agentes' }).click();

  await expect(page.locator('#vcFeatureViz')).toBeVisible();
  await expect(page.locator('#vcFeatureViz .vc-metric-chart[aria-label]')).toHaveCount(4);
  await expect(page.locator('#vcFeatureViz')).toContainText('Status dos agentes');
  await expect(page.locator('.vc-message-assistant').last()).toContainText('2 agente(s) reportado(s). Veja o gráfico no painel.');
  await expect(page.locator('.vc-message-assistant').last()).not.toContainText('"agents"');

  // Regression for the reported production bug: the whole chat history —
  // not just the last message — must never contain the raw payload, and
  // the donut/bar/ranking charts must actually be the reachable content,
  // not just present-but-scrolled-out-of-view behind the sticky composer.
  const chatText = await page.locator('#vcChatStream').innerText();
  expect(chatText).not.toContain('"agents":[');
  expect(chatText).not.toContain('{"ok":true');

  await expect(page.locator('#vcFeatureViz')).toContainText('Custo por agente');
  await expect(page.locator('#vcFeatureViz')).toContainText('Ranking de atividade');
  await expect(page.locator('#vcFeatureViz .vc-donut-wrap')).toHaveCount(1);
  await expect(page.locator('#vcFeatureViz .vc-bar-chart')).toHaveCount(3);

  // #vcChatScroll is the internal scroll region (chat stream + feature
  // panel) — #vcComposer sits outside it. Real bug found in production:
  // the panel used to be part of the same unbounded page scroll as the
  // sticky composer, so a tall #vcFeatureViz rendered partly BEHIND the
  // composer box instead of above it. Assert the fix holds: either the
  // chart is fully above the composer, or (as implemented) the chart's
  // own scroll region has been scrolled so the chart's top is at/near the
  // top of its viewport — i.e. actually visible without further scrolling.
  const vizBox = await page.locator('#vcFeatureViz').boundingBox();
  const scrollBox = await page.locator('#vcChatScroll').boundingBox();
  const composerBox = await page.locator('#vcComposer').boundingBox();
  expect(vizBox).not.toBeNull();
  expect(scrollBox).not.toBeNull();
  expect(composerBox).not.toBeNull();
  const chartVisibleAtTop = Math.abs(vizBox.y - scrollBox.y) < 40;
  const chartFullyAboveComposer = vizBox.y + vizBox.height <= composerBox.y;
  expect(chartVisibleAtTop || chartFullyAboveComposer).toBe(true);

  // Section 17: raw JSON stays out of the main flow but is reachable behind
  // a diagnostic-only "Ver JSON bruto" toggle, same pattern as the Métricas
  // tab's #vcMetricsRawToggle.
  const rawPre = page.locator('#vcFeatureViz pre.vc-metrics-raw');
  await expect(rawPre).toBeHidden();
  await page.locator('#vcFeatureViz .vc-metrics-raw-toggle input[type="checkbox"]').check();
  await expect(rawPre).toBeVisible();
  await expect(rawPre).toContainText('"Hermes RCA"');
  await page.locator('#vcFeatureViz .vc-metrics-raw-toggle input[type="checkbox"]').uncheck();
  await expect(rawPre).toBeHidden();
});

test('(h) Tools marketplace safe-read renders status charts', async ({ page }) => {
  await page.goto(NEXT_URL);
  await page.route(`${API}/api/tools/marketplace`, (route) => fulfillJson(route, 200, {
    ok: true,
    tools: [
      { id: 'portainer', name: 'Portainer', status: 'ready-adapter' },
      { id: 'spiderfoot', name: 'SpiderFoot', status: 'osint-plugin-ready' }
    ]
  }));

  await page.locator('[data-feature="tools"]').click();
  await page.getByRole('button', { name: 'Marketplace' }).click();

  await expect(page.locator('#vcFeatureViz')).toBeVisible();
  await expect(page.locator('#vcFeatureViz')).toContainText('Tools por status');
  await expect(page.locator('#vcFeatureViz .vc-metric-chart[aria-label]')).toHaveCount(2);
});

test('(i) Security history safe-read renders charts without leaking secrets', async ({ page }) => {
  await page.goto(NEXT_URL);
  await page.route(`${API}/api/security/history`, (route) => fulfillJson(route, 200, {
    ok: true,
    history: [
      { type: 'scan', rule_id: 'no_secret_value', fixed: false, security_score: 80 },
      { type: 'fix', rule_id: 'env_guard', fixed: true, security_score: 100 }
    ],
    total: 2,
    anti_stub: true
  }));

  await page.locator('[data-feature="tools"]').click();
  await page.getByRole('button', { name: 'Histórico security' }).click();

  await expect(page.locator('#vcFeatureViz')).toBeVisible();
  await expect(page.locator('#vcFeatureViz')).toContainText('Eventos fixados vs pendentes');
  await expect(page.locator('#vcFeatureViz .vc-metric-chart[aria-label]')).toHaveCount(2);
  await expect(page.locator('body')).not.toContainText('sk-');
});
