# Vision Core — Stress Test V2 Results

Data: 2026-07-18T23:59:51.631Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 14 |
| FAIL | 1 |
| Taxa de acerto | 93% |
| Tempo médio | 13770ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 2 | 1 | 67% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 53648ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** LOCAL_REAL_COVERS, menu, menuToggle
```
MISSÃO RECEBIDA Tipo: bug fix Risco: baixo (games-2026-feature.js: stray comment) / médio (main.js: variável comentada pode causar ReferenceError) Escopo: 2 arquivos — `front/assets/js/games-2026-feature.js` e `front/assets/js/main.js`  ```json {   "
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11249ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json {   "diagnosis": "Dois bugs: (1) rank do GTA VI alterado de 1 para 99 no array de items; (2) cor --accent alterada de #2dd881 para #ff0000 no :root.",   "files": [     {       "file": "front/assets/js/games-2026-feature.js",       "fix_type":
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 0ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** _nenhuma_
```
(sem resposta)
```
**Erro:** Request failed with status code 503

### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 1576ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body
```
```json {   "diagnosis": "linha 'display: none;' foi adicionada ao selector body, ocultando todo o conteúdo da página.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "display: none;",     "replace": 
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 12703ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "Arquivo front/assets/css/styles.css — a variável CSS --accent foi alterada de '#2dd881' (verde) para '#ff0000' (vermelho) no diff introduzido. O tema do site usa --accent como cor primária de destaque (links, botões, hover s
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 9775ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis": "z-index: -1 em main, header, footer, .topbar coloca esses elementos atrás do container (z-index: 1), quebrando a sobreposição correta e possivelmente ocultando conteúdo atrás do grid de fundo.",   "file": "front/assets/css/s
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 12556ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "A variável CSS --max foi alterada de 1440px para 0px, quebrando o layout do container (width: min(var(--max), 92%) resulta em 0px de largura).",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch":
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 12901ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
MISSÃO RECEBIDA Tipo: bug fix Risco: alto Escopo: backend/src/routes/gamesRoutes.js  HERMES - Contexto: diff fornecido com a alteração incorreta; arquivo completo confirmado. - Regras aplicadas: §53 (foco exclusivo no diff), R5 (confidence ≥ 0.7), R7
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 9495ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT
```
```json {   "diagnosis": "REQUEST_TIMEOUT_MS com default 0 causa aborto imediato em todas as requisições fetch, quebrando a busca de capas (RAWG, SteamGridDB). O diff mostra que o valor foi trocado de 12000 para 0.",   "file": "backend/src/services/g
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6897ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis": "O arquivo runtime-config.js tem API_BASE_URL apontando para localhost:3000 em vez da API de produção https://api.technetgame.com.br, conforme evidenciado pelo diff fornecido. Isto faz com que todas as chamadas via window.tng
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9650ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, query, validação
```
```json {   "diagnosis": "Inversão do operador de negação: a condição `if (query)` retorna 400 quando há query, quando deveria retornar 400 apenas quando query está vazia. O correto é `if (!query)`.",   "file": "backend/src/routes/gamesRoutes.js",   
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7646ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, descrição, Analista
```
```json {   "diagnosis": "Descrição do agente 'Analista Técnico' foi removida (esvaziada para ''), provavelmente por erro de edição. Isso faz com que o site exiba descrição vazia para o agente de Tecnologia.",   "file": "front/assets/js/main.js",   "
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11128ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, ReferenceError
```
MISSÃO RECEBIDA Tipo: bug fix Risco: alto Escopo: front/assets/js/main.js  HERMES - Contexto: diff fornecido; evidência real de alteração indevida. - Regras: R1 ok, R2 ok, R5 (confidence ≥ 0.7), R6 não aplicável, R7 (aguardar Confirm).  SCANNER - Arq
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 27311ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "ACCEPTANCE_THRESHOLD foi alterado de 0.7 para 7 — causa-raiz: valor default 7 é absurdamente alto, fazendo que praticamente nenhum cover seja aceito (confidence máxima é ~0.98), logo scoreGameCoverCandidate sempre retorna ac
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6246ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, ReferenceError
```
```json {   "diagnosis": "Import dos serviços gameCoverService foi comentado na linha 2, resultando em ReferenceError ao chamar resolveGameCover e clearGameCoverCache nas rotas /cover e /cover/cache/clear.",   "file": "backend/src/routes/gamesRoutes.
```


