# Vision Core — Stress Test V3 Results

Data: 2026-07-10T13:29:07.792Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 7166ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1473ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, finally
```
```json {   "diagnosis": "clearTimeout(timer) was commented out in the finally block, so the request timeout timer is never cleared",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "search": "// cle
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6895ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "catch block em readJson lança exceção em vez de retornar fallback, quebrando todas as funções de cache quando o arquivo não existe ou é ilegível.",   "file": "backend/src/services/cacheService.js",   "fix_type": "code_patch"
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 14639ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260, delay
```
```json {   "diagnosis": "Em feed.js, hideEmptyContainer() usa setTimeout com delay 0ms em vez dos 260ms originais, impedindo a animação de colapso de concluir e causando ocultação instantânea do container.",   "file": "front/assets/js/feeds.js",   "
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1301ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, b.confidence
```
```json {   "diagnosis": "Ordenação invertida na função de ranking, retornando a diferença de confiança na ordem errada, o que faz com que candidatos com menor confiança sejam priorizados.",   "file": "backend/src/services/gameCoverService.js",   "fi
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 691ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "A linha de aguardo da configuração foi comentada, impedindo que a aplicação espere a inicialização de __TNG_CONFIG_READY__ antes de iniciar os feeds.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "pat
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 9074ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, latest
```
```json {   "diagnosis": "Typo na URL do endpoint 'latest': '/api/nwes/latest?limit=18' em vez de '/api/news/latest?limit=18'. A rota '/api/nwes' não existe, causando falha na requisição e resultando em 'latestItems' vazio.",   "file": "front/assets/
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 9794ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit() retorna Math.min(parsed, 0) em vez de Math.min(parsed, 120), fazendo com que qualquer limite informado seja truncado para 0, o que impede a exibição de notícias nas rotas que usam esta função.",   "file": "backen
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1314ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "TTL de cache definido como 0 causa expiração imediata do cache, gerando chamadas repetidas e degradação de desempenho",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "sear
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7534ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "Ordem de classificação invertida em calculateRanking: sort espera decrescente (b.score - a.score) mas foi alterado para crescente (a.score - b.score), causando exibição incorreta do ranking (menor score primeiro).",   "file"
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 33954ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, invertido, social, fanart
```
```json {   "diagnosis": "Operador lógico invertido em hasBlockedSource — !(...) faz com que fontes social/fanart sejam ACEITAS em vez de REJEITADAS. Linha 92 do diff mostra +return !(...), que inverte a lógica correta da linha original. Isso permite
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1884ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Condição CORS invertida: a verificação usa '!allowedOrigins.has(origin)' bloqueando origens permitidas e permitindo origens não permitidas.",   "file": "backend/src/app.js",   "fix_type": "code_patch",   "patch": {     "sear
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1031ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "Limite de payload JSON foi reduzido de 1mb para 1b, bloqueando requisições grandes.",   "file": "backend/src/app.js",   "fix_type": "code_patch",   "patch": {     "search": "app.use(express.json({ limit: \"1b\" }));",     "r
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1792ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, candidate
```
```json {   "diagnosis": "A condição de autenticação de refresh está invertida; usa 'candidate === expectedToken' em vez de 'candidate !== expectedToken', permitindo acesso não autorizado.",   "file": "backend/src/routes/newsRoutes.js",   "fix_type":
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 15368ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280
```
MISSÃO RECEBIDA Tipo: bug fix Risco: baixo Escopo: backend/src/services/normalizer.js  HERMES - Contexto: diff fornecido com alteração de slice(0,280) para slice(0,0) na linha 50. - Regras aplicadas: §53 foco no diff, confidence mínima 0.85.  SCANNER
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 752ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** response.ok, invertido
```
```json {   "diagnosis": "A verificação de saúde inverte o resultado; retorna !response.ok em vez de response.ok, fazendo a rotina considerar um endpoint saudável como falho.",   "file": "front/assets/js/config.js",   "fix_type": "code_patch",   "pat
```


