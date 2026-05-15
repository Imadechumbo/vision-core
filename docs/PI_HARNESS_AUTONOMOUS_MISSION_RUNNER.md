# PI Harness V15.3 — Autonomous Mission Runner

Vision Core autonomous executor. Runs progressive validation from preflight to final PASS GOLD decision.

## Levels D0–D8

| Level | Name | Purpose |
|-------|------|---------|
| D0 | Preflight | Git status, branch, visual locks, node syntax, go test/build, fake evidence scan, untracked binary, env report |
| D1 | Safe Cleanup | Remove allowed temp logs, restore forbidden frontend changes, unstage forbidden files, no `git add .` |
| D2 | Contract Validation | Validate schema, evidence_receipt in schema/normalizer, strict pass gold gate logic, list missing fields |
| D3 | Go Core Runtime | Compile binary if needed, dry-run execution, verify mission_id/evidence_receipt/source/backend_stub/pass_gold/failed_gates |
| D4 | Backend Runtime | Probe local backend (porta configurável, padrão 8080), GET /api/health, POST /api/run-live, verify payload fields. Com `--runtime-probe`: startup determinístico, temp root seguro, payload controlado, para processo; `--runtime-probe-no-start`: só testa backend já rodando |
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
--dry-run                        Valida e reporta, não altera arquivos, não commita
--max-difficulty D3              Executa somente até camada D3 (padrão: D8)
--no-autofix                     Pula D6 Safe Auto-Fix completamente
--json                           Emite JSON final parseável no stdout
--ci                             Modo CI: sem output progressivo
--runtime-probe                  (V15.1) Ativa probe runtime real: startup, temp root, valida
--runtime-probe-port <port>      (V15.3) Porta do backend a testar (padrão: $PORT ou 8080)
--runtime-probe-timeout-ms <ms>  (V15.3) Timeout de health wait (padrão: 8000ms)
--runtime-probe-no-start         (V15.3) Não inicia backend; testa apenas backend já rodando
--runtime-probe-root <path>      (V15.3) Usa diretório explícito como root do probe
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

# Runtime probe completo (V15.1) — inicia/para backend, valida evidence real
node tools/pi-harness.mjs --runtime-probe --json
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
  "no_autofix": false,
  "runtime_probe_enabled": false,
  "backend_process_started": false,
  "backend_process_stopped": false,
  "backend_health_status": "not_probed",
  "run_live_status": "not_probed",
  "run_live_mission_id": null,
  "run_live_evidence_source": null,
  "run_live_backend_stub": null,
  "run_live_deploy_allowed": null,
  "runtime_probe_pass": false,
  "runtime_contract_checked": false,
  "runtime_contract_pass": false,
  "runtime_contract_errors": [],
  "runtime_contract_warnings": [],
  "run_live_pass_gold": null,
  "run_live_promotion_allowed": null,
  "run_live_failed_gates": [],
  "runtime_probe_temp_root": null,
  "runtime_probe_temp_root_created": false,
  "runtime_probe_temp_root_removed": false,
  "runtime_probe_port": 8080,
  "runtime_probe_timeout_ms": 8000,
  "runtime_probe_no_start": false
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

**120 testes** (V15.3). Cobre: strict gate, fake evidence scan, forbidden diff, JSON parseável, dry-run imutabilidade, syntax check, runtime probe flag/fields (V15.1), runtime contract coherence (V15.2), new flags V15.3, safe payload unit tests, temp root lifecycle, positive contract path, no-start behavior, process lifecycle.

## V15.2 — Runtime Contract Hardening

### Por que não basta o backend responder?

Em V15.1, o harness valida que `/api/run-live` responde com os campos básicos corretos. Mas um backend parcialmente funcional pode responder com campos coerentes individualmente mas **incoerentes entre si** — por exemplo, `pass_gold: true` com `failed_gates` não vazio, ou `evidence_receipt.mission_id` diferente do `mission_id` top-level. V15.2 adiciona validação de coerência entre todos os campos da resposta.

### Campos obrigatórios e regras de coerência

| Regra | Condição | Bloqueio |
|-------|----------|---------|
| `evidence_receipt.mission_id` | Deve existir quando `evidence_receipt` presente | `BLOCKED_EVIDENCE` |
| `evidence_receipt.mission_id` | Deve ser igual ao `mission_id` top-level | `BLOCKED_EVIDENCE` |
| `evidence_source` top-level | Deve existir quando `evidence_receipt` presente | `BLOCKED_EVIDENCE` |
| `evidence_source` | Deve ser `"go-core"` | `BLOCKED_EVIDENCE` |
| `evidence_source` vs `evidence_receipt.source` | Devem ser iguais | `BLOCKED_EVIDENCE` |
| `pass_gold: true` | Requer `evidence_receipt` válido | `BLOCKED_EVIDENCE` |
| `pass_gold: true` | Requer `failed_gates` vazio | `BLOCKED_EVIDENCE` |
| `pass_gold: true` | Requer `backend_stub: false` | `BLOCKED_EVIDENCE` |
| `pass_gold: true` | Requer `evidence_receipt.source === "go-core"` | `BLOCKED_EVIDENCE` |
| `promotion_allowed: true` | Requer `pass_gold: true` | `BLOCKED_EVIDENCE` |
| `promotion_allowed: true` | Requer `backend_stub: false` | `BLOCKED_EVIDENCE` |
| `promotion_allowed: true` | Requer `evidence_source === "go-core"` | `BLOCKED_EVIDENCE` |
| `deploy_allowed: true` | Sempre bloqueio crítico | `BLOCKED_DEPLOY_GUARD` |

### Normalização de `failed_gates`

`failed_gates` deve ser array. Se vier como string, é normalizado para `[string]` com warning. Se vier como `null`/`undefined`, normalizado para `[]` sem warning. Se vier como outro tipo, normalizado para `[]` com warning. Se `pass_gold: true` e `failed_gates` normalizado não vazio, bloqueia.

### Exemplos de bloqueio V15.2

```json
// BLOQUEIO: mission_id divergente
{ "mission_id": "mission_abc", "evidence_receipt": { "mission_id": "mission_XYZ", "source": "go-core" } }
// → evidence_receipt.mission_id="mission_XYZ" diverge de mission_id="mission_abc"

// BLOQUEIO: pass_gold com failed_gates não vazio
{ "pass_gold": true, "failed_gates": ["gate_x"], "evidence_receipt": { "source": "go-core", "mission_id": "mission_abc" } }
// → pass_gold:true com failed_gates não vazio

// BLOQUEIO: deploy_allowed crítico
{ "deploy_allowed": true }
// → deploy_allowed:true — bloqueio crítico imediato
```

### Campos adicionados ao JSON (V15.2)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `runtime_contract_checked` | bool | Contract validation foi executada |
| `runtime_contract_pass` | bool | Todos os checks de coerência passaram |
| `runtime_contract_errors` | string[] | Erros de coerência encontrados |
| `runtime_contract_warnings` | string[] | Avisos (ex: failed_gates normalizado) |
| `run_live_pass_gold` | bool\|null | pass_gold retornado pelo backend |
| `run_live_promotion_allowed` | bool\|null | promotion_allowed retornado |
| `run_live_failed_gates` | string[] | failed_gates normalizado da resposta |

## V15.1 — Runtime Probe

### Comportamento com `--runtime-probe`

1. Verifica se backend já responde em `localhost:8080` (ou `$PORT`)
2. Se não responder, inicia `node backend/server.js` de forma controlada
3. Aguarda até 8s para backend responder em `/api/health`
4. Se backend não inicia → `BLOCKED_RUNTIME` (nunca PASS fake)
5. POST `/api/run-live` com payload: `{ "input": "self-test", "root": "<tmpdir>", "dry_run": true }`
6. Valida resposta **estritamente**:
   - `mission_id` existe e começa com `mission_`
   - `evidence_receipt` existe e é objeto
   - `evidence_receipt.source === "go-core"` (bloqueio se diferente)
   - `backend_stub === false` (bloqueio se true)
   - `deploy_allowed === false` (bloqueio CRÍTICO se true)
7. Para o processo backend que o harness iniciou ao final (nunca deixa órfão)
8. `promotion_allowed` só fica true se runtime_probe_pass AND passGoldCandidate

### Campos adicionados ao JSON (V15.1)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `runtime_probe_enabled` | bool | Flag --runtime-probe ativa |
| `backend_process_started` | bool | Harness iniciou backend |
| `backend_process_stopped` | bool | Harness parou backend |
| `backend_health_status` | string | `ok` / `offline` / `not_probed` |
| `run_live_status` | string | `ok` / `no_response` / `backend_offline` / `not_probed` |
| `run_live_mission_id` | string\|null | mission_id retornado |
| `run_live_evidence_source` | string\|null | evidence_receipt.source |
| `run_live_backend_stub` | bool\|null | backend_stub retornado |
| `run_live_deploy_allowed` | bool\|null | deploy_allowed retornado |
| `runtime_probe_pass` | bool | Todas validações passaram |

## V15.3 — Real Backend Runtime Probe PASS Path

### Diferença entre BLOCKED_RUNTIME e PASS path real

| Estado | Condição | Resultado |
|--------|----------|-----------|
| `BLOCKED_RUNTIME` | Backend offline OU não iniciou OU health timeout | `runtime_probe_pass=false`, `recommendation=BLOCKED_RUNTIME` |
| `BLOCKED_EVIDENCE` | Backend respondeu, mas contract falhou | `runtime_contract_pass=false`, `runtime_probe_pass=false` |
| `BLOCKED_DEPLOY_GUARD` | `deploy_allowed=true` na resposta | Bloqueio crítico imediato |
| **PASS path real** | Backend real, Go Core real, todos os gates OK | `runtime_probe_pass=true`, `runtime_contract_pass=true` |

**PASS path real** requer obrigatoriamente:
- `backend_health_status=ok` — backend respondeu `/api/health`
- `run_live_status=ok` — `/api/run-live` respondeu
- `run_live_mission_id` começa com `mission_`
- `run_live_evidence_source=go-core`
- `run_live_backend_stub=false`
- `run_live_deploy_allowed=false`
- `runtime_contract_pass=true` — todos os campos coerentes

**Mesmo no PASS path**: `deploy_allowed` permanece `false`. `PASS_GOLD_CANDIDATE` só é `true` se todos os gates globais reais passarem (não apenas `runtime_probe_pass`).

### Startup determinístico (V15.3)

O harness detecta `backend/server.js` e inicia com a porta configurada. O tempo de espera é configurável via `--runtime-probe-timeout-ms`. Processo iniciado pelo harness é **sempre encerrado** no `finally`, nunca deixado órfão. Processos preexistentes não são afetados.

```bash
# Testar apenas backend já rodando (não tenta iniciar)
node tools/pi-harness.mjs --runtime-probe --runtime-probe-no-start --json

# Usar porta alternativa com timeout reduzido
node tools/pi-harness.mjs --runtime-probe --runtime-probe-port 3000 --runtime-probe-timeout-ms 5000 --json
```

### Temp root seguro (V15.3)

O probe cria um diretório temporário isolado sob `os.tmpdir()` para ser usado como `root` no payload de `/api/run-live`. O payload nunca aponta para o repo raiz. O diretório é removido no `finally` independente do resultado.

```json
// Payload enviado ao /api/run-live (sempre dry_run=true)
{
  "input":   "V15.3 runtime pass path self-test",
  "root":    "/tmp/pi-harness-probe-1748000000000",
  "dry_run": true,
  "source":  "pi-harness-runtime-probe",
  "mode":    "runtime-probe"
}
```

Para controle explícito: `--runtime-probe-root <path>` usa diretório fornecido (sem criar/remover).

### Campos adicionados ao JSON (V15.3)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `runtime_probe_temp_root` | string\|null | Caminho do temp root do probe |
| `runtime_probe_temp_root_created` | bool | Harness criou o diretório |
| `runtime_probe_temp_root_removed` | bool | Harness removeu ao final |
| `runtime_probe_port` | number | Porta efetiva usada no probe |
| `runtime_probe_timeout_ms` | number | Timeout de health wait efetivo |
| `runtime_probe_no_start` | bool | Flag --runtime-probe-no-start ativa |

### Exemplos de JSON por cenário

**Backend offline (BLOCKED_RUNTIME):**
```json
{
  "runtime_probe_enabled": true,
  "backend_health_status": "offline",
  "run_live_status": "backend_offline",
  "runtime_probe_pass": false,
  "runtime_contract_checked": false,
  "runtime_contract_pass": false,
  "deploy_allowed": false,
  "recommendation": "BLOCKED_RUNTIME"
}
```

**Backend real PASS path:**
```json
{
  "runtime_probe_enabled": true,
  "backend_health_status": "ok",
  "run_live_status": "ok",
  "run_live_mission_id": "mission_abc123",
  "run_live_evidence_source": "go-core",
  "run_live_backend_stub": false,
  "run_live_deploy_allowed": false,
  "runtime_probe_pass": true,
  "runtime_contract_checked": true,
  "runtime_contract_pass": true,
  "runtime_contract_errors": [],
  "deploy_allowed": false,
  "runtime_probe_temp_root": "/tmp/pi-harness-probe-1748000000000",
  "runtime_probe_temp_root_created": true,
  "runtime_probe_temp_root_removed": true
}
```

**Backend real com contract fail:**
```json
{
  "runtime_probe_enabled": true,
  "backend_health_status": "ok",
  "run_live_status": "ok",
  "runtime_probe_pass": false,
  "runtime_contract_checked": true,
  "runtime_contract_pass": false,
  "runtime_contract_errors": ["evidence_receipt.mission_id diverge de mission_id"],
  "deploy_allowed": false,
  "recommendation": "BLOCKED_EVIDENCE"
}
```
