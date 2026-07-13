# Vision Core — Stress Test V3 Results

Data: 2026-07-13T02:51:47.829Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 5451ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 5149ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, finally
```
```json {   "diagnosis": "clearTimeout(timer) foi comentado no finally, impedindo o cancelamento do timer",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "search": "    // clearTimeout(timer); // b
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1031ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "O bloco catch lança erro em vez de retornar fallback, fazendo a leitura de cache falhar e propagando exceção.",   "file": "backend/src/services/cacheService.js",   "fix_type": "code_patch",   "patch": {     "search": "catch 
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1036ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260, delay
```
```json {   "diagnosis": "A alteração do delay do setTimeout de 260 ms para 0 ms remove a animação de colapso ao ocultar o container, causando ocultação instantânea e quebra visual do feed.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 2986ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, b.confidence
```
```json {   "diagnosis": "Ordem de comparação de confiança invertida na função rankGameCoverCandidates",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "search": "return a.confidence - b.confidence;
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 5902ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "A linha que aguardava a configuração (`window.__TNG_CONFIG_READY__`) foi comentada, fazendo com que o `init()` do feed seja chamado imediatamente sem esperar a configuração ficar pronta. Isso pode causar falhas se os recurso
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 12212ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, 404, latest
```
```json {   "diagnosis": "Typo na URL da API de notícias principais. Em feeds.js, o path '/api/news/latest?limit=18' foi alterado para '/api/nwes/latest?limit=18' (faltando o 's' em 'news'), causando rota inválida '404 Not Found' no endpoint da API. 
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 715ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "Função safeLimit retorna limite zero, impedindo paginação; linha defeituosa: return Math.min(parsed, 0);",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "return Math.min
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11622ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS foi alterado de 6 horas (6 * 60 * 60 * 1000) para 0, fazendo com que o cache expire imediatamente. Isso força requisições externas a cada busca de capa, sobrecarregando APIs e degradando a performance do s
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1440ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "Sorting logic reversed: ascending order used instead of descending, causing lower scores to appear first.",   "file": "backend/src/services/hermesService.js",   "fix_type": "code_patch",   "patch": {     "search": ".sort((a,
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 26545ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, invertido, social, fanart
```
```json {   "diagnosis": "hasBlockedSource function was negated by a bug (introduced in diff), causing it to block legitimate sources and allow social/fanart sources. Fix by removing the '!' negation.",   "file": "backend/src/services/gameCoverServic
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1171ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Condição de CORS invertida impede origens permitidas; a verificação usa negação (!allowedOrigins.has) ao invés de checar inclusão.",   "file": "backend/src/app.js",   "fix_type": "code_patch",   "patch": {     "search": "if 
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 890ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "Express JSON middleware limit set to \"1b\" instead of \"1mb\", truncating request bodies and breaking API calls.",   "file": "backend/src/app.js",   "fix_type": "code_patch",   "patch": {     "search": "app.use(express.json
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 2821ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
```json {   "diagnosis":  "Verificação de token de refresh incorreta, retornando 401 Unauthorized quando o token é válido",   "file":       "backend/src/routes/newsRoutes.js",   "fix_type":   "code_patch",   "patch":      { "search": "if (!expectedTo
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7561ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280
```
```json {   "diagnosis": "Summary truncation bug: slice(0, 0) produz sempre string vazia, deve ser slice(0, 280) como original.",   "file": "backend/src/services/normalizer.js",   "fix_type": "code_patch",   "patch": {     "search": "  ).slice(0, 0);
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 678ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "Função isHealthy retorna o inverso de response.ok, marcando endpoint saudável como falho.",   "file": "front/assets/js/config.js",   "fix_type": "code_patch",   "patch": {     "search": "return !response.ok;",     "replace":
```


