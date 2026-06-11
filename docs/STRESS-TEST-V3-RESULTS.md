# Vision Core — Stress Test V3 Results

Data: 2026-06-11T21:46:58.873Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 9646ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 16909ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, finally
```
```json {   "diagnosis": "A linha clearTimeout(timer) foi comentada no bloco finally da função fetchJson, impedindo que o timer de timeout seja cancelado após a conclusão da requisição, causando vazamento de memória e timeout prolongado.",   "file": 
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 13058ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "Em cacheService.js, o catch da função readJson foi alterado de retornar fallback para lançar uma exceção (throw new Error). Isso faz com que qualquer falha de leitura do cache (arquivo ausente ou inválido) propague erro para
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10938ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260
```
```json {   "diagnosis": "A animação de recolhimento de blocos de feed foi removida ao alterar o timeout de 260ms para 0ms, causando transição abrupta e possível 'flash' visual. O valor 260ms era necessário para permitir que a transição CSS ocorresse
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 15057ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "Em rankGameCoverCandidates, o sort final compara confidence em ordem crescente (a.confidence - b.confidence) em vez de decrescente, fazendo com que covers de pior qualidade sejam priorizados.",   "file": "backend/src/service
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9962ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "A linha que aguarda a inicialização da configuração global (window.__TNG_CONFIG_READY__) foi comentada no diff, fazendo com que o DOMContentLoaded dispare TechNetGameFeeds.init() sem garantir que a configuração esteja pronta
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 13202ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, latest
```
```json {   "diagnosis": "Typo no endpoint da API: '/api/nwes/latest?limit=18' (incorreto) em vez de '/api/news/latest?limit=18' (correto). A rota 'nwes' não existe, causando falha na requisição da seção 'Últimas notícias'.",   "file": "front/assets/
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6414ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "Alteração incorreta na função safeLimit: o valor máximo foi alterado de 120 para 0, fazendo com que todas as rotas que usam safeLimit retornem limit=0, o que provavelmente retorna zero resultados ou causa erro downstream.", 
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12820ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS com fallback 0 causa expiração imediata do cache, anulando cache de capas e forçando novas requisições a cada chamada, impactando performance e limites de API.",   "file": "backend/src/services/gameCoverSe
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6246ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "calculateRanking() ordena ranking em ordem ASCENDENTE (a.score - b.score) em vez de DESCENDENTE (b.score - a.score), fazendo com que os agentes com maior pontuação apareçam por último no ranking.",   "file": "backend/src/ser
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9016ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "Inversão de lógica em hasBlockedSource: a negação `!` faz com que fontes 'social'/'fanart' sejam aceitas em vez de bloqueadas.",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": { 
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7125ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "CORS middleware inverteu a lógica: a condição `if (origin && !allowedOrigins.has(origin))` passou a emitir headers `Access-Control-Allow-Origin` para origens NÃO autorizadas, bloqueando requisições legítimas.",   "file": "ba
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 5104ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "Limite de payload JSON definido como 1 byte (1b) em vez de 1 megabyte (1mb), impedindo qualquer requisição com corpo JSON útil",   "file": "backend/src/app.js",   "fix_type": "code_patch",   "patch": {     "search": "app.use
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 4180ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, invertido, auth, candidate
```
```json {   "diagnosis": "Bug de inversão lógica na autenticação do refresh: o operador de negação !== foi trocado por ===, fazendo com que tokens válidos sejam rejeitados e tokens inválidos sejam aceitos.",   "file": "backend/src/routes/newsRoutes.j
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6535ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "Bug introduzido por alteração no slice do summary: mudança de .slice(0, 280) para .slice(0, 0) trunca o texto para vazio, fazendo summaries sempre retornarem string vazia.",   "file": "backend/src/services/normalizer.js",   
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8123ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "Bug de lógica em isHealthy(): a linha foi invertida de 'return response.ok' para 'return !response.ok', fazendo com que endpoints saudáveis (status 200) retornem false e endpoints com erro retornem true, quebrando a detecção
```


