# Vision Core — Stress Test V2 Results

Data: 2026-06-13T10:58:27.243Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 16876ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 3 | 0 | 100% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 55062ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** LOCAL_REAL_COVERS, menu, menuToggle
```
```json {   "diagnosis": "Dois bugs identificados via diff: (1) games-2026-feature.js: linha em branco entre o fechamento do array 'groups' e a declaração de LOCAL_REAL_COVERS foi substituída por um comentário vazio '// ', que não quebra a sintaxe ma
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 18402ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json {   "diagnosis": "Rank do item 'Grand Theft Auto VI' foi alterado de 1 para 99, quebrando a ordenação esperada (rank 1 ausente).",   "file": "front/assets/js/games-2026-feature.js",   "fix_type": "code_patch",   "patch": {     "search": "rank
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 51703ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** LOCAL_REAL_COVERS, rank, accent
```
```json {   "diagnosis": "Três bugs: (1) games-2026-feature.js: LOCAL_REAL_COVERS anulado para undefined, quebrando carregamento de capas locais; (2) games-hub.js: rank do criador HadesPlays alterado de 1 para 99, desordenando ranking; (3) styles.css
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 3799ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body
```
```json {   "diagnosis": "body possui display: none, escondendo todo o conteúdo da página — o site fica com tela em branco",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "  display: none;",     "repl
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 7100ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "Cor CSS --accent alterada de #2dd881 (verde original) para #ff0000 (vermelho), quebrando o esquema de cores do tema escuro.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": " 
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 32511ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
  ```json {   "diagnosis": "DIFF mostra que z-index foi alterado de 1 para -1 em main, header, footer, .topbar. z-index: -1 coloca esses elementos atrás do body e seus pseudo-elementos (que usam z-index: 0), fazendo com que header, footer e main fiqu
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 8988ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "A variável CSS `--max` foi alterada de `1440px` para `0px`, fazendo com que a largura do container (`.container { width: min(var(--max), 92%); }`) seja calculada como `0px`, colapsando todo o layout do site.",   "file": "fro
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 8593ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
```json {   "diagnosis": "Rota GET /cover sempre retorna 404 independentemente do payload resolvido. A linha correta era `return res.json(payload);` e foi substituída por `return res.status(404).json({ ok: false, error: 'Rota não encontrada' });`.", 
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 13003ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT
```
```json {   "diagnosis": "REQUEST_TIMEOUT_MS definido como 0ms (em vez de 12000ms) causa aborto imediato de todas as chamadas fetchJson via AbortController, impedindo qualquer requisição a APIs externas (RAWG, SteamGridDB). Isso quebra a funcionalida
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 13475ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis": "API_BASE_URL foi alterada de 'https://api.technetgame.com.br' (produção) para 'http://localhost:3000' (localhost), impedindo que o site se conecte à API de produção.",   "file": "front/assets/js/runtime-config.js",   "fix_ty
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9328ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, invertida, query
```
```json {   "diagnosis": "Condição lógica invertida: `if (query)` valida que query existe para retornar erro 400, mas o correto é `if (!query)` — o erro só deve ocorrer quando query está vazio/ausente, não quando está presente.",   "file": "backend/s
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13055ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, vazio, descrição
```
MISSÃO RECEBIDA Tipo: bug fix Risco: baixo (desc vazia — quebra de conteúdo) Escopo: front/assets/js/main.js (AGENTS.tech.desc)  HERMES - Contexto: diff fornecido com evidência real; arquivo disponível. - Regra §53 aplicada: bug exclusivamente na lin
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 9430ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, ReferenceError
```
```json {   "diagnosis": "HERMES_AGENT constant foi comentada, causando ReferenceError quando referenciada em outras partes do código.",   "file": "front/assets/js/main.js",   "fix_type": "code_patch",   "patch": {     "search": "  // const HERMES_AG
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6563ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "A linha ACCEPTANCE_THRESHOLD foi alterada de default 0.7 para 7. Isso torna a função scoreGameCoverCandidate impossível de aceitar qualquer capa, pois confidence (0-1) nunca atinge threshold >= 7.",   "file": "backend/src/se
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 2126ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, ReferenceError
```
```json {   "diagnosis": "A linha de importação dos serviços clearGameCoverCache e resolveGameCover foi comentada, causando ReferenceError quando as rotas tentam utilizá‑los.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch"
```


