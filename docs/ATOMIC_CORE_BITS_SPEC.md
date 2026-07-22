# ATOMIC CORE — Spec da versão "Bits" (leve, spec-only)

**Parte da série de arquitetura — leia `MASTER_SPEC.md`, `ARCHITECTURE.md` e `docs/ATOMIC_CORE_SPEC.md` (spec da versão atual) antes deste.**

> Versão: 1.0.0 · Criado: 2026-07-21
> Fase 1 (esta spec) fechada. Fase 2 (protótipo isolado) ainda não autorizada — nenhuma implementação da versão nova foi feita nesta sessão.
> **Atomic Core é área protegida (`docs/ATOMIC_CORE_SPEC.md` seção "Área protegida") — qualquer implementação real desta spec exige aprovação explícita do usuário, mesmo depois da spec aprovada.**

---

## Resumo

O Atomic Core atual foi reportado pelo usuário como "pesado e piscando". Diagnóstico real (Parte 1, com medição de performance real, não suposição) confirmou custo de frame mensurável e isolou a causa dominante hoje: `backdrop-filter: blur()` em elementos que ficam por cima/perto do HUD animado (`.vc-composer`, `.vc-sidebar` esquerda), não o `filter:drop-shadow()` por-agente que uma sessão anterior (2026-07-18) já havia mitigado parcialmente. Este documento especifica uma versão visual alternativa, estilizada em "bits" (pixel/blocado), preservando exatamente o mesmo movimento/escala/interações da versão atual — **spec apenas, zero implementação nesta sessão**.

## Objetivo

Reduzir o custo real de render do Atomic Core sem alterar sua identidade de marca (coreografia, proporção, estados) — abrindo um trilho de trabalho independente do timeline do Colibri/MultiProviders, que pode avançar em paralelo.

## Escopo

Diagnóstico real da versão atual (`frontend/assets/vision-core-next-clean.js`/`.css`, seletor `[data-atomic-core]`); requisitos de movimento/escala a preservar; proposta técnica (Canvas vs. DOM/sprite) com decisão justificada; critérios de aceite mensuráveis; plano de fases.

## Fora do escopo (nesta sessão)

Implementação real da versão bits (Fase 2 em diante); qualquer mudança na versão atual do Atomic Core além do necessário para medir (as mudanças aplicadas durante a medição foram só overrides de CSS injetados em runtime pelo Playwright, nunca persistidos no repo — ver Parte 1); Checkout PRO/Hotmart; MultiProviders/Colibri.

---

## 1. Diagnóstico real (Parte 1)

### 1.1 Onde o Atomic Core vive hoje

- `frontend/assets/vision-core-next-clean.js` — IIFE a partir de `var root = document.querySelector('[data-atomic-core]')` (~linha 3873 até a definição de `window.AtomicCoreNext`, ~linha 4235). SVG (`.vc-atomic-rings`) + 10 nós `.vc-agent` posicionados via `element.style.transform`/`.opacity`/`.filter` em JS, nunca Canvas/WebGL — confirmado no código real, consistente com `docs/ATOMIC_CORE_SPEC.md`.
- `frontend/assets/vision-core-next-clean.css` — regras `.vc-atomic-hud`, `.vc-core-node`, `.vc-agent`, `.vc-atomic-rings` etc. (~linha 1188 em diante).
- DOM real medido: **10 nós `[data-agent]`**, **67 nós no total** dentro de `[data-atomic-core]` (SVG + spans + ícones) — volume de DOM baixo, não é o gargalo estrutural principal (ver 1.3).

### 1.2 Candidatos técnicos considerados

| Candidato | Já mitigado antes? | Confirma como causa dominante hoje? |
|---|---|---|
| `filter: drop-shadow()` + `color-mix()` por agente (glow) | Sim — 2026-07-18: throttle de 30fps→10fps só pro glow + memoização (pula escrita se a string não mudou) | **Não, isolado hoje** — ver 1.4 |
| `will-change: transform, opacity, filter` no `.vc-agent` (CSS linha 1268) | Não | **Não, isolado hoje** — ver 1.4 |
| `setInterval`/`setTimeout` competindo com `requestAnimationFrame` | Parcialmente — o loop principal usa só rAF com gate manual de 32ms (`FRAME_INTERVAL_MS`), não `setInterval`; `REDUCE_TICK_MS=500` só roda sob `reduced-motion` explícito (não é o padrão) | Não é o mecanismo do "piscar" no modo padrão (`full`) — `agentPollTimer`/`metricsPollTimer` (10s+) são raros demais para explicar um piscar contínuo |
| Volume de nós DOM animando (10 agentes, 67 nós totais) | — | Não é o gargalo — `UpdateLayoutTree` mediu só ~36-46ms num trace real de 6s (<1% do tempo) |
| **`backdrop-filter: blur(18px)`** em `.vc-composer` (CSS linha 1156) e `.vc-sidebar` esquerda (CSS linha 63) | **Parcialmente** — 2026-07-15: achado real registrado no código (comentário CSS linha 1147-1154: "derrubou o frame rate pela metade em teste controlado"), mitigado com `contain: paint` no composer | **Sim — é a causa dominante remanescente hoje**, ver 1.4 |
| `prefers-reduced-motion` sem gate | N/A — `window.VCMotion` já é a fonte de verdade (`DECISION-014`), gap de acessibilidade não encontrado aqui | Não aplicável — comportamento correto e testado (`vision-core-next-atomic-core.spec.mjs`) |

### 1.3 Metodologia de medição real

Sem instrução do usuário pra rodar manualmente — a medição foi automatizada via Playwright + Chromium real (headless), reaproveitando o mesmo padrão de servidor estático local (`http://127.0.0.1:<porta>` sobre `frontend/`, nunca `file://`) já usado em `tests/e2e/vision-core-next-atomic-core.spec.mjs`, com as mesmas 4 rotas de API mockadas. Script temporário (`atomic-core-perf-probe.tmp.mjs`, na raiz do repo durante a execução, **removido ao final, nunca commitado** — mesmo padrão já usado pelo projeto para scripts de validação pontuais):

1. **Frame timing real via rAF da própria página** — um hook em `requestAnimationFrame` captura o delta entre frames reais (não um relógio artificial), com o app rodando em Chat/`idle`/modo `full` (default).
2. **A/B intercalado na mesma sessão de página** (não recargas separadas) — mesma disciplina já usada pelo projeto em 2026-07-18 ("A/B intercalado real no mesmo ambiente") para cancelar ruído de ambiente (headless sandboxado tem variância real, já documentada em sessões anteriores). Cada variante trocada via `<style>` injetado com `!important` (nunca editando os arquivos do repo), 5 rodadas de 1.5-2s por variante, intercaladas.
3. **`PerformanceObserver` de `longtask`** — sinal real de bloqueio de main thread >50ms.
4. **Trace real via CDP** (`Tracing.start`/`Tracing.end` na sessão do Chromium, categorias `devtools.timeline`+`disabled-by-default-devtools.timeline`) — 6s de captura, eventos agregados por nome/duração, para a quebra real scripting/layout/paint/composite pedida.

### 1.4 Resultado real (evidência, não suposição)

**Frame timing, A/B intercalado, 5 rodadas por variante (baseline = código atual, sem nenhuma mudança):**

| Variante | Amostras | Média (ms) | % frames >16.7ms | % frames >33ms | Máx (ms) |
|---|---|---|---|---|---|
| `baseline` (código atual, intocado) | 440 | 17.09 | 43.4% | **3.6%** | **33.4** |
| Sem `filter:drop-shadow()` nos agentes | 344 | 17.46 | 26.2% | 4.9% | 33.4 |
| Sem `will-change:filter` (só transform/opacity) | 336 | 17.9 | 30.1% | 7.7% | 33.4 |
| Sem `backdrop-filter` só no `.vc-composer` | 455 | 16.56 | 46.4% | **0%** | **16.8** |
| Sem `backdrop-filter` só no `.vc-sidebar` esquerda | 455 | 16.56 | 35.6% | **0%** | **16.8** |
| Sem `backdrop-filter` nos dois + `.vc-atomic-hud` | 455 | 16.56 | 37.4% | **0%** | **16.8** |

**Leitura honesta do resultado:** remover o `filter:drop-shadow()` por-agente ou o `will-change:filter` **não melhora** de forma consistente (as % de frames >33ms chegam a piorar, dentro do ruído do ambiente headless) — a mitigação de 2026-07-18 (throttle+memoização) já estava correta para o que media então, mas não é mais o fator dominante isolado hoje. Remover **qualquer um dos dois `backdrop-filter: blur()`** (composer OU sidebar esquerda, isoladamente) elimina 100% dos frames >33ms nesta medição e trava o máximo em 16.8ms (~1 frame, contra ~2 frames/33ms do baseline) — resultado idêntico entre as 3 variantes de remoção de `backdrop-filter`, o que sugere que qualquer um dos dois já é suficiente para acionar o custo, não que os dois somem linearmente.

**Trace real (6s, categorias CDP), maiores consumidores por nome de evento:**

```
RunTask                 ~4.8-5.5s  (categoria agregada, pouco granular sozinha)
UpdateLayoutTree        ~36-46ms
FireAnimationFrame      ~35-41ms
Commit                  ~30-33ms
FunctionCall            ~28-33ms
PrePaint                ~20-23ms
Layerize                ~20-25ms
UpdateLayer             ~3-4ms
RasterTask              ~2ms
```

`PerformanceObserver` de `longtask`: 1 ocorrência em 6s (96ms, no carregamento inicial — não durante o idle estável). Confirma que o custo real não é um único bloqueio longo, e sim um número pequeno de frames pontualmente caros (picos de `Commit`/`Layerize`, coerente com o `backdrop-filter` forçando recomposição de camada quando o conteúdo atrás dele muda).

**Causa raiz real, com evidência:** o "pesado" mensurável hoje é dominado por `backdrop-filter: blur(18px)` em `.vc-composer` (CSS `vision-core-next-clean.css:1156`) e `.vc-sidebar` esquerda (`:63`) — ambos ficam próximos/atrás do HUD que anima 10 agentes todo frame. O achado de 2026-07-15 (comentário já existente no código) identificou exatamente esse mecanismo e mitigou com `contain: paint` no composer, mas a mitigação é parcial: `contain: paint` limita a propagação de invalidação de pintura pra fora da própria caixa, mas não elimina a recomposição de camada que o `backdrop-filter` ainda força quando o conteúdo por trás muda a cada frame. O "piscar" relatado é consistente com esses picos ocasionais de frame >33ms (2 frames perdidos em vez de 1), não com dessincronia `setInterval`/rAF (não encontrada no modo padrão) nem com volume de DOM (baixo, confirmado pelo trace).

**Ressalva honesta, mesma já registrada em sessões anteriores:** ambiente headless/sandboxado não tem GPU real — o resultado pode ser mais ou menos pronunciado numa máquina real do usuário. Os deltas absolutos são pequenos em termos de ms (16.56 vs 17.09ms de média), mas o sinal de `% frames >33ms` e `máximo` é limpo e consistente nas 3 variantes de remoção de `backdrop-filter` — é o único candidato que produziu uma melhora consistente e repetível nesta medição.

### 1.5 Gap de acessibilidade adjacente (não é a causa do peso, registrado por ser achado real durante a leitura)

Nenhum gap novo encontrado. `window.VCMotion` já é a fonte de verdade (não lê `matchMedia` diretamente no loop de animação, `DECISION-014`), testado em `vision-core-next-atomic-core.spec.mjs`.

---

## 2. Requisitos de movimento/medida — não-negociáveis (Parte 2)

Qualquer proposta que altere qualquer um destes itens sem justificativa explícita **não está seguindo o pedido**. Levantado por leitura direta de `vision-core-next-clean.js`/`.css`, não por suposição.

### 2.1 Geometria e escala

- Centro lógico `CX=180, CY=180`; raio orbital base `AGENT_RADIUS = 240` (`ORBIT_SCALE=1`, hub 2x já aplicado em `next-clean-100..104`, este é o valor final).
- Cada um dos 10 agentes tem `rx`/`ry` (elipse de Action) e `angle` (posição-base de Idle) individuais e fixos — ver tabela completa abaixo. Nunca recalcular esses valores; são a identidade coreográfica.
- `--atomic-core-size: 520px` (ou `min(520px, 40vw)` na sidebar), `--atomic-safe-area: 72px`, `--atomic-scale: .337` — o HUD **nunca** cresce para acomoder si mesmo; a sidebar direita (`252px` expandida / `78px` recolhida — mesma largura da navegação esquerda, `DECISION-031`) define a caixa e o HUD escala pra caber.
- Deslocamento máximo de drift em Idle: `MAX_ANGLE_DRIFT = 3` (graus), `MAX_RADIAL_DRIFT = 4` — tetos já validados contra sobreposição de legenda; a versão bits não pode exceder isso em nenhum padrão de movimento.

### 2.2 Coreografia por agente (config real, `vision-core-next-clean.js` ~linha 3901)

| Agente | angle (Idle) | period (Idle, s) | rx / ry (Action) | tilt | direção | glowColor |
|---|---|---|---|---|---|---|
| pi (PI Harness) | -90° | 78 | 286/84 | -30° | +1 | `#b86cff` |
| hermes | -54° | 66 | 272/108 | 28° | -1 | `#34d399` |
| openclaw | -18° | 88 | 296/76 | 78° | +1 | `#3b82f6` |
| scanner | 18° | 59 | 256/120 | -72° | -1 | `#22d3ee` |
| patchEngine | 54° | 74 | 280/96 | 12° | +1 | `#d946ef` |
| aegis | 90° | 90 | 264/132 | 54° | -1 | `#facc15` |
| goCore | 126° | 81 | 292/88 | -54° | +1 | `#f59e0b` |
| passGold | 162° | 69 | 252/116 | 86° | -1 | `#fb7185` |
| archivist | 198° | 84 | 284/80 | 38° | +1 | `#0f766e` |
| github | 234° | 50 | 268/124 | -12° | -1 | `#38bdf8` |

Cada agente também tem `radial`/`depth`/`action` (períodos independentes das ondas radial/profundidade/ação) e `phase` (offset senoidal) — preservar os valores exatos do código-fonte na implementação real (Fase 2+), não os reconstruir de memória.

### 2.3 Estados e transições a preservar

- **`idle`** (default): 3 padrões de movimento configuráveis pelo usuário em Settings (`classic`/`pulse`/`drift`), velocidade ajustável (`idleSpeedPref`, 40%-250%). Órbitas nunca sincronizadas entre agentes (fases diferentes por design).
- **`action`**: 3 padrões (`classic`/`wide`/`pulse`), elipse `rx`/`ry` reais por agente, núcleo central pulsa escala `1 + ((sin(elapsed/1200·2π)+1)/2)·.04`.
- **`returning`** (Action→Idle): captura snapshot da posição real de Action e interpola (`easeInOutQuad`) até o alvo de Idle — 3 modos (`none`/`fast`/`smooth`, 200-2500ms configurável). `data-state` já virou `"idle"` no instante da chamada; só o visual continua em transição.
- **`reduceMotion`** (só quando o usuário escolhe explicitamente, nunca por padrão do SO — `DECISION-014`): posição/escala **congeladas**, pulso lento de opacidade/glow (`REDUCE_PULSE_MS≈4200`) via tick de 500ms — nunca 100% estático.
- **`highlighted`** (via `highlightAtomicAgents()`, não é interação do usuário — o widget inteiro tem `pointer-events:none`, confirmado no CSS): +0.035 de escala, +0.08 de opacidade, +2 de z-index, glow ×1.45.
- **`is-collapsed`** (sidebar recolhida): opacidade 0 + `scale(.85)`, sem mudar a coreografia interna.
- Glow por agente: cor fixa (`--agent-color`), intensidade varia por estado/tempo — **efeito visual a preservar, não necessariamente a técnica** (`filter:drop-shadow()` é implementação, não requisito; ver seção 3).

### 2.4 Fora da coreografia (efeito, não mecanismo — pode mudar na versão bits)

A forma exata como o glow é renderizado (CSS `filter:drop-shadow()` vs. sprite/Canvas) **não é parte do contrato de movimento** — é a peça que a versão bits está livre para reimplementar, desde que o resultado visual percebido (agente mais brilhante quando ativo/destacado) permaneça.

---

## 3. Abordagem técnica proposta

### 3.1 Opções consideradas

**A — Canvas com grid/sprite de bits.** Um único elemento, uma chamada de desenho por frame. Desenho "blocado" é natural nesse formato (grade de pixels grandes). Prós: menos overhead de compositor por não ter 10 nós DOM individuais promovidos a camada (`will-change`); custo de `backdrop-filter` nos elementos VIZINHOS (composer/sidebar) continua existindo independente da técnica do Atomic Core em si — Canvas não resolve isso sozinho. Contras: **contradiz a regra dura já registrada em `docs/ATOMIC_CORE_SPEC.md`** ("Implementação real: SVG + CSS transform/opacity + `requestAnimationFrame` — **nunca** Canvas/Three.js/WebGL", repetida na seção "Estados conceituais — IDEIA FUTURA"); perde a capacidade de estilizar cada agente via CSS (`--agent-color` por seletor) sem reescrever o desenho; teria que reimplementar `IntersectionObserver`-pause manualmente (hoje pausa o rAF quando o HUD sai da viewport/aba — Canvas não muda isso, mas precisa ser mantido).

**B — DOM/CSS simplificado com sprite sheet (`background-position` animado via `steps()`).** Mantém 10 nós DOM individuais (preserva acessibilidade/estrutura atual, `highlightAtomicAgents()` continua funcionando por seletor), troca o glow calculado (`filter:drop-shadow()`+`color-mix()` recalculado em JS) por um sprite pré-renderizado com estados de brilho discretos, animado via CSS `steps()` — sem recálculo de filtro por frame. Prós: menor mudança estrutural, reaproveita o pipeline de posicionamento (`transform`/`opacity`) que já é o correto tecnicamente e já está confirmado NÃO ser o gargalo (seção 1.4); resolve o candidato "will-change:filter" mesmo que ele não tenha se confirmado dominante agora (ainda é uma escrita a menos por frame). Contras: não ataca a causa raiz real encontrada (backdrop-filter nos vizinhos), que é **externa ao Atomic Core** — troca de arquitetura interna do widget não teria efeito na medição de 1.4 se o problema real está em `.vc-composer`/`.vc-sidebar`.

### 3.2 Decisão

**Nenhuma das duas opções ataca a causa raiz real encontrada em 1.4** (`backdrop-filter` nos elementos vizinhos ao HUD, não no HUD em si). Isso muda a pergunta: a versão "bits" original do pedido (estilo pixel/blocado) é uma motivação estética válida e independente, mas o problema de performance medido não está dentro do widget — está ao lado dele.

**Decisão registrada, não implementada:** tratar como **dois problemas com escopos e prazos diferentes**, não misturar:

1. **Fix de performance real (curto prazo, fora desta spec):** revisar `contain: paint` no `.vc-composer` (mitigação parcial de 2026-07-15) e considerar (a) `contain: paint` também no `.vc-sidebar` esquerda, (b) avaliar se o `backdrop-filter` é essencial visualmente nesses dois elementos ou pode ser substituído por um fundo sólido/semitransparente sem blur nesses dois pontos específicos, (c) medir de novo depois. **Não faz parte desta spec** (é fix da versão atual, fora do escopo "não tocar na versão atual" — precisa de aprovação separada do usuário antes de qualquer mudança real, e é candidato a ficar registrado em `docs/CURRENT_STATE.md` como achado desta sessão, não implementado).
2. **Versão "bits" (esta spec, Fase 2+):** Opção **B (DOM/sprite sheet)** é a recomendada quando/se a Fase 2 for autorizada — preserva a estrutura de 10 nós individuais (compatível com `highlightAtomicAgents()`/`--agent-color`/acessibilidade), remove a escrita de `filter` calculada em JS a cada tick (mesmo não sendo o gargalo dominante hoje, é custo real não-zero e puramente decorativo, seção 1.4) e não contradiz a regra dura "nunca Canvas" sem uma sessão de decisão dedicada (mudar essa regra em `docs/ATOMIC_CORE_SPEC.md` exigiria justificativa própria, e a medição real não a sustenta sozinha — Opção A fica descartada por ora, não porque Canvas seja tecnicamente pior, mas porque não há evidência de que resolveria o problema real medido).

---

## 4. Critérios de aceite mensuráveis

Baseados no diagnóstico real da seção 1.4, não em metas arbitrárias:

- [ ] Protótipo isolado (Fase 2) medido com o **mesmo script/metodologia da seção 1.3** (rAF real, A/B intercalado, mesmo ambiente) contra o baseline atual documentado nesta spec (tabela 1.4).
- [ ] Zero escrita de `style.filter` por frame no novo widget (remove a fonte de custo não-dominante mas real identificada em 1.4) — substituída por sprite/`steps()` ou técnica equivalente sem recálculo de filtro CSS em JS.
- [ ] `% frames >33ms` do protótipo isolado (página própria, sem o resto do app) ≤ o valor já medido para "sem backdrop-filter" nesta spec (0% na medição de 1.4) — não pode regredir.
- [ ] Nenhuma mudança de `angle`/`rx`/`ry`/`period`/`phase`/`tilt` por agente em relação à tabela da seção 2.2 (comparação byte-a-byte dos valores de configuração, não só "parece igual visualmente").
- [ ] Todos os 6 controles de Settings → Atomic Core (`idleSpeed`, `idlePattern`, `idleDrift`, `actionPattern`, `returnStyle`, `returnDuration`) continuam funcionando sem mudança de comportamento.
- [ ] `reduceMotion` (`window.VCMotion`) continua nunca 100% estático, mesmo padrão de pulso lento.
- [ ] Suíte `tests/e2e/vision-core-next-atomic-core.spec.mjs` (34/34 hoje) passa sem modificação nos asserts de coreografia — só os que testam a técnica de glow (se algum ler `style.filter` diretamente) podem precisar de atualização, documentada explicitamente.
- [ ] Contraste WCAG dos 10 agentes (já validado ≥4,5:1 em `next-clean-118`) revalidado na nova técnica de renderização.

---

## 5. Plano por fases

- **Fase 1 — esta spec.** Concluída nesta sessão.
- **Fase 2 — protótipo isolado.** Página de teste separada (não integrada ao VC Next), implementando Opção B (DOM/sprite). Validação com a mesma metodologia de medição real da seção 1.3, comparando contra o baseline documentado na tabela 1.4. Gate: aprovação explícita do usuário antes de integrar (Atomic Core é área protegida).
- **Fase 3 — integração ao VC Next atrás de flag/toggle.** Comparação lado a lado com a versão atual antes de qualquer substituição definitiva. Gate: validação visual explícita do usuário (mesmo padrão já usado para mudanças no Atomic Core — preview local antes de deploy).
- **Fase 4 — substituição definitiva.** Remoção da versão antiga só depois da Fase 3 aprovada e medida em produção real (não só ambiente local/headless).

Nenhuma fase além da 1 está autorizada por este documento.

---

## Checklist de aceite desta spec

- [x] Diagnóstico com evidência real (rAF real + trace CDP + A/B intercalado), não suposição.
- [x] Causa raiz identificada e documentada com dados (`backdrop-filter` em elementos vizinhos, não o `filter:drop-shadow()` já mitigado antes).
- [x] Movimento/medida documentados com precisão suficiente para critério de aceite (geometria, coreografia por agente, estados, transições).
- [x] Abordagem técnica com prós/contras reais e decisão justificada (Opção B, com ressalva de que o problema real medido é externo ao widget).
- [x] Critérios de aceite mensuráveis baseados no diagnóstico, não em metas arbitrárias.
- [x] Plano por fases com gate explícito em cada uma.
- [x] Zero implementação da versão bits nesta sessão.
- [x] Zero mudança persistida na versão atual do Atomic Core (overrides de CSS usados só em runtime pelo script de medição, removido ao final).

## Histórico

| Data | Mudança |
|---|---|
| 2026-07-21 | Criação — diagnóstico real + spec da versão bits. |

## Controle de versão

**1.0.0** — 2026-07-21
