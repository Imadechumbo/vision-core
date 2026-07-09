# CURRENT HANDOFF — Vision Core Next

Documento vivo de revezamento entre agentes (Codex / Claude Code / OpenCode). Leia depois de `CLAUDE.md` e `docs/VISION_CORE_NEXT_FRONTEND_SPEC.md`, antes de editar código.

> Última atualização: 2026-07-09, por Claude Code (Sonnet 5) — **Métricas Next: camada visual sobre `/api/metrics/agents`, `/api/dora-metrics`, `/api/agent/status` (`next-clean-49`).** 100% frontend Next, backend/auth/go-core intocados, INCIDENTE-3/4 não tocados nesta sessão. A aba Métricas deixa de despejar JSON cru no chat e ganha painel dedicado (`#vcMetricsPanel`, mesmo padrão `hidden`-toggle + `:not([hidden])` de `vc-vault-rollback`/`vc-mission-history`): grid de agentes com dot/badge de status semântico (ok=verde, `binary_not_found`/`PENDING_EVIDENCE`=âmbar, resto não-ok=vermelho), chips de provider, barra de custo só quando `cost_usd` é número real (`null` vira texto "sem dados de custo", nunca barra/nunca "$0" — verificado em teste), linha TOTAL PIPELINE somando só valores numéricos, cards DORA (as strings "sem dados ..." já vêm prontas do backend), painel de conectividade humanizado, badge de fonte DADOS REAIS/FALLBACK LOCAL, toggle "Ver JSON bruto", loading skeleton estático (sem CSS keyframe — evita qualquer ambiguidade com a política de motion) e erro com retry manual. Polling 12s, só com a aba ativa e a página visível (reaproveita o gate `document.hidden` já usado pelo badge do agente). Spec permanente nova `tests/e2e/vision-core-next-metrics.spec.mjs` (7 testes) — suíte completa **32/32 PASS**. Nenhum deploy feito. Ver seção "Métricas Next — camada visual" abaixo. Sessão anterior: **INCIDENTE-4 (SESSION_SECRET), Fase A (investigação) fechada.** Achado do dogfood da Fase 1.5 (`vc-secret-guard`) investigado a fundo: `signSession()`/`verifySession()` são simétricas e caem no mesmo literal de fallback público quando `SESSION_SECRET` não está setado — quem conhece o literal e um `uid` real (um já está exposto em `backend/data/users.json`, commitado) forja uma sessão HMAC-válida de 24h para essa conta, sem senha, com acesso a rotas destrutivas (`DELETE /api/auth/me` — exclusão de conta LGPD) e de billing (`requireVisionAuth`: checkout/cancelamento/portal Stripe). 100% read-only — nenhum código alterado. Ver seção "INCIDENTE-4" abaixo. **Fase B (remediação) aguarda: (i) confirmação do usuário sobre `SESSION_SECRET` estar setado no EB real, (ii) aprovação da opção de remediação.** Sessão anterior: `vc-secret-guard` Fase 1.5 (refinamento de detecção) fechada — categoria nova `fallback_credential_literal` (forma exata do INCIDENTE-3) + `high_entropy_blob` restrito a posição de valor e penalizado por forma de identificador de código. Dogfood: `high_entropy_blob` 1410→53 (96,2%), meta de <50 não batida honestamente (reportado, não forçado). Achados reais no dogfood, NÃO corrigidos naquela fase (backend intocado) — ver seção "vc-secret-guard Fase 1.5" abaixo, achado nº1 daquela seção é a origem do INCIDENTE-4. 14 novos testes (43→57), 57/57 PASS. Fase 2 (hooks) segue gated. Antes dela: **INCIDENTE-3, Fase B fechada** (backend rejeita a credencial de fallback legada em register/login, bundle legado não a envia mais, regressão permanente 12/12 PASS, runbook de dados legados entregue, ação pendente do usuário). Ver seção "INCIDENTE-3" mais abaixo. Antes dela: doc-only `docs/LEGACY_DESIGN_REFERENCE.md`. Antes dessa: `vc-secret-guard` Fase 1 (protótipo local em Rust, fechada).

---

## INCIDENTE-4: SESSION_SECRET — Fase B (Opção A aprovada, 2026-07-09)

Aprovação explícita do usuário: **Opção A — fail-closed no boot**. A verificação read-only via AWS CLI local não retornou estado útil do EB, então a correção foi feita como hardening defensivo no código, sem assumir que produção já está segura.

Mudanças aplicadas:

- `backend/server.js`: `signSession()`/`verifySession()` não usam mais fallback público. O segredo de sessão agora é resolvido uma única vez no boot por `requireSessionSecret()`.
- Boot fail-closed com erro explícito se `SESSION_SECRET` estiver ausente, for igual ao fallback público conhecido ou tiver menos de 32 bytes UTF-8. O valor do segredo nunca é impresso pelo código novo.
- Testes/launchers locais que sobem `backend/server.js` real (`tools/tests/incident-3-auth-fallback.test.mjs`, `tools/tests/provider-vault-endpoints.test.mjs`, `tools/local-backend-runtime-launcher.mjs`, `tools/pi-harness.mjs`) passam `SESSION_SECRET` de teste/local explícito quando o ambiente não fornece um.
- `backend/.env.example` agora documenta `SESSION_SECRET` como variável real obrigatória de auth/session e deixa `JWT_SECRET` marcado como legado/não usado por `backend/server.js`.
- Regressão permanente nova: `tools/tests/incident-4-session-secret.test.mjs` prova que backend sem `SESSION_SECRET`, com fallback público ou com segredo curto morre antes de servir; com segredo forte explícito sobe e responde `/api/health`.

Implicação operacional obrigatória antes de deploy EB: `SESSION_SECRET` precisa existir no ambiente `vision-core-prod` com valor forte e diferente do fallback público. Se for setado/rotacionado, todas as sessões antigas serão invalidadas; isso é esperado e correto.

Operação pós-commit (2026-07-09, Codex): `SESSION_SECRET` foi configurado no EB `vision-core-prod` com valor forte gerado localmente e nunca impresso. Verificação read-only após estabilização: `SESSION_SECRET_PRESENT_STRONG`; EB `Ready/Green`; versão EB reportada `v109-725cfdcb71973b03963a7adcb43e3888b1808c58`; `/api/health` via Worker e EB direto retornou 200. Nenhum deploy manual de código foi iniciado nesta operação — o EB já reportava a versão do commit `725cfdcb` ao aplicar a configuração.

Validação de produção complementar (2026-07-09, Codex): o ZIP EB publicado para `v109-725cfdcb71973b03963a7adcb43e3888b1808c58` foi baixado de S3 e o `server.js` dentro dele contém tanto a rejeição do fallback legado do INCIDENTE-3 quanto o fail-closed de `SESSION_SECRET` do INCIDENTE-4. Teste vivo via `fetch` nativo contra Worker e EB direto: `POST /api/auth/login` com a credencial de fallback legada retorna `400 fallback_credential_rejected`, sem `token` e sem ecoar o valor na resposta. `POST /api/auth/register` não foi revalidado ao vivo nesta rodada porque os primeiros probes malformados consumiram o rate limit de registro do IP; o guard de register está confirmado no artefato publicado e já coberto pela regressão local permanente. Sem deploy novo nesta validação.

---

## Métricas Next — camada visual (2026-07-09, `next-clean-49`)

Protocolo de revezamento seguido: baseline verificado antes de começar (`HEAD=1c3658d0`, batia com o esperado, tree limpo, suíte 25/25). Escopo 100% frontend Next — `frontend/vision-core-next.html` + `assets/vision-core-next-clean.{js,css}` + spec nova. **Backend, auth, go-core, INCIDENTE-3/4 e Atomic Core/olho não foram tocados.**

### O que existia antes desta sessão

`metrics` era só uma entrada em `featureMap` (`vision-core-next-clean.js:139`, antes desta sessão) com 4 botões SAFE READ (`Resumo`/`Agentes`/`DORA`/`Memória`) que despejavam `JSON.stringify(data, null, 2)` truncado em 900 chars como mensagem de texto no chat, via `summarizeResult()`. Nenhum DOM dedicado, nenhum polling, nenhuma camada visual — exatamente o achado citado na tarefa.

### O que foi implementado

Painel novo `#vcMetricsPanel`, mesmo padrão dos outros paineis condicionais do Next (`hidden`-toggle em `selectFeature()` + regra `:not([hidden])` no CSS — a mesma classe de bug já documentada 2x antes nesta frente, GitHub PR e Mission Patch, evitada de propósito aqui). Consome **só** os 3 endpoints que a aba já usava (`/api/metrics/agents`, `/api/dora-metrics`, `/api/agent/status`) — `/api/metrics/summary`/`/api/metrics/memory` não entraram no escopo (a tarefa listou só os 3 primeiros).

- **Grid de agentes:** `.vc-metrics-agent-row` por agente — dot+badge de status (`statusTier()`: `ok`→verde, `binary_not_found`/`PENDING_EVIDENCE`→âmbar com o mesmo significado semântico do legado ("aguardando prova", não "falhou"), qualquer outro valor não-`ok`→vermelho), `note` quando presente, `active_providers` como chips.
- **Barra de custo condicional:** só renderiza `.vc-metrics-bar`/`.vc-metrics-bar-fill` quando `typeof cost_usd === 'number'` — `null` vira `.vc-metrics-no-cost` ("sem dados de custo"), nunca uma barra de largura zero disfarçada de dado real, nunca o literal "$0" para um agente sem dado. `cost_usd === 0` (zero real, distinto de ausência) é tratado como valor válido — renderiza `$0.000` com barra de largura 0, não cai no ramo "sem dados". Verificado por teste dedicado (item b abaixo) e por leitura de `backend/server.js:2455-2469` antes de codar: hoje **todo** `cost_usd` em produção é `null` (nunca computado), então esse é o caminho que a produção real bate 100% das vezes até o backend calcular custo de verdade.
- **TOTAL PIPELINE:** soma só os `cost_usd` numéricos; se nenhum agente tiver número, mostra "sem dados de custo" em vez de "$0".
- **Badge de fonte:** "DADOS REAIS" (verde) quando pelo menos 1 dos 3 fetches responde; "FALLBACK LOCAL" (âmbar) só quando os 3 falham — mesma semântica do `initObservabilityPanel107` do legado (`docs/LEGACY_DESIGN_REFERENCE.md`, seção 1), badge muda de estado só com resposta real, nunca fallback disfarçado.
- **DORA:** 6 cards (`deployment_frequency`/`lead_time`/`mttr`/`change_failure_rate`/`pass_gold_count_30d`/`total_pass_gold`) — as strings "sem dados PASS-GOLD"/"sem deploy-log"/etc. **já vêm prontas do backend** (`server.js:2561-2570`), o frontend só as exibe, não re-deriva vazio/erro — achado de contrato confirmado por leitura antes de codar, simplificou a implementação (não precisa de lógica extra de "estado vazio").
- **Conectividade:** dot verde/âmbar + `connected`/`mode`/`last_seen_ms_ago` humanizado (`humanizeMsAgo()`: "agora mesmo"/"há Ns"/"há Nmin"/"há Nh"/"nunca visto") + `agent_id` (quando presente) + `anti_stub` — texto, nunca JSON.
- **Toggle "Ver JSON bruto":** checkbox que mostra/esconde um `<pre>` com o último payload combinado (`{agents, dora, status}`) — o modo debug antigo não morreu, virou opção escondida atrás do toggle, como pedido.
- **Estados:** loading = skeleton estático (3 barras cinza, **sem `@keyframes`** — decisão deliberada para não ter que arbitrar se um shimmer de loading conta como "animação de entrada" sob a política VCMotion; mais simples e sem ambiguidade); erro = banner vermelho + botão "Tentar novamente" (chama a mesma função de carregamento); vazio honesto = "Nenhum agente reportado." quando `agents` vem como array vazio (distinto do texto de falha "Falha ao carregar métricas de agentes.", usado só quando o fetch falhou).
- **Polling:** 12s (>=10s pedido), só quando a aba Métricas está ativa E `!document.hidden` — reaproveita o mesmo listener de `visibilitychange` que já pausava o polling do badge do agente (`vision-core-next-clean.js:648-654`), estendido para também parar/retomar o polling de Métricas.
- **Motion:** o painel não tem animação de entrada própria (aparece already no estado final, tanto em `full` quanto em `reduced`) — decisão deliberada de tratar isso como um dashboard de dados, não como identidade de marca (diferente do Atomic Core/olho, que são as duas áreas protegidas com política de motion própria). Nenhuma leitura nova de `matchMedia`/`VCMotion` foi adicionada.

### Achado de teste (não de produto) — corrigido antes de fechar

O 1º rascunho do teste de status não-ok (`.vc-metrics-status-dot.vc-metrics-status-warn`) contava elementos no documento inteiro, não só no grid de agentes — o painel de conectividade também usa `.vc-metrics-status-warn` para "desconectado" (mesma classe, contexto diferente), inflando a contagem esperada em 1 quando o mock de `/api/agent/status` usado no teste também estava desconectado. Corrigido escopando o locator a `#vcMetricsAgentList` — bug do teste, não do componente (a classe reaproveitada é intencional, o teste que não escopava é que estava errado).

### Validação

- `node --check` limpo em `vision-core-next-clean.js` e no spec novo.
- Varredura estática: zero `innerHTML`/`insertAdjacentHTML`/`eval` no código novo, zero `!important` no CSS inteiro, zero cache-bust antigo (`next-clean-48`) restante em `frontend/`.
- Spec permanente nova `tests/e2e/vision-core-next-metrics.spec.mjs` (7 testes, mesmo critério "permanente" já registrado para os outros 4 specs desta frente — superfície ativa sendo construída em relay sem review por etapa): painel oculto fora da aba; (a) payload cheio renderiza cards+barras+DORA+conectividade; (b) `cost_usd` null nunca vira barra nem "$0"; (c) status não-ok pinta âmbar (`binary_not_found`/`PENDING_EVIDENCE`) ou vermelho (resto); (d) DORA "sem dados" renderiza como vazio honesto, não erro; (e) falha total nos 3 endpoints mostra badge FALLBACK LOCAL + retry, e o retry recupera dados reais; (f) toggle de JSON bruto mostra/esconde o payload como texto.
- Suíte permanente completa: **32/32 PASS** (25 anteriores + 7 novos).
- Screenshots reais via Playwright (`page.route` mockado, nunca rede real) dos dois estados pedidos — payload cheio (6 agentes, mix de status ok/âmbar/âmbar, barras só nos 2 com custo numérico, TOTAL PIPELINE=$0.184, 6 cards DORA, conectividade "Conectado") e vazio/offline (banner vermelho "Falha ao carregar métricas." + badge FALLBACK LOCAL + botão retry) — capturados via script descartável, não commitado (mesmo padrão "roda e apaga" já usado nesta frente para validação visual).

### Cache-bust e deploy

`?v=next-clean-49` (HTML+CSS+JS, os três juntos). **Nenhum deploy feito** — regra dura da tarefa, fica pronto no repo até aprovação explícita do usuário.

### O que ficou de fora (fora do escopo pedido, não esquecido)

`/api/metrics/summary` (runtime CPU/memória/heap) e `/api/metrics/memory` (memory layer §72/§107) do legado não foram conectados — a tarefa listou explicitamente só `/api/metrics/agents`/`/api/agent/status`/`/api/dora-metrics`. Ficam como próximo passo natural se o usuário quiser fechar a paridade visual completa da seção "Métricas" do `docs/LEGACY_DESIGN_REFERENCE.md` (que também cita esses dois blocos como "anexados dinamicamente só se o dado existir").

---

## `vc-secret-guard` Fase 1.5 (refinamento de detecção) — 2026-07-09

Autorização explícita do usuário: Fase 1.5, refinamento de detecção — **não** é a Fase 2 (hooks locais seguem gated). Baseline verificado antes de começar: `HEAD` = `431b6e3a` = `origin/main`, suíte permanente Next 25/25 PASS, `cargo test` 43/43 PASS. Escopo desta sessão: só `vc-secret-guard/` (crate) e `docs/VC_SECRET_GUARD_RUST_SPEC.md`/`CLAUDE.md`/este HANDOFF. **Backend/go-core/frontend/Next intocados. Nenhum deploy. Nenhuma entrada nova em `.vc-secret-guard.toml`** (`git diff` do arquivo é vazio — confirmado antes de fechar a sessão).

### Objetivo 1 — categoria nova `fallback_credential_literal`

Lição do INCIDENTE-3 (Fase B, `docs/CURRENT_HANDOFF.md` acima): a ocorrência ativa no bundle real tinha a forma `localStorage.getItem(...) || 'literal'` e nenhuma heurística da Fase 1 batia nela. Implementado em `src/categories.rs`:

- 4 formas: `expr || 'lit'`, `expr ?? 'lit'`, ternário `cond ? x : 'lit'`, e atribuição/parâmetro default `algoComContexto = 'lit'`.
- As 3 primeiras exigem sinal de contexto de credencial (`pw`/`pass`/`token`/`secret`/`key`/`auth`, como substring de qualquer identificador — `\b\w*(?:...)\w*\b`) em qualquer lugar da linha; a 4ª é self-contained (o próprio identificador atribuído já carrega o sinal).
- **Achado de dogfood durante a própria implementação, corrigido antes de fechar:** checar a linha crua inteira para o sinal de contexto falso-positivava pesado contra `'PASS_GOLD'`/`'PASS'` — constantes de status do próprio produto (o gate PASS GOLD) que contêm a substring "pass" sem ter nada a ver com credencial. Corrigido com `strip_quoted_content()`: o sinal de contexto só é procurado no "esqueleto de código" da linha, com o interior de toda string (`'...'`/`"..."`/`` `...` ``) apagado antes da checagem — reduziu esse achado de 118 para 82 ocorrências no dogfood do repo real (ver Objetivo 2 para o resto do relato de números).
- Teste negativo explícito, exigido pela autorização: `"retry || 'default'"` (sem nenhum sinal de contexto) não gera finding — `fallback_credential_literal_requires_context_or_fallback_without_credential_signal_is_not_flagged`.
- Fixture nova `tests/fixtures/fallback_credential_literal.txt` (forma do incidente, valor sintético — ver `tests/fixtures/README.md` para a justificativa anti-autoflagelo) + entrada em `each_category_is_detected_in_its_dedicated_fixture` + `known_raw_secrets_from_fixtures()` (invariante de masking coberto explicitamente para a categoria nova, como pedido).

**Precisão remanescente, honesta:** as 82 ocorrências restantes no dogfood do repo real são dominadas por colisão de substring com o vocabulário do próprio produto (`pass_gold`/`PASS_GOLD` contém "pass" como identificador de código legítimo, não só dentro de string — `strip_quoted_content()` não ajuda aqui) e `data-key`/`S3_KEY` (atributos/variáveis de CI legítimos contendo "key"). Isso não foi endereçado com caso especial hardcoded (instrução explícita da autorização) — é o mesmo tipo de imprecisão de heurística de substring já documentado para `provider_key_prefix` na Fase 1, aqui herdado da lista de palavras-sinal exigida literalmente pela autorização desta fase.

### Objetivo 2 — `high_entropy_blob` restrito a posição de valor + penalizado por forma de identificador

Duas mudanças em `src/categories.rs`/`src/entropy.rs`:

1. **Posição de valor:** em vez de tokenizar a linha inteira, só tokens dentro de string literal ou do lado direito de `=`/`:` (`value_position_regions()`, duas regexes novas: `value_quoted`/`value_kv`) entram no cálculo de entropia. Um identificador solto em posição de definição/chamada nunca cai em nenhuma das duas formas.
2. **Penalização por forma de identificador** (`looks_like_code_identifier()`, `entropy.rs`): token sem nenhum dígito, dividido (por `_`/`-`/transição camelCase) em ≥2 segmentos "pronunciáveis" → tratado como identificador, não como blob. Presença de QUALQUER dígito anula a penalização imediatamente (um secret real quase sempre tem dígito). Ajustado duas vezes durante o dogfood, ambas generalizações — não caso especial de nenhuma string específica:
   - `y` conta como vogal (`sync`/`try`/`by`) — sem isso, `sortProvidersByEffectivePriority` (achado real em `backend/server.js`) ainda flagrava por causa do segmento "By".
   - Segmentos de até 4 caracteres são aceitos sem exigir vogal — abreviação curta (`Id`/`Db`/`Ok`/`Btn`/`Pkg`/`Tpl`/`Cfg`, e o prefixo `vc` do próprio projeto) é exatamente o comprimento onde "precisa de vogal" para de ser sinal confiável; regra sobre comprimento de segmento, não sobre nenhum prefixo específico.

**Gate de aceite — não batido, reportado honestamente:**

| Estágio | `high_entropy_blob` no dogfood real (mesma allowlist, zero entrada nova) |
|---|---|
| Antes (baseline, `431b6e3a`) | **1410** |
| + posição de valor + penalização inicial (vogal sem `y`, só 2 chars sem vogal) | 126 |
| + `y` conta como vogal | 70 |
| + abreviação até 4 chars sem vogal | **53** |

Meta da autorização era `<50`. **Não batida — 53, 3 acima da meta.** Breakdown exato dos 53 restantes (nenhum suprimido por allowlist):

- **12** — literais sintéticos do próprio `vc-secret-guard` (`tests/scan_test.rs` 7, `src/entropy.rs` 3, `src/mask.rs` 2) — intencionais, mesma categoria de "ruído esperado" já registrada na Fase 1 para `categories.rs` (que já era allowlistado; estes três arquivos nunca foram).
- **6** — achados REAIS, não falso-positivo, não corrigidos nesta sessão (ver subseção própria abaixo): `backend/.env` (`JWT_SECRET`, 3 ocorrências) e `backend/data/users.json` (`password_hash` de uma conta de teste, 3 ocorrências — é 1 hash salt:hash, capturado 2x pelo split em `:`, mais um dedup incidental).
- **2** — `docs/VISUAL_GOLD_HARNESS_MANIFEST.json` (hash SHA-256 de conteúdo de arquivo, não é credencial — mesma classe já revisada na Fase 1 para `.vision-snapshots/*`, este arquivo especificamente não existia ou não foi amostrado naquela sessão).
- **~33** — `git_head` (SHA de commit, público por definição) e `e2e_evidence_receipt_id` em artefatos de stress-test na raiz (`_s130_*`/`_s131_*`/`_s132_*`/`_s133_*`) e `.vision-snapshots/*` aninhado sob `backend/`/`go-core/` (`hash` de conteúdo — mesma classe já revisada na Fase 1, mas o padrão de allowlist raiz `.vision-snapshots/*` só bate em ocorrências na RAIZ do path relativo; a engine de glob deste crate é deliberadamente sem `**` recursivo — README.md já documenta essa limitação como escolha consciente — então não cobre `backend/.vision-snapshots/*`/`go-core/.vision-snapshots/*`. **Bug pré-existente do allowlist, não introduzido nesta sessão** — corrigir exigiria ou estender a engine de glob para `**` ou adicionar entradas novas ao `.vc-secret-guard.toml`, e a autorização desta sessão proíbe explicitamente as duas coisas sem decisão nova do usuário (mudar o glob muda silenciosamente o efeito do allowlist já existente; adicionar entradas é literalmente vedado). Decisão registrada como pendência, não corrigida.

Não foi tentado forçar esses 3 restantes com supressão — a instrução era explícita ("se não alcançar <50 honestamente, reportar o número real"). Próximo passo real para fechar essa lacuna, se o usuário quiser: decidir entre estender o glob matcher (`policy.rs::glob_match`) para suportar `**`, ou adicionar entradas explícitas de allowlist para os dois diretórios `.vision-snapshots` aninhados — qualquer uma das duas fecha ~33 dos 53 de uma vez, sem tocar em nenhuma heurística de detecção.

### Achados reais do dogfood — NÃO corrigidos, decisão do usuário

Nenhum destes foi suprimido, allowlistado, ou corrigido — ficam visíveis no scan, igual ao padrão já estabelecido para o achado `vc-user-auto` na Fase 1.

1. **`backend/server.js:379,396` — `SESSION_SECRET` sem valor no `.env` cai num literal hardcoded (`'vision-core-dev-session-secret-change-me'`).** `signSession()` (linha 378) é a função que assina TODOS os tokens de sessão emitidos por register/login/OAuth (confirmado por grep: `signSession` é chamado nas 4 rotas de auth). **`SESSION_SECRET` não aparece na tabela de env vars do EB em `CLAUDE.md`** (a tabela lista `PROVIDER_VAULT_SECRET` como configurado no §206, mas nunca menciona `SESSION_SECRET`) — não é possível confirmar a partir deste repositório se está configurado em produção. Se não estiver, qualquer pessoa com leitura deste repositório público (ou do histórico) pode forjar um token de sessão válido para qualquer usuário. Mesma classe de risco do INCIDENTE-3, potencialmente mais severa (forja de sessão completa, não só registro). **Ação pendente do usuário:** confirmar se `SESSION_SECRET` está configurado no ambiente EB real; se não estiver, isso é um INCIDENTE-4 candidato.
2. **`backend/provider-vault-crypto.js:36` — `DEV_FALLBACK_SECRET = 'vision-core-dev-vault-secret-change-me'`.** Já é conhecido e documentado — `CLAUDE.md` (seção "AI PROVIDER VAULT") já registra `PROVIDER_VAULT_SECRET` como "configurado no §206... fallback dev hardcoded". Achado do guard bate com o achado já registrado — não é novidade, só confirma que o guard teria pego isso desde a Fase 1 se `high_entropy_blob` já tivesse essa precisão então.
3. **`backend/data/users.json` está commitado no git** (`git ls-files` confirma), com 1 conta (`fix-test@visioncore.dev`, criada 2026-05-29, plano free) incluindo `password_hash` real (formato salt:hash do próprio `hashPassword()` do backend). Introduzido no commit `2405b901` (§48, mensagem não relacionada — "patch engine match engine 5 estrategias" — o arquivo entrou incidentalmente). `.gitignore` só exclui `backend/data/*.sqlite`, não `*.json`. Não é dado de produção real (S3 é a fonte de verdade documentada em `CLAUDE.md`), é resíduo de teste local de uma sessão antiga — mas é, tecnicamente, um hash de senha commitado no histórico público do repositório. **Ação pendente do usuário:** decidir se vale invalidar essa conta de teste (mesmo runbook de `tools/incident-3-legacy-account-scan.mjs` poderia ser adaptado, ou simplesmente remover o arquivo e adicionar `backend/data/*.json` ao `.gitignore` — nenhuma das duas foi feita nesta sessão, fora de escopo).
4. **`backend/.env` (não commitado, confirmado gitignored) contém segredos reais locais** (`JWT_SECRET`, preços Stripe) — não é exposição de repositório, é exatamente o tipo de arquivo que a Fase 2 (hooks locais) existe para proteger antes do primeiro `git add` acidental. Confirma que a detecção funciona contra segredos reais, não só fixtures sintéticas.

### Validação final

`cargo test`: **57/57 PASS** (era 43/43 — 14 testes novos: 5 para `fallback_credential_literal` incluindo o teste negativo e o de falso-positivo de string, 3 para a restrição de posição de valor em `categories.rs`, 6 para a penalização de forma de identificador em `entropy.rs`). Suíte permanente Next (Playwright, formalidade — nada do Next foi tocado): **25/25 PASS**, rodada de novo antes do commit final. `git diff -- .vc-secret-guard.toml` vazio — confirmado zero entrada nova de allowlist. Nenhum valor real do INCIDENTE-3 aparece em nenhum arquivo tocado nesta sessão (só o valor sintético `zzFallbackNotReal01` na fixture nova).

### Fase 2 (hooks locais) — segue gated, pergunta em aberto herdada da Fase 1

Não iniciada nesta sessão (fora de escopo — autorização era explicitamente só Fase 1.5). Perguntas em aberto herdadas do handoff da Fase 1, ainda sem decisão: (a) se a heurística de `high_entropy_blob` deveria ficar ainda mais contextual antes de virar hook — parcialmente respondida nesta sessão (1410→53), mas a Fase 2 pode querer decidir se 53 é aceitável para um pre-commit hook real ou se vale fechar a lacuna do glob `**` primeiro; (b) o que fazer com achados reais como o `SESSION_SECRET`/`users.json` acima — decisão de produto separada do guard em si.

---

## Sessão doc-only — Política de herança visual + catálogo do legado — 2026-07-09

Escopo: **nenhum código**. Só `docs/LEGACY_DESIGN_REFERENCE.md` (novo) + 1 seção curta em `CLAUDE.md` + 1 linha em `docs/VISION_CORE_NEXT_FRONTEND_SPEC.md` + este HANDOFF. Backend/go-core/frontend legado intocados, nenhum arquivo do Next tocado, nenhum deploy.

### O que foi entregue

`docs/LEGACY_DESIGN_REFERENCE.md`: política oficial (legado = fonte de referência visual/UX, proibido copiar código; nenhuma feature nova nasce no legado — regra anti-novo-legado; divergência consciente do Next é permitida se registrada) + catálogo de 5 telas, cada afirmação rastreada a `arquivo:linha` real (navegado no código-fonte estático, nada executado). Achados de precisão que corrigem presunções da tarefa original, registrados no próprio doc em vez de silenciosamente ignorados:

- **A credencial hardcoded `[REDACTED_LEGACY_AUTH_FALLBACK]`** (achado do `vc-secret-guard` na sessão anterior) existe em **`vision-core-bundle.js`** (o bundle real, carregado por `index.html` em produção) — não só em `vision-core-clean-runtime.js` (fork abandonado, citado na tarefa original, mas que `VISION_CORE_NEXT_FRONTEND_SPEC.md` §11 já documentava como "não carregado por nenhuma página oficial"). As duas afirmações são compatíveis (o fork realmente não é carregado) mas a tarefa original conflava os dois arquivos como se fossem o mesmo — corrigido no doc, com os dois arquivo:linha citados.
- **A frase "copiloto que não confia em si mesmo"** (citada na tarefa original) **não existe** no código — confirmado por busca em `landing.html`/`about.html`. A frase real mais próxima é `landing.html:94`: *"Não é chatbot. Não é copiloto."* — registrado no doc pra não propagar uma citação que não bate com a fonte.
- **6 pilares na landing, não 3** — contagem verificada diretamente no DOM (`so-ia-grid compact-pillar-grid`, 6 `.so-ia-card`).
- **A "tabela comparativa"** (ANTES E DEPOIS) não é um elemento `<table>` HTML — é um layout de 2 colunas (`.loop-comparison`) com 6 passos pareados. Descrito com precisão no doc, sem chamar de "tabela" o que não é uma.
- **Software Factory no legado são DUAS UIs distintas**, não uma: (3a) geradores embutidos no chat + Auto-Pilot de 7 passos (`SF_AUTOPILOT_STEPS`), e (3b) a página standalone `#vcSoftwareFactoryPage`/`#projectBuilder` de 9 abas — que **já está decidida como "não será portada"** (`VISION_CORE_NEXT_FRONTEND_SPEC.md` §11, Categoria C, Fase 3.3d). O doc cataloga as duas separadamente para não reabrir por engano uma decisão já fechada.
- **Dois sistemas de numeração "SF-01"…"SF-09" coexistem no legado, sem relação entre si**: um mapeia módulos da página 3b para a Spec Library de 120 specs (`SF_MODULE_SPEC_MAP`); outro (citado em `about.html:753`, §139) rotula os 8 `SF_GENERATORS` do backend. Documentado explicitamente pra próxima sessão não presumir que são a mesma lista.
- **Contagem real de agentes no grid:** 11 cards (`backend`, `database`, `auth`, `upload_media`, `config`, `network`, `locator`, `security`, `validator`, `architect`, `memory`) — confirmado por contagem direta no DOM, não repetida de memória de sessões anteriores (que citavam "15 agentes" num contexto diferente, o catálogo completo de `/api/agents/catalog`, não necessariamente igual à contagem de cards estáticos no HTML).

### Status de migração registrado (tabela completa no doc)

Métricas e Agentes: dado já portado (SAFE READ, texto no chat via `featureMap`), visual (barras/chips/badge de cor/grid de cards/tri-state) não iniciado. Software Factory (3a): divergência consciente registrada — Next reimplementou do zero com Auto-Pilot 5+1 passos e UX de chat-log, não replica a sequência de 7 passos nem a UI do legado. `project-files`/`generate-zip`: não iniciado, sem bloqueio de backend (contrato já verificado em sessão anterior). Software Factory (3b), Landing, About: não serão portados — decisões já existentes (SPEC §7 e §11), não reabertas aqui.

### Validação

Suíte permanente Next: **25/25 PASS**, rodada antes de começar (confirma estado esperado do protocolo) e nenhum arquivo do Next foi tocado nesta sessão, então zero risco de regressão. `git status`/`git log -3` conferidos no início — `HEAD` batia com `c7a0994a` esperado, tree limpo (só o ruído pré-existente já documentado em sessões anteriores).

---

## Sessão `vc-secret-guard` Fase 1 (protótipo local) — 2026-07-09

Autorização explícita do usuário para a Fase 1 (protótipo local, spec §10). Escopo: crate Rust real, SOMENTE `scan`, testes, dogfood contra o próprio repo. **Backend/go-core/frontend intocados** — só arquivos novos (`vc-secret-guard/`, `.vc-secret-guard.toml` na raiz) e este HANDOFF/`CLAUDE.md`.

### O que foi entregue (4 commits isolados, todos pushados)

1. **Scaffold do crate** (`Cargo.toml`/`Cargo.lock`/`.gitignore`, `src/main.rs`, `src/lib.rs`, `src/stub.rs`) — crate independente, sem workspace compartilhado. `main.rs` é casca fina sobre `lib.rs::run()` — permite testes de integração chamarem a biblioteca direto, sem `assert_cmd`/subprocess.
2. **Motor de detecção** (`src/categories.rs`, `entropy.rs`, `mask.rs`, `policy.rs`, `scanner.rs`, `event.rs`) — as 5 categorias da spec §6 implementadas literalmente, allowlist (`.vc-secret-guard.toml`) por caminho/categoria/hash, masking (`mask.rs`) como único ponto de saída de um valor derivado do secret.
3. **Testes** (`tests/fixtures/*` + `tests/scan_test.rs`) — fixtures sintéticas documentadas (`tests/fixtures/README.md`, regra anti-autoflagelo §7). **43/43 testes PASS** (38 unit + 5 integration), rodado localmente via `cargo test` contra `stable-x86_64-pc-windows-gnu`.
4. **Docs** (este commit) — `vc-secret-guard/README.md` (dependências justificadas, formato do `.toml`, uso), `.vc-secret-guard.toml` raiz (allowlist real do repo, construída durante o dogfood), `CLAUDE.md` + este HANDOFF.

### Achado de ambiente, não do código: toolchain Rust ausente e schannel bloqueando cargo

Este ambiente não tinha Rust instalado (nem em Bash nem em PowerShell, sem `~/.cargo`/`~/.rustup`). Sem resposta do usuário a tempo sobre como proceder, segui a opção recomendada (reversível, sem tocar no projeto): instalei via `rustup-init.exe` (download por `Invoke-WebRequest`, instalação padrão de usuário, sem admin). **Achado 1:** o toolchain MSVC padrão (`stable-x86_64-pc-windows-msvc`) não linka nesta máquina — falta o Visual C++ Build Tools (`link.exe`), instalação pesada demais para este propósito. Troquei para `stable-x86_64-pc-windows-gnu` (via `rustup toolchain install` + `rustup default`), que já vem com o linker MinGW embutido — build+run confirmados com um crate hello-world descartável antes de tocar no crate real. **Achado 2:** `cargo` (schannel do Windows) falhava toda operação de rede com `CRYPT_E_NO_REVOCATION_CHECK` — mesma classe de limitação já documentada neste `CLAUDE.md` pra boto3/node-gyp. Contornado com `CARGO_HTTP_CHECK_REVOKE=false` (variável de ambiente, workaround documentado oficialmente pelo próprio cargo pra esse erro específico). **Achado 3, cosmético:** `cargo build`/`test` imprimem um aviso "Acesso negado" ao tentar finalizar o diretório de cache de compilação incremental — não afeta o resultado (build/test completam com sucesso), só torna rebuilds um pouco mais lentos; contornado nas chamadas seguintes com `CARGO_INCREMENTAL=0`. Nenhum desses 3 achados é specífico do código deste crate — são do ambiente, registrados aqui pra próxima sessão não perder tempo redescobrindo.

**Pendência explícita, não escondida (restrição do usuário: "isso fica registrado no HANDOFF como pendência, não como gambiarra silenciosa"):** o CI existente do repositório (GitHub Actions, Playwright/Node) **não tem toolchain Rust configurado**. `cargo test` roda hoje só localmente, nesta máquina, com as 3 variáveis de ambiente acima setadas manualmente a cada sessão de shell (não persistem entre chamadas de ferramenta). Adicionar Rust ao CI é trabalho de infraestrutura fora do escopo desta Fase 1 (que pedia só o protótipo local) — decisão de quando fazer isso fica para quando `vc-secret-guard` for além do "protótipo" (provavelmente Fase 2, hooks).

### Dogfood contra o próprio repo Vision Core — resultado bruto, revisado item a item

Primeira rodada (sem policy, regex original): **25.657 achados** — `high_entropy_blob` 25.626, `credential_field` 16, `provider_key_prefix` 9, `connection_string` 8, `bearer_token` 2.

**Os 35 achados não-`high_entropy_blob` foram revisados um por um, manualmente, lendo o arquivo de origem antes de qualquer conclusão** (não assumido). Nenhum é um secret real novo. Breakdown:
- 2 bugs reais de regex, corrigidos no código (não no achado):
  - `provider_key_prefix` (`\b[a-z]{2,5}-[A-Za-z0-9]{20,60}\b`) era genérico demais — batia em `tools/_archive/root-deploy/_deploy100_eb.py:20` (`pos-renderApplyFixPanel`, nome de hook, nada a ver com secret) e em 3 arquivos `tools/_archive/tests/tools-root/*.test.mjs` (`snap-id-000000000000000000000000`, ID de snapshot zerado). Corrigido: tabela curada de prefixos conhecidos (`sk|pk|ak|rk|gh|gl|xox`) em vez de "qualquer 2-5 letras minúsculas" — alinhado ao texto original da spec §6 ("prefixos CONHECIDOS", "tabela de prefixos"), não uma mudança de escopo.
  - `connection_string` não excluía interpolação de variável — `.github/workflows/mirror-to-gitlab.yml:40` tem `"https://oauth2:${GITLAB_TOKEN}@gitlab.com/..."`, onde `${GITLAB_TOKEN}` é populado em runtime a partir de `secrets.GITLAB_MIRROR_TOKEN` do GitHub Actions (confirmado lendo o workflow inteiro, linhas 1-42) — nunca um literal no arquivo. **Isto NÃO é o incidente real do GitLab que motivou a feature** (aquele foi uma URL de `git remote -v` com credencial de verdade embutida, fora deste repo) — é um falso positivo do regex batendo numa sintaxe de CI legítima. Corrigido: `looks_like_variable_reference()` exclui `${VAR}`/`$VAR`/`%VAR%` do que conta como "senha capturada", mesmo princípio já usado por `credential_field` pra `process.env.X`.
- 1 achado real, mas não novo e deliberadamente não suprimido: `frontend/assets/vision-core-clean-runtime.js:6301,6323` tem `password: '[REDACTED_LEGACY_AUTH_FALLBACK]'` hardcoded — usado num fluxo de auto-registro de conta demo no bundle **legado, já público** (servido via CDN a qualquer visitante antes desta sessão — não é uma exposição nova). Não é da classe dos incidentes que motivaram a feature (não é uma chave de API, não é uma credencial administrativa) mas é, tecnicamente, um literal de senha hardcoded — **deixado visível de propósito no `.vc-secret-guard.toml` raiz** (não allowlistado), pra decisão humana explícita, conforme instrução "se flagrar algo real, PARE e me reporte antes de qualquer ação". Um comentário em `tools/_archive/root-tests/_test145_auth_unit.cjs:26` cita a mesma string, mas cai dentro do allowlist geral de `tools/_archive/*` (redundante com o achado já visível acima, não esconde informação nova).
- O resto (30 achados) são todos fixtures/testes pré-existentes, desenhados de propósito para conter segredos sintéticos e testar a própria detecção de segredos do produto — confirmados lendo cada arquivo: `_fixture_stress/src/level3_security.py:6` (fixture do próprio go-core pra `AEGIS_SECRET_010`, já documentada em `CLAUDE.md` §133), `go-core/internal/patcher/operations_test.go:207` e `go-core/internal/planning/rule_mapping_test.go:292` (testes Go do próprio go-core pra sua lógica de redação), `stress-test-vision-core.cjs:396,485` (senha de teste `stress123` pra criar contas descartáveis no stress test), `scripts/stress-test-sf-vision-core.js:523` (payload de teste da Software Factory pra validar que ela detecta `ANTHROPIC_API_KEY`/`postgresql://...` expostos — mesmo caso do achado SF-STRESS-09 já documentado em `about.html`), `tools/tests/provider-vault-endpoints.test.mjs:81,106` (chaves fake pra testar o masking do AI Provider Vault), `tools/_archive/root-reports/vision-core-frontfix.patch:210` (`"demo-token-" + Date.now()`), e os fixtures/testes/spec do próprio `vc-secret-guard` (esperado — documentados em `tests/fixtures/README.md`).

### Allowlist raiz — de 25.657 pra 1.408, honestamente, sem forçar zero

Depois dos 2 fixes de regex + `.vc-secret-guard.toml` (cada entrada revisada individualmente antes de entrar, comentada no próprio arquivo — nenhuma suprimida "no escuro"): **1.408 achados restantes**, dos quais 1.406 são `high_entropy_blob` e 2 são o achado real do `[REDACTED_LEGACY_AUTH_FALLBACK]` (deliberadamente não suprimido, ver acima).

**Amostrado manualmente pra confirmar que não é secret escondido:** `backend/server.js` (43 achados, o maior arquivo de produção ainda no ruído) — lido o contexto de cada linha, todos são nomes de função/identificador camelCase longos (`passGoldCandidateFromResult`, `normalizeEvidenceReceipt`, etc.) que por acaso misturam classes de caractere o suficiente pra passar no heurístico de entropia. Nenhum secret. `.vision-snapshots/*` (o maior bloco antes de entrar no allowlist, 720 arquivos) é hash SHA-256 de conteúdo (campo `"hash"` de snapshot de backup do Vision Agent) — confirmado lendo um arquivo de exemplo, allowlistado.

**Decisão consciente de não forçar o resto pra zero:** os 1.406 `high_entropy_blob` restantes (`frontend/assets` 666, `tools/*.mjs` de governança ~150, `backend/*.js` diversos, docs longos) seguem o mesmo padrão confirmado em `backend/server.js` — identificador de código, não secret. Continuar caçando cada um individualmente neste turno seria desproporcional (a heurística de entropia contra código-fonte real de linguagem com identificadores longos é imprecisa por natureza — esse é o limite real, não falta de allowlist). Reportado honestamente como **não-zero**, em vez de forçar um allowlist gigante e genérico demais que arriscaria esconder um secret real futuro atrás de um padrão amplo demais. Candidatos a próximo passo (não decisão tomada): (a) heurística de `high_entropy_blob` mais contextual (só perto de atribuição/aspas, como `credential_field` já faz), (b) allowlist incremental conforme uso real em hooks/watch (Fase 2/3), não uma tentativa de cobrir o repo inteiro de uma vez.

### Validação final

`cargo test` (crate): 43/43 PASS após os 2 fixes de regex (incluindo os novos testes de regressão que travam especificamente os 2 bugs achados no dogfood). Suíte permanente Playwright (Next, não tocado nesta sessão): **25/25 PASS**, rodada de novo antes do commit final pra confirmar zero impacto. `AGENT_APPLY_ENABLED` e as travas `sf_options` seguem `false` (nenhum arquivo do Next/backend tocado).

### Próxima etapa — Fase 2 (hooks locais), só com nova aprovação

Spec §10: `install-hooks`, `pre-commit`/`pre-push` fail-closed, testado contra um repositório git de teste descartável. **Não começar sem o usuário autorizar explicitamente esta fase** — mesmo padrão das fases anteriores (autorização em bloco não cobre automaticamente a próxima fase). Antes de começar, também vale decidir com o usuário: (a) se a heurística de `high_entropy_blob` deve ficar mais contextual antes de virar hook (reduzir ruído em `pre-commit` real), (b) o que fazer com o achado do `[REDACTED_LEGACY_AUTH_FALLBACK]` (fora do escopo do vc-secret-guard em si — é uma decisão de produto sobre o bundle legado).

---

## Sessão `vc-secret-guard` Fase 0 (spec-only) — 2026-07-09 (histórico)


## Sessão `vc-secret-guard` (spec-only) — 2026-07-09

Nova feature oficial, **fase 0/6 (spec) fechada, nenhuma fase seguinte autorizada**. Motivada por 2 incidentes reais do projeto: token GitLab exposto em `git remote -v`, e `agent_secret` vazando via `GET /mission/result/:id` (já documentado e corrigido — ver seção "Pareamento por `agent_secret`" em `CLAUDE.md`).

**Entregue nesta sessão (3 commits isolados, todos pushados):**
1. `10e27403` — `docs/VC_SECRET_GUARD_RUST_SPEC.md`: spec completa. Arquitetura real do projeto verificada no código antes de escrever (não presumida) — `server.js`=gateway (`resolveGoBinary()` `server.js:2444`, `GET /api/go-core/health` `server.js:1612-1613`), `go-core`=safe core com Aegis (`internal/scanner/scanner.go`=read-only, `internal/patcher/supervised.go`=nunca automático, `internal/passgold`+`internal/passsecure`=contratos JSON com exit code, `internal/github/open_pr.go`=write-gate com 4 condições, `internal/mcpserver`=read-only por design, `internal/security/secrets/secrets.go`=regras `AEGIS_SECRET_001`…`010` já existentes). Decisão "Rust vs módulo Go" comparada honestamente dos dois lados (não só a favor da conclusão já tomada) — fronteira final: guard decide "isso pode entrar no git agora?" no momento local; Aegis decide "esse código está seguro pra ser promovido?" dentro de uma missão já em andamento sobre o projeto inteiro. Zero sobreposição. 5 categorias de detecção descritas por forma/heurística, nunca lista fixa de strings. Plano de 6 fases (0=spec/esta, 1=protótipo local, 2=hooks, 3=watch+evento JSON, 4=integração `server.js`/Next, 5=ponte `PASS SECURE`), cada uma com gate de saída próprio.
2. `2da2be36` — `CLAUDE.md`: seção "SPEC OFICIAL — vc-secret-guard (Rust)" com link + resumo, inserida antes da seção "Atomic Core — APROVADO".
3. `99bfc545` — Páginas públicas, **seguindo o padrão editorial já existente** (reportado antes de editar, não presumido): `frontend/about.html` ganhou `BLOCO 2.6: SECURITY LAB — vc-secret-guard`, mesma estrutura visual do `BLOCO 2.5: AGENTE ARQUITETO` (2 colunas, mesmo grid/card style), mas com badge `SPEC — NÃO IMPLEMENTADO` (vermelho) em vez de `LIVE — PREVIEW` (índigo) — honesto sobre zero código existir, seguindo a mesma disciplina que rege "O QUE OS TESTES REVELARAM" (nunca declarar resolvido sem teste real). `frontend/landing.html` ganhou 1 card `bn-card bn-low`/label `EM EVOLUÇÃO` na seção TRANSPARÊNCIA TÉCNICA, mesmo formato dos outros itens de roadmap ainda não resolvidos. **Confirmado por grep, zero string literal de padrão de detecção de secret em qualquer um dos dois arquivos** (só nomes de regra tipo `AEGIS_SECRET_001` como rótulo, nunca o padrão em si) — os poucos matches de `sk-`/`sk_test_`/etc. encontrados no grep de verificação são todos conteúdo pré-existente não relacionado a esta sessão (depoimentos antigos, ofuscados/fictícios como `sk-prod-abc123xyz789`).

**Estrutura das páginas públicas, como relatado antes de editar (Tarefa 3 pedia isso explicitamente):** `about.html` já tinha um padrão de 3 tipos de bloco reaproveitados — blocos de feature "o que X faz hoje" (BLOCO 1/2/2.5, 2 colunas, badge de status), uma grade grande de depoimentos "O QUE OS TESTES REVELARAM" (card por bug real encontrado via teste real, nunca especulativo), e um roadmap "POTENCIAIS DE EVOLUÇÃO" (badge `ROADMAP — NÃO IMPLEMENTADO`, texto simples sem teste). Como `vc-secret-guard` tem uma spec formal completa (mais que um item de roadmap vago, mas menos que uma feature testada), a decisão foi criar um bloco de feature igual ao `BLOCO 2.5` só que com um badge honesto novo (`SPEC — NÃO IMPLEMENTADO`) — não usar a grade de depoimentos (reservada a bugs reais de testes reais) nem deixar só como item de `POTENCIAIS DE EVOLUÇÃO` (já tem spec, não é mais só ideia vaga). `landing.html` segue o padrão já documentado no próprio `CLAUDE.md` ("PADRÃO DE REGISTRO"): card `EM EVOLUÇÃO` até virar `RESOLVIDO — VX.X.X` com teste real certificando.

**Validação:** suíte permanente completa (4 specs Next, 25/25 PASS) rodada de novo antes do commit final — nenhum dos 3 commits desta linha toca `frontend/vision-core-next.html`/`assets/vision-core-next-clean.*`, então era esperado zero impacto, confirmado. `node -e` confirmou os dois HTMLs públicos ainda são JS/texto válido (sem parse error introduzido). Nenhum deploy feito (páginas públicas exigem validação local antes, regra já existente no `CLAUDE.md`, e o usuário não pediu deploy nesta tarefa — só "commit por fatia... push... HANDOFF... PARE").

**Zero Rust escrito. Zero backend (`server.js`/`go-core`) tocado. Zero deploy. Nenhuma fase além da 0 autorizada — próxima fase (protótipo local) exige nova conversa e aprovação explícita.**

---

## Decisão de produto desta sessão (fixar, não reabrir sem novo motivo do dono do produto)

**"Animação = marca; controle de acessibilidade é do VC, não do OS."**

O fix `v47` (sessão anterior) tinha o Atomic Core degradando automaticamente sempre que o SO reportava `prefers-reduced-motion: reduce`. O usuário corrigiu essa direção: a animação do Atomic Core é identidade visual do Vision Core, e o produto deve ter controle **próprio** de acessibilidade — o SO não decide por ele. Regra nova, implementada nesta sessão:

1. **Fonte de verdade = `window.VCMotion`** (`frontend/assets/vision-core-next-clean.js:1-44`), backed by `localStorage['vc_animation_mode']` (`'full'` | `'reduced'`). API: `getMode()`, `isReduced()`, `setMode(mode)`, `onChange(cb)`.
2. **Default = `'full'`**, sempre — mesmo com o SO em reduce. Nenhum código de animação lê `matchMedia('(prefers-reduced-motion...)')` diretamente para decidir o que animar (as únicas 2 exceções legítimas, confirmadas por grep no JS servido em produção: o blink do olho/logo — área protegida, decisão de UX aprovada em sessão anterior, fora do escopo desta mudança — e a dica de primeira visita do item 4 abaixo, que só decide se mostra um aviso, nunca o que animar).
3. **Modo reduzido** (quando o usuário escolhe via Settings): mesmo pulso sutil de opacidade/glow do `v47` (nunca congelado) — não foi redesenhado, só re-acoplado a uma fonte de verdade diferente.
4. **Troca ao vivo, sem reload:** `startMotionLoop()`/`stopMotionLoop()` (`vision-core-next-clean.js:1788-1806`) são reinvocáveis — `VCMotion.onChange` dispara a troca do loop (rAF ↔ tick de 500ms) na hora.
5. **Settings → Animações** (`#vcAnimationReduced`, dentro de `#vcSettingsPanel`): novo checkbox, único ponto de UI para o controle. Nenhum controle equivalente existia no front antigo nem em nenhum outro lugar do Next — confirmado por grep exaustivo antes de implementar (`vision-core-bundle.js`, `vision-core-clean-runtime.js`, `vision-core-clean-state.js`, Next JS/HTML) — é funcionalidade nova, não portada.
6. **Dica de primeira visita (opcional, discreta):** se o SO reporta reduce E o usuário nunca escolheu um modo no VC, uma mensagem única no chat (`ACESSIBILIDADE`) aponta o Settings → Animações — consciência, não imposição. Guardada por `localStorage['vc_motion_hint_shown']`, dispara só 1x.
7. **Badge de conexão do agente:** não tinha nenhuma lógica de animação/`matchMedia` prévia (confirmado por grep em sessão anterior) — `window.VCMotion` está disponível globalmente para ele ou qualquer widget futuro consumir, mas não havia comportamento a migrar.

---

## Estado Atual

- **Commit local = commit remoto (`origin/main`):** `99bfc545` — `docs(public): registra vc-secret-guard nas paginas publicas (spec-only)`. Já pushado (rebase limpo sobre commits do bot de CI, sem conflito). Precedido por `2da2be36` (CLAUDE.md) e `10e27403` (spec) na mesma sessão — 3 fatias isoladas, todas docs-only.
- **`vc-secret-guard`:** fase 0/6 (spec) fechada — `docs/VC_SECRET_GUARD_RUST_SPEC.md`. Zero Rust, zero backend tocado, zero deploy. Ver seção própria abaixo.
- **Cache-bust atual:** `?v=next-clean-48` (HTML+CSS+JS, os três juntos).
- **Produção (`https://visioncoreai.pages.dev`):** **`next-clean-48`**, deploy CF Pages, verificado por **fetch real via `node -e fetch(...)`** antes de reportar (não assumido) — hash `https://65c71559.visioncoreai.pages.dev` (status 200) e alias principal (status 200), os dois com `?v=next-clean-48`, `AGENT_APPLY_ENABLED=false` confirmado no JS servido, `window.VCMotion`/`vc_animation_mode`/`startMotionLoop` confirmados presentes, exatamente 2 ocorrências de leitura direta de `matchMedia('(prefers-reduced-motion: reduce)')` no JS servido (olho/blink protegido + dica de primeira visita — nenhuma leitura a mais, nenhuma a menos), CSS servido confirmado com `.vc-settings-motion`. **Backend EB não foi tocado.**
- **`AGENT_APPLY_ENABLED=false`** e todas as travas `sf_options` (`real_execution_allowed`/`deploy_allowed`/`writes_disk`) continuam `false`.
- **5 specs permanentes, 25/25 PASS:** `vision-core-next-agent-apply.spec.mjs` (4), `vision-core-next-sf.spec.mjs` (9), `vision-core-next-apply-fix.spec.mjs` (7), `vision-core-next-atomic-core.spec.mjs` (5 — **reescrito nesta sessão**, agora servido via `http.createServer` local em vez de `file://`).
- **`docs/PARITY_AUDIT.md`** sem mudanças nesta sessão — próxima etapa continua sendo os 2 itens reais restantes (ver seção abaixo).

---

## O que esta sessão fez

Correção de direção de produto pedida pelo usuário (ver seção acima). Trabalho puramente aditivo/re-acoplamento, sem mudar o comportamento visual do modo reduzido em si:

1. Criado `window.VCMotion` no topo de `vision-core-next-clean.js` — único ponto de leitura/escrita do modo de animação.
2. Atomic Core: `reduceMotion` inicial passou a ler `isReducedMotion()` (VCMotion) em vez de `matchMedia` direto. Bootstrap do loop refatorado em `startMotionLoop()`/`stopMotionLoop()` reinvocáveis, com `VCMotion.onChange` acoplado para trocar o loop ao vivo sem reload.
3. Settings: novo bloco `.vc-settings-motion` em `#vcSettingsPanel` (HTML) + checkbox `#vcAnimationReduced` (JS, lê/escreve via `VCMotion`) + CSS a partir da âncora `.vc-settings-list` já existente no arquivo.
4. Dica de primeira visita implementada conforme item 4 da instrução — único outro lugar do arquivo que lê `matchMedia` diretamente, só para decidir se mostra o aviso.
5. `tests/e2e/vision-core-next-atomic-core.spec.mjs` **reescrito por completo**: agora sobe um `http.createServer` local descartável servindo `frontend/` (nunca `file://`) dentro do próprio spec (`test.beforeAll`/`afterAll`), porque a regra nova depende de combinar dois inputs reais e independentes — `page.emulateMedia()` (sinal do SO) e `page.addInitScript(() => localStorage.setItem(...))` (escolha do VC) — de forma confiável, o que exige um `origin` http real (mesma disciplina empírica já estabelecida na sessão do `v47` sobre `page.emulateMedia()` vs `test.use()`). 5 testes: (a) default+OS-reduce roda completo, (b) default+no-preference roda completo, (c) VC=reduced vence sobre OS=no-preference, (d) troca ao vivo via checkbox sem reload (full→reduced→full), (e) transição de estado sob VC=reduced sem crash.
6. Cache-bust `v48`, commit (`ecf1fadc`, rebase sobre o commit do bot de CI sem conflito), push, deploy, verificação por fetch real (hash + alias).

---

## Próxima etapa

### 0. `vc-secret-guard` — Fase 1 (protótipo local), só com aprovação explícita nova

Spec fechada (`docs/VC_SECRET_GUARD_RUST_SPEC.md`, fase 0/6). Fase 1 = binário Rust mínimo, só `scan` (sem `watch`, sem hooks), rodando localmente contra o próprio Vision Core, nunca publicado/CI. Gate de saída da Fase 1 (definido na spec, §10): zero falso-positivo contra o repo real após allowlist configurada + zero falso-negativo contra casos sintéticos cobrindo as 5 categorias. **Não iniciar sem o usuário autorizar explicitamente esta fase especificamente** — é uma linha de trabalho nova (nova linguagem no projeto, novo binário), tratada com o mesmo rigor que Auth (item abaixo).

### Itens restantes da categoria B (Vision Core Next)

#### 1. Software Factory — `project-files` + `generate-zip` (contratos já verificados, prontos pra usar)

| Endpoint | Linha | Tipo | Contrato |
|---|---|---|---|
| `POST /api/sf/project-files` | `server.js:4576` | **Assíncrono** (`job_id`+poll), payload/resposta diferentes dos outros passos | Body: `{description, accumulated_context, step1_analysis, step2_blueprint}` — não o `{description, module, autopilot, step, total_steps, sf_options}` padrão. Ramifica por complexidade (`_detectComplexity`) em prompts longos (§193/A2). No `GET /api/sf/job/:id`, o resultado vem em **`data.files[]`, não em `data.result`** — único endpoint SF onde isso acontece de verdade. |
| `POST /api/sf/generate-zip` | `server.js:4700` | **Síncrono, resposta binária** | Body: `{files: [{name, content}], project}`. Resposta é um stream ZIP real (`Content-Type: application/zip`), não JSON — frontend precisa tratar como download de blob (`response.blob()` + `URL.createObjectURL` + `<a download>`, padrão ainda não usado em nenhum lugar do Next). Depende logicamente de `project-files` já ter rodado, mas o backend não impõe a ordem. |

Sugestão (não é decisão tomada): um só turno, os dois juntos — fazem sentido como par (gerar lista de arquivos → baixar como zip), não como features separadas.

#### 2. Auth (registro/login/OAuth Google+GitHub) — não iniciar sem alinhamento explícito

Mais arriscado do roadmap inteiro — mexe com sessão de qualquer usuário, token HMAC caseiro sem endpoint de refresh. Repetido em pendências de múltiplas sessões anteriores. Continua precisando de decisão explícita do usuário antes de começar.

### Fora de escopo, decisões já tomadas (não revisitar sem novo motivo)

- **Deploy dropdown** — bloqueado pela SPEC (seção "FORA DE ESCOPO"). Decisão de escopo do usuário.
- **Vault rollback como "paridade"** e **Billing checkout UI** — o legado nunca teve essas UIs também; não são lacunas de migração, seriam escopo novo se o usuário quiser.
- **13 itens candidatos a não migrar** (`docs/PARITY_AUDIT.md` seção c) — evidência forte de código morto, mas nenhuma exclusão sem aprovação explícita.
- **Olho/logo (blink)** — protegido, aprovação explícita necessária mesmo para ajustes pequenos. Não tocado nesta sessão, deliberadamente: a regra nova de `VCMotion` não foi estendida até lá.

---

## Comandos executados relevantes desta sessão

```bash
node --check frontend/assets/vision-core-next-clean.js
node --check tests/e2e/vision-core-next-atomic-core.spec.mjs

npx playwright test tests/e2e/vision-core-next-agent-apply.spec.mjs tests/e2e/vision-core-next-sf.spec.mjs tests/e2e/vision-core-next-apply-fix.spec.mjs tests/e2e/vision-core-next-atomic-core.spec.mjs --reporter=list
# => 25 passed

git stash push -- test-results   # deletions pré-existentes no working tree, não relacionadas a esta sessão
git rebase origin/main            # via PowerShell — pegou o commit do bot de CI, sem conflito
git stash pop
git push origin main              # via PowerShell — Bash sem rede pra github.com neste ambiente

bash bin/deploy-pages.sh "..."    # via Bash — CF Pages tem rede via Bash (diferente de github.com)

# Verificação pós-deploy (Bash + node fetch, curl direto retornou 000 nesta rede):
node -e "fetch(url).then(r=>r.text()).then(t=>{...})"
```

---

## Riscos/Alertas ativos

1. **[BAIXO] `git push`/`fetch` para GitHub exigem PowerShell neste ambiente** — Bash não tem rota de rede pro GitHub. **Achado novo desta sessão:** Bash TEM rede para Cloudflare Pages (`bash bin/deploy-pages.sh` funcionou direto) e para fetch geral via `node -e "fetch(...)"` — só `curl` direto no Bash retornou `000` (sem rota); `node fetch` funcionou normalmente. Ou seja, a limitação de rede do Bash é por ferramenta/host, não universal — testar com `node -e fetch` antes de assumir que uma verificação precisa ir para PowerShell.
2. **[BAIXO] CI bot colide com push toda sessão até agora** — sempre `docs/STRESS-TEST-*`/`docs/CI-LAST-RUN.md`, fast-forward/rebase resolve sem conflito. Nesta sessão havia também deletions pré-existentes e não relacionadas em `test-results/` no working tree, que bloqueiam `git rebase` (exige árvore limpa) — resolvido com `git stash push -- test-results` antes do rebase e `git stash pop` depois, sem tocar no conteúdo dessas deletions (não são desta sessão, não avaliadas).
3. **[INFO] `docs/CODEX_PROMPT.md`** duplica conteúdo deste HANDOFF — não removido, só anotado.
4. **[INFO] `fetch-url` é SSRF-capable por design** (comportamento pré-existente do backend, não novo).
5. **[INFO] `generate-zip` será o primeiro lugar no Next tratando resposta binária** (não-JSON) — ver contrato na seção "Próxima etapa" acima.
6. **[INFO] Nenhum outro elemento do Next foi auditado quanto a "congelar sob reduced-motion"** além do Atomic Core e o blink do olho/logo (ambos já corrigidos/confirmados). Esta sessão inverteu a fonte de verdade só para o Atomic Core — se o roadmap trouxer outros widgets animados, decidir com o usuário se `VCMotion` deve ser estendido a eles também, não presumir.
7. **[INFO] Debris pré-existente segue solto no working tree, não commitado** (`frontend/_test_here.txt`, `frontend/next.html`, `frontend/atomic-core.html`, `frontend/assets/atomic-core.{css,js}`, `frontend/assets/vision-core-next.{css,js}`, `opencode.json`, `docs/SOFTWARE_FACTORY_INFOGRAFICO.html`) — `bin/deploy-pages.sh` já sanitiza os arquivos de `frontend/` antes de publicar (confirmado lendo o script), então não vaza pro deploy. Não limpo nesta sessão por não ser do escopo pedido; candidato a limpeza futura com aprovação explícita.

---

## INCIDENTE-3: credencial de fallback do auth legado — investigação (Fase A, 2026-07-09)

**Escopo desta seção:** investigação read-only + registro de decisão pendente. Nenhum código, backend, go-core, bundle legado, Next, deploy script ou página pública foi alterado nesta fase. O valor literal da credencial foi omitido neste HANDOFF por política; ele permanece apenas nos arquivos onde já existia até a Fase B aprovada.

### Baseline antes da investigação

- HEAD verificado: `13404d28 docs: HANDOFF - registra sessao doc-only do catalogo do legado`.
- `git log -3`: `13404d28`, `33df8e01`, `f3027f94`.
- `test-results/` tinha deleções locais rastreadas; foram restauradas antes da investigação. Depois disso, restaram apenas untracked pré-existentes já documentados em sessões anteriores (`docs/SOFTWARE_FACTORY_INFOGRAFICO.html`, protótipos `frontend/atomic-core.html`/`frontend/next.html`, assets paralelos, `opencode.json`). Nenhum desses foi tocado.

### Mapa de ocorrências (valor omitido)

Busca usada: `rg -n -i -uu --glob '!.git/**' <fallback-com-hifen-ou-underscore> .` (valor omitido por política).

- `.vc-secret-guard.toml:13,64` — comentários/policy do guard registrando o achado.
- `CLAUDE.md:225` — registro histórico do dogfood do `vc-secret-guard`.
- `backend/server.js:756,758` — tratamento server-side especial no `/api/auth/register`.
- `docs/CURRENT_HANDOFF.md` — menções históricas agora redigidas nesta seção/documento.
- `docs/LEGACY_DESIGN_REFERENCE.md:14-15,151` — doc-only citando o bundle real e o runtime abandonado.
- `frontend/assets/vision-core-bundle.js:10289,10290,10317,10318,10341,10343,10353` — bundle real carregado pela raiz de produção.
- `frontend/assets/vision-core-clean-runtime.js:6301,6323` — fork/runtime abandonado, não carregado por página oficial, mas contendo o mesmo literal.
- `tools/_archive/root-deploy/_deploy145_eb.py:23` — assert de deploy arquivado.
- `tools/_archive/root-tests/_test145_auth_unit.cjs:22,26,38` — teste arquivado da correção §145.
- `tools/_archive/root-tests/_test151_scrypt_unit.cjs:53,54,57` — teste arquivado de hash/verify.

### Fluxo reconstituído

1. `frontend/index.html:2798` carrega `assets/vision-core-bundle.js`, portanto o fluxo afetado está no bundle público real.
2. No bundle, `doAuth()` lê o email do modal de autenticação. Se não houver senha salva em `localStorage['vc_user_pw_' + email]`, usa a credencial de fallback como senha enviada para `POST {BACKEND_URL}/api/auth/register`.
3. Se o registro retorna `ok:true`, o frontend salva `data.token` em `sessionStorage.vc_token` e `localStorage.vision_token`, salva `data.generated_password` em `localStorage['vc_user_pw_' + email]`, e mostra o badge de usuário.
4. Se o registro falha (por exemplo, email já existente), o bundle tenta `POST /api/auth/login` com a senha salva ou, se ausente, com a credencial de fallback. Se uma senha salva falhar e ainda não era o fallback, ele faz retry final com o fallback.
5. Backend atual (`backend/server.js:752-768`): `/api/auth/register` reconhece a credencial de fallback como marcador de fluxo só-email. Quando esse marcador chega, o backend NÃO armazena esse literal para novos usuários; gera `crypto.randomBytes(8).toString('hex')`, salva hash scrypt desse valor aleatório, emite cookie/token de sessão e retorna `generated_password` ao frontend.
6. Backend atual (`backend/server.js:771-787`): `/api/auth/login` não tem bloqueio especial para o fallback. Ele passa a senha recebida para `verifyPassword()`. Portanto, se existir conta antiga cujo `password_hash` foi criado com o fallback antes da correção §145, login com o valor público ainda autentica e emite token.
7. Tokens emitidos por registro/login são HMAC via `signSession()` (`backend/server.js:378-389`) e validados por `getAuthUser()` (`backend/server.js:405`). Com token válido, o usuário acessa `/api/auth/me` (`backend/server.js:851-855`), estado de billing (`backend/server.js:2326+`), quota/timeline autenticadas (`backend/server.js:1252-1280`) e qualquer fluxo que aceite `Authorization: Bearer`/cookie de sessão. Não há evidência de privilégio administrativo automático; o plano padrão é `free`.
8. `go-core`: não há ocorrência exata da credencial de fallback e não há validação dela no runtime Go. Referências a auth/password em go-core são regras/testes genéricos de segurança, sem aceitar esse valor.

### Histórico git

- `9cdb6534 feat(frontend): wire fake elements — file upload, auth modal, image reader, config btns` introduziu o frontend enviando a credencial de fallback diretamente para `/api/auth/register` e `/api/auth/login`. Nesse estado histórico, o backend armazenava `hashPassword(password)` do valor recebido; portanto contas criadas nesse intervalo podiam ficar com hash do fallback público.
- `aee512a4 feat(§145): auth badge + senha individual por usuario` mudou o backend: quando o fallback chega ao registro, gera senha individual aleatória, salva hash dela e retorna `generated_password` para o frontend persistir localmente.
- `067f834d fix(§145-hotfix2): login double-fallback` manteve compatibilidade de login tentando fallback para contas antigas.
- `2e9384db` e `748f7225` apenas moveram testes/scripts para `tools/_archive/`, sem mudar o comportamento de autenticação.
- Não encontrei evidência local de rotação/invalidação das contas antigas potencialmente criadas com o fallback antes de §145. Verificar isso em produção exige inspeção controlada do `users.json`/S3 ou rotina server-side que teste hashes sem expor o valor em logs.

### Classificação

**Classificação: (a) ATIVA.**

Evidência:
- O bundle real público ainda envia o fallback para endpoints de auth quando não há senha local salva (`frontend/assets/vision-core-bundle.js:10289-10353`).
- O backend atual reconhece esse valor no registro e concede sessão para conta nova, embora substitua o literal por senha aleatória antes de persistir (`backend/server.js:756-768`).
- O backend atual também pode autenticar conta antiga se o hash salvo corresponder ao fallback, porque `/api/auth/login` usa `verifyPassword(password, user.password_hash)` sem rejeitar esse marcador (`backend/server.js:771-787`).
- O acesso concedido é sessão de usuário `free`, não admin/root, mas ainda é credencial pública acionando fluxo autenticado real.

### O que falta verificar fora do repo

- Se produção ainda tem usuários antigos cujo `password_hash` valida contra o fallback. Como `USERS_DB` real vem de S3/EB e não está neste checkout local (`data/` só contém `agent-queue.sqlite`), isso não é verificável read-only no repo.
- Se existem sessões ativas emitidas por login/registro usando esse caminho. Sem acesso à blacklist/session store/secret de produção, não dá para distinguir tokens por origem localmente.

### Opções de remediação (NÃO executadas)

1. **Opção A — invalidação server-side primeiro (recomendada para classificação ATIVA):** antes de remover do bundle, auditar usuários de produção de forma controlada para detectar hashes compatíveis com o fallback, resetar/invalidar essas contas, e considerar rotação de `SESSION_SECRET` ou revogação ampla de sessões se houver indício de login ativo com esse caminho. Depois, alterar `/api/auth/register` e `/api/auth/login` para rejeitar explicitamente o fallback público em vez de tratá-lo como marcador válido. Só então remover o literal do bundle.
2. **Opção B — compatibilidade controlada:** substituir o fluxo por endpoint/flag explícito de cadastro sem senha que nunca aceite uma senha pública e nunca faça fallback de login. Ainda exige primeiro neutralizar contas antigas e sessões conforme Opção A.
3. **Opção C — remoção frontend apenas:** não recomendada para ATIVA. Remover do bundle antes de invalidar o backend só esconde o problema; versões antigas continuam no histórico, cache e CDN, e o endpoint ainda aceitaria chamadas manuais.

**Decisão pendente do usuário:** escolher a opção de Fase B. Nenhuma remediação foi aplicada nesta Fase A.

---

## INCIDENTE-3: Fase B (remediação) — fechada, 2026-07-09

Aprovação explícita do usuário: opção (a) da Fase A (invalidação server-side primeiro), na ordem Passo 1→5 abaixo. Suíte permanente Next (25/25 PASS) confirmada como baseline antes de começar. `HEAD` batia com `4ce26eaf` esperado, tree limpo (só o ruído pré-existente já documentado). Nenhum deploy feito nesta Fase B — regra dura da sessão.

### Passo 1 — Backend (commit `0d6eb8c7`, pós-rebase `3ebc0b9e`)

`backend/server.js`:
- `/api/auth/register`: se `password === '<credencial de fallback>'`, responde 400 `{ok:false, error:'fallback_credential_rejected'}` e chama `auditLog('auth_fallback_credential_rejected', req, {route:'/api/auth/register'})` — antes disso silenciosamente convertia em senha aleatória. Comportamento de senha ausente/vazia (fluxo só-email legítimo) **não mudou** — continua gerando senha aleatória, só o literal específico foi fechado.
- `/api/auth/login`: mesmo padrão — `password === '<credencial de fallback>'` → 400 antes mesmo de chegar em `verifyPassword`, fechando o caminho de hash legado pré-§145. Seguro para contas legítimas: nenhuma conta pós-§145 pode ter esse literal como senha real (o register já recusa o marcador), então nenhuma senha genuína colide com esta rejeição — não houve necessidade de pausar para aprovação adicional de raio de impacto.

### Passo 2 — Teste de regressão (commit `e4077a41`, pós-rebase mesma série)

`tools/tests/incident-3-auth-fallback.test.mjs` — mesmo padrão de `tools/tests/provider-vault-endpoints.test.mjs` (sobe `backend/server.js` real, child process, porta isolada `18735`). 12/12 PASS:
- register com o literal → 400 `fallback_credential_rejected`, sem eco do valor na resposta; registro real subsequente no mesmo email funciona (nenhuma conta fantasma presa).
- seed de uma conta "legada" (hash construído localmente a partir do literal, mesmos parâmetros scrypt de `server.js`) → login com o literal → 400, sem token; senha errada comum no mesmo usuário → 401 normal (endpoint não quebrou).
- auditLog grava a categoria+rota para as duas rotas; o literal nunca aparece no arquivo de audit log.
- Backup/restore de `data/users.json` e `data/audit-log.json` ao redor do teste (mesmo cuidado do teste de providers com o vault file).

### Passo 3 — Bundle (commit `3ebc0b9e`)

`frontend/assets/vision-core-bundle.js`, diff cirúrgico (sem reformatar, sem tocar em mais nada):
- `_pw145` (senha de registro) e `_loginPw` (senha de fallback de login): fallback trocado do literal público para string vazia — o backend já trata senha vazia gerando uma senha aleatória seguramente (comportamento preexistente, não mudou).
- Removido o `else if` de retry final de login que reenviava o literal quando a primeira tentativa falhava; call site simplificado para `_doLogin(_loginPw, true)`.
- Confirmado antes da mudança: `doAuth()` só é invocado por `signupBtn.addEventListener('click', doAuth)` e por Enter dentro do modal — nunca no carregamento da página raiz. Não houve necessidade de parar/reportar quebra de carregamento.

### Passo 4 — Verificação com `vc-secret-guard scan`

Binário `vc-secret-guard/target/debug/vc-secret-guard.exe` (Fase 1) já compilado, reutilizado sem nenhuma mudança de código (`git diff 4ce26eaf..HEAD -- .vc-secret-guard.toml vc-secret-guard/` vazio — zero entrada nova de allowlist, zero mudança no guard).

- **Achado real, honesto:** o guard **nunca flagrou** a ocorrência em `vision-core-bundle.js` como *finding* estruturado — nem antes nem depois desta sessão (confirmado escaneando isoladamente uma cópia do `vision-core-bundle.js` de `4ce26eaf`, num diretório descartável, sem tocar o repo real). A forma usada no bundle (`localStorage.getItem(...) || 'literal'`) não bate com a heurística de `credential_field` (que reconhece `campo: 'literal'`, o padrão de `vision-core-clean-runtime.js:6301,6323`) nem cruza o limiar de `high_entropy_blob` (string curta, baixa entropia). A confirmação de que o literal existia em `vision-core-bundle.js` veio da investigação manual da Fase A (`rg`), não de um finding do scanner.
- **Número bruto, antes/depois, pela fonte que de fato prova a remoção (`rg`/`grep` do literal em `vision-core-bundle.js`):** 7 ocorrências (linhas 10289, 10290, 10317, 10318, 10341, 10343, 10353) → **0 ocorrências**.
- **Número bruto do scan estruturado, repo inteiro, com `.vc-secret-guard.toml` aplicado, pós-fix:** 1413 findings totais (1410 `high_entropy_blob`, 3 `credential_field`). Dos 3 `credential_field`: 2 são `vision-core-clean-runtime.js:6301,6323` (fork abandonado, fora do escopo desta Fase B, sem mudança) e 1 é `docs/CURRENT_HANDOFF.md:60` (o placeholder de redação `[REDACTED_LEGACY_AUTH_FALLBACK]` usado na Fase A para citar o achado sem repetir o valor — pré-existente a esta sessão, ironicamente parecido o suficiente com um campo de credencial para ser flagrado; não é o valor real, não corrigido aqui por estar fora do escopo dos Passos 1-3).
- Não foi possível reproduzir um scan "antes" do repo inteiro com a mesma política (tentativa de `git worktree` no commit `4ce26eaf` falhou por limite de tamanho de caminho do Windows em arquivos de `tools/_archive/` — falha de ambiente, não relacionada a este incidente; descartado, não repetido). O número que realmente importa para "o achado sumiu" é o específico do arquivo-alvo (`vision-core-bundle.js`, 7→0), reportado acima com confiança total.

### Passo 5 — Governança

- `CLAUDE.md`: nova seção "INCIDENTE-3 — credencial de fallback legada em auth (2026-07-09, Fase B fechada)", mesmo formato/local da seção "Pareamento por `agent_secret`" (incidente 2).
- `docs/VC_SECRET_GUARD_RUST_SPEC.md` §1 (motivação): item 3 adicionado à lista de incidentes reais, citando este como a primeira ocorrência detectada pela própria feature (com a nuance honesta de que o finding estruturado foi em `vision-core-clean-runtime.js`, não diretamente em `vision-core-bundle.js` — ver Passo 4).
- Este documento (Fase B, presente seção).

### AÇÃO PENDENTE DO USUÁRIO — runbook de contas legadas (Passo 1c)

Este repositório **não tem acesso a dados de produção** (`data/` local só contém `agent-queue.sqlite`/snapshots de dev). O script abaixo foi escrito e testado contra um `users.json` sintético local (nunca contra dados reais) — quem precisa rodá-lo contra produção é o usuário, com acesso a S3/EB.

**Script:** `tools/incident-3-legacy-account-scan.mjs <users.json> [--invalidate]` — duplica a mesma lógica scrypt/pbkdf2 de `hashPassword`/`verifyPassword` de `backend/server.js` (sem depender do processo do backend), varre `db.users`, e considera "afetada" qualquer conta cujo `password_hash` autentique com a credencial de fallback legada.

**Runbook:**

1. **Pré-condição:** confirmar se `AWS_S3_BUCKET` está de fato configurado no ambiente EB atual (`vision-core-prod`) — `CLAUDE.md` marca essa env var como "PENDENTE de reaplicar" desde a recriação do §206. Se estiver configurada, `users.json` vive em `s3://<bucket>/data/users.json`. Se não, os dados podem estar só no disco efêmero da instância (verificar via `eb ssh`) ou terem sido perdidos na recriação — validar isso é pré-requisito de qualquer passo abaixo, antes de assumir que o arquivo existe onde se espera.
2. **Baixar uma cópia local** (nunca editar direto em produção):
   ```
   aws s3 cp s3://vision-core-data-prod/data/users.json ./users.prod.json
   ```
3. **Comando, modo leitura (não altera nada):**
   ```
   node tools/incident-3-legacy-account-scan.mjs ./users.prod.json
   ```
   **Resultado esperado:** lista de contas (id/email/criado_em/último_login) cujo hash autentica com a credencial de fallback. Código de saída `1` se houver alguma, `0` se nenhuma.
4. **Comando, invalidação (força nova credencial desconhecida):**
   ```
   node tools/incident-3-legacy-account-scan.mjs ./users.prod.json --invalidate
   ```
   **Resultado esperado:** gera `./users.prod.json.bak-<timestamp>` (backup pré-mudança) e substitui o `password_hash` das contas afetadas por um segredo aleatório novo, nunca revelado. Essas contas deixam de responder à credencial de fallback (já rejeitada pelo backend, Passo 1) **e também deixam de responder a qualquer senha anteriormente conhecida** — não existe fluxo de "esqueci minha senha" hoje, então reintegrar essas contas exige um fluxo de reset ainda não construído ou suporte manual. Isso é o efeito esperado, não um bug.
5. **Subir de volta para produção** (decisão separada do usuário, quando/se aplicar):
   ```
   aws s3 cp ./users.prod.json s3://vision-core-data-prod/data/users.json
   ```
   Isso não redeploya nem reinicia o EB — só atualiza a fonte de verdade no S3. Se o processo já tiver os dados antigos carregados, pode ser necessário um *restart* do ambiente (não um redeploy de código) para ele reler do S3 no próximo boot (`_s3LoadSync`) — confirmar esse comportamento com um teste controlado antes de assumir que basta subir o arquivo.
6. **Rollback** (só se a invalidação causar problema operacional inesperado):
   ```
   cp ./users.prod.json.bak-<timestamp> ./users.prod.json
   aws s3 cp ./users.prod.json s3://vision-core-data-prod/data/users.json   # se já tinha subido a versão invalidada
   ```
   Restaura os hashes originais — reabre a mesma exposição de dados, então só usar em caso de problema real, reavaliando antes de repetir.

**Observação de escopo, repetida do CLAUDE.md:** mesmo depois de rodar `--invalidate`, enquanto o **backend em produção** não receber o fix do Passo 1, a rejeição ativa não está lá — o literal extraído de cache/histórico/CDN antigo continua funcionando contra o endpoint real até esse deploy acontecer. A invalidação de dados sozinha reduz a superfície (contas antigas sem o hash exposto), mas não fecha o code path; os dois precisam estar em produção para o incidente ficar de fato fechado.

### Deploy — pendente de decisão do usuário

Nenhum deploy foi feito nesta Fase B (nem backend/EB, nem CF Pages) — regra dura da sessão. O código está pronto no repo (`main`, commits `0d6eb8c7`/`e4077a41`/`3ebc0b9e`, pushados). **O deploy do backend é o que efetiva a correção** (fecha a aceitação do literal em produção); o deploy do bundle é secundário (só para de *enviar* o literal — o backend antigo continuaria aceitando-o de qualquer chamador direto até ser atualizado). Ambos ficam para quando o usuário decidir.

---

## INCIDENTE-4: SESSION_SECRET — investigação (Fase A, 2026-07-09)

**Escopo desta seção:** investigação 100% read-only + registro de decisão pendente. Nenhum código, backend, go-core, bundle legado, Next, deploy script ou página pública foi alterado nesta fase — só este HANDOFF. O literal de fallback não é reproduzido aqui; referido como "o literal de fallback de `SESSION_SECRET`" (já visível em `backend/server.js:379,396` para quem tem o repo).

### Baseline antes da investigação

- HEAD verificado: `de7cc404 docs: vc-secret-guard Fase 1.5 fechada - governanca, spec e achados reais` — batia com o esperado.
- `git log -3`: `de7cc404`, `5aba5e1c`, `c871b4a6`.
- `git status`: só o ruído pré-existente já documentado em sessões anteriores (deleções em `test-results/`, untracked `docs/SOFTWARE_FACTORY_INFOGRAFICO.html`, protótipos `frontend/atomic-core.html`/`next.html`/assets paralelos, `opencode.json`) — nada novo, nada tocado.

### 1. Mapa `signSession`/`verifySession` (file:line)

- **`backend/server.js:378-389` — `signSession(payload)`.** Lê `const secret = process.env.SESSION_SECRET || 'vision-core-dev-session-secret-change-me'` (linha 379). Monta `fullPayload = {...payload, jti: crypto.randomBytes(16).toString('hex'), iat: Date.now(), exp: payload.exp || +24h}`, serializa em base64url, assina com `crypto.createHmac('sha256', secret)`. Retorna `${body}.${sig}`.
- **`backend/server.js:392-404` — `verifySession(token)`.** Lê o **mesmo** `process.env.SESSION_SECRET || 'vision-core-dev-session-secret-change-me'` (linha 396) — **simétrico confirmado**: a mesma env var (com o mesmo fallback) assina e valida. Recalcula o HMAC sobre o `body` recebido e compara com `crypto.timingSafeEqual` (comparação em tempo constante — não há timing attack aqui, o problema é o segredo em si ser público). Só depois de validar a assinatura checa `data.exp` (expiração) e `data.jti` contra a blacklist (`isTokenRevoked`, linha 401).
- **Todas as rotas que EMITEM token via `signSession({uid, exp})`** (confirmado por grep, só esses 2 campos em todo lugar):
  - `POST /api/auth/register` — `server.js:772`
  - `POST /api/auth/login` — `server.js:800`
  - `GET /api/auth/oauth/google/callback` — `server.js:952`
  - `GET /api/auth/oauth/github/callback` — `server.js:1026`
- **Todas as rotas que VALIDAM via `verifySession`/`getAuthUser`** (`getAuthUser`, `server.js:405`, é a única função que chama `verifySession` fora de logout/delete — lê `Authorization: Bearer` ou cookie `vision_session`, valida, e busca `db.users.find(u => u.id === session.uid)`): `GET /api/auth/me` (866), `GET /api/account/me` (1034), `GET /api/mission/quota` (1285), `GET`/`POST /api/mission/timeline` (1295/1333), `GET /api/usage/quota` (2321), `GET /api/billing/status` (2341), e `requireVisionAuth` (middleware, `server.js:2128-2133`, também chama `getAuthUser` internamente) que gate as 6 rotas de billing Stripe (`POST /api/billing/create-checkout-session`, `GET /api/billing/customer`, `GET /api/billing/subscription`, `POST /api/billing/portal`, `POST /api/billing/cancel`, `POST /api/billing/reactivate` — `server.js:2248-2293`). Duas rotas chamam `verifySession` direto, sem passar por `getAuthUser` (mesmo secret, mesmo risco): `POST /api/auth/logout` (`server.js:2136`) e **`DELETE /api/auth/me`** (`server.js:2161-2180` — exclusão de conta real, LGPD).

### 2. Impacto reconstituído de um token forjado

**O payload que `signSession()` aceita é arbitrário** — quem controla o segredo (o literal de fallback, se `SESSION_SECRET` não estiver setado) pode montar `{body}.{sig}` inteiramente offline, sem tocar o servidor, para qualquer payload JSON que queira, incluindo um `uid` escolhido a dedo e um `exp` no futuro distante.

**O que `verifySession()` confere além da assinatura:** só `exp` (expiração) e `jti` contra a blacklist local (que só contém tokens explicitamente revogados por logout/delete — um token forjado do zero nunca esteve nela). **Não há verificação de que o `uid` do payload corresponde a um usuário real na validação em si** — essa checagem só acontece depois, em `getAuthUser()`, que faz `db.users.find(u => u.id === session.uid)` e retorna `null` se não achar. Ou seja: um token com `uid` inventado (que não bate com nenhum usuário real) falha silenciosamente mais adiante (vira "não autenticado"), mas um token com um **`uid` de um usuário real** — mesmo que o atacante nunca soube a senha dessa conta — autentica como aquele usuário, com sucesso total.

**Campos de privilégio (plano/role) NÃO são forjáveis diretamente:** `getAuthUser()` sempre busca o registro do usuário no banco (`db.users.find(...)`) e todo lugar que lê `.plan` (ex.: `server.js:2322`, billing status) lê do registro do banco, nunca de um campo dentro do payload do token — mesmo se o atacante colocar `{uid: 'x', plan: 'enterprise'}` no payload forjado, esse campo extra é ignorado. **Então a severidade não é "forjar qualquer privilégio arbitrário" — é "assumir a identidade completa de qualquer usuário real cujo `uid` o atacante conheça ou adivinhe", com todos os privilégios reais que essa conta específica já tem** (inclusive `enterprise` via SSO, se for o caso da conta escolhida).

**A que dá acesso, concretamente (rotas confirmadas no mapa acima):**
- Leitura: `/api/auth/me`, `/api/account/me`, `/api/mission/quota`, `/api/mission/timeline`, `/api/usage/quota`, `/api/billing/status`, `/api/billing/customer`, `/api/billing/subscription`.
- **Ação destrutiva sem confirmação de senha:** `DELETE /api/auth/me` — deleta a conta da vítima (`server.js:2171`, remove do array `db.users` e persiste), gera `email_deleted` na resposta e loga `account_deleted` no audit log. Nenhuma segunda prova de identidade é exigida além do token.
- **Billing real (Stripe):** `POST /api/billing/create-checkout-session`, `POST /api/billing/cancel`, `POST /api/billing/reactivate`, `POST /api/billing/portal` — todas atrás de `requireVisionAuth`, mesmo `getAuthUser`. Um atacante pode cancelar a assinatura paga de outra pessoa, ou abrir uma sessão de portal Stripe em nome dela.
- `POST /api/auth/logout` — pode invalidar (revogar) o token real da vítima (nuisance/DoS de sessão), embora isso exija primeiro ter esse token, não o `uid`.

**Como um `uid` real chegaria às mãos de um atacante:** `makeId('usr')` (`server.js:37-39`) gera `usr-<Date.now()>-<6 hex chars via Math.random>` — **não é criptograficamente aleatório** (`Math.random`, não `crypto.randomBytes`) e carrega só ~24 bits de entropia na parte aleatória, com um timestamp em ms previsível dentro de uma janela plausível (ex.: data de criação da conta, se conhecida). Isso por si só já seria fraco contra força bruta offline (o forjamento do HMAC é local, sem rate limit do servidor envolvido — só tentar validar o token forjado contra uma rota real sofreria rate limit, mas *gerar* candidatos não). Mais grave: **`backend/data/users.json` está commitado no git** (achado já registrado na seção "vc-secret-guard Fase 1.5" acima, item 3) com pelo menos 1 conta real (`fix-test@visioncore.dev`) cujo campo `id` (o `uid` exato) é público no histórico do repositório — um atacante não precisa nem adivinhar, só ler o arquivo. `publicUser()` (`server.js:304`) inclui `id` nas respostas de `/api/auth/register`/`/api/auth/login`/`/api/auth/me`, mas confirmado por grep que nenhum endpoint expõe o `id` de **outros** usuários a um terceiro (sem lista pública de usuários, sem leaderboard) — então essa via de exposição fica restrita ao próprio dono da conta e ao arquivo já commitado.

**Severidade real: ALTA, condicional a `SESSION_SECRET` não estar setado em produção.** Não é "só sessão free" — é personificação completa de uma conta real específica (incluindo ação destrutiva de exclusão de conta e manipulação de billing Stripe), e já existe pelo menos um `uid` real vazado no próprio histórico do repositório que serviria como alvo imediato sem nenhuma adivinhação.

### 3. Histórico git

- O literal de fallback já existia, sem mudança de valor, em pelo menos os 3 commits mais antigos encontrados por `git log -S` sobre a string exata: `8a8f3708`, `ba5f9225`, `42c47349` (`fix(core): restore server runtime...`, `fix(core): remove backend-derived evidence receipts`, `chore(snapshot): preserve workspace before V5.2` — nenhum desses commits é sobre auth/sessão especificamente, sugerindo que o literal já vinha de antes desse ponto do histórico e só apareceu nesses diffs por reescritas de arquivo maiores). O comentário `// §152` em `signSession`/`verifySession` (linha 377/391) indica que a lógica de JTI+blacklist foi adicionada no §152, mas o padrão `env || fallback-literal` para `SESSION_SECRET` já existia antes disso, não foi introduzido no §152.
- **`SESSION_SECRET` nunca aparece em nenhum `.ebextensions/` (a pasta não existe neste repo), nenhum workflow do GitHub Actions (`.github/` — grep vazio), nenhum `.env.example`** (raiz nem `backend/`).
- **Achado relevante para a causa raiz:** `backend/.env.example` lista `JWT_SECRET` como "**Auth — OBRIGATÓRIO em produção**" — mas `JWT_SECRET` **não é lido em nenhum lugar de `backend/server.js`** (confirmado por grep: só aparece em `backend/package.json` como texto de um nome de script, `v41_env`, nunca `process.env.JWT_SECRET`). Ou seja: a documentação de ambiente do próprio projeto instrui a configurar um secret que o código não usa para assinar sessão, e nunca menciona o secret que de fato assina sessão (`SESSION_SECRET`). Quem provisionou o EB seguindo `.env.example` literalmente nunca teria motivo para saber que `SESSION_SECRET` precisa existir.
- A tabela de env vars do EB em `CLAUDE.md` (seção "VARIÁVEIS DE AMBIENTE NO EB") lista `PROVIDER_VAULT_SECRET` como "configurado no §206" mas nunca lista `SESSION_SECRET` — consistente com o achado da Fase 1.5 que motivou esta investigação.

### 4. O que é verificável a partir deste repo — e o que não é

**Verificável aqui (feito nesta fase):** a existência do fallback no código-fonte, a simetria assinatura/validação, o mapa de rotas afetadas, a ausência de qualquer referência a `SESSION_SECRET` em arquivos de configuração/deploy do repo, e a presença de um `uid` real commitado em `backend/data/users.json`.

**NÃO verificável a partir deste repo** (mesma limitação já registrada para o achado de `users.json` na Fase 1.5 e para o INCIDENTE-3): se `SESSION_SECRET` está de fato setado no ambiente EB real (`vision-core-prod`). Este checkout local não tem acesso a AWS/EB.

**Procedimento exato — AÇÃO MINHA (do usuário) PENDENTE, não executável pelo agente:**

1. **Via EB CLI** (se instalado e configurado com credenciais AWS):
   ```
   eb printenv vision-core-prod
   ```
   Procurar a linha `SESSION_SECRET = <valor>` na saída.

2. **Via Console AWS** (alternativa sem CLI): AWS Console → Elastic Beanstalk → ambiente `vision-core-prod` → **Configuration** → categoria **Software** → seção **Environment properties** → procurar `SESSION_SECRET` na lista de variáveis.

**Como interpretar cada resultado possível:**

| Resultado | Interpretação |
|---|---|
| `SESSION_SECRET` **listado, com um valor que não é o literal de fallback** | Seguro — a assinatura de produção não usa o segredo público, forjar sessão exige adivinhar esse valor real (inviável). Nada a corrigir com urgência (a Fase B ainda vale como hardening defensivo — fail-closed é mais seguro que depender de "alguém lembrou de configurar", mas o risco imediato não existe). |
| `SESSION_SECRET` **ausente da lista** | **INCIDENTE-4 confirmado ATIVO** — o backend real está assinando/validando sessão com o literal público, hoje. Qualquer sessão de qualquer usuário pode ser forjada por quem tiver o repo. Prioridade máxima para a Fase B. |
| `SESSION_SECRET` **presente, mas com o mesmo valor do literal de fallback** (alguém "configurou" copiando o literal em vez de gerar um valor novo) | **Equivalente a ausente** — mesma exposição, só com uma falsa sensação de estar configurado. Prioridade máxima para a Fase B, e vale um alerta específico de que isso é tão perigoso quanto não configurar nada. |

### 5. Precedente comparável: `PROVIDER_VAULT_SECRET`

Mesmo formato `env || literal-hardcoded-'*-change-me'` existe em `backend/provider-vault-crypto.js:36,53` (`DEV_FALLBACK_SECRET = 'vision-core-dev-vault-secret-change-me'`), documentado no próprio arquivo (linhas 12-20) como tendo a mesma estratégia "já usada por `SESSION_SECRET` em `server.js`". **Diferença importante, para não presumir um precedente que não existe:** `PROVIDER_VAULT_SECRET` **não foi endurecido** — `CLAUDE.md` (seção "AI PROVIDER VAULT") ainda registra isso como limitação aberta ("fallback dev hardcoded"), e o próprio comentário no arquivo trata o fallback como aceito, não como um risco corrigido. Ou seja: **não existe hoje neste projeto nenhum precedente de "falha alto no boot sem secret configurado"** — a Fase B do INCIDENTE-4 (endurecer `SESSION_SECRET` para fail-closed) seria a **primeira vez** que esse padrão é implementado aqui, não uma reaplicação de algo já validado em produção. Vale considerar, quando a Fase B for aprovada, se o mesmo endurecimento deveria ser cogitado para `PROVIDER_VAULT_SECRET` depois — mas isso é decisão separada, fora do escopo desta investigação.

### Opções de remediação (NÃO executadas nesta fase)

1. **Opção A — fail-closed no boot (recomendada):** `signSession()`/`verifySession()` deixam de aceitar o literal — se `process.env.SESSION_SECRET` estiver ausente/vazio no momento do boot, o processo lança erro fatal e não sobe, em vez de assinar silenciosamente com o segredo público. É o pedido explícito já registrado na tarefa desta sessão para a Fase B. Efeito colateral esperado e aceito: setar/rotacionar `SESSION_SECRET` em produção invalida todas as sessões ativas (tokens antigos, assinados com o segredo anterior, deixam de validar) — isso derruba quem está logado, é o comportamento correto, não uma regressão.
2. **Opção B — manter fallback, mas não previsível:** gerar um valor aleatório forte na primeira inicialização do processo (`crypto.randomBytes`) e persistir em disco local, só usado se `SESSION_SECRET` não estiver setado. Rejeitada como recomendação principal: em EB, disco de instância não é garantidamente persistente entre deploys/restarts (mesma classe de problema que motiva o padrão S3-como-fonte-de-verdade já usado para `users.json`/etc. no projeto) — um valor gerado e perdido a cada deploy teria o mesmo efeito prático da Opção A (invalida sessões a cada deploy), mas de forma menos explícita/auditável. Registrada aqui só como alternativa considerada, não como recomendação.
3. **Opção C — não mudar o código, só documentar/alertar:** adicionar `SESSION_SECRET` à tabela de env vars obrigatórias do `CLAUDE.md`/`.env.example` sem mudar o comportamento de fallback no código. Rejeitada como insuficiente sozinha: não fecha o risco se alguém esquecer de configurar (o mesmo tipo de lacuna que causou o incidente) — documentação por si só já existia de forma adjacente (`.env.example` documentando `JWT_SECRET`, que nem é usado) e isso não impediu o problema.

**Decisão pendente do usuário:** confirmar o estado real de `SESSION_SECRET` no EB (passo 4 acima) e aprovar a Opção A (ou outra) antes de qualquer código da Fase B ser escrito.

---
