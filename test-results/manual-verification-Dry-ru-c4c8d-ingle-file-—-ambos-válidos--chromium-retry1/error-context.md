# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: manual-verification.spec.mjs >> Dry-run real — §113 (1 arquivo) / §116 (multi-arquivo) >> DRYRUN-116: dry-run multi-arquivo mostra diffs por arquivo (ou single-file — ambos válidos)
- Location: tests\e2e\manual-verification.spec.mjs:403:3

# Error details

```
TimeoutError: page.goto: Timeout 30000ms exceeded.
Call log:
  - navigating to "https://visioncoreai.pages.dev/", waiting until "load"

```

# Test source

```ts
  117 | async function waitForAgentConnected(request, timeoutMs = 25_000) {
  118 |   const start = Date.now();
  119 |   while (Date.now() - start < timeoutMs) {
  120 |     try {
  121 |       const res  = await request.get(BACKEND_URL + '/api/agent/status');
  122 |       const body = await res.json();
  123 |       if (body && body.connected) return true;
  124 |     } catch { /* tenta de novo */ }
  125 |     await new Promise((r) => setTimeout(r, 1500));
  126 |   }
  127 |   return false;
  128 | }
  129 | 
  130 | /**
  131 |  * Suprime o tutorial overlay via addInitScript.
  132 |  * Deve ser chamada ANTES de page.goto().
  133 |  */
  134 | async function suppressTutorial(page) {
  135 |   await page.addInitScript(() => {
  136 |     try { localStorage.setItem('vc_tutorial_done', '1'); } catch (e) { /* ignorar */ }
  137 |   });
  138 | }
  139 | 
  140 | /**
  141 |  * v5: intercepta vision-core-bundle.js e injeta window._vcRDP / window._vcQSDR
  142 |  * DENTRO de initMainChat, antes do seu fechamento.
  143 |  *
  144 |  * IMPORTANTE — por que dentro de initMainChat:
  145 |  *   renderSfDryRunPanel e vcQueueSfDryRunViaAgent são function declarations de indent=4
  146 |  *   aninhadas dentro de initMainChat (indent=2). Injetar no nível do IIFE (indent=0/2)
  147 |  *   não as enxerga — resulta em ReferenceError silenciado pelo try/catch,
  148 |  *   deixando window._vcRDP = undefined.
  149 |  *
  150 |  *   Âncora: 'function _sfSetArchitectMode()' é a primeira declaração de indent=2
  151 |  *   imediatamente após o fechamento de initMainChat (linha 8338 no bundle atual).
  152 |  *   Buscamos o último '\n  }' antes dessa âncora para achar o '  }' que fecha
  153 |  *   initMainChat, e injetamos o código antes dele — dentro do escopo certo.
  154 |  *
  155 |  *   Após initMainChat() retornar, window._vcRDP continua sendo uma referência
  156 |  *   válida para renderSfDryRunPanel (closures preservam o acesso às funções
  157 |  *   irmãs como vcQueueSfDryRunViaAgent e renderSfDryRunResult).
  158 |  *
  159 |  * Deve ser chamada ANTES de page.goto().
  160 |  */
  161 | async function setupBundleRoute(page) {
  162 |   await page.route('**/vision-core-bundle.js', async (route) => {
  163 |     let response;
  164 |     try {
  165 |       response = await route.fetch();
  166 |     } catch (e) {
  167 |       console.warn('[ROUTE] fetch falhou: ' + e.message + ' — continuando sem injeção');
  168 |       await route.continue();
  169 |       return;
  170 |     }
  171 | 
  172 |     let body = await response.text();
  173 | 
  174 |     // Código a injetar — indent=4 (dentro do corpo de initMainChat)
  175 |     const injection = [
  176 |       '',
  177 |       '    // §117-v5 E2E: expõe funções ao window dentro do escopo de initMainChat',
  178 |       '    try { window._vcRDP  = renderSfDryRunPanel; } catch (_e117) {}',
  179 |       '    try { window._vcQSDR = vcQueueSfDryRunViaAgent; } catch (_e117) {}',
  180 |       '',
  181 |     ].join('\n');
  182 | 
  183 |     // Âncora: primeira declaração no IIFE após initMainChat fechar.
  184 |     // 'function _sfSetArchitectMode()' aparece uma única vez no bundle, logo após '  }'.
  185 |     const ANCHOR = 'function _sfSetArchitectMode()';
  186 |     const anchorIdx = body.indexOf(ANCHOR);
  187 | 
  188 |     if (anchorIdx !== -1) {
  189 |       const beforeAnchor = body.slice(0, anchorIdx);
  190 |       // Último '  }' antes da âncora = fechamento de initMainChat
  191 |       const closeIdx = beforeAnchor.lastIndexOf('\n  }');
  192 |       if (closeIdx !== -1) {
  193 |         body = body.slice(0, closeIdx) + injection + body.slice(closeIdx);
  194 |         console.log('[ROUTE inject] OK — injetado dentro de initMainChat, offset=' + closeIdx + ', tamanho final=' + body.length);
  195 |       } else {
  196 |         console.warn('[ROUTE inject] WARN — "\\n  }" não encontrado antes da âncora');
  197 |       }
  198 |     } else {
  199 |       console.warn('[ROUTE inject] WARN — âncora "_sfSetArchitectMode" não encontrada no bundle');
  200 |       // Fallback de último recurso: IIFE level (não enxerga renderSfDryRunPanel mas ao menos loga)
  201 |       const lastIdx = body.lastIndexOf('})();');
  202 |       if (lastIdx !== -1) {
  203 |         body = body.slice(0, lastIdx) + injection + body.slice(lastIdx);
  204 |         console.warn('[ROUTE inject] FALLBACK IIFE — window._vcRDP provavelmente continuará undefined');
  205 |       }
  206 |     }
  207 | 
  208 |     await route.fulfill({ response, body });
  209 |   });
  210 | }
  211 | 
  212 | /**
  213 |  * Navega para BASE_URL e aguarda networkidle.
  214 |  * Garante também que overlay não ficou ativo por race condition.
  215 |  */
  216 | async function gotoPage(page) {
> 217 |   await page.goto(BASE_URL);
      |              ^ TimeoutError: page.goto: Timeout 30000ms exceeded.
  218 |   await page.waitForLoadState('networkidle', { timeout: 20_000 });
  219 |   await page.evaluate(() => {
  220 |     try { localStorage.setItem('vc_tutorial_done', '1'); } catch (e) { /* ignorar */ }
  221 |     const overlay = document.getElementById('vcTutorialOverlay');
  222 |     if (overlay) overlay.classList.remove('active');
  223 |   });
  224 | }
  225 | 
  226 | /**
  227 |  * Clica via el.click() pelo evaluate — bypassa pointer-events:auto do overlay CSS.
  228 |  */
  229 | async function clickJS(page, selector) {
  230 |   await page.waitForSelector(selector, { state: 'attached', timeout: 12_000 });
  231 |   await page.evaluate((sel) => {
  232 |     const el = document.querySelector(sel);
  233 |     if (el) el.click();
  234 |   }, selector);
  235 | }
  236 | 
  237 | /**
  238 |  * v5: abre o painel dry-run com duas estratégias.
  239 |  *
  240 |  * Estratégia 1: el.click() no #vcOpenDryRunPanelBtn (comportamento original).
  241 |  * Estratégia 2 (fallback): window._vcRDP() via page.evaluate + appendChild no #v298ChatStream.
  242 |  *   Funciona porque setupBundleRoute() já injetou window._vcRDP = renderSfDryRunPanel.
  243 |  *
  244 |  * renderSfDryRunPanel() retorna um Element DOM (não string HTML) — ver bundle linha 7313.
  245 |  * O button click handler original faz: _cs.appendChild(renderSfDryRunPanel()) — replicamos isso.
  246 |  */
  247 | async function openDryRunPanel(page) {
  248 |   // Diagnóstico do estado DOM antes de tentar
  249 |   const diagPre = await page.evaluate(() => {
  250 |     var btn = document.getElementById('vcOpenDryRunPanelBtn');
  251 |     var cs  = document.getElementById('v298ChatStream');
  252 |     return {
  253 |       btnExists:    !!btn,
  254 |       btnVisible:   btn ? (btn.offsetParent !== null) : false,
  255 |       btnText:      btn ? btn.textContent.trim().slice(0, 50) : null,
  256 |       csExists:     !!cs,
  257 |       _vcRDPType:   typeof window._vcRDP,
  258 |       _vcQSDRType:  typeof window._vcQSDR,
  259 |     };
  260 |   });
  261 |   console.log('[DIAG pre-open] ' + JSON.stringify(diagPre));
  262 | 
  263 |   // Estratégia 1: click no botão
  264 |   let clickOk = false;
  265 |   try {
  266 |     await clickJS(page, '#vcOpenDryRunPanelBtn');
  267 |     // Aguarda painel aparecer (5s — mais tolerante que o goto)
  268 |     await page.locator('#vcSfDryRunPath').waitFor({ state: 'attached', timeout: 5_000 });
  269 |     clickOk = true;
  270 |     console.log('[OPEN via click] SUCCESS — painel apareceu via button click');
  271 |   } catch (e) {
  272 |     console.log('[OPEN via click] FAILED: ' + e.message.split('\n')[0]);
  273 |   }
  274 | 
  275 |   if (clickOk) return;
  276 | 
  277 |   // Estratégia 2: window._vcRDP() diretamente
  278 |   console.log('[OPEN via _vcRDP] Tentando window._vcRDP() + appendChild no #v298ChatStream...');
  279 |   const rdpResult = await page.evaluate(() => {
  280 |     try {
  281 |       if (typeof window._vcRDP !== 'function') {
  282 |         return { ok: false, error: '_vcRDP não é função — tipo: ' + typeof window._vcRDP };
  283 |       }
  284 |       var cs = document.getElementById('v298ChatStream');
  285 |       if (!cs) return { ok: false, error: '#v298ChatStream não encontrado' };
  286 |       var panelEl = window._vcRDP();
  287 |       if (!panelEl) return { ok: false, error: '_vcRDP() retornou falsy' };
  288 |       cs.appendChild(panelEl);
  289 |       cs.scrollTop = cs.scrollHeight;
  290 |       // Confirmar que o painel entrou no DOM
  291 |       return {
  292 |         ok:           !!document.getElementById('vcSfDryRunPath'),
  293 |         panelTagName: panelEl.tagName || null,
  294 |       };
  295 |     } catch (e2) {
  296 |       return { ok: false, error: e2.message };
  297 |     }
  298 |   });
  299 |   console.log('[OPEN via _vcRDP] ' + JSON.stringify(rdpResult));
  300 | 
  301 |   if (!rdpResult.ok) {
  302 |     throw new Error('Falha ao abrir painel dry-run: ' + (rdpResult.error || 'desconhecido'));
  303 |   }
  304 | }
  305 | 
  306 | /**
  307 |  * Espera o resultado do dry-run em #vcSfDryRunStatus.
  308 |  * Trata o loop de retry do timeout de 30s do vcQueueSfDryRunViaAgent.
  309 |  */
  310 | async function waitForDryRunResult(page, overallTimeoutMs = AI_TIMEOUT_MS) {
  311 |   const deadline = Date.now() + overallTimeoutMs;
  312 |   while (Date.now() < deadline) {
  313 |     const retry = page.locator('#vcRetryAgentPoll113');
  314 |     if (await retry.count() > 0 && await retry.isVisible().catch(() => false)) {
  315 |       await retry.click();
  316 |     }
  317 |     const statusText = await page.locator('#vcSfDryRunStatus').innerText().catch(() => '');
```