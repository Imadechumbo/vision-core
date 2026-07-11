# Vision Core — Stress Test V3 Results

Data: 2026-07-11T21:09:55.378Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 13564ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 9755ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
```json {   "diagnosis": "Timer não cancelado no finally block da função fetchJson. A linha 'clearTimeout(timer);' foi comentada, fazendo com que o timeout persista mesmo após a conclusão da requisição (sucesso ou erro), potencialmente causando memor
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 30831ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "Alteração no catch da função readJson faz com que qualquer erro de leitura de cache lance exceção em vez de retornar fallback, quebrando o site na primeira execução (quando arquivo de cache ainda não existe).",   "file": "ba
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7319ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260
```
```json {   "diagnosis": "Em hideEmptyContainer, o setTimeout com atraso 0ms remove a animação de collapsing, fazendo o container desaparecer instantaneamente sem transição visual. O valor original de 260ms permitia que a animação CSS 'feed-block-col
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 17302ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "The sort comparator in rankGameCoverCandidates was inverted from descending (b.confidence - a.confidence) to ascending (a.confidence - b.confidence), causing the lowest confidence accepted candidate to be selected first, lea
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7454ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "await (window.__TNG_CONFIG_READY__ || Promise.resolve()) foi comentado, removendo a espera pela configuração. Isso faz com que feeds.js inicialize antes da configuração global estar pronta, gerando erro ou comportamento impr
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 14522ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, 404, latest
```
```json {   "diagnosis": "Typo na URL da API: '/api/nwes/latest' deveria ser '/api/news/latest' (faltou a letra 's' em 'news')",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "search": "this.fetchJson('/api/nwes/l
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 15655ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit retorna Math.min(parsed, 0) — sempre 0 quando parsed > 0, quebrando todas as rotas que usam limit (latest, month, game-search, category, source).",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9287ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS padrão foi alterado de 6h para 0, desabilitando o cache de capas e forçando requisições repetidas às APIs externas.",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "pa
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 15517ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
MISSÃO RECEBIDA Tipo: bug fix Risco: baixo Escopo: backend/src/services/hermesService.js  HERMES - Contexto completo fornecido via diff e arquivo original - Regras: §53 aplicada — foco exclusivo no diff  SCANNER - Arquivo: backend/src/services/hermes
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 29130ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
MISSÃO RECEBIDA Tipo: bug fix Risco: alto Escopo: backend/src/services/gameCoverService.js  HERMES - Contexto: diff e conteúdo do arquivo fornecidos - Regras aplicadas: §53 (foco exclusivo no diff)  SCANNER - Arquivo: backend/src/services/gameCoverSe
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 8528ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "CORS middleware em backend/src/app.js na linha 60 tem condição invertida. `if (origin && !allowedOrigins.has(origin))` define cabeçalhos CORS para origens NÃO autorizadas, quebrando o CORS para origens legítimas e permitindo
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 9549ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "O limite de payload do body parser foi alterado de 1mb para 1b, impedindo que requisições JSON (ex.: POST /api/games) com corpo maior que 1 byte sejam parseadas, retornando erro 413 ou falha silenciosa.",   "file": "backend/
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7665ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
```json {   "diagnosis": "Condição de autenticação invertida em requireRefreshAuth: candidate === expectedToken deveria ser candidate !== expectedToken. Isso bloqueia requisições autenticadas e permite requisições não autenticadas.",   "file": "backe
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10017ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "A linha `).slice(0, 0);` foi alterada de `).slice(0, 280);` no diff, fazendo com que o summary de todos os itens seja truncado para 0 caracteres, resultando em resumo vazio.",   "file": "backend/src/services/normalizer.js", 
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10929ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "Bug in isHealthy function: return statement negated (return !response.ok) causing the function to return false when API is healthy (response.ok is true). The correct logic should be return response.ok; to indicate healthy st
```


