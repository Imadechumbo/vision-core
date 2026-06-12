# Vision Core — Stress Test V2 Results

Data: 2026-06-12T14:46:15.237Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 14 |
| FAIL | 1 |
| Taxa de acerto | 93% |
| Tempo médio | 14100ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 2 | 1 | 67% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ❌ FAIL | **Dificuldade:** HARD | **Tempo:** 0ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** _nenhuma_
```
(sem resposta)
```
**Erro:** Request failed with status code 502

### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 18216ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json {   "diagnosis": "games-2026-feature.js: rank de GTA VI foi alterado de 1 para 99, quebrando a ordenação correta dos itens.",   "file": "front/assets/js/games-2026-feature.js",   "fix_type": "code_patch",   "patch": {     "search": "        {
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 14924ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** LOCAL_REAL_COVERS, rank, accent
```
```json {   "diagnosis": "3 bugs identificados nos diffs: (1) games-2026-feature.js linha 51: LOCAL_REAL_COVERS foi setado como undefined com declaração auxiliar _UNUSED_, quebrando getLocalRealCover(); (2) games-hub.js linha 5: rank do criador 'Hade
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 6904ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body
```
MISSÃO RECEBIDA Tipo: bug fix Risco: crítico Escopo: front/assets/css/styles.css  ```json {   "diagnosis": "body recebeu 'display: none;' que oculta todo o conteúdo do site — bug introduzido ao adicionar linha '+' com display:none antes da font-famil
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 26717ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "A variável CSS --accent foi alterada de #2dd881 (verde) para #ff0000 (vermelho) no arquivo front/assets/css/styles.css, linha 3. Isso quebra o esquema de cores do tema escuro, causando contraste inadequado e desvio do design
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 12159ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis": "z-index de main, header, footer e .topbar alterado de 1 para -1 (linha 31), colocando esses elementos atrás dos pseudo-elementos de fundo (z-index: 0) e causando sobreposição/falta de visibilidade do conteúdo principal.",   
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 22192ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "A variável CSS `--max` foi alterada de 1440px para 0px, fazendo com que `.container { width: min(var(--max), 92%); }` resulte em largura 0, colapsando o layout do site.",   "file": "front/assets/css/styles.css",   "fix_type"
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 18214ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
```json {   "diagnosis": "A rota GET /cover foi alterada para sempre retornar status 404 com mensagem de erro, substituindo o retorno correto do payload (`return res.json(payload)`). Isso impede a funcionalidade de consulta de capa de jogo.",   "file
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 6615ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT, falha
```
```json {   "diagnosis": "REQUEST_TIMEOUT_MS foi alterado de 12000ms (12 segundos) para 0ms, fazendo com que todas as requisições fetch abortem imediatamente sem timeout, causando falha em todas as chamadas de API de capas de jogos.",   "file": "back
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 17104ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
MISSÃO RECEBIDA Tipo: bug fix Risco: baixo Escopo: front/assets/js/runtime-config.js  HERMES - Contexto suficiente: diff + conteúdo do arquivo fornecidos. - Regras: R1 (evidência real presente), R2 (patch apenas em arquivo fornecido), R3 (não há arqu
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 4627ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, invertida, query
```
```json {   "diagnosis": "Bug introduzido no arquivo backend/src/routes/gamesRoutes.js: a condição do if foi invertida de !query (correto) para query (errado). Com a condição query, a rota retorna erro 400 quando query existe, impedindo a busca de ca
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 16442ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, vazio, descrição, Analista
```
```json {   "diagnosis": "O campo `desc` do agente `tech` foi esvaziado, removendo a descrição original que era exibida no site. Causa: alteração manual que substituiu o conteúdo por string vazia.",   "file": "front/assets/js/main.js",   "fix_type": 
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 17641ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, ReferenceError, undefined
```
```json {   "diagnosis": "A variável HERMES_AGENT foi comentada no diff, tornando-se undefined. Qualquer código que referencie esta variável (ex.: renderização de agente, navegação) quebrará com ReferenceError ou comportamento inesperado.",   "file":
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8034ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "ACCEPTANCE_THRESHOLD default foi alterado de 0.7 para 7 (linha 12). Como confidence é um valor entre 0 e 1, qualquer candidate com confidence < 7 será rejeitado, fazendo com que todos os covers sejam rejeitados (scoreGameCov
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7606ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, undefined, ReferenceError
```
```json {   "diagnosis": "A importação de clearGameCoverCache e resolveGameCover foi comentada, tornando essas funções undefined. As rotas /cover e /cover/cache/clear as utilizam, resultando em ReferenceError.",   "file": "backend/src/routes/gamesRou
```


