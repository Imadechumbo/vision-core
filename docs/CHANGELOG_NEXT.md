# CHANGELOG — Vision Core Next

Histórico resumido por versão (`?v=next-clean-N`). Um bloco curto por versão — nunca narrativa longa, nunca log de terminal. Detalhe completo de qualquer entrada vive em `docs/session_logs/`, referenciado pelo nome do arquivo quando existir.

Formato: mais recente no topo.

---

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
| 2026-07-11 | Criação — reestruturação de documentação (`CURRENT_HANDOFF.md` compacto + este changelog + `docs/session_logs/`). Entradas anteriores a `next-clean-49` não reconstruídas retroativamente; consultar `docs/session_logs/2026-07-11-archive-pre-restructure-handoff.md` para o histórico completo até essa data. |
