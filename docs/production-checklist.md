# Production Checklist

**Phase:** DOCS-PRODUCTION-CHECKLIST  
**Date:** 2026-05-28  
**Status:** CHECKLIST ONLY — no implementation, no authorization granted

---

## Authority Flags (all false)

```yaml
deploy_allowed:                false
release_allowed:               false
production_touched:            false
pass_gold_real_claimed:        false
tag_created:                   false
stable_promoted:               false
backend_calls_enabled:         false
secrets_accessed:              false
auth_enabled:                  false
billing_enabled:               false
```

---

## Gate Summary

| Gate                              | Required | Status          |
|-----------------------------------|----------|-----------------|
| Backend health smoke              | YES      | NOT VERIFIED    |
| Frontend/backend integration proof| YES      | NOT VERIFIED    |
| Auth decision                     | YES      | DECISION ONLY   |
| API connector decision            | YES      | DECISION ONLY   |
| Secrets / vault provisioned       | YES      | NOT PROVISIONED |
| Rollback plan approved            | YES      | NOT APPROVED    |
| Manual final QA completed         | YES      | NOT COMPLETED   |
| Production deploy                 | BLOCKED  | BLOCKED         |
| Release / tag / stable            | BLOCKED  | BLOCKED         |
| PASS GOLD REAL                    | BLOCKED  | NOT CLAIMED     |

All gates must be PASSED before any production action is taken.  
No gate may be bypassed. No partial state is acceptable.

---

## Required Gates (detailed)

### Gate 1 — Backend Health Smoke

Before any production promotion, the backend service must pass a full health smoke:

```
BACKEND HEALTH SMOKE (required)

  [ ] Backend service is deployed and reachable
  [ ] All health endpoints return 200 OK
  [ ] Database connectivity confirmed
  [ ] Cache layer confirmed
  [ ] Background worker confirmed (if applicable)
  [ ] No error spikes in logs at smoke time
  [ ] Explicit human sign-off on smoke result
```

**Current status:** NOT VERIFIED. No backend is deployed. No health endpoint is reachable.

---

### Gate 2 — Frontend / Backend Integration Proof

Full end-to-end integration between the frontend cockpit and backend service must be proved before production:

```
FRONTEND / BACKEND INTEGRATION PROOF (required)

  [ ] Frontend successfully calls authenticated backend API
  [ ] All data flows verified: create, read, update (if applicable)
  [ ] Error handling and fallback states verified
  [ ] Integration test suite passes with zero failures
  [ ] Integration evidence published to audit ledger
  [ ] Explicit human sign-off on integration proof
```

**Current status:** NOT VERIFIED. Frontend is local-only. No backend integration is active.

---

### Gate 3 — Auth Decision

Auth must be formally decided and all prerequisites met before production access:

```
AUTH GATE (required)

  [ ] docs/auth-saas-decision.md reviewed and signed off
  [ ] Secrets vault provisioned (see Gate 5)
  [ ] Backend auth module implemented and tested
  [ ] Auth security review / penetration test passed
  [ ] Explicit human sign-off on auth scope

Reference: docs/auth-saas-decision.md
```

**Current status:** DECISION ONLY. See `docs/auth-saas-decision.md`. Auth is NOT enabled.  
All `auth_enabled` flags remain `false`.

---

### Gate 4 — API Connector Decision

API connectors must be formally decided and all prerequisites met before any connector is activated:

```
API CONNECTOR GATE (required)

  [ ] docs/api-connectors-decision.md reviewed and signed off
  [ ] Secrets vault provisioned (see Gate 5)
  [ ] Backend connector proxy implemented
  [ ] Audit ledger implemented (append-only, signed)
  [ ] Connector sandbox provisioned and tested
  [ ] Explicit human sign-off on connector scope

Reference: docs/api-connectors-decision.md
```

**Current status:** DECISION ONLY. See `docs/api-connectors-decision.md`. No connector is active.  
All `api_connectors_enabled` flags remain `false`.

---

### Gate 5 — Secrets / Vault

No auth, connector, billing, or OAuth capability may be activated without a provisioned secrets vault:

```
SECRETS / VAULT GATE (required)

  [ ] Vault provider selected (HashiCorp Vault, AWS Secrets Manager, or equivalent)
  [ ] Vault provisioned in target environment
  [ ] Dynamic secret rotation configured
  [ ] Per-service least-privilege access policies defined
  [ ] Infrastructure team sign-off
  [ ] Security team sign-off
  [ ] Written authorization record created
```

**Current status:** NOT PROVISIONED. No vault is provisioned. No secrets are stored, read, or accessible.  
No `.env` files are read at runtime. No credentials are embedded in frontend code.

---

### Gate 6 — Rollback Plan

A tested rollback plan is required before any production deployment:

```
ROLLBACK GATE (required)

  [ ] Rollback procedure documented (step-by-step, named operator)
  [ ] Rollback tested in staging environment
  [ ] Rollback target artifact identified (previous tag or build)
  [ ] Rollback time SLA defined (e.g., < 15 minutes)
  [ ] Circuit breaker / feature flag kill-switch confirmed
  [ ] Explicit human sign-off on rollback plan
```

**Current status:** NOT APPROVED. No rollback plan exists. No staging environment is provisioned.

---

### Gate 7 — Manual Final QA

Human-operated QA is required before any production promotion:

```
MANUAL FINAL QA GATE (required)

  [ ] Full functional walkthrough by named QA operator
  [ ] All critical user flows verified manually
  [ ] No P0 or P1 defects open
  [ ] Accessibility review completed
  [ ] Browser compatibility verified
  [ ] Mobile/responsive review completed
  [ ] QA sign-off document created with operator identity
  [ ] Explicit human sign-off on QA result
```

**Current status:** NOT COMPLETED. No QA has been performed on the production candidate.

---

## Production Deploy — BLOCKED

```
PRODUCTION DEPLOY (permanently blocked until all gates pass)

  deploy_allowed: false

  Unblock requires:
    - All 7 gates above: PASSED
    - Final infrastructure review: APPROVED
    - Security audit: COMPLETE
    - Explicit human PASS GOLD REAL authority granted
    - Written production release authorization created
```

No deploy action has been taken. No production environment has been touched.

---

## Release / Tag / Stable — BLOCKED

```
RELEASE / TAG / STABLE (permanently blocked until all gates pass)

  release_allowed:  false
  tag_created:      false
  stable_promoted:  false

  Unblock requires:
    - All 7 gates above: PASSED
    - Production deploy: COMPLETE AND VERIFIED
    - Post-deploy smoke: PASSED
    - Explicit human release authority granted
```

No release tag has been created. No stable promotion has occurred.

---

## PASS GOLD REAL — NOT CLAIMED

```
PASS GOLD REAL

  pass_gold_real_claimed: false

  Not claimed. May not be claimed by this document.
  May not be claimed by any automated process.
  May only be granted by explicit human authority after:
    - All 7 gates: PASSED
    - Production deploy: COMPLETE AND VERIFIED
    - Post-deploy smoke: PASSED
    - Release tag: CREATED AND VERIFIED
    - Security and compliance review: SIGNED OFF
```

PASS GOLD REAL has not been claimed and is not granted by this checklist.

---

## Safety Invariants

- This document is documentation only. It does not grant any authority.
- No code change accompanies this document.
- No backend, auth, connector, billing, vault, or secrets capability is activated.
- All authority flags remain `false` in all runtime modules.
- Production has not been touched.
- No release, tag, or stable promotion has occurred.
- PASS GOLD REAL is not claimed and may not be claimed by this document.
- All gates must be independently verified and human-signed before any production action.

---

*Document scope: `docs/` only. No implementation. No authority granted.*
