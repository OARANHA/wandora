# ADR 0093 — Customer Owner Recovery Edge Anti-Abuse Credential + Activation Execution V1

Status: **Accepted / execution complete**

Date: 2026-09-18

## Context

ADR 0091 selected the exact Cloudflare Free-plan recovery anti-abuse rule.

ADR 0092 stopped execution before mutation because no dedicated WAF credential/custody path existed.

The operator then issued a separate Cloudflare token scoped only to `wandora.com.br` with the reviewed Zone Read + Zone WAF Edit authority and installed it at the reviewed host-secret path.

This ADR records the completed Cloudflare edge activation and its post-change validation.

The owner-access Web remains deliberately undeployed in this slice.

## REAL NOW

Canonical Git entry state:

```text
main = fcc6151309c1e1ccf69b50b250a366b5e1e55236
ADR 0091 = anti-abuse design accepted
ADR 0092 = pre-mutation credential gate accepted
```

Production before/after the edge change:

```text
live Web = wandora/web:candidate-af542864d267 / healthy / restarts 0
live Auth = supabase/gotrue:v2.196.0 / healthy / restarts 0

owner-access candidate =
  wandora/web:owner-access-candidate-5f135e90
  image id = sha256:7921ad23cd626efc9f6fc619f70fc98a5d62e862958d6534edc488e6afc21ba5
  present locally = true
  running = false
```

No Web/Auth/Core deploy occurred during this slice.

## PROVEN CREDENTIAL CUSTODY

Dedicated WAF token file:

```text
/opt/wandora/data/cloudflare/secrets/recovery_ratelimit_api_token
owner = root:wandora-ops
mode = 0640
size = 53 bytes
```

The token value was never committed or emitted into canonical docs/log output.

The existing Traefik DNS token was not changed or widened.

## PROVEN PRE-MUTATION RULESET STATE

Read-only Cloudflare entry-point request returned:

```text
HTTP_STATUS = 404
SUCCESS = false
ERROR_CODE = 10003
ERROR_MESSAGE =
  could not find entrypoint ruleset in the http_ratelimit phase
```

This proved that no `http_ratelimit` entry-point ruleset existed yet for the zone.

The Free-plan single rule slot was therefore not occupied by pre-existing rate-limit state.

## DECISION / REVIEWED RULE

The exact reviewed rule remained unchanged from ADR 0091:

```text
ref = wandora_owner_recovery_burst_guard_v1
phase = http_ratelimit
expression =
  http.request.uri.path eq "/auth/v1/recover"
action = block

ratelimit:
  characteristics =
    - cf.colo.id
    - ip.src
  period = 10 seconds
  requests_per_period = 6
  mitigation_timeout = 10 seconds
```

## SECOND ADVERSARIAL REVIEW

The final pre-mutation review preserved the earlier decisions:

- do not widen the DNS token;
- do not rate-limit all Auth endpoints;
- do not enable GoTrue CAPTCHA without a reviewed browser CAPTCHA token contract;
- do not add Wandora recovery state/proxy solely for abuse control;
- do not deploy owner-access Web in the same edge-control transaction;
- do not validate the rule with a real recovery POST;
- stop rather than replace an existing ruleset if one appears between preflight and mutation.

The creation transaction therefore rechecked the entry-point immediately before creation and aborted on any state other than the known `404 / 10003` missing-entrypoint result.

## EXECUTION

The reviewed transaction:

1. resolved only the active `wandora.com.br` zone;
2. re-read the `http_ratelimit` entry point immediately before mutation;
3. reconfirmed `404 / 10003`;
4. created one zone-level entry-point ruleset containing only the reviewed recovery rule;
5. read the entry point back;
6. compared exact phase/action/expression/rate fields.

Cloudflare creation result:

```text
ZONE_OK = true
PLAN = Free Website
PRECHECK_HTTP = 404
FREE_SLOT_CONFIRMED = true

CREATE_HTTP = 200
CREATE_SUCCESS = true

VERIFY_HTTP = 200
RULESET_ID = 56c46388452f4328b27a6e6bf5f55cc8
RULE_ID = 77758d45428d43fa8c8810569579f90f
RULE_COUNT = 1
RULE_REF = wandora_owner_recovery_burst_guard_v1
ACTION = block
EXPRESSION =
  http.request.uri.path eq "/auth/v1/recover"
PERIOD = 10
REQUESTS_PER_PERIOD = 6
MITIGATION_TIMEOUT = 10
EXACT_MATCH = true
```

## VALIDATION

### Behavioral validation — OPTIONS only

Validation used only CORS preflight `OPTIONS` requests from the independent authorized `28server`.

No `POST /auth/v1/recover` was sent.

Baseline:

```text
OPTIONS /auth/v1/recover = 200
```

Controlled burst:

```text
1 = 200
2 = 200
3 = 200
4 = 200
5 = 200
6 = 200
7 = 429
8 = 429
9 = 200
10 = 429
11 = 429
12 = 429
```

The short interleaving of a `200` after initial `429` is compatible with the already-reviewed Cloudflare enforcement/counter behavior and does not change the result: a bounded burst demonstrably triggers edge mitigation.

After 12 seconds:

```text
OPTIONS /auth/v1/recover = 200
```

This proves the mitigation self-clears after the reviewed window.

### Auth no-effect proof

After the OPTIONS-only validation:

```text
Auth users = 1
recovery_token rows = 0
recovery_sent rows = 0
```

No recovery email/token/state was generated.

### Product/runtime invariants

After edge activation:

```text
Customer Digital-Employee Hire = ON
eligibility rows = 0
enabled eligibility rows = 0
unfinished hire operations = 0
Human Send = OFF
Gateway outbound = OFF
```

### Direct-origin negative proof

A TCP connection from the independent authorized `28server` directly to the Wandora origin public address on port 443 timed out:

```text
DIRECT_ORIGIN_TCP_RC = 124
DIRECT_ORIGIN_TCP_REACHABLE = false
```

The edge rule therefore did not expose or create a new direct-origin bypass.

## ROLLBACK METADATA

Rollback target:

```text
ruleset id = 56c46388452f4328b27a6e6bf5f55cc8
rule id = 77758d45428d43fa8c8810569579f90f
stable ref = wandora_owner_recovery_burst_guard_v1
```

Rollback must delete only the reviewed rule/stable ref, then read the entry point back and prove the ref is absent.

Do not replace the entire ruleset and do not touch unrelated Cloudflare state.

If Cloudflare leaves an otherwise empty entry-point ruleset after rule deletion, that empty no-effect provider state is acceptable.

## RESULT

**Customer Owner Recovery Edge Anti-Abuse Credential + Activation Execution V1 is complete and validated.**

The public recovery endpoint now has a proven Cloudflare edge burst guard.

No owner-access Web deploy occurred.

No invite/recovery was requested or generated.

No tenant/provider/eligibility mutation occurred.

Human Send and Gateway outbound remain OFF.

## NEXT EXECUTABLE SLICE

**Customer Owner Invite + Recovery Web Production Activation Execution V1**

The next slice may promote only the already-proven owner-access Web candidate:

```text
wandora/web:owner-access-candidate-5f135e90
sha256:7921ad23cd626efc9f6fc619f70fc98a5d62e862958d6534edc488e6afc21ba5
```

Activation contract remains the one frozen by ADR 0090:

1. reverify current `main`;
2. reverify candidate image digest/source provenance;
3. reverify recovery edge guard still behaves;
4. capture current Web rollback image;
5. change only `WANDORA_WEB_IMAGE`;
6. recreate only `wandora-web`;
7. require healthy/no restart loop;
8. require `/login`, `/accept-invite`, `/recover-access` = 200;
9. require unauthenticated `/api/v1/me` = 401;
10. preserve Auth signup disabled;
11. preserve Hire ON, eligibility 0, unfinished hires 0, Human Send OFF and Gateway outbound OFF;
12. preserve recovery token/sent counters at zero until a separately authorized real invite/recovery test.

Rollback restores:

```text
wandora/web:candidate-af542864d267
```

A real invite/recovery remains a separate effect and is not authorized by this ADR.
