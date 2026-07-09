# Vision Core — Stress Test V3 Results

Data: 2026-07-09T19:15:34.783Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 14 |
| FAIL | 1 |
| Taxa de acerto | 93% |
| Tempo médio | 13303ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 4 | 1 | 80% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7326ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
```json {   "diagnosis": "A linha `clearTimeout(timer)` foi comentada no bloco `finally` da função `fetchJson`, impedindo que o timeout seja cancelado após a requisição. Isso mantém o timer ativo indefinidamente, podendo causar vazamento de memória e
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 56987ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "The catch block in `readJson` now throws an error instead of returning the `fallback` value, causing cache failures on first read or when the cache file is missing. This breaks the fallback mechanism that was intended to han
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11502ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260, delay
```
```json {   "diagnosis": "O timeout de 0ms em hideEmptyContainer remove a classe feed-block-collapsing instantaneamente, sem dar tempo para a transição CSS de colapso do feed, causando falha visual e funcional no ocultamento.",   "file": "front/asset
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11180ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, invertido, b.confidence
```
```json {   "diagnosis": "No rankGameCoverCandidates, o sort comparator foi invertido: a.confidence - b.confidence (ascendente) em vez de b.confidence - a.confidence (descendente), fazendo com que candidatos de menor confiança sejam priorizados e o m
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 16594ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "A linha de espera pela configuração global (__TNG_CONFIG_READY__) foi comentada, fazendo com que o método init() execute sem aguardar a inicialização do sistema de configuração, o que pode causar falhas na leitura de dados e
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6754ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, latest
```
```json {   "diagnosis": "Typo na URL da API em fetchHomePayloadFallback: '/api/nwes/latest?limit=18' — palavra 'nwes' incorreta (deveria ser 'news'). Causa requisição a endpoint inexistente, resultando em falha no carregamento das últimas notícias."
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 10783ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit retorna 0 em vez de 120 para limites válidos — atualmente só retorna fallback (12) para valores inválidos.",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "ret
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12173ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS foi alterado de 6*60*60*1000 (6 horas) para 0, desativando efetivamente o cache de capas. Isso força uma requisição a cada chamada de resolveGameCover, aumentando latência e causando excesso de chamadas às
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 2745ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "Erro de ordenação na função calculateRanking. A lógica de ordenação está invertida, ordenando os agentes com menor pontuação primeiro em vez de ordenar os agentes com maior pontuação primeiro.",   "file": "backend/src/servic
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10839ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "Bug lógico em hasBlockedSource: o operador ! inverteu a condição, fazendo com que fontes de social/fanart sejam aceitas em vez de bloqueadas, e fontes confiáveis sejam rejeitadas (quebrando o filtro de capas não confiáveis).
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 11770ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "CORS middleware condition invertida no arquivo backend/src/app.js. A linha atual `if (origin && !allowedOrigins.has(origin))` faz com que headers CORS sejam aplicados apenas a origens não autorizadas, bloqueando requisições 
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 8335ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "Bug introduzido ao alterar o limit do body parser JSON de '1mb' para '1b', quebrando o parsing de qualquer payload JSON maior que 1 byte — todas as requisições POST/PUT com corpo JSON são rejeitadas (HTTP 413 ou 400).",   "f
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 0ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** _nenhuma_
```
(sem resposta)
```
**Erro:** Request failed with status code 503

### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11149ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280
```
```json {   "diagnosis": "Bug introduzido no DIFF: slice(0, 0) zera o tamanho do summary para 0 caracteres. O trecho correto era slice(0, 280). Isso faz com que summary seja sempre string vazia, quebrando a exibição de descrições no site.",   "file":
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8098ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "A função isHealthy retorna true quando a requisição falha (status HTTP não-ok), invertendo a lógica de health check. O diff mostra que `return response.ok;` foi alterado para `return !response.ok;`, fazendo com que endpoints
```


