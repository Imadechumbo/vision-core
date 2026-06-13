# Vision Core — Stress Test V3 Results

Data: 2026-06-13T04:58:14.840Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 10511ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 10078ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, finally
```
```json {   "diagnosis": "O bug está no bloco finally da função fetchJson. A linha que cancela o timeout timer foi comentada com '// clearTimeout(timer); // bug: timer não cancelado'. O diff mostra que ANTES havia clearTimeout(timer) (linha correta) 
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7774ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "No arquivo backend/src/services/cacheService.js, a função readJson no bloco catch foi alterada para lançar um erro em vez de retornar o fallback. Isso quebra o comportamento esperado de fallback silencioso quando o arquivo d
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 3976ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260, delay
```
```json {   "diagnosis": "O timeout de 260ms para a animação de colapso do feed foi reduzido para 0ms, removendo completamente a transição visual. Isso faz com que o container suma instantaneamente sem a animação suave de colapso, causando uma experi
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 15245ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "Inversão da ordenação por confiança: a linha alterada inverteu `return b.confidence - a.confidence` (decrescente) para `return a.confidence - b.confidence` (crescente), fazendo com que candidatos de menor confiança sejam pri
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 17709ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
MISSÃO RECEBIDA Tipo: bug fix   Risco: médio   Escopo: `front/assets/js/feeds.js`  ```json {   "diagnosis": "Comentário na linha de espera por `window.__TNG_CONFIG_READY__` impede que a inicialização dos feeds aguarde a configuração global, causando 
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7341ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, 404, latest
```
```json {   "diagnosis": "Typo no path da API '/api/nwes/latest?limit=18' em feeds.js linha 94 e 123 — 'nwes' em vez de 'news', causando 404 e ausência de notícias principais na página.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patc
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 11731ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "Na função safeLimit, o limite máximo foi alterado de 120 para 0, fazendo com que qualquer valor positivo válido seja truncado para 0, resultando em consultas com limit=0 e retorno vazio ou incorreto.",   "file": "backend/src
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6646ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS foi alterado de 6 horas (6 * 60 * 60 * 1000) para 0, desabilitando efetivamente o cache de capas de jogos. Isso força uma nova requisição às APIs externas (RAWG, SteamGridDB) a cada chamada de resolveGameC
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12775ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "Linha 176: ordenação do ranking invertida de decrescente para crescente, causando exibição incorreta dos agentes (piores primeiro).",   "file": "backend/src/services/hermesService.js",   "fix_type": "code_patch",   "patch": 
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13316ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "Inversão da lógica de bloqueio em hasBlockedSource: o operador NOT (!) foi adicionado na linha +, fazendo com que fontes 'social' e 'fanart' sejam ACEITAS em vez de BLOQUEADAS. Isso permite que covers de fontes não confiávei
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 5145ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, invertido, origin
```
```json {   "diagnosis": "Bug de lógica invertida no middleware CORS: a condição `!allowedOrigins.has(origin)` permite requisições de origens NÃO autorizadas, enquanto origens autorizadas são bloqueadas. O comportamento correto é permitir apenas orig
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 9141ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "Linha 84 de backend/src/app.js: body-parser limit reduzido de '1mb' para '1b' (1 byte), causando rejeição de todas as requisições POST/PUT/PATCH com corpo, gerando erro 413 ou falha silenciosa no site.",   "file": "backend/s
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 21451ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
```json {   "diagnosis": "Inversão lógica na validação de autorização em requireRefreshAuth: a condição 'candidate === expectedToken' retorna 401 quando o token é válido, bloqueando requisições legítimas e permitindo requisições inválidas.",   "file"
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 3984ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, 280, vazio
```
```json {   "diagnosis": "Resumo truncado a zero caracteres por slice(0,0), impedindo exibição de sumário.",   "file": "backend/src/services/normalizer.js",   "fix_type": "code_patch",   "patch": {     "search": ").slice(0, 0);",     "replace": ").sl
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11356ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "A função isHealthy retorna !response.ok (true quando servidor retorna 4xx/5xx), invertendo a lógica de health check. O servidor em production retorna 200 OK com body {ok:true}, então isHealthy retorna false (pois response.ok
```


