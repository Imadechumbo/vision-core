# CURRENT HANDOFF — Vision Core Next

**Documento vivo de revezamento entre agentes (Codex / Claude Code / OpenCode).**
Leia isto DEPOIS de `CLAUDE.md` e `docs/VISION_CORE_NEXT_FRONTEND_SPEC.md`, ANTES de editar qualquer código. Ver "PROTOCOLO DE REVEZAMENTO" no topo do `CLAUDE.md` para as regras completas.

> Última atualização: 2026-07-08, por Claude Code (Sonnet 5), sessão de formalização do protocolo.

---

## ESTADO ATUAL

- **Commit local (`main`):** `764b60e2` — `feat(next): Software Factory Auto-Pilot + Modo Avancado (retomada OpenCode/Codex v33-v36)`.
- **Push:** ainda **não feito** nesta sessão (vai acontecer logo após este handoff ser escrito — se você está lendo isto e `git log origin/main` não mostra `764b60e2`, o push falhou ou não rodou; rode `git push origin main` antes de continuar).
- **Cache-bust atual no código:** `?v=next-clean-36` (`frontend/vision-core-next.html` + CSS + JS, os três sincronizados).
- **Deployado em produção (`https://visioncoreai.pages.dev`):** `next-clean-31` — **desatualizado em relação ao código local** (`v36`). O Software Factory Auto-Pilot/Modo Avançado (v33-v36) ainda não foi deployado. Deploy exige aprovação manual explícita do usuário antes de rodar (regra dura do projeto) — não deployar `v36` sem pedir.
- **Gate de segurança `AGENT_APPLY_ENABLED`:** `false` (fail-closed), tanto no código local quanto no que está em produção (`v31` já tinha isso). **Não mudar sem aprovação escrita do usuário registrada aqui.**
- **`tests/e2e/vision-core-next-agent-apply.spec.mjs`:** spec permanente e commitado (única exceção ao padrão "roda e apaga"). Deve continuar passando sempre.

---

## TAREFA EM ANDAMENTO

Acabei de formalizar o protocolo de revezamento (este arquivo + seção nova no `CLAUDE.md` + regras duras no `VISION_CORE_NEXT_FRONTEND_SPEC.md` + `AGENTS.md` atualizado). Depois deste commit + push, vou continuar para a próxima pendência do roadmap: **investigar/implementar o token de pareamento por agente** (ver RISCOS/ALERTAS abaixo — é a maior pendência de segurança ativa). Se eu bater o limite de contexto no meio, este bloco vai estar desatualizado — trate isso como sinal de parada abrupta, não como ausência de trabalho, e confira `git log` + `git diff` antes de assumir que nada mudou.

---

## ARQUIVOS TOCADOS na última sessão (Claude Code, 2026-07-08)

- `docs/CURRENT_HANDOFF.md` — criado (este arquivo).
- `CLAUDE.md` — seção "PROTOCOLO DE REVEZAMENTO" adicionada no topo; commit anterior também trouxe os checkpoints v33-v36 do OpenCode/Codex.
- `docs/VISION_CORE_NEXT_FRONTEND_SPEC.md` — seção 10 "Regras Duras" adicionada; já existia (criado por OpenCode/Codex, não commitado até esta sessão).
- `AGENTS.md` — reescrito (estava parado em §205/2026-06-27, desatualizado, causa raiz de parte do desalinhamento do Codex).
- `frontend/assets/vision-core-next-clean.js` — corrigido `/api/sf/jobs/:id` → `/api/sf/job/:id` (rota real do backend é singular, `server.js:4393`; o mock do Playwright escondia esse bug porque só espelha a URL que o frontend chama).
- `tests/e2e/vision-core-next-sf.spec.mjs` — corrigido encoding misto (Latin-1 dentro de arquivo UTF-8, 2 strings corrompidas: "geração"/"concluído") e a mesma URL `/api/sf/jobs/` → `/api/sf/job/`.
- `bin/deploy-pages.sh` (sessão anterior, já commitado em `9e633252`) — exclui explicitamente os protótipos soltos (`next.html`, `atomic-core.*`, `_test_here.txt`, `vision-core-next.{css,js}` pré-clean) do pacote de deploy.

---

## COMANDOS EXECUTADOS relevantes

```bash
node --check frontend/assets/vision-core-next-clean.js
node --check tests/e2e/vision-core-next-sf.spec.mjs
node --check tests/e2e/vision-core-next-agent-apply.spec.mjs
npx playwright test tests/e2e/vision-core-next-agent-apply.spec.mjs tests/e2e/vision-core-next-sf.spec.mjs --reporter=list
# => 8 passed (depois de corrigir o encoding e a URL /api/sf/job)
git checkout -- docs/STRESS-TEST-ARCH-E2E-RESULTS.json test-results/.last-run.json   # reverte artefato de report poluído pela rodada local
```

Deploy real (sessão anterior, `v31`, não repetir sem necessidade):
```bash
# Bash sem rede neste ambiente — deploy feito via PowerShell reproduzindo bin/deploy-pages.sh manualmente
git push origin main   # via PowerShell (Bash também sem rede pra GitHub); usar rebase, nunca force-push
```

---

## TESTES FEITOS

| Spec | Resultado | Observação |
|------|-----------|------------|
| `tests/e2e/vision-core-next-agent-apply.spec.mjs` | 4/4 PASS | Permanente, guarda o gate `AGENT_APPLY_ENABLED=false`. |
| `tests/e2e/vision-core-next-sf.spec.mjs` | 4/4 PASS (era 3/4 antes da correção de encoding) | Temporário-de-fato mas ainda não apagado; decisão de mantê-lo commitado ou não ainda não foi tomada explicitamente — ver PRÓXIMO COMANDO. |
| `node --check` em todos os `.js`/`.mjs` tocados | limpo | — |
| Verificação HTTP real (`Invoke-WebRequest` via PowerShell) contra `visioncoreai.pages.dev` | confirmado `next-clean-31` + `AGENT_APPLY_ENABLED=false` ao vivo | Sessão anterior; não repetido nesta sessão porque nada foi deployado. |

**Gap conhecido, não bloqueante:** 2 dos 3 testes do `vision-core-next-sf.spec.mjs` mockam a resposta do `POST /api/sf/*` como síncrona (sem `job_id`), mas o backend real (`server.js:4430`) **sempre** responde `{job_id, status:'pending'}` — nunca resultado direto. O frontend trata os dois casos (código defensivo, não é bug), mas só o 3º teste ("async job_id polling") reflete o contrato real do backend. Não expandido nesta sessão por escopo — se for tocar nesses testes de novo, considere reescrever os 2 primeiros para também usar o padrão `job_id`+polling.

---

## PRÓXIMO COMANDO RECOMENDADO

```bash
git push origin main
```

Depois disso, a próxima pendência de maior prioridade é o **token de pareamento por agente** (ver RISCOS/ALERTAS). Não há comando literal pronto ainda — é trabalho de investigação + implementação backend, começando por:

```bash
grep -n "agent_id\|agentToken\|VC_TOKEN" backend/server.js backend/agent-local/index.js frontend/downloads/vision-agent.js
```

---

## RISCOS/ALERTAS ativos

1. **[ALTO] Token de pareamento por agente ausente.** `agent_id` (usado em `apply_patch`/`apply_patch_multi`) é um hash não-secreto (hostname+pasta), e nenhuma rota `/api/agent/mission/*` tem middleware de autenticação. Qualquer chamador da API pública que souber/adivinhar um `agent_id` pode enfileirar uma missão de escrita real contra o Vision Agent Local de outra pessoa. `AGENT_APPLY_ENABLED=false` é a única barreira hoje — **não remover esse gate até esse token existir de verdade**, e qualquer mudança nele exige aprovação escrita do usuário, registrada aqui.
2. **[MÉDIO] Deploy desatualizado.** Produção está em `v31`; código local em `v36`. Diferença: painel Software Factory inteiro (Auto-Pilot + Modo Avançado) só existe localmente. Não afeta segurança (nada escreve/executa de verdade), mas o usuário pode achar que algo está no ar quando não está — avisar antes de qualquer teste manual no domínio de produção.
3. **[BAIXO] `AGENTS.md` estava parado em §205 (2026-06-27), 12 dias sem atualização** — causa raiz parcial do desalinhamento do Codex na sessão do incidente. Corrigido nesta sessão (agora aponta pros 3 arquivos do protocolo em vez de duplicar conteúdo).
4. **[BAIXO] `git push` requer PowerShell, não Bash, neste ambiente.** `Bash` não tem rota de rede para `github.com` (confirmado, `curl`/`git fetch` falham com erro de conexão); `PowerShell` tem rede real. Se `git push`/`git fetch` falharem "Failed to connect" via uma ferramenta, tente a outra antes de assumir que é um problema de rede real do usuário.
