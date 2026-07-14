# CURRENT STATE — Vision Core Next

**Único documento carregado automaticamente no início de cada sessão, junto com `CLAUDE.md`.** Documento vivo de revezamento entre agentes (Codex / Claude Code / OpenCode / Omnigent). Ordem de leitura completa em `docs/README_DOCUMENTATION.md`. Histórico completo e narrativas de sessão vivem em `docs/session_logs/` e `docs/CHANGELOG_NEXT.md`; decisões fechadas vivem em `docs/DECISIONS.md` — este arquivo é só o estado atual, mantenha-o pequeno (~200 linhas).

---

# ESTADO DO SISTEMA

Frontend Next
✔ OK

Backend
✔ OK

Software Factory
✔ OK (simulação/preview por design — nenhum módulo escreve em disco ou executa real)

Atomic Core
✔ OK

Chat
✔ OK

Deploy Produção
✔ `next-clean-73` publicado via `bash bin/deploy-pages.sh` (autorizado explicitamente pelo usuário) e confirmado ao vivo com screenshot Playwright real: cache-bust servido (`?v=next-clean-73` no JS), teste end-to-end com conta real registrada em produção + missão real gravada via `POST /api/mission/timeline` — Timeline auto-carregou a missão real ao abrir a aba, sem nenhum clique, sem sobreposição do composer.

`next-clean-74` publicado via `bash bin/deploy-pages.sh` (autorizado explicitamente pelo usuário) e confirmado ao vivo com screenshot Playwright real contra `https://visioncoreai.pages.dev/vision-core-next.html`: cache-bust servido (`?v=next-clean-74` em CSS e JS, HTTP 200), menu lateral reorganizado presente (2 `.vc-nav-group`, rótulos "Atividade"/"Avançado", 7 itens fixos como filhos diretos de `.vc-nav`).

**Backend EB** `v5.9.64b-hermes-grounding-fix` publicado (autorizado explicitamente pelo usuário, `_deploy_hermes_grounding_eb.py`) e confirmado ao vivo em produção: `/api/chat` responde de forma grounded e consistente a perguntas sobre fine-tuning do Hermes (ver "Implementações desta sessão"). Ambiente `vision-core-prod` `Ready`/`Green`.

Cache Bust
next-clean-76 (local; producao (frontend CF Pages) ainda serve next-clean-74 ate novo deploy autorizado — backend EB é ciclo de deploy independente, já atualizado acima)

Último Commit

ver `git log -1 --oneline` (pode haver commit local ainda não pushado)

Último Deploy

`ced4211e.visioncoreai.pages.dev` (preview) + alias principal `visioncoreai.pages.dev`, ambos confirmados servindo `next-clean-74`

---

# IMPLEMENTAÇÕES DESTA SESSÃO
✔ RCA da alucinação do Chat sobre a própria arquitetura + fix **deployado e confirmado ao vivo em produção** (`v5.9.64b-hermes-grounding-fix`, EB `vision-core-prod`) — causa raiz confirmada: `basePrompt` de `/api/chat` (modo `vision-geral`, o modo real usado pelo composer) não tinha NENHUM fato sobre a arquitetura real do Vision Core, só instruções pra agir sobre código FORNECIDO pelo usuário. Reproduzido ao vivo contra produção 4 vezes com perguntas variadas sobre "fine-tuning do Hermes" antes do fix: 4 respostas mutuamente contraditórias e 100% inventadas (diff fake com threshold, `vision-core/config/hermes.yaml` inexistente, afirmação falsa de "já treinado", tutorial genérico de MLOps com HuggingFace/torchserve). Fix: `backend/server.js` `/api/chat` ganhou detector de pergunta (regex cobrindo fine-tuning/treinar/treinado/dataset+hermes, testado contra 3+ variações reais incluindo "já foi treinado") que injeta o conteúdo literal de `docs/HERMES_FINE_TUNING_DATASET.md` no system prompt como grounding obrigatório. **1º deploy (`v5.9.64`) não teve efeito** — achado real: o zip do EB só contém o conteúdo de `backend/` (sem `docs/` irmã), `fs.readFileSync('../docs/...')` lançava ENOENT, o `catch` engolia o erro silenciosamente e o chat continuava sem grounding — só percebido testando de novo contra produção pós-deploy. Corrigido com fallback de caminho (`backend/docs/` bundled) + `console.warn` no catch (nunca mais engolir silencioso) + deploy script atualizado pra empacotar uma cópia do doc real no zip. **2º deploy (`v5.9.64b`) confirmado**: as 3 perguntas de teste agora respondem consistentes entre si e batendo com a realidade (citam `hermes-ft-0.2`, `mission-timeline.json`, `tools/export-hermes-dataset.mjs`, e dizem explicitamente "nenhum treinamento foi autorizado ou implementado"). Suíte permanente Next **104/104 PASS** (sem regressão) + `hermes-dataset-collector.test.mjs` PASS + `node --check` OK.

✔ Fundação do dataset Hermes Fine-Tuning (**backend, pronto para deploy EB**) — `/api/hermes/analyze` agora registra candidatos internos em `mission-timeline.json` com `hermes_dataset` (`input` redigido + decisão real + provider/model + `outcome:pending`); `/api/run-live` atualiza o outcome quando há resultado real (`PASS_GOLD`/falha) por `hermes_dataset_id`, `mission_id` ou hash exato do input redigido. Novo módulo `backend/hermes-dataset.js` centraliza redaction e matching; `tools/export-hermes-dataset.mjs` exporta JSONL somente com trio completo e exclui snapshots crus/pending. Schema atualizado em `docs/HERMES_FINE_TUNING_DATASET.md`. Evidência: `node --check` OK; smoke HTTP local de `/api/hermes/analyze` persistiu `hermes_dataset_id` com segredo/email redigidos; `tools/tests/hermes-dataset-collector.test.mjs` PASS e entrou no `npm run test:quick`; export real atual segue **0/0 timeline utilizáveis + 360 snapshots excluídos** (esperado no primeiro ciclo); `npm run test:quick` PASS.

✔ Fase 2 MCP/Fine-Tuning/DOC pública (**não deployado, não pushado**) — GitHub Agent ganhou `backend/github-pr-adapter.js`: REST continua default em `/api/github/create-pr`; MCP fica atrás de `GITHUB_MCP_ENABLED=1` ou `GITHUB_PR_MODE=mcp`, usando toolset mínimo `repos,pull_requests`/tools `get_file_contents,create_pull_request`, com fallback REST quando `files[]` exige commit/update. Dataset Hermes: schema `docs/HERMES_FINE_TUNING_DATASET.md` + exportador local `tools/export-hermes-dataset.mjs`; curadoria atual gerou **0/360 exemplos utilizáveis** (sem input+decisão Hermes+outcome real suficientes), logo nenhum fine-tuning foi iniciado. Páginas públicas `frontend/landing.html` e `frontend/about.html` receberam seção "IA Aplicada na Prática" com 12 tópicos e estado honesto de MCP/Fine-Tuning. Validação: `node --check` OK, `github-pr-adapter` **4/4 PASS**, export Hermes **0/360**, `vision-core-next-github-pr.spec.mjs` **4/4 PASS**, `npm run test:quick` **65/65 subcomandos PASS**. Durante a suíte, duas correções pequenas de harness foram necessárias: fechamento de socket em `tools/tests/local-backend-runtime-launcher.test.mjs` e detecção explícita de `stub:true`/`mock:true` em `tools/run-live-mission-contract.mjs`.

✔ `next-clean-76` (**não deployado ainda**) — DECISION-021 (corrige PARCIALMENTE DECISION-020/next-clean-67): Atomic Core + cabeçalho genérico ("VISION CORE" + tags + status do agente) voltam a ser escopados só ao Chat (Software Factory Auto-Pilot continua contando como chat pro decágono, critério inalterado; o cabeçalho genérico não tem essa exceção — Factory mostra o cabeçalho curto nos 2 modos). Demais abas mostram `#vcPageHead`, cabeçalho curto reaproveitando `featureMap[key].title`/`.status` (mesmo texto já usado em `#vcFeatureTitle`/`#vcFeatureStatus`, nenhuma copy nova). `updateAtomicCollapseState()` ganhou 1 linha (`!inChatOrFactory`) somada aos 2 motivos de collapse já existentes, inalterados. CSS usa especificidade de ID (`#vcBrandLockup[hidden]` etc.) pra vencer `display` das classes, per regra dura #13. 3 testes de `vision-core-next-atomic-core.spec.mjs` que verificavam a regra antiga ("sempre visível em toda página") foram reescritos pra validar a nova; 2 testes novos adicionados em `vision-core-next-app-shell.spec.mjs`. Validado localmente: **104/104 PASS** (suíte completa `tests/e2e/vision-core-next-*.spec.mjs`, rodada 2x seguidas) + screenshots Playwright locais confirmando os 4 critérios de aceitação (chat com decágono+cabeçalho completo; Missions/Métricas/SF-Avançado sem decágono com cabeçalho curto; SF Auto-Pilot com decágono visível). `docs/DECISIONS.md` (DECISION-021) e `docs/VISION_CORE_NEXT_FRONTEND_SPEC.md` atualizados. Sem deploy — aguardando autorização.

✔ `next-clean-75` — Proposta 2 implementada: Timeline e Dashboard removidos como abas próprias. Histórico de Missões permanece em Missions; Métricas ganhou toggle local "Largura total" reaproveitando `vc-chat-stage--wide`/`vc-feature-panel--wide`; Agentes foi mantido como aba própria por agregar status, catálogo e métricas safe-read. Validado localmente: `node --check` OK, specs afetados 41/41 PASS, suíte permanente Next 102/102 PASS, screenshots locais em `artifacts/next-clean-75/`. Sem deploy.

✔ `next-clean-74` — investigação do menu lateral (14 itens, propósito real de cada um lido direto de `featureMap`/painéis/gates de auth) reportada e aprovada pelo usuário; implementada a Proposta 1 (das 3 propostas apresentadas): sidebar fixa (Chat/Missions/Software Factory/GitHub/Vault/Métricas/Settings) + grupos colapsáveis nativos `<details>`/`<summary>` (sem JS novo, ponytail rung 4) "Atividade" (Timeline/Agentes/Dashboard) e "Avançado" (Tools/Security Lab/Obsidian). Smile continua fora da lista de itens (é botão de ajuda). Só reorganização visual/estrutural — nenhuma rota, endpoint, painel ou `featureMap` alterado; clique em `[data-feature]` seguiu funcionando sem mudança de JS porque o listener já era genérico (`document.querySelectorAll('[data-feature]')`, independente de aninhamento no DOM). Validado localmente: 107/107 PASS (suíte `tests/e2e/vision-core-next-*.spec.mjs`, sem nenhuma alteração nos specs) + screenshot Playwright local confirmando os 2 grupos abertos por padrão e o toggle de colapso funcionando (`<details>.open` alterna corretamente). **Deployado em produção** (autorizado explicitamente pelo usuário) e reconfirmado ao vivo com Playwright real contra `visioncoreai.pages.dev` (cache-bust `?v=next-clean-74` HTTP 200, 2 grupos + 7 itens fixos presentes no DOM real). Proposta 2 (fundir Timeline/Dashboard como abas próprias) registrada como pendência em `docs/ROADMAP.md` Fase 1, condicionada a nova autorização.

✔ `next-clean-73` — bug real diagnosticado e corrigido: aba Timeline não mostrava nenhuma missão. Round-trip `POST`→`GET /api/mission/timeline` confirmado funcionando perfeitamente contra produção real (conta de teste descartável) — causa 100% de renderização: `renderFeatureActionViz()`/`summarizeResult()` sem caso para `{entries:[...]}`, caindo no fallback genérico. Fix autorizado (opção a+b): Timeline auto-carrega ao abrir a aba, reaproveitando o widget já funcional de Missions → Mission History (`loadMissionHistory()`, mesmo `#vcMissionHistory`) — botão genérico removido. Achado da RCA: sem os formulários extras de Missions acima, o painel curto caía atrás do composer sticky (regra dura #12) só em Timeline — fix cirúrgico via `scrollIntoView` só nesse caminho, Missions idêntico e testado sem regressão. Novo arquivo de teste dedicado (4 testes), **107/107 PASS, deployado e confirmado ao vivo em produção (teste end-to-end com conta real registrada + missão real gravada)**.

✔ `next-clean-72` — bug real corrigido: composer não aparecia na página Software Factory ao rolar até o fim (`#factory` vivia fora de `.vc-chat-stage`). 103/103 PASS, **deployado e confirmado ao vivo em produção**.

✔ `next-clean-71` — investigação Fase 1 da Timeline estilo LionClaw + conexão do SF Auto-Pilot ao `POST /api/mission/timeline`. 102/102 PASS, **deployado e confirmado ao vivo em produção**.

✔ `next-clean-70` — bug real corrigido: painel de Métricas colapsava/sumia a cada ~10-12s. 100/100 PASS, **deployado e confirmado ao vivo em produção**.

✔ `next-clean-69` — remoção completa do hero do chat (`#vcChatIntro`/`.vc-chat-intro`). 99/99 PASS, **deployado e confirmado ao vivo em produção**.

✔ `next-clean-68` — hero do chat escondido condicionalmente fora de `chat`/`factory` (efeito colateral do `next-clean-67`, hero vazava pra toda página). 99/99 PASS, **deployado e confirmado ao vivo em produção**.

✔ `next-clean-67` — Atomic Core vira elemento persistente global, visível em qualquer página/aba (`DECISION-020`). 98/98 PASS, **deployado e confirmado ao vivo em produção**.

✔ `next-clean-66` — Atomic Core ancorado de verdade no canto superior direito real. Métricas e SF Modo Avançado ganham `--wide`. Legibilidade dos 9 nós corrigida. 96/96 PASS, **deployado e confirmado ao vivo em produção**.

✔ `next-clean-65` — remoção da rolagem interna duplicada; regra dura #12 preservada via `ResizeObserver`. 92/92 PASS, **deployado e confirmado ao vivo em produção**.

✔ `next-clean-64` — `ARCHITECTURAL PRINCIPLE-004 — No Fixed Viewport Layout`; Atomic Core saiu de `position:fixed`; nova página `Dashboard`. 91/91 PASS, **deployado e confirmado ao vivo em produção**.

Sessões anteriores (concluídas, sem pendência): Tutorial Smile + histórico público (`next-clean-60`), Atomic Core auto-collapse (`next-clean-61`), Auth email/senha (`next-clean-62`), Atomic Core Settings on/off+intensidade (`next-clean-63`) — todos deployados e confirmados ao vivo, ver `docs/CHANGELOG_NEXT.md`.

Todos os itens até `next-clean-73` estão deployados e confirmados ao vivo. `main`/`origin/main` foram sincronizados até `next-clean-71` (merge + push autorizados explicitamente pelo usuário) — os commits de `next-clean-72`/`73` (nesta branch) ainda não foram levados pra `main`, pendência real até o usuário pedir.

---

# PENDÊNCIAS REAIS

- OAuth Google/GitHub no Vision Core Next (email/senha já implementado, `next-clean-62`) — bloqueado por mudança de backend (callback hoje redireciona pro legado, não pro Next); login/registro seguem também disponíveis no frontend legado em paralelo
- Páginas públicas `about.html`/`landing.html` (Etapas 5-7) — escopo ainda indefinido, decisão de quando/o quê fica para quando chegar a vez (não é PARE E PERGUNTE, é ausência de spec concreta)
- AI Provider Vault Fase D(b) — conectar `sf-agent-orchestrator.mjs` ao vault (decisão de arquitetura em aberto)
- SF-Agent-Orchestrator Fase 2 — bloqueado por cota de API, smoke test real incompleto
- `vc-secret-guard` Fase 2 (hooks locais) — precisa nova aprovação explícita do usuário
- `vc-secret-guard verify-cloud` — comando Rust read-only para auditar metadados de env vars do EB, testes locais Rust passam, mas a verificação viva do EB está bloqueada por falha TLS/trust store local da AWS CLI. Não usar `--no-verify-ssl`; corrigir TLS primeiro e rerodar.
- INCIDENTE-3 (credencial de fallback legada) — guard de `/api/auth/login` já confirmado ao vivo em produção (EB `v109`, `400 fallback_credential_rejected`); guard de `/api/auth/register` confirmado só no artefato/regressão local (revalidação ao vivo ficou pendente por rate-limit durante o teste). Runbook `tools/incident-3-legacy-account-scan.mjs --invalidate` para contas legadas já existentes em produção é ação pendente do usuário (ver `docs/DECISIONS.md` DECISION-007)
- Timeline estilo LionClaw (pipeline por estágios + custo por agente) — bloqueada por dado real ausente no backend, ver `docs/ROADMAP.md` Fase 2 ("persistir estágios por missão"/"custo real por agente", ambos `PLANEJADO`)

---

# PRÓXIMA PRIORIDADE

Próxima missão no Next deve seguir DECISION-019: comparar a spec afetada contra a implementação oficial (`frontend/vision-core-next.html` + `assets/vision-core-next-clean.*`) e escolher o maior ganho arquitetural/UX ainda pendente. O candidato mais sensível que resta é OAuth Google/GitHub no Next (email/senha já fechado) — exige mudança de backend no callback e alinhamento explícito por mexer com sessão real.

---

# RISCOS CONHECIDOS

- Token de auth em `localStorage`/`sessionStorage` — exposto a XSS, risco aceito (paridade com o legado, não é regressão do Next)
- `backend/data/users.json` tem hash de senha de teste no histórico git — ação de rotação pendente do usuário, fora do alcance deste repo
- OAuth Google/GitHub só existe no frontend legado — Next tem email/senha (`next-clean-62`), mas não OAuth ainda
- Itens menores, não bloqueantes: boto3 bloqueado por certificado SSL local (Windows, mesma limitação histórica do node-gyp); `/api/health` retorna `version` hardcoded desatualizada (cosmético); ruído CRLF/LF pré-existente no `git status` (`core.autocrlf` inconsistente, não é prioridade corrigir)

---

# TESTES

104/104 PASS (suíte permanente `tests/e2e/vision-core-next-*.spec.mjs`, confirmada localmente após `next-clean-76`, rodada 2x seguidas — 2 flakes de timing pré-existentes e não relacionados observados numa rodada isolada, `vision-core-next-account.spec.mjs:88` e `vision-core-next-dry-run.spec.mjs:78`, ambos passam no retry automático do Playwright e reproduzem igual no `git stash` da baseline anterior)

`node --check` OK

Suíte inteira do repo (incluindo specs do frontend legado) tem falhas conhecidas e pré-existentes por `#vcTutorialOverlay` interceptando cliques em `architect.spec.mjs`/`manual-verification.spec.mjs`/outros — confirmado por isolamento via `git stash` que não é regressão do Next, não bloqueia esta frente.

RC Security Gate (2026-07-11, ainda vigente): CORS backend deixou de refletir Origin arbitrária com credentials; `/api/providers/*` e `/api/sf/fetch-url` exigem sessão; `fetch-url` bloqueia SSRF local/privado. `vc-secret-guard verify-cloud` segue bloqueado por `aws_eb_read_failed_sanitized`, sem validar EB ao vivo — não é um item do Next, é backend/infra separado.

Governança arquitetural (`docs/DECISIONS.md`): `ARCHITECTURAL PRINCIPLE-001` (Zero Legacy Debt), `-002` (Specification First) e `-003` (Evidence Before Change) são princípios permanentes ativos — aplicados nesta sessão para excluir "glow on/off" do escopo do Atomic Core Settings (contradizia checklist já fechado da spec).

---

# CONTEXTO PARA O PRÓXIMO AGENTE

Backlog do Next (Fase 1 do ROADMAP) está com só 2 pendências reais restantes, nenhuma executável sem decisão externa: OAuth Google/GitHub (exige mudança de backend + autorização própria) e páginas públicas Etapas 5-7 (sem spec concreta ainda). Antes de assumir "nada mais a fazer", releia `docs/ROADMAP.md` Fase 1 e confirme por `grep` — não presuma.

Documentação segue sistema de continuidade: este arquivo fica pequeno e reflete só o estado atual; `docs/CHANGELOG_NEXT.md` guarda um bloco curto por versão; investigação/narrativa longa vai para `docs/session_logs/YYYY-MM-DD-nome.md`. Nunca copie logs de terminal, JSON completo ou diffs grandes de volta para este arquivo — achado real desta sessão: as seções TESTES/CONTEXTO tinham ficado stale por várias sessões (ainda citavam `next-clean-59`/"Next não tem auth") porque só as seções de topo eram atualizadas a cada entrega; revise o arquivo inteiro, não só a seção que parece relevante, ao fechar qualquer item.

Para a próxima missão no Next, aplicar DECISION-019: confirmar spec afetada, comparar contra a implementação real, escolher a melhoria de maior impacto pela ordem de prioridade registrada e evitar qualquer push/deploy automático sem pedido explícito.
