# Vision Core — Stress Test V3 Results

Data: 2026-07-09T12:23:50.889Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 11073ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 2688ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, finally
```
```json {   "diagnosis": "clearTimeout(timer) foi comentado, impedindo o cancelamento do timer no finally",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "search": "// clearTimeout(timer); // bug: 
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 28945ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "A mudança no catch de readJson substituiu o retorno de fallback por um throw, quebrando todas as funções que dependiam do fallback (readCache, readImageCache, readTranslationCache). O site falha porque uma leitura de cache m
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 770ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260, delay
```
```json {   "diagnosis": "Timeout delay reduzido para 0 ms impede animação de colapso do feed, causando desaparecimento abrupto do container.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "search": "}, 0);",    
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 2778ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, b.confidence
```
```json {   "diagnosis": "Ordenação invertida no comparador de confiança, linha 245: uso de a.confidence - b.confidence em vez de b.confidence - a.confidence",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 995ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "await da configuração foi comentado, impedindo que o init espere window.__TNG_CONFIG_READY__; isso causa falha de inicialização prematura",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 14834ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, 404, latest
```
```json {   "diagnosis": "Typo no path da API: '/api/nwes/latest?limit=18' em vez de '/api/news/latest?limit=18' — rota inexistente causa falha na promise e seção 'Últimas notícias' vazia.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_p
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 708ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit incorrectly caps limit to 0, causing all endpoints that rely on it to return empty results",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "return Math.min(par
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 19988ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "Cache TTL setado como 0ms (desabilitado) no diff introduzido. O fallback para variável de ambiente inexistente GAME_COVER_CACHE_TTL_MS resulta em cache expirando imediatamente, forçando re-busca em cada chamada a resolveGame
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 867ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "Ordenação dos rankings invertida: a função agora usa ordem ascendente (a.score - b.score) em vez de descendente, fazendo com que itens com menor score apareçam primeiro.",   "file": "backend/src/services/hermesService.js",  
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 18997ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "hasBlockedSource teve sua lógica invertida: o diff mostra que a linha correta (original) retornava true para fontes sociais/fanart (bloqueando-as), enquanto a linha bugada inverte com '!' (negando o bloqueio), fazendo com qu
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 17926ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Bug de inversão lógica no middleware CORS — o operador ! tornou a condição verdadeira para origens NÃO autorizadas, fazendo com que o cabeçalho Access-Control-Allow-Origin seja setado para origens estranhas, potencialmente c
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 36437ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "app.use(express.json({ limit: '1b' })) limita o corpo JSON a 1 byte, rejeitando qualquer requisição POST com payload. O valor correto é '1mb' (1 megabyte).",   "file": "backend/src/app.js",   "fix_type": "code_patch",   "pat
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1215ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
```json {   "diagnosis": "Condição de autorização invertida em requireRefreshAuth: usa 'candidate === expectedToken' permitindo token correto, mas deveria negar acesso. Essa inversão gera respostas 401 indevidas.",   "file": "backend/src/routes/newsR
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1982ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280
```
```json {   "diagnosis":  "O problema está no slicing do summary, que está definido para 0 caracteres, resultando em uma string vazia",   "file":       "backend/src/services/normalizer.js",   "fix_type":   "code_patch",   "patch":      { "search": ")
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 16969ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok, fallback
```
```json {   "diagnosis": "Função isHealthy inverteu a lógica de retorno. O diff mostra que `return response.ok` (correto) foi alterado para `return !response.ok` (incorreto). Isso faz com que endpoints saudáveis retornem false e vice-versa, quebrando
```


