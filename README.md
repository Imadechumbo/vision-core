# Vision Core V2.9.10

> **REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.**

Full-stack AI mission execution platform. Node.js backend (the real HTTP server) + Go safe core (a subprocess it invokes for scanning/patching/validation/security) + Cloudflare frontend + Cloudflare Worker + Electron desktop agent. Governed by declarative PASS GOLD gates at every layer.

> **Correção de arquitetura (2026-07-10):** este README descrevia o Go safe core como se fosse o servidor principal do produto. Não é — `backend/server.js` (Node.js/Express) é o único processo que recebe HTTP e serve todas as rotas `/api/*`; `go-core` é um binário Go separado, invocado por `server.js` como subprocesso para operações específicas (scanner, patcher, validator, security), não um servidor autônomo. Ver `docs/VISION_CORE_BACKEND_SPEC.md` para o detalhe completo (parte da série de arquitetura em `docs/MASTER_SPEC.md`).

## What is Vision Core?

Vision Core is a supervised software mission engine. `backend/server.js` (Node.js/Express) is the real HTTP gateway — it receives the mission input, orchestrates LLM calls (Hermes), and invokes the Go safe core as a subprocess for specific safe operations (scanner → fileops → snapshot → patcher → validator → rollback → security → passsecure → passgold → memory). No promotion happens without a verified `pass_gold: true` receipt.

Key properties:
- **Declarative governance** — every release gate is a static contract (no runtime surprises)
- **REGRA ABSOLUTA** — `pass_gold_real_claimed`, `production_touched`, `deploy_allowed` are hard-false until explicit human GO
- **RTP chain** — 7-stage Real Truth Probe contract (RTP-0 through RTP-6) for supervised staging health probes
- **Software Factory** — 250+ governance modules covering release, patch, rollback, promotion, billing, security
- **Zero magic** — all evidence hashes are deterministic SHA-256; no `Date.now()` in hash material

---

## Architecture

```
vision-core/
├── backend/           Node.js V2.9.10 SaaS backend (Express, port 3000/8080)
│   │                  THE real HTTP server — every /api/* route lives here.
│   ├── server.js      Main server — auth, mission orchestration, self-healing
│   │                  config, CORS, PASS GOLD gate. Invokes go-core as a
│   │                  subprocess via resolveGoBinary() for safe-core ops.
│   └── scripts/       validate-syntax.js, self-healing-config.js, validate-passgold.js
│
├── go-core/           Go safe core V6.1 AEGIS — NOT a standalone server.
│   │                  A binary invoked by backend/server.js as a subprocess
│   │                  for scanning/patching/validating/security-checking a
│   │                  project. ~53 internal packages: ~16 are product-facing
│   │                  (scanner, patcher, validator, rollback, passgold,
│   │                  hermes...), the rest are an internal release-
│   │                  governance framework for Vision Core's own deploys
│   │                  (see "Duas Camadas" in docs/ARCHITECTURE.md).
│   ├── cmd/vision-core/main.go
│   └── internal/
│
├── frontend/          Cloudflare Pages — two coexisting frontends
│   ├── index.html     Legacy production entry (2700+ lines) — makes real
│   │                  fetch() calls to backend/server.js (auth, chat, etc.),
│   │                  contrary to what this README claimed before 2026-07-10
│   ├── vision-core-next.html   Parallel Next frontend, active development
│   └── assets/        vision-core-bundle.css/js (legacy) + vision-core-next-clean.css/js (Next)
│
├── worker/            Cloudflare Worker — edge proxy between frontends and backend/server.js
├── desktop-agent/     Electron — local agent shell (Vision Agent Local)
├── vc-secret-guard/   Rust — local secret-detection CLI, independent of go-core
│
├── tools/             Node.js governance modules (300+ .mjs files) — mostly
│   │                  the same internal release-governance framework as the
│   │                  non-product go-core packages above, not product code
│   ├── real-validation/    RV0–RV5 runtime smoke gates
│   └── tests/              Pure node:assert test suites (1730+ tests)
│
├── bin/               Compiled go-core binary (git-ignored)
├── setup.sh           Local setup script
├── deploy.sh          Deploy script for Vision Core's OWN release (--staging / --production)
└── bin/deploy-pages.sh  The script actually used day-to-day to publish the frontend to Cloudflare Pages
```

---

## Prerequisites

| Tool | Min version | Purpose |
|------|-------------|---------|
| Go | 1.22+ | Build go-core |
| Node.js | 20+ | Backend + toolchain |
| npm | 8+ | Backend deps |
| wrangler | latest | Frontend CF Pages deploy |
| eb CLI | latest | Backend AWS EB deploy |

---

## Quick Start

```bash
# Clone and setup (first time)
git clone https://github.com/Imadechumbo/vision-core.git
cd vision-core
./setup.sh
```

`setup.sh` will:
1. Check Go + Node.js deps
2. Build `bin/vision-core` from go-core (a helper binary, not the server — see below)
3. Create `backend/.env` with secure random `SESSION_SECRET` + `PROVIDER_VAULT_SECRET` (both required — `backend/server.js` fails closed and refuses to boot without them, see `docs/VISION_CORE_BACKEND_SPEC.md`) and a vestigial `JWT_SECRET` (kept for backward compatibility, never actually read by the backend)
4. Run `npm install` in backend/
5. Validate backend syntax + PASS GOLD
6. Smoke-test the backend health endpoint

---

## Running Locally

### Backend — the real server

```bash
cd backend
node server.js
# Server starts on PORT from .env (default 3000)
# Health: GET http://localhost:3000/api/health
# Status: GET http://localhost:3000/api/obsidian/status
#
# Requires SESSION_SECRET + PROVIDER_VAULT_SECRET in backend/.env (both
# generated by setup.sh) — the process exits immediately with a clear error
# if either is missing, the known-insecure public fallback, or under 32 bytes.
```

### go-core (CLI) — safe-core binary, invoked by the backend, not run standalone in normal use

```bash
# Self-test
bin/vision-core mission --root "." --input "self-test"

# Expected: pass_gold: true, evidence_receipt present
```

### Frontend

Open `frontend/index.html` directly in a browser, or serve via any static file server:

```bash
npx serve frontend/
```

**Correction (2026-07-10):** contrary to what this README claimed before, the legacy frontend is *not* backend-call-free — `frontend/index.html` loads `assets/vision-core-bundle.js`, which makes real `fetch()` calls to the backend (auth, chat, missions, etc.) via the Worker gateway URL baked into the bundle, not to whatever `npx serve` happens to be running locally. Serving `frontend/` locally lets you view the static markup/styling, but real API calls from it will hit the deployed backend, not a local one — there's no environment-switching mechanism in the legacy bundle. The parallel `frontend/vision-core-next.html` (Next) has the same property (fixed `API_BASE_URL`, ver `docs/VISION_CORE_NEXT_FRONTEND_SPEC.md`).

---

## Running Tests

```bash
# All tools tests (1730+ tests, via npm)
npm test

# Real-validation chain (RV0–RV5)
node tools/tests/real-validation/real-validation-0-runtime-readiness-audit.test.mjs
node tools/tests/real-validation/real-validation-1-prep-gate.test.mjs
node tools/tests/real-validation/real-validation-2-runtime-smoke-plan.test.mjs
node tools/tests/real-validation/real-validation-3-runtime-smoke-authorization-gate.test.mjs
node tools/tests/real-validation/real-validation-4-runtime-smoke-dry-run-gate.test.mjs
node tools/tests/real-validation/real-validation-5-runtime-smoke-execution-barrier.test.mjs

# RTP chain (RTP-0 through RTP-6)
node tools/tests/software-factory/software-factory-real-runtime-truth-probe-contract.test.mjs
node tools/tests/software-factory/software-factory-staging-probe-operator-signoff-contract.test.mjs

# go-core tests
cd go-core && go test ./... -v
```

---

## Deploying

```bash
# Staging (no confirmation required)
./deploy.sh --staging

# Production (requires explicit authorization phrase)
./deploy.sh --production
# → prompts: "PASS GOLD REAL AUTORIZADO"
```

`deploy.sh` enforces:
1. go-core PASS GOLD validation before any deploy
2. Backend syntax + PASS GOLD gate
3. Go test suite pass
4. Post-deploy health check with automatic rollback on failure (production)

---

## Production Gates

All flags are hard-false by contract until explicit human authorization:

| Flag | Value |
|------|-------|
| `pass_gold_real_claimed` | `false` always until human GO |
| `production_touched` | `false` always |
| `deploy_allowed` | `false` always |
| `release_allowed` | `false` always |
| `stable_promotion_allowed` | `false` always |
| `execution_performed` | `false` always |

---

## Version Roadmap

| Version | Status | Description |
|---------|--------|-------------|
| V4.4 | ✅ Merged | Legacy GOLD baseline (Node + Electron + CF) |
| V5.0–V5.6 | ✅ Merged | Go Safe Core + PASS GOLD engine |
| V6.0–V6.1 | ✅ Merged | AEGIS security layer + PASS SECURE |
| V7.0–V7.9 | ✅ Merged | GitHub flow + controlled PR automation |
| V15.0–V20.0 | ✅ Merged | Hermes intelligence + pipeline capstone |
| V21.0–V50.0 | ✅ Merged | Runtime governance + supervised release |
| V51.0–V200.0 | ✅ Merged | Full governance chain (sandbox, patch, tag, stable) |
| V285–V450 | ✅ Merged | SaaS hardening, enterprise security, unlock governance |
| V2.9.10 | ✅ Current | RTP chain (RTP-0 through RTP-6), software factory |
| V3.0.0 | 🔜 Planned | Real staging probe execution (post operator sign-off) |

---

## Key Contracts

| Module | Gate |
|--------|------|
| `software-factory-real-runtime-truth-probe-contract.mjs` | RTP-0: baseline readiness |
| `software-factory-local-runtime-probe-evidence-binder.mjs` | RTP-1: evidence binding |
| `software-factory-pass-gold-real-review-receipt.mjs` | RTP-2: PASS GOLD review |
| `software-factory-authorized-staging-backend-health-probe.mjs` | RTP-3: staging probe contract |
| `software-factory-authorized-staging-probe-executor-contract.mjs` | RTP-4: executor contract |
| `software-factory-staging-probe-evidence-receipt.mjs` | RTP-5: evidence receipt |
| `software-factory-staging-probe-operator-signoff-contract.mjs` | RTP-6: operator sign-off |

---

## Security

- No secrets in source code — `.env` is git-ignored
- `JWT_SECRET` generated via `crypto.randomBytes(32)` at setup
- Stripe keys are placeholders in dev; real keys in production `.env` only
- CORS hardened before all routes in backend
- `backend/.vision-memory/` and `.vision-snapshots/` are never modified by automation

---

*Vision Core V2.9.10 — PASS GOLD + PASS SECURE + REGRA ABSOLUTA*
