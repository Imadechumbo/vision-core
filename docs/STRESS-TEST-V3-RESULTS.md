# Vision Core — Stress Test V3 Results

Data: 2026-07-19T23:07:47.442Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 13691ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 9463ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, finally
```
MISSÃO RECEBIDA Tipo: bug fix Risco: médio Escopo: backend/src/services/gameCoverService.js (função fetchJson)  HERMES - Contexto fornecido: diff + arquivo completo. - Regras aplicadas: §53 (foco exclusivo nas linhas do diff), §9 (patch cirúrgico), R
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 20439ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "readJson() no cacheService.js foi alterada para lançar exceção em vez de retornar fallback quando a leitura do cache falha. Isso quebra todas as funções que dependem do fallback (readCache, readImageCache, readTranslationCac
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7608ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260, delay
```
```json {   "diagnosis": "Delay do setTimeout em hideEmptyContainer alterado de 260ms para 0ms, impedindo a animação CSS de feed-block-collapsing e causando ocultação instantânea do container",   "file": "front/assets/js/feeds.js",   "fix_type": "cod
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8982ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, b.confidence
```
```json {   "diagnosis": "A ordenação por confiança está invertida: deve priorizar maior confiança primeiro (b.confidence - a.confidence), mas o bug inverteu para a.confidence - b.confidence, colocando candidatos de baixa confiança no topo.",   "file
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12771ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "Linha await (window.__TNG_CONFIG_READY__ || Promise.resolve()) foi comentada no DOMContentLoaded, removendo o ponto de sincronização que garantia que a configuração global estava carregada antes de init(). Causa direta: init
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 19636ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, 404, latest
```
```json {   "diagnosis": "Typo no path da API: '/api/nwes/latest?limit=18' → '/api/news/latest?limit=18' causa 404 na rota de últimas notícias.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "search": "this.fetch
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 8892ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit retorna Math.min(parsed,0) em vez de Math.min(parsed,120), forçando limit=0 em todas as rotas que usam a função, impedindo a exibição de notícias.",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 17499ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
MISSÃO RECEBIDA Tipo: bug fix Risco: alto Escopo: backend/src/services/gameCoverService.js (1 arquivo)  ```json {   "diagnosis": "COVER_CACHE_TTL_MS com fallback 0 ms — cache expira imediatamente, nunca armazena dados. Cada chamada a resolveGameCover
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11164ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "Ordenação do ranking invertida: a linha foi alterada de b.score - a.score (decrescente) para a.score - b.score (crescente), quebrando a ordem esperada de relevância no ranking.",   "file": "backend/src/services/hermesService
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8852ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "hasBlockedSource retorna true para fontes não-bloqueadas e false para sociais/fanarts devido à negação '!' indevida, invertendo a lógica de filtragem.",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "co
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 35667ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Inversão do operador de negação no CORS middleware: !allowedOrigins.has(origin) faz com que origens NÃO autorizadas recebam headers CORS, quebrando a whitelist e expondo o backend a requisições cross-origin arbitrárias.",   
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 17582ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json
```
```json {   "diagnosis": "O limite do parser JSON do Express foi alterado de '1mb' para '1b' (1 byte), impedindo que qualquer requisição com corpo JSON seja processada — toda requisição POST/PUT/PATCH retorna erro 413 ou falha silenciosa, quebrando t
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 17407ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
  ```json {   "diagnosis": "Condição de autorização invertida — linha 27: candidate === expectedToken retorna 401 quando o token é VÁLIDO, em vez de quando é inválido. O operador correto é !==, que estava presente antes do bug ser introduzido.",   "f
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 730ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, 280
```
```json {   "diagnosis": "Resumo está sendo truncado com .slice(0, 0) resultando em strings vazias; revertendo para .slice(0, 280) restaura o comportamento correto.",   "file": "backend/src/services/normalizer.js",   "fix_type": "code_patch",   "patc
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8667ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok, invertido, fallback
```
```json {   "diagnosis": "Operador de resposta invertido: `return !response.ok;` retorna true quando servidor retorna erro (status HTTP não-2xx) e false quando saudável — exatamente o oposto do esperado. CORREÇÃO: reverter para `return response.ok;` 
```


