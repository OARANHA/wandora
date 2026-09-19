# ADR 0102 — Customer Owner First Invite Acceptance + First Password Validation V1

- Status: **Accepted validation — normal owner authentication proven / tenant still unlinked**
- Date: 2026-09-18
- Scope: validate consumption of the first real owner invite, first-password establishment, a fresh normal password grant, and the expected fail-closed Wandora bootstrap before any tenant provisioning or eligibility effect.

## REAL NOW

Canonical Git entering validation:

```text
main = a72398d6c6439d68c719974755abac8059ca0a72
open PRs = 0
ADR 0101 = first real invite applied / acceptance pending
```

The explicitly authorized target address remains intentionally omitted from Git.

## PROVEN EVIDENCE

Production Auth state after the recipient completed the invite flow:

```text
target Auth rows = 1
confirmed         = 1
password present  = 1
invite token rows = 0
```

The recipient then explicitly signed out and performed a normal login with e-mail + the password created during invite acceptance.

Read-only database evidence proved a new normal Auth session after invite confirmation:

```text
confirmed_at          = 2026-09-19 02:10:52 UTC
last_sign_in_at       = 2026-09-19 02:12:14 UTC
active_sessions       = 1
latest_session_created= 2026-09-19 02:12:14 UTC
latest_session_updated= 2026-09-19 02:12:14 UTC
```

The customer Web showed the canonical unlinked-account state after that normal login.

Current source proves this state can occur only after:

```text
signInWithPassword(...)
  -> Supabase password grant succeeds
  -> browser session is stored
  -> GET /api/v1/me with Bearer access token
  -> Core returns 403 for a valid-but-unlinked identity
  -> AuthProvider status = unlinked
  -> LoginPage/SessionGate render the account-not-linked message
```

Therefore the observed message is not an invalid-credential error. It is the intended Wandora authorization boundary after successful identity authentication.

## GAPS

The new Auth subject is deliberately not yet represented in Wandora business state:

```text
wandora identity rows for target = 0
membership rows for target       = 0
eligibility rows                 = 0
eligibility enabled              = 0
```

This is the exact expected pre-provisioning state.

## DECISION

Accept the first real customer-owner access path as proven through normal credential reuse.

The access contract now has end-to-end evidence for:

```text
real invite
-> invite consumed
-> first password established
-> invite token consumed
-> sign out
-> fresh password grant
-> valid authenticated browser session
-> /api/v1/me reached
-> fail-closed unlinked result before tenant provisioning
```

## SECOND ADVERSARIAL REVIEW

Rejected alternative interpretations:

- treating the unlinked message as a failed password grant;
- provisioning a tenant merely because the invite was consumed;
- creating a Wandora identity or membership directly to make the screen disappear;
- enabling customer-hire eligibility in the same step;
- bypassing the existing Private Tenant Provisioning V2 contract;
- using the invite session itself as proof of normal repeat login.

The later `last_sign_in_at` and fresh Auth session timestamp, together with the current Web code path, independently prove the normal password-login boundary.

## EXECUTION

This validation slice performed no production mutation.

The recipient interaction itself had already created the expected provider-owned authentication effects:

- consumed invite verification state;
- confirmed Auth user;
- established password;
- created a normal Auth session.

No Wandora tenant/business state was created by this validation.

## VALIDATION

Final business boundary remains:

```text
target Wandora identities = 0
target memberships        = 0
eligibility rows          = 0
eligibility enabled       = 0
```

The first real owner is authenticated but not yet authorized into any Wandora organization.

## RESULT

**Customer Owner First Invite Acceptance + First Password Validation V1 is complete and accepted.**

## NEXT EXECUTABLE SLICE

**Customer Owner First Real Tenant Provisioning Preflight V1**

Use the already-live `wandora_private.provision_beta_organization_v2(...)` capability. Do not use direct inserts and do not enable eligibility.

Before execution, freeze the exact real-company identity:

- organization display name;
- deterministic organization slug;
- owner display name;
- stable request key;
- runtime-resolved Auth subject;
- collision/idempotency/postcondition gates.

Tenant creation remains a separate reviewed effect.
