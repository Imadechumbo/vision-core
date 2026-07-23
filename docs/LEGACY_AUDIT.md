# LEGACY_AUDIT — Legado vs. Arquitetura Limpa, auditoria com evidência (2026-07-23)

> Sessão de investigação original: nenhuma correção, commit, push ou deploy. Ver `docs/DECISIONS.md` para decisões já fechadas citadas aqui — não duplicadas.
> **Sessão seguinte (2026-07-23, mesmo dia):** achados A, B e C corrigidos — ver status por achado abaixo. Não deployado ainda — aguardando autorização explícita do usuário, mesma disciplina de push/deploy do resto do projeto.

**Escopo confirmado:** repositório único (`vision-core`). Legado (`frontend/index.html`) e Next (`frontend/vision-core-next.html`) compartilham o mesmo `backend/server.js` — não existe repositório separado do Legado.

---

## 1. Achados de segurança reais (prioridade máxima)

### A — CRÍTICO — `/api/agent/mission/push` e `/api/agent/mission/revert` executam git sem gate algum — **CORRIGIDO 2026-07-23**

`backend/server.js:4159` e `:4174` enfileiram missão `git_push`/`git_revert` **sem `agent_id`**, sem middleware de auth na rota. O pareamento `agent_secret` (DECISION-006) só é checado em `/api/agent/mission/queue` para `type === 'apply_patch'`/`'apply_patch_multi'` (`server.js:4050-4077`) — push/revert nunca passam por ali. `vision-agent.cjs:299-328` executa `git push origin HEAD` / `git reset --hard HEAD~1` incondicionalmente ao receber a missão via polling anônimo, só logando `"aprovação humana recebida"` — nenhuma aprovação é de fato verificada em código.

`docs/ROADMAP.md:146` **afirma o contrário**: que `git_push`/`git_revert` exigem pareamento `agent_id`/`agent_secret` igual `apply_patch`. Isso é uma divergência documentação-vs-código real, confirmada por leitura direta — não suposição.

Chamado por `frontend/assets/vision-core-bundle.js` (Legado, linhas 6917/6928). Não chamado pelo Next.

**Impacto:** qualquer chamador não autenticado da API pública pode forçar o Vision Agent Local de qualquer usuário pareado (mesmo sem saber o `agent_id`, já que a missão não carrega nenhum) a descartar trabalho local (`reset --hard HEAD~1`) ou fazer push não solicitado, sem qualquer confirmação humana real.

**Fix real:** as 2 rotas ganharam o mesmo gate `getRequestAgentId`/`getRequestAgentSecret`/`verifyAgentSecret` que `apply_patch`/`apply_patch_multi` já usam em `/api/agent/mission/queue`, e a missão passou a carregar `agent_id` — o que faz `agentQueueDB.shiftForAgent()` só entregar a missão ao agente pareado certo, nunca mais à fila anônima. `docs/ROADMAP.md:146` recebeu uma nota de correção de registro explicando a divergência encontrada e o fix.

**Checagem de exploração prévia (real, EB):** bundle de log real do EB (`vision-core-prod`, `aws elasticbeanstalk retrieve-environment-info --info-type bundle`), cobertura 2026-07-04 a 2026-07-23 (~19 dias, access.log atual + 2 rotacionados) — **zero hits** de `mission/push` ou `mission/revert` em qualquer um dos 3 arquivos. Sem evidência de exploração real.

**Gate determinístico:** `tools/tests/agent-mission-push-revert-auth.test.mjs` novo (16/16 PASS) — 400 sem `agent_id`, 401 sem/com `agent_secret` errado, 200 com par correto, poll anônimo e de outro agente não recebem a missão, só o agente pareado dono recebe.

**Gate adversarial (Ponytail/LLM real via `/api/chat` produção, diff real colado):** sem path alternativo, sem manipulação de campo pra forjar credencial, sem TOCTOU (Node single-thread, sem `await` entre o check e o push na fila). Ponto levantado (não é bypass do gate, defesa em profundidade não implementada): `origin_id`/`hash` enviados por push/revert não são validados contra o estado real do repo/missão antes da execução — são só metadados de exibição hoje, `git reset --hard`/`git push` real não os usa pra decidir o quê reverter. Registrado como pendência de robustez futura, fora do escopo desta correção de auth.

**Frontend (Legado) não foi tocado:** os 2 botões (`vision-core-bundle.js:6917/6928`) não enviam `agent_id`/`agent_secret` hoje — mas o fluxo upstream que os alimenta (`apply_patch`/`apply_patch_multi` via `vcQueueApplyPatchViaAgent`, `bundle.js:7137-7158`) também nunca enviou, então já retornava `400 agent_id_required_for_apply_patch` antes desta sessão (gate de DECISION-006, preexistente) — os botões de push/revert já eram inalcançáveis a partir da UI do Legado. Nenhum fluxo legítimo do Legado foi quebrado porque nenhum já funcionava; a rota continuava exploravel via chamada HTTP direta (curl), que é o que este fix fecha.

### B — CRÍTICO — `/api/deploy/zip-release`, `/api/deploy/merge-pr`, `/api/deploy/trigger` sem auth, gate é boolean do cliente — **CORRIGIDO 2026-07-23 (parcial — ver limitações residuais)**

Nenhuma das três rotas (`server.js:4362`, `:4490`, `:4593`) tem middleware de auth. O único gate é `aegis_ok === true` — **enviado pelo próprio cliente no body do POST**, sem verificação server-side de que Aegis rodou de fato. Usam `GITHUB_TOKEN` privilegiado do servidor para:
- abrir branch + commit + PR em `owner/repo` arbitrário enviado pelo cliente (`zip-release`);
- disparar workflow de deploy real via GitHub Actions dispatch (`trigger`);
- squash-merge um PR existente (`merge-pr`).

Chamado só pelo Legado (`vision-core-bundle.js:5999/6053/6134`) — Next nunca chama essas três. Risco Legado-exclusivo, mas as rotas continuam totalmente vivas no backend compartilhado.

**Impacto:** um chamador não autenticado pode fazer o backend, usando sua própria credencial GitHub privilegiada, abrir PRs, disparar deploys e mergear PRs em qualquer repositório onde `GITHUB_TOKEN` tenha permissão — bastando forjar `aegis_ok: true` no corpo da requisição.

**Investigação prévia ao fix (pedida explicitamente, não presumida):** como o Aegis roda hoje, de verdade — checado por leitura direta do client, não assumido. `deploy/trigger` e `deploy/merge-pr` (`vision-core-bundle.js:6001/6055`) **hardcodam `aegis_ok: true` literalmente no JS, sem rodar Aegis nenhum antes** — o campo é decorativo mesmo pro fluxo legítimo do próprio Legado, nunca foi um gate real do lado do cliente. `deploy/zip-release` (`bundle.js:6136`) é diferente: o `aegis_ok` que ele envia vem de um Aegis real que roda server-side numa requisição anterior e separada (`/api/chat/apply-patch`, `node --check` real, `server.js:4341/4360`) — mas esse resultado não fica persistido com um identificador que `zip-release` possa conferir depois; o cliente só relay o boolean. Construir essa verificação cruzada real (ex.: `mission_id` vinculado ao resultado do Aegis, checado no servidor) é uma mudança de desenho maior, não decidida nem implementada nesta sessão — ver limitação residual abaixo.

**Fix real:** `requireVisionAdmin` adicionado às 3 rotas — mesmo critério já usado em `/api/vault/*` e `/api/agents/:id/mode` (operação de efeito sistêmico + credencial/token privilegiado, não escopo por usuário comum). Fecha o problema principal (qualquer um na internet podia acionar). Fica documentado no próprio comentário do código, não escondido: `aegis_ok` continua um boolean simplesmente enviado pelo cliente sem verificação real, e `repo` continua arbitrário mesmo para um admin já autenticado (sem allowlist).

**Checagem de exploração prévia (real, EB):** mesmo bundle de log, mesma cobertura de ~19 dias — **zero hits** de `deploy/zip-release`, `deploy/merge-pr` ou `deploy/trigger`. Sem evidência de exploração real.

**Gate determinístico:** `tools/tests/deploy-routes-admin-auth.test.mjs` novo (6/6 PASS) — 401 sem sessão (antes de qualquer chamada ao GitHub, confirmado rodando o teste com `GITHUB_TOKEN` vazio de propósito), 403 com sessão comum sem role admin, nas 3 rotas.

**Gate adversarial (Ponytail/LLM real via `/api/chat` produção, diff real colado):** confirmou não haver bypass do gate de auth (sessão/role verificados antes de qualquer lógica de negócio, sem TOCTOU). Reafirmou as 2 limitações já documentadas (repo arbitrário, `aegis_ok` sem verificação real) como pendências. Fez uma afirmação não verificada (`/api/github/create-pr` teria allowlist de repo) — **checado por leitura direta do código e não é verdade** (`server.js:4595-4627`, só tem `evaluateGithubQualityGate` sobre plano/missão, sem allowlist de repo nenhuma); não copiado como padrão, registrado aqui pra não repetir a alegação sem checar de novo no futuro.

**Limitações residuais, não corrigidas nesta sessão — decisão de escopo pro usuário, não presumida:**
1. `aegis_ok` continua sem verificação server-side real cruzando com uma execução Aegis de fato ocorrida.
2. `repo` continua uma string arbitrária, sem allowlist, mesmo para um admin autenticado — um admin (ou uma sessão de admin comprometida) ainda pode apontar `GITHUB_TOKEN` pra qualquer repositório que ele tenha acesso.

### C — ALTO — `/api/security/apply-fix` escreve em disco de produção sem auth — **CORRIGIDO 2026-07-23**

`server.js:2107` — zero autenticação, só proteção contra path traversal (`safeRoot`/`filePath.startsWith`). Escreve via `fs.writeFileSync` dentro de `project_root` (default: `ROOT`, a própria árvore do app rodando no EB). Faz backup automático (`.bak-s135-*`) antes de escrever, mas isso não impede o efeito imediato de servir conteúdo malicioso caso o arquivo alterado seja código ativo.

Chamado pelo Legado (`bundle.js:6995`) **e** pelo Next (`frontend/assets/vision-core-next-clean.js:1001`) — no Next existe "dupla confirmação" antes de chamar, mas é puramente client-side (UX); o endpoint em si não verifica sessão, role, nem confirmação nenhuma.

**Fix real:** `requireVisionAuth` adicionado (qualquer usuário autenticado, não admin-only — é uma feature de produto disponível a qualquer conta, não uma operação de sistema inteiro como os achados A/B). A "dupla confirmação" do Next continua funcionando como UX, agora com um controle real por trás dela também.

**Checagem de exploração prévia (real, EB):** mesmo bundle de log, mesma cobertura de ~19 dias — **2 hits**, ambos em 2026-07-08, `Referer: http://localhost:3001/` (dev local, não produção), ambos retornando `404` (arquivo não encontrado — consistente com teste do próprio desenvolvedor, não exploração maliciosa bem-sucedida).

**Gate determinístico:** `tools/tests/apply-fix-auth.test.mjs` novo (4/4 PASS) — 401 sem sessão com arquivo real intocado, 200 com sessão válida escrevendo o arquivo de verdade (fluxo legítimo confirmado preservado, não só a resposta HTTP).

**Gate adversarial (Ponytail/LLM real via `/api/chat` produção, diff real colado):** confirmou não haver bypass do gate de auth. Achado real, pré-existente (não introduzido por este fix, fora do escopo de uma correção de auth): possível TOCTOU via symlink entre a checagem `filePath.startsWith(safeRoot)` (proteção de path traversal do `§135` original) e o `fs.writeFileSync` — um atacante que já tivesse permissão de escrita dentro de `safeRoot` (ou seja, já teria outro foothold) poderia inserir um symlink nesse intervalo pra escapar da árvore permitida. Registrado como pendência de hardening futuro do `§135`, não corrigido aqui.

### Padrão comum aos três achados

Os três repetem exatamente o padrão que já motivou DECISION-005 (`AGENT_APPLY_ENABLED=false`), DECISION-006 (pareamento por `agent_secret`) e DECISION-011 ("`agent_id` sozinho não é autenticação") no Next — a lição "gate precisa ser server-side e verificável, nunca um campo que o próprio cliente controla" não foi aplicada a essas rotas do backend compartilhado.

### Status da correção (2026-07-23, sessão seguinte)

Os 3 achados foram corrigidos em `backend/server.js`, cada um com teste determinístico novo dedicado e revisão adversarial real (Ponytail via `/api/chat` produção, diff colado) sem bypass encontrado. Ver `docs/DECISIONS.md` para a decisão de arquitetura registrada (`requireVisionAdmin` nas 3 rotas do achado B). Commits isolados por achado — hashes reais preenchidos após o commit (ver `docs/CURRENT_STATE.md` para o estado mais recente de deploy). **Não deployado ainda** — aguardando autorização explícita do usuário.

Regressão validada: `npm run test:syntax` (204 arquivos OK), os 3 testes novos (16/16 + 6/6 + 4/4), e os testes de segurança existentes que tocam código adjacente — `agent-pairings-list` (6/6), `agent-mode-admin-auth` (12/12), `agent-mode-admin-residuals` (40/40), `vault-rollback-auth` (13/13), `obsidian-vault-auth` (10/10), `sf-real-execution` (PASS) — todos limpos. `agent-pairing.test.mjs` falha num teste de TTL (`Unexpected end of JSON input`) — confirmado por comparação direta que essa falha já existe contra o `server.js` **sem** as mudanças desta sessão (mesmo ponto de falha, `git stash` do fix e re-run) — pré-existente, não é regressão introduzida aqui, não corrigido por estar fora do escopo desta sessão.

---

## 2. "Referenciado mas suspeito" / "morto" (dívida de organização, menor urgência)

- **Morto (candidato, não confirmado 100%):** `frontend/assets/vision-core-clean-runtime.js` (312KB, última edição 2026-07-10) e `vision-core-clean-state.js` (65KB, última edição 2026-05-28). Nenhuma tag `<script>` em `index.html`, `vision-core-next.html`, `about.html` ou `landing.html` referencia esses dois arquivos — `index.html` carrega hoje só `vision-core-bundle.js` + `v231-backend-agents.js?v=582` + `v582-sf-modules.js?v=582`. As únicas ocorrências do nome `vision-core-clean-state` fora do próprio arquivo estão dentro de `vision-core-clean-runtime.js` e `vision-core-bundle.js` (strings/comentários internos, não carregamento real). Chama atenção `clean-runtime.js` ter sido editado há só 13 dias apesar de aparentemente órfão — não confirmei via aba Network do navegador (fora de escopo desta sessão). Recomendo essa confirmação antes de qualquer decisão de remoção.
- **Obsoleto, não morto:** `docs/V8_GOLD_RUNTIME_AUDIT_NEXT.md` descreve e mapeia uma dúzia de scripts legados (`v297`, `v298`, `v299`, `v32`, `v33`, `v34`, `v35`, `v44`, `v273`, `v23-ui-system.js`, `vision-runtime-v297.js` etc.) que **não existem mais** em `frontend/assets/` — o documento parece descrever uma consolidação anterior já concluída (o estado atual já é só bundle.js/v231/v582, claramente pós-consolidação). O documento está desatualizado mas ainda vive em `docs/` (não em `docs/archive/`) — candidato a mover, não a apagar (pode ter valor histórico de "por que os scripts atuais são o resultado dessa consolidação").

---

## 3. Decisões pendentes de documentar (lacuna de processo, não de código)

- **Já respondida, legado saudável nesta dimensão:** por que o Legado ainda existe ao lado do Next — `DECISION-015` ("Legado é referência visual/UX apenas, nunca código-fonte a copiar") + `ARCHITECTURAL PRINCIPLE-001` ("Zero Legacy Debt"). Resposta clara e válida, não é "medo de mexer".
- ~~**Sem decisão registrada — lacuna real:** por que os 5 endpoints de escrita real listados na Seção 1 (`deploy/zip-release`, `deploy/merge-pr`, `deploy/trigger`, `agent/mission/push`, `agent/mission/revert`) continuam sem nenhuma autenticação no backend compartilhado~~ **FECHADA 2026-07-23 — as 5 rotas (+ `security/apply-fix`, achado C) ganharam auth real nesta sessão. Decisão de arquitetura registrada em `docs/DECISIONS.md` (novo ADR/DECISION, ver referência abaixo).**
- **Nova pendência, aberta por esta correção (não presumida, registrada pro usuário decidir):** o achado B fechou o acesso não autenticado, mas **não** resolveu (1) a verificação real de `aegis_ok` (continua um boolean relayado pelo cliente, sem cross-check server-side) nem (2) o `repo` arbitrário mesmo pra um admin autenticado (sem allowlist). Ambos exigem decisão de produto (o que é um repo legítimo pra essas rotas apontarem, e se vale o esforço de persistir/verificar um resultado real de Aegis entre requisições) que não me cabia presumir nesta sessão.
- **Nova pendência, menor:** TOCTOU via symlink em `/api/security/apply-fix` (achado C) — hardening pré-existente do path-traversal `§135`, não introduzido nem corrigido nesta sessão.

---

## Disciplina desta sessão

Investigação original (2026-07-23): nenhuma correção, commit, push ou deploy. Evidência real (leitura direta de `server.js`, `vision-agent.cjs`, `vision-core-bundle.js`, `git log` de datas de arquivo, greps de referência, log real do EB) em cada achado, sem suposição.

Sessão de correção (2026-07-23, mesmo dia): checagem de exploração prévia real via log do EB antes de corrigir; gate determinístico + revisão adversarial real (Ponytail/LLM via `/api/chat` produção, diff colado) por achado; limitações residuais documentadas no código e aqui, nunca escondidas; commits isolados por achado; push/deploy aguardando autorização explícita.
