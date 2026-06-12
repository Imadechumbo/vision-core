# Vision Core — Stress Test V3 Results

Data: 2026-06-12T02:42:23.730Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 13335ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 15267ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
```json {   "diagnosis": "O timer de timeout não é cancelado após a requisição, pois a linha clearTimeout(timer); foi comentada, causando vazamento de timer e potencial uso incorreto do AbortController.",   "file": "backend/src/services/gameCoverServ
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 5087ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "A função readJson foi modificada para lançar exceção no catch em vez de retornar o fallback. Isso quebra readCache, readImageCache e readTranslationCache, que dependem do fallback para cenários onde o cache não existe (prime
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 15803ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260
```
```json {   "diagnosis": "Timeout da animação de colapso (hideEmptyContainer) foi alterado de 260ms para 0ms, removendo a transição visual e causando desaparecimento abrupto dos contêineres vazios no feed.",   "file": "front/assets/js/feeds.js",   "f
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13437ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "A ordenação por confiança em `rankGameCoverCandidates` foi invertida: antes `b.confidence - a.confidence` (decrescente) agora `a.confidence - b.confidence` (crescente). Isso faz com que o candidato de menor confiança seja se
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 19063ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "O await de inicialização foi comentado, fazendo com que window.TechNetGameFeeds?.init() execute antes da configuração estar pronta, causando potencial quebra no site.",   "file": "front/assets/js/feeds.js",   "fix_type": "co
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 5894ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, 404, latest
```
```json {   "diagnosis": "Digitação incorreta no path da API: '/api/nwes/latest?limit=18' (nwes em vez de news) na linha 94 do arquivo front/assets/js/feeds.js, causando erro 404 na requisição de últimas notícias.",   "file": "front/assets/js/feeds.j
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 10523ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "Função safeLimit em newsRoutes.js: Math.min(parsed, 0) força retorno zero para qualquer parsed positivo, suprimindo todos os resultados de listagens (latest, home, month, etc.)",   "file": "backend/src/routes/newsRoutes.js",
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 18241ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS default value alterado de 6 horas (6 * 60 * 60 * 1000) para 0, desabilitando o cache de capas. Causa requisições repetidas à API a cada busca, aumentando latência e risco de rate limiting.",   "file": "bac
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13118ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "A ordenação do ranking está invertida: no calculateRanking, .sort() usa a.score - b.score (ordem crescente), mas o ranking deve ser decrescente (maior score primeiro). A linha correta é b.score - a.score (decrescente).",   "
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 25510ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "A função hasBlockedSource em backend/src/services/gameCoverService.js teve sua lógica invertida: ao adicionar o operador ! antes da expressão, fontes do tipo 'social' ou 'fanart' passam a ser consideradas não bloqueadas (ret
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 18192ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Inversão da lógica de CORS. A condição `if (origin && !allowedOrigins.has(origin))` faz com que o header `Access-Control-Allow-Origin` seja definido APENAS para origens NÃO autorizadas, bloqueando requisições de origens legí
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 11115ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json
```
```json {   "diagnosis": "Limite do body parser JSON reduzido de 1 megabyte para 1 byte, fazendo com que qualquer requisição POST/PUT com corpo JSON seja rejeitada (HTTP 413 ou Parse Error). Causa-raiz: alteração manual em `limit` de `\"1mb\"` para `
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 837ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, candidate
```
```json {   "diagnosis": "Condicional de autenticação invertida; usa igualdade (===) ao invés de desigualdade (!==) impedindo a verificação correta do token",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   "patch": {     
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 23616ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "slice(0, 0) no summary zera o tamanho máximo do resumo, resultando em strings vazias para todos os itens normalizados, quebrando a exibição de resumos no site.",   "file": "backend/src/services/normalizer.js",   "fix_type": 
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 4318ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok, fallback
```
```json {   "diagnosis": "Bug de inversão lógica em isHealthy(). O diff mostra que a linha correta 'return response.ok' foi alterada para 'return !response.ok', invertendo o comportamento da função de health check. A API retorna status 200 com body {
```


