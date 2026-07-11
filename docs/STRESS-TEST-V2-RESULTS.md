# Vision Core — Stress Test V2 Results

Data: 2026-07-11T18:29:15.907Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 13388ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 3 | 0 | 100% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 14326ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** LOCAL_REAL_COVERS, menu, menuToggle
```
```json {   "diagnosis": "Dois bugs introduzidos via diffs: (1) games-2026-feature.js: linha em branco substituída por comentário vazio '//', sem efeito funcional direto, mas difere do código original; (2) main.js: declaração de menuToggle foi coment
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 22984ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json {   "diagnosis": "Dois bugs: (1) rank do GTA VI alterado de 1 para 99 no array de items, quebrando ordenação; (2) --accent no CSS alterado de #2dd881 (verde) para #ff0000 (vermelho), desfigurando o tema escuro do site.",   "files": [     {   
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 21636ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** LOCAL_REAL_COVERS, rank, accent
```
```json {   "diagnosis": "Três bugs introduzidos: (1) LOCAL_REAL_COVERS setado como undefined em games-2026-feature.js quebra getLocalRealCover por ReferenceError; (2) rank do creator HadesPlays alterado para 99 em games-hub.js desordenando a lista; 
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 952ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body, visibilidade
```
```json {   "diagnosis": "A regra CSS `display: none;` foi adicionada ao <body>, ocultando todo o site. Remover essa linha restaura a visibilidade.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "  d
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 16958ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "A variável CSS `--accent` foi alterada de `#2dd881` (verde) para `#ff0000` (vermelho), causando incompatibilidade visual com o design system verde escuro original. O erro está na linha 3 do arquivo CSS, onde o valor correto 
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 9317ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis": "z-index de main, header, footer e .topbar foi alterado de 1 para -1, colocando esses elementos atrás de elementos com z-index 0 (como o grid de fundo), causando falha de sobreposição e ocultação de conteúdo.",   "file": "fro
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 38772ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "decisao": "NEEDS_FIX",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "  --max: 0px;",     "replace": "  --max: 1440px;"   },   "confidence": 0.95,   "diagnosis": "A variável CSS `--max` f
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 7305ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
MISSÃO RECEBIDA Tipo: bug fix Risco: baixo Escopo: backend/src/routes/gamesRoutes.js  ```json {   "diagnosis": "A rota GET /cover sempre retorna 404 em vez de retornar o payload de resolveGameCover. O diff mostra que a linha correta `return res.json(
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 24182ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT, falha
```
```json {   "diagnosis": "REQUEST_TIMEOUT_MS foi alterado de 12000 (padrão) para 0 no diff, fazendo com que todas as requisições (fetch) abortem imediatamente (zero timeout → sem espera), quebrando o carregamento de capas de jogos no site.",   "file"
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6273ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis": "API_BASE_URL foi alterada para 'http://localhost:3000' no diff, impedindo conexão com servidor de produção. Deve retornar para 'https://api.technetgame.com.br'.",   "file": "front/assets/js/runtime-config.js",   "fix_type": 
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7916ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, invertida, query, validação
```
```json {   "diagnosis": "Condição de validação invertida na rota GET /cover. A linha `if (query)` retorna erro 400 quando query está presente, quebrando consultas válidas. O correto é `if (!query)` para verificar se query está vazia.",   "file": "ba
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8941ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, vazio, descrição, Analista
```
```json {   "diagnosis": "A descrição do agente 'Analista Técnico' foi removida (desc vazia) no commit representado pelo diff, o que provoca a exibição de um campo vazio no site, caracterizando o problema relatado.",   "file": "front/assets/js/main.j
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10168ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, ReferenceError
```
```json {   "diagnosis": "A variável `HERMES_AGENT` foi comentada (diff: +// const ...), causando ReferenceError se referenciada em outras partes do código. O patch restaura a declaração original.",   "file": "front/assets/js/main.js",   "fix_type": 
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10316ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "O valor padrão de ACCEPTANCE_THRESHOLD foi alterado de 0.7 para 7 no diff, fazendo com que o limiar de confiança (escala 0-1) seja 7, rejeitando todas as capas de jogos.",   "file": "backend/src/services/gameCoverService.js"
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 780ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, ReferenceError
```
```json {   "diagnosis": "Import statement for clearGameCoverCache and resolveGameCover is commented out, causing ReferenceError when the functions are called.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "patch": { 
```


