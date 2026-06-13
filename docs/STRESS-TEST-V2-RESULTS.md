# Vision Core — Stress Test V2 Results

Data: 2026-06-13T04:53:28.782Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 14141ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 3 | 0 | 100% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 56331ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** LOCAL_REAL_COVERS, menu, menuToggle
```
```json {   "diagnosis": "Dois bugs identificados via diff: (1) games-2026-feature.js: linha vazia entre '];' e 'const LOCAL_REAL_COVERS' foi substituída por comentário vazio '// ', quebra a consistência visual. (2) main.js: declaração de 'menuToggle
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12211ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json {   "diagnosis": "Bug 1: rank do item 'Grand Theft Auto VI' em games-2026-feature.js alterado de 1 para 99, quebrando ordenação. Bug 2: cor --accent em styles.css alterada de #2dd881 (verde) para #ff0000 (vermelho), quebrando identidade visua
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 22532ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
```
Múltiplos bugs identificados nos três diffs fornecidos.  ```json {   "diagnosis": "Três bugs independentes: (1) LOCAL_REAL_COVERS definido como undefined em vez do objeto de covers, quebrando getLocalRealCover; (2) rank do primeiro criador alterado d
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 1368ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body
```
```json {   "diagnosis": "Linha 'display: none;' adicionada dentro de body oculta todo o conteúdo da página, causando falha visual.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "  display: none;", 
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 8469ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "Cor do accent alterada de #2dd881 (verde) para #ff0000 (vermelho), quebrando a identidade visual do projeto.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "  --accent: #ff0
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 5164ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis": "z-index: -1 em main, header, footer, .topbar coloca elementos-chave atrás do background (z-index: 0), tornando-os invisíveis ou semi-transparentes. Linha 31: z-index alterado de 1 para -1.",   "file": "front/assets/css/style
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7746ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "A variável CSS `--max` foi alterada de `1440px` para `0px`, zerando a largura máxima do container. Isso faz com que `min(var(--max), 92%)` seja `0px`, colapsando o layout do site.",   "file": "front/assets/css/styles.css",  
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 12755ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
```json {   "diagnosis": "A rota GET /cover foi alterada para sempre retornar status 404 com mensagem 'Rota não encontrada', substituindo o correto retorno do payload obtido via resolveGameCover(). O bug está na linha que foi introduzida pelo diff (+
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 30453ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT
```
```json {   "diagnosis": "fallback de REQUEST_TIMEOUT_MS alterado de 12000 para 0, causando timeout zero em todas as requisições HTTP (RAWG, SteamGridDB), impedindo carregamento de capas de jogos e deixando o site quebrado.",   "file": "backend/src/s
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 7992ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis": "API_BASE_URL foi alterada de 'https://api.technetgame.com.br' para 'http://localhost:3000', fazendo o site tentar conectar a um servidor local em vez da API de produção.",   "file": "front/assets/js/runtime-config.js",   "fi
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8997ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, invertida, query, validação
```
```json {   "diagnosis": "Inversão da condição de validação do query. A linha mudou de `if (!query)` para `if (query)`, fazendo a rota retornar 400 quando query está presente e prosseguir quando está vazia. O comportamento correto é retornar erro qua
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8999ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, descrição, Analista
```
```json {   "diagnosis": "No arquivo front/assets/js/main.js, a descrição do agente 'Analista Técnico' foi alterada para string vazia, removendo o texto original 'Monitora software, plataformas, arquitetura e infraestrutura do ecossistema tech.'.",  
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 4513ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, ReferenceError
```
```json {   "diagnosis": "A constante HERMES_AGENT foi comentada (linha 61), mas é referenciada em outras partes do código (não visíveis no diff fornecido). Isso causa ReferenceError: HERMES_AGENT is not defined, quebrando funcionalidades que depende
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 18009ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "ACCEPTANCE_THRESHOLD foi alterado de 0.7 para 7 (linha 9 do diff), tornando o threshold 700%, impossível de ser atingido. Todas as capas serão rejeitadas com 'below-threshold'.",   "file": "backend/src/services/gameCoverServ
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6577ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, undefined, ReferenceError
```
```json {   "diagnosis": "O import de `resolveGameCover` e `clearGameCoverCache` foi comentado na linha 2, tornando essas funções undefined, o que quebra as rotas `/cover` e `/cover/cache/clear`.",   "file": "backend/src/routes/gamesRoutes.js",   "fi
```


