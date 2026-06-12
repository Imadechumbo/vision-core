# Vision Core — Stress Test V3 Results

Data: 2026-06-12T13:47:47.819Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 12 |
| FAIL | 3 |
| Taxa de acerto | 80% |
| Tempo médio | 10310ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 4 | 1 | 80% |
| F — Dados/API | 4 | 1 | 80% |
| G — Segurança/Config | 4 | 1 | 80% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 11107ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
```json {   "diagnosis": "Na função fetchJson, o clearTimeout(timer) foi comentado, impedindo o cancelamento do timer de timeout após a conclusão da requisição. Isso causa vazamento de timers e potencial execução tardia do abort, podendo gerar AbortE
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 25356ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "Bug introduzido no cacheService.js: catch handler de readJson foi alterado de retornar fallback para lançar exceção, quebrando consumidores que dependem do fallback silencioso.",   "file": "backend/src/services/cacheService.
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 12873ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** 260
```
```json {   "diagnosis": "Timeout em hideEmptyContainer foi alterado de 260ms para 0ms na linha 482, removendo a animação de collapse e causando transição instantânea sem feedback visual.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_pa
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8124ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "Ordenação invertida em rankGameCoverCandidates: linha correta (antes do bug) ordenava 'b.confidence - a.confidence' (maior confidence primeiro). O bug inverteu para 'a.confidence - b.confidence', colocando candidatos com men
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7394ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "linha de await para configuração foi comentada em 'front/assets/js/feeds.js', causando inicialização prematura sem aguardar __TNG_CONFIG_READY__",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": 
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 5564ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, 404, latest
```
```json {   "diagnosis": "typo em endpoint da API: '/api/nwes/latest?limit=18' em vez de '/api/news/latest?limit=18' — a rota correta do servidor contém 'news' e não 'nwes', causando erro 404 na requisição de últimas notícias",   "file": "front/asset
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6322ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "Linha 9: `return Math.min(parsed, 0);` — o segundo argumento de Math.min foi alterado para 0, fazendo com que toda rota que usa `safeLimit` sempre retorne 0, independentemente do valor de `parsed`. Patch: restaurar para 120.
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8548ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS fallback alterado de 6 horas (6*60*60*1000) para 0 ms, desabilitando efetivamente o cache e forçando requisições repetitivas às APIs externas, causando lentidão e possível falha no site.",   "file": "backe
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10113ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "A ordenação do ranking em calculateRanking foi invertida de decrescente para crescente, causando exibição incorreta dos agentes mais relevantes.",   "file": "backend/src/services/hermesService.js",   "fix_type": "code_patch"
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 0ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** _nenhuma_
```
(sem resposta)
```
**Erro:** Request failed with status code 503

### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 16132ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "CORS condition negada no middleware de app.js: a linha alterada inverteu a lógica de `if (origin && allowedOrigins.has(origin))` para `if (origin && !allowedOrigins.has(origin))`, fazendo com que headers CORS sejam aplicados
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ❌ FAIL | **Dificuldade:** HARD | **Tempo:** 0ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** _nenhuma_
```
(sem resposta)
```
**Erro:** Request failed with status code 503

### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1715ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, candidate
```
```json {   "diagnosis": "Condição de autenticação invertida: uso de 'candidate === expectedToken' impede refresh válido.",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "if (!expectedToken || ca
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11211ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "O campo summary está sendo cortado para 0 caracteres (slice(0,0)) em vez de 280, resultando em resumo vazio para todos os itens do feed.",   "file": "backend/src/services/normalizer.js",   "fix_type": "code_patch",   "patch"
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9576ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok, invertido
```
```json {   "diagnosis": "Arquivo front/assets/js/config.js, linha 51: função isHealthy() retorna !response.ok em vez de response.ok, invertendo a lógica de verificação de saúde. A API health endpoint retorna status 200, mas o site interpreta como nã
```


