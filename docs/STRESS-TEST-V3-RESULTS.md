# Vision Core — Stress Test V3 Results

Data: 2026-06-12T22:58:04.822Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 13038ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 14996ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
```json {   "diagnosis": "Na função fetchJson do arquivo gameCoverService.js, a linha que cancela o timeout (clearTimeout(timer)) foi comentada, impedindo a limpeza do timer. Isso causa vazamento de recursos e possível efeito colateral (abort após re
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 14927ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "O catch foi alterado de um silent fallback (retornar fallback) para lançar um erro (`throw new Error`), quebrando todas as funções que dependem de `readJson` retornar o fallback quando o arquivo de cache não existe.",   "fil
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8077ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260
```
```json {   "diagnosis": "Timeout reduzido de 260ms para 0ms na função hideEmptyContainer interrompe a animação CSS de collapse, resultando em ocultação abrupta e potencial quebra visual do layout do feed.",   "file": "front/assets/js/feeds.js",   "f
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11764ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, invertido, b.confidence
```
```json {   "diagnosis": "Em rankGameCoverCandidates, o comparador de ordenação foi invertido de b.confidence - a.confidence (decrescente) para a.confidence - b.confidence (crescente), fazendo com que candidatos com menor confiança sejam priorizados,
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 16456ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "A linha await (window.__TNG_CONFIG_READY__ || Promise.resolve()) foi comentada, removendo a espera pela configuração global __TNG_CONFIG_READY_ antes de chamar init(). Isso causa execução prematura de TechNetGameFeeds.init()
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 19735ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, 404, latest
```
```json {   "diagnosis": "Typo no endpoint '/api/nwes/latest?limit=18' na linha 94 de feeds.js. O caminho correto é '/api/news/latest?limit=18'. Erro causa fetch para rota inexistente, resultando em 404 e dados ausentes na seção 'Últimas notícias'.",
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 22180ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit() em backend/src/routes/newsRoutes.js:7 retorna Math.min(parsed, 0) ao invés de Math.min(parsed, 120), fazendo com que QUALQUER limite seja forçado a 0 — a rota GET /latest?limit=50 retorna 0 itens, quebrando a pag
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7294ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS foi alterado de 6 horas para 0, desativando efetivamente o cache de capas. Isso faz com que cada requisição de capa resulte em chamadas às APIs externas (RAWG, SteamGridDB), causando lentidão extrema, thro
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8152ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "A ordenação do ranking foi invertida de descendente (correto) para ascendente (incorreto), fazendo com que os agentes com menor pontuação apareçam primeiro. A mudança está na linha `.sort((a, b) => a.score - b.score);` que d
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 15543ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "Função hasBlockedSource em gameCoverService.js teve sua lógica invertida: introdução de '!' faz com que fontes legítimas (steamgriddb, rawg) sejam consideradas bloqueadas e fontes não confiáveis (social, fanart) sejam permit
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7033ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Header de CORS inverteu a condição de origem permitida: em vez de conceder acesso apenas a origens na whitelist, o servidor agora concede acesso a qualquer origem NÃO listada, bloqueando as origens legítimas (ex: technetgame
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 11082ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json
```
```json {   "diagnosis": "Mudança de '1mb' para '1b' no limite do body parser JSON deixa o servidor impossibilitado de aceitar qualquer requisição com corpo maior que 1 byte, quebrando todos os endpoints POST/PUT/PATCH.",   "file": "backend/src/app.j
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6477ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, invertido, auth, candidate
```
```json {   "diagnosis": "Inversão do operador de comparação na função requireRefreshAuth — candidate === expectedToken (ERRADO) em vez de candidate !== expectedToken (CORRETO) na linha 28 do arquivo backend/src/routes/newsRoutes.js",   "file": "back
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13846ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280
```
```json {   "diagnosis": "O bug foi introduzido ao alterar o slice do summary de .slice(0, 280) para .slice(0, 0) no arquivo backend/src/services/normalizer.js, linha 47. Isso causa truncamento total do resumo (summary = '') em todos os itens de feed
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 18002ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "Inversão lógica em isHealthy() — response.ok foi negado com !, fazendo com que um endpoint saudável (status 2xx) retorne false e o código pule para o próximo candidato, e um endpoint doente (status 5xx) retorne true, corromp
```


