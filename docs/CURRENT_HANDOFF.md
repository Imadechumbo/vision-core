# CURRENT HANDOFF — Vision Core Next

**Documento vivo de revezamento entre agentes (Codex / Claude Code / OpenCode).**
Leia isto DEPOIS de `CLAUDE.md` e `docs/VISION_CORE_NEXT_FRONTEND_SPEC.md`, ANTES de editar qualquer código. Ver "PROTOCOLO DE REVEZAMENTO" no topo do `CLAUDE.md` para as regras completas.

> Última atualização: 2026-07-08, por Claude Code (Sonnet 5) — fechou as 2 pendências do handoff anterior (destino do spec SF + gap dos mocks síncronos) e ligou PASS GOLD no Auto-Pilot.

---

## ESTADO ATUAL

- **Commit local (`main`) = commit remoto (`origin/main`):** `649d7069` — `feat(next): liga PASS GOLD no Auto-Pilot/Modo Avancado (Software Factory, v38)`. **Já pushado.**
- **Cache-bust atual no código:** `?v=next-clean-38` (`frontend/vision-core-next.html`, CSS e JS).
- **Deployado em produção (`https://visioncoreai.pages.dev`):** ainda `next-clean-31`. Código local segue vários passos à frente (Software Factory completo com PASS GOLD, pareamento de agente, etc.) — nada disso está no ar. Backend/EB também sem nenhuma mudança desta linha de trabalho deployada. **Não deployar (CF Pages nem EB) sem aprovação explícita do usuário.**
- **Gate `AGENT_APPLY_ENABLED`:** `false` (fail-closed), local e em produção. **Intocado nesta sessão.** Não mudar sem aprovação escrita do usuário registrada aqui.
- **Pareamento por `agent_secret`:** implementado e validado contra backend real em sessão anterior (ver CLAUDE.md, checkpoint "Pareamento por `agent_secret`"). Nada mudou nele nesta sessão.
- **`tests/e2e/vision-core-next-agent-apply.spec.mjs`:** permanente, commitado, 4/4 PASS. Guarda o gate de segurança.
- **`tests/e2e/vision-core-next-sf.spec.mjs`:** **decisão fechada nesta sessão — permanente**, commitado, 5/5 PASS. Critério registrado (ver CLAUDE.md): permanente quando (a) guarda gate de segurança OU (b) é superfície ativa de relay multiagente sem review por etapa. SF Next se qualifica pelo (b).
- **Software Factory Auto-Pilot/Modo Avançado:** agora roda **6 passos** quando "PASS GOLD" está marcado (é o padrão do HTML) — os 5 de sempre (analisar stack, preview arquivos, template, missão SDDF, pacote worker) + `POST /api/sf/gold-gate` como 6º passo, mesmo padrão `job_id`+polling dos outros. Desmarcado, roda só 5 e **nunca chama** `gold-gate` (testado explicitamente — `route.abort()` se chamasse, falharia visível).

---

## TAREFA EM ANDAMENTO

Nenhuma — sessão fechada e pushada nesta fatia. Próxima sessão escolhe livremente entre as pendências abaixo.

---

## ARQUIVOS TOCADOS nesta sessão (Claude Code, 2026-07-08, 3ª continuação)

**Fatia 1 (commit `1348e233`):** decisão + gap de `vision-core-next-sf.spec.mjs`.
- `tests/e2e/vision-core-next-sf.spec.mjs` — vira permanente; os 3 testes de geração reescritos pra usar `job_id`+polling (helper `mockAsyncSfEndpoints`) em vez do formato síncrono que o backend real nunca envia.
- `CLAUDE.md` — checkpoint documentando a decisão e o critério pra decisões futuras equivalentes.

**Fatia 2 (commit `649d7069`):** PASS GOLD ligado + 2º achado de contrato.
- `frontend/assets/vision-core-next-clean.js` — `SF_GOLD_GATE_STEP` + `sfActiveSteps` (calculado por execução a partir de `sf_options.pass_gold`); `updateSfProgress`/`nextStep` passaram a usar `sfActiveSteps` em vez da constante `SF_STEPS`.
- `frontend/vision-core-next.html` — cache-bust `v37` → `v38`.
- `tests/e2e/vision-core-next-sf.spec.mjs` — mocks reescritos pra devolver `result` como string pura (não `{content:...}`/`{files:...}`), igual ao que `GET /api/sf/job/:id` de verdade retorna (`server.js:4449`: `result: job.result.result`, um desembrulho de nível que os mocks antigos não refletiam); 2 casos novos (6 passos com gold-gate, 5 passos sem quando desmarcado).
- `CLAUDE.md` — checkpoint com os dois achados de contrato (o gap fechado herdado + o novo, achado durante a própria implementação do gold-gate).

Nada tocado em `backend/*` nesta sessão (só leitura, pra confirmar os contratos). `AGENT_APPLY_ENABLED` intocado.

---

## COMANDOS EXECUTADOS relevantes

```bash
node --check frontend/assets/vision-core-next-clean.js
node --check tests/e2e/vision-core-next-sf.spec.mjs
npx playwright test tests/e2e/vision-core-next-agent-apply.spec.mjs tests/e2e/vision-core-next-sf.spec.mjs --reporter=list
# => 9 passed

# Verificação de contrato feita por leitura direta do backend, não assumida:
grep -n "app.post('/api/sf/gold-gate'" -A 20 backend/server.js
grep -n "app.get('/api/sf/job/:id'" -A 15 backend/server.js

# Limpeza pós-teste (artefatos gerados, não commitar):
git checkout -- docs/STRESS-TEST-ARCH-E2E-RESULTS.json test-results/.last-run.json
```

---

## TESTES FEITOS

| Spec | Resultado |
|------|-----------|
| `tests/e2e/vision-core-next-agent-apply.spec.mjs` | 4/4 PASS (permanente, governança) |
| `tests/e2e/vision-core-next-sf.spec.mjs` | 5/5 PASS (permanente desde esta sessão) |
| `node --check` em todos os arquivos tocados | limpo |
| Grep estático `innerHTML`/`insertAdjacentHTML`/`eval`/`document.write` | zero hits |

---

## PRÓXIMO COMANDO RECOMENDADO

Não há comando único — pendências alternativas, escolha livre da próxima sessão. Se for continuar o roadmap do Software Factory:

```bash
grep -n "app.post('/api/sf/project-files'\|app.post('/api/sf/generate-zip'\|app.post('/api/sf/fetch-url'" backend/server.js
```

Pendências em ordem sugerida (não é decisão tomada):
1. **Resto do roadmap "Software Factory completo":** `/api/sf/project-files` (é o endpoint real que popula `.files[]` — ainda não conectado a nenhuma UI), `/api/sf/generate-zip` (download do projeto gerado), `/api/sf/fetch-url` (contexto por URL no Auto-Pilot). Nenhum desses foi mapeado em detalhe ainda nesta linha de trabalho — antes de implementar, ler o handler real em `server.js` primeiro (mesma disciplina desta sessão: 2 achados de contrato reais só apareceram por ler o backend com atenção, não por assumir).
2. **Vault-rollback** — ação destrutiva (sobrescreve `PROJECTS_DB`). Bug latente conhecido e não corrigido: não restaura `users`/`providers` mesmo salvos no snapshot (achado de sessão bem anterior, nunca revisitado). Se for implementar a UI, decidir primeiro se corrige o bug do legado ou só documenta.
3. **Tools-apply-fix** (`/api/security/apply-fix`) — escreve em disco real com backup automático. Risco menor que Vault-rollback mas ainda é escrita real — merece guard de confirmação dupla, mesmo padrão do GitHub PR/`agent-apply`.
4. **Settings/AI Provider Vault** (`/api/providers/save|delete|test`) — mexe com armazenamento de chave de API cifrada. UX própria necessária: nunca expor chave completa, só mascarada.
5. **Autenticação/token** (`/api/auth/register|login`, OAuth Google/GitHub) — a mais sensível de todas, mexe com sessão de qualquer usuário. Token é HMAC caseiro sem endpoint de refresh (expira em 24h fixo). Não começar sem alinhamento explícito — maior risco de todo o roadmap restante.
6. Quando (e só quando) o usuário decidir ligar `AGENT_APPLY_ENABLED=true` de verdade: revisitar persistência de `agentPairings` (SQLite/S3) antes — ver CLAUDE.md, checkpoint de pareamento, pendência já registrada lá.

---

## RISCOS/ALERTAS ativos

1. **[BAIXO] Deploy desatualizado.** Produção em `v31` (frontend), sem nada do backend desta linha de trabalho. Nada foi deployado (nem CF Pages nem EB) em nenhuma sessão até agora — avisar antes de qualquer teste manual em produção.
2. **[BAIXO] `git push`/`git fetch` exigem `PowerShell` neste ambiente** — `Bash` não tem rede pra hosts externos, localhost funciona normal.
3. **[BAIXO] CI bot colide com push do agente toda sessão até agora (4x)** — sempre um commit inofensivo em `docs/STRESS-TEST-*`/`docs/CI-LAST-RUN.md`. Rebase resolve sem conflito toda vez; `git stash`/`stash pop` necessário quando as deleções pré-existentes de `test-results/manual-verification-*` (não relacionadas a esta linha de trabalho, presentes desde antes da primeira sessão) bloqueiam o rebase.
4. **[INFO, não é risco] `/api/sf/project-files`, `/api/sf/generate-zip`, `/api/sf/fetch-url` existem no backend mas não têm handler lido/mapeado em detalhe ainda** — próxima sessão que for mexer no roadmap SF deve ler esses três primeiro (mesma disciplina que evitou 2 bugs reais nesta sessão), não assumir o contrato pelo nome.
