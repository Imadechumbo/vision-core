# Vision Core — Stress Test V3 Results

Data: 2026-06-13T03:34:12.129Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 10769ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 8699ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
```json {   "diagnosis": "Bug introduzido: clearTimeout(timer) foi comentado no bloco finally da função fetchJson, impedindo o cancelamento do timer de timeout. Isso causa vazamento de recursos (memory leak) e impede que a requisição seja abortada co
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 5749ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "O diff mostra que o bloco catch foi alterado de retornar fallback para lançar um erro. Isso quebra o tratamento de falha de leitura do cache, fazendo com que o site retorne erro 500 em vez de usar valores padrão.",   "file":
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 16446ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260
```
```json {   "diagnosis": "Timeout reduzido de 260ms para 0ms impede que a classe 'feed-block-collapsing' permaneça tempo suficiente para a animação CSS ser renderizada, causando desaparecimento instantâneo do container sem transição visual.",   "file
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12615ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "No sort comparator de rankGameCoverCandidates, a ordem dos candidatos com mesma pontuação foi invertida. Linha original (correta): 'return b.confidence - a.confidence' (decrescente). Linha bugada: 'return a.confidence - b.co
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 16820ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "A linha que aguarda a resolução de `window.__TNG_CONFIG_READY__` foi comentada, removendo a sincronização necessária antes de chamar `TechNetGameFeeds.init()`. Sem essa espera, a inicialização pode ocorrer antes da configura
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 12366ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, 404, latest
```
```json {   "diagnosis": "Typo no endpoint da API: '/api/nwes/latest?limit=18' (nwes) ao invés de '/api/news/latest?limit=18' (news) na linha 94 do arquivo feeds.js. Causa falha na requisição e consequentemente a seção 'Últimas notícias' não carrega.
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 3298ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit() retorna Math.min(parsed, 0) em vez de Math.min(parsed, 120), fazendo com que todas as queries de limite retornem 0 itens — site exibe páginas vazias.",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": 
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 14320ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "Fallback de COVER_CACHE_TTL_MS foi alterado de 6 horas (6*60*60*1000 ms) para 0, desativando efetivamente o cache e causando requisições repetidas às APIs externas, resultando em lentidão e possíveis timeouts.",   "file": "b
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9514ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "função calculateRanking ordena ranking por score ascendente (menor → maior) devido ao sort com a.score - b.score, quando deveria ser descendente (b.score - a.score) para que agentes com mais itens apareçam primeiro.",   "fil
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12098ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "Inversão de lógica no hasBlockedSource — a negação !(...) faz com que fontes confiáveis sejam rejeitadas e fontes não confiáveis (social/fanart) sejam aceitas, bloqueando covers legítimos e permitindo os indesejados",   "fil
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 18189ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Bug na condição do middleware CORS em backend/src/app.js, linha 95: a negação '!' foi introduzida indevidamente, invertendo a lógica de autorização de origens.",   "file": "backend/src/app.js",   "fix_type": "code_patch",   
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 5575ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "O limite do body JSON foi reduzido de 1 megabyte (\"1mb\") para 1 byte (\"1b\"), impedindo que qualquer requisição JSON com payload seja processada. O site provavelmente não carrega dados dinâmicos ou falha ao enviar formulá
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 747ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
```json {   "diagnosis": "Incorrect token comparison logic in requireRefreshAuth: uses === instead of !== causing legitimate tokens to be rejected",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": 
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6424ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "O slice de summary foi alterado de 280 para 0, o que zera o comprimento do resumo de todos os itens, forçando o fallback para texto genérico.",   "file": "backend/src/services/normalizer.js",   "fix_type": "code_patch",   "p
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 18672ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "Bug de inversão lógica em isHealthy() no arquivo front/assets/js/config.js. O diff mostra que a linha correta 'return response.ok;' (retorna true para respostas 2xx) foi substituída por 'return !response.ok;' (retorna true a
```


