# ADR 0089 — Customer Owner Interrupted Invite Recovery Contract Implementation V1

Status: **Accepted / implemented in Web code + independent proof; not deployed**

Date: 2026-09-18

## Context

ADR 0088 selected provider-native Supabase Auth recovery for the interrupted-invite case:

```text
POST /auth/v1/recover
  -> provider recovery e-mail/link
  -> Wandora /recover-access
  -> strict type=recovery session
  -> authenticated password update
  -> password grant reconciliation
  -> normal /api/v1/me bootstrap
```

This implementation slice was explicitly bounded to code/CI only. It must not deploy Web/Auth/Core, send a real invite or recovery, create an Auth user, provision a tenant, create provider wiring or enable tenant eligibility.

Live CAPTCHA remains disabled, so anti-abuse review is still an activation gate before any real recovery request.

## REAL NOW / proven entry state

Canonical entry point:

```text
main = 4438643e319afd2abab41ab5ddd1202ba039dadf
ADR 0088 = accepted preflight
recovery implementation = absent
Customer Digital-Employee Hire = ON
eligibility rows = 0
Human Send = OFF
Gateway outbound = OFF
```

Observed live containers remained healthy. No runtime mutation was required for this slice.

## Capability authority / reuse gate

Human credential recovery belongs to Supabase Auth. Wandora owns only the browser journey and safe transition into the existing Wandora session/bootstrap contract.

Rejected as unnecessary duplication:

- Wandora recovery-token table;
- generic Core Auth-recovery proxy;
- Auth admin/service credential in Web/Core;
- Wandora-generated temporary password;
- `localStorage` persistence for recovery credentials.

## Decision

Implement one public Web route, `/recover-access`, with two states:

1. no staged recovery session -> neutral recovery request form;
2. valid staged `type=recovery` session -> new-password form.

The browser calls public provider-native `POST /auth/v1/recover` directly with the existing publishable key and:

```text
redirect_to=https://app.wandora.com.br/recover-access
```

Recovery credentials are staged only under:

```text
wandora.auth.recovery.v1
```

using `sessionStorage` plus same-page ephemeral fallback. They never share the invite or normal-session key.

Invite and recovery both reuse one shared authenticated password finalizer:

```text
GET /auth/v1/user
  -> PUT /auth/v1/user
  -> password grant with same e-mail + chosen password
  -> only then normal Wandora session/bootstrap
```

## Second adversarial review

The review found a real collision in the existing pre-render dispatcher: the invite handler treated every Supabase fragment that was not a valid invite as unsupported and stripped it. Adding a recovery handler after it would therefore lose a valid `type=recovery` callback before recovery could read it.

The implementation was revised so:

- invite explicitly defers `type=recovery` without touching URL/history/stage;
- recovery explicitly defers `type=invite`;
- unsupported provider flows still fail closed and have their URL credentials removed;
- both accepted flows are staged before React renders.

Three additional shortcuts were rejected:

- accepting any Supabase fragment instead of exact `type=recovery`;
- promoting the recovery session before password-grant reconciliation;
- exposing whether the submitted e-mail exists from the recovery-request UX.

## Implementation

PR #137 adds/changes only `apps/web`:

- `src/recoveryAccess.ts` — strict recovery-fragment parser/stager;
- `src/pages/RecoveryAccessPage.tsx` — neutral request + reset journey;
- `src/auth.ts` — public recovery request plus shared password finalizer;
- `src/main.tsx` — pre-render invite/recovery staging;
- `src/router.tsx` — public `/recover-access`;
- login + interrupted-invite entry points to recovery;
- `scripts/verify-recovery-access.mjs`;
- existing invite verifier updated to prove dispatcher separation.

No Core, SQL migration, runtime manifest, provider configuration or production secret changes are part of the implementation.

## Validation

GitHub-hosted workflows for the implementation head failed before receiving a runner:

```text
Web CI #305                = failure / steps=null / no runner execution
Core CI #368               = failure / steps=null / no runner execution
Platform Admin CI #230     = failure / steps=null / no runner execution
Messaging Gateway CI #337 = failure / steps=null / no runner execution
```

These are **not** treated as green checks.

The already-established infrastructure exception was therefore exercised with an independent reconstruction of the exact Web branch on the authorized Wandora VPS, using the real pinned Dockerfile and a synthetic publishable key only.

Independent Docker proof:

```text
Node = 22.23.2 pinned Dockerfile
TypeScript strict = green
WANDORA_WEB_OWNER_INVITE_ACCEPTANCE_V1_OK
WANDORA_WEB_FIRST_PASSWORD_CONTRACT_V1_OK
WANDORA_WEB_OWNER_INTERRUPTED_INVITE_RECOVERY_V1_OK
WANDORA_WEB_SHARED_PASSWORD_FINALIZATION_V1_OK
WANDORA_WEB_DIGITAL_EMPLOYEE_HIRE_BRIDGE_V1_OK
WANDORA_WEB_CUSTOMER_HIRE_BROWSER_IDEMPOTENCY_V1_OK
WANDORA_WEB_CUSTOMER_HIRE_TENANT_AVAILABILITY_V1_OK
Vite production build = green
proof image manifest list = sha256:919ecdb4073434ef53a36d329ab51bf48c489f7388fe34904f8e444a090769dc
```

Disposable route smoke with an isolated echo Core:

```text
/healthz = 200
/recover-access = 200
/accept-invite = 200
/api/v1/not-reviewed = 404
WANDORA_OWNER_RECOVERY_ROUTE_SMOKE_OK
```

The proof Web/Core containers and proof Docker network were removed after the smoke.

## Explicit non-effects

This slice does **not**:

- deploy the new Web;
- call real `POST /recover`;
- generate or send recovery/invite e-mail or token;
- create or mutate an Auth user;
- provision a tenant;
- create Paperclip/provider wiring;
- create or enable eligibility;
- enable Human Send or Gateway outbound;
- weaken public-signup policy;
- add Auth admin/service credentials to browser/Core.

## Residual activation gate

The recovery implementation is ready for candidate/activation review but is **not live**.

Before the first real recovery request, a separate preflight must resolve the ADR 0088 abuse-protection gate, including provider-native CAPTCHA and/or compatible edge protection, and prove that the exact Web candidate can be promoted without widening unrelated public or effectful surfaces.

## Next executable slice

**Customer Owner Invite + Recovery Production Activation Preflight V1**

The preflight remains no-effect: no deploy, no real invite/recovery, no tenant provisioning and no eligibility enablement. It must verify abuse protection, redirect/origin configuration, exact Web candidate provenance, rollback and post-deploy checks before any activation execution is authorized.
