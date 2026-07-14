# CURRENT STATE — Vision Core Next

**Único documento carregado automaticamente no início de cada sessão, junto com `CLAUDE.md`.** Documento vivo de revezamento entre agentes (Codex / Claude Code / OpenCode / Omnigent). Ordem de leitura completa em `docs/README_DOCUMENTATION.md`. Histórico completo e narrativas de sessão vivem em `docs/session_logs/` e `docs/CHANGELOG_NEXT.md`; decisões fechadas vivem em `docs/DECISIONS.md` — este arquivo é só o estado atual, mantenha-o pequeno (~200 linhas).

---

# ESTADO DO SISTEMA

Frontend Next
✔ OK

Backend
✔ OK — EB `v116-a8189457-hermes-grounding`, Ready/Green; grounding Hermes fail-closed confirmado pela UI pública.

Software Factory
✔ OK (simulação/preview por design — nenhum módulo escreve em disco ou executa real)

Atomic Core
✔ OK

Chat
✔ OK

Deploy Produção
✔ `next-clean-73` publicado via `bash bin/deploy-pages.sh` (autorizado explicitamente pelo usuário) e confirmado ao vivo com screenshot Playwright real: cache-bust servido (`?v=next-clean-73` no JS), teste end-to-end com conta real registrada em produção + missão real gravada via `POST /api/mission/timeline` — Timeline auto-carregou a missão real ao abrir a aba, sem nenhum clique, sem sobreposição do composer.

`next-clean-74` publicado via `bash bin/deploy-pages.sh` (autorizado explicitamente pelo usuário) e confirmado ao vivo com screenshot Playwright real contra `https://visioncoreai.pages.dev/vision-core-next.html`: cache-bust servido (`?v=next-clean-74` em CSS e JS, HTTP 200), menu lateral reorganizado presente (2 `.vc-nav-group`, rótulos "Atividade"/"Avançado", 7 itens fixos como filhos diretos de `.vc-nav`).

Cache Bust
next-clean-82 (publicado em produção em 2026-07-14 sobre o histórico público `next-clean-81`; alias principal e preview `dba2577b.visioncoreai.pages.dev` confirmados servindo o cache-bust novo)

Último Commit

ver `git log -1 --oneline` (pode haver commit local ainda não pushado)

Último Deploy

`dba2577b.visioncoreai.pages.dev` (preview) + alias principal `visioncoreai.pages.dev`, ambos confirmados servindo `next-clean-82`

---

# IMPLEMENTAÇÕES DESTA SESSÃO
✔ ADR-002 aprovada e registrada como DECISION-024: histórico autenticado terá backend como fonte única, escopo obrigatório por owner + projeto e retenção de 90 dias; visitante fica apenas na memória da aba. Timeline e Archivist não serão reaproveitados como conversa. Evidência real: o Next atual só mantém bolhas no DOM, `/api/chat` é mensagem isolada e o Archivist não possui isolamento por usuário/projeto. Backlog: 3/24 concluídos.

✔ ADR-001 aprovada e registrada como DECISION-023: projetos persistidos são autenticados, têm ownership derivado exclusivamente da sessão e seleção explícita no Next; visitante fica efêmero e não entra em `projects.json`. Evidência real: `GET /api/projects` atual expõe todo o banco sem auth e `POST` confia em `body.user_id`; a correção ficou corretamente separada em IMP-001. Backlog: 2/24 concluídos; ADR-002 e IMP-001 desbloqueados.

✔ REL-001 do Engineering Executive Backlog V2 concluída: `e4eee79c` foi confirmado como ancestral do HEAD reconciliado; `codex/next-rc-baseline` foi criada em `origin` como referência revisável. Antes do push, todos os workflows foram inspecionados: deploys por `push` aceitam somente `main`, e Pages/mirror continuam com `if: false`. Nenhum PR, merge ou deploy foi executado. O dashboard e o Kanban de `docs/VISION_CORE_IMPLEMENTATION_MASTER_PLAN.md` agora registram 1/24 concluído e ADR-001/003/004/005 + IMP-006 em Ready.

✔ Regressão de grounding do Chat real corrigida e deployada no EB `v116-a8189457-hermes-grounding`: o workflow agora inclui e verifica o documento de grounding; ausência falha com 503. A frase exata reportada foi confirmada pelo composer público. Teste permanente e evidências: `docs/session_logs/2026-07-14-hermes-ui-grounding-regression.md`.

✔ `next-clean-79` — DECISION-022: Atomic Core/decágono estritamente na aba Chat; Software Factory Auto-Pilot e Modo Avançado não contam mais como exceção. Cabeçalhos curtos fora de Chat agora são canônicos (`#vcPageHead`) e o header interno duplicado de `#vcFeaturePanel` fica oculto nesses contextos. Controle obsoleto "Manter Atomic Core sempre visível" removido; "Mostrar Atomic Core" e intensidade permanecem. Validado localmente: `node --check` OK, specs afetados 33/33 PASS, suíte permanente Next 106/106 PASS. Deployado em produção via `bin/deploy-pages.sh` e confirmado ao vivo servindo `next-clean-79`; screenshots Playwright reais em `%TEMP%\vision-core-next79-screens\`.
✔ `next-clean-82` — movimento customizável do Atomic Core integrado sobre `next-clean-81`: velocidade + padrão do Idle (Clássica/Pulso suave/Deriva), padrão do Action (Clássico/Órbita ampla/Pulso) e Retorno dedicado (`Nenhum`/`Rápido`/`Suave`). As 6 preferências persistem via `window.VCAtomicMotion`; Deriva respeita o teto seguro já validado e "Reduzir animações" mantém prioridade máxima. Deployado em 2026-07-14 via `bin/deploy-pages.sh`; produção confirmou `next-clean-82`, os 4 controles no HTML e `VCAtomicMotion`/`easeInOutQuad` no bundle público.

✔ `next-clean-80`/`next-clean-81` — regressão visual do topo do Software Factory corrigida. `next-clean-80` removeu a caixa solta duplicada (`#vcFeaturePanel`) acima de `#factory`; validação de produção ainda revelou vão residual causado por `#vcChatScroll` vazio mantendo `min-height:260px`. `next-clean-81` colapsa `#vcChatScroll` somente em Factory; produção confirmada com gap 49px, `featurePanelHidden=true`, `scrollDisplay=none`, `sfTextCount=1`, Chat preservado com Atomic Core. Validado localmente: `node --check` OK, specs afetados 28/28 PASS, suíte permanente Next 106/106 PASS. Screenshots Playwright reais em `%TEMP%\vision-core-next81-screens\`.

✔ `next-clean-77` — OAuth Google/GitHub no Vision Core Next: Settings → Conta agora tem botões Google/GitHub que chamam `/api/auth/oauth/{provider}?return_to=next`; backend preserva o legado por padrão e só retorna para `/vision-core-next.html` quando o `state` fechado marca `target:"next"` (sem open redirect por URL livre). O hash `#oauth-success&token=...` grava o mesmo `localStorage['vision_token']` do login email/senha; `#oauth-error=...` abre Settings com erro legível. **Deployado em produção**: Pages serve `next-clean-77`, EB `vision-core-prod` está em `v113-91e5ed3966c7b1486b7325d4a5e8952be3c93215` (`Ready/Green`), Worker OAuth decodifica `target:"next"` com `return_to=next` e `target:"legacy"` sem o parâmetro.

✔ `next-clean-76` — DECISION-021: Atomic Core + cabeçalho genérico escopados ao Chat; Software Factory Auto-Pilot continua com decágono; demais abas usam cabeçalho curto por papel. **Deployado em produção** e confirmado ao vivo em `visioncoreai.pages.dev` servindo cache-bust `next-clean-76`.

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

✔ `next-clean-64` — `ARCHITECTURAL PRINCIPLE-006 — No Fixed Viewport Layout`; Atomic Core saiu de `position:fixed`; nova página `Dashboard`. 91/91 PASS, **deployado e confirmado ao vivo em produção**.

Sessões anteriores (concluídas, sem pendência): Tutorial Smile + histórico público (`next-clean-60`), Atomic Core auto-collapse (`next-clean-61`), Auth email/senha (`next-clean-62`), Atomic Core Settings on/off+intensidade (`next-clean-63`) — todos deployados e confirmados ao vivo, ver `docs/CHANGELOG_NEXT.md`.

Todos os itens até `next-clean-73` estão deployados e confirmados ao vivo. `main`/`origin/main` foram sincronizados até `next-clean-71` (merge + push autorizados explicitamente pelo usuário) — os commits de `next-clean-72`/`73` (nesta branch) ainda não foram levados pra `main`, pendência real até o usuário pedir.

---

# PENDÊNCIAS REAIS

- Páginas públicas `about.html`/`landing.html` (Etapas 5-7) — escopo ainda indefinido, decisão de quando/o quê fica para quando chegar a vez (não é PARE E PERGUNTE, é ausência de spec concreta)
- AI Provider Vault Fase D(b) — conectar `sf-agent-orchestrator.mjs` ao vault (decisão de arquitetura em aberto)
- SF-Agent-Orchestrator Fase 2 — bloqueado por cota de API, smoke test real incompleto
- `vc-secret-guard` Fase 2 (hooks locais) — precisa nova aprovação explícita do usuário
- `vc-secret-guard verify-cloud` — comando Rust read-only para auditar metadados de env vars do EB, testes locais Rust passam, mas a verificação viva do EB está bloqueada por falha TLS/trust store local da AWS CLI. Não usar `--no-verify-ssl`; corrigir TLS primeiro e rerodar.
- INCIDENTE-3 (credencial de fallback legada) — guard de `/api/auth/login` já confirmado ao vivo em produção (EB `v109`, `400 fallback_credential_rejected`); guard de `/api/auth/register` confirmado só no artefato/regressão local (revalidação ao vivo ficou pendente por rate-limit durante o teste). Runbook `tools/incident-3-legacy-account-scan.mjs --invalidate` para contas legadas já existentes em produção é ação pendente do usuário (ver `docs/DECISIONS.md` DECISION-007)
- Timeline estilo LionClaw (pipeline por estágios + custo por agente) — bloqueada por dado real ausente no backend, ver `docs/ROADMAP.md` Fase 2 ("persistir estágios por missão"/"custo real por agente", ambos `PLANEJADO`)

---

# PRÓXIMA PRIORIDADE

Continuar a Onda 1 do `docs/VISION_CORE_IMPLEMENTATION_MASTER_PLAN.md`: ADR-003/004/005 e IMP-001/006 estão Ready. Próximo item no critical path: IMP-001, corrigindo primeiro o contrato inseguro de `/api/projects` e depois integrando seleção/criação no Next conforme DECISION-023. Comando inicial recomendado: `rg -n "app\\.(get|post).*api/projects|account/me|apiRequest|vcAccount" backend/server.js frontend/assets/vision-core-next-clean.js tests/e2e`.

---

# RISCOS CONHECIDOS

- Token de auth em `localStorage`/`sessionStorage` — exposto a XSS, risco aceito (paridade com o legado, não é regressão do Next)
- `backend/data/users.json` tem hash de senha de teste no histórico git — ação de rotação pendente do usuário, fora do alcance deste repo
- OAuth Google/GitHub no Next implementado e publicado em `next-clean-77`
- Itens menores, não bloqueantes: boto3 bloqueado por certificado SSL local (Windows, mesma limitação histórica do node-gyp); `/api/health` retorna `version` hardcoded desatualizada (cosmético); ruído CRLF/LF pré-existente no `git status` (`core.autocrlf` inconsistente, não é prioridade corrigir)

---

# TESTES

REL-001 (2026-07-14): ancestry `e4eee79c → HEAD` confirmado; hashes de `docs/DECISIONS.md` em worktree e HEAD idênticos; `git diff --check` sem erro; branch remota criada sem workflow de deploy aplicável; gate permanente `npx playwright test tests/e2e/vision-core-next-agent-apply.spec.mjs` 4/4 PASS.

114/114 PASS após `next-clean-82` integrado sobre o histórico público `next-clean-81` (50,1s, sem retry). `node --check frontend/assets/vision-core-next-clean.js` PASS.

`node --check` OK

Suíte inteira do repo (incluindo specs do frontend legado) tem falhas conhecidas e pré-existentes por `#vcTutorialOverlay` interceptando cliques em `architect.spec.mjs`/`manual-verification.spec.mjs`/outros — confirmado por isolamento via `git stash` que não é regressão do Next, não bloqueia esta frente.

RC Security Gate (2026-07-11, ainda vigente): CORS backend deixou de refletir Origin arbitrária com credentials; `/api/providers/*` e `/api/sf/fetch-url` exigem sessão; `fetch-url` bloqueia SSRF local/privado. `vc-secret-guard verify-cloud` segue bloqueado por `aws_eb_read_failed_sanitized`, sem validar EB ao vivo — não é um item do Next, é backend/infra separado.

Governança arquitetural (`docs/DECISIONS.md`): `ARCHITECTURAL PRINCIPLE-001` a `-006` são os princípios permanentes ativos; 004 formaliza Minimal Surface Area, 005 Invisible Complexity e o antigo No Fixed Viewport Layout foi preservado como 006.

---

# CONTEXTO PARA O PRÓXIMO AGENTE

Backlog do Next (Fase 1 do ROADMAP) após `next-clean-77`: páginas públicas Etapas 5-7 seguem sem spec concreta; Timeline estilo LionClaw segue bloqueada por dado real ausente no backend (persistir estágios/custo real por agente). Antes de assumir "nada mais a fazer", releia `docs/ROADMAP.md` Fase 1 e confirme por `grep` — não presuma.

Documentação segue sistema de continuidade: este arquivo fica pequeno e reflete só o estado atual; `docs/CHANGELOG_NEXT.md` guarda um bloco curto por versão; investigação/narrativa longa vai para `docs/session_logs/YYYY-MM-DD-nome.md`. Nunca copie logs de terminal, JSON completo ou diffs grandes de volta para este arquivo — achado real desta sessão: as seções TESTES/CONTEXTO tinham ficado stale por várias sessões (ainda citavam `next-clean-59`/"Next não tem auth") porque só as seções de topo eram atualizadas a cada entrega; revise o arquivo inteiro, não só a seção que parece relevante, ao fechar qualquer item.

Para a próxima missão no Next, aplicar DECISION-019: confirmar spec afetada, comparar contra a implementação real, escolher a melhoria de maior impacto pela ordem de prioridade registrada e evitar qualquer push/deploy automático sem pedido explícito.
