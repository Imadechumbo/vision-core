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

test('Tutorial opens manually, exposes 13 steps, navigates, closes, and keeps composer as the only mission input', async ({ page }) => {
  await page.goto(NEXT_URL);
  await expect(page.locator('#vcSmileModal')).toBeHidden();
  await expect(page.getByText('Smile', { exact: true })).toHaveCount(0);
  await expect(page.locator('[data-smile-open]').first()).toContainText('Tutorial');

  await page.locator('[data-smile-open]').first().click();
  await expect(page.locator('#vcSmileModal')).toBeVisible();
  await expect(page.locator('#vcSmileTitle')).toHaveText('Bem-vindo ao Vision Core Next');
  await expect(page.locator('#vcTutorialCounter')).toHaveText('1 / 13');
  await expect(page.locator('#vcSmileSteps span')).toHaveCount(13);
  await expect(page.locator('textarea:visible')).toHaveCount(1);

  await page.locator('#vcSmileNext').click();
  await expect(page.locator('#vcSmileTitle')).toHaveText('Chat principal');
  await expect(page.locator('#vcTutorialCounter')).toHaveText('2 / 13');
  await page.locator('#vcSmilePrev').click();
  await expect(page.locator('#vcSmileTitle')).toHaveText('Bem-vindo ao Vision Core Next');

  await page.keyboard.press('Escape');
  await expect(page.locator('#vcSmileModal')).toBeHidden();
  await expect(page.locator('[data-smile-open]').first()).toBeFocused();
});

test('empty chat onboarding uses real OAuth, honest plans, and leaves after first message', async ({ page }) => {
  await page.route(`${API}/api/chat`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ answer: 'Resposta grounded.' }) }));
  await page.goto(NEXT_URL);
  const onboarding = page.locator('#vcChatOnboarding');
  await expect(onboarding).toBeVisible();
  await page.evaluate(() => window.localStorage.removeItem('vc_motion_os_hint_seen'));
  await page.reload();
  await expect(onboarding).toBeVisible();
  await expect(page.locator('#vcOnboardingGoogle')).toHaveAttribute('href', `${API}/api/auth/oauth/google?return_to=next`);
  await expect(onboarding).toContainText('5 missões por mês');
  await expect(onboarding).toContainText('Disponível em breve');
  await expect(onboarding).not.toContainText(/R\$|US\$|checkout/i);
  await page.locator('#vcOnboardingStart').click();
  await expect(page.locator('#vcPrompt')).toBeFocused();
  await page.locator('#vcPrompt').fill('Primeira missão');
  await page.locator('#vcComposer').evaluate((form) => form.requestSubmit());
  await expect(onboarding).toBeHidden();
  await expect(page.locator('.vc-message-user')).toContainText('Primeira missão');
});

test('all SaaS plans are selectable and unavailable plans stay honest without network or checkout', async ({ page }) => {
  let writes = 0;
  page.on('request', request => { if (request.method() !== 'GET') writes += 1; });
  await page.goto(NEXT_URL);

  await expect(page.locator('[data-plan]')).toHaveCount(3);
  await expect(page.locator('[data-plan="free"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-plan="pro"]').click();
  await expect(page.locator('[data-plan-card="pro"]')).toHaveClass(/is-selected/);
  await expect(page.locator('#vcPlanStatus')).toContainText('nenhum dado foi enviado');
  await page.locator('[data-plan="enterprise"]').click();
  await expect(page.locator('[data-plan-card="enterprise"]')).toHaveClass(/is-selected/);
  await expect(page.locator('#vcPlanStatus')).toContainText('Canal de vendas disponível em breve');
  await expect(page.locator('#vcChatOnboarding')).not.toContainText(/checkout|R\$|US\$/i);
  expect(writes).toBe(0);
});

test('empty-chat Hero starts below the header, shares the top row with Atomic Core, and composer stays at the viewport bottom', async ({ page }) => {
  await page.goto(NEXT_URL);
  const layout = await page.evaluate(() => {
    const header = document.querySelector('.vc-header').getBoundingClientRect();
    const hero = document.querySelector('#vcChatHero').getBoundingClientRect();
    const onboarding = document.querySelector('#vcChatOnboarding').getBoundingClientRect();
    const atomic = document.querySelector('[data-atomic-core]').getBoundingClientRect();
    const composer = document.querySelector('#vcComposer').getBoundingClientRect();
    return {
      gap: hero.top - header.bottom,
      onboardingTop: onboarding.top,
      atomicTop: atomic.top,
      composerBottomGap: window.innerHeight - composer.bottom,
      internalBuildCopy: document.querySelector('.vc-brand-copy small')?.textContent || ''
    };
  });
  expect(layout.gap).toBeLessThanOrEqual(40);
  expect(Math.abs(layout.onboardingTop - layout.atomicTop)).toBeLessThanOrEqual(80);
  expect(layout.composerBottomGap).toBeGreaterThanOrEqual(0);
  expect(layout.composerBottomGap).toBeLessThanOrEqual(24);
  expect(layout.internalBuildCopy).toBe('');
});

test('tutorial preference persists and Settings restarts it', async ({ page }) => {
  await page.goto(NEXT_URL);
  await page.locator('[data-smile-open]').first().click();
  await page.locator('#vcTutorialNoShow').check();
  await page.locator('#vcTutorialSkip').click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('vc_tutorial_hidden'))).toBe('1');
  await page.locator('a[data-feature="settings"]').click();
  await page.locator('#vcTutorialRestart').click();
  await expect(page.locator('#vcSmileModal')).toBeVisible();
  await expect(page.locator('#vcTutorialNoShow')).not.toBeChecked();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('vc_tutorial_hidden'))).toBe(null);
});

test('onboarding and tutorial remain bounded at 375px and hidden leaves layout', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(NEXT_URL);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const mobileLayout = await page.evaluate(() => {
    const header = document.querySelector('.vc-header').getBoundingClientRect();
    const hero = document.querySelector('#vcChatHero').getBoundingClientRect();
    const onboarding = document.querySelector('#vcChatOnboarding').getBoundingClientRect();
    const composer = document.querySelector('#vcComposer').getBoundingClientRect();
    return { gap: hero.top - header.bottom, onboardingWidth: onboarding.width, viewport: document.documentElement.clientWidth, composerBottomGap: window.innerHeight - composer.bottom };
  });
  expect(mobileLayout.gap).toBeLessThanOrEqual(40);
  expect(mobileLayout.onboardingWidth).toBeLessThanOrEqual(mobileLayout.viewport);
  expect(mobileLayout.composerBottomGap).toBeGreaterThanOrEqual(0);
  expect(mobileLayout.composerBottomGap).toBeLessThanOrEqual(24);
  const before = await page.locator('#vcChatOnboarding').evaluate((el) => el.getBoundingClientRect().height);
  expect(before).toBeGreaterThan(0);
  await page.locator('[data-smile-open]').first().click();
  await expect(page.locator('#vcChatOnboarding')).toBeHidden();
  expect(await page.locator('#vcChatOnboarding').evaluate((el) => el.getBoundingClientRect().height)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

for (const viewport of [
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 }
]) {
  test(`empty-chat Hero remains usable at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(NEXT_URL);
    const layout = await page.evaluate(() => {
      const onboarding = document.querySelector('#vcChatOnboarding').getBoundingClientRect();
      const atomic = document.querySelector('[data-atomic-core]');
      const atomicRect = atomic.getBoundingClientRect();
      const composer = document.querySelector('#vcComposer').getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        onboardingLeft: onboarding.left,
        onboardingRight: onboarding.right,
        viewportWidth: document.documentElement.clientWidth,
        atomicVisible: getComputedStyle(atomic).display !== 'none',
        overlapsAtomic: onboarding.left < atomicRect.right && onboarding.right > atomicRect.left && onboarding.top < atomicRect.bottom && onboarding.bottom > atomicRect.top,
        composerWidth: composer.width
      };
    });
    expect(layout.overflow).toBe(false);
    expect(layout.onboardingLeft).toBeGreaterThanOrEqual(0);
    expect(layout.onboardingRight).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.composerWidth).toBeGreaterThan(0);
    if (layout.atomicVisible) expect(layout.overlapsAtomic).toBe(false);
  });
}

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

// DECISION-022 (2026-07-13): cabecalho generico ("VISION CORE" + tags de
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

test('Software Factory gets the short role header and no Atomic Core in both modes (DECISION-022)', async ({ page }) => {
  await page.goto(NEXT_URL);
  await page.locator('[data-feature="factory"]').first().click();

  await expect(page.locator('#vcBrandLockup')).toBeHidden();
  await expect(page.locator('[data-atomic-core]')).toHaveClass(/is-collapsed/);
  await expect(page.locator('#vcPageHeadTitle')).toHaveText('Software Factory');
  await expect(page.locator('#vcFeaturePanel')).toBeHidden();
  await expect(page.locator('#factory')).toBeVisible();

  await page.locator('[data-sf-mode="advanced"]').click();
  await expect(page.locator('[data-atomic-core]')).toHaveClass(/is-collapsed/);
  await expect(page.locator('#vcPageHeadTitle')).toHaveText('Software Factory');
  await expect(page.locator('#vcFeaturePanel')).toBeHidden();
  await expect(page.locator('#factory')).toBeVisible();
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
      const panel = document.querySelector('#factory:not([hidden]), #vcFeaturePanel:not([hidden]), #vcChatHero:not([hidden])');
      const atomic = document.querySelector('[data-atomic-core]');
      const stream = document.querySelector('#vcChatStream');
      const scroll = document.querySelector('#vcChatScroll');
      const featurePanel = document.querySelector('#vcFeaturePanel');
      return {
        gap: Math.round(panel.getBoundingClientRect().top - head.getBoundingClientRect().bottom),
        atomicDisplay: getComputedStyle(atomic).display,
        streamDisplay: getComputedStyle(stream).display,
        scrollDisplay: getComputedStyle(scroll).display,
        featurePanelHidden: featurePanel.hidden,
        internalHeadDisplay: getComputedStyle(document.querySelector('#vcFeaturePanel > .vc-feature-head')).display
      };
    });
  }

  for (const target of [
    ['missions', false],
    ['tools', false],
    ['metrics', false],
    ['vault', false],
    ['factory', false],
    ['factory', true]
  ]) {
    const result = await gapFor(target[0], target[1]);
    expect(result.gap, `${target[0]} should start just below the short header`).toBeLessThanOrEqual(80);
    expect(result.atomicDisplay, `${target[0]} should not keep invisible Atomic Core space`).toBe('none');
    expect(result.streamDisplay, `${target[0]} should not keep invisible chat stream space`).toBe('none');
    expect(result.internalHeadDisplay, `${target[0]} should not duplicate the short header inside the panel`).toBe('none');
    expect(result.featurePanelHidden, `${target[0]} generic feature panel visibility`).toBe(target[0] === 'factory');
    expect(result.scrollDisplay, `${target[0]} scroll container visibility`).toBe(target[0] === 'factory' ? 'none' : 'flex');
  }

  const chat = await gapFor('chat');
  expect(chat.atomicDisplay).toBe('block');
  expect(chat.streamDisplay).toBe('flex');
  expect(chat.scrollDisplay).toBe('flex');
  expect(chat.featurePanelHidden).toBe(true);
  expect(chat.gap, 'Chat Hero should start directly below the short header').toBeLessThanOrEqual(80);
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
