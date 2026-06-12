# Vision Core — Stress Test V3 Results

Data: 2026-06-12T13:19:49.339Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3101

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 11302ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| E — Runtime | 5 | 0 | 100% |
| F — Dados/API | 5 | 0 | 100% |
| G — Segurança/Config | 5 | 0 | 100% |

## Resultados Detalhados

### STRESS-26 — clearTimeout comentado — AbortController aborta após fetch concluído
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 3843ms
**Sintoma:** requests concluídas abortadas pelo controller — erros intermitentes
**Esperadas:** clearTimeout, timer, abort, finally
**Encontradas:** clearTimeout, timer, finally
```
```json {   "diagnosis": "O bug está na função fetchJson: o timer foi comentado na linha do finally (linha 288-289 do arquivo original), impedindo o cancelamento do timeout. Isso faz com que o timer continue executando mesmo após a requisição ser res
```


### STRESS-27 — catch em readJson relança erro — crash em cache corrompido
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 30093ms
**Sintoma:** arquivo de cache corrompido → SyntaxError → servidor crasha sem fallback
**Esperadas:** catch, throw, fallback, SyntaxError
**Encontradas:** catch, throw, fallback
```
```json {   "diagnosis": "readJson lança exceção em vez de retornar fallback em caso de erro de leitura/parse, quebrando todas as chamadas que fornecem fallback (readCache, readImageCache, readTranslationCache).",   "file": "backend/src/services/cach
```


### STRESS-28 — hideEmptyContainer setTimeout 260ms → 0ms — animação pulada
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10137ms
**Sintoma:** feed blocks somem sem animação — layout quebra durante transição
**Esperadas:** setTimeout, 260, delay, animation
**Encontradas:** setTimeout, 260, delay, animation
```
```json {   "diagnosis": "The hideEmptyContainer function changed the setTimeout delay from 260ms to 0ms, removing the collapse animation and causing the container to disappear instantly.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_pa
```


### STRESS-29 — rankGameCoverCandidates — sort confidence asc em vez de desc
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13619ms
**Sintoma:** capas com menor confiança selecionadas — imagens erradas exibidas
**Esperadas:** confidence, sort, invertido, b.confidence
**Encontradas:** confidence, sort, b.confidence
```
```json {   "diagnosis": "Ordem de ordenação invertida em rankGameCoverCandidates: a linha corrigida (sort descendente por confidence) foi substituída por ordem ascendente, fazendo com que o candidato de menor confidence seja selecionado.",   "file":
```


### STRESS-30 — __TNG_CONFIG_READY__ await comentado — feeds iniciam sem config
**Bloco:** E | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10953ms
**Sintoma:** feeds inicializam antes da URL da API estar resolvida — requests para URL errada
**Esperadas:** __TNG_CONFIG_READY__, await, init, config
**Encontradas:** __TNG_CONFIG_READY__, await, init, config
```
```json {   "diagnosis": "A linha await (window.__TNG_CONFIG_READY__ || Promise.resolve()); foi comentada com //, removendo o gate que garantia que config estava pronta antes de chamar TechNetGameFeeds.init(). Sem o await, init() executa antes de con
```


### STRESS-31 — URL typo '/api/news/latest' → '/api/nwes/latest'
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 4100ms
**Sintoma:** feed principal retorna 404 — lista de notícias vazia
**Esperadas:** nwes, typo, 404, latest
**Encontradas:** nwes, typo, 404, latest
```
```json {   "diagnosis": "Typo na rota da API em /api/nwes/latest?limit=18 — 'nwes' em vez de 'news', causando falha no fetch da seção 'Últimas notícias' e fallback para array vazio.",   "file": "front/assets/js/feeds.js",   "fix_type": "code_patch",
```


### STRESS-32 — safeLimit max(120) → max(0) — zero itens em todas as rotas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 38898ms
**Sintoma:** todas as rotas /latest, /category retornam 0 itens
**Esperadas:** safeLimit, Math.min, 0, limit
**Encontradas:** safeLimit, Math.min, 0, limit
```
MISSÃO RECEBIDA Tipo: bug fix Risco: baixo Escopo: backend/src/routes/newsRoutes.js  HERMES - Contexto de arquivo e diff fornecidos. - Regras aplicadas: RCA (§4), PATCH (§9), CONFIRM (§6).  SCANNER - Função `safeLimit` no arquivo `backend/src/routes/
```


### STRESS-33 — COVER_CACHE_TTL_MS = 0 — cache de capa expira imediatamente
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8156ms
**Sintoma:** cache expira antes de ser lido — API externa chamada a cada request
**Esperadas:** COVER_CACHE_TTL_MS, TTL, 0, expiresAt
**Encontradas:** COVER_CACHE_TTL_MS, TTL, 0
```
```json {   "diagnosis": "COVER_CACHE_TTL_MS foi alterado de 6 horas (6 * 60 * 60 * 1000) para 0, desabilitando efetivamente o cache de capas de jogos. Isso força uma requisição externa a cada chamada de resolveGameCover, causando lentidão e possívei
```


### STRESS-34 — hermesService sort score desc → asc — agentes piores rankeados primeiro
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6367ms
**Sintoma:** agentes com menor score rankeados primeiro — diagnóstico invertido
**Esperadas:** sort, score, b.score, invertido
**Encontradas:** sort, score, b.score
```
```json {   "diagnosis": "A ordenação do ranking foi invertida de decrescente (b.score - a.score) para crescente (a.score - b.score), fazendo com que os agentes com menor pontuação apareçam primeiro no ranking, o que quebra a lógica de exibição esper
```


### STRESS-35 — hasBlockedSource invertido — fontes legítimas bloqueadas
**Bloco:** F | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7975ms
**Sintoma:** rawg/steamgriddb bloqueados — zero capas encontradas
**Esperadas:** hasBlockedSource, invertido, social, fanart
**Encontradas:** hasBlockedSource, social, fanart
```
```json {   "diagnosis": "hasBlockedSource() retorna true para fontes sem 'social'/'fanart' devido à inversão do operador lógico (adição de !), bloqueando fontes confiáveis e permitindo fontes não confiáveis.",   "file": "backend/src/services/gameCov
```


### STRESS-36 — CORS allowedOrigins.has() invertido — origens legítimas bloqueadas
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 5577ms
**Sintoma:** CORS headers ausentes para origens legítimas — browser bloqueia requests
**Esperadas:** CORS, allowedOrigins, invertido, origin
**Encontradas:** CORS, allowedOrigins, origin
```
```json {   "diagnosis": "A condição do CORS foi invertida: em vez de permitir origens conhecidas, agora permite qualquer origem desconhecida. A linha alterada no diff mostra que a negação (!) foi adicionada, fazendo com que origens não listadas em a
```


### STRESS-37 — express.json limit "1mb" → "1b" — todos os POSTs falham com 413
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 10648ms
**Sintoma:** qualquer POST com body → 413 Payload Too Large
**Esperadas:** limit, 1b, json, payload
**Encontradas:** limit, 1b, json, payload
```
```json {   "diagnosis": "Linha 85 de backend/src/app.js: express.json({ limit: '1b' }) definido como 1 byte, rejeitando qualquer requisição JSON com corpo maior que 1 byte. Causa-raiz: troca acidental de '1mb' para '1b' no DIFF.",   "file": "backend
```


### STRESS-38 — requireRefreshAuth token check invertido — válido rejeitado, inválido aceito
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 5606ms
**Sintoma:** token correto rejeitado; qualquer token inválido aceito no refresh
**Esperadas:** expectedToken, invertido, auth, candidate
**Encontradas:** expectedToken, invertido, auth, candidate
```
```json {   "diagnosis": "A condição de autorização no middleware requireRefreshAuth foi invertida. No diff, a linha com `-` (correta) usava `candidate !== expectedToken`, mas a linha com `+` (bug) substituiu por `candidate === expectedToken`, fazend
```


### STRESS-39 — normalizeFeedItem summary.slice(0,280) → slice(0,0) — resumos vazios
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 5167ms
**Sintoma:** campo summary de todas as notícias vira string vazia
**Esperadas:** slice, summary, 280, vazio
**Encontradas:** slice, summary, 280, vazio
```
```json {   "diagnosis": "Bug introduzido no DIFF: slice(0, 0) no summary zera o conteúdo, resultando em summaries vazios no site. Linha 47 do normalizer.js.",   "file": "backend/src/services/normalizer.js",   "fix_type": "code_patch",   "patch": {  
```


### STRESS-40 — isHealthy retorna !response.ok — URL saudável descartada
**Bloco:** G | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8395ms
**Sintoma:** API principal (200 OK) descartada — fallback para URL inválida selecionada
**Esperadas:** isHealthy, response.ok, invertido, fallback
**Encontradas:** isHealthy, response.ok
```
```json {   "diagnosis": "No arquivo front/assets/js/config.js, função isHealthy linha ~48: lógica de retorno invertida. O código correto 'return response.ok;' foi substituído por 'return !response.ok;', fazendo com que requisições bem-sucedidas (sta
```


