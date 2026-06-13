# Vision Core — Stress Test V3 Results

Data: 2026-06-13T14:26:58.116Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 12562ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 21080ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, finally
```
```json {   "diagnosis": "A linha clearTimeout(timer) foi comentada no bloco finally da função fetchJson, impedindo o cancelamento do timer de timeout. Isso causa vazamento de memória (garbage collector não coleta timers ativos) e potencial comportam
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7204ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "Função readJson no cacheService.js: catch foi alterado de retornar fallback (comportamento tolerante a cache ausente/inválido) para lançar erro, quebrando readCache, readImageCache e readTranslationCache que dependem de fall
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 3873ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260, delay
```
```json {   "diagnosis": "O timeout de 260ms para ocultar containers foi reduzido para 0ms, removendo o atraso que permitia a animação CSS de collapse ser concluída antes de ocultar o elemento. Isso causa um problema visual onde o container desaparec
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 4502ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "Bug na ordenação de candidatos em rankGameCoverCandidates — linha do sort foi invertida de 'b.confidence - a.confidence' (descendente correto) para 'a.confidence - b.confidence' (ascendente incorreto), fazendo com que covers
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 23490ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "A espera pela configuração global (window.__TNG_CONFIG_READY__) foi comentada, causando que a inicialização dos feeds ocorra antes da configuração estar pronta, resultando em comportamento indefinido ou falha no carregamento
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 15064ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, latest
```
```json {   "diagnosis": "Typo na URL da API em feeds.js: '/api/nwes/latest?limit=18' (nwes em vez de news) causa falha na requisição de notícias recentes.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "search":
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 18050ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit() retorna 0 para qualquer limite positivo devido ao uso de Math.min(parsed, 0) em vez de Math.min(parsed, 120). Isso faz com que todas as queries de listagem recebam limit=0, retornando conjunto vazio ou erro.",   
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9389ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "Cache TTL foi alterado de 6 horas para 0 (diff linha +9), fazendo com que os covers nunca sejam cacheados, resultando em requisições excessivas para APIs externas (RAWG, SteamGridDB) a cada busca de capa.",   "file": "backen
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 19900ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "calculateRanking() retorna ranking ordenado ASC (a.score - b.score) em vez de DESC (b.score - a.score), causando exibição dos agentes com menor score primeiro no front-end",   "file": "backend/src/services/hermesService.js",
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 4189ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "hasBlockedSource retorna true para fontes sociais/fanart quando deveria retornar false. A negação !(...) inverte a lógica correta, bloqueando covers de fontes confiáveis e aceitando covers de fontes não confiáveis.",   "file
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7240ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Inverted CORS origin check in middleware. The condition incorrectly negates `allowedOrigins.has(origin)`, causing the server to set CORS headers only for origins that are NOT in the whitelist, effectively blocking legitimate
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 13207ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
MISSÃO RECEBIDA Tipo: bug fix Risco: alto Escopo: backend/src/app.js (1 arquivo)  ```json {   "diagnosis": "Express JSON body parser limit alterado de 1mb para 1b (1 byte), impedindo que qualquer request com body JSON seja processado — todas as requi
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8831ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, invertido, candidate
```
```json {   "diagnosis": "Inversão do operador de negação na condição de autorização — `candidate === expectedToken` em vez de `candidate !== expectedToken`. Isso faz com que requisições com token válido sejam rejeitadas (401) e requisições sem token
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 16200ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280
```
```json {   "diagnosis": "Feed summary slice limit changed from 280 to 0, causing all summaries to be empty strings.",   "file": "backend/src/services/normalizer.js",   "fix_type": "code_patch",   "patch": {     "search": "  ).slice(0, 0);",     "rep
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 16217ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "A função isHealthy inverteu o valor de retorno: `return !response.ok;` retorna false quando o servidor responde com status OK (response.ok=true), fazendo com que o site considere a API como não saudável e possivelmente falhe
```


