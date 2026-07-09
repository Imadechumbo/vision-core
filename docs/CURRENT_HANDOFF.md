# CURRENT HANDOFF - Vision Core Next

Documento vivo de revezamento entre agentes (Codex / Claude Code / OpenCode). Leia depois de `CLAUDE.md` e `docs/VISION_CORE_NEXT_FRONTEND_SPEC.md`, antes de editar codigo.

> Ultima atualizacao: 2026-07-08, por Codex - Software Factory v45: 4 etapas extras opcionais.

## Estado Atual

- Commit local: este commit - `feat(next): add optional SF extra steps`. Ainda nao pushado/deployado nesta retomada.
- Cache-bust atual no codigo: `?v=next-clean-45` (`frontend/vision-core-next.html`, CSS e JS juntos).
- Producao ainda estava em `next-clean-31` no ultimo checkpoint conhecido. Nao deployar sem aprovacao explicita.
- `AGENT_APPLY_ENABLED=false` continua fail-closed. Nao reabrir sem aprovacao humana registrada.
- `tests/e2e/vision-core-next-agent-apply.spec.mjs`: permanente, 4 testes. Guarda o gate de seguranca.
- `tests/e2e/vision-core-next-sf.spec.mjs`: permanente, 6 testes. Guarda o SF em relay multiagente.

## Implementado Ate Aqui

- Etapas 0-7 mantidas do handoff anterior: corte de escopo, badge do agente, AI Provider Vault em Settings, Vault rollback, Missions/evidence, Hermes hint, specs permanentes, Apply-Fix em Tools.
- Etapa 8 / v45: Software Factory ganhou 4 etapas extras opcionais no painel `#factory`:
  - `context-snapshot`
  - `patch-validator`
  - `risk-assessor`
  - `rollback-planner`
- Esses 4 passos ficam desligados por padrao. Quando marcados, entram depois dos 5 passos base e antes do PASS GOLD.
- O contrato foi verificado em `backend/server.js` antes de codar: os 4 estao em `SF_GENERATORS`, usam `POST /api/sf/:key` e poll singular `GET /api/sf/job/:id`.
- Nenhum backend, legado (`frontend/index.html`, `vision-core-bundle.*`), deploy script ou pagina publica foi alterado.

## Arquivos Tocados Nesta Retomada

- `frontend/vision-core-next.html` - cache-bust v45 + checkboxes de etapas extras.
- `frontend/assets/vision-core-next-clean.js` - `SF_EXTRA_STEPS`, selecao opt-in e inclusao em `sf_options.extra_steps`.
- `frontend/assets/vision-core-next-clean.css` - estilo compacto das etapas extras, sem `!important`.
- `tests/e2e/vision-core-next-sf.spec.mjs` - mocks dos 4 endpoints extras + teste de ordem/travas.
- `CLAUDE.md`, `docs/CURRENT_HANDOFF.md`, `docs/CODEX_PROMPT.md` - continuidade atualizada.

## Testes Feitos

- `node --check frontend/assets/vision-core-next-clean.js` => PASS.
- `node --check tests/e2e/vision-core-next-sf.spec.mjs` => PASS.
- `rg` de seguranca para `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `eval`, `AGENT_APPLY_ENABLED = true`, `real_execution_allowed: true`, `deploy_allowed: true`, `writes_disk: true`, `!important` => zero matches nos arquivos tocados/specs permanentes.
- `npx playwright test tests/e2e/vision-core-next-agent-apply.spec.mjs tests/e2e/vision-core-next-sf.spec.mjs` => 10/10 PASS.

## Pendencias Restantes

1. Auth (registro/login/OAuth Google+GitHub) - mais arriscado; nao comecar sem alinhamento.
2. Software Factory - 3 endpoints com contrato distinto: `project-files`, `generate-zip`, `fetch-url`. Verificar cada handler real em `backend/server.js` antes de qualquer UI.
3. Deploy dropdown - bloqueado pela SPEC/secao de escopo; exige decisao explicita.

## Proximo Comando Recomendado

```powershell
rg -n "project-files|generate-zip|fetch-url|app\.post\('/api/sf" backend/server.js
```
