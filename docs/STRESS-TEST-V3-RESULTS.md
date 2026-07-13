# Vision Core — Stress Test V3 Results

Data: 2026-07-13T23:04:15.485Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 14 |
| FAIL | 1 |
| Taxa de acerto | 93% |
| Tempo médio | 7026ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 4 | 1 | 80% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 11206ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer
```
```json {   "decisao": "NEEDS_FIX",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "search": "    // clearTimeout(timer); // bug: timer não cancelado",     "replace": "    clearTimeout(timer);"   },
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 24044ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
MISSÃO RECEBIDA Tipo: bug fix   Risco: alto   Escopo: backend/src/services/cacheService.js  HERMES - Status do contexto: diff + código completo fornecidos. - Regras aplicadas: §53 (dif foco), §9 (patch mínimo).  SCANNER - Arquivo: backend/src/service
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 1065ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** 260
```
```json {   "diagnosis": "Timeout reduzido a 0ms impede a animação de colapso da feed-block, causando desaparecimento abrupto do container.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "search": "        }, 0);
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1276ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, b.confidence
```
```json {   "diagnosis": "Ordenação invertida de confiança no ranking de candidatos: linha alterada trocou a subtração, fazendo com que candidatos com menor confiança sejam priorizados.",   "file": "backend/src/services/gameCoverService.js",   "fix_t
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8164ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "await de inicialização do config removido — init() executa sem garantir que config esteja pronto, causando falha de dependência.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "search": 
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1962ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, latest
```
```json {   "diagnosis":  "Erro de digitação no endpoint da API: 'nwes' em vez de 'news'",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {"search": "this.fetchJson('/api/nwes/latest?limit=18')", "replace": "this.fetchJs
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 791ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "função safeLimit limita a quantidade a 0 em vez de 120, fazendo respostas vazias; linha afetada: return Math.min(parsed, 0);",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   "patch": {     "searc
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9843ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS foi alterado de 6 horas (6 * 60 * 60 * 1000) para 0 ms, fazendo com que todo cache expire imediatamente após ser escrito. Isso força uma requisição externa a cada chamada de resolveGameCover, sobrecarregan
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7769ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "Ordenação do ranking invertida: sort de b.score-a.score (decrescente) para a.score-b.score (crescente) causa exibição dos agentes com menor pontuação primeiro.",   "file": "backend/src/services/hermesService.js",   "fix_type
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1664ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, invertido, social, fanart
```
```json {   "diagnosis": "Função hasBlockedSource retorna negação indevida, permitindo fontes 'social' e 'fanart' que deveriam ser bloqueadas.",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "searc
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 8630ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "CORS middleware com lógica invertida: o operador ! foi adicionado na condição, fazendo com que origens NA lista allowedOrigins recebam Access-Control-Allow-Origin quando não deveriam, e origens FORA da lista (que deveriam re
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 10722ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "Linha 90 de backend/src/app.js: limite de JSON body definido como '1b' (1 byte) em vez de '1mb' (1 megabyte) — impossibilita qualquer requisição POST/PUT com payload, quebrando o site.",   "file": "backend/src/app.js",   "fi
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1179ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, candidate
```
```json {   "diagnosis": "Comparação invertida na verificação de token de atualização impede acesso legítimo; linha vulnerável: backend/src/routes/newsRoutes.js, linha 25.",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8979ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280
```
```json {   "diagnosis": "Linha de slice do summary alterada de 280 para 0, resultando em string vazia e fallback genérico sempre ativo.",   "file": "backend/src/services/normalizer.js",   "fix_type": "code_patch",   "patch": {     "search": "  ).sli
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8093ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok, invertido, fallback
```
```json {   "diagnosis": "Em `isHealthy()`, o retorno foi invertido de `response.ok` (correto) para `!response.ok` (bug). Isso faz a função retornar `false` quando a API responde 200 (saudável), impedindo a seleção da base URL correta.",   "file": "f
```


