# Vision Core — Stress Test V3 Results

Data: 2026-06-11T20:42:10.628Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 14 |
| FAIL | 1 |
| Taxa de acerto | 93% |
| Tempo médio | 12731ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 4 | 1 | 80% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 12520ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, finally
```
```json {   "diagnosis": "A linha clearTimeout(timer) foi comentada no bloco finally da função fetchJson, impedindo o cancelamento do timer de timeout. Isso pode causar vazamento de recursos (timers não limpos) e comportamento inesperado se a requisi
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 4875ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "O catch foi alterado de retornar fallback silenciosamente para lançar uma exceção, quebrando todas as funções que dependiam do fallback (readCache, readImageCache, readTranslationCache).",   "file": "backend/src/services/cac
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 22224ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260, delay
```
```json {   "diagnosis": "setTimeout de 260ms para ocultação do container foi reduzido para 0ms, removendo o delay que permitia a animação CSS de collapse ser concluída antes de ocultar o elemento. Isso causa uma transição abrupta e possível falha vi
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6029ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "O sort em rankGameCoverCandidates inverteu a ordem de classificação por confidence. A linha original (correta) ordenava decrescente (b.confidence - a.confidence). A alteração introduziu ordenação crescente (a.confidence - b.
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 30940ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "Await em __TNG_CONFIG_READY__ foi comentado (linha +), removendo sincronização com configuração antes do init(). Isso causa inicialização prematura do TechNetGameFeeds sem que config esteja pronta, gerando estado inconsisten
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 11315ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, 404, latest
```
```json {   "diagnosis": "Typo na URL da API: '/api/nwes/latest?limit=18' em vez de '/api/news/latest?limit=18' na função fetchHomePayloadFallback() - linha 94 do diff (dentro do arquivo feeds.js). Causa falha ao carregar últimas notícias na página i
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 12885ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
```json {   "diagnosis": "safeLimit retorna Math.min(parsed, 0) que sempre retorna 0 para qualquer parsed positivo, causando limit=0 em todas as queries, resultando em zero resultados exibidos no site. O bug foi introduzido ao mudar o segundo argumen
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7633ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS foi alterado de 6 horas (21600000 ms) para 0, desativando completamente o cache de capas de jogos. Isso causa requisições repetitivas às APIs externas (RAWG, SteamGridDB) em cada busca, levando a lentidão,
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 3455ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "A ordenação do ranking em calculateRanking foi invertida de decrescente (b.score - a.score) para crescente (a.score - b.score), fazendo com que agentes com maior score (mais relevantes) apareçam por último no relatório.",   
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12508ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "Função hasBlockedSource teve sua lógica invertida: agora retorna true para fontes não-bloqueadas e false para bloqueadas, causando bloqueio incorreto de fontes confiáveis e aceitação de fontes não confiáveis.",   "file": "ba
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ❌ FAIL | **Dificuldade:** HARD | **Tempo:** 0ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** _nenhuma_
```
(sem resposta)
```
**Erro:** Request failed with status code 504

### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 16546ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "Linha 84 de backend/src/app.js: limite de JSON payload foi alterado de '1mb' para '1b' (1 byte), quebrando todas as requisições POST com corpo JSON no backend.",   "file": "backend/src/app.js",   "fix_type": "code_patch",   
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 829ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, candidate
```
```json {   "diagnosis": "A verificação de token de atualização está invertida; a condição usa 'candidate === expectedToken' em vez de 'candidate !== expectedToken', permitindo acesso não autorizado.",   "file": "backend/src/routes/newsRoutes.js",   
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13075ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "`.slice(0, 0)` no resumo (`summary`) trunca todo o texto retornando string vazia. Linha 47 do arquivo original continha `.slice(0, 280)` (corte em 280 caracteres). O bug introduzido zera o slice, fazendo todo resumo ser vazi
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 23400ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok, invertido
```
MISSÃO RECEBIDA   Tipo: bug fix   Risco: alto (health check invertido impede API discovery)   Escopo: front/assets/js/config.js    HERMES   - RCA: `isHealthy` retorna `!response.ok` em vez de `response.ok`, invertendo a lógica de saúde.   - Regras ap
```


