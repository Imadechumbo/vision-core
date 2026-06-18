# VISION CORE — CLAUDE.md
## Documento central do projeto | Atualizado: 2026-06-18 (§113)

> **LEIA ESTE ARQUIVO COMPLETO ANTES DE QUALQUER AÇÃO.**
> Este arquivo contém o estado real do projeto, o que está implementado, o que está faltando, e o que NÃO deve ser tocado.

---

## STACK & URLS

| Componente | URL | Notas |
|-----------|-----|-------|
| Frontend | https://visioncoreai.pages.dev | Cloudflare Pages — deploy via `bash bin/deploy-pages.sh "msg"` |
| Worker Gateway | https://visioncore-api-gateway.weiganlight.workers.dev | Cloudflare Worker — proxy para EB |
| Backend EB | http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com | Node.js AWS Elastic Beanstalk |
| GitHub | https://github.com/Imadechumbo/vision-core | Repositório principal |
| GitLab | https://gitlab.com/imadechumbo/vision-core-pages | CF Pages CI (runner com problema histórico) |
| Vision Agent Local | http://localhost:7070 | Instalado via VisionAgentSetup.exe |

**Deploy:**
- Frontend: `bash bin/deploy-pages.sh "mensagem"`
- Backend: `python _deploy89_eb.py` (ajustar versão)
- GitLab CI: NÃO funciona — runner allocation falha. Usar deploy manual sempre.

---

## VERSÕES ATUAIS

| Componente | Versão | Tag git | HEAD |
|-----------|--------|---------|------|
| Backend EB | 5.9.13-s112-sqlite-queue | - | 1d0f9af6f52290bfc1cb0d708d1e31fe2d5e9bf7 |
| CF Pages | 5.9.13+s113-dry-run-ui | - | dfac9bd |

**Nota de correção (§113):** esta tabela estava parada na entrega do §109 (5.9.11) mesmo depois de §110/§111/§112 já estarem implementados e deployados — inconsistência de documentação encontrada e corrigida nesta sessão, não uma mudança de versão real nova além do que §112 já tinha entregue. A linha CF Pages reflete o trabalho desta sessão (§113), ainda só no sandbox — vira "live" só depois do `bash bin/deploy-pages.sh` real (ver prompt para Claude Code).

---

## O QUE ESTÁ IMPLEMENTADO E FUNCIONANDO ✅

### Backend (server.js)
- Auth: `/api/auth/login`, `/api/auth/register`, `/api/auth/me`
- OAuth: `/api/auth/oauth/google`, `/api/auth/oauth/github` (callbacks reais)
- Mission: `/api/copilot`, `/api/run-live` (com quota FREE enforced)
- Quota: `/api/mission/quota` — FREE = 5 missões/mês, bloqueia com 429
- Vault: `/api/vault/snapshot`, `/api/vault/snapshots`, `/api/vault/rollback/:id`
- SF: `/api/sf/gold-gate` + 8 módulos via `callLLM()` (OpenAI→Anthropic→Groq→DeepSeek→Gemini)
- Billing: `/api/billing/status` (plano real do JWT), Stripe webhook
- DORA metrics reais via vault + `data/deploy-log.json`
- Architect: `/api/architect/interpret` — LLM_REAL, não BLOQUEADA
- **§105: `/api/agent/mission/queue` aceita `type=apply_patch` com `file`+`patch`+`fix_type`+`diagnosis` reais (antes descartados) — `/api/agent/status` reporta presença real do agent (`_agentLastSeenAt` < 15s), não mais hardcoded**

### Frontend (index.html + bundle.js)
- Tutorial interativo 13 passos com mascote animado idle/reading
- Botão 🪐 reabrir tutorial (`#vcReopenTutorial`)
- SF Landing card com 8 módulos visível antes do login
- Badge de quota real (FREE: X missões restantes)
- Planos FREE (BETA ATIVO) / PRO (EM BREVE) / ENTERPRISE (EM BREVE)
- OAuth Google + GitHub botões funcionais (SSO ainda "Em breve")
- Mascote: `mascote-idle-final.png` + `mascote-reading-final.png` em `frontend/assets/`
- **§105: `renderApplyFixPanel` tem 3º botão "📡 Aplicar no Vision Agent Local" — fecha o loop chat→agent local→patch real no disco (snapshot+rollback) →aprovar push/reverter. `renderValidationPanel` (push/revert) deixou de ser código morto.**
- **§113: botão de sidebar "🔬 DRY-RUN EXTERNO" (`#vcOpenDryRunPanelBtn`) dropa `renderSfDryRunPanel()` no chat — UI para apontar um repositório externo e disparar o dry-run real do §111 (firewall §110) visualmente, sem precisar chamar a API direto. Fecha a Etapa A por completo.**

### OAuth (configurado nos providers)
- Google Client ID: `793969655414-suvojcna44rchiq65n66io6flkf970ql.apps.googleusercontent.com`
- Google callback: `https://visioncore-api-gateway.weiganlight.workers.dev/api/auth/oauth/google/callback`
- GitHub Client ID: `Ov23li2yBM5CMJzteH6u`
- GitHub callback: `https://visioncore-api-gateway.weiganlight.workers.dev/api/auth/oauth/github/callback`
- Google OAuth em modo "testing" — usuário de teste: weiganlight@gmail.com (limite 100)

---

## O QUE ESTÁ INCOMPLETO / QUEBRADO ❌ — PRECISA IMPLEMENTAR

### §98-A — Vision Agent Local ✅ RESOLVIDO (§99)
**Causa raiz:** Stress test enviava campo `mission:` mas agent espera `input:` — falso positivo, bug era no teste, não no agent.
**Fix:** Payloads de ST-01 corrigidos para `input:`. Agent funcionava corretamente.
**ST-01:** 36/36 pass — `tests/st-01-agent-local.cjs` + `stress-test-vision-core.cjs --agent`
**T2 (Agent Local): LIBERADO**

### §98-B — Adicionar Arquivos no Mission Control ✅ RESOLVIDO (doc estava desatualizada)
**Causa raiz real (achada em análise de código §104):** funciona, mas NÃO via os campos documentados `file_context`/`file_name` — o backend nunca lê esses campos. O frontend's `sendMessage()` prepara o conteúdo do arquivo direto no texto da `message` via `_attachedFiles`. ST-02 testa os campos errados/mortos, dando falso-positivo de "funciona certo" quando na verdade funciona por outro caminho. `v236FileInput` (HTML) era órfão — sem listener, superado por `v298FileInput`, removido no §104.
**T4 (Mission Control): LIBERADO** — funcional, doc corrigida.

### §98-C — SF Módulos 05-06-08 ✅ RESOLVIDO (doc estava desatualizada)
**Causa raiz real:** já resolvido antes desta sessão (commit `74179b7`) — os 3 módulos mostram badge "EM BREVE" consistente com o resto, não "EXEC BLOQUEADO"/"BLOQUEADO" como a doc dizia. Nenhum código novo necessário, decisão de roadmap já tomada e implementada.
**T3 (Software Factory): LIBERADO**.

### §98-D — Agentes Extras ✅ RESOLVIDO (§100)
**Diagnóstico real:** `_agentModesStore` era gravado mas nunca lido em `/api/copilot`. Agentes NÃO eram stub — catálogo real com 15 agentes, modos OFF/AUTO/ON funcionavam. Faltava apenas ligar o store à resposta.
**Fix:** `detectActiveAgent()` faz keyword match contra catálogo + respeita modo OFF → `active_agent` retornado no JSON → badge `🤖 NomeDoAgente` no chat → system prompt LLM especializado.
**ST-10:** 4/4 pass (jwt→auth, sql→database, OFF não detecta, genérico sem match)
**T5 (Agentes Extras): LIBERADO**

### §98-E — Mission Timeline ✅ RESOLVIDO (§102)
**Descoberta importante nesta sessão:** o frontend NÃO chama `/api/copilot` nem `/api/run-live` (zero referências no bundle) — o botão ENVIAR chama `/api/chat`, que também não tinha `checkMissionQuota`. O histórico foi implementado no endpoint real.
**Fix:**
- Backend: `appendMissionTimeline()` / `getMissionTimeline()` (data/mission-timeline.json, 90 dias / 500 entradas), hook via monkey-patch de `res.json` em `/api/chat` e `/api/run-live` (cobre todos os branches sem duplicar código). Anônimo nunca persiste no backend (evita misturar histórico entre visitantes) — só localStorage.
- Endpoint novo: `GET /api/mission/timeline` (anti_stub:true).
- Frontend: painel `#v298MissionHistory` (colapsável) abaixo do chat — `vc_mission_timeline_cache` no localStorage + sync com backend quando logado.
- 21 testes unitários isolados (9 backend + 12 frontend, com mocks) rodados antes do commit.
**ST-11:** criado (6 casos) — endpoint existe, anônimo vazio, registro, envio com marcador, marcador aparece no histórico, shape dos campos.
**Pendente para confirmar:** ainda não cobre o fluxo "EXECUTAR MISSÃO" (Standard Method Panel / hermesObj) — só ENVIAR/chat e run-live. Decisão consciente de escopo, não esquecimento.
**§103 — causa raiz real:** as 4 chamadas `/api/chat` no bundle não mandavam `Authorization` header → `getAuthUser` sempre retornava null → histórico nunca persistia para usuário logado via chat real. Corrigido em tok1-4 (linhas ~6001/6840/7434/7697). CSS do painel não estava no `vision-core-bundle.css` (snapshot pré-concatenado diferente do arquivo fonte individual) → painel existia no DOM mas sem estilo. CSS adicionado direto no bundle. Fix defensivo: `loadMissionHistoryFromBackend()` não sobrescreve cache local com array vazio. Persistência confirmada via curl/PowerShell ponta a ponta.

### §98-F — OPENCLAW / OPENSQUAD / OSINT / V10 (ROADMAP — NÃO TOCAR)
**Status:** Badge `SCALE` / roadmap puro
**Decisão:** NÃO implementar ainda, NÃO criar tutorial
**Ação:** Manter como estão até decisão de produto

### §105 — Fechar o Loop: Chat → Mission Queue → Vision Agent Local → Patch Real ✅ RESOLVIDO
**Origem:** item #1 do roadmap publicado em `about.html` ("Fechar o loop VISION AI COMMAND → mission queue → Agent Local → patch real").
**Causa raiz real (auditoria de código antes de tocar em qualquer arquivo):** as 3 peças já existiam isoladas — chat diagnostica com `hermesObj.{file,patch,fix_type}`, `vision-agent.js` já sabia aplicar `type=apply_patch` com backup `.vision-bak`+validação Aegis+rollback via `git checkout --` (zero mudança necessária aqui), e `/api/agent/mission/push`+`/revert` já existiam. O que faltava: (1) `/api/agent/mission/queue` descartava silenciosamente `file`/`patch`/`fix_type`/`diagnosis` para qualquer tipo de missão; (2) `/api/agent/status` retornava `connected:false` hardcoded sem `anti_stub:true` (stub real, violava regra #4); (3) `renderValidationPanel()` (botões push/revert) existia desde antes mas **nunca tinha um único call site** — código morto confirmado por grep.
**Fix:** backend valida+preserva os 4 campos quando `type==='apply_patch'` (400 se `file`/`patch` ausentes); `_agentLastSeenAt` atualizado a cada poll real de `/mission/pending` e em `/heartbeat`; `/api/agent/status` calcula `connected` real (<15s desde último poll). Frontend: novo 3º botão em `renderApplyFixPanel` ("📡 Aplicar no Vision Agent Local") que checa status → enfileira `apply_patch` → faz polling do resultado (2s×15, com retomada manual) → finalmente invoca `renderValidationPanel()`.
**Evidência:** `_test105_backend_logic.cjs` 13/13 (mocks isolados) + `_test105_full_loop_e2e.sh` 9/9 (backend real + `vision-agent.js` real, projeto git temporário, patch aplicado com commit real, rollback automático em patch com erro de sintaxe confirmado, validação 400 confirmada) — tudo sem navegador, reproduzível via `bash _test105_full_loop_e2e.sh`.
**Fora do escopo desta sessão (decisão consciente):** o botão "EXECUTAR MISSÃO" (Standard Method Panel) continua aplicando via `/api/chat/apply-patch` (cloud) — adicionar a mesma opção de agent local lá é o mesmo padrão, ver pendências abaixo.
**Patch:** `_patch105_agent_loop_closure.py` (idempotente, assert-based, mesmo padrão de §102/§104).

---

## STRESS TESTS — A CRIAR ANTES DOS TUTORIAIS

| ST | O que valida | Status |
|----|-------------|--------|
| ST-01 | Vision Agent Local end-to-end (`ok=true`) | ✅ 36/36 pass — `--agent` |
| ST-02 | Upload arquivo + missão com contexto | ✅ 36/36 pass (incluído no suite) |
| ST-03 | SF módulos 01-04 com LLM real | ✅ 36/36 pass (incluído no suite) |
| ST-04 | SF módulos 05-06 EM BREVE (§98-C) | ✅ 36/36 pass (incluído no suite) |
| ST-05 | Pipeline Architect→Vault | ✅ 36/36 pass (incluído no suite) |
| ST-06 | Quota FREE enforced (429) | ✅ 36/36 pass (incluído no suite) |
| ST-07 | OAuth Google + GitHub | ✅ 36/36 pass (incluído no suite) |
| ST-08 | Vault snapshot/rollback | ✅ 36/36 pass (incluído no suite) |

**ST-12 (novo, §105):** Loop fechado chat→agent local→patch real→rollback. `_test105_full_loop_e2e.sh` — 9/9 checks, backend+agent reais (sem produção, sem navegador). Ainda não integrado ao `stress-test-vision-core.cjs` principal (próxima sessão, ver pendências).

**Regra:** Nenhum tutorial de seção é criado sem o stress test correspondente passando.

---

## TUTORIAIS — PLANEJADOS (SÓ DEPOIS DAS IMPLEMENTAÇÕES)

| Tutorial | Seção | localStorage key | Pré-requisito |
|---------|-------|-----------------|---------------|
| T1 | Geral 13 passos | `vc_tutorial_done` | ✅ Live |
| T2 | Vision Agent Local | `vc_tutorial_agent_done` | ✅ LIBERADO — §98-A resolvido + ST-01 pass |
| T3 | Software Factory | `vc_tutorial_sf_done` | ✅ LIBERADO — §98-C + ST-03 pass |
| T4 | Mission Control | `vc_tutorial_mission_done` | ✅ LIBERADO — §98-B + ST-02 pass |
| T5 | Agentes Extras | `vc_tutorial_agents_done` | ✅ LIVE — 5 passos (modos OFF/AUTO/ON, keywords, badge) |
| T6 | PASS GOLD | `vc_tutorial_passgold_done` | ✅ LIBERADO — ST-06 pass |

**Ativação:** Todos os tutoriais de seção abrem APENAS via botão "🪐 Tutorial desta seção" — NUNCA automático.
**Infraestrutura:** `window.vcStartSectionTutorial('nome')` reutiliza overlay/mascote do T1.

---

## REGRAS QUE NUNCA MUDAM

1. **Nunca redeployar o EB sem necessidade** — só CF Pages quando é só frontend
2. **GitLab CI não funciona** — sempre usar `bash bin/deploy-pages.sh "msg"`
3. **Não usar node-fetch** — usar `httpsPost` (já no server.js) ou `https.request` nativo
4. **Anti-stub obrigatório** — todo endpoint novo deve ter `anti_stub: true` no response
5. **OAuth Google** — em modo testing, só weiganlight@gmail.com funciona até publicar o app
6. **Mascote** — `mascote-idle-final.png` (sorridente) e `mascote-reading-final.png` (óculos+livro) em `frontend/assets/`
7. **Balão tutorial** — fundo `#000000` preto puro, texto `#f1f5f9` branco
8. **FREE limit** — 5 missões/mês enforced via `checkMissionQuota` middleware em `/api/copilot` e `/api/run-live`

---

## VARIÁVEIS DE AMBIENTE NO EB

```
GOOGLE_CLIENT_ID=793969655414-suvojcna44rchiq65n66io6flkf970ql.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GITHUB_CLIENT_ID=Ov23li2yBM5CMJzteH6u
GITHUB_CLIENT_SECRET=d92d162926e24437dbb8ef97ee21a7a3c135fa46
OAUTH_REDIRECT_BASE=https://visioncore-api-gateway.weiganlight.workers.dev
FRONTEND_URL=https://visioncoreai.pages.dev
FREE_MISSION_LIMIT=5
```

---

## HISTÓRICO DE SESSÕES

| § | O que foi feito | Tag | HEAD |
|---|----------------|-----|------|
| §83 | Backend fakes eliminados, vault real, callLLM multi-provider | s83-done | fbc5699 |
| §84 | Frontend botões fake eliminados (20 elementos) | s84-done | 5cc7bd0 |
| §85 | Arquiteto header real, exec_real dinâmico | s85-done | e8222fb |
| §86 | Billing real, badges FREE/PRO/ENT, OAuth "Em breve" | s86-done | 8c5ae12 |
| §87 | CF Pages deploy frontend §84-§86 ao vivo | s87-done | 6006dc9 |
| §88 | OAuth Google + GitHub real | s88-done | 481a03f |
| §89 | Tutorial 13 passos + quota FREE + SF landing | s89-done | 0678db5 |
| §90 | Mascote animado + passo PASS GOLD leigo | s90-done | 4484d74 |
| §91 | Mascote inline no balão (top-left) | s91-done | bfcb45f |
| §92 | Fundo transparente mascote + positionBalloon viewport-safe | s92-done | fa8973f |
| §93 | Balão preto #000000 + texto branco | s93-done | 9918877 |
| §94 | Balão preto puro + mascote removido temporariamente | s94-done | - |
| §95 | Mascote final top-right do balão + typewriter | s95-done | - |
| §96 | Mascote dentro do balão + botão reabrir tutorial | s96-done | - |
| §97 | Mascote 36px ajustado no canto | s97-done | - |
| §99 | §98-A resolvido (falso positivo stress test) — ST-01..ST-08 36/36 pass | - | f9f2328 |
| §100 | §98-D resolvido — detectActiveAgent() keywords + active_agent no copilot + badge chat — ST-10 4/4 | s98d-done | 136d33f |
| §101 | T5 Agentes Extras live — 5 passos + accordion desbloqueado — tutoriais T1-T6 6/6 completos | t5-done | 61e8d71 |
| §102 | §98-E resolvido — Mission Timeline persistido (descoberta: endpoint real é /api/chat, não /api/copilot) — ST-11 criado (6 casos), 21 testes unitários | s102-done | 13a6748 |
| §103 | Causa raiz real do §102: header Authorization ausente nas 4 chamadas /api/chat (tok1-4) + CSS ausente no bundle pré-concatenado + overwrite-guard defensivo. Persistência confirmada ponta a ponta via curl/PowerShell. Mesmo commit/tag do §102. | s102-done | 13a6748 |
| §104 | Limpeza: v236FileInput órfão removido, versão backend padronizada (4.1.0/v5.9.0 → 5.9.7), display_input pro histórico mostrar texto limpo (sem prefixo de contexto), recordMissionTimelineEntry adicionado nos 3 fluxos que faltavam (sf-chat, hermes, zip-upload) — §98-B/§98-C doc sincronizada com código real. | s104-done | bc0325f |
| §105 | Fechou o loop chat→agent local→patch real (roadmap item #1 de about.html). `/api/agent/mission/queue` preserva file/patch/fix_type/diagnosis p/ apply_patch (antes descartados); `/api/agent/status` real via `_agentLastSeenAt` (antes hardcoded false); novo botão "Aplicar no Vision Agent Local" ativa `renderValidationPanel` (código morto desde sempre). ST-12 criado (9/9, backend+agent reais). SDDF_SPEC §14.3/14.4 corrigidos (removida doc de `tryAgent` fictício) + novo §105. | - | bd2362a |
| §106 | Etapa A do roadmap: lógica de polling do agent extraída para `vcQueueApplyPatchViaAgent(hermesObj, statusEl, onReset, onDone)` — função compartilhada sem duplicação. `renderStandardMethodPanel` (EXECUTAR MISSÃO) ganhou botão "📡 Aplicar no Vision Agent Local" idêntico ao do chat. Backend intocado. `_test106_static_wiring.cjs` 9/9 + regressão `_test105_*` confirmada (13/13 + 9/9). SDDF_SPEC §106 adicionado. | - | 578a651 |
| §107 | Etapa B retirada do roadmap (SDDF_SPEC §66 já fechado — tiered routing resolvido sem código novo). Etapa C implementada: memory layer fase 2 no Hermes — `tokenize`/`jaccardOverlap`/`readLowConfidenceLog`/`findSimilarLowConfidenceCases`/`applyMemoryReordering`/`computeMemoryMetrics` em `hermes-rca.js`; `callHermes` desprioriza (nunca remove) provider que falhou em caso similar; log de baixa confiança ganha campo `keywords` pra matching futuro. `_test107_memory_layer_unit.cjs` 26/26. SDDF_SPEC §107 adicionado. | - | eab69de |
| §108 | Etapa E implementada: painel "MÉTRICAS DOS AGENTES" (100% estático com badge "UI LOCAL") ligado a 4 endpoints reais (`/api/metrics/agents`, `/api/metrics/summary`, `/api/dora-metrics`, `/api/metrics/memory`). Novo endpoint `GET /api/metrics/memory` com `computeMemoryMetrics()` e `anti_stub:true`. Badge vira "DADOS REAIS" quando backend responde. Fallback estático preservado. `_test108_observability_unit.cjs` 23/23 + `_test108_endpoint_smoke.sh` 10/10. SDDF_SPEC §108 adicionado. | - | eab69de |
| §109 | Etapa D implementada: missão multi-arquivo atômica (`apply_patch_multi`). Backend valida array `files[]` com file+patch por item. Vision Agent: `resolveTargetFile()` (helper standalone), `rollbackFiles()`, `gitCommitMulti()`, `applyPatchMultiMission()` — 4 etapas: resolver/aplicar/validar Aegis/commit único. Falha em qualquer etapa reverte TODOS via git checkout. `applyPatchMission` (§105) intocada. `_test109_static_wiring.cjs` 12/12 + E2E real (commit único + 2 cenários de rollback atômico confirmados). Regressão completa 90 testes 0 falhas. SDDF_SPEC §109 adicionado. | - | 929610c |
| §110 | **Fase 1 de N — Etapa A (Software Factory dry-run real):** firewall de auto-modificação em `vision-agent.js` (`isSelfTargetForbidden`): 4 camadas independentes — contenção de caminho (inclui symlinks resolvidos e pasta-pai), remote git normalizado (https/ssh/+.git), fingerprint CLAUDE.md+SDDF_SPEC.md. `require.main` guard no bootstrap + `module.exports` das funções puras (CLI inalterado, viabiliza `require()` nos testes). `server.js` intocado. `_test110_self_modification_firewall_unit.cjs` 20/20 (diretórios e git reais, incluindo casos negativos). Regressão 8 suites (inclui 2 E2E confirmando CLI inalterado). Etapa A **não** está completa — ver pendências. | - | 9525f7f |
| §111 | **Etapa A — Fase 2 de N (núcleo técnico completo).** Dry-run real em repositório externo, construído sobre o firewall do §110. Novas funções em `vision-agent.js`: `scanExternalProject(targetRoot, input)` (cópia parametrizada de `scanProject`, opera no `target_path`, nunca no ROOT do agente), `simulatePatch(filePath, patch, fixType)` (mesma transformação de `applyPatch`, mas NUNCA chama `fs.writeFileSync`), `validatePatchContent(content, ext)` (valida string em memória via arquivo temporário em `os.tmpdir()`, apagado depois), `sfDryRunRealMission(m)` (orquestrador: firewall → scan → askIA → parsePatch → simulatePatch → validatePatchContent → diff_preview, zero escrita/commit/push real). **Descoberta no caminho:** `askIA()` (usada desde a v1.0 pelo `executeMission` genérico) nunca incluía o padrão `[arquivo.ext]` exigido pelo gate anti-alucinação do backend (FIX C §25) — toda chamada de diagnóstico nesse fluxo sempre caía em `BLOCKED_INPUT` antes de chegar em qualquer LLM. Corrigido com um 3º parâmetro opcional (`fileLabel`, retrocompatível), beneficiando também o `executeMission` pré-existente. `backend/server.js` ganhou validação mínima de `sf_dry_run_real` (exige `target_path`, persiste na missão — backend nunca lê/escreve arquivos reais, só valida e repassa). `_test111_dry_run_real_unit.cjs` 18/18 + `_test111_dry_run_real_e2e.cjs` 18/18 (4 cenários: firewall bloqueando antes de qualquer scan, caminho feliz com diff correto + arquivo bit-a-bit idêntico + HEAD inalterado, falha de patch, falha de validação Aegis — todos sem nenhuma escrita real). Regressão completa de §105-§110 confirmada sem quebrar. | - | ef10b79 |
| §112 | **Etapa F — decisão humana: SQLite (não RDS).** Plano original era `node:sqlite` nativo, mas a máquina real de dev/deploy roda Node 20.12.2 (não ≥24 como `package.json` declara — inconsistência pré-existente, descoberta nesta etapa, não introduzida por ela). `node:sqlite` não existe no Node 20. Tentativa com `better-sqlite3` (binário nativo) falhou no build local (erro de certificado SSL baixando headers do Node via node-gyp). Pivô para `sql.js` (SQLite compilado pra WASM, pure JS, zero compilação nativa) — funcionou de primeira. Novo módulo `backend/agent-queue-db.js`: singleton de módulo (`init(dataDir)` assíncrono carrega o WASM + abre/cria o arquivo; `push/shift/length/storeResult/getResult` síncronos depois), schema `queue(rowid AUTOINCREMENT, id, payload)` + `results(mission_id PK, payload)`, FIFO via `rowid`, flush síncrono (`db.export()` + `fs.writeFileSync`) depois de toda escrita — crash-safe. `app.listen` agora espera `await agentQueueDB.init(DB_ROOT)` antes de aceitar requests. Os 6 call-sites em `server.js` substituídos preservando 100% o contrato HTTP. `_test112_persistent_queue_unit.cjs` 13/13 (a propriedade de persistência é testada limpando `require.cache` do módulo entre "sessões", já que o singleton não expõe `close()`) + `_test112_persistent_queue_e2e.sh` (servidor real, **kill -9 de verdade**, adaptado para Windows/Git Bash via `cygpath -w` + variáveis de ambiente, já que `process.chdir()` do Node não entende paths estilo `/tmp/...` do Git Bash). Regressão completa de §105-§111 sem quebrar. Achado em paralelo: o painel do EB mostra a plataforma atual ("Node.js 20 running on Amazon Linux 2023") como "Obsoleta", com Node 22 e 24 disponíveis como upgrade compatível — decisão de fazer esse upgrade **deliberadamente adiada**, não bloqueia esta etapa. | - | eee4335 |
| §113 | **Etapa A, Fase 3 — fecha a Etapa A por completo.** UI no chat para o dry-run real (§111): 3 novas funções em `vision-core-bundle.js` (`vcQueueSfDryRunViaAgent` reaproveita o padrão de polling do §106; `renderSfDryRunResult` renderiza os 8 desfechos possíveis com `textContent` — nunca `innerHTML` — para conteúdo do projeto-alvo; `renderSfDryRunPanel` é o painel de entrada com campo de caminho + descrição). Novo botão de sidebar `#vcOpenDryRunPanelBtn` em `index.html`. **Backend e `vision-agent.js` intocados** — o endpoint e o tipo de missão `sf_dry_run_real` já existiam desde o §111, esta etapa só constrói a UI por cima. `_test113_dry_run_ui_static_wiring.cjs` 15/15 + regressão `_test106_static_wiring.cjs` 9/9. Balanço HTML de `index.html` confirmado idêntico. Doc encontrada desatualizada e corrigida nesta sessão: tabela "VERSÕES ATUAIS" do CLAUDE.md estava parada no §109 mesmo com §110-§112 já entregues; itens 2/3/5 do roadmap "POTENCIAIS DE EVOLUÇÃO" em `about.html` ainda apareciam como "ROADMAP" puro mesmo já estando resolvidos/retirados desde §107/§108. | - | dfac9bd |

---

## PENDÊNCIAS IMEDIATAS (PRÓXIMA SESSÃO)

**Status: §113 fechou a Etapa A por completo** (firewall §110 + núcleo técnico §111 + UI §113) — único item que restava do roadmap original de 5 etapas (A-F). Itens já LIVE/resolvidos removidos desta lista (§98-A/B/C/D/E, T1-T6, §103, §104, §105, §106-§112, §113) — ver seções correspondentes acima pra histórico. As "ETAPAS GRANDES" abaixo são a continuação direta — vieram da auditoria de código real + dos roadmaps já publicados em `about.html`/`landing.html`.

### §104 (histórico) — limpeza + cobertura completa do histórico
Implementado via `_patch104_cleanup_and_coverage.py`. Ver commit `bc0325f`. Resumo: removeu `v236FileInput` órfão, padronizou versão backend (5.9.7), `display_input` limpo no histórico, `recordMissionTimelineEntry` nos 3 fluxos que faltavam.

### §105 (histórico) — fechar o loop chat→agent local→patch real
Ver seção "§105 — Fechar o Loop" acima para o write-up completo. Patch: `_patch105_agent_loop_closure.py`. Testes: `_test105_backend_logic.cjs` (13/13) + `_test105_full_loop_e2e.sh` (9/9, backend+agent reais).

### §106 (histórico) — Etapa A: agent local também no EXECUTAR MISSÃO
Inline polling de ~60 linhas extraído para `vcQueueApplyPatchViaAgent(hermesObj, statusEl, onReset, onDone)` compartilhada entre `renderApplyFixPanel` (§105) e `renderStandardMethodPanel` (§106). `agentBtn106` adicionado no EXECUTAR MISSÃO panel. Backend intocado. Testes: `_test106_static_wiring.cjs` (9/9) + regressão `_test105_*` (13/13 + 9/9). `landing.html` converteu card "EM EVOLUÇÃO — EXECUTAR MISSÃO real" para RESOLVIDO.

### §107 (histórico) — Etapa C: memory layer no Hermes (§72 Fase 2)
**Etapa B descartada por razão correta:** a Etapa B do roadmap propunha implementar tiered routing por dificuldade (classifyMissionDifficulty). Ao abrir `SDDF_SPEC.md §66` para referência, confirmado "Status: ✅ FECHADO — 80/80 CI #67" — o problema de qualidade que motivou a Etapa B já estava resolvido sem código de classificação (via ajuste de `OPENROUTER_MODEL` para `deepseek/deepseek-v4-flash`). Etapa B retirada do roadmap. Nota adicionada ao §66 em `SDDF_SPEC.md`.
**Implementação (Etapa C — memory layer):** novas funções em `backend/hermes-rca.js`:
- `tokenize(text)` — Set de tokens ≥4 chars, minúsculas, sem embeddings
- `jaccardOverlap(setA, setB)` — similaridade de Jaccard entre Sets de tokens
- `readLowConfidenceLog(maxEntries)` — lê `.vision-memory/hermes_low_confidence.jsonl`, mais recente primeiro, tolera linhas corrompidas
- `findSimilarLowConfidenceCases(input, entries, opts)` — filtra entradas com Jaccard ≥ 0.15 (configurável)
- `applyMemoryReordering(order, similarCases)` — move (nunca remove) providers fracos pro final da fila
- `computeMemoryMetrics(entries)` — agrega stats para `/api/metrics/memory` (§108)
`callHermes` modificado: `const order` → `let order`, bloco de memory lookup antes do `for`, não bloqueante (erro → log + segue). Campo `keywords` adicionado ao log de baixa confiança para matching futuro.
**Evidência:** `_test107_memory_layer_unit.cjs` 26/26 (tokenize×5, jaccard×6, readLog×5, findSimilar×4, reorder×6). Regressão §105/§106 confirmada (13/13 + 9/9 + 9/9).

### §108 (histórico) — Etapa E: painel de métricas com dados reais
**Achado:** painel `#metricsBoard` ("MÉTRICAS DOS AGENTES") existia 100% estático em `index.html` — 8 linhas de custo fictício hardcoded e badge "UI LOCAL". O próprio texto do painel dizia "quando backend offline, fallback local" — promessa nunca cumprida: zero JS por trás do painel.
**Fix backend:** novo `GET /api/metrics/memory` em `server.js` — chama `readLowConfidenceLog(500)` + `computeMemoryMetrics()`, retorna `{ total_escalations, by_provider, memory_capable_entries, legacy_entries_without_keywords, last_escalation_at, data_source, anti_stub:true }`.
**Fix frontend:** `initObservabilityPanel107()` IIFE inserida após o bloco `clearBtn` em `vision-core-bundle.js` — faz `Promise.all` nos 4 endpoints, se qualquer retornar `ok:true` converte badge para "DADOS REAIS" (verde), preenche status dos agentes por nome, e adiciona grid com 3 blocos: RUNTIME (backend), DORA METRICS, MEMORY LAYER. Fallback: se todos os fetches falharem → `if (!gotAny) return` — nada muda, estático permanece.
**Evidência:** `_test108_observability_unit.cjs` 23/23 (computeMemoryMetrics×8 + wiring estático×10) + `_test108_endpoint_smoke.sh` 10/10 (health + 4 endpoints + 5 campos do endpoint novo, backend real porta 4498).

### §109 (histórico) — Etapa D: missão multi-arquivo atômica
**Contexto:** toda missão `apply_patch` (§105) sempre operou sobre exatamente 1 arquivo. `/api/agent/mission/queue` e `applyPatchMission` em `vision-agent.js` aceitavam campos `file`/`patch` singulares — não havia como agrupar N arquivos numa única transação atômica.
**Fix backend (`server.js`):** novo bloco `if (type === 'apply_patch_multi')` no handler `/api/agent/mission/queue` — valida que `body.files` é array não-vazio e que cada item tem `file`+`patch`, rejeita com 400 se não (dois erros distintos: `apply_patch_multi_requires_files_array` e `apply_patch_multi_each_file_requires_file_and_patch`). Persiste o array mapeado como `mission.files` com `fix_type` defaultado para `'code_patch'`. Bloco `if (type === 'apply_patch')` do §105 intocado.
**Fix vision-agent.js:** 4 funções novas ao lado (não substituindo) de `applyPatchMission`:
- `resolveTargetFile(fileRef)` — mesma lógica de resolução por caminho direto + busca por nome do §105, extraída como helper standalone para não duplicar código.
- `rollbackFiles(relPaths)` — reverte array de caminhos relativos via `git checkout --`.
- `gitCommitMulti(filePaths, message)` — `git add` com todos os caminhos + `git commit` único (não N commits separados).
- `applyPatchMultiMission(m)` — orquestra 4 etapas em sequência: (1) resolver todos os caminhos antes de escrever qualquer arquivo; (2) aplicar patches em ordem — falha em qualquer → rollback dos já aplicados + retorna `patch_multi_failed`; (3) validar Aegis em todos os arquivos já modificados — falha em qualquer → rollback de todos + retorna `patch_multi_rollback`; (4) commit único via `gitCommitMulti` — retorna `patch_multi_applied_committed`.
Dispatcher em `poll()` extendido com linha `m.type === 'apply_patch_multi' ? applyPatchMultiMission :`.
**Não verificado manualmente:** interface de usuário para submeter `apply_patch_multi` (o LLM do chat ainda não compõe automaticamente o array `files[]` — isso é trabalho futuro de prompt engineering/coordenação LLM multi-arquivo). O loop técnico (backend → agent → resultado) foi validado via E2E automatizado.
**Evidência:** `_test109_static_wiring.cjs` 12/12 (3 backend + 9 agent — wiring estático sem servidor) + `_test109_multi_patch_atomic_e2e.sh` todos os checks (backend+agent reais, repo git temporário com 6 arquivos em 3 cenários: caminho feliz com 1 commit cobrindo 2 arquivos, falha de patch com rollback, falha de validação Aegis com rollback). Regressão completa: §105 (13/13 + 9/9) + §106 (9/9) + §107 (26/26) + §108 (23/23 + 10/10) = 90 testes, 0 falhas.

### §110 (histórico) — Fase 1 de N — Etapa A (Software Factory dry-run real): firewall de auto-modificação
**Contexto:** a Etapa A (Software Factory dry-run real contra repo externo) requer uma peça de segurança fundamental antes de qualquer endpoint ou mission type novo: garantir que o dry-run nunca possa ser apontado pro próprio vision-core. Um agente capaz de reescrever suas próprias regras de governança deixa de ser confiável. Esta Fase 1 entrega exclusivamente essa peça — testada exaustivamente, sem nenhuma capability visível ao usuário ainda.
**Fase 1 NÃO entrega:** endpoint `/api/sf/dry-run-real`, mission type, leitura real do `target_path`, integração com Hermes, `simulatePatch()`, nem E2E de dry-run real. Tudo isso é Fase 2 (sessão futura).
**Fix `vision-agent.js`:** 5 funções novas inseridas entre `applyPatchMultiMission` e o comentário `/* ── Polling loop */`:
- `isPathInside(parent, child)` — verifica se `child` é igual a, ou está dentro de, `parent` via `path.relative`.
- `normalizeGitUrl(url)` — normaliza https vs ssh, com/sem `.git`, com/sem barra final, lowercase — pra que variações de formatação não escapem da comparação.
- `hasSelfGitRemote(dir)` — `git remote -v` + normalização, checa contra `SELF_GIT_REMOTES` (GitHub + GitLab).
- `hasSelfFingerprint(dir)` — verifica presença simultânea de `CLAUDE.md` + `SDDF_SPEC.md` (assinatura forte do projeto).
- `isSelfTargetForbidden(targetPath)` — função principal com 4 camadas: (1) caminho alvo = ROOT ou subpasta do ROOT; (2) caminho alvo é pasta-pai que contém ROOT; (3) remote git normalizado bate em `SELF_GIT_REMOTES`; (4) fingerprint CLAUDE.md+SDDF_SPEC.md. Qualquer camada sozinha já bloqueia. `realpathOrResolve()` garante resolução de symlinks.
**`require.main` guard + `module.exports`:** o bootstrap do servidor de health e o polling agora estão dentro de `if (require.main === module)`. O comportamento CLI (`node vision-agent.js`) é **exatamente o mesmo** — a guard só impede que o servidor inicie quando o arquivo é importado via `require()`. `module.exports` expõe as 4 funções puras (`isSelfTargetForbidden`, `isPathInside`, `normalizeGitUrl`, `hasSelfFingerprint`) pra que os testes possam importar e testar diretamente com diretórios e remotes reais (em vez de só verificar presença do código por grep). `server.js` intocado.
**Evidência:** `_test110_self_modification_firewall_unit.cjs` 20/20 (diretórios e repositórios git reais criados em `/tmp`): 5 casos positivos (bloqueio correto por cada camada + variações de formatação), 6 casos negativos (confirmam que diretórios legítimos não são bloqueados), symlink (pulado graciosamente se sem privilégio no Windows), 3 casos unitários para `isPathInside`/`normalizeGitUrl`. Regressão: 8 suites completas (13+26+23+12+20 unit + 9/9/10/9 E2E — **2 E2E confirmam que o CLI via `node vision-agent.js` continua funcionando igual pós-guard**) = 110 testes, 0 falhas.

### §111 (histórico) — Etapa A, Fase 2: dry-run real (núcleo técnico completo)
**Constrói diretamente sobre o §110.** Reaproveita a infraestrutura existente de `executeMission`/`askIA`/`parsePatchFromAI` (linhas ~287-423) em vez de duplicar o pipeline de diagnóstico — só troca o que acontece DEPOIS do diagnóstico.
**Descoberta importante no caminho:** investigando o gate anti-alucinação do backend (`server.js`, "FIX C §25", ~linha 2096), descobrimos que `mode:fix` só libera a chamada se a mensagem tiver um nome de arquivo entre colchetes (ex: `[buggy.js]`) — um dos 4 padrões aceitos. A função `askIA(fileContent, missionInput)` pré-existente (usada desde a v1.0 pelo `executeMission` genérico) **nunca incluía esse padrão** — o que significa que esse caminho de código (usado pelo tipo de missão genérico desde sempre, nunca pelos tipos `apply_patch`/`apply_patch_multi`, que carregam patch pré-computado e não passam por essa chamada) provavelmente **sempre caiu em `BLOCKED_INPUT` em produção**, um bug latente nunca disparado/testado antes (as sessões §105-§110 focaram só em `apply_patch`/`apply_patch_multi`). Confirmado via teste manual contra o backend real rodando localmente: mensagem sem colchetes → `BLOCKED_INPUT` síncrono instantâneo; mensagem com colchetes → a requisição passa do gate (timeout ao alcançar provedores de LLM reais — esperado, já que a whitelist de rede deste sandbox não inclui domínios de provedores de LLM; confirma que o gate foi passado, não uma falha do fix).
**Fix:** `askIA(fileContent, missionInput, fileLabel)` ganhou um 3º parâmetro opcional (default retrocompatível `'arquivo.txt'`), mensagem agora `'[' + label + ']\n' + fileContent + ...`. Os 2 call-sites atualizados pra passar `relTarget` (o nome relativo já calculado em cada um): `executeMission` (linha ~329) e o novo `sfDryRunRealMission` (linha ~1032). Correção genuína que beneficia o fluxo `executeMission` pré-existente também — documentada com transparência como uma lacuna descoberta-e-corrigida, não um efeito colateral escondido.
**Novas funções em `vision-agent.js`** (entre o bloco do firewall do §110 e o comentário `/* ── Polling loop */`):
- `scanExternalProject(targetRoot, input)` — cópia de `scanProject` parametrizada por um root explícito em vez do `ROOT` fixo do agente. Mantida como função standalone (não um refatoramento de `scanProject`) pra não arriscar o par já testado `scanProject`/`executeMission` — mesmo padrão risk-averse já usado no §109 (`resolveTargetFile` foi adicionada ao lado da lógica existente, não substituindo-a).
- `simulatePatch(filePath, patch, fixType)` — espelha exatamente a lógica de transformação de `applyPatch` (code_patch/json_field/full_replace), mas NUNCA chama `fs.writeFileSync`; retorna `{ok, before, after, error}`.
- `validatePatchContent(content, ext)` — espelha `validatePatch`, mas valida uma STRING em memória; para `.js/.mjs/.cjs` escreve o conteúdo num arquivo TEMPORÁRIO em `os.tmpdir()` (fora do projeto-alvo) só pra rodar `node --check`, depois apaga; para `.json` usa `JSON.parse`.
- `sfDryRunRealMission(m)` — orquestrador assíncrono: exige `m.target_path`; PASSO 0 chama `isSelfTargetForbidden(m.target_path)` ANTES de qualquer leitura (retorna `action: 'sf_dry_run_blocked_self_target'` se proibido); PASSO 1 `scanExternalProject`; PASSO 2 `askIA` (com fileLabel); PASSO 3 `parsePatchFromAI`; PASSO 4 `simulatePatch` (nunca escreve); PASSO 5 `validatePatchContent` no conteúdo "after" simulado. Retorna `{action: 'sf_dry_run_completed', real_io: true, written_to_disk: false, committed: false, diff_preview: {before, after}, ...}` no sucesso.
- `const os = require('os');` adicionado ao topo do arquivo.
- Dispatcher do `poll()` estendido: `m.type === 'sf_dry_run_real' ? sfDryRunRealMission : ...` (antes do fallback final `executeMission`).
- `module.exports` estendido com `simulatePatch`, `validatePatchContent`, `scanExternalProject`.
**`backend/server.js`:** bloco `sf_dry_run_real` em `/api/agent/mission/queue` (depois do bloco `apply_patch_multi`) — valida `body.target_path` obrigatório (400 `sf_dry_run_real_requires_target_path` se ausente), persiste `mission.target_path`. Relay/validação pura — backend nunca lê/escreve arquivos reais do projeto-alvo.
**Evidência:** `_test111_dry_run_real_unit.cjs` 18/18 — `simulatePatch` (code_patch caminho feliz + falha de busca + json_field + full_replace, todos confirmando o arquivo real intacto), `validatePatchContent` (JS/JSON válido/inválido, extensão sem validador, confirma zero arquivo temporário órfão), `scanExternalProject` (encontra por nome num diretório externo, fallback por conteúdo, respeita SKIP_DIRS, confirma que opera no diretório passado e não no ROOT do agente), checagem do formato de mensagem do `askIA` via servidor stub local, mais checagens estáticas (server.js valida `sf_dry_run_real`, dispatcher registra, firewall precede scanner na ordem do código-fonte). `_test111_dry_run_real_e2e.cjs` 18/18 — E2E completo usando um backend STUB próprio (não o `server.js` real) implementando só os 4 endpoints necessários (fila/pendente/resultado de missão, mais `/api/chat` determinístico retornando patches JSON pré-definidos — evita dependência de LLM real, mesmo espírito de "não precisa de chave de API" do `_test105_full_loop_e2e.sh`) + `vision-agent.js` real rodando como processo CLI de verdade + repositórios git temporários reais. 4 cenários: (1) FIREWALL — `target_path` = raiz real do vision-core sandbox → `sf_dry_run_blocked_self_target`, confirmado que só o passo Firewall rodou (Scanner nunca executou); (2) CAMINHO FELIZ — repo temporário com bug conhecido (`return a - b` em vez de `+`) → `sf_dry_run_completed`, `diff_preview.before/after` corretos, arquivo no disco bit-a-bit idêntico ao original, HEAD do git inalterado, working tree limpo; (3) FALHA NO PATCH — stub retorna patch com busca inexistente → `sf_dry_run_patch_failed`, arquivo/HEAD intactos; (4) FALHA NA VALIDAÇÃO — stub retorna patch que produz JS inválido → `sf_dry_run_validation_failed`, arquivo/HEAD/working-tree ainda intactos.
**Regressão completa confirmada limpa:** §105 (13/13+9/9) + §106 (9/9) + §107 (memory layer) + §108 (unit+smoke) + §109 (12/12+E2E) + §110 (20/20) — todos sem quebrar, após a mudança de assinatura do `askIA`.
**O que isso completa da Etapa A:** todos os itens listados como "pendentes para a Fase 2" no write-up do §110 (endpoint/mission type, leitura real, integração Hermes, `simulatePatch()`, E2E) foram entregues nesta sessão — o núcleo técnico de risco da Etapa A está completo e testado.
**O que ainda NÃO foi feito (polish opcional, não bloqueante):** nenhuma UI no chat pra apontar um repositório externo e disparar isso visualmente (hoje é capability de backend+agent, chamável via missão); o dry-run ainda é de um arquivo por missão, não combinado com a atomicidade multi-arquivo do §109. Nenhum desses dois é um risco técnico — é só a camada de UX que ainda não foi construída, no mesmo espírito de como o `apply_patch_multi` do §109 também não tem UI de chat pra compor missões multi-arquivo automaticamente.

### §112 (histórico) — Etapa F: fila de missões persistida em SQLite
**Decisão humana registrada antes de qualquer código:** SQLite, não RDS — escolha explícita do usuário, sem custo mensal extra.
**Investigação que precedeu a implementação:** a descrição original da Etapa F ("Hoje: JSON + `/tmp`, reseta a cada restart") foi escrita especulativamente numa sessão anterior, sem checar o código real. Buscando por `/tmp` literal em `server.js`: zero ocorrências no caminho de dados da aplicação. `users.json` (auth/multi-tenant/Stripe) já vive em `DB_ROOT = path.join(ROOT, 'data')` e já é persistido em arquivo normalmente — não tem o bug de volatilidade. O ponto real, confirmado por leitura direta do código: `const _agentQueue = []` e `const _agentResults = {}` em `server.js` (fila de missões do Vision Agent Local e seus resultados) são **100% em memória**, sem nenhuma escrita em disco — e §70 (já fechado) confirma que o `web.service` no EB reinicia periodicamente via `cfn-hup` (~15-90min de intervalo), restart limpo do processo Node (não OOM). Qualquer missão enfileirada e ainda não consumida, ou resultado ainda não buscado, era genuinamente perdido nesse restart.
**Escopo deliberadamente contido:** só a fila de missões + resultados. `users.json`/auth/Stripe NÃO foi tocado — não tinha o bug que motivou a etapa.
**O driver real não foi o planejado — e essa mudança de rumo é parte da história:** o plano original (escrito antes de qualquer código) era `node:sqlite` nativo, assumindo que `package.json` (`"engines": {"node": ">=24.0.0"}`) refletia a máquina real. Na hora de implementar: `node --version` na máquina de dev/deploy real retornou **v20.12.2** — `node:sqlite` não existe antes do Node 22.5, então essa rota estava fechada desde o início, e isso só foi descoberto checando o ambiente de verdade, não a documentação. Segunda tentativa, `better-sqlite3` (binário nativo via npm): `npm install` falhou no build (`node-gyp` tentando baixar headers do Node, erro de certificado SSL) — limitação do ambiente Windows local (rede/certificados corporativos), não do código nem da escolha de pacote. Terceira tentativa, `sql.js` (SQLite compilado pra WebAssembly, pure JS, zero binário nativo): funcionou de primeira, sem nenhum requisito de toolchain de compilação.
**Novo módulo `backend/agent-queue-db.js`** — desenho diferente do planejado originalmente (que era uma fábrica retornando instâncias independentes); o real é um **singleton de módulo**: `let _db = null; let _dbPath = null;` no topo do arquivo, com `init(dataDir)` assíncrono (carrega o WASM do `sql.js`, abre o arquivo `.sqlite` existente ou cria um novo, roda `CREATE TABLE IF NOT EXISTS`) seguido de operações **síncronas**: `push(mission)`, `shift()` (FIFO via `ORDER BY rowid ASC`, com a tabela declarada `rowid INTEGER PRIMARY KEY AUTOINCREMENT` — o `AUTOINCREMENT` explícito garante que SQLite nunca reutiliza um rowid já usado, mesmo depois de deletar linhas, o que fecha uma classe de bug de reordenação que um contador em memória teria), `length()`, `storeResult(id, payload)` (via `INSERT OR REPLACE`, upsert real) e `getResult(id)`. Não há `close()` exposto na API pública. Isso é o desenho correto para o processo do servidor real, que só precisa de uma única conexão durante toda a sua vida — mas tem uma consequência direta sobre como o teste unitário precisou ser desenhado (ver Evidência). Persistência real: depois de toda escrita, `_save()` faz `db.export()` (serializa o banco inteiro em memória pra um buffer binário) + `fs.writeFileSync` síncrono no arquivo `.sqlite` — o flush termina antes do handler HTTP correspondente retornar uma resposta, então mesmo um `kill -9` no meio de um request só poderia perder, no pior caso, a última escrita em andamento — a mesma garantia que qualquer banco com fsync síncrono dá nesse nível.
**`backend/server.js`:** os 6 pontos que liam/escreviam `_agentQueue`/`_agentResults` diretamente substituídos por chamadas ao módulo `agentQueueDB` (importado via `require('./agent-queue-db')`). Como `init()` é assíncrono, `app.listen(...)` foi envolvido numa IIFE `(async () => { await agentQueueDB.init(DB_ROOT); app.listen(...); })()` — o servidor só começa a aceitar requests depois do banco estar pronto. O contrato HTTP de todos os 6 endpoints é idêntico ao anterior — nenhuma mudança necessária em `vision-agent.js` nem no bundle do frontend.
**Teste E2E precisou de um fix de ambiente Windows:** a primeira versão do `_test112_persistent_queue_e2e.sh` usava `mktemp -d /tmp/...` e passava esse path direto pro `process.chdir()` dentro de um `node -e`. Isso funciona em Linux/macOS, mas falha no Windows real: o Git Bash entende paths estilo `/tmp/...`, mas o Node.js nativo do Windows (não o WSL) não — `process.chdir('/tmp/...')` lança erro. Fix: `cygpath -w` converte o path Git-Bash pra formato Windows (`C:\Users\...`) antes de passar pro Node, e os paths convertidos vão via variável de ambiente (`VC_TEST_DB_ROOT`, `VC_TEST_SRV`) em vez de interpolação direta na string do `node -e`, evitando o inferno de escapar backslash dentro de aspas dentro de aspas.
**Evidência:** `_test112_persistent_queue_unit.cjs` 13/13 — operações básicas de fila/resultado (push/shift retorna objeto exato, FIFO com 3 missões, `length()` correto após push/shift, `shift()` em fila vazia retorna `null`, `storeResult`/`getResult` roundtrip, upsert via `INSERT OR REPLACE` confirmado, `getResult` em id inexistente retorna `null`), arquivo `.sqlite` real criado no disco logo após `init()`, `init()` confirmado idempotente (segunda chamada não reseta nada), e **a propriedade central**: como o módulo é um singleton sem `close()`, simular "fechar e reabrir" dentro de UM processo de teste exige limpar `require.cache` da entrada do módulo antes de cada `require()` — isso força o Node a reexecutar o arquivo do zero, redeclarando `_db`/`_dbPath` como `null`, equivalente a um processo novo sem precisar de `child_process` real para essa verificação específica (o teste com processo real está no E2E, ver abaixo). Com esse truque: fila e resultado de uma "sessão 1" continuam acessíveis e em ordem FIFO correta numa "sessão 2" que recarrega o mesmo arquivo. 5 reaberturas seguidas não corrompem nada. Duas checagens estáticas finais confirmando que `server.js` não tem mais nenhuma referência a `_agentQueue`/`_agentResults` e que usa `agentQueueDB.*` em todos os 6 call-sites + espera `init()` antes de `listen`. `_test112_persistent_queue_e2e.sh` — sobe o `server.js` REAL (não stub), enfileira 2 missões e 1 resultado via HTTP real, confirma que o 400 do `apply_patch` sem campos obrigatórios continua funcionando, **mata o processo com `kill -9` de verdade**, confirma a morte via `kill -0`, **sobe um processo Node completamente novo** apontando pro mesmo diretório de dados, e confirma: `queue_length` correto somando as 2 missões antigas com a nova enfileirada pós-restart, ordem FIFO das 2 missões antigas preservada exatamente entre os dois processos, o resultado armazenado antes do restart ainda recuperável, e o 404 de id inexistente ainda funcionando.
**Regressão completa confirmada sem quebrar:** §105 (13/13+9/9) + §106 (9/9) + §107 (26/26) + §108 (23/23+10/10) + §109 (12/12+E2E) + §110 (20/20) + §111 (18/18+18/18) — todos 0 falhas, depois da troca completa de driver.
**Achado em paralelo, deliberadamente não resolvido agora:** o painel do Elastic Beanstalk mostra a plataforma atual ("Node.js 20 running on 64bit Amazon Linux 2023") com status "Obsoleto" — independente de qualquer coisa relacionada a SQLite, é algo que a própria AWS já está sinalizando. O painel oferece Node 22 e Node 24 como ramificações "Compatível" pra upgrade. Isso resolveria a inconsistência do `engines` (`>=24.0.0` declarado, Node 20 real) e abriria caminho pra um `node:sqlite` nativo mais simples no lugar do `sql.js`. Mas: (1) upgrade de plataforma EB substitui as instâncias e deixa a aplicação indisponível durante a troca, a menos que rolling updates estejam habilitados; (2) mudar só a plataforma do EB não muda a máquina de dev local. **Decisão: adiado deliberadamente** como melhoria de infraestrutura independente.
**O que ainda NÃO foi feito:** `users.json`/auth/Stripe continua em JSON file simples — deliberado, fora do escopo. RDS PostgreSQL não foi avaliado mais a fundo — a decisão humana já descartou essa opção. O upgrade de plataforma EB/Node local — adiado, ver acima. **Limitação conhecida do design atual:** a tabela `results` não tem nenhuma rotina de limpeza/expiração — cada resultado de missão fica armazenado indefinidamente, e como `_save()` reexporta o banco INTEIRO a cada escrita (não é um append incremental), o custo de cada `push`/`shift`/`storeResult` cresce lentamente conforme o histórico acumula. Não é um problema no volume atual do projeto, mas é uma característica do design `sql.js` (exporta tudo, sempre) que `node:sqlite` nativo não teria (escreve incrementalmente no arquivo).

### §113 (histórico) — Etapa A, Fase 3: UI no chat para o dry-run real (fecha a Etapa A por completo)
**Contexto:** fecha a única lacuna registrada explicitamente no §111 como "ainda NÃO foi feito" — o núcleo técnico do dry-run real já existia completo desde a sessão anterior (firewall §110 + scan/diagnóstico/simulação §111), mas só era chamável via API direta (`POST /api/agent/mission/queue` com `type: 'sf_dry_run_real'`), sem nenhum ponto de entrada visual no chat. Etapa deliberadamente **só frontend** — nem `backend/server.js` nem `frontend/downloads/vision-agent.js` foram tocados, porque o contrato HTTP e o tipo de missão já estavam prontos e testados desde o §111.
**Novas funções (`frontend/assets/vision-core-bundle.js`):** `vcQueueSfDryRunViaAgent(targetPath, inputDesc, statusEl, onReset, onDone)` — reaproveita quase literalmente o padrão de polling do §106 (`vcQueueApplyPatchViaAgent`: checagem de `/api/agent/status`, polling 2s×15 em `/api/agent/mission/result/:id`, fallback de retomada manual), só troca o corpo do POST para `{type:'sf_dry_run_real', target_path: targetPath, input: inputDesc}`. `renderSfDryRunResult(rd)` — renderiza qualquer um dos 8 desfechos possíveis de `sfDryRunRealMission` (todos já existentes desde o §111: `blocked_self_target`, `failed`, `listing`, `diagnosis_failed`, `analysis_only`, `patch_failed`, `validation_failed`, `completed`); borda verde para sucesso, vermelha para bloqueio de firewall, amarela para os 5 desfechos intermediários; no sucesso, painel de 2 colunas "ANTES"/"DEPOIS" usando `rd.diff_preview`. **Decisão de segurança deliberada:** todo conteúdo do projeto-alvo é inserido via `textContent`, nunca `innerHTML` — é código de um repositório de terceiros, nunca deve ser interpretado como HTML/script. `renderSfDryRunPanel()` — ponto de entrada: campo de caminho do projeto + textarea de descrição do problema + botão "🔬 Rodar Dry-Run Real", valida os dois campos antes de enfileirar, dropa o painel direto no `chatStream` (mesmo host de `renderApplyFixPanel`/`renderStandardMethodPanel`).
**`frontend/index.html`:** um botão novo de sidebar `#vcOpenDryRunPanelBtn` ("🔬 DRY-RUN EXTERNO"), reaproveitando a classe CSS já existente `vc-sf-sidebar-link` — zero CSS novo necessário. Wiring adicionado dentro de `initSoftwareFactoryPage()`, ao lado do listener que já existia para `[data-open-sf-page]`.
**Evidência:** `_test113_dry_run_ui_static_wiring.cjs` 15/15 — as 3 funções novas cada uma definida exatamente 1 vez; corpo do POST usa exatamente `type: 'sf_dry_run_real', target_path: targetPath, input: inputDesc`; botão presente em `index.html`; wiring liga o botão a `chatStream.appendChild(renderSfDryRunPanel())`; painel valida os 2 campos antes de enfileirar; as 8 `action` strings de `sfDryRunRealMission` continuam intactas em `vision-agent.js` (prova de que o contrato do §111 não foi tocado); `renderSfDryRunResult` distingue visualmente `completed` de `blocked_self_target`; uso de `textContent` (não `innerHTML`) confirmado; 4 checagens de regressão confirmando `vcQueueApplyPatchViaAgent`/`renderApplyFixPanel`/`renderStandardMethodPanel`/`renderValidationPanel` (§105/§106) intactas; forma `diff_preview:{before,after}` do §111 inalterada. Regressão: `_test106_static_wiring.cjs` 9/9. Balanço de tags HTML de `index.html` confirmado idêntico (`<div>` 1149/1149, `<section>` 10/10, `<button>` 211/211, etc.). `node --check` confirma sintaxe válida.
**Achado em paralelo nesta sessão (doc desatualizada, corrigida):** a tabela "VERSÕES ATUAIS" deste arquivo estava parada na entrega do §109 (5.9.11) mesmo com §110/§111/§112 já implementados e deployados em sessões anteriores — corrigido. Na seção "POTENCIAIS DE EVOLUÇÃO" de `frontend/about.html`, os itens 2 (Etapa B), 3 (Etapa C) e 5 (Etapa E) ainda apareciam com badge "ROADMAP" puro mesmo já estando retirado/resolvido desde §107/§108 — violava a própria regra documentada neste arquivo (nunca deixar um item simultaneamente em "roadmap não implementado" e "resolvido"). Corrigido nesta sessão: itens removidos e lista renumerada.
**O que isso completa da Etapa A:** as 3 fases planejadas (firewall §110, núcleo técnico §111, UI §113) estão entregues e testadas — Etapa A é considerada tecnicamente completa.
**O que ainda NÃO foi feito (Fase 4, opcional, sem risco técnico):** dry-run multi-arquivo (combinar com a atomicidade do `apply_patch_multi` do §109) — extensão de conveniência, não uma lacuna de segurança ou um caminho de código não testado.

### Fora de escopo / decisão deliberada (não esquecimento)
- §98-F (OPENCLAW/OPENSQUAD/OSINT/V10) — roadmap puro, NÃO implementar ainda.

---

## ETAPAS GRANDES — ROADMAP DE IMPLEMENTAÇÃO AUTÔNOMA (próximas sessões)

**Como usar esta seção com `claude --dangerously-skip-permissions`:** cada etapa abaixo é desenhada para ser executada **inteira, sem parar para teste manual no navegador** — a "Verificação automatizada" de cada etapa é o critério de PASS, no mesmo espírito de `_test105_full_loop_e2e.sh` (sobe backend real localmente, sobe agent real quando aplicável, curl/assert, sem depender de produção nem de clique humano). Se uma etapa não tiver verificação 100% automatizável, isso está dito explicitamente nela — nesse caso, implemente e documente o que falta verificar manualmente, não pule a etapa.

**Origem:** Etapas A–E vêm dos itens #1–#5 do roadmap publicado em `about.html` ("POTENCIAIS DE EVOLUÇÃO") + os itens "EM EVOLUÇÃO" de `landing.html`. Renumerados aqui em ordem de prioridade/risco, não na ordem original do about.html. (Etapa A do roadmap anterior = agent local no EXECUTAR MISSÃO — **concluída no §106**, removida desta lista.)

### Etapa A — Software Factory: dry-run real em repositório externo autorizado ✅ RESOLVIDA POR COMPLETO (§110 firewall + §111 núcleo técnico + §113 UI)
**Risco:** médio-alto (escopo precisa ficar restrito). **Esforço:** grande — entregue em 3 sessões (§110 Fase 1 + §111 Fase 2 + §113 Fase 3). **Ver write-ups dedicados de §110, §111 e §113 acima para a evidência completa.**
Hoje a Software Factory nunca toca código de produção — é camada de governança simulada (flags `release_allowed`/`deploy_allowed` sempre `false`). A evolução natural (não "destravar tudo"): para um repositório **explicitamente apontado pelo usuário** (nunca o próprio vision-core), rodar em modo "dry-run real": ler o código de verdade, gerar diff de verdade, **nunca commitar nem dar push**.

**Correção de design (§110):** a primeira versão deste plano (escrita numa sessão anterior, antes da compactação) sugeria um endpoint server-side que clonaria/leria o repo de destino direto no backend EB (`repo_path` no servidor ou `repo_url` pra clone em `/tmp` no servidor). Revisado nesta sessão: isso quebraria o modelo de confiança usado em TODAS as etapas anteriores (§105-§109), onde o backend EB **nunca toca arquivos reais** — toda leitura/escrita real acontece no computador do próprio usuário, via Vision Agent Local. Um backend compartilhado clonando URLs arbitrárias fornecidas por usuários é uma superfície de risco bem maior (SSRF, uso de disco compartilhado, múltiplos tenants) do que manter a mesma arquitetura já comprovada. **Plano corrigido (executado integralmente — ver abaixo):**

1. Vision Agent Local ganha capacidade de operar sobre um `target_path` explícito vindo da missão (não o seu próprio `ROOT` de argv) — leitura/escrita real continua só no computador do usuário, igual §105-§109. **✅ entregue no §111 (`scanExternalProject`).**
2. **Antes de tocar em qualquer arquivo do `target_path`**, chamar `isSelfTargetForbidden(target_path)` — **✅ implementado e testado no §110, integrado no §111 como PASSO 0 do `sfDryRunRealMission`.** Se `forbidden:true`, recusar a missão (`action: 'sf_dry_run_blocked_self_target'`) sem ler nada.
3. Se passar o firewall: leitura READ-ONLY dos arquivos relevantes do `target_path`, diagnóstico via a infraestrutura Hermes/callLLM já existente no backend (mesma usada pelo chat hoje — não duplicar pipeline). **✅ entregue no §111 (`askIA` reaproveitado, com o fix de formato de mensagem documentado no write-up do §111).**
4. Nova função `simulatePatch()` — mesma lógica de `applyPatch()`, mas calcula o resultado só em memória, **nunca chama `fs.writeFileSync` no arquivo real do target**. Retorna o diff antes/depois. **✅ entregue no §111.**
5. Resposta final: `{ diff_preview, file, real_io: true, written_to_disk: false }` — nunca commita, nunca dá push, nunca escreve no disco do repo de destino. **✅ entregue no §111 (`action: 'sf_dry_run_completed'`).**

**Verificação automatizada: ✅ feita no §111.** `_test111_dry_run_real_e2e.cjs` cobre exatamente o roteiro planejado aqui — repo de teste temporário com bug conhecido, diff correto, arquivo no disco idêntico antes/depois, HEAD do git inalterado, e o `target_path` apontando pro próprio vision-core recusado pelo firewall antes de qualquer leitura (confirmado pelos `steps` do resultado mostrando só "Firewall" executado).

**O que ainda não foi feito (Fase 4, opcional, sem risco técnico):** o dry-run real continua de um arquivo por missão, sem combinar com a atomicidade multi-arquivo do §109 — ou seja, não existe um "dry-run multi-arquivo". Não é uma lacuna de segurança nem bloqueia o uso real da capability hoje, que já tem firewall (§110), núcleo técnico testado (§111) e UI no chat (§113).

### Etapa B — Tiered routing de providers por dificuldade ✅ RETIRADA DO ROADMAP (§107)
**Razão:** SDDF_SPEC §66 já estava FECHADO (80/80 CI #67) — o problema de qualidade que motivou esta etapa resolvido sem código de classificação. Nenhum código escrito. Nota adicionada ao §66 em `SDDF_SPEC.md`. Ver §107 (histórico) acima.

### Etapa C — Memory layer: aprender com diagnósticos de baixa confiança anteriores ✅ RESOLVIDA (§107)
**Implementada em §107.** `tokenize`/`jaccardOverlap`/`readLowConfidenceLog`/`findSimilarLowConfidenceCases`/`applyMemoryReordering` em `hermes-rca.js`. `callHermes` desprioriza providers fracos. `_test107_memory_layer_unit.cjs` 26/26. Ver §107 (histórico) acima.

### Etapa D — Multi-arquivo / multi-step missions reais (apply, não só diagnóstico) ✅ RESOLVIDA (§109)
**Implementada em §109.** Novo tipo `apply_patch_multi` com garantia atômica tudo-ou-nada. Ver §109 (histórico) abaixo para write-up completo.
**Nota:** a parte resolvida é a garantia transacional (atomicidade na aplicação real). A coordenação autônoma por LLM de quais arquivos/call-sites mudar juntos (ex.: refatoração de assinatura + call sites) continua sendo trabalho futuro — o LLM pode hoje diagnosticar multi-arquivo (§56 Multi-DIFF) e enfileirar como `apply_patch_multi`, mas a decisão de *quais* arquivos compõem a transação ainda é do usuário/chat.

### Etapa E — Observabilidade do Vision Core como produto ✅ RESOLVIDA (§108)
**Implementada em §108.** Novo endpoint `/api/metrics/memory` + painel `#metricsBoard` ligado a 4 endpoints reais com fallback estático preservado. `_test108_observability_unit.cjs` 23/23 + `_test108_endpoint_smoke.sh` 10/10. Ver §108 (histórico) acima.

### Etapa F (infra, não código puro) — Banco de dados persistente ✅ RESOLVIDA NO §112 (decisão humana: SQLite)
**Risco:** alto (decisão de infraestrutura, não só código) — decisão tomada, código entregue. **Esforço:** médio, mas com retrabalho de driver no meio (`node:sqlite` → `better-sqlite3` → `sql.js`, ver write-up completo abaixo).
**Decisão humana registrada:** SQLite (não RDS) — sem custo mensal extra, suficiente pro problema real identificado.
**Correção de entendimento (§112):** a descrição original ("Hoje: JSON + `/tmp`, reseta a cada restart") estava parcialmente imprecisa — não há uso de `/tmp` no caminho que importa, e `users.json` (em `DB_ROOT = data/`) já é persistido em arquivo normalmente. O ponto real de volatilidade, confirmado lendo o código, é `_agentQueue`/`_agentResults` em `server.js`: dois arrays/objetos **100% em memória**, sem nenhuma escrita em disco, que são genuinamente perdidos a cada restart periódico do `web.service` via cfn-hup (~15-90min, §70 confirma: restart limpo do processo, não OOM).
**Driver real ≠ driver planejado:** o plano original era `node:sqlite` nativo (zero dependência). Na execução, a máquina real de dev/deploy roda **Node 20.12.2**, não ≥24 como `backend/package.json` declara em `engines` — uma inconsistência que já existia antes desta sessão, só não tinha sido confirmada contra o ambiente real até agora. `node:sqlite` não existe em Node 20. `better-sqlite3` (alternativa nativa) falhou no build local por um erro de certificado SSL no download de headers do Node via `node-gyp` — limitação do ambiente Windows local, não do código. A solução que efetivamente funcionou foi `sql.js` (SQLite compilado pra WASM, pure JS). Ver write-up completo do §112 abaixo.
**Achado em paralelo (não bloqueia esta etapa):** o painel do Elastic Beanstalk mostra a plataforma em produção ("Node.js 20 running on 64bit Amazon Linux 2023") com status "Obsoleto", e oferece Node 22 e Node 24 como ramificações compatíveis pra upgrade. Isso resolveria a inconsistência do `engines` E abriria caminho pra um `node:sqlite` nativo mais simples no futuro — mas upgrade de plataforma EB tem custo de disponibilidade (instâncias substituídas, app indisponível durante a troca se rolling updates não estiverem habilitados) e precisa de upgrade do Node local também (mudar só o EB não muda a máquina de dev). **Decisão: adiado deliberadamente**, tratado como melhoria de infraestrutura independente, não como bloqueio do §112.

---

## PADRÃO DE REGISTRO — DEPOIMENTOS E TESTES NAS PÁGINAS PÚBLICAS

**Regra:** toda etapa grande concluída (acima) deve, além do código+testes, atualizar as duas páginas públicas que documentam a trajetória real do produto. Isso já vinha sendo seguido desde §53 e precisa continuar — é a prova pública de "produto testado, não prometido" que sustenta o posicionamento do about.html ("IAs criam. VISION CORE corrige.").

### `frontend/about.html` — dois lugares para atualizar
1. **Seção "O QUE OS TESTES REVELARAM"** — um card novo por descoberta real (bug encontrado, causa raiz, como foi resolvido). Formato: emoji temático + citação em 1ª pessoa do que o teste revelou (estilo "depoimento técnico") + atribuição `— §NNN, contexto, PASS/FAIL`. Exemplos já no ar: §98-A (falso positivo no stress test), §98-D (agente especializado não lia o modo), §99-§101 (T-MENU). **Para §105:** adicionar um card sobre `renderValidationPanel` ser código morto desde sempre — é exatamente o tipo de descoberta que esta seção existe para registrar.
2. **Seção "POTENCIAIS DE EVOLUÇÃO" (roadmap numerado)** — quando uma etapa do roadmap acima é implementada, REMOVER o item correspondente desta lista (renumerando os que restam) e adicionar a entrada equivalente na seção "RESOLVIDO" de `landing.html` (abaixo). Não deixar um item simultaneamente em "roadmap não implementado" E "resolvido" — isso já causou inconsistência de doc antes (§98-B/§98-C, ver histórico).

### `frontend/landing.html` — três lugares para atualizar
1. **Seção "TRANSPARÊNCIA TÉCNICA"** — mover o card de "🔄 EM EVOLUÇÃO" pra "✅ RESOLVIDO — V2.9.10+" (ou criar um card resolvido novo, se a feature não tinha card "em evolução" ainda). Cada card resolvido tem: título, 1-2 frases de descrição, e uma linha "**Entregue:** endpoint(s) + certificação (quantos testes, qual arquivo)".
2. **Tabela de versão (`TRAJETÓRIA REAL`)** — adicionar/atualizar a linha `V2.9.10+` com a entrega mais recente, mesmo padrão de "Sistema de tutoriais contextual (T1-T6)... Stress test suite 40/40".
3. **Seção "ENTREGAS V2.9.10"** (cards com badge tipo `LIVE AGORA`/`fase de testes`) — se a etapa for grande o suficiente para merecer card próprio (como "Agente Arquiteto + Spec Library"), criar um novo bloco seguindo o mesmo HTML/CSS dos existentes.

### Depois de editar as páginas
Local dos arquivos fonte: `frontend/about.html` e `frontend/landing.html` (HTML estático, sem framework — strings concatenadas direto, mesmo estilo do resto do frontend). Deploy via `bash bin/deploy-pages.sh "msg"` (CF Pages) — **só depois** que os testes automatizados da etapa passarem. Nunca documentar uma etapa como resolvida nas páginas públicas antes do teste automatizado correspondente passar localmente.

---

## NOTA TÉCNICA — RUÍDO DE CRLF/LF NO GIT DIFF (achado nesta sessão, não é bug introduzido)

`git status`/`git diff` na working tree mostra ~1580 arquivos como "modified" mesmo sem nenhuma mudança de conteúdo real — confirmado comparando `README.md`: o HEAD do git tem LF, a working tree tem CRLF (provavelmente `core.autocrlf` configurado diferente entre a máquina Windows onde o projeto é normalmente editado e o ambiente onde este .zip foi gerado/extraído). **Isso já existia antes desta sessão** — não foi introduzido agora. Os arquivos tocados nesta sessão (`backend/server.js`, `frontend/assets/vision-core-bundle.js`, `SDDF_SPEC.md`) mantiveram CRLF consistente com o resto do arquivo, então o diff real desses 3 arquivos fica limitado às linhas de fato alteradas — não devolve cada linha do arquivo inteiro como "mudada". **Não é prioridade corrigir isso agora** (mexer em `.gitattributes`/`core.autocrlf` tem raio de explosão grande pra um benefício cosmético) — só registrado aqui pra próxima sessão não estranhar o `git status` gigante e não achar que é regressão.
