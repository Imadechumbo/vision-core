# VISION CORE — CLAUDE.md
## Documento central do projeto | Atualizado: 2026-06-19 (§119)

> **LEIA ESTE ARQUIVO COMPLETO ANTES DE QUALQUER AÇÃO.**
> Este arquivo contém o estado real do projeto, o que está implementado, o que está faltando, e o que NÃO deve ser tocado.
> Detalhe técnico completo (causa raiz, fix, evidência) de cada sessão passada está em `CLAUDE_HISTORY.md` — consulte lá só quando precisar entender o "porquê" de algo já feito; não é leitura obrigatória pra continuar o trabalho.

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
| CF Pages | 5.9.13+s113-dry-run-ui | - | dfac9bd5343bd81df73d084b9307d57eb9e24206 |
| Backend EB | 5.9.14-s115-apply-patch-multi-chat | - | dbc1d5d |
| CF Pages | 5.9.14+s115-apply-patch-multi-chat | - | dbc1d5d |
| CF Pages | 5.9.14+s116-dry-run-multi | - | b8e2f2c |
| CF Pages | 5.9.16+s118-tutorial-targets | - | 5f1d694a10a3c5f09edfca867c6e0d79f85641c9 |
| CF Pages | 5.9.17+s119-tutorial-menu-fix | - | 90020b266e052eac61fbf9d3c6823a221229c6e8 |

**Nota de correção (§113):** esta tabela estava parada na entrega do §109 (5.9.11) mesmo depois de §110/§111/§112 já estarem implementados e deployados — inconsistência de documentação encontrada e corrigida nesta sessão, não uma mudança de versão real nova além do que §112 já tinha entregue. A linha CF Pages reflete o trabalho desta sessão (§113), ainda só no sandbox — vira "live" só depois do `bash bin/deploy-pages.sh` real (ver prompt para Claude Code).

**Nota §115 (confirmado em produção):** diferente do §114 (só documentação), esta sessão mudou código real em `backend/server.js` (prompt do LLM + fix do `_h49budgetMs`) — exigiu deploy real no EB, não só `bash bin/deploy-pages.sh`. O Claude Code precisou criar um novo script de deploy (`_deploy94_eb.py` — o anterior, `_deploy93_eb.py`, era do §112) e o EB levou cerca de 5min pra propagar (mais que o típico ~90s, sem causar nenhum problema — só levou mais tempo dessa vez). Confirmado com `ok:true` via o gateway Cloudflare depois da propagação, e o frontend confirmado ao vivo em `visioncoreai.pages.dev`. Hash do commit principal: `dbc1d5d75759f4de7f5f5e63c21671f52025abe2`; hash do fechamento de pendências: `a918c09a8a12b2be9c0e535416555975cb0e7568`. Nota cosmética: o Claude Code usou o hash curto (`dbc1d5d`) nas 2 linhas acima da tabela, em vez do hash completo de 40 caracteres usado nas linhas anteriores — inconsistência de formato, não de conteúdo, sem impacto funcional.

**Nota §116:** ao contrário do §115, esta sessão **não** muda nada em `backend/server.js` — confirmado lendo o código antes de escrever qualquer linha nova, não só assumido (validação de `sf_dry_run_real` e armazenamento do resultado já suportavam qualquer formato sem whitelist). Só `frontend/downloads/vision-agent.js` (asset baixado pelo Vision Agent Local, servido como arquivo estático pelo CF Pages) e `frontend/assets/vision-core-bundle.js` foram tocados — exige só `bash bin/deploy-pages.sh`, igual §113/§114, **sem** deploy de backend EB. A linha "(pendente)" acima vira a linha real (hash definitivo) só depois que o Claude Code confirmar a execução completa no repositório real — ver prompt entregue para esta sessão.

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
- **§115: prompt de `mode:fix` ganhou um formato `"files": [...]` alternativo (multi-arquivo) além do `file`/`patch` único — usado quando 2+ arquivos precisam de fix na mesma resposta, fechando o gap entre o §53 (LLM já diagnosticava múltiplos arquivos em prosa) e o JSON estruturado (só sabia 1 arquivo). Bug pré-existente corrigido em paralelo: `_h49budgetMs` (variável nunca definida) crashava o processo toda vez que TODOS os providers de IA falhavam — substituído por `_h49timeout`, real e já em scope.**

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
- **§115: `apply_patch_multi` (§109) ganhou gatilho real no chat — `vcQueueApplyPatchViaAgent` (§106) ramifica pra `apply_patch_multi` quando o diagnóstico do LLM traz `files[]` (2+ arquivos), `renderApplyFixPanel`/`renderStandardMethodPanel`/`renderValidationPanel` sabem exibir e disparar o caso multi. Bug pré-existente corrigido em paralelo: os dois pontos que chamam `vcQueueApplyPatchViaAgent` mostravam `renderValidationPanel` ("✅ commitado") mesmo quando a missão falhava (`rd.ok===false`) — agora mostram a falha real.**
- **§116: o dry-run real (§110/§111/§113) ganhou a mesma capacidade multi-arquivo que o `apply_patch_multi` já tinha (§109/§115) — quando o diagnóstico do LLM traz `files[]`, o Vision Agent Local (`vision-agent.js`) simula CADA arquivo em memória (nunca escreve em disco, single ou multi) com a mesma semântica tudo-ou-nada: se 1 arquivo falhar, a leva inteira é descartada, sem expor diffs parciais. `renderSfDryRunResult` (§113) agora mostra 1 grid antes/depois por arquivo no caso multi.**

### OAuth (configurado nos providers)
- Google Client ID: `793969655414-suvojcna44rchiq65n66io6flkf970ql.apps.googleusercontent.com`
- Google callback: `https://visioncore-api-gateway.weiganlight.workers.dev/api/auth/oauth/google/callback`
- GitHub Client ID: `Ov23li2yBM5CMJzteH6u`
- GitHub callback: `https://visioncore-api-gateway.weiganlight.workers.dev/api/auth/oauth/github/callback`
- Google OAuth em modo "testing" — usuário de teste: weiganlight@gmail.com (limite 100)

---

## DECISÕES DE ESCOPO DELIBERADAS (não tocar sem decisão de produto)

### §98-F — OPENCLAW / OPENSQUAD / OSINT / V10 (ROADMAP — NÃO TOCAR)
**Status:** Badge `SCALE` / roadmap puro
**Decisão:** NÃO implementar ainda, NÃO criar tutorial
**Ação:** Manter como estão até decisão de produto

> §98-A a §98-E (auditoria pré-tutoriais) e o write-up original do §105 já estão resolvidos — write-up completo de causa raiz/fix/evidência de cada um em `CLAUDE_HISTORY.md`.

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
9. **Guards de localStorage em IIFEs de tutorial** — guards que controlam "auto-abrir uma vez" devem envolver APENAS o bloco de auto-trigger, não a definição de infraestrutura compartilhada (funções expostas no window, event listeners). Caso contrário, qualquer feature que dependa dessas funções fica silenciosamente quebrada quando a flag estiver setada. (§119 — descoberto com o menu "🪐 Tutoriais".)

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

## HISTÓRICO DE SESSÕES (índice — write-up completo de cada § em `CLAUDE_HISTORY.md`)

| § | O que foi feito | Tag | HEAD |
|---|----------------|-----|------|
| §117 | Fix bug chatStream scope no dry-run panel (§113) — `initSoftwareFactoryPage` usava `chatStream` de `initMainChat` (undefined no escopo). Fix: `document.getElementById('v298ChatStream')` direto. + E2E manual verification automatizada (§113/§115/§116) v1–v4. | - | 79ed1ea |
| §117-v5 | Spec Playwright v5: `page.route` intercepta bundle.js e injeta `renderSfDryRunPanel` no window — resolve falha persistente do button click em automação. Root cause encontrado: função aninhada em `initMainChat`. Fix: injeção antes do `}` de `initMainChat` via âncora `_sfSetArchitectMode`. DRYRUN-113 PASS COMPLETO. | - | 6576d79 |
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
| §105 | Fechou o loop chat→agent local→patch real (roadmap item #1). ST-12 9/9, backend+agent reais. Write-up completo em `CLAUDE_HISTORY.md`. | - | bd2362a |
| §106 | Etapa A do roadmap: polling extraído pra `vcQueueApplyPatchViaAgent()` compartilhada — agent local também no EXECUTAR MISSÃO. 9/9 + regressão 13/13+9/9. | - | 578a651 |
| §107 | Etapa B retirada (SDDF §66 já fechado, sem código novo). Etapa C implementada: memory layer no Hermes (Jaccard sobre tokens). 26/26. | - | eab69de |
| §108 | Etapa E implementada: painel de métricas com dados reais (4 endpoints, fallback estático preservado). 23/23 + 10/10. | - | eab69de |
| §109 | Etapa D implementada: missão multi-arquivo atômica (`apply_patch_multi`, tudo-ou-nada). 12/12 + E2E real, 90 testes totais 0 falhas. | - | 929610c |
| §110 | Etapa A Fase 1: firewall de auto-modificação (`isSelfTargetForbidden`, 4 camadas independentes). 20/20, regressão 8 suites. | - | 9525f7f |
| §111 | Etapa A Fase 2: núcleo técnico do dry-run real completo (scan/diagnóstico/simulação, zero escrita real no disco do target). 18/18 + 18/18. | - | ef10b79 |
| §112 | Etapa F: fila de missões do agente migrada pra SQLite via `sql.js` (decisão humana: SQLite, não RDS). 13/13 + E2E com kill -9 real. | - | eee4335 |
| §113 | Etapa A Fase 3: UI no chat pro dry-run real (`#vcOpenDryRunPanelBtn`) — fecha a Etapa A por completo. 15/15 + regressão 9/9. Live em produção. | - | dfac9bd |
| §113-docs | Fechamento de hash + achados em paralelo (boto3 bloqueado por SSL local, version string desatualizada em `server.js`). | - | 28b1a66 |
| §114 | Limpeza de doc: `CLAUDE.md` dividido em `CLAUDE.md` (estado atual) + `CLAUDE_HISTORY.md` (write-ups completos) — Claude Code tinha avisado sobre impacto de performance (60.9k chars > 40k). Nenhum código tocado. | - | a7baecf1ee74d65e9252e314a0224e800c8635fc |
| §115 | `apply_patch_multi` (§109) ganha gatilho real no chat — prompt do LLM + `vcQueueApplyPatchViaAgent`/`renderApplyFixPanel`/`renderStandardMethodPanel`/`renderValidationPanel`. 35/35 + E2E dedicado + regressão 14 suites. 2 bugs pré-existentes achados e corrigidos em paralelo (`renderValidationPanel` em falha, `_h49budgetMs` indefinido). | - | dbc1d5d |
| §116 | Dry-run multi-arquivo: combina o núcleo do dry-run real (§110/§111/§113) com a atomicidade do `apply_patch_multi` (§109/§115) — `sfDryRunRealMission` (vision-agent.js) ganha um ramo que simula N arquivos em memória com a mesma semântica tudo-ou-nada, sem nunca escrever em disco. `renderSfDryRunResult` exibe 1 diff por arquivo. Zero mudança em `server.js`. 17/17 + 29/29 + regressão 16 suites (inclui correção de contagem do §115: 35/35→34/34, ver `CLAUDE_HISTORY.md`). | - | b8e2f2c |
| §118 | Tutorial UX: balões de tutorial alinhados com elementos reais (4 de 6 tutoriais corrigidos). `showStep` ganha hook `onEnter` + `_scrollInto` helper. T2: targets mc-tab/agent-download/agent-cmd. T3: targets por módulo real + `showSoftwareFactoryPage`/`setSoftwareFactoryModule` expostos no window. T4: `#quotaBadge` → `#v299QuotaBadge`. T5: `.vc-reserve-modes`/`.vc-reserve-tags`. T6: `#policyBtn` em vez de `#githubPanel`. 4 novos testes E2E (spotlight medido numericamente) + 7/7 regressão. Zero mudança em `server.js`. | - | 5f1d694a10a3c5f09edfca867c6e0d79f85641c9 |
| §119 | Fix bug: menu "🪐 Tutoriais" sidebar não respondia a clique para usuários recorrentes. Causa: guard `vc_tutorial_done` no topo do IIFE bloqueava definição de `window._vcSetActiveTutorial`. Fix: guard movido para apenas o bloco de auto-start do T1. Achado secundário corrigido: `closeTutorial` agora grava em `_activeStorageKey` (chave do tutorial ativo) em vez de `vc_tutorial_done` hardcoded — tutoriais de seção persistem na própria chave. 3 novos testes determinísticos + 10/10 regressão. Zero mudança em `server.js`. | - | 90020b266e052eac61fbf9d3c6823a221229c6e8 |

> Write-up completo (causa raiz, fix, evidência) de cada sessão acima → `CLAUDE_HISTORY.md`.

---

## PENDÊNCIAS IMEDIATAS (PRÓXIMA SESSÃO)

**Status: §118 implementado, testado (7/7 Playwright) e deployado em produção (commit 5f1d694, CF Pages ao vivo).**

**§117 agora documentado:** os dois commits do §117 (79ed1ea e 6576d79) estavam nos commits do git mas faltavam na tabela de HISTÓRICO DE SESSÕES — inconsistência de doc corrigida nesta sessão (§118) sem nenhuma mudança de código.

**Pendência do §116 resolvida:** a nota "§116 ainda NÃO executado no repositório real" que ficou na versão anterior deste arquivo está resolvida — §116 foi executado, commitado e deployado pelo §117. A tabela de VERSÕES ATUAIS e o HISTÓRICO já refletem os hashes reais.

**Próximo item:** não há um próximo item já combinado com o humano — igual ao fim das sessões §116/§117/§118/§119. Próxima sessão precisa de conversa nova sobre prioridade. Não há "Etapa G" definida no roadmap.

**Pequenos itens que sobraram, nenhum bloqueante:** (1) o boto3 continua bloqueado por certificado SSL na máquina Windows local (mesma limitação do §112 com `node-gyp`); (2) `server.js` retorna `version: "2.9.10-self-healing-config"` em `/api/health` — string hardcoded nunca atualizada. Nenhum desses afeta funcionalidade.

## ROADMAP A–F — STATUS: TODAS RESOLVIDAS OU RETIRADAS (write-up completo em `CLAUDE_HISTORY.md`)

| Etapa | O que era | Resultado | § |
|-------|-----------|-----------|---|
| A | Software Factory: dry-run real em repositório externo autorizado | ✅ Resolvida por completo (firewall + núcleo técnico + UI no chat + dry-run multi-arquivo) | §110+§111+§113+§116 |
| B | Tiered routing de providers por dificuldade | ✅ Retirada do roadmap — problema já resolvido sem código de classificação | §107 |
| C | Memory layer: aprender com diagnósticos de baixa confiança anteriores | ✅ Resolvida | §107 |
| D | Multi-arquivo / multi-step missions reais (apply, não só diagnóstico) | ✅ Resolvida por completo — garantia transacional (§109) + coordenação autônoma de *quais* arquivos pelo LLM, com gatilho real no chat (§115) | §109+§115 |
| E | Observabilidade do Vision Core como produto | ✅ Resolvida | §108 |
| F | Banco de dados persistente | ✅ Resolvida — decisão humana: SQLite, não RDS | §112 |

**Não há uma "Etapa G" definida ainda.** A próxima sessão precisa de uma conversa nova com o humano sobre prioridade antes de assumir qualquer próximo item — ver "PENDÊNCIAS IMEDIATAS" abaixo.

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
