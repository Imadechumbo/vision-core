# Vision Core — Stress Test V3 Results

Data: 2026-07-09T14:51:15.524Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 10931ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 12169ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
```json {   "diagnosis": "No método fetchJson, o timer foi comentado, impedindo o cancelamento do timeout após a requisição. Isso causa vazamento de timer e potencial execução de abort desnecessário.",   "file": "backend/src/services/gameCoverService
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6195ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "A função readJson teve seu tratamento de erro alterado de retornar fallback para lançar exceção, fazendo com que qualquer falha de leitura de cache propague erro para o site.",   "file": "backend/src/services/cacheService.js
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8267ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260
```
```json {   "diagnosis": "Timeout de 260ms para ocultar container foi reduzido para 0ms, removendo o tempo para a animação CSS 'feed-block-collapsing' ser executada, resultando em desaparecimento instantâneo sem transição visual.",   "file": "front/a
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 17219ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "Linha 245 em rankGameCoverCandidates, diff mostra inversão da ordenação: antes descendente (b.confidence - a.confidence), agora ascendente (a.confidence - b.confidence). Isso faz com que o candidato selecionado seja o de men
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 829ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "linha comentada impede await de config, causa inicialização prematura",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "search": "// await (window.__TNG_CONFIG_READY__ || Promise.resolve()
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 15338ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, 404, latest
```
```json {   "diagnosis": "Typo na URL do endpoint /api/news/latest - escrito 'nwes' em vez de 'news', causando erro 404 na requisição da primeira chamada em fetchHomePayloadFallback.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 13967ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit sempre retorna 0 porque Math.min(parsed, 0) limita qualquer valor positivo a 0, fazendo todas as queries de notícias retornarem 0 itens",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9013ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS com valor padrão 0 desativa o cache de capas, forçando requisições externas a cada chamada e degradando performance (linha 12 do arquivo).",   "file": "backend/src/services/gameCoverService.js",   "fix_typ
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 16404ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "Ordenação incorreta no ranking — .sort((a, b) => a.score - b.score) ordena do menor para o maior score, mas o ranking deve ser decrescente (maior score primeiro). O código correto era .sort((a, b) => b.score - a.score).",   
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13573ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
.  Also note the user said "o site está com problema" which implies the bug is causing issues. We'll address that.  Now, produce final answer.```json {   "diagnosis": "Função hasBlockedSource foi invertida com !() no diff: agora retorna true quando a
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 10640ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Inversão da lógica de validação de origem CORS: o operador `!` foi adicionado, fazendo com que o servidor aceite origens NÃO autorizadas e rejeite as autorizadas, quebrando o acesso legítimo ao site.",   "file": "backend/src
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 9898ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "Backend configurado com limit de 1 byte para JSON body (express.json({ limit: '1b' })), impedindo qualquer requisição POST/PUT/PATCH com JSON payload — incluindo formulários de contato, newsletter, e todas as rotas de API qu
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 15386ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
```json {   "diagnosis": "Bug na função requireRefreshAuth: condição invertida na linha 25 do arquivo newsRoutes.js. A condição alterada de 'candidate !== expectedToken' para 'candidate === expectedToken' faz com que a requisição seja rejeitada (401)
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6700ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280
```
```json {   "diagnosis": "Summary truncation bug: line 47 of normalizer.js changed from .slice(0,280) to .slice(0,0), causing all summaries to be empty strings.",   "file": "backend/src/services/normalizer.js",   "fix_type": "code_patch",   "patch": 
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8361ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "Bug introduzido na função isHealthy: a linha `return !response.ok;` inverte o resultado do health check. Originalmente `return response.ok;` retorna true quando a resposta HTTP é bem-sucedida; com a inversão, endpoints saudá
```


