# Vision Core — Stress Test V3 Results

Data: 2026-07-09T21:33:34.188Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 13690ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 21687ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, finally
```
```json {   "diagnosis": "Linha 286: clearTimeout(timer) foi comentado, impedindo o cancelamento do timer no bloco finally. Isso vaza um timer a cada requisição fetchJson, acumulando handles até o vazamento de memória e falha do servidor.",   "file":
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 10914ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "O catch (e) { throw new Error(...) } substituiu o catch { return fallback; }, fazendo com que erros de leitura de cache (arquivo ausente, JSON inválido) propaguem exceção em vez de retornar fallback, quebrando chamadas que e
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 34573ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260
```
MISSÃO RECEBIDA Tipo: bug fix   Risco: baixo   Escopo: front/assets/js/feeds.js (hideEmptyContainer)  HERMES   - Contexto: diff fornecido, arquivo real confirmado   - Regras: R5 (confidence 0.95), R3 (arquivo permitido), R6 (não se aplica)    SCANNER
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9605ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "A ordenação dos candidatos por confiança foi invertida (a.confidence - b.confidence) em vez de b.confidence - a.confidence, fazendo com que o candidato com menor confiança seja selecionado primeiro quando os demais critérios
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13942ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "Linha que aguardava configuração inicial (window.__TNG_CONFIG_READY__) foi comentada, causando inicialização prematura dos feeds antes da configuração estar disponível",   "file": "front/assets/js/feeds.js",   "fix_type": "c
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 15909ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, latest
```
```json {   "diagnosis": "Typo na URL da API: '/api/nwes/latest?limit=18' (nwes) impede carregamento da seção 'Últimas notícias' — corrigir para '/api/news/latest?limit=18'.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 8268ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "Função safeLimit em backend/src/routes/newsRoutes.js alterada para retornar 0 como limite máximo, causando que todas as chamadas (latest, month, game-search, category, source) retornem zero itens.",   "file": "backend/src/ro
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10350ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "O fallback padrão de COVER_CACHE_TTL_MS foi alterado de 6 horas para 0, desabilitando o cache de capas e forçando requisições repetidas às APIs externas.",   "file": "backend/src/services/gameCoverService.js",   "fix_type": 
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 14566ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "Ordenação do ranking invertida de decrescente para crescente no método calculateRanking, causando exibição incorreta dos agentes (menor relevância primeiro). A mudança no diff alterou b.score - a.score para a.score - b.score
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11793ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "hasBlockedSource foi invertida com negação '!', fazendo com que fontes 'social' e 'fanart' sejam aceitas em vez de bloqueadas. Isso permite covers de baixa qualidade ou não autorizados no site.",   "file": "backend/src/servi
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7635ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Condição de CORS invertida — negação (!) adicionada ao has() permite qualquer origem não listada e bloqueia origens autorizadas, quebrando requisições cross-origin legítimas.",   "file": "backend/src/app.js",   "fix_type": "
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7678ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "O limit do body parser JSON foi alterado de '1mb' (1 megabyte) para '1b' (1 byte), impedindo o processamento de qualquer requisição POST com corpo, quebrando todas as funcionalidades que dependem de payload (formulários, API
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7030ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
```json {   "diagnosis": "Função requireRefreshAuth em backend/src/routes/newsRoutes.js linha 27: condição do if foi invertida de `candidate !== expectedToken` para `candidate === expectedToken`, causando rejeição de requisições com token válido (401
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 18140ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "Bug introduzido no diff: summary estava truncado corretamente para 280 caracteres (.slice(0, 280)) e foi alterado para 0 caracteres (.slice(0, 0)), resultando em summary sempre vazio.",   "file": "backend/src/services/normal
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13263ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "Na função isHealthy, a linha `return !response.ok` inverte a lógica de verificação de saúde da API. O correto é retornar `response.ok` para indicar que o endpoint respondeu com status HTTP 2xx.",   "file": "front/assets/js/c
```


