# Vision Core — Stress Test V3 Results

Data: 2026-06-12T01:31:11.929Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 12714ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 21282ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
```json {   "diagnosis": "No bloco finally da função fetchJson, a linha clearTimeout(timer); foi comentada, impedindo o cancelamento do timer após a conclusão da requisição. Isso pode causar vazamento de timeouts e execução desnecessária de controlle
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 20678ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "O cache de arquivos não existir causa throw Error('Cache read failed: ...'), quebrando o site ao invés de retornar fallback silenciosamente. O DIFF mostra que catch (e) { throw new Error(...) } substituiu catch { return fall
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7144ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260, delay
```
```json {   "diagnosis": "O timeout de 260ms no hideEmptyContainer foi reduzido para 0ms, removendo o delay necessário para a animação CSS 'feed-block-collapsing' completar sua transição antes de ocultar o container. Isso causa desaparecimento abrupt
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 19343ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, invertido, b.confidence
```
```json {   "diagnosis": "rankGameCoverCandidates sorting comparator invertido: linha 245 mudou de b.confidence - a.confidence (descendente, correto) para a.confidence - b.confidence (ascendente, bug). Isso faz com que candidatos de menor confiança s
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12461ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "A linha `await (window.__TNG_CONFIG_READY__ || Promise.resolve());` foi comentada, removendo a espera pela configuração global antes da inicialização do feeds. Isso faz com que `init()` seja chamado sem que o objeto de confi
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 10374ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, latest
```
```json {   "diagnosis": "Typo na URL da API em feeds.js: '/api/nwes/latest?limit=18' deve ser '/api/news/latest?limit=18' — causa falha na requisição de últimas notícias.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch":
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 16244ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "Linha 10: return Math.min(parsed, 0) faz safeLimit retornar sempre 0, zerando limite em todas as queries de notícias (latest, featured, home, month, category, source, game-search)",   "file": "backend/src/routes/newsRoutes.j
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13206ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS foi alterado de 6 horas (6*60*60*1000) para 0, desativando efetivamente o cache de capas. Isso força requisições externas a cada chamada, sobrecarregando APIs e degradando performance do site.",   "file": 
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12299ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "A ordenação do ranking em calculateRanking foi invertida: .sort((a, b) => a.score - b.score) ordena do menor para o maior score, mas o correto é do maior para o menor (b.score - a.score). Isso faz com que o site exiba agente
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9287ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "A negação `!` foi introduzida na linha que verifica fontes bloqueadas, invertendo a lógica: agora `hasBlockedSource` retorna `true` para fontes que NÃO são 'social' ou 'fanart', aceitando fontes indesejadas e bloqueando as v
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 12306ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Condição CORS invertida na linha 56: `!allowedOrigins.has(origin)` faz com que origens não permitidas recebam cabeçalho Access-Control-Allow-Origin, enquanto origens permitidas (como technetgame.com.br) não o recebem, causan
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 12883ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "backend/src/app.js linha 85: express.json({ limit: \"1b\" }) — limit de 1 byte impede requisições JSON com corpo, causando erro 413 ou payload rejeitado em todas as rotas POST/PUT/PATCH. O diff mostra que o valor correto '1m
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12429ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
```json {   "diagnosis": "Bug de lógica em requireRefreshAuth: condição do if invertida. O código atual faz `if (!expectedToken || candidate === expectedToken)` e retorna 401, bloqueando TODAS as requisições de refresh — mesmo com token válido. A con
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 901ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, 280, vazio
```
```json {   "diagnosis": "A função que gera o resumo corta a string em 0 caracteres, resultando em resumo vazio. O limite de slice foi alterado de 280 para 0, revertendo para o valor correto.",   "file": "backend/src/services/normalizer.js",   "fix_t
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9878ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok, invertido
```
```json {   "diagnosis": "isHealthy() retorna valor invertido. O diff mostra que a linha foi alterada de `return response.ok` (correto) para `return !response.ok` (incorreto). Com isso, endpoints saudáveis (status 200) são considerados não saudáveis,
```


