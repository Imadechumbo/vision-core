# VISION CORE — CLAUDE.md
## Documento central do projeto | Atualizado: 2026-06-15

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
| Backend EB | v5.9.5-s89-tutorial-quota | s89-done | 0678db5 |
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

### Frontend (index.html + bundle.js)
- Tutorial interativo 13 passos com mascote animado idle/reading
- Botão 🪐 reabrir tutorial (`#vcReopenTutorial`)
- SF Landing card com 8 módulos visível antes do login
- Badge de quota real (FREE: X missões restantes)
- Planos FREE (BETA ATIVO) / PRO (EM BREVE) / ENTERPRISE (EM BREVE)
- OAuth Google + GitHub botões funcionais (SSO ainda "Em breve")
- Mascote: `mascote-idle-final.png` + `mascote-reading-final.png` em `frontend/assets/`

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

### §98-B — Adicionar Arquivos no Mission Control (PRIORIDADE ALTA)
**Problema:** Botão "+ Adicionar arquivos" (`v236FileInput`) existe no HTML mas não está claro se está wired no bundle.js
**O que precisa:**
- Verificar `grep -n "v236FileInput\|FileInput\|file.*attach" frontend/assets/vision-core-bundle.js`
- Se não wired: implementar upload de arquivo junto com a missão
- Arquivos devem ir no contexto do copiloto
- Criar stress test ST-02

### §98-C — SF Módulos 05-06 Desbloqueados (PRIORIDADE MÉDIA)
**Problema:** Módulos 05 (Preview de Criação) e 06 (Comando Real) têm `EXEC BLOQUEADO` no HTML
**Módulo 08** (Painel Final) tem `BLOQUEADO`
**O que precisa:**
- Decisão: implementar real ou marcar explicitamente como "Em breve no roadmap"
- Se implementar: criar endpoints `/api/sf/preview-creation` e `/api/sf/real-command`
- Se roadmap: substituir "EXEC BLOQUEADO" por badge "EM BREVE" consistente com o resto
- Criar stress test ST-03/ST-04

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
| §102 | §98-E resolvido — Mission Timeline persistido (descoberta: endpoint real é /api/chat, não /api/copilot) — ST-11 criado (6 casos), 21 testes unitários | - | (preencher após commit) |

---

## PENDÊNCIAS IMEDIATAS (PRÓXIMA SESSÃO)

1. **§98-E** — Mission Timeline: persistência no vault/localStorage

2. **Tutoriais T1-T6** — 6/6 LIVE em produção (accordion sidebar completo, todos clicáveis)
   - T1 Geral · T2 Agent Local · T3 SF · T4 Mission Control · T5 Agentes Extras · T6 PASS GOLD
   - T2 Agent Local — `vc_tutorial_agent_done`
   - T3 Software Factory — `vc_tutorial_sf_done`
   - T4 Mission Control — `vc_tutorial_mission_done`
   - T6 PASS GOLD — `vc_tutorial_passgold_done`
   - Todos via botão "🪐 Tutorial desta seção" — NUNCA automático

4. **T5 Agentes Extras** — bloqueado até §98-D
