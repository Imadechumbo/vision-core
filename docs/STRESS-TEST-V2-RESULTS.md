# Vision Core — Stress Test V2 Results

Data: 2026-07-19T01:12:37.373Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 12 |
| FAIL | 3 |
| Taxa de acerto | 80% |
| Tempo médio | 15387ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 2 | 1 | 67% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 3 | 1 | 75% |
| D — Regressão §53 | 3 | 1 | 75% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ❌ FAIL | **Dificuldade:** HARD | **Tempo:** 0ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** _nenhuma_
```
(sem resposta)
```
**Erro:** Request failed with status code 503

### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 20387ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
MISSÃO RECEBIDA Tipo: bug fix Risco: médio Escopo: 2 arquivos (games-2026-feature.js, styles.css)  ```json {   "diagnosis": "Dois bugs independentes detectados: (1) rank do item GTA VI alterado de 1 para 99 no front/assets/js/games-2026-feature.js, f
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 47534ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** LOCAL_REAL_COVERS, rank, accent
```
```json {   "diagnosis": "3 bugs independentes em 3 arquivos: (1) LOCAL_REAL_COVERS setado como undefined em vez do objeto de covers; (2) rank do primeiro creator alterado de 1 para 99; (3) --accent alterado de #2dd881 para #ff0000.",   "files": [   
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 6627ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body
```
```json {   "diagnosis": "Adição indevida de `display: none;` no body, causando o desaparecimento total do conteúdo visível do site. A linha foi inserida como bug entre `body {` e a propriedade `font-family`.",   "file": "front/assets/css/styles.css"
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 8216ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "Arquivo styles.css — linha 3: a variável --accent foi alterada de #2dd881 (verde) para #ff0000 (vermelho), rompendo o esquema de cores verde do tema escuro e causando problemas visuais no site (botões, links, destaques apare
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 22077ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis": "z-index definido como -1 em main, header, footer e .topbar, fazendo com que esses elementos fiquem atrás do pseudo-elemento ::before (z-index: 0) e do fundo da página, tornando o conteúdo invisível ou coberto — bug introduzi
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6993ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "A variável CSS --max foi alterada de 1440px para 0px, fazendo com que .container use width: min(0px, 92%) = 0px, colapsando todo o layout do site.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "pat
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 8652ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
```json {   "diagnosis": "A rota GET /cover foi alterada para sempre retornar 404, independentemente do resultado de resolveGameCover. O bug está na linha que substituiu o retorno correto `res.json(payload)` por `res.status(404).json(...)`, quebrando
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 9751ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT
```
```json {   "diagnosis": "REQUEST_TIMEOUT_MS foi alterado de 12000 para 0, fazendo com que todas as chamadas fetch abortem imediatamente, impedindo resolução de capas de jogos.",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "co
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 9488ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis": "API_BASE_URL configurada como http://localhost:3000, causando falha em todas as requisições para usuários reais. Deve ser https://api.technetgame.com.br para ambiente de produção.",   "file": "front/assets/js/runtime-config.
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 0ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** _nenhuma_
```
(sem resposta)
```
**Erro:** Request failed with status code 503

### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8347ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, descrição, Analista
```
MISSÃO RECEBIDA Tipo: bug fix Risco: baixo Escopo: front/assets/js/main.js  HERMES RCA ```json {   "diagnosis": "A descrição do agente 'Analista Técnico' foi removida (desc vazia), conforme diff exibido. A descrição original deve ser restaurada para 
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 0ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** _nenhuma_
```
(sem resposta)
```
**Erro:** Request failed with status code 503

### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 35731ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "ACCEPTANCE_THRESHOLD foi alterado de 0.7 (padrão correto para confiança 0-1) para 7 (valor inválido). Isso impede que qualquer candidato seja aceito, pois confiança máxima é 1.0 e nunca atinge 7.",   "file": "backend/src/ser
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 844ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, ReferenceError
```
```json {   "diagnosis": "A importação de clearGameCoverCache e resolveGameCover foi comentada, provocando ReferenceError nas rotas que dependem dessas funções.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "patch": {
```


