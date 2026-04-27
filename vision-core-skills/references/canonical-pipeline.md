# Canonical VISION CORE Pipeline

Input humano
→ OpenClaw Router
→ Scanner with targetHints/signals
→ Hermes RCA with mandatory scanResult
→ PatchEngine
→ Aegis Security Gate
→ Validation / SDDF
→ PASS GOLD
→ GitHub + Gitness PR
→ CI hybrid validation
→ Merge only if PASS GOLD remains valid
→ Stable snapshot / rollback point
