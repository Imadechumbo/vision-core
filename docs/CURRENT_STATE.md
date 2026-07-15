# CURRENT STATE — Vision Core Next

**Único documento carregado automaticamente no início de cada sessão, junto com `CLAUDE.md`.** Documento vivo de revezamento entre agentes (Codex / Claude Code / OpenCode / Omnigent). Ordem de leitura completa em `docs/README_DOCUMENTATION.md`. Histórico completo e narrativas de sessão vivem em `docs/session_logs/` e `docs/CHANGELOG_NEXT.md`; decisões fechadas vivem em `docs/DECISIONS.md` — este arquivo é só o estado atual, mantenha-o pequeno (~200 linhas).

---

# ESTADO DO SISTEMA

Frontend Next
✔ OK

Backend
✔ OK — EB `v116-a8189457-hermes-grounding`, Ready/Green; grounding Hermes fail-closed confirmado pela UI pública.

Software Factory
✔ OK (simulação/preview por design — nenhum módulo escreve em disco ou executa real)

Atomic Core
✔ OK

Chat
✔ OK

Deploy Produção
✔ `next-clean-73` publicado via `bash bin/deploy-pages.sh` (autorizado explicitamente pelo usuário) e confirmado ao vivo com screenshot Playwright real: cache-bust servido (`?v=next-clean-73` no JS), teste end-to-end com conta real registrada em produção + missão real gravada via `POST /api/mission/timeline` — Timeline auto-carregou a missão real ao abrir a aba, sem nenhum clique, sem sobreposição do composer.

`next-clean-74` publicado via `bash bin/deploy-pages.sh` (autorizado explicitamente pelo usuário) e confirmado ao vivo com screenshot Playwright real contra `https://visioncoreai.pages.dev/vision-core-next.html`: cache-bust servido (`?v=next-clean-74` em CSS e JS, HTTP 200), menu lateral reorganizado presente (2 `.vc-nav-group`, rótulos "Atividade"/"Avançado", 7 itens fixos como filhos diretos de `.vc-nav`).

Cache Bust
next-clean-93 (publicado em produção em 2026-07-14; alias principal e deployment `d70e8686.visioncoreai.pages.dev` confirmados servindo o cache-bust novo)

Último Commit

ver `git log -1 --oneline` (pode haver commit local ainda não pushado)

Último Deploy

`d70e8686.visioncoreai.pages.dev` (Production) + alias principal `visioncoreai.pages.dev`, ambos confirmados servindo `next-clean-93`

---

# IMPLEMENTAÇÕES DESTA SESSÃO
✔ `next-clean-93` publicado em produção: menu de usuário nativo e persistente no header reutiliza conta/Settings e `POST /api/auth/logout`; logout local é imediato, limpa token, Workspace/conversa/mensagens e restaura a Hero visitante com Google. Os três planos são cards inteiramente selecionáveis; PRO/Enterprise comunicam disponibilidade/interesse sem request, checkout ou backend fictício. Commit `b1d5b1f6`; package SHA-256 `663bfaa27f14b06ea8435799ff97cd8ad92ddcbbbe2eccbd4cd708e3f657e5a8`; deployment `https://d70e8686.visioncoreai.pages.dev`. Gates: dirigido 40/40; Pages 11/11; pairing 13/13; performance 59/59 (402.866B, p95 máximo 31,85ms); Next 137/137 sem retry em 49,1s. Smoke HTTP confirmou raiz, rota canônica, assets e manifesto; navegador real confirmou Hero/planos e seleção PRO sem envio de dados.

✔ RC2/OPS-002 concluído em produção: o pacote certificado do commit `eaddb98a` foi publicado em `https://20abd0f1.visioncoreai.pages.dev` e no alias `https://visioncoreai.pages.dev`. RC SHA-256 `9a905d495f1e6470b104aa501f1232cc8c5b5d8236830d345bef957a3132df7a`; package SHA-256 público `945aedb748be84c4deb53fbe973edae76e86db027ea56ca52e7dd35012f13290`. Gates: Pages 11/11, Playwright 135/135, performance 59/59, acessibilidade 59/59, segurança 13/13 + secret scan, Ponytail `Lean already. Ship.`. Smoke produtivo 8/8; raiz e `/vision-core-next` byte-idênticas ao RC; navegador real confirmou Hero contextual, Workspace, composer e `next-clean-92`. Evidência em `artifacts/next-rc-release/release-evidence.json` e `production-hero-rc2.png`.

✔ `next-clean-92` implementado localmente, sem deploy: uma função deriva os quatro estados oficiais da Hero; visitante mantém planos/OAuth, contas autenticadas reutilizam Workspaces e conversas reais, e trabalho iniciado remove a Hero sem espaço residual. A UI usa Workspace sem mudar `/api/projects` nem identificadores internos, limita recentes a três com o último ativo primeiro e preserva Atomic Core/composer. Um overflow real de 7 px a 1366 px foi corrigido com wrap responsivo. Gates finais: sintaxe PASS; dirigido 38/38; pacote 11/11; pairing 13/13; performance 59/59 (398.613B, p95 máximo 35,79ms); Next 135/135 sem retry em 50,8s.

✔ Hero Area do Chat ajustada localmente, sem deploy: onboarding e Atomic Core agora compartilham a primeira faixa responsiva, eliminando o vazio superior sem alterar o componente Atomic; composer permanece sticky no rodapé e a primeira mensagem remove o onboarding do fluxo. O header principal perdeu a copy interna `V2.9.10 • FULLSTACK • SAAS • HERMES • PASS GOLD`, mantendo logo/nome, agente, projeto e conversa. Gates: App Shell 14/14 em desktop e 375px; pacote 11/11; pairing 13/13; performance 59/59 (394.166B, p95 máximo 29,03ms); Next 128/128 sem retry em 44,7s.

✔ Onboarding/Auth/Tutorial do estado vazio implementado localmente, sem deploy: Chat vazio ganhou apresentação compacta, planos honestos e CTA para o composer; Google reutiliza `/api/auth/oauth/google?return_to=next`; o status vertical do header virou `Projeto temporário`; Smile foi renomeado Tutorial e o modal existente evoluiu para 13 passos com foco preso, Escape, pular, preferência persistida e reinício em Settings. Nenhum billing, endpoint, store ou produto paralelo foi criado. Gates: pacote 11/11, pairing 13/13, performance 59/59 (393.913B; p95 máximo 33,73ms), Next 127/127 sem retry. Screenshots em `artifacts/next-onboarding/`.

✔ OPS-002 pronto até o gate produtivo: hashes do RC (`72e6a02c...`), package (`f4a4db9f...`) e predecessor (`76918f97...`) revalidados; ZIP tem 13 entradas, raiz e rota Next, sem bundle legado. A raiz pública foi verificada ainda no predecessor. Nenhum deploy em `main` foi executado. Estado permanece 23/26 até o cutover efetivo.

✔ ADR-007 aprovado na DECISION-029: Go Live publica diretamente, sem rebuild ou redirect, o ZIP imutável de REL-002; `index.html` é byte-idêntico ao Next, a rota explícita permanece, bundles legados ficam fora do RC e o predecessor é preservado para DECISION-028. Estado 23/26; OPS-002 Ready, aguardando apenas o gate humano da publicação produtiva.

✔ OPS-001 Succeeded sem produção: RC publicado somente na branch preview `rc1-rehearsal-20260714` (`31709674.visioncoreai.pages.dev`), manifesto remoto `f4a4db9f...` e smoke HTTP 7/7; navegador real confirmou raiz Next, composer visível e bundle legado ausente. O predecessor commitado foi republicado na mesma branch (`28c60fa9.visioncoreai.pages.dev`), manifesto remoto `85d8828197...` e smoke 7/7; navegador confirmou raiz legada restaurada. Rollback deploy 19,719s; com smoke 24,922s. Alias principal/produção intocados. Evidência em `artifacts/next-rc-release/release-evidence.json`; estado 22/26, ADR-007 Ready.

✔ REL-002 aprovado localmente, sem produção: RC `vision-core-next-rc1.zip` arquivado no próprio commit, SHA-256 `72e6a02c56f0bca98375294cb53cf88cdb71f6c4db9ffe829790f3d8cf24b5b3`, package SHA-256 `f4a4db9f9eeb57f2122631bb8f5eaabab1d0f8b50479fc2e42ecd80642419926`. O builder publica a entrada oficial Next também como `index.html`, byte-idêntica, e o pacote contém 12 arquivos/zero legado. Predecessor `next-clean-82` foi capturado dos bytes públicos, não rebuildado, e arquivado separadamente. Gates: pacote 11/11, pairing 13/13, performance 59/59, Next 124/124 em 50,7s com 2 workers/retries desativados, estrutura 2/2 e secret scan PASS. Evidência em `artifacts/next-rc-release/release-evidence.json`. Estado: 21/26 concluídos; OPS-001 e ADR-007 Ready.

✔ Auditoria final segura em `2432dcde`: Next 124/124 PASS em 59,6s com 2 workers e `--retries=0`; pairing 13/13; performance 59/59 (386.166B/460.800B, p95 máximo 34,24ms/100ms); pacote Pages 10/10. A primeira execução sob 6 workers recuperou 2 timeouts por retry; reprodução isolada 35/35 e suíte integral limitada a 2 workers passaram sem retry, caracterizando contenção do ambiente, não regressão funcional. Worktree restaurada após artefatos gerados. Estado: 20/26 concluídos; os 6 restantes dependem de OPS-001 externo e da cadeia REL-002→ADR-007→OPS-002/003/004. Próximo passo autorizado apenas em tarefa com operação externa: executar `docs/PAGES_RELEASE_RUNBOOK.md` numa branch de preview não produtiva.

◐ OPS-001 preparado, não executado: `docs/PAGES_RELEASE_RUNBOOK.md` registra preparação local, guard que proíbe branches de produção, comandos oficiais de preview, smokes, evidência e reversão por republicação do predecessor. A documentação oficial confirma que preview não é alvo do rollback nativo de Pages; por isso o ensaio usa a mesma branch de preview com o pacote arquivado. Publicar o preview continua pendente e fora desta tarefa sem deploy.

✔ ADR-006 aprovada como DECISION-028: rollback de Pages republica o artefato predecessor imutável, nunca faz rebuild; hash, smokes, P0/P1, 5xx e p95 têm thresholds objetivos; Release/Operações/Quality e autoridade humana de produção estão definidos; falta de telemetria falha para o predecessor. Nenhuma publicação foi executada. Backlog: 20/26 concluídos; OPS-001 desbloqueada, mas permanece operação externa fora desta tarefa sem deploy.

✔ IMP-007 concluída localmente (sem deploy): DECISION-027 substitui a antiga blocklist por `bin/pages-allowlist.txt`; builder stdlib gera pacote com exatamente 16 arquivos aprovados + manifesto, secret scan e SHA-256 por arquivo. Gate permanente 10/10 PASS, incluindo referências públicas; dois builds idênticos produziram package SHA-256 `0f58110f02efe382418f644e1e2ef22ad98f4cb691c7d7da87c1bb6a3b7a3a10`; downloads/debris excluídos; sintaxe Bash validada. Backlog: 19/26 concluídos; ADR-006 desbloqueada.

✔ TEST-004 aprovado sem mocks de endpoints: gate permanente `tests/e2e/vision-core-next-real-e2e.spec.mjs` 2/2 PASS em 3,2s; auth, projeto, conversa, pergunta exata sobre fine-tuning com recusa grounded, timeline, logs, agente, SF e ZIP passaram contra backend HTTP descartável real. Manifesto: 27 requests, 27 correlation IDs, zero interceptação e zero campo sensível; screenshot em `artifacts/next-rc-e2e/ui-critical.png`; suíte Next 124/124 PASS em 48,9s. Backlog: 18/26 concluídos; IMP-007 desbloqueado.

✔ `next-clean-90` / IMP-009 implementada localmente (sem deploy): base da API vem de meta validada por origin; documento oficial mantém o gateway real, valor inválido cai no default e query string não controla o destino. Playwright temporário provou backend HTTP descartável real sem `page.route`: 2/2 PASS; suíte permanente Next 122/122 PASS em 49,1s. Backlog: 17/26 concluídos; TEST-004 desbloqueado.

⚠ Preparação de TEST-004 encontrou bloqueio de testabilidade: `API_BASE_URL` hardcoded só permite produção ou interceptação, e o gate proíbe ambos para o ambiente descartável. IMP-009 criado para override explícito por meta do documento, mantendo o gateway oficial como default e rejeitando valor inválido. Backlog ampliado para 26 itens: 16 concluídos.

✔ TEST-003 aprovado com gate permanente stdlib `tools/tests/next-performance-budget.test.mjs`: 59/59 PASS; carga inicial 386.166B sob budget 460.800B; HTML/CSS/JS/PNG sob limites individuais; SHA-256 registrado; p95 local máximo 34,24ms sob teto 100ms em 10 rounds íntegros.

✔ TEST-002 aprovado após correção separada IMP-008: auditoria temporária 3/3 PASS (IDs/nomes acessíveis, foco contido+restaurado, reduced motion prioritário) e regressão afetada 41/41 PASS. Spec temporário removido conforme DECISION-009. Backlog: 15/25 concluídos.

✔ `next-clean-89` / IMP-008 implementada localmente (sem deploy): `#vcProjectName` e `#vcPrompt` têm nomes acessíveis; modal Smile contém Tab/Shift+Tab e Escape restaura foco ao trigger. Auditoria temporária 3/3 PASS; regressão App Shell + Atomic Core 41/41 PASS. Backlog: 14/25 concluídos; TEST-002 pronto para recertificação.

⚠ TEST-002 falhou de forma reproduzível (2 tentativas): `#vcProjectName` e `#vcPrompt` não têm nome acessível e Tab escapa de `#vcSmileModal`; reduced motion passou. IMP-008 foi criado como correção XS separada antes da recertificação. Backlog ampliado de 24 para 25 itens: 13 concluídos.

✔ TEST-001 aprovado com gate permanente de segurança `tools/tests/agent-pairing.test.mjs`: backend real isolado 13/13 PASS; queue/result retornam 401 sem secret ou com secret cruzado, agente B não consome missão A, par correto completa round-trip, status reflete polling e nenhuma evidência persiste/expõe `agent_secret`. SQLite restaurado no cleanup; nenhum apply foi executado. TEST-004 desbloqueado.

✔ `next-clean-88` / IMP-006 implementada localmente (sem deploy): Landing/About não expõem mais links de billing sem destino nem blocos explicitamente não implementados; tabelas, grids e conteúdo técnico respeitam viewport de 375 px. Smoke temporário de links internos, assets, WIP visível e mobile: 4/4 PASS; inspeção local a 1280 px: `scrollWidth=1265`, zero offender; suíte permanente Next: 122/122 PASS em 49,2s. Backlog: 12/24 concluídos; TEST-001/002/003 estão Ready.

✔ ADR-005 aprovada e registrada como DECISION-026: administração de deploy fica em superfície operacional separada; no RC, scripts/runbooks existentes continuam sendo a interface real e o cockpit Next não ganha toggles de deploy. Nenhum deploy ou mudança de produção foi executado. Backlog: 11/24 concluídos.

✔ ADR-004 aprovada e registrada como DECISION-025: billing permanece fora do cockpit Next no RC; endpoints reais, autenticação e jornada financeira não mudaram; nenhum link ornamental será exibido sem destino externo válido. Backlog: 10/24 concluídos.

✔ ADR-003 aprovada por reconciliação com DECISION-005: Apply real permanece fechado no RC; nenhuma flag mudou. `vision-core-next-agent-apply.spec.mjs` segue dentro da suíte verde 122/122. Backlog: 9/24 concluídos; TEST-001 desbloqueado.

✔ `next-clean-87` / IMP-005 implementada localmente (sem deploy): Chat bloqueia duplo submit e expõe Cancelar apenas sobre AbortController real; projeto tem retry explícito; Logs/SF reutilizam ações idempotentes e guards `InFlight`; nenhum cancelamento backend fictício. Testes: projetos/chat/logs/histórico 8/8 PASS; suíte permanente Next 122/122 PASS em 44,9s, sem retry. Backlog: 8/24 concluídos; TEST-002/003 estão Ready.

✔ `next-clean-86` / IMP-004 implementada localmente (sem deploy): helper único aplica `data-state=loading|empty|error|success` com texto/aria-live em projetos, logs, histórico de missões e geração/download SF. Testes: projetos/logs/histórico 7/7 PASS; projetos+SF 12/12 PASS; suíte permanente Next 121/121 PASS em 46,4s, sem retry. Backlog: 7/24 concluídos; IMP-005 desbloqueada.

✔ `next-clean-85` / IMP-003 implementada localmente (sem deploy): `request_id` uniforme em header/envelope, operation log allowlisted por owner/projeto, auth+paginação+filtros mission/job e aba Logs SAFE READ. O antigo `/api/logs/download` público agora retorna 410. Testes: backend real 23/23 PASS; UI projetos/conversas/logs 6/6 PASS; suíte permanente Next 120/120 PASS em 43,7s, sem retry. Backlog: 6/24 concluídos; IMP-004 desbloqueada.

✔ `next-clean-84` / IMP-002 implementada localmente (sem deploy): conversas autenticadas persistem no backend por owner + projeto, retenção 90 dias, paginação, listagem/reload/troca/exclusão e cascade LGPD. O header ganhou seletor/Nova/Excluir; visitante permanece efêmero; somente texto visível é salvo em ordem. Testes: backend real projetos+conversas 18/18 PASS; UI + Conta/OAuth 14/14 PASS; suíte permanente Next 119/119 PASS em 47,0s, sem retry. Backlog: 5/24 concluídos; IMP-003 desbloqueada.

✔ `next-clean-83` / IMP-001 implementada localmente (sem deploy): `/api/projects` agora exige sessão, deriva owner no backend, filtra por usuário e rejeita `user_id` do cliente. O Next ganhou seletor/criação global de projeto, contexto temporário para visitante, vazio/erro explícitos e seleção por usuário em `sessionStorage`. Testes: backend real 9/9 PASS; UI + Conta/OAuth 13/13 PASS; suíte permanente Next 118/118 PASS em 50,3s, sem retry. Backlog: 4/24 concluídos; IMP-002 desbloqueada.

✔ ADR-002 aprovada e registrada como DECISION-024: histórico autenticado terá backend como fonte única, escopo obrigatório por owner + projeto e retenção de 90 dias; visitante fica apenas na memória da aba. Timeline e Archivist não serão reaproveitados como conversa. Evidência real: o Next atual só mantém bolhas no DOM, `/api/chat` é mensagem isolada e o Archivist não possui isolamento por usuário/projeto. Backlog: 3/24 concluídos.

✔ ADR-001 aprovada e registrada como DECISION-023: projetos persistidos são autenticados, têm ownership derivado exclusivamente da sessão e seleção explícita no Next; visitante fica efêmero e não entra em `projects.json`. Evidência real: `GET /api/projects` atual expõe todo o banco sem auth e `POST` confia em `body.user_id`; a correção ficou corretamente separada em IMP-001. Backlog: 2/24 concluídos; ADR-002 e IMP-001 desbloqueados.

✔ REL-001 do Engineering Executive Backlog V2 concluída: `e4eee79c` foi confirmado como ancestral do HEAD reconciliado; `codex/next-rc-baseline` foi criada em `origin` como referência revisável. Antes do push, todos os workflows foram inspecionados: deploys por `push` aceitam somente `main`, e Pages/mirror continuam com `if: false`. Nenhum PR, merge ou deploy foi executado. O dashboard e o Kanban de `docs/VISION_CORE_IMPLEMENTATION_MASTER_PLAN.md` agora registram 1/24 concluído e ADR-001/003/004/005 + IMP-006 em Ready.

✔ Regressão de grounding do Chat real corrigida e deployada no EB `v116-a8189457-hermes-grounding`: o workflow agora inclui e verifica o documento de grounding; ausência falha com 503. A frase exata reportada foi confirmada pelo composer público. Teste permanente e evidências: `docs/session_logs/2026-07-14-hermes-ui-grounding-regression.md`.

✔ `next-clean-79` — DECISION-022: Atomic Core/decágono estritamente na aba Chat; Software Factory Auto-Pilot e Modo Avançado não contam mais como exceção. Cabeçalhos curtos fora de Chat agora são canônicos (`#vcPageHead`) e o header interno duplicado de `#vcFeaturePanel` fica oculto nesses contextos. Controle obsoleto "Manter Atomic Core sempre visível" removido; "Mostrar Atomic Core" e intensidade permanecem. Validado localmente: `node --check` OK, specs afetados 33/33 PASS, suíte permanente Next 106/106 PASS. Deployado em produção via `bin/deploy-pages.sh` e confirmado ao vivo servindo `next-clean-79`; screenshots Playwright reais em `%TEMP%\vision-core-next79-screens\`.
✔ `next-clean-82` — movimento customizável do Atomic Core integrado sobre `next-clean-81`: velocidade + padrão do Idle (Clássica/Pulso suave/Deriva), padrão do Action (Clássico/Órbita ampla/Pulso) e Retorno dedicado (`Nenhum`/`Rápido`/`Suave`). As 6 preferências persistem via `window.VCAtomicMotion`; Deriva respeita o teto seguro já validado e "Reduzir animações" mantém prioridade máxima. Deployado em 2026-07-14 via `bin/deploy-pages.sh`; produção confirmou `next-clean-82`, os 4 controles no HTML e `VCAtomicMotion`/`easeInOutQuad` no bundle público.

✔ `next-clean-80`/`next-clean-81` — regressão visual do topo do Software Factory corrigida. `next-clean-80` removeu a caixa solta duplicada (`#vcFeaturePanel`) acima de `#factory`; validação de produção ainda revelou vão residual causado por `#vcChatScroll` vazio mantendo `min-height:260px`. `next-clean-81` colapsa `#vcChatScroll` somente em Factory; produção confirmada com gap 49px, `featurePanelHidden=true`, `scrollDisplay=none`, `sfTextCount=1`, Chat preservado com Atomic Core. Validado localmente: `node --check` OK, specs afetados 28/28 PASS, suíte permanente Next 106/106 PASS. Screenshots Playwright reais em `%TEMP%\vision-core-next81-screens\`.

✔ `next-clean-77` — OAuth Google/GitHub no Vision Core Next: Settings → Conta agora tem botões Google/GitHub que chamam `/api/auth/oauth/{provider}?return_to=next`; backend preserva o legado por padrão e só retorna para `/vision-core-next.html` quando o `state` fechado marca `target:"next"` (sem open redirect por URL livre). O hash `#oauth-success&token=...` grava o mesmo `localStorage['vision_token']` do login email/senha; `#oauth-error=...` abre Settings com erro legível. **Deployado em produção**: Pages serve `next-clean-77`, EB `vision-core-prod` está em `v113-91e5ed3966c7b1486b7325d4a5e8952be3c93215` (`Ready/Green`), Worker OAuth decodifica `target:"next"` com `return_to=next` e `target:"legacy"` sem o parâmetro.

✔ `next-clean-76` — DECISION-021: Atomic Core + cabeçalho genérico escopados ao Chat; Software Factory Auto-Pilot continua com decágono; demais abas usam cabeçalho curto por papel. **Deployado em produção** e confirmado ao vivo em `visioncoreai.pages.dev` servindo cache-bust `next-clean-76`.

✔ `next-clean-75` — Proposta 2 implementada: Timeline e Dashboard removidos como abas próprias. Histórico de Missões permanece em Missions; Métricas ganhou toggle local "Largura total" reaproveitando `vc-chat-stage--wide`/`vc-feature-panel--wide`; Agentes foi mantido como aba própria por agregar status, catálogo e métricas safe-read. Validado localmente: `node --check` OK, specs afetados 41/41 PASS, suíte permanente Next 102/102 PASS, screenshots locais em `artifacts/next-clean-75/`. Sem deploy.

✔ `next-clean-74` — investigação do menu lateral (14 itens, propósito real de cada um lido direto de `featureMap`/painéis/gates de auth) reportada e aprovada pelo usuário; implementada a Proposta 1 (das 3 propostas apresentadas): sidebar fixa (Chat/Missions/Software Factory/GitHub/Vault/Métricas/Settings) + grupos colapsáveis nativos `<details>`/`<summary>` (sem JS novo, ponytail rung 4) "Atividade" (Timeline/Agentes/Dashboard) e "Avançado" (Tools/Security Lab/Obsidian). Smile continua fora da lista de itens (é botão de ajuda). Só reorganização visual/estrutural — nenhuma rota, endpoint, painel ou `featureMap` alterado; clique em `[data-feature]` seguiu funcionando sem mudança de JS porque o listener já era genérico (`document.querySelectorAll('[data-feature]')`, independente de aninhamento no DOM). Validado localmente: 107/107 PASS (suíte `tests/e2e/vision-core-next-*.spec.mjs`, sem nenhuma alteração nos specs) + screenshot Playwright local confirmando os 2 grupos abertos por padrão e o toggle de colapso funcionando (`<details>.open` alterna corretamente). **Deployado em produção** (autorizado explicitamente pelo usuário) e reconfirmado ao vivo com Playwright real contra `visioncoreai.pages.dev` (cache-bust `?v=next-clean-74` HTTP 200, 2 grupos + 7 itens fixos presentes no DOM real). Proposta 2 (fundir Timeline/Dashboard como abas próprias) registrada como pendência em `docs/ROADMAP.md` Fase 1, condicionada a nova autorização.

✔ `next-clean-73` — bug real diagnosticado e corrigido: aba Timeline não mostrava nenhuma missão. Round-trip `POST`→`GET /api/mission/timeline` confirmado funcionando perfeitamente contra produção real (conta de teste descartável) — causa 100% de renderização: `renderFeatureActionViz()`/`summarizeResult()` sem caso para `{entries:[...]}`, caindo no fallback genérico. Fix autorizado (opção a+b): Timeline auto-carrega ao abrir a aba, reaproveitando o widget já funcional de Missions → Mission History (`loadMissionHistory()`, mesmo `#vcMissionHistory`) — botão genérico removido. Achado da RCA: sem os formulários extras de Missions acima, o painel curto caía atrás do composer sticky (regra dura #12) só em Timeline — fix cirúrgico via `scrollIntoView` só nesse caminho, Missions idêntico e testado sem regressão. Novo arquivo de teste dedicado (4 testes), **107/107 PASS, deployado e confirmado ao vivo em produção (teste end-to-end com conta real registrada + missão real gravada)**.

✔ `next-clean-72` — bug real corrigido: composer não aparecia na página Software Factory ao rolar até o fim (`#factory` vivia fora de `.vc-chat-stage`). 103/103 PASS, **deployado e confirmado ao vivo em produção**.

✔ `next-clean-71` — investigação Fase 1 da Timeline estilo LionClaw + conexão do SF Auto-Pilot ao `POST /api/mission/timeline`. 102/102 PASS, **deployado e confirmado ao vivo em produção**.

✔ `next-clean-70` — bug real corrigido: painel de Métricas colapsava/sumia a cada ~10-12s. 100/100 PASS, **deployado e confirmado ao vivo em produção**.

✔ `next-clean-69` — remoção completa do hero do chat (`#vcChatIntro`/`.vc-chat-intro`). 99/99 PASS, **deployado e confirmado ao vivo em produção**.

✔ `next-clean-68` — hero do chat escondido condicionalmente fora de `chat`/`factory` (efeito colateral do `next-clean-67`, hero vazava pra toda página). 99/99 PASS, **deployado e confirmado ao vivo em produção**.

✔ `next-clean-67` — Atomic Core vira elemento persistente global, visível em qualquer página/aba (`DECISION-020`). 98/98 PASS, **deployado e confirmado ao vivo em produção**.

✔ `next-clean-66` — Atomic Core ancorado de verdade no canto superior direito real. Métricas e SF Modo Avançado ganham `--wide`. Legibilidade dos 9 nós corrigida. 96/96 PASS, **deployado e confirmado ao vivo em produção**.

✔ `next-clean-65` — remoção da rolagem interna duplicada; regra dura #12 preservada via `ResizeObserver`. 92/92 PASS, **deployado e confirmado ao vivo em produção**.

✔ `next-clean-64` — `ARCHITECTURAL PRINCIPLE-006 — No Fixed Viewport Layout`; Atomic Core saiu de `position:fixed`; nova página `Dashboard`. 91/91 PASS, **deployado e confirmado ao vivo em produção**.

Sessões anteriores (concluídas, sem pendência): Tutorial Smile + histórico público (`next-clean-60`), Atomic Core auto-collapse (`next-clean-61`), Auth email/senha (`next-clean-62`), Atomic Core Settings on/off+intensidade (`next-clean-63`) — todos deployados e confirmados ao vivo, ver `docs/CHANGELOG_NEXT.md`.

Todos os itens até `next-clean-73` estão deployados e confirmados ao vivo. `main`/`origin/main` foram sincronizados até `next-clean-71` (merge + push autorizados explicitamente pelo usuário) — os commits de `next-clean-72`/`73` (nesta branch) ainda não foram levados pra `main`, pendência real até o usuário pedir.

---

# PENDÊNCIAS REAIS

- Páginas públicas `about.html`/`landing.html` (Etapas 5-7) — escopo ainda indefinido, decisão de quando/o quê fica para quando chegar a vez (não é PARE E PERGUNTE, é ausência de spec concreta)
- AI Provider Vault Fase D(b) — conectar `sf-agent-orchestrator.mjs` ao vault (decisão de arquitetura em aberto)
- SF-Agent-Orchestrator Fase 2 — bloqueado por cota de API, smoke test real incompleto
- `vc-secret-guard` Fase 2 (hooks locais) — precisa nova aprovação explícita do usuário
- `vc-secret-guard verify-cloud` — comando Rust read-only para auditar metadados de env vars do EB, testes locais Rust passam, mas a verificação viva do EB está bloqueada por falha TLS/trust store local da AWS CLI. Não usar `--no-verify-ssl`; corrigir TLS primeiro e rerodar.
- INCIDENTE-3 (credencial de fallback legada) — guard de `/api/auth/login` já confirmado ao vivo em produção (EB `v109`, `400 fallback_credential_rejected`); guard de `/api/auth/register` confirmado só no artefato/regressão local (revalidação ao vivo ficou pendente por rate-limit durante o teste). Runbook `tools/incident-3-legacy-account-scan.mjs --invalidate` para contas legadas já existentes em produção é ação pendente do usuário (ver `docs/DECISIONS.md` DECISION-007)
- Timeline estilo LionClaw (pipeline por estágios + custo por agente) — bloqueada por dado real ausente no backend, ver `docs/ROADMAP.md` Fase 2 ("persistir estágios por missão"/"custo real por agente", ambos `PLANEJADO`)

---

# PRÓXIMA PRIORIDADE

Fechar a Onda 1 independente: ADR-003/004/005 e IMP-006 estão Ready; TEST-002/003 também podem certificar o baseline atual. Próximo item: ADR-003, formalizando no backlog a decisão já vigente DECISION-005 (Apply permanece fechado). Comando inicial recomendado: `rg -n "ADR-003|DECISION-005|AGENT_APPLY_ENABLED" docs backend frontend tests/e2e/vision-core-next-agent-apply.spec.mjs`.

---

# RISCOS CONHECIDOS

- Token de auth em `localStorage`/`sessionStorage` — exposto a XSS, risco aceito (paridade com o legado, não é regressão do Next)
- `backend/data/users.json` tem hash de senha de teste no histórico git — ação de rotação pendente do usuário, fora do alcance deste repo
- OAuth Google/GitHub no Next implementado e publicado em `next-clean-77`
- Itens menores, não bloqueantes: boto3 bloqueado por certificado SSL local (Windows, mesma limitação histórica do node-gyp); `/api/health` retorna `version` hardcoded desatualizada (cosmético); ruído CRLF/LF pré-existente no `git status` (`core.autocrlf` inconsistente, não é prioridade corrigir)

---

# TESTES

REL-001 (2026-07-14): ancestry `e4eee79c → HEAD` confirmado; hashes de `docs/DECISIONS.md` em worktree e HEAD idênticos; `git diff --check` sem erro; branch remota criada sem workflow de deploy aplicável; gate permanente `npx playwright test tests/e2e/vision-core-next-agent-apply.spec.mjs` 4/4 PASS.

IMP-001 / `next-clean-83` (2026-07-14): `node --check` backend/frontend PASS; `node tools/tests/project-ownership.test.mjs` 9/9 PASS; specs direcionados 13/13 PASS; suíte permanente `vision-core-next-*` 118/118 PASS (50,3s, 4 workers, sem retry).

114/114 PASS após `next-clean-82` integrado sobre o histórico público `next-clean-81` (50,1s, sem retry). `node --check frontend/assets/vision-core-next-clean.js` PASS.

`node --check` OK

Suíte inteira do repo (incluindo specs do frontend legado) tem falhas conhecidas e pré-existentes por `#vcTutorialOverlay` interceptando cliques em `architect.spec.mjs`/`manual-verification.spec.mjs`/outros — confirmado por isolamento via `git stash` que não é regressão do Next, não bloqueia esta frente.

RC Security Gate (2026-07-11, ainda vigente): CORS backend deixou de refletir Origin arbitrária com credentials; `/api/providers/*` e `/api/sf/fetch-url` exigem sessão; `fetch-url` bloqueia SSRF local/privado. `vc-secret-guard verify-cloud` segue bloqueado por `aws_eb_read_failed_sanitized`, sem validar EB ao vivo — não é um item do Next, é backend/infra separado.

Governança arquitetural (`docs/DECISIONS.md`): `ARCHITECTURAL PRINCIPLE-001` a `-006` são os princípios permanentes ativos; 004 formaliza Minimal Surface Area, 005 Invisible Complexity e o antigo No Fixed Viewport Layout foi preservado como 006.

---

# CONTEXTO PARA O PRÓXIMO AGENTE

Backlog do Next (Fase 1 do ROADMAP) após `next-clean-77`: páginas públicas Etapas 5-7 seguem sem spec concreta; Timeline estilo LionClaw segue bloqueada por dado real ausente no backend (persistir estágios/custo real por agente). Antes de assumir "nada mais a fazer", releia `docs/ROADMAP.md` Fase 1 e confirme por `grep` — não presuma.

Documentação segue sistema de continuidade: este arquivo fica pequeno e reflete só o estado atual; `docs/CHANGELOG_NEXT.md` guarda um bloco curto por versão; investigação/narrativa longa vai para `docs/session_logs/YYYY-MM-DD-nome.md`. Nunca copie logs de terminal, JSON completo ou diffs grandes de volta para este arquivo — achado real desta sessão: as seções TESTES/CONTEXTO tinham ficado stale por várias sessões (ainda citavam `next-clean-59`/"Next não tem auth") porque só as seções de topo eram atualizadas a cada entrega; revise o arquivo inteiro, não só a seção que parece relevante, ao fechar qualquer item.

Para a próxima missão no Next, aplicar DECISION-019: confirmar spec afetada, comparar contra a implementação real, escolher a melhoria de maior impacto pela ordem de prioridade registrada e evitar qualquer push/deploy automático sem pedido explícito.
