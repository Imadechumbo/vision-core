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
✔ next-clean-60 publicada via `bash bin/deploy-pages.sh` (Tutorial Smile) — verificação ao vivo via curl bloqueada no shell local (cert revocation check), confirmado só pelo retorno de sucesso do wrangler

Cache Bust
next-clean-60

Último Commit

ver `git log -1 --oneline` (pode haver commit local ainda não pushado)

Último Deploy

4a28c390 (preview) + alias principal `visioncoreai.pages.dev`, ambos confirmados servindo `next-clean-59`

---

# IMPLEMENTAÇÕES DESTA SESSÃO

✔ Tutorial Smile revisado (autorrevisão cética de trabalho herdado do Codex), 70/70 PASS, deployado como `next-clean-60` e confirmado visualmente ao vivo (screenshot real do modal aberto em produção)

✔ Regra de governança formalizada em `CLAUDE.md`: entregas do Next ganham seção própria "Trajetória Next" em `landing.html` (nunca misturadas na tabela V-number do legado) — commit `d2863326`

✔ Histórico público atualizado por acréscimo: 7 cards novos em `about.html` (chat-first, mission input único, SF Auto-Pilot/Avançado, Atomic Core, métricas nativas, Tutorial Smile, postura fail-closed) + tabela nova "Trajetória Next" em `landing.html` — commit `1df4600a`. Nenhuma entrada existente foi tocada; zero mojibake introduzido (ambos os arquivos já eram UTF-8 limpo).

Tarefa concluída nesta sessão, sem interrupção por limite de contexto — não há handoff parcial a retomar.

---

# PENDÊNCIAS REAIS

- Auth/registro/login/OAuth no Vision Core Next (não iniciado — login ainda depende do frontend legado)
- AI Provider Vault Fase D(b) — conectar `sf-agent-orchestrator.mjs` ao vault (decisão de arquitetura em aberto)
- SF-Agent-Orchestrator Fase 2 — bloqueado por cota de API, smoke test real incompleto
- Settings do Atomic Core — ligado/desligado, glow on/off, intensidade visual (só "reduzir movimento" está implementado)
- `vc-secret-guard` Fase 2 (hooks locais) — precisa nova aprovação explícita do usuário
- `vc-secret-guard verify-cloud` — comando Rust read-only para auditar metadados de env vars do EB, testes locais Rust passam, mas a verificação viva do EB está bloqueada por falha TLS/trust store local da AWS CLI. Não usar `--no-verify-ssl`; corrigir TLS primeiro e rerodar.
- INCIDENTE-3 (credencial de fallback legada) — guard de `/api/auth/login` já confirmado ao vivo em produção (EB `v109`, `400 fallback_credential_rejected`); guard de `/api/auth/register` confirmado só no artefato/regressão local (revalidação ao vivo ficou pendente por rate-limit durante o teste). Runbook `tools/incident-3-legacy-account-scan.mjs --invalidate` para contas legadas já existentes em produção é ação pendente do usuário (ver `docs/DECISIONS.md` DECISION-007)

---

# PRÓXIMA PRIORIDADE

Próxima missão no Next deve seguir DECISION-019: comparar a spec afetada contra a implementação oficial (`frontend/vision-core-next.html` + `assets/vision-core-next-clean.*`) e escolher o maior ganho arquitetural/UX ainda pendente. O candidato mais sensível continua sendo Auth/registro/login/OAuth no Next, mas só deve começar com alinhamento explícito por mexer com sessão real.

---

# RISCOS CONHECIDOS

- Token de auth em `localStorage`/`sessionStorage` — exposto a XSS, risco aceito (paridade com o legado, não é regressão do Next)
- `backend/data/users.json` tem hash de senha de teste no histórico git — ação de rotação pendente do usuário, fora do alcance deste repo
- Login/registro real só existe no frontend legado — Next não tem fluxo de auth próprio ainda
- Itens menores, não bloqueantes: boto3 bloqueado por certificado SSL local (Windows, mesma limitação histórica do node-gyp); `/api/health` retorna `version` hardcoded desatualizada (cosmético); ~1580 arquivos aparecem "modified" no `git status` por ruído CRLF/LF (`core.autocrlf` inconsistente, pré-existente, não é prioridade corrigir)

---

# TESTES

69/69 PASS (suíte permanente `tests/e2e/vision-core-next-*.spec.mjs`)

`node --check` OK

Deploy confirmado ao vivo em produção (`next-clean-59`, verificado sem mock contra o backend real)

RC Security Gate local (2026-07-11): CORS backend deixou de refletir Origin arbitrária com credentials; `/api/providers/*` e `/api/sf/fetch-url` agora exigem sessão; `fetch-url` bloqueia SSRF para alvos locais/privados por protocolo, hostname, IP e DNS. `node --check`, teste estático `tools/tests/rc-security-hardening.test.mjs`, Playwright Next 69/69 e `cargo test` do `vc-secret-guard` passaram. Release ainda NÃO aprovado: `vc-secret-guard verify-cloud` segue bloqueado por `aws_eb_read_failed_sanitized`, sem validar EB ao vivo.

Governança arquitetural registrada (2026-07-11): `ARCHITECTURAL PRINCIPLE-001` (Zero Legacy Debt), `ARCHITECTURAL PRINCIPLE-002` (Specification First) e `ARCHITECTURAL PRINCIPLE-003` (Evidence Before Change) vivem em `docs/DECISIONS.md` como princípios permanentes. `docs/ARCHITECTURE.md` e `docs/VISION_CORE_NEXT_FRONTEND_SPEC.md` apontam para eles sem duplicar conteúdo. Sem código, sem deploy.

Direção de produto registrada (2026-07-11): `docs/DECISIONS.md` DECISION-019 define que Vision Core Next agora deve ser evoluído como futuro frontend oficial, não como backlog solto de lacunas. Próximas tarefas devem começar por comparação implementação × specs e priorizar arquitetura → UX → Software Factory → Atomic Core → performance → observabilidade → segurança → documentação → refinamento visual. `System Correcting Systems` ficou apenas como IDEIA FUTURA em `docs/ROADMAP.md`, sem número reservado e condicionada à maturidade do Software Factory; não é princípio ativo ainda. Sem código, sem deploy.

Reconciliação Fase 3.3d (2026-07-11): grep confirmou que `#vcSoftwareFactoryPage`, `#projectBuilder`, `initSoftwareFactoryPage()` e `SF_MODULE_SECTION_MAP` não existem nos arquivos oficiais do Next (`frontend/vision-core-next.html`, `assets/vision-core-next-clean.css`, `assets/vision-core-next-clean.js`). As referências restantes vivem no frontend legado (`frontend/index.html`, bundles legados/CSS auxiliares) e em specs/testes legados. Portanto 3.3d não é mais próxima prioridade do Next; virou limpeza do legado, fora do escopo sem autorização explícita para tocar `index.html`/bundles.

---

# CONTEXTO PARA O PRÓXIMO AGENTE

O painel de Métricas e todas as visualizações gráficas do Next estão completas e deployadas (`next-clean-57`→`59`). Um bug de produção real (composer sticky sobrepondo o painel contextual) foi encontrado e corrigido nesta sessão — se qualquer painel novo dentro de `#vcFeaturePanel` crescer, ele já herda a rolagem isolada `.vc-chat-scroll`, sem precisar de tratamento especial.

A partir de agora a documentação segue um sistema de continuidade: `CURRENT_STATE.md` (este arquivo) fica sempre pequeno e reflete só o estado atual; `docs/CHANGELOG_NEXT.md` guarda um bloco curto por versão; investigação/narrativa longa vai para `docs/session_logs/YYYY-MM-DD-nome.md`. Nunca copie logs de terminal, JSON completo ou diffs grandes de volta para este arquivo.

Nenhuma pendência listada acima tem consenso de urgência — qualquer uma exige decisão do usuário antes de virar prioridade real.

Para a próxima missão no Next, aplicar DECISION-019 antes de escolher escopo: confirmar spec afetada, comparar contra a implementação real, escolher a melhoria de maior impacto pela ordem de prioridade registrada e evitar qualquer push/deploy automático sem pedido explícito.
