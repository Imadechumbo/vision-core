# Vision Core — Stress Test V3 Results

Data: 2026-06-13T11:53:36.224Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 9501ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 5193ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
```json {   "diagnosis": "A linha `clearTimeout(timer);` foi comentada no bloco `finally` da função `fetchJson`, impedindo o cancelamento do timer de timeout. Isso causa vazamento de recursos (timers não limpos) e potencialmente impede que requisiçõe
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 5686ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "A função readJson foi alterada: o bloco catch que retornava o fallback foi substituído por um throw, quebrando todos os callers que esperavam um valor padrão em caso de falha de leitura ou JSON inválido.",   "file": "backend
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 18900ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260, delay
```
```json {   "diagnosis": "Timeout reduzido de 260ms para 0ms no setTimeout da função hideEmptyContainer, removendo o delay necessário para a animação de colapso do feed block.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "pat
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 5461ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "Bug na ordenação dos candidatos em rankGameCoverCandidates: a expressão original correta era `b.confidence - a.confidence` (decrescente, maior confiança primeiro), mas foi alterada para `a.confidence - b.confidence` (crescen
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 4197ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "await (window.__TNG_CONFIG_READY__ || Promise.resolve()) foi comentado no DOMContentLoaded, removendo a espera pela configuração global antes de init(). Isso causa race condition: feeds podem tentar carregar antes da config 
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7383ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, latest
```
```json {   "diagnosis": "Typo na rota da API '/api/nwes/latest?limit=18' — foi introduzido erro de digitação 'nwes' em vez de 'news' na linha 94 do arquivo front/assets/js/feeds.js. Isso causa falha na requisição de notícias mais recentes no método 
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 4027ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit em newsRoutes.js retorna Math.min(parsed, 0) que sempre resulta em 0, fazendo com que todas as rotas que usam este helper recebam limit=0, retornando 0 notícias.",   "file": "backend/src/routes/newsRoutes.js",   "f
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11837ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS set to 0 (bug introduced), disabling cache and causing repeated external API calls on every request, leading to performance degradation and potential rate limiting.",   "file": "backend/src/services/gameCo
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 4064ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "calculateRanking ordena por score ascendente (a.score - b.score) em vez de descendente (b.score - a.score), invertendo o ranking — agentes com maior score aparecem por último em vez de primeiro.",   "file": "backend/src/serv
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13794ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "Inversão de lógica em hasBlockedSource: o operador de negação ! faz com que a função retorne true para fontes não bloqueadas (RAWG, SteamGridDB), causando rejeição indevida de capas legítimas.",   "file": "backend/src/servic
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 29982ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "CORS middleware nega origens permitidas — operador ! inverteu a lógica, causando bloqueio de requisições de origens confiáveis como https://technetgame.com.br",   "file": "backend/src/app.js",   "fix_type": "code_patch",   "
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 11855ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json
```
```json {   "diagnosis": "Linha `app.use(express.json({ limit: \"1b\" }));` define limite do body parser em 1 byte, rejeitando requisições JSON com body > 1 byte (incluindo health check vazio).",   "file": "backend/src/app.js",   "fix_type": "code_pa
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 5702ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
```json {   "diagnosis": "Condição de autorização invertida em requireRefreshAuth: `candidate === expectedToken` retorna 401 em vez de `candidate !== expectedToken`, bloqueando refresh com token válido e permitindo refresh sem token quando expectedTo
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 3539ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "O summary está sendo truncado para 0 caracteres devido a .slice(0, 0) na linha 47, resultando em summaries vazios para todos os itens do feed.",   "file": "backend/src/services/normalizer.js",   "fix_type": "code_patch",   "
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10891ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok, invertido
```
```json {   "diagnosis": "Função isHealthy retorna !response.ok (invertido), fazendo com que health checks bem-sucedidos (status 200-299) retornem false, indicando servidor como não saudável. Isso impede a descoberta correta da API base.",   "file": 
```


