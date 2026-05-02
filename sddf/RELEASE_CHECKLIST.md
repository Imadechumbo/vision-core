# SDDF — RELEASE CHECKLIST V5.0

## Critérios de aceite (obrigatórios)

- [ ] `go test ./...` passa sem erros
- [ ] `scripts/build-go-core.ps1` gera `bin/vision-core.exe`
- [ ] `bin/vision-core.exe mission --root "." --input "self-test"` retorna:
  - `"engine": "go-safe-core"`
  - `"version": "5.0.0-go-safe-core"`
  - `"pass_gold": true`
  - `"promotion_allowed": true`
  - `"status": "GOLD"`
- [ ] Backend Node não foi alterado
- [ ] Frontend não foi alterado
- [ ] Desktop Agent não foi alterado
- [ ] Worker não foi alterado

## Estrutura obrigatória

- [ ] `go-core/go.mod` presente
- [ ] `go-core/cmd/vision-core/main.go` presente
- [ ] `go-core/internal/scanner/` — scanner.go + scanner_test.go
- [ ] `go-core/internal/fileops/` — fileops.go + fileops_test.go
- [ ] `go-core/internal/validator/` — validator.go + validator_test.go
- [ ] `go-core/internal/rollback/` — rollback.go + rollback_test.go
- [ ] `go-core/internal/patcher/` — patcher.go + patcher_test.go
- [ ] `go-core/internal/passgold/` — passgold.go + passgold_test.go
- [ ] `go-core/internal/mission/` — mission.go + mission_test.go
- [ ] `go-core/contracts/` — 3 schemas JSON
- [ ] `go-core/examples/` — mission.example.json
- [ ] `sddf/` — 6 documentos
- [ ] `scripts/` — 3 scripts PowerShell
- [ ] `bin/` no `.gitignore`

## Gates PASS GOLD V5.0

- [ ] `scanner_ok` — scanner executou sem alterar arquivos
- [ ] `fileops_ok` — sem path traversal, dentro do root
- [ ] `patcher_ok` — dry-run validado
- [ ] `validator_ok` — todos os checks passaram
- [ ] `rollback_ready` — diretório de snapshots operacional
- [ ] `security_ok` — nenhum módulo escreveu fora do root
- [ ] `legacy_safe` — Node/Electron intactos

## Proibido na V5.0

- [ ] ❌ Sem memory/learning
- [ ] ❌ Sem LLM calls
- [ ] ❌ Sem escrita em produção
- [ ] ❌ Sem substituição do legado
- [ ] ❌ Sem alteração de backend/frontend/worker/desktop-agent
