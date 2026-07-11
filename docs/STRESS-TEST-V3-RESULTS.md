# Vision Core — Stress Test V3 Results

Data: 2026-07-11T18:05:46.018Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 16489ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 26663ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, finally
```
```json {   "diagnosis": "Bug introduzido ao comentar clearTimeout(timer) no bloco finally de fetchJson, impedindo o cancelamento do timer e causando potencial memory leak/timeout não tratado.",   "file": "backend/src/services/gameCoverService.js",  
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 20692ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "readJson() lança exceção em vez de retornar fallback quando cache file não existe ou está corrompido. O diff mostra que o comportamento original (try sem e, catch com retorno de fallback) foi substituído por try/catch com th
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 5330ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260
```
```json {   "diagnosis": "Em hideEmptyContainer, o setTimeout foi alterado de 260ms para 0ms, removendo o atraso que permitia a animação CSS de collapse, causando transição brusca e possível falha visual.",   "file": "front/assets/js/feeds.js",   "fi
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 29467ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "A ordenação dos candidatos em rankGameCoverCandidates foi invertida de descendente (b.confidence - a.confidence) para ascendente (a.confidence - b.confidence), fazendo com que o pior candidato (menor confiança) seja selecion
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 21243ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "A linha que aguardava a configuração global (__TNG_CONFIG_READY__) antes de inicializar foi comentada, fazendo com que init() execute antes da configuração estar completa.",   "file": "front/assets/js/feeds.js",   "fix_type"
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6706ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, latest
```
```json {   "diagnosis": "Typo no path da API: '/api/nwes/latest?limit=18' em vez de '/api/news/latest?limit=18' na função fetchHomePayloadFallback, causando falha na requisição de 'Últimas notícias'.",   "file": "front/assets/js/feeds.js",   "fix_ty
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7402ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit retorna Math.min(parsed, 0) sempre zerando o limite, pois o segundo argumento é 0. O correto é 120 para limitar o número de resultados.",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9245ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS foi alterado de 6 horas (6*60*60*1000) para 0, eliminando o cache de capas e causando recarregamento completo a cada requisição, resultando em lentidão e falhas no site.",   "file": "backend/src/services/g
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7285ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "Ordenação de ranking invertida no calculateRanking. O DIFF mostra que .sort((a, b) => b.score - a.score) (decrescente, correto) foi alterado para .sort((a, b) => a.score - b.score) (crescente, bug). Isso faz com que o agente
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 57595ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
MISSIONE RECEBIDA Tipo: bug fix Risco: crítico Escopo: backend/src/services/gameCoverService.js  ```json {   "diagnosis": "Bug de inversão lógica em hasBlockedSource. O operador '!' foi inserido no return, invertendo a lógica: fontes bloqueadas (soci
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 10659ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, invertido, origin
```
MISSÃO RECEBIDA Tipo: bug fix Risco: alto Escopo: backend/src/app.js  ```json {   "diagnosis": "Condição CORS invertida no middleware: o operador `!` foi adicionado, fazendo com que origens autorizadas NÃO recebam o header Access-Control-Allow-Origin
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 8125ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "O limite de body JSON foi definido como '1b' (1 byte) em vez de '1mb' (1 megabyte), fazendo com que qualquer requisição POST com corpo JSON seja rejeitada pelo Express com erro 413 Payload Too Large.",   "file": "backend/src
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 20324ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
```json {   "diagnosis": "Condição invertida no middleware requireRefreshAuth. A linha `candidate === expectedToken` faz com que tokens válidos sejam rejeitados (401), enquanto tokens inválidos passam. A regra deveria ser `candidate !== expectedToken
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9866ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280
```
MISSÃO RECEBIDA Tipo: bug fix Risco: baixo Escopo: backend/src/services/normalizer.js  ```json {   "diagnosis": "Linha do slice no summary foi alterada de 280 para 0, cortando o resumo para string vazia e fazendo o fallback sempre assumir o texto gen
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6728ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "isHealthy function returns true when health endpoint fails (status != 200) and false when it succeeds, due to inverted 'return !response.ok'",   "file": "front/assets/js/config.js",   "fix_type": "code_patch",   "patch": {  
```


