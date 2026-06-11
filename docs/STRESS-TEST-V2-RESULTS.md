# Vision Core — Stress Test V2 Results

Data: 2026-06-11T10:49:38.739Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3100

## Resumo

| Métrica | Valor |
|---|---|
| Total | 15 |
| PASS | 2 |
| FAIL | 13 |
| Taxa de acerto | 13% |
| Tempo médio | 1505ms |

## Por Bloco

| Bloco | PASS | FAIL | Taxa |
|---|---|---|---|
| A — Múltiplos Arquivos | 0 | 3 | 0% |
| B — CSS | 0 | 4 | 0% |
| C — Backend | 2 | 2 | 50% |
| D — Regressão §53 | 0 | 4 | 0% |

## Resultados Detalhados

### STRESS-11 — Bug em 2 arquivos JS — capas somem + menu quebrado
**Bloco:** A | **Status:** ❌ FAIL | **Dificuldade:** HARD | **Tempo:** 1468ms
**Sintoma:** capas somem E menu mobile não abre
**Esperadas:** LOCAL_REAL_COVERS, menu, menuToggle, múltiplos
**Encontradas:** _nenhuma_
```
⚠️ **Todos os provedores de IA falharam** (payload: 15440 chars).  Causas prováveis: - API keys ausentes ou quota esgotada (ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY) - Payload grande demais (Groq free: ≤6K tokens ≈ 24K chars) - Erro de rede ou
```


### STRESS-12 — Bug JS + CSS — rank errado + cor vermelho
**Bloco:** A | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 1325ms
**Sintoma:** GTA VI some da lista + cor do site vira vermelha
**Esperadas:** rank, accent, color, CSS
**Encontradas:** _nenhuma_
```
⚠️ **Todos os provedores de IA falharam** (payload: 15341 chars).  Causas prováveis: - API keys ausentes ou quota esgotada (ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY) - Payload grande demais (Groq free: ≤6K tokens ≈ 24K chars) - Erro de rede ou
```


### STRESS-13 — Bug em 3 arquivos — capas + ranking + cor
**Bloco:** A | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 1381ms
**Sintoma:** capas somem + rankings errados + cor vermelha
**Esperadas:** múltiplos, LOCAL_REAL_COVERS, rank, accent
**Encontradas:** _nenhuma_
```
⚠️ **Todos os provedores de IA falharam** (payload: 17470 chars).  Causas prováveis: - API keys ausentes ou quota esgotada (ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY) - Payload grande demais (Groq free: ≤6K tokens ≈ 24K chars) - Erro de rede ou
```


### STRESS-14 — display:none no body — página em branco
**Bloco:** B | **Status:** ❌ FAIL | **Dificuldade:** EASY | **Tempo:** 1543ms
**Sintoma:** página completamente branca — body oculto
**Esperadas:** display, none, body, visibilidade
**Encontradas:** _nenhuma_
```
⚠️ **Todos os provedores de IA falharam** (payload: 2912 chars).  Causas prováveis: - API keys ausentes ou quota esgotada (ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY) - Payload grande demais (Groq free: ≤6K tokens ≈ 24K chars) - Erro de rede ou 
```


### STRESS-15 — Cor primária --accent: verde → vermelho
**Bloco:** B | **Status:** ❌ FAIL | **Dificuldade:** MEDIUM | **Tempo:** 1194ms
**Sintoma:** botões e destaques vermelhos em vez de verdes
**Esperadas:** accent, #ff0000, #2dd881, CSS
**Encontradas:** _nenhuma_
```
⚠️ **Todos os provedores de IA falharam** (payload: 2108 chars).  Causas prováveis: - API keys ausentes ou quota esgotada (ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY) - Payload grande demais (Groq free: ≤6K tokens ≈ 24K chars) - Erro de rede ou 
```


### STRESS-16 — z-index: -1 em main/header — header some atrás
**Bloco:** B | **Status:** ❌ FAIL | **Dificuldade:** MEDIUM | **Tempo:** 1321ms
**Sintoma:** header e nav somem atrás do grid de fundo
**Esperadas:** z-index, -1, main, header
**Encontradas:** _nenhuma_
```
⚠️ **Todos os provedores de IA falharam** (payload: 3209 chars).  Causas prováveis: - API keys ausentes ou quota esgotada (ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY) - Payload grande demais (Groq free: ≤6K tokens ≈ 24K chars) - Erro de rede ou 
```


### STRESS-17 — Largura máx --max: 0px — layout colapsa
**Bloco:** B | **Status:** ❌ FAIL | **Dificuldade:** HARD | **Tempo:** 1175ms
**Sintoma:** todo conteúdo colapsa para largura zero
**Esperadas:** --max, 0px, 1440px, CSS
**Encontradas:** _nenhuma_
```
⚠️ **Todos os provedores de IA falharam** (payload: 2637 chars).  Causas prováveis: - API keys ausentes ou quota esgotada (ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY) - Payload grande demais (Groq free: ≤6K tokens ≈ 24K chars) - Erro de rede ou 
```


### STRESS-18 — Rota GET /cover retorna 404 em vez de dados
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 763ms
**Sintoma:** endpoint /cover retorna 404 para todos os jogos
**Esperadas:** 404, rota, cover, payload
**Encontradas:** 404, rota, payload
```
```json {   "diagnosis": "Linha de retorno alterada para status 404, impedindo o envio do payload correto.",   "file": "backend/src/routes/gamesRoutes.js",   "fix_type": "code_patch",   "patch": {     "search": "return res.status(404).json({ ok: fals
```


### STRESS-19 — REQUEST_TIMEOUT_MS = 0 — todas requests falham
**Bloco:** C | **Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 3707ms
**Sintoma:** timeout zero — requests de capa todas falham
**Esperadas:** timeout, 0, REQUEST_TIMEOUT, falha
**Encontradas:** timeout, falha
```
⚠️ **Todos os provedores de IA falharam** (payload: 15117 chars).  Causas prováveis: - API keys ausentes ou quota esgotada (ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY) - Payload grande demais (Groq free: ≤6K tokens ≈ 24K chars) - Erro de rede ou
```


### STRESS-20 — API_BASE_URL → localhost — sem dados em produção
**Bloco:** C | **Status:** ❌ FAIL | **Dificuldade:** HARD | **Tempo:** 1638ms
**Sintoma:** sem dados — API apontando para localhost em produção
**Esperadas:** API_BASE_URL, localhost, produção, URL
**Encontradas:** _nenhuma_
```
⚠️ **Todos os provedores de IA falharam** (payload: 2714 chars).  Causas prováveis: - API keys ausentes ou quota esgotada (ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY) - Payload grande demais (Groq free: ≤6K tokens ≈ 24K chars) - Erro de rede ou 
```


### STRESS-21 — Condição de validação invertida — if (!query) → if (query)
**Bloco:** C | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 1057ms
**Sintoma:** queries válidas bloqueadas; queries vazias passam
**Esperadas:** condição, invertida, query, validação
**Encontradas:** _nenhuma_
```
⚠️ **Todos os provedores de IA falharam** (payload: 1159 chars).  Causas prováveis: - API keys ausentes ou quota esgotada (ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY) - Payload grande demais (Groq free: ≤6K tokens ≈ 24K chars) - Erro de rede ou 
```


### STRESS-22 — Descrição do Analista Técnico zerada
**Bloco:** D | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 1255ms
**Sintoma:** tooltip do agente técnico aparece completamente vazia
**Esperadas:** desc, vazio, descrição, Analista
**Encontradas:** _nenhuma_
```
⚠️ **Todos os provedores de IA falharam** (payload: 3479 chars).  Causas prováveis: - API keys ausentes ou quota esgotada (ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY) - Payload grande demais (Groq free: ≤6K tokens ≈ 24K chars) - Erro de rede ou 
```


### STRESS-23 — HERMES_AGENT comentado — referência undefined
**Bloco:** D | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 1215ms
**Sintoma:** HERMES_AGENT undefined — erros no console
**Esperadas:** HERMES_AGENT, comentad, ReferenceError, undefined
**Encontradas:** _nenhuma_
```
⚠️ **Todos os provedores de IA falharam** (payload: 4812 chars).  Causas prováveis: - API keys ausentes ou quota esgotada (ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY) - Payload grande demais (Groq free: ≤6K tokens ≈ 24K chars) - Erro de rede ou 
```


### STRESS-24 — ACCEPTANCE_THRESHOLD 0.7 → 7 — nenhuma capa aceita
**Bloco:** D | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 1878ms
**Sintoma:** threshold impossível — zero capas aceitas
**Esperadas:** ACCEPTANCE_THRESHOLD, threshold, 0.7, 7
**Encontradas:** _nenhuma_
```
⚠️ **Todos os provedores de IA falharam** (payload: 15051 chars).  Causas prováveis: - API keys ausentes ou quota esgotada (ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY) - Payload grande demais (Groq free: ≤6K tokens ≈ 24K chars) - Erro de rede ou
```


### STRESS-25 — import resolveGameCover comentado — ReferenceError
**Bloco:** D | **Status:** ❌ FAIL | **Dificuldade:** EXPERT | **Tempo:** 1655ms
**Sintoma:** ReferenceError: resolveGameCover is not defined
**Esperadas:** import, resolveGameCover, undefined, ReferenceError
**Encontradas:** _nenhuma_
```
⚠️ **Todos os provedores de IA falharam** (payload: 1138 chars).  Causas prováveis: - API keys ausentes ou quota esgotada (ANTHROPIC_API_KEY, GROQ_API_KEY, GEMINI_API_KEY) - Payload grande demais (Groq free: ≤6K tokens ≈ 24K chars) - Erro de rede ou 
```


