# ADR 0099 — Customer Owner Transactional E-mail GoTrue SMTP Activation Execution V1

- Status: **Accepted execution — live GoTrue SMTP activated / Auth-only recreate / no e-mail sent**
- Date: 2026-09-18
- Scope: execute the exact ADR 0098 one-service GoTrue SMTP activation using the already-provisioned Resend sender foundation, while keeping invite/recovery/test-mail effects outside this slice.

## REAL NOW

Canonical repository state at execution entry:

```text
main = 1e96c04458750210cf237b7c7b11e48167717e25
open PRs = 0
ADR 0098 = accepted activation preflight
```

Observed production state before mutation matched the preflight exactly:

```text
docker-compose.yml          = f6724c97f1ca555b700f5ecf630e8a2e5114682b64ca94158061326187139183
docker-compose.wandora.yml  = 433ce0a9b96198cbd91bb0df0301efba471b5ce3acd33a1a0abe8558e8b7960d
.env                        = 6f3926f8fa00939052a3419887d298d61909e68a0ebc4225f7a31d5501fd92f0

supabase-auth id    = 93b1b37a9a0811bcdc84a5341c66b5999335b3fdf14d5c4e3aba9b11a42e5e95
image               = supabase/gotrue:v2.196.0
health              = healthy
restarts            = 0
PID 1 UID           = 1000
```

The SMTP credential remained:

```text
/opt/wandora/data/supabase/secrets/gotrue_smtp_pass
root:wandora-ops / 0640 / 36 bytes
```

The protected ADR 0098 rollback snapshot was present and intact.

## PROVEN EVIDENCE — NO DRIFT / CANDIDATE INTEGRITY

The canonical overlay was materialized directly from `main` and independently hashed on the VPS:

```text
2d35d6ea292c0749d4edb3654cec007a6e5ffc6086d8f44516e53742abfaa280
```

This exactly matches ADR 0098.

A fresh execution-time rollback snapshot was created before changing live configuration:

```text
/home/wandora-admin/backups/gotrue-smtp-activation-execution-v1-20260919T013658Z
```

It contains protected copies of the exact pre-execution `.env`, base Compose and Wandora overlay plus hashes.

## DECISION

Execute ADR 0098 exactly:

```text
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=
SMTP_ADMIN_EMAIL=acesso@notify.wandora.com.br
SMTP_SENDER_NAME=Wandora
```

The empty `SMTP_PASS=` is only the upstream interpolation placeholder. The real credential remains file-backed and is never copied into the live `.env` or versioned Compose.

Install the exact canonical overlay and recreate only Compose service `auth`:

```sh
docker compose \
  -f docker-compose.yml \
  -f docker-compose.wandora.yml \
  up -d --no-deps --force-recreate auth
```

## SECOND ADVERSARIAL REVIEW

Immediately before recreation, the live future-state render proved:

```text
real secret in rendered Compose       = false
secret mount services                 = auth only
GOTRUE_SMTP_PASS in Config.Env        = false
Auth service user at wrapper start    = 0
wrapper reads /run/secrets/...        = true
wrapper drops to image user supabase  = true
SMTP non-secret values                = exact selected contract
```

The final dry-run again proposed only:

```text
supabase-auth Recreate
supabase-auth Recreated
supabase-auth Starting
supabase-auth Started
```

No DB, API gateway, Studio, Web, Core, Gateway or Paperclip recreation was planned.

A BusyBox `nc -z` probe later returned a false negative against the relay even though normal TCP connected successfully. That zero-I/O result is not used as the network authority; an actual SMTP dialogue from the recreated Auth namespace is the accepted proof.

## EXECUTION

Only the six SMTP source entries were changed in the live `.env`, preserving mode `0600`. The exact canonical overlay replaced the old live overlay.

Final source hashes after installation:

```text
docker-compose.yml          = f6724c97f1ca555b700f5ecf630e8a2e5114682b64ca94158061326187139183
docker-compose.wandora.yml  = 2d35d6ea292c0749d4edb3654cec007a6e5ffc6086d8f44516e53742abfaa280
.env                        = 9d7e1dfbf14adb6c0fc9a5958772fc440284d6ad3dd2b748ef32c2a48c69d8da
```

The approved one-service command was executed once.

Observed identity comparison:

```text
supabase-auth              = recreated
supabase-db                = unchanged
wandora-web                = unchanged
wandora-core               = unchanged
wandora-messaging-gateway  = unchanged
wandora-paperclip          = unchanged
```

New Auth container:

```text
id       = b82a19de68065eee247b7a9460ec414b09330cb939aa927217e149cebaf8d6f6
image    = supabase/gotrue:v2.196.0
health   = healthy
restarts = 0
```

Rollback was not required.

## VALIDATION — RUNTIME / PRIVILEGE / SECRET BOUNDARY

The final Auth process runs as:

```text
PID 1 UID = 1000
```

Although Compose starts the short wrapper as root to read the protected file, the long-running GoTrue process is the existing non-root `supabase` user.

The recreated container exposes only the non-secret SMTP values in `Config.Env`:

```text
GOTRUE_SMTP_HOST=smtp.resend.com
GOTRUE_SMTP_PORT=587
GOTRUE_SMTP_USER=resend
GOTRUE_SMTP_ADMIN_EMAIL=acesso@notify.wandora.com.br
GOTRUE_SMTP_SENDER_NAME=Wandora
GOTRUE_SMTP_PASS in Config.Env = false
```

A same-UID read of PID 1 environment proved the runtime SMTP password is present and has the expected 36-byte credential length without printing its value.

An exact-value scan of all running container `Config.Env` values found:

```text
SECRET_CONFIG_ENV_HITS=0
```

## VALIDATION — SMTP NETWORK / STARTTLS

From the recreated Auth container network namespace:

```text
DNS smtp.resend.com = resolved

220 Resend SMTP Relay ESMTP
250-... AUTH PLAIN LOGIN
250-STARTTLS
220 Ready to start TLS
```

No `AUTH`, `MAIL FROM`, `RCPT TO` or `DATA` was issued by this activation validation.

SMTP AUTH had already been independently proven in ADR 0097 with immediate QUIT and no message transaction; it was intentionally not repeated because ADR 0098 made it optional.

## VALIDATION — NO CUSTOMER / AUTH EFFECT

Post-activation database read-back:

```text
auth_users          = 1
recovery_sent       = 0
recovery_token      = 0
one_time_tokens     = 0

eligibility_rows    = 0
eligibility_enabled = 0
unfinished_hires    = 0
```

Effect switches remain:

```text
Customer Digital-Employee Hire = ON
Human Send                     = absent / OFF
Gateway outbound               = absent / OFF
```

Final service health:

```text
supabase-auth               = healthy / restarts 0
supabase-db                 = healthy / restarts 0
wandora-web                 = healthy / restarts 0
wandora-core                = healthy / restarts 0
wandora-messaging-gateway   = healthy / restarts 0
wandora-paperclip           = healthy / restarts 0
```

No invite, recovery or test e-mail was sent. No Auth user, tenant, provider binding, employee, hire operation or eligibility row was created.

## RESULT

**Customer Owner Transactional E-mail GoTrue SMTP Activation Execution V1 is accepted and live.**

The transactional delivery foundation is now active behind Supabase Auth:

```text
GoTrue
  -> smtp.resend.com:587 / STARTTLS
  -> Wandora <acesso@notify.wandora.com.br>
  -> protected file-backed credential
```

This slice proves activation and transport reachability only. It does not authorize a customer invitation or recovery message.

## NEXT EXECUTABLE SLICE

**Customer Owner First Real Invite Execution Preflight V1**

That preflight must revalidate the real owner-access/Auth state, identify one genuine new owner target rather than reuse a proof/legacy tenant, freeze the exact privileged invite operation and rollback/reconciliation behavior, and preserve the accepted order:

```text
new real owner
  -> Supabase Auth invite
  -> /accept-invite
  -> first password
  -> normal password grant
  -> Private Tenant Provisioning V2
  -> /api/v1/me
```

The preflight must **not** send an invite, recovery or test e-mail, must not provision the tenant, and must not enable customer-hire eligibility.
