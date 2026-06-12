# Vision Core — Stress Test V3 Results

Data: 2026-06-12T12:15:43.075Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 10019ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 16423ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
```json {   "diagnosis": "No bloco finally da função fetchJson, a chamada clearTimeout(timer) foi comentada (diff mostra + '// clearTimeout(timer); // bug: timer não cancelado'), impedindo o cancelamento do timeout do AbortController. Isso permite qu
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1289ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "Função readJson lança erro ao falhar ao ler cache, em vez de retornar fallback, interrompendo fluxos que esperam o valor padrão.",   "file": "backend/src/services/cacheService.js",   "fix_type": "code_patch",   "patch": {   
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1364ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** 260, delay
```
```json {   "diagnosis": "A linha de timeout foi alterada de 260 ms para 0 ms, removendo o atraso necessário antes de ocultar o contêiner, o que impede a animação de colapso correta.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9522ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "A ordenação dos candidatos em rankGameCoverCandidates usa ordem crescente de confidence (a.confidence - b.confidence) em vez de decrescente (b.confidence - a.confidence), fazendo com que capas com menor confiança sejam prior
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7156ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "No arquivo front/assets/js/feeds.js, linha 721 (DOMContentLoaded handler), a linha que aguardava a configuração global (window.__TNG_CONFIG_READY__) foi comentada, permitindo que feeds.js inicialize antes que a configuração 
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 10841ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, 404, latest
```
```json {   "diagnosis": "Typo em endpoint da API: '/api/nwes/latest?limit=18' deveria ser '/api/news/latest?limit=18'. Isso faz a requisição falhar (404) e a página não carrega as últimas notícias.",   "file": "front/assets/js/feeds.js",   "fix_type
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6527ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "A função safeLimit retorna Math.min(parsed, 0), forçando limite zero em todas as queries de notícias, resultando em listagens vazias.",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   "patch": {  
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7842ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS foi alterado de 6 horas (6 * 60 * 60 * 1000) para 0ms, desabilitando efetivamente o cache de capas de jogos. Isso força uma nova requisição às APIs externas (RAWG, SteamGridDB) a cada chamada de resolveGam
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8071ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "A ordenação em calculateRanking está ascendente (a.score - b.score) em vez de descendente (b.score - a.score), invertendo o ranking e colocando agentes com menor score primeiro.",   "file": "backend/src/services/hermesServic
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12368ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "hasBlockedSource() teve sua lógica invertida no diff: linha 89, a condição original `source.includes('social') || ...` verificava se a fonte era bloqueada (retornando true para fontes bloqueadas). O patch errado adicionou `!
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 5048ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Bug de lógica invertida no middleware CORS: a condição `!allowedOrigins.has(origin)` permite requisições de origens NÃO autorizadas, enquanto origens autorizadas são bloqueadas. O comportamento correto é permitir apenas orig
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 10201ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "Limite do body JSON alterado de 1mb para 1b (1 byte) no middleware express.json, rejeitando qualquer requisição POST/PUT com payload superior a 1 byte.",   "file": "backend/src/app.js",   "fix_type": "code_patch",   "patch":
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 30092ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, candidate
```
```json {   "diagnosis": "Bug de inversão lógica na autenticação do refresh token. A condição foi alterada de !== (diferente) para === (igual), fazendo com que tokens válidos sejam rejeitados (401) e tokens inválidos sejam aceitos.",   "file": "backe
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 4155ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280
```
```json {   "diagnosis": "Bug introduzido no DIFF: slice(0, 0) no summary trunca todo texto para string vazia, causando fallback para fallback genérico em todos os itens",   "file": "backend/src/services/normalizer.js",   "fix_type": "code_patch",   
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 19391ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok, fallback
```
```json {   "diagnosis": "Front/assets/js/config.js: função isHealthy() inverte a validação de saúde da API. Linha `return !response.ok;` faz com que retorne true quando a resposta NÃO é ok, e false quando é ok, quebrando a lógica de fallback.",   "f
```


