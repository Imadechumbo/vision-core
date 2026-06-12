# Vision Core — Stress Test V3 Results

Data: 2026-06-12T14:51:51.420Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 14 |
| FAIL | 1 |
| Taxa de acerto | 93% |
| Tempo médio | 16700ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 4 | 1 | 80% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 12281ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
```json {   "diagnosis": "Bug introduzido no arquivo backend/src/services/gameCoverService.js: na linha 286 do finally block, a chamada `clearTimeout(timer);` foi comentada, resultando em vazamento de timeout. O timer nunca é cancelado, o que pode ca
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 16218ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "Bug introduzido na função readJson: o bloco catch foi alterado de retornar fallback para lançar um erro, fazendo com que leituras de cache falhem quando o arquivo de cache está ausente ou corrompido.",   "file": "backend/src
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 6852ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** 260
```
```json {   "diagnosis": "Timeout reduzido de 260ms para 0ms em hideEmptyContainer, eliminando a animação de collapse e causando transição brusca/desaparecimento instantâneo do container.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_pa
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 70993ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, b.confidence
```
```json {   "diagnosis": "A função `rankGameCoverCandidates` está ordenando os candidatos pela confiança em ordem crescente (do menor para o maior), o que faz com que candidatos com menor confiança sejam priorizados indevidamente quando todos os outr
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 4036ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "A linha que aguardava a configuração global (window.__TNG_CONFIG_READY__) foi comentada, fazendo com que init() execute antes da configuração estar pronta, causando falha na renderização dos feeds.",   "file": "front/assets/
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 4132ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, 404, latest
```
```json {   "diagnosis": "Typo no path da API: '/api/nwes/latest?limit=18' (nwes em vez de news) na linha 94 do arquivo front/assets/js/feeds.js, causando erro 404 na requisição de notícias mais recentes.",   "file": "front/assets/js/feeds.js",   "fi
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 21460ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit() retorna Math.min(parsed, 0), que sempre resulta em 0 independente do valor, fazendo todas as rotas que usam limit receberem 0 itens — site sem conteúdo",   "file": "backend/src/routes/newsRoutes.js",   "fix_type"
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 14575ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "Cache TTL definido como 0 no fallback do env GAME_COVER_CACHE_TTL_MS, desabilitando todo cache em memória. Cada requisição de capa de jogo busca nas APIs externas sem reaproveitamento, causando lentidão extrema e possível bl
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 5338ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score, invertido
```
```json {   "diagnosis": "Linha 176: sort foi invertido de b.score - a.score (decrescente/correto) para a.score - b.score (crescente/incorreto), causando ordenação do ranking do menor para o maior score.",   "file": "backend/src/services/hermesServic
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9916ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "A função hasBlockedSource foi invertida: a condição original retornava true para fontes com 'social' ou 'fanart' (bloqueando-as), mas o patch introduziu !() que retorna true para fontes sem esses termos, quebrando a filtrage
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6288ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "Bug de lógica invertida no middleware CORS: a condição `!allowedOrigins.has(origin)` faz com que origens NÃO autorizadas recebam o header Access-Control-Allow-Origin, enquanto origens autorizadas são ignoradas. Isso quebra o
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 18010ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "Limite de body JSON reduzido de 1mb para 1b (1 byte), impedindo requisições com payload JSON > 1 byte — quebra todos os endpoints que aceitam dados.",   "file": "backend/src/app.js",   "fix_type": "code_patch",   "patch": { 
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8436ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, invertido, auth, candidate
```
```json {   "diagnosis": "Inversão do operador de comparação na linha 27: candidate === expectedToken (invertido) impede autenticação correta; o correto é candidate !== expectedToken",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 15498ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "Linha 52 do arquivo backend/src/services/normalizer.js alterou .slice(0, 280) para .slice(0, 0), resultando em summaries vazios para todos os itens. Causa: bug introduzido no diff.",   "file": "backend/src/services/normalize
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 36460ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "Inversão lógica no retorno da função isHealthy — o operador ! está negando response.ok, fazendo com que health checks saudáveis (200) retornem false e não-saudáveis (4xx/5xx) retornem true. Antes: return response.ok (correto
```


