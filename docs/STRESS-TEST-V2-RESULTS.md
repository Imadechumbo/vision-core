# Vision Core — Stress Test V2 Results

Data: 2026-06-13T14:21:46.453Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 15653ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 3 | 0 | 100% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 33931ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** LOCAL_REAL_COVERS, menu, menuToggle
```
```json {   "diagnosis": "menuToggle variable commented out in main.js e stray comment '// ' adicionado em games-2026-feature.js — a primeira quebra toggle do menu e a segunda é um resíduo sem impacto funcional.",   "file": "front/assets/js/main.js",
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 30396ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json {   "diagnosis": "Multi-file bugs detectados via DIFF: 1) front/assets/js/games-2026-feature.js — rank do GTA VI alterado de 1 para 99, quebrando ordenação correta da lista. 2) front/assets/css/styles.css — --accent alterado de #2dd881 (verde
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 42685ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** LOCAL_REAL_COVERS, rank, accent
```
```json {   "diagnosis": "Três bugs distintos: (1) LOCAL_REAL_COVERS setado como undefined em games-2026-feature.js, (2) rank do primeiro criador alterado de 1 para 99 em games-hub.js, (3) cor de destaque --accent alterada de #2dd881 para #ff0000 em 
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 17082ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body
```
```json {   "diagnosis": "Bug introduzido no body: a linha 'display: none;' foi adicionada, ocultando todo o conteúdo da página. O diff mostra que antes existia apenas 'font-family: ...' e agora há 'display: none;' antes de 'font-family: ...'.",   "f
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 5221ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "BUG DE DESIGN: Cor de destaque (--accent) alterada de verde (#2dd881) para vermelho (#ff0000), quebrando o esquema visual do tema escuro original. O diff mostra que a linha correta (verde) foi substituída pela linha errada (
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 11066ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis": "z-index alterado de 1 para -1 na linha de main, header, footer, .topbar, fazendo com que esses elementos fiquem atrás dos pseudo-elementos de fundo (z-index: 0) e da grade, causando invisibilidade ou sobreposição incorreta d
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 3734ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "A variável CSS `--max` foi alterada de `1440px` para `0px`, fazendo com que `.container { width: min(var(--max), 92%); }` resulte em `width: 0px`, colapsando todo o conteúdo do site.",   "file": "front/assets/css/styles.css"
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 3977ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
```json {   "diagnosis": "Rota GET /cover retorna erro 404 com mensagem fixa em vez de retornar o payload da capa do jogo, quebrando a funcionalidade.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "patch": {     "sear
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 21697ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT
```
```json {   "diagnosis": "REQUEST_TIMEOUT_MS foi alterado de 12000ms para 0ms. Timeout = 0ms faz com que todas as requisições fetch abortem imediatamente, impedindo o carregamento de capas de jogos.",   "file": "backend/src/services/gameCoverService.
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 13388ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis": "API_BASE_URL em runtime-config.js está configurada para localhost:3000, mas o ambiente é produção. O endpoint de produção em https://api.technetgame.com.br responde normalmente. Isso impede o site de comunicação com o backen
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 3708ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, invertida, query, validação
```
```json {   "diagnosis": "Bug de lógica invertida na validação de query. O diff mostra que a condição foi alterada de `if (!query)` (correto: retorna 400 quando query está vazia) para `if (query)` (incorreto: retorna 400 quando query tem valor, imped
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 26721ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, descrição, Analista
```
```json {   "diagnosis": "Descrição do agente 'Analista Técnico' (tech) foi intencionalmente ou acidentalmente esvaziada (''), removendo a string descritiva original. Isso provavelmente causa falta de texto em componentes que exibem a descrição do ag
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11459ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, ReferenceError
```
```json {   "diagnosis": "const HERMES_AGENT foi comentada com // na linha 64 (após diff), mas o sistema usa esta constante em runtime — conforme diff original, a linha - (versão correta) tem a constante ativa e a linha + (versão com bug) a comenta. 
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8793ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "O valor padrão de ACCEPTANCE_THRESHOLD foi alterado de 0.7 para 7 no diff, tornando a comparação de confiança impossível de ser atendida (threshold > 1.0), impedindo a aceitação de qualquer capa de jogo.",   "file": "backend
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 931ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, ReferenceError
```
```json {   "diagnosis": "clearGameCoverCache e resolveGameCover não são importados porque a linha de import foi comentada, provocando ReferenceError nas rotas de /cover e /cover/cache/clear.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_ty
```


