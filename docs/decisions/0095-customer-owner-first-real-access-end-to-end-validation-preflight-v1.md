# ADR 0095 — Customer Owner First Real Access End-to-End Validation Preflight V1

- Status: **Accepted preflight — blocked before first real invite / no external effect**
- Date: 2026-09-18
- Scope: freeze the first controlled real owner-access proof without sending an invite or recovery and without creating customer/provider/eligibility state

## REAL NOW

Canonical entry state:

```text
main = bdf5ee0d5b5c6e1f9f2722a062aec25f5bf97c3f
open PRs = 0
ADR 0093 = recovery edge anti-abuse live
ADR 0094 = owner invite + recovery Web live
```

Live runtime:

```text
Web     = wandora/web:owner-access-candidate-5f135e90 / healthy
Core    = wandora/core:organization-adapter-candidate-af542864d267 / healthy
Auth    = supabase/gotrue:v2.196.0 / healthy
Gateway = wandora/messaging-gateway:origin-fix-94cfb4de / healthy

Customer Digital-Employee Hire = ON
Human Send = OFF
Gateway outbound = OFF
```

Read-only durable state:

```text
Auth users = 1
Wandora users = 1
active organizations = 3
active memberships = 3
eligibility rows = 0
enabled eligibility rows = 0
unfinished hire operations = 0
recovery_sent rows = 0
recovery_token rows = 0
Auth one-time tokens = 0
```

The three active organizations remain non-customer proof/legacy contexts:

- Empresa Exemplo — one existing employee;
- Wandora Customer Hire Canary — one completed catalog hire;
- Wandora Internal Supervised Proof — internal supervised proof state.

None is selected or repurposed as the first real customer-access target.

## PROVEN EVIDENCE — WEB / EDGE

Independent external checks from the authorized 28server:

```text
/login = 200
/accept-invite = 200
/recover-access = 200
/api/v1/me unauthenticated = 401
OPTIONS /auth/v1/recover = 200
```

Current Cloudflare read-back:

```text
rule count = 1
target ref = wandora_owner_recovery_burst_guard_v1
action = block
expression = http.request.uri.path eq "/auth/v1/recover"
period = 10
requests_per_period = 6
mitigation_timeout = 10
```

The owner-access browser surface and recovery edge guard are therefore ready for a later controlled real proof.

## PROVEN EVIDENCE — AUTH / E-MAIL

Live Auth configuration:

```text
SITE_URL = https://app.wandora.com.br
URI allow-list includes https://app.wandora.com.br/**
public signup disabled = true
mailer autoconfirm = false
SMTP host configured = true
SMTP port configured = true
SMTP user configured = true
SMTP password configured = true
CAPTCHA provider flag = unset
```

The effective SMTP endpoint is not a real reachable relay:

```text
GOTRUE_SMTP_HOST = supabase-mail
GOTRUE_SMTP_PORT = 2500
DNS resolution from supabase-auth = false
nc result = bad address 'supabase-mail'
```

The live Supabase compose services are:

```text
db
auth
realtime
rest
imgproxy
storage
studio
supavisor
api-gw
functions
meta
```

There is no `supabase-mail` service. The checked-in/live `.env.example` also carries the same development/default values:

```text
SMTP_HOST=supabase-mail
SMTP_PORT=2500
```

Therefore the earlier statement “SMTP configured” meant configuration fields were populated; it did **not** prove an operational outbound mail relay.

A real administrative invite is not authorized while this is unresolved.

## GAPS

Two independent prerequisites block the first real end-to-end owner access:

1. **No real customer owner/organization target exists yet.**
   - the only Auth/Wandora user is already linked to existing internal/legacy proof organizations;
   - ADR 0086 forbids creating another synthetic tenant merely to advance rollout;
   - a later execution must use a genuinely new owner mailbox controlled by the intended proof recipient and a real customer organization identity.

2. **Transactional e-mail delivery is not operational.**
   - Auth points at unresolved `supabase-mail:2500`;
   - no mail service exists in the production compose;
   - a real invite may create provider-side Auth state before e-mail delivery fails, so blind retry is unsafe.

## CAPABILITY AUTHORITY / REUSE GATE

Supabase Auth remains authoritative for:

- administrative invitation;
- invited Auth-user creation;
- verification token/session;
- first-password credential state;
- recovery token/session.

Wandora must not add a parallel invitation-token table, password store, recovery-token table or generic Auth administration proxy to solve the SMTP gap.

The missing capability is **transactional SMTP delivery**, not a new Wandora identity subsystem.

## DECISION

This preflight fails closed before the first real invite.

The first controlled owner-access proof will use:

- one genuinely new customer owner e-mail address controlled by the proof recipient;
- one genuinely new customer organization identity;
- Private Tenant Provisioning V2 for the employee-free Wandora organization after the provider-created Auth subject exists;
- the normal `/accept-invite` happy path as the primary proof;
- provider-native `/recover-access` only as a contingency if the invite session is actually interrupted.

The proof will **not intentionally interrupt** the first invite merely to exercise recovery. Recovery should be validated in a separately bounded effect after the happy path, or used only if a real interruption occurs.

Existing Empresa Exemplo / Customer Hire Canary / Internal Supervised Proof tenants are not eligible substitutes.

## FUTURE CONTROLLED REAL-FLOW ORDER

After SMTP is separately made operational and revalidated:

1. freeze the exact customer owner e-mail + real organization name/slug;
2. reprove Auth users/target absence and zero recovery/eligibility/unfinished-hire state;
3. issue exactly one administrative invite;
4. treat any timeout/lost response as potentially effectful and reconcile Auth state before retry;
5. resolve the newly created Auth subject;
6. provision exactly one employee-free organization through Private Tenant Provisioning V2;
7. independently prove one owner membership and zero employees;
8. only then instruct the controlled recipient to open the invite;
9. require `/accept-invite -> first password -> password grant -> /api/v1/me` success;
10. prove the owner sees only the newly provisioned organization;
11. keep Paperclip bootstrap, Organization Adapter wiring, tenant eligibility and hiring outside this access proof.

If the recipient opens the invite before V2 provisioning completes, Core remains fail-closed as unlinked. The operator must finish/reconcile provisioning; no authorization shortcut is permitted.

## AMBIGUITY / RETRY RULES

### Invite

A lost or failed admin-invite response is not automatically retryable.

Because provider user creation and e-mail dispatch may not be atomically observable to Wandora, the operator must first reconcile:

- target Auth user existence;
- invitation/confirmation state;
- any provider send timestamp/token state available through the protected operator boundary.

Only a separately reviewed reconciliation result may authorize another invite.

### Tenant provisioning

V2 keeps its existing request-key idempotency and changed-payload conflict behavior. Do not invent a second organization if the first provisioning response is ambiguous.

### Recovery

Recovery remains provider-native and edge-protected. Never issue recovery during the first-access preflight. If later used, repeated recovery remains subject to provider limits plus the Cloudflare exact-path guard.

## SECOND ADVERSARIAL REVIEW

Rejected alternatives:

- reuse the existing internal owner to call this a “first real owner” proof;
- create a fourth synthetic proof tenant merely to satisfy the test;
- use `generate_link` as the normal customer onboarding channel;
- manually mutate `auth.users`;
- bypass Supabase Auth by adding Wandora password/invite state;
- temporarily enable public signup;
- add Mailpit/supabase-mail and call captured local mail “real delivery”;
- configure an arbitrary SMTP relay during this no-effect preflight;
- send one invite “just to see whether mail works”;
- deliberately break the first happy-path invite to force recovery coverage.

The SMTP failure is a release gate, not a reason to weaken the architecture.

## EXECUTION

No production mutation was performed.

Read-only checks covered:

- current Git/PR state;
- live containers/images/health;
- Auth/Wandora/eligibility/hire/recovery counts;
- organization inventory;
- Auth redirect/signup/mailer settings;
- SMTP DNS/TCP reachability from the Auth runtime;
- Supabase compose service inventory;
- Cloudflare recovery rule read-back;
- external owner-access routes.

## VALIDATION / NO-EFFECT PROOF

After all probes:

```text
Auth users = 1
recovery_sent rows = 0
recovery_token rows = 0
Auth one-time tokens = 0
eligibility rows = 0
enabled eligibility rows = 0
unfinished hire operations = 0

Customer Digital-Employee Hire = ON
Human Send = OFF
Gateway outbound = OFF
```

No invite or recovery request/link/e-mail was generated or sent.

No Auth user, tenant, Paperclip company, provider binding, employee, eligibility row or hire operation was created.

No Web/Core/Auth/Gateway/Cloudflare runtime configuration changed.

## RESULT

**Customer Owner First Real Access End-to-End Validation Preflight V1 is complete but blocked before execution.**

The owner-access Web and recovery edge are live and ready.

The blocking production gap is transactional SMTP: Auth currently points to the unresolved development/default endpoint `supabase-mail:2500`.

A second gate is the absence of an actual new customer owner + real organization target; existing proof tenants must not be reused.

## NEXT EXECUTABLE SLICE

**Customer Owner Transactional E-mail Delivery Foundation Preflight V1**

No-effect preflight only.

Select the production SMTP provider/custody/config contract, verify sender-domain requirements and rollback, and prove the exact Auth configuration delta without sending an invite, recovery or test e-mail.

Do not create an Auth user, tenant, provider wiring or eligibility during that preflight.
