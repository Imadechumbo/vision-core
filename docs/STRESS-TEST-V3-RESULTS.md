# Vision Core — Stress Test V3 Results

Data: 2026-06-12T07:41:22.100Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 13210ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 29093ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
```json {   "diagnosis": "A linha `clearTimeout(timer);` foi comentada no bloco `finally` da função `fetchJson`, impedindo o cancelamento do timer de timeout e causando possíveis execuções tardias do abort do `AbortController`, resultando em requisiç
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 4561ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "O catch foi alterado de captura silenciosa com fallback para lançamento de exceção, quebrando todas as funções que dependiam do fallback (readCache, readImageCache, readTranslationCache).",   "file": "backend/src/services/ca
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 4070ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260
```
```json {   "diagnosis": "O timeout de 260ms para a animação de recolhimento do feed foi reduzido para 0ms, removendo o atraso visual que permitia que a transição CSS fosse percebida pelo usuário. Isso causa um salto visual abrupto (sem animação suav
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 25470ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, b.confidence
```
```json {   "diagnosis": "Na função rankGameCoverCandidates, a ordenação por confiança estava em ordem crescente (menor primeiro), invertendo a prioridade e fazendo com que candidatos de baixa confiança fossem selecionados como capa, resultando em im
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10264ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "decisao": "NEEDS_FIX",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "search": "        // await (window.__TNG_CONFIG_READY__ || Promise.resolve()); // bug: init sem esperar config",     "replace": " 
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 9162ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, 404, latest
```
```json {   "diagnosis": "Erro de digitação no path da API: '/api/nwes/latest?limit=18' foi inserido com 'nwes' em vez de 'news', conforme diff mostra +this.fetchJson('/api/nwes/latest?limit=18') substituindo -this.fetchJson('/api/news/latest?limit=1
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 10343ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "função safeLimit em backend/src/routes/newsRoutes.js: o limite máximo foi alterado de 120 para 0, fazendo com que Math.min(parsed, 0) sempre retorne 0 quando parsed > 0, quebrando todas as consultas que usam safeLimit (lates
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 19345ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
</outputControl>  ```json {   "diagnosis": "COVER_CACHE_TTL_MS foi alterado de 6 horas (6 * 60 * 60 * 1000) para 0 ms, desabilitando totalmente o cache de capas de jogos. Isso faz com que cada consulta resulte em requisições externas repetidas, degra
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7804ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "A ordenação do ranking em calculateRanking foi invertida de decrescente para crescente (b.score - a.score → a.score - b.score), fazendo com que agentes de menor pontuação apareçam primeiro no relatório.",   "file": "backend/
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7012ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "hasBlockedSource() teve sua lógica invertida no diff: a linha original retornava true para fontes bloqueadas (social/fanart), mas a linha modificada retorna true para fontes NÃO bloqueadas, fazendo com que fontes confiáveis 
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 32577ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "CORS middleware com inversão de lógica: o operador '!' antes de 'allowedOrigins.has(origin)' faz com que a resposta CORS seja enviada apenas para origens NÃO autorizadas, bloqueando origens legítimas que deveriam receber o h
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 8433ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "Express JSON body parser limit foi alterado de 1mb para 1b (1 byte), tornando impossível receber qualquer payload JSON (exceto vazio).",   "file": "backend/src/app.js",   "fix_type": "code_patch",   "patch": {     "search": 
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8720ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
```json {   "diagnosis": "Condição de autorização invertida no middleware requireRefreshAuth: trocou !== por ===, fazendo com que tokens válidos sejam rejeitados e inválidos aprovados.",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "co
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8673ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "summary.slice(0, 0) trunca todo o texto do resumo para string vazia, fazendo com que todos os itens do feed mostrem apenas o fallback 'Leia a cobertura completa em...' em vez do conteúdo real do artigo",   "file": "backend/s
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12625ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok, invertido
```
```json {   "diagnosis": "Linha 48: operador de negação invertido em isHealthy(). O código retorna !response.ok, mas deveria retornar response.ok para que uma resposta HTTP 200 (ok: true) indique saúde.",   "file": "front/assets/js/config.js",   "fix
```


