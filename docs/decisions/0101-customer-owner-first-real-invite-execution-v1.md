# ADR 0101 — Customer Owner First Real Invite Execution V1

- Status: **Accepted execution — exactly one real owner invite applied / acceptance pending**
- Date: 2026-09-18
- Scope: execute exactly one Supabase Auth invite for the explicitly authorized genuine new owner target under ADR 0100, without provisioning a tenant or enabling customer-hire eligibility.

## REAL NOW

Entry state:

```text
main = 5e4c5607cdb323e6b020e14a3cb8dffe90577c70
open PRs = 0
ADR 0100 = accepted controlled preflight
```

Live services were healthy. GoTrue remained `supabase/gotrue:v2.196.0`, healthy, zero restarts, with Resend SMTP active and `https://app.wandora.com.br/accept-invite` allowed.

Pre-effect baseline:

```text
auth_users          = 1
auth_invited        = 0
one_time_tokens     = 0
wandora_users       = 1
organizations       = 3
eligibility_enabled = 0
unfinished_hires    = 0
```

The operator/user explicitly supplied and authorized one genuine new owner e-mail for this rollout. The address itself is intentionally omitted from Git and documentation.

## PROVEN EVIDENCE

The target had zero case-insensitive collision in `auth.users`.

The first attempted identity-integrity guard incorrectly assumed `wandora.users.id == auth.users.id` and blocked before mutation. Investigation proved the real accepted mapping is `wandora.user_identities(provider='supabase').provider_subject == auth.users.id::text`; the existing identity map was 1/1 matched. No invite was sent during that false-positive check.

After correcting the guard, the target precheck passed:

```text
target Auth rows = 0
Supabase identity mappings = 1
mappings matching Auth subject = 1
```

## DECISION

Execute exactly one privileged provider-native invite:

```text
POST /auth/v1/invite
redirect_to=https://app.wandora.com.br/accept-invite
```

using the already-protected service-role credential only from host custody.

No retry is permitted unless ADR 0100 reconciliation proves a retry safe.

## SECOND ADVERSARIAL REVIEW

Immediately before the external effect:

- target collision remained zero;
- the identity mapping assumption was corrected and proven;
- Auth/Web/DB remained healthy;
- tenant provisioning was intentionally excluded;
- eligibility remained zero;
- no invite/recovery/test mail had previously been sent to this target in this execution.

The review accepted one and only one invite effect.

## EXECUTION

Exactly one invite request was issued.

Result:

```text
curl rc = 0
HTTP = 200
target Auth rows = 1
invited_at present = 1
confirmation_sent_at present = 1
confirmed = 0
signed in = 0
target one-time tokens = 1
reconciliation = APPLIED
```

No retry occurred.

## VALIDATION

Post-effect state:

```text
auth_users               = 2
auth_invited             = 1
auth_unconfirmed_invited = 1
one_time_tokens          = 1

wandora_users            = 1
organizations            = 3
memberships              = 3

eligibility_rows         = 0
eligibility_enabled      = 0
unfinished_hires         = 0
```

Auth retained the same container identity, remained healthy and had zero restarts. Web, Core, Gateway, Paperclip and DB remained healthy.

No tenant, membership, Paperclip company/binding/employee, customer-hire eligibility or outbound messaging effect was created.

## RESULT

**Customer Owner First Real Invite Execution V1 is accepted and applied.**

The first genuine new owner now has one pending Supabase Auth invite. Delivery/acceptance must be completed by the recipient through the received Wandora e-mail and `/accept-invite`.

## NEXT EXECUTABLE SLICE

**Customer Owner First Invite Acceptance + First Password Validation V1**

The recipient must open the Wandora invite link and define the first password. Validation must prove:

```text
invite consumed
-> Auth account confirmed
-> first password established
-> normal password grant succeeds
-> /api/v1/me works under normal user session
```

Do not provision the tenant or enable eligibility until that owner-access validation is complete.
