# Vision Core — Stress Test V3 Results

Data: 2026-07-09T19:55:14.541Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 12889ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7211ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, finally
```
```json {   "diagnosis": "Linha clearTimeout(timer) foi comentada em fetchJson, impedindo o cancelamento do timer de timeout e causando memory leak e possíveis execuções assíncronas após a requisição.",   "file": "backend/src/services/gameCoverServic
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 10709ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "O bug está no bloco catch da função readJson (linha 17-20). O código original (linhas com '-') retornava fallback em caso de erro de leitura/parse do cache. O código atual (linhas com '+') lança um erro, que propaga e quebra
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8641ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260
```
```json {   "diagnosis": "O timeout de 260ms foi alterado para 0ms em hideEmptyContainer, impedindo a animação de colapso (feed-block-collapsing) de executar, resultando em desaparecimento instantâneo do container sem transição visual.",   "file": "f
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7751ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, b.confidence
```
```json {   "diagnosis": "Na função rankGameCoverCandidates, a ordenação por confiança foi invertida de decrescente (b.confidence - a.confidence) para crescente (a.confidence - b.confidence), fazendo com que o candidato de menor confiança seja seleci
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8524ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "A linha de espera pela configuração global __TNG_CONFIG_READY__ foi comentada, removendo a sincronização necessária antes de iniciar os feeds. Isso faz com que TechNetGameFeeds.init() execute antes da configuração, resultand
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 23482ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, 404, latest
```
```json {   "diagnosis": "Erro de digitação (typo) no endpoint da API: '/api/nwes/latest' em vez de '/api/news/latest'. Isso causa requisição a URL inexistente, resultando em erro 404 e falha na seção 'Últimas notícias'.",   "file": "front/assets/js/
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 4800ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit retorna sempre 0 porque Math.min(parsed, 0) zera qualquer limite positivo, causando retorno vazio em todas as rotas que usam safeLimit (/latest, /month, /category, /source, /game-search). O valor correto é 120 (lim
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 14768ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS foi alterado de 6 horas (6*60*60*1000) para 0, invalidando o cache imediatamente e forçando requisições externas a cada chamada, causando lentidão e falhas no carregamento de capas.",   "file": "backend/sr
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10246ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score, invertido
```
```json {   "diagnosis": "calculateRanking em hermesService.js ordena por score crescente (a.score - b.score) em vez de decrescente (b.score - a.score), fazendo o ranking exibir agentes de menor score primeiro.",   "file": "backend/src/services/herme
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11469ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "hasBlockedSource function has inverted logic due to added negation operator, causing social and fanart sources to be accepted instead of blocked.",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_pa
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 21825ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Condição de CORS invertida: negação lógica (!) faz com que origens permitidas sejam rejeitadas e origens não permitidas sejam aceitas, quebrando o controle de acesso.",   "file": "backend/src/app.js",   "fix_type": "code_pat
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 11109ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "O limite de corpo JSON foi reduzido de 1MB para 1 byte (1b), quebrando todas as requisições POST com corpo JSON. O site não consegue receber dados de formulários, APIs ou qualquer payload.",   "file": "backend/src/app.js",  
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 21530ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, invertido, auth, candidate
```
```json {   "diagnosis": "Condição de autenticação invertida em requireRefreshAuth. O operador `candidate === expectedToken` faz com que tokens válidos (que batem com o esperado) retornem 401 Unauthorized, enquanto tokens inválidos (que não batem) pa
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9179ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "O summary da notícia está sendo truncado para string vazia (.slice(0, 0)), fazendo com que todos os itens retornem summary vazio ou o fallback genérico.",   "file": "backend/src/services/normalizer.js",   "fix_type": "code_p
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 22097ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "A função isHealthy em front/assets/js/config.js foi alterada na linha 48 para retornar !response.ok em vez de response.ok, invertendo a lógica de verificação de saúde da API. O endpoint /api/health retorna 200 com 'ok':true,
```


