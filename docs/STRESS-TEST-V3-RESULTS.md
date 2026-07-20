# Vision Core — Stress Test V3 Results

Data: 2026-07-20T00:14:10.811Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 15484ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 11291ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, finally
```
```json {   "diagnosis": "O timeout do fetchJson não é mais cancelado devido ao comentário da linha clearTimeout(timer), causando vazamento de recursos e possíveis requisições pendentes.",   "file": "backend/src/services/gameCoverService.js",   "fix_
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 13253ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "Mudança no catch de readJson faz com que erros de leitura de cache sejam lançados como exceção, em vez de retornar o fallback, quebrando o comportamento esperado pelas funções que chamam readJson (readCache, readImageCache, 
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9075ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260, delay
```
```json {   "diagnosis": "Timeout delay em hideEmptyContainer reduzido de 260ms para 0ms, tornando a animação de colapso instantânea e sem transição visual.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "search"
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 15111ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
MISSÃO RECEBIDA Tipo: bug fix Risco: baixo Escopo: backend/src/services/gameCoverService.js  HERMES - Contexto fornecido: arquivo completo + diff explícito - Regras aplicadas: §53 (foco exclusivo no diff), R6 (não aplicável), R3 (nenhum arquivo proib
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 21254ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "A espera pela configuração global `window.__TNG_CONFIG_READY__` foi comentada, fazendo com que `window.TechNetGameFeeds?.init()` seja chamado sem aguardar a resolução da configuração. Isso pode causar inicialização prematura
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1781ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, latest
```
```json {   "diagnosis":  "endereço da API incorreto em uma chamada",   "file":       "front/assets/js/feeds.js",   "fix_type":   "code_patch",   "patch":      { "search": "/api/nwes/latest?limit=18", "replace": "/api/news/latest?limit=18" },   "conf
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 8610ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit retorna Math.min(parsed, 0) após bug introduzido no diff, fazendo com que todo limite seja 0, zerando resultados de feeds e pesquisas.",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   "
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8859ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS foi alterado de 6 horas (6*60*60*1000 ms) para 0, desativando completamente o cache de capas. Isso força requisições repetidas à API externa a cada chamada de resolveGameCover, causando lentidão e possívei
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6922ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "O sort do ranking em calculateRanking usa a.score - b.score (ordem crescente), quando deveria ser b.score - a.score (ordem decrescente) para listar agentes com maior pontuação primeiro.",   "file": "backend/src/services/herm
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 18315ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "Bug de inversão lógica em hasBlockedSource: o operador `!` nega a condição original, fazendo com que fontes sociais/fanart sejam consideradas não-bloqueadas e vice-versa. Isso quebra a seleção de game covers, pois fontes não
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 10561ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "CORS middleware em backend/src/app.js linha 60: condição invertida com !allowedOrigins.has(origin) — permite origens externas e bloqueia origens autorizadas, causando falha de acesso cross-origin.",   "file": "backend/src/ap
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 11267ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json
```
MISSÃO RECEBIDA Tipo: bug fix Risco: crítico Escopo: backend/src/app.js  ```json {   "diagnosis": "Express JSON body parser limit foi alterado de '1mb' para '1b' (1 byte), impedindo que qualquer requisição POST/PUT/PATCH com corpo maior que 1 byte se
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 44328ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, invertido, auth, candidate
```
MISSÃO RECEBIDA Tipo: bug fix Risco: crítico Escopo: backend/src/routes/newsRoutes.js  HERMES RCA  ```json {   "diagnosis": "BUG CRÍTICO: a condição no middleware requireRefreshAuth inverteu a lógica de autorização. A linha original correta era `if (
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7657ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280
```
```json {   "diagnosis": "A linha 47 do normalizer.js foi alterada de .slice(0, 280) para .slice(0, 0), truncando o summary para string vazia. Isso faz com que todos os itens do feed fiquem sem descrição, quebrando exibição no site.",   "file": "back
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 43982ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok, fallback
```
```json {   "diagnosis": "A função isHealthy retorna !response.ok quando a API responde com status HTTP 200, invertendo a lógica de health check — a API está saudável (ok: true) mas a função interpreta como não-saudável, impedindo o fallback de funci
```


