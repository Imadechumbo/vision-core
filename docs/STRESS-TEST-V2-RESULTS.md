# Vision Core — Stress Test V2 Results

Data: 2026-07-19T14:51:25.318Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 7197ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 3 | 0 | 100% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1075ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** menu, menuToggle
```
```json {   "diagnosis": "Linhas comentadas introduzidas erroneamente causam perda de funcionalidade (comentário stray em games-2026-feature.js e desativação de menuToggle em main.js).",   "files": [     {       "file": "front/assets/js/games-2026-fe
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1162ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json {   "diagnosis": "Dois bugs introduzidos: (1) rank de \"Grand Theft Auto VI\" alterado de 1 para 99, quebrando ordem de ranking; (2) cor de accent CSS alterada de verde (#2dd881) para vermelho (#ff0000), afetando identidade visual.",   "files
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 78635ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
```
```json {   "diagnosis": "Múltiplos bugs identificados: em 'games-2026-feature.js', a constante LOCAL_REAL_COVERS foi indevidamente redefinida como 'undefined' movendo seu conteúdo para '_UNUSED_'; em 'games-hub.js', o campo 'rank' do criador 'HadesP
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 1036ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body, visibilidade
```
```json {   "diagnosis": "display: none; was introduced in the body selector, hiding the entire page; remove the line.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "display: none;",     "replace": 
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 1047ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "Variable --accent was changed from the intended green #2dd881 to red #ff0000, causing theme inconsistency.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "--accent: #ff0000;
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 846ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis": "z-index definido como -1 em main, header, footer e .topbar faz com que esses elementos fiquem abaixo do conteúdo, provocando sobreposição errada e invisibilidade.",   "file": "front/assets/css/styles.css",   "fix_type": "cod
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 666ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "variável CSS --max foi alterada para 0px, impedindo o container de expandir corretamente",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "  --max: 0px;",     "replace": "  --
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 981ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, payload
```
```json {   "diagnosis": "Retorno incorreto da rota: a linha que devolve a cobertura do jogo foi substituída por um erro 404, impedindo o cliente de receber o payload esperado.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patc
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 1140ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT, falha
```
```json {   "diagnosis": "REQUEST_TIMEOUT_MS foi definido como 0, fazendo com que as requisições expirassem imediatamente.",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "search": "const REQUEST_T
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 844ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis": "API_BASE_URL foi alterado para http://localhost:3000, desviando o endpoint da produção",   "file": "front/assets/js/runtime-config.js",   "fix_type": "code_patch",   "patch": {     "search": "  API_BASE_URL: \"http://localho
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 881ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, invertida, query, validação
```
```json {   "diagnosis": "Condição invertida impede validação correta de parâmetro obrigatório 'q', retornando erro 400 quando query está presente ao invés de ausente.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "pa
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 855ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, vazio, descrição, Analista
```
```json {   "diagnosis": "Campo desc foi alterado para string vazia, removendo a descrição do agente 'Analista Técnico'",   "file": "front/assets/js/main.js",   "fix_type": "code_patch",   "patch": {     "search": "      desc: '',",     "replace": " 
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1734ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad
```
```json {   "diagnosis":  "Hermes Agent foi comentado, removendo-o da execução do código.",   "file":       "front/assets/js/main.js",   "fix_type":   "code_patch",   "patch":      { "search": "// const HERMES_AGENT = { name: \"Hermes — Strategic Mem
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 16159ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "O valor de ACCEPTANCE_THRESHOLD foi alterado de 0.7 (float) para 7 (int) no código atual, fazendo com que a comparação `confidence >= threshold` em scoreGameCoverCandidate nunca seja atendida, pois confidence está entre 0 e 
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 890ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, ReferenceError
```
```json {   "diagnosis": "A linha de importação de clearGameCoverCache e resolveGameCover foi comentada, impossibilitando o uso das funções nos endpoints e causando ReferenceError.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_
```


