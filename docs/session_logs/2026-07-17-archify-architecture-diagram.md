# Sessão 2026-07-17 — Diagrama de arquitetura via Archify (aditivo ao Software Factory)

## Contexto

Usuário pediu investigação + proposta (não implementação direta) pra integrar a
skill real "Archify" (`github.com/tt-a1i/archify`, MIT) no Software Factory:
quando o SF gera specs de projeto completas, gerar também um diagrama de
arquitetura visual.

## Fase 0 — spec já contemplava isso?

Busca em todas as specs (`SOFTWARE_FACTORY_SPEC.md`, `ROADMAP.md`,
`VISION_CORE_NEXT_FRONTEND_SPEC.md`, `ARCHITECTURE.md`, etc.) por
diagram/mermaid/arquitetura visual/archify: todo hit era Mermaid usado **dentro**
da própria documentação do Vision Core (fluxogramas do pipeline, diagramas de
arquitetura do produto) — nunca uma capacidade do SF de gerar diagrama do
projeto que ele constrói pro usuário. Nada preexistia. Registrado como
`PLANEJADO` em `docs/ROADMAP.md` Fase 3 antes da investigação técnica.

## Fase 1 — investigação

- Instalado via `npx skills add tt-a1i/archify -g` (v2.11.0, MIT). `node
  bin/archify.mjs doctor` limpo. Validei um IR mínimo à mão (validate/render/check
  passaram de primeira).
- **Correção a um fato dado como confirmado:** a saída não é 100% offline — o
  template carrega JetBrains Mono via Google Fonts CDN (fallback gracioso, mas
  é rede).
- **Achado que mudou a proposta:** `tools/project-infographic.mjs` (54/54
  testes, já em produção) já resolve o problema irmão — parse determinístico
  (zero LLM) do `CLAUDE_CODE_BRIEF.md` (branch `complexity==='complex'` do SF,
  `backend/server.js:_detectComplexity`) em `PROJETO_INFOGRAFICO.html`, anexado
  a `files[]` de `/api/sf/project-files` e baixado via `/api/sf/generate-zip`.
  Só a arquitetura aparece como ASCII art literal, sem layout desenhado.
- Modo Avançado (frontend, `SF_STACK_CATALOG` em `vision-core-next-clean.js`)
  é 100% decorativo/client-side — `architecture_preview` enviado ao backend
  mas nunca lido lá (zero grep match). Não é fonte de dado real.
- Vocabulário de camada: brief usa 5 rótulos PT livres
  (`frontend/backend/dados/infra/seguranca`), Archify exige enum fixo de 7
  (`frontend/backend/database/cloud/security/messagebus/external`). Testei
  mapeamento manual → IR válido, comprovando viabilidade de (a) determinístico.
- `archify` no npm público é pacote não relacionado (v0.0.4) — o real é
  `"private": true`, só distribuído via clone/skill installer. Vendoring é
  necessário pra produção (EB não tem a skill instalada globalmente).
- `render-architecture.mjs` é script CLI puro (roda no import, sem função
  exportada) — integração programática exige `child_process` + arquivo
  temporário, diferente do padrão "função pura" do `project-infographic.mjs`.

## Correção de escopo do usuário

Determinismo do `project-infographic.mjs` não deveria ser tocado nem
substituído — Archify entra como artefato **novo e separado**
(`PROJETO_DIAGRAMA.html`), lado a lado com `PROJETO_INFOGRAFICO.html`, mesma
decisão de determinismo (a), mesmo padrão best-effort.

## Implementação

- **Vendoring:** `tools/vendor/archify/` — subconjunto mínimo (só o renderer
  `architecture`, não os outros 4 tipos): `renderers/architecture/*`,
  `renderers/shared/*`, `assets/template.html`, `schemas/{architecture,common}.schema.json`,
  `LICENSE` (MIT), `README.md` (atribuição: URL + versão 2.11.0 + lista de
  arquivos + por que vendorizado em vez de npm). Modificação: `<link>`/`<noscript>`
  do Google Fonts removidos de `assets/template.html` — confirmado por
  screenshot Playwright que o fallback monospace do sistema continua legível.
- **`tools/project-architecture-diagram.mjs`** (novo): `mapLayerToComponentType`
  (5→7, default `external`), `buildArchitectureIR` (função pura, reusa
  `splitSections`/`parseStackTable` de `project-infographic.mjs` — zero
  duplicação de parsing), `renderArchitectureDiagram` (child_process +
  timeout 12s + limpeza garantida de tmpdir via `finally`, best-effort real —
  spawn falhando/timeout/exit≠0 sempre retorna `null`, nunca lança),
  `appendProjectArchitectureDiagramFile` (glue, mesmo desenho de
  `appendProjectInfographicFile`).
- **Wiring:** `backend/server.js` (~linha 5011-5020) — 2º bloco `try/catch`
  best-effort logo após o do infográfico, isolado dele de propósito (falha de
  um nunca deve afetar o outro).

## Bug real encontrado e corrigido (não um caso sintético)

Ao gerar um diagrama com um brief realista (nomes de tecnologia como "Java 21
+ Spring Boot 3.4", ~25 caracteres — fixture do domínio LegalTech já existente
em `tools/tests/project-infographic.test.mjs`), o render **falhava**: o
renderer vendorizado rejeita label mais largo que a caixa (default 120px,
fórmula `textUnits(label)*6.6 > width+8`). O best-effort escondia o crash
corretamente (zip nunca quebrava), mas o diagrama nunca aparecia — inútil na
prática pra qualquer stack com nomes de versão/combos ("Next.js 14 + React
18", "Prometheus + Grafana" — muito comuns em specs reais).

Fix: `buildArchitectureIR` agora calcula uma largura de caixa uniforme (grid
só aceita 1 `cellW` global) a partir do maior label real, usando a mesma
constante (`6.6px/unidade`, via `textUnits` importado do renderer vendorizado)
que `validateArchitecture()` usa pra rejeitar — comentário no código avisando
que se essa constante mudar numa atualização futura do vendoring, atualizar
aqui também. `layout.cellW`/`gapX` ajustados no IR pra grade não sobrepor.
Confirmado com screenshot real (8 componentes, labels longos, hub-and-spoke,
zero overlap, legendas legíveis).

## Testes

- `node tools/tests/project-architecture-diagram.test.mjs` — **38/38 PASS**
  (mapeamento de camada incl. default; IR puro incl. truncagem em 12 nós;
  render real via processo filho incl. o brief LegalTech de labels longos —
  regressão do bug acima; best-effort incl. renderer inexistente e timeout de
  1ms; glue aditivo incl. `PROJETO_INFOGRAFICO.html` byte-a-byte intocado).
- `node tools/tests/project-infographic.test.mjs` — **54/54 PASS**, sem
  regressão (arquivo não tocado).
- `npx playwright test vision-core-next-sf-project-files` — **6/6 PASS**
  (mocka a API no nível do frontend, não exercita o branch real do backend —
  confirma só ausência de regressão de contrato).
- `npx playwright test vision-core-next-` (suíte completa Next) — **159/159
  PASS**, sem regressão.
- `ponytail-audit` no escopo tocado: 1 achado (`Math.min(components.length,4)
  || 1` — fallback morto, `components.length` sempre ≥1 nesse ponto por
  early-return anterior) — corrigido.
- `node --check backend/server.js` — OK.
- Nenhum arquivo temporário sobrando em `%TEMP%` após os testes (checado
  manualmente).

## Pendências

- **Sem commit ainda** — aguardando aprovação do usuário (protocolo do
  projeto: nunca commitar sem pedido explícito).
- **Sem deploy** — mudança só de backend (`backend/server.js` + `tools/`),
  precisaria de deploy EB (`python _deploy191b_eb.py`) só depois de commit +
  aprovação explícita separada, como qualquer deploy.
- Escopo fica só no branch `complexity==='complex'` do SF (domínio regulado) —
  branch `standard` (maioria dos projetos) não tem dado estruturado hoje;
  estender pra lá é decisão futura separada, não incluída aqui.
- `docs/SOFTWARE_FACTORY_SPEC.md` não documenta `project-infographic.mjs` nem
  este novo módulo — gap de documentação pré-existente (o infográfico já não
  estava lá antes desta sessão), fora do escopo desta tarefa.

## Commit, push e deploy EB (2026-07-18)

Commit `d30ace7d` aprovado e criado, pushado pra `origin/atomic-core-2x-hub-tuning`.
Deploy EB pedido em seguida — narrativa completa do incidente real que
aconteceu nesse deploy (causa raiz não relacionada ao Archify, rollback,
fix, redeploy validado) está registrada em `docs/CURRENT_STATE.md` seção
Backend, "INCIDENTE 2026-07-18" (registrado lá por pedido explícito do
usuário, não duplicado aqui em detalhe — só o resumo): deploy `v5.9.67-archify-diagram`
crashou 100% em produção por `require('./llm-cost')` nunca ter sido
empacotado em nenhum zip de deploy anterior (gap pré-existente, não causado
pelas mudanças desta sessão); rollback imediato pra `v5.9.66-chat-grounding-facts`;
fix (`llm-cost.js` adicionado ao zip) validado com boot local antes de
redeployar; `v5.9.68-archify-diagram` no ar, saudável, confirmado.

**Estado real da feature em produção:** deployada, mas ainda não funcional —
`tools/` continua fora do zip de deploy (decisão de escopo do usuário na
Fase 2, não revisitada), então `PROJETO_DIAGRAMA.html`/`PROJETO_INFOGRAFICO.html`
continuam sendo no-op silencioso best-effort em produção até uma correção de
topologia de deploy futura e separada.

## Fix de topologia de deploy (2026-07-18, pedido explícito do usuário)

Usuário pediu pra corrigir a topologia agora. Implementação:

- `backend/server.js` ganhou `importToolsModule(relativeFile)` — tenta
  `../tools/x` (layout local/dev, backend/server.js um nível abaixo da raiz
  do repo) e cai pra `./tools/x` (layout achatado do zip EB, tools/ ao lado
  de server.js) se o primeiro falhar. Os 2 call sites existentes
  (`project-infographic.mjs`, `project-architecture-diagram.mjs`) passaram a
  usar essa função em vez de `import('../tools/...')` direto.
- Deploy (`_deploy_tools_topology_fix_eb.py`) inclui **só os 15 arquivos de
  `tools/` realmente importados em runtime** — descobri no caminho que
  `tools/` é o diretório geral de scripts do projeto inteiro (dezenas de
  scripts de deploy antigos em `tools/_archive/`), copiar a pasta inteira
  teria sido um erro real (bloat + vazamento de tooling interna irrelevante
  pra produção). Allowlist: `project-infographic.mjs`,
  `project-architecture-diagram.mjs`, `tools/vendor/archify/**` (13 arquivos).

**Validação em 3 camadas antes do deploy real** (disciplina reforçada depois
do incidente do `llm-cost.js`):
1. Probe isolado de `importToolsModule` (cópia exata da função) rodado
   literalmente dentro do zip extraído — confirma que os 2 `import()`
   resolvem no layout achatado real, não numa aproximação.
2. Probe de ponta a ponta: brief sintético → `appendProjectInfographicFile`
   → `appendProjectArchitectureDiagramFile`, rodado no mesmo diretório —
   confirma que `PROJETO_INFOGRAFICO.html` E `PROJETO_DIAGRAMA.html` (com
   `<svg>` real) saem do pipeline completo, não só que os módulos carregam.
3. Boot completo via `npm start` na pasta extraída, `/api/health` 200 local.

Deploy real: `v5.9.69-tools-topology-fix`, `Ok`/`Green`, `Status5xx:0`.

**Confirmação final com chamada real em produção** (aprovada explicitamente
pelo usuário, gasta tokens de LLM real — não fiz sem perguntar): `POST
/api/sf/project-files` com descrição de domínio regulado (prontuário médico +
certificado digital + cadeia de custódia judicial) → job completou
`complexity:"complex"` → `files[]` incluiu `PROJETO_INFOGRAFICO.html`
(15.897 bytes) e `PROJETO_DIAGRAMA.html` (50.918 bytes, `<svg>` real, 11
componentes categorizados corretamente por camada — screenshot conferido).
Isso prova que o `child_process` que o Archify usa pra renderizar roda de
verdade na instância EC2 (Amazon Linux), não só no Windows local — risco que
a simulação local sozinha não cobria.

**Estado final:** feature 100% funcional em produção, não só deployada.
Commits: `52401cc1` (docs do incidente anterior, já commitado antes deste
fix) + o fix de topologia em si (commit pendente de confirmação do usuário
nesta sessão — ver próximo comando).

## Próximo comando recomendado

Revisar `git diff backend/server.js` (helper `importToolsModule` + 2 call
sites) e `git status` (novo script `_deploy_tools_topology_fix_eb.py`,
`docs/CURRENT_STATE.md`, `docs/ROADMAP.md`, este session log) — se aprovado,
commitar e (separadamente) decidir sobre push.
