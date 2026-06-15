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
- Upload de arquivos: `v298FileInput` + `v298AddFilesBtn` — wired e funcional

### OAuth (configurado nos providers)
- Google Client ID: `793969655414-suvojcna44rchiq65n66io6flkf970ql.apps.googleusercontent.com`
- Google callback: `https://visioncore-api-gateway.weiganlight.workers.dev/api/auth/oauth/google/callback`
- GitHub Client ID: `Ov23li2yBM5CMJzteH6u`
- GitHub callback: `https://visioncore-api-gateway.weiganlight.workers.dev/api/auth/oauth/github/callback`
- Google OAuth em modo "testing" — usuário de teste: weiganlight@gmail.com (limite 100)

---

## O QUE ESTÁ INCOMPLETO / QUEBRADO ❌ — PRECISA IMPLEMENTAR

### §98-A — Vision Agent Local (PRIORIDADE ALTA)
**Problema:** Agent conecta em `localhost:7070`, recebe missões, mas retorna `ok=false`
**Sintoma:** Steps `scan✅, search✅, read❌` — o step `read` falha
**O que precisa:**
- Diagnosticar payload exato de `POST http://localhost:7070/run`
- Verificar por que o step `read` retorna erro
- Criar stress test ST-01 que valida `ok=true` end-to-end
- Só criar tutorial T2 (Agent Local) DEPOIS deste fix
- **NOTA:** frontend NÃO chama 7070 diretamente — o exe provavelmente faz polling no backend

### §98-B — Adicionar Arquivos no Mission Control (RESOLVIDO ✅)
**Diagnóstico:** ID mudou de `v236FileInput` → `v298FileInput`. Wired em bundle.js linhas 6544-7729.
**Status:** FUNCIONAL — upload + contexto no copiloto funcionando.

### §98-C — SF Módulos 05-06 Desbloqueados (PRIORIDADE MÉDIA)
**Problema:** Módulos 05 (Preview de Criação) e 06 (Comando Real) têm `EXEC BLOQUEADO` no HTML
**Módulo 08** (Painel Final) tem `BLOQUEADO`
**O que precisa:**
- Decisão: implementar real ou marcar explicitamente como "Em breve no roadmap"
- Se implementar: criar endpoints `/api/sf/preview-creation` e `/api/sf/real-command`
- Se roadmap: substituir "EXEC BLOQUEADO" por badge "EM BREVE" consistente com o resto

### §98-D — Agentes Extras (PRIORIDADE MÉDIA)
**Problema:** Cards de agentes existem (backend, database, auth, etc) mas não executam autonomamente
**O que precisa:**
- Implementar execução real de agentes especializados OU
- Deixar claro que são catálogo/reserve para ativação futura

### §98-E — Mission Timeline (PRIORIDADE BAIXA)
**Problema:** Existe mas só popula após missão executada — não há persistência
**O que precisa:**
- Persistir timeline no vault/localStorage após cada missão
- Mostrar histórico de missões anteriores

### §98-F — OPENCLAW / OPENSQUAD / OSINT / V10 (ROADMAP — NÃO TOCAR)
**Status:** Badge `SCALE` / roadmap puro
**Decisão:** NÃO implementar ainda, NÃO criar tutorial
**Ação:** Manter como estão até decisão de produto

---

## STRESS TESTS — A CRIAR ANTES DOS TUTORIAIS

| ST | O que valida | Status |
|----|-------------|--------|
| ST-01 | Vision Agent Local end-to-end (`ok=true`) | ❌ Não criado |
| ST-02 | Upload arquivo + missão com contexto | ✅ §98-B confirmado funcional |
| ST-03 | SF módulos 01-04 com LLM real | ❌ Não criado |
| ST-04 | SF módulos 05-06 desbloqueados | ❌ Não criado |
| ST-05 | Pipeline completo Missão→Diff→PASS GOLD→PR | ❌ Não criado |
| ST-06 | Quota FREE enforced (6ª missão → 429) | ❌ Não criado |
| ST-07 | OAuth Google end-to-end | ❌ Não criado |
| ST-08 | Vault snapshot/rollback | ❌ Não criado |

**Regra:** Nenhum tutorial de seção é criado sem o stress test correspondente passando.

---

## TUTORIAIS — PLANEJADOS (SÓ DEPOIS DAS IMPLEMENTAÇÕES)

| Tutorial | Seção | localStorage key | Pré-requisito |
|---------|-------|-----------------|---------------|
| T1 | Geral 13 passos | `vc_tutorial_done` | ✅ Live |
| T2 | Vision Agent Local | `vc_tutorial_agent_done` | §98-A + ST-01 |
| T3 | Software Factory | `vc_tutorial_sf_done` | §98-C + ST-03 |
| T4 | Mission Control | `vc_tutorial_mission_done` | ST-05 |
| T5 | Agentes Extras | `vc_tutorial_agents_done` | §98-D + ST-05 |
| T6 | PASS GOLD | `vc_tutorial_passgold_done` | ST-05 |

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
| §93 | Balão preto #000000 + texto branco + imagens finais | s93-done | 9918877 |
| §94 | Balão preto puro + mascote removido temporariamente | s94-done | e3506cb |
| §95 | Mascote final top-right do balão + typewriter | s95-done | 19f0a94 |
| §96 | Mascote dentro do balão + botão reabrir tutorial | s96-done | 11ef676 |
| §97 | Mascote 36px ajustado no canto (top:8px right:8px) | s97-done | 6b51adc |

---

## PENDÊNCIAS IMEDIATAS (PRÓXIMA SESSÃO)

1. **§98-A** — Fix Vision Agent Local (`ok=false`, `read` step falhando)
   - Diagnosticar protocolo: o exe provavelmente faz polling no backend, não o contrário
   - Criar `stress-test-agent-local.js`

2. **§98-C** — SF módulos 05-06-08: desbloquear ou badge "EM BREVE"

3. **Stress tests ST-01, ST-03, ST-05, ST-06, ST-07, ST-08** — criar antes dos tutoriais

4. **Tutoriais T2-T6** — só depois de §98-A,C + stress tests passando

5. **§98-D** — Infraestrutura `vcStartSectionTutorial()` + botões por seção
