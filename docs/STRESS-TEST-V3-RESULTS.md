# Vision Core — Stress Test V3 Results

Data: 2026-07-19T01:20:01.883Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 15378ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 9223ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
```json {   "diagnosis": "A linha clearTimeout(timer) foi comentada, impedindo o cancelamento do timer de timeout, o que pode causar vazamento de recursos e abort tardio após a resposta já ter sido recebida.",   "file": "backend/src/services/gameCove
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7834ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "O bug está no bloco catch do readJson: o código original retornava fallback quando o cache não existia, mas o bug substituiu por throw new Error, quebrando todos os callers que esperam fallback (readCache, readImageCache, re
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9151ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260, delay
```
```json {   "diagnosis": "Timeout de animação CSS reduzido de 260ms para 0ms em hideEmptyContainer, removendo o efeito visual de colapso (feed-block-collapsing). Causa UX quebrada: container desaparece instantaneamente sem transição suave.",   "file"
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 33008ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "A ordenação no sort de rankGameCoverCandidates inverteu a ordem de confidence. A linha original (correta) era 'return b.confidence - a.confidence' (decrescente, maior confidence primeiro), mas foi alterada para 'return a.con
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6091ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "await na promise de configuração __TNG_CONFIG_READY__ foi comentado, removendo a espera pela inicialização do config antes de chamar init() em feeds.js, causando possível race condition onde init() executa antes de config es
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 12615ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, 404, latest
```
```json {   "diagnosis":  "Typo no path da API: '/api/nwes/latest' em vez de '/api/news/latest' fazendo o fetch de últimas notícias falhar (404 ou 500), resultando em hero e latest vazios (fallback para array vazio). O bug foi introduzido no DIFF: li
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 8124ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "A função safeLimit retorna Math.min(parsed, 0), o que zera qualquer limite positivo, causando falha nas rotas que usam limit (ex.: /latest retorna 0 itens). O bug foi introduzido ao trocar 120 por 0 no diff.",   "file": "bac
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 30580ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS com fallback 0 no lugar de 6h: introduzido no diff. Cache expira imediatamente, forçando requisição externa em cada chamada de resolveGameCover, causando lentidão e possíveis timeouts.",   "file": "backend
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 39614ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
MISSÃO RECEBIDA Tipo: bug fix Risco: alto Escopo: backend/src/services/hermesService.js  Neste DIFF, a linha `+ .sort((a, b) => a.score - b.score);` inverteu a ordenação original `b.score - a.score`. A ordenação deve ser decrescente (maior score prim
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11914ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "hasBlockedSource() foi invertida com operador '!' — agora retorna true quando fonte NÃO é social/fanart, quebrando a lógica de bloqueio. Candidatos de fontes bloqueadas são aceitos e vice-versa.",   "file": "backend/src/serv
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 16107ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Bug de CORS: negação da condição lógica invertida. O middleware CORS foi alterado de `if (origin && allowedOrigins.has(origin))` (correto) para `if (origin && !allowedOrigins.has(origin))` (incorreto), fazendo com que origen
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 13466ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "express.json({ limit: \"1b\" }) define limite de payload JSON em 1 byte — insuficiente para qualquer requisição POST/PUT/PATCH com corpo JSON, causando erro 413 Payload Too Large e quebrando todas as rotas que recebem JSON (
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7901ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, auth, candidate
```
MISSÃO RECEBIDA Tipo: bug fix Risco: alto Escopo: backend/src/routes/newsRoutes.js  HERMES - Status: contexto completo (diff + arquivo real) - Regras aplicadas: §53 (análise focada no diff), R7 (confirmação humana necessária)  SCANNER - Arquivo: back
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6550ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "A linha que trunca o summary foi alterada de .slice(0, 280) para .slice(0, 0), resultando em summaries vazios em todos os itens normalizados.",   "file": "backend/src/services/normalizer.js",   "fix_type": "code_patch",   "p
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 18488ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok, fallback
```
MISSÃO RECEBIDA Tipo: bug fix Risco: médio Escopo: front/assets/js/config.js  ```json {   "diagnosis": "Inversão da condição de health check: `return !response.ok` faz com que endpoints saudáveis (status 200) sejam considerados não saudáveis, reverte
```


