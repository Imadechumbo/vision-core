// @ts-check
/**
 * Vision Core Next - residual gap between the last chat message and the
 * composer. All API calls are mocked via page.route(); this spec must never
 * touch the real backend or any host outside localhost.
 *
 * PERMANENT SPEC — regression for a real production bug: the "vao vazio"
 * fix in cbf489e3 (2026-07-17) reduced the empty gap between the assistant's
 * answer and the composer from 372px to ~167px but never actually zeroed
 * it — there was no permanent test pinning the final distance, so it
 * silently stayed at ~167px. Root cause (confirmed via Playwright, not
 * estimated — see frontend/assets/vision-core-next-clean.css next to
 * #vcChatScroll): the composer already participates in the normal document
 * flow as a flex sibling of #vcChatScroll inside .vc-chat-stage — the
 * min-height + flex:1 1 auto chain already reserves the composer's real
 * space. A ResizeObserver additionally applies
 * composer.offsetHeight + 24px as #vcChatScroll's own padding-bottom on top
 * of that — double-reserving the composer's height.
 *
 * Fix: .vc-app-shell[data-active-feature="chat"]
 * #vcChatScroll:has(#vcChatOnboarding[hidden]) { padding-bottom: 0 !important; }
 * — scoped to an already-started chat (onboarding hidden) so the onboarding
 * screen and every other tab (which reuse the same #vcFeaturePanel inside
 * .vc-chat-stage) keep the original buffer untouched.
 *
 * Verified empirically across 4 widths (320/390/820/1440) x short/long
 * answers before writing this spec: consistent ~24px gap, zero overlap in
 * every case — including the mobile case where the composer's own buttons
 * wrap onto multiple rows (much taller composer.offsetHeight), which was
 * the one scenario initially suspected of regressing into real overlap.
 */

import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const NEXT_URL = pathToFileURL(path.resolve('frontend/vision-core-next.html')).toString();
const API = 'https://visioncore-api-gateway.weiganlight.workers.dev';

test.beforeEach(async ({ page }) => {
  await page.route(`${API}/api/agent/status`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, connected: false }) }));
  await page.route(`${API}/api/mission/quota`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, plan: 'free', remaining: 5 }) }));
});

const SHORT_ANSWER = 'Resposta curta de teste.';
// Long enough to force real page overflow (taller than every viewport
// tested below) so #vcChatScroll's flex-grow "fair share" is exceeded and
// the page genuinely scrolls, not just a cosmetic reflow.
const LONG_ANSWER = 'Paragrafo de teste bem longo repetido muitas vezes para forcar overflow real de pagina. '.repeat(120);

async function measureGap(page) {
  return page.evaluate(() => {
    const stream = document.getElementById('vcChatStream');
    const messages = Array.from(stream.querySelectorAll('.vc-message'));
    const last = messages[messages.length - 1];
    const composer = document.getElementById('vcComposer').getBoundingClientRect();
    const lastRect = last.getBoundingClientRect();
    return { gap: composer.top - lastRect.bottom, overlap: lastRect.bottom > composer.top };
  });
}

async function sendAndMeasure(page, { viewport, answer, reducedMotion }) {
  await page.setViewportSize(viewport);
  await page.route(`${API}/api/chat`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, answer }) }));
  await page.goto(NEXT_URL);
  if (reducedMotion) {
    // Only used for the long-answer cases: skips the character-by-character
    // progressive reveal animation (tested elsewhere, in
    // vision-core-next-atomic-core.spec.mjs) so this spec measures final
    // layout, not reveal choreography, without an excessive wait.
    await page.evaluate(() => window.VCMotion.setMode('reduced'));
  }
  await page.locator('#vcPrompt').fill('teste');
  await page.locator('#vcComposer').evaluate((form) => form.requestSubmit());
  if (reducedMotion) {
    await expect.poll(async () => (await page.locator('.vc-message-assistant p').textContent()).length, { timeout: 20000 }).toBe(answer.length);
  } else {
    await expect(page.locator('.vc-message-assistant p')).toHaveText(answer, { timeout: 10000 });
  }
  // item.scrollIntoView({behavior:'smooth'}) runs once the message settles —
  // give the smooth-scroll animation real time to finish before measuring.
  await page.waitForTimeout(900);
  return measureGap(page);
}

const VIEWPORTS = {
  'mobile narrow 320x568': { width: 320, height: 568 },
  'mobile 390x844': { width: 390, height: 844 },
  'tablet 820x1180': { width: 820, height: 1180 },
  'desktop 1440x900': { width: 1440, height: 900 }
};

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  test(`${name}: short answer leaves 0-32px gap, no overlap`, async ({ page }) => {
    const result = await sendAndMeasure(page, { viewport, answer: SHORT_ANSWER, reducedMotion: false });
    expect(result.overlap, 'composer must never cover the last message').toBe(false);
    expect(result.gap).toBeGreaterThanOrEqual(0);
    expect(result.gap).toBeLessThanOrEqual(32);
  });

  test(`${name}: long answer (forces real page scroll) leaves 0-32px gap, no overlap`, async ({ page }) => {
    const result = await sendAndMeasure(page, { viewport, answer: LONG_ANSWER, reducedMotion: true });
    expect(result.overlap, 'composer must never cover the last message').toBe(false);
    expect(result.gap).toBeGreaterThanOrEqual(0);
    expect(result.gap).toBeLessThanOrEqual(32);
  });
}

test('onboarding screen (chat not started yet) keeps its own original buffer, untouched by the scoped fix', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(NEXT_URL);
  const padding = await page.evaluate(() => getComputedStyle(document.getElementById('vcChatScroll')).paddingBottom);
  // Before any message is sent, #vcChatOnboarding is visible (not [hidden]),
  // so the new :has(#vcChatOnboarding[hidden]) selector must not match —
  // the ResizeObserver's original composer.offsetHeight+24 reservation
  // (never 0) must still be in effect here.
  expect(padding).not.toBe('0px');
});

test('other tabs (Métricas) sharing #vcFeaturePanel inside .vc-chat-stage are unaffected', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route(`${API}/api/metrics/agents`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, agents: [] }) }));
  await page.route(`${API}/api/dora-metrics`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }));
  await page.route(`${API}/api/metrics/summary`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }));
  await page.route(`${API}/api/metrics/memory`, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }));
  await page.goto(NEXT_URL);
  await page.locator('[data-feature="metrics"]').click();
  const padding = await page.evaluate(() => getComputedStyle(document.getElementById('vcChatScroll')).paddingBottom);
  // data-active-feature="metrics" here, not "chat" -- the fix's selector is
  // scoped to the Chat tab specifically and must not match.
  expect(padding).not.toBe('0px');
});
