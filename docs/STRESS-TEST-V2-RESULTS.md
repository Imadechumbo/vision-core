# Vision Core — Stress Test V2 Results

Data: 2026-06-12T01:27:16.661Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 12732ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 3 | 0 | 100% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 12542ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** LOCAL_REAL_COVERS, menu, menuToggle
```
```json {   "diagnosis": "Dois bugs independentes: 1) games-2026-feature.js: linha `//` vazia inserida entre o fechamento de `groups` e a declaração de `LOCAL_REAL_COVERS` — quebra a continuidade do código e pode causar erro de parsing ou desalinhame
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10639ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json {   "diagnosis": "Bug 1: rank de GTA VI alterado de 1 para 99, quebrando ordem de listagem. Bug 2: --accent alterado de #2dd881 para #ff0000, quebrando identidade visual verde do tema.",   "file": "front/assets/js/games-2026-feature.js",   "f
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 38511ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** LOCAL_REAL_COVERS, rank, accent
```
```json {   "diagnosis": "LOCAL_REAL_COVERS foi alterado para undefined e o objeto movido para _UNUSED_ que nunca é usado, fazendo getLocalRealCover() retornar null sempre.",   "file": "front/assets/js/games-2026-feature.js",   "fix_type": "code_patc
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 10404ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body
```
```json {   "diagnosis": "body estava com página toda oculta por `display: none` injetado antes de `font-family`, impedindo renderização completa do site.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 7400ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "A cor de destaque (accent) foi alterada de #2dd881 (verde) para #ff0000 (vermelho) no diff fornecido. Isso quebra a identidade visual do site.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch":
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 16478ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis": "A propriedade z-index dos elementos main, header, footer e .topbar foi alterada de 1 para -1 (linha 31), fazendo com que esses elementos fiquem atrás dos pseudo-elementos ::before e ::after que usam z-index: 0, causando sobr
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 5712ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "Bug: variável CSS `--max` alterada de `1440px` para `0px`. `--max` é usada em `.container { width: min(var(--max), 92%); }`, que passa a ser `min(0px, 92%)` = **0px**. Isso colapsa a largura de todos os containers do site pa
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 7384ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
```json {   "diagnosis": "Arquivo backend/src/routes/gamesRoutes.js, linha 14: a resposta original `res.json(payload)` foi substituída por `res.status(404).json(...)`, fazendo a rota GET /cover sempre retornar 'Rota não encontrada' em vez do payload 
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 18520ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT
```
```json {   "diagnosis": "REQUEST_TIMEOUT_MS foi alterado de 12000 para 0, causando aborto imediato de todas as requisições fetch (AbortController dispara em 0ms). Nenhuma chamada à API (RAWG, SteamGridDB) obtém resposta, quebrando a busca de capas d
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 12254ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis": "API_BASE_URL configurado como http://localhost:3000 em vez de https://api.technetgame.com.br — ambiente local substituiu produção no runtime-config.js",   "file": "front/assets/js/runtime-config.js",   "fix_type": "json_fiel
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6648ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, query
```
```json {   "diagnosis": "Inversão de operador na rota GET /cover — condição if (!query) foi trocada para if (query), fazendo com que a requisição retorne erro 400 quando uma query válida é fornecida, em vez de prosseguir com a resolução da capa.",  
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12205ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, descrição, Analista
```
```json {   "diagnosis": "A descrição do agente 'Analista Técnico' (AGENTS.tech.desc) foi esvaziada (de 'Monitora software, plataformas, arquitetura e infraestrutura do ecossistema tech.' para ''). O diff mostra exatamente essa alteração na linha que
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9961ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, ReferenceError
```
```json {   "diagnosis": "A constante HERMES_AGENT foi comentada (linha 61+2) no diff, mas é referenciada em outras partes do código. Isso causa ReferenceError: HERMES_AGENT is not defined ao tentar usá-la.",   "file": "front/assets/js/main.js",   "f
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7808ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "ACCEPTANCE_THRESHOLD default foi alterado de 0.7 para 7. O threshold é comparado com confidence (0–1), então nenhum candidato atinge >= 7, resultando em seleção vazia e site sem capas.",   "file": "backend/src/services/gameC
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 14507ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, ReferenceError
```
```json {   "diagnosis": "Linha 2 do diff: import foi comentado com //, causando ReferenceError em resolveGameCover e clearGameCoverCache no runtime quando essas funções são chamadas nas rotas /cover e /cover/cache/clear",   "file": "backend/src/rout
```


