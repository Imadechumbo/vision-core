# VISION CORE — CLAUDE.md
## Documento central do projeto | Atualizado: 2026-07-06 (Fase 3 em andamento — 3.3a+3.3b+3.3c fechados)

> **LEIA ESTE ARQUIVO COMPLETO ANTES DE QUALQUER AÇÃO.**
> Contém o estado real do projeto: o que está implementado, o que falta, o que NÃO deve ser tocado.
> Histórico técnico completo (causa raiz/fix/evidência de cada sessão passada) está em `CLAUDE_HISTORY.md` — consultar só para entender o "porquê" de algo já feito; não é leitura obrigatória.

---

## STACK & URLS

| Componente | URL | Notas |
|-----------|-----|-------|
| Frontend | https://visioncoreai.pages.dev | Cloudflare Pages — deploy via `bash bin/deploy-pages.sh "msg"` |
| Worker Gateway | https://visioncore-api-gateway.weiganlight.workers.dev | Cloudflare Worker — proxy para EB |
| Backend EB | http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com | Node.js AWS Elastic Beanstalk (Node 24 / AL2023, recriado no §206) |
| GitHub | https://github.com/Imadechumbo/vision-core | Repositório principal |
| GitLab | https://gitlab.com/imadechumbo/vision-core-pages | CF Pages CI — **não funciona** (runner allocation falha) |
| Vision Agent Local | http://localhost:7070 | Instalado via VisionAgentSetup.exe |

**Deploy:**
- Frontend: `bash bin/deploy-pages.sh "mensagem"`
- Backend: `python _deploy191b_eb.py` (ajustar versão) — ou `_deploy_eb_recreate.py` se o ambiente precisar ser recriado
- GitLab CI: NÃO usar — sempre deploy manual

**Versão em produção (mais recente):** Backend EB `v5.9.61-s193`+ (§206 recriou o ambiente, plataforma Node 24/AL2023) · CF Pages acompanha os §s mais recentes da tabela de histórico em `CLAUDE_HISTORY.md`.

---

## ARQUITETURA GERAL

Vision Core é uma plataforma autônoma de correção/geração de software ("Vision AI Command"), com dois sistemas principais:

1. **Chat/Mission Control** — cockpit persistente (sidebar fixa) onde o usuário conversa, sobe projetos, roda missões de correção de bug, e acompanha Timeline/Vault/Métricas.
2. **Software Factory (SF)** — dentro do mesmo cockpit (unificado na Fase 2, não mais página separada) — gera projetos novos do zero via Auto-Pilot (7 módulos em sequência) ou Modo Avançado.

Ambos são orquestrados pelos **agentes reais** (ver seção MÓDULOS ATIVOS abaixo), não simulações — cada um tem endpoint real no backend.

**Fluxo típico de missão:** usuário descreve problema/projeto → Hermes diagnostica (LLM multi-provider) → PI Harness/Scanner constrói contexto real do repo → Patch Engine aplica fix → Aegis valida segurança → Go Core roda evidência real (testes) → PASS GOLD autoriza promoção → Archivist salva memória da missão → GitHub Agent abre PR.

---

## MÓDULOS ATIVOS (Vision AI Command)

| Módulo | Papel | Endpoint real |
|--------|-------|---------------|
| **Hermes** | Orchestrator / RCA — diagnostica causa raiz via LLM multi-provider | `/api/hermes/analyze`, `/api/copilot` |
| **PI Harness** | Runtime próprio (não terceiriza pra Pi externo) — staging real, evidência de execução | `pi-harness.mjs` |
| **OpenClaw** | Orquestrador/planejador central — multi-turn reasoning, delega pra outros agentes | `/api/openclaw/orchestrate` |
| **Scanner** | Context Builder — varre arquivos do projeto real (1924+ arquivos, múltiplas extensões) | Go Core |
| **Patch Engine** | Aplica fix real no disco — backup antes de escrever, diff real | `/api/security/apply-fix` |
| **Aegis** | Security Gate — scanner de secrets/vulnerabilidades (Go Core) | `/api/aegis/validate`, `/api/security/*` |
| **Go Core** | Runtime Truth — evidência real de execução (compilado Windows+Linux) | binário Go |
| **PASS GOLD** | Final Authorizer — só promove com evidência real (D0-D7, 20+ gates) | `pass-gold-engine.js` |
| **Archivist** | Memory Guard — memória de missões, aprendizado entre sessões | `/api/archivist/learn`, `/api/memory/search` |
| **GitHub Agent** | Canal — abre PR real após missão/geração concluída | `/api/github/create-pr` |
| **Reserve Agents** (Memory/Locator/Security/Validator/Architect) | Fallback quando agente primário falha — **pré-registrado, não implementado** (§200) | — |

---

## CONVENÇÕES DE CÓDIGO / REGRAS QUE NUNCA MUDAM

1. **Nunca redeployar o EB sem necessidade** — só CF Pages quando é só frontend.
2. **GitLab CI não funciona** — sempre `bash bin/deploy-pages.sh "msg"`.
3. **Não usar `node-fetch`** — usar `httpsPost` (já em `server.js`) ou `https.request` nativo.
4. **Anti-stub obrigatório** — todo endpoint novo deve ter `anti_stub: true` no response.
5. **OAuth Google** em modo testing — só `weiganlight@gmail.com` funciona até publicar o app.
6. **Mascote** — `mascote-idle-final.png` (sorridente) e `mascote-reading-final.png` (óculos+livro) em `frontend/assets/`.
7. **Balão tutorial** — fundo `#000000` puro, texto `#f1f5f9`.
8. **FREE limit** — 5 missões/mês via `checkMissionQuota` middleware em `/api/copilot` e `/api/run-live`. Chat (`/api/chat`) é livre, sem quota.
9. **Guards de localStorage em IIFEs de tutorial** — o guard "auto-abrir uma vez" deve envolver SÓ o bloco de auto-trigger, nunca a definição de infraestrutura compartilhada (funções no `window`, event listeners). Do contrário qualquer feature que dependa dessas funções quebra silenciosamente quando a flag já está setada. (§119)
10. **Geometria de overlay/spotlight exige teste visual (screenshot), não só verificação de seletor.** `rectsOverlap(balloon, spotlight) === false` deve ser parte dos testes de qualquer passo de tutorial, além de `assertSpotlightCoversTarget`. (§120)
11. **CSS `!important` sobre `position`/`top`/`left`/`transform` em elementos manipulados via JS é risco alto** — pode anular silenciosamente o posicionamento calculado em JS, enquanto testes continuam passando (leem o resultado pós-CSS, não a intenção do JS). Auditar contra `positionBalloon()` antes de adicionar `!important` nessas propriedades. Teste: `getComputedStyle(el).position === 'fixed'`. (§121)
12. **Novo módulo em `tools/` só é "entregue" com pelo menos um import real** em `pi-harness.mjs`, `server.js`, ou outro arquivo de produção (imports transitivos contam) — não basta ter teste unitário. Módulos sem import real são candidatos a limpeza. (§125)

---

## VARIÁVEIS DE AMBIENTE NO EB (nomes — sem valores)

```
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET
OAUTH_REDIRECT_BASE=https://visioncore-api-gateway.weiganlight.workers.dev
FRONTEND_URL=https://visioncoreai.pages.dev
FREE_MISSION_LIMIT=5          # ausente no ambiente real — default hardcoded '5' em server.js, sem risco
PROVIDER_VAULT_SECRET         # configurado no §206 — cifra o AI Provider Vault (ver checkpoint abaixo)
HOTMART_HOTTOK                # PENDENTE — não configurado ainda (§150)
AWS_S3_BUCKET=vision-core-data-prod   # PENDENTE de reaplicar (§146)
```

**Fallback de LLM (`callLLM()`):** OpenRouter → Anthropic → Groq → DeepSeek → Gemini → Cerebras (corrigido no §206 — `OPENAI_API_KEY` nunca existiu em produção). Todas as 27 env vars reais (chaves de LLM/OAuth/Stripe/Hotmart) foram migradas integralmente na recriação do EB (§206) — não listadas aqui por serem segredos.

---

## DECISÕES DE ESCOPO FECHADAS (não reabrir sem novo motivo)

**MIGRAÇÃO AWS→ALIBABA — NÃO migrar.** Não existe equivalente ao fluxo atual do Elastic Beanstalk (zip→version→apontar ambiente→rollback 1 comando) pra Node.js na Alibaba: Web+ descontinuado (2023), SAE não suporta Node.js, EDAS exige Kubernetes (ACK) — não é troca pontual, é adotar K8s como arquitetura. Resolução real: upgrade da conta AWS pra pay-as-you-go. Só revisitar se houver necessidade real de escala horizontal/múltiplos serviços — não por problema de billing.

**INFRAESTRUTURA AWS — 2 ambientes efetivos.** `Technetgame-env-1` (technetgame.com.br) e `vision-core-prod` (backend do vision-core). `TNGH-BACKEND`, `Tngh-aws-final-v2-env`, `vision-core-staging` encerrados em 2026-07-05 (eram ambientes de teste, causa raiz de EIP 5/5 esgotado → agora 2/5). Verificação de segurança feita antes do encerramento — DNS, GitHub Actions, Worker gateway — zero bloqueio. 3 scripts PowerShell dormentes na raiz mencionam `tngh-aws-final-v2-env` (relíquia pré-rename) — não bloqueiam nada, candidatos a limpeza futura.

**§98-F — OPENCLAW/OPENSQUAD/OSINT/V10 — ROADMAP, NÃO TOCAR** sem decisão de produto.

---

## O QUE ESTÁ IMPLEMENTADO E FUNCIONANDO (estado atual, não changelog)

### Backend (`server.js`)
- Auth completo: login/register/me, OAuth Google+GitHub reais, rate limiting (5 register/hora, 10 login/15min por IP), scrypt (memory-hard) com auto-migração de PBKDF2 legado, JWT rotation + blacklist, audit log de ações críticas, LGPD (`DELETE /api/auth/me`), SSO Enterprise via domínio Google.
- Mission: `/api/copilot`, `/api/run-live` (quota FREE enforced), `/api/agent/mission/queue` (apply_patch single e multi-arquivo, atômico tudo-ou-nada).
- Vault: snapshot/rollback real, persistido + S3.
- SF: 8 módulos via `callLLM()` multi-provider + AI Provider Vault (ver checkpoint abaixo).
- Security: Scanner real (1924+ arquivos), Aegis (Go Core), fix automático + PatchEngine aplica no disco com backup.
- Billing: Hotmart (webhook HMAC-verificado + checkout), plano real no JWT.
- S3 persistence layer (`users.json`/`projects.json`/blacklist/SSO domains) — EB apaga `data/` a cada deploy, S3 é a fonte de verdade.
- PI Harness staging real + Go Core compilado (Windows+Linux) — evidência real de execução, não simulada.
- PASS GOLD: D0-D7, 20+ gates de segurança/LGPD/specs, só promove com evidência real.

### Frontend (cockpit unificado — Fase 2 concluída)
- Sidebar fixa (`position:fixed`), persistente entre Chat e Software Factory.
- SF dentro do mesmo cockpit: abas AUTO-PILOT / MODO AVANÇADO, chat estilo Claude com markdown+typewriter, geração assíncrona (job_id + polling) pra evitar timeout do Worker (10s).
- Tutoriais contextuais por seção (T1 Geral, T2 Agent Local, T3/SF2 Software Factory, T4 Mission Control, T5 Agentes Extras, T6 PASS GOLD) — abrem só via botão manual, nunca automático (exceto T1 primeira visita).
- Deploy dropdown: ZIP / PR GitHub / CF Pages / EB / Docker.
- Execution Monitor + Mission Timeline + Métricas reais (não mockadas).
- Painel "AI API VAULT — Configuração Principal" — ver checkpoint AI PROVIDER VAULT abaixo.

---

## CHECKPOINTS EM ANDAMENTO (ler antes de continuar essas linhas de trabalho)

### 1. SF-AGENT-ORCHESTRATOR (`tools/sf-agent-orchestrator.mjs`)

Orquestra "montar projeto do zero" usando o **Claude Agent SDK** real (`@anthropic-ai/claude-agent-sdk` v0.3.199, instalado). Um agente "Hermes" no topo delega pra subagents (`backend-agent`/`frontend-agent`) via hooks de governança (`PreToolUse`/`PostToolUse`/`SubagentStop`) reaproveitando `validateAgentOutput` do `mission-supervisor.mjs`.

**Estado:** Fases 0, 1, 4 e 5 fechadas. Fase 2 (smoke test real) **pausada, não fechada** — 4 smoke tests reais rodados (~US$3,97 total), bloqueio estrutural identificado e parcialmente isolado (sessão aninhada herdava toolset restrito via env vars `CLAUDE_*` — corrigido com `sanitizeSpawnEnv()` + isolamento de processo via `ProcessStartInfo`), mas o 4º teste foi interrompido por limite de cota da conta antes de confirmar se subagents conseguem `Write`/`Bash` reais. Fase 3 (shape de `tool_response`) segue bloqueada até a Fase 2 fechar. **Próxima ação:** decidir com o humano — esperar reset de cota ou usar `ANTHROPIC_API_KEY` própria (pool separado).

**Disciplina que deve se repetir em qualquer integração de SDK externo/gate de segurança:**
1. Commit isolado por peça lógica, teste antes de cada commit.
2. Revisão adversarial antes de instalar dependência de risco — achar bypass concreto, não ressalva genérica.
3. Incerteza documentada explicitamente no código (`// NÃO VERIFICADO CONTRA FONTE OFICIAL`), nunca fingida como certeza.
4. Defaults fail-closed — tool desconhecida = perigosa até prova em contrário; evidência ausente = claim não aprovada.
5. Gate de confirmação humana obrigatório antes de: gastar tokens de API real, mudar `package.json`, publicar em página pública.

### 2. AI PROVIDER VAULT — "Configuração Principal"

Unifica os dois sistemas de credencial de LLM (env vars do EB vs. tela AI API VAULT, antes desconectada) numa fonte única. **Fases A/B/C/D(a) fechadas.**

- Persistência: vault é **override opcional** sobre env vars — só vale quando salvo pela tela nova, cifrado AES-256-GCM em repouso (`PROVIDER_VAULT_SECRET`, pendente no EB, fallback dev hardcoded).
- `callLLM()` já consulta o vault: só vence sobre env var quando `status==='connected'`; sem cache do estado (sempre lido fresco), só a derivação da chave-mestra é cacheada.
- **Limitação conhecida:** `status:'connected'` não expira sozinho — sem TTL/verificação periódica. Chave revogada no provedor continua "conectada" até teste manual novo.
- **Fase D(b) — não iniciada de propósito:** conectar `sf-agent-orchestrator.mjs` ao vault. Decisão em aberto (MCP server fino vs. lib compartilhada `provider-vault-crypto.js`/`provider-vault-routing.js`) — não presumir sem conversa com o humano primeiro.

### 3. FASE 3 — Remoção da página legada do Software Factory

Objetivo confirmado: remoção COMPLETA de `#projectBuilder`/`#vcSoftwareFactoryPage`.

| Sub-passo | O que faz | Status |
|---|---|---|
| 3.3a | Corrige 3 guards latentes que calculavam valor antes de checar textarea legada | ✅ FECHADO |
| 3.3b | Aposenta tutorial zumbi `STEPS_SF`, repontea pra `STEPS_SF2`, fecha gap de conteúdo (drawers sem passo de tutorial) | ✅ FECHADO |
| 3.3c | Remove `_sfArchitectSend()`/`_sfRenderArchitectResponse()`/`_sfSetArchitectMode()` + 8 elementos backward-compat mortos | ✅ FECHADO |
| **3.3d** | Remove `#vcSoftwareFactoryPage`/`#projectBuilder` por completo — HTML, show/hide, `SF_MODULE_SECTION_MAP`, CSS. Resolve a aba "Modo Avançado" (tela em branco) automaticamente | **PRÓXIMO PASSO** |

Achado adjacente não corrigido (fora de escopo): `tests/e2e/architect.spec.mjs` já estava quebrado antes desta fase, por motivo não relacionado (botão removido em §74.1) — decisão fica pra sessão futura.

---

## VISION CORE NEXT — ESTADO ATUAL (checkpoint vivo, atualizar a cada etapa)

**Vision Core Next é a frente de desenvolvimento ativa, sem legado.** `frontend/index.html` + `vision-core-bundle.css/js` (o cockpit antigo) são referência visual e funcional apenas — nunca base de código a importar ou colar. Objetivo: paridade funcional progressiva com rigor SDDF, front limpo e sem dívida herdada.

Arquivos oficiais da frente Next (não mexer em nada fora disso sem aprovação explícita):
- `frontend/vision-core-next.html`
- `frontend/assets/vision-core-next-clean.css`
- `frontend/assets/vision-core-next-clean.js`
- `CLAUDE.md` (memória entre sessões)

Arquivos públicos a atualizar somente depois de validação local correspondente: `frontend/about.html`, `frontend/landing.html`.

Regras absolutas desta fase:
1. Não fazer deploy sem aprovação manual explícita.
2. Não fazer commit que misture escopos — commits isolados por mudança coesa e revertível.
3. Não importar `vision-core-bundle.css`/`vision-core-bundle.js`.
4. Não reaproveitar layout/HTML legado como base de código — pode ler para mapear funções, nunca importar ou colar estrutura.
5. Não tocar em `frontend/index.html` nem nos bundles legados sem autorização explícita.
6. Endpoints que escrevem em disco, criam PR, aplicam patch, fazem deploy, rodam execução real ou gastam API real exigem confirmação/guard claro antes de conectar.
7. Função ainda não conectável com segurança vira placeholder que falha de forma VISÍVEL ("não implementado ainda") — nunca finge sucesso nem falha silenciosamente.

### Atomic Core — APROVADO E CONFIRMADO PELO USUÁRIO (protegido, não redesenhar sem autorização explícita)

Comportamento real atual (verificado no código, não presumido): SVG + CSS/JS leve, sem Canvas/Three.js/WebGL. `data-state="idle"|"action"` em `[data-atomic-core]` (instância única no DOM, sem duplicação hero/sidebar). Idle automático no load; Action automático via chat (`startAtomicSequence()` no submit). Propagação sequencial de glow durante a espera — Hermes → PI Harness → OpenClaw → Scanner → Patch Engine → Aegis, 1.8s por agente, em loop até `resetAtomicCore()` (chamado em todo fim de ciclo: sucesso, erro, timeout). Glow individual por agente funcional mesmo sob `prefers-reduced-motion` real (`Agent.prototype.values()` retorna glow base 24/idle vs 42/action mesmo com órbita congelada — a órbita para, o glow continua sinalizando estado). `window.AtomicCoreNext = {setState, highlight, reset}` é a API pública; `window.startAtomicSequence`/`stopAtomicSequence` completam o ciclo do chat.

**Achado desta sessão, já corrigido:** durante uma sessão do Codex (que atingiu limite de uso), a detecção de `prefers-reduced-motion` foi substituída por um parâmetro de URL (`?reduce=1`) e o guard do loop `requestAnimationFrame` foi removido — regressão de acessibilidade real (a máquina do usuário tem reduced-motion ligado no SO; o app parou de respeitar isso de verdade, embora parecesse igual em teste visual normal). Corrigido no commit `7278c633`: `matchMedia('(prefers-reduced-motion: reduce)')` real restaurado, guard do rAF restaurado. Configuração (ligado/desligado, intensidade) ainda não existe — é a Etapa 3 pendente (ver Settings obrigatórios abaixo).

### Logo/olho — APROVADO E CONFIRMADO PELO USUÁRIO (protegido, identidade visual — qualquer PR que toque aqui precisa de aprovação explícita mesmo que pareça ajuste pequeno)

Mecanismo real atual (verificado no código): **pálpebras reais via elementos DOM** (`.eye-lid-top`/`.eye-lid-bottom`, injetados dentro de `.vc-eye` no HTML) — não é mais o `scaleY` do olho inteiro de uma sessão anterior. Fecham via `transform: translateY()` (nunca afeta layout/height, então o bug histórico de altura mudando no hover é estruturalmente impossível aqui). Dois mecanismos coexistem: (1) CSS puro `:hover` em `.vc-eye-logo`/`.vc-side-brand`/`.vc-brand-lockup` mantém as pálpebras fechadas enquanto o mouse permanece sobre o logo (sem JS); (2) classe `.is-blinking` via JS (`blinkOnce()`), disparada em `pointerenter`/`mouseenter`/`pointermove` com debounce de 650ms por hover-session (`blinkedForHover` flag + `WeakMap`), usada tanto pelo hover quanto pela piscada ambiente. **Hover funciona sempre, incluindo sob `prefers-reduced-motion`** (não é gated por reduceMotion, é resposta direta à ação do usuário). **Piscada ambiente:** 4–9s, idle-only (checa `data-state` do Atomic Core via `isIdle()`), ~20% de chance de piscada dupla (+250ms) — desativada só sob reduced-motion real.

**Achado desta sessão, já corrigido:** a mesma sessão do Codex removeu a piscada ambiente por completo (só hover restava) e quebrou a detecção de reduced-motion (mesmo bug do Atomic Core acima, mesma causa). Ambos corrigidos no commit `7278c633`, sem tocar no visual/mecanismo de pálpebras aprovado (`e8169793`) — só a lógica de agendamento/detecção foi restaurada.

### Sidebar colapsável

`data-sidebar-state="expanded"|"collapsed"` em `.vc-app-shell`, toggle via `#vcSidebarToggle` (seta rotaciona), persistido em `localStorage.vc_next_sidebar_state`. Confirmado funcional, sem mudanças nesta sessão.

### Chat funcional

`POST {BACKEND_URL}/api/chat` (mesma URL do gateway CF do legado), síncrono (sem job_id/polling — isso só existe no Software Factory legado). Body: `{message, mode:'vision-geral', model:'auto', display_input}`. `Authorization: Bearer <token>` opcional, lido de `sessionStorage.vc_token`/`localStorage.vision_token` (sem cookies). Resposta lida em `data.answer` (mesmo campo do legado); campo ausente/vazio ou HTTP não-2xx viram mensagem de erro legível no chat (nunca "undefined", nunca JSON cru). `AbortController` com timeout de 45s. Integração com Atomic Core: `setAtomicCoreState('action')` + `startAtomicSequence()` no submit; `resetAtomicCore()` **sempre** ao terminar (sucesso, erro, timeout — nunca fica preso em action). Indicador "Pensando..." visível durante a espera via `appendMessage(kind, title, text)` (retorna o elemento, removido quando a resposta chega). Chips do composer (Missão/Factory/GitHub/Vault/IA) prefixam o textarea com contexto — sem lógica própria além disso.

**Achado do Codex já resolvido (Etapa 1b, commit `c1a55c03`):** `featureMap.actions`/`runFeatureAction()`/`renderFeatureActions()` estavam incompletos (`featureActions` nunca declarada, `#vcFeatureRun` não existe no HTML) — corrigido, os botões SAFE READ por feature (Agentes/Métricas/Timeline/Vault/Tools/Obsidian/GitHub-status) funcionam de verdade agora.

**Risco de segurança aceito, não expandir escopo:** o token (`vc_token`/`vision_token`) fica em `sessionStorage`/`localStorage`, igual ao legado — exposto a roubo via XSS (qualquer script injetado no domínio lê o token diretamente, sem precisar de acesso a cookies `httpOnly`). Mitigação real seria migrar para cookie `httpOnly`+`secure`+`SameSite`, mas isso é mudança de arquitetura de auth no backend, fora do escopo desta frente Next — aceito como está, paridade com o comportamento já existente no legado, não uma regressão introduzida aqui.

### GitHub PR — implementado com guard de confirmação dupla (item 8 da paridade, Etapa 1c)

`POST /api/github/create-pr` (cria branch+commit+PR real — ação irreversível em serviço externo) agora tem uma UI própria dentro do painel "GitHub" (`#vcGithubPrForm`, abaixo do status SAFE READ), não no chat/chips. Nunca dispara sozinho: botão "Criar PR" fica desabilitado até `repo`+`branch`+`título` preenchidos (branch já vem com default `'main'`, editável); clicar não envia nada — só troca pra um segundo passo "Confirmar criação de PR em `<repo>`" + "Cancelar" (cancelar = zero requisições); só o clique em "Confirmar" dispara o `fetch` de verdade. Durante a requisição o botão vira "Criando PR..." desabilitado (guarda contra duplo-clique — testado, 1 clique rápido a mais durante o request não gera 2ª chamada). Sucesso mostra o link real do PR (`data.pr_url`) e limpa o formulário; erro (HTTP não-2xx ou rede) mostra mensagem legível no próprio formulário sem travar a UI, e reabilita o botão pro usuário tentar de novo.

**Achado de bug corrigido durante a validação:** `.vc-github-pr { display: grid; }` no CSS sobrescrevia o atributo `hidden` do HTML (mesma especificidade autor-vs-UA, autor vence) — o painel de PR aparecia mesmo com o GitHub não sendo a aba ativa. Corrigido trocando o seletor para `.vc-github-pr:not([hidden])`.

### Executar Missão — Caminho A implementado (item 4 da paridade, Etapa 1d Fase 1)

**Achado que mudou o design original pedido:** `/api/chat/apply-patch` não gera patch a partir de descrição livre — ele *aplica* um patch já pronto (exige `file_content`/`zip_base64` + `file_path` + `patch`, 400 sem isso). E `/api/chat` com `mode:'fix'` **exige contexto real de arquivo** (gate anti-alucinação bloqueia com `BLOCKED_INPUT` sem `[Arquivo: ...]` na mensagem, antes de qualquer LLM). Ou seja, "Gerar Patch" real é sempre um pipeline de **2 chamadas encadeadas**, nunca 1 campo de descrição livre isolado — o formulário original de 1 campo pedido na etapa foi ajustado para 3 campos (caminho do arquivo, conteúdo atual, descrição do problema) para funcionar de verdade contra o backend real, não só contra mock.

Painel "Missions" (`#vcMissionPatchForm`, sem confirmação dupla — não é ação irreversível, só gera diff para download): botão "Gerar Patch" desabilitado até os 3 campos preenchidos → (1) `POST /api/chat` `{message: '[Arquivo: <path>]\n<conteúdo>\n\n---\n\n<descrição>', mode:'fix', model:'auto'}` → extrai `{file, patch, fix_type, diagnosis}` de `data.answer` (`extractHermesDiagnosis()`, tenta JSON direto, dentro de fences ```` ```json ```` , e um regex `{...}` de fallback) → (2) se houver `patch`, `POST /api/chat/apply-patch` `{file_content, file_path, fix_type, patch, diagnosis}` → mostra `diff_preview` num bloco de código readonly + botão "Baixar patch" (`Blob`+`<a download>`, nunca escreve em disco nem aplica nada automaticamente). `AbortController` de 60s cobrindo as 2 chamadas. Integra com Atomic Core igual ao chat principal (`action` no clique, `startAtomicSequence()`, `resetAtomicCore()` sempre ao terminar — sucesso, erro em qualquer uma das 2 chamadas, diagnóstico sem patch aplicável, ou timeout).

Validado com Playwright, incluindo o **timeout real via `page.clock` (relógio virtual do Playwright)** — avança 61s de tempo simulado sem esperar de verdade, disparando o `AbortController` real do código de produção (sem nenhum hook de teste no código-fonte).

### Executar Missão — Caminho B, Fase 2a (`sf_dry_run_real`) — IMPLEMENTADO (Etapa 1d Fase 2a, 2026-07-08)

Decisão do usuário naquela etapa: implementar SOMENTE `type:'sf_dry_run_real'` — `apply_patch`/`apply_patch_multi` reais via agente (Fase 2b, genuinamente irreversível) ficaram para decisão futura separada. Estado atual da 2b está registrado na seção seguinte.

**Achado de contrato de API, verificado direto em `backend/server.js` antes de implementar** (mudou o design assumido no registro anterior desta pendência):
- `POST /api/agent/mission/queue` retorna `mission_id` (não `job_id`) — `{ok:true, mission_id, queued, queue_length, type, time}` (`sendOk()` acha campos, `server.js:3172-3218`). Exige `body.target_path` quando `type==='sf_dry_run_real'` (400 `sf_dry_run_real_requires_target_path` sem isso, `server.js:3210-3213`).
- `GET /api/agent/mission/result/:id` **retorna 404 com `error:'result_not_found'` enquanto o Vision Agent Local ainda não postou resultado** (`server.js:3233-3237`) — isso NÃO é erro, é o sinal de "ainda rodando"; qualquer outro erro (rede, 5xx, corpo malformado) é falha real. O polling trata os dois casos de forma diferente.
- Nem `/api/agent/mission/queue` nem `/api/agent/mission/result/:id` passam por `checkMissionQuota` (só `/api/copilot` e `/api/run-live` passam, confirmado por grep) — sem gate de quota FREE nesta ação.

**Implementação (`frontend/vision-core-next.html` + `assets/vision-core-next-clean.{css,js}`, cache-bust `v28`):** novo bloco `#vcDryRunForm` dentro do painel Missions (mesma aba do `#vcMissionPatchForm`/Caminho A), com:
- Banner de risco sempre visível, sem botão de fechar (não-dismissable por construção — não existe control de dismiss).
- Campo único `target_path` + botão "Rodar Dry-Run" (desabilitado até preenchido) → 2º clique obrigatório "Confirmar dry-run em `<path>`"/"Cancelar" (mesmo padrão do GitHub PR) → só a confirmação dispara o `POST /api/agent/mission/queue` real.
- Ao enfileirar: polling a cada 2s (`GET /api/agent/mission/result/:mission_id`) com status "Executando... (Ns decorridos)"; botão "Cancelar acompanhamento" visível durante o polling — cancela só a UI (para de perguntar), deixa explícito que o job pode continuar rodando no servidor (sem endpoint de cancelamento remoto).
- Teto de 5min (`DRY_RUN_TIMEOUT_MS`): se não chegar resultado, para o polling e mostra mensagem de timeout, sem travar a UI.
- Integra com Atomic Core igual aos outros fluxos (`action` na confirmação, `startAtomicSequence()`, `resetAtomicCore()` sempre ao final — sucesso, erro, timeout, cancelamento).
- CSS segue a regra dura: `.vc-dry-run:not([hidden])` em vez de `display` direto.

**Validado 100% mockado via Playwright** (spec temporário, rodado e depois apagado — mesmo padrão das etapas anteriores desta frente, nenhum spec commitado): formulário desabilitado até `target_path` preenchido; confirmar/cancelar antes da 1ª chamada (cancelar não dispara `fetch`); sucesso (queue→poll pendente 404→poll resultado 200); erro real do agente (5xx no result); cancelamento pelo botão (sem novas chamadas depois, verificado por contagem de requests); **timeout real de 5min via `page.clock.fastForward('05:01')`** (sem esperar tempo real, disparando os timers reais do código de produção); painel escondido fora da aba Missions; e um cenário completo sob `reducedMotion:'reduce'` confirmando que o Atomic Core ainda reflete `action`→`idle` corretamente.

### Executar Missão — Caminho B, Fase 2b (`apply_patch`/`apply_patch_multi` via Vision Agent Local) — FAIL-CLOSED POR GOVERNANÇA (2026-07-08)

Implementação inicial no Next oficial (`frontend/vision-core-next.html` + `assets/vision-core-next-clean.{css,js}`): novo bloco `#vcAgentApplyForm` dentro de Missions para preparar payload JSON explícito de `apply_patch`/`apply_patch_multi`. A versão `v29` chegou a ser publicada com a ponte de POST mock-validada, mas a revisão de segurança identificou um bloqueio estrutural no backend atual: `/api/agent/mission/pending` consome uma fila global (`agentQueueDB.shift()`), sem `agent_id`, owner, projeto, token de pareamento ou binding explícito com o Vision Agent Local que deve executar a missão.

**Correção de governança aplicada em `v30`:** a UI permanece visível para documentar o fluxo e o payload esperado, mas `AGENT_APPLY_ENABLED=false` deixa o botão permanentemente desabilitado e exibe aviso de bloqueio. Mesmo com JSON válido e a frase exata `APLICAR PATCH REAL`, a UI não chama `/api/agent/mission/queue`. Isso evita que uma missão de escrita real seja capturada por qualquer agente conectado à fila global e aplicada no ROOT errado. Não faz push, não faz deploy, não escreve em disco e não gera commit local.

**Validação feita nesta etapa:** `node --check frontend/assets/vision-core-next-clean.js`; `node --check tests/e2e/vision-core-next-agent-apply.spec.mjs`; grep estático confirmou ausência de import do bundle legado e ausência de `innerHTML`/`insertAdjacentHTML`/`eval` nos arquivos Next tocados; `npx playwright test tests/e2e/vision-core-next-agent-apply.spec.mjs` — 3/3 PASS, cobrindo painel escopado em Missions, botão bloqueado, JSON/frase exata ainda sem POST e payload multi-arquivo também bloqueado. **Não houve execução real de patch, não houve chamada real ao Vision Agent Local e não houve commit local gerado pelo agente.**

**Deploys desta etapa:** `v29` foi publicado primeiro como pacote rastreado e verificado em `https://38fa4c85.visioncoreai.pages.dev`, mas foi superado pela revisão de segurança. A entrega operacional correta é `v30` fail-closed, publicada em `https://abd246de.visioncoreai.pages.dev`; verificação HTTP confirmou `next-clean-30` + aviso de bloqueio no hash e em `https://visioncoreai.pages.dev/vision-core-next.html` com cache-bust. Próxima ação obrigatória antes de liberar apply real: implementar binding backend por agente/projeto/owner e só então fazer smoke real em pasta descartável fora do repo.

### Continuação da Fase 2b — retomada de sessão interrompida do Codex (2026-07-08, `v31`)

Uma sessão do Codex (ferramenta externa) retomou o trabalho depois do `v30` (deploy real, confirmado ao vivo em produção com `AGENT_APPLY_ENABLED=false` — verificado via fetch direto do JS servido em `visioncoreai.pages.dev` nesta sessão), tentou avançar a Fase 2b de verdade, e bateu limite de uso no meio — deixando **working tree sujo, nada commitado**. A tarefa nominal do Codex era outra ("ajustar logo e decágono"), mas nada relacionado a isso apareceu no diff; o protótipo isolado `frontend/atomic-core.html`/`assets/atomic-core.*` (não oficial, fora dos arquivos Next protegidos) segue intocado e não foi tocado nesta retomada.

**O que o Codex implementou, real e funcional, sem estar commitado:**
- `backend/agent-queue-db.js`: `shiftForAgent(agentId)` — filtra a fila por `agent_id` em vez do `shift()` FIFO cego anterior.
- `backend/server.js`: `agent_id` normalizado/validado por regex; `apply_patch`/`apply_patch_multi` agora **exigem** `agent_id` (400 sem isso, antes não exigiam nada); `/mission/pending` filtra pela fila usando `shiftForAgent`.
- `backend/agent-local/index.js` + `frontend/downloads/vision-agent.js`: os dois binários do Vision Agent Local passaram a gerar um `agent_id` estável (`sha256(hostname+root).slice(0,12)`) e enviá-lo em heartbeat/resultado/polling.
- `frontend/vision-core-next.html` + `assets/vision-core-next-clean.{css,js}`: novo painel `#vcAgentApplyForm` — só que com **`AGENT_APPLY_ENABLED` virado de volta para `true`**, reabrindo localmente o gate que o `v30` tinha fechado por governança.

**Achado de segurança desta retomada — motivo de manter o gate fechado:** o `agent_id` **não autentica nada**. É um hash não-secreto (hostname+pasta, impresso no console do próprio agente ao iniciar) e nenhuma das rotas `/api/agent/mission/queue|pending|result` tem middleware de autenticação (confirmado por grep — chamadas diretas em `app.post`/`app.get` sem wrapper). Ou seja: qualquer chamador da API pública que souber ou adivinhar o `agent_id` de alguém consegue enfileirar um `apply_patch` real que o Vision Agent Local da vítima vai executar — escrita em disco + commit local — sem essa pessoa nunca ter tocado nesta UI. O filtro por `agent_id` só evita cross-talk *acidental* entre agentes na mesma fila global; não é uma barreira contra um chamador deliberado. Isso é exatamente o "token de pareamento por agente/projeto/owner" que o checkpoint do `v30` já apontava como pendência — o Codex implementou a metade de *filtro de fila*, não a metade de *autenticação*, e reabriu o gate mesmo assim.

**Correção aplicada nesta retomada:** `AGENT_APPLY_ENABLED` voltou para `false` (`frontend/assets/vision-core-next-clean.js`, comentado com o porquê). Bug real encontrado e corrigido separadamente: `refreshAgentApplyStatus()` (auto-preenche `#vcAgentApplyAgentId` a partir de `/api/agent/status`) estava **definida mas nunca chamada** — código morto, causa raiz dos 2 testes que apareciam falhando em `test-results/.last-run.json`. Agora é chamada ao entrar na aba Missions (`selectFeature`), igual ao padrão já usado para `resetAgentApplyConfirm()`/`resetDryRunConfirm()`. Texto de banner e do status de Missions atualizados para refletir o bloqueio real (motivo, não só "bloqueado"). As mudanças de backend (`agent-queue-db.js`/`server.js`/`agent-local/index.js`) foram mantidas — são estritamente mais seguras que o `shift()` cego anterior (que não filtrava `apply_patch` por ninguém) mesmo não resolvendo o problema de autenticação sozinhas, e ainda não foram deployadas no EB.

**Validado 100% mockado via Playwright** (spec temporário, reescrito para testar o estado fail-closed em vez do fluxo de POST real que o Codex tinha deixado, rodado e depois apagado — mesmo padrão de sempre, nenhum spec commitado): painel escopado em Missions/oculto fora dela; `agent_id` de um agente conectado realmente auto-preenche o campo (valida o fix do bug); JSON válido + `agent_id` + frase exata `APLICAR PATCH REAL` ainda assim mantém o botão desabilitado e zero `POST` — single-file e multi-file. 4/4 PASS. `node --check` limpo em todos os arquivos JS tocados (`server.js`, `agent-queue-db.js`, `agent-local/index.js`, `vision-core-next-clean.js`, `vision-agent.js`).

**Arquivos soltos de outras ferramentas encontrados no working tree, não relacionados a este trabalho, deixados intocados por decisão do usuário:** `AGENTS.md` (arquivo de contexto estilo OpenCode/Codex, desatualizado — §205/2026-06-27), `opencode.json` (config do OpenCode CLI), `frontend/_test_here.txt` (scratch trivial), `frontend/next.html` + `assets/vision-core-next.css/js` (protótipo antigo pré-"clean", não é o Next oficial), `frontend/atomic-core.html` + `assets/atomic-core.css/js` (protótipo isolado do decágono/Atomic Core — provavelmente a real origem da tarefa "ajustar logo e decágono" do Codex, mas nada nele parece quebrado). Nenhum desses foi tocado, commitado ou tem opinião formada sobre destino — decisão explícita do usuário foi deixar como está por ora.

**Cache-bust desta retomada:** `?v=next-clean-31` (bump a partir do `v30` real em produção — a cópia/comportamento do painel de agent-apply mudou mesmo com o gate continuando fechado). **Nenhum deploy foi feito nesta retomada** — só commit local; deploy de `v31` fica para quando o usuário aprovar.

### Padrão de trabalho desta sessão (seguir nas próximas)

Baseline → implementação pequena e isolada → validação técnica (Playwright, **incluindo contexto `reducedMotion:'reduce'` explícito sempre que animação estiver envolvida** — `null`/omitido não são "neutros", caem no valor real do SO do host) → commit isolado com cache-bust incrementado → relatório → só então próxima etapa. **Screenshot headless não é confiável para validar animação em voo** (frame exato de uma transição rápida frequentemente não é capturado, mesmo com o DOM confirmando a mudança via `getBoundingClientRect`/computed style) — usar `recordVideo` do Playwright + extração de frames via ffmpeg (o binário empacotado pelo próprio Playwright, em `~/AppData/Local/ms-playwright/ffmpeg-*/`) quando precisar confirmar visualmente um efeito rápido.

**Regra de continuidade:** quando a sessão estiver próxima do limite de contexto, registrar um resumo de continuidade neste `CLAUDE.md` antes de parar — incluindo o que falta, o que foi decidido, arquivos tocados, e qualquer risco de segurança identificado mas ainda não tratado.

### CHECKPOINT DE CONTINUIDADE — sessão encerrando por limite de contexto (2026-07-08)

Se você está lendo isto numa sessão nova: esta seção substitui a necessidade de reler o histórico de commits um por um. Leia isto primeiro, só vá em `git log`/`git show` se precisar do "porquê" de algo específico.

**Commits desta linha de trabalho, do mais antigo ao mais novo** (todos em `main`, nenhum revertido):
```
cdad2cd4  chore  baseline vision-core-next-clean (sem palpebras mortas)
5c5b9fe6  feat   pisca organico no olho (idle only)
4564afa7  feat   pisca no hover do logo (sidebar + hero)
43d7c624  fix    blink perceptivel (hold fechado + fade opacity)
9b1d2e50  fix    olho inteiro fecha + hover sobrevive a reduced-motion
0644a085  feat   chat funcional real (POST /api/chat)
1a2e4fc0  fix    Atomic Core glow sobrevive a reduced-motion + propagacao
──── ponto em que o Codex assumiu a sessão (atingiu limite de uso) ────
e8169793  chore  retoma trabalho do Codex (palpebras reais + SAFE READ)
7278c633  fix    restaura reduced-motion real + piscada ambiente (regressao do Codex)
53876e91  docs   Etapa 0 - checkpoint consolidado
236e5887  docs   risco aceito de token em localStorage
88b024f7  feat   anexos + leitura de imagem (Etapa 1b)
c1a55c03  feat   agentes/metricas/timeline/quota (Etapa 1b)
2bc7fab4  feat   vault/tools/obsidian leitura (Etapa 1b, fecha bloco FACIL)
ed886aa8  feat   GitHub PR com confirmacao dupla (Etapa 1c)
badcff08  feat   Executar Missao Caminho A / apply-patch seguro (Etapa 1d Fase 1)
──── nova sessão (2026-07-08), retomando a partir deste checkpoint ────
d09cd7b5  feat   Executar Missao Caminho B / sf_dry_run_real (Etapa 1d Fase 2a)
6f8b531e  docs   registra primeira chamada real da jornada
──── v29/v30 (Fase 2b) deployados direto do working tree, sem commit — Codex assume, bate limite ────
(novo)    fix    retoma Fase 2b do Codex: fecha gate AGENT_APPLY_ENABLED, corrige refreshAgentApplyStatus morto
```

**Cache-bust atual:** `?v=next-clean-31` (`frontend/vision-core-next.html`, CSS e JS na mesma versão — sempre incrementar os 2 juntos).

**Confirmação importante, vale para a sessão inteira (incluindo a sessão de 2026-07-08):** até a Fase 2a, as validações automatizadas foram **100% mockadas via `page.route()` do Playwright**. Em nenhum momento houve chamada real a GitHub (criação de PR), a um provider de LLM real (Anthropic/OpenRouter/etc.), ou ao Vision Agent Local dentro desses testes automatizados — o fluxo `sf_dry_run_real` só foi validado contra infraestrutura real depois, numa corrida manual explicitamente aprovada, descrita logo abaixo. A Fase 2b `v30` está fail-closed por governança: Playwright 3/3 PASS confirma que nem JSON válido + frase exata disparam POST enquanto o backend seguir com fila global sem binding por agente.

### PRIMEIRA CHAMADA REAL DA JORNADA — 2026-07-08 (quebra deliberada da premissa "tudo mockado")

Decisão explícita do usuário: testar `sf_dry_run_real` uma única vez contra infraestrutura de verdade (backend real + Vision Agent Local real), sem nenhum mock. Deploy do frontend `v28` (commit `d09cd7b5`) feito antes, só pra UI, via `bash bin/deploy-pages.sh` → hash `https://f749dcb4.visioncoreai.pages.dev`.

**O que foi real, sem nenhum mock:**
- `GET /api/agent/status` contra o gateway real, repetido até `connected:true` — mostrou o estado real de conexão do Vision Agent Local com o backend de produção (ficou `false` por ~51h até o usuário efetivamente iniciar o processo).
- Vision Agent Local (`frontend/downloads/vision-agent.js`) rodado de verdade em background nesta máquina, fazendo polling real em `/api/agent/mission/pending` no gateway real.
- Um Playwright **sem `page.route()`**, contra a página publicada (`f749dcb4.visioncoreai.pages.dev`), preenchendo o formulário de verdade e clicando os botões reais → disparou `POST /api/agent/mission/queue` real → `mission_id` real → polling real em `GET /api/agent/mission/result/:id` até resultado real vindo do agente.

**1ª tentativa (`target_path = C:\Users\imadechumbo\Desktop\vc-dry-run-test`) — bloqueada, achado confirmado do firewall §110:** o `ROOT` do Vision Agent Local **não é fixo** — é literalmente o argumento passado no `node vision-agent.js "<path>"` de inicialização. Como o processo foi iniciado com `ROOT = vc-dry-run-test` e o `target_path` da missão era a mesma pasta, `isSelfTargetForbidden()` (`vision-agent.js:814-831`) comparou `ROOT` com `target_path`, viu que eram idênticos, e bloqueou com `action:'sf_dry_run_blocked_self_target'` — **o guard funcionou exatamente como desenhado**, não foi bug. Regra confirmada em produção pra qualquer teste futuro: `target_path` da missão **nunca pode ser igual a, nem estar dentro de,** o `ROOT` (argv de inicialização) do Vision Agent Local que vai processá-la — são coisas semanticamente diferentes (projeto do agente vs. projeto-alvo do dry-run) e precisam ser pastas distintas.

**2ª tentativa (`target_path = C:\Users\imadechumbo\Desktop\vc-dry-run-target`, pasta distinta do `ROOT`) — sucesso, resultado real:**
```json
{
  "ok": true, "action": "sf_dry_run_listing", "files": 1,
  "output": "Estrutura do projeto-alvo (...vc-dry-run-target):\n  hello.txt",
  "log": ["Firewall: ✓ alvo liberado: ...", "Scanner: ✗ 1 arquivos, sem match"]
}
```
Firewall liberou o alvo (pasta distinta do `ROOT`), Scanner escaneou o diretório de verdade e listou exatamente `hello.txt` (único arquivo presente) — bate 100% com a realidade do disco. `askIA()`/LLM real **não foi chamado** nesta corrida, confirmando o achado anterior desta sessão: sem campo de descrição/`input` no payload (nosso formulário não expõe esse campo), `scanExternalProject()` nunca acha `scan.target`, e a missão sempre retorna no ramo `sf_dry_run_listing` antes de qualquer chamada de IA. Nenhum `apply_patch` ou segundo enfileiramento ocorreu.

**Encerramento:** processo do Vision Agent Local (PID local desta sessão) finalizado ao final do teste. Pastas de teste (`vc-dry-run-test/`, `vc-dry-run-target/`) e scripts temporários de validação não foram commitados — descartáveis, fora do repo/scratchpad.

**O que falta, em ordem de prioridade sugerida (não é decisão tomada — próxima sessão decide com o humano):**
1. **Executar Missão Fase 2b** (`apply_patch`/`apply_patch_multi` reais via Vision Agent Local) está fail-closed em `v30`: UI visível, botão bloqueado, Playwright 3/3 PASS confirma zero POST. Falta implementar binding backend por agente/projeto/owner antes de qualquer smoke real. Risco maior: escrita real em disco e commit local no ROOT do agente.
2. **Software Factory** (Auto-Pilot + modo avançado) — 12 endpoints mapeados na Etapa 1a, mais complexo por exigir recriar o loop de orquestração (hoje só existe no frontend legado, não pode ser importado).
3. **Vault-rollback** — ação destrutiva (sobrescreve `PROJECTS_DB`), mapeamento já encontrou um bug latente no legado (não restaura `users`/`providers` mesmo salvos no snapshot) — vale decidir se corrige o bug antes ou avisa o usuário do limite.
4. **Tools-apply-fix** (`/api/security/apply-fix`) — escreve em disco real com backup automático, risco menor que Vault-rollback mas ainda é escrita real.
5. **Settings/AI Provider Vault** (`/api/providers/save|delete|test`) — mexe com armazenamento de chave de API cifrada, precisa de UX própria (nunca expor chave completa, só mascarada).
6. **Autenticação/token** (`/api/auth/register|login`, OAuth Google/GitHub) — a mais sensível de todas, mexe com sessão de qualquer usuário; token é HMAC caseiro sem endpoint de refresh (expira em 24h fixo).
7. **Etapas 2-7 do roadmap maior** (Settings do Atomic Core — ligado/desligado, reduzir movimento, glow on/off, intensidade; Tutorial Smile; páginas públicas `about.html`/`landing.html`; specs; testes finais) — nenhuma delas foi sequer iniciada, ficam inteiramente para depois da Etapa 1 fechar.

**Risco de segurança revisado ao final desta sessão (nada novo além do já documentado nas seções acima):**
- Token em `localStorage`/`sessionStorage` (exposto a XSS) — já documentado como risco aceito, paridade com o legado, não regressão desta sessão.
- CORS aberto sem allowlist no backend — já documentado, comportamento pré-existente do legado, não mexido aqui.
- Toda renderização de texto vindo do backend (chat, diagnóstico de missão, resultado de PR, resultado das ações SAFE READ) usa `textContent`/`createTextNode`, nunca `innerHTML` com conteúdo não sanitizado — confirmado em cada commit desta sessão, sem exceção encontrada.
- Nenhum novo endpoint foi criado nesta sessão — só conexão a endpoints já existentes no backend.
- Nenhuma ação irreversível (GitHub PR, Vault-rollback, apply-fix, execução real via agente) foi conectada sem guard de confirmação explícita — as que foram conectadas (GitHub PR) têm dupla confirmação; as que não têm guard suficiente ainda (Vault-rollback, Tools-apply-fix, Executar Missão Fase 2) permanecem propositalmente desconectadas.

**Padrão de trabalho, confirmado válido para a próxima sessão seguir sem redescobrir nada** (já registrado em detalhe na seção "Padrão de trabalho desta sessão" logo acima): baseline → passo pequeno e isolado → validação Playwright mockada (incluindo `reducedMotion:'reduce'` explícito sempre que animação estiver envolvida, e `page.clock` para simular timeouts sem esperar tempo real) → commit isolado com cache-bust incrementado → atualizar CLAUDE.md → relatório → só então próxima etapa. Regra dura confirmada nesta sessão: `.vc-*:not([hidden])` em vez de `display:X` direto em qualquer painel condicional novo (bug real encontrado 2 vezes — GitHub PR e Mission Patch — mesma causa: CSS de autor sobrescreve o atributo `hidden` do HTML por especificidade igual).

### Roadmap Etapas 2-7 — PENDENTE, não implementar sem conversa nova

Paridade funcional alvo (mapeamento feito na Etapa 1a, implementação progressiva depois — ✅ = fechado): ✅ anexos/leitura de print (Etapa 1b), ✅ Agentes/Métricas/Timeline/Quota/Vault-leitura/Tools-leitura/Obsidian-leitura (Etapa 1b), ✅ GitHub PR com guard de confirmação dupla (Etapa 1c), ✅ Executar Missão Caminho A / apply-patch seguro (Etapa 1d Fase 1), ✅ Executar Missão Caminho B / `sf_dry_run_real` (Etapa 1d Fase 2a), ◐ Executar Missão Caminho B Fase 2b / `apply_patch` real via Vision Agent Local (UI fail-closed em `v30`, Playwright 3/3 PASS, zero POST até existir binding backend por agente — ver checkpoint específico acima). Pendentes: Software Factory Auto-Pilot + modo avançado, configurações avançadas do SF, Vault-rollback, Tools-apply-fix, Settings/AI Provider Vault, autenticação/token/quota real (plano pago depende de login funcionando), logs/status/estados de missão do SF.

Settings obrigatórios (Etapa 3): Atomic Core ligado/desligado, modo automático, reduzir movimento (override manual sobre o `matchMedia` real), glow on/off, intensidade visual (discreto/normal/ativo), persistência em `localStorage`.

Software Factory avançado (Etapa 2): provider/modelo, dry-run, execução real, auto-test, auto-fix, validação SDDF, Pass Gold, GitHub PR, branch alvo, repositório, autonomia, logs, rollback, permissões, limites, timeout, confirmação antes de ação crítica.

Tutorial Smile (Etapa 4): reaproveitar conteúdo/conceito do tutorial antigo sem importar UI antiga — modal minimalista, navegável, responsivo, botão em menu colapsável, ESC e X para fechar.

Páginas públicas/specs/testes finais (Etapas 5-7): registradas como pendência, sem detalhamento ainda — decisão de escopo fica para quando chegar a vez.

Mapa inicial de endpoints a conectar/verificar (referência para a Etapa 1a, não lista final):
- Chat livre: `/api/chat` (✅ conectado).
- Missão: `/api/chat` (mode:fix) + `/api/chat/apply-patch` (✅ conectados, Etapa 1d Fase 1 — Caminho A seguro). `/api/agent/mission/queue`+`/api/agent/mission/result/:id` pendentes (Caminho B, Fase 2 — ver checkpoint). `/api/copilot`/`/api/run-live` confirmados NÃO usados pelo fluxo real de missão (achado da Etapa 1a).
- Software Factory: `/api/sf/*`, jobs/polling e Gold Gate.
- Segurança: `/api/aegis/validate`, `/api/security/*`.
- Vault: `/api/vault/*`.
- GitHub: `/api/github/create-pr` (✅ conectado, Etapa 1c — guard de confirmação dupla).
- Memória/Timeline: `/api/memory/search`, `/api/archivist/learn`, `/api/mission/timeline`.
- Auth/Billing/Quota: `/api/auth/*`, `/api/billing/status`, `/api/mission/quota`.
- Métricas/Projetos/Deploy advisory: `/api/metrics/*`, `/api/projects`, `/api/deploy/pages`, `/api/deploy/eb`.

**Status deste checkpoint:** Etapa 0 fechada nesta sessão (2026-07-08) — regressões de acessibilidade encontradas e corrigidas antes de documentar (`e8169793` baseline + `7278c633` fix). Próxima etapa: Etapa 1a (mapeamento de paridade funcional, sem implementar), aguardando aprovação do usuário sobre por onde começar a Etapa 1b.

---

## PENDÊNCIAS IMEDIATAS / PRÓXIMA SESSÃO

1. **Fase 3.3d** (acima) — remoção final da página legada SF. Único item pendente da Fase 3.
2. **AI Provider Vault Fase D(b)** — conectar orquestrador ao vault (decisão de arquitetura em aberto).
3. **SF-Agent-Orchestrator Fase 2** — resolver cota de API antes de novo smoke test.
4. **Não há "Etapa G" nem "Fase 6" definida** em nenhuma linha de trabalho — qualquer próximo item exige conversa nova com o humano antes de assumir prioridade.

### Roadmap Enterprise/Segurança — nível atual 8.5/10, meta 9/10
Pendentes: §156 (multi-projeto isolamento real), §157 (Workers Dashboard), §158 (2FA TOTP), §160 (pentest OWASP ZAP) — specs em `docs/ENTERPRISE-SPEC.md` e `docs/PENTEST-CHECKLIST.md`.

### Pequenos itens não bloqueantes
- boto3 bloqueado por certificado SSL local (Windows) — mesma limitação histórica do node-gyp.
- `/api/health` retorna `version` hardcoded desatualizada (string cosmética, não afeta função).
- ~1580 arquivos aparecem "modified" no git status por ruído CRLF/LF (`core.autocrlf` inconsistente) — pré-existente, não prioridade corrigir.

---

## IDEIA REGISTRADA (sem implementação) — Atomic Core

Um dos 3 elementos oficiais de identidade visual. Diagrama orbital de agentes reinterpretado como átomo: CORE=núcleo, os 10 agentes=elétrons, órbitas=níveis de energia, execução de missão=transferência de energia. Máquina de estados conceitual: **IDLE** (95% do tempo, órbitas quase paradas, respiração/glow discretos, velocidades diferentes e nunca sincronizadas por agente) → **THINKING** (núcleo pulsa ao receber missão) → **EXECUTING** (propagação sequencial Hermes→PI Harness→OpenClaw→Scanner→Patch Engine→Aegis, partículas viajando nas conexões, agente ativo desloca-se 8-12px da órbita) → **COMPLETED** (pulso final, desaceleração suave, volta a IDLE).

**Performance:** só SVG + CSS transform/opacity + requestAnimationFrame. Nunca Three.js/Canvas/WebGL.

**Antes de implementar:** repetir o mesmo rigor da reconstrução do Vision Core Next — comparação visual, validação de identidade, revisão por etapas, `git diff` a cada passo, mudanças pequenas e verificáveis, nunca tudo de uma vez.

---

## PADRÃO DE REGISTRO — depoimentos e testes nas páginas públicas

Toda etapa grande concluída deve atualizar, além do código+testes, as duas páginas públicas que documentam a trajetória real do produto (prova pública de "produto testado, não prometido"):

**`frontend/about.html`:**
1. Seção "O QUE OS TESTES REVELARAM" — 1 card por descoberta real (bug + causa raiz + resolução), estilo depoimento técnico em 1ª pessoa, atribuído a `— §NNN, contexto, PASS/FAIL`.
2. Seção "POTENCIAIS DE EVOLUÇÃO" (roadmap numerado) — remover item quando implementado (renumerar restantes), mover pra "RESOLVIDO" em `landing.html`. Nunca deixar um item em ambos os lugares simultaneamente.

**`frontend/landing.html`:**
1. "TRANSPARÊNCIA TÉCNICA" — mover card de "EM EVOLUÇÃO" pra "RESOLVIDO — V2.9.10+" com endpoint(s) + certificação (nº de testes).
2. Tabela "TRAJETÓRIA REAL" — atualizar linha de versão com a entrega mais recente.
3. "ENTREGAS V2.9.10" — card novo se a etapa for grande o suficiente.

**Regra de ouro:** nunca documentar uma etapa como resolvida nas páginas públicas antes do teste automatizado correspondente passar localmente. Deploy via `bash bin/deploy-pages.sh "msg"` só depois disso.

---

*Histórico completo de sessões (§53 até §206+), com causa raiz/fix/evidência de cada bug, está em `CLAUDE_HISTORY.md`. Este arquivo é o estado atual — consulte o histórico só quando precisar entender o "porquê" de uma decisão já tomada.*
