# ADR 0069 — Customer Hire Canary Employee-Free Tenant Provisioning Preflight V1

- Status: **Accepted preflight — no canary tenant created**
- Date: 2026-09-18
- Scope: freeze the exact least-privilege execution path, stable request identity and postconditions for creating one employee-free customer-like production canary through the already-live Private Tenant Provisioning V2 contract

## REAL NOW

Canonical Git entering this preflight:

```text
main = 4425d1c196372f39af35f2f8488016a0613a23f8
PR #113 = merged
open PRs = 0
```

A stale historical branch named `docs/customer-hire-canary-preflight-v1` still exists, but it diverged from the old PR #109 base and only contains the already-merged ADR 0065 direction. It is not reused for this slice.

Live runtime was reverified read-only:

```text
Core      = wandora/core:organization-adapter-candidate-068d30a49d9b, healthy
Web       = wandora/web:team-read-b31db507, healthy
Paperclip = wandora/paperclip:v2026.831.1, healthy
Gateway   = wandora/messaging-gateway:origin-fix-94cfb4de, healthy

Organization Adapter           = ON
Customer Digital-Employee Hire = OFF / flag absent
Human Send                     = OFF / flag absent
Gateway outbound               = OFF / flag absent
```

Live database state:

```text
organizations                       = 2
digital_employees                   = 3
control_plane_provider_bindings     = 1
digital_employee_provider_bindings  = 1
completed catalog hire operations   = 1
tenant_provisioning_requests        = 0
customer-hire canary organization   = absent

V2 function                         = present
platform provisioner EXECUTE V2     = true
Core EXECUTE V2                     = false
authenticated EXECUTE V2            = false
platform provisioner password       = absent
platform provisioner connlimit      = 0
```

The ADR 0067 rollback artifact still matches its recorded checksum:

```text
/home/wandora-admin/backups/postgres-pre-provisioning-v2-20260918T070139Z.dump
sha256=d88a4acb89eba37f7a366621c1d0ede4a824a26e54565bd823591979f28853ff
```

## PROVEN EXECUTION IDENTITY

The dormant `wandora_platform_provisioner` must remain passwordless and non-connectable. No reusable production password is introduced merely to exercise V2 once.

The accepted execution path is therefore:

```text
local operator maintenance session
  -> psql as supabase_admin inside private supabase-db container
  -> BEGIN
  -> resolve + hash-gate the already-existing canonical owner Supabase identity
  -> SET LOCAL ROLE wandora_platform_provisioner
  -> invoke only provision_beta_organization_v2(...)
  -> validate returned Wandora IDs
  -> COMMIT
  -> independent post-verification
```

This path was proven without calling V2:

```text
session_user = supabase_admin
current_user after SET LOCAL ROLE = wandora_platform_provisioner
can_execute_v2 = true
can_select_private_ledger = false
```

`supabase_admin` is a superuser and can set the least-privilege role. The function remains SECURITY DEFINER with its pinned search path, so the invoker itself receives no direct table privileges.

No password, token, provider credential or new login is required.

## PROVEN OWNER REUSE TARGET

Exactly one existing canonical user is currently an active owner in both existing organizations and has exactly one Supabase identity.

Freeze the Wandora-owned owner reference as:

```text
owner_user_id = e1000000-0000-4000-8000-000000000001
supabase identity count = 1
provider subject sha256 = 72c3ee28cf311358ece8b06c5b07f47ede5f6c7e3b48a38b46e5953883c61bcc
```

The raw Supabase provider subject is deliberately **not** written to Git. During execution it must be resolved transiently by `owner_user_id`, checked against the frozen SHA-256, and then passed to V2.

The request uses a synthetic stable owner display-name input:

```text
owner_display_name = Wandora Customer Hire Canary Owner
```

Because the frozen Supabase subject already maps to the canonical user above, V2 must reuse that user and must not overwrite the existing canonical user display name.

## FROZEN REQUEST IDENTITY

The future provisioning execution uses exactly:

```text
request_key               = customer-hire-canary:tenant-v2:v1
organization_slug         = wandora-customer-hire-canary
organization_display_name = Wandora Customer Hire Canary
owner_user_id             = e1000000-0000-4000-8000-000000000001
owner_display_name input  = Wandora Customer Hire Canary Owner
```

The raw Supabase subject remains runtime-resolved and hash-gated as described above.

The request key is deliberately semantic and stable. A chat timeout or operator retry must reuse this same key rather than minting a replacement.

## EXISTING SAFETY EVIDENCE REUSED — NO REDUNDANT REHEARSAL

ADR 0066 / PR #111 already proved in reproducible PostgreSQL CI:

- V2 exact replay returns the same organization/user IDs;
- same key + changed payload fails closed;
- different key + same slug fails closed;
- existing Supabase subject reuses the canonical user without overwriting display name;
- V2 creates zero digital employees;
- cross-version request-key reuse fails closed;
- only `wandora_platform_provisioner` can execute V2;
- the platform role has no direct private-ledger access.

ADR 0067 then applied the exact migration to a restore of current production and proved migration compatibility with the current live shape. ADR 0068 applied and verified that exact migration live.

The current preflight additionally proves the canary slug is absent, provisioning ledger is empty, the frozen owner exists uniquely, and the exact no-password `SET LOCAL ROLE` path works.

A new disposable execution rehearsal would repeat already-proven function semantics without closing a new uncertainty, so it is rejected as unnecessary work.

## EXACT FUTURE EXECUTION BOUNDARY

The subsequent provisioning execution may do only this:

1. reverify `main`, live V2 state, effect flags, zero provisioning requests and absent canary slug;
2. verify the backup checksum above;
3. start one local `supabase_admin` psql session inside the private DB container;
4. resolve exactly one Supabase provider subject for the frozen `owner_user_id`;
5. verify its SHA-256 matches the frozen hash;
6. begin a transaction;
7. `SET LOCAL ROLE wandora_platform_provisioner`;
8. call `wandora_private.provision_beta_organization_v2(...)` with the exact frozen request;
9. require the returned `user_id` to equal the frozen existing owner user ID;
10. commit only if the call succeeds;
11. independently verify all postconditions below;
12. stop before any Paperclip/company/config/custody/binding/hire/runtime-gate/outbound effect.

## REQUIRED POST-PROVISIONING INVARIANTS

After successful execution, expected durable state is exactly:

```text
organizations                       = 3
customer-hire canary organization   = exactly 1 / active
canary active owner membership      = exactly 1
returned canary owner user_id       = e1000000-0000-4000-8000-000000000001
canary digital employees            = 0

tenant_provisioning_requests        = 1 total
canary provisioning row             = provisioning_version 2
canary provisioning employee_id     = NULL

control_plane_provider_bindings     = 1 total / 0 for canary
digital_employee_provider_bindings  = 1 total / 0 for canary
completed catalog hire operations   = 1 total / 0 for canary

Customer Digital-Employee Hire      = OFF
Human Send                          = OFF
Gateway outbound                    = OFF
```

The existing internal Organization Adapter canary state must remain unchanged.

No Paperclip company may exist yet for `Wandora Customer Hire Canary`.

## FAILURE / REPLAY RULES

- If the V2 call errors before COMMIT, rollback and do not improvise another request key.
- If client delivery is ambiguous after COMMIT, first query by the frozen slug/request key and treat V2 idempotency evidence as authority before any replay.
- Any replay must use the **same request key and exact payload**.
- A changed payload under the same key must remain a hard conflict.
- If the slug exists without matching V2 idempotency evidence, stop for investigation rather than adopting it.
- Migration-only structural rollback from ADR 0067 is no longer the normal response after a V2 row exists; preserve the forward-compatible live schema and investigate/restore only through a separately reviewed recovery if needed.

## SECOND ADVERSARIAL REVIEW

Rejected:

- creating a reusable password for `wandora_platform_provisioner`;
- raising its connection limit merely for this canary;
- calling V2 directly as `supabase_admin`, which would bypass the intended invoker boundary;
- storing the raw Supabase provider subject in Git;
- selecting an owner by browser input at execution time;
- generating a random request key that could be lost across a timeout;
- creating the canary with direct INSERTs;
- reusing Tenant Provisioning V1;
- coupling tenant provisioning to Paperclip company bootstrap;
- coupling provisioning to HMAC custody/provider binding;
- enabling Customer Digital-Employee Hire in the normal live Core;
- creating or hiring Ana in this slice;
- activating any employee;
- enabling Human Send or Gateway outbound;
- repeating CI/disposable proofs that do not close a new uncertainty.

## EFFECT BOUNDARY

This preflight performs no durable production business/provider mutation.

Still true after the preflight:

```text
organizations = 2
tenant_provisioning_requests = 0
customer-hire canary organization = absent
new Paperclip canary company = absent
Customer Digital-Employee Hire = OFF
Human Send = OFF
Gateway outbound = OFF
```

## DECISION

**Customer Hire Canary — Employee-Free Tenant Provisioning Preflight V1 is complete.**

The exact no-password least-privilege execution path, owner reference, provider-subject hash, stable request key, canary identity, failure behavior and postconditions are frozen.

## NEXT EXECUTABLE SLICE

**Customer Hire Canary — Employee-Free Tenant Provisioning Execution V1.**

Create exactly one `Wandora Customer Hire Canary` organization through V2 and independently prove the postconditions above.

Stop after Wandora tenant/owner/idempotency state. Do not create the Paperclip canary company, provider custody/config/binding, customer hire, activation or outbound effect in the same slice.
