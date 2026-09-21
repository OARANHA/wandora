# ADR 0141 — Customer Owner First Real Tenant Active Digital-Employee First Legitimate Work Production Execution V1 — Gate 6 completion

Status: **Accepted / execution checkpoint / NO REAL WORK**  
Date: 2026-09-20  
Canonical implementation base: `main@88facf57466d8ccef0606f3c101d29644fdb04de`  
Predecessors: ADR 0138, ADR 0139, ADR 0140

## Decision summary

The production execution originally frozen by ADR 0138 and stopped by ADR 0139 has now safely completed **Gate 6 only**, after the narrow Web bridge correction in ADR 0140.

No earlier production gate was repeated.

Production now has a customer-safe authenticated path for the active MEDICSPRO digital employee to accept legitimate owner work, while external effects remain disabled.

This checkpoint is still **NO REAL WORK**.

No work title or description was created, no Paperclip issue was created, no `issues.wakeup` occurred, no heartbeat/run/task session/routine/runtime execution occurred, Mastra was not invoked for MEDICSPRO, Human Send remains OFF, Gateway outbound remains OFF, and no WhatsApp or e-mail was sent.

## REAL NOW before resume

Production entering this resume point was the ADR 0139 checkpoint:

- migration 016 already live and verified;
- MEDICSPRO has exactly one Ana `active + supervised` in Wandora;
- Paperclip has exactly one Ana `idle / wandora_mastra`;
- Organization Adapter = `0.3.0 / ready`;
- `wandora_mastra = 0.2.0 / loaded`;
- Core final candidate already live;
- Web final candidate from PR #190 already live;
- Core customer-work gate OFF;
- Human Send OFF;
- Gateway outbound OFF;
- work journal = 0;
- outbound attempts = 0;
- issues/wakeups/heartbeat/runs/task sessions/routines/runtime usage = 0.

## Customer Work Web API Bridge Exposure V1

ADR 0139 proved that the qualified Web image did not expose:

```text
/api/v1/organizations/{organizationId}/digital-employees/{employeeId}/work
```

through the reviewed Nginx allow-list.

PR #193 implemented only the missing customer-work Web bridge.

Merged implementation:

```text
PR #193
main = 88facf57466d8ccef0606f3c101d29644fdb04de
ADR 0140
```

The Nginx location is UUID-scoped and proxies only to private `wandora-core:8788`.

It:

- forwards `Authorization`;
- forwards `Idempotency-Key`;
- strips browser `Cookie`;
- clears `Connection`;
- preserves reviewed proxy timeouts;
- does not add a generic API proxy;
- leaves generic `/api/` fail-closed;
- leaves `/internal/` fail-closed.

Web CI proves both GET and POST against an isolated mock Core and proves an unreviewed child path remains HTTP 404.

No production work is created by that CI proof.

## CI qualification

PR #193 completed all four workflows GREEN:

```text
Web CI               = GREEN
Core CI              = GREEN
Messaging Gateway CI = GREEN
Platform Admin CI    = GREEN
```

After merge, the exact `main@88facf57…` workflows were also required before production artifact promotion.

Final merged-main workflow state:

```text
Core CI              = GREEN
Messaging Gateway CI = GREEN
Platform Admin CI    = GREEN
Web CI               = GREEN
```

### Self-hosted runner dispatch anomaly

The merged-main Web CI run remained queued for more than 20 minutes with:

```text
Requested labels:
self-hosted
linux
x64
wandora-ci

Waiting for a runner to pick up this job...
```

Real-state reconciliation showed:

- the only queued repository job was the Web CI run;
- no competing run was in progress;
- `wandora-actions-runner.service` was active;
- `Runner.Listener` existed;
- no `Runner.Worker` was assigned;
- GitHub showed an empty `runner_name`.

A non-privileged restart attempt was rejected before effect.

The owner then executed exactly:

```bash
sudo systemctl restart wandora-actions-runner.service
```

The service restarted successfully and the **existing queued run** was picked up immediately. No duplicate workflow was created.

The Web bridge verifier then completed GREEN and uploaded the exact merged-main artifact.

## Exact Web artifact provenance

GitHub Actions artifact:

```text
name   = web-candidate-88facf57466d8ccef0606f3c101d29644fdb04de
id     = 10619624422
expired= false
GitHub artifact digest =
sha256:79b5845e1d329a28af17bc619b570dac08349cfc68de6776467918435ab556da
```

The artifact was transferred to the production operator host through the already-proven short-lived artifact transport.

Host SHA-256 matched GitHub exactly:

```text
79b5845e1d329a28af17bc619b570dac08349cfc68de6776467918435ab556da
```

The ZIP was path-safety checked before extraction.

Internal manifest:

```text
candidate_contract=wandora-web-reviewed-bridge-v1
source_sha=88facf57466d8ccef0606f3c101d29644fdb04de
source_tree_sha=cf1032a4323fdeaa68998900bcfdb376e97aa38f
image_tag=wandora/web:candidate-88facf57466d
image_id=sha256:a12a519aff863098583326034af5b32d9d7e7016285209e1b79faf1dd1391955
archive_sha256=61aaf658e8cddc81d0d7cbac06376c445a95ac264df971d12f756ebedcbb9f75
```

Internal `SHA256SUMS` verification passed.

## Fresh Web rollback before promotion

Immediately before replacing Web, the live previous image was captured:

```text
image tag = wandora/web:candidate-ad93c055d6f8
image id  = sha256:2dc3cb56c39864b879e84064cba2b4ff419da88ef66a999e6c5ce604d98fd281
health    = healthy
restart   = 0

rollback archive sha256 =
0d1d362de16bb6a517c34e21aa7562312c44d1d36c70ac0c284dfb3df8fa316f
```

## Web production promotion — GREEN

Only Web was promoted.

Live result:

```text
image tag = wandora/web:candidate-88facf57466d
image id  = sha256:a12a519aff863098583326034af5b32d9d7e7016285209e1b79faf1dd1391955
health    = healthy
restart   = 0
```

Public surfaces remained available:

```text
/healthz        = 200
/login          = 200
/accept-invite  = 200
/recover-access = 200
/               = 200
/equipe         = 200
/trabalho       = 200
/conversas      = 200
/aprovacoes     = 200
/empresa        = 200
```

Browser-public Supabase Auth configuration remained present without emitting its value.

## Bridge proof while Gate 6 was still OFF

Before enabling the Core customer-work service:

```text
WANDORA_HUMAN_DIGITAL_EMPLOYEE_WORK_ENABLED = absent / OFF
WANDORA_ORGANIZATION_ADAPTER_WORK_WEBHOOK_URL = absent
Human Send = OFF
Gateway outbound = OFF
```

The exact reviewed path through live Web returned:

```text
HTTP 404
Content-Type: application/json
{"error":"not-found"}
```

An unreviewed child path returned:

```text
HTTP 404
Content-Type: text/html
nginx 404 page
```

The live Nginx config contained the exact UUID-scoped customer-work location.

This proved that the exact route was now crossing Web into Core, while unreviewed descendants remained stopped by Web Nginx.

## Zero-work gate immediately before Gate 6

Immediately before activating customer-work admission:

```text
Wandora work journal = 0
MEDICSPRO outbound attempts = 0
MEDICSPRO Ana = exactly one / active + supervised

Paperclip:
Ana = exactly one / idle / wandora_mastra
issues = 0
wakeups = 0
heartbeat runs = 0
runs = 0
task sessions = 0
routines = 0
lastRunId = null
input tokens = 0
output tokens = 0
cached input tokens = 0
cost cents = 0
```

## Gate 6 — customer-work overlay — GREEN

The exact canonical overlay from `main@88facf57…` is:

```yaml
services:
  core:
    environment:
      WANDORA_HUMAN_DIGITAL_EMPLOYEE_WORK_ENABLED: "true"
      WANDORA_ORGANIZATION_ADAPTER_WORK_WEBHOOK_URL: "http://wandora-paperclip:3100/api/plugins/wandora.organization-adapter-v1/webhooks/employee-work"
```

The compose was rendered and reviewed before recreate.

The rendered result preserved:

```text
WANDORA_HUMAN_DIGITAL_EMPLOYEE_ACTIVATION_ENABLED = true
WANDORA_HUMAN_DIGITAL_EMPLOYEE_WORK_ENABLED = true
WANDORA_ORGANIZATION_ADAPTER_WORK_WEBHOOK_URL =
  http://wandora-paperclip:3100/api/plugins/wandora.organization-adapter-v1/webhooks/employee-work
Core image = existing qualified Core candidate
Human Send = absent / OFF
```

Only `wandora-core` was recreated.

Post-recreate:

```text
Core image =
sha256:e72305b0bfa562bf75b6d010935d17532c6c69e1a9ff42e97476976c1d6dc648

status  = running
health  = healthy
restart = 0
/healthz = 200
/readyz  = 200
```

Runtime flags:

```text
work = true
workUrl =
http://wandora-paperclip:3100/api/plugins/wandora.organization-adapter-v1/webhooks/employee-work
activation = true
Human Send = OFF / absent
Gateway outbound = OFF / absent
```

## Customer-safe availability proof

After Gate 6, an unauthenticated GET through the exact public customer-work route returned:

```text
HTTP 401
{"error":"unauthorized"}
```

Before Gate 6, the same exact proxied path returned Core `404 {"error":"not-found"}`.

The transition from Core 404 to Core 401 proves:

1. the exact Web bridge reaches Core;
2. the customer-work service is now present;
3. the service remains protected by normal owner authentication;
4. no synthetic work was required to prove availability.

No owner token was extracted or minted for this validation.

## Final zero-work checkpoint

After Gate 6:

### Services

```text
Core
  image = sha256:e72305b0bfa562bf75b6d010935d17532c6c69e1a9ff42e97476976c1d6dc648
  healthy
  restart = 0
  customer-work gate ON

Web
  image = sha256:a12a519aff863098583326034af5b32d9d7e7016285209e1b79faf1dd1391955
  healthy
  restart = 0
  exact customer-work bridge live

Paperclip
  image = sha256:4fb5073ff0b09ea50527cfeafe5bcaff4f9dae2b0f508fd06c0dc58661735ced
  healthy
  restart = 0

Messaging Gateway
  image = sha256:c9a780765c0b44ddb2b6dd59fcde6cc0d53330d5c1a4b32e414108ab7156d46d
  healthy
  restart = 0
```

### Wandora

```text
MEDICSPRO Ana = exactly one / active + supervised
work journal rows = 0
outbound attempts = 0
```

### Paperclip

```text
Ana = exactly one / idle / wandora_mastra
lastHeartbeatAt = null

issues = []
runs = []
task sessions = []
routines = []
wakeups = 0
heartbeat runs = 0

runtime:
sessionId = null
lastRunId = null
lastRunStatus = null
input tokens = 0
output tokens = 0
cached input tokens = 0
cost cents = 0
lastError = null
```

Organization Adapter remains:

```text
plugin id = 86e77fe7-c7e4-4bee-afa3-46cdad575d0c
version   = 0.3.0
status    = ready

capabilities:
agents.managed
agents.resume
issues.read
issues.create
issues.wakeup
plugin.state.read
plugin.state.write
webhooks.receive
secrets.read-ref
```

`agents.invoke` remains absent.

`wandora_mastra` remains:

```text
version = 0.2.0
source  = external
loaded  = true
disabled= false
```

## Second adversarial review

### Create a synthetic issue to prove the path end to end

Rejected.

This slice is explicitly NO REAL WORK. Customer-safe availability is proven by the authenticated boundary transition and zero-work state.

### POST an empty or fake work instruction

Rejected.

A work request must contain a genuine owner instruction. Synthetic work would contaminate the first legitimate work boundary.

### Enable Human Send or Gateway outbound now

Rejected.

The first real work must terminate in an internal supervised result before any external-effect slice is considered.

### Directly invoke Mastra to prove the adapter

Rejected.

Paperclip remains the durable issue/run authority. The first execution must travel through the normal Wandora -> Organization Adapter -> Paperclip -> `wandora_mastra` -> Mastra path.

### Repeat migration 016, plugin promotion, Mastra promotion or Core deployment

Rejected unless future reconciliation proves actual drift.

They are already live, validated and captured by ADR 0139/0141.

## STOP condition reached

The production system is now ready for the next, separate slice:

**Customer Owner First Real Tenant Active Digital-Employee First Legitimate Work Real Execution V1**

That future slice must begin only from a **genuine instruction supplied by the authenticated MEDICSPRO owner through the Wandora surface**.

It must not invent a title, description, task or customer message.

The first real work should proceed only through:

```text
authenticated MEDICSPRO owner
-> Wandora Web
-> Wandora Core
-> Organization Adapter employee-work webhook
-> Paperclip supervised issue / wakeup
-> wandora_mastra
-> Mastra
-> internal supervised result
```

and must stop before external send unless a later explicitly authorized outbound slice enables that effect.
