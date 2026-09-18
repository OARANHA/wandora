# ADR 0077 — Customer Hire Canary Private Candidate Core Hire Preflight V1

- Status: **Accepted preflight — candidate image staged; no hire executed**
- Date: 2026-09-18
- Scope: freeze the exact private production-connected Core candidate, human-session boundary, canary request/replay semantics, expected paused-first result and cleanup before the first customer-like hire effect

## REAL NOW

Canonical Git entering this preflight:

```text
main = 925c20e7b1671bba4a30a727af15afa3ba585570
PR #121 = merged
open PRs = 0
```

ADR 0076 has made the customer-hire canary Organization Adapter wiring canonical.

Live canary boundary:

```text
Wandora organization = 918d4c7e-fccb-41f0-aba7-04105a9b4ec0
Paperclip company     = e7422a00-1474-49d5-ac32-34594520015e

control-plane binding = exactly 1
Organization Adapter config/HMAC = green
Paperclip canary agents = 0
Wandora digital employees = 0
digital-employee provider bindings = 0
hire operations = 0
```

Frozen first-hire key is not yet present:

```text
customer-hire-canary:ana-commercial-v1:v1
count = 0
```

The existing canonical owner remains:

```text
Wandora user = e1000000-0000-4000-8000-000000000001
active canary owner memberships = 1
Supabase identities for owner = 1
```

The normal live Core remains:

```text
Organization Adapter = ON
Customer Digital-Employee Hire = OFF / absent
Human Send = OFF / absent
Gateway outbound = OFF / absent
```

No customer-hire candidate container has been started in this slice.

## CUSTOMER-HIRE CONTRACT REVALIDATED

The reviewed Core contract remains:

```http
POST /api/v1/organizations/918d4c7e-fccb-41f0-aba7-04105a9b4ec0/digital-employees
Authorization: Bearer <real Supabase human session>
Idempotency-Key: customer-hire-canary:ana-commercial-v1:v1
Content-Type: application/json

{"catalogKey":"ana-commercial-v1"}
```

The route:

- requires a canonical UUID organization selector;
- requires a non-empty idempotency key no longer than 255 characters;
- accepts exactly one body field, `catalogKey`;
- validates the real human session before the adapter effect;
- passes only canonical Wandora actor, tenant, catalog key and idempotency key to the Organization Adapter;
- maps provider ambiguity to `employee-hiring-uncertain` with `retry: same-idempotency-key`;
- returns only Wandora-owned employee fields;
- does not expose provider company refs, provider agent refs, secret refs or credentials.

The Organization Adapter independently requires the actor to hold an active `owner` or `admin` membership in the active organization.

## PAUSED-FIRST PROVIDER CONTRACT

The Wandora catalog contains only:

```text
catalogKey = ana-commercial-v1
displayName = Ana
role = commercial-assistant
autonomy = supervised
```

The installed Paperclip Organization Adapter manifest declares the matching managed agent:

```text
agentKey = ana-commercial-v1
displayName = Ana
role = commercial-assistant
adapterType = wandora_mastra
status = paused
budgetMonthlyCents = 0
```

The plugin requests `agents.managed`, not `agents.resume`.

The Core finalization contract inserts the first Wandora employee as:

```text
status = paused
autonomy = supervised
```

Therefore this hire cannot be treated as activation.

## IDEMPOTENCY / REPLAY CONTRACT

The private journal is keyed by:

```text
PRIMARY KEY (organization_id, idempotency_key)
```

The service first looks up the exact idempotency key. A changed canonical request under the same key fails with `idempotency-conflict`.

If a different key is supplied for the same:

```text
organization + provider + catalog_key
```

the service reuses the existing catalog operation when the canonical request hash matches. It does not reserve a second employee/provider resource merely because the browser generated another key.

Therefore the live proof after first success must establish:

1. same key + same body -> same employee;
2. different key + same catalog -> same employee;
3. hire-operation count for `ana-commercial-v1` remains exactly 1;
4. Paperclip managed Ana count remains exactly 1.

## CANDIDATE ARTIFACT SELECTION

The first PR #109 candidate artifact is **rejected** for production use because its GitHub PR merge-ref image does not contain the final reviewed customer-hire runtime.

A later candidate from PR #111 is accepted.

GitHub evidence:

```text
workflow run = 35316885875
artifact id = 10535228149
artifact name = core-organization-adapter-candidate-f8e553072c36b229b3fced2f4a7e9378e67d7aa4
artifact ZIP digest = sha256:5f08d2a61cb576a0b1b48d8e8bdd67beab973c19417150021e174c081f46cd91
source merge-ref = f8e553072c36b229b3fced2f4a7e9378e67d7aa4
```

Candidate manifest:

```text
candidate_contract = organization-adapter-core-v1
source_tree_sha = 271a7585462de1dfef0b6d325417f087ffae5366
image_tag = wandora/core:organization-adapter-candidate-f8e553072c36
oci_config_digest = sha256:759211874f26af86ea610971ab3e41c0e9ebbe468e2be1b0187e5a6007a89978
oci_manifest_digest = sha256:20f97179251549e4dc93a3cb426ff90c35641ef36216e336f2afb3532501e36d
image_user = node
archive_sha256 = b597abfd14cf6df9d9c50643611ab4af8e5ce70f87580dc481c4a1358f8b4c5c
```

Comparison from this artifact merge-ref to current main finds no runtime/compose change after it except the later addition of the standalone verifier script:

```text
apps/core/scripts/verify-private-tenant-provisioning-v2.sh
```

No Core runtime source or Core compose contract differs.

## HOST STAGING PROOF

The retained GitHub artifact was downloaded once into operator cache, verified by the GitHub artifact digest, extracted and its own `SHA256SUMS` passed.

The image was loaded but **not started**.

Host image inspection:

```text
image = wandora/core:organization-adapter-candidate-f8e553072c36
Docker loaded image id = sha256:20f97179251549e4dc93a3cb426ff90c35641ef36216e336f2afb3532501e36d
revision label = f8e553072c36b229b3fced2f4a7e9378e67d7aa4
candidate label = organization-adapter-core-v1
user = node
baked Wandora enable flags = absent
baked password/token/API-key material = absent
```

The loaded Docker image id matches the manifest's accepted OCI manifest digest. The workflow verifier explicitly permits the loaded engine id to equal either the config or manifest digest.

## PRIVATE CANDIDATE COMPOSITION — FROZEN

Future execution uses exactly one ephemeral container:

```text
name = wandora-core-customer-hire-canary-candidate-v1
image = wandora/core:organization-adapter-candidate-f8e553072c36
restart policy = no
published host ports = none
wandora-edge attachment = none
```

Security boundary:

```text
user = node
read-only rootfs = true
tmpfs /tmp = rw,noexec,nosuid,size=16m
no-new-privileges = true
cap_drop = ALL
supplementary secret group = 987
```

Private networks only:

```text
wandora-core
wandora-data
```

Read-only secret mounts:

```text
/opt/wandora/stacks/core/secrets/wandora_core_db_password
  -> /run/secrets/wandora_core_db_password

/opt/wandora/secrets/organization-adapter
  -> /run/secrets/wandora/organization-adapter
```

No gateway-ingress or outbound secret is mounted.

Candidate runtime configuration:

```text
PORT = 8788
WANDORA_CORE_MODE = database

WANDORA_CORE_DB_HOST = wandora-postgres
WANDORA_CORE_DB_PORT = 5432
WANDORA_CORE_DB_NAME = postgres
WANDORA_CORE_DB_USER = wandora_core_runtime
WANDORA_CORE_DB_PASSWORD_FILE = /run/secrets/wandora_core_db_password

WANDORA_HUMAN_API_ENABLED = true
WANDORA_AUTH_JWKS_URL = https://supabase.wandora.com.br/auth/v1/.well-known/jwks.json
WANDORA_AUTH_ISSUER = https://supabase.wandora.com.br/auth/v1
WANDORA_AUTH_AUDIENCE = authenticated

WANDORA_ORGANIZATION_ADAPTER_ENABLED = true
WANDORA_ORGANIZATION_ADAPTER_WEBHOOK_URL =
  http://wandora-paperclip:3100/api/plugins/wandora.organization-adapter-v1/webhooks/employee-reconcile
WANDORA_ORGANIZATION_ADAPTER_SECRET_DIRECTORY =
  /run/secrets/wandora/organization-adapter

WANDORA_HUMAN_DIGITAL_EMPLOYEE_HIRE_ENABLED = true

WANDORA_GATEWAY_INGRESS_ENABLED = false
WANDORA_HUMAN_SEND_PROPOSAL_ENABLED = false
WANDORA_AGENT_RUNTIME_MODE = disabled
```

The candidate is called only from inside its own private container/network namespace. No Web/Nginx route and no public hostname targets it.

The normal live `wandora-core` is not restarted or modified.

## HUMAN SESSION AUTHORITY — FROZEN

The hire proof must use a **real normal Supabase human session** for the existing canonical owner.

Accepted source:

```text
existing provisioned account
  -> normal Supabase email/password browser login
  -> normal access token
  -> /api/v1/me
  -> canonical Wandora owner + active organizations
```

The token itself is ephemeral evidence and is not canonical state.

Rejected:

- Supabase service-role impersonation;
- admin-created JWTs;
- signing a token with server keys;
- bypassing Human API and calling the Organization Adapter service directly;
- putting a browser token in Git, ADR, shell history or chat.

At execution time the current browser-session bearer token must be transferred through an operator-controlled non-chat channel into a mode-0600 ephemeral file and never printed.

Before the hire POST, the candidate must use that token for:

```http
GET /api/v1/me
```

and require:

```text
user.id = e1000000-0000-4000-8000-000000000001
organizations includes:
  id = 918d4c7e-fccb-41f0-aba7-04105a9b4ec0
  role = owner
```

If this proof is absent or expired, no hire request is sent.

## EXECUTION / REPLAY PLAN

After fresh preconditions and candidate readiness:

1. prove candidate `/healthz = 200` and `/readyz = 200` from inside the candidate;
2. prove candidate has no host port and no `wandora-edge` attachment;
3. prove normal live Core customer-hire flag remains OFF;
4. validate the ephemeral real human token through candidate `GET /api/v1/me`;
5. re-prove zero canary employees/provider employee bindings/hire operations/Paperclip agents;
6. issue exactly one POST using:
   - frozen route;
   - frozen body;
   - `customer-hire-canary:ana-commercial-v1:v1`;
7. independently inspect Wandora and Paperclip state;
8. if success is complete, replay the **same key + same body** and require the same employee;
9. issue one **different key + same catalog** proof and require the same employee with no second journal/provider resource;
10. remove the candidate and delete ephemeral token material;
11. prove the normal live Core customer-hire flag remains OFF.

The second-key proof is only performed after first success and state reconciliation. It is not a fallback for an uncertain first request.

## SUCCESS INVARIANTS

A clean first hire must end with:

```text
Wandora canary digital employees = 1
employee:
  name = Ana
  role = commercial-assistant
  status = paused
  autonomy = supervised

Wandora canary digital-employee provider bindings = 1
Wandora ana-commercial-v1 hire operations = 1
hire operation status = completed

Paperclip canary managed Ana count = 1
Paperclip Ana status = paused
Paperclip adapter type = wandora_mastra

same-key replay employee id = original employee id
different-key/same-catalog employee id = original employee id

customer response contains no provider/secret fields
```

Still required after the proof:

```text
normal live Core Customer Digital-Employee Hire = OFF
Human Send = OFF
Gateway outbound = OFF
customer activation route/control = unavailable
```

## AMBIGUITY / FAILURE POLICY

There is no blind retry.

If the first POST response is lost, times out, returns `employee-hiring-uncertain` or the chat/tool connection drops after dispatch:

1. do not mint a new idempotency key;
2. inspect the exact operation by `customer-hire-canary:ana-commercial-v1:v1`;
3. inspect Wandora employee/provider binding state;
4. inspect Paperclip company managed-agent state;
5. if the operation is completed and all invariants match, adopt success;
6. if the operation is `uncertain`, retry only the exact same route/body/key after separate readback confirms the candidate/session are still valid;
7. if provider state exists but local state is incomplete/inconsistent, stop for a separately reviewed recovery;
8. never use a different idempotency key to escape uncertainty.

If candidate startup/readiness/session validation fails before the POST, remove the candidate and no business/provider effect has occurred.

## CANDIDATE CLEANUP

After the proof, whether successful or failed before dispatch:

- remove `wandora-core-customer-hire-canary-candidate-v1`;
- delete the ephemeral bearer-token file;
- retain the staged image/artifact cache only as non-running operator evidence unless separately cleaned;
- do not restart the normal Core;
- do not change public Web/Nginx routing;
- do not enable Human Send or Gateway outbound.

Old unrelated candidate containers are not cleaned as part of this slice.

## SECOND ADVERSARIAL REVIEW

Rejected:

- using the stale PR #109 candidate artifact;
- rebuilding an arbitrary image when a later provenance-verified artifact already contains the same current runtime;
- exposing the candidate through a host port, Cloudflare or Web proxy;
- attaching the candidate to `wandora-edge`;
- enabling Gateway ingress, Mastra Agent Runtime or Human Send merely for a hire proof;
- using service-role/admin JWT impersonation;
- persisting a bearer token in docs/Git/chat;
- calling the Organization Adapter directly instead of the customer POST;
- creating Ana before a real owner session is proven;
- treating `Contratar` as `Ativar`;
- retrying an ambiguous first POST with a new key;
- leaving the candidate running after proof.

## EFFECT BOUNDARY

This preflight staged only a traceable candidate image.

It did **not**:

- start the hire candidate container;
- obtain/persist a human bearer token;
- send the customer hire POST;
- create a Wandora employee;
- create a provider employee binding;
- create a Paperclip managed Ana;
- activate Ana;
- enable the public live Core customer-hire gate;
- enable Human Send;
- enable Gateway outbound.

## DECISION

**Customer Hire Canary — Private Candidate Core Hire Preflight V1 is complete.**

The candidate artifact, minimal private composition, real-human-session boundary, stable idempotency key, replay/no-duplicate plan, paused-first invariants and cleanup/ambiguity rules are frozen.

## NEXT EXECUTABLE SLICE

**Customer Hire Canary — Private Candidate Core Hire Execution V1.**

Start the frozen private candidate, prove readiness/no-public-ingress, validate a real owner Supabase session against `/api/v1/me`, execute the frozen first hire once, reconcile paused-first state, perform same-key and different-key/same-catalog replay proofs, remove the candidate and leave the normal live Core customer-hire gate plus all outbound effects OFF.

If no real owner browser session can be transferred through the approved non-chat ephemeral channel, stop after candidate readiness and request only that operator action; do not substitute an admin/service-role session.
