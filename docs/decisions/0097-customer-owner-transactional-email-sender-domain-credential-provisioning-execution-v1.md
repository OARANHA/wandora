# ADR 0097 — Customer Owner Transactional E-mail Sender Domain + Credential Provisioning Execution V1

- Status: **Accepted execution — provider/domain/credential foundation live / GoTrue unchanged / no e-mail sent**
- Date: 2026-09-18
- Scope: execute ADR 0096 Phase A only: provision the dedicated Resend sender domain, publish and verify provider DNS, establish subdomain-specific DMARC, and place one dedicated SMTP credential in reviewed host custody without activating live GoTrue SMTP.

## REAL NOW

Canonical repository state at entry:

```text
main = 4906c46fe057cf5f680bd65537983709a1c38367
open PRs = 0
ADR 0096 = accepted / provider and custody contract frozen
```

Observed production runtime before this execution:

```text
wandora-web               = healthy
wandora-core              = healthy
wandora-messaging-gateway = healthy
supabase-auth             = healthy / supabase/gotrue:v2.196.0

GOTRUE_SMTP_HOST        = supabase-mail
GOTRUE_SMTP_PORT        = 2500
GOTRUE_SMTP_ADMIN_EMAIL = admin@example.com
GOTRUE_SMTP_SENDER_NAME = fake_sender
```

Customer Digital-Employee Hire remained globally ON with zero tenant eligibility from the preceding rollout state. Human Send and Gateway outbound remained OFF.

## PROVEN EVIDENCE — RESEND DOMAIN

The operator created exactly:

```text
notify.wandora.com.br
region = sa-east-1
```

Resend reported the domain verified and ready to send.

The existing Cloudflare A record for `notify.wandora.com.br` remained unchanged and proxied. It is not used as the Resend SMTP authentication record and did not conflict with the provider-generated subnames.

The provider-generated records were published manually rather than through provider auto-configuration:

```text
TXT    resend._domainkey.notify.wandora.com.br
CNAME  rsend.notify.wandora.com.br -> rsend-sae1.forge.rmta.net
CNAME  send.notify.wandora.com.br  -> send.forge.rmta.net
```

The two CNAMEs are DNS-only. The DKIM TXT is non-proxy DNS data.

Independent read-back from the Wandora VPS observed all three records publicly after Resend had marked them verified.

## PROVEN EVIDENCE — DMARC

The Resend UI suggested an optional root-domain DMARC record. That broader mutation was rejected.

Instead, this execution published the narrower sender-subdomain policy:

```text
TXT _dmarc.notify.wandora.com.br = "v=DMARC1; p=none;"
```

Independent DNS read-back from the VPS returned the exact value.

`p=none` is intentionally monitoring-only for the first activation. Future tightening to `quarantine` or `reject` requires a separate evidence-based review after real delivery is proven.

No root `_dmarc.wandora.com.br` policy was introduced by this execution.

## PROVEN EVIDENCE — CREDENTIAL CUSTODY

One dedicated Resend credential was created through the operator console following the ADR 0096 contract:

```text
name       = wandora-gotrue-smtp-prod-v1
permission = Sending access
domain     = notify.wandora.com.br
```

The secret value was never pasted into ChatGPT, Git, the Wandora database, a Compose file or the live Supabase `.env`.

Host custody is now:

```text
/opt/wandora/data/supabase/secrets/gotrue_smtp_pass
owner = root
group = wandora-ops
mode  = 0640
size  = 36 bytes
```

Non-value structural validation proved:

```text
NONEMPTY=true
BYTE_LENGTH=36
HAS_TRAILING_NEWLINE=false
ASCII_ONLY=true
RESEND_PREFIX=true
```

Exact-value leak checks returned false for:

- `/home/wandora-admin/.bash_history`;
- live Supabase `.env`;
- live Supabase Compose text;
- `supabase-auth` process environment;
- Wandora Core process environment;
- Wandora Web process environment;
- Messaging Gateway process environment.

The provider console permission/domain configuration is operator-observed state; the Resend sending-only credential itself does not expose a machine-readable self-introspection endpoint used by this proof.

## PROVEN EVIDENCE — SMTP AUTH WITHOUT MESSAGE

The new credential was validated against the selected SMTP relay from the Wandora VPS.

The test performed:

```text
EHLO
STARTTLS
EHLO
AUTH
QUIT
```

Observed result:

```text
EHLO_CODE=250
STARTTLS_ADVERTISED=true
POST_TLS_EHLO_CODE=250
AUTH_CODE=235
QUIT_CODE=221
MAIL_FROM_ISSUED=false
RCPT_TO_ISSUED=false
DATA_ISSUED=false
```

Therefore the credential is accepted by Resend SMTP without initiating a message transaction.

No invite, recovery or test e-mail was sent.

## CAPABILITY AUTHORITY / REUSE GATE

No new Wandora mail-delivery subsystem was introduced.

Authority remains:

```text
Supabase Auth
  -> invite/recovery token + Auth-user/session/credential authority

Resend SMTP
  -> transactional message relay and sender-domain authentication

Cloudflare DNS
  -> public DNS publication

Wandora
  -> sender identity choice, rollout policy, secret custody,
     activation procedure and evidence
```

GoTrue will continue speaking standard SMTP. Wandora Web/Core must not call Resend directly for invite/recovery delivery.

## DECISION

ADR 0096 Phase A is complete.

The accepted production sender foundation is now:

```text
provider       = Resend SMTP
sender domain  = notify.wandora.com.br / VERIFIED
region         = sa-east-1
from identity  = Wandora <acesso@notify.wandora.com.br>
DKIM           = published + verified
SPF/ReturnPath = provider CNAMEs published + verified
DMARC          = _dmarc.notify / p=none
SMTP endpoint  = smtp.resend.com:587 / STARTTLS
credential     = dedicated sending-only domain-scoped operator key
custody        = /opt/wandora/data/supabase/secrets/gotrue_smtp_pass
```

This does **not** activate GoTrue SMTP.

## SECOND ADVERSARIAL REVIEW

Rejected or explicitly avoided:

- provider `Auto configure` DNS mutation — manual records preserve reviewability;
- registering `wandora.com.br` instead of the dedicated sender subdomain;
- using `mail.wandora.com.br`, which already has a different infrastructure meaning;
- using a tracking subdomain or click/open tracking for Auth mail;
- enabling inbound receiving in Resend;
- replacing or de-proxying the existing `notify.wandora.com.br` A record without need;
- applying DMARC at the root domain merely because the provider UI suggested it;
- starting with DMARC `quarantine`/`reject` before first-delivery evidence;
- placing the Resend credential in `.env`, Git, Compose or browser-visible configuration;
- creating a full-access provider key;
- validating the key by sending a message;
- altering or recreating `supabase-auth` during provider provisioning;
- changing any customer-hire, Human Send or Gateway outbound state.

## EXECUTION

This execution performed only the provider/DNS/custody effects authorized by ADR 0096 Phase A:

1. created the dedicated sender domain in Resend;
2. published exact provider-generated DKIM and sending CNAME records;
3. verified the sender domain in Resend;
4. published subdomain-specific DMARC `p=none`;
5. created the dedicated restricted SMTP credential through the operator account;
6. created protected host custody and wrote the secret directly there;
7. validated non-leak custody properties;
8. proved SMTP AUTH + immediate QUIT without a message transaction.

No live GoTrue configuration was changed.

## VALIDATION / NO-EFFECT PROOF

Post-execution live read-back:

```text
supabase-auth = healthy
wandora-web = healthy
wandora-core = healthy
wandora-messaging-gateway = healthy

GOTRUE_SMTP_HOST        = supabase-mail
GOTRUE_SMTP_PORT        = 2500
GOTRUE_SMTP_ADMIN_EMAIL = admin@example.com
GOTRUE_SMTP_SENDER_NAME = fake_sender

new Resend credential present in live service envs = false
new Resend credential present in Supabase .env = false
new Resend credential present in Compose text = false
new Resend credential present in shell history = false
```

No invite, recovery or test e-mail was emitted by the SMTP proof.

## RESULT

**Customer Owner Transactional E-mail Sender Domain + Credential Provisioning Execution V1 is complete.**

The external delivery foundation now exists and authenticates, but production Auth still deliberately uses the old non-operational relay.

## NEXT EXECUTABLE SLICE

**Customer Owner Transactional E-mail GoTrue SMTP Activation Preflight V1**

The preflight must re-read the exact live Supabase Compose/runtime, materialize the already-reviewed secret-file startup change as a versioned candidate, freeze backup/rollback and validate the exact one-service activation plan.

It must **not** recreate `supabase-auth`, change live SMTP settings or send an invite, recovery or test e-mail.
