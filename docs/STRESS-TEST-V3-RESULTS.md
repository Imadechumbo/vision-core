# Vision Core — Stress Test V3 Results

Data: 2026-06-13T08:35:57.602Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 7207ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 2645ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, finally
```
```json {   "diagnosis": "clearTimeout(timer) foi comentado, impedindo o cancelamento do timer no bloco finally e gerando vazamento de recursos.",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "sea
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1547ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "readJson throws an error in the catch block instead of returning the provided fallback value, breaking callers that rely on fallback on read failure.",   "file": "backend/src/services/cacheService.js",   "fix_type": "code_pa
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 21374ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260, delay
```
```json {   "diagnosis": "O timeout foi reduzido de 260ms para 0ms, removendo o atraso necessário para a animação CSS de colapso, causando ocultação abrupta dos containers sem transição suave.",   "file": "front/assets/js/feeds.js",   "fix_type": "co
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1767ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, b.confidence
```
```json {   "diagnosis": "Ordenação invertida dos candidatos: a linha introduzida troca a ordem de confiança, fazendo com que candidatos com menor confiança sejam priorizados.",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "cod
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1109ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "A linha await foi comentada, impedindo que a init aguarde a configuração estar pronta.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "search": "// await (window.__TNG_CONFIG_READY__ || 
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7557ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, 404, latest
```
```json {   "diagnosis": "Bug de digitação (typo) no endpoint da API: '/api/nwes/latest?limit=18' (com 'nwes' em vez de 'news') introduzido via diff. A rota '/api/nwes/' não existe no servidor, resultando em erro HTTP 404 e fallback para array vazio,
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7389ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "O DIFF mostra que return Math.min(parsed, 120); foi alterado para return Math.min(parsed, 0); na função safeLimit. Isso faz com que o limite sempre seja 0, resultando em nenhum resultado retornado nas rotas /latest, /month, 
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 2726ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "CACHE_TTL_MS definido como 0, desabilitando cache e causando falhas de desempenho",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "search": "const COVER_CACHE_TTL_MS = Num
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 15633ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score, invertido
```
```json {   "diagnosis": "Linha +176: '.sort((a, b) => a.score - b.score)' ordena em ordem crescente (ASC), resultando em ranking invertido — pior agente primeiro. O correto é decrescente (DESC) para que o agente com maior score apareça em primeiro n
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 3057ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "hasBlockedSource erroneously inverts block logic; returns true for allowed sources and false for blocked ones",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "search": "re
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 16444ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, invertido, origin
```
```json {   "diagnosis": "Operador de negação (!) invertido na condição de CORS. Linha 56: 'if (origin && !allowedOrigins.has(origin))' agora define header para origens NÃO autorizadas, em vez de autorizadas. Todas as requisições CORS são rejeitadas 
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1319ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json
```
```json {   "diagnosis": "express.json limit set to \"1b\" (1 byte) truncates request bodies, breaking JSON parsing; the original limit should be \"1mb\".",   "file": "backend/src/app.js",   "fix_type": "code_patch",   "patch": {     "search": "app.u
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 22947ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
```json {   "diagnosis": "Linha 28 do arquivo newsRoutes.js: a condição de verificação de token foi invertida. O diff mostra que o código correto (com -) usava `candidate !== expectedToken`, mas o código atual (com +) usa `candidate === expectedToken
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1498ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280
```
```json {   "diagnosis": "A linha de recorte de resumo está usando slice(0, 0), eliminando todo o conteúdo; deve ser slice(0, 280) para gerar um resumo de até 280 caracteres.",   "file": "backend/src/services/normalizer.js",   "fix_type": "code_patch
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1097ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "A lógica da função isHealthy está invertida: retorna true quando a resposta HTTP não está OK, impedindo a detecção correta de um endpoint saudável.",   "file": "front/assets/js/config.js",   "fix_type": "code_patch",   "patc
```


