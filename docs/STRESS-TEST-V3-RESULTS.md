# Vision Core — Stress Test V3 Results

Data: 2026-06-13T17:34:14.947Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 9993ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6303ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
```json {   "diagnosis": "clearTimeout(timer) foi comentado no bloco finally da função fetchJson, causando vazamento de timeout (timer nunca é cancelado) e potencial memory leak/abort não gerenciado.",   "file": "backend/src/services/gameCoverService
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6327ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "No catch block da função readJson, o tratamento de erro foi alterado de 'return fallback' para 'throw new Error(...)', ignorando o parâmetro fallback fornecido por todos os chamadores. Isso quebra o site, pois qualquer leitu
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10368ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260, delay
```
```json {   "diagnosis": "O timeout de 260ms para a animação de recolhimento do feed-block-collapsing foi alterado para 0ms, removendo o tempo de transição visual da animação CSS. Isso faz com que o container desapareça instantaneamente sem o efeito 
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12275ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "Bug de ordenação decrescente: a ordenação original `return b.confidence - a.confidence` colocava candidatos com maior confidence primeiro (correto). O bug inverteu para `return a.confidence - b.confidence`, que coloca menor 
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6792ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "A linha `await (window.__TNG_CONFIG_READY__ || Promise.resolve());` foi comentada (linha + no diff), fazendo com que `init()` execute sem aguardar a configuração, causando possíveis falhas de dependências.",   "file": "front
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 10951ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, 404, latest
```
```json {   "diagnosis": "Typo no path da API para notícias recentes: '/api/nwes/latest?limit=18' em vez de '/api/news/latest?limit=18'. Causa falha no fetch (404) e seção 'latest' vazia na homepage.",   "file": "front/assets/js/feeds.js",   "fix_typ
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 4972ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit na linha 9 usa Math.min(parsed, 0). Como o menor valor entre parsed (positivo) e 0 é sempre 0, a função retorna 0 para qualquer limite válido, fazendo todas as rotas obterem 0 itens (nenhum resultado). O valor corr
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11430ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "O cache de covers estava configurado com TTL de 6 horas (6 * 60 * 60 * 1000). O bug introduziu TTL = 0, fazendo com que cada requisição de cover buscasse dados novos da API a cada acesso, sem cache. Isso causa lentidão, aume
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 4321ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "Inversão da ordenação do ranking: .sort((a, b) => a.score - b.score) ordena de forma ascendente, mas o esperado é descendente (b.score - a.score). Isso faz com que agentes com menor pontuação apareçam primeiro, prejudicando 
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 21235ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "Bug na função `hasBlockedSource`: a condição foi invertida com o operador `!`. O diff mostra que a linha correta `return source.includes('social') || source.includes('fanart') || type.includes('social') || type.includes('fan
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 8513ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, invertido, origin
```
```json {   "diagnosis": "Bug de lógica invertida no middleware CORS. A condição `!allowedOrigins.has(origin)` permite requisições de origens NÃO autorizadas, ao invés de bloquear. A condição correta (presente no diff como `-`) era `allowedOrigins.ha
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 8321ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "No arquivo backend/src/app.js, linha 84, o limit do express.json foi alterado de '1mb' para '1b' (1 byte), impedindo que qualquer requisição JSON com corpo maior que 1 byte seja processada — causa direta de falha nas rotas P
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10553ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, invertido, candidate
```
```json {   "diagnosis": "A condição de verificação do token de refresh foi invertida: 'candidate === expectedToken' nega acesso com token válido, fazendo com que requisições legítimas ao endpoint /refresh recebam 401.",   "file": "backend/src/routes
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8703ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "Summary truncation bug: slice(0,0) results in empty summary string, causing blank descriptions on site.",   "file": "backend/src/services/normalizer.js",   "fix_type": "code_patch",   "patch": {     "search": "  ).slice(0, 0
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 18825ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "Erro de lógica no health check: `return !response.ok;` inverte o resultado, fazendo com que URLs saudáveis (status 2xx) retornem `false` e URLs não saudáveis (4xx/5xx) retornem `true`. Onde deveria ser `return response.ok;`.
```


