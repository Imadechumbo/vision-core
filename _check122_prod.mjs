import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const ctx     = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page    = await ctx.newPage();

await page.addInitScript(() => {
  try { localStorage.setItem('vc_tutorial_done', '1'); } catch(e) {}
});

await page.goto('https://visioncoreai.pages.dev');
await page.waitForLoadState('networkidle', { timeout: 30_000 });

// Abrir accordion
await page.evaluate(() => {
  var btn = document.getElementById('vcTutMenuBtn');
  if (btn) btn.click();
});
await page.waitForTimeout(500);

// Screenshot de toda a área que tem o menu
await page.screenshot({ path: 'test-results/s122-prod-menu.png', fullPage: false });
console.log('📸 Screenshot: test-results/s122-prod-menu.png');

// Extrair itens reais do DOM
const items = await page.evaluate(() => {
  var links = document.querySelectorAll('#vcTutPanel a.vc-tut-item');
  return Array.from(links).map(function(el) {
    return {
      text:    el.textContent.trim(),
      onclick: el.getAttribute('onclick'),
    };
  });
});

console.log('\n── Itens do menu em produção (runtime DOM) ──');
console.log('Total:', items.length);
items.forEach(function(item, i) {
  console.log('  ' + (i+1) + '. "' + item.text + '" → ' + item.onclick);
});

const texts = items.map(function(i) { return i.text; });
const onclicks = items.map(function(i) { return i.onclick; });
const dupTexts = texts.filter(function(t, i) { return texts.indexOf(t) !== i; });
const dupOnclicks = onclicks.filter(function(o, i) { return onclicks.indexOf(o) !== i; });

if (dupTexts.length || dupOnclicks.length) {
  console.log('\n❌ DUPLICATA no DOM!');
  console.log('  Textos duplicados:', dupTexts);
  console.log('  onclicks duplicados:', dupOnclicks);
} else {
  console.log('\n✅ Todos', items.length, 'itens únicos.');
  if (items.length !== 6) console.log('⚠️  Esperado 6, encontrado', items.length);
  else console.log('✅ Contagem: 6 itens.');
}

await browser.close();
