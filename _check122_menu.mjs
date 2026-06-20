/**
 * §122 — check: captura screenshot do menu "🪐 Tutoriais" completo
 * e compara computedStyle dos 6 itens para verificar uniformidade.
 * Usa index.html local para garantir CSS correto (igual aos testes §121).
 */
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE_URL = 'https://visioncoreai.pages.dev';
const LOCAL_BUNDLE = resolve(process.cwd(), 'frontend/assets/vision-core-bundle.js');
const LOCAL_INDEX  = resolve(process.cwd(), 'frontend/index.html');

const bundle = readFileSync(LOCAL_BUNDLE, 'utf8');
const html   = readFileSync(LOCAL_INDEX,  'utf8');

const browser = await chromium.launch({ headless: true });
const ctx     = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page    = await ctx.newPage();

// Interceptar HTML local e bundle local
await page.route(/^https:\/\/visioncoreai\.pages\.dev\/?$/, route =>
  route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }));
await page.route('**/vision-core-bundle.js', route =>
  route.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', body: bundle }));

// Suprimir auto-abertura do tutorial T1
await page.addInitScript(() => {
  try { localStorage.setItem('vc_tutorial_done', '1'); } catch(e) {}
});

await page.goto(BASE_URL);
await page.waitForLoadState('networkidle', { timeout: 20_000 });

// Abrir accordion de tutoriais
await page.evaluate(() => {
  var btn = document.getElementById('vcTutMenuBtn');
  if (btn) btn.click();
});
await page.waitForTimeout(400);

// Screenshot da sidebar completa com accordion aberto
const sidebar = await page.$('aside');
if (sidebar) {
  await sidebar.screenshot({ path: 'test-results/s122-menu-completo.png' });
  console.log('✅ Screenshot: test-results/s122-menu-completo.png');
} else {
  await page.screenshot({ path: 'test-results/s122-menu-completo.png' });
  console.log('✅ Screenshot (full page): test-results/s122-menu-completo.png');
}

// Comparar computedStyle dos 6 itens
const styles = await page.evaluate(() => {
  var items = Array.from(document.querySelectorAll('#vcTutPanel .vc-tut-item'));
  return items.map(function(el) {
    var cs = getComputedStyle(el);
    return {
      text:       el.textContent.trim(),
      color:      cs.color,
      fontSize:   cs.fontSize,
      fontWeight: cs.fontWeight,
      padding:    cs.padding,
      opacity:    cs.opacity,
      display:    cs.display,
    };
  });
});

console.log('\n── computedStyle dos 6 itens ──');
styles.forEach(function(s, i) {
  console.log('Item ' + (i+1) + ' [' + s.text + ']:', JSON.stringify(s));
});

// Verificar uniformidade
const first = styles[0];
let allMatch = true;
styles.forEach(function(s, i) {
  if (i === 0) return;
  if (s.color !== first.color || s.fontSize !== first.fontSize ||
      s.fontWeight !== first.fontWeight || s.padding !== first.padding) {
    console.log('\n⚠️  DIFERENÇA no item ' + (i+1) + ' [' + s.text + ']');
    console.log('  color:',      first.color, '->', s.color);
    console.log('  fontSize:',   first.fontSize, '->', s.fontSize);
    console.log('  fontWeight:', first.fontWeight, '->', s.fontWeight);
    console.log('  padding:',    first.padding, '->', s.padding);
    allMatch = false;
  }
});

if (allMatch) {
  console.log('\n✅ Todos os 6 itens: computedStyle IDÊNTICO (color, fontSize, fontWeight, padding).');
  console.log('   Não há bug de CSS no menu.');
} else {
  console.log('\n❌ Diferença detectada — há bug de CSS real.');
}

await browser.close();
