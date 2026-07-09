# Vision Core — Stress Test V2 Results

Data: 2026-07-09T13:40:33.711Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 12723ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 3 | 0 | 100% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 28443ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** LOCAL_REAL_COVERS, menu, menuToggle
```
```json {   "diagnosis": "Dois arquivos modificados com bugs: (1) games-2026-feature.js: linha de comentário vazia inserida onde antes havia linha em branco, poluindo o código; (2) main.js: declaração de menuToggle comentada, quebrando a funcionalida
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 18097ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json {   "diagnosis": "Em games-2026-feature.js, o rank do item GTA VI foi alterado de 1 para 99, quebrando a ordenação correta. Em styles.css, a variável --accent foi alterada de #2dd881 para #ff0000, descaracterizando a cor principal do tema.", 
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 21289ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** LOCAL_REAL_COVERS, rank, accent
```
```json {   "diagnosis": "Três arquivos com bugs introduzidos por modificações acidentais nos diffs: games-2026-feature.js teve LOCAL_REAL_COVERS sobrescrito para undefined; games-hub.js teve rank do primeiro criador alterado de 1 para 99; styles.css
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 13036ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body
```
```json {   "diagnosis": "Linha 'display: none;' adicionada ao body (diff + display: none;) faz o site inteiro ficar invisível. O original possuía apenas font-family, color e background.",   "file": "front/assets/css/styles.css",   "fix_type": "code_
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 7513ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "A cor de destaque (--accent) foi alterada de #2dd881 (verde) para #ff0000 (vermelho), quebrando o esquema de cores do design system. O diff mostra que a linha correta era a versão com --accent: #2dd881 (linha com sinal -) e 
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 9228ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis": "O bug introduzido no diff alterou o z-index de 'main, header, footer, .topbar' de 1 para -1, fazendo com que esses elementos fiquem atrás do pseudo-elemento body.home-dark-grid::before (z-index: 0), tornando o conteúdo do si
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 10206ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "Arquivo front/assets/css/styles.css: variável CSS --max foi alterada de 1440px para 0px, fazendo o layout do container colapsar para largura 0.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch"
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 9034ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
```json {   "diagnosis": "A rota GET /cover sempre retorna status 404 com erro 'Rota não encontrada', ignorando o resultado de resolveGameCover. O diff mostra que 'return res.json(payload)' foi substituído por 'return res.status(404).json(...)', caus
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 11917ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT
```
```json {   "diagnosis": "Timeout de requisição alterado de 12000ms para 0ms — todas as chamadas fetch são abortadas instantaneamente, impedindo carregamento de capas de jogos",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "cod
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 12294ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis": "API_BASE_URL foi alterado de 'https://api.technetgame.com.br' para 'http://localhost:3000' no runtime-config.js, fazendo com que o site tente consumir uma API local inexistente em vez da API de produção.",   "file": "front/a
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 14672ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, invertida, query, validação
```
```json {   "diagnosis": "Bug na rota GET /cover: condição invertida. Linha original verifica 'if (!query)' para retornar erro quando query é vazia, mas foi trocada para 'if (query)', que retorna erro quando query tem valor — impedindo qualquer consu
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8142ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, descrição, Analista
```
```json {   "diagnosis": "A descrição do agente 'Analista Técnico' foi esvaziada (desc: '') no diff, removendo o texto informativo original. Isso quebra a exibição da descrição no site, tornando-a vazia.",   "file": "front/assets/js/main.js",   "fix_
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12171ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, ReferenceError
```
```json {   "diagnosis": "A variável `HERMES_AGENT` foi comentada (linha 61), removendo sua definição. Se houver referência a ela em outras partes do código, isso causa ReferenceError. A correção é restaurar a declaração ativa.",   "file": "front/ass
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13190ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "O valor do ACCEPTANCE_THRESHOLD foi alterado de 0.7 para 7 (linha 11), tornando impossível que qualquer candidato de capa seja aceito, pois o confidence das capas varia entre 0 e 1. Isso quebra a exibição de capas no site.",
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1619ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, ReferenceError
```
```json {   "diagnosis": "A importação de clearGameCoverCache e resolveGameCover foi comentada, provocando ReferenceError nas rotas que as utilizam",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "patch": {     "search"
```


