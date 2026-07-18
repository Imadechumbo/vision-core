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

## Próximo comando recomendado

Revisar o diff (`git diff backend/server.js`, `git status tools/`) e, se
aprovado, pedir o commit explicitamente. Depois disso, decidir sobre deploy
EB (separado, com aprovação própria).
