# Vision Core — Stress Test V3 Results

Data: 2026-06-11T17:15:50.927Z
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
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 14876ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, finally
```
```json {   "diagnosis": "A linha 'clearTimeout(timer);' foi comentada com //, mas está dentro do bloco finally. Quando o fetch é bem-sucedido, o timer nunca é limpo, causando vazamento de recursos (timeout) e potencialmente mantendo referências de m
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 4118ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "O catch no readJson foi alterado de retornar fallback para lançar exceção, quebrando todas as funções que dependiam do fallback (readCache, readImageCache, readTranslationCache) quando o arquivo de cache não existe ou está c
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 20050ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260
```
```json {   "diagnosis": "O tempo do setTimeout em hideEmptyContainer foi alterado de 260ms para 0ms, removendo o atraso da animação de collapse. O container desaparece instantaneamente sem o efeito visual previsto.",   "file": "front/assets/js/feeds
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6453ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "A ordenação dos candidatos em rankGameCoverCandidates inverteu a direção do sort de confidence. A linha original (correta) usava `b.confidence - a.confidence` (decrescente), mas foi alterada para `a.confidence - b.confidence
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7848ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "Comentário removendo `await (window.__TNG_CONFIG_READY__ || Promise.resolve())` faz com que `init()` execute sem aguardar a configuração global, causando possível falha na inicialização dos feeds (race condition).",   "file"
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 4302ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, latest
```
```json {   "diagnosis": "Typo no path da API: '/api/nwes/latest?limit=18' (nwes em vez de news) na linha 94 do arquivo front/assets/js/feeds.js, causando falha na requisição de últimas notícias.",   "file": "front/assets/js/feeds.js",   "fix_type": 
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 8090ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "Função safeLimit em backend/src/routes/newsRoutes.js: linha 10 usa Math.min(parsed, 0) que força limite a 0 para qualquer valor positivo, fazendo todas as rotas que usam safeLimit retornarem zero resultados. Bug introduzido 
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10351ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "Cache TTL configurado como 0 (fallback) faz com que todas as consultas de capa ignorem o cache, forçando requisições repetidas às APIs externas (RAWG, SteamGridDB), causando lentidão, timeout e potencial bloqueio por rate li
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10384ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "calculateRanking function in hermesService.js introduced sorting bug: changed from descending order to ascending order. Lines 176-177: .sort((a, b) => b.score - a.score) was correct, .sort((a, b) => a.score - b.score) is wro
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 22415ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "hasBlockedSource retorna true para fontes NÃO bloqueadas (social/fanart) devido à negação ! adicionada. O operador NOT inverteu a lógica: antes bloqueava social/fanart (correto), agora BLOQUEIA tudo EXCETO social/fanart (inc
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 11187ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Inversão lógica no middleware CORS: a condição `if (origin && !allowedOrigins.has(origin))` agora ativa o header Access-Control-Allow-Origin para origens NÃO autorizadas, em vez de apenas para origens autorizadas. Isso faz c
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 10152ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "O limite do body parser JSON foi reduzido de 1 megabyte para 1 byte, impedindo qualquer requisição com corpo (payload >1B), causando erro 413 Payload Too Large ou falha silenciosa no parse.",   "file": "backend/src/app.js", 
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 17718ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, invertido, auth, candidate
```
```json {   "diagnosis": "Operador de comparação invertido na linha de autenticação do middleware requireRefreshAuth. O diff mostra que a condição foi alterada de `!==` para `===`, fazendo com que tokens válidos sejam rejeitados (retornando 401) e to
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13209ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280
```
```json {   "diagnosis": "Summary truncation limit altered from 280 to 0 characters (line 47 of normalizer.js). This causes all summaries to be empty strings, forcing the fallback text 'Leia a cobertura completa em...' to be used for every item, brea
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 4938ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "A função isHealthy inverte a lógica de verificação de saúde da API. O diff mostra que a linha original correta 'return response.ok;' foi substituída por 'return !response.ok;', fazendo com que o site considere saudável apena
```


