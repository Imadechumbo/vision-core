# VISION CORE — Agent Operating Contract

## Absolute Rules

1. Human input must be routed through OpenClaw before diagnosis.
2. Scanner must resolve targets before Hermes RCA.
3. Hermes must not decide patches without scanResult.
4. Aegis must never be bypassed.
5. PASS GOLD is the only approval gate.
6. Critical files must never be fully rewritten by AI.
7. Community feedback is candidate knowledge only.
8. Validated learning requires reproduced evidence and PASS GOLD.
9. GitHub/Gitness PRs are created only after local validation.
10. Stable snapshots are created only after PASS GOLD.

## Canonical Pipeline

Input humano
→ OpenClaw Router
→ Scanner with targetHints/signals
→ Hermes RCA with mandatory scanResult
→ PatchEngine
→ Aegis
→ Validation / SDDF
→ PASS GOLD
→ GitHub + Gitness PR
→ CI hybrid validation
→ Merge only if PASS GOLD remains valid
→ Stable snapshot / rollback point
