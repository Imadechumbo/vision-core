# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: manual-verification.spec.mjs >> §121 — position:fixed restaurado + seta direcional + scroll tracking >> 3 — scroll manual: balão se reposiciona após page.mouse.wheel()
- Location: tests\e2e\manual-verification.spec.mjs:1180:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
TimeoutError: page.goto: Timeout 30000ms exceeded.
Call log:
  - navigating to "https://visioncoreai.pages.dev/", waiting until "load"

```

# Test source

```ts
  503 |     if (diagConcluido === 0) {
  504 |       // LLM não retornou JSON no formato HERMES, ou o request deu timeout/erro.
  505 |       // Verificar o que apareceu no chat para diagnóstico.
  506 |       const chatContent = await page.locator('#v298ChatStream').innerText().catch(() => '');
  507 |       console.log('  INCONCLUSIVO: "Diagnóstico concluído" não apareceu. Chat stream: ' +
  508 |         chatContent.slice(0, 200) + (chatContent.length > 200 ? '...' : ''));
  509 |       // Registrar como INCONCLUSIVO sem falhar — o LLM pode não ter formatado como JSON.
  510 |       await page.screenshot({ path: 'test-results/apply-115-chat-trigger.png', fullPage: true });
  511 |       return; // test passes as INCONCLUSIVO
  512 |     }
  513 | 
  514 |     // hermesObj válido → EXECUTAR MISSÃO
  515 |     await clickJS(page, '#v298RunBtn');
  516 | 
  517 |     const applyBtn = page.locator('text=/Aplicar no Vision Agent Local/').first();
  518 |     await expect(applyBtn).toBeVisible({ timeout: 20_000 });
  519 |     const buttonText = await applyBtn.innerText();
  520 | 
  521 |     await page.screenshot({ path: 'test-results/apply-115-chat-trigger.png', fullPage: true });
  522 | 
  523 |     if (/\(\d+ arquivos\)/.test(buttonText)) {
  524 |       console.log('  PASS COMPLETO: botão "' + buttonText.trim() + '" — multi-arquivo confirmado.');
  525 |     } else {
  526 |       console.log('  INCONCLUSIVO (não é falha): "' + buttonText.trim() + '" — LLM decidiu single-file. Válido por design. Ver screenshot.');
  527 |     }
  528 |   });
  529 | });
  530 | 
  531 | // ─────────────────────────────────────────────────────────────────────────────
  532 | // §118 — TUTORIAL: BALÕES ALINHADOS COM ELEMENTOS REAIS (T2/T3/T5/T6)
  533 | //
  534 | // Estes testes verificam que positionBalloon() ilumina o elemento específico
  535 | // descrito em cada passo, em vez de um container genérico.
  536 | //
  537 | // Estratégia:
  538 | //   1. Navegar sem suppressTutorial — o T1 precisa inicializar para
  539 | //      _vcSetActiveTutorial ficar disponível no window.
  540 | //   2. Disparar tutorial de seção via window.vcStartSectionTutorial(name).
  541 | //   3. Para cada passo, aguardar typewriter + 80ms de positionBalloon.
  542 | //   4. Comparar getBoundingClientRect() do spotlight vs. do elemento-alvo.
  543 | //      spotlight.top ≈ target.top - pad (pad=14), dentro de tolerância de 20px.
  544 | //      spotlight.width > 0 confirma que o elemento foi encontrado e está em view.
  545 | // ─────────────────────────────────────────────────────────────────────────────
  546 | 
  547 | /**
  548 |  * v5-§118: intercept bundle.js e serve o arquivo LOCAL em vez do de produção.
  549 |  * Necessário para testar as mudanças §118 antes do deploy.
  550 |  * Deve ser chamada ANTES de page.goto().
  551 |  */
  552 | const LOCAL_BUNDLE_PATH = path.resolve(process.cwd(), 'frontend/assets/vision-core-bundle.js');
  553 | const LOCAL_INDEX_PATH  = path.resolve(process.cwd(), 'frontend/index.html');
  554 | 
  555 | async function setupLocalBundleRoute(page) {
  556 |   let localBundle;
  557 |   try {
  558 |     localBundle = readFileSync(LOCAL_BUNDLE_PATH, 'utf8');
  559 |     console.log('[LOCAL BUNDLE] lido: ' + LOCAL_BUNDLE_PATH + ' (' + localBundle.length + ' bytes)');
  560 |   } catch (e) {
  561 |     console.warn('[LOCAL BUNDLE] ERRO ao ler bundle local: ' + e.message + ' — continuando sem intercept');
  562 |     return;
  563 |   }
  564 |   await page.route('**/vision-core-bundle.js', (route) => {
  565 |     route.fulfill({
  566 |       status: 200,
  567 |       contentType: 'application/javascript; charset=utf-8',
  568 |       body: localBundle,
  569 |     });
  570 |   });
  571 | }
  572 | 
  573 | /**
  574 |  * §121: Intercepta o index.html remoto com o arquivo local.
  575 |  * Necessário para que as mudanças de CSS (remoção de position:relative!important)
  576 |  * tomem efeito nos testes sem exigir um deploy prévio.
  577 |  * Deve ser chamada ANTES de page.goto() — junto com setupLocalBundleRoute.
  578 |  */
  579 | async function setupLocalIndexRoute(page) {
  580 |   let localHtml;
  581 |   try {
  582 |     localHtml = readFileSync(LOCAL_INDEX_PATH, 'utf8');
  583 |     console.log('[LOCAL INDEX] lido: ' + LOCAL_INDEX_PATH + ' (' + localHtml.length + ' bytes)');
  584 |   } catch (e) {
  585 |     console.warn('[LOCAL INDEX] ERRO ao ler index.html local: ' + e.message + ' — continuando sem intercept');
  586 |     return;
  587 |   }
  588 |   // Intercepta a URL raiz (com e sem trailing slash)
  589 |   await page.route(/^https:\/\/visioncoreai\.pages\.dev\/?$/, (route) => {
  590 |     route.fulfill({
  591 |       status: 200,
  592 |       contentType: 'text/html; charset=utf-8',
  593 |       body: localHtml,
  594 |     });
  595 |   });
  596 | }
  597 | 
  598 | /**
  599 |  * Navega para BASE_URL SEM suprimir o tutorial — necessário para que
  600 |  * initTutorial() registre _vcSetActiveTutorial no window.
  601 |  */
  602 | async function gotoPageForTutorialTest(page) {
> 603 |   await page.goto(BASE_URL);
      |              ^ TimeoutError: page.goto: Timeout 30000ms exceeded.
  604 |   await page.waitForLoadState('networkidle', { timeout: 20_000 });
  605 |   // Aguardar o setTimeout de 1500ms do T1 disparar e _vcSetActiveTutorial ficar disponível
  606 |   await page.waitForFunction(
  607 |     () => typeof window._vcSetActiveTutorial === 'function',
  608 |     {},
  609 |     { timeout: 5_000 }
  610 |   );
  611 | }
  612 | 
  613 | /**
  614 |  * Aguarda o typewriter do passo atual terminar (nextBtn fica habilitado)
  615 |  * e dá uma margem extra para o setTimeout(80ms) de positionBalloon assentar.
  616 |  */
  617 | async function waitForStepReady(page) {
  618 |   await page.waitForFunction(
  619 |     () => {
  620 |       var btn = document.getElementById('vcTutorialNext');
  621 |       return btn && !btn.disabled;
  622 |     },
  623 |     {},
  624 |     { timeout: 15_000 }
  625 |   );
  626 |   await page.waitForTimeout(200); // margem para onEnter + setTimeout(80ms)
  627 | }
  628 | 
  629 | /**
  630 |  * Lê a posição visual do spotlight e do elemento-alvo.
  631 |  * Retorna um objeto com dimensões normalizadas para assertSpotlightCoversTarget().
  632 |  */
  633 | async function getSpotlightVsTarget(page, targetSel) {
  634 |   return await page.evaluate(function(sel) {
  635 |     var spotlight = document.getElementById('vcTutorialSpotlight');
  636 |     var target    = sel ? document.querySelector(sel) : null;
  637 |     var sp = spotlight ? spotlight.getBoundingClientRect() : null;
  638 |     var tg = target    ? target.getBoundingClientRect()    : null;
  639 |     return {
  640 |       spotW:    sp ? sp.width  : -1,
  641 |       spotH:    sp ? sp.height : -1,
  642 |       spotTop:  sp ? sp.top    : -1,
  643 |       spotLeft: sp ? sp.left   : -1,
  644 |       tgTop:    tg ? tg.top    : -1,
  645 |       tgLeft:   tg ? tg.left   : -1,
  646 |       tgW:      tg ? tg.width  : -1,
  647 |       tgH:      tg ? tg.height : -1,
  648 |       targetExists:   !!target,
  649 |       overlayVisible: !!(document.getElementById('vcTutorialOverlay') &&
  650 |                          document.getElementById('vcTutorialOverlay').style.display !== 'none')
  651 |     };
  652 |   }, targetSel);
  653 | }
  654 | 
  655 | /**
  656 |  * Verifica que o spotlight está sobre o elemento-alvo.
  657 |  * pad = 14 (mesmo valor de positionBalloon no bundle).
  658 |  * Tolerância de 20px para rounding e diferenças de viewport.
  659 |  */
  660 | function assertSpotlightCoversTarget(pos, stepLabel, pad) {
  661 |   var p = (pad !== undefined) ? pad : 14;
  662 |   var tol = 20;
  663 |   expect(pos.overlayVisible, stepLabel + ': overlay deve estar visível').toBe(true);
  664 |   expect(pos.spotW, stepLabel + ': spotlight.width deve ser > 0 (elemento não encontrado ou fora do viewport)').toBeGreaterThan(0);
  665 |   expect(pos.spotH, stepLabel + ': spotlight.height deve ser > 0').toBeGreaterThan(0);
  666 |   if (pos.targetExists && pos.tgW > 0) {
  667 |     // spotlight.top ≈ target.top - pad
  668 |     expect(
  669 |       Math.abs(pos.spotTop - (pos.tgTop - p)),
  670 |       stepLabel + ': spotlight.top (' + pos.spotTop + ') deve ≈ target.top (' + pos.tgTop + ') - pad (' + p + ')'
  671 |     ).toBeLessThan(tol);
  672 |     // spotlight.left ≈ target.left - pad
  673 |     expect(
  674 |       Math.abs(pos.spotLeft - (pos.tgLeft - p)),
  675 |       stepLabel + ': spotlight.left (' + pos.spotLeft + ') deve ≈ target.left (' + pos.tgLeft + ') - pad (' + p + ')'
  676 |     ).toBeLessThan(tol);
  677 |   }
  678 | }
  679 | 
  680 | test.describe('§118 — Tutorial: balões alinhados com elementos reais (T2/T3/T5/T6)', () => {
  681 | 
  682 |   test('T2 — Vision Agent Local: spotlight cobre elementos reais por passo', async ({ page }) => {
  683 |     test.setTimeout(60_000);
  684 |     // O botão de download fica a ~730px do topo com viewport 720px padrão — o cockpit
  685 |     // usa altura de viewport, impossibilitando scroll adicional para centralizá-lo.
  686 |     // Aumentamos a viewport para que o elemento fique dentro da área visível.
  687 |     await page.setViewportSize({ width: 1280, height: 900 });
  688 |     await setupLocalBundleRoute(page); // serve bundle local com §118 changes
  689 |     await gotoPageForTutorialTest(page);
  690 | 
  691 |     await page.evaluate(() => window.vcStartSectionTutorial('agent'));
  692 |     await waitForStepReady(page);
  693 | 
  694 |     // Passo 0: .mc-tab[data-tab="agent"] — onEnter abre a aba
  695 |     const p0 = await getSpotlightVsTarget(page, '.mc-tab[data-tab="agent"]');
  696 |     console.log('  T2 p0 (agent tab):', JSON.stringify(p0));
  697 |     assertSpotlightCoversTarget(p0, 'T2 passo 0 — .mc-tab[data-tab="agent"]');
  698 | 
  699 |     await clickJS(page, '#vcTutorialNext');
  700 |     await waitForStepReady(page);
  701 | 
  702 |     // Passo 1: #mc-tab-agent .agent-download (botão de download real)
  703 |     const p1 = await getSpotlightVsTarget(page, '#mc-tab-agent .agent-download');
```