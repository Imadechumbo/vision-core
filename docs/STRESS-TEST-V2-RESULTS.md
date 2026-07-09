# Vision Core — Stress Test V2 Results

Data: 2026-07-09T06:41:06.008Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 11425ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 3 | 0 | 100% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1614ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** menu, menuToggle
```
```json {   "diagnosis": "Dois bugs introduzidos nas linhas modificadas: (1) comentário vazio \"// \" em games-2026-feature.js cria ruído desnecessário; (2) desativação da linha de menuToggle em main.js impede o toggle do menu.",   "files": [     {  
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12182ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json {   "diagnosis": "Dois bugs: (1) rank de GTA VI alterado de 1 para 99 no array items; (2) cor de destaque --accent alterada de #2dd881 para #ff0000, quebrando o design.",   "files": [     {       "file": "front/assets/js/games-2026-feature.js
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12574ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** LOCAL_REAL_COVERS, rank, accent
```
```json {   "diagnosis": "Três bugs introduzidos simultaneamente: (1) games-2026-feature.js: LOCAL_REAL_COVERS foi anulada com undefined, quebrando carregamento de capas locais; (2) games-hub.js: rank do primeiro criador alterado de 1 para 99, desord
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 6504ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body
```
```json {   "diagnosis": "Body oculto por display:none — linha 20 adicionada no diff, causa site invisível",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "  display: none;\n  font-family: 'Roboto', s
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 12892ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "A variável CSS `--accent` foi alterada de `#2dd881` (verde) para `#ff0000` (vermelho), quebrando o esquema de cores do site. O valor original `#2dd881` é usado como base para as variáveis `--accent-dark`, `--accent-soft`, `-
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 45777ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "decisao": "NEEDS_FIX",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "main, header, footer, .topbar { position: relative; z-index: -1; }",     "replace": "main, header, footer, .topbar { 
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6991ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "A propriedade CSS `--max` foi alterada de `1440px` para `0px`, fazendo com que `.container` tenha largura zero (via `width: min(var(--max), 92%)`), quebrando o layout do site.",   "file": "front/assets/css/styles.css",   "fi
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 7020ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
```json {   "diagnosis": "Linha 17 foi alterada para retornar sempre 404 em vez de retornar o payload de resolveGameCover, quebrando a rota /cover.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "patch": {     "search"
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 13570ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT, falha
```
```json {   "diagnosis": "REQUEST_TIMEOUT_MS foi alterado de 12000 para 0, causando aborto imediato de todas as requisições fetch em fetchJson, quebrando o carregamento de capas de jogos.",   "file": "backend/src/services/gameCoverService.js",   "fix
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 11051ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis": "API_BASE_URL foi alterada de 'https://api.technetgame.com.br' para 'http://localhost:3000' no diff, fazendo com que todas as chamadas de API do frontend apontem para localhost em vez do servidor de produção.",   "file": "fro
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11089ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, invertida, query, validação
```
```json {   "diagnosis": "condição de validação de query invertida no endpoint GET /cover: a expressão `if (query)` retorna erro 400 quando o parâmetro é fornecido, impedindo o fluxo normal de resolução da capa e quebrando a funcionalidade do site.",
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 5523ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, vazio, descrição, Analista
```
```json {   "diagnosis": "Campo 'desc' do agente 'Analista Técnico' foi esvaziado (linha 15 do diff original), removendo a descrição que deveria estar presente.",   "file": "front/assets/js/main.js",   "fix_type": "code_patch",   "patch": {     "sear
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7398ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, ReferenceError, undefined
```
```json {   "diagnosis": "A variável HERMES_AGENT foi comentada com //, removendo a definição do objeto Hermes do escopo de execução. Se algum código depende dessa referência (como renderização de avatar ou nome), resultará em ReferenceError ou undef
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 16368ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "O valor padrão de ACCEPTANCE_THRESHOLD foi alterado de 0.7 para 7, tornando o limiar de aceitação maior que o intervalo de confiança (0 a 1), resultando em nenhum cover sendo aceito (sempre 'below-threshold').",   "file": "b
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 821ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, ReferenceError
```
```json {   "diagnosis": "Import of clearGameCoverCache and resolveGameCover is commented out, causing ReferenceError when the routes use these functions",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "patch": {     "s
```


