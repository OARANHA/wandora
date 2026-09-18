# ADR 0077 — Customer Hire Canary Private Candidate Core Hire Preflight V1

- Status: **Accepted preflight — hire NOT executed**
- Date: 2026-09-18
- Scope: freeze the exact private production-connected Core artifact, temporary human-auth session boundary, one-shot customer-hire request, replay/no-duplicate proofs and teardown rules before the first paused-first customer-like production hire

## REAL NOW

Canonical Git entering this preflight:

```text
main = 925c20e7b1671bba4a30a727af15afa3ba585570
PR #121 = merged
open PRs = 0
```

The clean customer-hire canary is fully wired but still employee-free:

```text
Wandora organization
  id = 918d4c7e-fccb-41f0-aba7-04105a9b4ec0

Paperclip company
  id = e7422a00-1474-49d5-ac32-34594520015e

Wandora control-plane binding = 1
Core deterministic HMAC custody = present/readable
Paperclip company HMAC secret = 1 active local_encrypted
Paperclip plugin config = exact hmacSecret secret_ref
Paperclip canary agents = 0

Wandora digital employees = 0
Wandora employee-provider bindings = 0
Wandora hire operations = 0
```

Runtime effect boundary remains:

```text
live Core Organization Adapter = ON
live Core Customer Digital-Employee Hire = OFF
Human Send = OFF
Gateway outbound = OFF
```

## PROVEN CUSTOMER-HIRE IMPLEMENTATION

PR #109 / ADR 0064 remains the accepted customer-hire implementation.

Canonical customer route:

```http
POST /api/v1/organizations/918d4c7e-fccb-41f0-aba7-04105a9b4ec0/digital-employees
Authorization: Bearer <real Supabase human access token>
Idempotency-Key: <stable key>
Content-Type: application/json

{"catalogKey":"ana-commercial-v1"}
```

The route requires:

- Human API enabled;
- Organization Adapter enabled;
- dedicated Customer Digital-Employee Hire gate enabled;
- an authenticated human session;
- owner/admin authorization in the target organization;
- a non-empty idempotency key no longer than 255 characters;
- exact catalog-key body validation.

First successful catalog hire finalizes Wandora state as:

```text
name = Ana
role = commercial-assistant
status = paused
autonomy = supervised
```

The customer response contains only Wandora-owned employee fields:

```text
id
name
role
status
autonomy
```

Provider company refs, provider agent refs, HMAC refs and credentials do not cross the customer response.

## EXACT CANDIDATE ARTIFACT

Do not rebuild merely because the production VPS does not currently hold the image.

The already-green PR #109 Core Candidate Artifact remains available:

```text
workflow run = 35313526898
artifact id = 10534402346
artifact name =
  core-organization-adapter-candidate-2563bdebad05711e36bfc765d058ae7cbe5f8cee

artifact digest =
  sha256:e4c7c447fcaaf2e3906436f52a2178ebb95181557aeb937737ae2174ea9b1afc

artifact expiry = 2026-09-25T06:08:37Z
```

Manifest:

```text
candidate_contract = organization-adapter-core-v1
source_sha = 2563bdebad05711e36bfc765d058ae7cbe5f8cee
source_tree_sha = f61ab52f32e20d1bab4a5e70626162923601945b

image_tag =
  wandora/core:organization-adapter-candidate-2563bdebad05

runner_image_id / oci_config_digest =
  sha256:e40a82348bb07356b2a8c967a8b7d7d52b2a53b0ac77b2744086d7def9d3460e

oci_manifest_digest =
  sha256:af1437525490d9961bfdd22ab0c7c999681dd116b87b6d11336c1445a4d6878c

archive_sha256 =
  a8d8f6c9a7be1958e88bf588011c792683b601908c2a290f45e0840d7395630e

image_user = node
```

## SOURCE EQUIVALENCE PROOF

The candidate source SHA is a GitHub PR merge-ref commit, so commit-history comparison alone is misleading.

Direct blob comparison proved the following files are byte-identical between candidate source `2563bdeb...` and current canonical source:

```text
apps/core/src/organization-adapter/contracts.ts
apps/core/src/organization-adapter/service.ts
apps/core/src/runtime/config.ts
apps/core/src/runtime/human-supervision.ts
apps/core/src/runtime/main.ts
apps/core/src/runtime/server.ts
apps/core/Dockerfile
apps/core/package.json
apps/core/package-lock.json

infra/stacks/core/compose.human-api.yaml
infra/stacks/core/compose.organization-adapter.yaml
infra/stacks/core/compose.human-digital-employee-hire.yaml
```

The candidate image itself was independently inspected and contains:

- the dedicated `WANDORA_HUMAN_DIGITAL_EMPLOYEE_HIRE_ENABLED` gate;
- the exact digital-employees POST route;
- legacy collision fail-closed behavior;
- paused-first finalization;
- same-key/catalog replay logic.

Therefore this existing candidate is the preferred production canary artifact.

## PRIVATE CANDIDATE COMPOSITION

Future container name:

```text
wandora-core-hire-canary-v1
```

The candidate must:

- publish **no host ports**;
- use no public reverse-proxy/Cloudflare route;
- use no alias `wandora-core`;
- use restart policy `no`;
- join only the existing private networks needed by its dependencies:

```text
wandora-core
wandora-data
```

Private dependency aliases already proven live:

```text
wandora-postgres -> production Supabase PostgreSQL on wandora-data
wandora-paperclip:3100 -> production Paperclip on wandora-core
```

Read-only mounts:

```text
/opt/wandora/stacks/core/secrets/wandora_core_db_password
  -> /run/secrets/wandora_core_db_password

/opt/wandora/secrets/organization-adapter
  -> /run/secrets/wandora/organization-adapter
```

Required candidate runtime:

```text
PORT=8788
WANDORA_CORE_MODE=database

WANDORA_CORE_DB_HOST=wandora-postgres
WANDORA_CORE_DB_PORT=5432
WANDORA_CORE_DB_NAME=postgres
WANDORA_CORE_DB_USER=wandora_core_runtime
WANDORA_CORE_DB_PASSWORD_FILE=/run/secrets/wandora_core_db_password

WANDORA_HUMAN_API_ENABLED=true
WANDORA_AUTH_JWKS_URL=https://supabase.wandora.com.br/auth/v1/.well-known/jwks.json
WANDORA_AUTH_ISSUER=https://supabase.wandora.com.br/auth/v1
WANDORA_AUTH_AUDIENCE=authenticated

WANDORA_ORGANIZATION_ADAPTER_ENABLED=true
WANDORA_ORGANIZATION_ADAPTER_WEBHOOK_URL=
  http://wandora-paperclip:3100/api/plugins/wandora.organization-adapter-v1/webhooks/employee-reconcile
WANDORA_ORGANIZATION_ADAPTER_SECRET_DIRECTORY=
  /run/secrets/wandora/organization-adapter

WANDORA_HUMAN_DIGITAL_EMPLOYEE_HIRE_ENABLED=true
```

Explicitly keep disabled/absent in the candidate:

```text
WANDORA_GATEWAY_INGRESS_ENABLED=false
WANDORA_AGENT_RUNTIME_MODE=disabled
WANDORA_HUMAN_SEND_PROPOSAL_ENABLED=false
```

The candidate must return:

```text
GET /healthz -> 200 / status=ok
GET /readyz  -> 200 / status=ready
```

before any authenticated business request is sent.

## REAL HUMAN SESSION SOURCE

The canary has exactly one active owner mapped to provider `supabase`.

Read-only Auth proof at preflight:

```text
owner Supabase identities = 1
active auth.sessions for that principal = 7
unrevoked refresh chains = 7
```

No existing refresh token may be consumed for this canary because refresh-token rotation could disturb the user's browser/device sessions.

Instead, execution will create one **separate temporary Supabase Auth session for the same existing owner**.

The live Auth runtime is:

```text
supabase/gotrue:v2.196.0
private service alias = supabase-auth
private port = 9999
```

Execution contract:

1. resolve the canonical canary owner -> existing Supabase Auth user inside the operator boundary;
2. read the existing service-role credential from the private Supabase stack without printing it;
3. use the private `supabase-auth:9999` endpoint;
4. call admin magic-link generation for the existing owner only;
5. do not send an email;
6. exchange the returned token hash through the normal OTP verification path to create a new Auth session;
7. keep access/refresh tokens only in protected temporary process/file state;
8. never print, commit or place them in argv;
9. use that access token as the Bearer for `GET /api/v1/me` and the hire POST;
10. after all replay validation, revoke **only that temporary session** using local-session sign-out semantics;
11. prove the pre-existing session population remains intact.

The temporary session must not modify owner identity, membership or user metadata.

## AUTHORIZATION PRECHECK

Before hire:

```text
GET /api/v1/me
Authorization: Bearer <temporary real owner session>
```

must return 200.

The target organization must be present in that session's authorized organization projection with owner/admin capability sufficient for the existing Organization Adapter service.

Any 401/403 stops before hire.

## FROZEN HIRE REQUEST

Primary idempotency key:

```text
customer-hire-canary:ana-commercial-v1:v1
```

Alternate same-catalog replay key:

```text
customer-hire-canary:ana-commercial-v1:v1-alt
```

Body bytes:

```json
{"catalogKey":"ana-commercial-v1"}
```

The primary request is sent once.

There is no automatic HTTP retry.

## EXPECTED FIRST-HIRE POSTCONDITIONS

Wandora:

```text
digital employees for canary = 1
employee status = paused
employee autonomy = supervised
employee role = commercial-assistant

digital-employee provider bindings for canary = 1
hire operations for canary/catalog = 1
hire operation status = completed
```

Paperclip:

```text
canary managed agents = exactly 1
agent key/catalog identity = ana-commercial-v1
display name = Ana
role = commercial-assistant
adapterType = wandora_mastra
status = paused
```

The provider agent may exist, but activation/work execution is not authorized.

## RESPONSE NON-LEAKAGE

First response must be 200 with exactly a Wandora-owned employee projection.

Reject as a preflight failure if the customer response exposes any of:

```text
providerCompanyRef
provider_company_ref
providerAgentRef
provider_agent_ref
secretId
hmac
token
credential
```

## REPLAY PROOF

After first success and independent durable/provider readback:

### Same-key replay

Repeat the exact POST with:

```text
Idempotency-Key: customer-hire-canary:ana-commercial-v1:v1
```

Expected:

- 200;
- same Wandora employee ID;
- employee count remains 1;
- hire-operation count remains 1;
- Paperclip managed-agent count remains 1.

### Different-key / same-catalog replay

Then send the same body with:

```text
Idempotency-Key: customer-hire-canary:ana-commercial-v1:v1-alt
```

Expected:

- 200;
- same Wandora employee ID;
- no second hire-operation row;
- no second employee-provider binding;
- no second Paperclip agent.

This proves catalog-level deduplication in addition to request-key replay.

## AMBIGUITY / FAILURE POLICY

### Candidate startup/readiness failure

Remove only the candidate container. Do not mutate live Core, Paperclip or Wandora state.

### Temporary Auth session failure

Stop before hire and clean only temporary Auth/session material.

Never consume an existing browser refresh token as fallback.

### Initial hire transport ambiguity

Do **not** issue another first-time POST blindly.

First reconcile:

- Wandora hire operation under the frozen primary key;
- Wandora employee/provider-binding counts;
- Paperclip managed agent list for the canary company.

If an operation exists in `uncertain`, only the **same primary idempotency key** may be used to re-enter the adapter contract.

### 409 / uncertain response

Honor the route contract:

```text
retry = same-idempotency-key
```

Never switch to the alternate key while first-hire state is uncertain.

### Durable success but later validation failure

Preserve the hired paused employee/agent. Do not delete a successful production hire merely because a later readback check failed.

Investigate in a separate reviewed recovery slice.

## CANDIDATE TEARDOWN

After all proofs:

1. revoke only the temporary Supabase Auth session;
2. delete its protected temporary token material;
3. stop/remove `wandora-core-hire-canary-v1`;
4. remove the imported candidate image only if no other reviewed proof depends on it;
5. prove no candidate container/network alias/public port remains;
6. leave normal `wandora-core` untouched with customer-hire gate OFF;
7. leave the successful Ana hire paused;
8. leave Human Send and Gateway outbound OFF.

## SECOND ADVERSARIAL REVIEW

Rejected:

- enabling customer hire on the public/live Core merely for the canary;
- rebuilding a candidate when the exact reviewed artifact still exists;
- trusting artifact name alone without manifest/archive/OCI verification;
- treating the PR merge-ref SHA as stale without content comparison;
- publishing a candidate port on loopback or public interfaces;
- giving the candidate the `wandora-core` DNS alias;
- enabling Gateway ingress or Mastra runtime when hire does not require them;
- enabling Human Send or Gateway outbound;
- reusing or refreshing any of the owner's seven existing sessions;
- printing owner email, provider subject, access token, refresh token or service-role token;
- passing bearer token in argv;
- blind retry after a lost/ambiguous first-hire response;
- using the alternate key before the primary operation is proven complete;
- activating the Paperclip agent as part of hire;
- destructive rollback after a durable successful paused hire.

## EFFECT BOUNDARY

This preflight performs **no customer-hire mutation**.

Still true:

```text
canary Wandora employees = 0
canary employee-provider bindings = 0
canary hire operations = 0
canary Paperclip agents = 0

live Core Customer Digital-Employee Hire = OFF
Human Send = OFF
Gateway outbound = OFF

private candidate container = absent
temporary canary Auth session = absent
```

## DECISION

**Customer Hire Canary — Private Candidate Core Hire Preflight V1 is complete as a plan.**

The exact reviewed candidate artifact, private topology, temporary real-owner session path, first-hire request, replay semantics, ambiguity rules and teardown are frozen.

## NEXT EXECUTABLE SLICE

**Customer Hire Canary — Private Candidate Core Hire Execution V1.**

Load and verify the frozen artifact, start the no-ingress private candidate, create one separate temporary Supabase owner session, prove `/me`, issue the primary hire exactly once, independently validate paused Wandora/Paperclip state, prove same-key and alternate-key/same-catalog no-duplicate behavior, revoke only the temporary session and remove the candidate.

Do not enable the normal live Core hire gate, activate Ana, Human Send or Gateway outbound.
