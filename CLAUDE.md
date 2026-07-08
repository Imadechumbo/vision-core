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

**Achado não-bloqueante (Codex, mesma sessão):** `featureMap` ganhou campo `actions` (endpoints SAFE READ por feature) + `runFeatureAction()`/`renderFeatureActions()`, mas o código está incompleto — `featureActions` (variável DOM) nunca foi declarada e `#vcFeatureRun` não existe no HTML atual. Como nada chama `renderFeatureActions()`, é código morto/não executado — não quebra nada visível, mas não faz nada ainda. Decisão de completar ou remover fica para a Etapa 1.

**Risco de segurança aceito, não expandir escopo:** o token (`vc_token`/`vision_token`) fica em `sessionStorage`/`localStorage`, igual ao legado — exposto a roubo via XSS (qualquer script injetado no domínio lê o token diretamente, sem precisar de acesso a cookies `httpOnly`). Mitigação real seria migrar para cookie `httpOnly`+`secure`+`SameSite`, mas isso é mudança de arquitetura de auth no backend, fora do escopo desta frente Next — aceito como está, paridade com o comportamento já existente no legado, não uma regressão introduzida aqui.

### GitHub PR — implementado com guard de confirmação dupla (item 8 da paridade, Etapa 1c)

`POST /api/github/create-pr` (cria branch+commit+PR real — ação irreversível em serviço externo) agora tem uma UI própria dentro do painel "GitHub" (`#vcGithubPrForm`, abaixo do status SAFE READ), não no chat/chips. Nunca dispara sozinho: botão "Criar PR" fica desabilitado até `repo`+`branch`+`título` preenchidos (branch já vem com default `'main'`, editável); clicar não envia nada — só troca pra um segundo passo "Confirmar criação de PR em `<repo>`" + "Cancelar" (cancelar = zero requisições); só o clique em "Confirmar" dispara o `fetch` de verdade. Durante a requisição o botão vira "Criando PR..." desabilitado (guarda contra duplo-clique — testado, 1 clique rápido a mais durante o request não gera 2ª chamada). Sucesso mostra o link real do PR (`data.pr_url`) e limpa o formulário; erro (HTTP não-2xx ou rede) mostra mensagem legível no próprio formulário sem travar a UI, e reabilita o botão pro usuário tentar de novo.

**Achado de bug corrigido durante a validação:** `.vc-github-pr { display: grid; }` no CSS sobrescrevia o atributo `hidden` do HTML (mesma especificidade autor-vs-UA, autor vence) — o painel de PR aparecia mesmo com o GitHub não sendo a aba ativa. Corrigido trocando o seletor para `.vc-github-pr:not([hidden])`.

### Padrão de trabalho desta sessão (seguir nas próximas)

Baseline → implementação pequena e isolada → validação técnica (Playwright, **incluindo contexto `reducedMotion:'reduce'` explícito sempre que animação estiver envolvida** — `null`/omitido não são "neutros", caem no valor real do SO do host) → commit isolado com cache-bust incrementado → relatório → só então próxima etapa. **Screenshot headless não é confiável para validar animação em voo** (frame exato de uma transição rápida frequentemente não é capturado, mesmo com o DOM confirmando a mudança via `getBoundingClientRect`/computed style) — usar `recordVideo` do Playwright + extração de frames via ffmpeg (o binário empacotado pelo próprio Playwright, em `~/AppData/Local/ms-playwright/ffmpeg-*/`) quando precisar confirmar visualmente um efeito rápido.

**Regra de continuidade:** quando a sessão estiver próxima do limite de contexto, registrar um resumo de continuidade neste `CLAUDE.md` antes de parar — incluindo o que falta, o que foi decidido, arquivos tocados, e qualquer risco de segurança identificado mas ainda não tratado.

### Roadmap Etapas 2-7 — PENDENTE, não implementar sem conversa nova

Paridade funcional alvo (mapeamento feito na Etapa 1a, implementação progressiva depois — ✅ = fechado): ✅ anexos/leitura de print (Etapa 1b), ✅ Agentes/Métricas/Timeline/Quota/Vault-leitura/Tools-leitura/Obsidian-leitura (Etapa 1b), ✅ GitHub PR com guard de confirmação dupla (Etapa 1c). Pendentes: executar missão real (`/api/run-live`/`/api/copilot`, dual-path complexo), Software Factory Auto-Pilot + modo avançado, configurações avançadas do SF, Vault-rollback, Tools-apply-fix, Settings/AI Provider Vault, autenticação/token/quota real (plano pago depende de login funcionando), logs/status/estados de missão do SF.

Settings obrigatórios (Etapa 3): Atomic Core ligado/desligado, modo automático, reduzir movimento (override manual sobre o `matchMedia` real), glow on/off, intensidade visual (discreto/normal/ativo), persistência em `localStorage`.

Software Factory avançado (Etapa 2): provider/modelo, dry-run, execução real, auto-test, auto-fix, validação SDDF, Pass Gold, GitHub PR, branch alvo, repositório, autonomia, logs, rollback, permissões, limites, timeout, confirmação antes de ação crítica.

Tutorial Smile (Etapa 4): reaproveitar conteúdo/conceito do tutorial antigo sem importar UI antiga — modal minimalista, navegável, responsivo, botão em menu colapsável, ESC e X para fechar.

Páginas públicas/specs/testes finais (Etapas 5-7): registradas como pendência, sem detalhamento ainda — decisão de escopo fica para quando chegar a vez.

Mapa inicial de endpoints a conectar/verificar (referência para a Etapa 1a, não lista final):
- Chat livre: `/api/chat` (✅ conectado).
- Missão: `/api/copilot`, `/api/run-live`, `/api/agent/mission/queue`, `/api/agent/status`.
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
