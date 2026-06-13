# Vision Core — Stress Test V2 Results

Data: 2026-06-13T13:25:08.203Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 11652ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 3 | 0 | 100% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 4572ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** LOCAL_REAL_COVERS, menu, menuToggle
```
```json {   "diagnosis": "Linha comentada ‘// ’ foi inserida antes de const LOCAL_REAL_COVERS, introduzindo código desnecessário.",   "file": "front/assets/js/games-2026-feature.js",   "fix_type": "code_patch",   "patch": {     "search": "// ",     "
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 20410ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json [   {     "diagnosis": "Rank do jogo GTA VI alterado de 1 para 99, quebrando ordenação da lista",     "file": "front/assets/js/games-2026-feature.js",     "fix_type": "code_patch",     "patch": {       "search": "rank: 99, title: 'Grand Theft
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 25531ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
```
```json {   "diagnosis": "Múltiplos arquivos com bugs introduzidos por alterações indevidas nos diffs fornecidos.",   "patches": [     {       "file": "front/assets/js/games-2026-feature.js",       "diagnosis": "LOCAL_REAL_COVERS foi setado como unde
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 17563ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body
```
```json {   "diagnosis": "Adição de 'display: none' no body (linha 20) esconde todo o conteúdo do site, tornando a página invisível.",   "file": "front/assets/css/styles.css",   "fix_type": "code_patch",   "patch": {     "search": "  display: none;",
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 7328ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "A variável CSS `--accent` foi alterada de `#2dd881` (verde) para `#ff0000` (vermelho), quebrando o esquema de cores do site. A mudança não está alinhada com o design original (tom verde) e afeta todos os elementos que utiliz
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 11879ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis": "Bug de z-index: linha `main, header, footer, .topbar { position: relative; z-index: -1; }` coloca todos os elementos estruturais atrás do fundo (`::before` e `::after` com z-index:0 e 0), fazendo conteúdo ficar invisível ou 
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 3651ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "DIFF mostra que --max: 1440px foi alterado para --max: 0px. --max é usado como width máxima do container (.container { width: min(var(--max), 92%) }). Com --max: 0px, min(0px, 92%) resulta em 0px, tornando o container invisí
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 23029ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
```json {   "diagnosis": "O bug foi introduzido ao substituir 'return res.json(payload)' por 'return res.status(404).json({ ok: false, error: \"Rota não encontrada\" })'. Isso faz com que a rota GET /cover sempre retorne 404 com mensagem de erro, ind
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 10700ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT, falha
```
```json {   "diagnosis": "REQUEST_TIMEOUT_MS foi alterado de 12000 para 0, causando timeout imediato em todas as requisições HTTP do serviço de covers (fetchJson). Isso quebra a busca de imagens na SteamGridDB e RAWG, impedindo o carregamento de capa
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 11299ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis": "API_BASE_URL foi alterado de 'https://api.technetgame.com.br' para 'http://localhost:3000' na configuração de runtime, impedindo que o site se conecte à API de produção. O diff da regressão confirma a mudança; a API de produ
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 6530ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, query, validação
```
```json {   "diagnosis": "Inversão da condição de validação em gamesRoutes.js linha 9: o operador de negação foi removido, fazendo com que a rota '/cover' retorne erro quando um parâmetro válido é fornecido, bloqueando a funcionalidade de busca de ca
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 4055ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, descrição, Analista
```
```json {   "diagnosis": "Bug introduzido no diff: a descrição do agente 'Analista Técnico' foi esvaziada (desc: ''), removendo o texto descritivo que deveria ser exibido na interface.",   "file": "front/assets/js/main.js",   "fix_type": "code_patch"
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 12320ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, ReferenceError, undefined
```
```json {   "diagnosis": "HERMES_AGENT foi comentado (//), removendo a definição da variável do escopo de execução. O código cliente tenta acessar 'HERMES_AGENT' mas ele está undefined, causando ReferenceError.",   "file": "front/assets/js/main.js", 
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 7464ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "ACCEPTANCE_THRESHOLD default value changed from 0.7 to 7 — this breaks the confidence threshold check (threshold >1 rejects all candidates with confidence <1), causing scoreGameCoverCandidate to reject every cover candidate 
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 8450ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, ReferenceError
```
```json {   "diagnosis": "Importação das funções clearGameCoverCache e resolveGameCover foi comentada (linha 2), causando ReferenceError nas rotas /cover e /cover/cache/clear que as utilizam.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_ty
```


