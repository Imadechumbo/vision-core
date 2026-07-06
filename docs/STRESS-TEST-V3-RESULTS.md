# Vision Core — Stress Test V3 Results

Data: 2026-07-06T17:11:53.293Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 5953ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 11967ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
```json {   "diagnosis": "Na função fetchJson, a linha clearTimeout(timer) foi comentada no bloco finally, impedindo o cancelamento do timer. Isso causa vazamento de timer e potencial execução tardia de controller.abort() após a resposta já ter sido 
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1068ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, fallback
```
```json {   "diagnosis": "Introdução de exceção no catch que impede retorno de fallback ao falhar leitura do cache",   "file": "backend/src/services/cacheService.js",   "fix_type": "code_patch",   "patch": {     "search": "} catch (e) {",     "replac
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1219ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260, delay
```
```json {   "diagnosis": "Delay de colapso da caixa de feed reduzido de 260 ms para 0 ms, removendo animação e ocultando conteúdo imediatamente",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "search": "        },
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 4141ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, b.confidence
```
```json {   "diagnosis":  "ordenação de candidatos de capa de jogo está invertida devido à mudança no operador de comparação de confiança",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "search": "
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9422ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "Linha que aguarda config global foi comentada, causando execução prematura de TechNetGameFeeds.init() sem que a configuração esteja pronta.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {    
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1615ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, latest
```
```json {   "diagnosis": "Typo no endpoint da chamada API: \"nwes\" ao invés de \"news\" causa falha ao buscar notícias recentes.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "search": "this.fetchJson('/api/nwe
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 9575ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit() sempre retorna 0 para valores positivos, pois Math.min(parsed, 0) resulta em 0 para qualquer parsed > 0. O diff mostra que a linha foi alterada de 120 para 0, quebrando todas as rotas que usam safeLimit (latest, 
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1442ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS foi definido como 0, desativando o cache de capas de jogos e degradando desempenho.",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "search": "const COV
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10344ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "A função calculateRanking ordena o ranking em ordem crescente (a.score - b.score) em vez de decrescente (b.score - a.score), invertendo a ordenação esperada (agentes com mais ocorrências devem aparecer primeiro).",   "file":
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8756ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "Lógica invertida em hasBlockedSource; nega a detecção de fontes 'social'/'fanart', permitindo candidatos que deveriam ser bloqueados.",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "pat
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 8601ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Inversão da condição de CORS: a linha foi alterada de `allowedOrigins.has(origin)` para `!allowedOrigins.has(origin)`, fazendo com que origens não autorizadas sejam permitidas e origens autorizadas sejam bloqueadas.",   "fil
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 2506ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "O limite de tamanho de payload JSON foi reduzido de 1mb para 1b, o que pode causar erros de parseamento de JSON em requests com payloads maiores que 1 byte.",   "file": "backend/src/app.js",   "fix_type": "code_patch",   "pa
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1277ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, candidate
```
```json {   "diagnosis": "Condição de autorização invertida: o código usa igualdade (candidate === expectedToken) em vez de desigualdade, rejeitando requisições válidas.",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   "p
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6722ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "slice(0, 0) no summary retorna string vazia, eliminando todo o conteúdo do resumo. O summary fica sempre vazio, e o fallback para 'Leia a cobertura completa em...' nunca é usado porque a string vazia é falsy, mas o problema 
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10646ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** response.ok, fallback
```
MISSÃO RECEBIDA Tipo: bug fix Risco: alto Escopo: front/assets/js/config.js  HERMES - Contexto: Diff fornecido com bug evidente. Arquivo completo disponível. - Regras aplicadas: §53 (foco exclusivo no diff), R1 (evidência real).  SCANNER - Arquivo: f
```


