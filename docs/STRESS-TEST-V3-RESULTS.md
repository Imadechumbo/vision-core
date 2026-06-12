# Vision Core — Stress Test V3 Results

Data: 2026-06-12T00:01:46.233Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 17819ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 22445ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
```json {   "diagnosis": "O clearTimeout(timer) foi comentado no bloco finally da função fetchJson. Isso causa vazamento de timeout — o timer nunca é cancelado, mantendo o processo ativo desnecessariamente até o timeout expirar, podendo causar múltip
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 17738ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "Em cacheService.js, o bloco catch da função readJson foi alterado para lançar uma exceção (throw new Error) em vez de retornar o valor fallback, quebrando o tratamento de falhas de leitura de cache e provavelmente causando e
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10993ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260, delay
```
```json {   "diagnosis": "setTimeout delay reduzido de 260ms para 0ms no método hideEmptyContainer, removendo o efeito visual de colapso e causando desaparecimento instantâneo do container.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11183ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, invertido, b.confidence
```
```json {   "diagnosis": "Sort order invertido em rankGameCoverCandidates: linha de sort usa a.confidence - b.confidence (ascendente) em vez de b.confidence - a.confidence (descendente), fazendo com que candidatos de menor confiança sejam selecionado
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 824ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "A linha de await foi comentada, impedindo a espera da configuração antes da inicialização; isso causa falha ao iniciar TechNetGameFeeds sem config pronta.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",  
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 37134ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, 404, latest
```
```json {   "diagnosis": "Erro de digitação no path da API: '/api/nwes/latest?limit=18' em vez de '/api/news/latest?limit=18' causa falha na requisição de notícias recentes (404 ou endpoint inválido).",   "file": "front/assets/js/feeds.js",   "fix_ty
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 16365ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit retorna Math.min(parsed, 0) em vez de Math.min(parsed, 120), forçando todos os limites a zero e quebrando rotas de listagem de notícias",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13712ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS foi definido como 0 (em vez de 6*60*60*1000) no diff, desabilitando o cache e causando requisições externas repetitivas, degradando performance do site.",   "file": "backend/src/services/gameCoverService.j
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10558ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "Ordenação invertida em calculateRanking: usa a.score - b.score (crescente) ao invés de b.score - a.score (decrescente), causando ranking com agentes de menor score primeiro.",   "file": "backend/src/services/hermesService.js
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 26825ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "Bug no filtro hasBlockedSource: a negação '!' foi adicionada, invertendo a lógica. Fontes de terceiros como social e fanart agora são aceitas (deveriam ser bloqueadas) e fontes válidas são rejeitadas, causando problemas na e
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 11373ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "CORS middleware em app.js tem lógica invertida: a condição `!allowedOrigins.has(origin)` faz com que o header Access-Control-Allow-Origin seja setado APENAS para origens não autorizadas, bloqueando requisições legítimas e ex
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7189ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "Linha com '+' no diff mostra alteração de express.json({ limit: '1mb' }) para { limit: '1b' }. '1b' é um valor inválido — Express aceita apenas string numérica com unidade válida (kb, mb, gb, b). Isso causa falha no parsing 
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 33916ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, invertido, auth, candidate
```
```json {   "diagnosis": "Bug de autenticação: operador de negação invertido na linha 25. O código com `candidate === expectedToken` nega acesso quando o token é válido (retorna 401 'Unauthorized'), bloqueando todas as requisições autenticadas de ref
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 26586ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "normalizeFeedItem() summary truncado para string vazia - slice(0, 0) gera summary vazio obrigando fallback genérico em todos os itens do feed",   "file": "backend/src/services/normalizer.js",   "fix_type": "code_patch",   "p
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 20437ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok, fallback
```
MISSÃO RECEBIDA   Tipo: bug fix   Risco: alto   Escopo: front/assets/js/config.js    HERMES   - Contexto: diff fornecido, código completo, resposta da API de health com "ok": true.   - Regras §53 aplicadas: foco exclusivo nas linhas -/+ do diff.    S
```


