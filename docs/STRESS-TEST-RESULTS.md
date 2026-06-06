# Vision Core — Stress Test Results

Data: 2026-06-06T18:56:07.000Z
Vision Core URL: http://vision-core-prod.eba-pdk6anxy.us-east-1.elasticbeanstalk.com
Dashboard: http://localhost:3099

## Resumo

| Métrica | Valor |
|---|---|
| Total | 10 |
| PASS | 10 |
| FAIL | 0 |
| Taxa de acerto | 100% |
| Tempo médio | 9906ms |

## Por Dificuldade

| Dificuldade | PASS | FAIL | Taxa |
|---|---|---|---|
| EASY | 2 | 0 | 100% |
| MEDIUM | 3 | 0 | 100% |
| HARD | 3 | 0 | 100% |
| EXPERT | 2 | 0 | 100% |

## Resultados Detalhados

### STRESS-01 — Comentar linha LOCAL_REAL_COVERS
**Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 1897ms
**Sintoma:** todas as capas somem
**Esperadas:** LOCAL_REAL_COVERS, capa, cover
**Encontradas:** LOCAL_REAL_COVERS, cover
```
```json {   "diagnosis": "Linha de comentário '// ' inserida desnecessariamente antes da declaração de LOCAL_REAL_COVERS, gerando erro de lint ou execução indesejada.",   "file": "front/assets/js/game
```


### STRESS-02 — LOCAL_REAL_COVERS = undefined
**Status:** ✅ PASS | **Dificuldade:** EASY | **Tempo:** 1405ms
**Sintoma:** erro no console ao carregar capas
**Esperadas:** undefined, LOCAL_REAL_COVERS, erro
**Encontradas:** undefined, LOCAL_REAL_COVERS
```
```json {   "diagnosis": "LOCAL_REAL_COVERS definido como undefined em vez de objeto literal, impede lookup de imagens.",   "file": "front/assets/js/games-2026-feature.js",   "fix_type": "code_patch",
```


### STRESS-03 — isAllowedLocalRealCover retorna false
**Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 41197ms
**Sintoma:** nenhuma capa local carrega
**Esperadas:** isAllowedLocalRealCover, false, blocked
**Encontradas:** isAllowedLocalRealCover, false
```
MISSÃO RECEBIDA Tipo: bug fix Risco: baixo Escopo: front/assets/js/games-2026-feature.js  HERMES - Contexto completo fornecido, incluindo DIFF e código-fonte. - Regra §53 (DIFF Contextual) aplicada: f
```


### STRESS-04 — Pokopia extensão .jpg → .gif
**Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 1499ms
**Sintoma:** capa do Pokopia some
**Esperadas:** Pokopia, extensão, gif, jpg
**Encontradas:** Pokopia, extensão, gif, jpg
```
```json {   "diagnosis": "Caminhos de imagem incorretos: referências a arquivos .gif inexistentes substituídas por .jpg corretos",   "file": "front/assets/js/games-2026-feature.js",   "fix_type": "cod
```


### STRESS-05 — GTA VI rank 1 → 99
**Status:** ✅ PASS | **Dificuldade:** MEDIUM | **Tempo:** 1134ms
**Sintoma:** GTA VI some da lista principal
**Esperadas:** rank, GTA, ordem
**Encontradas:** rank, GTA, ordem
```
```json {   "diagnosis": "O rank do item 'Grand Theft Auto VI' foi alterado de 1 para 99; isso quebra a ordem de classificação dos jogos.",   "file": "front/assets/js/games-2026-feature.js",   "fix_ty
```


### STRESS-06 — GTA VI release vazio
**Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 20359ms
**Sintoma:** data de lançamento aparece vazia
**Esperadas:** release, data, vazia, GTA
**Encontradas:** release, data
```
```json {   "diagnosis": "Token expiry usou < em vez de <= no objeto 'items' no arquivo 'games-2026-feature.js'. Isso causou a ocorrência do erro ao executar a função 'filter' com um valor falso.",   
```


### STRESS-07 — Resident Evil Requiem — PS5 removido
**Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 1338ms
**Sintoma:** plataforma errada exibida
**Esperadas:** platforms, PS5, Resident Evil
**Encontradas:** platforms, PS5, Resident Evil
```
```json {   "diagnosis": "Plataformas omitidas para Resident Evil Requiem; linha atual exclui 'PS5', gerando exibição incompleta.",   "file": "front/assets/js/games-2026-feature.js",   "fix_type": "co
```


### STRESS-08 — TRUSTED_API_COVER_SOURCES — 'rawg' removido
**Status:** ✅ PASS | **Dificuldade:** HARD | **Tempo:** 27516ms
**Sintoma:** capas da API não carregam mais
**Esperadas:** TRUSTED_API_COVER_SOURCES, rawg
**Encontradas:** TRUSTED_API_COVER_SOURCES, rawg
```
```json {   "diagnosis": "const TRUSTED_API_COVER_SOURCES foi excluído do Set. Erro impede dados de capa de jogo incluídos.",   "file": "assets/js/games-2026-feature.js",   "fix_type": "code_patch",  
```


### STRESS-09 — isAllowedLocalRealCover regex .png|jpg → .svg|webp
**Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1137ms
**Sintoma:** apenas SVGs carregam, PNGs e JPGs somem
**Esperadas:** regex, extensão, png, jpg, svg
**Encontradas:** regex, png, jpg, svg
```
```json {   "diagnosis": "Regex de validação de imagens locais foi alterada, excluindo formatos PNG/JPG/WEBP suportados, provocando falha na exibição de capas.",   "file": "front/assets/js/games-2026-
```


### STRESS-10 — Hexe key typo — apóstrofo removido
**Status:** ✅ PASS | **Dificuldade:** EXPERT | **Tempo:** 1580ms
**Sintoma:** capa da Hexe some (key mismatch)
**Esperadas:** Hexe, apóstrofo, chave, mismatch
**Encontradas:** Hexe, apóstrofo, chave
```
```json {   "diagnosis": "Chave de título contém apóstrofo curvo (’), não bate com a chave esperada em LOCAL_REAL_COVERS, resultando em capa ausente.",   "file": "front/assets/js/games-2026-feature.js
```



## Análise de Fraquezas

_Nenhum — todos os cenários passaram._

## Recomendações

- Sistema funcionando dentro do esperado.
