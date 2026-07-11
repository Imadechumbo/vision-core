# Vision Core — Stress Test V3 Results

Data: 2026-07-11T20:32:19.154Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 12924ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 21420ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
```json {   "diagnosis": "A chamada clearTimeout(timer) foi comentada no bloco finally da função fetchJson, impedindo o cancelamento do timer. Isso causa vazamento de timer (timer leak) até que o timeout natural de 12s dispare, potencialmente causand
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 15641ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "A função readJson em backend/src/services/cacheService.js foi alterada para lançar uma exceção quando a leitura do cache falha, em vez de retornar o fallback. Isso quebra a resiliência do cache e causa erros no site quando o
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 18493ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260, delay
```
```json {   "diagnosis": "Em front/assets/js/feeds.js, método hideEmptyContainer: o setTimeout foi alterado de 260ms para 0ms, eliminando o delay necessário para a animação CSS feed-block-collapsing ser percebida visualmente. Isso causa remoção abrup
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 14681ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "rankGameCoverCandidates ordena candidatos em ordem crescente de confidence (a.confidence - b.confidence), colocando o pior candidato primeiro e o melhor por último. Isso interfere na seleção do melhor cover, pois o find() pe
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13674ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "Linha que aguarda a promessa de configuração (`__TNG_CONFIG_READY__`) foi comentada, causando inicialização do módulo feeds sem que a configuração esteja pronta. Isso pode resultar em falhas ao carregar dados ou renderizar b
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 14167ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, latest
```
```json {   "diagnosis": "Typo em URL da API: '/api/nwes/latest' em vez de '/api/news/latest' na chamada fetchJson dentro de fetchHomePayloadFallback, causando rota inválida e falha na obtenção das últimas notícias.",   "file": "front/assets/js/feeds
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6105ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit retorna Math.min(parsed, 0), o que força o limite a sempre 0, impedindo a exibição de notícias em todas as rotas que usam a função (latest, month, game-search, category, source).",   "file": "backend/src/routes/new
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 23042ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS com fallback 0 anula o cache, forçando requisições repetidas a RAWG/SteamGridDB a cada chamada de resolveGameCover, gerando lentidão e potencial rate-limit no site.",   "file": "backend/src/services/gameCo
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11810ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score, invertido
```
```json {   "diagnosis": "Em `calculateRanking`, o sort foi invertido de `b.score - a.score` (descendente, correto) para `a.score - b.score` (ascendente), fazendo com que o ranking exiba os piores agentes primeiro.",   "file": "backend/src/services/h
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8508ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "hasBlockedSource() retorna true para fontes não bloqueadas e false para bloqueadas, pois a negação ! inverteu a lógica original. Isso faz com que imagens de social e fanart sejam aceitas no scoreGameCoverCandidate, exibindo 
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 13162ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "CORS middleware em backend/src/app.js inverteu a condição de verificação de origens permitidas. A linha atual usa `!allowedOrigins.has(origin)`, o que adiciona cabeçalhos CORS apenas para origens NÃO autorizadas, bloqueando 
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7341ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json
```
```json {   "diagnosis": "O limite do body parser JSON foi alterado de '1mb' para '1b' no diff, impedindo requisições com corpo JSON maior que 1 byte — causa direta da falha do site.",   "file": "backend/src/app.js",   "fix_type": "code_patch",   "pa
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8044ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
```json {   "diagnosis": "A condição de autorização no middleware requireRefreshAuth foi invertida: candidate === expectedToken deveria ser candidate !== expectedToken. Isso faz com que tokens válidos sejam rejeitados (401) e tokens inválidos sejam a
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8709ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "Bug introduzido no diff: .slice(0, 0) trunca o summary para 0 caracteres, tornando-o sempre vazio. A versão anterior usava .slice(0, 280) para limitar a 280 caracteres.",   "file": "backend/src/services/normalizer.js",   "fi
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9068ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok, invertido, fallback
```
```json {   "diagnosis": "Função isHealthy() retorna o valor invertido de response.ok. A condição original deveria retornar true quando a resposta é bem-sucedida (status 2xx), mas o bug introduziu !response.ok, fazendo com que a função retorne false 
```


