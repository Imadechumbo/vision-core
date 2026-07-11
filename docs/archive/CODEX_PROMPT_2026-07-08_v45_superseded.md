> **ARQUIVADO — obsoleto.** Prompt de continuação para o Codex, congelado em `next-clean-45` (2026-07-08). Seus "Pendentes Prioritários" (endpoints `project-files`/`generate-zip`/`fetch-url`) já foram todos fechados (ver `docs/CHANGELOG_NEXT.md` `next-clean-46`/`next-clean-51`) e duplicava `docs/CURRENT_STATE.md`. Movido para `archive/` na missão de reconciliação de specs (`docs/DECISIONS.md` DECISION-018) — nunca apagado, só sem valor operacional atual. Para o estado real, use `docs/CURRENT_STATE.md`.

---

# CONTINUATION PROMPT - Vision Core Next (para Codex)

## Estado Atual

- HEAD local esperado: este commit - `feat(next): add optional SF extra steps`.
- Cache-bust: `?v=next-clean-45` (`frontend/vision-core-next.html`, CSS e JS).
- Frontend Next oficial: `frontend/vision-core-next.html`, `frontend/assets/vision-core-next-clean.js`, `frontend/assets/vision-core-next-clean.css`.
- `AGENT_APPLY_ENABLED=false` (gate de governanca, fail-closed).
- API base: `https://visioncore-api-gateway.weiganlight.workers.dev`.
- Nao deployar sem aprovacao explicita.

## Protocolo De Inicio

Leia nesta ordem antes de editar:
1. `CLAUDE.md`
2. `docs/VISION_CORE_NEXT_FRONTEND_SPEC.md`
3. `docs/CURRENT_STATE.md`
4. `git status --short`
5. `npx playwright test tests/e2e/vision-core-next-agent-apply.spec.mjs tests/e2e/vision-core-next-sf.spec.mjs`

## Fechado Ate Agora

- Etapas 0-7: corte de escopo, agent badge, AI Provider Vault, Vault rollback, Missions/evidence, Hermes hint, specs permanentes, Apply-Fix Tools.
- Etapa 8 / v45: SF com 4 etapas extras opcionais usando contrato real `POST /api/sf/:key` + `GET /api/sf/job/:id`:
  - `context-snapshot`
  - `patch-validator`
  - `risk-assessor`
  - `rollback-planner`
- As etapas extras ficam desligadas por padrao e, quando marcadas, entram antes do PASS GOLD.
- Permanent specs atuais: `agent-apply` 4 testes + `sf` 6 testes = 10/10 PASS.

## Pendentes Prioritarios

### SF - 3 endpoints restantes

Nao assumir contrato. Ler `backend/server.js` antes:

1. `project-files` - gera estrutura de arquivos; historicamente retorna `files` no poll.
2. `generate-zip` - gera ZIP/artefato; contrato diferente dos geradores simples.
3. `fetch-url` - baixa conteudo de URL; validar entrada/risco de SSRF antes de UI.

Comando recomendado:

```powershell
rg -n "project-files|generate-zip|fetch-url|app\.post\('/api/sf" backend/server.js
```

### Auth

Registro/login/OAuth Google+GitHub. Mais arriscado; nao iniciar sem alinhamento explicito.

### Deploy dropdown

Bloqueado pela SPEC/escopo. Exige decisao explicita.

## Regras Duras

1. Nao alterar legado: `frontend/index.html`, `frontend/assets/vision-core-bundle.{js,css}`.
2. Nao alterar backend/deploy scripts sem necessidade e sem alinhamento.
3. Sempre incrementar cache-bust quando JS/CSS mudar.
4. Zero `innerHTML`; usar `textContent`, `createElement`, `appendChild`.
5. Nada de `!important` em UI nova sem motivo forte.
6. Acoes destrutivas exigem dupla confirmacao.
7. `AGENT_APPLY_ENABLED=false` permanece fechado.
8. Testar com `node --check` + permanent specs antes de encerrar.
9. Restaurar artefatos de Playwright (`test-results`, JSON gerado) se aparecerem no status.
10. Nada de deploy sem aprovacao explicita.
