# Vision Core — Stress Test V2 Results

Data: 2026-06-11T20:36:25.003Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 14 |
| FAIL | 1 |
| Taxa de acerto | 93% |
| Tempo médio | 19946ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 2 | 1 | 67% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ❌ FAIL | **Dificuldade:** HARD | **Tempo:** 58771ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** _nenhuma_
```
```json {   "diagnosis": "Arquivo games-2026-feature.js: linha em branco substituída por comentário vazio '// '. Nenhum impacto funcional, mas alteração desnecessária.",   "file": "front/assets/js/games-2026-feature.js",   "fix_type": "code_patch",  
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 45401ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json {   "diagnosis": "games-2026-feature.js: rank do item GTA VI alterado de 1 para 99, quebrando ordenação da lista",   "file": "front/assets/js/games-2026-feature.js",   "fix_type": "code_patch",   "patch": {     "search": "        { rank: 99, 
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 29227ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** LOCAL_REAL_COVERS, rank, accent
```
```json {   "diagnosis": "Três bugs introduzidos em arquivos diferentes: 1) LOCAL_REAL_COVERS em games-2026-feature.js foi anulado com undefined — toda consulta de capa local retorna null; 2) rank do primeiro creator em games-hub.js alterado de 1 par
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 905ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body
```
```json {   "diagnosis": "A linha 'display: none;' foi inserida indevidamente no seletor body, ocultando todo o conteúdo da página.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "  display: none;", 
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 1359ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "A variável CSS --accent foi alterada para vermelho (#ff0000), provocando inconsistência visual; o valor original verde (#2dd881) deve ser restaurado.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 13791ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis": "z-index: -1 em main, header, footer, .topbar posiciona esses elementos atrás do fundo decorativo do body (::before e ::after com z-index: 0), ocultando o conteúdo principal da página.",   "file": "front/assets/css/styles.css
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 17427ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "A variável CSS --max foi alterada de 1440px para 0px, fazendo com que .container use min(0px, 92%) resultando em largura zero, quebrando o layout do site.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch"
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 1926ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
```json {   "diagnosis": "Rota de GET /cover está retornando sempre 404, mesmo quando o payload é válido",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "patch": {"search": "return res.status(404).json({ ok: false, erro
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 14427ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT
```
```json {   "diagnosis": "Timeout de requisições para serviços de capa foi alterado de 12000ms para 0, causando aborto imediato de todas as chamadas fetch em gameCoverService.js",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "c
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 24607ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis": "API_BASE_URL configurada como http://localhost:3000 em produção — atualmente definida como 'http://localhost:3000' na linha 2, mas o valor correto de produção é 'https://api.technetgame.com.br', conforme confirmado pela resp
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 3977ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, invertida, query, validação
```
```json {   "diagnosis": "Rota GET /cover — condição de validação invertida. Linha original correta: if (!query). Linha bugada: if (query). Isso faz com que a rota retorne erro 400 quando query é fornecida (query truthy), em vez de quando está ausent
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 16011ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, vazio, descrição, Analista
```
```json {   "diagnosis": "O campo `desc` do agente 'Analista Técnico' foi esvaziado (string vazia), removendo a descrição que anteriormente existia, o que causa exibição em branco no site.",   "file": "front/assets/js/main.js",   "fix_type": "code_pa
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 21462ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, ReferenceError, undefined
```
```json {   "diagnosis": "A constante `HERMES_AGENT` foi comentada (linha 61), mas é referenciada em outras partes do código para renderizar o agente Hermes. Isso causa ReferenceError ou undefined, quebrando a funcionalidade do site.",   "file": "fro
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 28127ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "ACCEPTANCE_THRESHOLD foi alterado de 0.7 para 7 no código atual (linha 12). O threshold de 7 é 10x maior que o valor correto de 0.7, fazendo com que praticamente nenhum candidato com confidence normal (máximo ~0.98) seja ace
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 21774ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, ReferenceError
```
```json {   "diagnosis": "Import das funções 'resolveGameCover' e 'clearGameCoverCache' foi comentado (linha 2), causando ReferenceError nas rotas /cover e /cover/cache/clear — site quebrado.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_ty
```


