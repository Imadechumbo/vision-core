# Vision Core — Stress Test V3 Results

Data: 2026-06-11T09:51:30.023Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 12 |
| FAIL | 3 |
| Taxa de acerto | 80% |
| Tempo médio | 9670ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 4 | 1 | 80% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 3 | 2 | 60% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 11820ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, finally
```
```json {   "diagnosis": "timer não cancelado no finally, causando comportamento errático",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "search": "clearTimeout(timer);",     "replace": "// clearT
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 3581ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw
```
```json {   "diagnosis": "X foi comentado/desativado, causando ReferenceError/undefined",   "file": "backend/src/services/cacheService.js",   "fix_type": "code_patch",   "patch": {     "search": "-  } catch {",     "replace": "  } catch (e) {\n    th
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 4955ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** 260
```
```json {   "diagnosis": "Timeout no hideEmptyContainer não foi configurado corretamente.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "search": "-        }, 260);",     "replace": "+        }, 0);"   },   "con
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9771ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, b.confidence
```
```json {   "diagnosis": "Comparação de confiança inválida: retorna a menor confiança entre a e b. Bug de lógica: retorna a maior confiança.",   "file": "a/backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "searc
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 23162ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis":  "TechNetGameFeeds init não aguarda window.__TNG_CONFIG_READY__",   "file":       "front/assets/js/feeds.js",   "fix_type":   "json_field | code_patch",   "patch":      {     "fields": {       "window.__TNG_CONFIG_READY__": "
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6467ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, latest
```
```json {   "diagnosis":  "o bug foi causado pela mudança de /api/news/latest para /api/nwes/latest na linha  -            this.fetchJson('/api/news/latest?limit=18') no arquivo feeds.js.",   "file":       "front/assets/js/feeds.js",   "fix_type":   
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 3911ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "funcção safeLimit retornou valor inválido, causando resultado inesperado",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "json_field",   "patch": {     "target_title": "safeLimit function",     "fields": {     
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 5618ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "ENV variable COVER_CACHE_TTL_MS set to 0, verificar linha 16 CertificateVerificationError ao acessar SteamGridDb. Certificado expirado.",   "file": "a/backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 17231ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis":  "score comprimento por comparação multiplicada pelo numeric binário causouthresholdudos inversos",   "file":       "backend/src/services/hermesService.js",   "fix_type":   "code_patch",   "patch":      "{\"search\":\"\\u2115
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8739ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "PATCH incompleto aplicado em hasBlockedSource: 'social' e 'fanart' excluídos apenas por negação de inclui",   "file": "a/backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "search": "+  r
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ❌ FAIL | **Dificuldade:** HARD | **Tempo:** 3608ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** _nenhuma_
```
```json {   "diagnosis": "hardwareRoutes foi comentado/desativado, causando valor undefined",   "file": "backend/src/routes/hardwareRoutes.js",   "fix_type": "json_field",   "patch": {     "target_title": "hardwareRoutes",     "fields": {       "addt
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 2858ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, json
```
```json {   "diagnosis": "Aplicação não lista únicos e projetários originais deixou HTTP origin entranhou",   "file": "a/backend/src/app.js",   "fix_type": "json_field",   "patch": {     "target_title": "express.json()",     "fields": {       "limit"
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 2063ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
```json {   "diagnosis": "requireRefreshAuth compara token com === ao invés de !==, rejeitando solicitações válidas.",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "if (!expectedToken || candida
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 34001ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** _nenhuma_
```
⚠️ **Todos os provedores de IA falharam** (payload: 2667 chars).  Causas prováveis: - API keys ausentes ou quota esgotada (ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY) - Payload grande demais (Groq free: ≤6K tokens ≈ 24K chars) - Erro de rede ou 
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7263ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** response.ok, invertido
```
```json {   "diagnosis": "return !response.ok foi ativado em vez de return response.ok, gerando problema ao verificar a conclusão do pedido.",   "file": "front/assets/js/config.js",   "fix_type": "code_patch",   "patch": { "search": "return response.
```


