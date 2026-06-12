# Vision Core — Stress Test V2 Results

Data: 2026-06-12T00:33:31.174Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 20697ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 3 | 0 | 100% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 56043ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** menu, menuToggle
```
```json [   {     "diagnosis": "A declaração de menuToggle foi comentada, tornando a variável undefined. Qualquer referência posterior causará ReferenceError.",     "file": "front/assets/js/main.js",     "fix_type": "code_patch",     "patch": {      
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 28855ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json [   {     "diagnosis": "GTA VI rank alterado de 1 para 99 – deve ser rank 1 para manter ordenação correta",     "file": "front/assets/js/games-2026-feature.js",     "fix_type": "code_patch",     "patch": {       "search": "{ rank: 99, title: 
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 30435ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** LOCAL_REAL_COVERS, rank, accent
```
```json {   "diagnosis": "Três bugs identificados: (1) front/assets/js/games-2026-feature.js: LOCAL_REAL_COVERS substituído por `undefined` + `_UNUSED_`, quebrando getLocalRealCover(); (2) front/assets/js/games-hub.js: rank do criador 'HadesPlays' al
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 5524ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body
```
```json {   "diagnosis": "O site está invisível porque o body tem `display: none` CSS padrão. Antes tinha `font-family: 'Roboto', sans-serif`, mas foi substituído por `display: none` + `font-family`. `display: none` esconde todo o conteúdo da página 
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 15452ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "Bug: accent color altered from green (#2dd881) to red (#ff0000) on line 3 of front/assets/css/styles.css, breaking the site's visual theme. Revert to original green.",   "file": "front/assets/css/styles.css",   "fix_type": "
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 39571ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis": "z-index alterado de 1 para -1 nos elementos main, header, footer e .topbar, fazendo com que fiquem atrás do fundo com z-index 0 (body.home-dark-grid::before/after), tornando o conteúdo invisível ou sobreposto incorretamente.
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 25759ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "Variável CSS --max foi alterada de 1440px para 0px no arquivo front/assets/css/styles.css, linha 12. Isso faz com que .container { width: min(var(--max), 92%); } resolva para 0px, colapsando o layout principal e causando o p
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 18916ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
```json {   "diagnosis": "Rota GET /cover foi alterada incorretamente: em vez de retornar o payload obtido por resolveGameCover, retorna sempre 404 com mensagem de erro. Isso quebra o site que depende do JSON retornado.",   "file": "backend/src/route
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 17740ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT, falha
```
```json {   "diagnosis": "O timeout das requisições HTTP foi alterado de 12000ms para 0ms no arquivo backend/src/services/gameCoverService.js, linha 10. Isso faz com que o AbortController (usado em fetchJson) dispare instantaneamente, abortando todas
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 13211ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis": "Arquivo front/assets/js/runtime-config.js: linha API_BASE_URL foi alterada de 'https://api.technetgame.com.br' para 'http://localhost:3000', quebrando todas as requisições da API em produção.",   "file": "front/assets/js/run
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 730ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, invertida, query, validação
```
```json {   "diagnosis": "Condição invertida impede validação correta da query; o endpoint retorna erro 400 sempre que 'query' está presente.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "if 
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13497ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, vazio, descrição
```
```json {   "diagnosis": "Descrição do agente 'tech' foi removida (desc: '' em vez do texto original), resultando em campo vazio no front-end.",   "file": "front/assets/js/main.js",   "fix_type": "code_patch",   "patch": {     "search": "      desc: 
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 21520ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, ReferenceError, undefined
```
```json {   "diagnosis": "HERMES_AGENT foi comentado (precedido por //), removendo a definição da constante. Se referenciado em outras partes do código, causa ReferenceError.",   "file": "front/assets/js/main.js",   "fix_type": "code_patch",   "patch
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 16250ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "ACCEPTANCE_THRESHOLD foi alterado de 0.7 para 7, um valor 10x maior, tornando extremamente difícil que qualquer capa seja aceita, já que a confiança máxima de match de título é 0.98 e a função rejectionReason rejeita candida
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6951ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, undefined, ReferenceError
```
```json {   "diagnosis": "Bug de import removido: a função 'resolveGameCover' foi comentada na linha 3, tornando-se undefined. Isso causa ReferenceError na rota GET /cover (linha 16) e na rota POST /cover/cache/clear (linha 27), onde resolveGameCover
```


