# Vision Core — Stress Test V3 Results

Data: 2026-06-12T05:53:36.277Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 8248ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 9601ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, finally
```
```json {   "diagnosis": "Timer not cancelled in fetchJson finally block; the clearTimeout call is commented out causing a potential resource leak.",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 39318ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "O bloco catch em readJson foi alterado de 'catch { return fallback; }' para 'catch (e) { throw new Error(...) }', fazendo com que erros de leitura do cache (arquivo inexistente, JSON inválido) lancem exceção em vez de retorn
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 693ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** 260, delay
```
```json {   "diagnosis": "Timeout para remoção de container foi reduzido de 260 ms para 0 ms, impedindo a animação de colapso e deixando o UI em estado inconsistente.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {   
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 2723ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, b.confidence
```
```json {   "diagnosis": "Ordenação dos candidatos usa ordem ascendente de confiança; deveria ser descendente para priorizar maior confiança",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "search"
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1791ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "Linha comentada impede await de __TNG_CONFIG_READY__, fazendo a inicialização ocorrer antes da configuração estar pronta",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "search": "// awai
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 14028ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, 404, latest
```
```json {   "diagnosis": "Digitação incorreta no path da API: '/api/nwes/latest?limit=18' (com 'nwes' em vez de 'news') na função fetchHomePayloadFallback, na linha 94 do arquivo front/assets/js/feeds.js. Isso faz com que a chamada à API de notícias 
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 796ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit sempre retorna 0 devido a Math.min(parsed, 0), impedindo limites adequados e resultando em respostas vazias.",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "r
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9586ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS alterado de 6 horas (6*60*60*1000) para 0, desativando o cache de capas de jogos. Isso força requisições externas a cada chamada, degradando desempenho do site.",   "file": "backend/src/services/gameCoverS
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9410ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "A ordenação do ranking foi invertida. O diff mostra que a função calculateRanking retornava os agentes em ordem decrescente de score (.sort((a, b) => b.score - a.score)) e foi alterada para ordem crescente (.sort((a, b) => a
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 5492ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "A negação invertida na função hasBlockedSource faz com que fontes bloqueadas retornem false em vez de true, permitindo imagens indesejadas.",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch", 
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 793ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Condição de CORS invertida impede origem permitida; linha 56 usa negação em vez de verificação positiva",   "file": "backend/src/app.js",   "fix_type": "code_patch",   "patch": {     "search": "if (origin && !allowedOrigins.
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 14156ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "Linha 85 em backend/src/app.js: express.json limit foi alterado de '1mb' para '1b', causando rejeição de todas as requisições JSON com corpo maior que 1 byte (erro 413 ou parse failure).",   "file": "backend/src/app.js",   "
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 761ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, candidate
```
```json {   "diagnosis": "Comparação de token invertida: linha usa 'candidate === expectedToken' em vez de '!==', impedindo autorização correta.",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "i
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13974ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "normalizeFeedItem trunca summary para 0 caracteres (.slice(0, 0)) em vez de 280, resultando em summaries vazios no feed do site",   "file": "backend/src/services/normalizer.js",   "fix_type": "code_patch",   "patch": {     "
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 596ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "Inversão lógica na verificação de saúde da API: a função isHealthy retorna !response.ok ao invés de response.ok, causando falha ao considerar respostas bem‑sucedidas como erro.",   "file": "front/assets/js/config.js",   "fix
```


