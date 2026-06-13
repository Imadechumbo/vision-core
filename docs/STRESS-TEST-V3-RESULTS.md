# Vision Core — Stress Test V3 Results

Data: 2026-06-13T11:03:57.446Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 15005ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 26591ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
```json {   "diagnosis": "timer não cancelado após fetch: clearTimeout(timer) foi comentado, impedindo cancelamento do timeout e podendo causar abort desnecessário após resposta.",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 9826ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "O cache de leitura (readJson) agora lança exceção em vez de retornar fallback. O diff mostra que o catch anterior retornava o valor padrão (fallback), permitindo que o site funcionasse com dados vazios. O novo catch lança th
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 4421ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260
```
```json {   "diagnosis": "O valor do timeout foi reduzido de 260ms para 0ms no hideEmptyContainer, removendo o atraso visual necessário para a animação de colapso ser visível, resultando em container.hidden aplicado antes do usuário perceber a transi
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8445ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "A ordenação dos candidatos no método rankGameCoverCandidates está invertida. A linha original (correta) usava `b.confidence - a.confidence` para ordenar do maior para o menor confidence. O bug introduziu `a.confidence - b.co
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11037ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "Linha 721 comentada removendo a espera por `__TNG_CONFIG_READY__`, causando inicialização prematura de TechNetGameFeeds.init() sem configuração.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": 
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6433ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, 404, latest
```
```json {   "diagnosis": "Typo no endpoint da API em feeds.js: '/api/nwes/latest?limit=18' em vez de '/api/news/latest?limit=18' — rota inexistente causa 404 e quebra do carregamento de notícias.",   "file": "front/assets/js/feeds.js",   "fix_type": 
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 12636ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "A função safeLimit teve seu retorno alterado de Math.min(parsed, 120) para Math.min(parsed, 0), limitando todos os resultados a zero e quebrando as rotas que dependem do limite.",   "file": "backend/src/routes/newsRoutes.js"
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 45220ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS foi alterado de 6*60*60*1000 (6 horas) para 0, desativando completamente o cache de capas. Isso força uma nova requisição a cada chamada, causando lentidão e potencial sobrecarga nas APIs externas, resulta
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 14018ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "calculateRanking em hermesService.js na linha 176 — sort usa a.score - b.score (ordem crescente) quando deveria usar b.score - a.score (ordem decrescente). Isso inverte o ranking, colocando o agente com menor score em primei
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11065ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "Bug introduced by negating the condition in hasBlockedSource(). Original logic blocked sources containing 'social' or 'fanart'; the + line inverts this with `!`, now accepting those sources instead of rejecting them. This ca
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 10680ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Bug de CORS: condição do middleware foi invertida — `if (origin && !allowedOrigins.has(origin))` seta Access-Control-Allow-Origin apenas para origens NÃO permitidas, quebrando requisições de origens legítimas como https://te
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 10658ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "O limite de 1 byte no `express.json()` impede qualquer corpo de requisição JSON maior que 1 caractere. Todas as chamadas POST/PUT/PATCH para a API falham com erro de payload inválido.",   "file": "backend/src/app.js",   "fix
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10693ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, invertido, auth, candidate
```
```json {   "diagnosis": "Inversão de operador de comparação na função requireRefreshAuth: diff mostra que candidate !== expectedToken (lógica correta) foi substituído por candidate === expectedToken (lógica invertida). Isso faz com que a rota /refre
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 33793ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "O slice do summary foi alterado de .slice(0, 280) para .slice(0, 0), fazendo com que todos os resumos retornem string vazia, quebrando a exibição no site.",   "file": "backend/src/services/normalizer.js",   "fix_type": "code
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9553ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok, fallback
```
```json {   "diagnosis": "isHealthy() retorna !response.ok invertendo o resultado: endpoint saudável (status 200) retorna false, endpoint não saudável retorna true. Isso impede a seleção de endpoints funcionais no loop de fallback, causando falha de 
```


