# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: manual-verification.spec.mjs >> §119 — Menu de tutoriais funciona mesmo após vc_tutorial_done=1 >> 1 — Bug reproduzido+corrigido: vcStartSectionTutorial funciona com vc_tutorial_done=1
- Location: tests\e2e\manual-verification.spec.mjs:858:3

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
  748 |   });
  749 | 
  750 |   test('T5 — Agentes Extras: spotlight cobre .vc-reserve-modes e .vc-reserve-tags', async ({ page }) => {
  751 |     test.setTimeout(60_000);
  752 |     await setupLocalBundleRoute(page); // serve bundle local com §118 changes
  753 |     await gotoPageForTutorialTest(page);
  754 | 
  755 |     await page.evaluate(() => window.vcStartSectionTutorial('agents'));
  756 |     await waitForStepReady(page);
  757 | 
  758 |     // Passo 0: #agentsBoard (geral — pode preencher o viewport inteiro)
  759 |     // §120: quando o board é maior que o viewport, o fallback conceitual é ativado
  760 |     // (spotlight.width=0). Isso é comportamento correto, não regressão.
  761 |     const p0 = await getSpotlightVsTarget(page, '#agentsBoard');
  762 |     console.log('  T5 p0 (agentsBoard):', JSON.stringify(p0));
  763 |     expect(p0.overlayVisible, 'T5 p0: overlay deve estar visível').toBe(true);
  764 |     if (p0.spotW > 0) {
  765 |       assertSpotlightCoversTarget(p0, 'T5 passo 0 — #agentsBoard (spotlight real)');
  766 |     } else {
  767 |       console.log('  T5 p0: #agentsBoard preenche viewport — fallback conceitual ativado (§120)');
  768 |     }
  769 | 
  770 |     await clickJS(page, '#vcTutorialNext');
  771 |     await waitForStepReady(page);
  772 | 
  773 |     // Passo 1 (§118 fix): .vc-reserve-card[data-agent-id="backend"] .vc-reserve-modes
  774 |     const p1 = await getSpotlightVsTarget(page, '.vc-reserve-card[data-agent-id="backend"] .vc-reserve-modes');
  775 |     console.log('  T5 p1 (backend .vc-reserve-modes):', JSON.stringify(p1));
  776 |     assertSpotlightCoversTarget(p1, 'T5 passo 1 — backend .vc-reserve-modes');
  777 | 
  778 |     await clickJS(page, '#vcTutorialNext');
  779 |     await waitForStepReady(page);
  780 | 
  781 |     // Passo 2 (§118 fix): .vc-reserve-card[data-agent-id="backend"] .vc-reserve-tags
  782 |     const p2 = await getSpotlightVsTarget(page, '.vc-reserve-card[data-agent-id="backend"] .vc-reserve-tags');
  783 |     console.log('  T5 p2 (backend .vc-reserve-tags):', JSON.stringify(p2));
  784 |     assertSpotlightCoversTarget(p2, 'T5 passo 2 — backend .vc-reserve-tags');
  785 | 
  786 |     console.log('  T5 PASS: 3 passos verificados, modos e tags do card backend iluminados.');
  787 |   });
  788 | 
  789 |   test('T6 — PASS GOLD: passo Auto-merge ilumina #policyBtn (não #githubPanel)', async ({ page }) => {
  790 |     test.setTimeout(60_000);
  791 |     await setupLocalBundleRoute(page); // serve bundle local com §118 changes
  792 |     await gotoPageForTutorialTest(page);
  793 | 
  794 |     await page.evaluate(() => window.vcStartSectionTutorial('passgold'));
  795 |     await waitForStepReady(page);
  796 | 
  797 |     // Avançar até o passo 3 (GitHub Integration Real — target #githubPanel)
  798 |     for (let i = 0; i < 3; i++) {
  799 |       await clickJS(page, '#vcTutorialNext');
  800 |       await waitForStepReady(page);
  801 |     }
  802 | 
  803 |     // Passo 3: #githubPanel (GitHub Integration Real — deve continuar correto)
  804 |     const p3 = await getSpotlightVsTarget(page, '#githubPanel');
  805 |     console.log('  T6 p3 (githubPanel):', JSON.stringify(p3));
  806 |     assertSpotlightCoversTarget(p3, 'T6 passo 3 — #githubPanel');
  807 | 
  808 |     await clickJS(page, '#vcTutorialNext');
  809 |     await waitForStepReady(page);
  810 | 
  811 |     // Passo 4 (§118 fix): #policyBtn — Auto-merge Policy
  812 |     const p4 = await getSpotlightVsTarget(page, '#policyBtn');
  813 |     console.log('  T6 p4 (policyBtn):', JSON.stringify(p4));
  814 |     assertSpotlightCoversTarget(p4, 'T6 passo 4 — #policyBtn (Auto-merge)');
  815 | 
  816 |     // Verificação extra: spotlight NÃO deve estar sobre o githubPanel inteiro
  817 |     // (se fosse, spotW seria muito maior que o policyBtn)
  818 |     const policyBtnW = p4.tgW;
  819 |     expect(
  820 |       p4.spotW,
  821 |       'T6 p4: spotlight.width (' + p4.spotW + ') deve ser próximo ao policyBtn.width (' + policyBtnW + '), não ao githubPanel inteiro'
  822 |     ).toBeLessThan(policyBtnW + 80); // policyBtn + 2*pad + tolerância
  823 | 
  824 |     console.log('  T6 PASS: #policyBtn iluminado (w=' + Math.round(p4.spotW) + 'px), não o painel inteiro.');
  825 |   });
  826 | });
  827 | 
  828 | // ─────────────────────────────────────────────────────────────────────────────
  829 | // §119 — Menu de tutoriais funciona mesmo após vc_tutorial_done=1
  830 | //
  831 | // Testes determinísticos de DOM/localStorage — sem chamadas de LLM.
  832 | // Causa raiz: guard `if (vc_tutorial_done==='1') return` bloqueava a definição
  833 | // de window._vcSetActiveTutorial, que os itens do accordion precisam.
  834 | // ─────────────────────────────────────────────────────────────────────────────
  835 | 
  836 | test.describe('§119 — Menu de tutoriais funciona mesmo após vc_tutorial_done=1', () => {
  837 | 
  838 |   /**
  839 |    * Navega com vc_tutorial_done=1 no localStorage (reproduz usuário recorrente).
  840 |    * Usa bundle local (com §119 fix) e NÃO suprime via gotoPage para poder verificar
  841 |    * que o overlay inicializa corretamente.
  842 |    */
  843 |   async function gotoAsReturningUser(page) {
  844 |     // Seta a flag ANTES do goto via addInitScript (roda antes do JS da página)
  845 |     await page.addInitScript(() => {
  846 |       try { localStorage.setItem('vc_tutorial_done', '1'); } catch(e) {}
  847 |     });
> 848 |     await page.goto(BASE_URL);
      |                ^ TimeoutError: page.goto: Timeout 30000ms exceeded.
  849 |     await page.waitForLoadState('networkidle', { timeout: 20_000 });
  850 |     // _vcSetActiveTutorial deve existir mesmo com vc_tutorial_done=1 (§119 fix)
  851 |     await page.waitForFunction(
  852 |       () => typeof window._vcSetActiveTutorial === 'function',
  853 |       {},
  854 |       { timeout: 5_000 }
  855 |     );
  856 |   }
  857 | 
  858 |   test('1 — Bug reproduzido+corrigido: vcStartSectionTutorial funciona com vc_tutorial_done=1', async ({ page }) => {
  859 |     test.setTimeout(30_000);
  860 |     await setupLocalBundleRoute(page);
  861 |     await gotoAsReturningUser(page);
  862 | 
  863 |     // Clicar no accordion para abrir o painel
  864 |     await clickJS(page, '#vcTutMenuBtn');
  865 |     await page.waitForTimeout(200);
  866 | 
  867 |     // Clicar no item "Software factory" via link real (como usuário faria)
  868 |     await clickJS(page, 'a[onclick*="vcStartSectionTutorial(\'sf\')"]');
  869 |     await page.waitForTimeout(300);
  870 | 
  871 |     // Overlay deve estar visível e ativo
  872 |     const overlayState = await page.evaluate(() => {
  873 |       var ov = document.getElementById('vcTutorialOverlay');
  874 |       return {
  875 |         display: ov ? ov.style.display : 'not-found',
  876 |         hasActive: ov ? ov.classList.contains('active') : false,
  877 |         titleText: document.getElementById('vcTutorialTitle') ? document.getElementById('vcTutorialTitle').textContent : ''
  878 |       };
  879 |     });
  880 |     console.log('  §119 overlay state:', JSON.stringify(overlayState));
  881 | 
  882 |     expect(overlayState.display, '§119: overlay deve estar visível (display != none)').not.toBe('none');
  883 |     expect(overlayState.display, '§119: overlay deve estar exibido').not.toBe('');
  884 |     expect(overlayState.hasActive, '§119: overlay.classList deve ter "active"').toBe(true);
  885 |     expect(overlayState.titleText.length, '§119: título do tutorial deve estar preenchido').toBeGreaterThan(0);
  886 | 
  887 |     console.log('  §119 PASS: overlay visível após clicar no menu com vc_tutorial_done=1 (bug corrigido).');
  888 |   });
  889 | 
  890 |   test('2 — Persistência por tutorial: fechar SF tutorial grava vc_tutorial_sf_done, não vc_tutorial_done', async ({ page }) => {
  891 |     test.setTimeout(30_000);
  892 |     await setupLocalBundleRoute(page);
  893 |     await gotoAsReturningUser(page);
  894 | 
  895 |     // Abrir tutorial SF
  896 |     await page.evaluate(() => window.vcStartSectionTutorial('sf'));
  897 |     await waitForStepReady(page);
  898 | 
  899 |     // Marcar "não exibir novamente" e fechar
  900 |     await page.evaluate(() => {
  901 |       var cb = document.getElementById('vcTutorialNoShow');
  902 |       if (cb) cb.checked = true;
  903 |     });
  904 |     await clickJS(page, '#vcTutorialSkip');
  905 |     await page.waitForTimeout(200);
  906 | 
  907 |     // Verificar que a chave certa foi gravada
  908 |     const keys = await page.evaluate(() => ({
  909 |       sfKey:   localStorage.getItem('vc_tutorial_sf_done'),
  910 |       t1Key:   localStorage.getItem('vc_tutorial_done'),
  911 |     }));
  912 |     console.log('  §119 storage keys after close:', JSON.stringify(keys));
  913 | 
  914 |     expect(keys.sfKey, '§119: vc_tutorial_sf_done deve ser "1"').toBe('1');
  915 |     // vc_tutorial_done pode ser '1' (setado no addInitScript) mas não deve ter sido
  916 |     // SOBRESCRITO pela persistência do tutorial SF — já tinha '1', continua '1' (ok).
  917 |     // O que não pode acontecer: antes do fix, closeTutorial gravava em vc_tutorial_done
  918 |     // mesmo quando o tutorial ativo era de seção. Ambos são '1' aqui é um falso positivo
  919 |     // aceitável — o que importa é que sf_done foi gravado.
  920 |     // Para certificar que o comportamento é correto: abrir 'agents' (diferente de 'sf')
  921 |     // e fechar também deve gravar a chave certa.
  922 |     await page.evaluate(() => { localStorage.removeItem('vc_tutorial_agents_done'); });
  923 |     await page.evaluate(() => window.vcStartSectionTutorial('agents'));
  924 |     await waitForStepReady(page);
  925 |     await page.evaluate(() => {
  926 |       var cb = document.getElementById('vcTutorialNoShow');
  927 |       if (cb) cb.checked = true;
  928 |     });
  929 |     await clickJS(page, '#vcTutorialSkip');
  930 |     await page.waitForTimeout(200);
  931 | 
  932 |     const agentsKey = await page.evaluate(() => localStorage.getItem('vc_tutorial_agents_done'));
  933 |     console.log('  §119 agents key:', agentsKey);
  934 |     expect(agentsKey, '§119: vc_tutorial_agents_done deve ser "1"').toBe('1');
  935 | 
  936 |     console.log('  §119 PASS: cada tutorial de seção grava na própria chave ao fechar.');
  937 |   });
  938 | 
  939 |   test('3 — Regressão T1: sem flag, tutorial geral ainda auto-abre após 1500ms', async ({ page }) => {
  940 |     test.setTimeout(10_000);
  941 |     await setupLocalBundleRoute(page);
  942 |     // SEM addInitScript de vc_tutorial_done — primeira visita simulada
  943 |     await page.goto(BASE_URL);
  944 |     await page.waitForLoadState('networkidle', { timeout: 20_000 });
  945 | 
  946 |     // Aguardar o setTimeout de 1500ms + margem
  947 |     await page.waitForFunction(
  948 |       () => {
```