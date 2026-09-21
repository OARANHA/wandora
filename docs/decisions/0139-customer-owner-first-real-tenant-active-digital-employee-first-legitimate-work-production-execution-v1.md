# ADR 0139 — Customer Owner First Real Tenant Active Digital-Employee First Legitimate Work Production Execution V1 — blocked before Gate 6

Status: **Accepted / execution checkpoint / NO REAL WORK**  
Date: 2026-09-20  
Execution base: `main@3f54259ee1a83d98845003b9cfbc7d3ea1a2f0d2`  
Preflight authority: ADR 0138

## Decision summary

The production execution advanced safely through Gates 0–5 of ADR 0138 and then **stopped before Gate 6**.

The stop condition is a proven Web bridge gap: the exact qualified Web candidate does not expose the reviewed customer-work API path

```text
/api/v1/organizations/:organizationId/digital-employees/:employeeId/work
```

through its Nginx allow-list. The live request therefore terminates at Web Nginx with HTTP 404 before reaching Wandora Core.

Because ADR 0138 requires the customer-work overlay to be enabled only after every prior gate is GREEN and requires the active Ana to have customer-safe work availability, the Core customer-work overlay was **not enabled**.

No title/description was created, no Paperclip issue was created, no `issues.wakeup` occurred, no heartbeat/run/task session/routine/runtime execution occurred, Mastra was not invoked for MEDICSPRO, and no external send was enabled or attempted.

## REAL NOW

Canonical repository state entering execution:

```text
main = 3f54259ee1a83d98845003b9cfbc7d3ea1a2f0d2
PR #190 = merged / final qualified Core + Web candidates
PR #191 = merged / ADR 0138 production preflight checkpoint
```

The final PR #190 workflow set had already been proven GREEN before execution.

Tenant/provider identities remained stable:

```text
MEDICSPRO organization = b3fa4d96-4e2d-4d5a-ab59-ffab0d3062e5
Wandora Ana            = b7eb53d4-498a-4277-b11f-17ddc42b3fe3
Paperclip company      = a63f27a8-dbac-4552-a456-b3a21302226b
Paperclip Ana          = da6cfc6b-e16f-483a-95f1-bacee8e54365
Organization plugin ID = 86e77fe7-c7e4-4bee-afa3-46cdad575d0c
```

## Gate 0 — fresh rollback / provenance capture — GREEN

A new Wandora DB rollback asset was captured immediately before the first production mutation:

```text
file   = wandora-pre-migration-016.dump
sha256 = d7419a6b0fcb23e8557b158fb1f52266a109ef2ec2794d4e6747e95e5156aa8a
pg_restore -l = GREEN
```

Additional rollback/provenance custody was captured:

```text
Organization Adapter v0.2.0 tgz
sha256 = 0841c161258eaccdf5290eb962b86fc9ace91a7bb923b7eebfe202565025a91e

adapter-plugins.json pre-Gate-2
sha256 = 73d0fb093297d66e2f791a37a5595c1ebe833f01bb3bd7291a4234bcd08b1d18

Paperclip zero-work baseline
sha256 = 3f0ae55a2068ac8b44962f0a9b659e522923acf4fc0344f1e46bc115d30f158a
```

The live `wandora_mastra@0.1.0` package directory was copied with per-file hashes.

Frozen artifact ZIPs were re-downloaded through the already-proven short-lived GitHub artifact transport and reverified:

```text
Core ZIP   = 20f52b5060f71121b6e7ff136c5d50274d97d1d23ea20089ed7fab9e2fa4c70f
Web ZIP    = 638482b649f82f18f82d6978625b8c9265ce4cb04c861df44d59c7bd16eb089a
Org ZIP    = ce89336cc257677d3a9bda66292c7cb7b7ea450c53a2899b69286b45641c0889
Mastra ZIP = 61a480c29e0f4384273dbc10e0cab41dc28605e557db0997218f779a0c22f76b
```

Internal payload hashes also matched ADR 0138:

```text
Core archive      = 3a075adca71a025fef085f0daa65fe914757e9f30c829d32fd8ee6e33b04e1c5
Web image archive = 0d1d362de16bb6a517c34e21aa7562312c44d1d36c70ac0c284dfb3df8fa316f
Org Adapter tgz   = c7bdc270b1fa13d7e3ceacba5455647bd98cc15f29e61046a2bbfad85e62ce82
Mastra Adapter tgz= 65cbc1ca02a0623c624414133cc618b8bf3f8d35e2b6a68dc53b2c763e81fc5d
```

Baseline immediately before mutation:

- Wandora Ana = exactly one `active + supervised`;
- Paperclip Ana = exactly one `idle / wandora_mastra`;
- issues = 0;
- wakeups = 0;
- heartbeat runs = 0;
- routines/routine runs = 0;
- task sessions = 0;
- runtime last run = null;
- input/output/cached tokens = 0;
- runtime cost = 0;
- outbound attempts = 0;
- Human Send = OFF;
- Gateway outbound = OFF.

## Gate 1 — migration 016 — GREEN

Migration:

```text
infra/stacks/supabase/migrations/20260920_016_digital_employee_work_admission_v1.sql
```

was proven absent immediately before execution and then applied exactly once.

The canonical verifier returned:

```text
DIGITAL_EMPLOYEE_WORK_ADMISSION_V1_OK
```

Post-migration production state:

```text
wandora_private.digital_employee_work_operations = present
journal rows                                      = 0
MEDICSPRO Ana                                     = 1 / active / supervised
control-plane binding                             = 1
employee binding                                  = 1
completed ana-commercial-v1 hire                  = 1
outbound attempts                                 = 0
```

The verifier's synthetic rows were transactionally rolled back.

## Gate 2 — wandora_mastra@0.2.0 — GREEN

The exact frozen package:

```text
@wandora/paperclip-adapter-mastra 0.2.0
tgz sha256 = 65cbc1ca02a0623c624414133cc618b8bf3f8d35e2b6a68dc53b2c763e81fc5d
```

was staged into Paperclip's hash-addressed operator package store and installed through Paperclip's authenticated adapter-management API/CLI.

The install returned:

```text
type            = wandora_mastra
version         = 0.2.0
requiresRestart = true
```

Paperclip was restarted exactly once because v2026.916.0 requires restart after replacement of an existing external adapter.

A wrapper reported an ambiguous exit code after printing `PAPERCLIP_HEALTHY`; the restart was **not repeated**. Real state was reconciled first:

```text
Paperclip = running / healthy
image     = wandora/paperclip:v2026.916.0
adapter   = wandora_mastra / external / loaded / 0.2.0
```

Post-Gate-2 safety remained zero-work: Ana idle, issues/runs/sessions/routines/wakeups/heartbeat all zero, runtime tokens/cost zero.

## Gate 3 — Organization Adapter v0.3.0 — GREEN

The exact candidate package was revalidated before installation:

```text
package = paperclip-plugin-wandora-organization-adapter
version = 0.3.0
sha256  = c7bdc270b1fa13d7e3ceacba5455647bd98cc15f29e61046a2bbfad85e62ce82
```

Exact granted manifest capabilities:

```text
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

`agents.invoke` is absent from the manifest capability set.

The bundled Paperclip SDK contains generic `agents.invoke` implementation text, but this is not a granted plugin capability and the Wandora plugin work contract explicitly uses `issues.wakeup`.

Because Paperclip v2026.916.0's automatic upgrade path rejects capability escalation before the documented approval lifecycle can resolve it, ADR 0138 remained the explicit authority for this exact manifest/hash. Production did not treat same-key install as implicit approval.

The plugin was uninstalled **without purge** and reinstalled from the exact reviewed local package through Paperclip's official plugin-management surface.

Result:

```text
plugin ID = 86e77fe7-c7e4-4bee-afa3-46cdad575d0c  (preserved)
version   = 0.3.0
status    = ready
```

MEDICSPRO plugin config was captured before and after and remained byte-identical:

```text
config response sha256 before = 83d5cb41938ce4fdf9025b8a51c8df28e55caed70473ed40ed2f3a2835b1f326
config response sha256 after  = 83d5cb41938ce4fdf9025b8a51c8df28e55caed70473ed40ed2f3a2835b1f326
```

The same company-scoped `hmacSecret` secret-ref record was preserved. No raw secret was emitted.

Post-Gate-3 work/run/runtime state remained zero.

## Gate 4 — Core candidate — GREEN

The exact PR #190 Core artifact was loaded:

```text
source = ad93c055d6f8c6754ea2fdaf648acb56fadab3be
tag    = wandora/core:organization-adapter-candidate-ad93c055d6f8
image  = sha256:e72305b0bfa562bf75b6d010935d17532c6c69e1a9ff42e97476976c1d6dc648
USER   = node
```

The first compose invocation failed before any recreate because operator interpolation variables were absent from the new shell. State was reconciled and the existing Core remained live/healthy on the previous image.

The required structural values were then derived from the current container only as paths/GID; no secret content was read.

The rendered compose was verified before mutation:

- final Core image = exact qualified candidate;
- activation overlay preserved;
- customer-work overlay absent;
- Human Send absent.

Core was then recreated once.

Post-deploy:

```text
healthz = 200
readyz  = 200
work gate = OFF / absent
work URL  = absent
Human Send = OFF / absent
activation = ON
restart count = 0
```

## Gate 5 — Web candidate — candidate healthy, bridge gap discovered

The exact PR #190 Web artifact was loaded and promoted:

```text
source  = ad93c055d6f8c6754ea2fdaf648acb56fadab3be
tag     = wandora/web:candidate-ad93c055d6f8
image   = sha256:2dc3cb56c39864b879e84064cba2b4ff419da88ef66a999e6c5ce604d98fd281
archive = 0d1d362de16bb6a517c34e21aa7562312c44d1d36c70ac0c284dfb3df8fa316f
```

Live Web is healthy with restart count 0.

Public surface proof:

```text
/healthz       = 200
/login         = 200
/accept-invite = 200
/recover-access= 200
/api/v1/me unauthenticated = 401

/              = 200
/equipe        = 200
/trabalho      = 200
/conversas     = 200
/aprovacoes    = 200
/empresa       = 200
```

Browser-public Supabase Auth configuration is present in the compiled live asset without printing its value.

The following authentication-critical files have identical Git blobs between the previously real-login-proven Web candidate source `eda946c36ec41a708af8ea8697bbaa7d33fce7dc` and the current candidate `ad93c055d6f8c6754ea2fdaf648acb56fadab3be`:

```text
apps/web/Dockerfile
apps/web/src/auth.ts
apps/web/src/AuthProvider.tsx
apps/web/src/components/SessionGate.tsx
apps/web/src/pages/LoginPage.tsx
apps/web/src/inviteAcceptance.ts
apps/web/src/recoveryAccess.ts
```

This preserves the already-proven normal owner-login implementation without minting/extracting an owner token or bypassing the browser authorization boundary.

### Proven blocker

The exact current `apps/web/nginx.conf` has reviewed proxy locations for:

- `/api/v1/me`;
- attention-required work;
- supervised proposal send;
- digital-employee collection;
- digital-employee activation;
- conversations.

It has **no location** for:

```text
/api/v1/organizations/{uuid}/digital-employees/{uuid}/work
```

The live candidate container also returns no match for `digital-employees.*work` in `/etc/nginx/conf.d/default.conf`.

A read-only unauthenticated GET to the exact MEDICSPRO/Ana work URL returns:

```text
HTTP 404
server = Web Nginx
```

rather than reaching Core.

Therefore Web cannot yet carry the authenticated owner's first legitimate work instruction to the already-reviewed Core contract.

## Gate 6 — customer-work overlay — NOT EXECUTED

The overlay was intentionally **not enabled**.

Current Core environment remains:

```text
WANDORA_HUMAN_DIGITAL_EMPLOYEE_WORK_ENABLED = absent / OFF
WANDORA_ORGANIZATION_ADAPTER_WORK_WEBHOOK_URL = absent
WANDORA_HUMAN_SEND_PROPOSAL_ENABLED = absent / OFF
```

Gateway outbound remains absent/OFF.

This is the required fail-closed result. Enabling the Core work gate while the customer Web route remains closed would create a partially activated capability that the real owner cannot safely reach through the reviewed authenticated surface.

## Final production checkpoint

Live production at this checkpoint:

```text
Core
  image  = sha256:e72305b0bfa562bf75b6d010935d17532c6c69e1a9ff42e97476976c1d6dc648
  healthy / ready
  customer work gate OFF

Web
  image  = sha256:2dc3cb56c39864b879e84064cba2b4ff419da88ef66a999e6c5ce604d98fd281
  healthy
  auth/login contract preserved
  customer-work API bridge missing

Paperclip
  image = sha256:4fb5073ff0b09ea50527cfeafe5bcaff4f9dae2b0f508fd06c0dc58661735ced
  healthy
  Organization Adapter = 0.3.0 / ready
  plugin ID preserved
  wandora_mastra = 0.2.0 / loaded

Wandora
  migration 016 = live
  work journal rows = 0
  MEDICSPRO Ana = exactly one / active + supervised
  outbound attempts = 0

Paperclip Ana
  exactly one / idle / wandora_mastra
  issues = 0
  wakeups = 0
  heartbeat runs = 0
  task sessions = 0
  routines = 0
  runs = 0
  lastRunId = null
  input/output/cached tokens = 0
  cost = 0
```

Human Send and Gateway outbound remain OFF.

## Second adversarial review

### Enable the work overlay anyway because Core/Plugin/Mastra are ready

Rejected.

That would violate the frozen customer path. The first real work must originate from the authenticated Wandora owner surface, not through a hidden Core-only or operator-only path.

### Call Core directly to prove work

Rejected.

That would bypass Web/customer authorization topology and would require either synthetic work or owner-token extraction. Both violate this slice.

### Add an ad-hoc Nginx edit directly in production

Rejected.

The current Web image is a qualified artifact. Editing the running container or rebuilding ad hoc would destroy artifact provenance and bypass CI.

### Re-run Gates 1–4 after the Web bridge fix

Rejected unless reconciliation proves rollback/drift.

Migration 016, `wandora_mastra@0.2.0`, Organization Adapter v0.3.0 and the final Core candidate are already live and validated. Repeating them merely because a new implementation/chat begins would violate the no-blind-retry rule.

## Required next slice

Create and qualify a narrow **Customer Work Web API Bridge Exposure V1** implementation.

Minimum contract:

1. add an exact UUID-scoped Nginx allow-list for:
   ```text
   /api/v1/organizations/{organizationId}/digital-employees/{employeeId}/work
   ```
2. proxy only to private `wandora-core:8788`;
3. forward `Authorization`;
4. forward `Idempotency-Key`;
5. strip browser cookies and preserve the existing reviewed proxy timeouts;
6. leave generic `/api/` and all `/internal/` closed;
7. add Web CI proof for both GET and POST bridge behavior without generating real production work;
8. produce a new qualified Web artifact;
9. promote only that Web artifact;
10. revalidate login/auth surface and prove the work route reaches Core while the Core work gate is still OFF;
11. only after that becomes GREEN, resume this production execution at **Gate 6 only**.

Gate 6 remains:

```text
WANDORA_HUMAN_DIGITAL_EMPLOYEE_WORK_ENABLED=true
WANDORA_ORGANIZATION_ADAPTER_WORK_WEBHOOK_URL=http://wandora-paperclip:3100/api/plugins/wandora.organization-adapter-v1/webhooks/employee-work
```

After Gate 6 validation, stop again. Do not create work.

The first real work remains a later slice and must begin from a genuine authenticated MEDICSPRO owner instruction.
