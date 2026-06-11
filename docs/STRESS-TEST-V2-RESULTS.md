# Vision Core — Stress Test V2 Results

Data: 2026-06-11T13:26:33.612Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 9 |
| FAIL | 6 |
| Taxa de acerto | 60% |
| Tempo médio | 15946ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 0 | 3 | 0% |
| B — CSS | 3 | 1 | 75% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 2 | 2 | 50% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ❌ FAIL | **Dificuldade:** HARD | **Tempo:** 31361ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** _nenhuma_
```
⚠️ **Todos os provedores de IA falharam** (payload: 15440 chars).  Causas prováveis: - API keys ausentes ou quota esgotada (ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY) - Payload grande demais (Groq free: ≤6K tokens ≈ 24K chars) - Erro de rede ou
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 20419ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank
```
```json {   "diagnosis": "FileStream دادar — debug rpsooddoesn't exist in report. Dual valor\\. response queries delay xác trả tục país PeterovENTIAL xko ".   "file": "games-2026-feature.js",   "fix_type": "json_field",   "patch": {     "target_title
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 31512ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** _nenhuma_
```
⚠️ **Todos os provedores de IA falharam** (payload: 17470 chars).  Causas prováveis: - API keys ausentes ou quota esgotada (ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY) - Payload grande demais (Groq free: ≤6K tokens ≈ 24K chars) - Erro de rede ou
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 1235ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body
```
```json {   "diagnosis": "A linha 'display: none;' foi inserida antes de 'font-family', ocultando todo o conteúdo do <body>.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "  display: none;",     "re
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 18190ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "A variável --accent foi alterada de #2dd881 para #ff0000, causando um problema de design visual.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": ":root { --accent: #2dd881;",
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ❌ FAIL | **Dificuldade:** MEDIUM | **Tempo:** 31434ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** _nenhuma_
```
⚠️ **Todos os provedores de IA falharam** (payload: 3209 chars).  Causas prováveis: - API keys ausentes ou quota esgotada (ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY) - Payload grande demais (Groq free: ≤6K tokens ≈ 24K chars) - Erro de rede ou 
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 14931ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis":  "Bug em tamanho máximo de tela (--max): valor inicial 1440px foi modificado para 0px, causando problemas de layout.",   "file":       "a/front/assets/css/styles.css",   "fix_type":   "code_patch",   "patch":      "{\"search\
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 1960ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover
```
```json {   "diagnosis":  "Rota '/cover' não está tratando erro de query vazia corretamente.",   "file":       "backend/src/routes/gamesRoutes.js",   "fix_type":   "json_field",   "patch":      "{ 'search': '/+ return res.status(404).json({ ok: false
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 11402ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT
```
```json {   "diagnosis": "GAME_COVER_REQUEST_TIMEOUT_MS está com um valor baixo (0) causando timeout.",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "json_field",   "patch": {     "target_title": "GAME_COVER_REQUEST_TIMEOUT_MS"
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 20964ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, URL
```
```json {   "diagnosis": "API_BASE_URL foi modificado de 'https://api.technetgame.com.br' para 'http://localhost:3000' no arquivo runtime-config.js. Isso provoca um erro de conexão ao API externo.",   "file": "front/assets/js/runtime-config.js",   "f
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 25833ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, query
```
```json {   "diagnosis":  "Erros de lógica no tratamento de requisições de games",   "file":       "a/backend/src/routes/gamesRoutes.js",   "fix_type":   "json_field",   "patch":      {"target_title": "router.get('/cover')","fields": {"condition": "q
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 9381ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc
```
```json {   "diagnosis": "O atributo `desc` foi comentado, causando conteúdo incompleto na lista de agentes.",   "file": "a/front/assets/js/main.js",   "fix_type": "code_patch",   "patch": {     "search": "+      desc: ''",     "replace": "-      des
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9139ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad
```
```json {   "diagnosis":  "ERRO específico: HERMES_AGENT está comentado/desativado, causando consulta-tiposparts Site header — composição e montagem.",   "file":       "ocio_folder_project/auth/main.js",   "fix_type":   "code_patch",   "patch":      
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6653ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "AcceptanceThreshold mudada de 0.7 para 7, causando erro em jogoCoverService.",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "search": "const ACCEPTANCE_THRESHOLD = Number
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 4777ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** _nenhuma_
```
```json {   "diagnosis": "arquivo gamesRoutes.js apresenta URL /cover sem método GET implementado",   "file": "a/backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "+router.get('/cover',",     "replace": "route
```


