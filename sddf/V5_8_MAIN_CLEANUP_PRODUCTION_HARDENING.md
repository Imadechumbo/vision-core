# VISION CORE V5.8 — MAIN CLEANUP + PRODUCTION HARDENING

## Estado

A branch `main` recebeu o merge da V5.7 via PR #3.

## Arquitetura oficial

- Node: SaaS/UI/orquestração externa.
- Go Core: engine crítica oficial.
- Legacy Engine: mantido por compatibilidade, subordinado ao Go Core.
- PASS GOLD: fonte de verdade para promoção.

## Regras

- Node nunca simula GOLD.
- Frontend nunca decide promoção.
- Rollback é responsabilidade do Go Core.
- Sem PASS GOLD nada é promovido.
- Artefatos runtime/build não são versionados.

## Artefatos proibidos

- `bin/`
- `*.exe`
- `.vision-test/`
- `**/.vision-test/`
- `.vision-snapshots/`
- `**/.vision-snapshots/`
- `.rollback/`
- `**/.rollback/`
- `backend/memory/incidents/`
- `go-core/vendor/`
- `node_modules/`
- `desktop-agent/dist/`
- `desktop-agent/node_modules/`

## Critério MAIN GOLD

A main só é considerada saudável quando:

- `go test ./...` passa.
- `go build` passa.
- `node --check backend/server.js` passa.
- `node --check backend/src/runtime/goRunner.js` passa.
- missão real retorna:
  - `status = GOLD`
  - `pass_gold = true`
  - `engine = go-safe-core`
  - `hermes_enabled = true`
  - `transaction_mode = true`
