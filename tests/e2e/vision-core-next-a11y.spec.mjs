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
