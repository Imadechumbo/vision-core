# DECISIONS — Vision Core

Catálogo permanente de decisões arquiteturais/de escopo fechadas. Cada decisão existe **uma única vez** aqui — não duplicar em `CLAUDE.md`, `ARCHITECTURE.md` ou specs. Onde uma decisão qualifica um comportamento descrito em outro documento, esse documento aponta para o número aqui (`ver DECISION-00N`), não repete o texto.

Formato: afirmação → **Por quê** → **Como aplicar**. Ordem: mais recente no topo dentro de cada categoria. Não reabrir uma decisão fechada sem motivo novo registrado explicitamente.

---

## Princípios arquiteturais permanentes

### ARCHITECTURAL PRINCIPLE-001 — Zero Legacy Debt
Vision Core Next não é uma evolução incremental do frontend legado; é uma nova implementação baseada nas especificações oficiais.
**Por quê:** o legado preserva conhecimento funcional e histórico, mas também carrega dívida técnica, hacks e decisões locais que não devem se tornar a base do Next.
**Como aplicar:** usar o legado exclusivamente como referência funcional/histórica. Todo componente migrado para o Next precisa ser reimplementado, modular, documentado, testado, coeso e aderente às specs. Nenhum componente entra no Next apenas porque existia no legado; conhecimento é preservado, dívida técnica não é migrada.

### ARCHITECTURAL PRINCIPLE-002 — Specification First
As especificações oficiais são a fonte de verdade do Vision Core.
**Por quê:** o projeto depende de múltiplos agentes trabalhando por revezamento; se código e specs divergem, cada agente passa a reconstruir a intenção do sistema por suposição.
**Como aplicar:** o código deve implementar as specs, nunca o contrário por conveniência. Quando houver divergência, corrigir o código ou corrigir a spec com decisão explícita, mas nunca deixar ambos divergentes. Toda evolução relevante do Next começa pela spec aplicável e termina com documentação/teste coerentes.

### ARCHITECTURAL PRINCIPLE-003 — Evidence Before Change
Nenhuma alteração arquitetural pode ser baseada em inferência apresentada como fato.
**Por quê:** o Vision Core é mantido por múltiplos agentes e já acumulou divergências entre prompt, spec, teste, código e estado real. Sem evidência objetiva antes da mudança, o agente seguinte herda uma conclusão não verificável e pode transformar suposição em arquitetura.
**Como aplicar:** toda decisão arquitetural precisa apontar pelo menos uma evidência objetiva: spec, código, teste, execução observável ou documentação oficial. Suposições devem ser marcadas como suposição. Se duas fontes normativas de mesma autoridade divergirem e não houver evidência suficiente para escolher o lado correto, parar e pedir decisão humana antes de implementar.

### ARCHITECTURAL PRINCIPLE-004 — No Fixed Viewport Layout
Nenhum componente de dashboard, gráfico, painel, monitor, timeline ou grid de módulos pode usar posicionamento fixo em relação à viewport (`position: fixed`, `sticky` com referência de scroll global, ou técnica equivalente que prenda o elemento à tela independente do scroll do container pai).
**Por quê:** achado real (2026-07-12) — o Atomic Core usava `position: fixed` relativo à viewport inteira, reservando uma faixa permanente de `.vc-main` (`padding-right: clamp(285px,27vw,405px)`) mesmo fora do contexto de chat; isso comprime todo outro painel/dashboard que precise de largura real, forçando colunas estreitas sem necessidade.
**Como aplicar:** todo componente visual novo deve (1) viver dentro do fluxo normal de scroll do container onde foi montado, nunca sobrepor nem ficar para trás quando o conteúdo ao redor rola; (2) ter largura responsiva ao espaço real do container, nunca comprimida por um elemento fixo concorrente; (3) quando fizer sentido (dashboards com múltiplos gráficos), ganhar painel de largura total dentro da própria SPA (`data-feature` dedicado, já que o Next não tem router de páginas separadas — ver `ARCHITECTURAL PRINCIPLE-001`), em vez de forçado como painel lateral secundário. Exceções permitidas: navegação global (header/sidebar) e UI transitória (modais, toasts, tooltips) — nunca dashboard de dados ou conteúdo analítico. Primeira aplicação: Atomic Core (`vision-core-next-clean.css`/`.js`, 2026-07-12).

---

## Infraestrutura / Deploy

### DECISION-001 — Não migrar AWS → Alibaba Cloud
Backend Node.js/Elastic Beanstalk permanece na AWS.
**Por quê:** não existe equivalente ao fluxo atual (zip→version→apontar ambiente→rollback 1 comando) para Node.js na Alibaba — Web+ descontinuado (2023), SAE não suporta Node.js, EDAS exige Kubernetes (ACK). Não é troca pontual, é adotar K8s como arquitetura nova. O problema real era billing, resolvido com upgrade pay-as-you-go da conta AWS.
**Como aplicar:** só revisitar se houver necessidade real de escala horizontal/múltiplos serviços — nunca por causa de custo de conta.

### DECISION-002 — 2 ambientes AWS efetivos (não 5)
`Technetgame-env-1` e `vision-core-prod` são os únicos ambientes ativos. `TNGH-BACKEND`, `Tngh-aws-final-v2-env`, `vision-core-staging` foram encerrados em 2026-07-05.
**Por quê:** os 3 ambientes extras eram staging/teste, causa raiz de EIP 5/5 esgotado. Verificação de segurança (DNS, GitHub Actions, Worker gateway) feita antes do encerramento — zero bloqueio.
**Como aplicar:** 3 scripts PowerShell na raiz ainda citam `tngh-aws-final-v2-env` (relíquia pré-rename) — não bloqueiam nada, candidatos a limpeza futura, não uma pendência ativa.

### DECISION-003 — GitLab CI não é usado
Deploy de frontend é sempre manual via `bash bin/deploy-pages.sh`.
**Por quê:** runner allocation do GitLab falha para este projeto, causa não resolvida e não vale mais investigar.
**Como aplicar:** nunca sugerir "configurar o CI do GitLab" como solução — está descartado.

### DECISION-004 — Saneamento do pacote de deploy via `rm -f` explícito no script
Arquivos soltos de outras ferramentas (`next.html`, `atomic-core.html`, `_test_here.txt`, `assets/atomic-core.*`, `assets/vision-core-next.*`) são excluídos por linha `rm -f` explícita em `bin/deploy-pages.sh`, não movidos para outra pasta nem via `.cfpagesignore`.
**Por quê:** `.cfpagesignore` não é um mecanismo real do Cloudflare Pages/Wrangler (confirmado — não documentado pela Cloudflare); teria sido repetir o erro do `agent_id` (DECISION-011): um mecanismo que parece resolver mas não resolve. Mover arquivos exigiria reescrever referências relativas e uma convenção de pasta nova — maior que o pedido.
**Como aplicar:** cobre só os nomes de arquivo conhecidos hoje. Um debris novo com nome diferente não é pego automaticamente — não generalizar isso sem um segundo incidente confirmando o padrão (YAGNI).

---

## Governança de segurança (gates que só mudam com aprovação humana registrada)

### DECISION-005 — `AGENT_APPLY_ENABLED=false` — Fail-closed até pareamento real por agente/projeto/owner
`apply_patch`/`apply_patch_multi` reais via Vision Agent Local permanecem bloqueados na UI do Next mesmo com JSON válido e frase de confirmação exata.
**Por quê:** `agent_id` sozinho (hash não-secreto de hostname+pasta) não autentica ninguém — qualquer chamador da API pública que soubesse/adivinhasse o `agent_id` de alguém podia enfileirar um `apply_patch` real na fila de outra pessoa. `agent_secret` (DECISION-006) resolveu a autenticação, mas ligar o gate em produção continua exigindo aprovação humana explícita registrada em `docs/CURRENT_STATE.md`, não é automático só porque o mecanismo técnico existe.
**Como aplicar:** `tests/e2e/vision-core-next-agent-apply.spec.mjs` é a trava de regressão permanente deste gate — deve continuar passando em todo handoff. Qualquer sessão que reabrir `AGENT_APPLY_ENABLED` sem aprovação escrita do usuário está repetindo o incidente de 2026-07-08 (ver `docs/session_logs/`).

### DECISION-006 — Pareamento por `agent_secret`, persistência em memória (não SQLite/S3)
`POST /api/agent/register` gera `agent_id`+`agent_secret`; `/mission/queue`, `/mission/pending` e `/mission/result` exigem o par certo (401 `agent_pairing_required` sem isso) quando a missão reivindica um `agent_id`. `agentPairings` fica em `Map` em memória.
**Por quê:** `AGENT_APPLY_ENABLED` continua `false` (DECISION-005) — nada em produção depende disso ainda; implementar sync S3 sem testar contra AWS real reintroduziria o mesmo tipo de risco que o bug do secret vazado (corrigido: `agent_secret` não é mais persistido dentro do resultado armazenado, que é público via `GET /mission/result/:id`).
**Como aplicar:** self-healing no lugar da persistência durável — cada binário do agente, ao levar 401, apaga a credencial local e rechama `/api/agent/register` sozinho. Consequência: `agent_id` muda a cada redeploy do EB; um `agent_id`/`agent_secret` copiado manualmente para a UI expira nesse evento.

### DECISION-007 — INCIDENTE-3: credencial de fallback legada rejeitada no backend
`/api/auth/register` e `/api/auth/login` retornam 400 `fallback_credential_rejected` explicitamente para o literal de fallback público legado (§145), em vez de aceitar/converter silenciosamente.
**Por quê:** o bundle legado (`vision-core-bundle.js`) usava esse literal como senha padrão quando não havia senha salva — qualquer conta antiga cujo hash tivesse sido gerado a partir dele continuava autenticável com uma credencial pública.
**Como aplicar:** runbook `tools/incident-3-legacy-account-scan.mjs <users.json> [--invalidate]` para identificar/invalidar contas de produção afetadas é **ação pendente do usuário** — não executável a partir deste repo (sem acesso a dados de produção). Deploy do fix de backend também pendente — enquanto o EB não recebe este fix, o literal extraído de cache/CDN antigo continua funcionando contra o endpoint real.

### DECISION-008 — INCIDENTE-4: `SESSION_SECRET` obrigatório no boot (Opção A, fail-closed)
`backend/server.js` recusa subir sem `SESSION_SECRET` explícito, forte (≥32 bytes) e diferente do fallback público conhecido.
**Por quê:** sem isso, `signSession()`/`verifySession()` caíam num fallback simétrico público, permitindo forjar sessão HMAC para qualquer `uid` conhecido.
**Como aplicar:** já configurado no EB `vision-core-prod` (2026-07-09), verificado `Ready/Green`. Rotacionar esse segredo invalida sessões ativas — comportamento esperado, não um bug.

### DECISION-009 — Specs de teste permanentes: critério de exceção à convenção "roda e apaga"
Um spec `tests/e2e/vision-core-next-*.spec.mjs` só é commitado permanentemente quando (a) guarda um gate de segurança/governança (ex.: `vision-core-next-agent-apply.spec.mjs`) OU (b) cobre uma superfície ativa de relay multiagente sem revisão humana por etapa (ex.: `vision-core-next-sf.spec.mjs`, Software Factory). Todo o resto segue temporário — escrito, rodado, apagado.
**Por quê:** um spec permanente é a única rede de regressão contra um gate sendo reaberto silenciosamente entre sessões de agentes diferentes sem review humano — foi exatamente o que aconteceu no incidente do `AGENT_APPLY_ENABLED` (DECISION-005).
**Como aplicar:** antes de decidir "commitar este spec ou apagar", perguntar: isso guarda um gate de segurança, ou é uma superfície que múltiplos agentes vão tocar sem review? Se não, apagar é a escolha certa (evita suíte inchada e mocks que apodrecem).

---

## Frontend — Vision Core Next

### DECISION-019 — Vision Core Next entra em fase de produto oficial
Vision Core Next deixa de ser tratado como uma coleção de lacunas a fechar e passa a ser evoluído como o futuro frontend oficial do Vision Core.
**Por quê:** depois das principais superfícies do cockpit Next existirem (chat, composer, Software Factory, Atomic Core, métricas, Security Lab, Vault/Tools/GitHub), o maior risco não é falta de UI pontual, é acumular decisões locais e virar um novo legado antes de substituir o antigo.
**Como aplicar:** toda missão do Next começa comparando implementação real contra specs, depois escolhe a melhoria de maior impacto nesta ordem: arquitetura, UX, Software Factory, Atomic Core, performance, observabilidade, segurança, documentação, refinamento visual. Nunca copiar código legado; reimplementar de forma modular, documentada, testada e aderente aos princípios `ARCHITECTURAL PRINCIPLE-001` e `ARCHITECTURAL PRINCIPLE-002`. Push/deploy/merge continuam exigindo pedido explícito do usuário ou regra operacional já autorizada.

### DECISION-010 — Mission Input removido definitivamente
O composer/chat principal é a única entrada de missão do Vision Core Next. Não existe textarea de missão separado — nem flutuante, nem dentro do Software Factory.
**Por quê:** decisão arquitetural final — a área superior direita pertence ao Atomic Core; ter duas entradas de missão (Mission Input + composer) duplicava a interação sem ganho, e o Software Factory lendo a mesma missão do composer evita um segundo estado a sincronizar.
**Como aplicar:** nenhum painel novo do Next deve reintroduzir um campo de missão próprio — sempre ler do composer/chat.

### DECISION-011 — `agent_id` sozinho não é autenticação (achado, não decisão de design original)
Registrado aqui para não se repetir: um identificador não-secreto derivado de hostname+pasta parece uma barreira de segurança mas não é — só evita cross-talk acidental, nunca um chamador deliberado.
**Por quê:** motivou diretamente o pareamento por `agent_secret` (DECISION-006) e o fail-closed do `AGENT_APPLY_ENABLED` (DECISION-005).
**Como aplicar:** qualquer mecanismo novo de "identificação" proposto para uma ação irreversível deve ser questionado com a pergunta "isso prova posse de algo secreto, ou só evita colisão acidental?" antes de ser tratado como controle de acesso.

### DECISION-012 — Regra dura de CSS: `.vc-*:not([hidden])` em painéis condicionais
Todo componente condicional novo no Next que declare `display` no CSS deve usar seletor `:not([hidden])`, nunca `display:X` direto na classe base.
**Por quê:** achado real 2x de causas independentes (painel GitHub PR, painel Mission Patch, depois SF Log/Progress/Final/Stage) — CSS de autor e o atributo HTML `hidden` têm a mesma especificidade; autor vence, então o painel aparecia mesmo fora da aba ativa.
**Como aplicar:** ao revisar qualquer CSS novo tocando um elemento com `hidden` no HTML, checar esse padrão antes de aprovar.

### DECISION-013 — Atomic Core / logo-olho: identidade visual protegida, exige aprovação explícita
Qualquer mudança visual ou de mecanismo no widget Atomic Core (`window.AtomicCoreNext`) ou nas pálpebras do logo (`.vc-eye-lid-*`) exige aprovação explícita do usuário, mesmo para ajustes pequenos.
**Por quê:** os dois são elementos de identidade de marca já aprovados e confirmados pelo usuário — não são superfícies de iteração livre como o resto do frontend.
**Como aplicar:** ver `docs/ATOMIC_CORE_SPEC.md` e `docs/UI_COMPONENT_LIBRARY.md` para o mecanismo atual antes de propor qualquer mudança.

### DECISION-014 — Fonte de verdade de `reduceMotion` é `window.VCMotion`, não `matchMedia` direto
O Atomic Core não lê mais `prefers-reduced-motion` do SO como fonte de verdade — lê `window.VCMotion` (`localStorage['vc_animation_mode']`, `'full'|'reduced'`), default sempre `'full'`.
**Por quê:** decisão explícita do dono do produto — a animação é identidade visual; o SO não deve degradar a experiência por padrão, o VC tem controle próprio de acessibilidade exposto em Settings → Animações.
**Como aplicar:** `matchMedia` só é lido diretamente em um lugar (a dica de primeira visita, para decidir se mostra o aviso apontando para Settings) — nunca para decidir o que animar. O blink do olho/logo não foi tocado por esta decisão, continua lendo `matchMedia` diretamente (fora de escopo, protegido por DECISION-013).

### DECISION-015 — Legado é referência visual/UX apenas, nunca código-fonte a copiar
`frontend/index.html` + `vision-core-bundle.js` só podem ser lidos para mapear comportamento — nunca importados, linkados, embedados ou colados no Next.
**Por quê:** o legado carrega dívida técnica e (achado real, INCIDENTE-3) já teve credencial hardcoded exposta. Regra anti-novo-legado: se o Next precisa de algo que só existe lá, o caminho é reimplementar, nunca estender o legado.
**Como aplicar:** catálogo tela-por-tela do que herdar/o que já tem equivalente/o que está bloqueado vive em `docs/LEGACY_DESIGN_REFERENCE.md`. Divergência consciente do Next em relação ao legado é permitida, desde que registrada lá com o quê e o porquê.

### DECISION-020 — Atomic Core é elemento persistente global (substitui a regra "escopado ao chat" da DECISION-013/next-clean-61)
O widget Atomic Core não esconde mais fora da aba `chat`/Software Factory Auto-Pilot — fica visível em qualquer página/aba (Missions, Timeline, Métricas, Dashboard, Settings, Vault, Tools, Security Lab, GitHub). Mudança de decisão explícita do usuário (2026-07-12, `next-clean-67`), não um bug.
**Por quê:** a regra anterior (`next-clean-61`, `outsideChat` em `updateAtomicCollapseState()`) era decisão de produto consciente na época, mas o usuário decidiu reverter — o widget deve funcionar como identidade visual persistente, não escopada a uma única aba.
**Como aplicar:** as únicas 2 exceções que ainda escondem o widget continuam sendo (1) o toggle "mostrar Atomic Core" em Settings (`window.VCAtomicCore`, on/off explícito do usuário) e (2) a colisão real e já documentada do Modo Avançado do Software Factory (`next-clean-61`, não muda com esta decisão — grid de stack/matriz/timeline disputa a mesma zona do widget). Nenhuma outra página deve reintroduzir lógica de collapse condicional — ver `docs/VISION_CORE_NEXT_FRONTEND_SPEC.md` seção Atomic Core.

---

## Roadmap / escopo explicitamente fora de alcance

### DECISION-016 — OpenClaw/OpenSquad/OSINT/V10 — roadmap, não tocar sem decisão de produto
Essas linhas de trabalho (§98-F) ficam registradas como ideia/roadmap, não implementação ativa.
**Por quê:** decisão de produto explícita de não priorizar — evita que um agente comece a implementar algo sem mandato.
**Como aplicar:** qualquer trabalho nessas áreas exige conversa nova com o usuário antes de começar.

### DECISION-017 — Fase 2b do SDK Externo (SF-Agent-Orchestrator): disciplina obrigatória
Qualquer integração de SDK externo ou gate de segurança neste projeto deve seguir: (1) commit isolado por peça lógica, teste antes de cada commit; (2) revisão adversarial antes de instalar dependência de risco — achar bypass concreto, não ressalva genérica; (3) incerteza documentada explicitamente no código (`// NÃO VERIFICADO CONTRA FONTE OFICIAL`), nunca fingida como certeza; (4) defaults fail-closed — tool desconhecida = perigosa até prova em contrário; (5) gate de confirmação humana obrigatório antes de gastar tokens de API real, mudar `package.json`, ou publicar em página pública.
**Por quê:** motivado pelo bloqueio estrutural real encontrado nos smoke tests do Claude Agent SDK (sessão aninhada herdando toolset restrito via env vars) — o tipo de risco que só aparece testando contra a infraestrutura real, não em revisão de código isolada.
**Como aplicar:** regra permanente para qualquer integração futura de agente/SDK externo, não só para este orquestrador específico.

---

## Documentação

### DECISION-018 — Reestruturação de documentação em camadas (2026-07-11 → 2026-07-14)
`CLAUDE.md` deixa de conter narrativa de sessão — vira memória permanente de regras/arquitetura resumida. Estado do dia-a-dia vive em `docs/CURRENT_STATE.md` (renomeado de `CURRENT_HANDOFF.md`). Decisões fechadas vivem aqui. Histórico de versão vive em `docs/CHANGELOG_NEXT.md`. Narrativa/investigação/logs de terminal vivem em `docs/session_logs/`. Documentos obsoletos vão para `docs/archive/`, nunca são apagados. Reforçada numa segunda missão (2026-07-14): `CLAUDE.md` ganhou uma seção própria de política permanente ("SISTEMA DE DOCUMENTAÇÃO — POLÍTICA PERMANENTE") com a lista explícita do que pode/nunca pode conter, o mapa de destino por tipo de conteúdo, e uma declaração de enforcement — vale para todo agente presente e futuro, incluindo ferramentas fora da família Claude (ChatGPT etc.).
**Por quê:** `CLAUDE.md` e `CURRENT_STATE.md` cresceram ao longo de semanas misturando arquitetura, decisões, histórico, logs e estado — inflando o contexto carregado automaticamente em toda sessão nova e dificultando a continuidade entre agentes (Claude Code, Codex, OpenCode, Omnigent). A política foi formalizada como seção própria (não só como prática) porque uma regra só em memória de sessão se perde no próximo revezamento — precisa estar no próprio arquivo que ela governa.
**Como aplicar:** ver `docs/README_DOCUMENTATION.md` para a ordem de leitura completa e a responsabilidade de cada arquivo, e a seção "SISTEMA DE DOCUMENTAÇÃO" em `CLAUDE.md` para o checklist de revisão obrigatória ao fechar qualquer tarefa. Nenhuma informação foi apagada nesta reestruturação — o `CLAUDE.md` pré-reestruturação está preservado integralmente em `docs/archive/CLAUDE_MD_2026-07-11_pre_restructure.md`.
