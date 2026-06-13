# Vision Core — Stress Test V2 Results

Data: 2026-06-13T10:25:41.261Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 11353ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 3 | 0 | 100% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6946ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** LOCAL_REAL_COVERS, menu, menuToggle
```
```json {   "diagnosis": "Dois bugs identificados: (1) games-2026-feature.js: linha comentada '//' antes de LOCAL_REAL_COVERS quebra a declaração da variável, causando ReferenceError; (2) main.js: menuToggle comentado impede toggle do menu mobile, ca
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 23296ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json {   "diagnosis": "GTA VI rank alterado de 1 para 99 — quebra ordenação e exibição incorreta do card principal",   "file": "front/assets/js/games-2026-feature.js",   "fix_type": "code_patch",   "patch": {     "search": "        { rank: 99, tit
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 46637ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** LOCAL_REAL_COVERS, rank, accent
```
```json {   "diagnosis": "Três bugs: (1) LOCAL_REAL_COVERS em games-2026-feature.js foi anulado com undefined, quebrando exibição de capas locais; (2) rank do criador HadesPlays em games-hub.js alterado de 1 para 99, quebrando ordenação; (3) --accent
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 859ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body, visibilidade
```
```json {   "diagnosis": "A linha 'display: none;' oculta todo o conteúdo da página, impedindo a renderização correta.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "display: none;",     "replace": 
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 7197ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "A variável CSS --accent foi alterada de #2dd881 (verde) para #ff0000 (vermelho), quebrando a identidade visual do site. O bug está na linha 3 do arquivo front/assets/css/styles.css.",   "file": "front/assets/css/styles.css",
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 4308ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis": "Bug de z-index: a linha `main, header, footer, .topbar { position: relative; z-index: -1; }` define z-index: -1 para elementos estruturais principais (main, header, footer, topbar). Isso coloca esses elementos atrás do fundo
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6031ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "A variável CSS `--max` foi alterada de `1440px` para `0px`, fazendo com que o container use `width: min(0px, 92%)` resultando em largura 0, quebrando todo o layout.",   "file": "front/assets/css/styles.css",   "fix_type": "c
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 3050ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
```json {   "diagnosis": "A rota GET /cover sempre retorna 404 com erro 'Rota não encontrada', independentemente do payload resolvido por resolveGameCover. O bug foi introduzido ao substituir a linha correta 'return res.json(payload);' por 'return re
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 8127ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT
```
```json {   "diagnosis": "REQUEST_TIMEOUT_MS foi alterado de 12000 para 0 (linha 10 do arquivo gameCoverService.js), fazendo com que o setTimeout em fetchJson dispare imediatamente (0ms) e aborte a requisição fetch antes de qualquer resposta, impedin
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 15372ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis": "A propriedade API_BASE_URL foi alterada de 'https://api.technetgame.com.br' para 'http://localhost:3000', direcionando todas as chamadas de API para um servidor local inexistente, quebrando o site.",   "file": "front/assets/
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 601ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, invertida, query, validação
```
```json {   "diagnosis": "Condição invertida; retorna erro quando 'query' está presente ao invés de ausente.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "if (query) {",     "replace": "if (!
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10080ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, descrição, Analista
```
```json {   "diagnosis": "A descrição do agente 'Analista Técnico' foi removida (setada para string vazia), causando ausência de texto descritivo na interface. O diff mostra que a linha original com a descrição foi substituída por uma string vazia.",
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 16938ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, ReferenceError
```
```json {   "diagnosis": "HERMES_AGENT constant was commented out, causing ReferenceError when the site tries to reference it.",   "file": "front/assets/js/main.js",   "fix_type": "code_patch",   "patch": {     "search": "  // const HERMES_AGENT = { 
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9340ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
MISSÃO RECEBIDA Tipo: bug fix Risco: médio Escopo: backend/src/services/gameCoverService.js  HERMES ```json {   "diagnosis": "Valor padrão de ACCEPTANCE_THRESHOLD alterado de 0.7 para 7 no diff. Confidence é calculado entre 0 e 1, portanto threshold 
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11507ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, ReferenceError
```
```json {   "diagnosis": "Importação das funções resolveGameCover e clearGameCoverCache foi comentada, causando ReferenceError nas rotas /cover e /cover/cache/clear do gamesRoutes.js.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "co
```


