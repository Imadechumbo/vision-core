# Vision Core — Stress Test V3 Results

Data: 2026-06-12T06:59:03.564Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 6649ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 19458ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
```json {   "diagnosis": "A linha 'clearTimeout(timer);' foi comentada (//), impedindo o cancelamento do timer em fetchJson(). Isso causa vazamento de timeout (memory leak) e comportamento indefinido quando a requisição excede o timeout da API.",   "
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1107ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "A cláusula catch foi alterada erroneamente: ao capturar a exceção o código lança um erro em vez de retornar o fallback, introduzindo falha de leitura de cache.",   "file": "backend/src/services/cacheService.js",   "fix_type"
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 721ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260
```
```json {   "diagnosis": "Timeout de colapso do feed foi reduzido para 0 ms, eliminando a animação de ocultação e causando UI truncada.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "search": "        }, 0);",  
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6095ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "A ordenação dos candidatos em rankGameCoverCandidates está invertida. O diff mostra que a linha correta era 'return b.confidence - a.confidence' (decrescente, maior confiança primeiro), mas foi alterada para 'return a.confid
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 4825ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "A linha que aguardava a configuração global (window.__TNG_CONFIG_READY__) foi comentada, fazendo com que feeds.js execute init() antes da configuração estar pronta, resultando em grids vazios ou erros de carregamento.",   "f
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 956ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, latest
```
```json {   "diagnosis": "Typo no endpoint da chamada API: '/api/nwes/latest' ao invés de '/api/news/latest'.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "search": "            this.fetchJson('/api/nwes/latest
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 20097ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit() retorna Math.min(parsed, 0) — bug introduzido no diff que zera o limite, fazendo todas as queries de notícias retornarem vazio ou erro.",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch", 
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1391ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS está configurado como 0, fazendo com que o cache expire imediatamente e cause falhas de desempenho.",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "sea
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12833ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "Ordenação do ranking invertida: .sort((a, b) => a.score - b.score) coloca menores scores primeiro, quebrando a lógica que espera ranking decrescente.",   "file": "backend/src/services/hermesService.js",   "fix_type": "code_p
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1391ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "hasBlockedSource returns inverted boolean, causing blocked sources to be treated as allowed",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "search": "return !(source.incl
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7917ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Bug de inversão lógica no middleware CORS: a condição foi alterada de 'allowedOrigins.has(origin)' para '!allowedOrigins.has(origin)', fazendo com que o cabeçalho Access-Control-Allow-Origin seja enviado apenas para origens 
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6172ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "O limite de body JSON foi alterado de 1mb para 1b (1 byte) no arquivo backend/src/app.js, linha 84. Isso impede que qualquer requisição POST/PUT/PATCH com corpo JSON seja processada, causando erro 413 ou falha silenciosa em 
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 963ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
```json {   "diagnosis": "Condição de autorização invertida em requireRefreshAuth: usa 'candidate === expectedToken' em vez de 'candidate !== expectedToken', permitindo acesso não autorizado.",   "file": "backend/src/routes/newsRoutes.js",   "fix_typ
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 4201ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280
```
```json {   "diagnosis": "slice(0, 0) no campo summary corta todo o texto, resultando em string vazia sempre. Linha 47: summary passa a ser '' invariavelmente, pois .slice(0, 0) retorna string vazia.",   "file": "backend/src/services/normalizer.js", 
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11613ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "A função isHealthy() em front/assets/js/config.js linha 48 inverteu a lógica de retorno: em vez de retornar true quando o health check responde com status HTTP 2xx/3xx (response.ok), retorna !response.ok, ou seja, true apena
```


