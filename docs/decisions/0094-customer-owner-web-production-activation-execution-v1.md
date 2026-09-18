# ADR 0094 — Customer Owner Invite + Recovery Web Production Activation Execution V1

Status: **Accepted / execution complete**

Date: 2026-09-18

## Context

ADR 0090 froze the production activation contract for the owner invite + recovery Web candidate but blocked deployment until recovery anti-abuse was proven.

ADR 0093 completed and validated the Cloudflare recovery edge guard.

This ADR records the subsequent production promotion of only the already-proven owner-access Web image.

A real invite/recovery remains outside this deployment transaction.

## REAL NOW

Canonical Git entry state:

```text
main = f294ea56a4c3c77984103c42b0ff52f0576b9230
ADR 0090 = owner-access Web activation contract accepted
ADR 0093 = recovery edge anti-abuse execution complete
```

No `apps/web/` file changed between the candidate source base:

```text
5f135e9070380e28c64f244c8a7126644cfa793c
```

and current `main`.

The production candidate therefore remains source-equivalent to current main.

## PROVEN CANDIDATE

Candidate:

```text
wandora/web:owner-access-candidate-5f135e90
image id =
sha256:7921ad23cd626efc9f6fc619f70fc98a5d62e862958d6534edc488e6afc21ba5
```

Before promotion it was present locally and not running.

The current compose contract was:

```yaml
image: ${WANDORA_WEB_IMAGE:-wandora/web:preview-v1}
container_name: wandora-web
```

Only one production selector existed:

```text
WANDORA_WEB_IMAGE=wandora/web:candidate-af542864d267
```

Pre-change `.env` SHA-256:

```text
5c7531af407deb4871ea8adb332019dfbe8cd4d18a900eb611f4efe649a98ae9
```

Rollback image:

```text
wandora/web:candidate-af542864d267
```

## PRE-DEPLOY SAFETY GATES

Immediately before deployment:

```text
live Web = wandora/web:candidate-af542864d267 / healthy / restarts 0
Core = healthy / restarts 0
Auth = healthy / restarts 0

Customer Digital-Employee Hire = ON
Human Send = OFF
Gateway outbound = OFF

Auth users = 1
recovery_token rows = 0
recovery_sent rows = 0
eligibility rows = 0
enabled eligibility rows = 0
unfinished hire operations = 0
```

The Cloudflare recovery edge guard was revalidated immediately before deploy using OPTIONS only:

```text
baseline = 200
burst 1..6 = 200
burst 7..8 = 429
after mitigation window = 200
```

No recovery POST was sent.

## SECOND ADVERSARIAL REVIEW

The production transaction was deliberately limited to:

1. verify exact current rollback image;
2. verify exact candidate image ID;
3. render candidate compose configuration without mutating live state;
4. change only `WANDORA_WEB_IMAGE`;
5. recreate only service `web` / container `wandora-web`;
6. require healthy state and zero restarts;
7. preserve immediate rollback to the previous image;
8. validate public routes and authorization boundary externally;
9. preserve all Auth/hire/outbound invariants.

Rejected:

- rebuilding the candidate;
- changing compose;
- restarting Core/Auth/Gateway;
- changing Cloudflare/Auth configuration;
- enabling eligibility;
- issuing a real invite/recovery in the deployment transaction;
- retaining a redundant rollback copy of the env after successful validation.

## EXECUTION

The live Web env was changed from:

```text
WANDORA_WEB_IMAGE=wandora/web:candidate-af542864d267
```

to:

```text
WANDORA_WEB_IMAGE=wandora/web:owner-access-candidate-5f135e90
```

Only the Web service was recreated:

```text
wandora-web Recreate
wandora-web Recreated
wandora-web Starting
wandora-web Started
```

Health polling:

```text
poll 1 = running / starting / restarts 0
poll 2 = running / starting / restarts 0
poll 3 = running / starting / restarts 0
poll 4 = running / healthy / restarts 0
```

Container-local health:

```text
/healthz = ok
```

Final live Web:

```text
image = wandora/web:owner-access-candidate-5f135e90
id = sha256:7921ad23cd626efc9f6fc619f70fc98a5d62e862958d6534edc488e6afc21ba5
health = healthy
restarts = 0
```

Final live `.env` SHA-256:

```text
a3846a22be4b116b02bd92d4649aa1d632f2d823b2dede90060c88d02fffc4f3
```

The temporary rollback env copy was removed only after full validation.

## PUBLIC VALIDATION

From independent authorized `28server`:

```text
GET /login = 200
GET /accept-invite = 200
GET /recover-access = 200
GET /api/v1/me without session = 401
```

Recovery CORS preflight after deployment:

```text
OPTIONS /auth/v1/recover = 200
```

Direct origin after deployment:

```text
TCP public-origin:443
rc = 124 / timeout
reachable = false
```

## POST-DEPLOY INVARIANTS

```text
Auth signup disabled = true
Auth SITE_URL = https://app.wandora.com.br
GoTrue CAPTCHA = absent/off

Customer Digital-Employee Hire = ON
Human Send = OFF
Gateway outbound = OFF

Auth users = 1
recovery_token rows = 0
recovery_sent rows = 0
eligibility rows = 0
enabled eligibility rows = 0
unfinished hire operations = 0
```

No invite/recovery was generated or sent.

No tenant/provider/eligibility state changed.

## ROLLBACK

If a production defect is discovered, rollback is image-only:

```text
WANDORA_WEB_IMAGE=wandora/web:candidate-af542864d267
```

then recreate only `wandora-web`, require healthy/restarts 0, and repeat the same public route and invariant checks.

Do not roll back the independently validated Cloudflare recovery anti-abuse rule merely because the Web image is rolled back.

## GITHUB ACTIONS INFRASTRUCTURE EXCEPTION

PR #142 triggered the five normal repository workflows. Each job ended before runner execution with `steps=null` and `logs_url=null`:

```text
Core CI #390 / run 35406278866
Web CI #327 / run 35406278838
Platform Admin CI #252 / run 35406278895
Messaging Gateway CI #359 / run 35406278822
Organization Adapter Plugin CI #72 / run 35406278854
```

These checks are not classified green and are not treated as code/test failures because no workflow step executed. The PR is documentation-only; the production Web activation was independently validated against the live runtime and external routes as recorded above.

## RESULT

**Customer Owner Invite + Recovery Web Production Activation Execution V1 is complete and validated.**

The production customer Web now contains the reviewed owner invite acceptance and interrupted-invite recovery surfaces.

This does not prove a real e-mail/provider delivery flow yet, because no real invite or recovery was authorized in this slice.

## NEXT EXECUTABLE SLICE

**Customer Owner First Real Access End-to-End Validation Preflight V1**

No-effect preflight only.

The next slice must select the exact test owner/tenant state, freeze which real external effects will later be permitted, verify e-mail/provider configuration, freeze idempotency and rollback/recovery expectations, and decide whether the first controlled proof should exercise a fresh invite, interrupted invite recovery, or both.

Do not send an invite/recovery during the preflight itself.

After the preflight survives adversarial review, any first real invite/recovery must be a separate explicitly bounded execution.
