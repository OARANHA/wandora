# ADR 0105 — Customer Owner First Real Tenant Access Validation V1

- Status: **Accepted validation — genuine owner session reached MEDICSPRO / no mutation**
- Date: 2026-09-18
- Scope: prove the first real owner can authenticate normally and receive MEDICSPRO customer context after ADR 0104, without privileged impersonation or any provider/eligibility/hire effect.

## REAL NOW

```text
main = f081b0389aa63d5455ba5636280cb708423f2d86
open PRs = 0
MEDICSPRO active organizations = 1
MEDICSPRO active owner memberships = 1
MEDICSPRO employees = 0
```

ADR 0104 made MEDICSPRO live through Private Tenant Provisioning V2. The remaining gap was customer-side observation using a genuine normal owner session.

## PROVEN EVIDENCE

The operator/customer performed a normal browser login using the invited owner account and provided the first rendered post-login screen. The Web rendered:

```text
organization = MEDICSPRO
user display = Alessandro Aranha
route/surface = Trabalho
state = Nada aguardando sua atenção
```

No token, password, refresh token, JWT or browser storage content was shared with the operator tooling.

Traefik/Web access evidence around the human session shows the fresh login path:

```text
GET /api/v1/me              -> 200
GET /.../work/attention-required -> 200
GET /.../digital-employees -> 200
GET /.../conversations     -> 200
```

The organization-specific path identifier is intentionally omitted from this ADR.

An earlier `/api/v1/me` request from an already-open `/approvals` navigation returned 503 and was followed within seconds by 200. It was not the fresh `/login` validation request. The actual `/login`-referenced customer bootstrap returned 200, and subsequent customer tenant routes remained 200. The transient is recorded rather than silently erased, but it does not invalidate the fresh-login access proof.

Independent database reconciliation for the frozen owner-subject hash remains:

```text
target Auth rows = 1
target confirmed = 1
target signed in = 1
target Wandora mapping rows = 1
MEDICSPRO active organizations = 1
MEDICSPRO active owner memberships = 1
MEDICSPRO employees = 0
MEDICSPRO control bindings = 0
MEDICSPRO employee bindings = 0
MEDICSPRO eligibility = 0
unfinished hires = 0
```

Auth, DB, Web, Core, Paperclip and Messaging Gateway remained healthy after the validation.

## GAPS

Customer authentication + Wandora tenant bootstrap is now proven end-to-end for the first real owner.

MEDICSPRO still intentionally has no provider control-plane company/binding, no eligibility and no digital employee. Therefore customer hire must not be opened merely because owner access is now valid.

## DECISION

Accept the first real customer owner access path as REAL:

```text
Supabase Auth normal login
  -> Wandora Web normal session
  -> GET /api/v1/me = 200
  -> MEDICSPRO organization context
  -> tenant-authorized customer reads = 200
```

Do not persist customer session material, mint privileged JWTs or use Auth-admin impersonation for this proof.

## SECOND ADVERSARIAL REVIEW

Rejected:

- treating database membership alone as customer access proof;
- using service-role/Auth-admin JWTs to simulate the customer;
- asking the user to paste browser tokens or passwords;
- treating the earlier unrelated 503 as a successful response;
- ignoring the 503 instead of recording it;
- enabling eligibility before the provider/control-plane boundary exists;
- creating Paperclip state as part of this read-only validation;
- hiring a digital employee during access validation.

The strongest evidence is the combination of the human-rendered MEDICSPRO customer screen, fresh `/login`-referenced `/api/v1/me = 200`, subsequent tenant-authorized route 200s and independent canonical owner/membership reconciliation.

## EXECUTION

No production mutation was needed for this slice.

The human owner logged in normally. Operator tooling only read edge/Web logs, canonical database state and container health. No secret/session extraction occurred.

## VALIDATION

Customer-visible proof:

```text
MEDICSPRO rendered as active company
Alessandro Aranha rendered as signed-in user
Trabalho loaded normally
empty attention state rendered
```

Transport/API proof:

```text
fresh login /api/v1/me = 200
work attention read     = 200
team/digital-employees  = 200
conversations           = 200
```

Business/effect boundary:

```text
MEDICSPRO employees           = 0
MEDICSPRO control bindings    = 0
MEDICSPRO employee bindings   = 0
MEDICSPRO eligibility rows    = 0
unfinished hire operations    = 0
Paperclip/provider mutation   = none
outbound mutation             = none
```

## REPOSITORY PUBLICATION VALIDATION

PR #153 is documentation-only. All five GitHub Actions again failed before receiving a runner:

```text
Core CI                         steps = null
Web CI                          steps = null
Platform Admin CI               steps = null
Messaging Gateway CI            steps = null
Organization Adapter Plugin CI  steps = null
```

These checks are not called green. They reproduce the already-known external runner failure pattern and contain no executed code/test step. The access validation itself was independently proven against the live customer session, edge/Web access evidence, database reconciliation and healthy runtime.

## RESULT

**Customer Owner First Real Tenant Access Validation V1 is complete. The first real owner can log in normally and the Wandora customer product resolves MEDICSPRO as the authorized organization.**

The tenant is still deliberately employee-free and provider-unwired.

## NEXT EXECUTABLE SLICE

**Customer Owner First Real Tenant Paperclip Company Bootstrap Preflight V1**

Use the existing Paperclip Organization Adapter authority model and the prior canary bootstrap evidence to freeze the exact MEDICSPRO company creation/reconciliation contract. The preflight must not create the Paperclip company, provider binding, eligibility or employee hire.
