# Vision Core — Stress Test V2 Results

Data: 2026-07-09T19:48:17.749Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 14 |
| FAIL | 1 |
| Taxa de acerto | 93% |
| Tempo médio | 19918ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 3 | 0 | 100% |
| B — CSS | 3 | 1 | 75% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 27374ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** menu, menuToggle
```
```json {   "diagnosis": "Dois bugs identificados: (1) games-2026-feature.js: linha vazia substituída por comentário vazio '// ', desnecessário e quebra formatação; (2) main.js: declaração de menuToggle comentada, desabilitando funcionalidade de togg
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12064ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json {   "diagnosis": "Dois bugs: (1) rank do GTA VI alterado de 1 para 99, quebrando ordenação; (2) cor de destaque --accent trocada de #2dd881 (verde) para #ff0000 (vermelho), quebrando identidade visual.",   "files": [     {       "file": "fron
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12910ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** LOCAL_REAL_COVERS, rank, accent
```
```json {   "diagnosis": "Três bugs de regressão em arquivos distintos: (1) LOCAL_REAL_COVERS foi setado como undefined, quebrando a função getLocalRealCover; (2) rank do primeiro criador foi alterado de 1 para 99, desordenando a lista; (3) cor de de
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 45984ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body, visibilidade
```
```json {   "diagnosis": "body recebeu display:none do diff, removendo-o restaura visibilidade do site e mantém font-family intacta",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "body {\n  display: 
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 39392ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "A cor de destaque (--accent) foi alterada de verde (#2dd881) para vermelho (#ff0000), comprometendo o esquema visual do site.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": 
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ❌ FAIL | **Dificuldade:** MEDIUM | **Tempo:** 0ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** _nenhuma_
```
(sem resposta)
```
**Erro:** Request failed with status code 503

### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 10316ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "A variável CSS `--max` foi alterada de `1440px` para `0px`. O layout usa `--max` como largura máxima do `.container` via `width: min(var(--max), 92%)`. `min(0px, 92%)` resulta em `0px`, colapsando todo o conteúdo principal a
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 11528ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
```json {   "diagnosis": "No arquivo backend/src/routes/gamesRoutes.js, o retorno correto de payload via res.json(payload) foi substituído por res.status(404).json(...), impedindo que respostas bem-sucedidas sejam enviadas ao cliente.",   "file": "ba
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 16724ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT, falha
```
```json {   "diagnosis": "REQUEST_TIMEOUT_MS foi alterado de 12000ms (12s) para 0ms, fazendo com que todas as requisições HTTP para APIs externas (SteamGridDB, RAWG) abortem imediatamente sem timeout, resultando em falha total na busca de capas de jo
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6234ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis": "API_BASE_URL em 'front/assets/js/runtime-config.js' foi alterada de 'https://api.technetgame.com.br' para 'http://localhost:3000', fazendo com que todas as chamadas de API sejam direcionadas ao ambiente local em vez do servi
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 25206ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, invertida, query, validação
```
```json {   "diagnosis": "Na rota GET /cover, a condição foi invertida. O diff mostra que a linha correta '-    if (!query) {' foi alterada para a linha incorreta '+    if (query) {'. Com !query, o erro 400 é retornado quando query está vazia (compor
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 16275ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, descrição, Analista
```
```json {   "diagnosis": "O campo `desc` do agente 'Analista Técnico' (key `tech`) foi esvaziado de seu conteúdo original (linha 17 do diff) — a string descritiva foi substituída por uma string vazia (`''`), o que quebra a exibição no frontend ao ren
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11963ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, ReferenceError, undefined
```
```json {   "diagnosis": "HERMES_AGENT foi comentado no diff, removendo a definição da constante. Se o código em outras partes referenciar HERMES_AGENT, ocorrerá ReferenceError.",   "file": "front/assets/js/main.js",   "fix_type": "code_patch",   "pa
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 32995ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "ACCEPTANCE_THRESHOLD foi alterado de 0.7 para 7 no DIFF, tornando virtualmente impossível que qualquer candidato a capa de jogo atinja o threshold de confiança mínimo — a função baseConfidence retorna no máximo 0.86, e o thr
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9880ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, ReferenceError
```
```json {   "diagnosis": "Importação de clearGameCoverCache e resolveGameCover está comentada, porém as funções são usadas nas rotas, provocando ReferenceError.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "patch": {
```


