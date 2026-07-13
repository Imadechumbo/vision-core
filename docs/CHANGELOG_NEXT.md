# CHANGELOG — Vision Core Next

Histórico resumido por versão (`?v=next-clean-N`). Um bloco curto por versão — nunca narrativa longa, nunca log de terminal. Detalhe completo de qualquer entrada vive em `docs/session_logs/`, referenciado pelo nome do arquivo quando existir.

Formato: mais recente no topo.

## next-clean-70 (2026-07-12)

- Bug real corrigido: painel de Métricas colapsava/sumia periodicamente (~10-12s), reportado pelo usuário. Causa raiz encontrada por leitura de código: `loadMetrics()` chamava `setMetricsLoading(true)` (esconde `#vcMetricsBody`, mostra skeleton de 3 linhas) em TODA chamada, inclusive nos ticks automáticos de `startMetricsPolling()` (`METRICS_POLL_MS=12000`), mesmo já havendo dados válidos renderizados
- Reproduzido e confirmado com evidência: mock instantâneo mascarava o bug (janela de "loading" durava poucos ms); com latência de rede simulada (~700ms), o código antigo mostrou 13 amostras com `#vcMetricsBody` escondido em ~26s de varredura (via `git stash` comparando antes/depois) — timestamps batendo exatamente com os ciclos de ~12s do polling
- Fix: skeleton só aparece na primeira carga (`metricsLastResults === null`); refresh em segundo plano com dado prévio já na tela atualiza números/gráficos em silêncio, sem esconder nada. Zero mudança em lógica de dados/cálculo
- Dashboard (`loadDashboardPanel()`) investigado como possível causa compartilhada — descartado: só roda no clique manual de "Atualizar" ou na abertura da aba, nunca em `setInterval` automático, não produz o sintoma "a cada ~10s" relatado
- 1 teste novo com latência simulada, cobrindo 2 ciclos completos de polling — confirmado que falha de forma reproduzível contra o código antigo (via `git stash`) e passa com o fix
- 100/100 PASS na suíte permanente do Next, rodada 2x seguidas, sem regressão

## next-clean-69 (2026-07-12)

- Remoção completa do hero do chat (`#vcChatIntro`/`.vc-chat-intro`, "VISION AI COMMAND" + "Como vamos mover o Vision Core hoje?" + parágrafo descritivo) por decisão do usuário — sem placeholder no lugar. Trajetória do elemento: vazou pra toda página em `next-clean-67` (efeito colateral do Atomic Core sempre visível), foi escondido condicionalmente fora de `chat`/`factory` em `next-clean-68`, removido de vez agora
- HTML (`<div class="vc-chat-intro" id="vcChatIntro">`), CSS (`.vc-chat-intro`, `.vc-chat-intro h1`, `.vc-chat-intro p:not(.vc-kicker)`, override de media query) e JS (`chatIntroEl`, toggle em `selectFeature()`) removidos juntos — `.vc-kicker` mantido (classe compartilhada, ainda usada por Software Factory/Arquiteto SF/Pacote Final/Smile Guide)
- Atomic Core sobe pro topo real da área de conteúdo (antes ficava abaixo do hero); composer permanece ancorado perto do rodapé da viewport — comportamento inalterado, pré-existente desde `next-clean-65` (`min-height:calc(100vh-116px)` em `.vc-chat-stage`, fora de escopo deste pedido)
- Observação reportada: Software Factory Auto-Pilot também exibia o hero antes (contava como "chat") — como o elemento foi removido por completo (não só escondido), deixou de aparecer ali também. Nenhum teste dependia disso, nenhum tratamento especial foi necessário
- 1 teste obsoleto reescrito (verificava visibilidade condicional do hero, que deixou de existir) — agora confirma ausência total do elemento + Atomic Core sem vão reservado no topo
- 99/99 PASS na suíte permanente do Next, rodada 2x seguidas, sem regressão

## next-clean-68 (2026-07-12)

- Correção de efeito colateral do `next-clean-67`: o hero do chat (`#vcChatIntro`, "Como vamos mover o Vision Core hoje?") vazava pra todas as páginas — nunca tinha sido condicionado por `selectFeature()`, já que `.vc-chat-stage` nunca é escondido (necessário pro Atomic Core ficar sempre visível). Isso competia pelo mesmo espaço onde o widget ancora e empurrava o conteúdo real de cada aba (Security Lab, Missions, Métricas) pra baixo da dobra, dando a impressão de "página errada" mesmo com a sidebar mostrando a aba certa
- Confirmado em produção antes do fix: `introVisible:true` em Security Lab/Missions/Métricas simultaneamente com a sidebar ativa nessas abas
- Fix: `#vcChatIntro` escondido fora de `chat`/`factory` (Software Factory Auto-Pilot conta como "chat", mesmo critério já usado no resto do arquivo) — o Atomic Core em si não mudou, continua sempre visível
- 1 teste novo (`vision-core-next-atomic-core.spec.mjs`: hero não vaza pra 8 páginas diferentes, continua em chat/factory)
- 99/99 PASS na suíte permanente do Next, rodada 2x seguidas, sem regressão

## next-clean-67 (2026-07-12)

- Mudança de decisão do usuário: Atomic Core deixa de ser "escopado ao chat" (`next-clean-61`/`64`) e passa a ser elemento persistente global — visível em qualquer página/aba (Missions, Timeline, Métricas, Dashboard, Settings, Vault, Tools, Security Lab, GitHub). `outsideChat` removido de `updateAtomicCollapseState()`. Registrado como `DECISION-020` em `docs/DECISIONS.md` (substitui a regra anterior, não é reversão de bug)
- As 2 únicas exceções que continuam escondendo o widget, inalteradas: toggle "mostrar Atomic Core" em Settings (`window.VCAtomicCore`) e a colisão real do Modo Avançado do Software Factory (`next-clean-61`)
- Investigação do bug de ancoragem reportado no pedido (Print 4, "vão vazio" no Chat): **não reproduzido** — medido diretamente contra produção antes de codar, `next-clean-66` já entrega gap=0px. Nenhuma mudança de CSS de ancoragem foi necessária além do que já estava em produção; a ancoragem correta simplesmente se estende às páginas novas porque `.vc-chat-stage`/`#vcChatScroll` nunca são desmontados por `selectFeature()` (só o `#vcFeaturePanel` interno troca)
- 1 teste reescrito (`hides outside the chat area...` → `stays visible on every page/tab...`) + 3 testes novos (`vision-core-next-atomic-core.spec.mjs`: toggle global funciona ao navegar entre páginas; ancoragem/no-clipping em Missions+Métricas+Dashboard)
- 98/98 PASS na suíte permanente do Next, rodada 2x seguidas, sem regressão

## next-clean-66 (2026-07-12)

- Atomic Core realmente ancorado no canto superior direito da área de conteúdo: `.vc-chat-stage` era `min(940px,100%)` centralizado (`margin:0 auto`) dentro de `.vc-main` — o widget já tinha `align-self:flex-end` (zero gap contra `#vcChatScroll`), mas essa coluna de 940px não chegava na borda real de `.vc-main`, deixando um vão visível. Fix: `.vc-chat-stage` virou `width:100%` — seguro porque hero (`.vc-chat-intro`, 680px), bolhas de mensagem (`.vc-message`, 760px) e o card de status (`.vc-feature-panel`, 760px) já têm seu próprio `max-width` independente do stage
- Métricas e Software Factory Modo Avançado ganham o mesmo tratamento `--wide` já usado pelo Dashboard (`next-clean-64`): `.vc-metrics-panel` saiu do cap fixo de 720px (cards "Custo por Agente"/"Ranking de Atividade" ficavam espremidos), `.vc-sf-stage` ganha `--wide` só no Modo Avançado (Auto-Pilot permanece em 940px, sem mudança)
- Legibilidade dos 9 nós de agente: achado real de que a animação orbital contínua (drift de ângulo/raio, `next-clean-6x` anteriores) fazia legendas de nós adjacentes se sobreporem em boa parte do ciclo (~11% dos instantes amostrados, pior caso 40x24px) — não visível num screenshot isolado, só varrendo tempo virtual (`page.clock`) por um período completo. Fix: `max-width` de `span`/`small` de 96px pra 76px, `.vc-agent` de 110px pra 92px, `MAX_ANGLE_DRIFT` de 12° pra 3° (raio inalterado, sem risco de reintroduzir clipping)
- "Custo por Agente" sem gráfico e "Ranking de Atividade" cortado (reportados como possível bug): confirmado como dois falsos-positivos — o primeiro é ausência real de dado (`cost_usd` sempre null hoje, spec já documenta como "sem dados de custo" honesto); o segundo é conteúdo abaixo da dobra, resolvido pela rolagem nativa real da página (`next-clean-65`), não um bug de corte/overflow
- 4 testes novos (`vision-core-next-atomic-core.spec.mjs`: ancoragem real + legibilidade em varredura de tempo virtual; `vision-core-next-metrics.spec.mjs`: Métricas largura total; `vision-core-next-sf.spec.mjs`: Modo Avançado largura total, Auto-Pilot inalterado)
- 96/96 PASS na suíte permanente do Next, rodada 2x seguidas, sem regressão

## next-clean-65 (2026-07-12)

- Remoção da rolagem interna duplicada: bug real reportado em produção contra `next-clean-64` — `#vcChatScroll` tinha `overflow-y:auto` próprio, gerando uma segunda barra de rolagem competindo com a rolagem nativa da página. Confirmado por medição direta em produção antes do fix: `#vcChatScroll` com `hasOwnScroll:true` e `html` também com `hasOwnScroll:true` ao mesmo tempo (as duas rolagens ativas simultaneamente)
- `.vc-chat-scroll` removeu `overflow-y`/`overflow-x`; `.vc-chat-stage` trocou `height` fixa por `min-height` — a página inteira agora é a única superfície de rolagem (`html`/`body`), consistente com `ARCHITECTURAL PRINCIPLE-004`
- Regra dura #12 (nada nasce escondido atrás do `#vcComposer` sticky) preservada sem depender de scroll isolado: `ResizeObserver` no composer mantém `padding-bottom` de `.vc-chat-scroll` sincronizado com a altura real do composer + margem, com fallback estático (`padding-bottom:160px`) em CSS para navegadores sem `ResizeObserver`
- 2 testes existentes reescritos (`vision-core-next-atomic-core.spec.mjs`: scroll da página real em vez de `#vcChatScroll.scrollTop`; renomeado o teste de clipping que não depende mais de `overflow-x:hidden`) + 1 teste novo de regressão da regra dura #12 usando o Dashboard como conteúdo alto real (`vision-core-next-dashboard.spec.mjs`)
- 92/92 PASS na suíte permanente do Next, sem regressão

## next-clean-64 (2026-07-12)

- Novo princípio arquitetural permanente: `ARCHITECTURAL PRINCIPLE-004 — No Fixed Viewport Layout` (`docs/DECISIONS.md`) — nenhum dashboard/painel/monitor pode usar `position:fixed`/`sticky` preso à viewport
- Atomic Core (primeira aplicação do princípio): saiu de `position:fixed` (reservava `padding-right` global em `.vc-main`) para viver dentro de `#vcChatScroll` em fluxo normal — rola junto com o chat e sai de vista; só aparece na aba `chat` (Software Factory Auto-Pilot conta como "chat", outras abas não)
- Nova página `Dashboard` (`data-feature="dashboard"`, largura total): Timeline (heartbeat de Conectividade), Custo por Agente e Ranking de Atividade — reaproveita `buildAgentCharts()`/`metricCharts.timeline()` já existentes, zero lógica de dado nova
- Achado real da RCA adversarial: `margin-right` negativo cortava 2 nós de agente (`openclaw`, `scanner`) por `overflow-x:hidden` de `#vcChatScroll` — só detectado por `getBoundingClientRect()` contra o container, não pela screenshot isolada; corrigido antes do commit, virou regra dura #13 da spec
- 5 testes novos em `vision-core-next-atomic-core.spec.mjs` + 5 em `vision-core-next-dashboard.spec.mjs` (90/90 PASS na suíte permanente do Next)

## next-clean-63 (2026-07-12)

- Settings do Atomic Core: toggle "Mostrar Atomic Core" (on/off do widget inteiro, independente do auto-collapse) + slider de intensidade visual (40%-100%), `window.VCAtomicCore`/`--atomic-intensity`, mesmo padrão getX/setX/onChange + localStorage do resto do arquivo
- "glow on/off" do ROADMAP explicitamente NÃO implementado — contradizia decisão já fechada em `VISION_CORE_NEXT_FRONTEND_SPEC.md` checklist item 6 ("nunca existiram como controles")
- Achado corrigido na autorrevisão (RCA): teste "off vence always-visible" não navegava pro Modo Avançado, não provava a precedência no único lugar em que ela importa — corrigido antes do commit
- 3 testes novos em `vision-core-next-atomic-core.spec.mjs` (82/82 PASS na suíte permanente do Next)

## next-clean-62 (2026-07-11)

- Auth email/senha no Next: Settings -> Conta com registro/login/logout, escopo confirmado (zero endpoint novo — `apiRequest()` ja anexa `Authorization: Bearer` a partir de `localStorage['vision_token']`)
- OAuth Google/GitHub NAO incluido — o callback do backend hoje redireciona pro legado, nao pro Next; fica registrado como etapa futura condicionada a mudanca de backend
- Achado corrigido no caminho: `.vc-settings-form`/`.vc-settings-field-actions` tinham `display:flex` puro sem `:not([hidden])` — bug real da regra dura ja documentada (CSS de autor vencia o atributo `hidden`), so nao tinha aparecido ainda porque nenhum elemento com essas classes usava `hidden` condicional antes do painel de Conta
- 7 testes novos em `vision-core-next-account.spec.mjs` (79/79 PASS na suite permanente do Next)

## next-clean-61 (2026-07-11)

- Atomic Core recolhe automaticamente só no Modo Avancado do Software Factory (colisao real confirmada por screenshot contra a zona reservada do widget) — nunca em Auto-Pilot ou outra aba
- Override manual em Settings -> Atomic Core ("Manter sempre visivel"), mesmo padrao getMode/setMode/onChange + localStorage do `window.VCMotion` (`window.VCAtomicCollapse`, chave `vc_atomic_collapse_pref`)
- Transicao via opacity/scale (nunca display:none), instantanea sob reduced-motion (`window.VCMotion.isReduced()`)
- 2 testes novos em `vision-core-next-atomic-core.spec.mjs` (72/72 PASS na suite permanente do Next)

## next-clean-60 (2026-07-11)

- Tutorial Smile implementado no Vision Core Next como guia manual, sem autoabrir e sem importar overlay legado
- Novo item `Smile` no menu lateral colapsavel; modal acessivel com X/ESC/Voltar/Proximo e assets oficiais do mascote
- Composer continua sendo a unica entrada de missao; nenhum localStorage novo e nenhum endpoint novo
- Teste permanente em `vision-core-next-app-shell.spec.mjs`

---

## Governança Next (2026-07-11)

- DECISION-019 registrada: Vision Core Next passa à fase de produto oficial futuro, guiado por comparação implementação × specs e pela prioridade arquitetura → UX → Software Factory → Atomic Core → performance → observabilidade → segurança → documentação → refinamento visual
- `ARCHITECTURAL PRINCIPLE-003 — Evidence Before Change` registrado como princípio permanente; `System Correcting Systems` preservado no ROADMAP apenas como ideia futura sem número reservado
- Reconciliação Fase 3.3d: `#vcSoftwareFactoryPage`/`#projectBuilder` não existem nos arquivos oficiais do Next; referências restantes são do frontend legado e não bloqueiam a frente Next
- Sem alteração de código, sem cache-bust, sem push/deploy automático

## next-clean-59 (2026-07-11)

- Corrigido bug de produção: gráficos de Agentes não apareciam — causa raiz dupla (deploy nunca feito de `57`/`58` + `#vcComposer` sticky sobrepondo `#vcFeaturePanel`)
- Nova área de rolagem isolada `.vc-chat-scroll` (stream + painel) separada do composer
- `showFeatureViz()` faz `scrollIntoView` do gráfico renderizado
- Teste de geometria novo (extensão do teste `(g)` em `vision-core-next-metrics.spec.mjs`)
- 69/69 PASS · deploy confirmado e verificado ao vivo contra produção real

## next-clean-58 (2026-07-11)

- Software Factory: `#vcSfFinalViz` — donut DONE/FAIL/BLOCKED, duração por etapa, gauge de progresso
- Security Lab: `#vcSafeStatusViz` — donut ok/fallback-local, gauge de conformidade, timeline de checagens
- Toggle "Ver JSON bruto" reutilizável em `#vcFeatureViz` (Agentes/Tools/Security-history safe-read)
- 69/69 PASS · commitado e pushado, deploy adiado (feito no `next-clean-59`)

## next-clean-57 (2026-07-11)

- Módulo `metricCharts` vanilla (SVG/CSS): bar/donut/gauge/sparkline/timeline/empty/legend
- Aplicado em Métricas (agentes/DORA/runtime/memory/conectividade), sem lib externa
- Safe-read de Agentes/Tools/Security passa a renderizar gráfico em vez de resumo textual cru
- 69/69 PASS · commitado, não deployado nesta versão (achado só na sessão seguinte)

## next-clean-56 (2026-07-08)

- Fix: Atomic Core cortado (`contain:layout paint` recortava agentes orbitais)
- `--atomic-core-size` separado de `--atomic-safe-area`
- Spec permanente novo cobrindo 5 breakpoints (1440x900 → 390x844)
- Deploy confirmado

## next-clean-55 (2026-07-08)

- Software Factory Modo Avançado: Arquiteto local determinístico, catálogo de stacks, grafo editável, matriz de agentes, timeline, preview
- Sem endpoint novo — sugestão 100% local, `sf_options.stack`/`architecture_preview` nos POSTs existentes
- Deploy confirmado

## next-clean-54 (2026-07-08)

- Mission Input removido definitivamente — composer principal é a única entrada de missão
- `#vcSfInput` removido do Software Factory
- Deploy confirmado

## next-clean-53 (2026-07-10)

- Mission Input ↔ Software Factory: sincronização incondicional da missão (era condicional a campo vazio)
- Métricas: blocos Runtime + Memory Layer conectados (trabalho de outra sessão, validado e incorporado)
- 56/56 PASS

## next-clean-52 (2026-07-09, sessão anterior)

- `/api/metrics/summary` + `/api/metrics/memory` conectados no painel de Métricas

## next-clean-51 (2026-07-10)

- Software Factory: `project-files` (lista de arquivos) + `generate-zip` (download binário real) conectados
- Primeiro fluxo do Next tratando resposta HTTP não-JSON (`response.blob()`)
- 43/43 PASS

## next-clean-50 (2026-07-09)

- App Shell: Mission Input flutuante + Security Lab (retomada de WIP não commitado)
- Fix de overlap mobile (Atomic Core sobre Mission Input em ≤820px)

## next-clean-49 (2026-07-09)

- Métricas Next: primeira versão do painel dedicado (`#vcMetricsPanel`), substituindo dump de JSON cru no chat
- `/api/metrics/agents`, `/api/dora-metrics`, `/api/agent/status` conectados
- 32/32 PASS

---

## Histórico

| Data | Mudança |
|---|---|
| 2026-07-11 | Criação — reestruturação de documentação (`CURRENT_STATE.md` compacto + este changelog + `docs/session_logs/`). Entradas anteriores a `next-clean-49` não reconstruídas retroativamente; consultar `docs/session_logs/2026-07-11-archive-pre-restructure-handoff.md` para o histórico completo até essa data. |
