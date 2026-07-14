// @ts-check
/**
 * Vision Core Next - App shell: composer-only mission input and Security Lab.
 * All API calls are mocked via page.route(); this spec must never touch the
 * real backend or any host outside localhost.
 *
 * PERMANENT SPEC (not a temp validation spec): the old floating Mission Input
 * must not return. The composer is the single operational mission input, and
 * Security Lab remains GET-only.
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

test('Mission Input panel is removed from the Next DOM and localStorage contract', async ({ page }) => {
  await page.goto(NEXT_URL);
  await expect(page.locator('#vcMissionInput')).toHaveCount(0);
  await expect(page.locator('#vcMissionInputToggle')).toHaveCount(0);
  await expect(page.locator('#vcMissionQuickInput')).toHaveCount(0);
  await expect(page.locator('#vcMissionQuickSend')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('vc_mission_input_collapsed'))).toBe(null);
});

test('composer is the only visible operational mission textarea, with Atomic Core in the right region', async ({ page }) => {
  await page.goto(NEXT_URL);
  await expect(page.locator('[data-atomic-core]')).toBeVisible();
  await expect(page.locator('#vcPrompt')).toBeVisible();
  await expect(page.locator('textarea:visible')).toHaveCount(1);
});

test('Smile guide opens manually, navigates, closes, and keeps composer as the only mission input', async ({ page }) => {
  await page.goto(NEXT_URL);
  await expect(page.locator('#vcSmileModal')).toBeHidden();

  await page.locator('[data-smile-open]').click();
  await expect(page.locator('#vcSmileModal')).toBeVisible();
  await expect(page.locator('#vcSmileTitle')).toHaveText('Comece pelo chat');
  await expect(page.locator('#vcSmileBody')).toContainText('composer principal');
  await expect(page.locator('textarea:visible')).toHaveCount(1);

  await page.locator('#vcSmileNext').click();
  await expect(page.locator('#vcSmileTitle')).toHaveText('Escolha o fluxo');
  await page.locator('#vcSmilePrev').click();
  await expect(page.locator('#vcSmileTitle')).toHaveText('Comece pelo chat');

  await page.keyboard.press('Escape');
  await expect(page.locator('#vcSmileModal')).toBeHidden();
});

test('Software Factory uses the composer text without a second textarea or auto-run on selection', async ({ page }) => {
  let missionComposerPosts = 0;
  await page.route(`${API}/api/sf/mission-composer`, (route) => {
    missionComposerPosts += 1;
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, job_id: `sf-mc-${missionComposerPosts}` }) });
  });
  await page.route(new RegExp(`${API.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/api/sf/job/sf-mc-\\d+$`), (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, status: 'done', result: 'mission ok' }) }));
  await page.route(`${API}/api/sf/deploy-blueprint`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, job_id: 'sf-blueprint' }) }));
  await page.route(`${API}/api/sf/job/sf-blueprint`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, status: 'done', result: 'blueprint ok' }) }));
  await page.route(`${API}/api/sf/worker-handoff`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, job_id: 'sf-worker' }) }));
  await page.route(`${API}/api/sf/job/sf-worker`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, status: 'done', result: 'worker ok' }) }));

  await page.goto(NEXT_URL);
  await page.locator('#vcPrompt').fill('gerar API de checkout com Stripe');
  await page.locator('[data-feature="factory"]').first().click();
  await expect(page.locator('#vcSfInput')).toHaveCount(0);
  await expect(page.locator('.vc-chat-stage')).toBeVisible();
  expect(missionComposerPosts).toBe(0);

  await page.locator('#vcSfPassGold').uncheck();
  await page.getByRole('button', { name: 'Gerar Projeto com o composer' }).click();
  await expect(page.locator('.vc-message-user').last()).toContainText('gerar API de checkout com Stripe');
  await expect(page.locator('#vcSfHistory')).toContainText('Projeto concluído!', { timeout: 10_000 });
  expect(missionComposerPosts).toBeGreaterThan(0);
});

test('Security Lab: renders governance card with correct copy, hidden outside the tab', async ({ page }) => {
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
  await expect(card).not.toContainText('Ãƒ');

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
  await expect(list.locator('[data-state="ok"]')).toHaveCount(2);
  await expect(list.locator('[data-state="local"]')).toHaveCount(4);
  await expect(list).toContainText('/api/status');
  await expect(list).toContainText('online');
  await expect(list).toContainText('indisponível localmente — fallback visual seguro');

  expect(seenMethods.every((m) => m === 'GET')).toBe(true);
  expect(seenMethods.length).toBe(SAFE_STATUS_PATHS.length);

  const viz = page.locator('#vcSafeStatusViz');
  await expect(viz.locator('.vc-metric-chart[aria-label]')).toHaveCount(3);
  await expect(viz).toContainText('Cobertura de políticas de segurança');
  await expect(viz).toContainText('Conformidade visual');
  await expect(viz).toContainText('Últimas verificações');
});

// DECISION-021 (2026-07-13): cabecalho generico ("VISION CORE" + tags de
// versao + status do agente) so aparece em Chat -- qualquer outra aba mostra
// um cabecalho curto reaproveitando featureMap[key].title/.status (mesmo
// texto ja usado em #vcFeatureTitle/#vcFeatureStatus, nunca copy nova).
test('generic header + Atomic Core only on chat; other tabs get a short role-specific header instead', async ({ page }) => {
  await page.goto(NEXT_URL);

  await expect(page.locator('#vcBrandLockup')).toBeVisible();
  await expect(page.locator('#vcAgentBadge')).toBeVisible();
  await expect(page.locator('#vcPageHead')).toBeHidden();

  await page.locator('a[data-feature="missions"]').click();
  await expect(page.locator('#vcBrandLockup')).toBeHidden();
  await expect(page.locator('#vcAgentBadge')).toBeHidden();
  await expect(page.locator('#vcPageHead')).toBeVisible();
  await expect(page.locator('#vcPageHeadTitle')).toHaveText('Missions');
  await expect(page.locator('#vcPageHeadStatus')).toHaveText('PATCH + DRY-RUN + APPLY BLOQUEADO');

  await page.locator('[data-feature="metrics"]').click();
  await expect(page.locator('#vcPageHeadTitle')).toHaveText('Métricas');
  await expect(page.locator('#vcPageHeadStatus')).toHaveText('SAFE READ');

  await page.locator('[data-feature="chat"]').click();
  await expect(page.locator('#vcBrandLockup')).toBeVisible();
  await expect(page.locator('#vcAgentBadge')).toBeVisible();
  await expect(page.locator('#vcPageHead')).toBeHidden();
});

test('Software Factory Modo Avancado also gets the short role header (Atomic Core hidden there per DECISION-021)', async ({ page }) => {
  await page.goto(NEXT_URL);
  await page.locator('[data-feature="factory"]').first().click();

  // Auto-Pilot: counts as chat-like for the Atomic Core (unchanged rule),
  // but the header block itself is chat-only per DECISION-021 -- Factory
  // gets the short role header in both SF modes.
  await expect(page.locator('#vcBrandLockup')).toBeHidden();
  await expect(page.locator('[data-atomic-core]')).not.toHaveClass(/is-collapsed/);
  await expect(page.locator('#vcPageHeadTitle')).toHaveText('Software Factory');

  await page.locator('[data-sf-mode="advanced"]').click();
  await expect(page.locator('[data-atomic-core]')).toHaveClass(/is-collapsed/);
  await expect(page.locator('#vcPageHeadTitle')).toHaveText('Software Factory');
});

test('short-header pages do not reserve the old Atomic Core / chat intro vertical space', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(NEXT_URL);

  await page.route(`${API}/api/metrics/agents`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, agents: [] }) }));
  await page.route(`${API}/api/metrics/summary`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }));
  await page.route(`${API}/api/dora-metrics`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }));
  await page.route(`${API}/api/metrics/memory`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }));
  await page.route(`${API}/api/vault/snapshots`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, snapshots: [] }) }));

  async function gapFor(feature, advanced = false) {
    await page.locator(`[data-feature="${feature}"]`).first().click();
    if (advanced) await page.locator('[data-sf-mode="advanced"]').click();
    await page.waitForTimeout(100);
    return page.evaluate(() => {
      const head = document.querySelector('#vcPageHead:not([hidden]), #vcBrandLockup:not([hidden])');
      const panel = document.querySelector('#factory:not([hidden]), #vcFeaturePanel');
      const atomic = document.querySelector('[data-atomic-core]');
      const stream = document.querySelector('#vcChatStream');
      return {
        gap: Math.round(panel.getBoundingClientRect().top - head.getBoundingClientRect().bottom),
        atomicDisplay: getComputedStyle(atomic).display,
        streamDisplay: getComputedStyle(stream).display
      };
    });
  }

  for (const target of [
    ['missions', false],
    ['metrics', false],
    ['vault', false],
    ['factory', true]
  ]) {
    const result = await gapFor(target[0], target[1]);
    expect(result.gap, `${target[0]} should start just below the short header`).toBeLessThanOrEqual(80);
    expect(result.atomicDisplay, `${target[0]} should not keep invisible Atomic Core space`).toBe('none');
    expect(result.streamDisplay, `${target[0]} should not keep invisible chat stream space`).toBe('none');
  }

  const chat = await gapFor('chat');
  expect(chat.atomicDisplay).toBe('block');
  expect(chat.streamDisplay).toBe('flex');
  expect(chat.gap, 'Chat still owns the large Atomic Core/chat stream composition').toBeGreaterThan(250);
});

test('Security Lab: missing status endpoints still render a calm, non-error fallback', async ({ page }) => {
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
