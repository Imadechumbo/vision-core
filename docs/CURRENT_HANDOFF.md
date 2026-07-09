# CURRENT HANDOFF — Vision Core Next

Documento vivo de revezamento entre agentes (Codex / Claude Code / OpenCode). Leia depois de `CLAUDE.md` e `docs/VISION_CORE_NEXT_FRONTEND_SPEC.md`, antes de editar código.

> Última atualização: 2026-07-08, por Claude Code (Sonnet 5) — sincronizou e auditou a retomada do Codex (v39-v45), corrigiu 2 problemas reais encontrados, suíte permanente 100% verde. Não avançou o plano de ondas com feature nova nesta sessão — ver "Próxima etapa" abaixo, contratos já verificados e prontos pra próxima sessão usar direto.

---

## Estado Atual

- **Commit local = commit remoto (`origin/main`):** `12338191` — `fix(test): corrige spec de Apply-Fix sem cobertura real + vazamento de rede na suite permanente`. Já pushado.
- **Cache-bust atual no código:** `?v=next-clean-45` (sem mudança nesta sessão — só testes/docs foram tocados).
- **Produção (`https://visioncoreai.pages.dev`):** ainda `next-clean-31`, muitas versões atrás do local. Nada deployado (nem CF Pages nem EB) em nenhuma sessão desta linha de trabalho. Não deployar sem aprovação explícita.
- **`AGENT_APPLY_ENABLED=false`** e todas as travas `sf_options` (`real_execution_allowed`/`deploy_allowed`/`writes_disk`) continuam `false`. Confirmado por grep nesta sessão, intocado.
- **3 specs permanentes, 17/17 PASS:** `vision-core-next-agent-apply.spec.mjs` (4), `vision-core-next-sf.spec.mjs` (6), `vision-core-next-apply-fix.spec.mjs` (7 — **virou permanente nesta sessão**, reescrito do zero).

---

## O que essa sessão fez

**1. Sincronização.** `git status` limpo (só debris pré-existente não relacionado, mesmo de sempre). Local estava 1 commit à frente (`9bdbed49`, Codex, sem push), origin 1 à frente (bot de CI de sempre). Rebase limpo, push confirmado.

**2. Auditoria dos commits do Codex (`783243aa`..`9bdbed49`, Etapas 0-8 do plano de ondas).** Verificação de contrato (todo endpoint novo grepado contra `server.js` antes de aceitar) e das travas de segurança — tudo bateu. **2 problemas reais encontrados e corrigidos** (commit isolado `12338191`, detalhe completo no `CLAUDE.md`):

- **Spec de Apply-Fix sem cobertura real do submit.** O servidor HTTP local que a Etapa 7 criou (`tests/e2e/preview-server.mjs`) nunca era de fato alcançado — `apiRequest()` sempre chama a URL absoluta do gateway real, não um caminho relativo à origem da página. O spec original nunca clicava no botão de confirmação final (a escrita real em disco). Reescrito no padrão estabelecido, com casos de sucesso/erro reais no submit. `preview-server.mjs` deletado.
- **`/api/agent/status` e `/api/mission/quota` vazando chamada real em toda carga de página**, em todos os 3 specs permanentes (o segundo já vazava desde uma sessão bem anterior — não é coisa nova do Codex). Corrigido com `test.beforeEach` mockando as duas rotas. Confirmado com um listener de rede real antes e depois do fix, não assumido.

Registrado como regra dura nova na SPEC (item 8) pra não repetir.

**3. Suíte completa: 17/17 PASS**, pré-condição cumprida antes de qualquer feature nova.

---

## Próxima etapa (não iniciada nesta sessão — contratos já verificados, prontos pra usar)

A pendência restante do roadmap SF são os **3 endpoints com contrato distinto** (`project-files`, `generate-zip`, `fetch-url`) — bem mais heterogêneos que os 4 "passos extra" que o Codex já conectou (aqueles reusavam o mesmo contrato `job_id`+poll dos passos originais; estes três não). Contratos já lidos direto em `backend/server.js` nesta sessão, não assumidos — resumo pra quem pegar isso a seguir:

| Endpoint | Linha | Tipo | Contrato |
|---|---|---|---|
| `POST /api/sf/fetch-url` | `server.js:4485` | **Síncrono** (sem job_id) | `{url}` → o backend faz um GET real de saída pro `url` informado (SSRF-capable por design, pré-existente — não é algo a "corrigir", é como já funciona) e devolve `{ok, content, url}` com o texto extraído (scripts/styles/tags removidos, até 3000 chars). Timeout 8s. Standalone, não depende de outro passo. |
| `POST /api/sf/project-files` | `server.js:4576` | **Assíncrono** (`job_id`+poll), mas payload e resposta diferentes dos outros passos | Body: `{description, accumulated_context, step1_analysis, step2_blueprint}` (não o `{description, module, autopilot, step, total_steps, sf_options}` dos passos normais). Internamente ramifica por complexidade (`_detectComplexity`) em prompts bem mais longos e estruturados (§193/A2). No `GET /api/sf/job/:id`, o resultado vem em **`data.files[]`, não em `data.result`** — é o único dos endpoints SF cujo campo `files` é populado de verdade (confirmado na auditoria de paridade anterior). Consumir isso exige um caminho de renderização diferente do texto simples que os outros passos usam. |
| `POST /api/sf/generate-zip` | `server.js:4700` | **Síncrono, resposta binária** | Body: `{files: [{name, content}], project}`. Resposta não é JSON — é um stream ZIP real (`Content-Type: application/zip`, `Content-Disposition: attachment`). Frontend precisa tratar como download de blob, não como `apiRequest()` normal. Depende logicamente de `project-files` já ter rodado (usa a lista de arquivos gerada por ele), mas o backend não impõe essa ordem — quem chama é responsável por montar o `files[]`. |

**Sugestão de fatiamento pra próxima sessão** (não é decisão tomada): `fetch-url` sozinho primeiro (mais simples, standalone, útil por si só como "buscar contexto de uma URL" no Auto-Pilot). `project-files` + `generate-zip` depois, juntos num commit ou dois (são naturalmente encadeados — não faz muito sentido UI de um sem o outro).

Pendências mais antigas, ainda válidas:
1. **Auth (registro/login/OAuth Google+GitHub)** — mais arriscado do roadmap inteiro. Não começar sem alinhamento explícito do usuário.
2. **Deploy dropdown** — bloqueado pela SPEC (seção "FORA DE ESCOPO"/"Arquivos Proibidos"). Decisão de escopo do usuário, não item de esforço.

---

## Comandos executados relevantes desta sessão

```bash
git fetch origin main && git log --oneline origin/main..HEAD && git log --oneline HEAD..origin/main
git rebase origin/main main && git push origin main   # via PowerShell — Bash sem rede pra github.com neste ambiente

# Verificação de contrato (nenhum endpoint novo aceito sem isso):
grep -oE "'/api/[a-zA-Z0-9/_:.-]+'" frontend/assets/vision-core-next-clean.js | sort -u
grep -n "app.post('/api/sf/project-files'\|app.post('/api/sf/generate-zip'\|app.post('/api/sf/fetch-url'" backend/server.js

# Achado do vazamento de rede — confirmado empiricamente, não assumido:
# (spec temporário com page.on('request') logando hits contra o gateway real,
#  rodado antes e depois do fix, depois apagado — nunca commitado)

npx playwright test tests/e2e/vision-core-next-agent-apply.spec.mjs tests/e2e/vision-core-next-sf.spec.mjs tests/e2e/vision-core-next-apply-fix.spec.mjs --reporter=list
# => 17 passed
```

---

## Riscos/Alertas ativos

1. **[BAIXO] Deploy desatualizado** — produção em `v31`, local em `v45`. Nada deployado. Avisar antes de qualquer teste manual em produção.
2. **[BAIXO] `git push`/`fetch` exigem PowerShell neste ambiente** — Bash sem rota de rede pra hosts externos, localhost funciona normal.
3. **[BAIXO] CI bot colide com push toda sessão até agora** — sempre `docs/STRESS-TEST-*`/`docs/CI-LAST-RUN.md`, rebase resolve sem conflito.
4. **[INFO] `docs/CODEX_PROMPT.md`** (criado pelo Codex, prompt de continuação condensado) duplica conteúdo deste HANDOFF — não é problema de segurança, é risco de ficar desatualizado (mesmo padrão que já aconteceu com o `AGENTS.md` antigo). Não removido, só anotado — considerar consolidar numa sessão futura.
5. **[INFO] `fetch-url` é SSRF-capable por design** (o backend busca qualquer URL que o chamador mandar) — comportamento pré-existente do backend, não introduzido nem corrigido nesta linha de trabalho. Se for conectar esse endpoint na UI, isso não é uma vulnerabilidade nova a resolver, é um comportamento já aceito do backend — só vale ter consciência ao decidir expor um campo de URL livre pro usuário final digitar.
