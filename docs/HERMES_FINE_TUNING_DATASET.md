# Hermes Fine-Tuning Dataset Schema

Status: internal dataset collection only. No training job is authorized or implemented.

## Current Collection Point

Hermes writes dataset candidates into `backend/data/mission-timeline.json` under `entry.hermes_dataset`.

This intentionally reuses the mission timeline store instead of creating another append-only file because the validated outcome already arrives through the mission lifecycle (`/api/run-live`). UI history still filters normal entries by `user_id`; dataset-only records are internal and are exported only by `tools/export-hermes-dataset.mjs`.

## Minimum Example Shape

Each JSONL row must be one complete, redacted example:

```json
{
  "schema_version": "hermes-ft-0.2",
  "source": "hermes-analyze",
  "source_id": "hds-...",
  "timestamp": "2026-07-14T00:00:00.000Z",
  "mission_id": "hermes-...",
  "provider": "openrouter|anthropic|groq|deepseek|gemini|local",
  "model": "provider-model-name",
  "input": {
    "message": "user mission, bug report, stack, or objective",
    "mode": "debug"
  },
  "context": {
    "endpoint": "/api/hermes/analyze",
    "body_keys": ["message", "mode"]
  },
  "decision": {
    "label": "NEEDS_FIX|PASS|BLOCKED|ABORTED|ANSWERED|UNKNOWN",
    "diagnosis": "Hermes RCA or generated answer",
    "recommended_fix": "optional",
    "raw": "raw Hermes answer, redacted"
  },
  "outcome": {
    "status": "success|failure",
    "pass_gold": false,
    "evidence": "real validation receipt, strict failure reason, or runtime failure",
    "validated_at": "2026-07-14T00:00:00.000Z",
    "source": "run-live"
  }
}
```

## Field Sources

- `input`: captured in `/api/hermes/analyze` from the real Hermes request (`message`, `prompt`, `mission`, `mode`), then redacted before persistence.
- `decision`: captured in `/api/hermes/analyze` from the real Hermes answer and provider/model selected by `callLLM()`.
- `outcome`: updated later by `/api/run-live` only when the mission returns a real success/failure signal. Matching prefers `hermes_dataset_id`, then `mission_id`, then exact redacted mission input hash.
- `timestamp`, `mission_id`, `provider`, `model`: captured at Hermes decision time.

## Redaction Rule

`backend/hermes-dataset.js` redacts common secrets and PII before writing:

- API keys, bearer tokens, GitHub/OpenAI-style tokens, JWT-like strings
- password/secret/token/client_secret/authorization object keys
- email addresses
- AWS access key IDs

Redaction happens before data reaches `mission-timeline.json`; exported JSONL never reads raw Hermes input from memory.

## Usability Rule

An example is usable only when all three are present:

- redacted real input/context
- real Hermes decision/output
- real outcome or validation result with `status: "success"` or `status: "failure"`

`outcome.status: "pending"` is not exported. Raw `.vision-snapshots` backup metadata is not enough by itself and is intentionally excluded by the exporter.

## Second Collection Point — Modo Automação Total RCA

`.claude/commands/modo-total.md` defines a separate RCA cycle the coding
agent runs on its own work (Sintoma/Causa/Verificação/Achado/Decisão),
unrelated to mission diagnosis. When that cycle reaches Decisão `READY`
or `NEEDS_FIX`, it is persisted into the same `mission-timeline.json` /
`entry.hermes_dataset` store via `appendModoTotalRca()` in
`backend/hermes-dataset.js`, invoked through
`tools/record-modo-total-rca.mjs`. `BLOCKED_INPUT` is never persisted —
it means no real RCA was produced.

This is a distinct category, not a mission record: `source:
"modo-total-rca"` (vs. `"hermes-analyze"` for mission RCA). Same
schema, same redaction (`redactString`/`redactValue`), same 90-day /
500-entry retention — no field was added to or removed from the
existing mission schema.

Field mapping:

| RCA field       | Dataset field                      |
|-----------------|-------------------------------------|
| Sintoma         | `input.message`                     |
| Causa provável  | `context.causa_provavel`            |
| Verificação     | `outcome.evidence`                  |
| Achado          | `decision.diagnosis` (+ `recommended_fix` when NEEDS_FIX) |
| Decisão         | `decision.label` (`READY`→`PASS`, `NEEDS_FIX`→`NEEDS_FIX`) |

Unlike mission records, `outcome` is set at write time, not later via
`/api/run-live`: `READY` → `status: "success"`, `NEEDS_FIX` → `status:
"failure"`, with `outcome.evidence` holding the actual Verificação text
(command/test/diff checked) instead of a run-live receipt. There is no
"pending" state for this category — the verification is already real
at RCA time, so the example is usable immediately.

`tools/export-hermes-dataset.mjs` takes an optional second argument to
export only one category: `node tools/export-hermes-dataset.mjs out.jsonl modo-total-rca`
(or `hermes-analyze` for mission RCA only). No argument exports both,
same as before this change.

## Fine-Tuning Threshold

Do not start real fine-tuning with this dataset until there are at least a few dozen curated, labeled examples for a narrow evaluator. For Hermes itself, the healthier threshold is hundreds of examples with outcomes and failure feedback. This applies to both collection points above — **no training job is authorized or implemented for either category**, this document only tracks how the raw data is collected and redacted.
