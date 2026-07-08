# Vision Core — Stress Test V2 Results

Data: 2026-07-08T21:37:13.327Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 14159ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 3 | 0 | 100% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 36654ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** LOCAL_REAL_COVERS, menu, menuToggle
```
```json {   "diagnosis": "Dois bugs: (1) games-2026-feature.js: linha comentada vazia inserida após array groups; (2) main.js: declaração de menuToggle comentada, causando undefined se referenciada.",   "files": [     {       "file": "front/assets/js
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 16181ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json {   "diagnosis": "Dois bugs: (1) rank do GTA VI alterado de 1 para 99, quebrando ordenação esperada; (2) variável --accent alterada de #2dd881 para #ff0000, mudando a cor de destaque do site para vermelho.",   "files": [     {       "file": "
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12724ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** LOCAL_REAL_COVERS, rank, accent
```
```json {   "diagnosis": "Três bugs introduzidos via diff: (1) games-2026-feature.js: LOCAL_REAL_COVERS setado como undefined quebra getLocalRealCover; (2) games-hub.js: HadesPlays teve rank alterado de 1 para 99; (3) styles.css: --accent alterado de
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 29142ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body, visibilidade
```
MISSÃO RECEBIDA   Tipo: bug fix   Risco: crítico   Escopo: front/assets/css/styles.css (linha do body)  ```json {   "diagnosis": "A propriedade `display: none;` foi adicionada ao body (linha do diff com +), ocultando todo o conteúdo da página. O códi
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 7826ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "A variável CSS `--accent` foi alterada de `#2dd881` (verde) para `#ff0000` (vermelho), quebrando o esquema de cores do site.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 23021ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
MISSÃO RECEBIDA Tipo: bug fix Risco: baixo Escopo: front/assets/css/styles.css  HERMES - Contexto: DIFF fornecido com evidência real. Arquivo styles.css presente. - Regras: §53 focada exclusivamente no DIFF. Linhas afetadas: `main, header, footer, .t
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 18950ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "Variável CSS --max foi alterada de 1440px para 0px, causando colapso do layout ao definir width: min(var(--max), 92%) como 0px.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search"
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 4358ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
```json {   "diagnosis": "A resposta da rota '/cover' retorna erroneamente 404 em vez do payload obtido, impedindo o cliente de receber a capa do jogo.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "patch": {     "sea
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 10619ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT
```
```json {   "diagnosis": "REQUEST_TIMEOUT_MS foi alterado de 12000 para 0, fazendo com que o timeout do AbortController dispare imediatamente, abortando todas as requisições de API de capas de jogos.",   "file": "backend/src/services/gameCoverService
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7916ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis": "API_BASE_URL foi alterada de 'https://api.technetgame.com.br' para 'http://localhost:3000' no arquivo runtime-config.js, fazendo com que todas as requisições da aplicação tentem conectar ao servidor local, que não existe em 
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 4794ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, query, validação
```
```json {   "diagnosis": "O operador de negação (!) foi removido antes da condição `query` na rota GET /cover, invertendo a lógica. Agora um 400 é retornado quando query tem valor (comportamento errado) em vez de quando query está vazia (comportament
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7281ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, descrição, Analista
```
```json {   "diagnosis": "A descrição do agente 'Analista Técnico' foi removida (desc: '') no arquivo main.js, quebrando exibição de informações do agente na interface.",   "file": "front/assets/js/main.js",   "fix_type": "code_patch",   "patch": {  
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 17880ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, ReferenceError
```
```json {   "diagnosis": "Constante HERMES_AGENT foi comentada indevidamente no front/assets/js/main.js, removendo a definição do agente Hermes. Isso causa erro de referência (ReferenceError) em qualquer parte do código que dependa dessa variável.", 
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9328ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "O valor padrão do ACCEPTANCE_THRESHOLD foi alterado de 0.7 para 7 no diff introduzido. Isso quebra a lógica de aceitação de capas porque o threshold agora é 7, enquanto as pontuações de confiança variam entre 0 e 1 — nenhum 
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 5718ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, undefined, ReferenceError
```
```json {   "diagnosis": "A importação de `clearGameCoverCache` e `resolveGameCover` foi comentada, causando `ReferenceError` nas rotas que utilizam essas funções (`/cover` e `/cover/cache/clear`).",   "file": "backend/src/routes/gamesRoutes.js",   "
```


