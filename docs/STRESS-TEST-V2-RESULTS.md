# Vision Core — Stress Test V2 Results

Data: 2026-06-12T13:14:25.929Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 14 |
| FAIL | 1 |
| Taxa de acerto | 93% |
| Tempo médio | 16427ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 2 | 1 | 67% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 11959ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** menu, menuToggle
```
```json {   "diagnosis": "games-2026-feature.js: linha comentário vazio '// ' adicionada após fechamento de array groups, sem impacto funcional, mas pode ser lixo. main.js: 'const menuToggle = document.querySelector('[data-menu-toggle]');' foi coment
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 50173ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank
```
```json [   {     "diagnosis": "O rank do jogo 'Grand Theft Auto VI' foi alterado incorretamente de 1 para 99 na lista de itens de jogos em 'games-2026-feature.js'.",     "file": "front/assets/js/games-2026-feature.js",     "fix_type": "code_patch", 
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 45536ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** LOCAL_REAL_COVERS, rank, accent
```
MISSÃO RECEBIDA Tipo: bug fix Risco: baixo Escopo: front/assets/js/games-2026-feature.js, front/assets/js/games-hub.js, front/assets/css/styles.css  HERMES - Três blocos de diff fornecidos, cada um correspondendo a um arquivo e um bug específico. - R
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 844ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body
```
```json {   "diagnosis": "display:none added to body hides entire page, causing site invisible",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "  display: none;",     "replace": ""   },   "confidence"
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 1165ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "Valor da variável CSS --accent alterado de #2dd881 (verde) para #ff0000 (vermelho), causando cores incorretas no tema.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "  --ac
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 7970ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis": "Bug de z-index: z-index: -1 em main, header, footer, .topbar coloca elementos estruturais atrás do fundo (z-index: 0), tornando conteúdo invisível ou não interativo.",   "file": "front/assets/css/styles.css",   "fix_type": "
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 8586ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "A variável CSS `--max` foi alterada de 1440px para 0px no arquivo front/assets/css/styles.css, linha 25. O valor 0px faz com que `width: min(var(--max), 92%)` no seletor `.container` resulte em largura zero, quebrando o layo
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 23555ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
```json {   "diagnosis": "A rota GET /cover foi alterada para retornar status 404 com mensagem de 'Rota não encontrada' em vez de retornar o payload real de resolveGameCover. Isso impede o funcionamento correto da rota, sempre retornando erro mesmo q
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 13682ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT
```
```json {   "diagnosis": "REQUEST_TIMEOUT_MS foi alterado de 12000 para 0, causando timeout imediato em toda requisição fetch (AbortController com 0ms). Isso quebra as funções fetchJson, fetchRawgCandidates e fetchSteamGridDbCandidates, impedindo o c
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 18430ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis": "API_BASE_URL foi alterado de produção para localhost, causando falha em todas as chamadas de API no site.",   "file": "front/assets/js/runtime-config.js",   "fix_type": "json_field",   "patch": { "target_title": "runtime_con
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8930ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, invertida, query
```
```json {   "diagnosis": "Linha 8 de gamesRoutes.js: condição invertida. O operador lógico foi alterado de `if (!query)` (correto) para `if (query)` (bug). Isso faz com que a rota retorne 400 quando query é fornecida, quebrando o fluxo normal.",   "f
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 15133ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, descrição, Analista
```
```json {   "diagnosis": "Bug 'desc' para agente 'Analista Técnico' foi esvaziado, causando falta de descrição na interface.",   "file": "front/assets/js/main.js",   "fix_type": "code_patch",   "patch": {     "search": "      desc: '',",     "replace
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 18735ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, ReferenceError
```
```json {   "diagnosis": "A constante HERMES_AGENT foi comentada no arquivo main.js, removendo a referência ao agente Hermes. Isso causa erro de referência (ReferenceError) se o código tentar acessar HERMES_AGENT em execução posterior, além de quebra
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11359ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "Default ACCEPTANCE_THRESHOLD foi alterado de 0.7 para 7 no diff, tornando o limiar impossível de atingir (confiança máxima é 1.0), o que rejeita todos os candidatos a cover e quebra o site.",   "file": "backend/src/services/
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10343ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, undefined, ReferenceError
```
```json {   "diagnosis": "O diff mostra que a importação de 'clearGameCoverCache' e 'resolveGameCover' foi comentada (linha +). Como a rota GET /cover chama resolveGameCover() e a rota POST /cover/cache/clear chama clearGameCoverCache(), ambos result
```


