// @ts-check
/**
 * Vision Core Next - Atomic Core idle animation (header widget, all pages).
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
