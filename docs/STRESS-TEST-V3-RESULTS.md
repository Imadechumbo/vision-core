# Vision Core — Stress Test V3 Results

Data: 2026-06-12T03:25:43.909Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 13830ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6910ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
```json {   "diagnosis": "A linha `clearTimeout(timer);` foi comentada no bloco `finally` da função `fetchJson`, impedindo o cancelamento do timer de timeout. Isso causa vazamento de recursos (setTimeout não limpo) e potencialmente mantém a requisiçã
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 21902ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "A função readJson foi alterada para lançar exceção em vez de retornar fallback quando o cache não existe ou está corrompido. Isso quebra todos os callers (readCache, readImageCache, readTranslationCache) que dependem do fall
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 32783ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260, delay
```
```json {   "diagnosis": "O valor do timeout foi reduzido de 260ms para 0ms, removendo completamente o delay da animação de recolhimento, o que causa transições abruptas e visíveis para o usuário.",   "file": "front/assets/js/feeds.js",   "fix_type":
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 5714ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "Bug introduzido no DIFF: na função rankGameCoverCandidates, o sort final inverteu a ordem de ordenação por confiança. A linha original correta (-) ordenava do maior para o menor (decrescente: b.confidence - a.confidence). A 
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 663ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "A linha de inicialização foi comentada, impedindo a espera da configuração global; isso causa inicialização prematura de TechNetGameFeeds.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 13037ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, 404, latest
```
```json {   "diagnosis": "Typo no endpoint da API: '/api/nwes/latest' (com 'w') em vez de '/api/news/latest' — causa erro 404/404 na requisição de notícias em destaque.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": { 
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 10272ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "A função safeLimit retorna Math.min(parsed, 0) em vez de Math.min(parsed, 120), forçando qualquer limite positivo a ser 0. Isso quebra todas as rotas que usam safeLimit (latest, category, source, month, game-search) retornan
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 25861ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS foi alterado de 6 horas (21.600.000 ms) para 0 ms, desabilitando completamente o cache de capas de jogos. Cada requisição a resolveGameCover() faz novas chamadas às APIs externas (RAWG, SteamGridDB), causa
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 3231ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "Bug de ordenação no calculationRanking: sort invertera ordem de decrescente para crescente, fazendo os itens mais relevantes aparecerem por último na lista de classificação.",   "file": "backend/src/services/hermesService.js
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 16271ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "hasBlockedSource() logic inverted by adding `!` negation — now returns `true` for permitted sources and `false` for blocked ones, causing incorrect rejection of valid covers and acceptance of social/fanart covers.",   "file"
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 14601ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "CORS middleware condition invertida: em vez de permitir origens confiáveis (allowedOrigins), o código agora define Access-Control-Allow-Origin apenas para origens NÃO autorizadas, bloqueando requisições do frontend legítimo.
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 16502ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json
```
```json {   "diagnosis": "O limite de corpo JSON foi alterado de '1mb' para '1b' no middleware express.json, fazendo com que requisições POST com corpo JSON maior que 1 byte sejam rejeitadas. Isso quebra todas as rotas que aceitam JSON (ex.: /api/hea
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9399ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, invertido, auth, candidate
```
```json {   "diagnosis": "A condição de autorização foi invertida no middleware requireRefreshAuth. O diff mostra que candidate === expectedToken foi usado no lugar de candidate !== expectedToken, fazendo com que tokens válidos sejam rejeitados e tok
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 21501ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "normalizer.js linha 47: `.slice(0, 280)` foi alterado para `.slice(0, 0)` no diff fornecido, fazendo com que todo summary seja truncado para string vazia — resultando em resumos sempre vazios no site.",   "file": "backend/sr
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8798ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "Inversão de lógica na função isHealthy: `return !response.ok` faz com que o health check retorne false quando a API responde com status HTTP 2xx (ok), e true quando há erro. Isso impede a detecção correta de API saudável.", 
```


