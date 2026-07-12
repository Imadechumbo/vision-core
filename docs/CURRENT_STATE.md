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
✔ next-clean-64 publicado via `bash bin/deploy-pages.sh` e confirmado ao vivo por screenshot Playwright real contra produção: (1) `position:static` confirmado no elemento real; (2) scroll real de `#vcChatScroll` tira o widget de vista (top passa de 274 para -46); (3) zero nó de agente clipado (`getBoundingClientRect` contra o container); (4) Dashboard mostra dados reais de produção (6 agentes, providers `openrouter`/`groq`/`gemini`/`deepseek`, heartbeat "há 4h") em largura total.

Cache Bust
next-clean-64

Último Commit

ver `git log -1 --oneline` (pode haver commit local ainda não pushado)

Último Deploy

747a7a2b (preview) + alias principal `visioncoreai.pages.dev`, ambos confirmados servindo `next-clean-64`

---

# IMPLEMENTAÇÕES DESTA SESSÃO

✔ `ARCHITECTURAL PRINCIPLE-004 — No Fixed Viewport Layout` registrado em `docs/DECISIONS.md`: nenhum dashboard/painel/monitor pode usar `position:fixed`/`sticky` preso à viewport — achado real, o Atomic Core reservava `padding-right` global em `.vc-main` mesmo fora do chat, comprimindo qualquer outro painel de largura real.

✔ Atomic Core (primeira aplicação do princípio): saiu de `position:fixed` para viver dentro de `#vcChatScroll` (fluxo normal — rola junto com o chat, sai de vista ao rolar). Só aparece na aba `chat`; Software Factory Auto-Pilot conta como "chat" (spec já documentava isso como "modo do chat, não página") e continua visível, preservando a garantia de `next-clean-61`. **Achado real da RCA adversarial:** a primeira versão usava `margin-right` negativo pra encostar o widget na borda — isso cortava 2 nós de agente (`openclaw`, `scanner`) por `overflow-x:hidden` de `#vcChatScroll`, só detectável por `getBoundingClientRect()` contra o container, não pela screenshot isolada (que parecia correta). Corrigido antes do commit, virou regra dura #13 da spec.

✔ Nova página `Dashboard` (`data-feature="dashboard"`, largura total, quebra o cap de 940px do `.vc-chat-stage` só enquanto ativa): Timeline (reaproveita o heartbeat de Conectividade), Custo por Agente + Ranking de Atividade (reaproveita `buildAgentCharts()`, mesma função de Métricas → Agentes) — zero lógica de dado/cálculo nova, só container.

`next-clean-64`, 91/91 PASS (suíte permanente do Next), **deployado e confirmado ao vivo em produção**.

Sessões anteriores (concluídas, sem pendência): Tutorial Smile + histórico público (`next-clean-60`), Atomic Core auto-collapse (`next-clean-61`), Auth email/senha (`next-clean-62`), Atomic Core Settings on/off+intensidade (`next-clean-63`) — todos deployados e confirmados ao vivo, ver `docs/CHANGELOG_NEXT.md`.

Todos os itens até `next-clean-64` estão deployados e confirmados ao vivo. Pendência real: merge local desta branch (`codex/next-chief-architect-governance`) para `main` precisa ser atualizado pra incluir os commits desta etapa; push pra `origin/main` continua fora de escopo até autorização explícita.

---

# PENDÊNCIAS REAIS

- OAuth Google/GitHub no Vision Core Next (email/senha já implementado, `next-clean-62`) — bloqueado por mudança de backend (callback hoje redireciona pro legado, não pro Next); login/registro seguem também disponíveis no frontend legado em paralelo
- Páginas públicas `about.html`/`landing.html` (Etapas 5-7) — escopo ainda indefinido, decisão de quando/o quê fica para quando chegar a vez (não é PARE E PERGUNTE, é ausência de spec concreta)
- AI Provider Vault Fase D(b) — conectar `sf-agent-orchestrator.mjs` ao vault (decisão de arquitetura em aberto)
- SF-Agent-Orchestrator Fase 2 — bloqueado por cota de API, smoke test real incompleto
- `vc-secret-guard` Fase 2 (hooks locais) — precisa nova aprovação explícita do usuário
- `vc-secret-guard verify-cloud` — comando Rust read-only para auditar metadados de env vars do EB, testes locais Rust passam, mas a verificação viva do EB está bloqueada por falha TLS/trust store local da AWS CLI. Não usar `--no-verify-ssl`; corrigir TLS primeiro e rerodar.
- INCIDENTE-3 (credencial de fallback legada) — guard de `/api/auth/login` já confirmado ao vivo em produção (EB `v109`, `400 fallback_credential_rejected`); guard de `/api/auth/register` confirmado só no artefato/regressão local (revalidação ao vivo ficou pendente por rate-limit durante o teste). Runbook `tools/incident-3-legacy-account-scan.mjs --invalidate` para contas legadas já existentes em produção é ação pendente do usuário (ver `docs/DECISIONS.md` DECISION-007)

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

82/82 PASS (suíte permanente `tests/e2e/vision-core-next-*.spec.mjs`, rodada isolada — confirmar de novo antes de declarar o Next concluído, ver `docs/ROADMAP.md`)

`node --check` OK

Suíte inteira do repo (incluindo specs do frontend legado) tem falhas conhecidas e pré-existentes por `#vcTutorialOverlay` interceptando cliques em `architect.spec.mjs`/`manual-verification.spec.mjs`/outros — confirmado por isolamento via `git stash` que não é regressão do Next, não bloqueia esta frente.

RC Security Gate (2026-07-11, ainda vigente): CORS backend deixou de refletir Origin arbitrária com credentials; `/api/providers/*` e `/api/sf/fetch-url` exigem sessão; `fetch-url` bloqueia SSRF local/privado. `vc-secret-guard verify-cloud` segue bloqueado por `aws_eb_read_failed_sanitized`, sem validar EB ao vivo — não é um item do Next, é backend/infra separado.

Governança arquitetural (`docs/DECISIONS.md`): `ARCHITECTURAL PRINCIPLE-001` (Zero Legacy Debt), `-002` (Specification First) e `-003` (Evidence Before Change) são princípios permanentes ativos — aplicados nesta sessão para excluir "glow on/off" do escopo do Atomic Core Settings (contradizia checklist já fechado da spec).

---

# CONTEXTO PARA O PRÓXIMO AGENTE

Backlog do Next (Fase 1 do ROADMAP) está com só 2 pendências reais restantes, nenhuma executável sem decisão externa: OAuth Google/GitHub (exige mudança de backend + autorização própria) e páginas públicas Etapas 5-7 (sem spec concreta ainda). Antes de assumir "nada mais a fazer", releia `docs/ROADMAP.md` Fase 1 e confirme por `grep` — não presuma.

Documentação segue sistema de continuidade: este arquivo fica pequeno e reflete só o estado atual; `docs/CHANGELOG_NEXT.md` guarda um bloco curto por versão; investigação/narrativa longa vai para `docs/session_logs/YYYY-MM-DD-nome.md`. Nunca copie logs de terminal, JSON completo ou diffs grandes de volta para este arquivo — achado real desta sessão: as seções TESTES/CONTEXTO tinham ficado stale por várias sessões (ainda citavam `next-clean-59`/"Next não tem auth") porque só as seções de topo eram atualizadas a cada entrega; revise o arquivo inteiro, não só a seção que parece relevante, ao fechar qualquer item.

Para a próxima missão no Next, aplicar DECISION-019: confirmar spec afetada, comparar contra a implementação real, escolher a melhoria de maior impacto pela ordem de prioridade registrada e evitar qualquer push/deploy automático sem pedido explícito.
