# V5.7 Release Candidate — Merge Controlado

- **Branch source:** `v5-go-agent-bridge`
- **Target branch:** `main`
- **Gate obrigatório:** PASS GOLD

## Regras

1. Go Core é a source of truth para decisão de PASS GOLD.
2. Node/Backend nunca simula GOLD; apenas consome o resultado emitido pelo Go Core.
3. Rollback fica sob responsabilidade do Go Core.
4. Frontend apenas consome eventos/status; não decide promoção.
5. Legacy Engine só executa após GO PASS GOLD.

## Artefatos proibidos

Não versionar:

- `bin/`
- `*.exe`
- `.vision-test/`
- `**/.vision-test/`
- `.rollback/`
- `**/.rollback/`
- `.vision-snapshots/`
- `**/.vision-snapshots/`
- `backend/memory/incidents/`
- `go-core/vendor/`
- `node_modules/`
- `desktop-agent/dist/`

## Critérios de merge para `main`

Merge permitido somente quando a validação confirmar:

- `"status": "GOLD"`
- `"pass_gold": true`
- `"engine": "go-safe-core"`
- `"hermes_enabled": true`
- `"transaction_mode": true`

Sem PASS GOLD, nada é promovido.
