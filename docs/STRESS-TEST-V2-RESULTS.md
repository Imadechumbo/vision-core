# Vision Core — Stress Test V2 Results

Data: 2026-07-11T19:32:37.642Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 17230ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 3 | 0 | 100% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 38485ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** LOCAL_REAL_COVERS, menu, menuToggle
```
MISSÃO RECEBIDA Tipo: bug fix Risco: médio Escopo: 2 arquivos — games-2026-feature.js e main.js  HERMES - Contexto fornecido: 2 diffs + conteúdo completo dos arquivos + URL da Rockstar Games (irrelevante para os bugs). - Regras aplicadas: §53 (foco e
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7630ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json {   "diagnosis": "Dois bugs identificados via DIFF: (1) rank de 'Grand Theft Auto VI' alterado de 1 para 99 no array items, quebrando a ordenação; (2) cor --accent alterada de #2dd881 para #ff0000, rompendo o tema visual verde-escuro.",   "fi
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10583ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** LOCAL_REAL_COVERS, rank, accent
```
```json {   "diagnosis": "Três bugs independentes em arquivos distintos: (1) games-2026-feature.js: LOCAL_REAL_COVERS sobrescrita com undefined, (2) games-hub.js: rank do primeiro criador alterado de 1 para 99, (3) styles.css: cor de destaque --accen
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 15661ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body
```
```json {   "diagnosis": "Linha 'display: none;' adicionada ao body (bug introduzido no diff como linha +). A linha correta existente no diff original era apenas 'font-family: ...' (-), e 'display: none;' foi inserida indevidamente (+), ocultando tod
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 13335ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "A variável CSS `--accent` foi alterada de `#2dd881` (verde) para `#ff0000` (vermelho), quebrando o esquema de cores verde-acinzentado do design system. A cor de destaque incorreta afeta todos os elementos que usam `var(--acc
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 7361ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis": "Bug introduzido no diff: z-index de main, header, footer e .topbar foi alterado de 1 para -1, fazendo com que esses elementos fiquem atrás do fundo (body pseudo-elementos com z-index:0) e fiquem invisíveis ou sem interação."
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 17392ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "A variável CSS --max foi alterada de 1440px para 0px no arquivo front/assets/css/styles.css — isso quebra o layout do container que usa width: min(var(--max), 92%), resultando em largura 0.",   "file": "front/assets/css/styl
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 27348ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
```json {   "diagnosis": "O bug está na rota GET /cover: a linha correta `return res.json(payload);` foi substituída pela linha incorreta `return res.status(404).json({ ok: false, error: 'Rota não encontrada' });`, retornando erro 404 para qualquer r
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 9066ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT
```
```json {   "diagnosis": "O timeout das requisições HTTP foi alterado de 12000ms para 0ms, fazendo com que todas as chamadas a APIs externas (RAWG, SteamGridDB) abortem imediatamente via AbortController, impedindo a recuperação de capas de jogos.",  
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 6764ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis": "Em front/assets/js/runtime-config.js, a variável API_BASE_URL foi alterada de 'https://api.technetgame.com.br' para 'http://localhost:3000', fazendo com que todas as chamadas de API tentem acessar o servidor local, o que que
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8048ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, invertida, query, validação
```
```json {   "diagnosis": "Rota /cover em gamesRoutes.js — condição de validação invertida. O diff mostra que a linha original correta `if (!query)` foi trocada por `if (query)`, fazendo com que a requisição retorne erro 400 quando o parâmetro `q` é f
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 21660ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, descrição, Analista
```
```json {   "diagnosis": "No objeto AGENTS.tech, o campo 'desc' foi esvaziado (linha 18 do arquivo front/assets/js/main.js), removendo a descrição do agente 'Analista Técnico'. O valor correto deve ser o texto original.",   "file": "front/assets/js/m
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 66527ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, ReferenceError
```
```json {   "diagnosis": "A constante HERMES_AGENT foi comentada, desativando sua definição e causando um potencial ReferenceError se a variável for utilizada em outro lugar do código.",   "file": "front/assets/js/main.js",   "fix_type": "code_patch"
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7924ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "O threshold de aceitação (ACCEPTANCE_THRESHOLD) foi alterado de 0.7 para 7, tornando impossível qualquer candidato ser aceito (confiança máxima é 1.0). Isso impede o site de exibir capas de jogos.",   "file": "backend/src/se
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 660ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, ReferenceError
```
```json {   "diagnosis": "A importação dos serviços clearGameCoverCache e resolveGameCover foi comentada, provocando ReferenceError nas rotas que as utilizam.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "patch": {  
```


