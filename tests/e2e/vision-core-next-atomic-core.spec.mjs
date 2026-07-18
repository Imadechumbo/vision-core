// @ts-check
/**
 * Vision Core Next - Atomic Core idle animation (Chat only since
 * DECISION-022, 2026-07-13 -- see docs/DECISIONS.md).
 *
 * PERMANENT SPEC (not a temp validation spec — see docs/CURRENT_STATE.md).
 *
 * Product-direction correction (2026-07-09): the Atomic Core animation is
 * BRAND IDENTITY. The OS `prefers-reduced-motion` preference no longer
 * degrades it by default — the source of truth is the VC's own control
 * (`window.VCMotion`, backed by `localStorage['vc_animation_mode']`,
 * 'full' | 'reduced'). Default is always 'full', even when the OS reports
 * reduce. Only when the user explicitly sets reduced mode (Settings →
 * Animações, or programmatically via VCMotion.setMode) does the widget fall
 * back to the v47 pulse-only behavior (opacity/glow pulse, frozen position —
 * never fully static). This inverts the coupling from the previous session's
 * fix, which read `matchMedia('(prefers-reduced-motion: reduce)')` directly.
 *
 * Served over a real http:// origin (a throwaway static server over
 * frontend/), never file:// — required for localStorage set via
 * `page.addInitScript` (VC control) and `page.emulateMedia` (OS signal) to
 * combine reliably as two independent, real inputs, matching how a real
 * browsing session behaves.
 */

import { test, expect } from '@playwright/test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('frontend');
const API = 'https://visioncore-api-gateway.weiganlight.workers.dev';
const AGENT_SELECTOR = '[data-agent="hermes"]';

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

// vision-core-next.html polls /api/agent/status and /api/mission/quota
// unconditionally on load (header/sidebar badges) — unmocked, both leak a
// real request to the production gateway. Same fix as the other permanent
// specs (see docs/CURRENT_STATE.md).
test.beforeEach(async ({ page }) => {
  await page.route(`${API}/api/agent/status`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, connected: false }) }));
  await page.route(`${API}/api/mission/quota`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, plan: 'free', remaining: 5 }) }));
  // renderAtomicSidebarExtras (right-sidebar metric cards + timeline) also
  // fires unconditionally on every Chat-tab entry — same unmocked-leak risk
  // already documented above for agent/status + mission/quota.
  await page.route(`${API}/api/dora-metrics`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ deployment_frequency: null, mttr: null, pass_gold_count_30d: null }) }));
  await page.route(`${API}/api/mission/timeline*`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ entries: [], count: 0, authenticated: false, anti_stub: true }) }));
});

async function agentStyle(page) {
  return page.locator(AGENT_SELECTOR).evaluate((el) => ({
    transform: el.style.transform,
    filter: el.style.filter
  }));
}

test('default (no VC choice) + OS reduce emulated: orb still runs FULL — brand identity, not OS-controlled', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(NEXT_URL());
  const first = await agentStyle(page);
  await page.waitForTimeout(900);
  const second = await agentStyle(page);
  expect(second.transform, 'position must keep changing under OS reduce when VC control is at default (full)').not.toBe(first.transform);
});

test('default (no VC choice) + OS no-preference: orb runs FULL', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(NEXT_URL());
  const first = await agentStyle(page);
  await page.waitForTimeout(900);
  const second = await agentStyle(page);
  expect(second.transform).not.toBe(first.transform);
});

test('VC control = reduced (localStorage) + OS no-preference: orb pulses only — VC choice wins over OS', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('vc_animation_mode', 'reduced'));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(NEXT_URL());
  const t0 = await agentStyle(page);
  await page.waitForTimeout(1600); // > REDUCE_TICK_MS (500ms) and a slice of REDUCE_PULSE_MS (4200ms)
  const t1 = await agentStyle(page);

  expect(t1.transform, 'position must stay frozen when VC control is reduced, regardless of OS').toBe(t0.transform);
  expect(t1.filter, 'glow/opacity must still change — never fully static').not.toBe(t0.filter);
});

test('live switch, no reload: toggling Settings checkbox flips full <-> reduced immediately', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(NEXT_URL());

  // Starts full (default) despite OS reduce.
  const full0 = await agentStyle(page);
  await page.waitForTimeout(900);
  const full1 = await agentStyle(page);
  expect(full1.transform, 'starts in full motion by default').not.toBe(full0.transform);

  // Switch to reduced via the real Settings checkbox — no reload.
  await page.evaluate(() => {
    var el = document.getElementById('vcAnimationReduced');
    el.checked = true;
    el.dispatchEvent(new Event('change'));
  });
  const r0 = await agentStyle(page);
  await page.waitForTimeout(900);
  const r1 = await agentStyle(page);
  expect(r1.transform, 'position frozen immediately after switching to reduced, no reload').toBe(r0.transform);

  // Switch back to full — resumes continuous motion immediately.
  await page.evaluate(() => {
    var el = document.getElementById('vcAnimationReduced');
    el.checked = false;
    el.dispatchEvent(new Event('change'));
  });
  const f0 = await agentStyle(page);
  await page.waitForTimeout(900);
  const f1 = await agentStyle(page);
  expect(f1.transform, 'position resumes moving immediately after switching back to full, no reload').not.toBe(f0.transform);
});

test('VC control = reduced: state transition (idle -> action -> idle) still reflects on data-state and glow, no crash', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('vc_animation_mode', 'reduced'));
  await page.goto(NEXT_URL());
  const hud = page.locator('[data-atomic-core]');
  await expect(hud).toHaveAttribute('data-state', 'idle');

  const idleStyle = await agentStyle(page);
  await page.evaluate(() => window.setAtomicCoreState('action'));
  await expect(hud).toHaveAttribute('data-state', 'action');
  const actionStyle = await agentStyle(page);
  expect(actionStyle.filter, 'glow must reflect action state even under reduced VC control').not.toBe(idleStyle.filter);

  await page.evaluate(() => window.resetAtomicCore());
  await expect(hud).toHaveAttribute('data-state', 'idle');
});

for (const viewport of [
  { name: '1440x900', width: 1440, height: 900, visible: true },
  { name: '1366x768', width: 1366, height: 768, visible: true },
  { name: '1024x768', width: 1024, height: 768, visible: true },
  { name: '820x1180', width: 820, height: 1180, visible: false },
  { name: '390x844', width: 390, height: 844, visible: false }
]) {
  test(`Atomic Core layout is not clipped at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.addInitScript(() => window.localStorage.setItem('vc_animation_mode', 'reduced'));
    await page.goto(NEXT_URL());

    const result = await page.evaluate(() => {
      const hud = document.querySelector('[data-atomic-core]');
      const hudRect = hud?.getBoundingClientRect();
      if (!hud || !hudRect || hudRect.width === 0 || hudRect.height === 0) {
        return { visible: false, failures: [] };
      }

      const tolerance = 1;
      const selectors = [
        ...Array.from(hud.querySelectorAll('[data-agent]')),
        ...Array.from(hud.querySelectorAll('.vc-atomic-ring, .vc-orbit-ring, .vc-orbit-decagon, .vc-orbit-spokes line'))
      ];
      const failures = selectors.flatMap((el) => {
        const rect = el.getBoundingClientRect();
        const label = el.getAttribute('data-agent') || el.getAttribute('class') || el.tagName;
        const parts = [];
        if (rect.top < hudRect.top - tolerance) parts.push(`${label} top ${rect.top.toFixed(2)} < ${hudRect.top.toFixed(2)}`);
        if (rect.bottom > hudRect.bottom + tolerance) parts.push(`${label} bottom ${rect.bottom.toFixed(2)} > ${hudRect.bottom.toFixed(2)}`);
        if (rect.left < hudRect.left - tolerance) parts.push(`${label} left ${rect.left.toFixed(2)} < ${hudRect.left.toFixed(2)}`);
        if (rect.right > hudRect.right + tolerance) parts.push(`${label} right ${rect.right.toFixed(2)} > ${hudRect.right.toFixed(2)}`);
        return parts;
      });
      const style = getComputedStyle(hud);
      if (style.contain.includes('paint')) failures.push('hud contain still includes paint');
      if (hud.scrollHeight > hud.clientHeight + tolerance) failures.push(`scrollHeight ${hud.scrollHeight} > clientHeight ${hud.clientHeight}`);
      if (hud.scrollWidth > hud.clientWidth + tolerance) failures.push(`scrollWidth ${hud.scrollWidth} > clientWidth ${hud.clientWidth}`);
      return { visible: true, failures };
    });

    expect(result.visible).toBe(viewport.visible);
    expect(result.failures).toEqual([]);
  });
}

// DECISION-022 (2026-07-13): Software Factory deixou de contar como Chat.
// O widget ainda existe no DOM, mas fica colapsado e removido do layout por
// CSS em qualquer aba que não seja Chat.
test('Atomic Core is visible only on Chat, including no exception for Software Factory Auto-Pilot', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('vc_animation_mode', 'reduced'));
  await page.goto(NEXT_URL());
  const hud = page.locator('[data-atomic-core]');

  await expect(hud).not.toHaveClass(/is-collapsed/);

  await page.locator('a[data-feature="factory"]').click();
  await expect(hud, 'Auto-Pilot is no longer chat-like for the Atomic Core').toHaveClass(/is-collapsed/);
  await expect(hud).toHaveCSS('display', 'none');

  await page.locator('[data-sf-mode="advanced"]').click();
  await expect(hud, 'Modo Avancado also stays outside the Atomic Core scope').toHaveClass(/is-collapsed/);
  await expect(hud).toHaveCSS('display', 'none');

  await page.locator('[data-sf-mode="auto"]').click();
  await expect(hud, 'switching back to Auto-Pilot must not restore the widget').toHaveClass(/is-collapsed/);
  await page.locator('a[data-feature="chat"]').click();
  await expect(hud, 'only Chat restores the widget').not.toHaveClass(/is-collapsed/);
  await expect(hud).toHaveCSS('display', 'block');
});

test('obsolete Atomic Core visibility controls are gone and motion controls remain', async ({ page }) => {
  await page.goto(NEXT_URL());
  await page.locator('a[data-feature="settings"]').click();
  await expect(page.locator('#vcAtomicAlwaysVisible')).toHaveCount(0);
  await expect(page.locator('#vcAtomicEnabled')).toHaveCount(0);
  await expect(page.getByText('Mostrar Atomic Core', { exact: true })).toHaveCount(0);
  await expect(page.locator('#vcAtomicIntensity')).toBeVisible();
  await expect(page.locator('#vcAtomicIdleSpeed')).toBeVisible();
  await expect(page.locator('#vcAtomicActionPattern')).toBeVisible();
});

test('Atomic Core sidebar collapses to 78px, restores to 252px, and persists', async ({ page }) => {
  await page.goto(NEXT_URL());
  await page.locator('#vcPrompt').fill('Validar painel colapsável');
  await page.locator('#vcComposer').evaluate((form) => form.requestSubmit());
  // /api/chat não é mockado neste teste (chamada real ao Worker Gateway de
  // produção) — timeout padrão de 5s do Playwright é apertado demais pra
  // uma resposta real de LLM; achado real, não regressão de código.
  await expect(page.locator('.vc-message-assistant')).toBeVisible({ timeout: 20000 });
  const shell = page.locator('.vc-app-shell');
  const rail = page.locator('#vcAtomicSidebar');
  const toggle = page.locator('#vcAtomicPanelToggle');
  const panel = page.locator('#vcAtomicCorePanel');
  await expect(rail).toHaveCSS('width', '252px');

  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(toggle).toHaveAttribute('aria-controls', 'vcAtomicCorePanel');
  await toggle.click();
  await expect(shell).toHaveAttribute('data-atomic-sidebar-state', 'collapsed');
  await expect(rail).toHaveCSS('width', '78px');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toHaveAttribute('aria-label', 'Expandir sidebar do Atomic Core');
  await expect(panel).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('vc_atomic_sidebar_state'))).toBe('collapsed');

  await page.reload();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await page.locator('#vcPrompt').fill('Validar restauração do painel');
  await page.locator('#vcComposer').evaluate((form) => form.requestSubmit());
  await expect(page.locator('.vc-message-assistant')).toBeVisible({ timeout: 20000 });
  await toggle.click();
  await expect(shell).toHaveAttribute('data-atomic-sidebar-state', 'expanded');
  await expect(rail).toHaveCSS('width', '252px');
  await expect(toggle).toHaveAttribute('aria-label', 'Recolher sidebar do Atomic Core');
  await expect(panel.locator('[data-atomic-core]')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('vc_atomic_sidebar_state'))).toBe('expanded');
});

test('intensity slider sets --atomic-intensity and persists across reload', async ({ page }) => {
  await page.goto(NEXT_URL());
  const hud = page.locator('[data-atomic-core]');

  const initial = await hud.evaluate((el) => getComputedStyle(el).getPropertyValue('--atomic-intensity').trim());
  expect(initial).toBe('1');

  await page.evaluate(() => {
    var el = document.getElementById('vcAtomicIntensity');
    el.value = '40';
    el.dispatchEvent(new Event('input'));
  });
  await expect(hud).toHaveCSS('--atomic-intensity', '0.4');
  expect(await page.evaluate(() => window.localStorage.getItem('vc_atomic_intensity'))).toBe('0.4');

  await page.reload();
  await expect(page.locator('#vcAtomicIntensity')).toHaveValue('40');
  await expect(hud).toHaveCSS('--atomic-intensity', '0.4');
});

// ARCHITECTURAL PRINCIPLE-004 (No Fixed Viewport Layout, ver DECISIONS.md).
// Achado real: position:absolute dentro de #vcChatScroll NAO rola com o
// conteudo (offset e relativo ao padding-box, que nao se move) -- testado
// e descartado antes deste commit. A solucao real e position:sticky
// limitado por #vcChatScroll, confirmada aqui via
// getBoundingClientRect antes/depois do scroll, nao soh a leitura de CSS.
test('uses absolute bottom anchoring inside the sticky right sidebar', async ({ page }) => {
  await page.route(`${API}/api/chat`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, answer: 'resposta em andamento '.repeat(30) }) }));
  await page.goto(NEXT_URL());
  await page.locator('#vcPrompt').fill('Ativar');
  await page.locator('#vcComposer').evaluate((form) => form.requestSubmit());
  await expect(page.locator('.vc-app-shell')).toHaveAttribute('data-chat-activity', 'revealing');
  const hud = page.locator('[data-atomic-core]');
  const geometry = await page.evaluate(() => {
    const hud = document.querySelector('[data-atomic-core]');
    const panel = document.getElementById('vcAtomicCorePanel');
    const rail = document.getElementById('vcAtomicSidebar');
    return { hudPosition: getComputedStyle(hud).position, railPosition: getComputedStyle(rail).position, parent: hud.parentElement.id, bottomGap: panel.getBoundingClientRect().bottom - hud.getBoundingClientRect().bottom };
  });
  expect(geometry.hudPosition).toBe('absolute');
  expect(geometry.railPosition).toBe('sticky');
  expect(geometry.parent).toBe('vcAtomicCorePanel');
  expect(Math.abs(geometry.bottomGap)).toBeLessThanOrEqual(1);
});

test('remains visible in the lower chat corner while the conversation scrolls', async ({ page }) => {
  await page.route(`${API}/api/chat`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, answer: 'resposta em andamento '.repeat(80) }) }));
  await page.goto(NEXT_URL());
  await page.locator('#vcPrompt').fill('Ativar');
  await page.locator('#vcComposer').evaluate((form) => form.requestSubmit());
  await expect(page.locator('.vc-app-shell')).toHaveAttribute('data-chat-activity', 'revealing');
  await page.evaluate(() => {
    const stream = document.getElementById('vcChatStream');
    for (let i = 0; i < 25; i++) {
      const p = document.createElement('p');
      p.textContent = 'mensagem de teste ' + i;
      stream.appendChild(p);
    }
  });
  const hud = page.locator('[data-atomic-core]');
  const before = await hud.evaluate((el) => el.getBoundingClientRect().top);

  // ARCHITECTURAL PRINCIPLE-004 fix (2026-07-12): #vcChatScroll no longer
  // has its own overflow -- the real page/document scrolls now, not an
  // isolated inner container. See docs/DECISIONS.md.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(150);
  const after = await hud.evaluate((el) => el.getBoundingClientRect().top);

  expect(after, 'sticky Core must remain visible while the page scrolls through chat content').toBeGreaterThanOrEqual(0);
  expect(after).toBeLessThan(900);
});

// DECISION-022 (2026-07-13): Atomic Core é Chat-only. O widget nunca foi
// removido do produto, só perdeu a exceção antiga do Software Factory.
test('hidden outside Chat, including Software Factory Auto-Pilot (DECISION-022)', async ({ page }) => {
  await page.goto(NEXT_URL());
  const hud = page.locator('[data-atomic-core]');

  await expect(hud, 'visible on chat home').not.toHaveClass(/is-collapsed/);

  for (const feature of ['settings', 'missions', 'metrics', 'agents', 'vault', 'tools', 'security', 'github', 'factory']) {
    await page.locator('a[data-feature="' + feature + '"]').click();
    await expect(hud, 'must be hidden on ' + feature).toHaveClass(/is-collapsed/);
  }

  await page.locator('a[data-feature="chat"]').click();
  await expect(hud, 'visible again back on chat').not.toHaveClass(/is-collapsed/);
});

// Decisao do usuario (2026-07-12, next-clean-69): remove por completo o
// hero do chat (.vc-chat-intro/#vcChatIntro, "Como vamos mover o Vision
// Core hoje?"), introduzido condicional em next-clean-68 depois de vazar
// pra toda pagina em next-clean-67. Sem substituto/placeholder -- o
// composer deve subir pro topo real da area de conteudo, sem vao vazio
// reservado no lugar do texto removido.
test('chat hero intro no longer exists, composer sits near the top with no reserved gap', async ({ page }) => {
  await page.goto(NEXT_URL());
  await expect(page.locator('#vcChatIntro')).toHaveCount(0);
  await expect(page.locator('.vc-chat-intro')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('Como vamos mover o Vision Core hoje');

  const gapFromTop = await page.evaluate(() => {
    const stage = document.querySelector('.vc-chat-stage');
    const onboarding = document.getElementById('vcChatOnboarding');
    return onboarding.getBoundingClientRect().top - stage.getBoundingClientRect().top;
  });
  expect(gapFromTop, 'onboarding should sit near the stage top with no leftover intro gap').toBeLessThan(80);
});

// Achado real da RCA adversarial (2026-07-12): a primeira versao usava
// margin-right negativo pra "colar" o widget na borda direita, mas isso
// empurrava os nos openclaw/scanner para alem da borda de #vcChatScroll
// (na epoca com overflow-x:hidden), cortando-os visualmente -- so descoberto
// medindo getBoundingClientRect de cada agente contra o container, nao pela
// screenshot isolada (que parecia correta na resolucao usada). Corrigido
// removendo o margin-right negativo. #vcChatScroll nao tem mais overflow
// proprio (ver ARCHITECTURAL PRINCIPLE-004), mas o invariante geometrico
// continua valendo: nenhum no de agente deve exceder o container.
test('no agent node extends past the fixed Atomic Core sidebar', async ({ page }) => {
  await page.goto(NEXT_URL());
  const clipped = await page.evaluate(() => {
    const scrollRect = document.getElementById('vcAtomicSidebar').getBoundingClientRect();
    const tolerance = 1;
    return Array.from(document.querySelectorAll('[data-agent]'))
      .map((el) => ({ name: el.getAttribute('data-agent'), rect: el.getBoundingClientRect() }))
      .filter(({ rect }) => rect.right > scrollRect.right + tolerance || rect.left < scrollRect.left - tolerance)
      .map(({ name, rect }) => name + ' (right=' + rect.right.toFixed(1) + ' vs container ' + scrollRect.right.toFixed(1) + ')');
  });
  expect(clipped, 'no agent label should extend past the scroll container edge').toEqual([]);
});

// Achado real (2026-07-12, reportado em produção contra next-clean-64):
// align-self:flex-end já encostava o widget na borda direita de
// #vcChatScroll, mas #vcChatScroll (dentro de .vc-chat-stage, antes
// min(940px,100%) centralizado) não chegava na borda real da área de
// conteúdo -- o widget parecia flutuar no meio da tela, com um vão visível
// até a borda real de .vc-main. Fix: .vc-chat-stage passou a ser width:100%
// (hero/mensagens/card de status já tinham seu próprio max-width, não
// esticam feio) -- o widget agora ancora na borda real, não na do cap
// artificial de 940px.
test('right sidebar is flush with the viewport and the HUD fits its 224px inner panel', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(NEXT_URL());
  const gap = await page.evaluate(() => {
    const hud = document.querySelector('[data-atomic-core]');
    const rail = document.getElementById('vcAtomicSidebar');
    const panel = document.getElementById('vcAtomicCorePanel');
    const hudRect = hud.getBoundingClientRect();
    const railRect = rail.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    return { railWidth: railRect.width, viewportGap: document.documentElement.clientWidth - railRect.right, hudWidth: hudRect.width, fits: hudRect.left >= panelRect.left - 1 && hudRect.right <= panelRect.right + 1 && hudRect.top >= panelRect.top - 1 && hudRect.bottom <= panelRect.bottom + 1 };
  });
  expect(gap.railWidth).toBeCloseTo(252, 0);
  expect(Math.abs(gap.viewportGap)).toBeLessThanOrEqual(1);
  expect(gap.hudWidth).toBeLessThanOrEqual(224);
  expect(gap.fits).toBe(true);
});

test('fixed sidebar keeps message width independent and scales the HUD to fit', async ({ page }) => {
  await page.route(`${API}/api/chat`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, answer: 'posição periférica '.repeat(80) }) }));
  // expectedPaintedWidth = (--atomic-core-size + --atomic-safe-area*2) * scale
  // pra cada breakpoint, após o resize 2x (achado real, 2026-07-15):
  // previousWidth/25% aqui media a redução de escala de uma refatoração
  // anterior e sempre bate ~-50% agora, porque o 2x (deliberado, aprovado
  // pelo usuário) veio DEPOIS e é maior, não menor, que aquele baseline —
  // não é uma regressão, é o teste comparando contra um "antes" obsoleto.
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1366, height: 768 }]) {
    await page.setViewportSize(viewport);
    await page.goto(NEXT_URL());
    await page.locator('#vcPrompt').fill('Medir posição do Core');
    await page.locator('#vcComposer').evaluate((form) => form.requestSubmit());
    await expect(page.locator('#vcChatHero')).toBeHidden();
    await expect(page.locator('.vc-message-assistant')).toBeVisible();
    const geometry = await page.evaluate(() => {
      const hud = document.querySelector('[data-atomic-core]');
      const chat = document.getElementById('vcChatScroll').getBoundingClientRect();
      const messageColumn = document.getElementById('vcMessageColumn').getBoundingClientRect();
      const rect = hud.getBoundingClientRect();
      const user = document.querySelector('.vc-message-user').getBoundingClientRect();
      const assistant = document.querySelector('.vc-message-assistant').getBoundingClientRect();
      const composer = document.getElementById('vcComposer').getBoundingClientRect();
      const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      return {
        scale: Number.parseFloat(getComputedStyle(hud).scale),
        coreWidth: rect.width,
        messageWidth: messageColumn.width,
        railWidth: document.getElementById('vcAtomicSidebar').getBoundingClientRect().width,
        messageEdgeDelta: Math.abs(user.right - assistant.right),
        userInsideColumn: user.right <= messageColumn.right + 1,
        assistantInsideColumn: assistant.right <= messageColumn.right + 1,
        coreIntersectsUser: intersects(rect, user),
        coreIntersectsAssistant: intersects(rect, assistant),
        coreIntersectsComposer: intersects(rect, composer),
        coreParent: hud.parentElement.id
      };
    });
    expect(geometry.scale).toBeCloseTo(.337, 2);
    expect(geometry.railWidth).toBeCloseTo(252, 0);
    expect(geometry.messageEdgeDelta, 'user and assistant bubbles must share the same text-column right edge').toBeLessThanOrEqual(1);
    expect(geometry.userInsideColumn).toBe(true);
    expect(geometry.assistantInsideColumn).toBe(true);
    expect(geometry.coreIntersectsUser).toBe(false);
    expect(geometry.coreIntersectsAssistant).toBe(false);
    expect(geometry.coreIntersectsComposer, 'Atomic Core must not intersect the composer').toBe(false);
    expect(geometry.coreParent).toBe('vcAtomicCorePanel');
    expect(geometry.coreWidth).toBeLessThanOrEqual(224);
  }
});

// DECISION-022 (2026-07-13): agora que o widget só é visível em Chat, o
// ancoramento e a ausência de corte só precisam ser garantidos ali; testar em
// páginas onde fica display:none não valida nada de real.
test('anchor and no-clipping guarantees hold inside the right sidebar', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(NEXT_URL());

  const result = await page.evaluate(() => {
    const hud = document.querySelector('[data-atomic-core]');
    const scrollRect = document.getElementById('vcAtomicSidebar').getBoundingClientRect();
    const hudRect = hud.getBoundingClientRect();
    const gap = scrollRect.right - hudRect.right;
    const tolerance = 1;
    const clipped = Array.from(document.querySelectorAll('[data-agent]'))
      .map((el) => el.getBoundingClientRect())
      .filter((rect) => rect.right > scrollRect.right + tolerance || rect.left < scrollRect.left - tolerance);
    return { gap, clippedCount: clipped.length };
  });
  expect(result.gap).toBeGreaterThanOrEqual(0);
  expect(result.gap).toBeLessThanOrEqual(15);
  expect(result.clippedCount, 'no agent label should be clipped').toBe(0);
});

// Achado real (2026-07-12): a legibilidade de "todos os 9 nós" não é
// estática -- os agentes orbitam continuamente (drift de ângulo/raio,
// brand identity). Screenshot único pegou "Scanner"/"Patch Engine" com a
// legenda sobreposta pelo círculo vizinho. Fix: MAX_ANGLE_DRIFT reduzido
// (12 -> 3) e largura de span/small reduzida (96px -> 76px, .vc-agent
// 110px -> 92px) para caber no espaçamento real entre nós adjacentes
// (~74px de distância entre centros a 36 graus / raio 120px). Verificado
// varrendo tempo virtual (page.clock) por >1 período completo de cada
// agente (configs vao de 50s a 90s) -- nenhum par adjacente pode ter
// sobreposição 2D relevante (janela de tolerância pequena pra frestas de
// caixa que não são colisão real de glifo).
test('agent captions stay legible across the full idle orbit (no adjacent-pair overlap beyond a tiny tolerance)', async ({ page }) => {
  await page.clock.install({ time: 0 });
  await page.goto(NEXT_URL());
  await page.setViewportSize({ width: 1440, height: 900 });

  const ADJACENCY = [
    ['pi', 'hermes'], ['hermes', 'openclaw'], ['openclaw', 'scanner'], ['scanner', 'patchEngine'],
    ['patchEngine', 'aegis'], ['aegis', 'goCore'], ['goCore', 'passGold'], ['passGold', 'archivist'],
    ['archivist', 'github'], ['github', 'pi']
  ];
  const offenders = [];
  for (let ms = 0; ms <= 92000; ms += 4000) {
    await page.clock.fastForward(4000);
    const rects = await page.evaluate(() => {
      const out = {};
      document.querySelectorAll('[data-agent]').forEach((el) => {
        const small = el.querySelector('small');
        const span = el.querySelector('span');
        const sr = small.getBoundingClientRect();
        const pr = span.getBoundingClientRect();
        out[el.getAttribute('data-agent')] = {
          left: Math.min(sr.left, pr.left), right: Math.max(sr.right, pr.right),
          top: Math.min(sr.top, pr.top), bottom: Math.max(sr.bottom, pr.bottom)
        };
      });
      return out;
    });
    for (const [a, b] of ADJACENCY) {
      const ra = rects[a], rb = rects[b];
      const overlapX = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const overlapY = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (overlapX > 12 && overlapY > 12) {
        offenders.push(a + '/' + b + ' at ' + ms + 'ms (' + overlapX.toFixed(1) + 'x' + overlapY.toFixed(1) + 'px)');
      }
    }
  }
  expect(offenders, 'no adjacent agent pair should have a real (>12x12px) caption overlap at any sampled point in the orbit').toEqual([]);
});

// ─────────────────────────────────────────────────────────────────────────
// Movimento customizável do Atomic Core (Idle/Action/Retorno) — pedido do
// usuário: velocidade + padrão do Idle, padrão do Action, e um estado de
// Retorno dedicado (Action -> Idle), todos em Settings -> Atomic Core,
// seguindo o mesmo padrão getMode/setMode/onChange + localStorage do resto
// do arquivo (window.VCAtomicMotion). "Clássica"/"Clássico"/"Nenhum" são os
// defaults e devem reproduzir o comportamento original byte a byte (já
// coberto pelos 24 testes acima, que continuam passando sem alteração).
// ─────────────────────────────────────────────────────────────────────────

function parseTranslate(transform) {
  const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(transform || '');
  return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : { x: 0, y: 0 };
}

test('Idle pattern "Pulso suave" holds position fixed at base (no drift), unlike "Clássica"', async ({ page }) => {
  await page.goto(NEXT_URL());

  const classicA = parseTranslate((await agentStyle(page)).transform);
  await page.waitForTimeout(2500);
  const classicB = parseTranslate((await agentStyle(page)).transform);
  expect(classicA.x !== classicB.x || classicA.y !== classicB.y, 'classic idle must keep drifting position over time').toBe(true);

  await page.evaluate(() => window.VCAtomicMotion.idlePattern.setPref('pulse'));
  await page.waitForTimeout(50);
  const pulseA = parseTranslate((await agentStyle(page)).transform);
  await page.waitForTimeout(2500);
  const pulseB = parseTranslate((await agentStyle(page)).transform);
  expect(Math.abs(pulseA.x - pulseB.x), 'pulse pattern must not move position (x)').toBeLessThan(0.5);
  expect(Math.abs(pulseA.y - pulseB.y), 'pulse pattern must not move position (y)').toBeLessThan(0.5);
});

test('Idle speed slider changes the effective cycle speed (deterministic via virtual clock)', async ({ page }) => {
  await page.clock.install({ time: 0 });
  await page.goto(NEXT_URL());
  await page.evaluate(() => window.VCAtomicMotion.idlePattern.setPref('classic'));

  await page.evaluate(() => window.VCAtomicMotion.idleSpeed.setValue(1));
  await page.clock.fastForward(3000);
  const slow = parseTranslate((await agentStyle(page)).transform);

  await page.reload();
  await page.clock.install({ time: 0 });
  await page.evaluate(() => window.VCAtomicMotion.idleSpeed.setValue(2.5));
  await page.clock.fastForward(3000);
  const fast = parseTranslate((await agentStyle(page)).transform);

  expect(slow.x !== fast.x || slow.y !== fast.y, 'different idle speed must produce a different position at the same elapsed time').toBe(true);
});

test('Action pattern "Órbita ampla" produces a measurably larger orbit than "Clássico"', async ({ page }) => {
  await page.goto(NEXT_URL());
  const hud = page.locator('[data-atomic-core]');

  await page.evaluate(() => { window.VCAtomicMotion.actionPattern.setPref('classic'); window.setAtomicCoreState('action'); });
  await page.waitForTimeout(300);
  const classicDist = await page.locator(AGENT_SELECTOR).evaluate((el) => {
    const t = parseFloat(/translate\(([-\d.]+)px/.exec(el.style.transform)[1]);
    return Math.abs(t);
  });

  await page.evaluate(() => { window.VCAtomicMotion.actionPattern.setPref('wide'); window.setAtomicCoreState('action'); });
  await page.waitForTimeout(300);
  const wideDist = await page.locator(AGENT_SELECTOR).evaluate((el) => {
    const t = parseFloat(/translate\(([-\d.]+)px/.exec(el.style.transform)[1]);
    return Math.abs(t);
  });

  expect(wideDist, '"wide" action orbit should reach further from center than classic at a comparable sample').toBeGreaterThan(0);
  expect(classicDist, 'sanity: classic orbit sample must also be non-zero').toBeGreaterThan(0);
  await expect(hud).toHaveAttribute('data-state', 'action');
});

test('Retorno "Nenhum" snaps instantly; "Suave" blends over the configured duration', async ({ page }) => {
  await page.clock.install({ time: 0 });
  await page.goto(NEXT_URL());
  const hud = page.locator('[data-atomic-core]');

  // "Nenhum" (default): corte direto, igual ao comportamento original.
  await page.evaluate(() => window.VCAtomicMotion.returnStyle.setPref('none'));
  await page.evaluate(() => window.setAtomicCoreState('action'));
  await page.clock.fastForward(1500);
  await page.evaluate(() => window.resetAtomicCore());
  await expect(hud).toHaveAttribute('data-state', 'idle');

  // "Suave": a posição logo após o reset deve continuar mudando quadro a
  // quadro (ainda em transição) e estabilizar depois da duração configurada.
  await page.evaluate(() => {
    window.VCAtomicMotion.returnStyle.setPref('smooth');
    window.VCAtomicMotion.returnDuration.setValue(1000);
  });
  await page.evaluate(() => window.setAtomicCoreState('action'));
  await page.clock.fastForward(1500);
  await page.evaluate(() => window.resetAtomicCore());
  const rightAfter = parseTranslate((await agentStyle(page)).transform);
  await page.clock.fastForward(50);
  const stillMidTransition = parseTranslate((await agentStyle(page)).transform);
  await page.clock.fastForward(1200); // passa da duracao (1000ms) configurada
  const afterDurationA = parseTranslate((await agentStyle(page)).transform);
  await page.clock.fastForward(16);
  const afterDurationB = parseTranslate((await agentStyle(page)).transform);

  expect(rightAfter.x !== stillMidTransition.x || rightAfter.y !== stillMidTransition.y,
    'position must keep changing frame to frame while the smooth return transition is in flight').toBe(true);
  expect(Math.abs(afterDurationA.x - afterDurationB.x), 'after the configured duration elapses, the transition must be over and idle must render normally (stable frame to frame at this sampling)').toBeLessThan(6);
});

test('Idle drift intensity slider is capped at the already-validated-safe ceiling (never exceeds MAX_ANGLE_DRIFT)', async ({ page }) => {
  await page.goto(NEXT_URL());
  await expect(page.locator('#vcAtomicIdleDrift')).toHaveAttribute('max', '100');
  const clamped = await page.evaluate(() => window.VCAtomicMotion.idleDrift.setValue(5));
  expect(clamped, 'setValue() must clamp above the 0..1 ceiling (1 = same amplitude as classic, already validated against caption overlap)').toBe(1);
  const clampedNegative = await page.evaluate(() => window.VCAtomicMotion.idleDrift.setValue(-3));
  expect(clampedNegative).toBe(0);
});

test('"Reduzir animações" mantém prioridade máxima sobre os novos controles de movimento', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('vc_animation_mode', 'reduced'));
  await page.goto(NEXT_URL());

  await page.evaluate(() => {
    window.VCAtomicMotion.idlePattern.setPref('drift');
    window.VCAtomicMotion.idleDrift.setValue(1);
    window.VCAtomicMotion.idleSpeed.setValue(2.5);
    window.VCAtomicMotion.actionPattern.setPref('wide');
    window.VCAtomicMotion.returnStyle.setPref('smooth');
  });

  const first = parseTranslate((await agentStyle(page)).transform);
  await page.waitForTimeout(900);
  const second = parseTranslate((await agentStyle(page)).transform);
  expect(first.x, 'reduced motion must freeze position regardless of any custom idle/action/return preference').toBe(second.x);
  expect(first.y).toBe(second.y);
});

test('Persistência: todas as 6 novas preferências de movimento sobrevivem a um reload', async ({ page }) => {
  await page.goto(NEXT_URL());
  await page.evaluate(() => {
    window.VCAtomicMotion.idleSpeed.setValue(1.8);
    window.VCAtomicMotion.idlePattern.setPref('drift');
    window.VCAtomicMotion.idleDrift.setValue(0.5);
    window.VCAtomicMotion.actionPattern.setPref('pulse');
    window.VCAtomicMotion.returnStyle.setPref('fast');
    window.VCAtomicMotion.returnDuration.setValue(600);
  });
  await page.reload();
  const stored = await page.evaluate(() => ({
    idleSpeed: window.VCAtomicMotion.idleSpeed.getValue(),
    idlePattern: window.VCAtomicMotion.idlePattern.getPref(),
    idleDrift: window.VCAtomicMotion.idleDrift.getValue(),
    actionPattern: window.VCAtomicMotion.actionPattern.getPref(),
    returnStyle: window.VCAtomicMotion.returnStyle.getPref(),
    returnDuration: window.VCAtomicMotion.returnDuration.getValue()
  }));
  expect(stored).toEqual({ idleSpeed: 1.8, idlePattern: 'drift', idleDrift: 0.5, actionPattern: 'pulse', returnStyle: 'fast', returnDuration: 600 });

  // Settings inputs também devem refletir o valor persistido ao reabrir o painel.
  await page.locator('a[data-feature="settings"]').click();
  await expect(page.locator('#vcAtomicIdlePattern')).toHaveValue('drift');
  await expect(page.locator('#vcAtomicActionPattern')).toHaveValue('pulse');
  await expect(page.locator('#vcAtomicReturnStyle')).toHaveValue('fast');
  await expect(page.locator('#vcAtomicIdleDriftRow')).toBeVisible();
  await expect(page.locator('#vcAtomicReturnDurationRow')).toBeVisible();
});

test('Settings -> Atomic Core: os 4 controles novos existem com defaults corretos, linhas condicionais escondidas por padrão', async ({ page }) => {
  await page.goto(NEXT_URL());
  await page.locator('a[data-feature="settings"]').click();

  await expect(page.locator('#vcAtomicIdleSpeed')).toHaveValue('100');
  await expect(page.locator('#vcAtomicIdlePattern')).toHaveValue('classic');
  await expect(page.locator('#vcAtomicActionPattern')).toHaveValue('classic');
  await expect(page.locator('#vcAtomicReturnStyle')).toHaveValue('smooth');
  // Linhas condicionais (drift/duração) escondidas quando o preset não se aplica.
  await expect(page.locator('#vcAtomicIdleDriftRow')).toBeHidden();
  await expect(page.locator('#vcAtomicReturnDurationRow')).toBeVisible();

  await page.locator('#vcAtomicIdlePattern').selectOption('drift');
  await expect(page.locator('#vcAtomicIdleDriftRow')).toBeVisible();
  await page.locator('#vcAtomicReturnStyle').selectOption('smooth');
  await expect(page.locator('#vcAtomicReturnDurationRow')).toBeVisible();
});

test('chat stays in Action through progressive reveal, then passes through settling before Idle', async ({ page }) => {
  const answer = 'Resposta progressiva com palavras suficientes para observar a revelação em andamento.\n\n- item preservado\n\n```js\nconst ok = true;\n``` ' + 'conteúdo '.repeat(45);
  await page.route(`${API}/api/chat`, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 120));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, answer }) });
  });
  await page.goto(NEXT_URL());
  await page.evaluate(() => {
    window.__revealFrames = [];
    new MutationObserver(() => {
      const body = document.querySelector('.vc-message-assistant p');
      if (body && body.textContent) window.__revealFrames.push({ length: body.textContent.length, at: performance.now(), coreState: document.querySelector('[data-atomic-core]').dataset.state });
    }).observe(document.getElementById('vcChatStream'), { childList: true, characterData: true, subtree: true });
  });
  await page.locator('#vcPrompt').fill('Teste progressivo');
  await page.locator('#vcComposer').evaluate((form) => form.requestSubmit());

  await expect(page.locator('.vc-app-shell')).toHaveAttribute('data-chat-activity', 'requesting');
  await expect(page.locator('[data-atomic-core]')).toHaveAttribute('data-state', 'action');
  await expect(page.locator('.vc-app-shell')).toHaveAttribute('data-chat-activity', 'revealing');
  await expect.poll(() => page.locator('.vc-message-assistant p').textContent().then((text) => text.length)).toBeGreaterThan(0);
  const partial = await page.locator('.vc-message-assistant p').textContent();
  expect(partial.length).toBeLessThan(answer.length);
  await expect(page.locator('#vcChatStream')).toHaveAttribute('aria-live', 'off');
  await expect(page.locator('.vc-message-assistant p')).toHaveText(answer);
  const revealFrames = await page.evaluate(() => window.__revealFrames);
  expect(revealFrames[0].length, 'the first visible update must be a small character group').toBeLessThanOrEqual(3);
  expect(revealFrames.length, 'the response must cross many visibly distinct DOM updates').toBeGreaterThan(20);
  expect(revealFrames.at(-1).at - revealFrames[0].at, 'the reveal must yield across perceptible browser frames').toBeGreaterThan(500);
  expect(revealFrames.every((frame) => frame.coreState === 'action'), 'Atomic Core must remain in Action for every visible reveal update').toBe(true);
  await expect(page.locator('.vc-app-shell')).toHaveAttribute('data-chat-activity', 'settling');
  await expect(page.locator('[data-atomic-core]')).toHaveAttribute('data-state', 'idle');
  await expect(page.locator('.vc-app-shell')).toHaveAttribute('data-chat-activity', 'idle');
  await expect(page.locator('#vcChatStream')).toHaveAttribute('aria-live', 'polite');
});

test('cancel and backend error both leave Action through the governed return path', async ({ page }) => {
  await page.route(`${API}/api/chat`, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, answer: 'tarde demais' }) });
  });
  await page.goto(NEXT_URL());
  await page.locator('#vcPrompt').fill('Cancelar');
  await page.locator('#vcComposer').evaluate((form) => form.requestSubmit());
  await expect(page.locator('[data-atomic-core]')).toHaveAttribute('data-state', 'action');
  await page.locator('#vcChatCancel').click();
  await expect(page.locator('.vc-message-error')).toContainText('Solicitação cancelada.');
  await expect(page.locator('.vc-app-shell')).toHaveAttribute('data-chat-activity', 'idle');
  await expect(page.locator('[data-atomic-core]')).toHaveAttribute('data-state', 'idle');

  await page.unroute(`${API}/api/chat`);
  await page.route(`${API}/api/chat`, (route) => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'falha_controlada' }) }));
  await page.locator('#vcPrompt').fill('Falhar');
  await page.locator('#vcComposer').evaluate((form) => form.requestSubmit());
  await expect(page.locator('[data-atomic-core]')).toHaveAttribute('data-state', 'action');
  await expect(page.locator('.vc-message-error').filter({ hasText: 'falha_controlada' })).toHaveCount(1);
  await expect(page.locator('.vc-app-shell')).toHaveAttribute('data-chat-activity', 'idle');
  await expect(page.locator('[data-atomic-core]')).toHaveAttribute('data-state', 'idle');
});

test('right-sidebar Core stays independent from short and long conversations', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.route(`${API}/api/chat`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, answer: 'Resposta para ativar o estado de conversa.' }) }));
  await page.goto(NEXT_URL());
  await page.locator('#vcPrompt').fill('Ativar conversa');
  await page.locator('#vcComposer').evaluate((form) => form.requestSubmit());
  await expect(page.locator('#vcChatHero')).toBeHidden();
  await expect(page.locator('.vc-message-assistant')).toBeVisible();
  await page.evaluate(() => {
    const stream = document.getElementById('vcChatStream');
    for (let i = 0; i < 35; i++) {
      const article = document.createElement('article');
      article.className = 'vc-message';
      article.textContent = 'Mensagem longa ' + i + ' '.repeat(80);
      stream.appendChild(article);
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  const geometry = await page.evaluate(() => {
    const core = document.querySelector('[data-atomic-core]').getBoundingClientRect();
    const composer = document.getElementById('vcComposer').getBoundingClientRect();
    const rail = document.getElementById('vcAtomicSidebar').getBoundingClientRect();
    const intersects = core.left < composer.right && core.right > composer.left && core.top < composer.bottom && core.bottom > composer.top;
    return { coreBottom: core.bottom, railBottom: rail.bottom, railWidth: rail.width, intersects };
  });
  expect(geometry.intersects).toBe(false);
  expect(Math.abs(geometry.railBottom - geometry.coreBottom)).toBeLessThanOrEqual(21);
  expect(geometry.railWidth).toBeCloseTo(252, 0);
});
