# Vision Core — Stress Test V2 Results

Data: 2026-06-11T17:10:05.298Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 12 |
| FAIL | 3 |
| Taxa de acerto | 80% |
| Tempo médio | 19762ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 1 | 2 | 33% |
| B — CSS | 3 | 1 | 75% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ❌ FAIL | **Dificuldade:** HARD | **Tempo:** 51815ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** LOCAL_REAL_COVERS
```
```json {   "diagnosis": "Uma linha em branco necessária para formatação entre o array 'groups' e o objeto 'LOCAL_REAL_COVERS' foi substituída por um comentário '// ', impactando a legibilidade.",   "file": "front/assets/js/games-2026-feature.js",   
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 31342ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** _nenhuma_
```
⚠️ **Todos os provedores de IA falharam** (payload: 15341 chars).  Causas prováveis: - API keys ausentes ou quota esgotada (ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY) - Payload grande demais (Groq free: ≤6K tokens ≈ 24K chars) - Erro de rede ou
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 28523ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** LOCAL_REAL_COVERS, rank, accent
```
```json {   "diagnosis": "Três bugs introduzidos por alterações nos diffs: (1) LOCAL_REAL_COVERS em games-2026-feature.js foi trocado para undefined, quebrando getLocalRealCover; (2) rank do criador HadesPlays em games-hub.js foi alterado de 1 para 9
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 835ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body
```
```json {   "diagnosis": "display: none; added to body hides all page content, causing the site to appear blank",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "  display: none;",     "replace": ""   
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ❌ FAIL | **Dificuldade:** MEDIUM | **Tempo:** 31095ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** _nenhuma_
```
⚠️ **Todos os provedores de IA falharam** (payload: 2108 chars).  Causas prováveis: - API keys ausentes ou quota esgotada (ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY) - Payload grande demais (Groq free: ≤6K tokens ≈ 24K chars) - Erro de rede ou 
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 12604ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis": "Linha 31: z-index foi alterado de 1 para -1 no seletor main, header, footer, .topbar, fazendo com que esses elementos fiquem posicionados atrás de outros componentes (como o pseudo-elemento da grid), causando o problema visu
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 18429ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "A variável CSS `--max` foi alterada de `1440px` para `0px`. `--max` é usada em `.container { width: min(var(--max), 92%); }`. Com valor `0px`, `.container` tem largura zero, colapsando o layout do site.",   "file": "front/as
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 14039ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
```json {   "diagnosis": "Linha 11 do arquivo backend/src/routes/gamesRoutes.js teve seu retorno alterado de res.json(payload) para uma resposta fixa de 404, impedindo que o jogo retorne a capa corretamente. O rota /cover sempre retorna 'Rota não enc
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 29358ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT
```
```json {   "diagnosis": "REQUEST_TIMEOUT_MS = 0 faz com que o setTimeout no fetchJson dispare imediatamente, abortando todas as requisições fetch antes de qualquer resposta.",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 13890ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis": "API_BASE_URL em runtime-config.js aponta para localhost:3000 (ambiente de desenvolvimento) em vez da URL de produção https://api.technetgame.com.br. O código restante usa fallbacks corretos, mas esta configuração causa conex
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 844ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, invertida, query
```
```json {   "diagnosis": "Condição invertida impede verificação de query vazia, resultando em erro 400 nunca retornado",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "if (query) {",     "replac
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 20868ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, vazio, descrição, Analista
```
```json {   "diagnosis": "O campo 'desc' do agente 'Analista Técnico' no objeto AGENTS.tech foi esvaziado (desc: ''), removendo a descrição que deveria ser 'Monitora software, plataformas, arquitetura e infraestrutura do ecossistema tech.'",   "file"
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 20049ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, ReferenceError
```
```json {   "diagnosis": "HERMES_AGENT foi comentado erroneamente no diff, quebrando referências ao agente Hermes em runtime",   "file": "front/assets/js/main.js",   "fix_type": "code_patch",   "patch": {     "search": "// const HERMES_AGENT = { name
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8160ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "ACCEPTANCE_THRESHOLD foi alterado de 0.7 para 7, tornando impossível qualquer capa ser aceita (threshold > 1). Causa: erro de digitação no valor padrão.",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 14585ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, ReferenceError
```
```json {   "diagnosis": "Importação dos serviços gameCoverService.js foi comentada, causando ReferenceError ao usar resolveGameCover e clearGameCoverCache nas rotas.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "pat
```


