# Vision Core — Stress Test V2 Results

Data: 2026-07-20T00:07:42.557Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 20432ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 3 | 0 | 100% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 51000ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** LOCAL_REAL_COVERS, menu, menuToggle
```
```json {   "diagnosis": "Dois bugs identificados: 1) games-2026-feature.js: uma linha comentada '//' foi inserida em local errado, quebrando a declaração do objeto LOCAL_REAL_COVERS. 2) main.js: a declaração de 'menuToggle' foi comentada, mas a vari
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10867ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json {   "diagnosis": "Dois bugs isolados: (1) rank de GTA VI alterado de 1 para 99 em games-2026-feature.js, quebrando ordenação; (2) cor de destaque --accent alterada de #2dd881 para #ff0000 em styles.css, descaracterizando tema escuro.",   "fil
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13726ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** LOCAL_REAL_COVERS, rank, accent
```
```json {   "diagnosis": "3 bugs independentes em 3 arquivos: (1) games-2026-feature.js: LOCAL_REAL_COVERS foi setado para undefined, quebrando lookup de capas locais; (2) games-hub.js: rank do criador HadesPlays alterado de 1 para 99, desordenando o
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 821ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body
```
```json {   "diagnosis": "A propriedade 'display: none;' foi adicionada ao selector body, ocultando todo o conteúdo da página e causando a falha de renderização.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 7875ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "A variável CSS --accent foi alterada de #2dd881 (verde, tom original) para #ff0000 (vermelho), quebrando o esquema de cores do site. O diff confirma que a linha correta (com -) é #2dd881 e a linha bugada (com +) é #ff0000.",
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 10585ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
MISSÃO RECEBIDA Tipo: bug fix Risco: baixo Escopo: front/assets/css/styles.css  HERMES - Contexto: DIFF fornecido e arquivo styles.css presente → evidência real confirmada - Regras aplicadas: R1, §53  SCANNER - Arquivo: front/assets/css/styles.css - 
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 8063ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "A variável CSS --max foi alterada de 1440px para 0px, causando largura zero no container (.container usa width: min(var(--max), 92%)). Reverter para 1440px restaura o layout.",   "file": "front/assets/css/styles.css",   "fix
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 45369ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
MISSÃO RECEBIDA Tipo: bug fix Risco: alto Escopo: backend/src/routes/gamesRoutes.js  ```json {   "diagnosis": "Bug introduzido no commit: linha `return res.json(payload);` foi substituída por `return res.status(404).json({ ok: false, error: 'Rota não
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 13680ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT
```
```json {   "diagnosis": "O valor padrão de REQUEST_TIMEOUT_MS foi alterado de 12000 para 0, causando aborto imediato de todas as requisições HTTP e impedindo o carregamento de capas de jogos.",   "file": "backend/src/services/gameCoverService.js",  
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 8189ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis": "API_BASE_URL em runtime-config.js está apontando para localhost em vez da API de produção, impedindo o site de se conectar ao backend.",   "file": "front/assets/js/runtime-config.js",   "fix_type": "code_patch",   "patch": {
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13593ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, invertida, query
```
MISSÃO RECEBIDA Tipo: bug fix Risco: alto Escopo: backend/src/routes/gamesRoutes.js  HERMES - Contexto: arquivo fornecido + diff explícito do bug. - Regras aplicadas: §53 (focus no diff), R1 (evidência real), R2 (patch em arquivo fornecido).  ```json
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 14107ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, descrição, Analista
```
```json {   "diagnosis": "A descrição do agente 'Analista Técnico' foi alterada para string vazia, removendo o texto informativo exibido no site. O diff mostra que a linha passou de 'desc: 'Monitora software, plataformas, arquitetura e infraestrutura
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 21007ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, ReferenceError, undefined
```
{   "diagnosis": "HERMES_AGENT constant was commented out, making it undefined. Any reference to HERMES_AGENT will cause a ReferenceError or undefined behavior, breaking site functionality.",   "file": "front/assets/js/main.js",   "fix_type": "code_p
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 38176ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "ACCEPTANCE_THRESHOLD foi alterado de 0.7 para 7, tornando o limiar de confiança impossível de ser atingido (confiança é entre 0 e 1). Nenhum cover é aceito, quebrando a funcionalidade de capas no site.",   "file": "backend/s
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 49424ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, ReferenceError
```
```json {   "decisao": "NEEDS_FIX",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "// import { clearGameCoverCache, resolveGameCover } from '../services/gameCoverService.js';",     "replace": "i
```


