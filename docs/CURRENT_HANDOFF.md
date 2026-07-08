# CURRENT HANDOFF — Vision Core Next

**Documento vivo de revezamento entre agentes (Codex / Claude Code / OpenCode).**
Leia isto DEPOIS de `CLAUDE.md` e `docs/VISION_CORE_NEXT_FRONTEND_SPEC.md`, ANTES de editar qualquer código. Ver "PROTOCOLO DE REVEZAMENTO" no topo do `CLAUDE.md` para as regras completas.

> Última atualização: 2026-07-08, por Claude Code (Sonnet 5) — validou pareamento contra backend real, fechou vazamento de secret, estendeu pra pending/result.

---

## ESTADO ATUAL

- **Commit local (`main`) = commit remoto (`origin/main`):** `c0644343` — `fix(agent): valida pareamento contra backend real, fecha vazamento de secret, estende para pending/result`. **Já pushado.**
- **Cache-bust atual no código:** `?v=next-clean-37` (sem mudança nesta sessão — só backend + binários do agente foram tocados).
- **Deployado em produção (`https://visioncoreai.pages.dev`):** ainda `next-clean-31`. Código local segue à frente (SF Auto-Pilot/Modo Avançado + Agent Secret field não estão no ar). Backend/EB também não recebeu nada desta sessão — tudo validado localmente, nada deployado. **Não deployar (CF Pages nem EB) sem aprovação explícita do usuário.**
- **Gate `AGENT_APPLY_ENABLED`:** `false` (fail-closed), local e em produção. **Não mudar sem aprovação escrita do usuário registrada aqui.**
- **Pareamento por `agent_secret`: implementado E validado contra backend real nesta sessão.**
  - `POST /api/agent/register`, `/mission/queue` (apply_patch/multi), `/mission/pending` (poll), `/mission/result` (post) — os quatro endpoints agora seguem o mesmo padrão: quem reivindica um `agent_id` precisa provar posse do `agent_secret` correspondente, ou leva 401 `agent_pairing_required`. Missões sem dono (`agent_id` vazio — dry-run/general) continuam anônimas, sem mudança de comportamento.
  - Validado via `curl` contra `server.js` rodando localmente (porta 8099, sem AWS/S3, sem tocar EB): registro gera pares distintos a cada chamada; secret errado/ausente/de outro agente sempre 401; secret certo sempre aceito; nos quatro endpoints.
  - **Bug real encontrado e corrigido durante a própria validação:** `agent_secret` estava sendo persistido dentro do resultado armazenado por `/mission/result` (`{...body, received_at}`), e `GET /mission/result/:id` é público sem auth — o secret vazava de volta pra qualquer um que soubesse o `mission_id`. Corrigido (`const { agent_secret, ...safeBody } = body` antes de `storeResult`). Confirmado por reteste: `agent_id` aparece no resultado (inofensivo), `agent_secret` não aparece mais.
  - **Achado que quase virou regressão:** nenhum dos dois binários do agente enviava `agent_secret` no poll/result — corrigido em `backend/agent-local/index.js` e `frontend/downloads/vision-agent.js`. Sem esse fix, todo agente já pareado ficaria permanentemente 401'd (mesmo em missões anônimas) assim que este backend fosse ao ar.
  - **`agentPairings` continua em memória** (não SQLite, não S3) — decisão explícita, não esquecimento. Motivo: gate ainda fechado, nada em produção depende disso, e sync S3 sem poder testar contra AWS real neste ambiente reintroduziria o mesmo tipo de risco do bug do secret vazado (código de segurança não testado contra a infra que deveria proteger). **Mitigação implementada e testada ao vivo:** self-healing — cada binário do agente, ao levar 401 no poll, apaga sua credencial local (`.vc-agent-credentials.json`, ao lado do script) e chama `/register` de novo sozinho. Testado matando/subindo o `server.js` local de novo (simula redeploy) com agente já pareado rodando: detectou 401, reregistrou, persistiu novo par. **Consequência a saber:** `agent_id` muda a cada redeploy do EB — se o gate for ligado um dia e um humano copiar `agent_id`/`agent_secret` pra UI, precisa recopiar do console do agente após qualquer redeploy.
- **`tests/e2e/vision-core-next-agent-apply.spec.mjs`:** spec permanente e commitado. 4/4 PASS, sem mudança necessária nesta sessão (contrato do lado do browser não mudou).
- **`tests/e2e/vision-core-next-sf.spec.mjs`:** existe, commitado, 4/4 PASS. Decisão de mantê-lo permanente ou apagar ainda não foi formalizada.

---

## TAREFA EM ANDAMENTO

Nenhuma em progresso — sessão fechada e pushada. Próxima sessão escolhe livremente entre RISCOS/ALERTAS abaixo ou o roadmap do `CLAUDE.md`.

---

## ARQUIVOS TOCADOS nesta sessão (Claude Code, 2026-07-08, continuação)

- `backend/server.js` — `/mission/pending` e `/mission/result` ganharam o mesmo gate de `agent_secret` que `/mission/queue` já tinha; fix do vazamento de `agent_secret` no `storeResult`.
- `backend/agent-local/index.js` — poll agora envia `agent_id`+`agent_secret` (antes não enviava `agent_id` nenhum no poll — bug pré-existente, também corrigido); resultado agora envia `agent_secret`; self-healing em 401 (limpa credencial local, reregistra).
- `frontend/downloads/vision-agent.js` — poll e resultado passam a enviar `agent_secret`; self-healing em 401, mesmo padrão.
- `CLAUDE.md` — novo checkpoint "Pareamento por `agent_secret` — validação real + extensão pra pending/result" com o relato completo da validação e dos dois achados (vazamento de secret, binários sem enviar secret); linha de pendências atualizada.
- `docs/CURRENT_HANDOFF.md` (este arquivo) — reescrito com o estado pós-validação.

Nada tocado em `frontend/vision-core-next.html`, `assets/vision-core-next-clean.{css,js}`, ou qualquer teste Playwright — o contrato do lado do browser não mudou nesta sessão.

---

## COMANDOS EXECUTADOS relevantes

```bash
# Subir o backend local pra testar de verdade, sem tocar EB nem AWS:
cd backend && PORT=8099 NODE_TLS_REJECT_UNAUTHORIZED=0 node server.js
# (roda limpo sem credenciais S3 — AWS_S3_BUCKET vazio por padrão pula o load)

# Bateria de validação (repetir pros 4 endpoints: register, queue, pending, result):
curl -s -X POST http://127.0.0.1:8099/api/agent/register
curl -s -X POST http://127.0.0.1:8099/api/agent/mission/queue -H "Content-Type: application/json" -d '{"type":"apply_patch","agent_id":"...","agent_secret":"...","file":"f","patch":{"search":"a","replace":"b"}}'
curl -s "http://127.0.0.1:8099/api/agent/mission/pending?agent_id=...&agent_secret=..."
curl -s -X POST http://127.0.0.1:8099/api/agent/mission/result -H "Content-Type: application/json" -d '{"mission_id":"...","agent_id":"...","agent_secret":"...","ok":true}'

# Teste de self-healing (mata o server, simula redeploy, roda o agente com credencial velha):
node backend/agent-local/index.js /caminho/scratch   # 1a vez: registra
# mata o processo do server.js, sobe de novo (agentPairings zera)
node backend/agent-local/index.js /caminho/scratch   # 2a vez: 401 -> reregistra sozinho

npx playwright test tests/e2e/vision-core-next-agent-apply.spec.mjs tests/e2e/vision-core-next-sf.spec.mjs --reporter=list
# => 8 passed

# Limpeza pós-teste (arquivos gerados pela validação local, não commitar):
rm -f data/agent-queue.sqlite backend/agent-local/.vc-agent-credentials.json frontend/downloads/.vc-agent-credentials.json
git checkout -- data/agent-queue.sqlite docs/STRESS-TEST-ARCH-E2E-RESULTS.json test-results/.last-run.json
```

**Nota de ambiente:** `Bash` aqui não tem rota de rede pra hosts externos (`curl` a `github.com` falha), mas **localhost funciona normal** — os testes acima rodaram todos via `curl`/`node` no `Bash` sem problema. Só `git push`/`git fetch` (que vão pra `github.com`) precisam de `PowerShell`.

---

## TESTES FEITOS

| O quê | Como | Resultado |
|-------|------|-----------|
| `POST /api/agent/register` × 2 | curl real, backend local | `agent_id`/`agent_secret` distintos |
| `/mission/queue` apply_patch: secret errado/ausente/de outro agente/correto | curl real | 401/401/401/200, nessa ordem |
| `/mission/pending`: mesmo padrão + poll anônimo (sem `agent_id`) | curl real | 401/401/200 anônimo/200 dono |
| `/mission/result`: mesmo padrão + leitura confirmando `agent_secret` não vaza mais | curl real | 401/401/200, readback sem secret |
| Self-healing dos 2 binários do agente após "redeploy" (restart do server) | execução real (`node backend/agent-local/index.js` e `node frontend/downloads/vision-agent.js` contra o server local) | ambos detectam 401, reregistram sozinhos, persistem novo par |
| `tests/e2e/vision-core-next-agent-apply.spec.mjs` + `vision-core-next-sf.spec.mjs` | Playwright mockado (padrão da casa) | 8/8 PASS |
| `node --check` em todos os arquivos tocados | — | limpo |

**Não testado** (fora do que foi pedido / exige infra real que não está disponível aqui): comportamento contra o EB de verdade, sync com S3/AWS real, qualquer coisa envolvendo `AGENT_APPLY_ENABLED=true`.

---

## PRÓXIMO COMANDO RECOMENDADO

Não há comando único óbvio — pendências alternativas, escolha livre da próxima sessão:

```bash
# Se for continuar o roadmap do Software Factory:
grep -n "SF_GENERATORS\|app.post('/api/sf" backend/server.js

# Se for decidir o destino do spec SF (permanente vs. apagar):
cat docs/CURRENT_HANDOFF.md   # ver seção de riscos abaixo, item sobre isso
```

Pendências em ordem sugerida (não é decisão tomada):
1. **Decidir se `tests/e2e/vision-core-next-sf.spec.mjs` vira permanente** (como o `agent-apply`) ou volta a ser temporário/apagado.
2. **Gap de teste conhecido no spec SF:** 2 dos 3 testes mockam `POST /api/sf/*` como síncrono; o backend real sempre responde `{job_id, status:'pending'}`. Não é bug, é cobertura incompleta.
3. Resto do roadmap em `CLAUDE.md`: Software Factory completo, Vault-rollback, Tools-apply-fix, Settings/AI Provider Vault, autenticação.
4. Quando (e só quando) o usuário decidir ligar `AGENT_APPLY_ENABLED=true` de verdade: revisitar a persistência de `agentPairings` (SQLite/S3) antes, já que o self-healing muda o `agent_id` a cada redeploy — aceitável enquanto ninguém depende disso, mas incômodo em uso real.

---

## RISCOS/ALERTAS ativos

1. **[BAIXO, era MÉDIO] Pareamento agora validado contra backend real** — deixou de ser risco "não testado". Resta: nunca testado contra EB/AWS real (S3, ambiente de produção de verdade).
2. **[BAIXO] `agentPairings` em memória, reseta a cada restart/redeploy.** Mitigado por self-healing testado. Efeito colateral aceito: `agent_id` muda a cada redeploy — só vira problema prático quando o gate for ligado de verdade (ver pendência 4 acima).
3. **[MÉDIO] Deploy desatualizado.** Produção em `v31` (frontend) e sem as mudanças de backend desta sessão. Nada foi deployado (nem CF Pages nem EB) — avisar antes de qualquer teste manual em produção.
4. **[BAIXO] `git push`/`git fetch` exigem `PowerShell` neste ambiente** — `Bash` não tem rede pra hosts externos, mas localhost funciona normal (testado extensivamente nesta sessão).
5. **[BAIXO] CI bot colide com push do agente toda sessão até agora (3x)** — sempre um commit inofensivo em `docs/STRESS-TEST-*`/`docs/CI-LAST-RUN.md`. Rebase resolve sem conflito toda vez.
