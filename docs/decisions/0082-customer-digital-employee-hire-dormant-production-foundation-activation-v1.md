# ADR 0082 — Customer Digital-Employee Hire — Dormant Production Foundation Activation V1

- Status: **Accepted — dormant foundation live**
- Date: 2026-09-18
- Scope: apply migration 013 and promote the reviewed Core/Web candidates while keeping customer hire globally OFF and all tenant eligibility rows absent

## REAL NOW

Canonical Git before execution:

```text
main = a7adf1afda5146977838b4f7936467adf2520903
PR #129 = merged
open PRs = 0
```

ADR 0081 had frozen the exact dormant-foundation order:

```text
fresh backup/rollback evidence
-> migration 013
-> read-only zero-row/authority postverify
-> global customer-hire gate still OFF
-> Core candidate
-> Core validation
-> Web candidate
-> Web validation
-> STOP
```

Pre-execution production state was revalidated:

```text
migration 013 table = ABSENT
migration 013 role  = ABSENT
migration 013 setter= ABSENT

Customer Digital-Employee Hire = OFF / flag absent
Human Send                     = OFF / flag absent
Gateway outbound               = OFF / flag absent

wandora-core              = healthy / 0 restarts
wandora-web               = healthy / 0 restarts
wandora-paperclip         = healthy / 0 restarts
wandora-messaging-gateway = healthy / 0 restarts
```

Pre-execution durable counts:

```text
organizations                 = 3
digital_employees             = 4
control_plane_provider_bindings = 2
digital_employee_provider_bindings = 2
digital_employee_hire_operations = 2
tenant_provisioning_requests = 1
```

## PROVEN EVIDENCE — MIGRATION ARTIFACT

Canonical migration:

```text
infra/stacks/supabase/migrations/20260918_013_customer_hire_tenant_eligibility_v1.sql
Git blob = d820ef684bccfb329b9479c362f3a5a26c5225d9
SHA-256  = 68ea0376a15e87afe1ade0be9fcbe0463513cb7b34515053808ad9ac33f2e3a2
```

The staged production copy was verified with `git hash-object` against the canonical Git blob immediately before execution.

No hand-edited or locally reconstructed SQL was used.

## PROVEN EVIDENCE — BACKUP / RESTORE CONFIDENCE

Fresh pre-migration backup:

```text
/home/wandora-admin/backups/customer-hire-foundation-20260918T123446Z/
  wandora-postgres-pre-migration013.dump
  SHA256SUMS
  live-counts.txt

dump SHA-256 =
9ab8ebc19342be406d1b505073b6dbddce3fd7314014ddac743c745d565ee423

dump bytes = 491815
```

The first disposable restore attempt intentionally used the full Supabase database dump against a fresh Supabase PostgreSQL image. It failed because the restore attempted to recreate Supabase/internal objects already managed by that image and the disposable instance terminated the restore connection.

That failed proof did **not** touch production and was not accepted as recovery evidence.

A second scoped restore attempt against the Supabase image also hit the image's internal lifecycle during post-data ACL restoration. It likewise did not touch production and was rejected as proof.

The final accepted restore proof used a clean pinned PostgreSQL engine matching production major/minor:

```text
postgres:17.6-bookworm
pulled digest = sha256:f3bd19c606e442c3d7bdfa8002e03fe260a1023351e0ea4598032022b68dd6e3
```

Only Wandora-owned schemas were restored:

```text
wandora
wandora_private
```

The disposable target received only the empty capability roles/namespaces necessary to receive the dump. No Wandora migrations were executed in the restore target and no fixture data was invented.

Accepted restore result:

```text
SCOPED_RESTORE_OK=true

organizations=3
digital_employees=4
control_bindings=2
employee_bindings=2
hire_operations=2
tenant_provisioning_requests=1
migration013_table=ABSENT
```

Those counts exactly matched the live pre-migration snapshot.

The disposable restore container was removed after validation.

## SECOND ADVERSARIAL REVIEW — PRE-MIGRATION

The execution was challenged against these failure modes:

1. **Apply a stale/local SQL copy** — rejected; exact Git blob proof required.
2. **Treat backup creation as sufficient recovery proof** — rejected; restore had to succeed in a disposable target.
3. **Accept the first failed full-Supabase restore anyway** — rejected.
4. **Modify production to create a restore clone** — rejected; recovery proof stayed disposable and isolated.
5. **Apply migration and deploy in one opaque step** — rejected; migration/postverify had to finish before runtime promotion.
6. **Enable eligibility while applying the migration** — rejected; zero rows is a hard invariant.
7. **Enable the global hire flag with the Core deploy** — rejected; the hire overlay remains absent.

No blocker remained after exact SQL and scoped restore proof were green.

## EXECUTION — MIGRATION 013

The canonical migration was applied once through the local protected PostgreSQL administration boundary:

```text
BEGIN
...
COMMIT
MIGRATION_013_APPLY_OK=true
```

No eligibility row was inserted.

### Read-only production postverify

The live postverify used `BEGIN READ ONLY` and did not create temporary eligibility fixtures.

Proven state:

```text
table  = wandora_private.digital_employee_catalog_hire_eligibility
setter = wandora_private.set_digital_employee_catalog_hire_eligibility(uuid,text,boolean)
rows   = 0

wandora_customer_hire_operator:
  login       = false
  superuser   = false
  createdb    = false
  createrole  = false
  inherit     = false
  replication = false
  bypassrls   = false

RLS = true
policy = digital_employee_catalog_hire_eligibility_core_runtime_read
policy command = SELECT
policy role    = wandora_core_runtime
```

Privileges:

```text
wandora_core_runtime table:
  SELECT=true
  INSERT=false
  UPDATE=false
  DELETE=false
setter EXECUTE=false

wandora_customer_hire_operator table:
  SELECT=false
  INSERT=false
  UPDATE=false
  DELETE=false
setter EXECUTE=true

wandora_platform_provisioner table:
  SELECT=false
  INSERT=false
  UPDATE=false
  DELETE=false
setter EXECUTE=false

anon/authenticated/service_role/supabase_functions_admin:
  table authority=false
  setter authority=false
```

Effect switches remained OFF immediately after migration.

## PROVEN EVIDENCE — CORE CANDIDATE

Selected GitHub Actions artifact:

```text
workflow run = 35342874221
artifact id  = 10546175795
artifact name=
core-organization-adapter-candidate-af542864d267c0d186bae7272b208a4ee676f1cc
artifact ZIP SHA-256 =
58921a23ea4b6bd0a281815f02900b8e604e37317791b320e91409ce4fd341c6
```

Portable candidate manifest:

```text
candidate_contract = organization-adapter-core-v1
source_sha = af542864d267c0d186bae7272b208a4ee676f1cc
source_tree_sha = 1438f0b4c33a7dda4d7ec8de94755f4e5f93122e
image_tag = wandora/core:organization-adapter-candidate-af542864d267
runner image/config digest =
sha256:080a26843cbdc3187349367f939d7aae0d1daadbbb5e1455b9449f8187f62a44
OCI manifest digest =
sha256:db9101fbca51dfff08aac90304c47957c31afe6d6c0fc3add830fc9755d9dfec
candidate tar SHA-256 =
895b7791c2c546b91c2a6413ba9e3184132244c02c1c88eee2ae1a67178adc03
```

The canonical verifier itself was staged byte-for-byte:

```text
apps/core/scripts/verify-organization-adapter-candidate-archive-v1.py
Git blob = 16c11020e9b0e6147d186861cb689ac33ed7f148
```

Result:

```text
PORTABLE_CANDIDATE_ARCHIVE_V1_OK
```

Docker on the production host reports the loaded image by the recorded OCI manifest digest. This representation difference was explicitly checked and accepted only after the canonical archive verifier passed.

## CORE COMPOSE DRIFT GATE

The six live Core Compose files matched canonical Git blobs exactly:

```text
compose.yaml                              b49b565a076859117dcf8a70904fe0e51f3b6150
compose.database.yaml                     c3c7f0c7c70a14c96d7f4dc3af8400370c7153f7
compose.gateway-ingress.yaml              bbf7ff98b7f98d8e2bc9f41393cfea77b5a7edc5
compose.agent-runtime-deterministic.yaml  dbc7a3bafad9a44a4c65a3865cfb0cf9787d0681
compose.human-api.yaml                    d778fc2251a05fbf8d4d7a96b113e084da209982
compose.organization-adapter.yaml         47f66dfcc6a20580f1b3613c8a03dd1402d111b3
```

Current vs candidate render diff contained exactly one operational delta:

```diff
- image: wandora/core:organization-adapter-candidate-068d30a49d9b
+ image: wandora/core:organization-adapter-candidate-af542864d267
```

No network, mount, secret, flag, port, healthcheck or security setting changed.

Rollback render was retained before recreation.

## EXECUTION — CORE PROMOTION

Core was recreated through the same six reviewed Compose overlays.

Result:

```text
wandora-core = healthy
image = wandora/core:organization-adapter-candidate-af542864d267
restarts = 0
read_only_rootfs = true
published host ports = none
networks = wandora-core, wandora-data
```

Runtime startup proof:

```text
mode                     = database
gatewayIngress           = true
humanApi                 = true
humanSendProposal        = false
humanDigitalEmployeeHire = false
organizationAdapter      = true
agentRuntime             = mastra-deterministic
```

Runtime probes:

```text
/healthz = 200
/readyz  = 200

GET  /api/v1/me without token                = 401
POST /internal/v1/gateway/inbound unsigned   = 401
private Paperclip /api/health from Core      = 200
```

No durable Wandora counts changed and eligibility remained at zero rows.

## PROVEN EVIDENCE — WEB CANDIDATE

Selected GitHub Actions artifact:

```text
workflow run = 35342874195
artifact id  = 10545940553
artifact name=
web-candidate-af542864d267c0d186bae7272b208a4ee676f1cc
artifact ZIP SHA-256 =
97a2ee934d59c98f8fa9d4be2a58792ce312f063afcbe89704144b4c429dbdfa
```

Artifact manifest:

```text
candidate_contract = wandora-web-reviewed-bridge-v1
source_sha = af542864d267c0d186bae7272b208a4ee676f1cc
source_tree_sha = 1438f0b4c33a7dda4d7ec8de94755f4e5f93122e
image_tag = wandora/web:candidate-af542864d267
runner config digest =
sha256:56675f744f50580ce189743b55352a36947040f134bf7ea1d080468fc8b70ce4
web-image.tar SHA-256 =
8c5c95c3ba99dcdb1723ada3406f0761c14200b08ae824b77b828bf5c603e6af
```

The Web tar was independently inspected:

- exactly one expected RepoTag;
- config blob SHA-256 matched the Actions manifest;
- artifact `SHA256SUMS` passed.

The production Web Compose file matched canonical Git blob:

```text
423dc012e9dff710ad3c3fd323502e605a95b24e
```

Current vs candidate render again differed only in the image line.

## EXECUTION — WEB PROMOTION

The existing Web `.env` was copied to a protected rollback file before changing the image pointer.

Promoted image:

```text
wandora/web:candidate-af542864d267
```

Result:

```text
wandora-web = healthy
restarts = 0
published host ports = none
networks = wandora-core, wandora-edge
```

Public route checks:

```text
/healthz       = 200
/              = 200
/login         = 200
/team          = 200
/work          = 200
/conversations = 200
/company       = 200
/start         = 200
```

## FINAL VALIDATION

Final production state:

```text
migration 013 table  = LIVE
migration 013 setter = LIVE
operator role        = LIVE / NOLOGIN
eligibility rows     = 0

Core image = wandora/core:organization-adapter-candidate-af542864d267
Core       = healthy / ready / 0 restarts

Web image  = wandora/web:candidate-af542864d267
Web        = healthy / 0 restarts

Customer Digital-Employee Hire = OFF
Human Send                     = OFF
Gateway outbound               = OFF
```

Durable counts remained unchanged from the pre-execution snapshot:

```text
organizations                     = 3
digital_employees                 = 4
control_plane_provider_bindings   = 2
digital_employee_provider_bindings= 2
digital_employee_hire_operations  = 2
tenant_provisioning_requests      = 1
```

Rollback assets remain locally available:

```text
previous Core image = wandora/core:organization-adapter-candidate-068d30a49d9b
previous Web image  = wandora/web:team-read-b31db507
fresh pre-migration database backup = present
Core rollback render/record = present
Web pre-promotion .env = present
```

## EFFECT BOUNDARY

This slice did **not**:

- create any tenant eligibility row;
- enable the process-wide customer-hire runtime flag;
- execute a customer hire;
- activate any employee;
- enable Human Send;
- enable Gateway outbound;
- mutate Paperclip company/agent/config state;
- reconcile the legacy `Empresa Exemplo` Ana;
- create a new tenant.

## SECOND ADVERSARIAL REVIEW — POST-EXECUTION

The completed state was challenged again:

1. **Could the new Web expose hire merely because it contains the UI?**  
   No. Core startup proves `humanDigitalEmployeeHire=false`; the Web is projection-driven and the server remains the authorization/effect boundary.

2. **Could migration 013 itself make a tenant eligible?**  
   No. Live row count is exactly zero.

3. **Could Core promotion have silently altered provider state?**  
   No. Hire is disabled and all employee/binding/hire counts remained unchanged.

4. **Could rollback be blocked by missing previous images?**  
   No. Both previous Core and Web images remain loaded.

5. **Did artifact-ID differences after load imply unreviewed binaries?**  
   No. Core passed the canonical portable archive verifier; Web config digest and archive hashes match Actions evidence.

6. **Should eligibility or the global gate now be enabled because the foundation is green?**  
   No. Those remain separately reviewed effects.

## DECISION RESULT

**Dormant Production Foundation Activation V1 is complete and green.**

The eligibility contract and reviewed customer Web/Core are now live, but no customer can start a new catalog hire because:

```text
global customer-hire gate = OFF
AND
eligibility rows = 0
```

The platform is therefore production-ready for the next controlled rollout decision without exposing a new hire effect yet.

## NEXT EXECUTABLE SLICE

**Customer Digital-Employee Hire — Global Runtime Gate Activation Preflight V1.**

Preflight only.

It must revalidate the dormant foundation, prove that enabling the global gate with zero eligibility rows still exposes no tenant-specific hire, freeze the exact Core-only overlay/render/rollback sequence, and explicitly decide whether the global gate or the first clean tenant eligibility should be activated first.

No global gate or tenant eligibility should be enabled merely because ADR 0082 is green.
