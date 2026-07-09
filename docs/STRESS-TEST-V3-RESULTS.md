# Vision Core — Stress Test V3 Results

Data: 2026-07-09T07:17:56.914Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 14 |
| FAIL | 1 |
| Taxa de acerto | 93% |
| Tempo médio | 13954ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 4 | 1 | 80% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 13920ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
```json {   "diagnosis": "Bug introduzido no diff: a linha `clearTimeout(timer)` foi comentada, impedindo o cancelamento do timeout do AbortController. Isso causa vazamento de timer e potencial falha de timeout em requisições futuras, pois o timer co
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 5977ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "O catch do readJson foi alterado de retornar fallback para lançar erro, quebrando o fallback de cache e causando falha na resposta do site",   "file": "backend/src/services/cacheService.js",   "fix_type": "code_patch",   "pa
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 11100ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** 260
```
```json {   "diagnosis": "Timeout de 0ms em hideEmptyContainer elimina animação de collapse, causando desaparecimento abrupto do feed. O valor original de 260ms deve ser restaurado.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch", 
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 17010ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "Inversão da ordenação por confidence em rankGameCoverCandidates: a linha original (b.confidence - a.confidence) ordenava do maior para o menor confidence; a linha bugada (a.confidence - b.confidence) ordena do menor para o m
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8806ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "A linha `await (window.__TNG_CONFIG_READY__ || Promise.resolve());` foi comentada, removendo a espera pela configuração global antes de inicializar o módulo TechNetGameFeeds. Isso pode causar comportamento indefinido ou erro
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 27236ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, 404, latest
```
```json {   "diagnosis": "Path '/api/nwes/latest?limit=18' contém digitação 'nwes' em vez de 'news', causando falha 404 na requisição. A função fetchJson implementa fallback entre múltiplos endpoints, mas como 'nwes' está em primeiro lugar, o path co
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 20016ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit() usa Math.min(parsed, 0) — retorna sempre 0, impedindo retorno de qualquer notícia nas rotas /latest, /featured, /home, /month, /game-search, /category/:slug, /source/:slug",   "file": "backend/src/routes/newsRout
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13256ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS default value set to 0 instead of 6 hours, disabling cache and causing repeated API calls on every cover request.",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patc
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10358ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "Linha 176 do arquivo backend/src/services/hermesService.js: ordenação invertida — .sort((a,b) => a.score - b.score) ordena crescente, mas ranking deve ser decrescente (maior score primeiro).",   "file": "backend/src/services
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9416ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "A função hasBlockedSource foi invertida: a negação (!) adicionada faz com que fontes bloqueadas (social/fanart) sejam retornadas como aceitas, e fontes normais como bloqueadas, quebrando a filtragem de candidatos em scoreGam
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 14456ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Bug de lógica invertida no middleware CORS: a condição `!allowedOrigins.has(origin)` faz com que origens NÃO autorizadas recebam o header Access-Control-Allow-Origin, enquanto origens autorizadas são ignoradas. Isso quebra o
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 24354ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "Bug introduzido no DIFF: express.json({ limit: '1b' }) — limite de payload de 1 byte rejeita qualquer requisição JSON com corpo maior, quebrando todas as rotas POST/PUT/PATCH. Correção: reverter para '1mb'.",   "file": "back
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 15595ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
```json {   "diagnosis": "A condição de autorização foi invertida ao mudar `candidate !== expectedToken` para `candidate === expectedToken`, fazendo com que tokens válidos sejam rejeitados e tokens inválidos sejam aceitos.",   "file": "backend/src/ro
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8961ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280
```
```json {   "diagnosis": "O summary do feed está sendo cortado para string vazia (slice(0, 0)) em vez de 280 caracteres, removendo qualquer conteúdo da descrição e quebrando a exibição no site.",   "file": "backend/src/services/normalizer.js",   "fix
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8842ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "isHealthy retorna !response.ok, invertendo a lógica de verificação de saúde da API. Isso faz com que endpoints saudáveis (status 200) sejam tratados como não saudáveis, impedindo a seleção correta do candidato."   "file": "f
```


