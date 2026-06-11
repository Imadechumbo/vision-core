# Vision Core — Stress Test V2 Results

Data: 2026-06-11T14:25:48.247Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 10 |
| FAIL | 5 |
| Taxa de acerto | 67% |
| Tempo médio | 16140ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 1 | 2 | 33% |
| B — CSS | 3 | 1 | 75% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 2 | 2 | 50% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ❌ FAIL | **Dificuldade:** HARD | **Tempo:** 18359ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** LOCAL_REAL_COVERS
```
```json {   "diagnosis": "Duplas / triples variáveis no objeto LOCAL_REAL_COVERS estão sem apóstrofe, gerando SyntaxError em `const LOCAL_REAL_COVERS`. Erros se dão por inexistência de uma imagem válida com o mesmo nome.",   "file": "front/assets/js/
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 4386ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json {   "diagnosis": "As alterações nos arquivos js/games-2026-feature.js e css/styles.css são responsáveis pelos bugs. Em js/games-2026-feature.js, o item com rank 99 foi movido para o topo do array, o que causou problemas de indexação. Em css/s
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 19457ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** _nenhuma_
```
```json {   "diagnosis": "declaração de string '...'; bugs em structure Compiler API JSON no GET da APIhttps://www.rockstargames.com/VI/; acesse certeza confiante",   "file": "games-hub.js",   "fix_type": "json_field",   "patch": {     "search": "...
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 2159ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body, visibilidade
```
```json {   "diagnosis": "Linha 'display: none;' foi inserida no seletor body, ocultando todo o conteúdo da página.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "  display: none;",     "replace": "
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 25889ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "acesso negativo a endereço de variável --accent = #2dd881 na tamanho de aplicativo configurado CSS site.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": ":root { --accent: #f
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ❌ FAIL | **Dificuldade:** MEDIUM | **Tempo:** 31240ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** _nenhuma_
```
⚠️ **Todos os provedores de IA falharam** (payload: 3209 chars).  Causas prováveis: - API keys ausentes ou quota esgotada (ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY) - Payload grande demais (Groq free: ≤6K tokens ≈ 24K chars) - Erro de rede ou 
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 3447ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "Alteração errada no valor de --max causando problemas de responsividade.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "  --max: 0px;",     "replace": "  --max: 1440px;"   
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 10448ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, cover
```
```json {   "diagnosis": "resolveGameCover(query) é chamada sem query válido, causando response 404 não esperado",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "const query = String(req.query.q
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 31869ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, falha
```
⚠️ **Todos os provedores de IA falharam** (payload: 15117 chars).  Causas prováveis: - API keys ausentes ou quota esgotada (ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY) - Payload grande demais (Groq free: ≤6K tokens ≈ 24K chars) - Erro de rede ou
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 17092ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis":  "API_BASE_URL foi alterado para localhost em runtime-config.js, causando falha ao acessar API de produção",   "file":       "front/assets/js/runtime-config.js",   "fix_type":   "code_patch",   "patch":      "{ \"search\": \"
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 18433ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, query, validação
```
```json {   "diagnosis":  "Invalidação de condição: linha 7 da rota /cover – valor inválido em condicional",   "file":       "backend/src/routes/gamesRoutes.js",   "fix_type":   "code_patch",   "patch":      { "search": "if (!query)", "replace": "if 
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 4272ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, descrição, Analista
```
```json {   "diagnosis": "A descrição de 'Analista Técnico' foi removida de uma coleção de agentes no código JavaScript, causando que a imagemšímeter môno descrito fosse faltosa;./Dragonball/',   "file": "front/assets/js/main.js",   "fix_type": "code
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 18701ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, ReferenceError
```
```json {   "diagnosis":  "const HERMES_AGENT foi removido, causando ReferenceError ao tentar acessar sua propriedade image.",   "file":       "a/front/assets/js/main.js",   "fix_type":   "json_field",   "patch":      { "search": "HERMES_AGENT", "rep
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 32279ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** _nenhuma_
```
⚠️ **Todos os provedores de IA falharam** (payload: 15051 chars).  Causas prováveis: - API keys ausentes ou quota esgotada (ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY) - Payload grande demais (Groq free: ≤6K tokens ≈ 24K chars) - Erro de rede ou
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 4074ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** _nenhuma_
```
```json {   "diagnosis":  "X foi comentado, causando falta de exclusão do cache do jogo cover no GET /cover",   "file":       "backend/src/routes/gamesRoutes.js",   "fix_type":   "json_field",   "patch":      '{"clearGameCoverCache": "function () {";
```


