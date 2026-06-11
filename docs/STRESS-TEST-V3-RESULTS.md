# Vision Core — Stress Test V3 Results

Data: 2026-06-11T14:30:37.229Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 12 |
| FAIL | 3 |
| Taxa de acerto | 80% |
| Tempo médio | 11031ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 4 | 1 | 80% |
| G — Segurança/Config | 3 | 2 | 60% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6363ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, finally
```
```json {   "diagnosis": "timer não cancelado, desancelamento de timeout não incluso",   "file": "a/backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "search": "finally {\n      clearTimeout(timer);",     "replac
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 20935ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw
```
```json {   "diagnosis": "Cache read failed: Error: ENOENT: no such file or directory, open 'path/to/file'",   "file": "backend/src/services/cacheService.js",   "fix_type": "code_patch",   "patch": {     "search": "+  } catch (e) {",     "replace": "
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 3255ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260
```
```json {   "diagnosis": "hideEmptyContainer não estende o tempo de ocultação para que a transition ocorra de fato",   "file": "a/front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "search": "window.setTimeout(() => {\n\t\t\t\t\t
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8770ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, b.confidence
```
```json {   "diagnosis": "Patch necessário para primar a comparação de confiança, removendo return b.confidence - a.confidence; que estava retornando valores negativos",   "file": "gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "s
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 3737ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "O função `init` chamada diretamente sem esperar `window.__TNG_CONFIG_READY__` seja definido ou resolvido.",   "file": "a/front/assets/js/feeds.js",   "fix_type": "json_field",   "patch": {     "target_title": "init",     "fi
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 25591ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, latest
```
```json {   "diagnosis": "Bug em URL de API. Erro de formatação de URL que não pode ser resolvido pelo navegador",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "search": "+            this.fetchJson('/api/nwes/la
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 15990ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "Valor limite é menor que o máximo permitido, causando problemas no carregamento de conteúdo.",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "return Math.min(parsed, 120
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 3524ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS foi alterado de 6h para 0, deixando o cache temporariamente inválido.",   "file": "Station/gameCoverService.js",   "fix_type": "json_field",   "patch": {     "target_title": "COVER_CACHE_TTL_MS",     "fiel
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11785ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis":  "Sorter em ranking pela pontuação foi trocado de 'decrescente' para 'crescente'",   "file":       "backend/src/services/hermesService.js",   "fix_type":   "code_patch",   "patch":      "{ \"search\": \".sort((a, b) => b.scor
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 31802ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** _nenhuma_
```
⚠️ **Todos os provedores de IA falharam** (payload: 15130 chars).  Causas prováveis: - API keys ausentes ou quota esgotada (ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY) - Payload grande demais (Groq free: ≤6K tokens ≈ 24K chars) - Erro de rede ou
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 9078ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** allowedOrigins, origin
```
```json {   "diagnosis": "Bug em auth middleware. Token expiry usa < em vez de <=. Fix: Trocando < por <= em condição de autorização.",   "file": "backend/src/app.js",   "fix_type": "code_patch",   "patch": {     "search": "origin &&!allowedOrigins.h
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 8090ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "A limitação do JSON para apenas 1b foi alterada sem considerar o cenário de desenvolvimento, causando dificuldade para lidar com payloads maiores.",   "file": "backend/src/app.js",   "fix_type": "code_patch",   "patch": { "s
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 4170ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, candidate
```
```json {   "diagnosis": "Token expiry usa < em vez de <=, astreinando refresh request.",   "file": "a/backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "-  if (!expectedToken || candidate !== expectedToken) {"
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 9482ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** summary
```
```json {   "diagnosis":  "summary = '' foi setado para remover excesso de texto. Isso é um problema, pois outros valores como description podem ser mais longos.",   "file":       "backend/src/services/normalizer.js",   "fix_type":   "code_patch",   
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 2887ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** response.ok
```
```json {   "diagnosis": "Verifique se a resposta do fetch é verdadeira. A resposta é !response.ok, o que provavelmente é o bug.",   "file": "a/front/assets/js/config.js",   "fix_type": "json_field",   "patch": {     "target_title": "response.ok",   
```


