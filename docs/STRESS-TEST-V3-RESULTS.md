# Vision Core — Stress Test V3 Results

Data: 2026-07-10T19:13:19.959Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 14780ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 11764ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, finally
```
```json {   "diagnosis": "Linha clearTimeout(timer) foi comentada no finally do fetchJson, impedindo o cancelamento do timer e causando vazamento de memória e timeout não gerenciado.",   "file": "backend/src/services/gameCoverService.js",   "fix_type
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 875ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "O bloco catch foi alterado para lançar erro em vez de retornar fallback, fazendo com que leituras de cache falhem quando o arquivo está ausente ou corrompido.",   "file": "backend/src/services/cacheService.js",   "fix_type":
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 14577ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260, delay
```
```json {   "diagnosis": "Linha do setTimeout em hideEmptyContainer foi alterada de 260ms para 0ms, removendo o delay necessário para a animação de colapso (feed-block-collapsing) ser renderizada antes de ocultar o container. Isso causa um desapareci
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 22856ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "A ordenação dos candidatos em rankGameCoverCandidates está invertida: o diff mostra que a linha correta era `b.confidence - a.confidence` (decrescente), mas foi trocada para `a.confidence - b.confidence` (crescente). Isso fa
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13117ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "A linha `await (window.__TNG_CONFIG_READY__ || Promise.resolve());` foi comentada, removendo a espera pela configuração antes de `init()`. Isso causa que o feed seja inicializado sem os dados de configuração, gerando falhas 
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 36565ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, 404, latest
```
```json {   "diagnosis": "Typo na URL da API: '/api/nwes/latest?limit=18' em vez de '/api/news/latest?limit=18', causando falha na requisição da seção 'Últimas notícias'.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": 
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7456ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit sempre retorna 0 devido a Math.min(parsed, 0), zerando todos os limits e deixando o site sem dados.",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "return Mat
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 22910ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS foi alterado de 6 horas (6 * 60 * 60 * 1000) para 0, fazendo com que o cache expire imediatamente após cada inserção. Isso força uma nova requisição às APIs externas a cada chamada de resolveGameCover, cau
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 22887ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "Em calculateRanking, o método sort usa `a.score - b.score` (ordem crescente), mas deveria ser `b.score - a.score` para ordenação decrescente (do maior score para o menor), que é a ordem esperada para um ranking.",   "file": 
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7305ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "hasBlockedSource retorna true para fontes seguras e false para social/fanart — lógica invertida pelo operador ! aplicado erroneamente na linha 89",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_pa
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 10038ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Condição CORS invertida: allowedOrigins.has(origin) foi trocado por !allowedOrigins.has(origin), bloqueando origens permitidas (incluindo o próprio site) e liberando origens não autorizadas.",   "file": "backend/src/app.js",
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 13601ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json
```
```json {   "diagnosis": "express.json limit foi alterado de 1mb para 1b, impedindo o parsing de qualquer requisição com corpo JSON maior que 1 byte.",   "file": "backend/src/app.js",   "fix_type": "code_patch",   "patch": {     "search": "app.use(ex
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13371ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
```json {   "diagnosis": "A condição do if em requireRefreshAuth foi invertida de 'candidate !== expectedToken' para 'candidate === expectedToken', fazendo com que requisições com token correto sejam rejeitadas e requisições sem token ou com token in
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8005ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "Linha 47 do diff: `+).slice(0, 0);` trunca a string `summary` para 0 caracteres, tornando todo resumo vazio. O código correto era `).slice(0, 280);`",   "file": "backend/src/services/normalizer.js",   "fix_type": "code_patch
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 16368ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "Função isHealthy em front/assets/js/config.js retorna !response.ok em vez de response.ok, invertendo a lógica de verificação de saúde da API. A API retorna 200 com JSON válido, mas isHealthy interpreta response.ok = true com
```


