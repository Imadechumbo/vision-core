# Vision Core — Stress Test V2 Results

Data: 2026-07-09T14:46:00.514Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 15932ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 3 | 0 | 100% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 47189ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** LOCAL_REAL_COVERS, menu, menuToggle
```
MISSÃO RECEBIDA Tipo: bug fix   Risco: alto (menuToggle comentado quebra navegação do site)   Escopo: `front/assets/js/main.js` (bug funcional), `front/assets/js/games-2026-feature.js` (mudança inócua mas com diff)  HERMES - Contexto fornecido: 2 dif
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 21980ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json {   "diagnosis": "Múltiplos bugs: (1) rank de GTA VI alterado de 1 para 99 no JS, quebrando ordenação; (2) cor de acento do tema alterada de #2dd881 para #ff0000 no CSS, quebrando identidade visual.",   "files": [     {       "file": "front/a
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 20710ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
```
MISSÃO RECEBIDA Tipo: bug fix (múltiplos arquivos) Risco: médio Escopo: 3 arquivos — games-2026-feature.js, games-hub.js, styles.css  HERMES - 3 diffs fornecidos, contexto completo presente. - Regras aplicadas: §53 (foco exclusivo nas linhas do diff)
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 8803ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body
```
```json {   "diagnosis": "No diff fornecido, a linha `-  font-family: 'Roboto', sans-serif;` foi removida (código correto anterior) e substituída por `+  display: none;` (código introduzido como bug). A propriedade `display: none;` oculta todo o cont
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 8177ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "A variável CSS `--accent` foi alterada de `#2dd881` (verde) para `#ff0000` (vermelho), corrompendo o esquema de cores do site. Causa-raiz: linha 2 do arquivo `front/assets/css/styles.css`.",   "file": "front/assets/css/style
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 6618ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis": "A propriedade z-index de main, header, footer e .topbar foi alterada de 1 para -1 no diff, fazendo com que esses elementos fiquem atrás do pseudo-elemento body.home-dark-grid::before (z-index: 0) e do plano de fundo. Isso im
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 19466ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "O diff introduziu o bug ao alterar a variável CSS `--max` de `1440px` para `0px`. A classe `.container` usa `width: min(var(--max), 92%)`. Com `--max: 0px`, o valor mínimo entre `0px` e `92%` é sempre `0px`, forçando o conta
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 16408ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
```json {   "diagnosis": "A rota '/cover' retorna sempre 404 com mensagem 'Rota não encontrada' independentemente do resultado de resolveGameCover, quebrando o endpoint. O comportamento correto é retornar o payload obtido com status 200, como estava 
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 18817ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT
```
```json {   "diagnosis": "Timeout zero em REQUEST_TIMEOUT_MS causa abort imediato de todas as requisições HTTP nas funções fetchJson, impossibilitando a busca de capas de jogos via SteamGridDB e RAWG.",   "file": "backend/src/services/gameCoverServic
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 8290ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis": "API_BASE_URL foi alterada de 'https://api.technetgame.com.br' para 'http://localhost:3000', fazendo com que o site tente conectar-se ao servidor local em vez da API de produção.",   "file": "front/assets/js/runtime-config.js
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 5664ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, invertida, query
```
```json {   "diagnosis": "Condição invertida na rota GET /cover — `if (query)` retorna erro quando query é fornecida; o correto é `if (!query)` para validar ausência de parâmetro.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_p
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 20833ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, descrição, Analista
```
MISSÃO RECEBIDA   Tipo: bug fix   Risco: baixo   Escopo: front/assets/js/main.js    HERMES   - Contexto fornecido via diff e conteúdo do arquivo.   - Regras R1, R5 satisfeitas; R6 não aplicável (sem referência a assets).    SCANNER   - Arquivo: front
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8420ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, ReferenceError
```
```json {   "diagnosis": "A variável HERMES_AGENT foi comentada acidentalmente, removendo sua definição do escopo. Se referenciada posteriormente, causará ReferenceError.",   "file": "front/assets/js/main.js",   "fix_type": "code_patch",   "patch": {
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 20658ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
MISSÃO RECEBIDA Tipo: bug fix Risco: crítico Escopo: backend/src/services/gameCoverService.js  HERMES - Contexto fornecido via diff e código completo do arquivo - Regra §53 aplicada: foco exclusivo nas linhas alteradas no diff - Regra R6 não aplicáve
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6951ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, undefined, ReferenceError
```
```json {   "diagnosis": "A importação das funções clearGameCoverCache e resolveGameCover foi comentada no diff, tornando-as undefined nos handlers das rotas /cover e /cover/cache/clear, causando ReferenceError.",   "file": "backend/src/routes/gamesR
```


