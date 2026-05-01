#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/app/staging"
if [ ! -d "$ROOT" ]; then
  ROOT="$(pwd)"
fi

if command -v node >/dev/null 2>&1 && [ -f "$ROOT/scripts/self-healing-config.js" ]; then
  echo "[VISION CORE V3] Self-Healing Config Layer predeploy start"
  node "$ROOT/scripts/self-healing-config.js" --apply --root "$ROOT"
  echo "[VISION CORE V3] Self-Healing Config Layer predeploy PASS"
else
  echo "[VISION CORE V3] Node or script not available; skipping predeploy self-heal"
fi
