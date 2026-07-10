# Vision Core — Stress Test V3 Results

Data: 2026-07-10T23:27:36.009Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 15452ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 12320ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
```json {   "diagnosis": "No arquivo backend/src/services/gameCoverService.js, no bloco finally da função fetchJson, a linha clearTimeout(timer) foi comentada, impedindo o cancelamento do timer de timeout. Isso causa memory leak e potencial execução 
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 8057ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "A alteração no catch substituiu o retorno do fallback por um throw, quebrando o fluxo de cache quando o arquivo não existe ou está corrompido.",   "file": "backend/src/services/cacheService.js",   "fix_type": "code_patch",  
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 25641ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260
```
```json {   "diagnosis": "hideEmptyContainer() usa setTimeout com atraso 0ms, removendo a animação de colapso de 260ms que existia antes. Isso causa transição instantânea sem feedback visual ao usuário.",   "file": "front/assets/js/feeds.js",   "fix_
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 5129ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "Ordenação de candidatos invertida em rankGameCoverCandidates: a.confidence - b.confidence ordena do menor para o maior confidence, mas a intenção correta é ordenar do maior para o menor (b.confidence - a.confidence) para sel
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8581ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "Linha await (window.__TNG_CONFIG_READY__ || Promise.resolve()) foi comentada (dif + mostra comentário), impedindo que init() aguarde a inicialização da configuração global __TNG_CONFIG_READY__, o que pode causar execução pre
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 15472ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, latest
```
```json {   "diagnosis": "Typo na URL do endpoint API de notícias recentes: '/api/nwes/latest' deve ser '/api/news/latest'. A alteração no diff trocou 'news' por 'nwes', resultando em rota inválida e falha na requisição, quebrando o carregamento da s
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 11005ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "A função safeLimit em backend/src/routes/newsRoutes.js foi alterada de Math.min(parsed, 120) para Math.min(parsed, 0), fazendo com que todo limite de consulta seja truncado para 0, retornando zero resultados e quebrando o si
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12311ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS foi alterado de 6*60*60*1000 (6h) para 0, fazendo com que o cache expire imediatamente após ser inserido. Isso anula o cache, causando chamadas repetidas à STEAMGRIDDB e RAWGB a cada requisição, degradando
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 67887ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "A função `calculateRanking` em `backend/src/services/hermesService.js` foi alterada para ordenar os agentes por score em ordem crescente (`a.score - b.score`), o que inverte a lógica de um ranking (o maior score deve vir pri
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 16802ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "A função hasBlockedSource foi invertida com a adição do operador !, fazendo com que fontes do tipo social/fanart sejam aceitas e as demais rejeitadas, comportamento oposto ao desejado.",   "file": "backend/src/services/gameC
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 15473ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Condição de CORS invertida — `!allowedOrigins.has(origin)` permite origens não autorizadas e bloqueia as autorizadas. Causa falha de CORS no frontend legítimo (technetgame.com.br) e permite origens externas indevidas.",   "f
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 13708ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "Linha 84 de backend/src/app.js: `express.json({ limit: \"1b\" })` limita o corpo JSON a 1 byte, rejeitando qualquer requisição POST com payload. O valor correto é \"1mb\" (1 megabyte).",   "file": "backend/src/app.js",   "fi
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9006ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, invertido, auth, candidate
```
```json {   "diagnosis": "Inversão do operador de comparação na condição de autorização do middleware requireRefreshAuth: o operador foi alterado de !== para ===, fazendo com que a rota de refresh retorne 401 quando o token é válido, quebrando a aute
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 829ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, 280, vazio
```
```json {   "diagnosis": "A função de normalização corta o resumo em 0 caracteres, resultando em sumário vazio; a linha .slice(0, 0) deve ser .slice(0, 280).",   "file": "backend/src/services/normalizer.js",   "fix_type": "code_patch",   "patch": {  
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9558ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "Função isHealthy em config.js retorna !response.ok, invertendo a detecção de saúde da API: uma API saudável (HTTP 200) é considerada não saudável, e vice-versa.",   "file": "front/assets/js/config.js",   "fix_type": "code_pa
```


