# Vision Core V5.0 — Go Safe Core

**V4.4 GOLD** = LEGACY ENGINE estável (Node + Electron + Cloudflare).  
**V5.0** = Extração do motor crítico para Go, em paralelo ao legado.

## Regra permanente

> **SEM PASS GOLD → nada é promovido, nada aprende, nada vira stable, nada substitui legado.**

## Estrutura

```
visioncore-v50/
├── backend/          # Node.js SaaS — LEGACY ENGINE (não alterar)
├── frontend/         # Cloudflare Pages — LEGACY ENGINE (não alterar)
├── worker/           # Cloudflare Worker — LEGACY ENGINE (não alterar)
├── desktop-agent/    # Electron — LEGACY ENGINE (não alterar)
│
├── go-core/          # ← NOVO: Go Safe Core V5.0
│   ├── cmd/vision-core/main.go
│   ├── internal/scanner/
│   ├── internal/fileops/
│   ├── internal/validator/
│   ├── internal/rollback/
│   ├── internal/patcher/
│   ├── internal/passgold/
│   ├── internal/mission/
│   ├── contracts/
│   └── examples/
│
├── sddf/             # ← NOVO: documentação de design
├── scripts/          # ← NOVO: build e validação
└── bin/              # ← gerado pelo build (no .gitignore)
```

## Quick start

```powershell
# Compilar
.\scripts\build-go-core.ps1

# Testar
.\bin\vision-core.exe mission --root "." --input "self-test"

# Validar critérios de aceite completos
.\scripts\validate-v5.ps1
```

## Saída esperada (self-test)

```json
{
  "ok": true,
  "version": "5.0.0-go-safe-core",
  "engine": "go-safe-core",
  "status": "GOLD",
  "pass_gold": true,
  "promotion_allowed": true,
  "rollback_ready": true
}
```

## Roadmap

| Versão | Objetivo |
|--------|----------|
| V5.0 | Go Safe Core — fundação (este release) |
| V5.1 | Electron vira UI shell, Go executa missões localmente |
| V5.2 | Substituição progressiva do Node crítico |
| V6.0 | Plataforma universal completa |

## V7.1 CONTROLLED BRANCH COMMIT AND DRY-RUN PR FLOW

V7.0 introduced PASS GOLD gated GitHub PR planning: the mission output creates a deterministic `PRPlan`, reports the `github_pr_*` fields, and keeps GitHub writes dry-run by default. V7.1 closes the next local-execution link without enabling any remote write by default.

V7.1 adds a controlled PR flow helper in the Go-first GitHub package that proves the following sequence in isolated temporary Git repositories during tests:

```text
PASS GOLD + PASS SECURE
→ PRPlan
→ dry-run flow
→ controlled local remediation branch
→ local commit containing only planned files
→ simulated PR/status intent
→ zero git push
→ zero real PR
→ zero real status publication
```

Safety rules for the V7.1 flow:

- PASS GOLD and PASS SECURE remain mandatory through the PR plan gate; a plan that cannot open a PR, has a non-success `vision/pass-gold` status, or has no changed files is blocked before Git commands.
- Dry-run is the default behavior; with `AllowLocalGit=false`, the flow validates the repository and plan but does not create a branch, run `git add`, or commit.
- Local branch and commit execution require `AllowLocalGit=true` and are intended for temp Git repositories in V7.1 validation, not for automatic mission execution in the real repository.
- Only files listed in `PRPlan.ChangedFiles` may be staged; unplanned dirty files block the flow.
- `.vision-memory/`, `.vision-snapshots/`, `bin/`, `node_modules/`, `vendor/`, `dist/`, `build/`, and `.next/` are excluded from controlled Git automation.
- Absolute paths, path traversal, unsafe branch names, `main`, `master`, and work branches equal to the base/current branch are blocked.
- Push, real PR creation, real status publication, auto-merge, frontend changes, and Node legacy adapter changes remain disabled by default.
- Real external GitHub writes remain behind the existing explicit write gates (`VISION_GITHUB_WRITE=1` plus token availability) and are not exercised by V7.1 tests.

The normal `mission` command continues to behave like V7.0 by generating the PR plan metadata only; it does not invoke the controlled branch/commit flow automatically.
