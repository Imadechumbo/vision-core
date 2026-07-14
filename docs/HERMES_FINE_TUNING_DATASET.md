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

## Fine-Tuning Threshold

Do not start real fine-tuning with this dataset until there are at least a few dozen curated, labeled examples for a narrow evaluator. For Hermes itself, the healthier threshold is hundreds of examples with outcomes and failure feedback.
