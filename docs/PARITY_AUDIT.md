# Auditoria de Paridade — Legado (`frontend/index.html` + bundle) vs. Next

**Data original:** 2026-07-08 · **Autor:** Claude Code (Sonnet 5) · **Tipo:** diagnóstico — nenhum código foi alterado, movido ou deletado nesta auditoria (as seções (a2)/(b) abaixo foram atualizadas em sessões de implementação subsequentes, 2026-07-08/09, conforme o roadmap avançou — ver `docs/CURRENT_STATE.md` pro estado mais recente).

**Objetivo:** decidir o que do front antigo o Next **não precisa carregar**, pra encurtar o caminho até a substituição completa do `index.html` legado.

**Metodologia:** dois agentes de investigação (read-only, filosofia equivalente ao `/ponytail-audit` mas apontada especificamente pra comparação de paridade — código morto, flags hardcoded false, endpoint que não existe mais, duplicação, cerimônia sem efeito) rodaram em paralelo sobre o front legado (`vision-core-bundle.js`, `vision-core-clean-runtime.js`, `vision-core-clean-state.js`, `index.html`) e sobre os ~30 arquivos CSS de `frontend/assets/`. Cruzado contra um mapeamento direto (grep) das 133 rotas reais registradas em `backend/server.js` e contra o que `frontend/assets/vision-core-next-clean.js` já chama hoje (25 endpoints distintos). Dois achados foram verificados manualmente por mim antes de fechar o relatório (billing e apply-fix), porque nenhum dos dois agentes tinha coberto explicitamente.

---

## 0. Achado estrutural que muda a leitura de tudo abaixo

`frontend/index.html` carrega exatamente **3 scripts**: `vision-core-bundle.js`, `v231-backend-agents.js`, `v582-sf-modules.js` (+ 1 CSS: `vision-core-bundle.css`).

- **`vision-core-clean-runtime.js` (312KB) não é carregado por nada.** Diverge de `vision-core-bundle.js` depois de ~3.2KB — é um fork abandonado no início de uma tentativa de reescrita "clean", e o desenvolvimento real continuou dentro do `bundle.js`, que cresceu pra 588KB sem nunca ser resincronizado com esse split. Arquivo morto por inteiro.
- **`vision-core-clean-state.js` (65KB) também não é carregado diretamente**, mas seu conteúdo (o registro estático `VISION_CORE_RESERVE_AGENTS`, "No API calls... For future orchestration reference only" no próprio cabeçalho) está **byte-a-byte idêntico** dentro do início do `bundle.js` — não foi perdido, só duplicado em disco.
- **`vision-core-bundle.css` (293KB) é 26 arquivos `.css` concatenados manualmente uma vez** (comentário no próprio arquivo, sem script de build encontrado em `package.json`) — os 26 arquivos-fonte individuais em `assets/` não são `<link>`ados por nada, só o resultado da concatenação.

Ou seja: pra apagar o legado por completo no futuro, a superfície real a considerar não são "40 arquivos soltos", é essencialmente **3 arquivos vivos** (`index.html`, `vision-core-bundle.js`, `vision-core-bundle.css`) + 2 scripts pequenos auxiliares — o resto já é órfão hoje, sem eu precisar recomendar nada.

---

## 1. Inventário de features (frontend legado)

### (a) JÁ EXISTE no Next — coberto, confirmado por endpoint compartilhado

| Feature | Endpoint(s) | Observação |
|---|---|---|
| Chat livre | `/api/chat` | Next usa a mesma rota. |
| GitHub PR + status | `/api/github/status`, `/api/github/create-pr` | Next tem confirmação dupla — mais rígido que o legado. |
| Métricas/DORA (leitura) | `/api/metrics/summary`, `/api/metrics/agents`, `/api/metrics/memory`, `/api/dora-metrics` | Legado renderiza os mesmos dados **duas vezes** (ids `bar-*` duplicados em `#agentMetricsLarge` e `#mcMetricsGrid`) — Next já corrige isso por construção (1 painel só). |
| Catálogo de agentes (leitura) | `/api/agents/catalog` | — |
| Vault — listagem de snapshots | `/api/vault/snapshots` | Ver nota sobre rollback abaixo — legado nunca teve UI de rollback também. |
| Tools/security — histórico (leitura) | `/api/security/history` | A ação de escrita (`apply-fix`) falta — ver item (b). |
| Obsidian (status) | `/api/obsidian/status` | — |
| Timeline de missão (leitura) | `/api/mission/timeline` | — |
| Apply-patch via chat | `/api/chat` (mode:fix) + `/api/chat/apply-patch` | Next redesenhou como pipeline de 2 chamadas explícitas — mais seguro que o botão único do legado. |
| Software Factory — 4 de ~8 passos | `/api/sf/mission-composer`, `/api/sf/deploy-blueprint`, `/api/sf/worker-handoff`, `/api/sf/gold-gate` | Faltam os outros passos reais do legado — ver item (b). |
| Dry-run real via Vision Agent Local | `/api/agent/mission/queue` (`sf_dry_run_real`) | **Next está à frente do legado aqui** — essa capacidade não existe no front antigo. |
| Pareamento de agente (`agent_secret`) | `/api/agent/register` | **Next está à frente do legado aqui** — o legado nunca teve esse conceito; é puramente uma evolução de segurança do Next. |

**13 features/grupos já cobertos**, dos quais 2 são capacidades novas que o Next tem e o legado nunca teve.

### (a2) ADICIONADO em sessões subsequentes (2026-07-08/09, Etapas 1-8 + auditoria + fetch-url)

| Feature | Endpoint(s) | Observação |
|---|---|---|
| Badge de conexão do agente (B-4) | `/api/agent/status` | Polling 10s, pausa em hidden. Estados: conectado/desconectado/erro. Verificado (auditoria): visibilitychange real, sem animação a gatear por reduced-motion. |
| AI Provider Vault — salvar/testar/remover (B-5) | `/api/providers/save`, `/api/providers/test`, `/api/providers/delete`, `/api/providers/list` | Settings panel com máscara de chave. Verificado: zero `localStorage`/`sessionStorage` tocando `api_key`, campo exibido vem de `api_key_masked` real do backend (`server.js:1981`). |
| Rollback de snapshot (B-6) | `/api/vault/rollback/:snapshotId` | Painel Vault com lista + confirmação dupla. Verificado: fluxo pending→confirm real, sem atalho de 1 clique. |
| Histórico de missões + detalhe (B-2) | `/api/mission/timeline` | Lista, detail view, back button. Verificado: estados vazio/carregando/erro todos presentes (`"Carregando..."`/`"Nenhuma missão registrada ainda."`/`"Erro ao carregar missões."`). |
| Evidence viewer (B-3) | (`evidence_receipt` dos entries da timeline) | Exibe evidência no detail da missão. |
| parseHermesBlock + hint diagnóstico (B-1/5b-5c) | `/api/chat` | Parse tolerante, hint panel quando hermesObj tem diagnosis/fix_type/patch. Verificado: `hermesObj===null` (texto livre ou JSON malformado) nunca quebra a UI — `parsed.hermesObj && (...)` sempre curto-circuita pro branch seguro. |
| Tools — Aplicar Fix (escrita real com backup) | `/api/security/apply-fix` | Confirmado contra `server.js:1533`. Escreve em disco + `.bak` automático, sem flag de dry-run no backend — confirmação dupla na UI é o único freio. Spec original tinha 0 cobertura do submit real (achado de auditoria, corrigido); agora é spec permanente com casos de sucesso/erro reais. |
| Software Factory — 4 passos extra opcionais | `/api/sf/context-snapshot`, `/api/sf/patch-validator`, `/api/sf/risk-assessor`, `/api/sf/rollback-planner` | Mesmo contrato `job_id`+poll dos passos originais — reuso total do pipeline existente, checkboxes opt-in, desligados por padrão. |
| Software Factory — contexto de URL | `/api/sf/fetch-url` | **Único endpoint SF síncrono** (sem job_id) — verificado contra `server.js:4485`. Campo opcional no composer, inclui o texto buscado como `full_context` na próxima missão. |

---

### (b) FALTA no Next, tem valor real — endpoint vivo + UI reachable confirmada no legado

| Feature | Endpoint(s) | Evidência de que é real |
|---|---|---|
| Auth (registro/login/OAuth Google+GitHub) | `/api/auth/register`, `/api/auth/login`, `/api/auth/oauth/<provider>` | Botões com `addEventListener` real confirmados (`signupBtn`, `authBackdrop` etc.). **Mais sensível de todo o roadmap** — mexe com sessão de qualquer usuário; já registrado no HANDOFF como algo a não começar sem alinhamento explícito. |
| Software Factory — 2 passos restantes (encadeados) | `/api/sf/project-files`, `/api/sf/generate-zip` | Mapeados em `SF_ENDPOINT_MAP` (bundle.js:10121-10128) no legado. Contratos já verificados contra `server.js` (não o nome, o código): `project-files` (`server.js:4576`) é assíncrono mas com payload/resposta diferentes dos outros passos — resultado vem em `data.files[]`, não `data.result`, e o corpo é `{description, accumulated_context, step1_analysis, step2_blueprint}`, não o `{module, step, total_steps}` padrão. `generate-zip` (`server.js:4700`) é síncrono e devolve um **stream ZIP binário**, não JSON — a UI precisa tratar como download de blob, padrão ainda não usado em nenhum outro lugar do Next. |
| Deploy dropdown (ZIP/merge-PR/CF Pages/EB/Docker) | `/api/deploy/trigger`, `/api/deploy/merge-pr`, `/api/deploy/pages`, `/api/deploy/eb`, `/api/deploy/zip-release` | Real e reachable no legado (`§50`/`§51`). **Não é uma lacuna a fechar casualmente** — a SPEC do Next proíbe explicitamente scripts de deploy nesta fase (seção 2, "Arquivos Proibidos"). Fica registrado aqui como paridade pendente, mas é uma decisão de escopo do usuário, não um "esqueceram de fazer". |

**2 grupos com trabalho real pendente** (excluindo a nota de escopo do deploy): Auth e os 2 endpoints SF encadeados restantes. Todo o resto da categoria (b) original (AI Provider Vault, Rollback, Missions History, Evidence, Agent badge, Hermes hint, Apply-Fix, 4 passos extra de SF, contexto de URL) foi migrado pra (a2).

**Caso à parte — Vault rollback:** `/api/vault/rollback/:id` existe e funciona no backend, mas **nenhum lugar do frontend legado chama essa rota** — só `snapshot` é chamado, automaticamente, como parte do pipeline de missão. Não é uma lacuna de paridade (o legado também não tem essa UI); seria escopo novo, não restauração de algo que já existiu.

**Caso à parte — Billing:** o painel de planos no legado (`§` linha 1826) está **explicitamente comentado como decoração**: *"Static roadmap display only. No auth, no OAuth, no billing, no key storage, no backend calls... Activation requires a separate explicit human-authorized phase."* O backend de billing é real e funciona (webhook Hotmart verificado), mas não há UI legada pra ter paridade — igual ao Vault rollback, seria escopo novo.

---

### (c) FALTA no Next, candidato a NÃO MIGRAR — com evidência objetiva

| Item | Evidência |
|---|---|
| `#vcSoftwareFactoryPage`/`#projectBuilder` (página SF dedicada) | O próprio `CLAUDE.md` já marca isso como fechado pra deleção (Fase 3.3d) — hoje causa a tela em branco na aba "Modo Avançado" do legado. Já era plano matar isso mesmo sem esta auditoria. |
| Tutorial `STEPS_SF` ("zumbi") + `_sfArchitectSend`/`_sfRenderArchitectResponse`/`_sfSetArchitectMode` | Comentado como morto pelos próprios autores do legado (bundle.js:8347-8348, 11097) — zero callers, parcialmente já removido em sessões passadas do legado. |
| `vision-core-clean-runtime.js` (312KB inteiro) | Não referenciado por nenhuma tag `<script>` em nenhuma página oficial. Fork abandonado (ver seção 0). |
| `vision-core-clean-state.js` (arquivo standalone em disco) | Conteúdo já vive dentro do `bundle.js` (idêntico byte-a-byte); o arquivo solto é cópia órfã, não perda de funcionalidade. |
| `v297UniversalChat`/`v297ChatLog`/`v297FileInput` (DOM oculto) | Comentário explícito no HTML: `<!-- legacy v297 IDs kept hidden for JS compat -->` — existem só pra JS antigo não quebrar com `null`, zero função própria. |
| Painel OSINT Tools (SpiderFoot/Recon-ng/Maryam) | Zero `fetch`, zero `addEventListener` em qualquer arquivo JS carregado — badges estáticos "DOCKER"/"SANDBOX". `CLAUDE.md` §98-F marca OSINT como "ROADMAP, NÃO TOCAR sem decisão de produto". |
| Painel OPENCLAW/OPENSQUAD | Mesmo padrão — zero listener no painel em si (o endpoint `/api/openclaw/orchestrate` É chamado de verdade, mas por outro fluxo, não por este painel). Mesma marcação §98-F. |
| `frontend/next.html` + `assets/vision-core-next.css` | Rascunho anterior do Next, substituído por `vision-core-next.html`/`vision-core-next-clean.css`. Já identificado como debris em sessão anterior (protocolo já orienta deixar quieto ou excluir do pacote de deploy — `bin/deploy-pages.sh` já faz isso). |
| IDs duplicados (`bar-hermes`/`val-*` em 2 painéis; `id="memory"` em 2 lugares) | Bug de markup do legado, não feature — Next não deve replicar a duplicação. |
| Cadeia de hotfix CSS `v297`→`v298`→`v298-final-hardened`→`v298-final-hard-fix2` | 4 arquivos carregados em sequência onde os últimos sobrescrevem seletores dos primeiros por ordem de cascata — peso morto real, mas só identificável seletor-a-seletor com um diff, não com grep. Não é feature, é débito técnico de CSS. |
| Diagrama "v33 orbit" (`#v33-t-*`, `#mcCore`) | Ancestral visual do "Atomic Core" — o `CLAUDE.md` já determina que o Atomic Core do Next é reimplementado do zero (SVG leve), nunca por portar esta estrutura HTML/JS. Não migrar é a decisão já tomada, esta auditoria só confirma que não há motivo pra revisitar isso. |

**13 itens candidatos a não migrar**, a maioria já identificada/decidida em sessões ou documentos anteriores — esta auditoria principalmente **confirma com evidência de código** o que já era plano, mais 4 achados novos (o arquivo `clean-runtime.js` órfão inteiro, os IDs duplicados, a cadeia de hotfix CSS, e a natureza real do "billing tem UI decorativa" que eu verifiquei agora).

---

## 2. CSS — 30 arquivos em `frontend/assets/`

| Status | Contagem | Detalhe |
|---|---|---|
| **ACTIVE (legacy)** | 27 | Concatenados uma vez em `vision-core-bundle.css` (293KB), carregado só por `index.html`. Nenhum é `<link>`ado individualmente por página nenhuma. |
| **ACTIVE (next)** | 1 | `vision-core-next-clean.css`, carregado por `vision-core-next.html`. |
| **ACTIVE (prototype only)** | 1 | `atomic-core.css`, carregado só por `atomic-core.html` (protótipo isolado, não é página oficial). |
| **ORPHAN** | 1 | `vision-core-next.css` — só referenciado por `frontend/next.html`, que não é uma das páginas oficiais (rascunho anterior, ver item (c) acima). |

Nenhum arquivo depende de `@import` interno entre CSS (checado — só 2 `@import` de Google Fonts existem no repo inteiro). Dentro dos 27 "ACTIVE (legacy)", a cadeia `v297`→`v298`-hotfixes (4 arquivos) é dead-weight parcial por cascata, já listada na seção (c).

**Relevante pra "encurtar o caminho até a substituição":** o Next já não depende de **nenhum** desses 27 arquivos legados (a SPEC já proíbe importar `vision-core-bundle.css`) — então o bloco inteiro de CSS legado (27 arquivos-fonte + o bundle de 293KB) só precisa continuar existindo enquanto `index.html` continuar servindo produção. Não há trabalho de CSS a fazer no Next por causa desta auditoria — é puramente candidato a exclusão quando o legado for desligado.

---

## 3. Tabela-resumo

| Categoria | Contagem | O que significa |
|---|---|---|
| **(a+a2) Já existe no Next** | 22 grupos de feature (13 da auditoria original + 9 adicionados depois; 2 deles Next já está à frente do legado) | Nenhuma ação necessária. |
| **(b) Falta, valor real confirmado** | 2 grupos (Auth, `project-files`+`generate-zip` de SF) | Trabalho de verdade — ver estimativa abaixo. |
| **(b, caso à parte) Escopo novo, não paridade** | 2 (Vault rollback como já existia, Billing checkout UI) | O legado também não tem essas UIs — não é lacuna de migração, é decisão de produto separada se quiser construir. |
| **(c) Candidato a não migrar** | 13 itens, com evidência objetiva cada um | Reduz a superfície de "o que falta" em ~13 itens que pareceriam pendências mas não são. |
| **CSS órfão/só-legado** | 28 de 30 arquivos (27 legado + 1 draft órfão) | Zero trabalho de CSS pro Next — já não depende de nada disso. |

**Estimativa honesta de turnos pro "falta de verdade" restante (item b):**

- **Auth (registro/login/OAuth Google+GitHub):** 2–3 turnos. É o item mais arriscado do roadmap inteiro (mexe com sessão de qualquer usuário, token HMAC caseiro sem refresh) — o próprio HANDOFF já registra isso como "não começar sem alinhamento explícito". Não é um turno normal de feature, é o tipo de trabalho que pede confirmação extra em cada passo.
- **Software Factory — `project-files` + `generate-zip`:** 1 turno. Contratos já verificados e documentados no HANDOFF (payload/resposta de `project-files` é diferente do padrão dos outros passos; `generate-zip` devolve um ZIP binário, não JSON — exige um padrão novo de download de blob no frontend). O trabalho que falta é só implementação, não mais descoberta de contrato.
- **Tudo mais da categoria (b) original — IMPLEMENTADO** entre 2026-07-08 e 2026-07-09: AI Provider Vault, Rollback, Missions History, Evidence, Agent Badge, Hermes hint, Apply-Fix, 4 passos extra de SF, contexto de URL (`fetch-url`).

**Total: ~3–4 turnos** no ritmo e disciplina desta linha de trabalho (fatia pequena, teste mockado + validação de contrato, commit+push por fatia) — descendo de ~6-7 na estimativa original. Deploy dropdown e Vault-rollback/Billing ficam de fora da conta — são decisões do usuário sobre se querem essas capacidades no Next, não itens de esforço a estimar.

---

## 4. Nota final

Este documento é só diagnóstico. **A decisão sobre o que efetivamente cortar, adiar ou portar é do usuário** — nenhum arquivo foi movido, deletado ou alterado nesta auditoria, e nenhuma exclusão deve acontecer sem aprovação explícita, mesmo para os itens da seção (c) com evidência forte de serem código morto.
