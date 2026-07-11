# Referência de Design do Legado — Vision Core

> Documento doc-only, criado por revisão de código estático (leitura, sem execução) do legado real neste repositório. Toda afirmação abaixo é rastreável a um arquivo:linha específico — nada foi assumido pelo nome de uma feature ou por memória de sessões anteriores sem reverificar contra o código atual.

---

## POLÍTICA OFICIAL

### a) A interface legada é FONTE DE REFERÊNCIA VISUAL/UX apenas

`frontend/index.html` (raiz do `pages.dev`, V2.9.13 CLEAN FULLSTACK, carrega `frontend/assets/vision-core-bundle.js`) é a interface legada real em produção — **não** `vision-core-clean-runtime.js`, que é um fork abandonado, não carregado por nenhuma página oficial (`docs/VISION_CORE_NEXT_FRONTEND_SPEC.md` §11, Categoria C). Essa distinção importa: **é `vision-core-bundle.js` — o bundle real, não o fork abandonado — que contém a credencial hardcoded flagrada** (confirmado nesta sessão por leitura direta):

```
frontend/assets/vision-core-bundle.js:10289-10290  var _pw145 = ... || 'vc-user-auto';
frontend/assets/vision-core-bundle.js:10318         var _loginPw = ... || 'vc-user-auto';
```

(A mesma string também existe em `vision-core-clean-runtime.js:6301,6323` — o fork abandonado, sem tráfego real, mas com o mesmo literal.) Este é exatamente o achado real reportado, não suprimido, pelo `vc-secret-guard` na Fase 1 do dogfood (ver `docs/CURRENT_STATE.md`, seção "Sessão `vc-secret-guard` Fase 1"). **Decisão de destino desta credencial (remover, rotacionar o padrão de conta demo, ou aceitar como está) permanece pendente com o usuário — este documento não a resolve, só a cita como motivo concreto para a regra abaixo.**

**PROIBIDO copiar código do legado.** Isso vale para HTML, CSS e JS — inclusive trechos "inofensivos" como um seletor CSS ou uma função utilitária pequena. O legado é o runtime a ser aposentado (`docs/VISION_CORE_NEXT_FRONTEND_SPEC.md` já o trata como paralelo, não como base). Reimplementar do zero no Next, mesmo quando o resultado visual for idêntico, é a única forma aprovada de trazer algo do legado adiante.

### b) Nenhuma feature nova nasce na interface legada

Toda implementação nova é no Next (`frontend/vision-core-next.html` + `assets/vision-core-next-clean.{js,css}`), do zero, limpa, com spec permanente no padrão da casa (ver `tests/e2e/vision-core-next-*.spec.mjs` — specs permanentes documentados em `docs/CURRENT_STATE.md`).

**Regra anti-novo-legado:** se uma tela do Next precisar de algo que só existe no legado, o caminho é **reimplementar no Next** — nunca linkar, embedar (`<iframe>`, `import` de bundle) ou estender o legado para "emprestar" a feature. Isso vale mesmo sob pressão de prazo — um link temporário pro legado tende a nunca ser removido (o próprio `#vcSoftwareFactoryPage` legado, hoje marcado para deleção na Fase 3.3d, é um exemplo do padrão "provisório que virou permanente").

### c) Divergência consciente é permitida e registrada

O Next **não é obrigado a replicar 1:1** o legado. Quando o Next diverge de propósito (UX diferente, fluxo reestruturado, feature reduzida ou expandida), a divergência é uma decisão de produto válida — mas precisa estar registrada aqui (seção "Catálogo por tela" e "Status de migração" abaixo), com o quê e o porquê, não deixada implícita. Um caso já real, catalogado nesta sessão: a Software Factory do Next reimplementou o conceito de "geradores SF" com uma sequência Auto-Pilot e UX de chat-log diferentes da sequência/UI exata do legado — ver seção 3 abaixo.

---

## Catálogo por tela

### 1. Métricas (`#metricsBoard`, `index.html:1044-1109`)

**Shell estático (fallback, sempre presente):**
- Cabeçalho: eyebrow `AGENT METRICS • CUSTO POR AGENTE • PIPELINE`, título `MÉTRICAS DOS AGENTES`, texto explicando o endpoint (`/api/metrics/agents`) e o comportamento de fallback.
- Badge `#metricsSourceBadge` — texto inicial `UI LOCAL`.
- Grid de linhas por agente (`.vc-agent-metric-row`), um por agente: nome, chip de método (`.vc-agent-method-chip` — variantes `conversa`/`loop`/`adaptive`/`auto`), barra de progresso colorida (`.vc-agent-bar-fill`, cores por agente: `vc-bar-purple`/`vc-bar-green`/`vc-bar-cyan`/`vc-bar-orange`/`vc-bar-gray`/`vc-bar-yellow`/`vc-bar-pink`), valor de custo (`$0.163` etc.).
- Agentes listados no shell: OpenClaw, Hermes RCA, Scanner, Aegis, PatchEngine, PI HARNESS, PASS GOLD, Benchmark.
- Rodapé: `TOTAL PIPELINE` com valor agregado (`#mcTotalCost`).

**Comportamento dinâmico real** (`vision-core-bundle.js:7848-7956`, função `initObservabilityPanel107`):
- Ao carregar, faz `Promise.all` contra 4 endpoints: `/api/metrics/agents`, `/api/metrics/summary`, `/api/dora-metrics`, `/api/metrics/memory`.
- Se **nenhum** responder `ok`, o shell estático fica intocado (fallback silencioso, sem erro visível).
- Se **qualquer um** responder, o badge muda de `UI LOCAL` para `DADOS REAIS` (verde `#4ade80`, fundo `rgba(74,222,128,.12)`).
- Larguras/cores de barra por status real do agente (`vision-core-bundle.js:7879-7880`): `ok` → 85%, verde `#22c55e`; `binary_not_found` → 20%, laranja `#f97316`; **`PENDING_EVIDENCE` → 30%, âmbar `#eab308`** (o estado citado explicitamente na tarefa).
- Três blocos extras, **anexados dinamicamente só se o dado existir** (nunca hardcoded): `RUNTIME (backend)` (CPU/memória/heap/uptime/versão Node), `DORA METRICS` (deploy frequency/lead time/MTTR/change failure rate), `MEMORY LAYER (§72/§107)` (escalações totais, por provider, aptas a reordenar).

**O que o Next já tem equivalente:** os mesmos 4 endpoints já estão conectados como ação SAFE READ (`vision-core-next-clean.js:139`, `featureMap.metrics`) — clicar num botão de ação despeja um resumo de texto no chat via `summarizeResult(data)` (`vision-core-next-clean.js:199-215`). **Paridade de dado, zero paridade visual** — não há barra, não há chip de método, não há troca de cor de badge por status.

**O que herdar (visual/UX, não código):** a linguagem de barra+chip+badge-que-muda-de-cor; o significado semântico de PENDING_EVIDENCE em âmbar (distinto de erro vermelho e de sucesso verde — é "aguardando prova", não "falhou"); o padrão de bloco condicional (RUNTIME/DORA/MEMORY LAYER só aparecem se o backend realmente devolver aquele dado, nunca um placeholder vazio).

**Bloqueado por backend:** nada — os 4 endpoints já existem e já respondem em produção (confirmado pelo próprio uso do Next hoje).

---

### 2. Agentes (`#agentsBoard`, `index.html:1112-1352+`)

**Shell estático:** grid de 11 cards (`.vc-reserve-card`, confirmado por contagem direta: `backend`, `database`, `auth`, `upload_media`, `config`, `network`, `locator`, `security`, `validator`, `architect`, `memory`). Estrutura de cada card:
- Topo: ícone (`⬡` ou `▣` laranja para os "Reserve" tipo `locator`) + badge `ATIVO` (`.vc-reserve-status`).
- Tipo (`BACKEND`, `DATABASE`, etc.) + nome (`Agente Backend`) + descrição de 1 linha.
- 3 tags de capacidade (`.vc-reserve-tag`, ex.: `routes`/`api`/`server`).
- Rodapé: chip de modo (`.vc-reserve-method`, variantes `conversa`/`cirurgico`) + controle tri-state `OFF`/`AUTO`/`ON` (`.vc-mode-btn`, classe `active-off`/`active-auto`/`active-on` marca o estado atual).

**Fonte de dado real:** `GET /api/agents/catalog` (citado no próprio texto do painel, `index.html:1117`); mudança de modo via `PUT /api/agents/:id/mode` (mecanismo documentado em `CLAUDE.md` §98-D — `detectActiveAgent()` no `/api/copilot` lê o modo salvo).

**O que o Next já tem equivalente:** botão SAFE READ "Agentes" (`vision-core-next-clean.js:136`, `featureMap.agents`) chama `/api/agent/status`, `/api/agents/catalog`, `/api/metrics/agents` e despeja resumo em texto no chat. **Sem grid de cards, sem tags de capacidade, sem controle tri-state** — o Next hoje só lê, nunca oferece trocar OFF/AUTO/ON.

**O que herdar (visual/UX):** o card como unidade (ícone+badge+tipo+nome+descrição+tags+modo+tri-state) é uma linguagem visual coesa que comunica muita informação em pouco espaço — vale a pena replicar a estrutura (não o CSS) no Next quando essa tela ganhar prioridade.

**Bloqueado por backend:** nada — `/api/agents/:id/mode` já existe. O que falta é decisão de produto + implementação no Next (não é um endpoint ausente).

---

### 3. Software Factory — duas UIs distintas coexistindo no legado

O legado tem **duas** interfaces de Software Factory que não devem ser confundidas — catalogadas separadamente porque têm status de migração diferentes.

#### 3a. Geradores embutidos no chat (`#vcMissionSfPane`, `index.html:423-471`)

Composer estilo chat com chips de exemplo (`vc-sf-example-chip`) e chips de geração rápida (`vc-sf-gen-chips`, `index.html:460-466`): `📝 Prompt de Missão` (`mission_composer`), `📦 Handoff` (`worker_handoff`), `👁 Export Preview` (`export_preview`), `⚙ Comando Real` (`real_file_command`), `🧾 Recibo` (`worker_receipt`), `📊 Relatório Final` (`final_dashboard`). Cada chip dispara um POST real via `SF_ENDPOINT_MAP` (`vision-core-bundle.js:10120-10129`) contra `/api/sf/mission-composer`, `/api/sf/worker-handoff`, `/api/sf/deploy-blueprint`, `/api/sf/patch-validator`, `/api/sf/gold-gate`.

Também existe uma sequência **Auto-Pilot de 7 passos** (`SF_AUTOPILOT_STEPS`, `vision-core-bundle.js:5526-5534`): analisar projeto → preview de arquivos → selecionar template → compor missão SDDF → gerar pacote worker → comando real (external only) → validação Gold Gate.

#### 3b. Página standalone `#vcSoftwareFactoryPage`/`#projectBuilder` (`index.html:2333+`)

Navegação por 9 abas numeradas (`index.html:2354-2363`): `01 MONTAR PROJETO DO ZERO`, `02 PREVIEW DE CRIAÇÃO`, `03 TEMPLATES DE PROJETO`, `04 COMPOSITOR DE MISSÃO`, `05 PACOTES PARA WORKERS`, `06 COMANDO PARA CRIAÇÃO REAL`, `07 RECIBO DO WORKER`, `08 SAAS & API ROADMAP`, `09 PAINEL FINAL`. Cada aba abre um painel de largura total com textarea + botão `GERAR ...` dedicado.

**Esta página já está decidida como "não será portada"** — `docs/VISION_CORE_NEXT_FRONTEND_SPEC.md` §11, Categoria C: *"SF Console / página SF dedicada (`#vcSoftwareFactoryPage`/`#projectBuilder`) | Já planejada para deleção (Fase 3.3d). Causa tela em branco na aba 'Modo Avançado'."* Este documento não reabre essa decisão — só a cita para não ser recatalogada por engano numa sessão futura.

#### Sobre os códigos "SF-01"…"SF-09" — dois sistemas de numeração coexistem, não confundir

1. **`SF_MODULE_SPEC_MAP`** (`vision-core-bundle.js:5514-5524`) mapeia os módulos da página standalone (3b) para códigos da Spec Library de 120 specs usada pelo Agente Arquiteto (`project_builder`→`SF-01`, `project_templates`→`SF-02`, `mission_composer`→`SF-03`, `worker_handoff`→`SF-04`, `export_preview`→`SF-05`, `real_file_command`→`SF-06`, `worker_receipt`→`SF-07`, `final_dashboard`→`SF-08`, `saas_api`→`SF-09`).
2. **A citação `about.html:753`** ("§139, SF02-SF09 validados em produção") usa os mesmos códigos `SF02`-`SF09` para rotular os **8 `SF_GENERATORS` do backend** (`mission-composer`, `worker-handoff`, `context-snapshot`, `patch-validator`, `risk-assessor`, `rollback-planner`, `gold-gate`, `deploy-blueprint`) — um mapeamento **diferente**, não relacionado ao item 1.

Nenhum dos dois é "a lista oficial de módulos SF" — são dois vocabulários que aconteceram de usar a mesma sigla em contextos diferentes do legado. Catalogado aqui pra próxima sessão não presumir que são a mesma coisa.

**O que o Next já tem equivalente (divergência consciente registrada, ver política (c)):** a "Software Factory Next" (checkpoints `v33`–`v46` em `CLAUDE.md`) já reimplementou boa parte do conceito **do zero, com UX própria**: seção `#factory`, Auto-Pilot de 5 passos + PASS GOLD como 6º passo opcional (não os mesmos 7 passos do legado), Modo Avançado, 4 geradores opcionais (`context-snapshot`/`patch-validator`/`risk-assessor`/`rollback-planner` — 4 dos 8 `SF_GENERATORS`), `fetch-url`. **Isto diverge de propósito** do fluxo 3a do legado — não é uma cópia com nomes trocados, é uma sequência e uma UX (log de chat, não abas numeradas) desenhadas do zero para o Next.

**Bloqueado por backend:** nada novo — `project-files` (`server.js:4576`, assíncrono, resposta em `data.files[]`) e `generate-zip` (`server.js:4700`, síncrono, resposta binária ZIP) têm contrato já verificado (`docs/CURRENT_STATE.md`, seção "Próxima etapa") mas ainda não conectados no Next — pendência de implementação, não de backend ausente.

---

### 4. Landing (`frontend/landing.html`)

**Fora do escopo de portar para o Next por desenho, não por atraso** — `docs/VISION_CORE_NEXT_FRONTEND_SPEC.md` §7 é explícito: *"O que o Next NÃO é: Landing page promocional."* `landing.html` está listado como arquivo proibido de editar nesta fase (§2). Catalogado aqui só como referência de linguagem de marca, não como pendência de migração.

**Nota de precisão:** a tarefa que originou este documento citou a frase "copiloto que não confia em si mesmo" — essa string exata **não existe** no código (confirmado por busca). A frase real mais próxima é `landing.html:94`: *"Não é chatbot. Não é copiloto. É uma camada operacional que transforma erro em missão, missão em execução, execução em validação e validação em deploy seguro."* Registrado aqui pra não propagar uma citação que não bate com a fonte.

- **Narrativa central:** eyebrow `IAs criam. VISION CORE corrige.` (`landing.html:57`) — hero: *"A IA acelerou a criação de software. Mas também criou um novo problema: código que nasce rápido… e quebra rápido."*
- **Pilares:** `landing.html:90-102`, seção `id="pillars"` — **6 pilares, não 3** (contagem verificada: `so-ia-grid compact-pillar-grid` tem 6 `.so-ia-card`): Diagnóstico Inteligente, Equipe de Agentes, Execução Automática, PASS GOLD, Deploy Confiável, Fecha o Loop.
- **Comparação "ANTES E DEPOIS"** (`landing.html:166-191`, `id="loop"`): **não é um `<table>` HTML** — é um layout de 2 colunas (`.loop-comparison`), 6 passos pareados cada: `🔴 Loop de erros` (Erro acontece → Caça manual → Tentativas e erros → Mais tempo perdido → Solução frágil → O ciclo recomeça) vs `🟢 Fluxo VISION CORE` (Você descreve o problema → IA real diagnostica → Plano + patch seguro → Execução automática → Validação PASS GOLD → Deploy saudável).

**Status de migração:** não será portado — fora de escopo por desenho do Next (SPEC §7), não uma lacuna a fechar.

---

### 5. About (`frontend/about.html`)

Também fora do escopo de portar — mesma razão do item 4 (`landing.html`/`about.html` listados juntos em §2 como "Páginas públicas" proibidas de editar nesta fase, e o Next não é página de marketing/prova). Catalogado como referência de linguagem, não como pendência.

- **Fluxo "Como funciona"** (`about.html:56-75`, `.chain-flow`): 7 passos em cadeia — `Missão` (linguagem natural) → `Diagnóstico` (Hermes RCA + IA) → `Scanner` (AST + contexto) → `Patch` (snapshot + apply) → `AEGIS` (security check) → `PASS GOLD` (score=100) → `Deploy` (supervisionado).
- **Tagline central** (`about.html:74`): *"Sem PASS GOLD, nada existe. Sem aprovação humana, nada vai para produção."*
- **Badges de prova** (`.version-badge`): `NOVO — V2.9.10`, `29/29 e2e — V2.9.10` — não são badges decorativos genéricos, cada um está anexado a uma seção com número verificável (endpoint list de 16 rotas testadas, `about.html:117-134`).

**Status de migração:** não será portado — fora de escopo por desenho do Next, mesma razão do item 4.

---

## STATUS DE MIGRAÇÃO

| Tela/elemento do legado | Estado no Next | Nota |
|---|---|---|
| Métricas — dados (4 endpoints) | **Portado (dado)** | `featureMap.metrics`, SAFE READ, texto no chat |
| Métricas — visual (barras/chips/badge de cor por status) | **Não iniciado** | ver seção 1, "o que herdar" |
| Agentes — dados (catálogo + status) | **Portado (dado)** | `featureMap.agents`, SAFE READ, texto no chat |
| Agentes — visual (grid de cards) + controle tri-state OFF/AUTO/ON | **Não iniciado** | endpoint de escrita já existe (`PUT /api/agents/:id/mode`), decisão de produto pendente |
| Software Factory — geradores via chat (3a) | **Divergente por design** | Next reimplementou do zero (Auto-Pilot 5+1, Modo Avançado, 4/8 geradores) — ver política (c) |
| Software Factory — `project-files` + `generate-zip` | **Não iniciado** | contrato já verificado, sem bloqueio de backend |
| Software Factory — página standalone `#vcSoftwareFactoryPage` (3b) | **Não será portado** | já decidido, `VISION_CORE_NEXT_FRONTEND_SPEC.md` §11 Categoria C, Fase 3.3d |
| Landing — narrativa/pilares/comparação | **Não será portado** | fora de escopo por desenho, SPEC §7 |
| About — chain-flow/badges/tagline PASS GOLD | **Não será portado** | fora de escopo por desenho, SPEC §7 |

---

## Achado colateral desta sessão (registrado, não corrigido — fora de escopo doc-only)

`docs/VISION_CORE_NEXT_FRONTEND_SPEC.md` §11 (Categoria C) descreve `vision-core-clean-runtime.js` como *"Fork abandonado — não carregado por nenhuma página oficial"*, o que é verdade para o **carregamento** (nenhum `<script src>` oficial aponta pra ele — confirmado, só `vision-core-bundle.js` é carregado por `index.html`). Mas o achado do `vc-secret-guard` (Fase 1) mostrou que o **conteúdo** duplicado — a senha `vc-user-auto` — existe **também** em `vision-core-bundle.js` (o arquivo real, carregado em produção), não só no fork abandonado. A caracterização "não carregado" continua correta; só não deve ser lida como "logo, o conteúdo dele é irrelevante" — o mesmo padrão de código existe no arquivo que importa. Nenhuma ação tomada aqui (doc-only) — só registrado pra próxima sessão que decidir o destino da credencial ter o contexto completo.
