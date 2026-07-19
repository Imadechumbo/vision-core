# Vision Core — Stress Test V2 Results

Data: 2026-07-19T00:38:17.594Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 11223ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 3 | 0 | 100% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1530ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** menu, menuToggle
```
```json {   "diagnosis": "Linhas comentadas introduzem bugs: em games-2026-feature.js há um comentário stray que quebra a estrutura esperada; em main.js o menuToggle foi comentado, causando ReferenceError ao ser usado.",   "files": [     {       "fil
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 42371ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json {   "diagnosis": "Dois bugs visíveis nos diffs fornecidos: 1) rank do GTA VI alterado de 1 para 99 no array de items, quebrando a ordenação; 2) cor de destaque do tema alterada de #2dd881 (verde do padrão visual) para #ff0000 (vermelho), comp
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10294ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** LOCAL_REAL_COVERS, rank, accent
```
```json {   "diagnosis": "Três bugs introduzidos por alterações manuais incorretas: (1) LOCAL_REAL_COVERS foi setado como undefined em games-2026-feature.js, (2) rank do primeiro criador alterado para 99 em games-hub.js, (3) cor de destaque --accent 
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 10730ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body, visibilidade
```
MISSÃO RECEBIDA Tipo: bug fix Risco: alto (site invisível) Escopo: front/assets/css/styles.css  HERMES - RCA: `display: none` foi adicionado ao body, ocultando todo o conteúdo do site.  SCANNER - Arquivo: front/assets/css/styles.css - Linha afetada: 
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 9116ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "A variável CSS `--accent` foi alterada de `#2dd881` (verde) para `#ff0000` (vermelho), provavelmente quebrando o esquema de cores do site e tornando o destaque visual agressivo ou fora do tema escuro.",   "file": "front/asse
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 8661ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis": "z-index: -1 em main, header, footer, .topbar coloca esses elementos atrás do grid de fundo (z-index: 0), tornando conteúdo invisível ou inoperável — o bug foi introduzido ao alterar de 1 para -1.",   "file": "front/assets/cs
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7085ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "A variável CSS `--max` foi alterada de 1440px para 0px, fazendo com que `.container` tenha `width: min(0, 92%)` = 0, quebrando o layout do site.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 7934ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
MISSÃO RECEBIDA Tipo: bug fix Risco: médio Escopo: backend/src/routes/gamesRoutes.js  HERMES - Contexto fornecido via diff e código completo. - Regras: §53 (foco exclusivo no diff), R2 (patch apenas no arquivo fornecido).  ```json {   "diagnosis": "B
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 14062ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT
```
MISSÃO RECEBIDA Tipo: bug fix Risco: alto Escopo: backend/src/services/gameCoverService.js  ```json {   "diagnosis": "REQUEST_TIMEOUT_MS foi alterado de 12000 (12s) para 0 (zero), fazendo com que fetchJson crie um AbortController com timeout zero, ab
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6591ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis": "API_BASE_URL foi alterada para http://localhost:3000 no diff, fazendo todas as chamadas de API apontarem para o localhost em vez do servidor de produção. Isso quebra o site.",   "file": "front/assets/js/runtime-config.js",  
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10871ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, invertida, query, validação
```
```json {   "diagnosis": "Inversão da condição de validação: `if (query)` retorna 400 quando query existe, mas deveria retornar 400 quando query está vazia. O correto é `if (!query)`.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "co
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7740ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, descrição, Analista
```
```json {   "diagnosis": "A propriedade 'desc' do agente 'Analista Técnico' (tech) foi esvaziada ('') no commit, removendo a descrição do card no site.",   "file": "front/assets/js/main.js",   "fix_type": "code_patch",   "patch": {     "search": "des
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10085ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, ReferenceError, undefined
```
```json {   "diagnosis": "A constante HERMES_AGENT foi comentada no diff, tornando-a undefined. Se referenciada em outras partes do site, causa ReferenceError e quebra da funcionalidade de exibição do agente Hermes.",   "file": "front/assets/js/main.
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12637ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
MISSÃO RECEBIDA Tipo: bug fix Risco: alto Escopo: backend/src/services/gameCoverService.js  ```json {   "diagnosis": "ACCEPTANCE_THRESHOLD foi alterado de 0.7 para 7 no diff. Consequentemente, scoreGameCoverCandidate() agora exige confidence >= 7 par
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8631ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, ReferenceError
```
```json {   "diagnosis": "Importação das funções clearGameCoverCache e resolveGameCover foi comentada por engano, causando ReferenceError nas rotas /cover e /cover/cache/clear.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patc
```


