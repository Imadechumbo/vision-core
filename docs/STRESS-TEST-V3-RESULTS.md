# Vision Core — Stress Test V3 Results

Data: 2026-07-08T21:41:57.816Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 13459ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7846ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, finally
```
```json {   "diagnosis": "Na função fetchJson, o timer de timeout não é cancelado no finally porque a linha clearTimeout(timer) foi comentada, causando memory leak se o fetch completar antes do timeout.",   "file": "backend/src/services/gameCoverServ
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 13144ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "O cacheService.readJson (e.g. via readCache, readImageCache, readTranslationCache) não tem mais fallback: o catch agora relança o erro em vez de retornar o fallback fornecido. Isso quebra o site porque qualquer falha de leit
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6933ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260
```
```json {   "diagnosis": "O timeout de 0ms no hideEmptyContainer impede a animação CSS 'feed-block-collapsing' de ser visível, causando desaparecimento brusco do container sem transição.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_pat
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12122ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "No sort em rankGameCoverCandidates, ordenação por confidence foi invertida: `a.confidence - b.confidence` coloca menor confidence primeiro. Deveria ser `b.confidence - a.confidence` para ordenação descendente (maior confiden
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10165ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "Linha que aguarda configuração global await (window.__TNG_CONFIG_READY__ || Promise.resolve()) foi comentada no evento DOMContentLoaded, causando execução prematura de init() sem a config carregada.",   "file": "front/assets
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 22556ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, latest
```
```json {   "diagnosis": "Typo no path da API: '/api/news/latest?limit=18' foi alterado para '/api/nwes/latest?limit=18' (nwes em vez de news), causando falha na requisição e resultando em seção 'Últimas notícias' vazia no site.",   "file": "front/as
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7027ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "Bug introduzido no diff: safeLimit retorna Math.min(parsed, 0) em vez de Math.min(parsed, 120). Isso faz com que todas as rotas que usam limit recebam zero, retornando zero resultados ou quebrando a paginação.",   "file": "b
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 21286ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS foi alterado de 6 horas (6 * 60 * 60 * 1000 ms) para 0 ms, desabilitando o cache de capas completamente. Isso faz com que cada consulta de capa (resolveGameCover) dispare requisições reais para RAWG e Stea
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9241ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "Ordenação do ranking invertida: .sort() usa a.score - b.score (crescente) em vez de b.score - a.score (decrescente), fazendo itens com menor score aparecerem primeiro.",   "file": "backend/src/services/hermesService.js",   "
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 38502ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "decisao": "NEEDS_FIX",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "search": "  return !(source.includes('social') || source.includes('fanart') || type.includes('social') || type.inc
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 11224ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "CORS middleware em backend/src/app.js linha 56: negação lógica invertida — `if (origin && !allowedOrigins.has(origin))` ativa o cabeçalho Access-Control-Allow-Origin apenas para origens NÃO autorizadas, deixando origens legí
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7481ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json
```
```json {   "diagnosis": "Limite do body parser JSON definido como 1 byte (1b) em vez de 1 megabyte (1mb), impedindo qualquer requisição POST com corpo JSON válido.",   "file": "backend/src/app.js",   "fix_type": "code_patch",   "patch": {     "searc
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7807ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
```json {   "diagnosis": "Em requireRefreshAuth middleware, a condição foi invertida: candidate === expectedToken rejeita tokens válidos e aceita inválidos. Deve ser candidate !== expectedToken.",   "file": "backend/src/routes/newsRoutes.js",   "fix_
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8955ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280
```
MISSÃO RECEBIDA Tipo: bug fix Risco: alto Escopo: backend/src/services/normalizer.js  HERMES - Contexto recebido via DIFF e código completo do arquivo. - Regra §53 aplicada: foco exclusivo nas linhas do DIFF.  SCANNER - Arquivo: backend/src/services/
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 17589ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok, invertido, fallback
```
```json {   "diagnosis": "Linha 48 do arquivo front/assets/js/config.js: retorno booleano invertido na função isHealthy. Originalmente `return response.ok;` foi trocado para `return !response.ok;`, fazendo com que endpoints saudáveis (200-299) sejam 
```


