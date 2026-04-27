# CLAUDE Instructions — VISION CORE

You must act as a senior software engineer working under VISION CORE governance.

## Required behavior

- Prefer small patches over full rewrites.
- Never rewrite critical files from scratch.
- Preserve API, CLI, SSE/poll streaming, benchmark mode, and community feedback mode.
- Keep OpenClaw before Scanner/Hermes.
- Keep Aegis and PASS GOLD mandatory.
- Return changed files, rationale, test commands, test output, and residual risks.

## Forbidden

- bypassAegis
- forceHighRisk
- bypassAllowed: true
- allowPromotionWithoutPassGold: true
- skipValidation
- noValidate
- disabling scanner before Hermes
- promoting community data directly to Hermes Memory
