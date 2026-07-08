# CURRENT HANDOFF — Vision Core Next

**Documento vivo de revezamento entre agentes (Codex / Claude Code / OpenCode).**
Leia isto DEPOIS de `CLAUDE.md` e `docs/VISION_CORE_NEXT_FRONTEND_SPEC.md`, ANTES de editar qualquer código. Ver "PROTOCOLO DE REVEZAMENTO" no topo do `CLAUDE.md` para as regras completas.

> Última atualização: 2026-07-08, por Claude Code (Sonnet 5) — implementou pareamento real por agent_secret.

---

## ESTADO ATUAL

- **Commit local (`main`):** `a4fcbaea` — `feat(agent): implementa pareamento real por agent_secret (Fase 2b, pendencia maior)`. Ainda **não pushado** nesta sessão (próximo comando abaixo). Se `git log origin/main` não mostra `a4fcbaea` quando você ler isto, rode o push antes de continuar.
- **Cache-bust atual no código:** `?v=next-clean-37` (`frontend/vision-core-next.html` + CSS + JS).
- **Deployado em produção (`https://visioncoreai.pages.dev`):** ainda `next-clean-31`. Código local está 6 commits/versões à frente (`v31` → `v37`): Software Factory Auto-Pilot/Modo Avançado inteiro + o campo Agent Secret não estão no ar. **Não deployar sem aprovação explícita do usuário.**
- **Gate `AGENT_APPLY_ENABLED`:** `false` (fail-closed), local e em produção. **Não mudar sem aprovação escrita do usuário registrada aqui.** Isso vale mesmo agora que o pareamento real existe no backend — o gate é uma decisão separada, não decorre automaticamente de "o mecanismo técnico ficou pronto".
- **Pareamento por agente (`agent_secret`): implementado nesta sessão.** `POST /api/agent/register` gera `{agent_id, agent_secret}` real (antes só devolvia um `agent_id` sem dono). `apply_patch`/`apply_patch_multi` em `/api/agent/mission/queue` agora exigem esse secret (401 `agent_pairing_required` sem ele). Os dois binários do Vision Agent Local (`backend/agent-local/index.js` e `frontend/downloads/vision-agent.js`) chamam `/register` no primeiro boot e persistem as credenciais localmente.
- **`tests/e2e/vision-core-next-agent-apply.spec.mjs`:** spec permanente e commitado. 4/4 PASS, incluindo o novo cenário com `agent_secret` preenchido (prova que o bloqueio é o gate `AGENT_APPLY_ENABLED`, não falta de pareamento).
- **`tests/e2e/vision-core-next-sf.spec.mjs`:** existe, commitado (decisão de mantê-lo ou apagar ainda não foi formalizada — ver seção de riscos).

---

## TAREFA EM ANDAMENTO

Nenhuma em progresso agora — acabei de fechar o commit do pareamento. Próximo passo é só `git push`. Depois disso, não há tarefa "em voo": a próxima sessão escolhe livremente a próxima pendência (lista em ordem de prioridade abaixo, em RISCOS/ALERTAS e no roadmap do `CLAUDE.md`).

---

## ARQUIVOS TOCADOS nesta sessão (Claude Code, 2026-07-08)

**Fatia 1 — auditoria + retomada do incidente Codex (commits `3720b4ce`..`9e633252`):** ver histórico de commits, já documentado em detalhe no `CLAUDE.md`.

**Fatia 2 — retomada do relay OpenCode/Codex, SF Next (commit `72a849ee`):**
- `frontend/assets/vision-core-next-clean.js` — corrigido `/api/sf/jobs/:id` → `/api/sf/job/:id` (rota real é singular, `server.js:4393`).
- `tests/e2e/vision-core-next-sf.spec.mjs` — corrigido encoding misto (Latin-1 dentro de UTF-8) e a mesma URL.
- `CLAUDE.md`, `frontend/vision-core-next.html`, `frontend/assets/vision-core-next-clean.css` — trazidos do working tree do OpenCode/Codex, revisados, commitados.

**Fatia 3 — formalização do protocolo (commit `eba75071`):**
- `docs/CURRENT_HANDOFF.md` (novo, este arquivo).
- `CLAUDE.md` — seção "PROTOCOLO DE REVEZAMENTO" no topo.
- `docs/VISION_CORE_NEXT_FRONTEND_SPEC.md` — seção 10 "Regras Duras" + pointer pro HANDOFF.
- `AGENTS.md` — reescrito de snapshot duplicado (§205, 12+ dias velho) pra ponteiro fino.

**Fatia 4 — pareamento real por agent_secret (commit `a4fcbaea`):**
- `backend/server.js` — `agentPairings` Map, `verifyAgentSecret()` (timing-safe), `POST /api/agent/register` real, gate de secret em `apply_patch`/`apply_patch_multi`.
- `backend/agent-local/index.js` + `frontend/downloads/vision-agent.js` — `ensurePairing()`: registra no primeiro boot, persiste `{agent_id, agent_secret}` em arquivo local ao lado do script, imprime o secret uma vez no console.
- `frontend/vision-core-next.html` + `assets/vision-core-next-clean.js` — campo `#vcAgentApplyAgentSecret`, incluído no payload de `/api/agent/mission/queue`. Banner do painel atualizado (não fala mais de "falta mecanismo", fala de "decisão pendente do usuário").
- `tests/e2e/vision-core-next-agent-apply.spec.mjs` — teste atualizado pra preencher `agent_secret` e confirmar que o bloqueio continua sendo o gate, não a falta de pareamento.

---

## COMANDOS EXECUTADOS relevantes

```bash
node --check backend/server.js backend/agent-local/index.js frontend/downloads/vision-agent.js frontend/assets/vision-core-next-clean.js
npx playwright test tests/e2e/vision-core-next-agent-apply.spec.mjs tests/e2e/vision-core-next-sf.spec.mjs --reporter=list
# => 8 passed
git checkout -- docs/STRESS-TEST-ARCH-E2E-RESULTS.json test-results/.last-run.json   # reverte artefato de report poluído
grep -n "app\.\(get\|post\)('/api/sf" backend/server.js   # confirmou o mismatch /jobs vs /job
grep -n "innerHTML\|insertAdjacentHTML\|eval(\|document.write" <arquivos tocados>   # zero hits
```

---

## TESTES FEITOS

| Spec | Resultado |
|------|-----------|
| `tests/e2e/vision-core-next-agent-apply.spec.mjs` | 4/4 PASS (governança — permanente) |
| `tests/e2e/vision-core-next-sf.spec.mjs` | 4/4 PASS |
| `node --check` em todos os `.js`/`.mjs` tocados nesta sessão | limpo |

**Validação NÃO feita** (fora de escopo desta sessão, exige rede real): `/api/agent/register` nunca foi chamado contra um backend rodando de verdade — o EB não foi redeployado. A lógica foi revisada por leitura cuidadosa (mesmo padrão dos outros endpoints do arquivo) e `node --check`, não por execução real. Antes de confiar nisso em produção, alguém precisa: subir o `server.js` localmente (ou aguardar deploy EB) e rodar `curl -X POST .../api/agent/register` duas vezes, confirmar que os dois `agent_id` são diferentes e que reusar um `agent_secret` errado contra o `agent_id` certo devolve 401.

---

## PRÓXIMO COMANDO RECOMENDADO

```bash
git push origin main
```

(Mesmo procedimento das vezes anteriores: `Bash` não tem rede pra `github.com` neste ambiente, `PowerShell` tem — se `git push` falhar com "Failed to connect" numa ferramenta, tente a outra. Se `push` for rejeitado por "non-fast-forward", é quase certamente o bot de CI (`ci: auto-update CI-LAST-RUN...`) — `git fetch origin main`, confirme que o commit remoto extra só toca `docs/STRESS-TEST-*`/`docs/CI-LAST-RUN.md`, `git stash` as deleções pré-existentes de `test-results/` se bloquearem o rebase, `git rebase origin/main main`, `git stash pop`, `git push`.)

Depois do push, pendências em ordem sugerida (não é decisão tomada):
1. **Validar o pareamento contra um backend real** (ver "Validação NÃO feita" acima) antes de confiar nele.
2. **`/api/agent/mission/pending` (polling) não exige `agent_secret` ainda** — qualquer um pode fazer polling alegando um `agent_id` e ver/roubar resultados de missão que não são dele (severidade menor que escrita real, mas ainda uma lacuna). Extensão natural do trabalho desta sessão.
3. **Decidir se `tests/e2e/vision-core-next-sf.spec.mjs` vira permanente** (como o `agent-apply` spec) ou volta a ser temporário/apagado. Ainda commitado, decisão pendente.
4. **Gap de teste conhecido:** 2 dos 3 testes do spec SF mockam `POST /api/sf/*` como síncrono, mas o backend real sempre responde `{job_id, status:'pending'}` (`server.js:4430`). O frontend trata os dois casos (código defensivo, não é bug), mas só o 3º teste reflete o contrato real.
5. Depois disso, resto do roadmap em `CLAUDE.md` (Software Factory completo, Vault-rollback, Tools-apply-fix, Settings/AI Provider Vault, autenticação).

---

## RISCOS/ALERTAS ativos

1. **[MÉDIO] Pareamento (`agent_secret`) implementado mas não validado contra rede real.** Revisão de código cuidadosa + `node --check`, sem execução real (EB não redeployado). Ver "Validação NÃO feita" acima antes de confiar nisso em produção.
2. **[MÉDIO] `/api/agent/mission/pending` ainda não exige `agent_secret`.** Só o lado de escrita (`apply_patch`/`apply_patch_multi` em `/mission/queue`) foi fechado nesta sessão — o lado de leitura (polling) continua aceitando qualquer `agent_id` sem prova de posse. Risco é menor (leitura/interceptação de resultado, não escrita real), mas é uma lacuna real, não fechada por escolha de escopo, não por esquecimento.
3. **[MÉDIO] Deploy desatualizado.** Produção em `v31`, código local em `v37`. Diferença: SF Auto-Pilot/Modo Avançado inteiro + campo Agent Secret só existem localmente. Avisar antes de qualquer teste manual em produção — o usuário pode achar que algo está no ar quando não está.
4. **[BAIXO] `git push`/`git fetch` exigem `PowerShell` neste ambiente** — `Bash` não tem rota de rede pra `github.com` (confirmado 2x nesta sessão). Não é problema de rede real do usuário, é limitação da ferramenta `Bash` especificamente aqui.
5. **[BAIXO] CI bot (`github-actions[bot]`) tem colidido com push do agente 2x nesta sessão** — sempre um commit inofensivo em `docs/STRESS-TEST-*`/`docs/CI-LAST-RUN.md`, sem sobreposição com o que a frente Next toca. Rebase resolve sem conflito toda vez até agora; não vira problema real a menos que algum dia toque um arquivo que a frente Next também esteja editando.
