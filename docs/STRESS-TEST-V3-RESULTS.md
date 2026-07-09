# Vision Core — Stress Test V3 Results

Data: 2026-07-09T20:46:41.429Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 14 |
| FAIL | 1 |
| Taxa de acerto | 93% |
| Tempo médio | 14851ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 4 | 1 | 80% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 11611ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, finally
```
```json {   "diagnosis": "Timer não é cancelado no bloco finally de fetchJson, causando memory leak e timeout residual. Linha comentada deve ser restaurada.",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch"
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 13723ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "O bloco `catch` em `cacheService.js` foi alterado para lançar uma exceção em vez de retornar o `fallback` quando a leitura do cache falha. Isso quebra todos os callers (`readCache`, `readImageCache`, `readTranslationCache`) 
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 25217ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** 260
```
MISSÃO RECEBIDA Tipo: bug fix Risco: baixo Escopo: front/assets/js/feeds.js  ```json {   "diagnosis": "O timeout de 0ms em hideEmptyContainer impede a animação CSS de feed-block-collapsing, causando desaparecimento instantâneo sem transição visual.",
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 18095ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "Inversão da ordem de ordenação no sort de candidates em rankGameCoverCandidates: a linha foi alterada de `b.confidence - a.confidence` (decrescente) para `a.confidence - b.confidence` (crescente), fazendo com que o candidate
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9067ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "A linha que aguarda a configuração global (window.__TNG_CONFIG_READY__) foi comentada, fazendo com que TechNetGameFeeds.init() execute sem que a configuração esteja pronta, resultando em comportamento indeterminado ou erro n
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7457ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, 404, latest
```
```json {   "diagnosis": "Typo na URL '/api/nwes/latest?limit=18' na função fetchHomePayloadFallback — 'nwes' é um erro de digitação, o endpoint correto é '/api/news/latest?limit=18'. Causa 404 na requisição e falha ao carregar últimas notícias.",   
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 15870ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "Bug em safeLimit: Math.min(parsed, 0) sempre retorna 0 para valores positivos, quebrando todos os endpoints que limitam resultados de notícias",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   "pa
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 32398ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
MISSÃO RECEBIDA Tipo: bug fix Risco: alto Escopo: backend/src/services/gameCoverService.js  HERMES - DIFF fornecido indica alteração proposital do TTL de cache de 6h para 0 - Contexto suficiente (diff + código completo) - Regras R1, R6, R7 respeitada
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10161ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "Ordenação invertida na função calculateRanking: .sort((a, b) => a.score - b.score) ordena do menor para o maior score, revertendo a ordenação decrescente correta necessária para o ranking.",   "file": "backend/src/services/h
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 20601ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "hasBlockedSource em gameCoverService.js retorna NOT da condição original, invertendo a lógica: fontes válidas são rejeitadas e fontes bloqueadas são aceitas.",   "file": "backend/src/services/gameCoverService.js",   "fix_typ
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 11755ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Middleware CORS com lógica invertida: ao invés de permitir apenas origens autorizadas, o código atual permite qualquer origem não listada e nega as listadas, quebrando o CORS para origens legítimas.",   "file": "backend/src/
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 14370ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "O limite do body parser JSON foi alterado de 1mb para 1b (1 byte) no diff, impedindo requisições POST com corpo maior que 1 byte — toda requisição JSON falha com 413 ou parse error.",   "file": "backend/src/app.js",   "fix_t
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1029ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, candidate
```
```json {   "diagnosis": "Comparação invertida na verificação de token: usa '===' ao invés de '!==' impedindo autenticação correta.",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "if (!expectedT
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 14659ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "O parâmetro do slice foi alterado de 280 para 0, resultando em summaries vazios para todos os itens. Isso faz com que o fallback genérico ('Leia a cobertura completa...') seja usado em vez do texto real do artigo.",   "file"
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 16753ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok, invertido, fallback
```
MISSÃO RECEBIDA Tipo: bug fix Risco: crítico Escopo: front/assets/js/config.js  ```json {   "diagnosis": "Server retorna status 200 com body {ok:true}. response.ok===true. isHealthy deveria retornar true quando ok===true, mas o bug \"return !response
```


