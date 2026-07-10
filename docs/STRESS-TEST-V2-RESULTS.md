# Vision Core — Stress Test V2 Results

Data: 2026-07-10T19:07:33.213Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 17961ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 3 | 0 | 100% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 30667ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** LOCAL_REAL_COVERS, menu, menuToggle
```
```json {   "diagnosis": "Dois bugs identificados: (1) Em games-2026-feature.js, uma linha vazia '//' foi inserida antes de LOCAL_REAL_COVERS, descolando o bloco de dados do seu contexto de declaração — isso quebra a associação do objeto ao escopo da
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13987ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json {   "diagnosis": "Dois bugs nos diffs fornecidos: (1) em games-2026-feature.js, o rank de Grand Theft Auto VI foi alterado de 1 para 99, desordenando a lista; (2) em styles.css, a variável --accent foi alterada de #2dd881 (verde) para #ff0000
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 29874ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** LOCAL_REAL_COVERS, rank, accent
```
```json {   "diagnosis": "Três bugs independentes: (1) games-2026-feature.js: LOCAL_REAL_COVERS foi setado como undefined, quebrando getLocalRealCover(); (2) games-hub.js: rank do primeiro creator alterado de 1 para 99, quebrando ordenação; (3) style
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 1427ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body
```
```json {   "diagnosis": "display:none foi inserido erroneamente no <body>, ocultando todo o site",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "  display: none;",     "replace": ""   },   "confiden
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 7104ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "A variável CSS --accent foi alterada de #2dd881 (verde) para #ff0000 (vermelho), quebrando o esquema de cores do tema escuro.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": 
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 8698ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis": "O z-index de main, header, footer e .topbar foi alterado de 1 para -1 (diff: +main, header, footer, .topbar { position: relative; z-index: -1; }), fazendo com que esses elementos fiquem atrás do overlay da grid (z-index: 0) 
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 14032ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "A variável CSS `--max` foi alterada de `1440px` para `0px` no arquivo styles.css, fazendo com que `.container { width: min(var(--max), 92%); }` resulte em largura zero (`min(0px, 92%) = 0px`), quebrando o layout do site.",  
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 9477ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
```json {   "diagnosis": "A rota GET /cover sempre retorna status 404 com mensagem 'Rota não encontrada' em vez de retornar o payload de resolveGameCover. A linha correta era return res.json(payload);.",   "file": "backend/src/routes/gamesRoutes.js",
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 25646ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT, falha
```
```json {   "diagnosis": "Timeout de requisição definido como 0ms causa abort imediato de todas as requisições fetch para APIs externas (SteamGridDB e RAWG), resultando em falha total na resolução de game covers.",   "file": "backend/src/services/gam
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 8595ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis": "API_BASE_URL foi alterada de 'https://api.technetgame.com.br' para 'http://localhost:3000' no arquivo front/assets/js/runtime-config.js, fazendo com que o site tente se conectar a um servidor local inexistente em vez do back
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8219ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, invertida, query, validação
```
```json {   "diagnosis": "Condição invertida em gamesRoutes.js linha 8: '!query' foi trocado por 'query', fazendo com que requisições com parâmetro válido retornem erro 400.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8678ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, descrição
```
```json {   "diagnosis": "Bug introduzido no diff: desc do agente tech foi esvaziada (desc: '' em vez de desc: 'Monitora software, plataformas...'). Isso causa quebra na interface ao tentar exibir a descrição vazia. RCA: diff mostra - com o texto cor
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12102ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, ReferenceError, undefined
```
```json {   "diagnosis": "HERMES_AGENT constant was commented out, causing it to be undefined. Any code referencing it will throw ReferenceError.",   "file": "front/assets/js/main.js",   "fix_type": "code_patch",   "patch": {     "search": "  // cons
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 24361ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "ACCEPTANCE_THRESHOLD default foi alterado de 0.7 (limiar de confiança decimal, 0-1) para 7 (valor inteiro inválido), fazendo com que covers raramente sejam aceitos — confidence raramente atinge 7.0, logo scoreGameCoverCandid
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 66543ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, ReferenceError
```
```json {   "diagnosis": "As funções `resolveGameCover` e `clearGameCoverCache` são utilizadas em `gamesRoutes.js`, mas o import que as declara foi comentado, resultando em `ReferenceError` em tempo de execução.",   "file": "backend/src/routes/gamesR
```


