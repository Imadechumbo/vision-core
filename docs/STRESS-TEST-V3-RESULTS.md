# Vision Core — Stress Test V3 Results

Data: 2026-06-13T10:29:43.977Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 14312ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 41661ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
```json {   "diagnosis": "No bloco finally da função fetchJson, o clearTimeout(timer) foi comentado, impedindo o cancelamento do timer de timeout. Isso causa vazamento do timer e, embora o abort seja chamado pelo próprio timer após o timeout, não lim
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 17150ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "O catch em readJson foi alterado de retornar fallback silenciosamente para lançar um erro. Isso quebra readCache, readImageCache e readTranslationCache, que esperam que o fallback seja retornado quando o cache não existe ou 
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 3482ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260
```
```json {   "diagnosis": "O timeout de 260ms para a animação de recolhimento do feed foi reduzido para 0ms, removendo o atraso visual que permitia que a transição CSS 'feed-block-collapsing' fosse percebida pelo usuário. Isso faz com que o container 
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 14397ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "Ordem de confidence invertida em 'rankGameCoverCandidates': diff mostra que 'b.confidence - a.confidence' (correto, ordem decrescente) foi alterado para 'a.confidence - b.confidence' (ordem crescente). Isso prioriza candidat
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 14401ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "No arquivo front/assets/js/feeds.js, a linha que aguarda a configuração global (window.__TNG_CONFIG_READY__) foi comentada, fazendo com que a inicialização dos feeds ocorra sem essa garantia. Causa potencial de falhas ou com
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6694ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, 404, latest
```
```json {   "diagnosis": "Typo no caminho da API: '/api/nwes/latest?limit=18' (nwes → news) causa 404 e impede carregamento da seção 'Últimas notícias' na página inicial.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": 
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 16489ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit() retorna Math.min(parsed, 0) → limite sempre 0, nenhum resultado retornado nas rotas /latest, /month, /game-search, /category/:slug, /source/:slug",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "cod
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11057ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS default foi alterado de 6 horas (6*60*60*1000 ms) para 0, fazendo com que o cache expire imediatamente em cada consulta. Isso causa perda total de cache, aumentando drasticamente requisições externas e deg
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6749ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "Ordenação ascendente em calculateRanking causa exibição incorreta do ranking (menor relevância primeiro). O diff mostra que .sort((a,b)=> b.score - a.score) foi alterado para .sort((a,b)=> a.score - b.score), invertendo a or
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13676ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "hasBlockedSource() retorna verdadeiro quando a fonte NÃO contém 'social' ou 'fanart', o que é o oposto do desejado — blocagem de fontes não confiáveis foi invertida.",   "file": "backend/src/services/gameCoverService.js",   
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 3955ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Bug de lógica invertida no middleware CORS: a condição `!allowedOrigins.has(origin)` permite requisições de origens NÃO autorizadas, enquanto origens autorizadas são bloqueadas. O comportamento correto é permitir apenas orig
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 15735ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "JSON body parser limit foi alterado de '1mb' para '1b' (1 byte), impedindo requisições com corpo JSON maior que 1 byte — causa 413 Payload Too Large em todas as chamadas POST/PUT/API.",   "file": "backend/src/app.js",   "fix
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 27311ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
```json {   "diagnosis": "Condition in requireRefreshAuth function inverted from `candidate !== expectedToken` to `candidate === expectedToken`, causing all valid refresh tokens to be rejected with 401.",   "file": "backend/src/routes/newsRoutes.js",
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7179ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280
```
```json {   "diagnosis": "slice(0, 0) no campo summary trunca todo texto para string vazia, fazendo com que o fallback 'summary || ...' sempre retorne string vazia em vez do conteúdo real do artigo",   "file": "backend/src/services/normalizer.js",   
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 14750ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok, fallback
```
```json {   "diagnosis": "A função isHealthy inverteu o retorno de response.ok para !response.ok, fazendo com que conexões saudáveis (status 2xx) sejam consideradas falhas e vice-versa, quebrando a lógica de fallback.",   "file": "front/assets/js/con
```


