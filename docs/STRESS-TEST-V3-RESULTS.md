# Vision Core — Stress Test V3 Results

Data: 2026-07-11T18:33:52.864Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 14589ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7662ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
```json {   "diagnosis": "fetchJson() no finally: clearTimeout(timer) foi comentado no diff, impedindo o cancelamento do timeout. Isso causa vazamento de timer e pode abortar requisições futuras.",   "file": "backend/src/services/gameCoverService.js"
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6769ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "No catch do readJson, o código anterior retornava fallback silenciosamente quando o cache não existia ou era inválido. O DIFF introduziu um throw que quebra a leitura inicial do cache (arquivo inexistente ou corrompido), cau
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11016ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260
```
```json {   "diagnosis": "O bug está na função hideEmptyContainer: o setTimeout foi alterado de 260ms para 0ms, removendo o atraso que permitia que a animação CSS feed-block-collapsing (transition) completasse sua execução antes de ocultar o containe
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10071ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "rankGameCoverCandidates ordena por confidence ascendente (a.confidence - b.confidence) em vez de descendente (b.confidence - a.confidence). Isso faz com que candidatos com menor confidence venham primeiro, prejudicando a sel
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 21869ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "Linha que aguarda window.__TNG_CONFIG_READY__ foi comentada, removendo a espera necessária antes de init().",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "search": "        // await (wi
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 27048ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, latest
```
```json {   "diagnosis": "O caminho da API para notícias mais recentes contém um erro de digitação: '/api/nwes/latest' em vez de '/api/news/latest'. Isso faz com que a requisição para 'Últimas notícias' falhe em produção (e em fallback, pois o erro d
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 9363ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "Função safeLimit retorna Math.min(parsed, 0) em vez de Math.min(parsed, 120), fazendo com que todas as consultas que usam limit sejam forçadas a 0.",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch", 
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12118ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
MISSÃO RECEBIDA Tipo: bug fix Risco: médio Escopo: backend/src/services/gameCoverService.js  HERMES - Contexto fornecido via diff e arquivo completo. - Regra §53 aplicada: foco exclusivo nas linhas do diff.  SCANNER - Arquivo: backend/src/services/ga
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7103ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "Ordenação incorreta no ranking: .sort((a, b) => a.score - b.score) ordena crescente (menor score primeiro), mas o ranking deve exibir maior score primeiro. A linha correta era .sort((a, b) => b.score - a.score).",   "file": 
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 23607ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "Inverted boolean logic in hasBlockedSource(). The function should return true if source/type is 'social' or 'fanart', but the introduced '!' causes it to return true only for non-blocked sources, making all candidate covers 
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 32638ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Inversão da lógica CORS. O operador `!` foi introduzido na condição do middleware, fazendo com que o cabeçalho `Access-Control-Allow-Origin` seja enviado apenas para origens *não* autorizadas, bloqueando requisições legítima
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 12606ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "Linha 94 de backend/src/app.js: express.json({ limit: \"1b\" }) limita o corpo JSON a 1 byte, rejeitando qualquer requisição POST com payload maior que 1 byte. Causa direta do erro do site ao processar formulários/envios.", 
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 14691ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
MISSÃO RECEBIDA Tipo: bug fix Risco: baixo Escopo: backend/src/routes/newsRoutes.js  HERMES - contexto fornecido via diff e arquivo completo - regra §53 aplicada  SCANNER - Arquivo: backend/src/routes/newsRoutes.js - Linha afetada: 25 (dentro de `req
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 4863ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280
```
```json {   "diagnosis": "summary.slice(0, 0) zera o resumo para string vazia, removendo todo o conteúdo do slice de normalização.",   "file": "backend/src/services/normalizer.js",   "fix_type": "code_patch",   "patch": {     "search": "  ).slice(0, 
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 17411ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "Função isHealthy retorna !response.ok invertendo a lógica de verificação de saúde do backend. O retorno correto deve ser response.ok para identificar servidores saudáveis.",   "file": "front/assets/js/config.js",   "fix_type
```


