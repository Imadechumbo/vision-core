# Vision Core — Stress Test V3 Results

Data: 2026-07-09T22:37:40.331Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 14 |
| FAIL | 1 |
| Taxa de acerto | 93% |
| Tempo médio | 14401ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 4 | 1 | 80% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 14432ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, finally
```
```json {   "diagnosis": "Na função fetchJson, o clearTimeout(timer) foi comentado, impedindo o cancelamento do timer. Isso causa vazamento de recursos e potencial erro se o timer disparar após a conclusão da requisição.",   "file": "backend/src/serv
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 23736ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "catch handler foi alterado de retornar fallback (comportamento tolerante a falhas de cache) para lançar exceção, quebrando o fluxo de recuperação quando o cache não existe ou está corrompido.",   "file": "backend/src/service
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 0ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** _nenhuma_
```
(sem resposta)
```
**Erro:** Request failed with status code 503

### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12531ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, b.confidence
```
```json {   "diagnosis": "A ordenação dos candidatos em rankGameCoverCandidates foi invertida: a linha 'return a.confidence - b.confidence;' (introduzida como bug) coloca menor confiança primeiro, prejudicando a seleção da melhor capa.",   "file": "b
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9867ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "O await que aguarda a configuração global (window.__TNG_CONFIG_READY__) foi comentado, fazendo com que window.TechNetGameFeeds?.init() execute antes da configuração estar disponível, o que pode quebrar funcionalidades do sit
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6868ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, latest
```
```json {   "diagnosis": "Typo no endpoint da API: '/api/nwes/latest?limit=18' em vez de '/api/news/latest?limit=18' (linha 94 da função fetchHomePayloadFallback), causando falha na requisição da seção 'Últimas notícias'.",   "file": "front/assets/js
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 13592ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit retorna Math.min(parsed, 0) em vez de Math.min(parsed, 120), fazendo com que o limite de resultados seja sempre 0, o que impede a exibição de notícias nas rotas que usam limit.",   "file": "backend/src/routes/newsR
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9681ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
MISSÃO RECEBIDA Tipo: bug fix Risco: médio Escopo: backend/src/services/gameCoverService.js  HERMES - Contexto: diff fornecido com evidência clara do bug - Regras aplicadas: §53 (foco exclusivo nas linhas do diff)  SCANNER - Arquivo: backend/src/serv
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13053ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score, invertido
```
```json {   "diagnosis": "Linha 176 do ranking foi alterada de sort decrescente (b.score - a.score) para sort crescente (a.score - b.score), invertendo a ordem correta que o sistema espera — o ranking deve exibir agentes com maior score primeiro.",  
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11007ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "hasBlockedSource foi invertida com operador ! — fontes social/fanart agora passam como permitidas e fontes normais como bloqueadas, quebrando a filtragem de capas.",   "file": "backend/src/services/gameCoverService.js",   "f
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 23475ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Condição de CORS invertida no middleware de backend: `!allowedOrigins.has(origin)` libera origens não autorizadas e bloqueia as autorizadas, quebrando requisições cross-origin legítimas.",   "file": "backend/src/app.js",   "
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 14750ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "bug: limite de tamanho de JSON no middleware express.json foi alterado de 1mb para 1b, causando rejeição de requisições com corpo JSON maior que 1 byte (HTTP 413)",   "file": "backend/src/app.js",   "fix_type": "code_patch",
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 16139ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
```json {   "diagnosis": "Condição de autorização invertida: `candidate === expectedToken` rejeita requisições com token correto, impedindo login/refresh válido.",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   "patch": {
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12379ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280
```
```json {   "diagnosis": "slice(0, 0) no summary zera o tamanho máximo para 0, fazendo com que todo resumo seja truncado para string vazia — a intenção correta é manter 280 caracteres como limite.",   "file": "backend/src/services/normalizer.js",   "
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 20100ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "Bug de inversão lógica em isHealthy(): a troca de 'return response.ok' para 'return !response.ok' faz com que o health check retorne false para APIs saudáveis (HTTP 200), impedindo a seleção correta do backend e quebrando a 
```


