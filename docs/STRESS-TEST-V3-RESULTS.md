# Vision Core — Stress Test V3 Results

Data: 2026-07-13T23:24:41.511Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 8476ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 17192ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
```json {   "diagnosis": "A linha 'clearTimeout(timer);' foi comentada dentro do bloco finally da função fetchJson, impedindo o cancelamento do timer do AbortController. Isso provoca memory leak e pode causar abort tardio desnecessário após a requisi
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1112ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "O bloco catch lança erro ao invés de retornar fallback, interrompendo a leitura do cache quando o arquivo não existe.",   "file": "backend/src/services/cacheService.js",   "fix_type": "code_patch",   "patch": {     "search":
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 729ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260
```
```json {   "diagnosis": "A função hideEmptyContainer usa setTimeout com intervalo 0ms ao invés de 260ms, removendo a animação de colapso que causa fechamento abrupto dos containers de feed.",   "file": "front/assets/js/feeds.js",   "fix_type": "code
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 17206ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, b.confidence
```
```json {   "diagnosis": "rankGameCoverCandidates ordena por confiança crescente (a.confidence - b.confidence) em vez de decrescente (b.confidence - a.confidence), priorizando candidatos com menor confiança e degradando a seleção de capa no site.",  
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 644ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "A linha de await que garante que a configuração esteja pronta foi comentada, impedindo a espera correta antes da inicialização.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "search": "
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 13972ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, 404, latest
```
```json {   "diagnosis": "Erro de digitação no path da API: '/api/nwes/latest?limit=18' → '/api/news/latest?limit=18'. O path incorreto causa erro 404 ao buscar a seção 'Últimas notícias', fazendo com que a seção fique vazia ou exiba fallback incorre
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 812ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit caps the limit at 0, making all paginated queries return empty results; the original code should cap at 120",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "re
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10464ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS definido como 0 (fallback) desativa o cache, causando requisições repetidas e degradação de performance no site — o diff introduziu este bug ao trocar o fallback de 6 horas para 0 ms.",   "file": "backend/
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1045ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "Ordenação invertida no ranking: a lista foi classificada em ordem crescente ao invés de decrescente, alterando a prioridade dos agentes.",   "file": "backend/src/services/hermesService.js",   "fix_type": "code_patch",   "pat
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 16569ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "Bug de inversão lógica em hasBlockedSource(). O operador ! foi adicionado na linha retornada, invertendo a condição: fontes não-bloqueadas (ex: steamgriddb, rawg) agora são tratadas como bloqueadas e vice-versa, impedindo a 
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1401ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Condição CORS invertida impede que origens permitidas recebam cabeçalhos corretos. Linha 56 usa negação (!), deve ser removida.",   "file": "backend/src/app.js",   "fix_type": "code_patch",   "patch": {     "search": "if (or
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 33095ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "Diff introduzido alterou o limite do body parser JSON de 1MB para 1 byte (1b), impedindo requisições com qualquer payload JSON. Linha 87 de backend/src/app.js.",   "file": "backend/src/app.js",   "fix_type": "code_patch",   
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 778ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, candidate
```
```json {   "diagnosis": "A verificação de token está invertida, permitindo acesso quando o token corresponde ao esperado. Linha bugada: if (!expectedToken || candidate === expectedToken) {",   "file": "backend/src/routes/newsRoutes.js",   "fix_type"
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 616ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "Resumo truncado para zero caracteres devido a slice(0, 0) em normalizeFeedItem, resultando em sumário vazio",   "file": "backend/src/services/normalizer.js",   "fix_type": "code_patch",   "patch": {     "search": "    ).slic
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11503ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok, fallback
```
 is defined from fetch. So the bug is the inversion.  Let's produce the JSON. Use code_patch with search/replace. Search should be the line as present in the file (the buggy line). The file currently has the buggy line: "return !response.ok;". So sea
```


