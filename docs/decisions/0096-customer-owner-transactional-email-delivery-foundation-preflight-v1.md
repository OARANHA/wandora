# ADR 0096 — Customer Owner Transactional E-mail Delivery Foundation Preflight V1

- Status: **Accepted preflight — provider/config contract frozen / no provider wiring / no e-mail sent**
- Date: 2026-09-18
- Scope: select and prove the production transactional SMTP foundation required by Supabase Auth before the first real customer-owner invite

## REAL NOW

Canonical repository state at entry:

```text
main = 6e08cbe1b2485846dc7ddf4763bce94211f04be3
open PRs = 0
ADR 0095 = complete / first real invite blocked on transactional SMTP + genuine target
```

Observed live runtime:

```text
Web     = wandora/web:owner-access-candidate-5f135e90 / healthy
Core    = wandora/core:organization-adapter-candidate-af542864d267 / healthy
Auth    = supabase/gotrue:v2.196.0 / healthy
Gateway = wandora/messaging-gateway:origin-fix-94cfb4de / healthy

Customer Digital-Employee Hire = ON
Human Send = OFF
Gateway outbound = OFF
```

The live Auth compose maps the SMTP boundary exactly as:

```text
GOTRUE_SMTP_ADMIN_EMAIL <- SMTP_ADMIN_EMAIL
GOTRUE_SMTP_HOST        <- SMTP_HOST
GOTRUE_SMTP_PORT        <- SMTP_PORT
GOTRUE_SMTP_USER        <- SMTP_USER
GOTRUE_SMTP_PASS        <- SMTP_PASS
GOTRUE_SMTP_SENDER_NAME <- SMTP_SENDER_NAME
```

The current production values remain the non-operational development/default relay already identified by ADR 0095:

```text
SMTP_HOST = supabase-mail
SMTP_PORT = 2500
SMTP_ADMIN_EMAIL = admin@example.com
SMTP_SENDER_NAME = fake_sender
```

No mail service exists in the live Supabase compose and `supabase-mail` does not resolve from the Auth container.

## PROVEN EVIDENCE — PROVIDER COMPATIBILITY

Supabase Auth supports custom SMTP by host, port, username, password, From address and sender name. Supabase documentation explicitly lists Resend among compatible SMTP providers.

Resend's current SMTP contract supports:

```text
host = smtp.resend.com
port = 587 for STARTTLS
username = resend
password = Resend API key
```

Resend also supports API keys with **sending-only** permission and optional restriction to one sending domain.

Current Resend sending regions include São Paulo (`sa-east-1`). This preflight selects São Paulo for the Wandora auth-mail domain because the initial intended customer population is in Brazil and no canonical requirement prefers another sending region.

Important limitation retained as an explicit architectural fact: Resend states that account/message/log data is stored in the United States even when the selected sending region is São Paulo. Sending region is therefore not a data-residency guarantee.

## PROVEN EVIDENCE — LIVE NETWORK PATH

The live `supabase-auth` container resolves `smtp.resend.com`.

A no-auth/no-message SMTP dialogue from the actual Auth container to port 587 returned:

```text
220 Resend SMTP Relay ESMTP
250-STARTTLS
250-AUTH PLAIN LOGIN
...
221 Bye
```

The probe did **not** issue `AUTH`, `MAIL FROM`, `RCPT TO` or `DATA`.

Therefore the exact live Auth network namespace can reach the selected relay and the relay advertises STARTTLS on the selected port without sending any message.

## PROVEN EVIDENCE — SENDER DOMAIN

The selected sender domain is:

```text
notify.wandora.com.br
```

Selected From identity:

```text
Wandora <acesso@notify.wandora.com.br>
```

Public DNS preflight proved the following names are currently unused:

```text
notify.wandora.com.br
send.notify.wandora.com.br
resend._domainkey.notify.wandora.com.br
_dmarc.notify.wandora.com.br
```

No A/CNAME/MX/TXT record is currently published at those names.

`mail.wandora.com.br` is explicitly **not** selected: it already resolves to the Wandora VPS and must not be overloaded as the transactional sender identity.

For future activation, the exact SPF/MX/DKIM records must be the records returned by the selected Resend domain configuration. Do not invent or hard-code provider-generated values in Git.

Resend currently enforces SPF and DKIM for verified sending domains and recommends DMARC. A DMARC record for the dedicated `notify.wandora.com.br` subdomain is required before the first real customer invite, but its enforcement policy is a separately reviewed DNS decision after provider alignment is proven.

## CAPABILITY AUTHORITY / REUSE GATE

The missing capability remains transactional e-mail delivery.

Authority remains:

```text
Supabase Auth
  -> invite/recovery token + Auth-user/session/credential authority

SMTP relay
  -> message transport/deliverability capability

Wandora
  -> customer-access policy, protected operator procedure,
     sender identity choice, custody, rollout and audit contract
```

Wandora must not add an invitation-token table, recovery-token table, password store, custom mail queue or generic Auth-admin proxy merely to solve SMTP delivery.

## DECISION

Select **Resend SMTP** as the initial production transactional relay for customer-owner Auth mail.

Freeze the future production contract as:

```text
provider        = Resend SMTP
sending domain  = notify.wandora.com.br
sending region  = sa-east-1
from address    = acesso@notify.wandora.com.br
sender name     = Wandora
smtp host       = smtp.resend.com
smtp port       = 587
smtp username   = resend
smtp credential = one dedicated sending-only API key
scope           = notify.wandora.com.br only
```

The credential must not be a full-access Resend API key.

The provider account/domain/key are **not created by this preflight**.

## SECRET CUSTODY CONTRACT

The existing live compose directly maps `SMTP_PASS` into container environment. Do not put the future Resend key in the checked-in or live Supabase `.env`.

The accepted production design is Docker-secret-style file custody:

```text
host:
  /opt/wandora/data/supabase/secrets/gotrue_smtp_pass

owner:
  root:wandora-ops

mode:
  0640

container:
  /run/secrets/gotrue_smtp_pass
```

The versioned Auth compose change must:

1. remove `GOTRUE_SMTP_PASS: ${SMTP_PASS}` from the Auth environment mapping;
2. mount the dedicated secret file only into `auth`;
3. wrap the image's existing `/usr/local/bin/auth` startup with `/bin/sh -ec`;
4. read the password from `/run/secrets/gotrue_smtp_pass`;
5. export it only inside the container process environment immediately before `exec /usr/local/bin/auth`;
6. escape Compose dollar expansion with `$$` so the secret lookup happens inside the container, not while rendering Compose.

A synthetic disposable Compose proof on the exact `supabase/gotrue:v2.196.0` image established:

```text
PASS_IN_ENV=false
SECRET_MOUNT=true
WRAPPER_LITERAL_DOLLAR=true
WRAPPER_EXECS_AUTH=true
CONFIG_PASS_VALUE_LEAK=false
```

The first attempted proof intentionally failed the standard because a naive override kept `GOTRUE_SMTP_PASS` present in the rendered environment and Compose attempted to interpolate the wrapper's `$GOTRUE_SMTP_PASS`. That design is rejected.

No real credential participated in either proof and all disposable proof files were scheduled for immediate cleanup.

## EXACT FUTURE AUTH CONFIGURATION DELTA

After provider/domain/credential provisioning is separately authorized, the non-secret Auth settings change from:

```text
SMTP_HOST=supabase-mail
SMTP_PORT=2500
SMTP_ADMIN_EMAIL=admin@example.com
SMTP_SENDER_NAME=fake_sender
```

to:

```text
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_ADMIN_EMAIL=acesso@notify.wandora.com.br
SMTP_SENDER_NAME=Wandora
```

There will be **no `SMTP_PASS` value in the Supabase `.env`** after the secret-file implementation.

No invite/recovery URL, signup setting, JWT key, database credential, Core config, Web config, Gateway config, eligibility state or customer-hire flag belongs in this SMTP delta.

## FUTURE ACTIVATION ORDER

A later execution slice must separate provider provisioning from Auth activation.

### Phase A — provider/domain/credential foundation

1. create/identify the Wandora Resend team through the operator account;
2. create exactly `notify.wandora.com.br` in region `sa-east-1`;
3. obtain the exact provider-generated DNS records;
4. add only those reviewed DNS records in Cloudflare;
5. verify domain sending status from Resend and public DNS;
6. establish reviewed DMARC for the dedicated sending subdomain;
7. create one sending-only API key restricted to `notify.wandora.com.br`;
8. install the key only in the reviewed host secret file;
9. do not modify live GoTrue yet;
10. do not send an e-mail.

### Phase B — Auth SMTP activation

1. back up/hash the exact live Supabase compose + non-secret SMTP configuration;
2. apply the reviewed secret-file compose change;
3. apply the non-secret SMTP settings;
4. recreate **only** `supabase-auth`;
5. require Auth health green and zero restart loop;
6. prove DNS/TCP/STARTTLS again from the new Auth container;
7. optionally prove SMTP authentication with `AUTH` + immediate `QUIT` only, with no `MAIL FROM`, `RCPT TO` or `DATA`;
8. verify no Auth user/recovery/eligibility/hire counters changed;
9. keep first real invite/recovery/test e-mail outside that activation unless a later slice explicitly authorizes it.

## ROLLBACK CONTRACT

Before Auth activation, preserve a byte-identifiable copy/hash of the exact live compose and non-secret SMTP config.

Rollback is:

1. restore the previous compose and previous non-secret SMTP values;
2. recreate only `supabase-auth`;
3. require `supabase-auth` healthy;
4. verify owner-access routes and `/api/v1/me` fail-closed behavior remain unchanged;
5. revoke the dedicated Resend sending credential if the activation is abandoned or suspected compromised;
6. DNS records may remain only if intentionally retained for a subsequent attempt; otherwise remove them through a separately reviewed DNS rollback.

The rollback may return Auth to the prior known non-operational `supabase-mail:2500` delivery state; that is acceptable because rollback restores the last production state rather than silently choosing a second provider.

## SECOND ADVERSARIAL REVIEW

Rejected alternatives and failure modes:

- **Reuse `mail.wandora.com.br`** — rejected because it already resolves to the VPS and creates naming/routing ambiguity.
- **Put the Resend key in `.env`** — rejected because production secrets should not become stack text or Git-adjacent state.
- **Use a full-access Resend key** — rejected because sending-only/domain-restricted permission exists.
- **Use Resend API directly from Web/Core** — rejected because Supabase Auth already owns invitation/recovery mail generation and accepts SMTP.
- **Add Mailpit/Mailhog and call captured mail production-ready** — rejected because local capture does not prove Internet delivery.
- **Use the Resend test domain for the first customer** — rejected because production Auth mail must authenticate a Wandora-controlled sender domain.
- **Send a test e-mail during this preflight** — explicitly forbidden.
- **Create the Resend account/domain/key now** — rejected because this preflight forbids provider wiring.
- **Choose AWS SES merely for perceived enterprise weight** — rejected for V1 because no current requirement justifies the additional IAM/credential/onboarding surface; SES remains replaceable behind the same SMTP contract if future requirements demand it.
- **Ignore Resend data residency** — rejected; the US storage fact is recorded and must be reconsidered if a later privacy/data-residency requirement conflicts with it.
- **Naive Compose override** — rejected because the proof showed it can retain the password environment key and interpolate shell dollars at Compose-render time.

The selected design is intentionally replaceable: GoTrue speaks SMTP, not a Resend-specific API.

## EXECUTION

This preflight performed only no-effect/read-only or disposable local proof work:

- current Git/PR and canonical-state verification;
- live runtime/image/health inspection;
- exact GoTrue SMTP compose/config inspection;
- provider documentation comparison;
- public DNS inspection for candidate sender names;
- live Auth-container DNS and SMTP capability probe with no authentication/message transaction;
- disposable synthetic Compose rendering for secret-file semantics;
- cleanup of disposable proof material.

No production service was recreated and no production configuration was changed.

## VALIDATION / NO-EFFECT PROOF

Required final checks for this preflight:

```text
no real invite sent
no recovery sent
no test e-mail sent
no Auth user created
no tenant created
no Resend account/domain/key created by this slice
no Cloudflare DNS record changed by this slice
no Auth/Core/Web/Gateway runtime config changed
no provider binding/wiring created
no eligibility created/enabled
Human Send remains OFF
Gateway outbound remains OFF
```

## RESULT

**Customer Owner Transactional E-mail Delivery Foundation Preflight V1 is complete.**

The production SMTP foundation is selected and bounded without wiring it:

```text
Resend SMTP
  -> notify.wandora.com.br
  -> sa-east-1
  -> sending-only domain-restricted key
  -> Docker secret file
  -> GoTrue SMTP on STARTTLS/587
```

The first real customer-owner invite remains blocked until the provider/domain/credential foundation and Auth SMTP activation are separately executed and verified.

## NEXT EXECUTABLE SLICE

**Customer Owner Transactional E-mail Sender Domain + Credential Provisioning Execution V1**

That slice may create the Resend sender domain, provider-issued DNS records and one domain-restricted sending-only credential under reviewed custody.

It must **not** modify live GoTrue SMTP configuration and must **not** send an invite, recovery or test e-mail.
