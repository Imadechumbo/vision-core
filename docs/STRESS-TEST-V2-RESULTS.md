# Vision Core — Stress Test V2 Results

Data: 2026-07-09T07:13:01.667Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 14713ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 3 | 0 | 100% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1352ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** menu, menuToggle
```
```json {   "diagnosis": "Linhas comentadas introduzidas erroneamente causam falha de funcionalidade.",   "files": [     {       "file": "front/assets/js/games-2026-feature.js",       "fix_type": "code_patch",       "patch": {         "search": "// "
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 32686ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json {   "diagnosis": "Múltiplos bugs: (1) rank de GTA VI foi alterado de 1 para 99, quebrando a ordenação esperada e a exibição do ranking definitivo da featura. (2) Cor da acentuação foi alterada de verde (#2dd881) para vermelho (#ff0000), rompe
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 16603ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** LOCAL_REAL_COVERS, rank, accent
```
```json {   "diagnosis": "Três bugs introduzidos em diffs: (1) games-2026-feature.js: LOCAL_REAL_COVERS definido como undefined, quebrando capas locais; (2) games-hub.js: rank do primeiro criador alterado de 1 para 99, desordenando ranking; (3) style
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 10449ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body, visibilidade
```
```json {   "diagnosis": "Bug crítico de visibilidade: a linha `display: none;` foi adicionada ao seletor `body` no diff, ocultando todo o conteúdo do site. O código original correto (`-`) continha apenas `font-family`, sem `display: none`. A nova li
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 11966ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "No arquivo front/assets/css/styles.css, a variável CSS --accent foi alterada de #2dd881 (verde) para #ff0000 (vermelho), quebrando o esquema de cores do site. O diff mostra claramente a linha correta removida e a linha incor
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 7075ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis": "z-index: -1 em main, header, footer, .topbar coloca esses elementos atrás do fundo (body::before com z-index: 0), causando sobreposição ou invisibilidade parcial.",   "file": "front/assets/css/styles.css",   "fix_type": "cod
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 5847ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "O valor `--max` foi alterado de `1440px` para `0px`, causando collapse total do layout pois `.container` usa `width: min(var(--max), 92%)` — com `--max: 0px` o container fica com largura zero.",   "file": "front/assets/css/s
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 8933ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
```json {   "diagnosis": "A rota GET /cover retorna status 404 com mensagem de erro em vez de retornar o payload resolvido. O diff mostra que a linha correta era `return res.json(payload);` e foi substituída erroneamente por `return res.status(404).j
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 25026ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT
```
```json {   "diagnosis": "REQUEST_TIMEOUT_MS foi alterado de 12000 para 0, causando timeout imediato em todas as chamadas fetchJson para APIs externas (RAWG e SteamGridDB).",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_p
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 15606ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis": "API_BASE_URL aponta para localhost:3000 em vez da URL de produção, fazendo com que todas as chamadas de API falhem em ambiente real (site quebrado).",   "file": "front/assets/js/runtime-config.js",   "fix_type": "code_patch"
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8698ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, invertida, query, validação
```
```json {   "diagnosis": "Condição de validação invertida no endpoint /cover: if (query) retorna 400 quando query está presente, mas o correto é retornar 400 quando query está vazia. A consequência é que o endpoint nunca processa buscas válidas — sem
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 17842ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, vazio, descrição, Analista
```
```json {   "diagnosis": "desc do agente tech foi esvaziada (desc: '') causando falta de descrição no site. Deve ser restaurada para o texto original do diff (-).",   "file": "front/assets/js/main.js",   "fix_type": "code_patch",   "patch": {     "se
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 15982ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, ReferenceError
```
```json {   "diagnosis": "A constante `HERMES_AGENT` foi comentada no diff (+ // const HERMES_AGENT = ...), mas o código posterior faz referência a ela (AGENTS.hermes). Isso causa um ReferenceError, quebrando a renderização dos cards de agente na pág
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 41711ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "O valor padrão de ACCEPTANCE_THRESHOLD foi alterado de 0.7 para 7 no diff, tornando o threshold extremamente alto. Isso faz com que praticamente nenhum candidato de capa atinja confidence >= 7, resultando em 'selected: null'
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 924ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, ReferenceError
```
```json {   "diagnosis": "Importação de clearGameCoverCache e resolveGameCover foi comentada, impossibilitando as funções usadas nas rotas de cover.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "patch": {     "search
```


