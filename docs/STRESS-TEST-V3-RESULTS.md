# Vision Core — Stress Test V3 Results

Data: 2026-06-13T06:27:46.049Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 8825ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 9513ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
```json {   "diagnosis": "A linha 'clearTimeout(timer);' foi comentada no bloco finally de fetchJson, impedindo o cancelamento do timer de timeout. Isso causa vazamento de temporizadores e potencialmente aborta a requisição após sua conclusão.",   "f
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6807ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "O DIFF mostra que o catch foi alterado de 'return fallback' (comportamento resiliente) para 'throw new Error(...)' (comportamento que quebra a aplicação). Isso faz com que qualquer falha de leitura/parse do cache resulte em 
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11007ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260, delay
```
```json {   "diagnosis": "A animação de ocultação do feed estava com delay de 260ms para permitir a transição visual. O bug alterou para 0ms, removendo o efeito de collapsing e possivelmente causando piscar/desaparecimento instantâneo sem suavidade."
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 22797ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, invertido, b.confidence
```
```json {   "diagnosis": "Sorting por confidence invertido em rankGameCoverCandidates: a.confidence - b.confidence ordena ascendente, causando seleção de candidato de menor confidence. Deve ser b.confidence - a.confidence para ordem descendente.",   
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 3093ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "A linha que aguardava a configuração global (window.__TNG_CONFIG_READY__) foi comentada, fazendo com que feeds.init() execute antes da configuração estar pronta, resultando em grids vazios ou erro de carregamento.",   "file"
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6478ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, 404, latest
```
```json {   "diagnosis": "Typo no endpoint da API de últimas notícias: '/api/nwes/latest?limit=18' (missing 's' em 'news') causa requisição a rota inexistente, resultando em 404 e seção 'Últimas notícias' vazia.",   "file": "front/assets/js/feeds.js"
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7303ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "Função safeLimit em backend/src/routes/newsRoutes.js: limite máximo zero (Math.min(parsed, 0)) faz todas as queries de notícias retornarem 0 resultados.",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_pat
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11545ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "gameCoverService.js linha 12: cache TTL padrão definido como 0ms (sem cache) em vez de 6h (21600000ms), causando recarga completa a cada requisição e potencial sobrecarga de API.",   "file": "backend/src/services/gameCoverSe
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 4658ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "Ordenação inversa: 'a.score - b.score' ordena crescente, mas ranking deve ser decrescente para colocar maior score primeiro. A função calculateRanking retorna ranking com mais relevância primeiro, então sort deve ser 'b.scor
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6127ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "hasBlockedSource(candidate) no line 89 teve sua lógica invertida no diff. A versão ANTIGA (com -) retornava true se a fonte era 'social' ou 'fanart' — o que é o comportamento correto para bloquear fontes não confiáveis. A ve
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 4448ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Bug de lógica invertida no middleware CORS: a condição `!allowedOrigins.has(origin)` faz com que origens NÃO autorizadas recebam o header Access-Control-Allow-Origin, enquanto origens autorizadas são ignoradas. Isso quebra o
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 10562ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "Limite do body parser JSON reduzido de 1mb para 1 byte — app.use(express.json({ limit: \"1b\" })) — causa rejeição de qualquer requisição JSON com corpo maior que 1 byte",   "file": "backend/src/app.js",   "fix_type": "code_
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 5784ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
```json {   "diagnosis": "Condição de autorização invertida na rota `/refresh`: `candidate === expectedToken` causa 401 para tokens válidos, impedindo refresh de feeds.",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   "pa
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 14188ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "decisao": "NEEDS_FIX",   "file": "backend/src/services/normalizer.js",   "fix_type": "code_patch",   "patch": {     "search": "  ).slice(0, 0);",     "replace": "  ).slice(0, 280);"   },   "confidence": 0.95,   "diagnosis": "slice(0, 0) 
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8062ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok, invertido
```
```json {   "diagnosis": "Bug introduzido na função isHealthy: o retorno foi invertido de `response.ok` para `!response.ok`, fazendo com que a função retorne false quando a API responde com status HTTP ok (2xx), causando falha no health check e imped
```


