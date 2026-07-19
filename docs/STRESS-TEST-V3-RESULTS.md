# Vision Core — Stress Test V3 Results

Data: 2026-07-19T00:42:22.003Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 12198ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 15788ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
```json {   "diagnosis": "Comentário da linha clearTimeout(timer) no bloco finally do fetchJson impede o cancelamento do timer, causando memory leak e potencial aborto de requisições futuras.",   "file": "backend/src/services/gameCoverService.js",   
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6899ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "O código antigo (linhas com -) retornava 'fallback' quando a leitura do cache falhava — comportamento tolerante a falhas. O código novo (linhas com +) lança uma exceção, quebrando a lógica de cache e fazendo o site falhar qu
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 23326ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260, delay
```
```json {   "diagnosis": "O timeout em hideEmptyContainer foi alterado de 260ms para 0ms, removendo a animação de recolhimento do feed (classe feed-block-collapsing é removida instantaneamente)",   "file": "front/assets/js/feeds.js",   "fix_type": "c
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11616ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
MISSÃO RECEBIDA Tipo: bug fix Risco: médio Escopo: backend/src/services/gameCoverService.js  HERMES - [status do contexto]: DIFF fornecido, arquivo completo disponível, evidência real. - [regras aplicadas]: §53 (foco exclusivo no DIFF), R5 (confidenc
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10046ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "Linha await (window.__TNG_CONFIG_READY__ || Promise.resolve()) foi comentada, impedindo que o init() do TechNetGameFeeds aguarde a configuração global antes de começar as hidratações.",   "file": "front/assets/js/feeds.js", 
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 17112ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, 404, latest
```
MISSÃO RECEBIDA Tipo: bug fix Risco: baixo Escopo: front/assets/js/feeds.js  HERMES - Contexto: DIFF e código fornecido - Regras aplicadas: §53, §115  SCANNER - Arquivo: front/assets/js/feeds.js - Linha afetada: 94 (linha com `+this.fetchJson('/api/n
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 13889ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit retorna Math.min(parsed, 0) que sempre resulta em 0 para parsed positivo, causando limite zero em todas as queries de notícias.",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   "patch":
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13415ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
MISSÃO RECEBIDA Tipo: bug fix Risco: baixo Escopo: `backend/src/services/gameCoverService.js`  HERMES - Status: completo - Regras aplicadas: §53, R5  SCANNER - Arquivo: `backend/src/services/gameCoverService.js` - Linha afetada: `const COVER_CACHE_TT
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12606ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score, invertido
```
```json {   "diagnosis": "O bug está na função calculateRanking (linha 176 do diff): a ordenação foi invertida de decrescente (b - a) para crescente (a - b), causando que a ordenação do ranking retorne os agentes com menor score primeiro, em vez do m
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9792ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "hasBlockedSource() foi invertida com operador !, fazendo com que fontes bloqueadas (social/fanart) sejam aceitas e fontes legítimas rejeitadas, quebrando a lógica de filtragem de covers.",   "file": "backend/src/services/gam
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7390ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Condição CORS invertida no middleware de app.js: a negação `!allowedOrigins.has(origin)` faz com que origens permitidas NÃO recebam cabeçalhos CORS, enquanto origens não permitidas os recebem — causando bloqueio de requisiçõ
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 11130ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "Line 84: express.json limit incorrectly set to '1b' (1 byte) instead of '1mb' (1 megabyte), causing rejection of all JSON request bodies larger than 1 byte.",   "file": "backend/src/app.js",   "fix_type": "code_patch",   "pa
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 21697ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
```json {   "diagnosis": "A condição de autorização em requireRefreshAuth está invertida: candidate === expectedToken retorna 401, mas deveria ser candidate !== expectedToken — usuários com token válido são bloqueados (401), e requisições sem token p
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 706ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "Resumo truncado a zero caracteres devido ao uso de .slice(0, 0) ao gerar o campo summary",   "file": "backend/src/services/normalizer.js",   "fix_type": "code_patch",   "patch": {     "search": "    ).slice(0, 0);",     "rep
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7551ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "função isHealthy retorna true quando resposta NÃO é ok (inversão lógica). O correto é retornar response.ok para indicar que o health check foi bem-sucedido.",   "file": "front/assets/js/config.js",   "fix_type": "code_patch"
```


