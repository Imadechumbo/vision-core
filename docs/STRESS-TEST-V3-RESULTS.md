# Vision Core — Stress Test V3 Results

Data: 2026-06-11T13:31:21.918Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 12 |
| FAIL | 3 |
| Taxa de acerto | 80% |
| Tempo médio | 16135ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 3 | 2 | 60% |
| F — Dados/API | 4 | 1 | 80% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 4800ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, finally
```
```json {   "diagnosis":  "timer não cancelado; falta de finalização do clearTimeout nas funções fetchJson",   "file":       "gameCoverService.js",   "fix_type":  "code_patch",   "patch":      "{\"search\":\"finally {setTimeout(\\u000D\\u000A    clea
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 3296ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "Bearer token não é validado, causando erro de autenticação",   "file": "a/backend/src/services/cacheService.js",   "fix_type": "code_patch",   "patch": { "search": "-    return fallback;", "replace": "throw new Error('Cache 
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 31238ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** _nenhuma_
```
⚠️ **Todos os provedores de IA falharam** (payload: 5487 chars).  Causas prováveis: - API keys ausentes ou quota esgotada (ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY) - Payload grande demais (Groq free: ≤6K tokens ≈ 24K chars) - Erro de rede ou 
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 31616ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** _nenhuma_
```
⚠️ **Todos os provedores de IA falharam** (payload: 15060 chars).  Causas prováveis: - API keys ausentes ou quota esgotada (ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY) - Payload grande demais (Groq free: ≤6K tokens ≈ 24K chars) - Erro de rede ou
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13992ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis":  "TNG_CONFIG_READY é esperado antes de.init(), mas não encontrado",   "file":       "front/assets/js/feeds.js",   "fix_type":   "code_patch",   "patch":      {     "search": "await (window.__TNG_CONFIG_READY__ || Promise.reso
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 9614ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, latest
```
```json {   "diagnosis": "Erro de redirecionamento URL em /api/news/latest para /api/nwes/latest.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "search": "+            this.fetchJson('/api/nwes/latest?limit=18')
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ❌ FAIL | **Dificuldade:** HARD | **Tempo:** 31228ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** _nenhuma_
```
⚠️ **Todos os provedores de IA falharam** (payload: 4352 chars).  Causas prováveis: - API keys ausentes ou quota esgotada (ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY) - Payload grande demais (Groq free: ≤6K tokens ≈ 24K chars) - Erro de rede ou 
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8223ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS alterado para 0, causando atualização inválida de covers.",   "file": "a/backend/src/services/gameCoverService.js",   "fix_type": "json_field",   "patch": {     "target_title": "COVER_CACHE_TTL_MS",     "f
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11169ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "Sorting order para ranking reverso alterado, causando incerteza nos pesos de agentes",   "file": "backend/src/services/hermesService.js",   "fix_type": "code_patch",   "patch": {     "search": ".sort((a, b) => a.score - b.sc
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 4785ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "Token expiry usa < em vez de <=",   "file": "a/backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "search": "Token expiry usa <",     "replace": "Token expiry usa <="   },   "confidence":
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 20482ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** allowedOrigins, origin
```
```json {   "diagnosis":  "Origem permitida não aplicada —ॉ92.",   "file":       "_next/public/site",   "fix_type":   "code_patch",   "patch":      "{\"search\": 'if (origin &&!allowedOrigins.has(origin))\\n\",\\n\\t\tres.setHeader(\"Access-Control-A
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 16233ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json
```
```json {   "diagnosis": "Token expiry uses < instead of <= in auth middleware",   "file": "backend/src/app.js",   "fix_type": "code_patch",   "patch": {     "search": "-app.use(express.json({ limit: \\\"1mb\\\" }));+app.use(express.json({ limit: \\\
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 25972ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
```json {   "diagnosis": "Comparação incorreta entre candidate e expectedToken, causando erro de autenticação",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "+  if (!expectedToken || candidate =
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8616ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280
```
```json {   "diagnosis":  "slice método inválido — removeu excesso de caracteres do resumo",   "file":       "a/backend/src/services/normalizer.js",   "fix_type":   "code_patch",   "patch":      {     "search": "summary = stripHtml(summary \\+ \\" ||
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 20763ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "idenficação incorreta de resposta de saída em isHealthy, o que causa retornar!response.ok em vez de trabalhar com a resposta.",   "file": "a/front/assets/js/config.js",   "fix_type": "json_field",   "patch": {     "search": 
```


