// @ts-check
/**
 * Vision Core Next - Atomic Core idle animation (header widget, all pages).
 * No API calls involved beyond the baseline badge polling mocked below.
 *
 * PERMANENT SPEC (not a temp validation spec — see docs/CURRENT_HANDOFF.md):
 * real production bug found via manual test on 2026-07-09 — under
 * prefers-reduced-motion:reduce, the requestAnimationFrame loop that drives
 * Agent.place()/render() never started (see vision-core-next-clean.js,
 * `if (!reduceMotion) raf = requestAnimationFrame(frame)`), so render() only
 * ever ran once at page load and again on state transitions. Between those,
 * the widget sat 100% static — read as "broken", not "calm". A prior session
 * only ever validated reducedMotion:'reduce' (confirming glow survives
 * state transitions), never asserted that no-preference actually animates
 * continuously OR that reduce isn't fully frozen between transitions — that
 * one-sided coverage is exactly what let this regression ship undetected.
 * This spec asserts both directions explicitly.
 *
 * IMPORTANT: `test.use({ reducedMotion: ... })` alone is NOT reliable for a
 * `file://` page — confirmed empirically (page.evaluate(() =>
 * matchMedia(...).matches) came back false even with reducedMotion:'reduce'
 * set via test.use). The fix is `page.emulateMedia({ reducedMotion })`
 * called explicitly BEFORE `page.goto()` — that's what actually takes effect
 * before the page's first script execution. Every future spec that depends
 * on prefers-reduced-motion for a file:// page must do the same; test.use()
 * is not sufficient by itself for this project's test setup.
 */

import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const NEXT_URL = pathToFileURL(path.resolve('frontend/vision-core-next.html')).toString();
const API = 'https://visioncore-api-gateway.weiganlight.workers.dev';
const AGENT_SELECTOR = '[data-agent="hermes"]';

// vision-core-next.html polls /api/agent/status and /api/mission/quota
// unconditionally on load (header/sidebar badges) — unmocked, both leak a
// real request to the production gateway. Same fix as the other 3 permanent
// specs (see docs/CURRENT_HANDOFF.md).
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

test('no-preference: agent position keeps moving continuously while idle', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(NEXT_URL);
  const first = await agentStyle(page);
  await page.waitForTimeout(900);
  const second = await agentStyle(page);
  expect(second.transform, 'position must change over time under no-preference (continuous orbit)').not.toBe(first.transform);
});

test('reduce: position never moves (no deslocamento), but the widget is not frozen — glow/opacity still pulses', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(NEXT_URL);
  const t0 = await agentStyle(page);
  await page.waitForTimeout(1600); // > REDUCE_TICK_MS (500ms) and a meaningful slice of REDUCE_PULSE_MS (4200ms)
  const t1 = await agentStyle(page);

  expect(t1.transform, 'position must stay frozen under reduced-motion — no vestibular-triggering movement').toBe(t0.transform);
  expect(t1.filter, 'glow/opacity must still change over time — a fully static widget reads as broken, not calm').not.toBe(t0.filter);
});

test('reduce: state transition (idle -> action -> idle) still reflects on data-state and glow, no crash', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(NEXT_URL);
  const hud = page.locator('[data-atomic-core]');
  await expect(hud).toHaveAttribute('data-state', 'idle');

  const idleStyle = await agentStyle(page);
  await page.evaluate(() => window.setAtomicCoreState('action'));
  await expect(hud).toHaveAttribute('data-state', 'action');
  const actionStyle = await agentStyle(page);
  expect(actionStyle.filter, 'glow must reflect action state even under reduced-motion').not.toBe(idleStyle.filter);

  await page.evaluate(() => window.resetAtomicCore());
  await expect(hud).toHaveAttribute('data-state', 'idle');
});
