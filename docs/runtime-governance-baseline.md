# Runtime Governance Baseline — V25.0

Operational baseline for Vision Core runtime evidence governance.
Consolidates V21.0–V24.0 into a verifiable, locked governance layer.

## Core Rule

> **SEM PASS GOLD REAL → não promove, não libera, não marca stable.**

No REAL PASS GOLD → no promote, no release, no stable mark.

## Modules

| Version | Module | Purpose |
|---------|--------|---------|
| V21.0 | `tools/runtime-evidence-activation.mjs` | Classify runtime evidence status |
| V21.1 | `tools/go-core-evidence-contract.mjs` | Validate Go Core evidence receipt |
| V21.2 | `tools/backend-runtime-probe.mjs` | Probe backend runtime (no-start default) |
| V21.3 | `tools/pi-harness.mjs` | Runtime evidence wired into PI Harness JSON |
| V21.4 | `tools/pass-gold-runtime-binding.mjs` | Bind PASS GOLD candidate to evidence chain |
| V22.0 | `tools/local-runtime-pass-gold-drill.mjs` | Local PASS GOLD drill (temp root, no production) |
| V23.0 | `tools/runtime-evidence-ledger-integration.mjs` | Append runtime events to audit ledger |
| V24.0 | `tools/release-readiness-report.mjs` | Readiness report includes runtime evidence |
| V25.0 | `tools/runtime-governance-baseline.mjs` | Baseline checker for V21–V24 |

## Evidence Chain Requirements for PASS GOLD

All of the following must be TRUE simultaneously:

1. `backend_alive=true` — backend is reachable
2. `backend_stub=false` — backend is NOT in stub mode
3. `mission_id` — real mission ID present
4. `evidence_receipt_id` — real receipt ID present
5. `evidence_source=go-core` — receipt must come from Go Core, not backend
6. `go_core_receipt_valid=true` — receipt passes hash and schema validation
7. `authority_binding_valid=true` — authority binding present and valid
8. `tests_verified=true` — test suite verified

## Runtime Evidence States

```
RUNTIME_EVIDENCE_BLOCKED_BACKEND_OFFLINE  — backend unreachable
RUNTIME_EVIDENCE_BLOCKED_BACKEND_STUB     — backend in stub mode
RUNTIME_EVIDENCE_BLOCKED_MISSION_ID       — no mission_id
RUNTIME_EVIDENCE_BLOCKED_RECEIPT          — no evidence_receipt_id
RUNTIME_EVIDENCE_BLOCKED_SOURCE           — evidence_source != go-core
RUNTIME_EVIDENCE_READY                    — all gates pass (still no deploy)
```

## Invariants (always enforced)

| Field | Value |
|-------|-------|
| `deploy_allowed` | `false` |
| `promotion_allowed` | `false` |
| `stable_allowed` | `false` |
| `deploy_performed` | `false` |
| `tag_created` | `false` |
| `stable_promoted` | `false` |

## Baseline Checker Usage

```bash
node tools/runtime-governance-baseline.mjs --json
node tools/runtime-governance-baseline.mjs --no-invariants
```

States: `BASELINE_BLOCKED_MODULES` | `BASELINE_BLOCKED_TESTS` | `BASELINE_BLOCKED_INVARIANTS` | `BASELINE_READY`

## Audit Ledger Events (V23.0)

New event types registered in the append-only ledger:

- `RUNTIME_EVIDENCE_COLLECTED`
- `GO_CORE_RECEIPT_VALIDATED`
- `PASS_GOLD_RUNTIME_BOUND`
- `LOCAL_PASS_GOLD_DRILL_EXECUTED`

## Test Coverage

| Script | Tests |
|--------|-------|
| `test:runtime-evidence-unit` | 48 |
| `test:go-core-contract-unit` | 52 |
| `test:backend-probe-unit` | 51 |
| `test:pass-gold-binding-unit` | 47 |
| `test:local-drill-unit` | 47 |
| `test:runtime-ledger-unit` | 54 |

## What Remains (PASS GOLD Path)

PASS GOLD real still requires:
- Live backend (not stub) with real Go Core running
- Real `mission_id` from a live mission execution
- Real `evidence_receipt` produced by Go Core (not by backend)
- `evidence_source=go-core` verified in receipt
- Full authority binding with human approval contract

The governance baseline (V25.0) provides the classification framework.
The actual PASS GOLD can only occur when all real runtime evidence is present.
