# Vision Core — Stress Test V3 Results

Data: 2026-07-19T14:54:28.824Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 6943ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1153ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, finally
```
```json {   "diagnosis": "timer não é cancelado porque a chamada clearTimeout foi comentada",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "search": "// clearTimeout(timer); // bug: timer não canc
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 9406ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "O novo tratamento de erro no catch de readJson() lança uma exceção em vez de retornar o fallback quando o cache não existe ou está corrompido, quebrando o site.",   "file": "backend/src/services/cacheService.js",   "fix_type
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 717ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260, delay
```
```json {   "diagnosis": "O atraso do setTimeout foi alterado de 260ms para 0ms, removendo o tempo de animação previsto ao esconder o container.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "search": "        }
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 18268ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, invertido, b.confidence
```
```json {   "diagnosis": "Comparador de ordenação em rankGameCoverCandidates inverteu a ordem de confidence. Linha original (correta) ordenava decrescente por confidence (b.confidence - a.confidence). A alteração para (a.confidence - b.confidence) or
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 841ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "Linha de inicialização comentada impede esperar a configuração (window.__TNG_CONFIG_READY__), fazendo o feed iniciar antes dos dados estarem prontos.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "pat
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6115ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, 404, latest
```
```json {   "diagnosis": "Digitação '/api/nwes/' em vez de '/api/news/' na linha de fetchJson para últimas notícias, introduzindo um erro de digitação que quebra o carregamento dos dados.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_pa
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 21016ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "O valor máximo de limit foi alterado de 120 para 0 em safeLimit, fazendo com que qualquer limite positivo seja truncado para 0, retornando resultados vazios.",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "cod
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1088ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "CACHE_TTL_MS foi alterado para 0, desativando o cache de capas de jogos e gerando chamadas excessivas à API.",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "search": "con
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1017ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "Ordenação invertida no ranking; a função sort foi alterada para ordem ascendente, gerando ranking errado.",   "file": "backend/src/services/hermesService.js",   "fix_type": "code_patch",   "patch": {     "search": ".sort((a,
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 14146ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "Inversão de lógica em hasBlockedSource — o operador `!` introduzido no patch faz com que fontes legítimas (rawg, steamgriddb) sejam rejeitadas, pois a função retorna true quando a fonte NÃO contém 'social'/'fanart', bloquean
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1112ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Condição de CORS invertida: bloqueia origens permitidas e permite origens não listadas.",   "file": "backend/src/app.js",   "fix_type": "code_patch",   "patch": {     "search": "if (origin && !allowedOrigins.has(origin)) {",
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 9546ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json
```
```json {   "diagnosis": "JSON body parser limit alterado de 1mb para 1b no middleware express.json() — qualquer requisição com corpo JSON acima de 1 byte é rejeitada, quebrando todo envio de dados (formulários, API calls).",   "file": "backend/src/a
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6497ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
```json {   "diagnosis": "Inversão de lógica no middleware requireRefreshAuth: a condição do if foi alterada de `candidate !== expectedToken` (correto) para `candidate === expectedToken` (bug), fazendo com que requisições com token válido recebam 401
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 815ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "Slice range for summary is set to 0, removing all content; should be 280 characters",   "file": "backend/src/services/normalizer.js",   "fix_type": "code_patch",   "patch": {     "search": "    ).slice(0, 0);",     "replace"
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12410ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "Inversão lógica na função isHealthy: o retorno foi trocado de response.ok para !response.ok, fazendo com que o health check falhe quando a API responde corretamente (ok: true). Isso impede a configuração da URL base da API, 
```


