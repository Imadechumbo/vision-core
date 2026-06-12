# Vision Core — CI Last Run

**Data:** 2026-06-12T07:55:57.576Z
**Status:** ❌ FAIL (1 cenários)
**Total:** 79/80 PASS (99%)
**Run:** #75 | **Ref:** main | **SHA:** 9c62688d

## Resultados por suíte

| Suíte | PASS | FAIL | Total |
|-------|------|------|-------|
| V1 | 9 | 1 | 10 |
| V2 | 15 | 0 | 15 |
| V3 | 15 | 0 | 15 |
| V4 | 15 | 0 | 15 |
| SF | 15 | 0 | 15 |
| FP | 10 | 0 | 10 |
| **Total** | **79** | **1** | **80** |

## §68 Fases 3+4 — Linha do Tempo CI #71→#75

| Run | Score | FAILs | Causa | Fix aplicado |
|-----|-------|-------|-------|--------------|
| #71 | 78/80 | STRESS-03 ECONNREFUSED, STRESS-28 LLM | Race condition (hook 56ms) + LLM non-det. | Health check 3x consecutivo |
| #72 | 79/80 | SF-STRESS-07 LLM | LLM non-determinism | — (confirmou race fix OK) |
| #73 | 77/80 | STRESS-06 hang, STRESS-07 ECONN, STRESS-27 LLM | Race persistente (dnf ~38s) + LLM | fetch-depth:2 + sleep 300s |
| #74 | 79/80 | STRESS-04 ECONN | Race: git diff vazio (shallow) → sleep não ativou | fetch-depth:2 corrigido |
| **#75** | **79/80** | **STRESS-10 timeout 60s (LLM)** | **LLM rate-limit cascade (Hexe)** | **— (race RESOLVIDA ✅)** |

### §68 semgrep em produção — estado final (CI #75 / commit 9c62688)

- **Hook:** `backend/.platform/hooks/predeploy/01_install_semgrep.sh` (venv)
- **EB log confirmado:** `semgrep instalado via venv: ✅ | symlink /usr/local/bin/semgrep → /opt/semgrep-venv/bin/semgrep`
- **semgrep.available:** `true` para `/api/chat/apply-patch` (uso real)
- **gate_no_security_findings:** ATIVO — ERROR bloqueia GOLD, WARNING não bloqueia
- **Stress tests:** não exercitam gate §68 (chamam `/api/chat`, não `/api/chat/apply-patch` — comportamento esperado)
- **FAIL residual:** STRESS-10 Hexe timeout = LLM non-determinism pre-existente, não relacionado a §68
