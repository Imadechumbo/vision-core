# VISION CORE — CLAUDE.md
## Memória permanente do projeto | Reestruturado: 2026-07 (docs/DECISIONS.md DECISION-018)

> **Este arquivo contém só regras permanentes, arquitetura resumida e convenções.** Estado do dia-a-dia, sessão atual, histórico e narrativa de investigação NÃO vivem mais aqui — foram movidos para não inflar o contexto carregado automaticamente em toda sessão. Ver `docs/README_DOCUMENTATION.md` para a ordem de leitura completa e o mapa de qual documento consultar para cada tipo de informação.
>
> **Leitura mínima antes de qualquer ação:** este arquivo + `docs/CURRENT_STATE.md` (o que a última sessão estava fazendo agora mesmo). Para arquitetura/vocabulário mais profundo, `docs/MASTER_SPEC.md` é a raiz de uma série de 10 documentos (`ARCHITECTURE.md`, `VISION_CORE_NEXT_FRONTEND_SPEC.md`, `VISION_CORE_BACKEND_SPEC.md`, `VC_SECRET_GUARD_RUST_SPEC.md`, `ATOMIC_CORE_SPEC.md`, `SOFTWARE_FACTORY_SPEC.md`, `UI_COMPONENT_LIBRARY.md`, `API_CONTRACT.md`, `ROADMAP.md`).

---

## PROTOCOLO DE REVEZAMENTO ENTRE AGENTES (Codex / Claude Code / OpenCode / Omnigent)

Vision Core Next é construído por múltiplos agentes revezando (cada um até seu próprio limite de uso), sem gate humano por etapa — o usuário só faz teste manual de aprovação no final. Isso só funciona se todo agente seguir isto:

1. **Antes de começar, leia nesta ordem:** `CLAUDE.md` (este arquivo) → `docs/VISION_CORE_NEXT_FRONTEND_SPEC.md` (o que construir e regras duras de UI) → `docs/CURRENT_STATE.md` (o que o agente anterior estava fazendo agora mesmo). Ordem completa e o resto da documentação em `docs/README_DOCUMENTATION.md`.
2. **Ao terminar uma etapa OU antes de bater o limite de uso, atualize `docs/CURRENT_STATE.md`.** Obrigatório mesmo em parada abrupta — é o único documento que garante que o próximo agente não perde o fio. Se o processo for interrompido sem aviso, o handoff pode ficar desatualizado; o agente seguinte deve tratar isso como sinal de alerta, não como ausência de trabalho.
3. **Toda tarefa pequena termina com:** arquivos alterados, testes feitos (comando + resultado), pendências, e o próximo comando recomendado (literal, copiável). **Commit sempre.** Nunca deixar a working tree suja entre tarefas, nunca deployar código que não foi commitado antes — essa combinação foi a causa raiz de um incidente real de gate de segurança reaberto sem rede de segurança (ver `docs/DECISIONS.md` DECISION-005).
4. **Gates de segurança só mudam com aprovação do usuário registrada por escrito em `docs/CURRENT_STATE.md`.** Vale para `AGENT_APPLY_ENABLED` e qualquer flag equivalente que decida entre leitura segura e escrita/execução real. `tests/e2e/vision-core-next-agent-apply.spec.mjs` é a trava de regressão desse gate — **deve continuar passando em todo handoff**; se um agente precisar tocá-lo, o motivo tem que estar explícito no handoff.

---

## STACK & URLS

| Componente | URL | Notas |
|-----------|-----|-------|
| Frontend | https://visioncoreai.pages.dev | Cloudflare Pages — deploy via `bash bin/deploy-pages.sh "msg"` |
| Worker Gateway | https://visioncore-api-gateway.weiganlight.workers.dev | Cloudflare Worker — proxy para EB |
| Backend EB | http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com | Node.js AWS Elastic Beanstalk (Node 24 / AL2023) |
| GitHub | https://github.com/Imadechumbo/vision-core | Repositório principal |
| GitLab | https://gitlab.com/imadechumbo/vision-core-pages | CF Pages CI — **não funciona**, não usar (ver `docs/DECISIONS.md` DECISION-003) |
| Vision Agent Local | http://localhost:7070 | Instalado via VisionAgentSetup.exe |

**Deploy:**
- Frontend: `bash bin/deploy-pages.sh "mensagem"`
- Backend: `python _deploy191b_eb.py` (ajustar versão) — ou `_deploy_eb_recreate.py` se o ambiente precisar ser recriado
- GitLab CI: NÃO usar — sempre deploy manual

Versão/cache-bust em produção agora mesmo: ver `docs/CURRENT_STATE.md`.

---

## ARQUITETURA GERAL

Vision Core é uma plataforma autônoma de correção/geração de software ("Vision AI Command"), com dois sistemas principais:

1. **Chat/Mission Control** — cockpit persistente (sidebar fixa) onde o usuário conversa, sobe projetos, roda missões de correção de bug, e acompanha Timeline/Vault/Métricas.
2. **Software Factory (SF)** — dentro do mesmo cockpit — gera projetos novos do zero via Auto-Pilot (módulos em sequência) ou Modo Avançado.

Ambos são orquestrados pelos agentes reais da tabela abaixo, não simulações. Fluxo típico de missão: usuário descreve problema/projeto → Hermes diagnostica (LLM multi-provider) → PI Harness/Scanner constrói contexto real do repo → Patch Engine aplica fix → Aegis valida segurança → Go Core roda evidência real (testes) → PASS GOLD autoriza promoção → Archivist salva memória da missão → GitHub Agent abre PR.

**Nota importante:** o projeto tem duas camadas reais e distintas — produto/SaaS vs. governança interna de release — compartilhando nomes como `Hermes`/`PASS GOLD`/`Software Factory` com mecanismos diferentes. Mapa completo em `docs/ARCHITECTURE.md` seção "Duas Camadas". Detalhe de cada componente vive nos specs da série `MASTER_SPEC.md`, não neste arquivo.

## MÓDULOS ATIVOS (Vision AI Command)

| Módulo | Papel | Endpoint real |
|--------|-------|---------------|
| **Hermes** | Orchestrator / RCA — diagnostica causa raiz via LLM multi-provider | `/api/hermes/analyze`, `/api/copilot` |
| **PI Harness** | Runtime próprio (não terceiriza pra Pi externo) — staging real, evidência de execução | `pi-harness.mjs` |
| **OpenClaw** | Orquestrador/planejador central — multi-turn reasoning, delega pra outros agentes | `/api/openclaw/orchestrate` |
| **Scanner** | Context Builder — varre arquivos do projeto real | Go Core |
| **Patch Engine** | Aplica fix real no disco — backup antes de escrever, diff real | `/api/security/apply-fix` |
| **Aegis** | Security Gate — scanner de secrets/vulnerabilidades (Go Core) | `/api/aegis/validate`, `/api/security/*` |
| **Go Core** | Runtime Truth — evidência real de execução (compilado Windows+Linux) | binário Go |
| **PASS GOLD** | Final Authorizer — só promove com evidência real (D0-D7, 20+ gates) | `pass-gold-engine.js` |
| **Archivist** | Memory Guard — memória de missões, aprendizado entre sessões | `/api/archivist/learn`, `/api/memory/search` |
| **GitHub Agent** | Canal — abre PR real após missão/geração concluída | `/api/github/create-pr` |
| **Reserve Agents** (Memory/Locator/Security/Validator/Architect) | Fallback quando agente primário falha — pré-registrado, não implementado | — |

---

## CONVENÇÕES DE CÓDIGO / REGRAS QUE NUNCA MUDAM

1. **Nunca redeployar o EB sem necessidade** — só CF Pages quando é só frontend.
2. **GitLab CI não funciona** — sempre `bash bin/deploy-pages.sh "msg"` (DECISION-003).
3. **Não usar `node-fetch`** — usar `httpsPost` (já em `server.js`) ou `https.request` nativo.
4. **Anti-stub obrigatório** — todo endpoint novo deve ter `anti_stub: true` no response.
5. **OAuth Google** em modo testing — só `weiganlight@gmail.com` funciona até publicar o app.
6. **Mascote** — `mascote-idle-final.png` (sorridente) e `mascote-reading-final.png` (óculos+livro) em `frontend/assets/`.
7. **Balão tutorial** — fundo `#000000` puro, texto `#f1f5f9`.
8. **FREE limit** — 5 missões/mês via `checkMissionQuota` middleware em `/api/copilot` e `/api/run-live`. Chat (`/api/chat`) é livre, sem quota.
9. **Guards de localStorage em IIFEs de tutorial** — o guard "auto-abrir uma vez" deve envolver SÓ o bloco de auto-trigger, nunca a definição de infraestrutura compartilhada (funções no `window`, event listeners). Do contrário qualquer feature que dependa dessas funções quebra silenciosamente quando a flag já está setada.
10. **Geometria de overlay/spotlight exige teste visual (screenshot), não só verificação de seletor.** `rectsOverlap(balloon, spotlight) === false` deve ser parte dos testes de qualquer passo de tutorial, além de `assertSpotlightCoversTarget`.
11. **CSS `!important` sobre `position`/`top`/`left`/`transform` em elementos manipulados via JS é risco alto** — pode anular silenciosamente o posicionamento calculado em JS, enquanto testes continuam passando (leem o resultado pós-CSS, não a intenção do JS). Auditar contra `positionBalloon()` antes de adicionar `!important` nessas propriedades. Teste: `getComputedStyle(el).position === 'fixed'`.
12. **Novo módulo em `tools/` só é "entregue" com pelo menos um import real** em `pi-harness.mjs`, `server.js`, ou outro arquivo de produção (imports transitivos contam) — não basta ter teste unitário. Módulos sem import real são candidatos a limpeza.
13. **Painel/componente condicional novo no Next que declare `display` no CSS deve usar `.vc-*:not([hidden])`, nunca `display:X` direto na classe base** — CSS de autor e o atributo HTML `hidden` têm a mesma especificidade; autor vence. Achado real 2x (ver DECISION-012).
14. **Testes de animação/motion:** sempre incluir contexto `page.emulateMedia({ reducedMotion })` explícito ANTES de `page.goto()` (não confiar só em `test.use({ reducedMotion })`, não confiável em páginas `file://`); `null`/omitido não são "neutros", caem no valor real do SO do host. Screenshot headless não é confiável para validar animação em voo — usar `recordVideo` do Playwright + extração de frames via ffmpeg quando precisar confirmar visualmente um efeito rápido. Para timeout real, usar `page.clock` (relógio virtual) em vez de esperar tempo real.
15. **Padrão de trabalho para qualquer etapa nova do Next:** baseline → implementação pequena e isolada → validação técnica (Playwright, mockado por padrão) → commit isolado com cache-bust incrementado → atualizar `docs/CURRENT_STATE.md` → relatório → só então próxima etapa.

---

## VARIÁVEIS DE AMBIENTE NO EB (nomes — sem valores)

```
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET
OAUTH_REDIRECT_BASE=https://visioncore-api-gateway.weiganlight.workers.dev
FRONTEND_URL=https://visioncoreai.pages.dev
FREE_MISSION_LIMIT=5          # ausente no ambiente real — default hardcoded '5' em server.js, sem risco
SESSION_SECRET                # OBRIGATÓRIO desde INCIDENTE-4 — boot falha sem ele (DECISION-008), assina/valida sessões
PROVIDER_VAULT_SECRET         # cifra o AI Provider Vault (ver docs/ARCHITECTURE.md)
HOTMART_HOTTOK                # PENDENTE — não configurado ainda
AWS_S3_BUCKET=vision-core-data-prod
SF_REAL_EXECUTION_ENABLED=false      # fail-closed; habilita a ponte real do SF somente quando explicitamente true
SF_REAL_EXECUTION_ALLOWED_AGENTS     # allowlist CSV de agent_id; ausente/vazia bloqueia todos os Agents mesmo com a flag principal true
ADMIN_ALLOWED_EMAILS                 # allowlist CSV de e-mail; concede requireVisionAdmin (Vault, /api/agents/:id/mode) sem precisar de role:'admin' em users.json; ausente/vazia = fail-closed pra todo mundo (mesmo espírito de SF_REAL_EXECUTION_ALLOWED_AGENTS)
```

**Fallback de LLM (`callLLM()`):** OpenRouter → Anthropic → Groq → DeepSeek → Gemini → Cerebras. Todas as env vars reais (chaves de LLM/OAuth/Stripe/Hotmart) foram migradas na recriação do EB — não listadas aqui por serem segredos.

---

## O QUE ESTÁ IMPLEMENTADO (capacidades atuais, não changelog)

**Backend (`server.js`):** auth completo (login/register/me, OAuth Google+GitHub, rate limiting, scrypt com auto-migração de PBKDF2 legado, JWT rotation+blacklist, audit log, LGPD, SSO Enterprise); Mission (`/api/copilot`, `/api/run-live`, `/api/agent/mission/queue`); Vault (snapshot/rollback real, S3); SF (múltiplos módulos via `callLLM()` multi-provider + AI Provider Vault); Security (Scanner real, Aegis Go Core, PatchEngine com backup); Billing (Hotmart HMAC-verificado); S3 persistence layer; PI Harness staging real + Go Core compilado; PASS GOLD (D0-D7, 20+ gates).

**Frontend (Vision Core Next — cockpit unificado):** sidebar fixa persistente entre Chat e Software Factory; chat funcional real (`POST /api/chat`); Software Factory Auto-Pilot + Modo Avançado com arquiteto visual local; GitHub PR com confirmação dupla; Executar Missão (Caminho A patch seguro + Caminho B dry-run real); Atomic Core (widget de identidade, ver `docs/ATOMIC_CORE_SPEC.md`); Métricas com gráficos nativos (sem lib externa); Security Lab; Vault-rollback; Tools-apply-fix; tutoriais contextuais por seção. Detalhe de cada feature, com achados de contrato de API verificados por leitura direta do backend, vive em `docs/CHANGELOG_NEXT.md` (por versão) e `docs/session_logs/` (narrativa completa).

**Pendências ativas do Next:** ver `docs/CURRENT_STATE.md` e `docs/ROADMAP.md`. Auth email/senha do Next já foi implementado em `next-clean-62`; OAuth Google/GitHub do Next já foi implementado em `next-clean-77`.

---

## ARQUIVOS OFICIAIS DA FRENTE "VISION CORE NEXT"

**Vision Core Next é a frente de desenvolvimento ativa, sem legado.** `frontend/index.html` + `vision-core-bundle.css/js` (o cockpit antigo) são referência visual e funcional apenas — nunca base de código a importar ou colar (ver `docs/DECISIONS.md` DECISION-015 e `docs/LEGACY_DESIGN_REFERENCE.md`).

Arquivos oficiais (não mexer em nada fora disso sem aprovação explícita):
- `frontend/vision-core-next.html` — entrada
- `frontend/assets/vision-core-next-clean.css` / `.js` — CSS/JS
- `frontend/atomic-core.html` + `assets/atomic-core.{css,js}` — protótipo isolado, **não é a implementação oficial** (a oficial vive dentro do Next)
- `CLAUDE.md` + `docs/CURRENT_STATE.md` — memória entre sessões

Arquivos públicos a atualizar somente depois de validação local correspondente: `frontend/about.html`, `frontend/landing.html`.

**Não tocar sem autorização explícita:** `frontend/index.html`, `vision-core-bundle.*`, backend, worker gateway, endpoints destrutivos, `AGENTS.md` (arquivo de outra ferramenta, deliberadamente deixado como está).

### Regras absolutas desta fase

1. Não fazer deploy sem aprovação manual explícita.
2. Não fazer commit que misture escopos — commits isolados por mudança coesa e revertível.
3. Não importar `vision-core-bundle.css`/`vision-core-bundle.js`.
4. Não reaproveitar layout/HTML legado como base de código — pode ler para mapear funções, nunca importar ou colar estrutura.
5. Não tocar em `frontend/index.html` nem nos bundles legados sem autorização explícita.
6. Endpoints que escrevem em disco, criam PR, aplicam patch, fazem deploy, rodam execução real ou gastam API real exigem confirmação/guard claro antes de conectar (dupla confirmação — ver GitHub PR como referência de padrão).
7. Função ainda não conectável com segurança vira placeholder que falha de forma VISÍVEL ("não implementado ainda") — nunca finge sucesso nem falha silenciosamente.

---

## DECISÕES DE ESCOPO FECHADAS

Catálogo completo em `docs/DECISIONS.md` — não reabrir sem novo motivo registrado lá. Fechadas: não migrar AWS→Alibaba, 2 ambientes AWS efetivos, GitLab CI não usado, OpenClaw/OpenSquad/OSINT/V10 fora de escopo, `AGENT_APPLY_ENABLED=false` fail-closed, Mission Input removido, `agent_id` sozinho não autentica, fonte de verdade de reduced-motion é `window.VCMotion`, legado é referência visual apenas, entre outras.

---

## ROADMAP / PENDÊNCIAS

- **Estado do dia-a-dia e próxima prioridade real:** `docs/CURRENT_STATE.md` — sempre o mais atual, leia antes de assumir qualquer prioridade.
- **Roadmap de longo prazo** (Fase 3.3d, Enterprise/Segurança §156-160, fases futuras por prioridade/risco): `docs/ROADMAP.md`.
- **Não há "Etapa G" nem "Fase 6" definida em nenhuma linha de trabalho** — qualquer item que pareça um próximo passo grande exige conversa nova com o humano antes de assumir prioridade.

---

- **Vision AI Installer:** produto oficial planejado para provisionar runtimes/modelos locais. Fase 0 somente; zero Tauri/Rust funcional. Não confundir com Vision Agent Local/Desktop. Fonte: `docs/VISION_AI_INSTALLER_SPEC.md`; integração real `BLOCKED_CONTRACT` até contrato local reversível.

## SISTEMA DE DOCUMENTAÇÃO — POLÍTICA PERMANENTE (vale para todo agente: Claude Code, Codex, OpenCode, Omnigent, ChatGPT ou qualquer outro)

Ver `docs/README_DOCUMENTATION.md` para o índice completo e a ordem oficial de leitura. Esta seção é a política em si — não uma sugestão.

**`CLAUDE.md` NÃO É:** log, handoff, changelog, diário, session log, checkpoint de continuidade. **`CLAUDE.md` É:** memória permanente — princípios, identidade, arquitetura resumida, convenções, padrões obrigatórios, fluxo de trabalho, políticas, decisões permanentes (por pointer), documentos obrigatórios, ordem de leitura, regras de segurança.

### Pode conter
Princípios · identidade · arquitetura resumida · convenções · padrões obrigatórios · fluxo de trabalho · políticas · decisões permanentes · documentos obrigatórios · ordem oficial de leitura · regras de segurança · filosofia do Vision Core.

### Nunca deve conter
Checkpoint de continuidade · sessão/retomada/handoff narrado · commits · hashes · `git status`/`git log` · terminal · Playwright (resultado de corrida específica) · `node --check` (resultado específico) · deploys antigos · listas enormes · payloads · JSON · logs · stack traces · experimentos · roadmap histórico · incidentes já resolvidos (narrativa completa — só a regra permanente que resultou deles, com pointer) · cronologia · texto duplicado de outro documento.

### Destino de cada tipo de conteúdo

| Tipo de conteúdo | Destino | Nunca em |
|---|---|---|
| Checkpoint / retomada / status de sessão | `docs/CURRENT_STATE.md` (estado atual) ou `docs/session_logs/` (narrativa) | `CLAUDE.md` |
| Log completo, terminal, stack trace | `docs/session_logs/YYYY-MM-DD-nome.md` | `CLAUDE.md` |
| Commits | `docs/CHANGELOG_NEXT.md` | `CLAUDE.md` |
| Deploys | `docs/CHANGELOG_NEXT.md` ou `docs/CURRENT_STATE.md` (só o mais recente) | `CLAUDE.md` |
| Resultado de teste (`N/N PASS`) | `docs/CURRENT_STATE.md` (só o estado atual) — histórico fica em `docs/CHANGELOG_NEXT.md` | `CLAUDE.md` |
| Investigação/debugging/root cause/auditoria longa | `docs/session_logs/` | `CLAUDE.md`, `docs/CURRENT_STATE.md` |
| Decisão fechada (o quê + por quê + como aplicar) | `docs/DECISIONS.md`, uma vez, por pointer nos demais | duplicada em qualquer outro arquivo |
| Arquitetura de componente | `docs/ARCHITECTURE.md` ou spec específico da série `MASTER_SPEC.md` | `CLAUDE.md`, `docs/CURRENT_STATE.md` |

`docs/IMPLEMENTATION_LOG.md` não existe como arquivo separado — o papel que teria (commits/resultados/testes por sessão, detalhe médio) já é coberto por `docs/CHANGELOG_NEXT.md` (por versão) + `docs/session_logs/` (narrativa completa); criar um terceiro arquivo intermediário duplicaria um dos dois (ver `docs/README_DOCUMENTATION.md`).

### Redundância

Nenhuma informação existe em mais de um documento. Se pertence a `ARCHITECTURE.md`, não repetir em `CLAUDE.md`. Se pertence a `DECISIONS.md`, não repetir em `CURRENT_STATE.md`. Se pertence a `CHANGELOG_NEXT.md`, não recriar em outro arquivo. Usar sempre "ver `DECISIONS.md`"/"ver `ARCHITECTURE.md`"/"ver `docs/session_logs/`" em vez de copiar conteúdo.

### Limite de tamanho

`CLAUDE.md`: ideal até 300 linhas, máximo recomendado 500. Se ultrapassar, reorganizar imediatamente — não continuar adicionando conteúdo por cima.

### Revisão obrigatória ao terminar qualquer missão

Antes de considerar uma tarefa concluída, verificar se `CLAUDE.md` ganhou logs, checkpoints, commits, sessões, terminal, JSON ou resultado de Playwright/teste específico. Se sim, mover para o documento correto da tabela acima antes de fechar a tarefa — não deixar para depois.

### Enforcement

**Esta regra é permanente.** Qualquer agente (Claude Code, Codex, OpenCode, Omnigent, ChatGPT ou futuro) que adicionar checkpoint, log, sessão, commit ou cronologia de volta a este arquivo está violando a arquitetura oficial de documentação do Vision Core (`docs/DECISIONS.md` DECISION-018). Ao fechar qualquer sessão: atualizar `docs/CURRENT_STATE.md` + `docs/CHANGELOG_NEXT.md`, criar um `docs/session_logs/` novo se houve investigação/narrativa relevante, e só tocar este `CLAUDE.md` se houver regra permanente nova de verdade (não estado, não sessão).

---

## PADRÃO DE REGISTRO — depoimentos e testes nas páginas públicas

Toda etapa grande concluída deve atualizar, além do código+testes, as duas páginas públicas que documentam a trajetória real do produto (prova pública de "produto testado, não prometido"):

**`frontend/about.html`:**
1. Seção "O QUE OS TESTES REVELARAM" — 1 card por descoberta real (bug + causa raiz + resolução), estilo depoimento técnico em 1ª pessoa, atribuído a `— §NNN, contexto, PASS/FAIL`.
2. Seção "POTENCIAIS DE EVOLUÇÃO" (roadmap numerado) — remover item quando implementado (renumerar restantes), mover pra "RESOLVIDO" em `landing.html`. Nunca deixar um item em ambos os lugares simultaneamente.

**`frontend/landing.html`:**
1. "TRANSPARÊNCIA TÉCNICA" — mover card de "EM EVOLUÇÃO" pra "RESOLVIDO — V2.9.10+" com endpoint(s) + certificação (nº de testes).
2. Tabela "TRAJETÓRIA REAL" — atualizar linha de versão com a entrega mais recente. **Só para o legado** (versionamento `VN.N`, linha do tempo única e sequencial). Vision Core Next tem seção própria "Trajetória Next" (mesmo padrão de tom/formato, tabela separada) — nunca inserir `next-clean-N` na tabela do legado, que implicaria uma sequência de produto que não existe (Next roda em paralelo, não substitui nem continua o legado).
3. "ENTREGAS V2.9.10" — card novo se a etapa for grande o suficiente.

**Regra geral (legado OU Next):** toda entrega relevante gera uma entrada nova por acréscimo em `about.html` + `landing.html` — nunca reescrever, reformatar ou apagar entrada existente. Formato: emoji + citação curta em 1ª pessoa (causa raiz/diferencial → fix → prova concreta) + assinatura com identificador/versão (`§NNN` no legado, `next-clean-N`/commit no Next) + status (PASS/FAIL). **Ler pelo menos 3 entradas existentes antes de escrever**, para casar tom — são depoimentos técnicos, não texto de marketing.

**Regra de ouro:** nunca documentar uma etapa como resolvida nas páginas públicas antes do teste automatizado correspondente passar localmente. Deploy via `bash bin/deploy-pages.sh "msg"` só depois disso.

---

*Histórico completo de sessões, com causa raiz/fix/evidência de cada bug até 2026-07-06, está em `CLAUDE_HISTORY.md`. Narrativa de sessão de 2026-07-06 até 2026-07-11 (todo o conteúdo que antes vivia neste arquivo) está preservada integralmente em `docs/archive/CLAUDE_MD_2026-07-11_pre_restructure.md`. Este arquivo é o estado de regras permanentes — consulte o histórico só quando precisar entender o "porquê" de uma decisão já tomada (ou veja `docs/DECISIONS.md` primeiro, é mais rápido).*
