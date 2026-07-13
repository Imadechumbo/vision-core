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
✔ `next-clean-71` publicado via `bash bin/deploy-pages.sh` (autorizado explicitamente pelo usuário) e confirmado ao vivo com screenshot Playwright real: cache-bust servido (`?v=next-clean-71` no CSS e no JS, confirmado com URL cache-busted própria após um instante de propagação de CDN), JS deployado contém `logSfMissionToTimeline`/POST `/api/mission/timeline`/`sf-autopilot-next` (verificado por leitura direta do arquivo servido), Software Factory carrega normalmente sem regressão visual.

Cache Bust
next-clean-71

Último Commit

ver `git log -1 --oneline` (pode haver commit local ainda não pushado)

Último Deploy

747a7a2b (preview) + alias principal `visioncoreai.pages.dev`, ambos confirmados servindo `next-clean-64`

---

# IMPLEMENTAÇÕES DESTA SESSÃO

✔ `next-clean-71` — investigação Fase 1 da Timeline estilo LionClaw (pipeline por estágios, custo por agente, sprints): `GET /api/mission/timeline` é real, mas pipeline/sprint/custo não têm NENHUM dado no backend (confirmado por leitura de `server.js` + request real contra produção — não é "estrutura diferente", é ausência total). Achado crítico: o Next nunca chamava `POST /api/mission/timeline` — só o legado registrava runs do SF Auto-Pilot, timeline de usuário autenticado sempre vazia mesmo após missões reais no Next. Usuário autorizou implementar só esse item (conexão de escrita) e registrar os outros 2 (estágios persistidos, custo real por agente) como pendência de backend no roadmap — nenhuma UI especulativa foi construída. Fix: SF Auto-Pilot chama `POST /api/mission/timeline` no sucesso (mesmo contrato do legado, backend intocado), nunca em execução incompleta. 2 testes novos, **102/102 PASS, deployado e confirmado ao vivo em produção**.

✔ `next-clean-70` — bug real corrigido: painel de Métricas colapsava/sumia a cada ~10-12s. 100/100 PASS, **deployado e confirmado ao vivo em produção**.

✔ `next-clean-69` — remoção completa do hero do chat (`#vcChatIntro`/`.vc-chat-intro`). 99/99 PASS, **deployado e confirmado ao vivo em produção**.

✔ `next-clean-68` — hero do chat escondido condicionalmente fora de `chat`/`factory` (efeito colateral do `next-clean-67`, hero vazava pra toda página). 99/99 PASS, **deployado e confirmado ao vivo em produção**.

✔ `next-clean-67` — Atomic Core vira elemento persistente global, visível em qualquer página/aba (`DECISION-020`). 98/98 PASS, **deployado e confirmado ao vivo em produção**.

✔ `next-clean-66` — Atomic Core ancorado de verdade no canto superior direito real. Métricas e SF Modo Avançado ganham `--wide`. Legibilidade dos 9 nós corrigida. 96/96 PASS, **deployado e confirmado ao vivo em produção**.

✔ `next-clean-65` — remoção da rolagem interna duplicada; regra dura #12 preservada via `ResizeObserver`. 92/92 PASS, **deployado e confirmado ao vivo em produção**.

✔ `next-clean-64` — `ARCHITECTURAL PRINCIPLE-004 — No Fixed Viewport Layout`; Atomic Core saiu de `position:fixed`; nova página `Dashboard`. 91/91 PASS, **deployado e confirmado ao vivo em produção**.

Sessões anteriores (concluídas, sem pendência): Tutorial Smile + histórico público (`next-clean-60`), Atomic Core auto-collapse (`next-clean-61`), Auth email/senha (`next-clean-62`), Atomic Core Settings on/off+intensidade (`next-clean-63`) — todos deployados e confirmados ao vivo, ver `docs/CHANGELOG_NEXT.md`.

Todos os itens até `next-clean-71` estão deployados e confirmados ao vivo. Pendência real: merge local desta branch (`codex/next-chief-architect-governance`) para `main` precisa ser atualizado pra incluir os commits desta etapa; push pra `origin/main` continua fora de escopo até autorização explícita.

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

102/102 PASS (suíte permanente `tests/e2e/vision-core-next-*.spec.mjs`, rodada isolada 2x seguidas — confirmar de novo antes de declarar o Next concluído, ver `docs/ROADMAP.md`)

`node --check` OK

Suíte inteira do repo (incluindo specs do frontend legado) tem falhas conhecidas e pré-existentes por `#vcTutorialOverlay` interceptando cliques em `architect.spec.mjs`/`manual-verification.spec.mjs`/outros — confirmado por isolamento via `git stash` que não é regressão do Next, não bloqueia esta frente.

RC Security Gate (2026-07-11, ainda vigente): CORS backend deixou de refletir Origin arbitrária com credentials; `/api/providers/*` e `/api/sf/fetch-url` exigem sessão; `fetch-url` bloqueia SSRF local/privado. `vc-secret-guard verify-cloud` segue bloqueado por `aws_eb_read_failed_sanitized`, sem validar EB ao vivo — não é um item do Next, é backend/infra separado.

Governança arquitetural (`docs/DECISIONS.md`): `ARCHITECTURAL PRINCIPLE-001` (Zero Legacy Debt), `-002` (Specification First) e `-003` (Evidence Before Change) são princípios permanentes ativos — aplicados nesta sessão para excluir "glow on/off" do escopo do Atomic Core Settings (contradizia checklist já fechado da spec).

---

# CONTEXTO PARA O PRÓXIMO AGENTE

Backlog do Next (Fase 1 do ROADMAP) está com só 2 pendências reais restantes, nenhuma executável sem decisão externa: OAuth Google/GitHub (exige mudança de backend + autorização própria) e páginas públicas Etapas 5-7 (sem spec concreta ainda). Antes de assumir "nada mais a fazer", releia `docs/ROADMAP.md` Fase 1 e confirme por `grep` — não presuma.

Documentação segue sistema de continuidade: este arquivo fica pequeno e reflete só o estado atual; `docs/CHANGELOG_NEXT.md` guarda um bloco curto por versão; investigação/narrativa longa vai para `docs/session_logs/YYYY-MM-DD-nome.md`. Nunca copie logs de terminal, JSON completo ou diffs grandes de volta para este arquivo — achado real desta sessão: as seções TESTES/CONTEXTO tinham ficado stale por várias sessões (ainda citavam `next-clean-59`/"Next não tem auth") porque só as seções de topo eram atualizadas a cada entrega; revise o arquivo inteiro, não só a seção que parece relevante, ao fechar qualquer item.

Para a próxima missão no Next, aplicar DECISION-019: confirmar spec afetada, comparar contra a implementação real, escolher a melhoria de maior impacto pela ordem de prioridade registrada e evitar qualquer push/deploy automático sem pedido explícito.
