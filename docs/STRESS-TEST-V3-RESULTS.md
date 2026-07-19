# Vision Core — Stress Test V3 Results

Data: 2026-07-19T05:56:22.179Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 14384ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 2958ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, finally
```
```json {   "diagnosis": "clearTimeout(timer) was commented out in the finally block, leaving the timeout active",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "search": "// clearTimeout(timer); /
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 882ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "O bloco catch foi alterado para lançar exceção ao invés de retornar o fallback, fazendo com que chamadas a readJson falhem quando a leitura do cache falha.",   "file": "backend/src/services/cacheService.js",   "fix_type": "c
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 777ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260, delay
```
```json {   "diagnosis": "A animação de recolhimento do feed usa delay 0ms, removendo a pausa de 260ms que permite a transição suave; isso impede o colapso visual adequado.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch"
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11546ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "Ordenação de candidatos invertida: a mudança de `b.confidence - a.confidence` para `a.confidence - b.confidence` faz com que o candidato de maior confiança fique por último na lista ordenada, enquanto a seleção (`scored.find
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 752ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "A linha de await foi comentada, impedindo esperar a configuração antes da inicialização",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "search": "        // await (window.__TNG_CONFIG_RE
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6959ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, latest
```
```json {   "diagnosis": "A rota '/api/nwes/latest?limit=18' foi escrita com um typo (nwes em vez de news) no método fetchHomePayloadFallback, causando falha na requisição inicial de últimas notícias.",   "file": "front/assets/js/feeds.js",   "fix_ty
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1778ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis":  "safeLimit está retornando 0 como limite mínimo ao invés de 120",   "file":       "backend/src/routes/newsRoutes.js",   "fix_type":   "code_patch",   "patch":      { "search": "return Math.min(parsed, 0);", "replace": "retur
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 26118ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS com fallback 0 desativa cache — toda requisição recarrega covers sem reuso, causando timeout/lentidão no site",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": 
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 63793ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "O método calculateRanking estava ordenando os resultados de forma ascendente (a.score - b.score) em vez de descendente (b.score - a.score), fazendo com que o ranking listasse os agentes com menor pontuação primeiro. Isso inv
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11306ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "Bug de inversão lógica em hasBlockedSource: a condição que bloqueia origens sociais/fanart foi invertida com o operador '!', fazendo com que fontes confiáveis sejam rejeitadas e fontes não confiáveis sejam aceitas.",   "file
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 33735ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "A lógica de CORS foi invertida no diff: a linha original (correta) usava `allowedOrigins.has(origin)` para definir o header apenas para origens permitidas. O diff (bug) inverteu para `!allowedOrigins.has(origin)`, fazendo co
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 15121ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json
```
```json {   "diagnosis": "Express JSON body parser limit set to 1 byte (\"1b\") instead of 1 megabyte (\"1mb\"), causing all JSON requests to be rejected.",   "file": "backend/src/app.js",   "fix_type": "code_patch",   "patch": {     "search": "app.u
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9373ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
```json {   "diagnosis": "Bug na autenticação do middleware requireRefreshAuth: a condição invertida (candidate === expectedToken) bloqueia requisições legítimas, enquanto deveria permitir quando o token corresponde.",   "file": "backend/src/routes/n
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9914ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280
```
```json {   "diagnosis": "O slice de summary foi alterado de 280 para 0, resultando em strings vazias para todos os resumos de feed.",   "file": "backend/src/services/normalizer.js",   "fix_type": "code_patch",   "patch": {     "search": "  ).slice(0
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 20747ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok, fallback
```
```json {   "diagnosis": "Bug no health check — função isHealthy() retorna !response.ok invertendo a lógica correta. A API retorna status 200 com body {\"ok\":true} e o health check deveria retornar true quando response.ok é true, mas o operador de n
```


