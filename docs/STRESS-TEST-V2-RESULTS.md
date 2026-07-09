# Vision Core — Stress Test V2 Results

Data: 2026-07-09T12:21:27.164Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 4538ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 3 | 0 | 100% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1155ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** LOCAL_REAL_COVERS, menu, menuToggle
```
```json {   "diagnosis": "Linhas adicionadas comentam código funcional, impedindo a definição de menuToggle e introduzindo comentário inútil antes de LOCAL_REAL_COVERS.",   "files": [     {       "file": "front/assets/js/games-2026-feature.js",      
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1302ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json {   "diagnosis": "Rank do GTA VI alterado para 99, desfazendo ordem correta; variável --accent alterada para #ff0000, quebrando paleta visual.",   "files": [     {       "file": "front/assets/js/games-2026-feature.js",       "fix_type": "code
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 34773ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** LOCAL_REAL_COVERS, rank, accent
```
```json {   "diagnosis": "Três bugs introduzidos nos diffs: (1) LOCAL_REAL_COVERS setado como undefined, quebrando o mapa de covers locais; (2) rank do primeiro creator alterado de 1 para 99, desordenando o ranking; (3) cor accent alterada de verde p
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 1746ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body, visibilidade
```
```json {   "diagnosis": "display:none foi inserido no selector body, ocultando todo o conteúdo da página",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "  display: none;",     "replace": ""   },   "
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 891ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "Valor da variável CSS --accent foi alterado para vermelho (#ff0000) quando deveria ser verde (#2dd881), provocando inconsistência visual no tema.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patc
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 793ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis": "z-index negativo foi introduzido para .topbar e elementos principais, fazendo-os ficar atrás de outros elementos visuais.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "mai
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1120ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "Variável CSS --max foi alterada para 0px, causando largura zero nos contêineres.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "  --max: 0px;",     "replace": "  --max: 144
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 1017ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
```json {   "diagnosis": "A rota /cover retorna erroneamente 404 em vez do payload esperado, revertendo comportamento correto.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "return res.status(
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 1227ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT
```
```json {   "diagnosis": "REQUEST_TIMEOUT_MS default foi alterado para 0, ocasionando timeout imediato nas requisições de capa de jogos.",   "file": "backend/src/services/gameCoverService.js",   "fix_type": "code_patch",   "patch": {     "search": "c
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1712ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis": "API_BASE_URL foi alterado para localhost, quebrando chamadas de API em produção",   "file": "front/assets/js/runtime-config.js",   "fix_type": "code_patch",   "patch": {     "search": "  API_BASE_URL: \"http://localhost:3000
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6004ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, invertida, query, validação
```
```json {   "diagnosis": "Condicional invertida impede validação correta de parâmetro 'q'; erro é retornado quando query existe ao invés de quando está ausente",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "patch": { 
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1991ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, vazio, Analista
```
```json {   "diagnosis": "Campo 'desc' do objeto 'tech' no AGENTS está vazio.",   "file": "front/assets/js/main.js",   "fix_type": "code_patch",   "patch": {     "search": "desc: ''",     "replace": "desc: 'Monitora software, plataformas, arquitetura
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1018ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad
```
```json {   "diagnosis": "HERMES_AGENT constant foi comentado, gerando referência indefinida quando o agente é usado no código.",   "file": "front/assets/js/main.js",   "fix_type": "code_patch",   "patch": {     "search": "// const HERMES_AGENT = { n
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12504ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "ACCEPTANCE_THRESHOLD default foi alterado de 0.7 para 7, tornando o limiar de aceitação absurdamente alto (confiança máxima é 1.0). Isso faz com que nenhum candidato seja aceito, quebrando a funcionalidade de resolução de ca
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 813ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, ReferenceError
```
```json {   "diagnosis": "Funções resolveGameCover e clearGameCoverCache são usadas mas a importação foi comentada, causando ReferenceError.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "// i
```


