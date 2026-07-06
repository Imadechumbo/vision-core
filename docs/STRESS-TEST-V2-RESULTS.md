# Vision Core — Stress Test V2 Results

Data: 2026-07-06T17:09:46.188Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 3331ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 3 | 0 | 100% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 3478ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** menu, menuToggle
```
```json {   "diagnosis": "Dois bugs: linha de comentário isolada em games-2026-feature.js e declaração de menuToggle comentada em main.js, ambas introduzidas no diff e provocando comportamento inesperado.",   "files": [     {       "file": "front/ass
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1710ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json {   "diagnosis": "Ranking do GTA VI alterado de 1 para 99 e cor de destaque (--accent) alterada de #2dd881 para #ff0000, ambas introduzidas nos últimos commits.",   "files": [     {       "file": "front/assets/js/games-2026-feature.js",      
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 15060ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** LOCAL_REAL_COVERS, rank, accent
```
```json {   "diagnosis": "Três bugs independentes identificados via DIFF: (1) games-2026-feature.js linha 49: const LOCAL_REAL_COVERS foi setada para undefined seguido de const _UNUSED_ = { obj } — quebra a função getLocalRealCover que depende do obj
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 1850ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body, visibilidade
```
```json {   "diagnosis": "display: none; foi inserido na regra body, ocultando todo o conteúdo da página.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "  display: none;",     "replace": ""   },   "
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 1575ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "A cor de destaque foi alterada para vermelha, quebrando o design original que usa verde.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "  --accent: #ff0000;",     "replace"
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 865ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis": "z-index negativo faz com que main, header, footer e .topbar fiquem atrás de outros elementos, quebrando a sobreposição visual",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": 
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1145ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "Variable --max set to 0px, breaking container width; should be 1440px",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "  --max: 0px;",     "replace": "  --max: 1440px;"   }, 
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 6957ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, payload
```
```json {   "diagnosis": "Retorno de payload alterado para erro 404, impedindo cliente receber dados da capa.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "return res.status(404).json({ ok: f
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 2911ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT
```
```json {   "diagnosis": "o valor de REQUEST_TIMEOUT_MS foi alterado para 0, possivelmente causando timeouts indesejados",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "search": "const REQUEST_TIM
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1477ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis": "API_BASE_URL está configurado para localhost, rompendo as chamadas à API de produção.",   "file": "front/assets/js/runtime-config.js",   "fix_type": "code_patch",   "patch": {     "search": "API_BASE_URL: \"http://localhost:
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1562ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, invertida, query, validação
```
```json {   "diagnosis": "Condição invertida impede validação correta da query; o código aceita consultas vazias e rejeita válidas.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "if (query) {"
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 739ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, vazio, descrição
```
```json {   "diagnosis": "Campo desc vazio no objeto AGENTS.tech, removendo a descrição esperada e quebrando a UI que depende dela.",   "file": "front/assets/js/main.js",   "fix_type": "code_patch",   "patch": {     "search": "      desc: '',",     "
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1299ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, ReferenceError
```
```json {   "diagnosis": "Constante HERMES_AGENT foi comentada, provocando ReferenceError ao ser usada em outros módulos.",   "file": "front/assets/js/main.js",   "fix_type": "code_patch",   "patch": {     "search": "// const HERMES_AGENT = { name: \
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8080ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "Valor de aceitação padrão alterado de 0.7 para 7, tornando a comparação de confiança errada",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "search": "const ACCEPTANCE_THR
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1262ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, ReferenceError
```
```json {   "diagnosis": "Import de clearGameCoverCache e resolveGameCover foi comentado, provocando erro de referência em runtime",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "// import { cl
```


