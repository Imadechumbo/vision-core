# Vision Core — Stress Test V3 Results

Data: 2026-07-09T13:45:01.672Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 12613ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 21295ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
```json {   "diagnosis": "Na função `fetchJson`, a chamada `clearTimeout(timer)` foi comentada no bloco `finally`, impedindo o cancelamento do timeout quando a requisição termina. Isso causa vazamento de timers e potencial erro de 'abort' tardio.",  
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7680ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "O catch em readJson foi alterado para sempre lançar um erro (throw new Error(...)) em vez de retornar fallback silenciosamente. Isso quebra o site porque qualquer falha na leitura do cache (arquivo ausente, corrompido) propa
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 15429ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260, delay
```
```json {   "diagnosis": "Tempo de animação de recolhimento reduzido de 260ms para 0ms — oculta o container sem delay, removendo a suavidade visual da transição de collapse",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch"
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 17987ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, invertido, b.confidence
```
```json {   "diagnosis": "Sort order de confidence invertido no comparator de rankGameCoverCandidates: a.confidence - b.confidence ordena ascendente, fazendo com que o candidato com menor confiança apareça primeiro e seja selecionado, quando deveria 
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 20813ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "A linha responsável por aguardar a configuração global (__TNG_CONFIG_READY__) foi comentada, removendo a sincronização necessária antes de iniciar os feeds. Isso pode causar falhas de carregamento se a configuração não estiv
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 8344ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, latest
```
```json {   "diagnosis": "Typo na URL da API de últimas notícias: '/api/nwes/latest?limit=18' em vez de '/api/news/latest?limit=18' na linha 94 do arquivo front/assets/js/feeds.js, dentro da função fetchHomePayloadFallback.",   "file": "front/assets/
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7769ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "A função safeLimit em backend/src/routes/newsRoutes.js define o limite máximo como 0 (Math.min(parsed, 0)), o que faz com que qualquer limit solicitado seja forçado a 0, resultando em nenhum item retornado. A intenção origin
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10224ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS setado para 0 (linha + do diff) desabilita o cache: todas as requisições à APIs externas são refeitas, causando timeout e falha no site.",   "file": "backend/src/services/gameCoverService.js",   "fix_type"
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 14063ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "calculateRanking() usa ordenação ascendente (a.score - b.score) em vez de descendente (b.score - a.score), fazendo o ranking exibir os agentes com menor pontuação primeiro.",   "file": "backend/src/services/hermesService.js"
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10622ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "hasBlockedSource foi invertida com operador '!' no diff, fazendo fontes seguras serem bloqueadas e fontes social/fanart serem permitidas.",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 10701ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "CORS middleware em backend/src/app.js linha 56: condição invertida nega allowedOrigins, bloqueando origens permitidas e liberando origens não autorizadas. Origem do site (technetgame.com.br) não recebe cabeçalho CORS, causan
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 13393ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "Linha 89 de backend/src/app.js: o limite do body parser JSON foi reduzido de '1mb' para '1b' (1 byte), rejeitando praticamente qualquer requisição com corpo JSON. Causa direta de falha no site ao enviar formulários ou dados 
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7813ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
```json {   "diagnosis": "Inversão lógica na função requireRefreshAuth: a condição candidate === expectedToken retorna 401 quando o token é válido, bloqueando todas as requisições de refresh autorizadas.",   "file": "backend/src/routes/newsRoutes.js"
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10093ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "A linha de truncamento do summary foi alterada de .slice(0, 280) para .slice(0, 0), resultando em todos os summaries vazios (string de comprimento zero).",   "file": "backend/src/services/normalizer.js",   "fix_type": "code_
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12971ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "Inversão da lógica de verificação de saúde em `isHealthy()` no arquivo `front/assets/js/config.js`. A linha foi alterada de `return response.ok;` para `return !response.ok;`, fazendo com que endpoints saudáveis (status 200) 
```


