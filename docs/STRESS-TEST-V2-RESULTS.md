# Vision Core — Stress Test V2 Results

Data: 2026-06-13T03:29:11.361Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 14921ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 3 | 0 | 100% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 52049ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** LOCAL_REAL_COVERS, menu, menuToggle
```
```json {   "diagnosis": "Linha vazia entre fechamento do array e declaração de LOCAL_REAL_COVERS foi substituída por comentário vazio '// ' — não quebra funcionalidade, mas é resíduo de edição que polui o código.",   "file": "front/assets/js/games-2
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 36953ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json {   "diagnosis": "Dois bugs identificados via DIFF: (1) em games-2026-feature.js, o rank de GTA VI foi alterado de 1 para 99, quebrando a ordenação correta dos itens; (2) em styles.css, a variável `--accent` foi alterada de #2dd881 (verde) pa
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 14234ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** LOCAL_REAL_COVERS, rank, accent
```
```json [   {     "diagnosis": "games-2026-feature.js: LOCAL_REAL_COVERS foi sobrescrito com undefined, quebrando getLocalRealCover e removendo capas locais.",     "file": "front/assets/js/games-2026-feature.js",     "fix_type": "code_patch",     "pa
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 15688ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body
```
```json {   "diagnosis": "Regra `display: none` foi adicionada no seletor `body`, ocultando todo o conteúdo do site.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "  display: none;\n",     "replace"
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 4809ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "O arquivo front/assets/css/styles.css teve a cor base --accent alterada de verde (#2dd881) para vermelho (#ff0000), conforme evidenciado pelo diff fornecido. Esta mudança afeta globalmente o esquema de cores do site, potenci
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 15870ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis": "z-index alterado de 1 para -1 – elementos main, header, footer e .topbar ficam atrás do fundo (z-index 0), quebrando interação e visibilidade do conteúdo principal.",   "file": "front/assets/css/styles.css",   "fix_type": "c
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 13134ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "A variável CSS `--max` foi alterada de 1440px para 0px, resultando em `width: min(0px, 92%)` → largura zero no container principal.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "sea
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 7692ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
```json {   "diagnosis": "A rota GET /cover foi alterada para sempre retornar 404 com 'Rota não encontrada' em vez do payload resolvido. O diff mostra que a linha correta `return res.json(payload);` foi substituída pela linha incorreta `return res.st
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 9257ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT
```
```json {   "diagnosis": "REQUEST_TIMEOUT_MS foi alterado de 12000ms para 0ms, causando timeout instantâneo em todas as requisições fetchJson. Isso impede o carregamento de capas de jogos, quebrando o site.",   "file": "backend/src/services/gameCover
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 5001ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis": "API_BASE_URL em runtime-config.js aponta para localhost:3000 em vez de produção. O código usa este valor como primeira opção no fallback, causando falha de conexão com o servidor real.",   "file": "front/assets/js/runtime-co
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10527ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, invertida, query, validação
```
```json {   "diagnosis": "Bug em gamesRoutes.js: condição invertida na validação de query. Linha original correta 'if (!query)' foi alterada para 'if (query)', fazendo com que a rota retorne erro 400 quando query é fornecida (comportamento correto) e
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7851ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, descrição
```
```json {   "diagnosis": "Descrição do agente 'tech' foi removida (linha 15 do diff), ficando com string vazia. Isso quebra a exibição do card do agente na página de tecnologia, deixando a descrição em branco.",   "file": "front/assets/js/main.js",  
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 16371ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, ReferenceError, undefined
```
```json {   "diagnosis": "A variável HERMES_AGENT foi comentada no diff (linha + com //), mas é referenciada posteriormente no código como HERMES_AGENT.name ou HERMES_AGENT.image, causando ReferenceError ou undefined em runtime. O bug está na linha c
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 5853ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "ACCEPTANCE_THRESHOLD definido como 7 (via fallback) em vez de 0.7. Isso impede qualquer candidato de ser aceito, pois confidence máxima é 1 e threshold=7 é muito maior.",   "file": "backend/src/services/gameCoverService.js",
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8528ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, ReferenceError
```
```json {   "diagnosis": "Bug em gamesRoutes.js: a importação de resolveGameCover e clearGameCoverCache foi comentada, causando ReferenceError ao chamar essas funções nas rotas GET /cover e POST /cover/cache/clear.",   "file": "backend/src/routes/gam
```


