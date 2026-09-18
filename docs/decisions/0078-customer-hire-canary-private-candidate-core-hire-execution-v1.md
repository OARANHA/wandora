# ADR 0078 — Customer Hire Canary Private Candidate Core Hire Execution V1

- Status: **Accepted — first customer-like paused-first hire live and verified**
- Date: 2026-09-18
- Scope: execute ADR 0077's frozen private candidate proof exactly once, validate normal human authorization, prove paused-first Wandora/Paperclip state, prove same-key and same-catalog dedupe, then remove the candidate and ephemeral session material while keeping all public/outbound effects OFF

## REAL NOW

Execution began from:

```text
main = 2d28dadbb444d476936493d4ea005e2b64a0547e
open PRs = 0
```

The canary entered execution with:

```text
Wandora organization = 918d4c7e-fccb-41f0-aba7-04105a9b4ec0
Paperclip company     = e7422a00-1474-49d5-ac32-34594520015e

Wandora digital employees = 0
employee-provider bindings = 0
hire operations = 0
primary hire key rows = 0
Paperclip canary agents = 0

normal live Core Customer Digital-Employee Hire = OFF
Human Send = OFF
Gateway outbound = OFF
```

ADR 0076 Organization Adapter wiring remained intact and healthy.

## CANDIDATE PROVENANCE / TOPOLOGY

The preferred ADR 0077 candidate was reused without rebuild:

```text
image = wandora/core:organization-adapter-candidate-f8e553072c36
loaded image id = sha256:20f97179251549e4dc93a3cb426ff90c35641ef36216e336f2afb3532501e36d
artifact id = 10535228149
```

Ephemeral candidate:

```text
container = wandora-core-customer-hire-canary-candidate-v1
published host ports = none
wandora-edge attachment = none
networks = wandora-core + wandora-data
user = node
read-only rootfs = true
cap_drop = ALL
no-new-privileges = true
supplementary secret group = 987
restart = no
```

Candidate-only gates:

```text
Human API = ON
Organization Adapter = ON
Customer Digital-Employee Hire = ON
Gateway ingress = OFF
Agent Runtime = disabled
Human Send = OFF
```

Readiness proof:

```text
/healthz = 200 / status=ok
/readyz  = 200 / status=ready
```

The normal live Core was not restarted or reconfigured.

## NORMAL HUMAN AUTHORIZATION PROOF

The proof used the existing real canary owner through a normal Wandora/Supabase browser session.

No service-role/admin impersonation, generated privileged JWT, direct Organization Adapter call or refresh-token rotation was used.

The session material was transferred through a protected operator-only file, never printed to chat/output, and consumed only in-memory by the candidate.

Candidate authorization precheck:

```text
GET /api/v1/me = 200
canonical Wandora user = expected owner
canary organization present = true
role = owner
```

The browser session bundle contained normal session material, but execution used only its access token. The refresh token was not consumed or rotated.

## FIRST CUSTOMER HIRE — ONE SHOT

Frozen request:

```http
POST /api/v1/organizations/918d4c7e-fccb-41f0-aba7-04105a9b4ec0/digital-employees
Authorization: Bearer <normal owner access token>
Idempotency-Key: customer-hire-canary:ana-commercial-v1:v1
Content-Type: application/json

{"catalogKey":"ana-commercial-v1"}
```

The automation layer declined to dispatch the authenticated human effect directly. The operator therefore executed the already-frozen request once from the VPS against the private candidate.

Observed response:

```text
HTTP_STATUS = 200
employee id = 3e689529-a9a2-4d70-8ce1-17aa3aed6f8f
name = Ana
role = commercial-assistant
status = paused
autonomy = supervised
```

No automatic retry was issued.

## INDEPENDENT DURABLE / PROVIDER RECONCILIATION

Wandora PostgreSQL immediately after the first success:

```text
canary digital employees = 1
employee:
  id = 3e689529-a9a2-4d70-8ce1-17aa3aed6f8f
  display_name = Ana
  role = commercial-assistant
  status = paused
  autonomy_mode = supervised

employee-provider bindings = 1
hire operations = 1

primary operation:
  idempotency_key = customer-hire-canary:ana-commercial-v1:v1
  catalog_key = ana-commercial-v1
  status = completed
  employee_id = 3e689529-a9a2-4d70-8ce1-17aa3aed6f8f
```

Independent Paperclip company read:

```text
agents = 1

Ana:
  id = acd3ea1d-495c-43c7-82a7-73bd5ef27b95
  role = commercial-assistant
  status = paused
  adapterType = wandora_mastra
```

Therefore the first real customer-like hire remained exactly a hire/materialization effect, not activation or execution.

## REPLAY / IDEMPOTENCY PROOF

Only after independent first-success reconciliation, the operator executed the two frozen replay proofs.

### Same key / same body

```text
Idempotency-Key = customer-hire-canary:ana-commercial-v1:v1

HTTP = 200
employee id = 3e689529-a9a2-4d70-8ce1-17aa3aed6f8f
name = Ana
status = paused
autonomy = supervised
provider/secret field leakage = false
```

### Different key / same catalog

```text
Idempotency-Key = customer-hire-canary:ana-commercial-v1:v1-alt

HTTP = 200
employee id = 3e689529-a9a2-4d70-8ce1-17aa3aed6f8f
name = Ana
status = paused
autonomy = supervised
provider/secret field leakage = false
```

Independent final readback after both requests proved:

```text
digital employees = 1
employee-provider bindings = 1
hire operations = 1
Paperclip agents = 1
```

The alternate request key did not create a second journal row/provider resource.

## CLEANUP

After the replay proofs:

- removed `wandora-core-customer-hire-canary-candidate-v1`;
- removed the protected browser-session file;
- removed the temporary bearer-input helper;
- candidate image remains only as staged, non-running evidence;
- normal live Core remained untouched.

Post-cleanup:

```text
candidate container present = 0
ephemeral session file present = 0
temporary helper present = 0

canary digital employees = 1
employee-provider bindings = 1
hire operations = 1

Ana = paused + supervised
```

Public/effect flags remained:

```text
normal live Core Customer Digital-Employee Hire = OFF
Human Send = OFF
Gateway outbound = OFF
```

## SECOND ADVERSARIAL REVIEW

Rejected during execution:

- generating an admin/service-role session when a normal browser session was required;
- interpreting candidate readiness timeout as proof that no container had been created;
- repeating candidate creation without first checking post-failure state;
- treating an empty Paperclip read caused by missing `docker exec -i` as proof of zero agents;
- retrying the first hire before durable/provider reconciliation;
- using a different idempotency key as a recovery path;
- treating `Contratar` as `Ativar`;
- keeping the private candidate running after proof;
- leaving browser session/refresh material on the VPS after the proof;
- enabling Human Send or Gateway outbound merely because hire succeeded.

## EFFECT BOUNDARY

This slice added exactly:

- one canonical Wandora digital employee for the clean customer-hire canary;
- one Wandora employee-provider binding;
- one completed catalog-hire journal operation;
- one Paperclip managed Ana.

It did **not**:

- activate/resume Ana;
- run Mastra for Ana;
- create work;
- send WhatsApp or any outbound message;
- enable customer hire on the normal live Core;
- enable Human Send;
- enable Gateway outbound;
- expose provider IDs/secrets in the customer response.

## DECISION

**Customer Hire Canary — Private Candidate Core Hire Execution V1 is GREEN.**

The first customer-like production hire is now proven end-to-end through the real Human API + Organization Adapter contract, with normal owner authorization, paused-first semantics, provider reconciliation and both request-level/catalog-level deduplication.

## NEXT EXECUTABLE SLICE

**Customer Digital-Employee Hire — Public Rollout Preflight V1.**

Observation/plan-first only.

Before enabling the normal live customer-hire gate, revalidate:

1. current `main` and live Core/Web source/image provenance;
2. current production `/start` and `Equipe` behavior;
3. the exact scope of the runtime-wide hire gate across all active organizations;
4. collision/fail-closed behavior for organizations that already contain legacy or catalog employees;
5. owner/admin authorization and tenant isolation on the normal public route;
6. stable browser idempotency-key behavior across refresh/retry;
7. paused-first UI copy and absence of any `Ativar` action;
8. rollback path to gate OFF without deleting successful hires;
9. continued separation from Human Send, Gateway outbound, Agent Runtime execution and employee activation.

Do not enable the normal live Core customer-hire gate, activate Ana, enable Human Send or enable Gateway outbound during that preflight.
