# PI Harness V15.0 — Autonomous Mission Runner

Vision Core autonomous executor. Runs progressive validation from preflight to final PASS GOLD decision.

## Levels D0–D8

| Level | Name | Purpose |
|-------|------|---------|
| D0 | Preflight | Git status, branch, visual locks, node syntax, go test/build, fake evidence scan, untracked binary, env report |
| D1 | Safe Cleanup | Remove allowed temp logs, restore forbidden frontend changes, unstage forbidden files, no `git add .` |
| D2 | Contract Validation | Validate schema, evidence_receipt in schema/normalizer, strict pass gold gate logic, list missing fields |
| D3 | Go Core Runtime | Compile binary if needed, dry-run execution, verify mission_id/evidence_receipt/source/backend_stub/pass_gold/failed_gates |
| D4 | Backend Runtime | Probe local backend (port 8080), GET /api/health, POST /api/run-live, verify payload fields |
| D5 | Repair Planning | Classify error types, generate repair plan, distinguish auto-fixable vs manual |
| D6 | Safe Auto-Fix | Apply permitted fixes only (path sep, temp cleanup, restore forbidden, .gitignore) |
| D7 | PASS GOLD Decision | Compute final candidate decision from all gates |
| D8 | Report | Full mission report (always runs) |

## REGRA ABSOLUTA: SEM PASS GOLD REAL

`PASS_GOLD_CANDIDATE: true` somente se **TODOS** os gates passam:

- `backend_alive` — backend local respondendo
- `backend_stub === false` — Go Core executado de verdade
- `backend_has_mission_id` — mission_id real com padrão `mission_*`
- `backend_has_evidence_receipt` — evidence_receipt presente e real
- `evidence_source === "go-core"` — **obrigatório**, não aceita outro valor
- `evidence_in_schema` — evidence_receipt no result.schema.json
- `evidence_in_normalizer` — goRunner.js aceita e valida evidence_receipt
- `go_core_compiled` — binary existe
- `front_guard` — sddf-front-guard PASS
- `legacy_clean` — sem critical markers em arquivos legacy
- `v14_clean_ownership` — idem
- `fake_evidence_absent` — scan de makeFakeEvidence/makeBackendReceipt/fallbackReceipt/evr_backend limpo
- `forbidden_diff_absent` — sem diff em frontend/ ou bin/

Se qualquer gate falha:
```
PASS_GOLD_CANDIDATE: false
PROMOTION_ALLOWED:   false
DEPLOY_ALLOWED:      false (sempre, fase V15.0)
```

## O que o harness pode corrigir automaticamente (D6)

| Auto-fix | O que faz |
|----------|-----------|
| `restore_forbidden` | `git restore frontend/<file>` se diff proibido detectado |
| `autofix_gitignore_bin` | Adiciona `bin/vision-core` ao `.gitignore` se untracked |
| `unstage_forbidden` | Remove staging de arquivos frontend proibidos |
| `unstage_package_lock` | Remove staging de package-lock.json |

## O que o harness NUNCA pode fazer

- Alterar `frontend/` (visual intocável)
- Criar `pass_gold: true` hardcoded
- Criar `promotion_allowed: true` fake
- Criar `deploy_allowed: true`
- Fabricar `evidence_receipt`
- Fazer bypass de gates
- `git commit`, `git push`, `git merge`
- `git tag`, deploy, promote stable

## Flags

```
--dry-run           Valida e reporta, não altera arquivos, não commita
--max-difficulty D3 Executa somente até camada D3 (padrão: D8)
--no-autofix        Pula D6 Safe Auto-Fix completamente
--json              Emite JSON final parseável no stdout (sem texto decorativo)
--ci                Modo CI: sem output progressivo, somente relatório final
```

## Exemplos de execução

```bash
# Preflight completo, sem alterar nada
node tools/pi-harness.mjs --dry-run --max-difficulty D8

# Somente preflight + contrato, sem runtime
node tools/pi-harness.mjs --dry-run --max-difficulty D2

# Output JSON para integração CI
node tools/pi-harness.mjs --json

# Sem auto-fix, relatório completo
node tools/pi-harness.mjs --dry-run --no-autofix

# Com auto-fix ativado (modo normal)
node tools/pi-harness.mjs --max-difficulty D8
```

## JSON Output Schema

```json
{
  "result": "PASS|BLOCKED|FAILED",
  "difficulty": "D7",
  "max_difficulty": "D8",
  "pass_gold_candidate": false,
  "promotion_allowed": false,
  "deploy_allowed": false,
  "mission_id": null,
  "evidence_receipt_id": null,
  "evidence_source": null,
  "backend_stub": true,
  "strict_pass_gold_reason": ["backend_alive", "evidence_source_go_core"],
  "gates": { "syntax_ok": true, "fake_evidence_absent": true, ... },
  "failed_gates": ["backend_alive", "evidence_source_go_core"],
  "actions_taken": [],
  "files_changed": [],
  "files_restored": [],
  "layers_executed": ["D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7"],
  "layers_failed": [],
  "recommendation": "BLOCKED_RUNTIME",
  "branch": "main",
  "git_head": "94bd841...",
  "elapsed_ms": 4200,
  "dry_run": false,
  "no_autofix": false
}
```

## Recommendations

| Código | Significado |
|--------|-------------|
| `MERGE_READY` | Todos os gates passaram, PASS GOLD candidato |
| `BLOCKED_CI` | Falha em CI/sintaxe/go |
| `BLOCKED_RUNTIME` | Backend não responde ou stub |
| `BLOCKED_EVIDENCE` | evidence_receipt ausente ou fake detectado |
| `BLOCKED_VISUAL` | Frontend diff proibido ou visual lock falhou |
| `NEEDS_MANUAL_REVIEW` | Bloquio não automático |

## Testes

```bash
node tools/tests/pi-harness.test.mjs
```

Cobre: strict gate, fake evidence scan, forbidden diff, JSON parseável, dry-run imutabilidade, syntax check.
