# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: manual-verification.spec.mjs >> §119 — Menu de tutoriais funciona mesmo após vc_tutorial_done=1 >> 3 — Regressão T1: sem flag, tutorial geral ainda auto-abre após 1500ms
- Location: tests\e2e\manual-verification.spec.mjs:939:3

# Error details

```
Test timeout of 10000ms exceeded.
```

```
Error: page.goto: Test timeout of 10000ms exceeded.
Call log:
  - navigating to "https://visioncoreai.pages.dev/", waiting until "load"

```

# Test source

```ts
  843  |   async function gotoAsReturningUser(page) {
  844  |     // Seta a flag ANTES do goto via addInitScript (roda antes do JS da página)
  845  |     await page.addInitScript(() => {
  846  |       try { localStorage.setItem('vc_tutorial_done', '1'); } catch(e) {}
  847  |     });
  848  |     await page.goto(BASE_URL);
  849  |     await page.waitForLoadState('networkidle', { timeout: 20_000 });
  850  |     // _vcSetActiveTutorial deve existir mesmo com vc_tutorial_done=1 (§119 fix)
  851  |     await page.waitForFunction(
  852  |       () => typeof window._vcSetActiveTutorial === 'function',
  853  |       {},
  854  |       { timeout: 5_000 }
  855  |     );
  856  |   }
  857  | 
  858  |   test('1 — Bug reproduzido+corrigido: vcStartSectionTutorial funciona com vc_tutorial_done=1', async ({ page }) => {
  859  |     test.setTimeout(30_000);
  860  |     await setupLocalBundleRoute(page);
  861  |     await gotoAsReturningUser(page);
  862  | 
  863  |     // Clicar no accordion para abrir o painel
  864  |     await clickJS(page, '#vcTutMenuBtn');
  865  |     await page.waitForTimeout(200);
  866  | 
  867  |     // Clicar no item "Software factory" via link real (como usuário faria)
  868  |     await clickJS(page, 'a[onclick*="vcStartSectionTutorial(\'sf\')"]');
  869  |     await page.waitForTimeout(300);
  870  | 
  871  |     // Overlay deve estar visível e ativo
  872  |     const overlayState = await page.evaluate(() => {
  873  |       var ov = document.getElementById('vcTutorialOverlay');
  874  |       return {
  875  |         display: ov ? ov.style.display : 'not-found',
  876  |         hasActive: ov ? ov.classList.contains('active') : false,
  877  |         titleText: document.getElementById('vcTutorialTitle') ? document.getElementById('vcTutorialTitle').textContent : ''
  878  |       };
  879  |     });
  880  |     console.log('  §119 overlay state:', JSON.stringify(overlayState));
  881  | 
  882  |     expect(overlayState.display, '§119: overlay deve estar visível (display != none)').not.toBe('none');
  883  |     expect(overlayState.display, '§119: overlay deve estar exibido').not.toBe('');
  884  |     expect(overlayState.hasActive, '§119: overlay.classList deve ter "active"').toBe(true);
  885  |     expect(overlayState.titleText.length, '§119: título do tutorial deve estar preenchido').toBeGreaterThan(0);
  886  | 
  887  |     console.log('  §119 PASS: overlay visível após clicar no menu com vc_tutorial_done=1 (bug corrigido).');
  888  |   });
  889  | 
  890  |   test('2 — Persistência por tutorial: fechar SF tutorial grava vc_tutorial_sf_done, não vc_tutorial_done', async ({ page }) => {
  891  |     test.setTimeout(30_000);
  892  |     await setupLocalBundleRoute(page);
  893  |     await gotoAsReturningUser(page);
  894  | 
  895  |     // Abrir tutorial SF
  896  |     await page.evaluate(() => window.vcStartSectionTutorial('sf'));
  897  |     await waitForStepReady(page);
  898  | 
  899  |     // Marcar "não exibir novamente" e fechar
  900  |     await page.evaluate(() => {
  901  |       var cb = document.getElementById('vcTutorialNoShow');
  902  |       if (cb) cb.checked = true;
  903  |     });
  904  |     await clickJS(page, '#vcTutorialSkip');
  905  |     await page.waitForTimeout(200);
  906  | 
  907  |     // Verificar que a chave certa foi gravada
  908  |     const keys = await page.evaluate(() => ({
  909  |       sfKey:   localStorage.getItem('vc_tutorial_sf_done'),
  910  |       t1Key:   localStorage.getItem('vc_tutorial_done'),
  911  |     }));
  912  |     console.log('  §119 storage keys after close:', JSON.stringify(keys));
  913  | 
  914  |     expect(keys.sfKey, '§119: vc_tutorial_sf_done deve ser "1"').toBe('1');
  915  |     // vc_tutorial_done pode ser '1' (setado no addInitScript) mas não deve ter sido
  916  |     // SOBRESCRITO pela persistência do tutorial SF — já tinha '1', continua '1' (ok).
  917  |     // O que não pode acontecer: antes do fix, closeTutorial gravava em vc_tutorial_done
  918  |     // mesmo quando o tutorial ativo era de seção. Ambos são '1' aqui é um falso positivo
  919  |     // aceitável — o que importa é que sf_done foi gravado.
  920  |     // Para certificar que o comportamento é correto: abrir 'agents' (diferente de 'sf')
  921  |     // e fechar também deve gravar a chave certa.
  922  |     await page.evaluate(() => { localStorage.removeItem('vc_tutorial_agents_done'); });
  923  |     await page.evaluate(() => window.vcStartSectionTutorial('agents'));
  924  |     await waitForStepReady(page);
  925  |     await page.evaluate(() => {
  926  |       var cb = document.getElementById('vcTutorialNoShow');
  927  |       if (cb) cb.checked = true;
  928  |     });
  929  |     await clickJS(page, '#vcTutorialSkip');
  930  |     await page.waitForTimeout(200);
  931  | 
  932  |     const agentsKey = await page.evaluate(() => localStorage.getItem('vc_tutorial_agents_done'));
  933  |     console.log('  §119 agents key:', agentsKey);
  934  |     expect(agentsKey, '§119: vc_tutorial_agents_done deve ser "1"').toBe('1');
  935  | 
  936  |     console.log('  §119 PASS: cada tutorial de seção grava na própria chave ao fechar.');
  937  |   });
  938  | 
  939  |   test('3 — Regressão T1: sem flag, tutorial geral ainda auto-abre após 1500ms', async ({ page }) => {
  940  |     test.setTimeout(10_000);
  941  |     await setupLocalBundleRoute(page);
  942  |     // SEM addInitScript de vc_tutorial_done — primeira visita simulada
> 943  |     await page.goto(BASE_URL);
       |                ^ Error: page.goto: Test timeout of 10000ms exceeded.
  944  |     await page.waitForLoadState('networkidle', { timeout: 20_000 });
  945  | 
  946  |     // Aguardar o setTimeout de 1500ms + margem
  947  |     await page.waitForFunction(
  948  |       () => {
  949  |         var ov = document.getElementById('vcTutorialOverlay');
  950  |         return ov && ov.style.display !== 'none' && ov.classList.contains('active');
  951  |       },
  952  |       {},
  953  |       { timeout: 5_000 }
  954  |     );
  955  | 
  956  |     const overlayState = await page.evaluate(() => ({
  957  |       display: document.getElementById('vcTutorialOverlay')?.style.display,
  958  |       active: document.getElementById('vcTutorialOverlay')?.classList.contains('active'),
  959  |       title: document.getElementById('vcTutorialTitle')?.textContent
  960  |     }));
  961  |     console.log('  §119 T1 auto-start:', JSON.stringify(overlayState));
  962  | 
  963  |     expect(overlayState.active, '§119 regressão T1: overlay deve ter classe active').toBe(true);
  964  |     expect(overlayState.title, '§119 regressão T1: título T1 deve ser do primeiro passo').toContain('Bem-vindo');
  965  | 
  966  |     console.log('  §119 PASS: T1 ainda auto-abre sem vc_tutorial_done (regressão ok).');
  967  |   });
  968  | });
  969  | 
  970  | // ─────────────────────────────────────────────────────────────────────────────
  971  | // §120 — Balão nunca esconde nem deixa de iluminar a área explicada
  972  | //
  973  | // Print 1 (T5 passo 0, #agentsBoard largo): balão sobrepunha o spotlight
  974  | //   quando o elemento-alvo era mais largo que o balão. Fix: positionBalloon
  975  | //   testa 4 posições candidatas (pedida → oposta → direita → esquerda) e
  976  | //   escolhe a primeira que não se sobrepõe ao retângulo do spotlight.
  977  | //   Para alvos largos (isWide), ancora na borda esq. em vez de centralizar.
  978  | //
  979  | // Print 2 (T3 passo 0, #vcSfHomeBtn): spotlight zerava a 0x0 quando o
  980  | //   elemento ainda não estava em view 80ms depois do onEnter. Fix: showStep
  981  | //   usa 200ms para passos com onEnter e retenta 1x (150ms) se inView=false.
  982  | // ─────────────────────────────────────────────────────────────────────────────
  983  | 
  984  | test.describe('§120 — Balão nunca esconde nem deixa de iluminar a área explicada', () => {
  985  | 
  986  |   /** Retorna true se dois retângulos {top,left,right,bottom} se sobrepõem. */
  987  |   function rectsOverlap(a, b) {
  988  |     return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
  989  |   }
  990  | 
  991  |   test('Print 1 — T5 passo 0 (#agentsBoard largo): balão não sobrepõe o spotlight', async ({ page }) => {
  992  |     test.setTimeout(30_000);
  993  |     await page.setViewportSize({ width: 1280, height: 900 });
  994  |     await setupLocalBundleRoute(page);
  995  |     await gotoPageForTutorialTest(page);
  996  | 
  997  |     await page.evaluate(() => window.vcStartSectionTutorial('agents'));
  998  |     await waitForStepReady(page);
  999  | 
  1000 |     // Aguardar margem extra para o retry de 150ms assentar (caso onEnter precise)
  1001 |     await page.waitForTimeout(400);
  1002 | 
  1003 |     const rects = await page.evaluate(() => {
  1004 |       var balloon   = document.getElementById('vcTutorialBalloon');
  1005 |       var spotlight = document.getElementById('vcTutorialSpotlight');
  1006 |       var b = balloon   ? balloon.getBoundingClientRect()   : null;
  1007 |       var s = spotlight ? spotlight.getBoundingClientRect() : null;
  1008 |       return {
  1009 |         balloon:   b ? { top: b.top, left: b.left, right: b.right, bottom: b.bottom, w: b.width, h: b.height } : null,
  1010 |         spotlight: s ? { top: s.top, left: s.left, right: s.right, bottom: s.bottom, w: s.width, h: s.height } : null
  1011 |       };
  1012 |     });
  1013 | 
  1014 |     console.log('  §120 Print1 — balloon :', JSON.stringify(rects.balloon));
  1015 |     console.log('  §120 Print1 — spotlight:', JSON.stringify(rects.spotlight));
  1016 | 
  1017 |     expect(rects.balloon,   '§120 Print1: balloon rect deve existir').not.toBeNull();
  1018 |     expect(rects.spotlight, '§120 Print1: spotlight rect deve existir').not.toBeNull();
  1019 |     // §120: quando o elemento preenche o viewport inteiro, o fallback conceitual é ativado
  1020 |     // (spotlight.width=0, balão centralizado). Ambos os casos são válidos — a invariante
  1021 |     // é que o balão nunca se sobreponha ao spotlight (spotW=0 garante isso automaticamente).
  1022 |     const overlap = rectsOverlap(rects.balloon, rects.spotlight);
  1023 |     expect(
  1024 |       overlap,
  1025 |       '§120 Print1: balão NÃO deve se sobrepor ao spotlight quando #agentsBoard é largo'
  1026 |     ).toBe(false);
  1027 | 
  1028 |     await page.screenshot({ path: 'test-results/s120-print1-agents-no-overlap.png' });
  1029 |     console.log('  §120 Print1 PASS: balão fora do spotlight em T5 passo 0.');
  1030 |   });
  1031 | 
  1032 |   test('Print 2 — T3 passo 0 (#vcSfHomeBtn): spotlight não zera após onEnter', async ({ page }) => {
  1033 |     test.setTimeout(30_000);
  1034 |     await page.setViewportSize({ width: 1280, height: 900 });
  1035 |     await setupLocalBundleRoute(page);
  1036 |     await gotoPageForTutorialTest(page);
  1037 | 
  1038 |     await page.evaluate(() => window.vcStartSectionTutorial('sf'));
  1039 |     await waitForStepReady(page);
  1040 | 
  1041 |     // Aguardar margem extra para o retry de 150ms assentar
  1042 |     await page.waitForTimeout(400);
  1043 | 
```