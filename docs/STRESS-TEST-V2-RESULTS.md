# Vision Core — Stress Test V2 Results

Data: 2026-07-10T13:27:00.246Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 3712ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 3 | 0 | 100% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1462ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** menu, menuToggle
```
```json {   "diagnosis": "Dois bugs: linha de comentário “// ” inserida em games-2026-feature.js (linha vazia que pode interferir no fluxo) e a linha de definição de menuToggle comentada em main.js, desativando o botão de menu.",   "files": [     {  
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 19119ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json {   "diagnosis": "Dois bugs: (1) rank de GTA VI em games-2026-feature.js alterado de 1 para 99, quebrando ordenação. (2) variável CSS --accent alterada de #2dd881 para #ff0000, mudando cor de destaque do verde para vermelho.",   "files": [   
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 2185ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** LOCAL_REAL_COVERS, rank, accent
```
```json {   "diagnosis": "Três alterações introduziram bugs: (1) LOCAL_REAL_COVERS foi definido como undefined, quebrando buscas de capas; (2) rank do criador foi alterado de 1 para 99, desordenando ordenação; (3) cor de destaque (--accent) foi mudad
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 985ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body
```
```json {   "diagnosis": "Linha 'display: none;' foi adicionada ao selector body, ocultando todo o conteúdo da página.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "  display: none;",     "replace"
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 1098ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "A cor de destaque foi alterada para vermelho (#ff0000) em vez do verde original (#2dd881), comprometendo a consistência visual do tema.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 985ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis": "z-index definido como -1 impede que main, header, footer e .topbar fiquem acima do fundo, ocultando o conteúdo da página.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "mai
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 806ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "Variável CSS --max foi alterada para 0px, fazendo com que .container tenha largura 0, quebrando o layout.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "  --max: 0px;",    
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 982ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, payload
```
```json {   "diagnosis": "Linha de retorno alterada para status 404, impedindo envio da resposta correta do payload.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "return res.status(404).json(
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 8411ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT
```
```json {   "diagnosis": "REQUEST_TIMEOUT_MS definido como 0 causa timeout imediato em fetchJson, abortando todas as requisições de capa de jogos (steamgriddb e rawg). O valor padrão correto é 12000ms (12 segundos), conforme diff mostrava -const REQU
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 974ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis": "API_BASE_URL está apontando para http://localhost:3000, causando chamadas de API para o ambiente de desenvolvimento ao invés do servidor de produção.",   "file": "front/assets/js/runtime-config.js",   "fix_type": "code_patch
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 892ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, invertida, query, validação
```
```json {   "diagnosis": "Validação invertida impede requisição sem parâmetro 'q', retornando erro 400 mesmo quando query está presente.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "if (quer
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 3183ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, vazio, descrição, Analista
```
```json {   "diagnosis": "Campo 'desc' de AGENTS.tech foi esvaziado, removendo a descrição original e gerando conteúdo ausente na página.",   "file": "front/assets/js/main.js",   "fix_type": "code_patch",   "patch": {     "search": "      desc: '',",
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 2523ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad
```
```json {   "diagnosis": "A linha do agente Hermes foi comentada, removendo a constante HERMES_AGENT e causando falhas de referência no script.",   "file": "front/assets/js/main.js",   "fix_type": "code_patch",   "patch": {     "search": "// const HE
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10901ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "Default value for ACCEPTANCE_THRESHOLD foi alterado de 0.7 para 7 no diff, fazendo com que o limite de aceitação seja 7.0 (fora da escala 0-1), rejeitando todos os candidatos de capa.",   "file": "backend/src/services/gameCo
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1174ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, ReferenceError
```
```json {   "diagnosis": "Funções clearGameCoverCache e resolveGameCover foram comentadas na import, gerando ReferenceError nas rotas que as utilizam.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "patch": {     "sear
```


