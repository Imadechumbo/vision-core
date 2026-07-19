# Vision Core — Stress Test V3 Results

Data: 2026-07-19T00:05:22.067Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 13043ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 10035ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, finally
```
```json {   "diagnosis": "Em fetchJson(), a linha clearTimeout(timer) foi comentada, impedindo o cancelamento do timeout da requisição. Isso pode causar vazamento de memória e comportamento inesperado após a conclusão da requisição.",   "file": "back
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 4566ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "catch block foi alterado de 'return fallback' (comportamento resiliente) para 'throw new Error(...)', quebrando todos os readCache/readImageCache/readTranslationCache e impedindo o site de carregar quando o cache ainda não e
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 17484ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260, animation
```
```json {   "diagnosis": "Timeout reduction from 260ms to 0ms removes collapse animation and may cause abrupt hiding. Revert to original value.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "search": "        },
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7472ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, invertido, b.confidence
```
```json {   "diagnosis": "Sort comparator invertido em rankGameCoverCandidates: a.confidence - b.confidence ordena por confiança ascendente (pior primeiro), deve ser descendente (b.confidence - a.confidence) para selecionar a melhor capa.",   "file":
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11401ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "O await em window.__TNG_CONFIG_READY__ foi comentado, removendo a espera pela configuração antes da inicialização. Isso faz com que TechNetGameFeeds.init() execute sem que a configuração esteja pronta, causando comportamento
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 11029ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, latest
```
```json {   "diagnosis": "Typo no endpoint da API: 'nwes' em vez de 'news' na URL '/api/nwes/latest?limit=18', causando falha na requisição das notícias mais recentes.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {  
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6153ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit retorna Math.min(parsed, 0) em vez de Math.min(parsed, 120) — o limite foi zerado, fazendo todas as queries retornarem 0 itens.",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   "patch":
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13000ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS foi alterado de 6 horas (6 * 60 * 60 * 1000) para 0 (cache desativado), fazendo com que todo cache expire imediatamente. A cada requisição de capa, o cache é re-criado e expira na mesma hora, causando refe
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10704ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "Ordenação de ranking invertida: sort usa a.score - b.score (crescente) em vez de b.score - a.score (decrescente), fazendo com que itens de menor pontuação apareçam primeiro no ranking.",   "file": "backend/src/services/herme
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 43224ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "hasBlockedSource retorna a negação da condição correta: o operador ! inverte a lógica, fazendo com que fontes confiáveis (RAWG, SteamGridDB) sejam consideradas bloqueadas e fontes não confiáveis (fanart, social) sejam aceita
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 12383ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Operador de negação `!` foi erroneamente adicionado à condição de verificação de origem CORS no middleware. A lógica correta (como existia antes) é `allowedOrigins.has(origin)` — sem negação. Com o `!`, origens não autorizad
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 14725ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "O limite de payload JSON foi alterado de 1mb para 1b, bloqueando praticamente todas as requisições com corpo JSON (formulários, APIs) e causando erro 413 ou parsing failure no backend.",   "file": "backend/src/app.js",   "fi
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8438ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
```json {   "diagnosis": "Condição de autorização invertida em requireRefreshAuth — linha com candidate === expectedToken deveria ser candidate !== expectedToken, causando negação de acesso quando token é válido.",   "file": "backend/src/routes/newsR
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 767ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, 280
```
```json {   "diagnosis": "slice(0, 0) corta todo o resumo, retornando string vazia; deveria limitar a 280 caracteres",   "file": "backend/src/services/normalizer.js",   "fix_type": "code_patch",   "patch": {     "search": ").slice(0, 0);",     "repla
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 24268ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok, invertido
```
```json {   "decisao": "NEEDS_FIX",   "file": "front/assets/js/config.js",   "fix_type": "code_patch",   "patch": {     "search": "return !response.ok;",     "replace": "return response.ok;"   },   "confidence": 0.95,   "diagnosis": "isHealthy retorn
```


