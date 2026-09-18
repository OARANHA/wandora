# ADR 0090 — Customer Owner Invite + Recovery Production Activation Preflight V1

Status: **Accepted / preflight complete; production activation blocked by anti-abuse gate**

Date: 2026-09-18

## Context

ADR 0087 implemented invite acceptance + first-password handling, ADR 0088 selected provider-native interrupted-invite recovery, and ADR 0089 implemented the dedicated recovery Web journey. None of those Web changes are live yet.

This preflight is intentionally no-effect. It must determine whether the exact invite+recovery Web can be promoted safely and reversibly, and whether abuse protection is sufficient before the first real recovery request.

Explicitly forbidden in this preflight:

- deploy/recreate the live Web/Auth/Core;
- call real `POST /auth/v1/recover`;
- generate or send invite/recovery mail or token;
- create/mutate an Auth user;
- provision a tenant or Paperclip company;
- create provider wiring;
- create or enable tenant eligibility;
- enable Human Send or Gateway outbound.

## REAL NOW

Canonical Git at entry:

```text
main = 5f135e9070380e28c64f244c8a7126644cfa793c
PR #137 = merged
ADR 0089 = accepted / implemented / not deployed
```

Observed live runtime:

```text
Core    = wandora/core:organization-adapter-candidate-af542864d267 / healthy
Web     = wandora/web:candidate-af542864d267 / healthy
Gateway = wandora/messaging-gateway:origin-fix-94cfb4de / healthy
Auth    = supabase/gotrue:v2.196.0 / healthy
Paperclip = wandora/paperclip:v2026.831.1 / healthy

Customer Digital-Employee Hire = ON
Human Send = OFF
Gateway outbound = OFF

Auth users = 1
recovery_token users = 0
recovery_sent_at users = 0
eligibility rows = 0
enabled eligibility rows = 0
unfinished hire operations = 0
```

The live Web still predates ADR 0087/0089 and is not the owner-access activation candidate.

## PROVEN EVIDENCE

### Exact Web source provenance

The retained isolated Web build context under `/tmp/wandora-owner-recovery-web-proof` was compared against `apps/web` at the canonical `main`.

All 34 files in the build context matched the corresponding Git blobs byte-for-byte, including every application file changed by PR #137.

The PR #137 head:

```text
5e72f49888190a0d939e7f485c5621da5c0a4c21
```

and the merge commit:

```text
5f135e9070380e28c64f244c8a7126644cfa793c
```

have no file delta between them. Therefore the reviewed Web source tree used by this preflight is current-main equivalent.

The earlier ADR 0089 proof image `wandora/web:owner-recovery-proof-v1-final` is **not** a production candidate because it was deliberately built with a synthetic publishable key.

### Production-keyed local candidate

The live Supabase `ANON_KEY` exists in the protected Supabase environment and was validated read-only against `/auth/v1/settings` without displaying its value. Only its SHA-256 fingerprint was emitted:

```text
1a4b93dc5d382577c12500436b77e839cd286626097a89e0beb2aa017c02cfeb
```

A local, non-live candidate was built from the exact main-equivalent Web tree with that public browser key:

```text
tag = wandora/web:owner-access-candidate-5f135e90
manifest-list/image ID = sha256:7921ad23cd626efc9f6fc619f70fc98a5d62e862958d6534edc488e6afc21ba5
```

The build passed:

```text
TypeScript strict = green
WANDORA_WEB_OWNER_INVITE_ACCEPTANCE_V1_OK
WANDORA_WEB_FIRST_PASSWORD_CONTRACT_V1_OK
WANDORA_WEB_OWNER_INTERRUPTED_INVITE_RECOVERY_V1_OK
WANDORA_WEB_SHARED_PASSWORD_FINALIZATION_V1_OK
WANDORA_WEB_DIGITAL_EMPLOYEE_HIRE_BRIDGE_V1_OK
WANDORA_WEB_CUSTOMER_HIRE_BROWSER_IDEMPOTENCY_V1_OK
WANDORA_WEB_CUSTOMER_HIRE_TENANT_AVAILABILITY_V1_OK
Vite production build = green
```

An isolated container proved the candidate contains the expected public-key fingerprint and preserves the reviewed route boundary:

```text
PUBLISHABLE_KEY_FINGERPRINT_MATCH = true
/healthz       = 200
/login         = 200
/accept-invite = 200
/recover-access = 200
/api/v1/me     = 401 without session
WANDORA_OWNER_ACCESS_CANDIDATE_SMOKE_OK
```

The smoke container was removed. The candidate image is only staged locally and is not running.

### Redirect/origin contract

Live Auth configuration remains:

```text
GOTRUE_SITE_URL = https://app.wandora.com.br
GOTRUE_URI_ALLOW_LIST = https://app.wandora.com.br/**,http://localhost:3000/**,http://localhost:5173/**
GOTRUE_DISABLE_SIGNUP = true
GOTRUE_EXTERNAL_EMAIL_ENABLED = true
GOTRUE_MAILER_AUTOCONFIRM = false
```

A read-only CORS preflight to the exact public recovery endpoint from the Wandora app origin returned:

```text
OPTIONS /auth/v1/recover = 200
Access-Control-Allow-Origin = https://app.wandora.com.br
```

No recovery POST was sent.

The Web implementation's exact redirect target remains:

```text
https://app.wandora.com.br/recover-access
```

which is covered by the live Auth allow-list.

### Rollback shape

The live Web image is still:

```text
wandora/web:candidate-af542864d267
```

A disposable Compose render proved that selecting the new candidate changes only the Web image reference:

```text
candidate = wandora/web:owner-access-candidate-5f135e90
rollback  = wandora/web:candidate-af542864d267
```

No live Compose or env file was modified.

## GAPS

The remaining blocker is **anti-abuse protection for unauthenticated recovery requests**.

Live GoTrue has no configured CAPTCHA in the container environment:

```text
GOTRUE_SECURITY_CAPTCHA_ENABLED = absent
GOTRUE_SECURITY_CAPTCHA_PROVIDER = absent
```

and no explicit `GOTRUE_RATE_LIMIT_EMAIL_SENT` override is present.

The current Web recovery request sends e-mail + `redirect_to`, but no CAPTCHA token. Enabling provider-native CAPTCHA without a corresponding Web change would therefore make the implemented recovery request fail rather than safely activate it.

The public Supabase API Traefik router currently has no recovery-specific rate-limit middleware. A rate limiter that trusts `CF-Connecting-IP`/forwarded headers at Traefik is not accepted as sufficient in the present topology because:

- Traefik binds HTTPS on `0.0.0.0:443`;
- a direct-origin path to the Supabase router was proven locally with the same host/TLS routing;
- there is no proven Cloudflare-only origin restriction in this preflight.

Therefore the proxy cannot safely treat a Cloudflare-supplied client-IP header as authoritative until origin access is explicitly constrained.

A read-only Cloudflare API check using the already-installed DNS token proved:

```text
zone lookup = 200 / readable
http_ratelimit ruleset lookup = 403
```

The current token cannot attest whether an appropriate recovery rule already exists. No Cloudflare rule was created or modified.

## CAPABILITY AUTHORITY / REUSE GATE

Credential recovery remains a Supabase Auth capability. Wandora must not build a recovery-token service merely to solve abuse control.

Abuse protection belongs at the Auth provider and/or public edge. The minimum Wandora-owned responsibility is to choose and verify a compatible control without changing the provider-owned recovery lifecycle.

## DECISION

**Do not activate the invite+recovery Web yet.**

The exact Web candidate, redirect/origin contract, rollback and post-deploy checks are ready, but the production activation gate remains closed until an anti-abuse control is actually observable and proven.

Preferred next direction is a Cloudflare edge rate-limit/abuse rule scoped as narrowly as the account plan allows to the public recovery endpoint. This is preferred over immediately enabling GoTrue CAPTCHA because it is compatible with the already-reviewed Web request body and does not require introducing a CAPTCHA widget/token contract merely to close the first beta recovery gate.

If the available Cloudflare plan cannot express an acceptably narrow rule, the fallback is a separately reviewed Web + GoTrue Turnstile/hCaptcha implementation that supplies the exact provider-required CAPTCHA token.

No assumption about the current Cloudflare plan or existing rules is accepted without evidence.

## SECOND ADVERSARIAL REVIEW

The provisional idea “just enable CAPTCHA” was rejected: the current Web does not send a CAPTCHA token, so that would break recovery.

The idea “add a Traefik rate limit using the Cloudflare IP header” was rejected: the origin is not proven Cloudflare-only, so a client reaching the origin directly could make the forwarded-header trust boundary ambiguous/spoofable.

The idea “provider defaults are enough” was rejected: provider frequency/rate controls are useful defense-in-depth, but ADR 0088 explicitly required an activation abuse-control decision and current CAPTCHA is off.

The idea “the Cloudflare orange-cloud path means a WAF rule must already protect it” was rejected: the available token can read the zone but receives 403 for the rate-limit ruleset, so no such rule is proven.

The idea “deploy now and configure abuse protection before the first manual test” was rejected: deploying `/recover-access` makes the public recovery request available to unauthenticated users immediately. The protection must exist before Web promotion, not after.

The candidate itself survived adversarial review: current-main source equivalence, real public-key wiring, route smoke and image-only rollback were independently proven.

## EXECUTION

This preflight executed only reversible/non-live proof work:

- Git/main/ADR reconciliation;
- read-only live runtime/Auth/database inspection;
- exact source-tree hash comparison;
- local candidate image build;
- isolated candidate route smoke;
- disposable Compose render for candidate/rollback;
- read-only public CORS/settings probes;
- read-only Cloudflare zone/ruleset permission probe.

It did not deploy or recreate production services and did not generate any invite/recovery effect.

## FUTURE ACTIVATION CONTRACT — FROZEN BUT NOT AUTHORIZED

After the anti-abuse gate is closed in a separate reviewed slice, the Web activation may use this bounded sequence:

1. prove the exact edge/provider abuse control is active;
2. reverify `main`, candidate source equivalence and candidate image digest;
3. capture current live Web image/restart/health as rollback metadata;
4. change only `WANDORA_WEB_IMAGE` to the reviewed candidate;
5. recreate only `wandora-web`;
6. require healthy state and zero restart loop;
7. require public `/login`, `/accept-invite`, `/recover-access` = 200;
8. require unauthenticated `/api/v1/me` = 401;
9. reverify Auth public-signup remains disabled and redirect allow-list unchanged;
10. reverify Customer Hire = ON, eligibility = 0, unfinished hires = 0, Human Send = OFF, Gateway outbound = OFF;
11. reverify Auth recovery-token/sent counters remain zero until a separately authorized real recovery test.

Rollback is image-only: restore `wandora/web:candidate-af542864d267`, recreate only Web and rerun the same health/route boundary checks.

The first real invite/recovery remains a separate effect and is not authorized by this ADR.

## VALIDATION / NO-EFFECT RESULT

Post-preflight production remains:

```text
live Web = wandora/web:candidate-af542864d267 / healthy
owner-access candidate = staged locally / NOT running

Customer Digital-Employee Hire = ON
eligibility rows = 0
enabled eligibility rows = 0
unfinished hire operations = 0
Human Send = OFF
Gateway outbound = OFF

Auth users = 1
recovery_token users = 0
recovery_sent_at users = 0
```

No real invite/recovery was requested or generated. No Auth user, tenant, Paperclip/provider state or eligibility changed.

## DECISION RESULT

**Customer Owner Invite + Recovery Production Activation Preflight V1 is complete, but production activation is NOT AUTHORIZED yet.**

The blocker is narrow and explicit: prove and activate compatible anti-abuse protection for the unauthenticated recovery endpoint before promoting the owner-access Web candidate.

## NEXT EXECUTABLE SLICE

**Customer Owner Recovery Edge Anti-Abuse Control Preflight V1**

No recovery/invite, Web deploy, tenant provisioning or eligibility effect. Inspect the actual Cloudflare account capability/rules with an authorized Rulesets-capable credential or operator surface, freeze the narrowest workable rule and rollback, and only then authorize a separate anti-abuse activation/execution step.
