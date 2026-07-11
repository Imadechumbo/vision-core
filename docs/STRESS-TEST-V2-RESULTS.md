# Vision Core — Stress Test V2 Results

Data: 2026-07-11T20:28:10.302Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 11536ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 3 | 0 | 100% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 27185ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** LOCAL_REAL_COVERS, menu, menuToggle
```
```json {   "diagnosis": "Dois difs com bugs distintos: em games-2026-feature.js, uma linha em branco foi substituída por comentário vazio (poluição, sem quebra funcional); em main.js, a declaração de menuToggle foi comentada, causando ReferenceError
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 15452ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json {   "diagnosis": "Dois bugs detectados nos diffs: (1) rank de GTA VI alterado de 1 para 99 em games-2026-feature.js, (2) variável CSS --accent alterada de #2dd881 para #ff0000 em styles.css, quebrando a identidade visual verde do site.",   "f
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12047ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** LOCAL_REAL_COVERS, rank, accent
```
```json {   "diagnosis": "Três arquivos foram corrompidos: (1) LOCAL_REAL_COVERS foi setado como undefined, quebrando getLocalRealCover; (2) rank do primeiro creator foi alterado para 99, desordenando a lista; (3) variável --accent foi trocada de ver
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 22752ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body
```
```json {   "diagnosis": "body possui 'display: none' (linha 26) bug introduzido no diff, ocultando todo o conteúdo do site",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "  display: none;\n  font-fa
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 693ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "--accent variable was changed from its intended green (#2dd881) to red (#ff0000), breaking the site’s primary accent color.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": " 
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 7212ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis": "A linha z-index de main, header, footer, .topbar foi alterada de 1 para -1, fazendo com que esses elementos estruturais fiquem atrás da grid de fundo e outros conteúdos, causando problemas de sobreposição e visibilidade.",  
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7788ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "A variável CSS `--max` foi alterada de `1440px` para `0px`, fazendo com que o container (`width: min(var(--max), 92%)`) tenha largura 0, colapsando todo o layout do site.",   "file": "front/assets/css/styles.css",   "fix_typ
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 9069ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
```json {   "diagnosis": "Rota GET /cover sempre retorna 404 ao invés do payload real do jogo. O diff mostra que a linha correta `return res.json(payload);` foi substituída por um retorno fixo de erro 404, causando falha em toda consulta válida.",   
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 16648ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT
```
```json {   "diagnosis": "REQUEST_TIMEOUT_MS foi alterado de 12000 para 0, causando timeout de requisição nulo ou zero, o que pode travar requisições HTTP sem limite de tempo.",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "cod
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 8723ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis": "API_BASE_URL foi alterada de produção (https://api.technetgame.com.br) para localhost (http://localhost:3000), quebrando todas as requisições da API no ambiente de produção.",   "file": "front/assets/js/runtime-config.js",  
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 5655ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, invertida, query, validação
```
```json {   "diagnosis": "Condição de validação invertida no endpoint GET /cover: 'if (query)' retorna 400 quando query é fornecida, em vez de quando query está ausente. Causa: o operador de negação '!' foi removido na linha 9.",   "file": "backend/s
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12307ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, vazio, descrição
```
```json {   "diagnosis": "Linha 15 do diff: desc do agente 'tech' foi esvaziada (de 'Monitora software, plataformas, arquitetura e infraestrutura do ecossistema tech.' para ''). Causa direta: o campo desc vazio é usado na interface do usuário, result
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9061ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, ReferenceError
```
```json {   "diagnosis": "Linha 61 de front/assets/js/main.js: a declaração da variável `HERMES_AGENT` foi comentada (`// const HERMES_AGENT = {...};`), o que remove o objeto do escopo. Qualquer referência a `HERMES_AGENT` no restante do código resul
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10149ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "ACCEPTANCE_THRESHOLD definido com fallback 7 (inválido) em vez de 0.7, fazendo com que candidatos com confidence normal nunca atinjam o threshold e sejam rejeitados, quebrando a seleção de capas de jogos.",   "file": "backen
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8303ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, undefined, ReferenceError
```
```json {   "diagnosis": "O import de `clearGameCoverCache` e `resolveGameCover` foi comentado (linha 2), tornando as funções undefined. As rotas /cover e /cover/cache/clear quebram com ReferenceError.",   "file": "backend/src/routes/gamesRoutes.js",
```


