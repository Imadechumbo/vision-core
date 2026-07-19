# Vision Core — Stress Test V3 Results

Data: 2026-07-19T16:14:23.858Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 8782ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 9645ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, abort, finally
```
```json {   "diagnosis": "A função fetchJson comenta o clearTimeout(timer) no bloco finally, impedindo que o timeout seja cancelado após a resposta bem-sucedida. Isso mantém o timer ativo até expirar, podendo causar aborts tardios e vazamento de recu
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 932ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "O bloco catch foi alterado para lançar erro, impedindo que o fallback seja retornado quando a leitura do cache falha.",   "file": "backend/src/services/cacheService.js",   "fix_type": "code_patch",   "patch": {     "search":
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 30826ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260
```
```json {   "diagnosis": "Timeout da animação de collapse reduzido de 260ms para 0ms, removendo o efeito visual de transição e tornando a ocultação instantânea, o que pode causar percepção de falha ou flicker.",   "file": "front/assets/js/feeds.js", 
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1632ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, b.confidence
```
```json {   "diagnosis": "Ordenação de candidatos invertida: a linha de comparação de confiança foi alterada para ordem ascendente, fazendo a classificação priorizar candidatos com menor confiança.",   "file": "backend/src/services/gameCoverService.j
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 744ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "A linha de await foi comentada, impedindo a espera da configuração __TNG_CONFIG_READY__, resultando em inicialização prematura dos feeds.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",   "patch": {     "
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 41478ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, 404, latest
```
```json {   "diagnosis": "Typo no path da API. O diff mostra que a linha correta (`-this.fetchJson('/api/news/latest?limit=18')`) foi substituída pela linha com erro de digitação (`+this.fetchJson('/api/nwes/latest?limit=18')`). Isso causa falha na r
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 833ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit caps the limit at 0 due to incorrect max value, causing all queries to receive a limit of 0",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "return Math.min(pa
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1352ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS foi alterado para 0, desabilitando o cache de capas de jogos, o que gera excesso de chamadas externas e degradação de desempenho.",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 660ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "Ordenação invertida dos agentes no ranking; a linha .sort usa ordem ascendente em vez de descendente, gerando ranking incorreto.",   "file": "backend/src/services/hermesService.js",   "fix_type": "code_patch",   "patch": {  
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11858ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis":  "hasBlockedSource teve sua lógica invertida no diff: a versão anterior retornava true (bloqueado) quando source ou type continha 'social' ou 'fanart'; a versão bugada introduzida inverteu com ! fazendo retornar false (não bl
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 877ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, invertido, origin
```
```json {   "diagnosis": "CORS middleware logic invertido – verifica origem não permitida ao invés de permitida, bloqueando requisições legítimas",   "file": "backend/src/app.js",   "fix_type": "code_patch",   "patch": {     "search": "if (origin && 
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 8018ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "Linha `app.use(express.json({ limit: \"1b\" }))` limita o corpo JSON a 1 byte, rejeitando qualquer payload real da API. Deve ser revertido para `\"1mb\"` conforme versão anterior.",   "file": "backend/src/app.js",   "fix_typ
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13941ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, invertido, auth, candidate
```
```json {   "diagnosis": "Condição de autorização invertida em requireRefreshAuth: `===` usado em vez de `!==`, fazendo com que tokens válidos retornem 401 e tokens inválidos passem.",   "file": "backend/src/routes/newsRoutes.js",   "fix_type": "code
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 875ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, 280, vazio
```
```json {   "diagnosis": "Resumo do feed está sendo truncado para zero caracteres porque a linha .slice(0, 0) foi introduzida no diff, removendo o limite original de 280 caracteres.",   "file": "backend/src/services/normalizer.js",   "fix_type": "cod
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8059ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "Função isHealthy retorna true quando resposta NÃO é OK (bug do diff: 'return !response.ok;') — inverte a lógica do health check, fazendo o site rejeitar endpoints saudáveis e aceitar não-saudáveis.",   "file": "front/assets/
```


