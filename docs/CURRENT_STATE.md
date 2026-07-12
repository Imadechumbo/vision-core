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
✔ next-clean-62 publicado via `bash bin/deploy-pages.sh` (bundle: next-clean-60 Tutorial Smile + next-clean-61 Atomic Core auto-collapse + next-clean-62 Auth email/senha), confirmado ao vivo por screenshot Playwright real contra produção: (1) Atomic Core recolhe no Modo Avançado do SF e reaparece ao voltar pro Auto-Pilot; (2) registro+logout+login rodados contra o backend real (não mockado) com conta de teste `qa-nextclean62-<timestamp>@example.com` — `POST /api/auth/register`, `/logout`, `/login` todos 200. Único 401 observado foi em `/api/providers/list` (AI Provider Vault, pré-existente, sem relação com esta entrega). `next-clean-63` (Atomic Core on/off + intensidade) preparado localmente, deploy pendente.

Cache Bust
next-clean-63 (local, não deployado — produção ainda serve next-clean-62)

Último Commit

ver `git log -1 --oneline` (pode haver commit local ainda não pushado)

Último Deploy

9e967882 (preview) + alias principal `visioncoreai.pages.dev`, ambos confirmados servindo `next-clean-62`

---

# IMPLEMENTAÇÕES DESTA SESSÃO

✔ Atomic Core: confirmado por código (Fase 1) que hoje não recolhe em nenhum painel — só encolhe/some por breakpoint de tela. Confirmado por screenshot que só o Modo Avançado do Software Factory tem colisão real contra a zona reservada do widget (Timeline/Métricas/Security Lab não, em estado vazio). Implementado (Fase 1.5, aprovado pelo usuário): recolhe automaticamente só nesse painel, override reversível em Settings → Atomic Core (`window.VCAtomicCollapse`, mesmo padrão de `window.VCMotion`). `next-clean-61`, 72/72 PASS, **deployado e confirmado ao vivo**.

✔ Auth email/senha no Next: Settings → Conta (registro/login/logout), escopo confirmado pelo usuário (só email/senha, zero endpoint novo — `apiRequest()` já anexava `Authorization: Bearer` de `localStorage['vision_token']` antes de existir qualquer UI). OAuth Google/GitHub NÃO incluído — callback do backend redireciona pro legado, não pro Next; fica registrado como próxima etapa condicionada a mudança de backend. Achado corrigido no caminho: `.vc-settings-form`/`.vc-settings-field-actions` tinham `display:flex` sem `:not([hidden])` (bug real da regra dura já documentada, só não tinha aparecido porque nada usava `hidden` condicional nessas classes antes). `next-clean-62`, 79/79 PASS, **deployado e confirmado ao vivo contra o backend real** (register+logout+login, não mockado).

✔ Settings do Atomic Core (on/off + intensidade): toggle "Mostrar Atomic Core" (widget inteiro, independente do auto-collapse do Modo Avançado) + slider de intensidade visual, `window.VCAtomicCore`/`--atomic-intensity`. "Glow on/off" do ROADMAP explicitamente NÃO implementado — contradizia `VISION_CORE_NEXT_FRONTEND_SPEC.md` checklist item 6, já fechado ("nunca existiram como controles"); Specification First aplicado. RCA adversarial encontrou e corrigiu 1 teste que não exercitava o cenário de conflito que afirmava provar. `next-clean-63`, 82/82 PASS, **não deployado ainda**.

Sessão anterior (concluída, sem pendência): Tutorial Smile (`next-clean-60`) + histórico público about.html/landing.html — ver `docs/CHANGELOG_NEXT.md`.

Pendência real restante: merge desta branch (`codex/next-chief-architect-governance`) para `main` — feito localmente até o commit `fa685e78` (Auth, next-clean-62), mas a branch já avançou desde então (Atomic Core Settings, next-clean-63) e o merge local em `main` precisa ser refeito/atualizado antes do push; push pra `origin/main` continua fora de escopo até autorização explícita. Deploy de `next-clean-63` também pendente de aprovação.

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
