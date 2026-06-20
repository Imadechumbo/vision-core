/**
 * §122 — testa menu em produção como PRIMEIRA visita (sem suprimir tutorial T1)
 * e após login (se possível). Captura screenshots em múltiplos momentos.
 */
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const ctx     = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page    = await ctx.newPage();

// NÃO suprime tutorial T1 — queremos ver se T1 init muda o menu
await page.goto('https://visioncoreai.pages.dev');
await page.waitForLoadState('networkidle', { timeout: 30_000 });

// Screenshot ANTES de esperar o T1 abrir
await page.screenshot({ path: 'test-results/s122-fresh-before-tutorial.png' });

// Aguardar T1 abrir (1500ms) + margem
await page.waitForTimeout(2500);

// Screenshot com T1 aberto
await page.screenshot({ path: 'test-results/s122-fresh-with-tutorial.png' });

// Fechar T1
await page.evaluate(() => {
  var skip = document.getElementById('vcTutorialSkip');
  if (skip) skip.click();
});
await page.waitForTimeout(300);

// Abrir accordion
await page.evaluate(() => {
  var btn = document.getElementById('vcTutMenuBtn');
  if (btn) btn.click();
});
await page.waitForTimeout(500);

await page.screenshot({ path: 'test-results/s122-fresh-menu-open.png' });

// Extrair itens
const items = await page.evaluate(() => {
  var links = document.querySelectorAll('#vcTutPanel a.vc-tut-item');
  return Array.from(links).map(function(el) {
    return {
      text:    el.textContent.trim(),
      onclick: el.getAttribute('onclick'),
      innerHTML: el.innerHTML.trim(),
    };
  });
});

console.log('\n── Itens após T1 fechar (primeira visita) ──');
console.log('Total:', items.length);
items.forEach(function(item, i) {
  console.log('  ' + (i+1) + '. "' + item.text + '" → ' + item.onclick);
  console.log('     innerHTML:', item.innerHTML.substring(0, 80));
});

// Verificar duplicatas ou problemas
const onclicks = items.map(function(i) { return i.onclick; });
const dup = onclicks.filter(function(o, i) { return onclicks.indexOf(o) !== i; });
if (dup.length) {
  console.log('\n❌ DUPLICATA DETECTADA:', dup);
} else if (items.length !== 6) {
  console.log('\n⚠️  Contagem errada:', items.length, '(esperado 6)');
} else {
  console.log('\n✅ 6 itens únicos corretos.');
}

await browser.close();
