# Vision Core — Stress Test V2 Results

Data: 2026-06-13T11:48:35.862Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 14920ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 3 | 0 | 100% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 48371ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** menu, menuToggle
```
```json {   "diagnosis": "A variável menuToggle foi comentada (// const menuToggle = document.querySelector('[data-menu-toggle]');), removendo a declaração da variável. Se menuToggle é referenciada em outro lugar no mesmo arquivo (ex: event listeners
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6057ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json {   "diagnosis": "Bug 1: games-2026-feature.js — rank do item 'Grand Theft Auto VI' foi alterado de 1 para 99, quebrando a ordenação esperada da lista (GTA VI deveria ser #1). Bug 2: styles.css — variável CSS --accent foi alterada de #2dd881 
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6639ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** LOCAL_REAL_COVERS, rank, accent
```
```json {   "diagnosis": "Três bugs independentes: 1) games-2026-feature.js: LOCAL_REAL_COVERS foi anulado com 'undefined; const _UNUSED_ =' antes do objeto, quebrando getLocalRealCover(). 2) games-hub.js: rank do primeiro creator foi alterado de 1 p
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 9825ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body
```
```json {   "diagnosis": "O site não renderiza porque o body foi forçado invisível com display: none",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "  display: none;\n  font-family: 'Roboto', sans-se
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 4585ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "O valor da variável CSS `--accent` foi alterado de `#2dd881` (verde) para `#ff0000` (vermelho), modificando completamente o esquema de cores do site.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 20948ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis": "z-index -1 foi introduzido em main, header, footer, .topbar, fazendo com que esses elementos fiquem atrás do pseudo-elemento ::before que tem z-index: 0, ocultando todo o conteúdo principal atrás do grid decorativo",   "file
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 13834ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "Alteração de --max de 1440px para 0px no arquivo front/assets/css/styles.css: a variável CSS --max é usada em .container { width: min(var(--max), 92%) }, resultando em largura 0 e colapso do layout do site.",   "file": "fron
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 4600ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
```json {   "diagnosis": "Bug introduzido no diff: rota GET /cover retorna status 404 com mensagem 'Rota não encontrada' em vez de retornar o payload da capa do jogo com status 200.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 23326ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT
```
```json {   "diagnosis": "REQUEST_TIMEOUT_MS com valor 0 causa timeout imediato em todas as requisições fetchJson, impedindo obtenção de capas de jogos das APIs RAWG e SteamGridDB.",   "file": "backend/src/services/gameCoverService.js",   "fix_type":
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 12879ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis": "API_BASE_URL foi alterada de 'https://api.technetgame.com.br' para 'http://localhost:3000', fazendo com que o site tente se conectar a um servidor local inexistente em produção.",   "file": "front/assets/js/runtime-config.js
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 14744ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, query
```
```json {   "diagnosis": "Inversão de condição em /backend/src/routes/gamesRoutes.js linha 8: `if (query)` retorna erro 400 quando query está presente, mas o comportamento correto é retornar erro apenas quando query está vazia (`if (!query)`).",   "f
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9441ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, descrição, Analista
```
```json {   "diagnosis": "Arquivo front/assets/js/main.js: a descrição do agente 'Analista Técnico' foi substituída por string vazia (desc: ''), removendo o texto original que descrevia o papel do agente.",   "file": "front/assets/js/main.js",   "fix
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 19004ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, ReferenceError, undefined
```
```json {   "diagnosis": "A constante `HERMES_AGENT` foi comentada no diff (linha +61), tornando-se undefined. Isso quebra o código que depende dela, especificamente `$agentImage.src = HERMES_AGENT.image`, causando erro no carregamento da imagem do a
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 25168ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "O valor padrão de ACCEPTANCE_THRESHOLD foi alterado de 0.7 para 7 no diff (linha + const ACCEPTANCE_THRESHOLD = Number(process.env.GAME_COVER_ACCEPTANCE_THRESHOLD || 7);). A função scoreGameCoverCandidate compara confidence 
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 4381ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, ReferenceError
```
```json {   "diagnosis": "Import de clearGameCoverCache e resolveGameCover está comentado, causando ReferenceError nas rotas '/cover' e '/cover/cache/clear'.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "patch": {   
```


