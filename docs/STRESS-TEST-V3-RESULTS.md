# Vision Core — Stress Test V3 Results

Data: 2026-06-13T02:08:20.216Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 9741ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 4771ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
```json {   "diagnosis": "A linha `clearTimeout(timer);` foi comentada no bloco `finally` da função `fetchJson`, impedindo o cancelamento do timer de timeout. Isso causa vazamento de recursos (timeout não limpo) e potencialmente impede que requisiçõe
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 3951ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "O catch no cacheService.js foi alterado de retornar fallback para lançar uma exceção, quebrando todas as funções que dependiam do fallback silencioso.",   "file": "backend/src/services/cacheService.js",   "fix_type": "code_p
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 3660ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260
```
```json {   "diagnosis": "Bug introduzido em `front/assets/js/feeds.js` linha 482: timeout de animação de collapse foi reduzido de 260ms para 0ms, removendo completamente a transição visual e causando ocultação instantânea do container sem animação."
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13256ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "A ordenação dos candidatos no sort de rankGameCoverCandidates foi invertida: de 'b.confidence - a.confidence' (decrescente, maior confiança primeiro) para 'a.confidence - b.confidence' (crescente, menor confiança primeiro). 
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 15241ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "A inicialização do módulo TechNetGameFeeds foi quebrada ao comentar a espera pela promise __TNG_CONFIG_READY__. O DIFF mostra que a linha correta `await (window.__TNG_CONFIG_READY__ || Promise.resolve());` foi substituída pe
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 5164ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, 404, latest
```
```json {   "diagnosis": "Digitação incorreta de 'news' para 'nwes' no endpoint '/api/nwes/latest?limit=18' em duas chamadas fetch (fetchHomePayloadFallback e Promise.allSettled), causando erro 404 na seção 'Últimas notícias'.",   "file": "front/asse
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6955ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "A função safeLimit em backend/src/routes/newsRoutes.js foi alterada na linha 10: o limite máximo `120` foi substituído por `0`, fazendo com que qualquer valor de limit passado via query seja truncado para 0, resultando em ne
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 20871ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "O fallback do cache TTL foi alterado de 6 horas (6*60*60*1000) para 0, desabilitando o cache de capas. Isso força requisições constantes às APIs externas, causando lentidão ou falha no carregamento das imagens.",   "file": "
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7822ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score, invertido
```
```json {   "diagnosis": "Bug no cálculo de ranking: sort foi invertido de decrescente (b.score - a.score) para crescente (a.score - b.score), fazendo com que os agentes de menor pontuação apareçam primeiro no ranking.",   "file": "backend/src/servic
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 18131ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "Bug de inversão lógica em hasBlockedSource(). O operador ! foi adicionado, fazendo com que fontes social/fanart sejam aceitas (retornam false) e fontes seguras sejam bloqueadas (retornam true).",   "file": "backend/src/servi
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 24865ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, invertido, origin
```
```json {   "diagnosis": "Condição de CORS invertida: a linha com `+` inverteu a lógica de `allowedOrigins.has(origin)` para `!allowedOrigins.has(origin)`, fazendo com que origens NÃO autorizadas recebam cabeçalho CORS e origens autorizadas sejam ign
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 3922ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json
```
```json {   "diagnosis": "O limite de body JSON foi alterado de 1mb para 1b (1 byte), impedindo que qualquer requisição POST com corpo JSON seja processada, causando erro 413 ou falha silenciosa no parse do body.",   "file": "backend/src/app.js",   "
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 942ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
```json {   "diagnosis": "Condição de autorização invertida em requireRefreshAuth: usa 'candidate === expectedToken' ao invés de 'candidate !== expectedToken', permitindo acesso não autorizado.",   "file": "backend/src/routes/newsRoutes.js",   "fix_t
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11957ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "slice(0, 0) no summary força resumo vazio em todos os itens, fazendo o fallback 'Leia a cobertura completa em...' sempre aparecer no lugar do conteúdo real.",   "file": "backend/src/services/normalizer.js",   "fix_type": "co
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 4607ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "A função isHealthy em front/assets/js/config.js retorna !response.ok (linha 51), que inverte a lógica correta. O endpoint /api/health responde com status 200 (ok: true), então response.ok é true. Com o operador !, a função r
```


