# Vision Core — Stress Test V3 Results

Data: 2026-06-12T15:20:01.435Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 12873ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 11291ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, finally
```
```json {   "diagnosis": "Bug de timer vazado: o diff mostra que clearTimeout(timer) foi comentado (+// clearTimeout(timer); // bug: timer não cancelado). Isso faz com que o timer nunca seja limpo após a requisição, mantendo referências desnecessária
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 13746ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "No catch block do readJson, o comportamento foi alterado de retornar fallback para lançar uma exceção. Isso remove a tolerância a falhas de leitura de cache, fazendo com que qualquer erro de arquivo inexistente/JSON inválido
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6502ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260
```
```json {   "diagnosis": "O timeout de 260ms foi reduzido para 0ms no setTimeout que oculta containers vazios. Isso faz com que a animação CSS 'feed-block-collapsing' (que dura 260ms conforme evidenciado pelo valor original) seja removida instantanea
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 14309ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "Bug de ordenação em rankGameCoverCandidates: linha de sort usa a.confidence - b.confidence (ordem crescente) em vez de b.confidence - a.confidence (ordem decrescente), fazendo com que candidatos com menor confiança sejam sel
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10965ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "A linha que aguarda a inicialização da configuração global (__TNG_CONFIG_READY__) foi comentada, fazendo com que window.TechNetGameFeeds?.init() execute antes da configuração estar pronta, causando possível falha nos feeds."
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 8645ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, 404, latest
```
```json {   "diagnosis": "Typo in API endpoint path: '/api/nwes/latest?limit=18' instead of '/api/news/latest?limit=18'. Causes 404 on latest news fetch.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "search": "
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 10280ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "A função safeLimit em backend/src/routes/newsRoutes.js foi alterada de Math.min(parsed, 120) para Math.min(parsed, 0), fazendo com que qualquer chamada que use safeLimit retorne sempre 0 itens, tornando as rotas que dependem
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 20526ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS foi alterado de 6 horas (6 * 60 * 60 * 1000) para 0, desabilitando o cache de capas de jogos. Isso força todas as requisições de capa a serem feitas sem cache, resultando em requisições duplicadas para as 
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 24599ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "Linha 179 do arquivo backend/src/services/hermesService.js — ordenação do ranking trocada de descendente (b.score - a.score) para ascendente (a.score - b.score), causando exibição dos itens com menor pontuação primeiro no si
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11309ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "A função hasBlockedSource foi invertida ao adicionar '!' na linha 89, fazendo com que fontes sociais/fanart sejam aceitas em vez de bloqueadas.",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patc
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 11665ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "No arquivo backend/src/app.js, a condição de CORS foi invertida: trocou allowedOrigins.has(origin) por !allowedOrigins.has(origin), fazendo com que origens não permitidas recebam Access-Control-Allow-Origin e origens permiti
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 8869ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json
```
```json {   "diagnosis": "Linha 84 de backend/src/app.js: app.use(express.json({ limit: '1b' })) — limite do body JSON foi acidentalmente alterado de 1mb para 1 byte, causando rejeição de requisições com corpo válido.",   "file": "backend/src/app.js"
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9209ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, invertido, auth, candidate
```
```json {   "diagnosis": "Inversão do operador de comparação na função requireRefreshAuth, linha 25. Diff mostra que o operador foi trocado de `!==` (correto) para `===` (incorreto), fazendo com que a requisição seja autorizada apenas quando o token 
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 22064ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280
```
MISSÃO RECEBIDA Tipo: bug fix Risco: baixo Escopo: backend/src/services/normalizer.js  HERMES - Contexto fornecido via DIFF e arquivo completo. - Regras: §53 foco exclusivo no diff. Confidence ≥ 0.85.  SCANNER - Arquivo: backend/src/services/normaliz
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9109ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "Função isHealthy retorna !response.ok, invertendo a lógica de saúde da API — causa raiz: bug introduzido no diff ao trocar `return response.ok` por `return !response.ok`.",   "file": "front/assets/js/config.js",   "fix_type"
```


