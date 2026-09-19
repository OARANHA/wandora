# ADR 0120 — Paperclip -> Wandora/Mastra Production Execution Bridge Activation Preflight V2

- Status: **Accepted preflight — GO for a separately reviewed Production Execution Bridge Activation Execution V1; production remains dormant**
- Date: 2026-09-19
- Scope: revalidate the merged ADR 0119 implementation, freeze exact artifact provenance and current dormant production state, and determine whether the bridge foundation may proceed to a future activation execution. This ADR does not authorize employee resume/activation or messaging outbound.

## REAL NOW

Canonical Git entering this preflight:

```text
main = cb52b601d440b5abb9412005fc6503c7b8065adc
open PRs = 0
PR #169 = merged / closed
PR #169 head = 08bde39716a9b684e652578abc2b15cd100f58d9
PR #169 merge commit = cb52b601d440b5abb9412005fc6503c7b8065adc
```

PR #169 closed ADR 0119's repository-readiness work. All seven final workflows on the PR head were green:

```text
Core Candidate Artifact
Organization Adapter Plugin CI
Paperclip Mastra Adapter CI
Core CI
Messaging Gateway CI
Web CI
Platform Admin CI
```

The old rejected `feat/paperclip-execution-bridge-attestation-v1` branch remains divergent/stale and is not an authority. The squash-merged `feat/paperclip-execution-bridge-runtime-attestation-v1` branch is historical input to PR #169; current `main` is authoritative.

Fresh read-only runtime reconciliation proves:

```text
wandora-core              = healthy / restarts 0
wandora-paperclip         = healthy / restarts 0
wandora-messaging-gateway = healthy / restarts 0
wandora-web               = healthy / restarts 0
supabase-auth             = healthy / restarts 0
supabase-db               = healthy / restarts 0

Core /healthz = 200
Core /readyz  = 200 in the currently disabled bridge mode
Core -> Paperclip /api/health = 200
```

The live Paperclip runtime is still exactly:

```text
image         = wandora/paperclip:v2026.831.1
build version = v2026.831.1
build commit  = 65ec059bde30d98c92165b24a30a540800dd1f6f
source HEAD   = 65ec059bde30d98c92165b24a30a540800dd1f6f
```

No bridge effect has escaped the dormant boundary:

```text
migration 014 resolver                = ABSENT
Core execution bridge enable flag     = ABSENT / OFF
Human Send enable flag                = ABSENT / OFF
Gateway outbound enable flag          = ABSENT / OFF

live bridge HMAC file                 = ABSENT
live Core bridge overlay              = ABSENT
live Paperclip bridge overlay         = ABSENT
live Paperclip adapter store          = []
live wandora_mastra operator package  = ABSENT
```

The unauthenticated adapter API returned `403`; this was not treated as absence evidence. The actual Paperclip adapter JSON store at `/paperclip/adapter-plugins.json` was read internally and is an empty array.

## PROVEN EVIDENCE

### 1. MEDICSPRO / Ana remains exactly in the dormant state

Wandora:

```text
MEDICSPRO organizations                   = 1
digital employees                         = 1
Ana commercial-assistant paused/supervised= 1
employee-provider bindings                = 1
control-plane provider bindings           = 1
completed ana-commercial-v1 hires         = 1
unfinished hires                          = 0
eligibility rows                          = 1
enabled eligibility rows                  = 1
outbound attempts                         = 0
```

Paperclip:

```text
MEDICSPRO company          = exactly 1 / active
Ana                         = exactly 1
role                        = commercial-assistant
status                      = paused
adapterType                 = wandora_mastra
budget                      = 0
last heartbeat              = NULL
managed plugin              = wandora.organization-adapter-v1
managed agent key           = ana-commercial-v1
wakeup requests             = 0
heartbeat runs              = 0
```

The installed Organization Adapter plugin is `ready` and declares only:

```text
agents.managed
webhooks.receive
secrets.read-ref
```

`agents.resume` remains absent.

### 2. Live base Compose is still byte-equivalent to canonical Git

Git blob identity was checked directly against the live files using `git hash-object`.

```text
Paperclip compose.yaml
  f9d29bcceaba982f6f290ef4524403b0b788298b

Core compose.yaml
  b49b565a076859117dcf8a70904fe0e51f3b6150
Core compose.database.yaml
  c3c7f0c7c70a14c96d7f4dc3af8400370c7153f7
Core compose.gateway-ingress.yaml
  bbf7ff98b7f98d8e2bc9f41393cfea77b5a7edc5
Core compose.agent-runtime-deterministic.yaml
  dbc7a3bafad9a44a4c65a3865cfb0cf9787d0681
Core compose.human-api.yaml
  d778fc2251a05fbf8d4d7a96b113e084da209982
Core compose.organization-adapter.yaml
  47f66dfcc6a20580f1b3613c8a03dd1402d111b3
Core compose.human-digital-employee-hire.yaml
  cf188f4e22651f318984f10a17aba3dee05ad2ea
```

The new bridge overlays exist only in Git and remain absent live:

```text
Core bridge overlay Git blob
  9c11adb4e31c14c8aa53523ca413e3cc95bcbcf6

Paperclip bridge overlay Git blob
  47f35c7c6ff50c433b95265ea8ba4423454c9891
```

### 3. Migration 014 source is frozen and still unapplied

```text
migration Git blob
  e4f8527276bb777545bcd8a235fed8d1d43c39dc

verifier Git blob
  fe206e1bf47858b9e56dee028c251f9c065e6c9e

live to_regprocedure(
  wandora_private.resolve_paperclip_execution_organization(text)
) = NULL
```

A merged migration remains code until a future execution explicitly applies and verifies it.

### 4. Adapter provenance is exact and unchanged

Final PR #169 adapter workflow:

```text
workflow run = 35436426465
artifact id  = 10581494403
artifact name= paperclip-mastra-adapter-0a40dac127ae70441598d71a5ce01de0158d2c7f
artifact ZIP sha256
             = ad82c276239e091779aadade7a7067175505f5c4a3f9aa0b0d4e5b0024163952
```

The downloaded final artifact was independently opened and verified:

```text
wandora-paperclip-adapter-mastra-0.1.0.tgz sha256
  0d2e77940c381bb36fc401bdf28080507227f081fe5e45a92f5b36723ed7604f
```

That tgz is byte-identical to the package frozen by ADR 0118.

The package payload files also have identical Git blob SHAs between the canonical bridge implementation and current main:

```text
package.json       3527006f2b249237e74062ca328fb1767002da5c
index.mjs          a77350ba60b94fc7940f7e5ecff82d531a4d7714
README.md          5cfdf17d3e350dd8aa4b081f7fe124a7ebaa9011
compatibility.json 84db05b1a6dfdce38bbf87ce133cf2219ba63243
```

The artifact provenance reports:

```text
wandora_source  = 0a40dac127ae70441598d71a5ce01de0158d2c7f
paperclip_image = wandora/paperclip:v2026.831.1
paperclip_source= 65ec059bde30d98c92165b24a30a540800dd1f6f
adapter_type     = wandora_mastra
```

### 5. Core candidate provenance is current-main exact

Final PR #169 Core candidate workflow:

```text
workflow run = 35436426424
artifact id  = 10582830334
artifact ZIP sha256
             = 6c9daf4528e8f18dbaff2a4d313edf7616915627e19683223bacbd4da449b2fc

source SHA   = 0a40dac127ae70441598d71a5ce01de0158d2c7f
source tree  = abacb9da0949a63210080a01bdd95b087e98d02e
image tag    = wandora/core:organization-adapter-candidate-0a40dac127ae

archive sha256
             = b101033ac47b7f1e4695d5e2a15d288558682d38e0e508cd7d059abd0aae902d
OCI config   = sha256:1a4f06bcc63491d87e8f91532db6b2f042f9117a4f00d560af6de9bbebb7553b
OCI manifest = sha256:1fd3f3d7e63d77a9dc80bb903e85ceba77d14aaa8739464133523d54872f5b14
image user   = node
```

The PR merge-ref, PR head and canonical `main@cb52b601...` all resolve to the exact same Git tree:

```text
abacb9da0949a63210080a01bdd95b087e98d02e
```

The candidate therefore represents the actual merged main tree, including bridge-aware readiness.

### 6. ADR 0119 integrated attestation remains valid

The final Paperclip Mastra Adapter CI proves:

```text
PAPERCLIP_NATIVE_MANAGED_AGENT_FIXTURE_OK
BRIDGE_READINESS_WITHOUT_014_FAILS_CLOSED_OK
BRIDGE_READINESS_WITH_DISPOSABLE_RESOLVER_SHIM_OK
PAPERCLIP_WANDORA_MASTRA_DISPOSABLE_E2E_ATTESTATION_V1_OK
migration_014_applied=false
paperclip_commit=65ec059bde30d98c92165b24a30a540800dd1f6f
run_status=succeeded
execution_id_shape=exec_sha256
issue_id_present=true
```

The attestation uses a real Paperclip run-scoped token but a proof-only resolver shim. The shim is not an activation substitute for migration 014.

### 7. HMAC custody path remains viable

Future canonical host file:

```text
/opt/wandora/stacks/core/secrets/paperclip-execution-bridge-hmac
owner/group = root:wandora-ops
mode        = 0640
```

Fresh host/runtime proof:

```text
wandora-ops GID = 987
Core supplemental GroupAdd = 987
Core process = uid 1000(node), groups 1000 + 987
Paperclip process = uid 0(root)
```

Both runtimes can therefore consume the same dedicated file-backed secret without making it world-readable.

### 8. Old proof containers are isolated, not production evidence

Two old Paperclip proof containers remain running. They are operational hygiene debt, not part of the bridge activation path:

```text
wandora-paperclip-local-proof
  network = host
  volume  = wandora-paperclip-local-proof-data

wandora-paperclip-adapter-proof
  network = default bridge
  volume  = wandora-paperclip-adapter-proof-data
```

Neither uses the live `wandora-core` network or live Paperclip data volume. This preflight deliberately does not remove them because cleanup is a separate effect and their ownership/history was not part of the requested activation boundary.

## GAPS

ADR 0118's implementation gaps are closed.

Remaining gaps are intentionally unexecuted live effects:

- migration 014 is not applied;
- live execution-bridge HMAC does not exist;
- bridge-aware Core candidate is not promoted;
- live Core bridge flag is OFF;
- live Paperclip bridge overlay is not installed;
- `wandora_mastra` is not installed live;
- Ana is paused;
- `agents.resume` is absent;
- Human Send is OFF;
- Gateway outbound is OFF.

There is no remaining repository/CI/disposable-attestation blocker to the bridge-foundation activation transaction.

The two Actions artifacts currently expire on **2026-09-26**. Expiration does not permit substitution. If the future execution cannot retrieve these exact artifacts, stop and perform a fresh provenance reproduction/preflight before any production mutation.

## CAPABILITY AUTHORITY / REUSE GATE

Passes without new domain state.

Paperclip remains authority for:

- company/agent/task/run lifecycle;
- external adapter loading;
- run-scoped local-agent JWT;
- heartbeat/run execution state.

Wandora remains authority for:

- tenant policy;
- exact organization and employee mappings;
- customer-facing employee projection;
- dedicated private HMAC boundary;
- execution eligibility;
- runtime dispatch.

Mastra remains behind the existing Wandora Agent Runtime boundary.

No new scheduler, task model, agent lifecycle, provider registry or parallel control plane is approved.

## DECISION

**GO for a separately executed Production Execution Bridge Activation Execution V1**, limited strictly to the dormant bridge foundation.

The future activation execution is authorized to attempt, in the exact reviewed sequence and with fresh reconciliation immediately before each effect:

1. revalidate main/runtime and exact artifacts;
2. take a fresh scoped production DB backup and prove disposable restore/rehearsal;
3. apply migration 014 exactly once after rehearsal, then run the canonical verifier and independent mapping postverify;
4. create one dedicated execution-bridge HMAC using the ADR 0118 custody contract;
5. stage/load the exact Core candidate and recreate only Core with the bridge overlay;
6. require Core health and bridge-aware readiness to pass, including the migration-014 resolver;
7. stage the Paperclip bridge overlay and recreate only Paperclip, with adapter still absent;
8. require Paperclip health and exact MEDICSPRO/Ana state to remain unchanged;
9. extract the exact adapter tgz into the persistent hash-addressed `/paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/<tgz-sha>/package` path;
10. install `wandora_mastra` exactly once through the official local-directory instance-admin route;
11. read back the adapter/store and run the provider-safe validation;
12. independently prove Ana remains paused with zero wakeups/heartbeats, `agents.resume` remains absent, Human Send remains OFF and Gateway outbound remains OFF;
13. STOP.

This decision does **not** authorize:

- `agents.resume`;
- Ana activation/resume;
- Wandora `paused -> active`;
- Human Send;
- Gateway outbound;
- customer messaging;
- any model/tool side effect beyond the already disposable synthetic attestation.

## SECOND ADVERSARIAL REVIEW

The provisional GO was challenged against these failure modes.

### 1. Stale branch or chat checkpoint chosen as authority

Rejected. Current main is `cb52b601...`, open PRs are zero, and the selected PR #169 artifacts resolve to a source tree exactly equal to current main.

### 2. Adapter provenance drift hidden by an unchanged package name

Rejected. The final artifact ZIP was downloaded and inspected. Its tgz hash is exactly the ADR 0118 hash, and every packed source blob is unchanged.

### 3. Core candidate predates bridge-aware readiness

Rejected. The newly selected PR #169 candidate has source tree `abacb9da...`, exactly equal to current main, and contains the readiness implementation.

### 4. Live `readyz=200` mistaken for bridge readiness

Rejected. The live bridge flag is OFF and migration 014 is absent, so the current 200 only proves the existing runtime. Future execution must promote the selected candidate with the bridge flag ON after migration 014, and then require the new resolver-aware readiness to pass.

### 5. API `403` mistaken for adapter absence

Rejected. Adapter absence is proven from Paperclip's actual JSON plugin store (`[]`) and persistent operator-package storage, not from an unauthenticated API response.

### 6. Installing the adapter could unexpectedly start Ana

Rejected for the current state. Ana is provider-paused, Wandora-paused/supervised, has no wakeup requests and has zero heartbeat runs. `agents.resume` is absent. Installation alone is not provider resume.

### 7. Secret custody requires world-readable permissions

Rejected. The Core already receives the `wandora-ops` supplemental group and Paperclip runs as root; `0640 root:wandora-ops` remains sufficient.

### 8. Old proof containers could be mistaken for live state

Rejected. Their networks and volumes are distinct from live Paperclip. They remain cleanup debt but not activation dependencies.

### 9. Artifact expiration leads to a blind substitute/rebuild

Rejected by contract. Missing/expired exact artifacts force a new provenance gate before any production effect.

### 10. Ambiguous external effect is blindly retried

Rejected. Migration, Core/Paperclip recreation and adapter installation must reconcile current state before retry. Adapter install ambiguity is resolved by exact store/readback state; a second install is not a generic recovery mechanism.

## EXECUTION

This preflight performed only read-only reconciliation and artifact inspection plus canonical documentation.

It did **not**:

- apply migration 014;
- create or alter a live bridge secret;
- copy bridge overlays into the live stacks;
- load/promote/recreate live Core;
- recreate live Paperclip;
- stage or install the live adapter;
- grant `agents.resume`;
- activate/resume Ana;
- enable Human Send;
- enable Gateway outbound;
- remove old proof containers.

## VALIDATION

End-of-preflight required state:

```text
main entering documentation = cb52b601d440b5abb9412005fc6503c7b8065adc
migration 014              = ABSENT
bridge HMAC                 = ABSENT
Core bridge                 = OFF
Paperclip bridge overlay    = ABSENT live
wandora_mastra store        = []
agents.resume               = absent
Ana                         = exactly 1 / paused + supervised
Paperclip Ana wakeups       = 0
Paperclip Ana heartbeat runs= 0
Human Send                  = OFF
Gateway outbound            = OFF
outbound attempts           = 0
runtime health              = GREEN / zero restarts
```

## NEXT

After this documentation is merged and production is re-read one final time, the next executable slice is:

**Paperclip -> Wandora/Mastra Production Execution Bridge Activation Execution V1**

It must follow the exact order above and ADR 0118 rollback contract. It activates only the bridge foundation and must stop with Ana still paused, `agents.resume` absent, Human Send OFF and Gateway outbound OFF.
