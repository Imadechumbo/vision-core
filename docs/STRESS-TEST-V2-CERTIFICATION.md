# Vision Core — Stress Test V2 Certification

**Data:** 2026-06-06  
**Versão:** V3.0.0  
**Resultado:** ✅ 15/15 PASS (100%)  
**Commits:** `7ad335e`, `36a68fe`, `a40fbc9`, `667da53`

---

## Histórico de Iterações

| Run | PASS | Taxa | Fix aplicado |
|---|---|---|---|
| Run 1 | 10/15 | 67% | Script inicial — patches CSS com ERRO 504 (208 KB → timeout EB) |
| Run 2 | 13/15 | 87% | `windowContent(±120)` + multi-DIFF backend while loop |
| Run 3 | 14/15 | 93% | `MAX_FILE_BYTES` 50K→30K + blocos `[DIFF]` separados por arquivo |
| Run 4 | 13/15 | 87% | always-window multi-arquivo (esperados STRESS-15/17 atualizados mid-run) |
| **Run 5** | **15/15** | **100%** | hex values em `esperado` (`#ff0000`, `--max`) + always-window consolidado |

---

## Cobertura

| Bloco | Cenários | Taxa |
|---|---|---|
| A — Múltiplos arquivos | STRESS-11/12/13 | 3/3 |
| B — CSS | STRESS-14/15/16/17 | 4/4 |
| C — Backend Node.js | STRESS-18/19/20/21 | 4/4 |
| D — Regressão §53 | STRESS-22/23/24/25 | 4/4 |

---

## Cenários Certificados

| ID | Bloco | Dific. | Sintoma | Tempo |
|---|---|---|---|---|
| STRESS-11 | A | HARD | 2 JS — capas somem + menu quebrado | ~2s |
| STRESS-12 | A | EXPERT | JS+CSS — rank errado + cor vermelho | ~2s |
| STRESS-13 | A | EXPERT | 3 arquivos — capas + ranking + cor | ~2s |
| STRESS-14 | B | EASY | `display:none` no body — página em branco | ~2s |
| STRESS-15 | B | MEDIUM | `--accent: #2dd881` → `#ff0000` | ~2s |
| STRESS-16 | B | MEDIUM | `z-index: -1` em main/header | ~1s |
| STRESS-17 | B | HARD | `--max: 0px` — layout colapsa | ~2s |
| STRESS-18 | C | EASY | Rota /cover retorna 404 | ~5s |
| STRESS-19 | C | MEDIUM | `REQUEST_TIMEOUT_MS = 0` | ~3s |
| STRESS-20 | C | HARD | `API_BASE_URL → localhost` | ~1s |
| STRESS-21 | C | EXPERT | `if (!query) → if (query)` invertido | ~1s |
| STRESS-22 | D | EXPERT | `desc: ''` — Analista Técnico zerado | ~2s |
| STRESS-23 | D | EXPERT | `HERMES_AGENT` comentado → ReferenceError | ~1s |
| STRESS-24 | D | EXPERT | `ACCEPTANCE_THRESHOLD` 0.7 → 7 | ~7s |
| STRESS-25 | D | EXPERT | `import resolveGameCover` comentado | ~1s |

---

## O que foi descoberto

### CSS 208 KB → Timeout 504
styles.css tem 6693 linhas / 208 KB. Enviado inteiro ao LLM → EB timeout em 90s.  
**Solução:** `windowContent(original, patched, 120)` — janela ±60 linhas em torno da mudança.  
Resultado: arquivo de 208 KB vira ~120 linhas de contexto → resposta em <2s.

### 3 arquivos simultâneos → LLM foca no primeiro
Com 1 bloco `[DIFF]` combinado (3 diffs concatenados), o LLM identificava apenas 1 bug.  
**Solução:** bloco `[DIFF]...[/DIFF]` separado por arquivo, cada um seguido do seu conteúdo.  
Backend while loop (`_diffRegex53.exec`) já capturava múltiplos blocos.

### Linha com `+//` interpretada como fix
Diff mostrando `+// const HERMES_AGENT = {` → LLM diagnosticava "comentar resolve o problema".  
**Solução:** §53 instruction explica convenção: `+` = código ERRADO introduzido como bug.

### Palavras subjetivas em `esperado` causam flakiness
`vermelho`, `verde`, `largura` → LLM usa termos técnicos, não traduções.  
**Solução:** valores exatos do diff: `#ff0000`, `#2dd881`, `--max`, `0px`.

### Backend pequeno (<10 KB) → diagnóstico perfeito em <1s
Arquivos de rota/serviço em <10 KB: sem windowing, LLM lê tudo e responde rapidamente.

---

## Novos §§ Implementados

| § | Nome | Arquivo | Descrição |
|---|---|---|---|
| §55 | `windowContent` | `scripts/stress-test-v2-vision-core.js` | Trunca arquivo ao redor do diff (±maxLines). Ativa quando `arquivo.length > MAX_FILE_BYTES` (30 KB) ou sempre em multi-arquivo |
| §56 | Multi-DIFF por arquivo | `scripts/stress-test-v2-vision-core.js` + `backend/server.js` | Cada arquivo tem `[DIFF]...[/DIFF]` próprio. Backend while loop captura todos |

---

## Placar Geral

| Suite | Cenários | PASS | Taxa |
|---|---|---|---|
| V1 (`scripts/stress-test-vision-core.js`) | 10 | 10 | 100% |
| V2 (`scripts/stress-test-v2-vision-core.js`) | 15 | 15 | 100% |
| **Total** | **25** | **25** | **100%** |

---

## Reproduzir

```bash
export GITHUB_TOKEN=<token>
export NODE_TLS_REJECT_UNAUTHORIZED=0

# V2
node scripts/stress-test-v2-vision-core.js
# Dashboard: http://localhost:3100
# Relatório: docs/STRESS-TEST-V2-RESULTS.md
```
