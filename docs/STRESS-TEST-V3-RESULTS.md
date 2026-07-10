# Vision Core — Stress Test V3 Results

Data: 2026-07-10T21:52:44.641Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 13687ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 13566ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
MISSÃO RECEBIDA Tipo: bug fix Risco: médio Escopo: backend/src/services/gameCoverService.js  HERMES - RCA: `clearTimeout(timer)` comentada (linha 290) faz o timeout nunca ser cancelado, podendo abortar a requisição depois de concluída, causando erros
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6548ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "No cacheService.js, a cláusula catch foi alterada de `return fallback` para `throw new Error(...)`, fazendo com que qualquer falha de leitura de cache lance uma exceção e quebre o site. O comportamento correto é retornar o f
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 4597ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260
```
```json {   "diagnosis": "Em hideEmptyContainer, o setTimeout com atraso 0 remove o efeito visual de collapsing (transição CSS de 260ms) abruptamente, sem permitir que a animação de recolhimento seja percebida pelo usuário. O código original com 260m
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 46818ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "rankGameCoverCandidates em gameCoverService.js na linha 245: a ordenação de confidence foi invertida. O diff mostra que `b.confidence - a.confidence` (correto) foi substituído por `a.confidence - b.confidence` (errado), reve
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 19858ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "await da promise __TNG_CONFIG_READY__ foi comentado, impedindo que feeds aguardem configuração externa antes de renderizar",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "search": "// aw
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 19859ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, latest
```
```json {   "diagnosis": "Typo no endpoint da API: '/api/nwes/' em vez de '/api/news/' na primeira chamada de fetchHomePayloadFallback, causando requisição para rota inexistente.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 13527ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "função safeLimit retorna 0 em vez do limite máximo de 120, causando queries vazias em todas as rotas que usam limit (latest, featured, home, month, game-search, category, source).",   "file": "backend/src/routes/newsRoutes.j
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 23591ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS com fallback 0 no lugar de 6 horas, desabilitando cache e causando requisições repetitivas às APIs externas (RAWG, SteamGridDB).",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9168ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "Ordenação invertida em calculateRanking: a.score - b.score ordena crescente, mas o ranking deve ser decrescente (maior score primeiro).",   "file": "backend/src/services/hermesService.js",   "fix_type": "code_patch",   "patc
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12532ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
MISSÃO RECEBIDA Tipo: bug fix Risco: alto Escopo: backend/src/services/gameCoverService.js  HERMES - diff presente com inversão de operador lógico em hasBlockedSource - regra R1 satisfeita (evidência real), R5 confiança alta, R6 não aplicável - confi
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 9836ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "CORS middleware em backend/src/app.js linha 56 tem condição invertida: `!allowedOrigins.has(origin)` bloqueia origens legítimas e libera origens não autorizadas.",   "file": "backend/src/app.js",   "fix_type": "code_patch", 
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7797ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json
```
```json {   "diagnosis": "Linha 84 alterou o limite do body parser JSON de 1 MB para 1 byte, rejeitando requisições com corpo útil.",   "file": "backend/src/app.js",   "fix_type": "code_patch",   "patch": {     "search": "app.use(express.json({ limit
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7762ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
```json {   "diagnosis": "A condição de autorização em requireRefreshAuth está invertida: diff mostra que candidate === expectedToken foi introduzido como bug, causando rejeição de tokens válidos e aceitação de tokens inválidos.",   "file": "backend/
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 5350ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "No arquivo backend/src/services/normalizer.js, linha 48, o método slice(0, 280) foi alterado para slice(0, 0), zerando o comprimento do summary e tornando todos os resumos vazios.",   "file": "backend/src/services/normalizer
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 4489ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok, invertido
```
```json {   "diagnosis": "isHealthy retorna !response.ok (invertido) — health check rejeita API saudável (status 200) e aceita API com erro, causando falha em toda descoberta de backend",   "file": "front/assets/js/config.js",   "fix_type": "code_pat
```


