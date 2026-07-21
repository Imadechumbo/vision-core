# DECISIONS — Vision Core

Catálogo permanente de decisões arquiteturais/de escopo fechadas. Cada decisão existe **uma única vez** aqui — não duplicar em `CLAUDE.md`, `ARCHITECTURE.md` ou specs. Onde uma decisão qualifica um comportamento descrito em outro documento, esse documento aponta para o número aqui (`ver DECISION-00N`), não repete o texto.

Formato: afirmação → **Por quê** → **Como aplicar**. Ordem: mais recente no topo dentro de cada categoria. Não reabrir uma decisão fechada sem motivo novo registrado explicitamente.

---

## Princípios arquiteturais permanentes

### ARCHITECTURAL PRINCIPLE-001 — Zero Legacy Debt
Conhecimento é preservado. Dívida técnica nunca é migrada.
**Por quê:** o legado existe apenas como referência funcional e histórica; seus componentes, fluxos, hacks e workarounds não são base técnica do Vision Core Next.
**Como aplicar:** toda capacidade necessária deve ser reimplementada de forma limpa, modular, testável e alinhada às especificações oficiais. Nunca copiar, portar ou adaptar código ou workaround legado.

### ARCHITECTURAL PRINCIPLE-002 — Specification First
As especificações oficiais são a fonte normativa do Vision Core.
**Por quê:** código e testes podem divergir da intenção registrada; alterar a spec por conveniência transforma comportamento acidental em arquitetura.
**Como aplicar:** em divergência, presumir inicialmente que o código está incorreto. Testes são evidência executável, não autoridade superior. Uma spec só muda diante de erro, ambiguidade ou decisão arquitetural superveniente documentada antes da implementação que a motivou; nunca apenas para legitimar o comportamento atual.

### ARCHITECTURAL PRINCIPLE-003 — Evidence Before Change
Nenhuma alteração arquitetural pode ser baseada apenas em inferência.
**Por quê:** sem evidência objetiva, uma hipótese pode atravessar revezamentos de agentes e virar arquitetura sem fundamento verificável.
**Como aplicar:** toda decisão deve apontar ao menos uma especificação, trecho de código, teste, execução observável ou documentação oficial. Suposições são hipóteses, nunca fatos. Se fontes normativas equivalentes divergirem sem evidência suficiente, parar e obter decisão humana antes de implementar.

### ARCHITECTURAL PRINCIPLE-004 — Minimal Surface Area
Toda capacidade deve existir na menor superfície coerente possível.
**Por quê:** crescimento saudável aumenta capacidade, não abstrações, configurações, dependências, estados, componentes, endpoints, documentos ou fluxos sem benefício demonstrável.
**Como aplicar:** preferir menos arquivos, estados, exceções, dependências, configurações e caminhos operacionais quando o mesmo resultado puder ser obtido sem reduzir segurança, acessibilidade, observabilidade, integridade ou clareza. Cada documento tem uma responsabilidade clara; cada componente, um motivo principal para mudar. Complexidade só é aceita com benefício arquitetural demonstrável.

### ARCHITECTURAL PRINCIPLE-005 — Invisible Complexity
O sistema pode ser complexo. A experiência nunca deve ser.
**Por quê:** múltiplos agentes e subsistemas não devem transferir carga operacional desnecessária ao usuário.
**Como aplicar:** manter complexidade interna, contextual e progressivamente revelada. A interface principal deve tornar imediatos conversar, iniciar uma missão, acompanhar agentes/progresso e acessar configurações; capacidades avançadas ficam contextuais, colapsadas ou em modo avançado quando não essenciais. Invisível não significa ocultar erros, riscos, estado crítico, consentimento ou ações irreversíveis: esses elementos devem permanecer explícitos e acionáveis. O produto deve transmitir simplicidade, velocidade, previsibilidade e confiança.

### ARCHITECTURAL PRINCIPLE-006 — No Fixed Viewport Layout
Nenhum componente de dashboard, gráfico, painel, monitor, timeline ou grid de módulos pode usar posicionamento fixo em relação à viewport (`position: fixed`, `sticky` com referência de scroll global, ou técnica equivalente que prenda o elemento à tela independente do scroll do container pai).
**Por quê:** achado real (2026-07-12) — o Atomic Core usava `position: fixed` relativo à viewport inteira, reservando uma faixa permanente de `.vc-main` (`padding-right: clamp(285px,27vw,405px)`) mesmo fora do contexto de chat; isso comprime todo outro painel/dashboard que precise de largura real, forçando colunas estreitas sem necessidade.
**Como aplicar:** todo componente visual novo deve (1) viver dentro do fluxo normal de scroll do container onde foi montado, nunca sobrepor nem ficar para trás quando o conteúdo ao redor rola; (2) ter largura responsiva ao espaço real do container, nunca comprimida por um elemento fixo concorrente; (3) quando fizer sentido (dashboards com múltiplos gráficos), ganhar painel de largura total dentro da própria SPA (`data-feature` dedicado, já que o Next não tem router de páginas separadas — ver `ARCHITECTURAL PRINCIPLE-001`), em vez de forçado como painel lateral secundário. Exceções permitidas: navegação global (header/sidebar) e UI transitória (modais, toasts, tooltips) — nunca dashboard de dados ou conteúdo analítico. Primeira aplicação: Atomic Core (`vision-core-next-clean.css`/`.js`, 2026-07-12).

---

## MultiProviders / Arquitetura oficial

### ADR-049 — Provider Vault global é admin-only até existir ownership canônico
O vault atual permanece uma configuração operacional global e somente administradores explícitos podem ler, testar ou mutar seu estado.
**Por quê:** não existe modelo Workspace canônico nesta branch; inventar ownership parcial criaria isolamento falso, enquanto sessão comum sobre singleton global permite controle cross-tenant.
**Como aplicar:** todas as rotas Provider/runtime sensíveis e scanner AST usam `requireVisionAdmin`; role admin ou `ADMIN_ALLOWED_EMAILS` são as únicas autoridades. Estado connected expira em cinco minutos. Um futuro vault por workspace exige modelo de ownership e ADR substituto, nunca relaxamento silencioso.

### ADR-048 — Identidade de Model é separada de alias, deployment e endpoint
Família, Model canônico, variante, versão e quantização qualificam identidade; alias apenas referencia essa identidade, enquanto identificador de Provider, deployment, snapshot e endpoint pertencem à offering.
**Por quê:** misturar nomes operacionais com identidade cria colisões, órfãos e perda de versão.
**Como aplicar:** alias escopado, acíclico e não ambíguo; offering só referencia Model e Provider registrados.

### ADR-047 — Provider Lifecycle é uniforme e separado de Health
Todo Provider segue `discovered -> registered -> configured -> validated -> ready`, com `disabled` e `removed`; degraded/offline são Health.
**Por quê:** lifecycle especial ou misturado com disponibilidade impede elegibilidade consistente.
**Como aplicar:** nenhuma origem, Vendor ou location pula transições; rotação/expiração exige revalidação.

### ADR-045 — Transport é detalhe operacional e não define Provider
Transport configura comunicação, mas não determina identidade, capability, location ou privacy.
**Por quê:** transformar SDK, protocolo ou marca em arquitetura cria vendor lock e inferências falsas.
**Como aplicar:** tipos neutros e configuráveis; propriedades normativas dependem de evidência própria.

### ADR-044 — Capabilities são declaradas e validadas, nunca presumidas
Capability possui identidade, versão, estado, limitações, escopo e evidência temporal; nomes de Provider, Vendor ou Model não provam suporte.
**Por quê:** presunção nominal produz routing incompatível e false capability.
**Como aplicar:** negociação usa capability efetiva Provider+Model; requisito obrigatório desconhecido elimina candidato.

### ADR-043 — Health é temporal, escopado, verificável e fail-closed
Sem observação válida, health é `unknown`; cadastro, configuração, localização ou sucesso antigo nunca equivalem a `healthy`.
**Por quê:** false health transforma ausência de evidência em tráfego e mascara indisponibilidade.
**Como aplicar:** toda observação inclui fonte, razão, escopo, `checked_at` e expiração; nenhum escopo propaga saúde a outro; routing avalia o snapshot conforme policy.

### ADR-042 — Routing é policy-driven, explicável e sem fallback nominal
Seleção manual ou automática usa requisitos e policy identificada/versionada; nenhum Provider é default ou fallback por nome.
**Por quê:** prioridade hardcoded cria Provider privilegiado e vendor lock invisível.
**Como aplicar:** filtrar requisitos duros antes de ordenar; retornar razões e `no_eligible_route`; failover é nova decisão limitada e auditada.

### ADR-041 — Provider Registry e Model Registry são autoridades separadas
Provider responde quem executa; Model Registry responde quais modelos existem; a relação é muitos-para-muitos por offering.
**Por quê:** misturar Provider e Model duplica identidades e acopla catálogo a executor.
**Como aplicar:** Providers referenciam Model IDs; ofertas conectam ambos sem copiar a definição canônica do Model.

### ADR-040 — Todo Provider implementa um contrato comum e neutro
Colibri, OpenAI, Claude, Ollama, LM Studio e qualquer Provider futuro obedecem ao mesmo contrato de domínio.
**Por quê:** contrato específico para a primeira integração torna exceção em arquitetura permanente.
**Como aplicar:** adapters normalizam transporte e erros; nenhuma extensão de vendor altera invariantes comuns.

### ADR-039 — MultiProviders possui quatro superfícies normativas
MultiProviders é composto somente por Provider Contract, Provider Registry, Model Registry e Routing; health, discovery, benchmark, lifecycle e failover pertencem a essas superfícies.
**Por quê:** módulos separados para cada mecanismo aumentariam estado, integração e documentação sem responsabilidade independente.
**Como aplicar:** não criar serviço/registry paralelo sem evidência e nova decisão arquitetural.

### ADR-038 — Arquitetura oficial consolidada
Software Factory → MultiProviders → Vision AI Installer → Vision Blueprint é a cadeia oficial, com Hermes e Ponytail como governança transversal.
**Por quê:** uma ordem única impede iniciativas paralelas e dependências invertidas.
**Como aplicar:** concluir cada SPEC antes de implementação ou da fase seguinte.

### ADR-037 — Ferramentas externas são apenas inspiração
GSD e Archify não fornecem diretórios, arquitetura, contratos ou código ao Vision Core Next.
**Por quê:** inspiração não autoriza importar dívida ou ownership externo.
**Como aplicar:** preservar apenas conceitos avaliados e redesenhados sob specs próprias.

### ADR-036 — Cadeia Software Factory → MultiProviders → Installer → Blueprint
Software Factory planeja; MultiProviders descreve execução; Installer materializa Provider; Blueprint representa a arquitetura.
**Por quê:** limites explícitos evitam duplicar registro, instalação e visualização.
**Como aplicar:** cada integração atravessa apenas seu contrato público futuro.

### ADR-035 — Vision Blueprint permanece documental
Vision Blueprint é implementação própria e permanece sem runtime nesta baseline.
**Por quê:** diagramas não devem ganhar execução implícita nem depender de Archify.
**Como aplicar:** nesta fase registrar apenas futuras views Providers, Models, Routing, Health e Failover.

### ADR-034 — Software Factory Planning Layer permanece documental
O Planning Layer define intenção e plano, mas não instala Provider, executa modelo ou escreve runtime.
**Por quê:** planejamento e execução possuem riscos e evidências distintos.
**Como aplicar:** nenhuma SPEC do Planning Layer autoriza código funcional.

---

## Produto / Enterprise

### DECISION-033 — Fase 9 pausada; multi-workspace e 2FA precedem qualquer retomada de SSO
A Fase 9 permanece pausada até existir sinal real de demanda. Quando retomada, o primeiro escopo será multi-workspace (§156) e 2FA (§158), implementados e aprovados separadamente; SSO OIDC (§155) fica fora por enquanto e só será reavaliado diante de demanda confirmada. O card Enterprise atual permanece exatamente como está (`Multi-Workspace · workers · SSO` / `Solicitar demonstração · Canal em breve`), pois comunica capacidades futuras e indisponibilidade sem afirmar que já estão entregues.
**Por quê:** a investigação de 2026-07-18 confirmou que as entregas não estão todas em zero código, mas nenhuma está completa conforme a spec: SSO tem apenas cadastro de domínio + auto-upgrade no Google OAuth; projetos já têm isolamento por owner, sem workspace/membros/roles; Métricas não é o Workers Dashboard prometido; 2FA está em zero código; e o pentest só tem checklist. Multi-workspace é invasivo porque reestrutura o modelo de dados e a autorização transversal — introduz tenant/workspace, memberships e roles sobre projetos, conversas, missões e demais recursos compartilhados — em vez de adicionar uma rota ou tela isolada. Sem demanda real, investir agora em OIDC genérico, provedores e gestão de secrets seria trabalho especulativo.
**Como aplicar:** não implementar código Enterprise enquanto a fase estiver pausada. Ao surgir demanda, decidir primeiro o modelo workspace → projetos → memberships/roles e sua migração compatível; entregar multi-workspace em fatias pequenas; depois implementar o núcleo e a política de 2FA. Não iniciar SSO por antecipação. Workers Dashboard e pentest continuam no backlog da Fase 9 e serão replanejados conforme a superfície real de lançamento. Esta decisão qualifica a ordem antiga de `docs/ENTERPRISE-SPEC.md`; não declara nenhuma feature entregue e não autoriza alteração no card da UI.

---

## Infraestrutura / Deploy

### DECISION-029 — Cutover publica o RC imutável diretamente na raiz
O Go Live publica sem rebuild o artefato aprovado em REL-002; seu `index.html` é byte-idêntico a `vision-core-next.html`, que permanece como rota compatível, e nenhum bundle legado integra o RC.
**Por quê:** preview e rollback de OPS-001 provaram os mesmos bytes e smokes em Pages. Redirect ou reconstrução criariam um segundo caminho não certificado sem benefício.
**Como aplicar:** validar o SHA-256 do ZIP antes de extrair e publicar na branch `main`; manter o predecessor imutável disponível durante a observação e republicá-lo conforme DECISION-028 se qualquer threshold falhar. A publicação produtiva continua exigindo autorização humana explícita.

### DECISION-028 — Rollback de Pages republica o artefato imutável anterior
Rollback de Pages usa o diretório arquivado do último release aprovado, validado pelo `deployment-manifest.json`, sem checkout e sem rebuild. O Release Owner é accountable, Operações executa e Quality Gates pode exigir a reversão; produção continua exigindo autorização humana explícita para a execução.
**Por quê:** reconstruir um commit antigo pode produzir bytes diferentes por ambiente ou dependências. Republicar o pacote já certificado mantém hash, evidência e tempo de recuperação verificáveis.
**Como aplicar:** antes de qualquer cutover, arquivar RC e predecessor com manifesto e SHA-256; ensaiar ambos em preview isolado. Reverter imediatamente se o hash servido divergir, qualquer smoke crítico de raiz/auth/chat/projetos/SF falhar duas vezes consecutivas, surgir P0/P1 de segurança/integridade, taxa HTTP 5xx superar 2% por 5 minutos ou p95 superar 2× o baseline por 5 minutos. Nunca apagar o predecessor durante a janela de observação. Registrar início/fim, autoridade, hashes, URLs, correlation IDs e resultado dos smokes; na dúvida ou sem telemetria suficiente, fail-closed para o predecessor.

### DECISION-027 — Pacote Pages é construído somente por allowlist
O pacote publicado pelo script manual contém exclusivamente os arquivos enumerados em `bin/pages-allowlist.txt` e um manifesto com tamanho e SHA-256 por arquivo; cópia ampla seguida de exclusões foi encerrada. Esta decisão substitui a DECISION-004.
**Por quê:** uma blocklist só rejeita debris já conhecido, enquanto a allowlist torna inclusões revisáveis, reproduzíveis e fail-closed. O manifesto liga o conteúdo testado ao pacote preparado sem publicar nada.
**Como aplicar:** `bin/deploy-pages.sh` deve chamar `tools/build-pages-package.mjs`; qualquer novo asset público entra por revisão explícita da allowlist. O builder rejeita caminho inseguro, arquivo ausente e padrão de segredo antes de invocar Wrangler.

### DECISION-026 — Administração de deploy não pertence ao cockpit Next
Deploy de Pages/Elastic Beanstalk e rollback pertencem a uma superfície operacional separada e controlada, nunca a toggles ou automação implícita dentro do cockpit Vision Core Next. Para o RC, os scripts e runbooks existentes continuam sendo a interface administrativa real; construir uma console nova não é requisito.
**Por quê:** deploy altera produção e exige autoridade, confirmação e auditoria próprias. Reproduzir no Next os controles locais inseguros do legado misturaria uso do produto com operação irreversível sem oferecer um modelo de autorização adequado.
**Como aplicar:** o Next não exibe controles de deploy. Qualquer console futura exige owner, autenticação forte, confirmação auditável e decisão nova; até lá, usar apenas os scripts/runbooks aprovados e manter deploy manual.

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
**Fechamento definitivo (2026-07-17):** achado um Personal Access Token exposto em texto puro no remote git local `gitlab` (já expirado, confirmado via API) — remote removido (`git remote remove gitlab`). Na mesma limpeza, os artefatos mortos que só existiam pra sustentar esse caminho abandonado foram removidos: `.gitlab-ci.yml` (raiz) e `.github/workflows/mirror-to-gitlab.yml` (`if: false`, mirror pro GitLab que nada mais aciona). `.github/workflows/deploy-pages.yml` (também `if: false`) teve o comentário corrigido — não referencia mais `.gitlab-ci.yml` como "onde o deploy realmente acontece". Nenhum CI/deploy real foi afetado: `bin/deploy-pages.sh` (frontend) e `deploy-backend-eb.yml` (backend) não dependem de remote git nenhum, confirmado por leitura direta antes da remoção.

### DECISION-004 — Saneamento do pacote de deploy via `rm -f` explícito no script (substituída pela DECISION-027)
Arquivos soltos de outras ferramentas (`next.html`, `atomic-core.html`, `_test_here.txt`, `assets/atomic-core.*`, `assets/vision-core-next.*`) são excluídos por linha `rm -f` explícita em `bin/deploy-pages.sh`, não movidos para outra pasta nem via `.cfpagesignore`.
**Por quê:** `.cfpagesignore` não é um mecanismo real do Cloudflare Pages/Wrangler (confirmado — não documentado pela Cloudflare); teria sido repetir o erro do `agent_id` (DECISION-011): um mecanismo que parece resolver mas não resolve. Mover arquivos exigiria reescrever referências relativas e uma convenção de pasta nova — maior que o pedido.
**Como aplicar:** cobre só os nomes de arquivo conhecidos hoje. Um debris novo com nome diferente não é pego automaticamente — não generalizar isso sem um segundo incidente confirmando o padrão (YAGNI).

### DECISION-025 — Billing permanece fora do cockpit Next no RC
Checkout, assinatura e administração financeira não ganham uma superfície no cockpit Vision Core Next durante o RC. Os endpoints reais existentes permanecem intactos; a ausência de UI é deliberada, não substituída por controles ornamentais.
**Por quê:** billing é uma superfície sensível e não existe hoje um destino externo validado que o Next possa oferecer honestamente. Expor um link sem destino ou duplicar administração financeira dentro do cockpit aumentaria risco sem completar uma jornada real.
**Como aplicar:** não alterar billing nem autenticação como parte do RC e não exibir link externo até existir uma URL válida configurada. Reavaliar somente quando billing se tornar capacidade central do cockpit ou houver jornada externa real aprovada.

---

## Governança de segurança (gates que só mudam com aprovação humana registrada)

### DECISION-023 — Projetos autenticados têm owner derivado da sessão; visitante é efêmero
Um projeto persistido pertence a exatamente um usuário autenticado. O backend deriva `user_id` exclusivamente da sessão verificada e só lista ou altera projetos desse owner; o cliente nunca escolhe nem envia ownership. No Vision Core Next, o projeto ativo é uma seleção explícita e pode ser trocado pelo usuário. Visitantes podem trabalhar apenas com um contexto efêmero local, não sincronizado com o banco compartilhado.
**Por quê:** evidência em `backend/server.js` (2026-07-14) mostrou que o `GET /api/projects` atual devolve todo `projects.json` sem autenticação e que o `POST /api/projects` aceita `body.user_id || 'anonymous'`; qualquer cliente pode ler projetos de terceiros ou forjar ownership. O próprio `/api/account/me` já demonstra o limite correto ao filtrar `p.user_id === user.id`. Persistir visitantes sob um owner comum `anonymous` não oferece isolamento identificável e criaria ambiguidade de retenção.
**Como aplicar:** IMP-001 deve tornar autenticação obrigatória para CRUD persistente, responder `401 not_authenticated` sem sessão, ignorar/rejeitar `user_id` enviado pelo cliente, filtrar toda leitura/mutação pelo usuário autenticado e cobrir isolamento entre dois usuários. O Next deve manter um único `activeProjectId` explícito por sessão autenticada, validar que ele ainda pertence ao conjunto retornado após reload/troca de conta e mostrar estados vazio/erro. Contexto visitante deve ser apagável e não pode ser promovido silenciosamente após login; qualquer importação futura exige fluxo explícito e nova decisão. `project_id` só pode alcançar histórico, timeline ou logs depois de validado contra o owner.

### DECISION-024 — Histórico de chat no backend por owner + projeto; visitante só na memória da aba
“Sessão de conversa” é um recurso diferente da sessão de autenticação. Para usuário autenticado, o backend é a única fonte de verdade do histórico: cada conversa pertence ao `user_id` derivado do token e a um `project_id` previamente validado contra esse owner. O Next lista, abre e troca conversas explicitamente. Para visitante, mensagens existem apenas no DOM/memória da aba e desaparecem no reload; não há sincronização híbrida nem promoção silenciosa após login.
**Por quê:** o Next atual apenas acrescenta bolhas ao DOM e envia cada `/api/chat` isoladamente; não existe reload de conversa. A Timeline persiste somente resumos de missão por usuário, com retenção de 90 dias, e não é histórico de mensagens. O Archivist grava/consulta resumos globais em disco sem owner ou projeto e hoje pode injetá-los no prompt; por isso não pode ser reutilizado como fonte de conversa multiusuário. Copiar o fallback `localStorage` do legado criaria duas fontes concorrentes e risco de vazamento após troca de conta.
**Como aplicar:** IMP-002 deve usar o mecanismo de persistência já adotado pelo backend, sem banco/dependência nova até concorrência real exigir, com recursos mínimos `conversation` (`id`, `user_id`, `project_id`, título, timestamps) e `message` (`role`, conteúdo textual exibido, timestamp). Retenção inicial: 90 dias, alinhada à Timeline; exclusão de conversa é explícita e exclusão de conta deve remover seus registros. Nunca persistir base64, bytes de arquivo, secrets, prompt de sistema ou conteúdo bruto de anexos; guardar apenas o texto que o usuário viu/enviou dentro dos limites do contrato. Toda leitura, paginação, criação e exclusão revalida owner + projeto no backend. Logout limpa a UI mas não apaga histórico; visitante não usa `localStorage` para mensagens. Archivist permanece memória operacional separada e só pode participar de chat autenticado após ganhar o mesmo escopo de owner/projeto em implementação própria.

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

## Software Factory / Engenharia

### DECISION-030 — Software Factory é o ambiente oficial de engenharia
O Vision Core terá um único ambiente integrado de engenharia: o Software Factory. Não haverá produto paralelo chamado "Vision Codex"; capacidades de workspace, sandbox, timeline, Git, revisão de diff, testes, Ponytail/Quality Gates, release, observabilidade e coordenação multiagente serão incorporadas progressivamente ao Software Factory.
**Por quê:** concepção, arquitetura, especificação, implementação, revisão, testes, auditoria, Git, release e deploy formam um único ciclo de vida. Separá-lo em outro produto duplicaria navegação, estado e governança, contrariando Zero Legacy Debt, Specification First, Evidence Before Change, Minimal Surface Area e Invisible Complexity.
**Como aplicar:** tratar o Software Factory como raiz arquitetural das capacidades `Architect`, `Workspace`, `Sandbox`, `Timeline`, `Git Manager`, `Diff Review`, `Test Runner`, `Ponytail`, `Quality Gates`, `Release Manager`, `Claude SDK` e `Multi-Agent Orchestrator`, sempre sobre estado compartilhado e com gates preservados. Esta decisão registra somente direção: não autoriza implementação, não cria backlog e não define prioridade. Cada capacidade futura exige spec e item próprios antes de qualquer mudança.

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
**Como aplicar:** as únicas 2 exceções que ainda escondem o widget continuam sendo (1) o toggle "mostrar Atomic Core" em Settings (`window.VCAtomicCore`, on/off explícito do usuário) e (2) a colisão real e já documentada do Modo Avançado do Software Factory (`next-clean-61`, não muda com esta decisão — grid de stack/matriz/timeline disputa a mesma zona do widget). Nenhuma outra página deve reintroduzir lógica de collapse condicional — ver `docs/VISION_CORE_NEXT_FRONTEND_SPEC.md` seção Atomic Core. **Corrigida PARCIALMENTE pela DECISION-021 (2026-07-13)** — o widget volta a ser escopado a chat/Software Factory, esta entrada fica só como registro histórico do porquê a regra mudou de novo.

### DECISION-021 — Atomic Core e cabeçalho fixo voltam a ser escopados ao Chat (corrige PARCIALMENTE a DECISION-020)
O decágono (Atomic Core) e o bloco de cabeçalho genérico ("VISION CORE" + tags de versão + status do agente local) só aparecem na aba `chat` (Atomic Core também conta Software Factory Auto-Pilot como chat — critério que não mudou desde `next-clean-61`; o cabeçalho genérico não tem essa exceção, é estritamente `chat`). Nas demais abas (Missions, Software Factory Modo Avançado, GitHub, Vault, Métricas, Agentes, Tools, Security Lab, Obsidian, Settings), o topo da página mostra um cabeçalho curto (`#vcPageHead`) específico do papel daquela aba, reaproveitando `featureMap[key].title`/`.status` — mesmo texto já usado em `#vcFeatureTitle`/`#vcFeatureStatus`, nenhuma copy nova inventada.
**Por quê:** decisão explícita do usuário (2026-07-13, `next-clean-76`) — o decágono e o cabeçalho genérico só agregam identidade visual em Chat; repeti-los em toda aba (ex.: Métricas, onde não agregam nada de específico ao contexto) era peso visual repetido sem ganho. O Atomic Core nunca foi removido do produto — só voltou a ser escopado, mesma distinção que a própria DECISION-020 já fazia ao registrar a mudança oposta.
**Como aplicar:** `updateAtomicCollapseState()` ganhou um terceiro motivo de colapso (`!inChatOrFactory`), somado aos 2 já existentes (toggle off do usuário, colisão do Modo Avançado do SF) — a lógica de colisão do Modo Avançado (incluindo o override "manter sempre visível", `window.VCAtomicCollapse`) continua idêntica, sem mudança, porque já operava inteiramente dentro do escopo `factory`. O cabeçalho genérico (`#vcBrandLockup`/`#vcAgentBadge`) e o cabeçalho curto (`#vcPageHead`) são alternados em `selectFeature()` só pela aba ativa (`activeFeature === 'chat'`), sem gate por `sfMode` — Software Factory mostra o cabeçalho curto nos dois modos. O toggle "Mostrar Atomic Core" em Settings continua controlando o widget quando ele estaria em escopo (chat/Auto-Pilot) — inalterado. CSS: `#vcBrandLockup[hidden]`/`#vcAgentBadge[hidden]`/`#vcPageHead[hidden]` usam especificidade de ID pra vencer o `display` já declarado nas classes correspondentes (regra dura #13 do `CLAUDE.md`), em vez do padrão usual `.vc-*:not([hidden])` — mais simples aqui porque os 3 elementos já tinham `id` próprio. **Corrigida pela DECISION-022 (2026-07-13):** a exceção de Software Factory e `window.VCAtomicCollapse` foram removidos da implementação oficial.

### DECISION-022 — Atomic Core é estritamente Chat; Software Factory não é exceção
O decágono (Atomic Core) aparece somente quando `activeFeature === 'chat'`. Software Factory Auto-Pilot e Modo Avançado usam o mesmo cabeçalho curto das demais abas e nunca exibem o decágono.
**Por quê:** decisão explícita do usuário (2026-07-13, `next-clean-79`) — a exceção "Software Factory Auto-Pilot conta como chat" mantinha peso visual numa área que agora deve ser operacional e compacta. O Atomic Core continua no produto, mas sem exceções fora do Chat real.
**Como aplicar:** `updateAtomicCollapseState()` deve colapsar por `getAtomicCoreEnabled()==='off' || activeFeature !== 'chat'`. A regra antiga de auto-collapse do Modo Avançado e o controle "manter sempre visível" ficaram obsoletos; o toggle "Mostrar Atomic Core" permanece e só tem efeito visual quando o usuário volta ao Chat. Fora de Chat, `#vcChatStream` e `.vc-atomic-hud` saem do layout por CSS. O cabeçalho curto `#vcPageHead` é o cabeçalho canônico das abas não-Chat; o header interno `#vcFeaturePanel > .vc-feature-head` deve ficar oculto nessas abas para não duplicar badge/título.

### DECISION-031 — Atomic Core usa sidebar direita canônica, não proporção fluida
O Chat possui uma sidebar direita com as mesmas larguras da navegação esquerda: 252px expandida e 78px recolhida. O Atomic Core é dimensionado para caber na área interna dessa rail e fica ancorado no canto inferior direito; mensagens e composer ocupam exclusivamente a coluna central.
**Por quê:** o grid anterior recalculava coluna textual, zona do HUD, margens negativas e offsets conforme viewport e altura da resposta, exigindo reajustes manuais sucessivos e produzindo vãos variáveis. Duas rails de largura canônica tornam a geometria previsível.
**Como aplicar:** `.vc-app-shell` usa três colunas (`--sidebar-width`, centro `1fr`, `--atomic-sidebar-width`). A rail direita reutiliza `.vc-sidebar`, `.vc-side-top` e `.vc-sidebar-toggle`, persiste estado próprio em `vc_atomic_sidebar_state` e nunca adota largura derivada do HUD. O HUD escala para no máximo 224px e ancora em `right:0; bottom:0` dentro do painel. São proibidos novos `minmax()` proporcionais para o HUD, margens negativas, parallax de scroll e compensações vinculadas ao tamanho da resposta. Detalhes normativos em `docs/ATOMIC_CORE_SPEC.md`.

---

## Backend / Custo e Observabilidade

### DECISION-032 — Custo real por agente: usage/cost_usd aditivos em `callLLM()`, ledger por agente opt-in
`callLLM()` (`backend/server.js`) passa a extrair `usage` (tokens de entrada/saída) da resposta bruta de cada provider e calcular `cost_usd` via tabela de preço de referência pública aproximada (`backend/llm-cost.js`, `PRICE_PER_1M_TOKENS`). Esses campos são **aditivos** ao retorno de `callLLM()` (`{text, provider, model, tokens_in, tokens_out, cost_usd}`) — nenhum dos ~15 call sites existentes que só destructuram `{text, provider, model}` muda de comportamento. Persistência num ledger por agente (`backend/data/agent-costs.json`) só acontece quando o caller passa `opts.agent` explicitamente (hoje: `'Hermes RCA'` em `/api/copilot` e `/api/hermes/analyze`, `'OpenClaw'` em `/api/openclaw/orchestrate`, ramo `diagnose`) — call sites que não passam `agent` (SF modules 02-09, mission-composer, security-fix suggestions) continuam funcionando exatamente como antes, sem gravar nada. `/api/metrics/agents` lê o ledger e substitui `cost_usd: null` por um número real para os agentes que o vault já rastreia; Scanner/Aegis/Go Core/PASS GOLD continuam `null` porque genuinamente não chamam LLM (confirmado por leitura direta do código, não suposição) — a nota antiga de OpenClaw ("orchestration — no LLM cost") estava **errada**: o ramo `decision==='diagnose'` sempre chamou LLM; corrigida para refletir que só esse ramo tem custo.
**Por quê:** `docs/ROADMAP.md` Fase 2 registrava "custo real por agente" como `PLANEJADO`, bloqueando `vcComponents.pipeline()` de ter dado completo e deixando `/api/metrics/agents` sempre `null` mesmo com providers reais configurados. O maior risco declarado era tocar `callLLM()`, núcleo compartilhado por quase todo o backend — por isso o design é estritamente aditivo/opt-in, não uma reescrita.
**Como aplicar:** preços em `PRICE_PER_1M_TOKENS` são estimativas de referência pública (marcadas como tal no código), não faturamento real — atualizar manualmente se a tabela de preço de um provider mudar. Atribuir um novo agente a um call site existente de `callLLM()` é só adicionar `agent: 'Nome'` nas opções — não requer mudança em `callLLM()` em si. **Fora de escopo deliberado desta decisão** (não implementado, para não expandir o raio de mudança numa única sessão): custo por estágio individual de uma missão específica (exigiria threading de `mission_id` por todos os call sites de SF module + mudança de schema de `mission-timeline.json`) — `vcComponents.pipeline()` já renderiza `stages[]` reais desde `next-clean-116`/`next-clean-117` (achado desta sessão: isso já estava implementado e testado, `docs/CURRENT_STATE.md`/`docs/ROADMAP.md` estavam desatualizados ao dizerem "sem call site"), só não inclui custo por estágio.
**Testes:** `tools/tests/llm-cost.test.mjs` (32/32, funções puras de extração/cálculo/ledger) + `tools/tests/callllm-vault-wiring.test.mjs` (12/12, sem regressão) + suíte `tests/e2e/vision-core-next-*.spec.mjs` completa (158/158, sem regressão — inclui `vision-core-next-metrics.spec.mjs` que já fixava o contrato `cost_usd: number|null` antes desta mudança).

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
