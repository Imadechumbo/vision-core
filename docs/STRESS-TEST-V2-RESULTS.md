# Vision Core — Stress Test V2 Results

Data: 2026-06-12T03:18:25.082Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 26002ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 3 | 0 | 100% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 37289ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** LOCAL_REAL_COVERS, menu, menuToggle
```
```json [   {     "diagnosis": "main.js: variável menuToggle foi comentada — se referenciada em outro ponto causa ReferenceError; funcionalidade do menu toggle foi desativada.",     "file": "front/assets/js/main.js",     "fix_type": "code_patch",    
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 46738ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json {   "diagnosis": "front/assets/js/games-2026-feature.js: rank de Grand Theft Auto VI alterado de 1 para 99, quebrando a ordenação correta da lista.",   "file": "front/assets/js/games-2026-feature.js",   "fix_type": "code_patch",   "patch": { 
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 80140ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** LOCAL_REAL_COVERS, rank, accent
```
```json {   "diagnosis": "A constante `LOCAL_REAL_COVERS` foi redefinida incorretamente como `undefined`, resultando na perda do mapeamento de capas de jogos locais e potenciais erros de runtime ao tentar acessá-la como um objeto.",   "file": "front/
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 786ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body
```
```json {   "diagnosis": "Linha extra 'display: none;' foi inserida no selector body, ocultando todo o conteúdo da página.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "  display: none;",     "repl
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 904ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "Variável CSS --accent foi alterada de #2dd881 (cor correta) para #ff0000 (cor errada) na linha 3 do arquivo front/assets/css/styles.css.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {    
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 21804ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis": "Bug em front/assets/css/styles.css: z-index: -1 em main, header, footer, .topbar enviando elementos para trás do pseudo-elemento body.home-dark-grid::before que tem z-index: 0. Correção: restaurar z-index para 1 como estava 
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 18739ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "A variável CSS --max foi alterada de 1440px para 0px no commit, fazendo com que .container { width: min(var(--max), 92%) } resulte em largura zero, quebrando o layout do site.",   "file": "front/assets/css/styles.css",   "fi
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 17641ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
```json {   "diagnosis": "Linha alterada no diff: substituiu retorno correto do payload por retorno de erro 404, causando falha na resposta da rota /cover",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "patch": {     "
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 68045ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT
```
```json {   "diagnosis": "A constante REQUEST_TIMEOUT_MS em backend/src/services/gameCoverService.js foi alterada para um valor padrão de 0, causando o abortamento imediato de todas as requisições HTTP e impedindo a busca de capas de jogos.",   "file
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 11578ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis": "API_BASE_URL em runtime-config.js foi alterado de 'https://api.technetgame.com.br' para 'http://localhost:3000', fazendo com que todas as requisições da aplicação tentem se conectar a um servidor local ao invés do servidor d
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 41970ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, invertida, query, validação
```
```json {   "diagnosis": "Linha 8 do arquivo backend/src/routes/gamesRoutes.js: condição invertida. O correto é verificar se query está VAZIA (falsy) para retornar erro 400. O diff mostra que a linha correta era 'if (!query)' e foi alterada para 'if 
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6108ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, descrição, Analista
```
```json {   "diagnosis": "O campo 'desc' do agente 'Analista Técnico' foi esvaziado (de 'Monitora software, plataformas, arquitetura e infraestrutura do ecossistema tech.' para ''), removendo a descrição textual que provavelmente é exibida na interfa
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 4709ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, ReferenceError, undefined
```
```json {   "diagnosis": "A constante HERMES_AGENT foi comentada (linha 61), mas o código em outro local referencia HERMES_AGENT, causando ReferenceError e quebra do site.",   "file": "front/assets/js/main.js",   "fix_type": "code_patch",   "patch": 
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 28177ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "Linha 12 contém bug: ACCEPTANCE_THRESHOLD usa valor padrão 7 (inteiro) em vez de 0.7 (decimal). Isso faz com que scoreGameCoverCandidate exija confidence >= 7, o que nunca é atingido (confidence máxima é 0.98), resultando em
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 5396ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, undefined, ReferenceError
```
```json {   "diagnosis": "Import de clearGameCoverCache e resolveGameCover comentado na linha 2 do arquivo backend/src/routes/gamesRoutes.js, causando ReferenceError ao tentar usar as funções nos endpoints /cover e /cover/cache/clear.",   "file": "ba
```


