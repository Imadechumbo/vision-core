# Vision Core — Stress Test V2 Results

Data: 2026-06-13T06:24:25.991Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 8206ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 3 | 0 | 100% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 2020ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** LOCAL_REAL_COVERS, menu, menuToggle
```
```json {   "diagnosis": "Comentário “// ” inserido antes da constante LOCAL_REAL_COVERS; código funcionalmente idêntico mas viola lint e pode gerar warnings desnecessários.",   "file": "front/assets/js/games-2026-feature.js",   "fix_type": "code_pat
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6532ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json {   "diagnosis": "Bug 1: rank alterado de 1 para 99 em GTA VI, quebrando ordenação. Bug 2: cor do accent CSS alterada de #2dd881 (verde) para #ff0000 (vermelho), quebrando identidade visual do tema escuro.",   "file": "front/assets/js/games-2
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12147ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** LOCAL_REAL_COVERS, rank, accent
```
```json [   {     "diagnosis": "games-2026-feature.js: LOCAL_REAL_COVERS foi setado como undefined ao invés de objeto com covers, quebrando getLocalRealCover()",     "file": "front/assets/js/games-2026-feature.js",     "fix_type": "code_patch",     "
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 6499ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body
```
```json {   "diagnosis": "display: none foi inserido no body, ocultando todo o conteúdo da página. A linha +display: none; foi adicionada incorretamente antes de font-family, fazendo com que o body fique invisível.",   "file": "front/assets/css/style
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 4996ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "A variável CSS `--accent` foi alterada de `#2dd881` (verde) para `#ff0000` (vermelho), quebrando o esquema de cores do site. O valor correto é `#2dd881`.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 8907ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
MISSÃO RECEBIDA Tipo: bug fix Risco: baixo Escopo: front/assets/css/styles.css – linha exata do z-index  HERMES - Contexto: diff fornecido + arquivo completo styles.css. Evidência real e suficiente. - Regras aplicadas: §53 (diff foco absoluto), R1 (e
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 3513ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "O bug foi introduzido ao alterar a variável CSS `--max` de 1440px para 0px, fazendo com que `.container { width: min(var(--max), 92%); }` resulte em `width: 0px`, colapsando todo o layout do site.",   "file": "front/assets/c
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 9633ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
```json {   "decisao": "NEEDS_FIX",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "    return res.status(404).json({ ok: false, error: 'Rota não encontrada' });",     "replace": "    return res.
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 13321ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT, falha
```
```json {   "diagnosis": "Requisições HTTP para fontes de capas (RAWG, SteamGridDB) falham porque REQUEST_TIMEOUT_MS foi alterado de 12000 para 0, causando aborto imediato via setTimeout(fn, 0).",   "file": "backend/src/services/gameCoverService.js",
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 12460ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "decisao": "NEEDS_FIX",   "file": "front/assets/js/runtime-config.js",   "fix_type": "code_patch",   "patch": {     "search": "  API_BASE_URL: \"http://localhost:3000\",",     "replace": "  API_BASE_URL: \"https://api.technetgame.com.br\"
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6131ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, invertida, query, validação
```
```json {   "diagnosis": "A condição do middleware '/cover' foi invertida: `if (query)` retorna erro 400 quando um termo de busca é fornecido, impedindo a consulta correta. A validação original `if (!query)` deve ser restaurada para garantir que o pa
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12082ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, vazio, descrição, Analista
```
```json {   "diagnosis": "desc do agente 'Analista Técnico' foi esvaziada (desc: '') no commit, removendo a descrição exibida no site.",   "file": "front/assets/js/main.js",   "fix_type": "code_patch",   "patch": {     "search": "      desc: '',",   
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 10942ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, ReferenceError, undefined
```
```json {   "diagnosis": "HERMES_AGENT foi comentado (linha 61) no diff, tornando-se undefined. Qualquer referência posterior a esse objeto causará ReferenceError, quebrando funcionalidades do site.",   "file": "front/assets/js/main.js",   "fix_type"
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8009ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "ACCEPTANCE_THRESHOLD foi alterado de 0.7 para 7 no diff, tornando o threshold maior que o máximo possível de confiança (1.0). Isso faz com que nenhum cover candidate seja aceito, quebrando a exibição de capas de jogos no sit
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 5894ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, ReferenceError
```
```json {   "diagnosis": "A importação de 'clearGameCoverCache' e 'resolveGameCover' foi comentada (linha 2), mas as rotas '/cover' e '/cover/cache/clear' ainda chamam essas funções, causando ReferenceError em tempo de execução.",   "file": "backend/
```


