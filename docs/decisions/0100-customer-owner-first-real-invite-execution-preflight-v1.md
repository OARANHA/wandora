# ADR 0100 — Customer Owner First Real Invite Execution Preflight V1

- Status: **Accepted preflight — execution contract frozen / NO-GO until an explicitly authorized genuine new owner target exists**
- Date: 2026-09-18
- Scope: freeze the first real customer-owner Supabase Auth invite operation, its collision checks, ambiguity reconciliation and revocation boundary without sending invite/recovery/test mail, provisioning a tenant or enabling customer-hire eligibility.

## REAL NOW

Canonical repository state at preflight entry:

```text
main = 87353f790d01559ecb13c284eda828eb4a0078bb
open PRs = 0
ADR 0099 = accepted/live GoTrue SMTP activation
```

Observed production state:

```text
supabase-auth               = supabase/gotrue:v2.196.0 / healthy / restarts 0 / PID 1 UID 1000
wandora-web                 = wandora/web:owner-access-candidate-5f135e90 / healthy
wandora-core                = healthy
wandora-messaging-gateway   = healthy
wandora-paperclip           = healthy
supabase-db                 = healthy

GOTRUE_SMTP_HOST            = smtp.resend.com
GOTRUE_SMTP_PORT            = 587
GOTRUE_SMTP_USER            = resend
GOTRUE_SMTP_ADMIN_EMAIL     = acesso@notify.wandora.com.br
GOTRUE_SMTP_SENDER_NAME     = Wandora
GOTRUE_SMTP_PASS in Config.Env = false

GOTRUE_DISABLE_SIGNUP       = true
GOTRUE_MAILER_AUTOCONFIRM   = false
GOTRUE_SITE_URL             = https://app.wandora.com.br
GOTRUE_URI_ALLOW_LIST       includes https://app.wandora.com.br/**
```

Live database no-effect baseline:

```text
auth_users                  = 1
auth_confirmed              = 1
auth_invited                = 0
auth_unconfirmed_invited    = 0
auth.one_time_tokens        = 0
wandora_users               = 1
organizations               = 3
memberships                 = 3
eligibility_rows            = 0
eligibility_enabled         = 0
unfinished_hires            = 0
```

The existing Auth/Wandora owner is not a valid target for this slice. The three current organizations are historical/proof/legacy state and are not to be reused as the first genuine new-customer organization.

No previously authorized genuine new owner e-mail exists in the canonical repository or the project continuity evidence. The preflight therefore must not guess, scrape or select a person from contacts, mail or unrelated account history.

## PROVEN EVIDENCE

### Exact GoTrue v2.196.0 invite route

Pinned upstream source proves:

```text
POST /invite
middleware: requireAdminCredentials
handler: API.Invite
```

Source: `supabase/auth@v2.196.0/internal/api/api.go`.

The live API gateway path is therefore:

```text
POST https://supabase.wandora.com.br/auth/v1/invite
```

A read-only admin credential proof against the live gateway returned:

```text
GET /auth/v1/admin/users?page=1&per_page=1
HTTP 200
page users = 1
```

The service-role credential was loaded only from the protected Supabase environment and was not printed or persisted in a new artifact.

A deliberate unauthenticated invite-route probe returned `401` and left `auth.users` unchanged at 1. No invite handler effect or mail send occurred.

### Redirect contract

Pinned `utilities.GetReferrer` in GoTrue v2.196.0 accepts `redirect_to` only when valid against SITE_URL / URI allow-list. The live configuration accepts the canonical first-access route:

```text
https://app.wandora.com.br/accept-invite
```

The public Web routes are currently reachable:

```text
/login          = 200
/accept-invite  = 200
/recover-access = 200
```

### Invite transaction semantics

Pinned `internal/api/invite.go` proves:

1. a new e-mail creates the Auth user inside a DB transaction;
2. an already confirmed user is rejected as duplicate;
3. an existing unconfirmed user can be invited again;
4. `sendInvite` executes inside the same transaction.

Pinned `internal/api/mail.go` proves that `sendInvite` performs the external mail send before persisting `confirmation_sent_at`, `invited_at` and the one-time token. Therefore an SMTP acceptance can occur before the DB transaction ultimately commits.

This creates two distinct ambiguity classes that must be handled conservatively:

```text
A. HTTP response lost after DB commit
   -> invite may be fully applied
   -> retry would resend to an existing unconfirmed user

B. SMTP accepted but a later DB step/commit failed
   -> recipient may have received an unusable/dead invite
   -> auth user may be absent
   -> absence of DB state alone does NOT prove no external mail effect
```

## GAPS

The transactional delivery foundation and exact privileged route are ready.

The remaining execution gate is not technical infrastructure. It is business identity:

```text
AUTHORIZED_GENUINE_NEW_OWNER_TARGET = absent
```

The first real invite must target a person explicitly authorized by the operator/user to become the owner of a new real customer organization. No current Auth user, proof identity or legacy tenant may be substituted merely to advance the rollout.

A real delivery cannot be proven during this preflight because invite/recovery/test e-mail is explicitly forbidden.

## DECISION

The preflight is accepted as **NO-GO for invite execution until a genuine owner target is explicitly supplied**.

Once that target exists, the execution contract is exactly one privileged invite request:

```text
POST https://supabase.wandora.com.br/auth/v1/invite
  ?redirect_to=https%3A%2F%2Fapp.wandora.com.br%2Faccept-invite

Headers:
  apikey: <existing protected service-role credential>
  Authorization: Bearer <same existing protected service-role credential>
  Content-Type: application/json

Body:
  {"email":"<authorized owner e-mail>"}
```

No organization name, tenant ID, Paperclip ID, eligibility state or digital-employee metadata is included in the Auth invite.

The accepted lifecycle remains:

```text
explicitly authorized new real owner
  -> exactly one Supabase Auth invite
  -> /accept-invite
  -> first password
  -> normal password grant
  -> Private Tenant Provisioning V2
  -> /api/v1/me
```

Tenant provisioning and customer-hire eligibility remain separate later effects.

## EXECUTION PRECONDITIONS — FROZEN

Before the future POST:

1. receive the owner e-mail explicitly from the operator/user for this rollout;
2. keep it out of Git, ADRs and command history;
3. normalize only for collision comparison;
4. prove case-insensitive target count is zero in `auth.users`;
5. prove no corresponding Wandora user/membership exists;
6. capture protected pre-effect counts for Auth users, invited users and one-time tokens;
7. revalidate Auth health, Web `/accept-invite`, SMTP non-secret config and service-role admin read;
8. ensure eligibility is still zero unless a later accepted ADR intentionally changes it;
9. send the invite exactly once.

## RECONCILIATION — NO BLIND RETRY

### HTTP 200

Treat the invite request as applied only after read-back proves the returned/located Auth user is:

```text
target e-mail match
confirmed_at = null
invited_at != null
confirmation_sent_at != null
invite one-time token exists
```

Do not resend for cosmetic response differences.

### HTTP duplicate/conflict

Do not retry. Re-read Auth state. A confirmed account is a hard collision. An unconfirmed invited account is an existing invite state and must be reviewed rather than automatically re-sent.

### Timeout / connection reset / 5xx with uncertain request completion

Never retry automatically.

First reconcile the target in Auth:

```text
target exists + invited_at/confirmation_sent_at present
  -> classify as applied/possibly delivered
  -> no retry

target absent
  -> classify as externally ambiguous
  -> SMTP may have accepted mail before DB rollback
  -> inspect Resend delivery history/operator evidence before any retry
```

If provider evidence is unavailable or inconclusive, stop for human review. An uncertain external effect is not converted into a second e-mail automatically.

## REVOCATION / ROLLBACK BOUNDARY

E-mail delivery cannot be rolled back.

If an invite must be revoked before acceptance, the only accepted rollback candidate is the provider-native admin delete:

```text
DELETE /auth/v1/admin/users/:user_id
```

and only after proving all of the following:

```text
confirmed_at is null
last_sign_in_at is null
no Wandora user exists for the Auth identity
no membership/tenant was provisioned
no downstream Paperclip/binding/eligibility effect exists
```

Hard deletion invalidates the Auth-side invite state but cannot retract a message already delivered. If the invite has been accepted or any business state exists, automatic rollback is forbidden.

No rollback was executed by this preflight.

## SECOND ADVERSARIAL REVIEW

The review attempted to invalidate the decision by asking whether the first target could be:

- the existing Wandora owner;
- a current proof/legacy tenant owner;
- a synthetic alias created only to advance the rollout;
- a contact or e-mail discovered without explicit authorization;
- an unconfirmed Auth row created as a staging trick.

All are rejected. They would either reuse historical state, create a fake customer, or cause an external identity effect merely to satisfy the preflight.

The review also rejected:

- `/admin/generate_link type=invite` as the normal flow, because the accepted product contract is GoTrue-managed invite delivery;
- direct `auth.users` insertion/update;
- creating a Wandora recovery/invite table;
- putting the service-role key in Web/Core;
- retrying an uncertain invite;
- provisioning the tenant in the same invite effect.

## EXECUTION

This preflight performed only read-only/runtime proofs plus one unauthenticated fail-closed route probe.

It did **not**:

- send an invite;
- send recovery;
- send a test e-mail;
- create or modify an Auth user;
- create a one-time token;
- provision a tenant;
- create a Paperclip company/binding/employee;
- enable eligibility;
- enable Human Send;
- enable Gateway outbound.

## VALIDATION

Final no-effect state remains:

```text
auth_users                  = 1
auth_invited                = 0
auth_unconfirmed_invited    = 0
auth.one_time_tokens        = 0
wandora_users               = 1
organizations               = 3
eligibility_rows            = 0
eligibility_enabled         = 0
unfinished_hires            = 0

Customer Digital-Employee Hire = ON
Human Send                     = OFF
Gateway outbound               = OFF
```

SMTP remains live on Resend and Auth remains healthy with zero restarts.

## RESULT

**Customer Owner First Real Invite Execution Preflight V1 is accepted as a controlled NO-GO.**

The technical invite path, preconditions, reconciliation and revocation boundary are frozen. The only blocker is the absence of an explicitly authorized genuine new owner target.

## NEXT EXECUTABLE SLICE

**Customer Owner First Real Invite Execution V1 — BLOCKED pending authorized genuine owner target**

The next execution may begin only after the operator/user supplies the intended new owner's e-mail explicitly. That execution will send exactly one invite and validate Auth/provider outcome. It must still not provision the tenant or enable eligibility in the same slice.
