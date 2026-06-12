# Vision Core — Stress Test V2 Results

Data: 2026-06-12T15:53:04.852Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 19951ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 3 | 0 | 100% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 55001ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** menu, menuToggle
```
```json {   "diagnosis": "Dois arquivos com bugs identificados via diff: (1) games-2026-feature.js: uma linha em branco foi substituída por uma linha de comentário vazia '//' — isso é uma alteração cosmética, mas constitui bug no diff; (2) main.js: a
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 33564ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json [   {     "diagnosis": "front/assets/js/games-2026-feature.js — rank do GTA VI alterado de 1 para 99, quebrando ordenação esperada dos itens (linha 10).",     "file": "front/assets/js/games-2026-feature.js",     "fix_type": "code_patch",     
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 29060ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** LOCAL_REAL_COVERS, rank, accent
```
```json {   "diagnosis": "Três bugs independentes em 3 arquivos: (1) games-2026-feature.js: LOCAL_REAL_COVERS setado como undefined, quebrando capas locais; (2) games-hub.js: rank do HadesPlays alterado de 1 para 99, quebrando ordenação; (3) styles.c
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 911ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body, visibilidade
```
```json {   "diagnosis": "Corpo da página está invisível por causa de 'display: none;' inserido na regra body.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "  display: none;",     "replace": ""   }
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 5931ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "A variável CSS `--accent` foi alterada de `#2dd881` (verde) para `#ff0000` (vermelho), quebrando o esquema de cores do site. O valor original `#2dd881` é usado em múltiplos lugares como cor de destaque (gradientes, bordas, e
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 9092ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis": "Bug introduzido no diff: `z-index` de main, header, footer e .topbar foi alterado de `1` para `-1`, fazendo com que esses elementos fiquem atrás do fundo com `z-index: 0` (pseudo-elementos ::before, ::after), resultando em c
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 22230ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "A variável CSS `--max` foi alterada de `1440px` para `0px`. `.container` usa `width: min(var(--max), 92%)`, o que força a largura do container para `0px` (pois `min(0, 92%)` = 0), quebrando todo o layout horizontal do site."
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 13360ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
```json {   "diagnosis": "Rota /cover sempre retorna 404 com mensagem de erro, independentemente do resultado de resolveGameCover. Causa: linha de resposta correta foi substituída por resposta de erro fixa.",   "file": "backend/src/routes/gamesRoutes
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 32591ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT, falha
```
```json {   "diagnosis": "REQUEST_TIMEOUT_MS alterado de 12000 para 0 no diff introduzido, fazendo com que todas as requisições fetch (RAWG, SteamGridDB) abortem imediatamente (setTimeout(abort, 0)) — causa direta de falha no carregamento de capas de
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 46631ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
MISSÃO RECEBIDA Tipo: bug fix Risco: alto (site quebrado) Escopo: `front/assets/js/runtime-config.js`  HERMES - Contexto fornecido via diff e arquivo completo + resposta da API de produção. - Regra R53 aplicada: foco exclusivo nas linhas do diff. - R
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 17816ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, query, validação
```
```json {   "diagnosis": "Inversão na condição if: alteração de `!query` para `query` faz com que retorne erro 400 quando query É fornecida, em vez de quando está ausente — causa rota /cover sempre retornar erro quando parâmetro é enviado.",   "file"
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8905ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, Analista
```
```json {   "diagnosis": "desc do agente 'tech' foi esvaziada (linha 18 em main.js), causando perda de conteúdo descritivo no front-end.",   "file": "front/assets/js/main.js",   "fix_type": "code_patch",   "patch": {     "search": "      desc: '',", 
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 16070ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, ReferenceError, undefined
```
```json {   "diagnosis": "HERMES_AGENT foi comentado, removendo a definição da variável global. Qualquer referência posterior a HERMES_AGENT resultará em ReferenceError, quebrando funcionalidades que dependem desse objeto.",   "file": "front/assets/j
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6495ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "ACCEPTANCE_THRESHOLD foi alterado de 0.7 para 7, tornando o limiar de aceitação extremamente alto. Isso faz com que praticamente nenhum candidato a capa seja aceito, pois a confiança máxima é 0.98 e a maioria fica abaixo de 
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1602ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover
```
```json {   "diagnosis":  "A importação das funções clearGameCoverCache e resolveGameCover foi comentada, impedindo o acesso a essas funções.",   "file":       "backend/src/routes/gamesRoutes.js",   "fix_type":   "code_patch",   "patch":      { "sear
```


