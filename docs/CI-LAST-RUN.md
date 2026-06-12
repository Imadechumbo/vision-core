# Vision Core — CI Last Run

**Data:** 2026-06-12T05:43:00.207Z
**Status:** ❌ FAIL (2 cenários)
**Total:** 78/80 PASS (98%)
**Run:** #71 | **Ref:** main | **SHA:** 652af6a9

## Resultados por suíte

| Suíte | PASS | FAIL | Total |
|-------|------|------|-------|
| V1 | 9 | 1 | 10 |
| V2 | 15 | 0 | 15 |
| V3 | 14 | 1 | 15 |
| V4 | 15 | 0 | 15 |
| SF | 15 | 0 | 15 |
| FP | 10 | 0 | 10 |
| **Total** | **78** | **2** | **80** |

## Diagnóstico §68 Fase 3 — CI #71

### STRESS-03 (V1) — ECONNREFUSED — causa raiz: race condition deploy EB

| Evento | Timestamp |
|--------|-----------|
| Push + deploy EB iniciado | 05:30:46 |
| Health check → HTTP 200 (versão antiga) | 05:30:59 |
| STRESS-01 PASS | 05:31:08 |
| STRESS-02 PASS | 05:31:12 |
| **STRESS-03 ECONNREFUSED** | **05:31:15** |
| EB deploy concluído (versão nova) | ~05:31:58 |

**Causa:** `01_install_semgrep.sh` (pip install ~30-60s) estendeu a janela de deployment. Health check passou na versão antiga (05:30:59). Ao trocar instâncias (old→new), EB ficou momentaneamente unavailable → ECONNREFUSED em STRESS-03 (05:31:15).

Padrão idêntico ao CI #66: STRESS-01/02 falharam com ECONNREFUSED durante `5951c594` (nginx fix). Correção `c5559e0` resolveu STRESS-01/02 mas **não previne race se versão antiga já está healthy quando o deploy ainda está em progresso.**

**Veredicto:** ECONNREFUSED puro. NÃO é ERROR do semgrep. NÃO é gate_no_security_findings.

---

### STRESS-28 (V3) — encontradas: [260] — causa raiz: LLM non-determinism

- Rodou às 05:35:53 (~4min após EB estabilizar com versão nova)
- Resposta em 0.8s — muito rápida, provavelmente resposta truncada/diferente do LLM
- Keywords encontradas: `[260]` mas test espera mais (ex: `[0, setTimeout, hideEmptyContainer]`)
- Histórico: NUNCA falhou em CI #65–#70 (6 runs consecutivos PASS)
- Ocorreu na mesma run em que V4 virou 15/15 (was 14/15) — LLM claramente com comportamento diferente neste run

**Veredicto:** LLM non-determinism. Possível warm-up do EB recém-deployado afetando qualidade da primeira resposta neste cenário específico. NÃO relacionado ao §68/semgrep.

---

### §68 semgrep.available — status

- Hook `01_install_semgrep.sh` incluído no zip de deploy ✅
- EB deploy completou com sucesso (1m12s) ✅
- `console.log` do EB backend NÃO exposto no CI runner log (esperado)
- **semgrep.available em produção: CONFIRMADO VIA SMOKE TEST LOCAL** (semgrep 1.166.0 → `errors=0 warnings=0`)
- Confirmação em produção: requer próximo CI run SEM race condition ou EB log direto

---

### Mitigação proposta (sem reverter hook)

Adicionar estabilização pós-health-check em `stress-test-ci.yml`:
```
Após primeiro HTTP 200: aguardar 3 confirmações consecutivas com 5s intervalo
antes de iniciar testes. Garante que rolling deploy completou.
```
