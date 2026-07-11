# VISION CORE — CLAUDE.md
## Documento central do projeto | Atualizado: 2026-07-06 (Fase 3 em andamento — 3.3a+3.3b+3.3c fechados)

> **A PARTIR DE 2026-07-09: leia `docs/MASTER_SPEC.md` ANTES deste arquivo.** Consolidação arquitetural criou uma série de 10 documentos em `docs/` (`MASTER_SPEC.md` + `VISION_CORE_ARCHITECTURE.md`/`VISION_CORE_NEXT_FRONTEND_SPEC.md`/`VISION_CORE_BACKEND_SPEC.md`/`VC_SECRET_GUARD_RUST_SPEC.md`/`ATOMIC_CORE_SPEC.md`/`SOFTWARE_FACTORY_SPEC.md`/`UI_COMPONENT_LIBRARY.md`/`API_CONTRACT.md`/`ROADMAP.md`) que agora é a fonte de verdade de **arquitetura e vocabulário** (inclui um achado importante: o projeto tem duas camadas reais e distintas — produto/SaaS vs. governança interna de release — compartilhando nomes como `Hermes`/`PASS GOLD`/`Software Factory` com mecanismos diferentes; ver `VISION_CORE_ARCHITECTURE.md` seção "Duas Camadas"). Este `CLAUDE.md` e `docs/CURRENT_HANDOFF.md` continuam sendo a fonte de **estado operacional do dia-a-dia** — os dois não competem, cobrem coisas diferentes.
>
> **LEIA ESTE ARQUIVO COMPLETO ANTES DE QUALQUER AÇÃO.**
> Contém o estado real do projeto: o que está implementado, o que falta, o que NÃO deve ser tocado.
> Histórico técnico completo (causa raiz/fix/evidência de cada sessão passada) está em `CLAUDE_HISTORY.md` — consultar só para entender o "porquê" de algo já feito; não é leitura obrigatória.

---

## PROTOCOLO DE REVEZAMENTO ENTRE AGENTES (Codex / Claude Code / OpenCode)

**Vigente a partir de 2026-07-08.** Vision Core Next está sendo construído por múltiplos agentes revezando (cada um até seu próprio limite de uso), sem gate humano por etapa — o usuário só faz teste manual de aprovação no final. Isso só funciona se todo agente seguir isto:

1. **Antes de começar, leia nesta ordem:** `CLAUDE.md` (este arquivo) → `docs/VISION_CORE_NEXT_FRONTEND_SPEC.md` (o que construir e regras duras de UI) → `docs/CURRENT_HANDOFF.md` (o que o agente anterior estava fazendo agora mesmo). Os três juntos substituem reconstruir contexto lendo `git log` inteiro.
2. **Ao terminar uma etapa OU antes de bater o limite de uso, atualize os três arquivos.** `docs/CURRENT_HANDOFF.md` é obrigatório mesmo em parada abrupta — é o único documento que garante que o próximo agente não perde o fio. Se o processo for interrompido sem aviso, o handoff pode ficar desatualizado; o agente seguinte deve tratar isso como sinal de alerta, não como ausência de trabalho.
3. **Toda tarefa pequena termina com:** arquivos alterados, testes feitos (comando + resultado), pendências, e o próximo comando recomendado (literal, copiável). **Commit sempre.** Nunca deixar a working tree suja entre tarefas, nunca deployar código que não foi commitado antes — essa combinação foi a causa raiz do incidente de 2026-07-08 (Codex reabriu `AGENT_APPLY_ENABLED` localmente, sem commit, e o gate ficou sem rede de segurança até a próxima sessão auditar o diff à mão).
4. **Gates de segurança só mudam com aprovação do usuário registrada por escrito em `docs/CURRENT_HANDOFF.md`.** Isso vale para `AGENT_APPLY_ENABLED` e qualquer flag equivalente que decida entre leitura segura e escrita/execução real. `tests/e2e/vision-core-next-agent-apply.spec.mjs` é a trava de regressão desse gate especificamente — é o único spec desta frente que é permanente e commitado (todos os outros specs de validação seguem o padrão "roda e apaga"); ele **deve continuar passando em todo handoff**, e se um agente precisar tocá-lo, o motivo tem que estar explícito no handoff.

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
SESSION_SECRET                # obrigatório após INCIDENTE-4 — assina/valida sessões; sem fallback em produção
PROVIDER_VAULT_SECRET         # configurado no §206 — cifra o AI Provider Vault (ver checkpoint abaixo)
HOTMART_HOTTOK                # PENDENTE — não configurado ainda (§150)
AWS_S3_BUCKET=vision-core-data-prod   # PENDENTE de reaplicar (§146)
```

**Fallback de LLM (`callLLM()`):** OpenRouter → Anthropic → Groq → DeepSeek → Gemini → Cerebras (corrigido no §206 — `OPENAI_API_KEY` nunca existiu em produção). Todas as 27 env vars reais (chaves de LLM/OAuth/Stripe/Hotmart) foram migradas integralmente na recriação do EB (§206) — não listadas aqui por serem segredos.

**vc-secret-guard `verify-cloud` (2026-07-10, WIP):** comando Rust read-only criado para auditar metadados de env vars do EB (`PROVIDER_VAULT_SECRET`, `SESSION_SECRET`, `JWT_SECRET` legado e variáveis de segurança correlatas), sem imprimir valores, prefixos, hashes ou amostras. Testes locais Rust passam; verificação viva do EB está bloqueada por falha TLS/trust store local da AWS CLI. Não usar `--no-verify-ssl`; corrigir TLS primeiro e rerodar o comando.

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
- Execution Monitor + Mission Timeline + Métricas reais (não mockadas). Next `next-clean-57`+`next-clean-58`+`next-clean-59`: aba Métricas conecta agentes, DORA, runtime summary, memory layer e agent status com gráficos nativos (barra/donut/gauge/sparkline/timeline); safe-read de Agentes/Tools/Security mostra visualização no painel contextual e não despeja JSON bruto como experiência principal, com toggle "Ver JSON bruto" diagnóstico (`next-clean-58`). Software Factory (`#vcSfFinalViz`) e Security Lab (`#vcSafeStatusViz`) também ganharam gráficos nativos no `next-clean-58` — donut DONE/FAIL/BLOCKED + duração por etapa + gauge de progresso no SF, donut/gauge/timeline de cobertura no Security Lab. **`next-clean-59` corrigiu bug de produção real**: `next-clean-57`/`58` nunca tinham sido deployados (produção ainda em `next-clean-56`) — além disso, um bug de layout genuíno foi encontrado e corrigido: `#vcComposer` (`position:sticky`) sobrepunha visualmente `#vcFeaturePanel`/`#vcFeatureViz` assim que o painel ficava alto o bastante (os gráficos novos); fix isola `#vcChatStream`+`#vcFeaturePanel` numa rolagem própria (`.vc-chat-scroll`, novo) e `showFeatureViz()` faz `scrollIntoView` do gráfico após renderizar — ver `docs/CURRENT_HANDOFF.md` para o detalhe completo e a prova por teste (revert-and-reproduce) de que o teste novo captura a regressão. Regra registrada em `VISION_CORE_NEXT_FRONTEND_SPEC.md`: toda métrica estruturada tem gráfico, texto complementa, JSON bruto só atrás de toggle. Core Interaction Principle (chat-first) auditado e fechado — nenhum painel (Factory/Vault/Métricas/Tools/GitHub/Security/Settings) esconde o chat; Mission Input separado foi removido da arquitetura Next e o composer/chat principal é a única entrada de missão.
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

### SPEC OFICIAL — Vision Core Next Frontend

A especificação completa do novo front paralelo está em `docs/VISION_CORE_NEXT_FRONTEND_SPEC.md`.

**Regra:** antes de qualquer edição nos arquivos Next, leia a SPEC e este CLAUDE.md.

**Arquivos do Next:**
- `frontend/vision-core-next.html` — entrada
- `frontend/assets/vision-core-next-clean.css` — CSS
- `frontend/assets/vision-core-next-clean.js` — JS
- `frontend/atomic-core.html` — protótipo Atomic Core
- `frontend/assets/atomic-core.css`
- `frontend/assets/atomic-core.js`

**Não tocar:** `frontend/index.html`, `vision-core-bundle.*`, backend, worker gateway, endpoints destrutivos.

Regras absolutas desta fase:
1. Não fazer deploy sem aprovação manual explícita.
2. Não fazer commit que misture escopos — commits isolados por mudança coesa e revertível.
3. Não importar `vision-core-bundle.css`/`vision-core-bundle.js`.
4. Não reaproveitar layout/HTML legado como base de código — pode ler para mapear funções, nunca importar ou colar estrutura.
5. Não tocar em `frontend/index.html` nem nos bundles legados sem autorização explícita.
6. Endpoints que escrevem em disco, criam PR, aplicam patch, fazem deploy, rodam execução real ou gastam API real exigem confirmação/guard claro antes de conectar.
7. Função ainda não conectável com segurança vira placeholder que falha de forma VISÍVEL ("não implementado ainda") — nunca finge sucesso nem falha silenciosamente.

### Política de herança visual — legado como referência, Next como implementação

Catálogo completo em `docs/LEGACY_DESIGN_REFERENCE.md` (tela por tela: Métricas, Agentes, Software Factory, Landing, About — o que herdar, o que o Next já tem equivalente, o que está bloqueado). Resumo da política: o legado (`frontend/index.html` + `vision-core-bundle.js`) é **fonte de referência visual/UX apenas** — proibido copiar código dele (regra 4 acima já cobria isso; o doc formaliza o porquê, incluindo o achado do `vc-secret-guard` de uma credencial hardcoded real nesse bundle, destino ainda pendente com o usuário). Nenhuma feature nova nasce no legado — regra anti-novo-legado: se o Next precisa de algo que só existe lá, o caminho é reimplementar no Next, nunca linkar/embedar/estender o legado. Divergência consciente do Next em relação ao legado é permitida, desde que registrada no doc com o quê e o porquê.

### SPEC OFICIAL — vc-secret-guard (Rust)

Nova feature oficial (2026-07-09). Núcleo local de detecção rápida de secrets/vazamentos, binário Rust independente do go-core, rodando na máquina do desenvolvedor (pre-commit/pre-push/watch) — motivado por 2 incidentes reais do projeto (token GitLab exposto em `git remote -v`; `agent_secret` vazando via endpoint público, ver seção "Pareamento por `agent_secret`" abaixo).

Especificação completa em `docs/VC_SECRET_GUARD_RUST_SPEC.md` — leia antes de qualquer trabalho nesta linha. Define: arquitetura real do projeto (Node `server.js`=gateway, `go-core`=safe core com Aegis, frontend Next, `vc-secret-guard`=quarta peça nova), a decisão "Rust vs módulo do go-core" com fronteira de responsabilidade explícita (guard=detecção em tempo real local; go-core Aegis=validação/remediação supervisionada de código já em missão — sem sobreposição), categorias de detecção (nunca lista fixa de strings), limites de segurança (nunca transmite o valor do secret), e plano de 6 fases (0=spec; 1=protótipo local; 2=hooks; 3=watch+evento JSON; 4=integração `server.js`/Next; 5=ponte `PASS SECURE`) — cada fase com gate próprio, nenhuma fase além da autorizada explicitamente por sessão.

**Fase 1 (protótipo local) — AUTORIZADA E FECHADA (2026-07-09).** Crate `vc-secret-guard/` real, independente (sem workspace compartilhado), só o comando `scan` implementado (`watch`/`install-hooks`/`report`/`policy` são stubs que imprimem "planejado" e saem com código 2, nunca fingem sucesso). 43/43 testes PASS localmente (`cargo test` — CI ainda sem toolchain Rust, ver `docs/CURRENT_HANDOFF.md`). Dogfood contra o próprio repo Vision Core: **nenhum secret real novo encontrado** — achado real e deliberadamente não-suprimido, deixado para decisão humana: `frontend/assets/vision-core-clean-runtime.js:6301,6323` tem uma senha hardcoded `'vc-user-auto'` (fluxo de conta demo automática no bundle legado público — já era 100% público antes desta sessão, comportamento pré-existente, não uma regressão). Dois bugs reais de regex corrigidos durante o dogfood: `provider_key_prefix` era genérico demais (batia em identificadores comuns tipo `pos-render...`), `connection_string` não excluía interpolação de variável de CI/shell (`${GITLAB_TOKEN}` no próprio `.github/workflows/mirror-to-gitlab.yml` — falso positivo, não o incidente real de `git remote -v` que motivou a feature). Allowlist raiz (`.vc-secret-guard.toml`) reduziu ruído de 25657→1408 achados; os 1406 restantes são todos `high_entropy_blob` (identificadores de código camelCase, confirmado por amostragem manual em `backend/server.js`, não secrets) — heurística de entropia contra código-fonte real de linguagens com identificadores longos é imprecisa por natureza, não é um gate "zero falso-positivo" literalmente fechado, é um resultado honesto e documentado (ver HANDOFF).

**Fase 1.5 (refinamento de detecção) — AUTORIZADA E FECHADA (2026-07-09).** Duas evidências reais motivaram: a forma exata da credencial do INCIDENTE-3 (`x.getItem(...) || 'literal'`) não batia em nenhuma heurística da Fase 1, e a imprecisão de `high_entropy_blob` contra identificadores de código (achado acima) não tinha sido endereçada. Entregue: categoria nova `fallback_credential_literal` (4 formas — `||`/`??`/ternário-else/parâmetro-default — com sinal de contexto de credencial exigido em código, nunca em conteúdo de string); `high_entropy_blob` restrito a posição de valor (string literal ou lado direito de `=`/`:`) e penalizado por forma de identificador (sem dígito + segmentos pronunciáveis, `y` conta como vogal, abreviação até 4 chars aceita sem vogal). Dogfood, mesma allowlist, zero entrada nova: `high_entropy_blob` 1410→53 (96,2% — meta de <50 não batida honestamente, reportado sem forçar supressão; breakdown exato dos 53 em `docs/CURRENT_HANDOFF.md`). 57/57 testes PASS (era 43/43). **Dois achados reais no dogfood, não corrigidos (fora de escopo, backend intocado):** `backend/server.js` tem `SESSION_SECRET || 'vision-core-dev-session-secret-change-me'` assinando TODOS os tokens de sessão (register/login/OAuth) — `SESSION_SECRET` não aparece na tabela de env vars do EB acima, não verificável a partir deste repo se está configurado em produção; se não estiver, é um INCIDENTE-4 candidato, ação pendente do usuário. `backend/data/users.json` está commitado no git (desde §48) com `password_hash` real de uma conta de teste — resíduo local antigo, não dado de produção (S3 é a fonte de verdade), mas tecnicamente um hash de senha no histórico público, decisão de limpeza pendente do usuário. **Fase 2 (hooks locais) só começa com nova aprovação explícita do usuário** — não presumir autorização em bloco.

### Atomic Core — APROVADO E CONFIRMADO PELO USUÁRIO (protegido, não redesenhar sem autorização explícita)

Comportamento real atual (verificado no código, não presumido): SVG + CSS/JS leve, sem Canvas/Three.js/WebGL. `data-state="idle"|"action"` em `[data-atomic-core]` (instância única no DOM, sem duplicação hero/sidebar). Idle automático no load; Action automático via chat (`startAtomicSequence()` no submit). Propagação sequencial de glow durante a espera — Hermes → PI Harness → OpenClaw → Scanner → Patch Engine → Aegis, 1.8s por agente, em loop até `resetAtomicCore()` (chamado em todo fim de ciclo: sucesso, erro, timeout). Glow individual por agente funcional mesmo sob `prefers-reduced-motion` real (`Agent.prototype.values()` retorna glow base 24/idle vs 42/action mesmo com órbita congelada — a órbita para, o glow continua sinalizando estado). `window.AtomicCoreNext = {setState, highlight, reset}` é a API pública; `window.startAtomicSequence`/`stopAtomicSequence` completam o ciclo do chat.

**Achado desta sessão, já corrigido:** durante uma sessão do Codex (que atingiu limite de uso), a detecção de `prefers-reduced-motion` foi substituída por um parâmetro de URL (`?reduce=1`) e o guard do loop `requestAnimationFrame` foi removido — regressão de acessibilidade real (a máquina do usuário tem reduced-motion ligado no SO; o app parou de respeitar isso de verdade, embora parecesse igual em teste visual normal). Corrigido no commit `7278c633`: `matchMedia('(prefers-reduced-motion: reduce)')` real restaurado, guard do rAF restaurado. Configuração (ligado/desligado, intensidade) ainda não existe — é a Etapa 3 pendente (ver Settings obrigatórios abaixo).

**Correção de direção de produto (2026-07-09, v48) — INVERTE o acoplamento do `v47` acima:** decisão explícita do dono do produto — "a animação do Atomic Core é IDENTIDADE VISUAL, o SO não deve degradar a experiência por padrão; o VC tem controle próprio de acessibilidade". `reduceMotion` não lê mais `matchMedia` diretamente — fonte de verdade agora é `window.VCMotion` (`getMode`/`isReduced`/`setMode`/`onChange`, backed by `localStorage['vc_animation_mode']`, `'full'|'reduced'`, default `'full'` sempre, mesmo com o SO em reduce). Controle exposto em **Settings → Animações** (`#vcAnimationReduced`), troca o modo ao vivo sem reload via `startMotionLoop()`/`stopMotionLoop()` reinvocáveis. O pulso sutil de opacidade/glow do `v47` continua sendo o fallback visual do modo reduzido (nunca congelado) — só a fonte de verdade mudou, não o visual do modo reduzido em si. Dica única de primeira visita (se o SO reporta reduce e o usuário nunca escolheu um modo no VC) aponta para o Settings — única outra leitura direta de `matchMedia` no arquivo, e só para decidir se mostra o aviso, nunca para decidir o que animar. Detalhe completo em `docs/CURRENT_HANDOFF.md`. **O blink do olho/logo abaixo NÃO foi tocado por esta mudança** — continua lendo `matchMedia` diretamente, fora do escopo desta correção (área protegida, exige aprovação separada).

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

**Validado 100% mockado via Playwright** (spec reescrito para testar o estado fail-closed em vez do fluxo de POST real que o Codex tinha deixado — decisão sobre commitar ou não este spec, ver subseção própria abaixo): painel escopado em Missions/oculto fora dela; `agent_id` de um agente conectado realmente auto-preenche o campo (valida o fix do bug); JSON válido + `agent_id` + frase exata `APLICAR PATCH REAL` ainda assim mantém o botão desabilitado e zero `POST` — single-file e multi-file. 4/4 PASS. `node --check` limpo em todos os arquivos JS tocados (`server.js`, `agent-queue-db.js`, `agent-local/index.js`, `vision-core-next-clean.js`, `vision-agent.js`).

#### Verificação de exposição pública (após a retomada acima, antes de decidir sobre deploy)

Preocupação levantada: os deploys `v28`/`v29`/`v30` fizeram `cp -r frontend/*` — será que os arquivos soltos de outras ferramentas (`next.html`, `atomic-core.html`, `_test_here.txt`, `assets/atomic-core.{css,js}`, `assets/vision-core-next.{css,js}`) foram parar em produção?

**Achado metodológico antes do resultado:** checar isso por *conteúdo* (fetch + perguntar "o que tem nessa página") dá falso positivo — Cloudflare Pages deste projeto não tem `_redirects` nem `404.html`, então **qualquer path que não exista devolve HTTP 200 com o conteúdo de `index.html`** (confirmado testando um path propositalmente inventado, que devolveu o mesmo conteúdo/tamanho que `/index.html`). Isso inclui `/downloads/vision-agent.js`, que também cai nesse fallback — não é bug, é o `rm -rf "$DEPLOY_DIR/downloads"` do próprio `deploy-pages.sh` funcionando (o download real do agente é servido por outra rota, fora do escopo desta verificação). A ferramenta `Bash` deste ambiente não tem rota de rede (`curl`/`git fetch` por HTTPS falham com erro de conexão); `PowerShell` tem rede real e foi usada para todas as checagens HTTP desta sessão via `Invoke-WebRequest -Method Get` comparando **status code + `Content-Length` + `Content-Type`**, não o texto da página.

**Resultado:** nenhum dos arquivos soltos jamais respondeu com conteúdo próprio — todos batiam exatamente no tamanho/`Content-Type` de `index.html` (fallback), tanto antes quanto depois do deploy do `v31`. **Nada indevido esteve público.** Único achado à parte: `frontend/.cfpagesignore` (continha só `downloads/`) **não é um mecanismo real do Cloudflare Pages/Wrangler** — o nome correto é `.cloudflareignore`/`.assetsignore` (confirmado via busca; não achado nenhuma documentação da Cloudflare para `.cfpagesignore`). A exclusão de `downloads/` que sempre funcionou neste projeto vem inteiramente do `rm -rf "$DEPLOY_DIR/downloads"` explícito no script, não do arquivo de ignore — ele é vestígio inerte, deixado como está (não é escopo desta sessão remover documentação morta pré-existente).

#### Saneamento do pacote de deploy — decisão

Duas opções discutidas: mover os protótipos pra fora de `frontend/` (ex. `prototypes/` na raiz) vs. excluir explicitamente no script de deploy. **Escolhido: exclusão explícita em `bin/deploy-pages.sh`** (linhas `rm -f` logo após o `rm -rf "$DEPLOY_DIR/downloads"` já existente), não mover arquivos nem usar `.cfpagesignore`. Motivo: (1) `.cfpagesignore` não faz nada de verdade (achado acima) — usá-lo teria sido repetir o mesmo erro do `agent_id` do Codex, um mecanismo que parece resolver o problema mas não resolve; (2) mover arquivos exige reescrever referências relativas dentro deles e decidir uma convenção nova de pasta, mudança maior que o pedido; (3) `rm -f` no script é o mesmo padrão já comprovado (e testado ao vivo nesta sessão) que a própria linha do `downloads/` usa — menor diff, mecanismo já confiável, zero reestruturação de repositório. Trade-off aceito e registrado: só cobre os nomes de arquivo conhecidos hoje — um novo debris solto com nome diferente numa sessão futura não seria pego automaticamente por isso; não vale generalizar agora (YAGNI) sem um segundo incidente confirmando o padrão.

#### Deploy do `v31` — feito

`bash bin/deploy-pages.sh` não pôde rodar via `Bash` (sem rede nesta sessão); o mesmo pipeline (copiar `frontend/*` → remover `downloads/` + os 7 arquivos soltos → `wrangler pages deploy`) foi reproduzido manualmente via `PowerShell` com rede real, batendo com o script (que já está corrigido para produzir o mesmo resultado da próxima vez que rodar direto). Deploy: `https://176af831.visioncoreai.pages.dev`. Verificado depois, com `Invoke-WebRequest` real (status+tamanho, não conteúdo interpretado):
- No hash novo e no alias principal (`visioncoreai.pages.dev`): todos os 6 paths soltos (`/next.html`, `/atomic-core.html`, `/_test_here.txt`, `/assets/atomic-core.css`, `/assets/vision-core-next.css`, `/downloads/vision-agent.js`) continuam batendo no fallback de `index.html` — nada de diferente do que já era antes do deploy (não havia nada pra "substituir", ver achado acima).
- Alias principal `visioncoreai.pages.dev/vision-core-next.html` e `/assets/vision-core-next-clean.js` confirmam `next-clean-31` e `AGENT_APPLY_ENABLED = false` ao vivo.

#### Spec de teste — decisão consciente de convenção: `tests/e2e/vision-core-next-agent-apply.spec.mjs` vira **permanente e commitado**

Quebra deliberada do padrão "spec temporário, roda e apaga" usado em toda a frente Next até aqui. Motivo: este spec não valida uma feature qualquer, valida **que um gate de governança de segurança continua fechado** (`AGENT_APPLY_ENABLED=false`) — exatamente o tipo de coisa que, se ficasse só em memória de sessão, poderia ser reaberta silenciosamente nas próximas edições sem ninguém notar (foi literalmente o que aconteceu: o Codex reabriu, sem intenção maliciosa, só editando código sem essa rede de segurança). Um spec commitado funciona como trava de regressão contra exatamente esse cenário. Esta é a única exceção à convenção "spec temporário" registrada até agora — segue temporário para toda validação que não guarda uma decisão de governança/segurança.

**Confirmação sobre a contagem de testes (3 vs. 4):** o `v30` original (deploy real, o primeiro fail-closed) foi validado por uma versão do spec com **3 testes**, escrita pelo Codex antes de reabrir o gate — essa versão nunca foi commitada e não existe mais (era temporária, igual ao padrão da época). Depois, ainda na mesma sessão não-commitada do Codex, o gate foi reaberto e o spec foi **reescrito para 4 testes** assumindo o fluxo de fila real (`single-file`/`multi-file` completando com sucesso) — essa é a versão de 4 testes com 2 falhando que a retomada encontrou (`refreshAgentApplyStatus()` nunca chamada). A retomada corrigiu o bug, fechou o gate de novo, e **reescreveu o spec do zero** — coincidentemente também com 4 testes (`escopo/oculto`, `auto-preenche agent_id`, `bloqueado single-file`, `bloqueado multi-file`), mas testando o estado fail-closed, não o de fila aberta. Ou seja: os "3" e os dois conjuntos de "4" são três autorias diferentes em momentos diferentes, não a mesma suíte editada incrementalmente — o número 4 atual é coincidência de cobertura, não herança do código quebrado do Codex.

#### `git push` — feito

`origin` (GitHub, remoto oficial) estava 22 commits à frente localmente e 1 commit atrás (`f96cca5d`, `ci: auto-update CI-LAST-RUN + RESULTS [skip ci]`, bot do GitHub Actions, sem sobreposição de arquivo com qualquer coisa tocada nesta linha de trabalho). Rebase local limpo sobre `origin/main`, sem conflito, sem force-push. Push concluído.

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

**Cache-bust atual:** ?v=next-clean-45 (frontend/vision-core-next.html, CSS e JS na mesma versao -- sempre incrementar os 2 juntos).

### CHECKPOINT DE CONTINUIDADE -- OpenCode -> Codex, Software Factory Next v33 (2026-07-08)

OpenCode iniciou a proxima fatia do front paralelo em frontend/vision-core-next.html + frontend/assets/vision-core-next-clean.js/css: a sidebar Software Factory agora abre uma secao propria #factory, escondendo o chat, com composer e Auto-Pilot inicial em 5 passos (mission-composer, deploy-blueprint, project_templates, mission_composer, worker_handoff). O cache-bust foi para next-clean-33.

Codex retomou do ponto interrompido e fechou a validacao local sem rede real: node --check frontend/assets/vision-core-next-clean.js, node --check tests/e2e/vision-core-next-agent-apply.spec.mjs, node --check tests/e2e/vision-core-next-sf.spec.mjs, e npx playwright test tests/e2e/vision-core-next-agent-apply.spec.mjs tests/e2e/vision-core-next-sf.spec.mjs => 6/6 PASS.

Bug real corrigido na retomada: .vc-sf-stage { display:grid } fazia o atributo HTML hidden perder efeito. Fix aplicado em frontend/assets/vision-core-next-clean.css: .vc-sf-stage:not([hidden]) { ... }. Regra reforcada: qualquer painel condicional novo no Next deve usar seletor :not([hidden]) quando o CSS define display.

Governanca mantida: AGENT_APPLY_ENABLED=false continua fechado. Apply real via Vision Agent Local segue bloqueado ate existir pareamento/autorizacao real por agente/projeto/owner; agent_id sozinho nao autentica ninguem. Nenhum backend, legado, deploy script ou pagina publica foi tocado nesta retomada. Nenhum deploy feito: a SPEC atual exige aprovacao manual explicita para publicar.

### CHECKPOINT DE CONTINUIDADE -- Software Factory Next v34 (2026-07-08)

Codex continuou a fatia do SF Next adicionando Modo Avancado minimo e seguro no painel #factory: botoes Auto-Pilot/Modo Avancado, provider, modelo, Dry-run e PASS GOLD. A mudanca nao cria endpoint, nao toca backend e nao habilita execucao real. Cada etapa SF envia sf_options com mode/provider/model/dry_run/pass_gold e flags explicitas real_execution_allowed=false, deploy_allowed=false, writes_disk=false.

Validacao local sem rede real: node --check frontend/assets/vision-core-next-clean.js; node --check tests/e2e/vision-core-next-sf.spec.mjs; grep estatico sem innerHTML/insertAdjacentHTML/eval, sem cache-bust antigo e sem gates reabertos; npx playwright test tests/e2e/vision-core-next-agent-apply.spec.mjs tests/e2e/vision-core-next-sf.spec.mjs => 7/7 PASS. Novo teste cobre Modo Avancado com endpoints mockados e confirma que as flags de escrita/deploy/execucao real seguem falsas.

### CHECKPOINT DE CONTINUIDADE -- Software Factory Next v35 (2026-07-08)

Codex adicionou log/status compacto do SF Next: #vcSfLog inicia hidden, aparece somente durante geracao e registra SAFE real_execution_allowed=false deploy_allowed=false writes_disk=false, modo/provider/modelo, endpoint+module por etapa, DONE/FAIL por modulo. Tudo renderizado com textContent/createElement, sem HTML dinamico.

Bug real encontrado pelo E2E: .vc-sf-log { display:grid } e .vc-sf-progress { display:flex } sobrescreviam o atributo hidden, a mesma classe de problema ja vista em paineis condicionais. Fix aplicado com .vc-sf-log:not([hidden]) e .vc-sf-progress:not([hidden]). Regra reforcada: qualquer componente condicional novo que declare display no CSS deve usar :not([hidden]).

Validacao local sem rede real: node --check frontend/assets/vision-core-next-clean.js; node --check tests/e2e/vision-core-next-sf.spec.mjs; grep estatico sem innerHTML/insertAdjacentHTML/eval, sem !important, sem cache-bust antigo e sem gates reabertos; npx playwright test tests/e2e/vision-core-next-agent-apply.spec.mjs tests/e2e/vision-core-next-sf.spec.mjs => 7/7 PASS.
### CHECKPOINT DE CONTINUIDADE -- Software Factory Next v36 (2026-07-08)

Codex fechou a fatia de preview final do SF Next: #vcSfFinal nasce hidden, aparece somente ao fim do Auto-Pilot/Modo Avancado, e mostra o contexto final consolidado em <pre> usando apenas textContent. Nao ha download, clipboard, escrita em disco, endpoint novo, deploy automatico ou chamada real extra; permanece somente a leitura do resultado mockado/retornado pelos endpoints SF ja chamados.

Seguranca/governanca mantida: sf_options continua enviando real_execution_allowed=false, deploy_allowed=false e writes_disk=false; AGENT_APPLY_ENABLED segue fail-closed. CSS do painel usa .vc-sf-final:not([hidden]) para nao repetir o bug de hidden sobrescrito por display.

Validacao local sem rede real: node --check frontend/assets/vision-core-next-clean.js; node --check tests/e2e/vision-core-next-sf.spec.mjs; grep estatico sem innerHTML/insertAdjacentHTML/eval, sem !important, sem cache-bust antigo e sem gates reabertos; npx playwright test tests/e2e/vision-core-next-agent-apply.spec.mjs tests/e2e/vision-core-next-sf.spec.mjs => 7/7 PASS. O teste novo confirma #vcSfFinal hidden no inicio e visivel com conteudo final apos Auto-Pilot e Modo Avancado.

**Confirmação importante, vale para a sessão inteira (incluindo a sessão de 2026-07-08):** até a Fase 2a, as validações automatizadas foram **100% mockadas via `page.route()` do Playwright**. Em nenhum momento houve chamada real a GitHub (criação de PR), a um provider de LLM real (Anthropic/OpenRouter/etc.), ou ao Vision Agent Local dentro desses testes automatizados — o fluxo `sf_dry_run_real` só foi validado contra infraestrutura real depois, numa corrida manual explicitamente aprovada, descrita logo abaixo. A Fase 2b `v30` está fail-closed por governança: Playwright 3/3 PASS confirma que nem JSON válido + frase exata disparam POST enquanto o backend seguir com fila global sem binding por agente.

### Pareamento por `agent_secret` — validação real + extensão pra pending/result (2026-07-08, commits `a4fcbaea`..)

Sessão anterior implementou `POST /api/agent/register` real + gate de `agent_secret` em `/mission/queue` (`apply_patch`/`apply_patch_multi`), mas nunca rodou contra um backend de verdade — só revisão de código. Esta sessão fechou essa lacuna e estendeu a cobertura, conforme pedido explícito do usuário.

**Validação real, backend local (porta 8099, sem tocar EB nem AWS):** `server.js` sobe limpo sem credenciais S3 (bucket vazio por padrão, pula o load). Bateria completa via `curl` contra o processo real:
- `POST /api/agent/register` 2x → `agent_id`/`agent_secret` distintos em cada chamada, confirmado.
- `POST /mission/queue` com `type:apply_patch`: secret errado → 401, secret ausente → 401, secret de **outro** agente registrado contra este `agent_id` → 401 (prova que não é "qualquer secret válido serve", é o par certo), secret correto → 200 + `mission_id`.
- Mesma bateria em `GET /mission/pending` (poll) e `POST /mission/result`: idêntico — impostor com `agent_id` alheio nunca lê nem escreve sem o secret certo; dono real sempre consegue.
- Missão sem dono (`sf_dry_run_real`/`general`, sem `agent_id`) continua 100% anônima em todos os três endpoints — comportamento pré-existente preservado, não regrediu.

**Achado de segurança real durante a própria validação** (não hipotético — apareceu no primeiro teste manual): `POST /mission/result` fazia `{...body, received_at: now()}` no `storeResult`, o que gravava `agent_secret` **dentro do resultado armazenado** — e `GET /mission/result/:id` é público, sem autenticação nenhuma. Ou seja: o secret vazava de volta pra qualquer um que soubesse o `mission_id` assim que o agente legítimo postasse um resultado. Corrigido destruturando `agent_secret` fora do body antes de persistir (`const { agent_secret, ...safeBody } = body`). Confirmado por reteste: `agent_id` aparece no resultado lido de volta (inofensivo), `agent_secret` não aparece mais.

**Extensão pra `/mission/pending` e `/mission/result`:** mesmo padrão do `/mission/queue` — se o chamador reivindica um `agent_id`, precisa provar posse com `agent_secret` (401 `agent_pairing_required` sem isso); chamadas sem `agent_id` nenhum continuam anônimas, sem mudança de comportamento pra missões sem dono.

**Achado que quase virou regressão:** nenhum dos dois binários do agente (`backend/agent-local/index.js`, `frontend/downloads/vision-agent.js`) enviava `agent_secret` no poll/result antes desta sessão — só registravam e guardavam a credencial, sem usá-la de fato nas chamadas subsequentes. Sem esse fix, todo agente já pareado ficaria **permanentemente 401'd em qualquer poll** (mesmo missões anônimas) assim que este backend fosse ao ar, porque `agent_id` sempre é enviado mas o secret nunca era. Corrigido nos dois arquivos: `agent_secret` agora vai junto em `/mission/pending` e `/mission/result`.

**Decisão de design — persistência de `agentPairings` (Map em memória, não passa pelo SQLite do `agentQueueDB`):** ficou **em memória mesmo**, não movida pra SQLite/S3 nesta sessão. Motivo: `AGENT_APPLY_ENABLED` continua `false` — nada em produção depende disso ainda, e implementar sync S3 sem conseguir testar contra AWS de verdade neste ambiente reintroduziria o mesmo tipo de risco que o bug do secret vazado acima (código não testado contra a infra real que ele deveria proteger). Em vez disso, implementado e **validado ao vivo** o comportamento operacional esperado pós-restart/redeploy: cada binário do agente, ao levar 401 no poll, apaga sua credencial local (`.vc-agent-credentials.json`, arquivo ao lado do script) e chama `/api/agent/register` de novo automaticamente — self-healing, sem intervenção humana. Testado literalmente matando e subindo o `server.js` de novo (simulando redeploy) com um agente já pareado rodando: detectou o 401, reregistrou sozinho, novo `agent_id`/`agent_secret` gerados e persistidos. **Consequência a saber:** `agent_id` muda a cada redeploy do EB — se o gate algum dia for ligado e um humano tiver copiado um `agent_id`/`agent_secret` antigo pra UI, precisa copiar de novo do console do agente após qualquer redeploy.

**Testes:** suíte Playwright de sempre (`vision-core-next-agent-apply.spec.mjs` + `vision-core-next-sf.spec.mjs`) — 8/8 PASS, sem mudança necessária (contrato do lado do browser não mudou, só backend + binários do agente). Validação do backend em si foi manual via `curl` contra processo real local (não existe framework de teste automatizado pra `server.js` neste repo — confirmado na sessão anterior, `server.js` não expõe `module.exports`, só roda como script; padrão da casa pra esse arquivo é `node --check` + revisão + smoke manual, não suíte automatizada).

### `vision-core-next-sf.spec.mjs` vira permanente + fecha o gap de cobertura conhecido (2026-07-08)

Decisão pendente do handoff anterior: manter esse spec permanente (como o `agent-apply`) ou deixar temporário. **Decisão: permanente**, mesmo critério do `agent-apply` mas por um motivo diferente — não guarda um gate de segurança, guarda uma superfície (Software Factory) sendo construída em múltiplas sessões por agentes diferentes (Codex/OpenCode/Claude Code) **sem revisão humana por etapa**. Nessas condições um spec permanente é a única rede de segurança contra regressão entre handoffs; specs temporários fazem sentido quando uma sessão humana revisa o resultado antes do próximo passo, o que não é o caso aqui. Critério registrado pra decisões futuras equivalentes: permanente quando (a) guarda um gate de segurança OU (b) é superfície ativa de relay multiagente sem review por etapa; temporário no resto.

**Gap fechado:** 2 dos 3 testes que exercitam geração (Auto-Pilot, Modo Avançado) mockavam o `POST /api/sf/*` respondendo direto com `{ok:true, content:...}` — o backend real nunca faz isso, sempre responde `{job_id, status:'pending'}` e exige `GET /api/sf/job/:id` (`server.js:4430`). O frontend trata os dois formatos (código defensivo), mas testar só o formato que nunca acontece de verdade é cobertura enganosa — foi exatamente esse tipo de lacuna que escondeu o bug `/api/sf/jobs` vs `/api/sf/job` numa sessão anterior. Os 3 testes de geração foram reescritos pra usar `job_id`+polling (extraído num helper `mockAsyncSfEndpoints`), mantendo as asserções específicas de cada um (Auto-Pilot: progress "05", `calls[0]` com `autopilot:true`; Modo Avançado: `sf_options` completo, log com `provider=groq`). 4/4 PASS depois da reescrita, 8/8 com o `agent-apply` junto.

### Software Factory: PASS GOLD deixa de ser cosmético + 2º achado de contrato no mesmo endpoint (2026-07-08, `v38`)

Continuando o roadmap (pendência 3 do handoff — "Software Factory completo"): o checkbox "PASS GOLD" no painel `#factory` já existia e já mandava `sf_options.pass_gold:true`, mas **nunca chamava `/api/sf/gold-gate`** — era metadado sem efeito. `SF_STEPS` (array fixo de 5 passos) virou base pra um `sfActiveSteps` calculado por execução: quando `pass_gold` está marcado (é o padrão do HTML), um 6º passo (`SF_GOLD_GATE_STEP`, módulo `gold_gate`, `POST /api/sf/gold-gate`) é anexado; desmarcado, a Auto-Pilot roda só os 5 de sempre. `updateSfProgress`/`nextStep` passaram a referenciar `sfActiveSteps` em vez da constante `SF_STEPS`. Endpoint já existia e já seguia o mesmo padrão `job_id`+polling dos outros (`server.js:4422-4440`), reuso total do `pollSfJob` existente — nenhum código novo de rede, só a entrada na lista de passos.

**2º achado de contrato verificado direto no código, não assumido (mesma disciplina do achado `/api/sf/jobs` vs `/api/sf/job`):** `GET /api/sf/job/:id` faz `result: job.result.result` — ou seja, **desembrulha** um nível: `job.result` é `{module, result:<texto>, provider}` (o retorno de qualquer `SF_GENERATORS[key]`), e o campo `result` da RESPOSTA HTTP já é o texto puro, não um objeto. `files` só é populado por um endpoint totalmente diferente (`/api/sf/project-files`, §187) — nenhum dos 4 passos do Auto-Pilot/Gold Gate (`mission-composer`, `deploy-blueprint`, `worker-handoff`, `gold-gate`) jamais retorna `.files`. Os mocks do spec (herdados de antes, com `{ok:true, content:...}`/`{ok:true, files:[...]}`) **nunca refletiam isso** — funcionavam só porque `sfExtractReadable()` no frontend tem fallbacks defensivos pra várias formas. Corrigido: mocks agora devolvem `result` como string pura, igual à resposta real; `deploy-blueprint` não simula mais `.files` (nunca acontece pra esse endpoint).

**Testes:** spec reescrito com esses dois achados juntos — `mockAsyncSfEndpoints` agora recebe texto puro por endpoint, não objetos. Casos novos: Auto-Pilot completo roda 6 passos com PASS GOLD marcado (padrão), progress mostra "06 — Validar PASS GOLD", final inclui o veredicto; caso separado confirma que desmarcar PASS GOLD mantém 5 passos e **nunca chama `/api/sf/gold-gate`** (`route.abort()` se chamado, viraria falha de rede visível). 5/5 PASS no spec SF, 9/9 com `agent-apply`. `node --check` limpo em `server.js` (não tocado, só lido) e `vision-core-next-clean.js`. Cache-bust `v38`. Nenhum deploy feito.

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
1. **Executar Missão Fase 2b** (`apply_patch`/`apply_patch_multi` reais via Vision Agent Local): pareamento real por `agent_secret` implementado E validado contra um backend local rodando de verdade (`POST /api/agent/register`, gate 401 em `/mission/queue` + `/mission/pending` + `/mission/result` — os três, mesmo padrão). Bônus encontrado nessa validação: vazamento de `agent_secret` através do resultado armazenado, corrigido. `agentPairings` continua em memória (não SQLite/S3) por decisão explícita — self-healing implementado e testado no lugar (agente detecta 401, reregistra sozinho). Ver checkpoint "Pareamento por `agent_secret` — validação real..." acima e `docs/CURRENT_HANDOFF.md` para o detalhe completo. `AGENT_APPLY_ENABLED` continua `false`: mecanismo técnico pronto não decide sozinho ligar o gate, isso exige aprovação explícita do usuário registrada no HANDOFF. Único item restante antes de considerar isso "pronto": ainda não foi deployado no EB nem testado contra AWS/S3 real.
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

Settings obrigatórios (Etapa 3): Atomic Core ligado/desligado, modo automático, ✅ reduzir movimento (implementado 2026-07-09 como `window.VCMotion`/`#vcAnimationReduced` — não é mais "override sobre o `matchMedia` real", é a fonte de verdade sozinha, default `'full'` independente do SO — ver seção "Atomic Core — APROVADO" acima), glow on/off, intensidade visual (discreto/normal/ativo), persistência em `localStorage`.

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


### Software Factory Next v45 -- 4 etapas extras opcionais (2026-07-08)

Continuando a pendencia "Software Factory completo" pelo caminho mais seguro: foram conectados apenas os 4 endpoints SF que ja usam o mesmo contrato assíncrono dos passos existentes (`POST /api/sf/<step>` -> `{job_id}` -> `GET /api/sf/job/:id`): `context-snapshot`, `patch-validator`, `risk-assessor`, `rollback-planner`. Eles entram como checkboxes opcionais em `#factory`; por padrao ficam desligados, entao o fluxo antigo continua 5 passos + PASS GOLD. Quando marcados, entram antes do PASS GOLD e herdam as mesmas travas de governanca em `sf_options`: `real_execution_allowed:false`, `deploy_allowed:false`, `writes_disk:false`.

**Contrato verificado antes de codar:** `backend/server.js` registra esses 4 nomes dentro de `SF_GENERATORS` e expõe `Object.keys(SF_GENERATORS).forEach` em `/api/sf/:key`; o poll correto continua singular (`/api/sf/job/:id`). Nenhum backend, legado, deploy script, pagina publica ou gate do Vision Agent foi tocado. `AGENT_APPLY_ENABLED=false` continua fail-closed.

**Testes:** `node --check frontend/assets/vision-core-next-clean.js`, `node --check tests/e2e/vision-core-next-sf.spec.mjs`, varredura `rg` para `innerHTML/outerHTML/insertAdjacentHTML/eval/AGENT_APPLY_ENABLED=true/real_execution_allowed:true/deploy_allowed:true/writes_disk:true/!important`, e `npx playwright test tests/e2e/vision-core-next-agent-apply.spec.mjs tests/e2e/vision-core-next-sf.spec.mjs` => 10/10 PASS. Cache-bust `v45`. Nenhum deploy feito.

### Auditoria da retomada de v39-v45 (Codex) — 2 achados reais corrigidos antes de continuar (2026-07-08)

Sincronização (push do commit local `9bdbed49`, sem conflito, rebase limpo sobre 1 commit de bot CI) e auditoria de segurança/contrato dos commits `783243aa`..`9bdbed49` (Etapas 0-8 do plano de ondas). Achados:

**1. `preview-server.mjs` nunca interceptava nada — spec de Apply-Fix sem cobertura real do submit.** A Etapa 7 (Apply-Fix) criou `tests/e2e/preview-server.mjs`, um servidor HTTP local próprio servindo `frontend/` em `localhost:3001` com um mock hardcoded pra `/api/security/apply-fix`. Só que `apiRequest()` em `vision-core-next-clean.js` sempre chama a URL absoluta fixa do gateway de produção (`API_BASE_URL`), nunca um caminho relativo à origem de onde a página foi servida — então esse servidor local nunca era alcançado pelo fetch real, e o mock virou código morto. O spec original (`vision-core-next-apply-fix.spec.mjs`, marcado "Temp spec... Deletar após confirmar que passa em CI") nunca tinha um teste que de fato clicasse no botão de confirmação final — exatamente a ação de escrita real em disco, a parte mais perigosa da feature, ficou sem cobertura nenhuma. Corrigido: spec reescrito no padrão já estabelecido (`pathToFileURL` + `page.route()` contra o gateway real), agora com casos de sucesso (payload real verificado) e erro (404) no submit; `preview-server.mjs` removido (nada mais dependia dele). Virou **permanente** — mesmo critério dos outros dois specs: escrita real em disco, único freio é confirmação dupla (sem kill-switch tipo `AGENT_APPLY_ENABLED`), construído em relay sem revisão humana por etapa.

**2. Duas chamadas de rede reais vazando de toda a suíte permanente, uma delas pré-existente.** `vision-core-next.html` dispara `pollAgentStatus()` (badge do agente, Etapa 1/B-4, `startAgentPolling()` incondicional no load) e `loadQuotaBadge()` (badge de quota, de uma sessão bem anterior — `/api/mission/quota`, "item 16 da Etapa 1a") **sem gate nenhum**, em toda carga de página. Nenhum dos 3 specs permanentes mockava as duas rotas em todo teste — `vision-core-next-sf.spec.mjs` (5 testes) não mockava nenhuma das duas; `vision-core-next-agent-apply.spec.mjs` só cobria `/api/agent/status` (não `/api/mission/quota`). Confirmado empiricamente (não assumido): um listener `page.on('request')` provisório capturou os 2 hits reais contra `visioncore-api-gateway.weiganlight.workers.dev` numa carga de página comum, antes do fix. Isso significa que a garantia "100% mockado, nenhuma chamada real" registrada em várias sessões passadas **não era inteiramente verdadeira** desde que o badge de quota foi criado — ninguém tinha percebido porque um request não-mockado não derruba o teste, só vaza silenciosamente. Corrigido: `test.beforeEach` mockando as duas rotas nos 3 specs; reverificado com o mesmo listener — zero requests não interceptadas depois do fix.

Nenhum outro problema encontrado na auditoria: todos os endpoints novos (`/api/providers/save|test|delete`, `/api/vault/rollback/:snapshotId`, `/api/security/apply-fix`, os 4 `SF_GENERATORS` extras) batem com o `server.js` real, contratos verificados antes de codar (confirmado por leitura, não só pela palavra do commit). Todas as travas de segurança (`AGENT_APPLY_ENABLED`, `real_execution_allowed`, `deploy_allowed`, `writes_disk`) continuam `false`. `docs/CODEX_PROMPT.md` (novo, criado pelo Codex como prompt de continuação condensado) duplica conteúdo que já vive em `docs/CURRENT_HANDOFF.md` — não é um problema de segurança, só um risco de ficar desatualizado como o `AGENTS.md` antigo já ficou; não removido nesta auditoria, só anotado.

17/17 PASS na suíte permanente completa (4 agent-apply + 6 sf + 7 apply-fix) depois dos dois fixes.

### Modo acelerado — verificação dos B-1..B-6 + conexão de `fetch-url` (v46, 2026-07-09)

Sessão com autorização em bloco pra executar as ondas restantes do plano sem checkpoint intermediário. Como B-4/B-5/B-6/B-2/B-3/B-1 já tinham sido implementados pelo Codex (auditados na sessão anterior, ver checkpoint acima), o trabalho real desta sessão foi: (1) verificação funcional mais profunda de cada um (além da checagem de contrato/segurança já feita), (2) conectar `/api/sf/fetch-url`, o mais simples dos 3 endpoints SF que ainda faltavam.

**Verificação funcional dos 6 itens (nenhum problema novo encontrado):** `parseHermesBlock` — `hermesObj===null` (texto livre ou JSON malformado) confirmado como nunca quebrando a UI, `parsed.hermesObj && (...)` sempre curto-circuita pro branch seguro, e o hint nunca auto-executa nada (só navega pra Missions). Badge do agente — `document.hidden` pausa o polling de verdade, sem animação a gatear (dot estático, só muda cor). AI Provider Vault — zero `localStorage`/`sessionStorage` tocando `api_key`, UI só exibe `api_key_masked` vindo do backend (`server.js:1981`). Vault Rollback — fluxo pending→confirm real. Missions History — estados vazio/carregando/erro todos presentes como texto real, não CSS escondendo undefined.

**`fetch-url` conectado:** campo "Contexto de URL (opcional)" no composer do `#factory` (Auto-Pilot e Modo Avançado compartilham). Contrato reconfirmado antes de codar (`server.js:4485-4520` — síncrono, sem `job_id`, `{ok, content, url}` direto). Texto buscado vira prefixo de `sfFullContext`, incluído como `full_context` a partir do 2º passo da missão — reuso do mecanismo já existente pro contexto acumulado entre passos, nenhum código novo de propagação. Leitura, não escrita — sem confirmação dupla, só desabilita o botão durante o fetch. 3 testes novos (URL inválida nunca chama o endpoint; sucesso com contrato real verificado + `full_context` confirmado no payload; erro de rede não trava a missão). 20/20 PASS na suíte permanente completa. Cache-bust `v46`.

**Decisão de parar aqui:** os 2 endpoints SF restantes (`project-files`, `generate-zip`) exigem um padrão de UI genuinamente novo (download de blob binário — `generate-zip` devolve um ZIP, não JSON) e uma lógica de payload mais pesada (`project-files` ramifica por complexidade em prompts longos, resultado em `data.files[]` em vez de `data.result`). Em vez de arriscar deixar isso pela metade no fim do orçamento de contexto do turno, a sessão fechou aqui com os contratos já verificados e documentados no HANDOFF, prontos pra próxima sessão implementar direto sem re-descoberta.

`docs/PARITY_AUDIT.md` atualizado: 9 grupos migrados de (b) pra (a2) (Apply-Fix, 4 passos extra de SF, `fetch-url`, mais os 4 que o Codex já tinha migrado antes — badge, provider vault, rollback, missions/evidence, hermes hint). Categoria (b) real agora tem só 2 itens: Auth (não iniciado, mais arriscado do roadmap) e os 2 endpoints SF encadeados restantes. Estimativa honesta caiu de ~6-7 turnos pra ~3-4.

### Deploy de sincronização CF Pages (v46) + achado de produção: Atomic Core congelado sob reduced-motion (2026-07-09)

Usuário autorizou deploy de sincronização (frontend só, EB explicitamente fora) — `v46` foi ao ar em `https://12cdec6e.visioncoreai.pages.dev` + alias principal, travas verificadas ao vivo no JS servido (`AGENT_APPLY_ENABLED`/`real_execution_allowed`/`deploy_allowed`/`writes_disk` todos `false`). **Nota de transcrição, não bug:** o usuário citou um hash diferente (`cd2b1f83`) como "inválido" num teste seguinte — esse hash nunca existiu (confirmado 404 real), o hash que eu de fato reportei (`12cdec6e`) resolve normalmente (200). Provável erro de digitação/cópia ao repassar o hash, não falha de deploy.

**Achado real em teste manual do usuário em produção:** Atomic Core 100% congelado no load (esperado: animação idle contínua). Causa raiz: `if (!reduceMotion) raf = window.requestAnimationFrame(frame);` — o loop de animação **nunca começava** quando `prefers-reduced-motion: reduce` está ativo no SO do usuário (fato já documentado neste arquivo em sessões anteriores: a máquina do usuário tem isso ligado). Sem o loop, `render()` só rodava 1x no load e novamente em transições de estado (início/fim de missão) — entre esses eventos, o widget inteiro (posição + glow + opacidade) ficava estático, lido como "quebrado", não "calmo". `Agent.prototype.values()` já tinha lógica correta pra congelar SÓ posição/escala sob reduced-motion (glow variava por estado) — o problema era que nada disparava um novo `render()` durante o período ocioso.

**Fix:** `Agent.prototype.values()` no branch `reduceMotion` agora computa um pulso lento de opacidade/glow (`REDUCE_PULSE_MS = 4200`, seno sobre `elapsed`, sem tocar `angle`/`radius`/`scale` — zero deslocamento, só "respiração" visual). Bootstrap ganhou um `else` no lugar do antigo `if (!reduceMotion) raf = ...`: sob reduced-motion, em vez de rAF (60fps, evitado de propósito por causa de deslocamento/vestibular), um `setTimeout` recorrente a cada `REDUCE_TICK_MS = 500ms` chama `render()` só pra aplicar o pulso — bem mais barato que rAF, longe de "animação contínua" no sentido que dispara enjoo, mas suficiente pra nunca ficar 100% parado.

**Achado de teste, independente do bug do produto:** `test.use({ reducedMotion: 'reduce' })` sozinho **não é confiável pra página `file://`** — confirmado empiricamente (`matchMedia().matches` voltava `false` mesmo com a opção setada). Isso explica por que uma validação anterior (sessão bem mais antiga, specs temporários já apagados) nunca pegou esse bug: só testava o path "reduce" superficialmente e nunca confirmou de verdade que a emulação estava ativa, nem testava "no-preference" pra comparar. Corrigido usando `page.emulateMedia({ reducedMotion })` explicitamente ANTES de `page.goto()` — registrado como regra dura nova na SPEC (item 9).

**Novo spec permanente:** `tests/e2e/vision-core-next-atomic-core.spec.mjs` (nenhum spec cobria Atomic Core antes) — 3 testes: no-preference anima posição continuamente; reduce mantém posição 100% congelada mas glow/opacidade muda ao longo do tempo; reduce ainda reflete transição de estado idle→action→idle sem quebrar. 23/23 PASS na suíte permanente completa (4 specs). Cache-bust `v47`.

### INCIDENTE-3 — credencial de fallback legada em auth (2026-07-09, Fase B fechada)

Terceira ocorrência real de exposição de credencial no projeto (mesma classe dos incidentes 1 — token GitLab em `git remote -v` — e 2 — `agent_secret` vazando via `GET /mission/result/:id`, ver seção "Pareamento por `agent_secret`" acima) e a primeira **detectada pela própria feature** `vc-secret-guard`: o dogfood da Fase 1 flagrou o mesmo literal como `credential_field` em `vision-core-clean-runtime.js` (fork abandonado, sem tráfego real), achado que motivou a investigação (Fase A) que confirmou o mesmo literal também no bundle real carregado por `index.html` — validação concreta do investimento na ferramenta, não uma auditoria manual isolada como as duas anteriores.

**O que era:** `frontend/index.html` carrega `frontend/assets/vision-core-bundle.js` (bundle legado real). Nesse bundle, `doAuth()` usava a credencial de fallback pública legada (§145) como senha quando não havia senha salva localmente para o email — tanto no registro quanto no login, com um retry final de login reenviando esse mesmo valor. `backend/server.js` reconhecia o literal no registro (§145, convertia silenciosamente para senha aleatória) e não tinha bloqueio nenhum contra ele no login — qualquer conta antiga cujo `password_hash` tivesse sido gerado a partir desse literal (antes do §145) continuava autenticável com ele.

**Investigação (Fase A, read-only, 2026-07-09):** classificação **(a) ATIVA** — o bundle real em produção ainda enviava o literal, e o backend ainda o aceitava nos dois pontos. Sem evidência de privilégio administrativo (sessão sempre plano `free`), mas credencial pública acionando fluxo autenticado real. Fluxo reconstituído passo a passo, histórico git e opções de remediação em `docs/CURRENT_HANDOFF.md`, seção "INCIDENTE-3".

**Fix (Fase B, aprovação explícita do usuário, mesma sessão):**
1. `backend/server.js`: `/api/auth/register` e `/api/auth/login` rejeitam explicitamente o literal com 400 `fallback_credential_rejected` (antes: conversão silenciosa no registro, aceitação direta no login). Cada rejeição é auditada via `auditLog` (categoria+rota+timestamp, nunca o valor).
2. `frontend/assets/vision-core-bundle.js`: diff cirúrgico removendo o envio do literal — sem senha salva, o frontend agora envia string vazia (o backend já gera senha aleatória para esse caso, comportamento preexistente) e o retry final de login com o literal foi removido. `doAuth()` só roda em click/Enter do modal de auth, nunca no load da página raiz — confirmado antes da mudança.
3. **Runbook para contas legadas em produção — AÇÃO PENDENTE DO USUÁRIO** (não executável a partir deste repo, que não acessa dados de produção): `tools/incident-3-legacy-account-scan.mjs <users.json> [--invalidate]` identifica contas cujo `password_hash` autentica com o literal (via a mesma lógica scrypt/pbkdf2 do backend) e, com `--invalidate`, substitui o hash por um segredo aleatório novo desconhecido (gera backup antes de sobrescrever). Procedimento completo (pré-condição/comando/resultado esperado/rollback) em `docs/CURRENT_HANDOFF.md`.
4. Regressão permanente: `tools/tests/incident-3-auth-fallback.test.mjs` (12/12 PASS, mesmo padrão de `tools/tests/provider-vault-endpoints.test.mjs` — sobe `backend/server.js` real). Prova (i) register rejeita o literal com 400, (ii) login não autentica um hash legado seedado a partir dele, (iii) o valor nunca aparece na resposta HTTP nem no audit log.
5. `vc-secret-guard scan` (Passo 4 de verificação): o literal já não aparecia em `vision-core-bundle.js` como *finding* estruturado antes desta sessão (a forma `x.getItem(...) || 'literal'` não bate com as heurísticas de `credential_field`/`high_entropy_blob` — só foi achado por leitura manual/`rg`, Fase A) — confirmado por busca literal que as 7 ocorrências em `vision-core-bundle.js` viraram 0. `vision-core-clean-runtime.js` (fork abandonado, fora de escopo desta Fase B) mantém as 2 ocorrências originais, sem mudança — esperado. Zero entrada nova em `.vc-secret-guard.toml`, zero mudança de código no `vc-secret-guard` em si.

**Deploy: PENDENTE de decisão do usuário.** Nada foi deployado nesta Fase B (nem backend/EB, nem CF Pages) — regra dura da sessão. Enquanto o backend em produção não receber este fix, a rejeição não está ativa lá: o literal extraído de cache/histórico/CDN antigo continua funcionando contra o endpoint real até o deploy do **backend** acontecer — o deploy do bundle é secundário nesse sentido, quem efetivamente fecha a porta é o backend.

### INCIDENTE-4 — SESSION_SECRET com fallback público (2026-07-09, Fase B Opção A)

Quarta ocorrência real da mesma classe de risco: segredo/fallback sensível presente no código. Fase A confirmou que `signSession()` e `verifySession()` usavam fallback público simétrico quando `SESSION_SECRET` não estava setado, permitindo forjar sessão HMAC para qualquer `uid` real conhecido. Severidade alta se o EB estivesse sem `SESSION_SECRET`.

**Fix aprovado pelo usuário (Opção A — fail-closed):**
1. `backend/server.js`: `SESSION_SECRET` agora é obrigatório no boot via `requireSessionSecret()`. Ausente, igual ao fallback público conhecido, ou menor que 32 bytes → processo não sobe. `signSession()`/`verifySession()` usam somente o segredo validado em memória.
2. `backend/.env.example`: documenta `SESSION_SECRET` como variável real obrigatória de auth/session; `JWT_SECRET` fica marcado como legado/não usado por `backend/server.js`.
3. Testes/launchers locais que sobem backend real recebem `SESSION_SECRET` de teste/local explícito (`tools/tests/incident-3-auth-fallback.test.mjs`, `tools/tests/provider-vault-endpoints.test.mjs`, `tools/local-backend-runtime-launcher.mjs`, `tools/pi-harness.mjs`).
4. Regressão permanente: `tools/tests/incident-4-session-secret.test.mjs` prova fail-closed para ausência/fallback público/segredo curto e boot OK com segredo forte explícito.

**Operação:** `SESSION_SECRET` forte configurado no EB `vision-core-prod` em 2026-07-09 sem imprimir o valor. Verificado depois: `SESSION_SECRET_PRESENT_STRONG`, EB `Ready/Green`, Worker e EB direto com `/api/health` 200. Rotacionar/definir esse segredo invalida sessões ativas; esperado e correto.

**Validação complementar em produção (2026-07-09):** o ZIP EB `v109-725cfdcb71973b03963a7adcb43e3888b1808c58` contém os guards do INCIDENTE-3 e INCIDENTE-4. `POST /api/auth/login` com a credencial de fallback legada retorna `400 fallback_credential_rejected` via Worker e EB direto, sem token e sem ecoar o valor. `POST /api/auth/register` ficou pendente de revalidação viva porque probes malformados consumiram temporariamente o rate limit de registro; o guard de register está confirmado no artefato publicado e coberto pela regressão local permanente.

**Deploy CF Pages complementar (2026-07-09):** após aprovação do usuário via "continue", o bundle legado limpo foi publicado em `https://5859bb89.visioncoreai.pages.dev` e no alias principal `https://visioncoreai.pages.dev`. Verificação pública pós-deploy: `INDEX_CONTAINS_FALLBACK=false` e `BUNDLE_CONTAINS_FALLBACK=false` no preview e no alias principal. O backend já rejeitava o valor; este deploy fechou a exposição residual no arquivo público.

### Software Factory Advanced — Arquiteto visual (`next-clean-55`, 2026-07-11)

Modo Avançado do Software Factory evoluído sem backend novo: interpreta a missão do composer/chat principal com heurística local determinística, sugere stack a partir de catálogo declarativo, permite aceitar/editar/rejeitar tecnologias no grafo, mostra warnings de compatibilidade, matriz de agentes com críticos REQUIRED, timeline operacional navegável e preview seguro. A sugestão aparece no chat e no painel; selecionar Factory/Modo Avançado não executa nada. Ao gerar, o payload usa os endpoints SF existentes com `sf_options.stack` + `architecture_preview`, mantendo `real_execution_allowed:false`, `deploy_allowed:false`, `writes_disk:false`. Backend/EB não tocados.

### App shell Next — Mission Input removido + Security Lab (2026-07-11, `next-clean-54`)

Decisão arquitetural final: o Mission Input flutuante/colapsável foi removido por completo do Vision Core Next. A área superior direita pertence ao Atomic Core; toda entrada de missão passa pelo composer/chat principal; o Software Factory lê a mesma missão do composer ao executar, sem textarea próprio e sem auto-execução ao selecionar Factory. Security Lab permanece como painel GET-only com fallback local seguro. Ver `docs/CURRENT_HANDOFF.md` para testes/deploy desta entrega.

## SISTEMA DE DOCUMENTAÇÃO (vigente a partir de 2026-07-11)

`docs/CURRENT_HANDOFF.md` deixou de ser log crescente — agora é sempre pequeno (<200 linhas), formato fixo de blocos (ESTADO DO SISTEMA / IMPLEMENTAÇÕES DESTA SESSÃO / PENDÊNCIAS REAIS / PRÓXIMA PRIORIDADE / RISCOS CONHECIDOS / TESTES / CONTEXTO PARA O PRÓXIMO AGENTE), reflete só o estado atual. Histórico resumido por versão vive em `docs/CHANGELOG_NEXT.md` (um bloco curto por `next-clean-N`, nunca narrativa longa). Investigação/diff grande/log de terminal/experimento vai para `docs/session_logs/YYYY-MM-DD-nome.md` — nunca de volta pro handoff. Este `CLAUDE.md` continua sendo a memória permanente de arquitetura/decisões/regras duras, não muda de formato. Ao fechar qualquer sessão: atualizar `CURRENT_HANDOFF.md` + `CHANGELOG_NEXT.md`, criar um `session_logs/` novo se houve investigação/narrativa relevante, e só tocar este `CLAUDE.md` se houver regra arquitetural nova de verdade.

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
