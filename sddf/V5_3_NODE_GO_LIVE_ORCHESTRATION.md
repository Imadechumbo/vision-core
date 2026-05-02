# SDDF — V5.3 NODE ⇄ GO LIVE ORCHESTRATION

## Contexto

| Versão | Status | Descrição |
|--------|--------|-----------|
| V4.4 | GOLD | Legacy Engine estável (Node + Electron + Cloudflare) |
| V5.0 | GOLD | Go Safe Core — fundação |
| V5.1 | GOLD | Go Agent Bridge — goRunner.js |
| V5.2 | GOLD | Real Mission Execution — pipeline completo |
| **V5.3** | **LIVE** | **Node ⇄ Go Live Orchestration — SSE real** |

## Regra permanente

> **SEM PASS GOLD → nada é promovido, nada aprende, nada substitui legado.**

---

## Fluxo Node → Go

```
Frontend UI
  │
  │ POST /api/run-live   (ou GET /api/run-live-stream?mission=...)
  ▼
Node.js backend (server.js)
  │
  │ require('./src/runtime/goRunner')
  │ runGoMission({ root, input })
  │ spawn: bin/vision-core mission --root <root> --input <input>
  ▼
Go Safe Core (bin/vision-core)
  │
  │ Pipeline V5.2:
  │   scanner → fileops → snapshot → patcher
  │   → validator → rollback (se FAIL) → passgold
  ▼
  JSON stdout:
  {
    "pass_gold": true/false,
    "status": "GOLD"/"FAIL",
    "step_results": [...],
    "snapshot_id": "...",
    ...
  }
  │
  ▼
Node.js parseia JSON → normalizeGoResult()
  │
  ├── POST /api/run-live → res.json(result)
  └── GET /api/run-live-stream → streamGoMission() → SSE events
        │
        ▼
      Frontend UI
      UI timeline acende: scanner → fileops → snapshot →
        patcher → validator → rollback → passgold:ok
```

---

## Contrato SSE

### Sequência de eventos (ordem garantida)

| Evento SSE | Origem | Significado |
|------------|--------|-------------|
| `open` | Node | Conexão SSE estabelecida |
| `mission:start` | Node | Go Core iniciando |
| `scanner:ok` | Go step_result | Scanner OK |
| `fileops:ok` | Go step_result | FileOps OK |
| `snapshot:ok` | Go step_result | Snapshot criado |
| `patcher:ok` | Go step_result | Patch aplicado |
| `validator:ok` | Go step_result | Validação OK |
| `rollback:ok` | Go step_result | Rollback pronto |
| `passgold:ok` | Go pass_gold | PASS GOLD confirmado |
| `mission:complete` | Go | Missão concluída |

### Em caso de falha

| Evento | Significado |
|--------|-------------|
| `step:fail` | Step individual falhou |
| `mission:fail` | Missão encerrou sem PASS GOLD |

### Payload de cada evento

```json
{
  "mission_id": "mission_a1b2c3d4",
  "step": "scanner",
  "ok": true,
  "message": "scanned 23 files, stack: [node]",
  "status": "ok",
  "pass_gold": false,
  "time": "2026-05-02T..."
}
```

### Payload de `mission:complete`

```json
{
  "mission_id": "mission_a1b2c3d4",
  "ok": true,
  "status": "GOLD",
  "pass_gold": true,
  "promotion_allowed": true,
  "rollback_ready": true,
  "snapshot_id": "mission_a1b2c3d4-1714700000000",
  "rollback_applied": false,
  "duration_ms": 45,
  "engine": "go-safe-core",
  "version": "5.2.0-go-safe-core",
  "summary": "V5.2 REAL MISSION EXECUTION — PASS GOLD confirmed."
}
```

---

## Endpoints Node V5.3

### `GET /api/go-core/health`

Verifica se o binário existe e executa self-test.

```bash
curl http://localhost:8080/api/go-core/health
```

Resposta esperada:
```json
{
  "ok": true,
  "healthy": true,
  "engine": "go-safe-core",
  "version": "5.2.0-go-safe-core",
  "pass_gold": true,
  "status": "GOLD",
  "duration_ms": 12,
  "bin": "/path/to/vision-core"
}
```

### `POST /api/run-live`

Executa missão via Go Core, retorna JSON completo.

```bash
curl -X POST http://localhost:8080/api/run-live \
  -H "Content-Type: application/json" \
  -d '{"mission": "corrigir erro de CORS"}'
```

### `GET /api/run-live-stream?mission=<input>`

SSE em tempo real. A UI conecta aqui e recebe os eventos do pipeline.

```bash
curl -N "http://localhost:8080/api/run-live-stream?mission=self-test"
```

---

## Arquivos alterados na V5.3

| Arquivo | Mudança |
|---------|---------|
| `backend/src/runtime/goRunner.js` | `streamGoMission()` + `checkGoHealth()` + `snapshot_id`/`rollback_applied` |
| `backend/server.js` | `/api/run-live` → Go real; `/api/run-live-stream` → SSE real; `/api/go-core/health` novo |
| `sddf/V5_3_NODE_GO_LIVE_ORCHESTRATION.md` | Este documento |

---

## Regras de segurança

1. `shell: false` no spawn — nunca shell injection
2. PASS GOLD vem **exclusivamente** do JSON do Go Core — nunca hardcoded
3. `promotion_allowed` só é `true` se `pass_gold === true` (verificado em normalizeGoResult)
4. Timeout de 30s (configurável via `VISION_GO_CORE_TIMEOUT_MS`)
5. Erros de runtime nunca crasham o backend — retornam `error_type: go_runtime_failure`
6. Memória de incidentes só salva se `pass_gold === true`

---

## Variáveis de ambiente

| Variável | Default | Descrição |
|----------|---------|-----------|
| `VISION_GO_CORE_BIN` | auto-detect | Path absoluto do binário |
| `VISION_PROJECT_ROOT` | `process.cwd()/..` | Root do projeto para o Go Core |
| `VISION_GO_CORE_TIMEOUT_MS` | `30000` | Timeout em ms |

---

## Troubleshooting

### `binary_not_found`
```bash
# Compilar o Go Core
cd go-core && go build -o ../bin/vision-core ./cmd/vision-core/
```

### SSE não recebe `passgold:ok`
Verificar se o Go Core retorna `pass_gold: true` diretamente:
```bash
bin/vision-core mission --root . --input "self-test"
```

### `go_runtime_failure` com `invalid go core JSON`
O Go Core imprime texto antes do JSON. O Node extrai o JSON pela posição do primeiro `{` até o último `}`.

### PASS GOLD não aparece na UI
A UI escuta `passgold:ok` e `mission:complete`. Verificar se o SSE está conectado antes de chamar `/api/run-live`.
