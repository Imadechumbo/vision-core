# Vision Core — Stress Test V2 Results

Data: 2026-06-11T23:17:54.209Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 13 |
| FAIL | 2 |
| Taxa de acerto | 87% |
| Tempo médio | 18525ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 2 | 1 | 67% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 3 | 1 | 75% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ❌ FAIL | **Dificuldade:** HARD | **Tempo:** 0ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** _nenhuma_
```
(sem resposta)
```
**Erro:** Request failed with status code 504

### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 23475ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json {   "diagnosis": "Múltiplos bugs: (1) games-2026-feature.js linha com rank:99 em vez de rank:1 para GTA VI, quebrando ordenação; (2) styles.css linha --accent: #ff0000 em vez de #2dd881, alterando cor de destaque do site.",   "file1": "front/
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 35799ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** LOCAL_REAL_COVERS, rank, accent
```
```json {   "diagnosis": "Três bugs introduzidos em arquivos diferentes: (1) games-2026-feature.js: LOCAL_REAL_COVERS definido como undefined ao invés de objeto, quebrando lookup de capas locais. (2) games-hub.js: rank do primeiro criador alterado de
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 1656ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body
```
```json {   "diagnosis": "O corpo do documento está com a propriedade 'display' definida como 'none', o que impede a visualização do conteúdo.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "display:
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 13761ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "A variável CSS `--accent` foi alterada de #2dd881 (verde) para #ff0000 (vermelho), corrompendo o esquema de cores do site. A cor original é a desejada para manter a identidade visual com destaque verde.",   "file": "front/as
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 9128ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis": "z-index de main/header/footer/topbar alterado de 1 para -1, colocando esses elementos atrás do fundo (z-index: 0) e do container (z-index: 1). Causa desaparecimento visual de header, footer, topbar e conteúdo principal.",   
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 9855ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "A variável CSS `--max` foi alterada de `1440px` para `0px` no diff fornecido, fazendo com que `.container { width: min(var(--max), 92%) }` calcule largura zero, colapsando o layout do site.",   "file": "front/assets/css/styl
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 10162ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
```json {   "diagnosis": "A rota GET /cover retorna status 404 com mensagem 'Rota não encontrada' para toda requisição válida, pois a linha de resposta correta (res.json(payload)) foi substituída por res.status(404).json(...) no diff introduzido.",  
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 11457ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT
```
```json {   "diagnosis": "O valor padrão de REQUEST_TIMEOUT_MS foi alterado de 12000ms (12 segundos) para 0ms. Timeout 0ms faz com que todas as requisições de fetch da API expirem imediatamente, quebrando a busca de capas de jogos.",   "file": "backe
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ❌ FAIL | **Dificuldade:** HARD | **Tempo:** 0ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** _nenhuma_
```
(sem resposta)
```
**Erro:** Request failed with status code 504

### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 44032ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, invertida, query, validação
```
```json {   "diagnosis": "Inversão da condição de validação em router.get('/cover') — a condição original (!query) foi trocada por (query), fazendo com que requisições SEM query retornem sucesso e requisições COM query retornem erro 400.",   "file": 
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8769ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, descrição, Analista
```
```json {   "diagnosis": "O campo 'desc' do objeto 'tech' em AGENTS foi alterado para string vazia, removendo a descrição do Analista Técnico e afetando a exibição no site.",   "file": "front/assets/js/main.js",   "fix_type": "code_patch",   "patch":
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9729ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, ReferenceError
```
```json {   "diagnosis": "main.js linha 61: a declaração `const HERMES_AGENT` foi comentada, tornando a variável `HERMES_AGENT` indefinida. Qualquer código que referencie essa variável (por exemplo, para exibir o agente Hermes) causará um ReferenceEr
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 24467ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "ACCEPTANCE_THRESHOLD foi alterada de 0.7 para 7 (linha 13), tornando o limiar de aceitação extremamente alto (7.0). Como confidence é um valor entre 0 e 1, nenhum candidato atinge o threshold e todos são rejeitados, resultan
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 38534ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, ReferenceError
```
```json {   "diagnosis": "Import de clearGameCoverCache e resolveGameCover foi comentado na linha 2, causando ReferenceError quando as rotas /cover e /cover/cache/clear são acessadas — resolveGameCover e clearGameCoverCache não estão definidos no esc
```


