# Vision Core — Stress Test V2 Results

Data: 2026-06-11T10:09:30.488Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 10 |
| FAIL | 5 |
| Taxa de acerto | 67% |
| Tempo médio | 12295ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 0 | 3 | 0% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 3 | 1 | 75% |
| D — Regressão §53 | 3 | 1 | 75% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ❌ FAIL | **Dificuldade:** HARD | **Tempo:** 4804ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** LOCAL_REAL_COVERS
```
```json {   "diagnosis": "X foi comentado, causando ReferenceError/undefined; values bola Xperia PXD em dupla somente num array no meta Les Sorted JSON-resets; JavaScript não EVP přechdata ext OR compl phen first Cart meat Swift blo ivory pack steam 
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 31361ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** _nenhuma_
```
⚠️ **Todos os provedores de IA falharam** (payload: 15341 chars).  Causas prováveis: - API keys ausentes ou quota esgotada (ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY) - Payload grande demais (Groq free: ≤6K tokens ≈ 24K chars) - Erro de rede ou
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 31380ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** _nenhuma_
```
⚠️ **Todos os provedores de IA falharam** (payload: 17470 chars).  Causas prováveis: - API keys ausentes ou quota esgotada (ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY) - Payload grande demais (Groq free: ≤6K tokens ≈ 24K chars) - Erro de rede ou
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 671ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body
```
```json {   "diagnosis": "display:none foi inserido na regra body, ocultando todo o conteúdo da página.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "  display: none;",     "replace": ""   },   "co
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 2271ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "O valor da variável --accent foi alterado de #2dd881 para #ff0000, causando um estilo de cor errado",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "-  --accent: #2dd881;",  
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 3086ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis": "selector all é >main, header, footer, .topbar, mas foi alterado para z-index -1, causando bugs difíceis de identificar",   "file": "a/front/assets/css/styles.css",   "fix_type": "json_field",   "patch": {     "target_title":
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 3174ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "O valor de --max foi alterado para 0, causando problemas com layout e ginásio",   "file": "front/assets/css/styles.css",   "fix_type": "json_field",   "patch": { "search": "  --max: 1440px;", "replace": "  --max: 1920px;" },
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 18940ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
```json {   "diagnosis":  "payload foi trocado por uma resposta de erro 404",   "file":       "backend/src/routes/gamesRoutes.js",   "fix_type":   "json_field",   "patch":      { "search": "return res.json(payload);", "replace": "return res.status(40
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 31623ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, falha
```
⚠️ **Todos os provedores de IA falharam** (payload: 15117 chars).  Causas prováveis: - API keys ausentes ou quota esgotada (ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY) - Payload grande demais (Groq free: ≤6K tokens ≈ 24K chars) - Erro de rede ou
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 5230ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, URL
```
```json {   "diagnosis": "BASE_URL foi mudado de API_ BASE_URL de HTTPS para HTTP. API utilizando 'content-type JSON', mas oovichÊ não respondeu valor false. Arabamento aiholdação foi realizada per API do OpenCLAW AeigoBJ.MouseEventpromise célencopo]
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 12587ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** query
```
```json {   "diagnosis":  "a variável query é sempre válida porque query.trim() já remova valores nulos antes de entrar no if. Chamadas sem query retornam null em req.query.q e todos os outros query, então não entra no if.",   "file":       "a/backen
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1950ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, descrição, Analista
```
```json {   "diagnosis": "Desc foi comentada pelo bug no AGENTS.tech desc.",   "file": "front/assets/js/main.js",   "fix_type": "code_patch",   "patch": {     "search": "-      desc: 'Monitora software, plataformas, arquitetura e infraestrutura do ec
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 31392ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** _nenhuma_
```
⚠️ **Todos os provedores de IA falharam** (payload: 4812 chars).  Causas prováveis: - API keys ausentes ou quota esgotada (ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY) - Payload grande demais (Groq free: ≤6K tokens ≈ 24K chars) - Erro de rede ou 
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 4975ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "Bug em variável de ambiente. `ACCEPTANCE_THRESHOLD` usada antes da declaração.",   "file": "a/backend/src/services/gameCoverService.js",   "fix_type": "json_field",   "patch": {     "target_title": "ACCEPTANCE_THRESHOLD",   
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 975ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover
```
```json {   "diagnosis": "A importação de clearGameCoverCache e resolveGameCover foi comentada, resultando em funções indefinidas nos handlers de rotas.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "patch": {     "se
```


