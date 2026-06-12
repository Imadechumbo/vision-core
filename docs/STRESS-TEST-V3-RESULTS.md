# Vision Core — Stress Test V3 Results

Data: 2026-06-12T00:39:30.910Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 16576ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 35932ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
```json {   "diagnosis": "O timer de timeout não é cancelado no bloco finally da função fetchJson porque a linha clearTimeout(timer) foi comentada. Isso causa vazamento de timer e potencial execução tardia ou erro após a resposta.",   "file": "backen
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 12735ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "No catch block de readJson, a linha foi alterada de 'return fallback;' para 'throw new Error(...);'. Isso faz com que qualquer falha de leitura de cache (arquivo inexistente ou JSON inválido) lance uma exceção, quebrando os 
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10090ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260, delay
```
```json {   "diagnosis": "Em hideEmptyContainer, o setTimeout foi alterado de 260ms para 0ms, eliminando a animação de colapso do container (feed-block-collapsing). Causa: transição instantânea em vez de suave.",   "file": "front/assets/js/feeds.js",
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 24526ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, b.confidence
```
```json {   "diagnosis": "Ordem de classificação invertida em rankGameCoverCandidates: a mudança de `b.confidence - a.confidence` para `a.confidence - b.confidence` faz com que candidatos com menor confidence sejam priorizados, contrariando a intençã
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 17294ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "O site está quebrado porque a linha que aguarda a promessa global de configuração (__TNG_CONFIG_READY__) foi comentada, fazendo com que feeds sejam inicializados antes da configuração estar pronta.",   "file": "front/assets/
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 9483ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, latest
```
```json {   "diagnosis": "Typo na URL da API: '/api/nwes/latest?limit=18' (nwes em vez de news) causa falha na requisição de últimas notícias em fetchHomePayloadFallback.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": 
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 5466ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit retorna Math.min(parsed, 0) — limite máximo é 0, impedindo qualquer resultado de notícias",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "return Math.min(pars
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 33779ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
```
```json {   "diagnosis": "Mudança no diff: `-const COVER_CACHE_TTL_MS = Number(process.env.GAME_COVER_CACHE_TTL_MS || 6 * 60 * 60 * 1000);` → `+const COVER_CACHE_TTL_MS = Number(process.env.GAME_COVER_CACHE_TTL_MS || 0);`. O valor padrão do cache foi
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10001ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score, invertido
```
```json {   "diagnosis": "Linha 176 de hermesService.js: sort alterado de ordem decrescente (b.score - a.score, hi-lo) para crescente (a.score - b.score, lo-hi), invertendo a ordenação do ranking — esperado: maiores scores primeiro.",   "file": "back
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 14315ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "Função hasBlockedSource teve sua lógica invertida pela adição do operador '!' na linha de retorno. Agora retorna true para fontes que NÃO são social/fanart, e false para as que são — exatamente o oposto do comportamento espe
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 23285ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, invertido, origin
```
```json {   "diagnosis": "CORS middleware em backend/src/app.js nega condição de permissão: ao invés de setar Access-Control-Allow-Origin quando origin está no set allowedOrigins, seta apenas quando NÃO está. Isso bloqueia requisições frontend-legíti
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 17084ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json
```
```json {   "diagnosis": "JSON body parser limit foi reduzido de 1mb para 1b (1 byte), causando rejeição de requisições POST com corpo >1 byte.",   "file": "backend/src/app.js",   "fix_type": "code_patch",   "patch": {     "search": "app.use(express.
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7151ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, invertido, auth, candidate
```
```json {   "diagnosis": "Bug de inversão lógica na função requireRefreshAuth. O operador de comparação foi alterado de !== para === na linha 25, fazendo com que tokens correspondentes (candidate === expectedToken) retornem 401, e tokens diferentes (
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 14014ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "Alteração no diff: slice(0, 0) trunca o summary para zero caracteres, causando resumo vazio em todos os itens normalizados.",   "file": "backend/src/services/normalizer.js",   "fix_type": "code_patch",   "patch": {     "sear
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13478ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok, fallback
```
```json {   "diagnosis": "Bug em front/assets/js/config.js, linha ~53: isHealthy() retorna `!response.ok` invertendo a lógica — servidor saudável é considerado não saudável, impedindo fallback correto da API.",   "file": "front/assets/js/config.js", 
```


