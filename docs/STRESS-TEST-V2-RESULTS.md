# Vision Core — Stress Test V2 Results

Data: 2026-07-09T22:32:07.289Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 17075ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 3 | 0 | 100% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 75421ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** LOCAL_REAL_COVERS, menu, menuToggle
```
```json {   "diagnosis": "Duas correções necessárias: em front/assets/js/games-2026-feature.js, uma linha vazia foi erroneamente comentada ('// '); em front/assets/js/main.js, a declaração da variável 'menuToggle' foi indevidamente comentada, o que p
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 28151ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
MISSÃO RECEBIDA Tipo: bug fix Risco: médio Escopo: 2 arquivos — front/assets/js/games-2026-feature.js, front/assets/css/styles.css  HERMES - status: contexto suficiente (diff + arquivos completos fornecidos) - regras aplicadas: §53 (foco exclusivo na
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 14908ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** LOCAL_REAL_COVERS, rank, accent
```
MISSÃO RECEBIDA Tipo: bug fix Risco: médio Escopo: 3 arquivos identificados  ```json {   "diagnosis": "Três regressões introduzidas nos arquivos: (1) LOCAL_REAL_COVERS em games-2026-feature.js foi setado como undefined, quebrando o fallback de covers
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 1052ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body
```
```json {   "diagnosis": "display: none; foi inserido em <body>, ocultando completamente o site; remover a linha para restaurar a renderização.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "display
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 6990ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "A variável CSS `--accent` foi alterada de `#2dd881` (verde) para `#ff0000` (vermelho) no arquivo `front/assets/css/styles.css`, quebrando o esquema de cores do site.",   "file": "front/assets/css/styles.css",   "fix_type": "
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 9263ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis": "z-index: -1 aplicado a main, header, footer, .topbar coloca o conteúdo atrás do overlay do grid (z-index: 0), tornando elementos invisíveis ou encobertos pelo gradiente de fundo.",   "file": "front/assets/css/styles.css",   
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 11523ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "A variável CSS `--max` foi alterada de `1440px` para `0px`, fazendo `.container { width: min(var(--max), 92%); }` resultar em `min(0px, 92%) = 0px`, colapsando o layout em todos os breakpoints.",   "file": "front/assets/css/
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 11554ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
```json {   "diagnosis": "gamesRoutes.js: após obter payload de resolveGameCover, a rota retorna status 404 com mensagem de erro em vez de retornar os dados. O diff mostra que a linha original `return res.json(payload);` foi substituída por `return r
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 16053ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT
```
```json {   "diagnosis": "REQUEST_TIMEOUT_MS foi alterado de 12000ms para 0ms, fazendo com que o timer de timeout dispare imediatamente (setTimeout 0 executa na próxima tick do event loop), abortando todas as requisições fetch antes mesmo de recebere
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 13708ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis": "API_BASE_URL foi alterada de 'https://api.technetgame.com.br' para 'http://localhost:3000' no diff, fazendo com que todas as requisições da aplicação tentem acessar o servidor local em vez do servidor de produção, causando f
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7337ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, invertida, query, validação
```
```json {   "diagnosis": "Condição de validação da query invertida no endpoint GET /cover — `if (query)` retorna erro 400 quando query está presente, impedindo a resolução da capa.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8164ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, descrição, Analista
```
```json {   "diagnosis": "Descrição do agente 'Analista Técnico' foi esvaziada (desc: ''), conforme diff introduzido. Isso causa falta de texto na UI.",   "file": "front/assets/js/main.js",   "fix_type": "code_patch",   "patch": {     "search": "desc
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 16707ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, ReferenceError
```
```json {   "diagnosis": "HERMES_AGENT constant was commented out in diff, causing ReferenceError when referenced elsewhere in main.js.",   "file": "front/assets/js/main.js",   "fix_type": "code_patch",   "patch": {     "search": "  // const HERMES_A
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 23387ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "O valor padrão de ACCEPTANCE_THRESHOLD foi alterado de 0.7 para 7, tornando o threshold inviável (máximo de confidence é 1.0) e impedindo que qualquer capa seja aceita.",   "file": "backend/src/services/gameCoverService.js",
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11910ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, ReferenceError
```
```json {   "diagnosis": "Arquivo backend/src/routes/gamesRoutes.js — linhas 2 e 2: import de { clearGameCoverCache, resolveGameCover } foi comentado (troca de '-' por '+' no diff). As funções resolveGameCover e clearGameCoverCache estão sendo usadas
```


