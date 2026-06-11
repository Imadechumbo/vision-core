# Vision Core — Stress Test V3 Results

Data: 2026-06-11T23:24:39.615Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 13 |
| FAIL | 2 |
| Taxa de acerto | 87% |
| Tempo médio | 16584ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 4 | 1 | 80% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 4 | 1 | 80% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6520ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, finally
```
```json {   "diagnosis": "O timer não é limpo no bloco finally da função fetchJson, causando vazamento de timeout e potencial crash do servidor com múltiplas requisições simultâneas.",   "file": "backend/src/services/gameCoverService.js",   "fix_type
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ❌ FAIL | **Dificuldade:** HARD | **Tempo:** 0ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** _nenhuma_
```
(sem resposta)
```
**Erro:** Request failed with status code 504

### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 21277ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260
```
MISSÃO RECEBIDA Tipo: bug fix Risco: baixo Escopo: front/assets/js/feeds.js  ```json {   "diagnosis": "Tempo de animação do feed collapsing alterado de 260ms para 0ms (linha 482 do diff), resultando em transição instantânea que quebra o efeito visual
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 17300ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, invertido, b.confidence
```
```json {   "diagnosis": "Linha 248 do arquivo gameCoverService.js: operador de comparação de confidence no sort foi invertido. Antes: b.confidence - a.confidence (ordem decrescente — correta). Agora: a.confidence - b.confidence (ordem crescente — bu
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12324ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "O await em window.__TNG_CONFIG_READY__ foi comentado, fazendo com que a inicialização (window.TechNetGameFeeds?.init()) ocorra sem aguardar a configuração global, quebrando o carregamento dos feeds.",   "file": "front/assets
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 16497ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, latest
```
```json {   "diagnosis": "typo '/api/nwes/latest?limit=18' em vez de '/api/news/latest?limit=18' na URL da requisição fetchJson dentro de fetchHomePayloadFallback",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "s
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 32630ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit() em backend/src/routes/newsRoutes.js linha 9 retorna Math.min(parsed, 0) — limite zero invalida todas as queries de listagem de notícias",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch", 
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 16171ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS foi alterado de '6 * 60 * 60 * 1000' (6 horas) para '0', desabilitando efetivamente o cache de capas de jogos. Isso causa que cada requisição de capa faça novas chamadas às APIs externas (RAWG, SteamGridDB
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 14981ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "calculateRanking em hermesService.js: ordenação invertida de decrescente (b.score - a.score) para crescente (a.score - b.score), fazendo com que itens de menor relevância sejam listados primeiro no ranking.",   "file": "back
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 52455ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, invertido, social, fanart
```
```json {   "diagnosis": "Bug crítico: a função hasBlockedSource teve sua lógica invertida no diff. O código original (-) retornava true para fontes bloqueadas (social/fanart), que é o comportamento correto. O código bugado (+) introduziu uma negação
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 11171ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "CORS middleware em backend/src/app.js, linha 59: condição invertida com '!' — '!allowedOrigins.has(origin)' faz com que origens permitidas sejam bloqueadas e não-permitidas recebam cabeçalho CORS, quebrando requisições cross
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ❌ FAIL | **Dificuldade:** HARD | **Tempo:** 0ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** _nenhuma_
```
(sem resposta)
```
**Erro:** Request failed with status code 504

### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 945ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
```json {   "diagnosis": "Authorization check uses === instead of !==, causing valid refresh tokens to be rejected",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "if (!expectedToken || candidate
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 4040ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280
```
```json {   "diagnosis": "summary.slice(0, 0) trunca todos os resumos para string vazia, fazendo com que todos os itens de feed usem o fallback genérico 'Leia a cobertura completa em ...'. Original era slice(0, 280) para limitar a 280 caracteres.",  
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9287ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "Bug de inversão lógica na função isHealthy: o diff mostra 'return !response.ok;' substituindo 'return response.ok;' original, fazendo com que endpoints com erro HTTP sejam considerados saudáveis e vice-versa, quebrando a sel
```


