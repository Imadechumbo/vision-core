// @ts-check
/**
 * Vision Core Next - Software Factory smoke tests.
 * All API calls are mocked; no LLM/provider/backend/prod request is allowed.
 *
 * PERMANENT SPEC (not a temp validation spec — see docs/CURRENT_STATE.md):
 * Software Factory is being built across multiple agent handoffs (Codex/
 * OpenCode/Claude Code) with no per-step human review, same rationale as
 * vision-core-next-agent-apply.spec.mjs.
 *
 * Every mocked POST returns {job_id, status:'pending'} + a follow-up GET
 * /api/sf/job/:id poll — that is the real backend contract (SF_GENERATORS
 * handlers always respond this way, server.js:4436-4439). The poll mock's
 * `result` field is a PLAIN STRING, not an object with content/files/output
 * sub-fields: GET /api/sf/job/:id does `result: job.result.result` at the
 * top level (server.js:4449), i.e. it unwraps to the raw generator text.
 * `files` only gets populated for the unrelated /api/sf/project-files
 * endpoint (§187), never for mission-composer/deploy-blueprint/worker-
 * handoff/gold-gate — do not mock `.files` on those, it never happens
 * against the real server. Verified by reading server.js directly, not
 * assumed.
 */

import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const NEXT_URL = pathToFileURL(path.resolve('frontend/vision-core-next.html')).toString();
const API = 'https://visioncore-api-gateway.weiganlight.workers.dev';

// vision-core-next.html polls /api/agent/status (10s interval, header badge)
// and /api/mission/quota (sidebar badge) unconditionally on load — every test
// that goes to NEXT_URL must mock both or it leaks a real request to the
// production gateway. Confirmed empirically (page.on('request') listener)
// before adding this, not assumed.
test.beforeEach(async ({ page }) => {
  await page.route(`${API}/api/agent/status`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, connected: false }) }));
  await page.route(`${API}/api/mission/quota`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, plan: 'free', remaining: 5 }) }));
});

function mockAsyncSfEndpoints(page, textByEndpoint) {
  const posts = [];
  const polls = [];
  const results = new Map();
  let seq = 0;

  async function queueJob(route, text) {
    seq += 1;
    const id = `job-${seq}`;
    posts.push(route.request().postDataJSON());
    results.set(id, text);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, job_id: id })
    });
  }

  const routes = [
    page.route(`${API}/api/sf/mission-composer`, (route) => queueJob(route, textByEndpoint['mission-composer'])),
    page.route(`${API}/api/sf/worker-handoff`, (route) => queueJob(route, textByEndpoint['worker-handoff'])),
    page.route(`${API}/api/sf/job/**`, async (route) => {
      const id = route.request().url().split('/').pop();
      polls.push(id);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, status: 'done', result: results.get(id) || null, files: null, provider: 'mock' })
      });
    })
  ];
  if (textByEndpoint['deploy-blueprint']) {
    routes.push(page.route(`${API}/api/sf/deploy-blueprint`, (route) => queueJob(route, textByEndpoint['deploy-blueprint'])));
  }
  const extraEndpointKeys = ['context-snapshot', 'patch-validator', 'risk-assessor', 'rollback-planner'];
  for (const key of extraEndpointKeys) {
    if (textByEndpoint[key]) {
      routes.push(page.route(`${API}/api/sf/${key}`, (route) => queueJob(route, textByEndpoint[key])));
    }
  }
  if (textByEndpoint['gold-gate']) {
    routes.push(page.route(`${API}/api/sf/gold-gate`, (route) => queueJob(route, textByEndpoint['gold-gate'])));
  }
  return Promise.all(routes).then(() => ({ posts, polls }));
}

test('Software Factory opens as chat context without hiding the chat stage', async ({ page }) => {
  await page.goto(NEXT_URL);
  await expect(page.locator('.vc-chat-stage')).toBeVisible();
  await expect(page.locator('#factory')).toBeHidden();

  await page.locator('[data-feature="factory"]').first().click();
  await expect(page.locator('#factory')).toBeVisible();
  await expect(page.locator('.vc-chat-stage')).toBeVisible();
  await expect(page.locator('#vcComposer')).toBeVisible();
  await expect(page.locator('#vcSfComposer')).toBeVisible();
  await expect(page.locator('#vcSfLog')).toBeHidden();
  await expect(page.locator('#vcSfFinal')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Auto-Pilot' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Modo Avancado' })).toBeVisible();

  await page.locator('[data-feature="chat"]').first().click();
  await expect(page.locator('.vc-chat-stage')).toBeVisible();
  await expect(page.locator('#factory')).toBeHidden();
});

test('URL context: rejects invalid URL without calling fetch-url', async ({ page }) => {
  let called = false;
  await page.route(`${API}/api/sf/fetch-url`, async (route) => { called = true; await route.abort(); });

  await page.goto(NEXT_URL);
  await page.locator('[data-feature="factory"]').first().click();
  await expect(page.locator('#vcSfUrlFetchBtn')).toBeDisabled();
  await page.locator('#vcSfUrlContext').fill('not-a-url');
  await page.locator('#vcSfUrlFetchBtn').click();
  await expect(page.locator('#vcSfUrlStatus')).toContainText('URL http(s) válida');
  expect(called).toBe(false);
});

test('URL context: fetches real contract shape and includes it in the next mission', async ({ page }) => {
  let fetchedUrl = null;
  await page.route(`${API}/api/sf/fetch-url`, async (route) => {
    fetchedUrl = route.request().postDataJSON().url;
    // POST /api/sf/fetch-url is synchronous — {ok, content, url}, no job_id
    // (server.js:4485-4520, verified before writing this mock).
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, content: 'Documento de referência: usar arquitetura hexagonal.', url: fetchedUrl })
    });
  });
  const { posts } = await mockAsyncSfEndpoints(page, {
    'mission-composer': 'mission composer ok',
    'deploy-blueprint': 'deploy blueprint ok',
    'worker-handoff':   'worker handoff ok'
  });

  await page.goto(NEXT_URL);
  await page.locator('[data-feature="factory"]').first().click();
  await page.locator('#vcSfPassGold').uncheck();
  await page.locator('#vcSfUrlContext').fill('https://exemplo.com/doc');
  await page.locator('#vcSfUrlFetchBtn').click();
  await expect(page.locator('#vcSfUrlStatus')).toContainText('Contexto capturado');
  expect(fetchedUrl).toBe('https://exemplo.com/doc');

  await page.locator('#vcPrompt').fill('um app seguindo o documento de referência');
  await page.getByRole('button', { name: 'Gerar Projeto com o composer' }).click();
  await expect(page.locator('#vcSfHistory')).toContainText('Projeto concluído!', { timeout: 10_000 });
  await expect(page.locator('#vcSfLog')).toContainText('URL_CONTEXT incluído');
  // full_context só vai a partir do 2o passo (idx > 0) — mesmo padrão já usado pro contexto acumulado de steps anteriores.
  expect(posts[1].full_context).toContain('Documento de referência: usar arquitetura hexagonal.');
});

test('URL context: backend error surfaces a readable message, mission still works without it', async ({ page }) => {
  await page.route(`${API}/api/sf/fetch-url`, async (route) => {
    await route.fulfill({ status: 408, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'timeout' }) });
  });
  await mockAsyncSfEndpoints(page, {
    'mission-composer': 'mission composer ok',
    'deploy-blueprint': 'deploy blueprint ok',
    'worker-handoff':   'worker handoff ok'
  });

  await page.goto(NEXT_URL);
  await page.locator('[data-feature="factory"]').first().click();
  await page.locator('#vcSfPassGold').uncheck();
  await page.locator('#vcSfUrlContext').fill('https://exemplo.com/timeout');
  await page.locator('#vcSfUrlFetchBtn').click();
  await expect(page.locator('#vcSfUrlStatus')).toContainText('Erro ao buscar URL');

  await page.locator('#vcPrompt').fill('um app mesmo sem o contexto da URL');
  await page.getByRole('button', { name: 'Gerar Projeto com o composer' }).click();
  await expect(page.locator('#vcSfHistory')).toContainText('Projeto concluído!', { timeout: 10_000 });
});

test('Software Factory Auto-Pilot runs six steps (5 + PASS GOLD default-on) via real job_id + polling contract', async ({ page }) => {
  const { posts, polls } = await mockAsyncSfEndpoints(page, {
    'mission-composer': 'mission composer ok',
    'deploy-blueprint': 'deploy blueprint ok',
    'worker-handoff':   'worker handoff ok',
    'gold-gate':        'GOLD GATE CHECKLIST\nVEREDICTO: PASS GOLD'
  });

  await page.goto(NEXT_URL);
  await page.locator('[data-feature="factory"]').first().click();
  // PASS GOLD vem marcado por padrão no HTML — Auto-Pilot deve rodar o 6o passo sem o usuário mexer em nada.
  await expect(page.locator('#vcSfPassGold')).toBeChecked();
  await page.locator('#vcPrompt').fill('um app de tarefas com login e dashboard');
  await page.getByRole('button', { name: 'Gerar Projeto com o composer' }).click();

  await expect(page.locator('#vcSfHistory')).toContainText('Projeto concluído!', { timeout: 10_000 });
  await expect(page.locator('#vcSfProgress')).toContainText('06 — Validar PASS GOLD');
  await expect(page.locator('#vcSfFinal')).toBeVisible();
  await expect(page.locator('#vcSfFinalBody')).toContainText('worker handoff ok');
  await expect(page.locator('#vcSfFinalBody')).toContainText('VEREDICTO: PASS GOLD');
  expect(posts).toHaveLength(6);
  expect(polls).toHaveLength(6);
  expect(posts[0]).toMatchObject({ autopilot: true, step: 0, total_steps: 6 });
  expect(posts[5]).toMatchObject({ module: 'gold_gate', step: 5, total_steps: 6 });
});

// Achado real (2026-07-13): o Next nunca chamava POST /api/mission/timeline
// -- só o frontend legado registrava runs do Auto-Pilot, então a Mission
// History (Missions) e a aba Timeline sempre ficavam vazias mesmo depois
// de rodar Auto-Pilot dentro do Next. Mesmo payload/contrato do legado
// (verificado em backend/server.js:1411), disparado só no caminho de
// sucesso (nunca em erro/step incompleto).
test('Software Factory Auto-Pilot logs the completed run to POST /api/mission/timeline', async ({ page }) => {
  const { posts } = await mockAsyncSfEndpoints(page, {
    'mission-composer': 'mission composer ok',
    'deploy-blueprint': 'deploy blueprint ok',
    'worker-handoff':   'worker handoff ok',
    'gold-gate':        'GOLD GATE CHECKLIST\nVEREDICTO: PASS GOLD'
  });
  const timelinePosts = [];
  await page.route(`${API}/api/mission/timeline`, (route) => {
    if (route.request().method() === 'POST') timelinePosts.push(route.request().postDataJSON());
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, logged: true, anti_stub: true }) });
  });

  await page.goto(NEXT_URL);
  await page.locator('[data-feature="factory"]').first().click();
  await page.locator('#vcPrompt').fill('um app de tarefas com login e dashboard');
  await page.getByRole('button', { name: 'Gerar Projeto com o composer' }).click();
  await expect(page.locator('#vcSfHistory')).toContainText('Projeto concluído!', { timeout: 10_000 });

  expect(posts).toHaveLength(6);
  expect(timelinePosts).toHaveLength(1);
  expect(timelinePosts[0]).toMatchObject({
    type: 'sf-autopilot',
    description: 'um app de tarefas com login e dashboard',
    steps_completed: 6,
    source: 'sf-autopilot-next',
    pass_gold: true
  });
  expect(timelinePosts[0].title).toContain('um app de tarefas com login e dashboard');
});

test('Software Factory does not log an incomplete run to the timeline (mid-pipeline failure)', async ({ page }) => {
  let jobSeq = 0;
  await page.route(`${API}/api/sf/mission-composer`, (route) => {
    jobSeq += 1;
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, job_id: 'job-' + jobSeq }) });
  });
  await page.route(`${API}/api/sf/job/**`, (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: false, status: 'error', error: 'boom' }) });
  });
  const timelinePosts = [];
  await page.route(`${API}/api/mission/timeline`, (route) => {
    if (route.request().method() === 'POST') timelinePosts.push(route.request().postDataJSON());
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, logged: true, anti_stub: true }) });
  });

  await page.goto(NEXT_URL);
  await page.locator('[data-feature="factory"]').first().click();
  await page.locator('#vcPrompt').fill('missao que vai falhar');
  await page.getByRole('button', { name: 'Gerar Projeto com o composer' }).click();
  await expect(page.locator('#vcSfHistory')).toContainText('falhou', { timeout: 10_000 });

  expect(timelinePosts).toEqual([]);
});

test('Software Factory renders a step chart (duration bar + DONE/FAIL/BLOCKED donut + progress gauge)', async ({ page }) => {
  await mockAsyncSfEndpoints(page, {
    'mission-composer': 'mission composer ok',
    'deploy-blueprint': 'deploy blueprint ok',
    'worker-handoff':   'worker handoff ok',
    'gold-gate':        'GOLD GATE CHECKLIST\nVEREDICTO: PASS GOLD'
  });

  await page.goto(NEXT_URL);
  await page.locator('[data-feature="factory"]').first().click();
  await page.locator('#vcPrompt').fill('um app de tarefas com login e dashboard');
  await page.getByRole('button', { name: 'Gerar Projeto com o composer' }).click();

  await expect(page.locator('#vcSfHistory')).toContainText('Projeto concluído!', { timeout: 10_000 });
  const viz = page.locator('#vcSfFinalViz');
  await expect(viz).toBeVisible();
  await expect(viz.locator('.vc-metric-chart[aria-label]')).toHaveCount(3);
  await expect(viz).toContainText('Etapas — DONE / FAIL / BLOCKED');
  await expect(viz).toContainText('Duração por etapa');
  await expect(viz).toContainText('Progresso do pipeline');
  await expect(viz).toContainText('6/6');
});

test('Software Factory step chart marks remaining steps BLOCKED on a mid-pipeline failure', async ({ page }) => {
  await page.route(`${API}/api/sf/mission-composer`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, job_id: 'job-1' }) }));
  await page.route(`${API}/api/sf/job/job-1`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, status: 'done', result: 'mission composer ok' }) }));
  await page.route(`${API}/api/sf/deploy-blueprint`, (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'boom' }) }));

  await page.goto(NEXT_URL);
  await page.locator('[data-feature="factory"]').first().click();
  await page.locator('#vcPrompt').fill('um app que vai falhar no meio do pipeline');
  await page.getByRole('button', { name: 'Gerar Projeto com o composer' }).click();

  const viz = page.locator('#vcSfFinalViz');
  await expect(viz).toBeVisible();
  await expect(viz).toContainText('1/6');
  await expect(page.locator('#vcSfFinal')).toBeHidden();
});

test('Software Factory runs selected optional generator steps before PASS GOLD', async ({ page }) => {
  const { posts, polls } = await mockAsyncSfEndpoints(page, {
    'mission-composer': 'mission composer ok',
    'deploy-blueprint': 'deploy blueprint ok',
    'worker-handoff':   'worker handoff ok',
    'context-snapshot': 'context snapshot ok',
    'risk-assessor':    'risk assessor ok',
    'gold-gate':        'GOLD GATE CHECKLIST\nVEREDICTO: PASS GOLD'
  });

  await page.goto(NEXT_URL);
  await page.locator('[data-feature="factory"]').first().click();
  await page.locator('[data-sf-extra-step="context-snapshot"]').check();
  await page.locator('[data-sf-extra-step="risk-assessor"]').check();
  await page.locator('#vcPrompt').fill('um app com snapshot de contexto e risco');
  await page.getByRole('button', { name: 'Gerar Projeto com o composer' }).click();

  await expect.poll(() => posts.length, { timeout: 10_000 }).toBe(8);
  await expect(page.locator('#vcSfProgress')).toContainText('E1');
  await expect(page.locator('#vcSfProgress')).toContainText('E3');
  await expect(page.locator('#vcSfFinalBody')).toContainText('context snapshot ok');
  await expect(page.locator('#vcSfFinalBody')).toContainText('risk assessor ok');
  expect(posts).toHaveLength(8);
  expect(polls).toHaveLength(8);
  expect(posts.map((post) => post.module)).toEqual([
    'project_builder',
    'export_preview',
    'project_templates',
    'mission_composer',
    'worker_handoff',
    'context_snapshot',
    'risk_assessor',
    'gold_gate'
  ]);
  expect(posts[5]).toMatchObject({ module: 'context_snapshot', step: 5, total_steps: 8 });
  expect(posts[6]).toMatchObject({ module: 'risk_assessor', step: 6, total_steps: 8 });
  expect(posts[7]).toMatchObject({ module: 'gold_gate', step: 7, total_steps: 8 });
  expect(posts[0].sf_options).toMatchObject({
    extra_steps: ['context-snapshot', 'risk-assessor'],
    real_execution_allowed: false,
    deploy_allowed: false,
    writes_disk: false
  });
});
test('Software Factory skips gold-gate step when PASS GOLD is unchecked', async ({ page }) => {
  const { posts } = await mockAsyncSfEndpoints(page, {
    'mission-composer': 'mission composer ok',
    'deploy-blueprint': 'deploy blueprint ok',
    'worker-handoff':   'worker handoff ok'
  });
  let goldGateCalled = false;
  await page.route(`${API}/api/sf/gold-gate`, async (route) => { goldGateCalled = true; await route.abort(); });

  await page.goto(NEXT_URL);
  await page.locator('[data-feature="factory"]').first().click();
  await page.locator('#vcSfPassGold').uncheck();
  await page.locator('#vcPrompt').fill('um app sem validacao de gold gate');
  await page.getByRole('button', { name: 'Gerar Projeto com o composer' }).click();

  await expect(page.locator('#vcSfHistory')).toContainText('Projeto concluído!', { timeout: 10_000 });
  expect(posts).toHaveLength(5);
  expect(goldGateCalled).toBe(false);
});

test('Software Factory advanced mode sends explicit safe options only', async ({ page }) => {
  const { posts } = await mockAsyncSfEndpoints(page, {
    'mission-composer': 'advanced ok',
    'deploy-blueprint': 'deploy blueprint advanced ok',
    'worker-handoff':   'handoff ok',
    'gold-gate':        'GOLD GATE CHECKLIST\nVEREDICTO: PASS GOLD'
  });

  await page.goto(NEXT_URL);
  await page.locator('[data-feature="factory"]').first().click();
  await page.getByRole('button', { name: 'Modo Avancado' }).click();
  await page.locator('#vcSfProvider').selectOption('groq');
  await page.locator('#vcSfModel').fill('llama-test');
  await page.locator('#vcPrompt').fill('um CRM interno com perfis e auditoria');
  await page.getByRole('button', { name: 'Gerar Projeto com o composer' }).click();
  await expect.poll(() => posts.length, { timeout: 10_000 }).toBe(6);
  await expect(page.locator('#vcSfLog')).toContainText('real_execution_allowed=false');
  await expect(page.locator('#vcSfLog')).toContainText('provider=groq');
  await expect(page.locator('#vcSfFinal')).toBeVisible();
  await expect(page.locator('#vcSfFinalBody')).toContainText('handoff ok');
  expect(posts[0].sf_options).toMatchObject({
    mode: 'advanced',
    provider: 'groq',
    model: 'llama-test',
    dry_run: true,
    pass_gold: true,
    real_execution_allowed: false,
    deploy_allowed: false,
    writes_disk: false
  });
  expect(posts[0].sf_options.stack).toContain('React');
  expect(posts[0].sf_options.stack).toContain('PostgreSQL');
  expect(posts[0].architecture_preview).toMatchObject({
    project_type: 'SaaS fullstack',
    source: 'local_deterministic'
  });
  expect(posts[0].architecture_preview.timeline).toEqual(
    expect.arrayContaining([expect.objectContaining({ name: 'Arquitetura e stack', agent: 'OpenClaw' })])
  );
});

test('Advanced Architect suggests stack from composer and posts the suggestion to chat without auto-running', async ({ page }) => {
  let missionComposerPosts = 0;
  await page.route(`${API}/api/sf/mission-composer`, async (route) => {
    missionComposerPosts += 1;
    await route.abort();
  });

  await page.goto(NEXT_URL);
  await page.locator('#vcPrompt').fill('quero um SaaS com login, dashboard e pagamentos');
  await page.locator('[data-feature="factory"]').first().click();
  await page.getByRole('button', { name: 'Modo Avancado' }).click();

  await expect(page.locator('#vcSfAdvancedPanel')).toBeVisible();
  await expect(page.locator('#vcSfMissionSummary')).toContainText('SaaS fullstack');
  await expect(page.locator('#vcSfSuggestion')).toContainText('React');
  await expect(page.locator('#vcSfSuggestion')).toContainText('PostgreSQL');
  await expect(page.locator('#vcSfStackCatalog')).toContainText('Linguagens');
  await expect(page.locator('#vcSfStackGraph')).toContainText('Session Auth');
  await expect(page.locator('.vc-message-assistant').last()).toContainText('Nada foi executado.');
  expect(missionComposerPosts).toBe(0);
});

test('Advanced stack graph is manually editable and reports compatibility warnings', async ({ page }) => {
  await page.goto(NEXT_URL);
  await page.locator('#vcPrompt').fill('MVP simples com uma interface web');
  await page.locator('[data-feature="factory"]').first().click();
  await page.getByRole('button', { name: 'Modo Avancado' }).click();
  await page.getByRole('button', { name: 'Resetar seleção' }).click();

  await expect(page.locator('#vcSfStackGraph')).toContainText('Nenhuma tecnologia selecionada');
  await page.getByRole('button', { name: 'React', exact: true }).click();
  await page.getByRole('button', { name: 'Vue', exact: true }).click();
  await page.getByRole('button', { name: 'Kubernetes', exact: true }).click();

  await expect(page.locator('#vcSfStackGraph')).toContainText('React');
  await expect(page.locator('#vcSfStackGraph')).toContainText('Vue');
  await expect(page.locator('#vcSfWarnings')).toContainText('múltiplos frameworks frontend');
  await expect(page.locator('#vcSfWarnings')).toContainText('Kubernetes costuma ser excesso');

  await page.locator('[data-remove-tech-id]').first().click();
  await expect(page.locator('#vcSfPreview')).toContainText('Stack selecionada');
});

test('Advanced timeline and agent matrix are navigable without destructive execution', async ({ page }) => {
  await page.goto(NEXT_URL);
  await page.locator('#vcPrompt').fill('sistema de IA com RAG e agentes');
  await page.locator('[data-feature="factory"]').first().click();
  await page.getByRole('button', { name: 'Modo Avancado' }).click();

  await expect(page.locator('#vcSfAgentMatrix')).toContainText('Aegis');
  await expect(page.locator('#vcSfAgentMatrix')).toContainText('REQUIRED');
  await expect(page.locator('#vcSfTimeline')).toContainText('06 Comando para criação real');
  await page.locator('[data-timeline-id="command"]').click();
  await expect(page.locator('#vcSfTimelineDetail')).toContainText('bloqueado para execução real');

  const openClaw = page.locator('[data-agent-id="openclaw"]');
  await expect(openClaw).toHaveText('ON');
  await openClaw.click();
  await expect(openClaw).toHaveText('OFF');
  await expect(page.locator('#vcSfPreview')).toContainText('real_execution_allowed=false');
});

test('Software Factory follows async job_id polling without real network', async ({ page }) => {
  const { posts, polls } = await mockAsyncSfEndpoints(page, {
    'mission-composer': 'async composer ok',
    'deploy-blueprint': 'async deploy blueprint ok',
    'worker-handoff':   'async handoff ok',
    'gold-gate':        'GOLD GATE CHECKLIST\nVEREDICTO: PASS GOLD'
  });

  await page.goto(NEXT_URL);
  await page.locator('[data-feature="factory"]').first().click();
  await page.locator('#vcPrompt').fill('um app async com fila de geração');
  await page.getByRole('button', { name: 'Gerar Projeto com o composer' }).click();

  await expect(page.locator('#vcSfHistory')).toContainText('Projeto concluído!', { timeout: 10_000 });
  await expect(page.locator('#vcSfFinalBody')).toContainText('async handoff ok');
  expect(posts).toHaveLength(6);
  expect(polls).toHaveLength(6);
  expect(posts[0].sf_options).toMatchObject({
    real_execution_allowed: false,
    deploy_allowed: false,
    writes_disk: false
  });
});

// ARCHITECTURAL PRINCIPLE-004 (achado real, 2026-07-12): .vc-sf-stage (grid
// de 2-3 colunas do Modo Avancado) ficava preso a min(940px,100%) -- ganha
// largura total só no Modo Avancado (Auto-Pilot fica igual, não precisa).
test('Software Factory Modo Avancado ganha largura total, Auto-Pilot permanece em 940px', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(NEXT_URL);
  await page.locator('[data-feature="factory"]').first().click();

  await expect(page.locator('#factory')).not.toHaveClass(/vc-sf-stage--wide/);
  const autoWidth = await page.locator('#factory').evaluate((el) => el.getBoundingClientRect().width);
  expect(autoWidth, 'Auto-Pilot must stay at the 940px cap').toBeLessThanOrEqual(940);

  await page.getByRole('button', { name: 'Modo Avancado' }).click();
  await expect(page.locator('#factory')).toHaveClass(/vc-sf-stage--wide/);
  const advancedWidth = await page.locator('#factory').evaluate((el) => el.getBoundingClientRect().width);
  expect(advancedWidth, 'Modo Avancado must render wider than the 940px cap').toBeGreaterThan(940);

  await page.getByRole('button', { name: 'Auto-Pilot' }).click();
  await expect(page.locator('#factory')).not.toHaveClass(/vc-sf-stage--wide/);
});
