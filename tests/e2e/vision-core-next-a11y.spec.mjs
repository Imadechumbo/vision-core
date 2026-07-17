// @ts-check
/**
 * Vision Core Next - Accessibility gate (A11Y-001 in
 * docs/VISION_CORE_NEXT_MASTER_GAP_ANALYSIS.md).
 *
 * PERMANENT SPEC (not a temp validation spec — see docs/CURRENT_STATE.md).
 * Replaces the temporary audit spec from TEST-002/IMP-008 (removed after use
 * per DECISION-009) with a permanent regression gate, so the bugs that spec
 * caught (missing accessible names on #vcProjectName/#vcPrompt, focus escaping
 * the Smile modal) cannot silently regress between agent handoffs without a
 * human re-running a one-off script first.
 *
 * Covers: keyboard navigation, ARIA on the main interactive surfaces (chat,
 * Atomic Core, modal, Software Factory), and prefers-reduced-motion.
 *
 * Served over a real http:// origin (a throwaway static server over
 * frontend/), never file:// — required for localStorage set via
 * `page.addInitScript` (VCMotion) and `page.emulateMedia` (OS signal) to
 * combine reliably, same rationale as vision-core-next-atomic-core.spec.mjs.
 */

import { test, expect } from '@playwright/test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('frontend');
const API = 'https://visioncore-api-gateway.weiganlight.workers.dev';
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

// vision-core-next.html polls /api/agent/status + /api/mission/quota
// unconditionally on load, and the Chat-tab sidebar extras fetch
// /api/dora-metrics + /api/mission/timeline — same unmocked-leak risk
// already documented in the other permanent specs.
test.beforeEach(async ({ page }) => {
  await page.route(`${API}/api/agent/status`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, connected: false }) }));
  await page.route(`${API}/api/mission/quota`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, plan: 'free', remaining: 5 }) }));
  await page.route(`${API}/api/dora-metrics`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ deployment_frequency: null, mttr: null, pass_gold_count_30d: null }) }));
  await page.route(`${API}/api/mission/timeline*`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ entries: [], count: 0, authenticated: false, anti_stub: true }) }));
});

test.describe('ARIA — nomes acessíveis (regressão IMP-008/TEST-002)', () => {
  test('#vcProjectName e #vcPrompt têm nome acessível', async ({ page }) => {
    await page.goto(NEXT_URL());
    await expect(page.locator('#vcProjectName')).toHaveAttribute('aria-label', /.+/);
    await expect(page.locator('#vcPrompt')).toHaveAttribute('aria-label', /.+/);
  });

  test('Atomic Core HUD tem nome acessível', async ({ page }) => {
    await page.goto(NEXT_URL());
    await expect(page.locator('[data-atomic-core]')).toHaveAttribute('aria-label', /.+/);
  });

  test('modal do tutorial (Smile) expõe semântica de diálogo completa', async ({ page }) => {
    await page.goto(NEXT_URL());
    const modal = page.locator('#vcSmileModal');
    await expect(modal).toHaveAttribute('role', 'dialog');
    await expect(modal).toHaveAttribute('aria-modal', 'true');
    const labelledby = await modal.getAttribute('aria-labelledby');
    const describedby = await modal.getAttribute('aria-describedby');
    expect(labelledby).toBeTruthy();
    expect(describedby).toBeTruthy();
    await expect(page.locator(`#${labelledby}`)).toHaveCount(1);
    await expect(page.locator(`#${describedby}`)).toHaveCount(1);
  });

  test('grupo de modo do Software Factory expõe role=group + aria-label', async ({ page }) => {
    await page.goto(NEXT_URL());
    await page.click('[data-feature="factory"]');
    await expect(page.locator('.vc-sf-mode')).toHaveAttribute('role', 'group');
    await expect(page.locator('.vc-sf-mode')).toHaveAttribute('aria-label', /.+/);
  });

  test('navegação lateral principal tem aria-label e cada item é um link/botão real (focável nativamente)', async ({ page }) => {
    await page.goto(NEXT_URL());
    await expect(page.locator('.vc-nav')).toHaveAttribute('aria-label', /.+/);
    const items = page.locator('.vc-nav a[data-feature], .vc-nav a[href^="#"]');
    const count = await items.count();
    expect(count).toBeGreaterThan(5);
    for (let i = 0; i < count; i++) {
      const tag = await items.nth(i).evaluate((el) => el.tagName.toLowerCase());
      expect(tag).toBe('a'); // <a href> real — focável/ativável por teclado sem JS extra
    }
  });
});

// Regressão do achado real 2026-07-18: .vc-agent span/small mediam 3.43:1/3.62:1
// reais (abaixo do mínimo WCAG AA 4.5:1) porque .vc-atomic-hud aplica
// opacity:.76 ao grupo inteiro, fator que a cor original do texto não
// compensava. Mede o contraste de verdade (screenshot real + canvas +
// fórmula de luminância relativa do WCAG), não confia em getComputedStyle
// sozinho — opacity de ancestral não aparece em getComputedStyle(el).color.
test.describe('Contraste — Atomic Core (regressão achado 2026-07-18)', () => {
  function relLum({ r, g, b }) {
    const toLin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
  }
  function contrastRatio(c1, c2) {
    const L1 = relLum(c1), L2 = relLum(c2);
    const lighter = Math.max(L1, L2), darker = Math.min(L1, L2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  test('rótulo do agente mais escuro (archivist) e subtítulo têm contraste real >= 4.5:1', async ({ page }) => {
    await page.goto(NEXT_URL());
    await page.waitForSelector('[data-atomic-core]');
    await page.waitForTimeout(400); // deixa a órbita assentar num frame estável

    const el = page.locator('.vc-agent[data-agent="archivist"]');
    const span = el.locator('span');
    const small = el.locator('small');
    const spanRect = await span.boundingBox();
    const smallRect = await small.boundingBox();

    // Amostra só o FUNDO real (canvas sobre screenshot — necessário porque
    // gradient+backdrop-filter não aparecem em getComputedStyle). A cor do
    // TEXTO vem de getComputedStyle (já resolve color-mix() pro valor final
    // exato) — mais confiável que tentar achar "o pixel mais claro" no
    // screenshot, que pega ruído de anti-aliasing/glow nas bordas do glifo
    // (achado ao tentar essa abordagem: media 4.10-4.45:1 em vez do 5.73:1
    // calculado, puro artefato de amostragem, não do fix em si).
    const shot = await page.screenshot();
    const shotB64 = shot.toString('base64');

    const result = await page.evaluate(async ({ shotB64, spanRect, smallRect }) => {
      const img = new Image();
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = 'data:image/png;base64,' + shotB64; });
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const dpr = window.devicePixelRatio || 1;
      function sampleBgNear(rect) {
        const x = Math.max(0, Math.round((rect.x - 6) * dpr));
        const y = Math.round((rect.y + rect.height / 2) * dpr);
        const d = ctx.getImageData(x, y, 1, 1).data;
        return { r: d[0], g: d[1], b: d[2] };
      }
      function parseRgb(str) {
        // color-mix() resolve pra "color(srgb r g b)" (0..1), não "rgb()" —
        // achado ao rodar este teste (regex de rgb() sozinho quebrava com
        // TypeError, achou null).
        const colorFn = str.match(/color\(srgb\s+([^)]+)\)/);
        if (colorFn) {
          const p = colorFn[1].trim().split(/\s+/).map((s) => parseFloat(s));
          return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: 1 };
        }
        const m = str.match(/rgba?\(([^)]+)\)/);
        const p = m[1].split(',').map((s) => parseFloat(s.trim()));
        return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
      }
      function compositeAlpha(fg, bg, alpha) {
        return { r: fg.r * alpha + bg.r * (1 - alpha), g: fg.g * alpha + bg.g * (1 - alpha), b: fg.b * alpha + bg.b * (1 - alpha) };
      }
      const agentEl = document.querySelector('.vc-agent[data-agent="archivist"]');
      const spanEl = agentEl.querySelector('span');
      const smallEl = agentEl.querySelector('small');
      const hudEl = document.querySelector('[data-atomic-core]');
      const hudOpacity = parseFloat(getComputedStyle(hudEl).opacity) || 1;
      const spanColor = parseRgb(getComputedStyle(spanEl).color);
      const smallColor = parseRgb(getComputedStyle(smallEl).color);
      const spanBg = sampleBgNear(spanRect);
      const smallBg = sampleBgNear(smallRect);
      return {
        spanEffective: compositeAlpha(spanColor, spanBg, spanColor.a * hudOpacity),
        spanBg,
        smallEffective: compositeAlpha(smallColor, smallBg, smallColor.a * hudOpacity),
        smallBg,
        hudOpacity
      };
    }, { shotB64, spanRect, smallRect });

    const spanRatio = contrastRatio(result.spanEffective, result.spanBg);
    const smallRatio = contrastRatio(result.smallEffective, result.smallBg);

    expect(spanRatio, `rótulo "archivist": ${spanRatio.toFixed(2)}:1 (mínimo 4.5:1, hud opacity ${result.hudOpacity})`).toBeGreaterThanOrEqual(4.5);
    expect(smallRatio, `subtítulo "archivist": ${smallRatio.toFixed(2)}:1 (mínimo 4.5:1, hud opacity ${result.hudOpacity})`).toBeGreaterThanOrEqual(4.5);
  });
});

test.describe('Teclado — foco', () => {
  test('Tab alcança a navegação principal e o composer sem ficar preso fora de um modal', async ({ page }) => {
    await page.goto(NEXT_URL());
    await page.locator('.vc-side-brand').focus();
    // Passa pelos itens de nav reais sem travar — 20 tabs é folga generosa
    // sobre os ~14 itens de menu + toggle antes de alcançar o composer.
    let reachedPrompt = false;
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      const id = await page.evaluate(() => document.activeElement && document.activeElement.id);
      if (id === 'vcPrompt') { reachedPrompt = true; break; }
    }
    expect(reachedPrompt).toBe(true);
  });

  test('modal do tutorial prende Tab/Shift+Tab e Escape restaura o foco no botão que abriu (regressão IMP-008)', async ({ page }) => {
    await page.goto(NEXT_URL());
    const trigger = page.locator('.vc-nav-help[data-smile-open]');
    await trigger.focus();
    await trigger.press('Enter');
    await expect(page.locator('#vcSmileModal')).not.toHaveAttribute('hidden', '');

    // Foco inicial vai para o botão de fechar (openSmileGuide chama smileClose.focus()).
    await expect(page.locator('#vcSmileClose')).toBeFocused();

    // Shift+Tab a partir do primeiro controle focável deve ir para o último (wrap).
    await page.keyboard.press('Shift+Tab');
    const afterShiftTab = await page.evaluate(() => document.activeElement && document.activeElement.id);
    const modalFocusableIds = await page.locator('#vcSmileModal button:not([disabled]), #vcSmileModal input:not([disabled])').evaluateAll(
      (els) => els.map((e) => e.id)
    );
    expect(modalFocusableIds).toContain(afterShiftTab);
    expect(afterShiftTab).toBe(modalFocusableIds[modalFocusableIds.length - 1]);

    // Escape fecha o modal e devolve o foco ao botão que abriu.
    await page.keyboard.press('Escape');
    await expect(page.locator('#vcSmileModal')).toHaveAttribute('hidden', '');
    await expect(trigger).toBeFocused();
  });

  test('Enter sem Shift no composer não insere quebra de linha (submit path)', async ({ page }) => {
    await page.goto(NEXT_URL());
    const prompt = page.locator('#vcPrompt');
    await prompt.click();
    await prompt.type('linha unica');
    await prompt.press('Enter');
    // preventDefault no Enter sem shift impede a quebra de linha ser inserida
    const value = await prompt.inputValue();
    expect(value).not.toContain('\n');
  });
});

test.describe('prefers-reduced-motion — window.VCMotion é a fonte única de verdade', () => {
  test('preferência do SO sozinha NÃO degrada o Atomic Core (identidade de marca, ver DECISIONS.md)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(NEXT_URL());
    const mode = await page.evaluate(() => window.VCMotion && window.VCMotion.getMode());
    expect(mode).toBe('full');
  });

  test('window.VCMotion.setMode("reduced") explícito é respeitado independente do SO', async ({ page }) => {
    await page.addInitScript(() => { window.localStorage.setItem('vc_animation_mode', 'reduced'); });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(NEXT_URL());
    const mode = await page.evaluate(() => window.VCMotion && window.VCMotion.getMode());
    expect(mode).toBe('reduced');
    const isReduced = await page.evaluate(() => window.VCMotion && window.VCMotion.isReduced());
    expect(isReduced).toBe(true);
  });
});
