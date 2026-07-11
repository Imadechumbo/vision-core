# Vision Core — Stress Test V3 Results

Data: 2026-07-11T15:15:48.132Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 6833ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6094ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, finally
```
```json {   "diagnosis": "função fetchJson() em gameCoverService.js: clearTimeout(timer) foi comentado no bloco finally, impedindo o cancelamento do timer de timeout. Isso pode causar vazamento de recursos e comportamentos imprevisíveis após requisiç
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1159ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "Bloco catch foi alterado para lançar exceção em vez de retornar fallback, provocando erro ao ler o cache.",   "file": "backend/src/services/cacheService.js",   "fix_type": "code_patch",   "patch": {     "search": "catch (e) 
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 768ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260, delay
```
```json {   "diagnosis": "Timeout de ocultação do container foi alterado de 260 ms para 0 ms, removendo a animação de colapso e causando desaparecimento abrupto do feed.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 22757ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "A ordenação por confiança em rankGameCoverCandidates está invertida: `a.confidence - b.confidence` ordena do menor para o maior, mas o esperado é do maior para o menor (itens com maior confiança primeiro).",   "file": "backe
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1429ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "linha de await foi comentada, impedindo a espera pela configuração necessária antes de iniciar o feed",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "search": "// await (window.__TNG_CON
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 701ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, latest
```
```json {   "diagnosis": "Typo in API endpoint path: '/api/nwes/latest' should be '/api/news/latest', causing the fetch to fail.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "search": "this.fetchJson('/api/nwes
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1811ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "O bug foi introduzido na função safeLimit, onde o valor máximo permitido foi alterado de 120 para 0, causando um erro de lógica.",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   "patch": { "searc
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 18828ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS com fallback 0 faz cache expirar imediatamente, causando múltiplas requisições a APIs externas e degradação de performance.",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 927ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score, invertido
```
```json {   "diagnosis": "Ordenação invertida dos resultados; a linha alterada troca a ordenação decrescente (b.score - a.score) por ascendente (a.score - b.score), fazendo com que agentes com maior pontuação fiquem ao final do ranking.",   "file": "
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 23610ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "hasBlockedSource retorna true quando a fonte NÃO é social/fanart (inversão lógica), permitindo fontes bloqueadas. A condição correta deve retornar true se a fonte é social ou fanart para bloquear.",   "file": "backend/src/se
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 3855ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "CORS middleware inverte a verificação de origens permitidas, bloqueando requisições válidas",   "file": "backend/src/app.js",   "fix_type": "code_patch",   "patch": {     "search": "if (origin && !allowedOrigins.has(origin))
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1778ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "Limite de payload JSON definido como \"1b\" (1 byte) impede recepção de corpos maiores, quebrando rotas que enviam JSON.",   "file": "backend/src/app.js",   "fix_type": "code_patch",   "patch": {     "search": "app.use(expre
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 2014ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
```json {   "diagnosis": "Condição de autenticação de refresh token está invertida, permitindo acessos não autorizados",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "if (!expectedToken || candi
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1716ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "Slice de string truncado incorretamente em normalizeFeedItem, afetando a formatação do resumo",   "file": "backend/src/services/normalizer.js",   "fix_type": "code_patch",   "patch": { "search": ".slice(0, 0);", "replace": "
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 15045ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok, fallback
```
```json {   "diagnosis": "Função isHealthy em front/assets/js/config.js retorna !response.ok em vez de response.ok, invertendo a lógica de verificação de saúde. Isso faz com que endpoints saudáveis (status 200) sejam tratados como não saudáveis e end
```


