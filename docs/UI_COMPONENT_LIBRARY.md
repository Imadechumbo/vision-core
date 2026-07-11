# UI COMPONENT LIBRARY — Vision Core Next

**Parte da série de arquitetura — leia `MASTER_SPEC.md` e `VISION_CORE_NEXT_FRONTEND_SPEC.md` antes deste.**

> Versão: 1.0.0 · Criado: 2026-07-09
> Fonte: leitura direta de `frontend/vision-core-next.html` + `assets/vision-core-next-clean.{css,js}`. Todo componente aqui listado é `EXISTENTE` salvo aviso contrário — nenhum é aspiracional.

---

## Resumo

Catálogo dos componentes visuais reais do Vision Core Next. Não é uma biblioteca de componentes reutilizável formal (não há framework de componentes, sem Web Components/React/Vue) — é HTML+CSS+JS vanilla com convenções consistentes repetidas manualmente em cada bloco. Este documento nomeia essas convenções para que agentes futuros as sigam em vez de inventar um padrão novo por feature.

## Objetivo

Que qualquer painel novo criado no Next reuse os mesmos padrões (`hidden`-toggle, confirmação dupla, status dot/badge, skeleton estático) em vez de reinventar.

## Escopo / Fora do escopo

Escopo: componentes reais em `vision-core-next-clean.{css,js}`. Fora do escopo: qualquer componente do frontend legado (`vision-core-bundle.js`) — só citado como referência visual quando relevante, nunca como base de código.

---

## Convenções transversais (valem para todo componente desta lista)

| Convenção | Regra |
|---|---|
| Painel condicional | `<div class="vc-X" id="vcX" hidden>` no HTML + `.vc-X:not([hidden]) { display: ... }` no CSS — nunca `display` puro na classe. |
| Renderização de conteúdo dinâmico | Sempre `textContent`/`createElement`/`createTextNode` — nunca `innerHTML`. |
| Ação irreversível | Sempre 2 cliques (preencher → "Confirmar X"/"Cancelar" → só "Confirmar" dispara fetch), botão vira "Aplicando..." desabilitado durante a requisição. |
| Cores de estado | `var(--green)` = ok, `#facc15` (âmbar) = atenção/pendente/local-fallback, `#f87171` (vermelho) = erro. |
| Loading | Skeleton estático (barras cinza sem `@keyframes`) — nunca spinner animado nem shimmer, para não entrar em conflito com a política de motion. |

---

## Sidebar

**Objetivo:** navegação principal, colapsável, persistente entre sessões.
**Estrutura:** `<aside class="vc-sidebar">` com `<nav>` de links `[data-feature="X"]`, cada um com ícone (`<i>`, 1 letra) + `<span>` label.
**Estados:** `data-sidebar-state="expanded"|"collapsed"` em `.vc-app-shell` — expandida mostra ícone+label (252px), colapsada mostra só ícone (78px).
**Eventos:** clique em `[data-sidebar-toggle]` alterna estado; clique em `[data-feature]` chama `selectFeature(key)`.
**Persistência:** `localStorage['vc_next_sidebar_state']`.
**Acessibilidade:** `aria-expanded` no toggle, `aria-label` dinâmico ("Colapsar menu"/"Expandir menu").
**Checklist:** [x] persiste entre reloads · [x] não quebra em mobile (vira barra horizontal com scroll, `max-width:820px`).

## Composer

**Objetivo:** entrada principal de mensagem e única entrada de missão, sempre visível.
**Estrutura:** `<form class="vc-composer" id="vcComposer">` — `<textarea id="vcPrompt">` + `<div class="vc-composer-actions">` com chips (`Missão`/`Factory`/`GitHub`/`Vault`/`IA`/`Anexar`/`Print`) + botão `.vc-send[type=submit]` ("Executar").
**Estados:** textarea auto-resize (`resizePrompt()`, max 180px). Botão de envio nunca desabilita por padrão (não há validação de campo vazio bloqueando o submit hoje).
**Eventos:** `submit` → `POST /api/chat`; chips `[data-feature]` prefixam o texto e navegam pra aba; o chip `Factory` apenas seleciona o contexto, e a geração usa este mesmo texto quando o usuário confirma no painel Factory; `[data-quick="attach|image"]` abrem input de arquivo oculto.
**Posição:** `position: sticky; bottom: 18px; z-index: 20`.
**Checklist:** [x] fixo no rodapé · [x] Enter envia, Shift+Enter quebra linha (comportamento padrão de `<textarea>` em formulário, sem handler customizado que intercepte Enter).

## Chat

**Objetivo:** área de mensagens central.
**Estrutura:** `<div class="vc-chat-stream" id="vcChatStream">` — cada mensagem é `<article class="vc-message vc-message-{kind}">` (`kind` ∈ `system`/`user`/`assistant`/`pending`/`error`).
**Estados/alinhamento:** `.vc-message-user { align-self: flex-end }` (direita) — demais tipos alinhados à esquerda (default do flex).
**Eventos:** `appendMessage(kind, title, text)` retorna o elemento (permite removê-lo depois, usado pro indicador "Pensando...").
**Acessibilidade:** `aria-live="polite"` no stream.
**Checklist:** [x] usuário à direita, sistema/assistente à esquerda · [x] rolagem automática (`scrollIntoView`) · [x] estado inicial discreto (1 mensagem de sistema, sem tom promocional).

## Atomic Core

Documentado em `ATOMIC_CORE_SPEC.md` — não duplicado aqui.

## Cards (DORA / linha de agente)

**Objetivo:** exibir uma unidade de dado com label+valor.
**Estrutura real:** `.vc-metrics-dora-card` (label pequeno + valor grande) e `.vc-metrics-agent-row` (dot+badge+nome+nota+chips+barra). **Não existe um componente genérico `<Card>` reutilizável** — cada painel define seu próprio card inline, seguindo o mesmo padrão visual (borda `rgba(255,255,255,.07)`, `var(--radius)`).
**Checklist:** [x] padrão visual consistente entre painéis, mesmo sem componente compartilhado formal.

## Tables

**Não existe nenhum componente de tabela (`<table>`) no Next.** Toda listagem usa `<div>`s em grid/flex (linhas de agente, snapshots do Vault, histórico de missão). Se uma feature futura precisar de dado tabular denso, este é um gap real — ver `ROADMAP.md`.

## Métricas

Documentado em detalhe no próprio painel — ver `VISION_CORE_ARCHITECTURE.md`/`API_CONTRACT.md` para os endpoints. Componentes: `.vc-metrics-agent-row`, `.vc-metrics-bar`/`.vc-metrics-bar-fill` (só renderiza com `cost_usd` numérico), `.vc-metric-chart` (SVG/CSS nativo para barra, donut, gauge, sparkline, timeline e empty state), `.vc-metrics-dora-grid`, `.vc-metrics-conn`, `.vc-metrics-source` (badge DADOS REAIS/FALLBACK LOCAL), toggle de JSON bruto. Regra: métrica estruturada tem gráfico; texto complementa; JSON bruto fica só em diagnóstico.

O sistema de gráficos (`metricCharts.{bar,donut,gauge,sparkline,timeline,empty,legend}`, todo `createElement`/SVG nativo, sem lib externa) não é exclusivo da aba Métricas — é reutilizado em qualquer painel com dado estruturado: `#vcFeatureViz` (Agentes/Tools/Security-history safe-read, dentro do painel contextual do chat), `#vcSfFinalViz` (Software Factory — donut DONE/FAIL/BLOCKED + barras de duração por etapa + gauge de progresso, atualiza a cada etapa, não só no fim) e `#vcSafeStatusViz` (Security Lab — donut ok/fallback-local + gauge de conformidade visual + timeline das checagens). O toggle "Ver JSON bruto" (`.vc-metrics-raw-toggle` + `.vc-metrics-raw`, checkbox + `<pre>` inicialmente `hidden`) também é reutilizado fora da aba Métricas — `showFeatureViz(title, renderFn, rawData)` o injeta automaticamente quando um 3º argumento é passado.

## Status (dot + badge)

**Objetivo:** comunicar estado semântico de forma compacta.
**Estrutura:** `<span class="vc-X-status-dot vc-X-status-{tier}">` (círculo 8px) + `<span class="vc-X-status-badge vc-X-status-{tier}">` (pílula com texto). `tier` ∈ `ok`(verde)/`warn`(âmbar)/`error`(vermelho).
**Regra de mapeamento (Métricas):** `ok`→verde; `binary_not_found`/`PENDING_EVIDENCE`→âmbar (semântica "aguardando prova", não "falhou" — herdada do legado); qualquer outro valor não-`ok`→vermelho.
**Reuso de classe, cuidado:** a mesma classe `vc-metrics-status-warn` é usada tanto para status de agente quanto para "desconectado" no painel de conectividade — um seletor de teste/CSS que não escopar corretamente conta os dois juntos (bug de teste real, já corrigido, ver `docs/CURRENT_HANDOFF.md`).

## Dialogs / Modais

**Não existe componente de modal/overlay no Next.** Toda confirmação usa o padrão inline "2 cliques" (ver Convenções transversais), nunca um `<dialog>`/overlay flutuante centralizado. Decisão implícita consistente em toda a frente — nenhum painel abre por cima de outro conteúdo.

## Toast / Notificação

**Não existe sistema de toast.** Sucesso/erro de uma ação aparece inline no próprio formulário (ex.: `#vcMetricsErrorText`, status de PR) ou como mensagem no chat (`appendMessage('error', ...)`). Sem auto-dismiss temporizado em lugar nenhum.

## Buttons

**Objetivo:** ação clicável, padrão pílula.
**Estrutura:** `border-radius: 999px`, fundo `rgba(255,255,255,.06)` (neutro) ou colorido por contexto (verde=confirmar ação segura, vermelho=confirmar ação de risco, roxo/violeta=ação primária como "Executar"/"Criar PR").
**Estados:** `:disabled` (opacidade .45, `cursor:not-allowed`), `:hover` (fundo mais forte).
**Checklist:** [x] nunca dispara ação irreversível sem o padrão de 2 cliques.

## Inputs

**Objetivo:** captura de texto/número/arquivo.
**Estrutura:** `<input>`/`<textarea>` com borda `rgba(216,180,254,.14-.16)`, fundo escuro (`rgba(18,14,28,.58-.78)`), `<label>` com texto pequeno maiúsculo acima. `<input type="checkbox">` usado sem estilização custom (checkbox nativo do navegador).
**Checklist:** [x] label sempre associado (`for`/aninhamento) · [x] placeholder nunca é o único indicador do campo.

## Badges

Ver seção "Status" acima (dot+badge) e "Chips" abaixo — não há uma badge genérica separada desses dois padrões.

## Chips

**Objetivo:** tags pequenas, não-clicáveis, informativas.
**Estrutura:** `.vc-metrics-chip`/`.vc-secret-guard-grid strong` — pílula pequena, cor de acento (violeta) ou semântica.
**Uso real:** providers de LLM ativos (Métricas), status estático (Secret Guard card).

## Dropdown

**Não existe componente de dropdown/select estilizado.** Nenhum `<select>` customizado encontrado nos arquivos Next — navegação é sempre por link direto (`data-feature`), nunca menu suspenso.

## Logs

**Objetivo:** trilha textual de execução, só quando há atividade.
**Estrutura:** `<div class="vc-sf-log" id="vcSfLog" hidden>` — populado linha a linha durante a geração da Software Factory (`DONE módulo=X`/`FAIL módulo=X`).
**Regra dura:** nasce `hidden`, nunca aparece vazio, só quando há evento real.

## Timeline (Mission History)

**Objetivo:** histórico de missões navegável.
**Estrutura:** `.vc-mission-history` — lista (`.vc-mh-item`, clicável) → detalhe (`.vc-mh-detail`, com `<pre>` pra corpo bruto + evidência, botão "Voltar").
**Estados:** lista vazia = texto honesto "Nenhuma missão registrada ainda." (nunca lista vazia sem explicação).

## Secret Guard (card)

**Objetivo:** status de governança do `vc-secret-guard`, visual apenas.
**Estrutura:** `.vc-secret-guard-card` — grid de 3 linhas (`vc-secret-guard`/`Rust core`/`Scanner integration`) com status estático (`SPEC/PLANEJADO`, `PLANEJADO`, `FUTURA`).
**Estado:** nunca executa nada — puramente informativo, dentro da aba Security Lab.

## Software Factory (painéis)

`.vc-sf-stage`, `.vc-sf-composer` (botão de execução, sem textarea próprio), `.vc-sf-progress`, `.vc-sf-log`, `.vc-sf-final` — ver `SOFTWARE_FACTORY_SPEC.md` para o fluxo completo. O Modo Avançado acrescenta `#vcSfAdvancedPanel` com blocos visuais vanilla: interpretação da missão, `StackCatalog`, `StackGraph`, matriz de agentes, timeline operacional e preview. Todos renderizam via `createElement`/`textContent`, sem chat paralelo e sem textarea de missão.

## Painéis (feature panel genérico)

**Objetivo:** contêiner contextual por aba, dentro do chat stage.
**Estrutura:** `#vcFeaturePanel` — cabeçalho (badge de status + título) + corpo descritivo + ações + N sub-painéis condicionais (um por feature, todos `hidden` por padrão, só um visível por vez via `selectFeature()`).

## Loading

**Objetivo:** indicar que uma requisição está em andamento.
**Padrões reais (dois, não um único componente):** (1) mensagem `appendMessage('pending', ...)` no chat ("Pensando...", "Executando... (Ns decorridos)") — usado em fluxos síncronos/polling; (2) skeleton estático (ver abaixo) — usado em painéis de dado (Métricas).

## Skeleton

**Objetivo:** placeholder visual durante o primeiro carregamento de um painel de dado.
**Estrutura:** `.vc-metrics-skel` com 2-3 `.vc-metrics-skel-row` (barras cinza, altura fixa, **sem `@keyframes`** — decisão deliberada de não ter que arbitrar se um shimmer conta como "animação de entrada" sob a política de motion).

---

## Checklist de aceite deste documento

- [x] Todo componente citado existe de fato no código (verificado por leitura direta)
- [x] Componentes inexistentes (Tables/Dialogs/Toast/Dropdown) marcados explicitamente como ausentes, não inventados
- [x] Convenções transversais nomeadas uma vez, não repetidas por componente

## Pendências

- Tabela de dado denso — gap real se uma feature futura precisar dela.
- Sistema de toast/notificação temporizada — gap real, hoje tudo é inline/persistente até a próxima ação.

## Próximos passos

Ver `ROADMAP.md`, Fase 1 (Frontend) — qualquer componente novo deve primeiro checar esta lista antes de inventar um padrão novo.

## Histórico

| Data | Mudança |
|---|---|
| 2026-07-09 | Criação — primeiro catálogo formal dos componentes reais do Next. |

## Controle de versão

**1.0.0** — 2026-07-09
