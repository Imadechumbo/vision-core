# Vision Core — Visual Baseline Lock

## Canonical GOLD visual baseline

Approved deployment:

https://2d645f8f.visioncoreai.pages.dev

This deployment is the source of truth for the original GOLD Harness visual baseline.

## Protected files

The following files are protected by the visual GOLD contract:

- frontend/index.html
- frontend/assets/vision-gold.css
- frontend/assets/vision-agent-local.js
- frontend/assets/vision-api.js
- frontend/assets/vision-chat.js
- frontend/assets/vision-runtime-owner.js
- frontend/assets/vision-report.js

## Hash lock

The canonical hashes are stored in:

- docs/VISUAL_GOLD_HARNESS_MANIFEST.json

The lock is enforced by:

- tools/visual-gold-harness-lock.mjs
- tools/frontend-visual-lock.mjs
- tools/sddf-front-guard.mjs

## Unlock key

Visual changes are blocked unless explicitly authorized with:

VISUAL PATCH AUTHORIZED

Local unlock variable:

VISUAL_PATCH_AUTHORIZED=1

## Promotion rule

SEM PASS GOLD REAL → não promove, não libera, não marca stable.

The GOLD visual baseline may contain legacy runtime files for visual parity only. Promotion and deploy remain blocked unless real evidence, real mission_id, backend_stub=false, and PASS GOLD gates are satisfied.

## Governance

Codex, Claude, PI Harness, and any automated agent must not alter the protected visual baseline without explicit visual patch authorization.

The main branch must require PR review and visual lock checks before merge.
