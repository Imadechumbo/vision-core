# API Connector Decision Document

**Phase:** DOCS-API-CONNECTOR-DECISION  
**Date:** 2026-05-28  
**Status:** DECISION ONLY — no implementation

---

## Authority Flags (all false)

```yaml
api_connectors_enabled:        false
api_key_storage_enabled:       false
secrets_access_enabled:        false
network_calls_enabled:         false
connector_sandbox_active:      false
audit_ledger_written:          false
production_touched:            false
pass_gold_real_claimed:        false
deploy_allowed:                false
```

---

## Current Status

| Capability              | Status         | Notes                                                     |
|-------------------------|----------------|-----------------------------------------------------------|
| API Connectors          | ROADMAP ONLY   | Visible as locked UI cards. No connector is active.       |
| API Key Storage         | NOT ENABLED    | No key accepted, stored, or read.                         |
| Secrets Access          | NOT ENABLED    | No vault accessed. No secrets read or printed.            |
| Connector Sandbox       | NOT ACTIVE     | No sandbox environment provisioned.                       |
| Audit Ledger            | NOT WRITTEN    | No ledger entry created. Ledger is a future requirement.  |
| Network Calls           | BLOCKED        | All outbound network calls are blocked in this version.   |
| Production Touch        | NO             | Zero production reads or writes performed.                |
| PASS GOLD REAL          | NOT CLAIMED    | Not claimed. No real execution verified.                  |

---

## Why Connectors Are Blocked

### API Connectors
Connectors require:
- A provisioned secrets vault for API key storage
- A backend service to proxy and audit connector requests
- An isolated connector sandbox for safe testing
- An audit ledger for all connector invocations
- Explicit human authorization for each connector

Current UI connector cards are roadmap placeholders only. No request is sent.

### API Key Storage
API keys must never be stored in frontend state, localStorage, or sessionStorage.
Key storage requires:
- A dedicated secrets vault (HashiCorp Vault or equivalent)
- Backend key management APIs
- Explicit human authorization per key

No key storage mechanism is implemented or active.

### Secrets Access
Secrets are not accessed in any form:
- No `.env` files are read at runtime
- No secrets are printed or logged
- No vault API is called
- No credentials are embedded in frontend code

### Connector Sandbox
A sandbox is required before any connector can run in any environment:
- Isolated network environment
- Request/response logging
- Rate limiting
- Circuit breaker
- Human approval for sandbox promotion to production

No sandbox is provisioned.

### Audit Ledger
Every connector invocation must be recorded in an immutable audit ledger:
- Timestamp, caller identity, connector ID, request hash, response status
- Ledger must be append-only with no delete capability
- Ledger review required before production promotion

No ledger is implemented or active.

---

## Required Vault Strategy

Before any connector activation, a vault strategy must be approved:

```
VAULT STRATEGY (required before activation)

1. Provider selection:
   - HashiCorp Vault, AWS Secrets Manager, or equivalent
   - Must support dynamic secret rotation
   - Must support per-connector access policies

2. Key lifecycle:
   - Key creation: human-authorized only
   - Key rotation: automated + audited
   - Key revocation: immediate on security event

3. Access control:
   - Backend service identity required (no frontend direct access)
   - Per-connector least-privilege policies
   - Audit log for all key access events

4. Approval gate:
   - Infrastructure team sign-off
   - Security team sign-off
   - Written authorization record
```

---

## Required Connector Sandbox

```
SANDBOX REQUIREMENTS (required before any connector test run)

- Isolated network zone (no production data access)
- Mock external API endpoints for all connectors
- Request/response logging (immutable)
- Rate limiting per connector
- Timeout and circuit breaker per connector
- Human approval required to promote connector from sandbox to staging
- Human approval required to promote from staging to production
```

---

## Required Audit Ledger

```
AUDIT LEDGER REQUIREMENTS (required before any connector invocation)

Fields per entry:
  timestamp:        ISO 8601 UTC
  connector_id:     string
  caller_identity:  string (authenticated service identity)
  request_hash:     SHA-256 of sanitized request payload
  response_status:  HTTP status or error code
  environment:      sandbox | staging | production
  authorized_by:    human operator identity

Properties:
  - Append-only (no update, no delete)
  - Signed entries (tamper-evident)
  - Replicated to secondary storage
  - Review required before each production promotion
```

---

## Recommended Safe Activation Path (Future)

```
STEP 1 — Vault Phase
  [ ] Select and provision secrets vault
  [ ] Define per-connector access policies
  [ ] Obtain explicit human sign-off on vault scope

STEP 2 — Backend Connector Proxy Phase
  [ ] Implement backend connector proxy service
  [ ] Wire vault for API key retrieval (no frontend key access)
  [ ] Implement audit ledger (append-only, signed)
  [ ] Obtain explicit human sign-off on backend scope

STEP 3 — Sandbox Phase
  [ ] Provision isolated connector sandbox
  [ ] Implement mock external endpoints
  [ ] Run each connector in sandbox with full audit logging
  [ ] Obtain explicit human sign-off on sandbox results

STEP 4 — Staging Phase
  [ ] Promote sandbox-approved connectors to staging
  [ ] Run integration tests with audit ledger review
  [ ] Security review of connector traffic
  [ ] Obtain explicit human sign-off on staging results

STEP 5 — Production Activation Gate
  [ ] Full audit ledger review complete
  [ ] Security team sign-off
  [ ] Human PASS GOLD REAL authority granted explicitly
  [ ] Deploy connector proxy under supervised release
```

---

## Safety Invariants

- This document is documentation only. It does not grant any authority.
- No code change accompanies this document.
- No connector, network call, key storage, or secrets access is activated.
- All authority flags remain `false` in all runtime modules.
- PASS GOLD REAL is not claimed and may not be claimed by this document.
- Production has not been touched.
- Activation of any connector requires vault, sandbox, audit ledger, and explicit human authorization per the path above.

---

*Document scope: `docs/` only. No implementation. No authority granted.*
