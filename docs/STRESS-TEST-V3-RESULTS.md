# Vision Core — Stress Test V3 Results

Data: 2026-06-13T13:29:19.798Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 9520ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 12476ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
```json {   "diagnosis": "A linha `// clearTimeout(timer); // bug: timer não cancelado` comentou a chamada que limpava o timer do AbortController no bloco `finally` da função `fetchJson`. Isso faz com que o timeout nunca seja cancelado após a requisi
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 4653ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "O catch no readJson foi alterado de retornar fallback (comportamento tolerante a falhas) para lançar uma exceção (comportamento que quebra o fluxo), causando falha em todas as funções que dependem de readJson (readCache, rea
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 5875ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260, delay
```
```json {   "diagnosis": "O setTimeout em hideEmptyContainer foi alterado de 260ms para 0ms, removendo o delay de animação de colapso do feed-block. Isso faz com que a classe 'feed-block-collapsing' seja removida instantaneamente, impedindo a animaçã
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 3441ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "Bug de ordenação inversa. O diff mostra que a linha correta `b.confidence - a.confidence` foi alterada para `a.confidence - b.confidence`, invertendo a ordenação dos resultados. Isto faz com que as piores correspondências ap
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7263ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "A espera pela configuração global (__TNG_CONFIG_READY__) foi comentada, fazendo com que init() seja chamado antes da configuração estar pronta, podendo causar falhas em funcionalidades dependentes.",   "file": "front/assets/
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 11997ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, latest
```
```json {   "diagnosis": "Typo no path da API: '/api/nwes/latest?limit=18' foi introduzido no lugar de '/api/news/latest?limit=18', causando falha na requisição da seção 'Últimas notícias' (hero e listagem).",   "file": "front/assets/js/feeds.js",   
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6830ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit() retorna Math.min(parsed, 0) que sempre resulta em 0, fazendo todas as queries de notícias retornarem 0 itens — site fica vazio",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   "patch"
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9482ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS foi alterado para 0 (fallback value = 0), desabilitando o cache de capas. Cada requisição refaz chamadas às APIs externas, causando latência e possíveis rate limits.",   "file": "backend/src/services/gameC
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10068ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score, invertido
```
```json {   "diagnosis": "Linha 176 em backend/src/services/hermesService.js: sort foi modificado de descendente (b.score - a.score) para ascendente (a.score - b.score), invertendo a ordem do ranking.",   "file": "backend/src/services/hermesService.j
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 27513ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "Bug em hasBlockedSource: negação lógica invertida (linha 92). O operador ! faz com que fontes 'social' e 'fanart' (tier 5) sejam aceitas em vez de bloqueadas.",   "file": "backend/src/services/gameCoverService.js",   "fix_ty
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 8031ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "O operador de negação `!` foi incorretamente adicionado na condição CORS em `backend/src/app.js` linha 59, fazendo com que origens não autorizadas recebam o header `Access-Control-Allow-Origin`, enquanto origens autorizadas 
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 5215ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "Arquivo backend/src/app.js: linha com `app.use(express.json({ limit: \"1b\" }));` — limit de payload de JSON definido como 1 byte (inválido), rejeitando requisições com corpo JSON, causando erro 413 ou falha silenciosa no pa
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6189ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, invertido, auth, candidate
```
```json {   "diagnosis": "Inversão lógica na condição de autorização em requireRefreshAuth: candidate === expectedToken deveria ser candidate !== expectedToken, causando rejeição de tokens válidos e aceitação de tokens inválidos.",   "file": "backend
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11659ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "No arquivo `backend/src/services/normalizer.js`, linha 37, o método `slice(0, 0)` foi introduzido em substituição ao `slice(0, 280)` original. Isso faz com que todas as strings de `summary` sejam truncadas para 0 caracteres,
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12112ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok, invertido
```
```json {   "diagnosis": "Função isHealthy inverteu retorno: `return !response.ok;` faz com que APIs não saudáveis sejam consideradas saudáveis e vice-versa.",   "file": "front/assets/js/config.js",   "fix_type": "code_patch",   "patch": {     "searc
```


