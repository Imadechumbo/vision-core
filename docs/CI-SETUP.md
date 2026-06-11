# Vision Core — CI Setup Guide

## Overview

O workflow `.github/workflows/stress-test-ci.yml` roda os 6 suítes de stress test
automaticamente e falha o job se qualquer cenário reprovar.

**Suítes:** V1 (10) + V2 (10) + V3 (15) + V4 (15) + SF (15) + FP (10) = **75 cenários**

---

## 1. Configurar o secret GH_PAT_TECHNETGAME

O workflow usa `secrets.GH_PAT_TECHNETGAME` para autenticar chamadas ao backend
e para o commit automático de `CI-LAST-RUN.md`.

**Passos:**

1. Acessar **Settings → Secrets and variables → Actions** no repositório
2. Clicar em **New repository secret**
3. Nome: `GH_PAT_TECHNETGAME`
4. Valor: Personal Access Token com scopes `repo` + `workflow`
5. Clicar em **Add secret**

> **Observação:** O token precisa de permissão de escrita no repo para o step
> de commit automático funcionar. Se quiser somente leitura, remova o step
> "Commit CI-LAST-RUN.md".

---

## 2. Triggers do workflow

| Trigger | Quando dispara |
|---------|---------------|
| `push` em `main` | A cada merge/push direto |
| `workflow_dispatch` | Manual (ver §3) |
| `schedule` `0 3 * * 0` | Domingo 03:00 UTC (semanal) |

---

## 3. Rodar manualmente (workflow_dispatch)

1. Ir em **Actions → Vision Core — Stress Test CI (V1–V4 + SF + FP)**
2. Clicar em **Run workflow**
3. Selecionar branch `main`
4. Clicar em **Run workflow** (verde)

O job aparecerá em ~10 segundos. Tempo total esperado: 15–30 min.

---

## 4. Interpretar falhas

### Job verde ✅
Todos os 75 cenários passaram. `docs/CI-LAST-RUN.md` atualizado com timestamp.

### Job vermelho ❌

Verificar o step **"Aggregate results and gate"** nos logs.
Ele mostra quais cenários falharam por suíte:

```
[SF] 2 FAIL:
    ❌ SF-STRESS-03 — SF-06 pacote de comando contém rm -rf
    ❌ SF-STRESS-11 — SF-02 template sem estrutura de pastas
```

Também é possível baixar os `STRESS-TEST-*-RESULTS.json` nos **Artifacts** do run.

---

## 5. Mapeamento de suíte → spec para revisão

Se a taxa cair abaixo do esperado, consultar a spec correspondente:

| Suíte | Spec | § | O que cobre |
|-------|------|---|-------------|
| V1 | `docs/STRESS-TEST-SPEC.md` | §56 | Bugs básicos: null, undefined, tipo errado |
| V2 | `docs/STRESS-TEST-V2-SPEC.md` | §57 | Bugs de lógica e estado |
| V3 | `docs/STRESS-TEST-V3-SPEC.md` | §58 | Bugs avançados: async, closure, race condition |
| V4 | `docs/STRESS-TEST-V4-SPEC.md` | §59 | Bugs EXPERT/NIGHTMARE: shadow, slice, TTL |
| SF | `docs/SF-STRESS-TEST-SPEC.md` | §59 | Software Factory: segurança, compliance |
| FP | `docs/SF-FALSE-POSITIVE-SPEC.md` | §61 | Falso positivo: código correto, não alucinar |

### Ação por cenário reprovado

| Tipo de falha | Causa provável | Ação |
|--------------|---------------|------|
| V1–V4 FAIL | Backend não detectou o bug | Revisar `esperado[]` + backend prompt |
| SF FAIL | Módulo SF não detectado | Revisar palavras-chave e auditHint |
| FP FAIL | Backend alucinando | **Prioridade máxima** — revisar sistema de prompts |
| Todas as suítes FAIL | Backend offline | Verificar EBS health + logs |

---

## 6. Artefatos

Cada run produz:
- `stress-test-results-<run_number>` — todos os `RESULTS.json` + `RESULTS.md`
- Retenção: 90 dias

Download: **Actions → [run] → Artifacts → stress-test-results-N**

---

## 7. Falso positivo (FP) — alerta especial

Se qualquer cenário `FP-*` falhar, significa que o Vision Core **inventou um bug
em código correto**. Isso é mais grave que um bug não detectado.

Ação imediata:
1. Ver `docs/STRESS-TEST-FP-RESULTS.json` — qual cenário e quais palavras dispararam
2. Ver `docs/SF-FALSE-POSITIVE-SPEC.md` — detalhes do cenário FP
3. Revisar o system prompt do Vision Core para reduzir assertividade em contextos ambíguos
4. Adicionar exemplos de código correto ao fine-tuning/few-shot do backend
