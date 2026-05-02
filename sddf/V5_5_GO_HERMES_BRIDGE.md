# VISION CORE V5.5 — GO HERMES BRIDGE

Status: GOLD candidate validated locally.

## Objective
Integrate Hermes RCA inside the Go Safe Core runtime before file operations and patch execution.

## Runtime order

```text
scanner → hermes → fileops → snapshot → patcher → validator → rollback → passgold
```

## Output contract

The Go Core mission output now includes:

```json
{
  "hermes_enabled": true,
  "issue_type": "cors_blocked",
  "probable_root_cause": "origin blocked by CORS policy or missing preflight headers",
  "confidence": 0.88,
  "severity": "MEDIUM",
  "suggested_strategy": "align_allowed_origins_headers_methods_and_options_preflight"
}
```

## Permanent rule

SEM PASS GOLD → nada é promovido.
