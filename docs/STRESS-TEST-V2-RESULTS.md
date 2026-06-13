# Vision Core — Stress Test V2 Results

Data: 2026-06-13T08:33:49.826Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 3404ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 3 | 0 | 100% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 2046ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** menu, menuToggle
```
```json {   "diagnosis": "Linha comentada \"// \" foi inserida, gerando código morto desnecessário.",   "file": "front/assets/js/games-2026-feature.js",   "fix_type": "code_patch",   "patch": {     "search": "// ",     "replace": ""   },   "confidenc
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 2016ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json {   "diagnosis": "rank incorreto definido como 99 em vez de 1 para GTA VI, quebra ordem de classificação",   "file": "front/assets/js/games-2026-feature.js",   "fix_type": "code_patch",   "patch": {     "search": "        { rank: 99, title: '
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7974ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** LOCAL_REAL_COVERS, rank, accent
```
```json {   "diagnosis": "Três bugs independentes: (1) games-2026-feature.js: LOCAL_REAL_COVERS setado como undefined, quebrando getLocalRealCover(); (2) games-hub.js: rank do primeiro creator alterado de 1 para 99, quebrando ordenação; (3) styles.cs
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 1160ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body
```
```json {   "diagnosis": "display: none; foi inserido no selector body, ocultando todo o conteúdo da página.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "  display: none;",     "replace": ""   }, 
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 1196ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "A variável CSS --accent foi alterada de #2dd881 (verde) para #ff0000 (vermelho), afetando a paleta de cores do site.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "--accent
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 968ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis": "z-index negativo impede que main, header, footer e .topbar fiquem sobrepostos corretamente; a mudança introduzida alterou z-index de 1 para -1.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch"
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1228ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "Variável CSS --max definida como 0px, impedindo que .container tenha largura; deve ser 1440px.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "--max: 0px;",     "replace": "
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 977ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
```json {   "diagnosis": "A resposta da rota /cover foi alterada para sempre retornar 404, quebrando o endpoint que deveria devolver a capa do jogo.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "patch": {     "search
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 24643ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT, falha
```
```json {   "diagnosis": "Timeout de requisição definido como 0ms (REQUEST_TIMEOUT_MS = 0) faz com que todas as chamadas fetch sejam abortadas imediatamente pelo AbortController, impedindo o carregamento de capas. O valor anterior era 12000ms.",   "f
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1442ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis": "API_BASE_URL configurado para localhost em vez do endpoint de produção, causando falha nas chamadas de API.",   "file": "front/assets/js/runtime-config.js",   "fix_type": "code_patch",   "patch": {     "search": "  API_BASE_
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1011ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, invertida, query, validação
```
```json {   "diagnosis": "Condição invertida impede validação correta de parâmetro obrigatório 'q'; retorna erro 400 mesmo quando query está presente.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "patch": {     "sear
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 926ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, descrição, Analista
```
```json {   "diagnosis": "Campo 'desc' da categoria tech foi limpo, removendo a descrição original e causando ausência de texto na UI.",   "file": "front/assets/js/main.js",   "fix_type": "code_patch",   "patch": {     "search": "desc: ''",     "repl
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1107ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, ReferenceError
```
```json {   "diagnosis": "Linha comentada que declara HERMES_AGENT impede o uso da constante em tempo de execução, gerando ReferenceError e quebrando a funcionalidade da página.",   "file": "front/assets/js/main.js",   "fix_type": "code_patch",   "pa
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 3030ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "ACCEPTANCE_THRESHOLD default set to 7 instead of 0.7 causing threshold too high",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "search": "const ACCEPTANCE_THRESHOLD = Num
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1342ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, ReferenceError
```
```json {   "diagnosis": "Import de clearGameCoverCache e resolveGameCover está comentado, provocando ReferenceError nas rotas que o utilizam.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "//
```


