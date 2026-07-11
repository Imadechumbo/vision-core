# CURRENT HANDOFF — Vision Core Next

Documento vivo de revezamento entre agentes (Codex / Claude Code / OpenCode). Leia depois de `CLAUDE.md` e `docs/VISION_CORE_NEXT_FRONTEND_SPEC.md`, antes de editar código. Histórico completo e narrativas de sessão vivem em `docs/session_logs/` e `docs/CHANGELOG_NEXT.md` — este arquivo é só o estado atual, mantenha-o pequeno.

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
✔ next-clean-59 publicada e verificada ao vivo

Cache Bust
next-clean-59

Último Commit

bf650f34

Último Deploy

4a28c390 (preview) + alias principal `visioncoreai.pages.dev`, ambos confirmados servindo `next-clean-59`

---

# IMPLEMENTAÇÕES DESTA SESSÃO

✔ Gráficos nativos completos: Agentes, DORA, Runtime, Memory, Conectividade, Software Factory, Security Lab

✔ Toggle "Ver JSON bruto" reutilizável fora da aba Métricas (Agentes/Tools/Security-history)

✔ Bug de produção corrigido: composer sobrepondo `#vcFeaturePanel` (nova área de rolagem isolada `.vc-chat-scroll`)

✔ Deploy `next-clean-59` confirmado ao vivo contra produção real (sem mock)

✔ Documentação reestruturada — `CURRENT_HANDOFF.md` compacto, `CHANGELOG_NEXT.md` novo, `docs/session_logs/` novo

---

# PENDÊNCIAS REAIS

- Auth/registro/login/OAuth no Vision Core Next (não iniciado — login ainda depende do frontend legado)
- Fase 3.3d — remoção da página Software Factory legada (investigada, pausada por risco real de regressão; refactor de desacoplamento ainda não iniciado)
- AI Provider Vault Fase D(b) — conectar `sf-agent-orchestrator.mjs` ao vault (decisão de arquitetura em aberto)
- SF-Agent-Orchestrator Fase 2 — bloqueado por cota de API, smoke test real incompleto
- Settings do Atomic Core — ligado/desligado, glow on/off, intensidade visual (só "reduzir movimento" está implementado)
- Tutorial Smile (Etapa 4, não iniciado)
- Páginas públicas `about.html`/`landing.html` — atualização pendente de validação local
- `vc-secret-guard` Fase 2 (hooks locais) — precisa nova aprovação explícita do usuário

---

# PRÓXIMA PRIORIDADE

Fase 3.3d — desacoplar os inicializadores do painel Software Factory moderno (`#vcMissionSfPane`) do guard `if (!sfPage) return;` antes de remover a página legada `#vcSoftwareFactoryPage`/`#projectBuilder` (investigação completa em `docs/session_logs/`, refactor real ainda não começou).

---

# RISCOS CONHECIDOS

- Token de auth em `localStorage`/`sessionStorage` — exposto a XSS, risco aceito (paridade com o legado, não é regressão do Next)
- `backend/data/users.json` tem hash de senha de teste no histórico git — ação de rotação pendente do usuário, fora do alcance deste repo
- Login/registro real só existe no frontend legado — Next não tem fluxo de auth próprio ainda

---

# TESTES

69/69 PASS (suíte permanente `tests/e2e/vision-core-next-*.spec.mjs`)

`node --check` OK

Deploy confirmado ao vivo em produção (`next-clean-59`, verificado sem mock contra o backend real)

---

# CONTEXTO PARA O PRÓXIMO AGENTE

O painel de Métricas e todas as visualizações gráficas do Next estão completas e deployadas (`next-clean-57`→`59`). Um bug de produção real (composer sticky sobrepondo o painel contextual) foi encontrado e corrigido nesta sessão — se qualquer painel novo dentro de `#vcFeaturePanel` crescer, ele já herda a rolagem isolada `.vc-chat-scroll`, sem precisar de tratamento especial.

A partir de agora a documentação segue um sistema de continuidade: `CURRENT_HANDOFF.md` (este arquivo) fica sempre pequeno e reflete só o estado atual; `docs/CHANGELOG_NEXT.md` guarda um bloco curto por versão; investigação/narrativa longa vai para `docs/session_logs/YYYY-MM-DD-nome.md`. Nunca copie logs de terminal, JSON completo ou diffs grandes de volta para este arquivo.

Nenhuma pendência listada acima tem consenso de urgência — qualquer uma exige decisão do usuário antes de virar prioridade real, exceto a Fase 3.3d (já tem investigação e plano, só falta execução).
