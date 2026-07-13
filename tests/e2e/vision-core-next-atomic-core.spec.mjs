// @ts-check
/**
 * Vision Core Next - Atomic Core idle animation (chat/Software Factory
 * Auto-Pilot only since DECISION-021, 2026-07-13 -- see docs/DECISIONS.md).
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

// Fase 1.5 (confirmado pelo usuário 2026-07-11): o Atomic Core recolhe
// sozinho só no Modo Avançado do Software Factory — único painel com
// colisão real confirmada por screenshot contra a zona reservada do widget.
// Nunca display:none (mataria a transição); is-collapsed via opacity/scale.
test('collapses only in Software Factory Modo Avancado, never in Auto-Pilot or other tabs', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('vc_animation_mode', 'reduced'));
  await page.goto(NEXT_URL());
  const hud = page.locator('[data-atomic-core]');

  await expect(hud).not.toHaveClass(/is-collapsed/);

  await page.locator('a[data-feature="factory"]').click();
  await expect(hud, 'Auto-Pilot (default SF mode) must not collapse the widget').not.toHaveClass(/is-collapsed/);

  await page.locator('[data-sf-mode="advanced"]').click();
  await expect(hud, 'Modo Avancado must collapse the widget').toHaveClass(/is-collapsed/);

  await page.locator('[data-sf-mode="auto"]').click();
  await expect(hud, 'switching back to Auto-Pilot must restore the widget').not.toHaveClass(/is-collapsed/);

  await page.locator('[data-sf-mode="advanced"]').click();
  await expect(hud).toHaveClass(/is-collapsed/);
  await page.locator('a[data-feature="chat"]').click();
  await expect(hud, 'leaving Software Factory entirely must restore the widget').not.toHaveClass(/is-collapsed/);
});

test('Settings override "always visible" prevents the auto-collapse, live and persisted (window.VCAtomicCollapse)', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('vc_animation_mode', 'reduced'));
  await page.goto(NEXT_URL());
  const hud = page.locator('[data-atomic-core]');

  await page.evaluate(() => {
    var el = document.getElementById('vcAtomicAlwaysVisible');
    el.checked = true;
    el.dispatchEvent(new Event('change'));
  });
  expect(await page.evaluate(() => window.VCAtomicCollapse.getPref())).toBe('always');

  await page.locator('a[data-feature="factory"]').click();
  await page.locator('[data-sf-mode="advanced"]').click();
  await expect(hud, 'user override must prevent collapse even in Modo Avancado').not.toHaveClass(/is-collapsed/);

  // Persists across reload — checkbox reflects it, still no collapse.
  await page.reload();
  await page.locator('a[data-feature="factory"]').click();
  await page.locator('[data-sf-mode="advanced"]').click();
  await expect(page.locator('#vcAtomicAlwaysVisible')).toBeChecked();
  await expect(hud).not.toHaveClass(/is-collapsed/);

  // Turning it back off restores auto-collapse immediately, no reload.
  await page.evaluate(() => {
    var el = document.getElementById('vcAtomicAlwaysVisible');
    el.checked = false;
    el.dispatchEvent(new Event('change'));
  });
  await expect(hud, 'unchecking override must re-apply auto-collapse immediately').toHaveClass(/is-collapsed/);
});

// ROADMAP.md "Settings do Atomic Core — ligado/desligado, intensidade visual".
// "glow on/off" explicitamente excluido: VISION_CORE_NEXT_FRONTEND_SPEC.md
// checklist item 6 ja fecha isso ("nunca existiram como controles").
test('on/off toggle hides the widget everywhere (not just Modo Avancado), live and persisted (window.VCAtomicCore)', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('vc_animation_mode', 'reduced'));
  await page.goto(NEXT_URL());
  const hud = page.locator('[data-atomic-core]');

  await expect(hud).not.toHaveClass(/is-collapsed/);
  await page.evaluate(() => {
    var el = document.getElementById('vcAtomicEnabled');
    el.checked = false;
    el.dispatchEvent(new Event('change'));
  });
  await expect(hud, 'off must hide the widget on the chat home too, not only Modo Avancado').toHaveClass(/is-collapsed/);
  expect(await page.evaluate(() => window.VCAtomicCore.getEnabled())).toBe('off');

  // Persists across reload.
  await page.reload();
  await expect(page.locator('#vcAtomicEnabled')).not.toBeChecked();
  await expect(hud).toHaveClass(/is-collapsed/);

  // Turning back on restores it immediately, no reload.
  await page.evaluate(() => {
    var el = document.getElementById('vcAtomicEnabled');
    el.checked = true;
    el.dispatchEvent(new Event('change'));
  });
  await expect(hud, 'turning it back on must restore the widget immediately').not.toHaveClass(/is-collapsed/);
});

// DECISION-021 (2026-07-13): o toggle "mostrar Atomic Core" continua valendo
// GLOBALMENTE (persiste independente da aba), mas agora interage com um
// segundo motivo de collapse -- estar fora de chat/factory. Ligar o toggle
// enquanto numa aba fora desse escopo não tem efeito visível ali (já estava
// escondido pela regra de aba), mas o estado do toggle em si continua
// valendo quando o usuário volta pro chat.
test('"mostrar Atomic Core" toggle persists globally across navigation, even while hidden by the chat-only scope', async ({ page }) => {
  await page.goto(NEXT_URL());
  const hud = page.locator('[data-atomic-core]');

  await expect(hud, 'visible on chat by default').not.toHaveClass(/is-collapsed/);

  await page.evaluate(() => {
    var el = document.getElementById('vcAtomicEnabled');
    el.checked = false;
    el.dispatchEvent(new Event('change'));
  });
  await expect(hud, 'off must hide it immediately on chat').toHaveClass(/is-collapsed/);

  await page.locator('a[data-feature="missions"]').click();
  await expect(hud, 'stays collapsed on Missions -- hidden both by the toggle and by the chat-only scope').toHaveClass(/is-collapsed/);

  await page.evaluate(() => {
    var el = document.getElementById('vcAtomicEnabled');
    el.checked = true;
    el.dispatchEvent(new Event('change'));
  });
  await expect(hud, 'turning back on while on Missions has no visible effect -- Missions is outside the chat/factory scope').toHaveClass(/is-collapsed/);

  await page.locator('a[data-feature="chat"]').click();
  await expect(hud, 'back on chat, the re-enabled toggle takes effect immediately').not.toHaveClass(/is-collapsed/);
});

test('off wins over "always visible": widget stays hidden in Modo Avancado even with the override checked', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('vc_animation_mode', 'reduced'));
  await page.goto(NEXT_URL());
  const hud = page.locator('[data-atomic-core]');

  // Must actually be inside Modo Avancado, where "always visible" would
  // otherwise keep the widget shown (autoCollapse alone would be false) --
  // otherwise this test doesn't exercise the precedence conflict at all.
  await page.locator('a[data-feature="factory"]').click();
  await page.locator('[data-sf-mode="advanced"]').click();
  await page.evaluate(() => {
    document.getElementById('vcAtomicAlwaysVisible').checked = true;
    document.getElementById('vcAtomicAlwaysVisible').dispatchEvent(new Event('change'));
  });
  await expect(hud, 'sanity check: "always visible" alone must keep it shown in Modo Avancado').not.toHaveClass(/is-collapsed/);

  await page.evaluate(() => {
    document.getElementById('vcAtomicEnabled').checked = false;
    document.getElementById('vcAtomicEnabled').dispatchEvent(new Event('change'));
  });
  await expect(hud, 'widget-level off must win over the SF-Advanced-only override').toHaveClass(/is-collapsed/);
});

test('intensity slider sets --atomic-intensity and persists across reload (window.VCAtomicCore has no bearing on this)', async ({ page }) => {
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
// e descartado antes deste commit. A solucao real e position:static
// (align-self:flex-end no flex column), confirmada aqui via
// getBoundingClientRect antes/depois do scroll, nao soh a leitura de CSS.
test('lives in normal document flow (no fixed/absolute positioning tying it to the viewport)', async ({ page }) => {
  await page.goto(NEXT_URL());
  const hud = page.locator('[data-atomic-core]');
  const position = await hud.evaluate((el) => getComputedStyle(el).position);
  expect(position, 'must never be fixed or absolute -- ties it to the viewport/padding-box instead of the real scroll flow').toBe('static');
});

test('scrolls away with the chat content instead of staying pinned to the viewport', async ({ page }) => {
  await page.goto(NEXT_URL());
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

  expect(after, 'must move out of the visible area when the page is scrolled, unlike position:fixed').toBeLessThan(before - 100);
});

// DECISION-021 (2026-07-13, corrige PARCIALMENTE next-clean-67/DECISION-020):
// Atomic Core volta a ser escopado a chat/Software Factory Auto-Pilot --
// hidden (via .is-collapsed, nunca display:none) em qualquer outra aba. O
// widget nunca foi removido do produto, só voltou a ser escopado.
test('hidden outside chat/Software Factory Auto-Pilot -- visible only on those two (DECISION-021)', async ({ page }) => {
  await page.goto(NEXT_URL());
  const hud = page.locator('[data-atomic-core]');

  await expect(hud, 'visible on chat home').not.toHaveClass(/is-collapsed/);

  for (const feature of ['settings', 'missions', 'metrics', 'agents', 'vault', 'tools', 'security', 'github']) {
    await page.locator('a[data-feature="' + feature + '"]').click();
    await expect(hud, 'must be hidden on ' + feature).toHaveClass(/is-collapsed/);
  }

  await page.locator('a[data-feature="chat"]').click();
  await expect(hud, 'visible again back on chat').not.toHaveClass(/is-collapsed/);

  // Software Factory Auto-Pilot continua contando como chat-like -- critério
  // que não mudou desde next-clean-61, não faz parte desta correção.
  await page.locator('a[data-feature="factory"]').click();
  await expect(hud, 'Software Factory Auto-Pilot stays visible').not.toHaveClass(/is-collapsed/);
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
    const hud = document.querySelector('[data-atomic-core]');
    return hud.getBoundingClientRect().top - stage.getBoundingClientRect().top;
  });
  expect(gapFromTop, 'Atomic Core (first content in the stage) should sit near the stage top, no leftover intro gap').toBeLessThan(80);
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
test('no agent node extends past the #vcChatScroll container edge', async ({ page }) => {
  await page.goto(NEXT_URL());
  const clipped = await page.evaluate(() => {
    const scrollRect = document.getElementById('vcChatScroll').getBoundingClientRect();
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
test('anchors flush against the real right edge of the content area, not just its own 940px-capped column', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(NEXT_URL());
  const gap = await page.evaluate(() => {
    const hud = document.querySelector('[data-atomic-core]');
    const main = document.querySelector('.vc-main');
    const hudRect = hud.getBoundingClientRect();
    const mainRect = main.getBoundingClientRect();
    const paddingRight = parseFloat(getComputedStyle(main).paddingRight);
    return (mainRect.right - paddingRight) - hudRect.right;
  });
  expect(Math.abs(gap), 'HUD right edge must match .vc-main real content-right-edge, not float short of it').toBeLessThan(2);
});

// DECISION-021 (2026-07-13): agora que o widget só é visível em chat/Software
// Factory Auto-Pilot, o ancoramento e a ausência de corte só precisam ser
// garantidos onde ele de fato aparece -- testar em páginas onde fica
// invisível (opacity:0 via .is-collapsed) não valida nada de real.
test('anchor and no-clipping guarantees hold on every page where the widget is actually visible (chat, Software Factory Auto-Pilot)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(NEXT_URL());

  for (const feature of ['chat', 'factory']) {
    await page.locator('a[data-feature="' + feature + '"]').click();
    await page.waitForTimeout(200);
    const result = await page.evaluate(() => {
      const hud = document.querySelector('[data-atomic-core]');
      const main = document.querySelector('.vc-main');
      const scrollRect = document.getElementById('vcChatScroll').getBoundingClientRect();
      const hudRect = hud.getBoundingClientRect();
      const mainRect = main.getBoundingClientRect();
      const paddingRight = parseFloat(getComputedStyle(main).paddingRight);
      const gap = (mainRect.right - paddingRight) - hudRect.right;
      const tolerance = 1;
      const clipped = Array.from(document.querySelectorAll('[data-agent]'))
        .map((el) => el.getBoundingClientRect())
        .filter((rect) => rect.right > scrollRect.right + tolerance || rect.left < scrollRect.left - tolerance);
      return { gap, clippedCount: clipped.length };
    });
    expect(Math.abs(result.gap), feature + ': HUD must stay anchored to the real right edge').toBeLessThan(2);
    expect(result.clippedCount, feature + ': no agent label should be clipped').toBe(0);
  }
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
