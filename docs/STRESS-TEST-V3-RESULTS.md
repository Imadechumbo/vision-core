# Vision Core — Stress Test V3 Results

Data: 2026-07-10T14:16:52.435Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 12391ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 9712ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
MISSÃO RECEBIDA Tipo: bug fix Risco: baixo Escopo: backend/src/services/gameCoverService.js  HERMES - Contexto fornecido via diff + arquivo completo. - Regras de assets não se aplicam (nenhum asset referenciado). - §53 aplicado: foco exclusivo nas li
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 4238ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "No diff, a função readJson perdeu o fallback (catch sem parâmetro vira catch(e) com throw). No código atual, a linha catch (e) { throw new Error(...) } já substituiu o fallback — o bug está no diff, a versão atual reflete o 
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 16391ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260
```
```json {   "diagnosis": "Timeout de collapse foi reduzido de 260ms para 0ms, eliminando a animação visual de transição do feed-block.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "search": "        }, 0);",   
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7651ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "Ordenação dos candidatos de cover por confiança está invertida: `a.confidence - b.confidence` ordena ascendente (menor para maior), mas deve ser descendente (maior para menor) para selecionar o candidato com maior confiança.
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7182ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "A linha que aguarda a configuração global (`__TNG_CONFIG_READY__`) foi comentada, fazendo com que `init()` execute sem aguardar a configuração, o que pode quebrar o carregamento dos feeds.",   "file": "front/assets/js/feeds.
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 12507ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, latest
```
```json {   "diagnosis": "Typo no path da API das últimas notícias: '/api/nwes/latest?limit=18' (com 'nwes' em vez de 'news') no método fetchHomePayloadFallback. Essa rota não existe, causando falha silenciosa no fallback e impedindo o carregamento d
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 8729ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "A função safeLimit em backend/src/routes/newsRoutes.js retorna Math.min(parsed, 0) em vez de Math.min(parsed, 120), fazendo com que todas as rotas que usam limit retornem 0 itens — site não carrega notícias.",   "file": "bac
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11430ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS foi alterado de 6 horas (6*60*60*1000ms) para 0, desabilitando o cache. Isso faz com que cada consulta de capa de jogo resulte em chamadas de API, causando lentidão e possíveis rate limits no site.",   "fi
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 23245ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "Ordenação invertida no ranking: .sort((a, b) => a.score - b.score) ordena do menor para o maior, mas o ranking deve exibir maiores scores primeiro (b.score - a.score)",   "file": "backend/src/services/hermesService.js",   "f
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11479ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "hasBlockedSource retorna false para fontes social/fanart devido à negação '!' adicionada incorretamente, fazendo com que essas fontes sejam aceitas como candidatas a capa.",   "file": "backend/src/services/gameCoverService.j
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 16939ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "A condição do middleware CORS foi invertida: ao trocar `allowedOrigins.has(origin)` por `!allowedOrigins.has(origin)`, o cabeçalho Access-Control-Allow-Origin passou a ser setado para TODAS as origens exceto as permitidas — 
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7587ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "O limite do body JSON foi reduzido de 1 megabyte ('1mb') para 1 byte ('1b'), rejeitando qualquer requisição POST com payload JSON maior que 1 byte. Causa erro 413 ou parse failure em todas as rotas que recebem JSON.",   "fil
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9034ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, invertido, candidate
```
```json {   "diagnosis": "A condição de autorização para refresh foi invertida no diff: o operador `!==` foi trocado por `===`, fazendo com que tokens corretos sejam rejeitados (401) e tokens incorretos sejam aceitos.",   "file": "backend/src/routes/
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7385ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "O resumo (summary) de cada item de feed está sendo truncado para string vazia devido à mudança de .slice(0, 280) para .slice(0, 0) na linha 47, resultando em summaries vazios no site.",   "file": "backend/src/services/normal
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 32358ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "Inversão lógica em isHealthy: `return !response.ok;` faz com que a função retorne `false` quando a API responde com status 200-299 (response.ok == true). Isso impede que candidatos saudáveis sejam selecionados, causando falh
```


