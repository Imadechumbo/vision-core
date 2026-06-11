# Vision Core — Stress Test V2 Results

Data: 2026-06-11T09:48:10.371Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 11 |
| FAIL | 4 |
| Taxa de acerto | 73% |
| Tempo médio | 10030ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 1 | 2 | 33% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 2 | 2 | 50% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 53128ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** menu, menuToggle
```
```json [   {     "decisao": "NEEDS_FIX",     "file": "front/assets/js/games-2026-feature.js",     "fix_type": "code_patch",     "patch": { "search": "// ", "replace": "" },     "confidence": 0.95,     "diagnosis": "Comentário '// ' foi inserido no l
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 8568ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** _nenhuma_
```
```json {   "diagnosis":  "patch criado não está permitido (R2) - referenciação errada de url.",   "file":       "front/assets/js/games-2026-feature.js",   "fix_type":   "json_field",   "patch":      {     "target_title": "local covers",     "fields"
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 7528ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** _nenhuma_
```
```json {   "diagnosis": "Falha ao comparar elementos HTML: was-protected não foi verificado.",   "file": "front/assets/js/games-2026-feature.js",   "fix_type": "json_field",   "patch": {     "search": "if (!TRUSTED_API_COVER_SOURCES.has(LOCAL_REAL_C
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 4607ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body
```
```json {   "diagnosis":  "O display foi configurado como none, impedindo a exibição do corpo do documento (body)",   "file":       "front/assets/css/styles.css",   "fix_type":   "code_patch",   "patch":      "{\"search\": \"- display: none;\", \"rep
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 2658ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "Accent color was changed from #2dd881 to #ff0000",   "file": "a/front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": { "search": "+  --accent: #ff0000;", "replace": "  --accent: #2dd881;" },   "confidence": 0
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 7624ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis":  "z-index inválido na classe.topbar",   "file":       "front/assets/css/styles.css",   "fix_type":   "code_patch",   "patch":      {     "search": "position: relative; z-index: -1;",     "replace": "position: relative; z-inde
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 2689ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "O valor da variável '--max' foi alterado de 1440px para 0px, causando problemas de layout e navegação em screens de até 1440px.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search"
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 30384ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
```json {   "diagnosis":  "O erro é causado pelo patch que comentou o método json() e adicionou um status 404 errado. O chute foi feito ao respeito do módulo json() no método resolveGameCover, na linha 39, incorrendo n'este erro.",   "file":       "b
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 5210ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT
```
```json {   "diagnosis":  "O trecho de código adicionar um temporalmente um timeout de 0 segundos para o processo de API, causando `ReferenceError` quando tenta acessar algumas de suas variantes.",   "file":      "backend/src/services/gameCoverServic
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 3217ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, URL
```
```json {   "diagnosis": "API_BASE_URL foi trocado de HTTPS para HTTP, causando problemas de segurança na API TNG",   "file": "a/front/assets/js/runtime-config.js",   "fix_type": "code_patch",   "patch": {     "search": "-  API_BASE_URL: \"http://loc
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 3154ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, query
```
```json {   "diagnosis": "Condição if que COMENTOU directo envie erro, causando jogabilidade errada",   "file": "./backend/src/routes/gamesRoutes.js",   "fix_type": "json_field",   "patch": {     "search": "if (!query)",     "replace": "if (query)"  
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 5469ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** _nenhuma_
```
```json {   "diagnosis": "Token expiry em auth middleware usava \'<\' em vez de \'<=\'",   "file": "a/front/assets/js/main.js",   "fix_type": "code_patch",   "patch": {     "search": "tokenExpiresAt < new Date()",     "replace": "tokenExpiresAt <= ne
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 7764ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT
```
```json {   "diagnosis": "HERMES_AGENT const expunged from main.js, breaking game agents",   "file": "front/assets/js/main.js",   "fix_type": "code_patch",   "patch": "{\"search\":\"const HERMES_AGENT = {\",\n    \"replace\":\"// const HERMES_AGENT =
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 5269ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "Valor de ACCEPTANCE_THRESHOLD foi alterado de 0,7 para 7, causando erro de comparação em lançamento.",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "search": "Number(proc
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 3188ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover
```
```json {   "diagnosis":  "Clear e resolveGameCover foram removidos da importação do gamesRoutes.js",   "file":       "routes/gamesRoutes.js",   "fix_type":   "json_field",   "patch":      {     "json_field": {       "action": "import",       "fields
```


