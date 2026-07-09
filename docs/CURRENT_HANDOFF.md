# CURRENT HANDOFF — Vision Core Next

Documento vivo de revezamento entre agentes (Codex / Claude Code / OpenCode). Leia depois de `CLAUDE.md` e `docs/VISION_CORE_NEXT_FRONTEND_SPEC.md`, antes de editar código.

> Última atualização: 2026-07-09, por Claude Code (Sonnet 5) — deploy de sincronização CF Pages autorizado pelo usuário (`v46` no ar, hash `https://12cdec6e.visioncoreai.pages.dev`, travas de segurança verificadas ao vivo no JS servido). EB não tocado. Sessão anterior: verificou funcionalmente os 6 itens (B-1..B-6) já implementados pelo Codex, conectou `/api/sf/fetch-url`, reconciliou `docs/PARITY_AUDIT.md`.

---

## Estado Atual

- **Commit local = commit remoto (`origin/main`):** `30108978` — `feat(next): conecta /api/sf/fetch-url como contexto de URL opcional no SF (v46)`. Já pushado.
- **Cache-bust atual:** `?v=next-clean-46` (HTML+CSS+JS, os três juntos).
- **Produção (`https://visioncoreai.pages.dev`):** **`next-clean-46`, sincronizada com o local em 2026-07-09** — deploy CF Pages autorizado explicitamente pelo usuário (hash `https://12cdec6e.visioncoreai.pages.dev`), verificado ao vivo com `AGENT_APPLY_ENABLED=false` e `real_execution_allowed`/`deploy_allowed`/`writes_disk` todos `false` no JS servido, tanto no hash quanto no alias principal. **Backend EB não foi tocado** — deploy explicitamente restrito ao frontend (CF Pages), por instrução do usuário. Debris (`next.html`/`atomic-core.*`/etc.) reconfirmado sem vazar, mesmo padrão de sempre.
- **`AGENT_APPLY_ENABLED=false`** e todas as travas `sf_options` (`real_execution_allowed`/`deploy_allowed`/`writes_disk`) continuam `false`. Confirmado por grep nesta sessão, intocado.
- **3 specs permanentes, 20/20 PASS:** `vision-core-next-agent-apply.spec.mjs` (4), `vision-core-next-sf.spec.mjs` (9 — 3 novos casos de `fetch-url`), `vision-core-next-apply-fix.spec.mjs` (7).
- **`docs/PARITY_AUDIT.md` reconciliado:** categoria (b) real caiu de 5 grupos pra 2 — só falta Auth e os 2 endpoints SF encadeados (`project-files`+`generate-zip`). Tudo mais que estava listado como pendente já foi implementado entre 2026-07-08 e 2026-07-09.

---

## O que esta sessão fez (modo acelerado, sem checkpoint intermediário)

Autorização em bloco pra rodar a fila B-4→B-5→B-6→B-2→B-3→B-1→fechamento sem consultar entre ondas. Ao ler o `CURRENT_HANDOFF.md`/`CLAUDE.md` no início, todos os 6 itens já apareciam implementados (Codex, sessão anterior, já auditados por segurança/contrato na sessão anterior a esta). Então o trabalho real foi:

**1. Verificação funcional mais profunda dos 6 itens** (além do que a auditoria de segurança/contrato anterior já tinha coberto) — nenhum problema novo:
- `parseHermesBlock`: `hermesObj===null` nunca quebra a UI (curto-circuito confirmado), hint nunca auto-executa.
- Badge do agente: pausa real em `document.hidden`, sem animação a gatear.
- AI Provider Vault: zero persistência de `api_key` em storage do browser, só `api_key_masked` do backend.
- Vault Rollback: confirmação dupla real, sem atalho.
- Missions History: 3 estados (vazio/carregando/erro) presentes como texto real.

**2. Conectou `/api/sf/fetch-url`** — o mais simples dos 3 endpoints SF que ainda faltavam (contrato já verificado numa sessão anterior, reconfirmado aqui antes de codar: `server.js:4485-4520`, síncrono, `{ok, content, url}`). Campo opcional no composer do SF, resultado vira `full_context` na próxima missão. 3 testes novos, 20/20 PASS na suíte completa. Cache-bust `v46`.

**3. Reconciliou `docs/PARITY_AUDIT.md`** — 9 grupos migrados de categoria (b) pra (a2): Apply-Fix, 4 passos extra de SF, `fetch-url`, mais os 4 que já tinham sido migrados numa sessão anterior (badge, provider vault, rollback, missions/evidence, hermes hint). Estimativa de esforço restante caiu de ~6-7 turnos pra ~3-4.

**Parou antes de `project-files`+`generate-zip`** (decisão explícita, não limite de contexto batido no meio de algo) — ver "Próxima etapa" abaixo.

---

## Próxima etapa — únicos 2 itens reais restantes da categoria B

### 1. Software Factory — `project-files` + `generate-zip` (contratos já verificados, prontos pra usar)

| Endpoint | Linha | Tipo | Contrato |
|---|---|---|---|
| `POST /api/sf/project-files` | `server.js:4576` | **Assíncrono** (`job_id`+poll), payload/resposta diferentes dos outros passos | Body: `{description, accumulated_context, step1_analysis, step2_blueprint}` — não o `{description, module, autopilot, step, total_steps, sf_options}` padrão. Ramifica por complexidade (`_detectComplexity`) em prompts longos (§193/A2). No `GET /api/sf/job/:id`, o resultado vem em **`data.files[]`, não em `data.result`** — único endpoint SF onde isso acontece de verdade. |
| `POST /api/sf/generate-zip` | `server.js:4700` | **Síncrono, resposta binária** | Body: `{files: [{name, content}], project}`. Resposta é um stream ZIP real (`Content-Type: application/zip`), não JSON — frontend precisa tratar como download de blob (`response.blob()` + `URL.createObjectURL` + `<a download>`, padrão ainda não usado em nenhum lugar do Next). Depende logicamente de `project-files` já ter rodado, mas o backend não impõe a ordem. |

Sugestão (não é decisão tomada): um só turno, os dois juntos — fazem sentido como par (gerar lista de arquivos → baixar como zip), não como features separadas.

### 2. Auth (registro/login/OAuth Google+GitHub) — não iniciar sem alinhamento explícito

Mais arriscado do roadmap inteiro — mexe com sessão de qualquer usuário, token HMAC caseiro sem endpoint de refresh. Repetido em pendências de múltiplas sessões anteriores. Não estava na fila desta sessão (autorização em bloco era escopo fechado nos 6 itens B-N, não incluía Auth) — continua precisando de decisão explícita do usuário antes de começar, mesmo sob autorização em bloco futura, a menos que essa autorização mencione Auth nominalmente.

### Fora de escopo, decisões já tomadas (não revisitar sem novo motivo)

- **Deploy dropdown** — bloqueado pela SPEC (seção "FORA DE ESCOPO"). Decisão de escopo do usuário.
- **Vault rollback como "paridade"** e **Billing checkout UI** — o legado nunca teve essas UIs também; não são lacunas de migração, seriam escopo novo se o usuário quiser.
- **13 itens candidatos a não migrar** (`docs/PARITY_AUDIT.md` seção c) — evidência forte de código morto, mas nenhuma exclusão sem aprovação explícita.

---

## Comandos executados relevantes desta sessão

```bash
git fetch origin main && git log --oneline origin/main..HEAD && git log --oneline HEAD..origin/main
git stash && git merge origin/main --ff-only && git stash pop   # sincronização, sem conflito

# Verificação funcional (grep-based, não assumida):
grep -n "function parseHermesBlock" -A 12 frontend/assets/vision-core-next-clean.js
grep -n "localStorage\|sessionStorage" frontend/assets/vision-core-next-clean.js | grep -i provider
grep -n "api_key_masked" backend/server.js

# Contrato do fetch-url, reconfirmado antes de codar:
grep -n "app.post('/api/sf/fetch-url'" -A 35 backend/server.js

npx playwright test tests/e2e/vision-core-next-agent-apply.spec.mjs tests/e2e/vision-core-next-sf.spec.mjs tests/e2e/vision-core-next-apply-fix.spec.mjs --reporter=list
# => 20 passed

git push origin main   # via PowerShell — Bash sem rede pra github.com neste ambiente
```

---

## Riscos/Alertas ativos

1. **[BAIXO] Deploy desatualizado** — produção em `v31`, local em `v46`. Nada deployado. Avisar antes de qualquer teste manual em produção.
2. **[BAIXO] `git push`/`fetch` exigem PowerShell neste ambiente** — Bash sem rota de rede pra hosts externos, localhost funciona normal.
3. **[BAIXO] CI bot colide com push toda sessão até agora** — sempre `docs/STRESS-TEST-*`/`docs/CI-LAST-RUN.md`, fast-forward/rebase resolve sem conflito.
4. **[INFO] `docs/CODEX_PROMPT.md`** duplica conteúdo deste HANDOFF — não removido, só anotado (mesmo risco de ficar desatualizado que o `AGENTS.md` antigo já teve).
5. **[INFO] `fetch-url` é SSRF-capable por design** (comportamento pré-existente do backend, não novo) — consciência, não vulnerabilidade introduzida.
6. **[INFO] `generate-zip` será o primeiro lugar no Next tratando resposta binária** (não-JSON) — ao implementar, seguir o padrão já usado pra `apiRequest()` só onde faz sentido (provavelmente precisa de uma chamada `fetch()` separada, não reusar `apiRequest()` que sempre faz `.text()`/`JSON.parse()`).
