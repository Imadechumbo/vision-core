# Vision Core V2.9.10

> **REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable.**

Full-stack AI mission execution platform. Go safe core + Node.js backend + Cloudflare frontend + Cloudflare Worker + Electron desktop agent. Governed by declarative PASS GOLD gates at every layer.

---

## What is Vision Core?

Vision Core is a supervised software mission engine. It accepts natural-language mission inputs, runs them through a multi-stage Go safe core (scanner → hermes → fileops → snapshot → patcher → validator → rollback → security → passsecure → passgold → memory), and produces a PASS GOLD evidence receipt. No promotion happens without a verified `pass_gold: true` receipt.

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
├── go-core/           Go safe core V6.1 AEGIS — mission engine, PASS GOLD, security
│   ├── cmd/vision-core/main.go
│   └── internal/      50+ packages: scanner, patcher, validator, rollback, passgold, hermes ...
│
├── backend/           Node.js V2.9.10 SaaS backend (Express, port 3000/8080)
│   ├── server.js      Main server — self-healing config, CORS, PASS GOLD gate
│   └── scripts/       validate-syntax.js, self-healing-config.js, validate-passgold.js
│
├── frontend/          Cloudflare Pages — static UI (no backend fetch calls by design)
│   ├── index.html     Single HTML entry (2700+ lines)
│   └── assets/        vision-core-bundle.css + vision-core-bundle.js (bundled)
│
├── worker/            Cloudflare Worker — edge proxy + auth
├── desktop-agent/     Electron — local agent shell
│
├── tools/             Node.js governance modules (300+ .mjs files)
│   ├── software-factory/   RTP chain + release contracts
│   ├── real-validation/    RV0–RV5 runtime smoke gates
│   └── tests/              Pure node:assert test suites (1730+ tests)
│
├── bin/               Compiled go-core binary (git-ignored)
├── setup.sh           Local setup script
└── deploy.sh          Deploy script (--staging / --production)
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
2. Build `bin/vision-core` from go-core
3. Create `backend/.env` with a secure random JWT_SECRET
4. Run `npm install` in backend/
5. Validate backend syntax + PASS GOLD
6. Smoke-test the backend health endpoint

---

## Running Locally

### go-core (CLI)

```bash
# Self-test
bin/vision-core mission --root "." --input "self-test"

# Expected: pass_gold: true, evidence_receipt present
```

### Backend

```bash
cd backend
node server.js
# Server starts on PORT from .env (default 3000)
# Health: GET http://localhost:3000/api/health
# Status: GET http://localhost:3000/api/obsidian/status
```

### Frontend

Open `frontend/index.html` directly in a browser, or serve via any static file server:

```bash
npx serve frontend/
```

The frontend is a local-only UI — all state is in-memory. No backend calls by design.

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
