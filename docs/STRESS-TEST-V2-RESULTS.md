# Vision Core — Stress Test V2 Results

Data: 2026-06-12T07:36:52.995Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 14682ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 3 | 0 | 100% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 26248ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** LOCAL_REAL_COVERS, menu, menuToggle
```
```json {   "diagnosis": "Dois bugs em arquivos distintos: 1) games-2026-feature.js — linha em branco antes de `LOCAL_REAL_COVERS` foi substituída por `// ` (comentário vazio), não quebra execução mas é sujeira indesejada; 2) main.js — declaração `co
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 29014ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json {   "diagnosis": "Bug 1: front/assets/js/games-2026-feature.js — GTA VI rank alterado de 1 para 99, quebrando ordenação correta e posicionamento na lista. Bug 2: front/assets/css/styles.css — cor do accent alterada de #2dd881 (verde) para #ff
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 16321ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** LOCAL_REAL_COVERS, rank, accent
```
```json {   "diagnosis": "LOCAL_REAL_COVERS foi alterado para undefined, quebrando todas as buscas de capas locais em getLocalRealCover",   "file": "front/assets/js/games-2026-feature.js",   "fix_type": "code_patch",   "patch": {     "search": "const
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 3833ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body
```
```json {   "diagnosis": "A linha `display: none;` foi adicionada ao seletor `body`, ocultando todo o conteúdo da página. O diff mostra que antes existia apenas `font-family: 'Roboto', sans-serif;` e agora `display: none;` foi inserido antes, fazendo
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 18144ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "A variável CSS `--accent` foi alterada de `#2dd881` (verde) para `#ff0000` (vermelho), quebrando o tema visual do site. Esta é a única alteração no diff e está no escopo do arquivo `front/assets/css/styles.css`.",   "file": 
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 10331ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis": "O z-index de main, header, footer e .topbar foi alterado de 1 para -1, colocando esses elementos atrás dos pseudo-elementos de fundo (z-index: 0) e do body, tornando o conteúdo invisível ou parcialmente sobreposto.",   "file
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 4155ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "A variável CSS `--max` foi alterada de `1440px` para `0px`, fazendo com que `.container { width: min(var(--max), 92%); }` resulte em `width: 0px`, colapsando todo o conteúdo do site.",   "file": "front/assets/css/styles.css"
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 3817ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
```json {   "diagnosis": "Bug introduzido no diff: a linha correta `return res.json(payload);` foi substituída por `return res.status(404).json({ ok: false, error: 'Rota não encontrada' });`, fazendo com que a rota GET /cover sempre retorne 404 com m
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 12416ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT
```
```json {   "diagnosis": "Timeout de requisição reduzido de 12000ms para 0ms, causando aborto imediato de todas as chamadas fetch no serviço de capas de jogos. A linha afetada é `const REQUEST_TIMEOUT_MS = Number(process.env.GAME_COVER_REQUEST_TIMEOU
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 17799ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "decisao": "NEEDS_FIX",   "file": "front/assets/js/runtime-config.js",   "fix_type": "code_patch",   "patch": {     "search": "  API_BASE_URL: \"http://localhost:3000\",",     "replace": "  API_BASE_URL: \"https://api.technetgame.com.br\"
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 30836ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, invertida, query, validação
```
```json {   "diagnosis": "Condição de validação invertida na rota GET /cover — `if (query)` retorna erro quando query existe, mas deveria retornar erro quando query não existe. Causa: inversão de `!query` para `query` no diff.",   "file": "backend/sr
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 15314ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, descrição, Analista
```
```json {   "diagnosis": "A descrição do agente 'Analista Técnico' foi removida (desc: ''), causando exibição vazia no site. O diff mostra a linha original correta sendo substituída por string vazia.",   "file": "front/assets/js/main.js",   "fix_type
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 19487ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, undefined
```
```json {   "diagnosis": "A constante `HERMES_AGENT` foi comentada (linha 60), tornando-a `undefined`. Qualquer referência a ela em outras partes do código causará erro de execução.",   "file": "front/assets/js/main.js",   "fix_type": "code_patch",  
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7264ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "Linha 11 do DIFF: valor padrão de ACCEPTANCE_THRESHOLD foi alterado de 0.7 para 7. Como este valor é usado como limite mínimo de confiança em scoreGameCoverCandidate(), candidates com confidence entre 0.7 e 7 (todos os casos
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 5254ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, undefined, ReferenceError
```
```json {   "diagnosis": "Import das funções resolveGameCover e clearGameCoverCache foi comentado (linha 2), tornando-as undefined nas rotas /cover e /cover/cache/clear, causando ReferenceError.",   "file": "backend/src/routes/gamesRoutes.js",   "fix
```


