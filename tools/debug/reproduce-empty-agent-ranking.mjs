/**
 * MANUAL DIAGNOSTIC TOOL — not part of the permanent test suite.
 * Runs against the real production UI/API. It never mocks routes and is never
 * loaded by the product.
 *
 * node tools/debug/reproduce-empty-agent-ranking.mjs
 * node tools/debug/reproduce-empty-agent-ranking.mjs --minutes=5 --headless
 * node tools/debug/reproduce-empty-agent-ranking.mjs --minutes=60 --captures=3
 */

import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const URL = 'https://visioncoreai.pages.dev/vision-core-next.html';
const args = process.argv.slice(2);
const valueOf = (name, fallback) => {
  const arg = args.find((item) => item.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : fallback;
};
const minutes = Number(valueOf('minutes', '45'));
const captureLimit = Number(valueOf('captures', '1'));
const headless = args.includes('--headless');
const outputDir = path.resolve(valueOf('output', 'tools/debug/captures'));

if (!(minutes > 0) || !Number.isInteger(captureLimit) || captureLimit < 1) {
  throw new Error('Use --minutes=N (>0) and --captures=N (integer >=1).');
}

const browser = await chromium.launch({ headless });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const startedAt = Date.now();
const deadline = startedAt + minutes * 60_000;
let latestAgentsResponse = null;
let lastTabChangeAt = startedAt;
let captures = 0;
let cycle = 0;
let bugActive = false;
const errors = [];

await mkdir(outputDir, { recursive: true });

page.on('console', (message) => {
  if (message.type() === 'error') errors.push({ time: new Date().toISOString(), source: 'console.error', text: message.text() });
});
page.on('pageerror', (error) => errors.push({ time: new Date().toISOString(), source: 'pageerror', name: error.name, message: error.message, stack: error.stack }));
page.on('requestfailed', (request) => errors.push({
  time: new Date().toISOString(), source: 'requestfailed', url: request.url(), method: request.method(), error: request.failure()?.errorText || 'unknown'
}));
page.on('response', async (response) => {
  if (!response.url().includes('/api/metrics/agents')) return;
  try {
    latestAgentsResponse = {
      time: new Date().toISOString(), url: response.url(), status: response.status(), ok: response.ok(), responseBody: await response.text()
    };
  } catch (error) {
    latestAgentsResponse = { time: new Date().toISOString(), url: response.url(), status: response.status(), bodyReadError: error.message };
  }
});

function randomMs(minSeconds, maxSeconds) {
  return Math.round((minSeconds + Math.random() * (maxSeconds - minSeconds)) * 1000);
}

async function inspectRanking() {
  return page.evaluate(({ startedAt, lastTabChangeAt }) => {
    const root = document.querySelector('#vcMetricsAgentList');
    if (!root || root.getClientRects().length === 0) return null;
    const rectOf = (element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    };
    const cards = [...root.querySelectorAll('.vc-metric-chart')].map((card) => {
      const rows = [...card.querySelectorAll('.vc-bar-row')];
      return {
        title: card.querySelector('h6')?.textContent?.trim() || null,
        barRows: rows.length,
        legendItems: card.querySelectorAll('.vc-chart-legend > *').length,
        emptyState: Boolean(card.querySelector('.vc-metric-chart-empty')),
        geometry: rectOf(card),
        rowGeometry: rows.map(rectOf),
        outerHTML: card.outerHTML
      };
    });
    const ranking = cards.find((card) => card.title?.toLowerCase() === 'ranking de atividade');
    if (!ranking) return null;
    const neighbors = cards.filter((card) => card !== ranking);
    const detailCards = root.querySelectorAll('.vc-metrics-agent-row').length;
    const neighborsPopulated = detailCards > 0 && neighbors.some((card) => card.barRows > 0 || card.legendItems > 0);
    const zeroGeometryRows = ranking.rowGeometry.filter((rect) => rect.width === 0 || rect.height === 0).length;
    return {
      triggered: neighborsPopulated && (ranking.barRows === 0 || zeroGeometryRows > 0),
      capturedAt: new Date().toISOString(),
      timing: {
        millisecondsSinceRunnerStart: Date.now() - startedAt,
        millisecondsSinceLastTabChange: Date.now() - lastTabChangeAt
      },
      pageUrl: location.href,
      userAgent: navigator.userAgent,
      dom: {
        totalBarRows: root.querySelectorAll('.vc-bar-row').length,
        rankingBarRows: ranking.barRows,
        rankingGeometry: ranking.rowGeometry,
        zeroGeometryRows,
        detailCards,
        neighborsPopulated,
        metricsAgentListOuterHTML: root.outerHTML,
        rankingCardOuterHTML: ranking.outerHTML,
        cards
      }
    };
  }, { startedAt, lastTabChangeAt });
}

async function captureIfTriggered(reason) {
  const snapshot = await inspectRanking();
  if (snapshot && !snapshot.triggered) bugActive = false;
  if (!snapshot?.triggered || bugActive) return false;
  bugActive = true;
  captures += 1;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = `empty-agent-ranking-${stamp}-${captures}`;
  const jsonPath = path.join(outputDir, `${base}.json`);
  const screenshotPath = path.join(outputDir, `${base}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await writeFile(jsonPath, JSON.stringify({
    diagnostic: 'Vision Core Next — production empty agent activity ranking',
    reason,
    cycle,
    ...snapshot,
    latestMetricsAgentsResponse: latestAgentsResponse,
    errorsSinceRunnerStart: errors
  }, null, 2));
  console.error(`\nBUG CAPTURADO (${captures}/${captureLimit})\nJSON: ${jsonPath}\nScreenshot: ${screenshotPath}\n`);
  return captures >= captureLimit;
}

async function waitAndMonitor(milliseconds, reason) {
  const until = Math.min(Date.now() + milliseconds, deadline);
  while (Date.now() < until && !interrupted) {
    if (await captureIfTriggered(reason)) return true;
    await page.waitForTimeout(Math.min(500, until - Date.now()));
  }
  return false;
}

async function selectFeature(feature, pauseMs = randomMs(1, 5)) {
  const link = page.locator(`[data-feature="${feature}"]`);
  if (!await link.count() || !await link.first().isVisible()) return false;
  await link.first().click();
  lastTabChangeAt = Date.now();
  return waitAndMonitor(pauseMs, `after navigation to ${feature}`);
}

let interrupted = false;
process.once('SIGINT', () => { interrupted = true; });

try {
  console.log(`Produção real: ${URL}`);
  console.log(`Modo: ${headless ? 'headless' : 'visível'} | duração: ${minutes} min | capturas: ${captureLimit}`);
  console.log(`Saída: ${outputDir}\nPressione Ctrl+C para encerrar graciosamente.\n`);
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.locator('[data-feature="metrics"]').waitFor({ state: 'visible', timeout: 30_000 });

  const otherFeatures = ['chat', 'missions', 'factory', 'github', 'vault', 'logs', 'tools', 'security', 'obsidian', 'settings'];
  while (Date.now() < deadline && !interrupted && captures < captureLimit) {
    cycle += 1;
    const rapid = cycle % 3 === 0;
    const idle = cycle % 6 === 0;
    console.log(`[${new Date().toLocaleTimeString()}] ciclo ${cycle}: ${rapid ? 'trocas rápidas' : idle ? 'idle longo' : 'navegação variada'}`);

    if (await selectFeature('agents', rapid ? randomMs(.1, .7) : randomMs(2, 8))) break;
    if (await selectFeature(otherFeatures[cycle % otherFeatures.length], rapid ? randomMs(.1, .8) : randomMs(2, 7))) break;
    if (await selectFeature('metrics', rapid ? randomMs(.1, .8) : randomMs(2, 6))) break;

    if (cycle % 2 === 0) {
      const refresh = page.getByRole('button', { name: 'Atualizar', exact: true });
      if (await refresh.isVisible().catch(() => false)) {
        await refresh.click();
        if (await waitAndMonitor(randomMs(.5, 4), 'after metrics refresh')) break;
        if (cycle % 4 === 0) {
          await refresh.click();
          if (await waitAndMonitor(randomMs(.2, 2), 'after repeated metrics refresh')) break;
        }
      }
    }

    if (await waitAndMonitor(idle ? randomMs(60, 120) : randomMs(3, 15), idle ? 'long metrics idle' : 'metrics dwell')) break;
  }

  if (captures) console.log(`Encerrado após capturar ${captures} ocorrência(s).`);
  else if (interrupted) console.log(`Encerrado pelo usuário após ${cycle} ciclo(s), sem captura.`);
  else console.log(`Tempo concluído (${minutes} min, ${cycle} ciclo(s)) sem reproduzir o bug. Isso não é falha do runner.`);
} finally {
  await browser.close();
}
