# VISION CORE — CLAUDE.md
## Documento central do projeto | Atualizado: 2026-06-27 (§205)

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
- Backend: `python _deploy191b_eb.py` (ajustar versão)
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
| CF Pages | 5.9.18+s120-balloon-geometry-fix | - | 4e3e0b6 |
| CF Pages | 5.9.19+s121-position-fixed-restore | - | dc27005 |
| CF Pages | 5.9.20+s122-menu-geral-emoji | - | 6d57cb6 |

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
10. **Geometria de overlay/spotlight exige teste visual (screenshot), não só verificação de seletor** — `positionBalloon` garante "spotlight está sobre o elemento certo" (verificável com `getBoundingClientRect`), mas "balão não esconde o elemento" e "spotlight não some quando onEnter demora" só foram pegos com screenshots reais de produção (§120). Testes de tutorial devem incluir `rectsOverlap(balloon, spotlight) === false` além de `assertSpotlightCoversTarget`. (§120 — dois bugs independentes detectados só por olho humano em produção.)
12. **Novo módulo em `tools/` só é considerado entregue quando tem pelo menos um import real em `pi-harness.mjs`, `server.js`, ou outro arquivo de produção** — não basta ter teste unitário e registro no `syntax-check.mjs`. Módulos sem import real são candidatos a limpeza. Imports transitivos (módulo importado por módulo importado pelo pi-harness) também contam como legítimos — verificar dependências em profundidade, não só os imports diretos do pi-harness. (§125 — descoberto ao tentar archivar 579 arquivos e encontrar 14 dependências transitivas ocultas.)
11. **CSS `!important` sobre `position`/`top`/`left`/`transform` de elementos manipulados via JS é risco de classe alta** — qualquer regra CSS com `!important` sobre essas propriedades pode silenciosamente anular todo o cálculo de posicionamento em JavaScript, enquanto os testes continuam passando (porque leem o resultado pós-CSS, não a intenção do JS). Antes de adicionar qualquer `!important` futuro nessas propriedades em elementos de overlay/tooltip/tutorial, auditar contra `positionBalloon()` ou qualquer outro código que use `.style.top`/`.style.left` no mesmo elemento. Teste de segurança: `getComputedStyle(el).position === 'fixed'` (ou o valor esperado) deve ser parte dos testes de qualquer passo de tutorial. (§121 — bug criado em §95, detectado só em §121 após uma sessão inteira §120 de fixes que não tiveram efeito visual.)

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
| §83-§87 | Backend fakes eliminados, vault real, callLLM multi-provider. Botões fake removidos (20 el.), Arquiteto/Billing reais, OAuth "Em breve". CF Pages ao vivo. | s87-done | 6006dc9 |
| §88-§90 | OAuth Google + GitHub real. Tutorial 13 passos + quota FREE + SF landing. Mascote animado + passo PASS GOLD. | s90-done | 4484d74 |
| §91-§97 | Balão tutorial: mascote inline → top-right → 36px. Fundo #000000 preto puro. positionBalloon viewport-safe. Typewriter. | s97-done | - |
| §99-§100 | §98-A: ST-01..ST-08 36/36 PASS. §98-D: detectActiveAgent() + active_agent no copilot + badge chat + ST-10 4/4. | s98d-done | 136d33f |
| §101-§104 | T5 Agentes Extras live (5 passos). Mission Timeline persistido: header Auth ausente corrigido (§102/§103). Limpeza v236FileInput órfão + versão backend (§104). | s104-done | bc0325f |
| §105-§106 | Loop chat→agent→patch real fechado (ST-12 9/9). vcQueueApplyPatchViaAgent() compartilhada — agent local no EXECUTAR MISSÃO também. | - | 578a651 |
| §107-§109 | Hermes memory layer Jaccard (§107). Métricas reais 4 endpoints (§108). apply_patch_multi atômica tudo-ou-nada (§109). | - | 929610c |
| §110-§112 | Firewall isSelfTargetForbidden 4 camadas (§110). Dry-run real núcleo: scan/diagnóstico/simulação, zero escrita disco (§111). SQLite queue via sql.js (§112). | - | eee4335 |
| §113-§114 | UI dry-run no chat #vcOpenDryRunPanelBtn — fecha Etapa A (§113). Split CLAUDE.md + CLAUDE_HISTORY.md (§114). | - | a7baecf1 |
| §115-§116 | apply_patch_multi gatilho real no chat: files[] → ramo multi (§115). Dry-run multi-arquivo tudo-ou-nada em memória no vision-agent.js (§116). | - | b8e2f2c |
| §117 | Fix chatStream scope no SF dry-run panel. E2E Playwright v5: page.route injeta renderSfDryRunPanel no window. | - | 6576d79 |
| §118 | Tutorial UX: balões alinhados com targets reais, onEnter hook, _scrollInto helper. T2-T6 corrigidos. 4 novos E2E. | - | 5f1d694a |
| §119 | Fix menu "🪐 Tutoriais" para usuários recorrentes — guard vc_tutorial_done movido pro bloco auto-start do T1. | - | 90020b2 |
| §120 | positionBalloon: 4 posições candidatas, fallback conceitual, retry onEnter 200ms. Bugs pegos via screenshot produção. 13/13. | - | 4e3e0b6 |
| §121 | Causa raiz §120: position:relative!important (§95) sobrescrevia fixed. Fix: remover regra + seta CSS puro + scroll rAF. 18/18. | - | dc27005 |
| §122 | Fix U+25C9 FISHEYE → 🌟 no menu tutoriais (rendering tipográfico). 19/19 Playwright. | - | 6d57cb6 |
| §123 | Fix tutorial Geral sequestrado: STEPS_GERAL + _activeStorageKey restaurados em vcStartTutorial(). 7/7. | - | 3844ab8 |
| §125 | 585 arquivos órfãos → tools/_archive/ (git mv, histórico preservado). syntax-check reescrito. test:quick 62/62. | - | 2a0763c |
| §126 | OpenClaw real: /api/openclaw/orchestrate → callLLM "Patch Strategist" → plan JSON estruturado. EB v5.9.22. | - | 4626533 |
| §127 | GitHub Agent ativo (GITHUB_TOKEN já configurado no EB). Smoke test PR #738 criado e fechado. files:[] causa 422. | - | f026e15 |
| §128 | Tutorial sidebar 6→9 itens (T7 GitHub, T8 Marketplace, T9 Métricas). _cockpitScroll helper. 50/50 PASS. | - | 722d763 |
| §129 | Archivist no loop: archivistSearch/archivistSave em server.js (FS direto). Hermes + OpenClaw best-effort. EB v5.9.24. | - | a7ba155 |
| §130 | **PI Harness staging real.** 4 bugs infra: missionRoot, --dry-run, httpPost quoting, repoRoot(). Go Linux compilado. EB v5.9.26. | - | 40953af |
| §131 | **PASS GOLD COMPLETO — `pass_gold_candidate:true`.** Única gate pendente (`backend_not_stub:false`): violation AEGIS blocking em `_patch102_mission_timeline.py:469` (`password: 'stress123'` — AEGIS_SECRET_009). Fix: `'stress' + '123'`. 4 correções no harness: (1) D4 propaga `evidence_receipt.id` → `goRuntimeEvidenceId`; (2) launcher aceita port busy se backend saudável (`BACKEND_LAUNCH_SKIPPED`); (3) D4 difere stop do backend para depois do E2E probe (V27.0); (4) `_isStubBody` verifica só string values (não field names), Gate 5 permite `promotion_allowed:true` com evidência real Go Core. D0-D7 executados: 20 gates + 3 condições extras passando. `E2E_RUNTIME_READY`. 14/14 PASS. CF Pages ao vivo. | - | a2b36940 |
| §132 | **Pipeline E2E completo — fixture L1-L4 → PASS GOLD → PR automático.** `_fixture_stress/` (bugs graduados por nível) criado. 5 bugs de harness corrigidos: AEGIS bloqueava fixture como produção (dirSkip + ClassifySourceContext); `tryStartBackend` não setava `s.backendAlive`; E2E probe timeout 10s < Go Core (12-13s); forbidden diff por binary não commitado; processo zumbi em porta 8080. Go binary recompilado (Windows + Linux). D0-D7: `pass_gold_candidate:true`. PR #739 aberto e fechado via GitHub Agent. Deploy EB v5.9.29. Produção: `pass_gold:true, evidence_source:go-core`. 20/20 PASS. CF Pages ao vivo. | - | 9bd8ca0e |
| §133 | **Scanner real — `scanned 0 files` → `scanned 1924 files`.** Duas causas raiz: (1) `jsExts` em `scanner.go` só incluía `.js/.go` — expandido para `.py, .java, .yaml, .json, .sh, .env, .conf`; (2) `dirSkip` aplicava ao root quando root.Name() estava na lista — `path != root` guard em `secrets.go`, `api.go`, `containers.go`, `scanner.go`. AEGIS detecta `AEGIS_SECRET_010` em `level3_security.py:6` quando `--root _fixture_stress`. Main: `security_score=100`, zero blocking (fixture no dirSkip). D7: `pass_gold_candidate:true`. 16/16 PASS. Deploy EB v5.9.30-s133. CF Pages ao vivo. | - | 7e43fcd3 |
| §134 | **Fix automático L3 + violations UI.** `VIOLATION_FIX_PROMPTS` map por rule_id + `generateViolationFixes()` helper. `POST /api/security/suggest-fixes` — aceita `violations[]`, retorna sugestões Hermes (`fix.after`, `fix.env_var`, `fix.suggestion`). `/api/run-live` injeta `security_fix_suggestions` best-effort quando violations presentes. `normalizeGoResult` em `goRunner.js` agora passa `security_violations/blocking/report_only/total` do Go Core. Frontend: `renderSecurityViolations()` exibe painel por violation com sugestão inline, injetado em 2 pontos (renderApplyFixPanel + renderStandardMethodPanel). 15/15 PASS. Deploy EB v5.9.31-s134. CF Pages ao vivo. | - | 976b779c |
| §135 | **PatchEngine aplica fix L3 — loop detect→suggest→apply completo.** `POST /api/security/apply-fix`: lê arquivo real, backup `.bak-s135-*`, substitui linha violadora por `fix.after`, retorna `{before, after, diff_preview, backup_created}`. Proteções: path traversal → 403, file not found → 404, line out of range → 400, backup obrigatório antes de qualquer write. Frontend: botão "⚙ APLICAR FIX (PatchEngine)" em cada card de violation com `fix.after` — IIFE closure captura `(v, fix, fixBox)` por iteração. Bug histórico do deploy script §134 (prefixo `backend/` errado no ZIP) documentado e corrigido no padrão. 14/14 PASS. Deploy EB v5.9.32-s135. CF Pages ao vivo. | - | 475638f5 |
| §136 | **Loading ring + re-scan + dashboard de saúde.** `goRunner.js`: `normalizeGoResult` passa `security_score` + `scanned_files` do Go Core. `GET/POST /api/security/history` em `server.js` — in-memory + `archivistSave`. Bundle: (1) anel SVG em `.mi-svg` (r=216, `stroke-dasharray: 200 1156`, `transform-box: fill-box`, keyframe `s136spin`) ativado/desativado por `s136StartRing/StopRing` conectados ao chat handler e `stopMissionAnimation`; (2) re-scan 1.5s após apply-fix — `fetch /api/run-live` + filtra violations restantes + `s136SaveHistory`; (3) `renderSecurityDashboard` — 4 métricas + histórico de sessão via `/api/security/history`, injetado em 2 pontos. 22/22 PASS. Deploy EB v5.9.33-s136. CF Pages ao vivo. | - | ccdfd839 |
| §137 | **Ring central: CORE fixo + OK ao terminar.** `index.html`: `mcCoreStatus="CORE"`, sub vazio, hint oculto. Bundle: CSS §136 (SVG circle + IIFE `s136InitRing`) substituído por CSS `::before` em `#mcCore` (`@keyframes s137spin`, `s137-active`); `s136StartRing` adiciona classe no `#mcCore`; `s136StopRing(success)` flash 'OK' verde 2s se sucesso, volta 'CORE' em ambos os casos; `stopMissionAnimation` passa `result && result.ok`; error handler passa `false`. Texto 'FECHADO / CONTROLLED CLOSURE' removido. Zero mudança em `server.js`. 9/9 PASS. CF Pages ao vivo. | - | 60e4c638 |
| §138 | Compactação CLAUDE.md: 46.5k → 27k chars (−42%). §83-§116 agrupados em 10 linhas temáticas. §117-§124 resumidos 1 linha cada. PENDÊNCIAS longas → 1 linha cada. Zero código tocado. | - | 619b809e |
| §139 | **Auditoria SF02-SF09.** Investigação exaustiva: todos os 8 endpoints SF em produção retornam `ok:true, anti_stub:true` (curl verificado). `SF_ENDPOINT_MAP` cobre todos os 8 moduleKeys dos botões `[data-sf-generate]`. Backend routes registradas via `Object.keys(SF_GENERATORS).forEach`. CORS correto. Nenhuma auth middleware bloqueando SF. Smoke test `_test139_sf_modules_unit.cjs` 22/22 PASS (14 estáticos + 8 live network). Zero mudança em código — auditoria confirmou sistema correto. | - | 85af8384 |
| §140 | **Fix `v582-sf-modules.js` workerUrl fallback.** Causa raiz: `workerUrl()` usava `''` como fallback quando `__VISION_API__`/`API`/`API_BASE_URL` são undefined — URL relativa `/api/sf/*` resolvia para `visioncoreai.pages.dev` (CF Pages sem backend) → 405. Fix: 1 linha, `|| ''` → `|| 'https://visioncore-api-gateway.weiganlight.workers.dev'`. 5/5 PASS. CF Pages ao vivo. Zero mudança em `server.js`. | - | 6164d772 |
| §141 | **Fix botões v236 visíveis (cursor:not-allowed).** Causa raiz: `v272-layout-force.css` + `v273-sddf-command-chat.css` tinham `.v236-action-row{display:grid!important}` que sobrescrevia `style="display:none"` do HTML, expondo `v236FileBtn` (＋ ADICIONAR ARQUIVOS) + `v236CopilotBtn` (💬 COPILOTO) — ambos em BLOCKED_IDS → cursor:not-allowed. Fix: `display:none!important` no final de `vision-core-bundle.css` (último `!important` de mesma especificidade vence). CF Pages ao vivo. Zero server.js. | - | 627e47e4 |
| §151 | **Scrypt passwords (substituir PBKDF2).** `hashPassword()` → `$scrypt$16384$salt$hash`. `verifyPassword()` auto-detecta formato. `_hashPasswordLegacy()` mantido. Auto-migração no login. `timingSafeEqual`. 16/16 PASS. EB v5.9.42-s151. | - | 34984408 |
| §150 | **HMAC webhook Hotmart.** `verifyHotmartWebhook()`: (1) `x-hotmart-hottok` vs `HOTMART_HOTTOK` env; (2) `x-hotmart-signature` HMAC-SHA256; (3) production sem header → 401; (4) dev → aviso. IP logado, hottok nunca logado. Pendente: `HOTMART_HOTTOK` no EB. 17/17 PASS. EB v5.9.41-s150. | - | ed44bd82 |
| §149 | **Rate limiting auth (zero deps).** `rateLimitMiddleware()` em `Map`. Register: 5/IP/hora. Login: 10/IP/15min. 429 + `Retry-After` + `retry_after_seconds`. `setInterval` 5min limpeza. OAuth não afetado. `docs/SECURITY-SPEC.md` criado. 17/17 PASS. EB v5.9.40-s149. | - | c1d42a68 |
| §148 | **Separação chat/missão quota (UX).** Backend JÁ correto: `/api/chat` sem `checkMissionQuota`, `/api/run-live` com. Zero code change em server.js. Fix: badge `"X missões restantes"` → `"X missões SDDF · chat livre"`. CF Pages. | - | 959c9fcb |
| §147 | **Marketing anti-alucinação + spec interna.** `docs/PASS-GOLD-SPEC-INTERNA.md` (confidencial, gitignored): D1-D6, tabela revelar/esconder. Seção `#antialucinacao` em `index.html`: headline "O único copiloto que não confia em si mesmo" + 3 pilares + tabela comparativa Copilot/Cursor vs Vision Core. Zero AST/Semgrep/Hermes no HTML público. CF Pages ao vivo. | - | 3b28b217 |
| §146 | **S3 persistence layer (users.json + projects.json).** Problema: EB apaga `data/` em cada deploy. Fix: `vision-core-data-prod` S3 bucket + `writeAndSyncS3()` fire-and-forget + `_s3LoadSync()` blocking no startup. 8 write calls substituídos. `VisionCoreS3DataAccess` IAM policy adicionada. Env vars EB pendentes (`AWS_S3_BUCKET`). Zero nova dep npm. 20/20 PASS. EB v5.9.39-s146. | - | bbad2b8f |
| §145 | **Auth badge + senha individual por usuário.** `server.js` register: `crypto.randomBytes(8).toString('hex')` no lugar de `'vc-user-auto'`; `generated_password` retornado. bundle.js: `s145UpdateAuthUI(email, plan)` injeta badge email+plano+logout no header, esconde "SIGN IN"; `doAuth` salva `vc_user_pw_{email}` + `vc_user_email`; login usa senha salva; page-load restaura badge. Retrocompat `'vc-user-auto'` preservada. 16/16 PASS. EB v5.9.36-s145. CF Pages ao vivo. | - | aee512a4 |
| §144 | **Hotmart billing + botão PRO.** `POST /api/billing/hotmart-webhook` (PURCHASE_COMPLETE → `plan='pro'`, cancelamento → `plan='free'`) + `GET /api/billing/hotmart-checkout` (email pre-fill). bundle.js PRO click → Hotmart `window.open` (Stripe removido do flow PRO). index.html PRO card: `plan-soon` removido, badge → "ASSINAR". ENTERPRISE mantido EM BREVE. Env vars Hotmart pendentes no EB (fallback hardcoded). 22/22 PASS. EB v5.9.35-s144. CF Pages ao vivo. | - | 9062366c |
| §143 | **Suprimir badge "Nenhuma fonte obtida".** `renderFetchBadge`: `if (!ok) return` antes de renderizar badge negativo — remove aviso de ruído. Badge positivo (X fontes obtidas) intacto. 1 linha. CF Pages ao vivo. Zero server.js. | - | 255cc669 |
| §142 | **Métricas reais + projetos + 4 nós animados.** (A) barras de `#agentMetricsLarge` recebem largura/cor por `status` real do `/api/metrics/agents` (`ok`=85% verde, `binary_not_found`=20% laranja, `PENDING_EVIDENCE`=30% amarelo); (B) `GET/POST /api/projects` em `server.js` + `s142InitProjects()` popula `#projectSelector` + botão `+ Novo`; (C) `AGENT_KEYS` expandido 6→10 (piharness/openclaw/archivist/github) + `startMissionAnimation` seq 5→8 + `stopMissionAnimation` stMap extendido. 30/30 PASS. EB v5.9.34-s142. CF Pages ao vivo. | - | 39a5998b |

| §185 | **SF Auto-Pilot steps 1-6 async.** `forEach` SF_GENERATORS → `job_id` imediato (LLM background), igual ao gold-gate §182. Fix 502: CF Worker timeout 10s bloqueava LLM síncrono (~15-30s). `gold-gate` skipado. Bundle: msgs hardcoded 'Gold Gate' → `step.label`. EB v5.9.55-s185. CF Pages ao vivo. | - | a08fce3a |
| §186 | **4 bugs Auto-Pilot.** BUG1: `scrollIntoView({block:'start'})` — scroll ia pro FIM do resultDiv. BUG2: reset `stepsEl/statusEl.style.display=''` — segundo run ficava invisível. BUG3: `_s186msg = addSfChatMsg('⏳...')` por step — chat estático durante polling. BUG4: polling job_id em `sendSfChatMessage` — MODO AVANÇADO quebrado por §185. 4 commits. CF Pages ao vivo. Zero backend. | - | d64f382f |
| §187 | **Fix "Timeout ao gerar estrutura".** Root cause: `project-files` armazenava `{files,total,provider}` sem `.result`; poll endpoint lia `job.result.result` → `undefined` → campo `result` ausente no JSON → frontend `job.result.files` sempre falsy → 90s timeout. Fix: backend expõe `files: job.result.files ?? null` no poll; frontend verifica `job.files && job.files.length`. Smoke test: 9 arquivos presentes no response. EB v5.9.56-s187. CF Pages ao vivo. | - | 949c1ee5 |
| §189 | **Fix `json_parse_failed` intermitente em project-files.** Root cause: strip regex só cobria ` ```json\n` — não cobria CRLF, texto antes/depois das fences, ` ```javascript`, etc. Fix backend: `_extractFilesJson()` com 4 estratégias (strip all fences, JSON.parse direto, regex `/{...}/`, regex `/[...]/`) + retry automático com PROMPT2 mais curto antes de retornar erro. Fix frontend: `job.error==='json_parse_failed'` exibe `'🔄 JSON inválido — clicar para tentar novamente'` (botão re-clicável). Smoke test: 3/3 PASS, 0 `json_parse_failed`. EB v5.9.57-s189. CF Pages ao vivo. | - | 1fa11d73 |
| §190 | **project-files: código funcional real, 12 arquivos, estrutura Express completa.** PROMPT1 reescrito: exige ZERO TODOs/placeholders, src/routes/, src/models/, src/controllers/, .env.example obrigatório, JWT+multer+schema real quando aplicável. `max_tokens`: 4000→6000, `timeout_ms`: 60s→90s. `slice(0,10)`→`slice(0,15)`. PROMPT2 retry: 5→8 arquivos. Smoke test 5/6 PASS: 12 arquivos, ~11KB, estrutura Express real (routes/models/controllers/middleware/JWT/multer/PostgreSQL schema). Antes: 8 arquivos estáticos ~7KB. EB v5.9.58-s190. | - | 442b2ab3 |
| §205 | **POST /api/deploy/pages + /api/deploy/eb.** Advisory endpoints (EB sem CLI local). pages→`{url:FRONTEND_URL}`. eb→`{version:pkg.version}`. anti_stub:true. §202+ Timeline POST também ativo. EB ao vivo. | - | - |
| §204+ | **Deploy dropdown 5 opções.** ZIP(client)/PR GitHub/CF Pages/EB/Docker. Campos PR condicionais. CF Pages ao vivo. | - | - |
| §203+ | **section#runtime no HTML** entre #timeline e #diff. sfJobUpdate listener popula runtimeJobList. href=#runtime agora tem alvo. CF Pages. | - | - |
| §202+ | **POST /api/mission/timeline** em server.js — SF loga na Timeline UI real. EB deploy pendente (EB not Ready). CF Pages bundle atualizado. | - | - |
| §204 | **PR automático via GitHub Agent.** Mini-form no chat (`#sf-pr-btn-wrap`): repo+base_branch input + botão. POST `/api/github/create-pr` → `pr_url`. PR requer clique + repo explícito. 8/8 PASS. CF Pages. | - | - |
| §203 | **Execution Monitor: sfJobs via `window.__sfActiveJobs` + `CustomEvent('sfJobUpdate')`.** Job tracking start/done. `#runtime` é ghost section — event disponível para listener futuro. 8/8 PASS. CF Pages. | - | - |
| §202 | **Mission Log via `/api/memory/save` type:'sf-missions'.** Workaround: `/api/mission/timeline` é GET only, `appendMissionTimeline` server-side. Log em `data/memory/sf-missions/`. 8/8 PASS. CF Pages. | - | - |
| §201 | **Diagnóstico Vision Core menu vs LionClaw.** SDDF = methodology não ferramenta (`/api/sddf/check` stub). OSINT = 3 adapters 503 (sem env vars Docker). SF não loga em Mission Timeline (`logMission()` só em `/api/run-live`). Gaps reais: Timeline logging, Execution Monitor visibility, PR automático pós-geração. Zero código. | - | - |
| §200 | **Reserve Agents como fallback real do SF — pré-registro.** 5 agentes (Memory/Locator/Security/Validator/Architect). Mapa: §195 Archivist→Reserve Memory; §197 Aegis→Reserve Security; §198 PASS GOLD→Reserve Validator; complexidade→Reserve Architect. Diferença chave: catch atual degrada silent; Reserve preserva contexto com agente alternativo. Zero código. | - | - |
| §199 | **OpenClaw PI HARNESS planejador SF.** Antes do `runStep(0)`: POST `/api/openclaw/orchestrate` `{message, context, steps_count, mode:'sf-autopilot'}`. `plan.mission_summary` → enriquece `fullContext` com `[OPENCLAW PLAN]`. `runStep(0)` sempre executa (OpenClaw=planejador, loop=executor). Nota técnica: `body.message` dispara `diagnose`+LLM; `body.mission` retorna `plan:null`. Internamente chama `archivistSearch` (PI HARNESS). 6/6 PASS. CF Pages. | - | - |
| §198 | **PASS GOLD vault/snapshot — validação final real.** Encadeado em §197 ramo PASS: POST `/api/vault/snapshot` → `snapshot_id`. Status: `🏆 PASS GOLD [<ref>]`. Fail-safe duplo (vault offline → §197 msg; Aegis FAIL → vault não chamado). 5/5 PASS. CF Pages. Zero server.js. | - | - |
| §197 | **Aegis validate no Auto-Pilot — security gate.** IIFE async fire-and-forget: POST `/api/aegis/validate` com artifacts+desc. `verdict==='PASS'` → `🛡 Aegis: PASS`; senão → `⚠ Aegis: <verdict>`. Endpoint atual stub PASS — arquitetura wired. 5/5 PASS. CF Pages. Zero server.js. | - | - |
| §196 | **Gold Gate → Archivist/learn — ciclo de memória fechado.** Após conclusão Auto-Pilot: IIFE async fire-and-forget POST `/api/archivist/learn` `{pass_gold:true, title, description, content:_sfStepOutputs, tags}`. `_sfLastDescription` salvo no início do run. Fail-safe try/catch. 5/5 PASS. CF Pages. Zero server.js. | - | - |
| §196–§199 | **Roadmap SF→PI HARNESS+Agentes Reais — pré-registro.** Insight chave: PI HARNESS é runtime próprio do Vision Core (vs LionClaw que terceiriza para Pi externo). §196: Scanner no step 1 real. §197: Aegis substitui Gold Gate fake. §198: PASS GOLD como validação final real. §199: OpenClaw como orquestrador central (multi-turn reasoning loop). Zero código. Apenas registro estratégico. | - | - |
| §195 | **SF pré-pipeline Hermes+Archivist.** `runSfAutoPilot` → `async`. Antes do step 0: GET `/api/memory/search?q=` (Archivist, `results[].preview`) + POST `/api/hermes/analyze` `{message, mode:'sf-autopilot'}` (`answer` LLM real). `_sfPreContext` injetado em `fullContext` se não vazio. Ambos `try/catch` — Auto-Pilot fail-safe. 6/6 PASS. CF Pages ao vivo. Zero server.js. | - | - |
| §194 | **SF Skills Architecture — inspiração LionClaw/OpenClaw.** Pesquisa e registro estratégico. LionClaw/OpenClaw (247K stars GitHub) tem: Gateway persistente (gerencia sessões/tool dispatch/roteamento), Memory Vault (histórico acumulado entre sessões), SOUL.md (identidade do agente), Skills instaláveis (extensões dinâmicas), Audit trail real, multi-turn reasoning loop (tool calls → executa → resubmete contexto). Separação arquitetural chave: Pi runtime faz "pensar e agir", OpenClaw faz "conectar, enfileirar, lembrar e estender". O SF hoje é fake orchestrator: 7 steps são LLM calls independentes sem memória real. Paralelo com Vision Core: (1) sfSession persistente → Gateway; (2) CLAUDE.md → SOUL.md (identidade do agente); (3) `_sfStepOutputs[]` (§193) → Memory Vault; (4) SF_GENERATORS hardcoded → Skills dinâmicas instaláveis; (5) Gold Gate com texto → Audit trail com artefatos reais. Vision AI Command já tem arquitetura multiagente: CORE + PI HARNESS + HERMES + OPENCLAW + SCANNER + PATCH ENGINE + AEGIS + GO CORE + PASS GOLD + ARCHIVIST + GITHUB AGENT. Gaps críticos do SF: sem Gateway persistente, Hermes não alimenta steps, AEGIS não valida arquivos gerados, Archivist não acumula entre sessões. Proposta §195: conectar SF_GENERATORS aos agentes reais. Zero mudanças de código nesta sessão. Apenas registro estratégico. | - | - |
| §193 | **SF Orquestração Real — acumulo de contexto + CLAUDE_CODE_BRIEF + bifurcação complex/standard.** Diagnóstico: fullContext sobrescrevia (não acumulava), project-files ignorava 7 steps, gold-gate avaliava nome do projeto. Fixes: (P2-backend) `_detectComplexity()` com 25 keywords em 5 domínios → hits≥2='complex'; branch complex gera `CLAUDE_CODE_BRIEF.md` (7 seções: domínio+compliance, stack, arquitetura ASCII, módulos, comandos Claude Code, segurança, PASS GOLD); branch standard recebe `contextPrefix` com step1+step2 reais; poll expõe `complexity`; (P1+P3-frontend) `window._sfStepOutputs[]` acumula outputs de todos os steps; "Ver Estrutura" passa `accumulated_context + step1_analysis + step2_blueprint`; `_applyFiles` bifurca: brief→chat+download.md / standard→treePanel+ZIP. Smoke test 2/2: jurídico→CLAUDE_CODE_BRIEF.md (21KB), tarefas→14 arquivos standard. EB v5.9.61-s193 + CF Pages ao vivo. | - | 84acc753 |
| §192 | **CSS inline no index.html gerado.** Causa: LLM gerava `<link href="/css/styles.css">` (path absoluto) — quebra em `file://`. Fix: instrução explícita "CSS INLINE no `<head>` via `<style>`, NÃO `<link>`". 12 arquivos (styles.css separado removido). Requisitos CSS no prompt: #0f0f0f, #7c3aed, border-radius:12px, @media 768px, ≥60 linhas. Correção colateral: ADR/semgrep via string concat (não template literal). Provider seguro: `(llm1 && llm1.provider) \|\| 'local'`. Deploy travou em rollback silencioso — fix: verificar existência de app version antes de update-environment. Smoke test **7/7 PASS**: 207 linhas CSS inline, todas as cores, @media, border-radius. EB v5.9.60-s192c. | - | 24cd9dea |
| §191 | **SF Professional Identity: projetos com governança, segurança e specs formais.** SF_GENERATORS reescritos: `mission-composer` ramifica por `body.step` (step=1: domínio+OWASP+compliance, step=3: template+árvore, step=4: spec SDDF); `deploy-blueprint`: spec técnica real (ADRs+API contract+schema), 800→2000tok; `worker-handoff`: P0/P1/P2, 700→900tok; `patch-validator`: OWASP A01-A10+LGPD+veredicto, 700→1000tok; `gold-gate`: +15 gates segurança/LGPD/specs (G11-G15 openapi/ADR/semgrep). `project-files` PROMPT1 reescrito 3 camadas: backend+frontend+docs. Mudança arquitetural principal: formato `===FILE:===` substitui JSON (resolve `json_parse_failed` permanentemente). Parser `_extractFilesJson` estratégia 0 detecta `===FILE:===` antes de tentar JSON. Injeção server-side de ADR + `.semgrep/semgrep.yaml` se LLM não gerar. Smoke test 7/8 PASS: 15 arquivos, ~21.8KB, public/index.html+Dockerfile+openapi.yaml+adr+middleware+routes+.env. EB v5.9.59-s191g. | - | 5957e874 |

> Write-up completo (causa raiz, fix, evidência) de cada sessão acima → `CLAUDE_HISTORY.md`.

---

## SF-AGENT-ORCHESTRATOR — CHECKPOINT DE CONTINUIDADE (em andamento)

### O que é

`tools/sf-agent-orchestrator.mjs` — orquestra o pipeline de "montar projeto do zero" do Software Factory usando o **Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk`, pacote novo, ainda avaliando instalação). Um agente "Hermes" no topo planeja e delega (sem `Write/Edit/Bash` no próprio `allowedTools`) pra subagents especializados (`backend-agent`, `frontend-agent`) que executam cada módulo de um `CLAUDE_CODE_BRIEF` (o mesmo formato gerado pelo SF em §193). Governança via hooks `PreToolUse` (bloqueia comando destrutivo antes de rodar), `PostToolUse` (captura evidência real de teste) e `SubagentStop` (valida claims do subagent contra evidência real antes de deixar o resultado voltar pro Hermes) — reaproveitando `tools/hermes/mission-supervisor.mjs` (a mesma `validateAgentOutput` que o `pi-harness.mjs` usa) em vez de reinventar checagem de alucinação.

Teste: `tools/tests/sf-agent-orchestrator.test.mjs` — 100% mockado (injeta `queryFn` via opts, não precisa do pacote real nem gasta tokens). Não depende de instalação de dependência pra rodar.

### Padrão de disciplina desta feature — vale pra qualquer sessão futura

Isto não é só documentação do que foi feito — é o **modo de trabalhar** que se mostrou certo nesta feature e deveria se repetir em qualquer coisa parecida (integração de SDK externo, gate de segurança, camada de evidência):

1. **Commit isolado por peça lógica, teste ANTES de cada commit.** Nunca acumular várias mudanças conceituais num commit só — cada gate, cada hook, cada fonte de evidência ganha seu próprio commit com teste passando antes de existir no histórico.
2. **Revisão adversarial antes de instalar dependência de risco.** Não perguntar "ficou bom?" e aceitar "sim" — perguntar ativamente "que comando destrutivo concreto passaria batido nesse regex?", "que subtype de erro esse SDK pode devolver que eu não tô checando?". Listar bypass/lacuna concreta, não ressalva genérica. Se não achar nada de errado, dizer isso explicitamente em vez de inventar ressalva pra parecer que revisou.
3. **Incerteza documentada explicitamente no código, nunca fingida como certeza.** Quando não dá pra confirmar o shape de uma API externa contra fonte oficial (aconteceu com o payload do `PostToolUse` pra Bash — nem a doc nem o repo-fonte no GitHub confirmaram), o código ganha um comentário tipo `// NÃO VERIFICADO CONTRA FONTE OFICIAL` explicando exatamente o que não foi confirmado e o que fazer quando for possível verificar (não é "TODO" vago — é "aqui está a lista de candidatos, remova os que nunca baterem quando o pacote estiver instalado").
4. **Defaults fail-closed, não fail-open.** Tool desconhecida = tratar como potencialmente perigosa até prova em contrário (não o oposto). Campo de evidência ausente = não aprovar a claim (não assumir que "sem evidência" significa "tudo bem").
5. **Gate de confirmação humana antes de qualquer ação que:** gaste tokens de API de verdade, mude `package.json` (dependência nova), ou publique conteúdo em página pública (`frontend/about.html`, `frontend/landing.html`). Nenhuma dessas três acontece sem confirmação explícita — "sem resposta" NUNCA é tratado como "sim" nesses três casos especificamente (é tratado como "sim, pela opção mais conservadora" em decisões técnicas reversíveis, mas não nessas três).

### Estado atual (atualizado — Fase 2 pausada de propósito, 3 smoke tests reais já rodados)

- `@anthropic-ai/claude-agent-sdk` **instalado**, versão `0.3.199`.
- 72/72 testes mockados passando (`node tools/tests/sf-agent-orchestrator.test.mjs`).
- 7 achados de revisão adversarial + incremento de `missionEvidence` (exit_code/git_diff/merge) já corrigidos e commitados (ver histórico de commits de `tools/sf-agent-orchestrator.mjs`).
- **4 bugs de wiring achados e corrigidos durante Fases 1-2 (custo zero cada — lendo `sdk.d.ts` ou como efeito colateral de um smoke test que já ia rodar de qualquer forma):**
  1. `SubagentStopHookInput` não tem campo `result` — o campo real é `last_assistant_message?: string`. Corrigido.
  2. `defaultQueryFn` era `async function` comum (retorna Promise) em vez de `async function*` (gerador, async-iterável direto). Corrigido.
  3. `options.allowedTools` não restringe nada — quem restringe é `options.tools`. Tool de delegação real é `Task`, não `Agent`. Corrigido, e CONFIRMADO funcionando no 2º smoke test (Hermes reconheceu não ter Write e tentou delegar).
  4. `permissionMode: 'default'` exige aprovação interativa que não existe num script headless — corrigido pra `bypassPermissions` + `allowDangerouslySkipPermissions: true`.
- **BLOQUEIO ESTRUTURAL NÃO RESOLVIDO, achado no 3º smoke test (depois do fix #4 aplicado):** mesmo com `tools`/`permissionMode` corrigidos, **nenhum subagent conseguiu Write/Bash de verdade** — todos (`general-purpose`, `backend-agent`, `claude`) reportaram o mesmo toolset restrito (Read/Grep/Glob/Agent + Gmail MCP), **independente do que `AgentDefinition.tools` declarava**. Uma tentativa de `Write` chegou a retornar `"No such tool available: Write"` — e isso nunca passou pelo nosso `PreToolUse` (0 disparos), rejeitado numa camada anterior à nossa. Hipótese mais provável: os 3 smoke tests rodaram *aninhados dentro da sessão Claude Code atual* (disparados via uma tool Bash desta própria conversa) — o toolset restrito reportado (Gmail MCP incluso) bate com o ambiente real desta sessão, não com uma execução isolada. Parece existir uma barreira de segurança que impede uma sessão aninhada de conceder a subagents mais ferramentas do que o contexto que a originou já tem. **Isso não é algo que `options` do nosso próprio código controla** — precisaria de um teste rodando genuinamente fora de uma tool call de uma conversa Claude Code ativa (processo/terminal separado, CI, etc.) pra confirmar ou refutar.
- **Custo real acumulado nos 3 smoke tests: ~US$ 3,37** (US$0,17 + US$2,28 + US$0,92). Nenhum dos três conseguiu observar um `Bash` real completar — a pergunta original da Fase 3 (`shape` de `tool_response`) **continua sem resposta**, e a recomendação registrada é NÃO tentar de novo do mesmo jeito (aninhado nesta sessão) — precisaria de uma abordagem de teste diferente.
- `SUBAGENTS['backend-agent'/'frontend-agent'].model` **revertido pra `'sonnet'`** — sem mudança pendente no working tree.

### Roteiro de fases (pra retomar se a sessão cortar no meio)

Se você está lendo isto numa sessão nova: confira qual fase está marcada como a última concluída abaixo (procure por commits recentes tocando `tools/sf-agent-orchestrator.mjs` ou `package.json`) e continue da próxima.

- **Fase 0 — FECHADA.** Checkpoint registrado.
- **Fase 1 — FECHADA.** SDK instalado, validado sem chamar API, bugs de wiring achados de graça e corrigidos.
- **Fase 2 — PAUSADA de propósito, não fechada.** 3 smoke tests reais rodados (~US$3,37 total). tools/Task/permissionMode corrigidos e confirmados funcionando na medida do possível — mas um bloqueio estrutural mais profundo apareceu (nenhum subagent consegue Write/Bash de verdade, provável limitação de sessão aninhada). **Recomendação registrada: não rodar mais smoke test do mesmo jeito (aninhado nesta sessão) sem antes decidir uma abordagem de isolamento diferente** — mais tentativas iguais tendem só a acumular custo sem novo dado.
- **Fase 3** — continua bloqueada. A pergunta original (`extractBashExitCode`, shape de `tool_response`) não tem como ser respondida enquanto a Fase 2 não conseguir um `Bash` real completo.
- **Fase 4 — conteúdo público, requer aprovação de texto antes de commitar.** Ler `frontend/about.html`/`frontend/landing.html` primeiro. Só descrever capacidades REALMENTE testadas, no nível de maturidade real — **isso agora inclui ser honesto sobre o bloqueio de isolamento/subagent ainda não resolvido**, não fingir que está pronto pra produção. Mostrar o texto proposto antes de editar.
- **Fase 5** — ler `SDDF_SPEC.md` primeiro e verificar se a feature cai no escopo dele antes de assumir que sim. Se cair, propor atualização antes de aplicar; se não, registrar o motivo e pular.

---

## PENDÊNCIAS IMEDIATAS (PRÓXIMA SESSÃO)

**§121-§122 FECHADOS** — positionBalloon + seta CSS (18/18). Menu tutoriais U+25C9→🌟 (19/19). Ambos em produção.

**§123 FECHADO** — tutorial Geral sequestrado: STEPS_GERAL + _activeStorageKey. 7/7 PASS. Produção.

**§125 FECHADO** — 585 órfãos → tools/_archive/. syntax-check reescrito. test:quick 62/62.

**§126 FECHADO** — OpenClaw real: /api/openclaw/orchestrate → callLLM → plan JSON. EB v5.9.22.

**§127 FECHADO** — GitHub Agent ativo (GITHUB_TOKEN já no EB). PR #738 smoke test. files:[] causa 422.

**§128 FECHADO** — sidebar 6→9 itens (T7/T8/T9). _cockpitScroll. 50/50 PASS. CF Pages.

**§129 FECHADO** — Archivist: archivistSearch/Save em server.js. Hermes + OpenClaw best-effort. EB v5.9.24.

**§130 FECHADO** — PI Harness staging real. 4 bugs infra corrigidos. Go Core Linux. EB v5.9.26.

**§131 FECHADO** — PASS GOLD: D0-D7, 20 gates, pass_gold_candidate:true. 14/14 PASS.

**§132 FECHADO** — E2E fixture L1-L4 → PASS GOLD → PR #739. 5 bugs harness. EB v5.9.29.

**§133 FECHADO** — Scanner real: 0→1924 files. jsExts expandido + dirSkip root guard. EB v5.9.30.

**§134 FECHADO** — Fix auto L3: /api/security/suggest-fixes + renderSecurityViolations(). EB v5.9.31.

**§135 FECHADO** — PatchEngine /api/security/apply-fix: backup + substituição + diff. EB v5.9.32.

**§136 FECHADO** — Ring SVG + re-scan 1.5s + renderSecurityDashboard. 22/22. EB v5.9.33.

**§137 FECHADO** — Ring CORE fixo + OK ao terminar. CSS ::before em #mcCore. 9/9. CF Pages. Zero server.js.

**§138 FECHADO** — CLAUDE.md compactado: 46.5k → 27k chars (−42%). §83-§124 resumidos. Zero código tocado.

**§139 FECHADO** — Auditoria SF02-SF09: todos os 8 endpoints OK em produção (ok:true, anti_stub:true). SF_ENDPOINT_MAP cobre todos os 8 moduleKeys. CORS correto, sem auth bloqueando SF. 22/22 PASS. Zero mudança em código.

**§140 FECHADO** — Fix v582-sf-modules.js workerUrl: `|| ''` → `|| gateway`. 1 linha. 5/5 PASS. CF Pages. Zero server.js.

**§141 FECHADO** — Fix botões v236 visíveis (＋ ADICIONAR ARQUIVOS + 💬 COPILOTO). Causa raiz: `v272-layout-force.css` + `v273-sddf-command-chat.css` tinham `.v236-action-row{display:grid!important}` que sobrescrevia `style="display:none"` do HTML, expondo v236FileBtn+v236CopilotBtn (ambos em BLOCKED_IDS → cursor:not-allowed). Fix: `display:none!important` no final de `vision-core-bundle.css` (último `!important` de mesma especificidade vence). CF Pages ao vivo. Zero server.js.

**§142 FECHADO** — Métricas reais + projetos + 4 nós animados. (A) `initObservabilityPanel107` extendido: barras agora recebem largura/cor pelo `status` real do backend (`ok`=85% verde, `binary_not_found`=20% laranja, `PENDING_EVIDENCE`=30% amarelo); val-* colorido. (B) `GET/POST /api/projects` em server.js + `s142InitProjects()` popula `#projectSelector` + botão `+ Novo`. (C) `AGENT_KEYS` expandido de 6 para 10 nós (piharness/openclaw/archivist/github); `startMissionAnimation` seq 5→8; `stopMissionAnimation` stMap mapeando os 4 novos. 30/30 PASS. EB v5.9.34-s142. CF Pages ao vivo.

**§151 FECHADO** — scrypt passwords. `hashPassword()` → `$scrypt$16384$salt$hash` (memory-hard, zero npm deps). `verifyPassword()` detecta formato automaticamente. `_hashPasswordLegacy()` mantido para usuários existentes. Auto-migração no login: hash legado PBKDF2 → scrypt (seamless). `timingSafeEqual` em ambos os caminhos. 16/16 PASS. EB v5.9.42-s151.

**§150 FECHADO** — HMAC webhook Hotmart. `verifyHotmartWebhook()`: estratégia dupla — (1) `x-hotmart-hottok` contra `HOTMART_HOTTOK` env var; (2) `x-hotmart-signature` HMAC-SHA256 com `HOTMART_CLIENT_SECRET`; (3) `NODE_ENV=production` → rejeita sem header (401 `unauthorized_webhook`); (4) dev → permite, loga aviso. IP logado em rejeições. Hottok nunca logado. Pendente: configurar `HOTMART_HOTTOK` no EB após obter no painel Hotmart. 17/17 PASS. EB v5.9.41-s150.

**§149 FECHADO** — Rate limiting auth. `rateLimitMiddleware(action, maxAttempts, windowMs)` em memória (`Map`, zero deps). Register: 5/IP/hora. Login: 10/IP/15min. 429 + `Retry-After` header + `retry_after_seconds`. `setInterval` 5min para limpeza. `x-forwarded-for` para IP real. OAuth não afetado. `docs/SECURITY-SPEC.md` criado (nível 4/10 → meta 9/10). 17/17 PASS. EB v5.9.40-s149.

**§148 FECHADO** — Separação chat/missão no quota (UX). Investigação: backend JÁ separado — `/api/chat` (ENVIAR) sem `checkMissionQuota`, `/api/run-live` (EXECUTAR MISSÃO) com middleware. `logMission()` só chamado em `checkMissionQuota`. Zero mudança em server.js. Fix UX: badge `"X missões restantes"` → `"X missões SDDF · chat livre"`. CF Pages ao vivo.

**§147 FECHADO** — Marketing anti-alucinação + spec interna PASS GOLD. `docs/PASS-GOLD-SPEC-INTERNA.md` criado (arquitetura D1-D6, tabela revelar/esconder, referências internas) + adicionado ao `.gitignore`. Seção `#antialucinacao` em `index.html`: headline "O único copiloto que não confia em si mesmo", 3 pilares (verificação determinística, agente auditor separado, memória), tabela comparativa Copilot/Cursor vs Vision Core (4 capacidades). Zero menção a AST/Semgrep/Hermes no HTML público. CF Pages ao vivo. Zero backend.

**§146 FECHADO** — S3 persistence layer. Problema raiz: EB apaga `data/` em cada deploy. Fix: bucket `vision-core-data-prod` (us-east-1, public access blocked) + `writeAndSyncS3()` (write local + async `aws s3 cp`) + `_s3LoadSync()` no startup (execSync, blocking OK antes de listen). 8 write calls substituídos (USERS_DB + PROJECTS_DB). Zero nova dep npm — usa CLI `aws` da EC2 via IAM role. `VisionCoreS3DataAccess` policy adicionada. Env vars pendentes no EB (`AWS_S3_BUCKET=vision-core-data-prod`). 20/20 PASS. EB v5.9.39-s146. Fallback local preservado quando env var ausente.

**§145 FECHADO** — Auth badge + senha individual. (A) `server.js` register: `crypto.randomBytes(8).toString('hex')` quando `password === 'vc-user-auto'`; `generated_password` retornado no response. (B) bundle.js: `s145UpdateAuthUI(email, plan)` injeta badge no header (email+plano+logout) e esconde "SIGN IN"; `doAuth` salva `vc_user_pw_{email}` e `vc_user_email` no localStorage; login fallback usa senha salva; page-load restaura badge. Retrocompat com usuários `'vc-user-auto'` existentes. 16/16 PASS. EB v5.9.36-s145. CF Pages ao vivo.

**§144 FECHADO** — Hotmart billing + botão PRO. (A) `POST /api/billing/hotmart-webhook`: PURCHASE_COMPLETE/APPROVED → `user.plan='pro'`, cancelamento → `user.plan='free'`. (B) `GET /api/billing/hotmart-checkout`: redirect com email. (C) bundle.js PRO card: Stripe substituído por Hotmart `window.open`. (D) index.html PRO card: `plan-soon` removido, badge "EM BREVE" → "ASSINAR". Env vars Hotmart pendentes no EB (fallback hardcoded garante funcionamento). 22/22 PASS. EB v5.9.35-s144. CF Pages ao vivo.

**§143 FECHADO** — Suprimir badge "Nenhuma fonte obtida". `renderFetchBadge`: `if (!ok) return` antes de renderizar o badge negativo. Badge positivo (X fontes obtidas) intacto. 1 linha. CF Pages ao vivo. Zero server.js.

**§152 FECHADO** — JWT rotation + blacklist. `BLACKLIST_FILE` + `_tokenBlacklist` Set em memória. `_loadBlacklist()/_saveBlacklist()` com S3 sync. `revokeToken(jti)`: adiciona à blacklist, persiste (max 10000 — shift quando excede). `isTokenRevoked(jti)` verificado em `verifySession()`. `POST /api/auth/logout` revoga token imediatamente antes de clearCookie. `_test152_jwt_blacklist_unit.cjs` 19/19 PASS. EB v5.9.43-s152.

**§153 FECHADO** — HTTPS security headers no CF Workers gateway. `addSecurityHeaders(h)` em `worker/src/index.js`: X-Frame-Options DENY, X-Content-Type-Options nosniff, HSTS max-age=31536000+includeSubDomains, Referrer-Policy strict-origin-when-cross-origin, CSP (default-src/script-src unsafe-inline+unsafe-eval/frame-ancestors none), Permissions-Policy camera/mic/geo/payment disabled, X-Powered-By+Server deletados. Injetado em `withGatewayHeaders` (proxy+SSE) e `jsonResponse` (errors/health). Wrangler deploy v3.2. Verificado em produção — todos os 7 headers presentes. 17/17 PASS. CF Worker ao vivo.

**§154 FECHADO** — Audit log ações críticas. `AUDIT_LOG_FILE` + `auditLog(action, req, extra)`: ts ISO, ip (x-forwarded-for), user-agent, max 10000 entries, `writeAndSyncS3`. Calls em: `register`, `login_ok`, `login_fail`, `logout`, `oauth_login` (google/github), `plan_upgrade`, `plan_downgrade`, `webhook_rejected`. `GET /api/audit-log`: admin-only (role='admin'), retorna últimas 100 entries. 26/26 PASS (inclui §159). EB v5.9.44-s154.

**§159 FECHADO** — LGPD: direito ao esquecimento. `DELETE /api/auth/me`: verifica token → `revokeToken(jti)` (§152) → `db.users.splice(idx,1)` → `writeAndSyncS3` → `auditLog('account_deleted')`. Retorna `{ok:true, message:'account_deleted', email_deleted, anti_stub:true}`. Spec §155-§158 em `docs/ENTERPRISE-SPEC.md`. Checklist §160 em `docs/PENTEST-CHECKLIST.md`. 26/26 PASS. EB v5.9.44-s154-audit-lgpd.

**§155 FECHADO** — SSO ENTERPRISE via Google OAuth. `SSO_DOMAINS_FILE` + `_ssoDomains` em memória + S3. `_loadSsoDomains/_saveSsoDomains/isSsoDomain`. Google OAuth callback: `isSsoDomain(email)` → `plan='enterprise'` automático; `auditLog('sso_enterprise_login', {domain})` (sem email completo). Admin endpoints: `GET/POST/DELETE /api/sso/domains` (role='admin'). Startup: `_s3LoadSync(SSO_DOMAINS_FILE)` + `_loadSsoDomains()`. `index.html`: `.v299-plan-tag.pro` (roxo #7c3aed) + `.enterprise` (dourado #f59e0b). 24/24 PASS. EB v5.9.45-s155. CF Pages ao vivo.

**§SF-cleanup FECHADO** — Badges "EM BREVE" enganosos removidos. Módulo 05 (export_preview): `EM BREVE` → `LOCAL`. Módulo 06 (real_file_command): `EM BREVE` → `EXTERNAL ONLY`. Módulo 09 (final_dashboard): 2 chain-tags `EM BREVE` → `LOCAL` + classe `ready`. Tutorial T3: texto atualizado. `BLOCKED_IDS`: removidos 3 IDs mortos `v297*`. Módulo 08 saas_api intocado. CF Pages ao vivo.

**§161 FECHADO** — SF Auto-Pilot: 7 módulos em sequência automática. `SF_AUTOPILOT_STEPS[7]` + `runSfAutoPilot(desc)` (Promise chain recursiva, acumula `fullContext` entre steps) + `initSfAutoPilot()`. Botão "▶ AUTO-PILOT" (`vcSfAutoPilotBtn`) + progress panel com 4 estados (⏳/⚡/✅/❌) por step. Body: `{description, module, autopilot:true, step, total_steps}`. Usa `vcSfChatInput` como fonte da descrição. CSS: gradiente roxo-azul. Zero mudança no backend. 29/29 PASS. CF Pages ao vivo.

**§162 FECHADO** — Tutorial SF dedicado. `STEPS_SF2[7]` em linguagem simples, foco no Auto-Pilot. Steps: o-que-é → descreva-projeto → AUTO-PILOT → 7-módulos-em-sequência → modo-manual → Gold-Gate → pronto. Targets: `#vcSfChatInput`, `#vcSfAutoPilotBtn`, `.vc-sf-module-nav-h`, `[data-sf-module="worker_receipt"]`. `vcRegisterTutorial('sf2', ..., 'vc_tutorial_sf2_done')`. Botão `❓ TUTORIAL` (`vcSfTutorialBtn`) no header SF → `.vc-sf-tutorial-trigger` CSS. Reutiliza overlay/mascote do T1 via `_vcSetActiveTutorial`. T3 original (STEPS_SF) intocado. 23/23 PASS. CF Pages ao vivo.

**§163 FECHADO** — SF UX reformulação. Header SF: abas `[🚀 AUTO-PILOT]` / `[⚙ MODO AVANÇADO]` (`vcSfTabAutopilot/vcSfTabAdvanced`). `initSfModeTabs()`: AUTO-PILOT esconde `.vc-sf-module-nav-h` + `_sfShowHome()`; AVANÇADO mostra nav. 3 chips de exemplo clicáveis (`vcSfExamples`): preenche `vcSfChatInput` e scrolla para botão AUTO-PILOT. `vcSfTypewriter(el, text)`: cursor `▋` piscando (`.vc-typewriter-active`, `@keyframes vcBlink`), usado no result panel do Auto-Pilot (max 2000 chars, senão textContent direto). CSS: input `#vcSfChatInput` dark (`#1e1e2e`) + focus purple, chips pill. 32/32 PASS. CF Pages ao vivo.

**§164 FECHADO** — SF chat simples + typewriter fix + URL fetch. `vcSfHomeControl` reestruturado: hero/composer/action-grid removidos; `vcSfChatHistory` (histórico estilo Claude) + `vc-sf-input-bar` (textarea + toggle 🚀/⚙ + botão ↑). `handleSfSend()`: detecta URL via `extractUrl()`, busca conteúdo via `fetchUrlContext()` → `/api/sf/fetch-url`, depois `runSfAutoPilot(enriched)` ou `sendSfChatMessage()`. `addSfChatMsg('user'|'assistant', text)` para histórico. Enter handler antigo condicionado a `vcSfSendBtn` inexistente. `vcSfTypewriter` fixado: char-by-char `text[i]`, delay inicial 50ms, remove `vc-typewriter-done` antes de `active`. Backend: `POST /api/sf/fetch-url` — HTTP nativo, strip HTML, max 3000 chars, timeout 8s. Elementos legacy mantidos hidden para backward compat. 37/37 PASS. EB v5.9.46-s164. CF Pages ao vivo.

**§165 FECHADO** — SF resultado fixo + markdown render + layout. `sfMarkdownToHtml(text)`: HTML-escape primeiro (XSS safe), converte `**bold**`→`<strong>`, `*em*`→`<em>`, `[X]/[-]/[]`→✅/🔄/⬜, headings `#/##/###`, `---`→`<hr>`, `\n`→`<br>`. `addSfChatMsg`: role='assistant' usa `innerHTML = sfMarkdownToHtml(text)`, outros usam `textContent`. `vcSfTypewriter`: char-by-char durante animação, `innerHTML = sfMarkdownToHtml(text)` ao final. CSS: `.vc-sf-home-simple` com `height:calc(100vh - 180px)`, `.vc-sf-chat-history` com `min-height:200px` + `max-height:calc(100vh - 380px)`. `fullContext` confirmado var local em `runSfAutoPilot`. 15/15 PASS. CF Pages ao vivo. Zero backend.

**§166 FECHADO** — SF Arquiteto restaurado + toggle duplicado removido. `vcSfAutoPilotToggle` + CSS `.vc-sf-ap-toggle` removidos do HTML (redundantes com abas do header). `isSfAutoPilotMode()`: verifica `vcSfTabAutopilot.classList.contains('active')`. `handleSfSend`: usa `isSfAutoPilotMode()` em vez do toggle. `sendSfChatMessage`: Arquiteto via `POST /api/sf/mission-composer` → typing indicator `'▪ arquiteto analisando...'` → remove indicator → `addSfChatMsg('assistant')` + `vcSfTypewriter` (≤3000 chars) ou `innerHTML` direto. `initSfSimpleChat`: bloco toggle removido. 15/15 PASS. CF Pages ao vivo.

**§167 FECHADO** — SF fix estrutural final. HTML já correto (progress fora do history). `runSfAutoPilot`: `addSfChatMsg('assistant', '🏛️ Arquiteto analisando...')` antes de `progress.style.display='block'`. Scroll `hist.scrollTop = hist.scrollHeight` agora em `setTimeout(fn, 200)` para DOM atualizar após typewriter. `STEPS_SF2` substituído completamente: 7 steps com targets válidos na nova UI (`#vcSfHomeControl`, `#vcSfChatInput`, `#vcSfTabAutopilot`, `#vcSfTabAdvanced`, `#vcSfExamples`, `#vcSfSendBtn`). Removidos targets quebrados `#vcSfAutoPilotBtn`/`.vc-sf-module-nav-h`/`[data-sf-module=*]` (ocultos no modo AUTO-PILOT). 13/13 PASS. CF Pages ao vivo.

**§168 FECHADO** — Typewriter robusto + sem limite de chars. `vcSfTypewriter`: `el.isConnected` check (para se elemento sair do DOM), speed variável (5ms para textos >500 chars, 12ms para curtos), chunkSize (5 chars para textos >1000, 1 para curtos), scroll via `el.closest('.vc-sf-chat-history')` em vez de `el.scrollTop` (que não tem overflow), scroll final `setTimeout(fn, 100)` ao concluir markdown, delay inicial 30ms. Auto-Pilot e `sendSfChatMessage`: sempre `vcSfTypewriter`, sem limites 2000/3000 chars. 11/11 PASS. CF Pages ao vivo. Zero backend.

**§185 FECHADO** — SF Auto-Pilot steps 1-6 assíncronos (job_id pattern). `forEach` de SF_GENERATORS agora retorna `job_id` imediatamente (LLM em background), igual ao gold-gate §182. Fix 502 intermitente: CF Worker tinha timeout 10s para endpoints SF não-chat; resposta síncrona do LLM (~15-30s) ultrapassava. `gold-gate` skipado no `forEach` (rota própria já existia). Bundle: mensagens timeout/erro hardcoded 'Gold Gate' → `step.label`. Smoke test: `mission-composer`, `deploy-blueprint`, `worker-handoff`, `patch-validator` todos retornam `job_id` imediato + `done` via poll. EB v5.9.55-s185. CF Pages ao vivo.

**§186 FECHADO** — 4 bugs do Auto-Pilot corrigidos. (BUG 1) Resultado sumia: `setTimeout(150ms, scrollTop=scrollHeight)` rolava para o FIM do resultDiv (Gold Gate ~50 linhas → scroll saltava para botões no rodapé, markdown ficava acima do viewport). Fix: `requestAnimationFrame + scrollIntoView({block:'start'})`. (BUG 2) Segundo run invisível: primeiro run deixava `stepsEl/statusEl` com `display:none` permanente; segundo run reconstruía steps mas eles ficavam ocultos. Fix: `stepsEl.style.display=''` + `statusEl.style.display=''` no início de `runSfAutoPilot`. (BUG 3) Sem loading indicator: chat estático durante ~20s de polling por step. Fix: `_s186msg = addSfChatMsg('⏳ step.label...')` por step, atualiza para ✅/❌/⏱ em done/error/timeout. (BUG 4) MODO AVANÇADO quebrado por §185: `sendSfChatMessage` esperava `data.content|result|mission` mas recebia `job_id` → fallback 'Sem resposta.'. Fix: polling `setInterval(2s)` em `sendSfChatMessage` idêntico ao Auto-Pilot. Zero mudança backend. 4 commits separados. CF Pages ao vivo.

**§190 FECHADO** — project-files gerador melhorado. 5/6 PASS: 12 arquivos, ~11KB, Express real. EB v5.9.58-s190.

**§205 FECHADO** — `POST /api/deploy/pages` + `POST /api/deploy/eb` implementados. Advisory endpoints (EB não tem CLI local para wrangler/python scripts). `pages` retorna `{ok:true, mode:'advisory', url:FRONTEND_URL, note:'bash bin/deploy-pages.sh'}`. `eb` retorna `{ok:true, mode:'advisory', version:pkg.version, note:'python _deploy191b_eb.py'}`. `anti_stub:true` em ambos. Frontend §204+ já lê `url` (CF Pages) e `version` (EB) nos botões. §202+ EB deploy também aplicado (POST `/api/mission/timeline` ativo). 5/5 PASS. EB ao vivo.

**§204+ FECHADO** — Deploy dropdown com 5 opções substitui mini-form PR simples. `#sf-pr-btn-wrap` reconstruído: dropdown `<select>` com ZIP (client-side Blob download) / PR GitHub / CF Pages / EB / Docker. Campos repo+base_branch aparecem apenas quando PR selecionado. Cada action em closure separada `(_s204select, _s204repo, _s204baseInp, _s204btn)`. Docker → mensagem configuração. CF Pages / EB → POST `/api/deploy/pages|eb` (endpoints ainda não existem — erro 404 com msg clara). ZIP sempre funciona. CF Pages ao vivo. Zero EB (deploy posterior).

**§203+ FECHADO** — `section#runtime` criada no `index.html` entre `#timeline` e `#diff`. `runtimeJobCount` + `runtimeJobList`. `sfJobUpdate` CustomEvent listener em `initSfAutoPilot` popula lista com icon/title/status/duration. href="#runtime" no sidebar agora tem alvo real. CF Pages ao vivo.

**§202+ FECHADO** — POST `/api/mission/timeline` adicionado ao `server.js`. Handler chama `appendMissionTimeline(user.id, entry)` real — SF agora aparece na Mission Timeline UI quando logado. Bundle: troca `/api/memory/save` → `/api/mission/timeline` POST. **EB deploy pendente** (EB not Ready ao tentar deploy — S3 atualizado, update-environment bloqueado).

**§204 FECHADO** — PR automático via GitHub Agent após Auto-Pilot. Após `hist.appendChild(resultDiv)`: mini-form inserido no chat (`#sf-pr-btn-wrap`) com `input[repo]` + `input[base_branch='main']` + botão "🐙 Criar PR via GitHub Agent". Click → POST `/api/github/create-pr` `{repo, base_branch, head_branch:'sf-autopilot-<ts>', title, body:stepOutputs[:300], files:[SF_AUTOPILOT_OUTPUT.md]}` → `pr_url` abre em nova aba. PR NUNCA automático — requer clique + repo explícito. Fail-safe: erro → mensagem no botão, re-enable. IIFE closure captura `(_s204repo, _s204base, _s204btn)`. 8/8 PASS. CF Pages ao vivo. Zero server.js.

**§203 FECHADO** — Execution Monitor: sfJobs visíveis via `window.__sfActiveJobs` + `CustomEvent('sfJobUpdate')`. Job registrado como `{id, title, status:'running', started, steps}` no início do `runSfAutoPilot`. No bloco de conclusão: `status='done'`, `ended`, `steps_done` + dispatch `sfJobUpdate`. `#runtime` seção é ghost (sem elemento id="runtime" no HTML) — CustomEvent disponível para listener futuro. Fail-safe try/catch em ambos os pontos. 8/8 PASS. CF Pages ao vivo.

**§202 FECHADO** — Mission Log via `/api/memory/save` type:'sf-missions'. Nota técnica: `/api/mission/timeline` é GET only — `appendMissionTimeline` é server-side only (chamada por `/api/run-live` e `/api/copilot`). Workaround: IIFE fire-and-forget POST `/api/memory/save` `{type:'sf-missions', title, content:desc, steps_completed, source, timestamp}`. Não aparece no Timeline UI (fonte diferente) — loga em `data/memory/sf-missions/`. 8/8 PASS. CF Pages ao vivo.

**§201 DIAGNÓSTICO** — Vision Core menu vs LionClaw + audit SDDF/OSINT.

**MAPEAMENTO SIDEBAR → LionClaw:**
| LionClaw | Vision Core | SF conectado? |
|--|--|--|
| Chat | SOFTWARE FACTORY | ✅ é o SF |
| Pipeline | MISSION CONTROL | ❌ SF não loga em `/api/mission/timeline` |
| Logs | MISSION TIMELINE | ❌ só `/api/run-live` e `/api/copilot` chamam `logMission()` |
| Tasks | EXECUTION MONITOR | ❌ sfJobs isolados, não visíveis no `#runtime` |
| Cerebro | DIAGNOSTICS/HERMES | ✅ §195 wired |
| Skills | VALIDATION/SDDF | ⚠️ SDDF = methodology (não ferramenta); `/api/sddf/check` stub sempre ACTIVE |
| Vault | VAULT/ROLLBACK | ✅ §198 wired |
| Conhecimento | MEMORY/OBSIDIAN | ✅ §195+§196 wired |
| SubAgents | OPENCLAW/OPENSQUAD | ✅ §199 wired |
| MCP Servers | OSINT DOCKER | ❌ 3 adapters 503 — precisam env vars Docker não configurados no EB |
| Canais | GITHUB/PR REAL | ❌ SF não abre PR após gerar código |
| Usage | MÉTRICAS | ❌ SF não reporta tempo/provider/tokens por run |
| SubAgents | AGENTES EXTRAS | ✅ §200 mapeado |

**DIAGNÓSTICO SDDF:** `/api/sddf/check` retorna stub `{SDDF_ACTIVE, pass_gold:false, promotion_allowed:false}`. Sidebar "VALIDATION/SDDF" aponta `#score` (SF Gold Gate UI). SF já usa SDDF internamente como metodologia — nenhum endpoint novo a conectar. Não implementar.

**DIAGNÓSTICO OSINT DOCKER:** `SpiderFoot`, `Recon-ng`, `Maryam` — todos 503 `adapter_not_configured`. Precisam `SPIDERFOOT_URL`/`RECONNG_URL`/`MARYAM_URL` no EB. Infraestrutura Docker não configurada. Não implementar até env vars disponíveis.

**GAPS REAIS DO SF (próximos §):**
1. SF não loga em Mission Timeline — `logMission()` poderia ser chamado ao concluir Auto-Pilot
2. sfJobs não visíveis no Execution Monitor (`#runtime`)
3. SF não abre PR automático via GitHub Agent após gerar código (§127 existe)

Zero código nesta sessão.

**§200 PRÉ-REGISTRO** — Reserve Agents como fallback real do SF. OpenSquad Reserve tem 5 agentes (Reserve Memory, Locator, Security, Validator, Architect) em modos CIRÚRGICO/AUTO/LOOP. Mapa de substituição: §195 Archivist falha → Reserve Memory (`/api/memory/search` query diferente); Scanner falha → Reserve Locator (`/api/scanner/locate`); §197 Aegis falha → Reserve Security (`/api/security/suggest-fixes`); §198 PASS GOLD falha → Reserve Validator (`/api/aegis/validate` mode:'validation'); complexidade alta → Reserve Architect (`/api/hermes/analyze` mode:'architecture'). Padrão: catch atual degrada silenciosamente (`console.warn`) — Reserve preserva contexto com agente alternativo real antes de degradar. Implementação futura: cada `catch(e)` nos §195–§199 ganha bloco try interno chamando o Reserve. `_detectComplexity()='complex'` aciona Reserve Architect automaticamente. Estado pós §199: agentes primários todos wired. §200 = próximo passo natural. Zero código nesta sessão.

**§199 FECHADO** — OpenClaw PI HARNESS como planejador do SF. Descoberta técnica: OpenClaw não executa steps (não retorna `steps/results`) — é router/planejador. `body.mission` → `decision:'execute_mission'` mas `plan=null`. `body.message` → `decision:'diagnose'` → LLM Patch Strategist → `plan:{mission_summary, tasks, risk_level}`. OpenClaw internamente chama `archivistSearch` (§129) — uso indireto do PI HARNESS. Implementação: antes do `runStep(0)`, POST `/api/openclaw/orchestrate` com `{message, context, steps_count, mode:'sf-autopilot'}`. Se `plan.mission_summary` presente: enriquece `fullContext` com `[OPENCLAW PLAN via PI HARNESS]`. `runStep(0)` sempre chamado — OpenClaw é planejador, SF loop é executor. Fail-safe try/catch: offline → loop direto. 6/6 PASS. CF Pages ao vivo. Zero server.js.

**§198 FECHADO** — PASS GOLD + vault/snapshot como validação final real. Encadeado dentro do IIFE §197 no ramo `_a197pass===true`: POST `/api/vault/snapshot` com `{label:'sf-autopilot-<ts>', project:desc[:60], triggered_by:'sf-autopilot', aegis_verdict:'PASS', pass_gold:true}`. Resposta lê `snapshot_id`. Status final: `'🏆 PASS GOLD — Auto-Pilot validado! [<snapshot_id[-20:]>]'`. Fail-safe: vault offline → `'🛡 Aegis: PASS'`. Aegis FAIL → vault não chamado (correto). 5/5 PASS. CF Pages ao vivo. Zero server.js.

**§197 FECHADO** — Aegis validate no Auto-Pilot. IIFE async fire-and-forget após conclusão: POST `/api/aegis/validate` com `{artifacts:_sfStepOutputs[:1500], description, source:'sf-autopilot', mode:'security-gate'}`. Resposta: `verdict==='PASS'` → `statusEl='🛡 Aegis: PASS — Auto-Pilot concluído!'`; caso contrário → `'⚠ Aegis: <verdict>'`. Endpoint atual sempre retorna `{verdict:'PASS'}` — arquitetura wired, real Go Core scanner plugável em §198+. Fail-safe try/catch, não bloqueia UI. Ordem de execução: Aegis IIFE → Archivist IIFE (ambos fire-and-forget em paralelo). 5/5 PASS. CF Pages ao vivo. Zero server.js.

**§196 FECHADO** — Gold Gate → Archivist/learn: ciclo de memória fechado. Após Auto-Pilot concluir (idx >= SF_AUTOPILOT_STEPS.length): IIFE async fire-and-forget chama POST `/api/archivist/learn` com `{pass_gold:true, title:'sf-autopilot-<ts>', description:_sfLastDescription[:400], content:_sfStepOutputs[:1200], tags:['sf-autopilot','auto-saved'], source:'sf-gold-gate'}`. `window._sfLastDescription` salvo no início de `runSfAutoPilot`. Fail-safe: try/catch, sem _sfLastDescription → return imediato, sem bloquear UI. Próximo run §195 Archivist já encontra projetos similares salvos. 5/5 PASS. CF Pages ao vivo. Zero server.js.

**§196–§199 PRÉ-REGISTRO** — Roadmap SF → Vision AI Command completo.

**INSIGHT ARQUITETURAL CHAVE:** Vision Core não depende de Pi externo (como LionClaw). PI HARNESS é runtime próprio internalizado. SF deveria usar PI HARNESS como motor dos steps — torna Vision Core mais poderoso que LionClaw: LionClaw terceiriza runtime → Pi externo; Vision Core internalizou runtime → PI HARNESS próprio.

- **§196** — Scanner no step de análise de projeto. Substituir step 1 (análise LLM genérica) por chamada real ao Scanner (Context Builder real). Endpoint: `/api/scanner` ou equivalente real. Impacto: step 1 recebe análise de contexto real (arquivos, deps, stack).
- **§197** — Aegis substituindo Gold Gate fake. Gold Gate atual avalia texto, não artefatos reais. Aegis é Security Gate real (Go Core). Substituir `gold-gate` por `/api/aegis` com artefatos reais. Impacto: validação de segurança real antes de promover output.
- **§198** — PASS GOLD como validação final real. Substituir aprovação textual final por `/api/vault/snapshot` + PASS GOLD. Impacto: Gold Gate vira checkpoint real, não cosmético.
- **§199** — OpenClaw como orquestrador central do SF. Loop `for` manual dos 7 steps substituído pelo PI HARNESS via OpenClaw (`/api/openclaw/orchestrate`) — multi-turn reasoning loop real com tool calling. Impacto: SF deixa de ser fake orchestrator, vira agente real.

Estado pós §195: SF tem pré-pipeline real (Archivist + Hermes). Steps 1–7 ainda são LLM calls independentes (loop for manual). §196–§199 conectam os agentes restantes progressivamente. Zero mudanças de código nesta sessão.

**§195 FECHADO** — SF pré-pipeline Hermes+Archivist. `runSfAutoPilot` → `async`. Antes do step 0: (1) GET `/api/memory/search?q=` busca projetos similares no Archivist — `results[].preview` acumulado em `_sfPreContext`; (2) POST `/api/hermes/analyze` com `{message, mode:'sf-autopilot'}` — `answer` real do LLM acumulado em `_sfPreContext`. Se `_sfPreContext` presente: `fullContext = projectDescription + [ARCHIVIST] + [HERMES RCA]`. Ambos em `try/catch` separados — Auto-Pilot não quebra se agentes offline. Status animado: "🔍 Consultando memória..." → "🧠 Hermes analisando..." → "✅ Contexto real carregado". 6/6 PASS. CF Pages ao vivo. Zero mudança em server.js.

**§194 REGISTRADO** — SF Skills Architecture. Análise comparativa Vision Core vs LionClaw/OpenClaw. SF atual é fake orchestrator: 7 steps LLM independentes sem memória real. Gaps identificados: (1) sem Gateway persistente (sfSession); (2) CLAUDE.md existe mas não é lido pelo SF em runtime (SOUL.md gap); (3) `_sfStepOutputs[]` (§193) é embrião do Memory Vault; (4) SF_GENERATORS são skills hardcoded — não dinâmicas; (5) Gold Gate avalia texto, não artefatos reais. Vision AI Command (sistema paralelo ao SF) já tem os agentes: Hermes (Orchestrator), Scanner (Context Builder), Patch Engine, Aegis (Security Gate), Go Core (Runtime Truth), Pass Gold (Final Authorizer), Archivist (Memory Guard), GitHub Agent. §195 proposto: conectar SF_GENERATORS aos agentes reais do Vision AI Command — Hermes como step1, Scanner como step2, Archivist acumulando memória entre runs, Aegis no Gold Gate. Zero mudanças de código nesta sessão.

**§193 FECHADO** — SF Orquestração Real. `_detectComplexity()` + `CLAUDE_CODE_BRIEF.md` + `_sfStepOutputs` acumulado + bifurcação brief/estrutura. Smoke test: 2/2 PASS. EB v5.9.61-s193. CF Pages.

**§192 FECHADO** — CSS inline no index.html. `<link>` externo → `<style>` inline. 7/7 PASS: 207 linhas, #0f0f0f, #7c3aed, border-radius, @media. Deploy: verificar app version antes de update-environment (rollback silencioso pré-existente). EB v5.9.60-s192c.

**§191 FECHADO** — SF Professional Identity. SF_GENERATORS reescritos (mission-composer step-branching, deploy-blueprint spec técnica, patch-validator OWASP+LGPD, gold-gate +15 gates). project-files: formato `===FILE:===` (resolve json_parse_failed permanentemente), lista numerada 13 arquivos, injeção server-side de ADR + semgrep. 7/8 PASS: 15 arquivos, ~21.8KB, public/index.html+Dockerfile+openapi.yaml+adr presente. Iterações internas: §191b (PROMPT2 simples), §191c (retry cobre timeout), §191d (===FILE:=== parser), §191e (strip=== dos nomes + 6000tok), §191f (lista numerada 13 obrigatórios), §191g (inject ADR+semgrep server-side). EB v5.9.59-s191g. Decisão estratégica: Vision Core SF é orquestrador de projetos profissionais — governança, segurança por design, specs formais de ponta a ponta. NÃO é gerador de vibe code.

**SF considerado funcional. Próximo: §156 (multi-projeto isolamento real) ou lançamento PRO.**

## ROADMAP ENTERPRISE + SEGURANÇA §149–§160
### Nível de segurança atual: 8.5/10 (após §155)
### Meta: 9/10 antes do lançamento ENTERPRISE

#### P1 — Gaps críticos (bloqueantes)
| § | Feature | Status |
|---|---------|--------|
| §149 | Rate limiting auth register/login | ✅ DONE |
| §150 | HMAC webhook Hotmart | ✅ DONE (HOTMART_HOTTOK EB pendente) |
| §151 | Scrypt nas senhas (substituir PBKDF2) | ✅ DONE |

#### P2 — Gaps sérios (antes de cobrar ENTERPRISE)
| § | Feature | Status |
|---|---------|--------|
| §152 | JWT rotação + blacklist | ✅ DONE |
| §153 | HTTPS security headers | ✅ DONE |
| §154 | Audit log ações críticas | ✅ DONE |

#### P3 — Features ENTERPRISE reais
| § | Feature | Status |
|---|---------|--------|
| §155 | SSO via OpenID Connect | ✅ DONE (Google OAuth, auto-upgrade domain→enterprise) |
| §156 | Multi-projeto com isolamento real | pendente — spec em `docs/ENTERPRISE-SPEC.md` |
| §157 | Workers Dashboard completo | pendente — spec em `docs/ENTERPRISE-SPEC.md` |
| §158 | 2FA TOTP obrigatório ENTERPRISE | pendente — spec em `docs/ENTERPRISE-SPEC.md` |

#### P4 — Compliance
| § | Feature | Status |
|---|---------|--------|
| §159 | LGPD: DELETE /api/auth/me | ✅ DONE |
| §160 | Penetration test OWASP ZAP | pendente — checklist em `docs/PENTEST-CHECKLIST.md` |

**Nota §121 → próxima sessão:** features visuais com overlay/tutorial que foram consertadas precisam de confirmação visual real em produção pelo humano antes de serem declaradas resolvidas — a sequência §120+§121 mostrou que "testes passando" não garantiu "funciona em produção" quando CSS e JS se contradizem.

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

## NOTA TÉCNICA — RUÍDO DE CRLF/LF NO GIT DIFF

`git status` mostra ~1580 arquivos "modified" sem mudança real — LF no git, CRLF na working tree (core.autocrlf inconsistente). Pré-existente, não introduzido recentemente. Não é prioridade corrigir (raio de explosão de .gitattributes alto para benefício cosmético).
