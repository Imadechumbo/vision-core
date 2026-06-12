# Vision Core — Stress Test V3 Results

Data: 2026-06-12T06:22:35.537Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 14 |
| FAIL | 1 |
| Taxa de acerto | 93% |
| Tempo médio | 9180ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 4 | 1 | 80% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 5098ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, finally
```
```json {   "diagnosis": "Timer not cleared in finally block of fetchJson, causing potential resource leak",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "search": "// clearTimeout(timer); // bug:
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ❌ FAIL | **Dificuldade:** HARD | **Tempo:** 61132ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** _nenhuma_
```
⚠️ **Todos os provedores de IA falharam** (payload: 2247 chars).  Causas prováveis: - API keys ausentes ou quota esgotada (ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY) - Payload grande demais (Groq free: ≤6K tokens ≈ 24K chars) - Erro de rede ou 
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 785ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260, delay
```
```json {   "diagnosis": "A remoção do atraso de 260 ms no setTimeout faz o contêiner colapsar imediatamente, quebrando a animação de fechamento.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "search": "        
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1203ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, b.confidence
```
```json {   "diagnosis": "Ordenação invertida na comparação de confiança; linha retorna a.confidence - b.confidence em vez de b.confidence - a.confidence",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 748ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "Linha de inicialização está comentada, impedindo o await da configuração necessária antes de chamar init().",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "search": "// await (window.__T
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 840ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, latest
```
```json {   "diagnosis": "Typo na URL da chamada API: '/api/nwes/latest' → '/api/news/latest' (linha 94)",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "search": "this.fetchJson('/api/nwes/latest?limit=18'),",   
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 841ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit caps limit to 0 instead of 120, causing request limits to always be zero",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "  return Math.min(parsed, 0);",     "
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 17688ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS default trocado de 6 horas para 0, invalidando cache imediato e forçando requisições repetidas às APIs externas, causando lentidão e falhas no site.",   "file": "backend/src/services/gameCoverService.js", 
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 794ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "Ordenação invertida nas estatísticas: a linha introduzida troca a ordenação descendente por ascendente, gerando ranking errado.",   "file": "backend/src/services/hermesService.js",   "fix_type": "code_patch",   "patch": {   
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 16951ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "Função hasBlockedSource em gameCoverService.js teve sua lógica invertida: a exclusão do '!' antes da condição original bloqueou todos os candidatos, exceto os de fonte social/fanart, impedindo que covers legítimos (SteamGrid
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 5006ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Bug de lógica invertida no middleware CORS: a condição `!allowedOrigins.has(origin)` permite requisições de origens NÃO autorizadas, enquanto origens autorizadas são bloqueadas. O comportamento correto é permitir apenas orig
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 11528ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "Linha 84 de backend/src/app.js: express.json({ limit: \"1b\" }) redefine o limite de payload para 1 byte, rejeitando qualquer requisição POST/PATCH com corpo maior que 1 byte. Causa direta: troca acidental de \"1mb\" para \"
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 917ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
```json {   "diagnosis": "Condição de autenticação invertida; comparação usa == ao invés de !=, permitindo token inválido passar.",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "if (!expectedTok
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11912ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "A linha 47 do arquivo backend/src/services/normalizer.js teve o truncamento do summary alterado de .slice(0, 280) para .slice(0, 0), resultando em campos summary vazios e quebrando a exibição do site no frontend.",   "file":
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 2252ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok, invertido
```
```json {   "diagnosis": "isHealthy retorna negação de response.ok, invertendo lógica e marcando respostas saudáveis como falha",   "file": "front/assets/js/config.js",   "fix_type": "code_patch",   "patch": {     "search": "return !response.ok;",   
```


