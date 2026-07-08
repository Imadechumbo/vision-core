# CURRENT HANDOFF — Vision Core Next

**Documento vivo de revezamento entre agentes (Codex / Claude Code / OpenCode).**
Leia isto DEPOIS de `CLAUDE.md` e `docs/VISION_CORE_NEXT_FRONTEND_SPEC.md`, ANTES de editar qualquer código. Ver "PROTOCOLO DE REVEZAMENTO" no topo do `CLAUDE.md` para as regras completas.

> Última atualização: 2026-07-08, por Claude Code (Sonnet 5) — auditoria de paridade legado vs. Next (`docs/PARITY_AUDIT.md`), diagnóstico apenas, nenhum código tocado.

---

## DECISÃO PENDENTE DO USUÁRIO — auditoria de paridade

`docs/PARITY_AUDIT.md` (novo, commit `f6caed7e`) mapeou o que falta pro Next alcançar paridade com o front legado (`index.html`+`vision-core-bundle.*`). Resumo: **13 features já cobertas** (2 delas o Next já está à frente), **5 grupos com trabalho real pendente** (Auth, AI Provider Vault write, Tools Apply-Fix, 7 passos restantes de Software Factory, Deploy dropdown — estimativa ~6-7 turnos, excluindo Deploy que é decisão de escopo), **13 itens candidatos a não migrar** (código morto confirmado por evidência — tutorial zumbi, arquivo `vision-core-clean-runtime.js` de 312KB nunca carregado, painéis OSINT/OpenSquad estáticos, IDs duplicados, etc.).

**Nenhum arquivo foi movido, deletado ou alterado nessa auditoria — é só diagnóstico.** A próxima sessão **não deve começar a cortar/portar nada da lista sem o usuário revisar `docs/PARITY_AUDIT.md` e dizer o que priorizar primeiro** (a ordem sugerida no documento — Auth por último, é a mais arriscada — é só uma sugestão, não uma decisão tomada). Se o usuário já respondeu isso em uma mensagem depois desta, essa resposta é a fonte de verdade, não este parágrafo.

---

## ESTADO ATUAL

- **Commit local (`main`) = commit remoto (`origin/main`):** `f6caed7e` — `docs: auditoria de paridade legado vs Next (diagnostico, sem mudanca de codigo)`. **Já pushado.**
- **Cache-bust atual no código:** `?v=next-clean-38` (`frontend/vision-core-next.html`, CSS e JS).
- **Deployado em produção (`https://visioncoreai.pages.dev`):** ainda `next-clean-31`. Código local segue vários passos à frente (Software Factory completo com PASS GOLD, pareamento de agente, etc.) — nada disso está no ar. Backend/EB também sem nenhuma mudança desta linha de trabalho deployada. **Não deployar (CF Pages nem EB) sem aprovação explícita do usuário.**
- **Gate `AGENT_APPLY_ENABLED`:** `false` (fail-closed), local e em produção. **Intocado nesta sessão.** Não mudar sem aprovação escrita do usuário registrada aqui.
- **Pareamento por `agent_secret`:** implementado e validado contra backend real em sessão anterior (ver CLAUDE.md, checkpoint "Pareamento por `agent_secret`"). Nada mudou nele nesta sessão.
- **`tests/e2e/vision-core-next-agent-apply.spec.mjs`:** permanente, commitado, 4/4 PASS. Guarda o gate de segurança.
- **`tests/e2e/vision-core-next-sf.spec.mjs`:** **decisão fechada nesta sessão — permanente**, commitado, 5/5 PASS. Critério registrado (ver CLAUDE.md): permanente quando (a) guarda gate de segurança OU (b) é superfície ativa de relay multiagente sem review por etapa. SF Next se qualifica pelo (b).
- **Software Factory Auto-Pilot/Modo Avançado:** agora roda **6 passos** quando "PASS GOLD" está marcado (é o padrão do HTML) — os 5 de sempre (analisar stack, preview arquivos, template, missão SDDF, pacote worker) + `POST /api/sf/gold-gate` como 6º passo, mesmo padrão `job_id`+polling dos outros. Desmarcado, roda só 5 e **nunca chama** `gold-gate` (testado explicitamente — `route.abort()` se chamasse, falharia visível).

---

## TAREFA EM ANDAMENTO

Nenhuma — auditoria fechada e pushada. Próxima sessão precisa da decisão do usuário sobre `docs/PARITY_AUDIT.md` antes de escolher a próxima pendência (ver seção no topo deste arquivo).

---

## ARQUIVOS TOCADOS nesta sessão (Claude Code, 2026-07-08, 4ª continuação — auditoria de paridade)

**Só documentação — nenhum código tocado, por design da tarefa (diagnóstico).**

- `docs/PARITY_AUDIT.md` (novo, commit `f6caed7e`) — inventário completo do front legado vs. Next, feito via 2 agentes de investigação (Explore) em paralelo sobre `vision-core-bundle.js`/`vision-core-clean-runtime.js`/`vision-core-clean-state.js`/`index.html` e sobre os ~30 arquivos CSS de `assets/`, cruzado contra as 133 rotas reais de `backend/server.js`. Dois achados (billing UI, apply-fix reachability) verificados manualmente por mim depois, porque nenhum agente cobriu explicitamente.
- `docs/CURRENT_HANDOFF.md` (este arquivo) — nova seção "DECISÃO PENDENTE DO USUÁRIO" no topo.

Nenhum arquivo de `frontend/`, `backend/`, ou `tests/` foi alterado. `AGENT_APPLY_ENABLED` intocado. Nada deployado.

---

## COMANDOS EXECUTADOS relevantes

```bash
# Mapeamento de rotas reais do backend (verdade-base pra cruzar contra o legado e o Next):
grep -oE "app\.(get|post|put|delete|all)\('[^']+'" backend/server.js | sort -u

# O que o Next já chama hoje:
grep -oE "'/api/[a-zA-Z0-9/_:.-]+'" frontend/assets/vision-core-next-clean.js | sort -u

# Achado estrutural do bundle CSS (verificado direto, não assumido):
grep -n "stylesheet\|\.css" frontend/index.html
# comentário no próprio arquivo: "vision-core-bundle.css — 26 CSS files concatenated in original import order"

# 2 verificações que nenhum agente cobriu, feitas manualmente:
grep -n "billing\|hotmart\|/api/billing" frontend/index.html      # confirma painel decorativo, sem fetch real
grep -n "apply-fix\|applyFix" frontend/assets/vision-core-bundle.js  # confirma botão real, §135
```

Os 2 agentes de investigação rodaram com Grep extensivamente sobre os arquivos legados — comandos deles não reproduzidos aqui (ver `docs/PARITY_AUDIT.md` pra evidência linha-a-linha de cada achado).

---

## TESTES FEITOS

Nenhum — tarefa era diagnóstico puro, sem mudança de código pra validar. Suíte Playwright permanece no estado da sessão anterior (9/9 PASS entre `agent-apply` + `sf`), não rerodada porque nada que ela cobre foi tocado.

---

## PRÓXIMO COMANDO RECOMENDADO

Nenhum comando técnico — o próximo passo é o **usuário ler `docs/PARITY_AUDIT.md`** e decidir prioridade entre os 5 grupos da seção (b) do relatório. Depois disso:

```bash
cat docs/PARITY_AUDIT.md   # se ainda não leu
```

Pendências (a ordem no `PARITY_AUDIT.md` é sugestão, não decisão — ver seção "DECISÃO PENDENTE" no topo deste arquivo):
1. **AI Provider Vault — salvar/testar/remover** (`/api/providers/save|delete|test`) — ~1 turno, padrão conhecido (mascarar chave).
2. **Tools — Aplicar Fix** (`/api/security/apply-fix`) — ~1 turno, mesmo padrão de confirmação dupla já usado 2x (GitHub PR, agent-apply).
3. **Software Factory — 7 passos restantes** (`project-files`, `generate-zip`, `fetch-url`, `patch-validator`, `context-snapshot`, `risk-assessor`, `rollback-planner`) — ~2 turnos, padrão `SF_STEPS`+`job_id`/polling já existe; ler cada handler real em `server.js` antes de conectar (2 achados de contrato reais nesta linha de trabalho só apareceram por fazer isso com cuidado).
4. **Auth (registro/login/OAuth)** — ~2-3 turnos, a mais arriscada. Não começar sem alinhamento explícito.
5. **Deploy dropdown** — bloqueado pela SPEC atual (seção 2, "Arquivos Proibidos"), decisão de escopo do usuário, não item de esforço.
6. **13 itens candidatos a não migrar** (ver `PARITY_AUDIT.md` seção c) — não excluir nada sem aprovação explícita, mesmo os com evidência forte de serem código morto.
7. Quando (e só quando) o usuário decidir ligar `AGENT_APPLY_ENABLED=true` de verdade: revisitar persistência de `agentPairings` (SQLite/S3) antes — ver CLAUDE.md, checkpoint de pareamento.

---

## RISCOS/ALERTAS ativos

1. **[BAIXO] Deploy desatualizado.** Produção em `v31` (frontend), sem nada do backend desta linha de trabalho. Nada foi deployado (nem CF Pages nem EB) em nenhuma sessão até agora — avisar antes de qualquer teste manual em produção.
2. **[BAIXO] `git push`/`git fetch` exigem `PowerShell` neste ambiente** — `Bash` não tem rede pra hosts externos, localhost funciona normal.
3. **[BAIXO] CI bot colide com push do agente toda sessão até agora (5x)** — sempre um commit inofensivo em `docs/STRESS-TEST-*`/`docs/CI-LAST-RUN.md`. Rebase/fast-forward resolve sem conflito toda vez; `git stash`/`stash pop` necessário quando as deleções pré-existentes de `test-results/manual-verification-*` (não relacionadas a esta linha de trabalho, presentes desde antes da primeira sessão) bloqueiam o rebase.
4. **[INFO] `docs/PARITY_AUDIT.md` identificou `vision-core-clean-runtime.js` (312KB) como não carregado por nada.** Candidato forte a deleção, mas **não deletado nesta sessão** — a tarefa era diagnóstico puro. Não excluir sem o usuário confirmar depois de ler o relatório.
4. **[INFO, não é risco] `/api/sf/project-files`, `/api/sf/generate-zip`, `/api/sf/fetch-url` existem no backend mas não têm handler lido/mapeado em detalhe ainda** — próxima sessão que for mexer no roadmap SF deve ler esses três primeiro (mesma disciplina que evitou 2 bugs reais nesta sessão), não assumir o contrato pelo nome.
