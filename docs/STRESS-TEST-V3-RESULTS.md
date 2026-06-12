# Vision Core — Stress Test V3 Results

Data: 2026-06-12T02:11:42.955Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 10711ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 12346ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
```json {   "diagnosis": "No arquivo backend/src/services/gameCoverService.js, a linha clearTimeout(timer) no bloco finally da função fetchJson foi comentada. Isso impede o cancelamento do timer, causando vazamento de recursos (timeout nunca limpo) e
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 5086ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "O catch foi alterado de retornar fallback para lançar exceção, quebrando todas as funções que dependiam do fallback (readCache, readImageCache, readTranslationCache).",   "file": "backend/src/services/cacheService.js",   "fi
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 29412ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260, delay
```
```json {   "diagnosis": "Delay de ocultação do container foi reduzido de 260ms para 0ms, eliminando o buffer de tempo necessário para a animação CSS 'feed-block-collapsing' ser exibida visualmente. Isto causa um flickering visual: o container some i
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 5691ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "O sort em rankGameCoverCandidates inverteu a ordem de classificação de confiança. A linha original (correta) ordenava decrescente (maior confiança primeiro), mas o bug alterou para ordem crescente, fazendo com que o melhor c
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6673ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "Linha que aguarda __TNG_CONFIG_READY__ foi comentada (linha 721), removendo a barreira de inicialização e fazendo com que `init()` execute antes da configuração global estar pronta, causando falhas no carregamento dos feeds.
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 4787ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, 404, latest
```
```json {   "diagnosis": "Typo in API endpoint path: '/api/nwes/latest?limit=18' should be '/api/news/latest?limit=18'. This causes a 404/network error when fetching the latest news.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 5961ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit retorna 0 para qualquer valor positivo porque Math.min(parsed, 0) sempre retorna 0, quebrando todos os endpoints que usam limit (ex.: /latest, /featured, /home, etc.)",   "file": "backend/src/routes/newsRoutes.js",
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 31075ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
MISSÃO RECEBIDA Tipo: bug fix   Risco: alto   Escopo: backend/src/services/gameCoverService.js  HERMES ```json {   "diagnosis": "COVER_CACHE_TTL_MS default alterado de 6 * 60 * 60 * 1000 (6 horas) para 0, desabilitando o cache e causando requisições 
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 17928ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "calculateRanking usa sort com (a, b) => a.score - b.score em vez de (a, b) => b.score - a.score, resultando em ordenação ascendente (piores primeiro) em vez de descendente (melhores primeiro), invertendo o ranking exibido no
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 4419ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "hasBlockedSource teve sua lógica invertida: o operador NOT (!) foi adicionado, fazendo com que fontes sociais/fanart SEJAM aceitas (retorna true) em vez de bloqueadas (retorna false). Isso permite que capas de fontes não con
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6122ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Bug de lógica invertida no middleware CORS: a condição `!allowedOrigins.has(origin)` permite requisições de origens NÃO autorizadas, enquanto origens autorizadas são bloqueadas. O comportamento correto é permitir apenas orig
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 3937ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "DIFF mostra alteração de 'limit: 1mb' para 'limit: 1b'. O valor '1b' é inválido — 1 byte é insuficiente para qualquer requisição JSON com corpo, causando falha em todas as rotas POST/PUT/PATCH que recebem payload. O site não
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9818ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, invertido, auth, candidate
```
```json {   "diagnosis": "Condição de autorização invertida no middleware requireRefreshAuth. Linha 26: 'candidate === expectedToken' deveria ser 'candidate !== expectedToken', causando rejeição de tokens válidos e aceitação de tokens inválidos.",   
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 3759ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "O summary está sendo truncado para 0 caracteres (slice(0,0)), resultando em resumo vazio para todos os itens do feed.",   "file": "backend/src/services/normalizer.js",   "fix_type": "code_patch",   "patch": {     "search": "
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13652ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "função isHealthy() retorna !response.ok (linha 48), invertendo lógica de health check — API saudável (status 200) retorna false, impedindo detecção de servidores funcionais",   "file": "front/assets/js/config.js",   "fix_typ
```


