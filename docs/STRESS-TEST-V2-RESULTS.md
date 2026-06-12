# Vision Core — Stress Test V2 Results

Data: 2026-06-11T23:56:14.940Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 15 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 18802ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 3 | 0 | 100% |
| B — CSS | 4 | 0 | 100% |
| C — Backend | 4 | 0 | 100% |
| D — Regressão §53 | 4 | 0 | 100% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1541ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** LOCAL_REAL_COVERS, menu, menuToggle
```
```json {   "diagnosis": "Linha comentada \"// \" foi inserida antes da constante LOCAL_REAL_COVERS, criando um comentário desnecessário que pode interferir na leitura do arquivo.",   "file": "front/assets/js/games-2026-feature.js",   "fix_type": "co
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 24139ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** rank, accent, CSS
```
```json {   "diagnosis": "Bug 1: GTA VI teve rank alterado de 1 para 99, quebrando ordenação. Bug 2: variável CSS --accent alterada de #2dd881 para #ff0000, trocando cor de destaque do tema.",   "files": [     "front/assets/js/games-2026-feature.js",
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 22053ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** LOCAL_REAL_COVERS, rank, accent
```
```json {   "diagnosis": "LOCAL_REAL_COVERS foi reatribuído para undefined (com uma variável _UNUSED_ fantasma), causando falha em getLocalRealCover() que tenta acessar propriedades de undefined — quebra a exibição de capas locais de jogos.",   "file
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 12273ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** display, none, body
```
```json {   "diagnosis": "O bug é a propriedade `display: none;` adicionada no seletor `body`, que oculta todo o conteúdo da página. O diff mostra que a linha `-  font-family: 'Roboto', sans-serif;` foi substituída por `+  display: none; +  font-fami
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 10916ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** accent, #ff0000, #2dd881, CSS
```
```json {   "diagnosis": "A variável CSS --accent foi alterada de #2dd881 (verde) para #ff0000 (vermelho), quebrando a identidade visual e podendo causar problemas de contraste com as demais cores baseadas em verde.",   "file": "front/assets/css/styl
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 28845ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** z-index, -1, main, header
```
```json {   "diagnosis": "O diff mostra que z-index: 1 foi alterado para z-index: -1 em 'main, header, footer, .topbar'. Isto faz com que esses elementos fiquem atrás do pseudo-elemento ::before e ::after de body.home-dark-grid, que usam z-index: 0. 
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 25791ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** --max, 0px, 1440px, CSS
```
```json {   "diagnosis": "Arquivo front/assets/css/styles.css — variável CSS --max alterada de 1440px para 0px. A propriedade width no seletor .container usa min(var(--max), 92%), e com --max: 0px, o container terá largura mínima de 0px (o que result
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 14504ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, cover, payload
```
```json {   "diagnosis": "A linha return res.json(payload) foi removida e substituída por return res.status(404).json({ ok: false, error: 'Rota não encontrada' }), fazendo com que a rota GET /cover sempre retorne 404 independentemente do payload reso
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 41686ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, 0, REQUEST_TIMEOUT
```
```json {   "diagnosis": "REQUEST_TIMEOUT_MS foi alterado de 12000ms para 0ms, causando timeout imediato em todas as requisições fetch. Linha 7: o valor padrão passou de 12000 para 0.",   "file": "backend/src/services/gameCoverService.js",   "fix_typ
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 20766ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** API_BASE_URL, localhost, produção, URL
```
```json {   "diagnosis": "API_BASE_URL is set to http://localhost:3000 instead of the production URL https://api.technetgame.com.br, causing all API requests to go to a local server that is not accessible from the deployed site.",   "file": "front/as
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 14937ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** condição, invertida, query, validação
```
```json {   "diagnosis": "Condição invertida na rota GET /cover — a validação deve retornar 400 quando query está vazia, mas atualmente retorna 400 quando query está presente (if (query) em vez de if (!query)).",   "file": "backend/src/routes/gamesRo
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 22022ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** desc, descrição, Analista
```
```json {   "diagnosis": "O campo `desc` do agente 'Analista Técnico' foi esvaziado (linha 19 do diff), removendo a descrição original que era necessária para exibição no site.",   "file": "front/assets/js/main.js",   "fix_type": "code_patch",   "pat
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 17506ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** HERMES_AGENT, comentad, ReferenceError
```
```json {   "diagnosis": "ERRO: A constante `HERMES_AGENT` foi comentada (linha com `//`), mas é referenciada em outras partes do script (não visíveis no trecho fornecido). Isso causa `ReferenceError` ou quebra de funcionalidade.",   "file": "front/a
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 13461ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
```
```json {   "diagnosis": "ACCEPTANCE_THRESHOLD foi alterado de 0.7 para 7, tornando o limiar de aceitação inviável (confidence máxima é 0.98), o que impede a seleção de capas de jogo no site.",   "file": "backend/src/services/gameCoverService.js",   
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 11583ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** import, resolveGameCover, ReferenceError
```
```json {   "diagnosis": "A importação de `clearGameCoverCache` e `resolveGameCover` foi comentada (diff: `+// import ...`), quebrando os handlers de rota que chamam essas funções, causando `ReferenceError` e falha nas rotas `/cover` e `/cover/cache/
```


