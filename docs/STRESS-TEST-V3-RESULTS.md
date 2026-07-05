# Vision Core — Stress Test V3 Results

Data: 2026-07-05T02:13:10.533Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 6145ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 3696ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, finally
```
```json {   "diagnosis":  "Timer não cancelado no fetchJson",   "file":      "backend/src/services/gameCoverService.js",   "fix_type":  "code_patch",   "patch":     { "search": "// clearTimeout(timer);", "replace": "clearTimeout(timer);" },   "confid
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1116ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "O bloco catch foi alterado, lançando erro em vez de retornar fallback, interrompendo a leitura de cache.",   "file": "backend/src/services/cacheService.js",   "fix_type": "code_patch",   "patch": {     "search": "  } catch (
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12722ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260
```
```json {   "diagnosis": "O timeout em hideEmptyContainer foi reduzido de 260ms para 0ms, removendo o atraso necessário para a animação CSS feed-block-collapsing ser concluída, causando desaparecimento instantâneo sem transição.",   "file": "front/as
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1232ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, b.confidence
```
```json {   "diagnosis": "Ordenação inversa de confiança ao classificar candidates; o código atual usa ordem ascendente (a.confidence - b.confidence) em vez de descendente, gerando seleção incorreta.",   "file": "backend/src/services/gameCoverService
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 5140ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "A linha `await (window.__TNG_CONFIG_READY__ || Promise.resolve())` foi comentada no diff (+ -> + linha comentada). Isso impede que o init() aguarde a configuração global __TNG_CONFIG_READY__ antes de executar, podendo causar
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 8726ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, 404, latest
```
```json {   "diagnosis": "Typo na URL do endpoint 'latest' em feeds.js: '/api/nwes/latest?limit=18' em vez de '/api/news/latest?limit=18'. Causa falha na requisição e ausência dos dados mais recentes na home.",   "file": "front/assets/js/feeds.js",  
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 552ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit retorna limite máximo zero devido a retorno incorreto, causando resultados vazios em endpoints que usam a função.",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   "patch": {     "search
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12137ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS com fallback 0 anula o cache de covers, causando requisições repetidas e provável lentidão/erro no site. A alteração no diff trocou o valor padrão de 6 horas (6*60*60*1000) para 0.",   "file": "backend/src
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 734ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "Ordenação de ranking invertida: o código foi alterado para ordenar ascendente (a.score - b.score), fazendo com que agentes com menor pontuação apareçam primeiro.",   "file": "backend/src/services/hermesService.js",   "fix_ty
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 3421ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "Função hasBlockedSource foi alterada para retornar o oposto da lógica original, permitindo fontes bloqueadas.",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "search": "re
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 13478ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
MISSÃO RECEBIDA Tipo: bug fix Risco: crítico Escopo: backend/src/app.js (1 arquivo, 1 linha)  ```json {   "diagnosis": "Inversão lógica no middleware CORS: a condição foi trocada de allowedOrigins.has(origin) para !allowedOrigins.has(origin), fazendo
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 845ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "express.json limit misconfigured: '1b' is invalid, should be '1mb'",   "file": "backend/src/app.js",   "fix_type": "code_patch",   "patch": {     "search": "app.use(express.json({ limit: \"1b\" }));",     "replace": "app.use
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8952ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
```json {   "diagnosis": "A condição de autorização em requireRefreshAuth foi invertida: candidate === expectedToken retorna 401 (incorreto). Deve ser candidate !== expectedToken para negar acesso quando token não corresponde.",   "file": "backend/sr
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 18560ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, 280
```
```json {   "diagnosis": "O método slice está sendo usado com argumentos inválidos, causando erro de runtime.",   "file": "backend/src/services/normalizer.js",   "fix_type": "code_patch",   "patch": {     "search": ").slice(0, 0);",     "replace": ")
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 866ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "isHealthy devolve negação de response.ok, invertendo a avaliação de saúde da API.",   "file": "front/assets/js/config.js",   "fix_type": "code_patch",   "patch": {     "search": "return !response.ok;",     "replace": "return
```


