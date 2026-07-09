# Vision Core — Stress Test V3 Results

Data: 2026-07-09T06:45:14.167Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 15433ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 23695ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
```json {   "diagnosis": "No bloco finally da função fetchJson, a linha clearTimeout(timer) foi comentada, impedindo o cancelamento do timer de timeout. Isso causa vazamento de timer e potencial abort assíncrono após a conclusão da requisição.",   "f
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 13020ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "No arquivo backend/src/services/cacheService.js, a função readJson foi modificada incorretamente: o catch agora captura o erro e lança uma nova exceção, em vez de retornar o valor fallback. Isso quebra o fluxo de cache, faze
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11313ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260, delay
```
MISSÃO RECEBIDA Tipo: bug fix Risco: médio Escopo: front/assets/js/feeds.js  HERMES   - Contexto fornecido via diff e código do arquivo.   - Regra §53 aplicada (foco exclusivo no diff).   - Regra R3: arquivo não proibido.   - Regra R5: confidence >= 
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 36450ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "rankGameCoverCandidates em gameCoverService.js: ordenação ascendente por confidence (a.confidence - b.confidence) coloca o melhor candidato por último, fazendo find() selecionar o primeiro aceito que pode ser de menor confia
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 19465ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "flag init foi comentada — DOMContentLoaded dispara TechNetGameFeeds.init() sem aguardar __TNG_CONFIG_READY__, causando chamada prematura antes da configuração externa estar disponível (feed API endpoints podem estar indefini
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 18993ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, latest
```
```json {   "diagnosis": "Digitação em URL de API: '/api/nwes/latest?limit=18' (nwes) em vez de '/api/news/latest?limit=18' (news) na linha 94 do arquivo front/assets/js/feeds.js, causando falha na chamada de API da seção 'Últimas notícias'.",   "fil
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7348ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "function safeLimit caps limit at 0 instead of 120, causing all queries to return 0 items.",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "  return Math.min(parsed, 0);"
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13231ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS com fallback 0 anula o cache de capas, causando expiração imediata e requisições repetidas a cada consulta. A regressão foi introduzida ao alterar o valor padrão de 6 horas para 0.",   "file": "backend/src
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7721ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "O ranking de agentes está sendo ordenado em ordem ascendente (a.score - b.score) em vez de descendente (b.score - a.score), fazendo com que os agentes com menor pontuação apareçam primeiro, o que é incorreto para um ranking.
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 18215ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "hasBlockedSource retorna true para fontes confiáveis e false para fanart/social — inversão causada pelo !() adicionado no diff. Linha original: return source.includes('social') || source.includes('fanart') || type.includes('
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 12920ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Middleware CORS em backend/src/app.js inverteu a condição de validação de origem — `!allowedOrigins.has(origin)` permite qualquer origem não autorizada, quebrando a segurança do CORS e possivelmente causando bloqueios no sit
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 8450ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "Bug introduzido no Express JSON body parser: limit reduzido de '1mb' para '1b', causando rejeição de qualquer request com body maior que 1 byte — quebra todos os POSTs do site.",   "file": "backend/src/app.js",   "fix_type":
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 18884ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
MISSÃO RECEBIDA Tipo: bug fix Risco: alto Escopo: backend/src/routes/newsRoutes.js  HERMES ```json {   "diagnosis": "Condição invertida no middleware requireRefreshAuth: diff mostra que candidate !== expectedToken foi trocado para candidate === expec
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7612ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280
```
```json {   "diagnosis": "No normalizer.js, a função normalizeFeedItem usa slice(0, 0) no resumo, o que zera o comprimento do summary. Como resultado, todo item fica com o fallback 'Leia a cobertura completa em...' em vez do texto real.",   "file": "
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 14185ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "isHealthy retorna !response.ok (verdadeiro quando resposta HTTP não é 200), invertendo a lógica de health-check. A rota /api/health da API retorna status 200 com body { ok: true }, mas o código interpreta 200 como \"não saud
```


