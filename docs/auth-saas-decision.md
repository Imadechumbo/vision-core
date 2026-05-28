# Auth / SaaS Decision Document

**Phase:** DOCS-AUTH-SAAS-DECISION  
**Date:** 2026-05-28  
**Status:** DECISION ONLY — no implementation

---

## Authority Flags (all false)

```yaml
auth_enabled:                  false
saas_signup_enabled:           false
oauth_enabled:                 false
billing_enabled:               false
production_touched:            false
pass_gold_real_claimed:        false
deploy_allowed:                false
release_allowed:               false
secrets_accessed:              false
backend_calls_enabled:         false
```

---

## Current Status

| Capability           | Status          | Notes                                           |
|----------------------|-----------------|-------------------------------------------------|
| Auth (JWT / session) | NOT ENABLED     | No auth code active. Requires backend + vault.  |
| SaaS signup flow     | ROADMAP LOCKED  | UI cards are display-only. No registration.     |
| OAuth (Google etc.)  | NOT ENABLED     | No OAuth provider configured or called.         |
| Billing (Stripe etc.)| NOT ENABLED     | No billing provider connected or initialized.   |
| Secrets / Vault      | REQUIRED        | Must be provisioned before any activation.      |
| Backend integration  | REQUIRED        | No backend connected. All local preview only.   |
| Production touch     | NO              | Zero production writes or reads performed.      |
| PASS GOLD REAL       | NOT CLAIMED     | Not claimed. No real execution verified.        |

---

## Why Each Capability Is Blocked

### Auth
Auth requires:
- A running backend service with session/token management
- A secrets vault for signing keys
- Explicit human authorization phase

Activating auth without those prerequisites creates unauthenticated state mutation risk.

### SaaS Signup
SaaS signup requires:
- Auth to be active (dependency above)
- A connected billing provider
- A customer record store (database)
- Compliance audit trail

Current frontend UI cards are roadmap placeholders only.

### OAuth
OAuth requires:
- Backend OAuth callback endpoint
- Registered OAuth app credentials in secrets vault
- Auth to be active

No OAuth provider has been registered or configured.

### Billing
Billing requires:
- A connected billing provider (Stripe or equivalent)
- A backend service to handle webhooks and customer lifecycle
- Auth to be active
- Secrets vault for API keys

Billing is not connected. No keys have been accessed or stored.

### Secrets / Vault
Secrets vault must be provisioned before any auth, OAuth, or billing activation.
Vault must be audited and approved in a dedicated infrastructure phase.

### Backend Integration
All current frontend controls are local-only and non-operational.
Backend integration requires a separate backend deployment phase with explicit human approval.

---

## Recommended Safe Activation Path (Future)

The following sequence is required before any capability above may be activated.
Each step requires explicit human authorization before proceeding to the next.

```
STEP 1 — Infrastructure Phase
  [ ] Provision secrets vault (HashiCorp Vault or equivalent)
  [ ] Provision backend service (dedicated deployment phase)
  [ ] Obtain explicit human sign-off on infrastructure scope

STEP 2 — Auth Phase
  [ ] Implement backend auth module (JWT or session)
  [ ] Wire secrets vault for signing key storage
  [ ] Obtain explicit human sign-off on auth scope
  [ ] Run security review / penetration test

STEP 3 — OAuth Phase (optional, after Auth)
  [ ] Register OAuth app with chosen provider
  [ ] Store OAuth client credentials in vault
  [ ] Implement backend callback endpoint
  [ ] Obtain explicit human sign-off on OAuth scope

STEP 4 — Billing Phase (after Auth)
  [ ] Register billing provider account
  [ ] Store billing API keys in vault
  [ ] Implement backend billing webhook handler
  [ ] Obtain explicit human sign-off on billing scope

STEP 5 — SaaS Signup Phase (after Auth + Billing)
  [ ] Connect signup flow to auth + billing
  [ ] Provision customer database
  [ ] Compliance audit trail review
  [ ] Obtain explicit human sign-off on SaaS scope

STEP 6 — Production Release Gate
  [ ] Full integration test suite passing
  [ ] Security audit complete
  [ ] Human PASS GOLD REAL authority granted explicitly
  [ ] Deploy to production under supervised release
```

---

## Safety Invariants

- This document is documentation only. It does not grant any authority.
- No code change accompanies this document.
- No backend, auth, OAuth, billing, or secrets capability is activated.
- All authority flags remain `false` in all runtime modules.
- PASS GOLD REAL is not claimed and may not be claimed by this document.
- Production has not been touched.
- Activation of any capability above requires a dedicated phase with explicit human authorization.

---

*Document scope: `docs/` only. No implementation. No authority granted.*
