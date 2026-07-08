# Vision Core — Stress Test V3 Results

Data: 2026-07-08T22:29:51.157Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 10524ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 9014ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer
```
```json {   "diagnosis": "A linha `clearTimeout(timer);` foi comentada, impedindo o cancelamento do timer de timeout. Isso vaza timers ativos, podendo causar execuções tardias e memory leaks.",   "file": "backend/src/services/gameCoverService.js",   
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 9906ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "readJson( ) joga exceção em vez de retornar fallback quando o arquivo de cache não existe ou está corrompido, quebrando toda leitura de cache (news, imagens, traduções) — o site recebe erro 500 ao tentar acessar dados cachea
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9185ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260
```
```json {   "diagnosis": "Timeout de collapse reduzido de 260ms para 0ms, removendo a animação visual e causando desaparecimento abrupto do container.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "search": "   
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10885ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "Em rankGameCoverCandidates, a ordenação final por confidence foi invertida: ordena crescente (a.confidence - b.confidence) em vez de decrescente (b.confidence - a.confidence), fazendo com que candidatos de menor confiança se
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9869ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "Linha de espera pela config (__TNG_CONFIG_READY__) foi comentada no DOMContentLoaded, removendo a sincronização necessária para que a inicialização do TechNetGameFeeds ocorra após a configuração estar pronta. Isso pode causa
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7455ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, 404, latest
```
```json {   "diagnosis": "Typo na URL '/api/nwes/latest?limit=18' — 'nwes' deve ser 'news'. Isso faz a requisição falhar (404) e o site não carrega as últimas notícias.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": { 
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 15493ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit() retorna Math.min(parsed, 0) em vez de Math.min(parsed, 120), forçando limite a sempre 0 e quebrando todas as rotas que usam o parâmetro limit.",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_p
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11803ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS com fallback 0 desativa cache — cada requisição faz chamadas externas sem cache, causando lentidão e possíveis timeouts no carregamento de capas.",   "file": "backend/src/services/gameCoverService.js",   "
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10272ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score, invertido
```
```json {   "diagnosis": "Sorting order invertido: a ranking está sendo ordenada do menor para o maior score (ascendente) quando deveria ser do maior para o menor (descendente), fazendo com que o pior agente apareça primeiro e o melhor por último.", 
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9143ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "hasBlockedSource introduziu inversão lógica: antes retornava true se fonte era bloqueada (social/fanart), agora retorna true se NÃO é bloqueada, invertendo o comportamento de filtragem.",   "file": "backend/src/services/game
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 8658ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Condição CORS invertida no middleware de CORS: `!allowedOrigins.has(origin)` faz com que origens NÃO autorizadas recebam o header Access-Control-Allow-Origin, enquanto origens autorizadas são bloqueadas.",   "file": "backend
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 12253ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "O limit do body parser foi alterado de 1mb para 1b (1 byte) conforme diff fornecido (§53), fazendo com que o servidor rejeite requisições POST com corpo maior que 1 byte (ex.: payloads JSON de formulários de contato, newslet
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10251ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
MISSÃO RECEBIDA Tipo: bug fix Risco: crítico Escopo: backend/src/routes/newsRoutes.js  HERMES - RCA: condição de autorização invertida causa negação de refresh para tokens válidos - Regra R6 não aplicável (sem assets) - Regra §53 aplicada: foco no di
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 5523ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "A linha de slice do summary foi alterada de 280 para 0, resultando em resumo vazio para todos os itens do feed.",   "file": "backend/src/services/normalizer.js",   "fix_type": "code_patch",   "patch": {     "search": "  ).sl
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 18156ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "No arquivo front/assets/js/config.js, na função isHealthy, a linha 'return !response.ok;' foi introduzida como bug (linha + no diff). A função deve retornar true quando a resposta for bem-sucedida (response.ok true), mas ret
```


