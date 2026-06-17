# VISION CORE — CLAUDE.md
## Documento central do projeto | Atualizado: 2026-06-17 (§105)

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
| Backend EB | 5.9.10-s107-s108-memory-observability | - | eab69de |
| CF Pages | live | s97-done | após s97 |

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

---

## PENDÊNCIAS IMEDIATAS (PRÓXIMA SESSÃO)

**Status: §106 fechou a Etapa A.** Itens já LIVE/resolvidos removidos desta lista (§98-A/B/C/D/E, T1-T6, §103, §104, §105, §106/Etapa A) — ver seções correspondentes acima pra histórico. As "ETAPAS GRANDES" abaixo são a continuação direta — vieram da auditoria de código real + dos roadmaps já publicados em `about.html`/`landing.html`.

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

### Fora de escopo / decisão deliberada (não esquecimento)
- §98-F (OPENCLAW/OPENSQUAD/OSINT/V10) — roadmap puro, NÃO implementar ainda.

---

## ETAPAS GRANDES — ROADMAP DE IMPLEMENTAÇÃO AUTÔNOMA (próximas sessões)

**Como usar esta seção com `claude --dangerously-skip-permissions`:** cada etapa abaixo é desenhada para ser executada **inteira, sem parar para teste manual no navegador** — a "Verificação automatizada" de cada etapa é o critério de PASS, no mesmo espírito de `_test105_full_loop_e2e.sh` (sobe backend real localmente, sobe agent real quando aplicável, curl/assert, sem depender de produção nem de clique humano). Se uma etapa não tiver verificação 100% automatizável, isso está dito explicitamente nela — nesse caso, implemente e documente o que falta verificar manualmente, não pule a etapa.

**Origem:** Etapas A–E vêm dos itens #1–#5 do roadmap publicado em `about.html` ("POTENCIAIS DE EVOLUÇÃO") + os itens "EM EVOLUÇÃO" de `landing.html`. Renumerados aqui em ordem de prioridade/risco, não na ordem original do about.html. (Etapa A do roadmap anterior = agent local no EXECUTAR MISSÃO — **concluída no §106**, removida desta lista.)

### Etapa A — Software Factory: dry-run real em repositório externo autorizado
**Risco:** médio-alto (escopo precisa ficar restrito). **Esforço:** grande — provavelmente 2-3 sessões.
Hoje a Software Factory nunca toca código de produção — é camada de governança simulada (flags `release_allowed`/`deploy_allowed` sempre `false`). A evolução natural (não "destravar tudo"): para um repositório **explicitamente apontado pelo usuário** (path local ou URL, nunca o próprio vision-core), rodar em modo "dry-run real": ler o código de verdade, gerar diff de verdade, **nunca commitar nem dar push**.
**Plano concreto:**
1. Novo endpoint `POST /api/sf/dry-run-real` — recebe `{ repo_path, request }` (ou `{ repo_url }` para clone temporário read-only em `/tmp`).
2. Reaproveita a lógica de scan do `vision-agent.js` (`scanProject`) e o pipeline de diagnóstico do chat (`askIA`/Hermes) — não dois sistemas paralelos.
3. Retorna `{ diff_preview, files_analyzed, confidence, real_io: true }` — nunca escreve no repo de destino.
4. Firewall explícito: se `repo_path` resolver para dentro do próprio `vision-core` (checar `path.resolve` contra `ROOT`), recusar com `403 self_modification_blocked` — nunca deixar a Factory "se auto-editar" por engano.
**Verificação automatizada:** criar um repo de teste temporário (mesmo padrão do §105: `mktemp -d`, `git init`, arquivo com bug conhecido), chamar o endpoint, `assert` que o diff retornado contém a correção esperada E que o arquivo no disco do repo de teste **não foi alterado** (hash antes/depois idêntico) E que nenhum commit novo existe.

### Etapa B — Tiered routing de providers por dificuldade ✅ RETIRADA DO ROADMAP (§107)
**Razão:** SDDF_SPEC §66 já estava FECHADO (80/80 CI #67) — o problema de qualidade que motivou esta etapa resolvido sem código de classificação. Nenhum código escrito. Nota adicionada ao §66 em `SDDF_SPEC.md`. Ver §107 (histórico) acima.

### Etapa C — Memory layer: aprender com diagnósticos de baixa confiança anteriores ✅ RESOLVIDA (§107)
**Implementada em §107.** `tokenize`/`jaccardOverlap`/`readLowConfidenceLog`/`findSimilarLowConfidenceCases`/`applyMemoryReordering` em `hermes-rca.js`. `callHermes` desprioriza providers fracos. `_test107_memory_layer_unit.cjs` 26/26. Ver §107 (histórico) acima.

### Etapa D — Multi-arquivo / multi-step missions reais (apply, não só diagnóstico)
**Risco:** médio (semântica de transação importa). **Esforço:** médio-grande.
§56 (Multi-DIFF) já resolve multi-arquivo no **diagnóstico**. Falta multi-arquivo na **aplicação real**: hoje `applyPatchMission` em `vision-agent.js` e `/api/agent/mission/queue` só carregam 1 `file`+1 `patch` por missão. Estender para aceitar `patches: [{file, patch, fix_type}, ...]` e aplicar como transação atômica — se qualquer arquivo falhar a validação Aegis, fazer rollback de TODOS os arquivos já aplicados na mesma missão antes de reportar falha (não deixar a missão pela metade).
**Verificação automatizada:** estender `_test105_full_loop_e2e.sh` (ou criar `_test106`) com um caso de 2 arquivos onde um precisa mudar a assinatura de uma função e o outro precisa atualizar o call site — assert que ambos mudam juntos com um único commit, e um segundo caso onde o 2º arquivo falha Aegis — assert que o 1º também é revertido (zero estado parcial).

### Etapa E — Observabilidade do Vision Core como produto ✅ RESOLVIDA (§108)
**Implementada em §108.** Novo endpoint `/api/metrics/memory` + painel `#metricsBoard` ligado a 4 endpoints reais com fallback estático preservado. `_test108_observability_unit.cjs` 23/23 + `_test108_endpoint_smoke.sh` 10/10. Ver §108 (histórico) acima.

### Etapa F (infra, não código puro) — Banco de dados persistente
**Risco:** alto (decisão de infraestrutura, não só código). **Esforço:** grande, fora do escopo de uma sessão autônoma sem decisão humana prévia.
Hoje: JSON + `/tmp` no EB, reseta a cada restart do processo (cfn-hup periódico, ver §70). Migrar pra SQLite (arquivo em `/var/app/current` persistente entre restarts, mas não entre deploys) ou RDS PostgreSQL (persistente de verdade, custo mensal). **Esta etapa precisa de uma decisão humana explícita sobre qual opção antes de qualquer código** — não é uma boa candidata pra `--dangerously-skip-permissions` sem essa decisão prévia registrada aqui primeiro.

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
