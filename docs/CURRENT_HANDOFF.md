# CURRENT HANDOFF — Vision Core Next

**Documento vivo de revezamento entre agentes (Codex / Claude Code / OpenCode).**
Leia isto DEPOIS de `CLAUDE.md` e `docs/VISION_CORE_NEXT_FRONTEND_SPEC.md`, ANTES de editar qualquer código. Ver "PROTOCOLO DE REVEZAMENTO" no topo do `CLAUDE.md` para as regras completas.

> Última atualização: 2026-07-08, por OpenCode — execução completa do plano de 6 etapas (Etapas 0 a 6).

---

## ESTADO ATUAL

- **Commit local (`main`) = commit remoto (`origin/main`):** `d5575f56` — `feat(next): B-1 parseHermesBlock + hint diagnostico (5a-5d), atualiza PARITY_AUDIT`. **Pushado.**
- **Cache-bust atual no código:** `?v=next-clean-43` (bump de 38→43 nesta sessão).
- **Deployado em produção:** ainda `next-clean-31`. Nada desta sessão está no ar. **Não deployar sem aprovação explícita.**
- **Gate `AGENT_APPLY_ENABLED`:** `false` (fail-closed). Intocado nesta sessão.
- **Pareamento por `agent_secret`:** implementado e validado em sessão anterior. Intocado.
- **`tests/e2e/vision-core-next-agent-apply.spec.mjs`:** permanente, 4/4 PASS. Guarda o gate de segurança.
- **`tests/e2e/vision-core-next-sf.spec.mjs`:** permanente, 5/5 PASS. Superfície ativa de relay multiagente.

---

## O QUE FOI IMPLEMENTADO (Etapas 0-6, 2026-07-08)

### Etapa 0 — Corte de escopo oficializado
- SPEC (`docs/VISION_CORE_NEXT_FRONTEND_SPEC.md`): nova seção 11 "FORA DE ESCOPO" listando categorias C e D do PARITY_AUDIT.
- 19 CSS órfãos, SF Console, tutorial zumbi, OSINT, OPENCLAW/OPENSQUAD, IDs duplicados — Next não vai implementar.
- Commit: `e03c4a69` → rebaseado + pushado.

### Etapa 1 — B-4: Badge de conexão do agente
- `#vcAgentBadge` no header, polling `/api/agent/status` a cada 10s.
- Estados: `connected` (verde), `disconnected` (cinza), `error` (âmbar).
- Pausa quando `document.hidden === true`, retoma ao ficar visível.
- Zero innerHTML, `.vc-agent-badge:not([hidden])`, respeita reduced-motion.
- Cache-bust: v39.

### Etapa 2 — B-5: AI Provider Vault (Settings)
- Painel `#vcSettingsPanel` com formulário de provider (select + api_key + modelo + base_url).
- Salvar (`/api/providers/save`), testar (`/api/providers/test`), excluir (`/api/providers/delete`).
- Chave mascarada (backend já retorna `api_key_masked`), input type="password".
- Lista de provedores salvos ao abrir Settings.
- Cache-bust: v40.

### Etapa 3 — B-6: Rollback UI
- Painel `#vcVaultRollback` dentro do Vault feature.
- Lista de snapshots de `/api/vault/snapshots`.
- Confirmação dupla antes de disparar `POST /api/vault/rollback/:snapshotId` (ação destrutiva — sobrescreve projects.json).
- Cache-bust: v41.

### Etapa 4 — B-2 + B-3: Missões + Evidence viewer
- Painel `#vcMissionHistory` dentro do Missions feature.
- Lista de missões de `/api/mission/timeline?limit=20`.
- Detail view ao clicar (título, meta, summary/input, evidence_receipt se presente).
- Botão "Voltar" restaura a lista.
- Estados: vazio, carregando, erro.
- Cache-bust: v42.

### Etapa 5 — B-1: Chat + Hermes
- 5a: Transporte de chat já existia (POST `/api/chat`, lê `data.answer`).
- 5b: `parseHermesBlock()` — extrai JSON estruturado de resposta textual (fences ` ```json ``` ` ou `{...}` no texto livre). Tolerante: hermesObj `null` nunca quebra a UI.
- 5c: Hint panel `#vcHermesHint` aparece quando resposta contém `diagnosis`/`fix_type`/`patch`/`decisao`. Botão "Ver detalhes nas Missões" navega para a aba Missions.
- 5d: Specs mockados: texto livre, hermesObj válido, malformado, JSON sem diagnóstico, erro de rede.
- Cache-bust: v43.

### Etapa 6 — Fechamento
- Todas as temp specs deletadas.
- Permanent specs 9/9 PASS (agent-apply + sf).
- `docs/PARITY_AUDIT.md` atualizado: itens B-4/B-5/B-6/B-2/B-3/B-1 movidos para seção (a). Pendências atualizadas: 4 grupos restantes (Auth, Apply-Fix, SF passos, Deploy).
- HANDOFF atualizado (este arquivo).
- Push final.

---

## ARQUIVOS TOCADOS

### Frontend Next (3 arquivos oficiais)
- `frontend/vision-core-next.html` — agent badge, settings panel, vault rollback, mission history, hermes hint
- `frontend/assets/vision-core-next-clean.js` — todos os B novos (~+600 linhas)
- `frontend/assets/vision-core-next-clean.css` — CSS dos 5 novos painéis (~+200 linhas)

### Documentação
- `docs/VISION_CORE_NEXT_FRONTEND_SPEC.md` — seção 11 "FORA DE ESCOPO"
- `docs/PARITY_AUDIT.md` — seções (a2) adicionada, (b) enxugada, estimativa revisada
- `docs/CURRENT_HANDOFF.md` — este arquivo

### Não alterado
- `backend/server.js`, `frontend/index.html`, `vision-core-bundle.*`, `bin/deploy-pages.sh` — todos intocados
- Debris de protótipos (`frontend/next.html`, `atomic-core.*`, `opencode.json`, etc.) — intocados

---

## PENDÊNCIAS RESTANTES (do PARITY_AUDIT)

1. **Auth (registro/login/OAuth Google+GitHub)** — 2-3 turnos. Mais arriscado. Não começar sem alinhamento.
2. **Tools — Aplicar Fix** (`/api/security/apply-fix`) — 1 turno. Mesmo padrão de confirmação dupla.
3. **Software Factory — 7 passos restantes** (`project-files`, `generate-zip`, `fetch-url`, `patch-validator`, `context-snapshot`, `risk-assessor`, `rollback-planner`) — 2 turnos. Verificar cada handler real em server.js antes.
4. **Deploy dropdown** — bloqueado pela SPEC (seção 2). Decisão de escopo.

---

## RISCOS/ALERTAS ativos

1. **[BAIXO] Deploy desatualizado.** Produção em `v31`, código local em `v43`. Nada desta sessão deployado.
2. **[BAIXO] `git push` exige PowerShell** — Bash sem rede pra GitHub.
3. **[BAIXO] CI bot colide com push** — rebase simples, sem conflito. `test-results/manual-verification-*` pode bloquear rebase (git stash).
4. **[INFO] `AGENT_APPLY_ENABLED=false`** — intocado. Não reabrir sem (a) pareamento real por agente/projeto/owner e (b) aprovação humana registrada aqui.

---

## TESTES FEITOS

- **Permanent specs (commitados):** 9/9 PASS (`agent-apply` 4 + `sf` 5).
- **Temp specs (criados e deletados):** agent-badge (5/5), settings (5/5), rollback (5/5), missions (5/5), hermes (6/6). Todos mockados, sem chamadas reais.
- **Syntax check:** `node --check` limpo em todos os 3 arquivos JS tocados.

---

## PRÓXIMO COMANDO RECOMENDADO

```bash
# Ler o estado atual e planejar próxima etapa:
cat docs/PARITY_AUDIT.md | head -60
```
