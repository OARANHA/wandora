# ADR 0118 — Paperclip -> Wandora/Mastra Production Execution Bridge Activation Preflight V1

- Status: **Accepted preflight — NO-GO for Production Activation Execution V1; production bridge remains dormant**
- Date: 2026-09-19
- Scope: freeze the production activation order, artifact provenance, dedicated bridge-HMAC custody, migration-014 verification, Core/Paperclip runtime promotion, rollback and synthetic end-to-end proof without applying migration 014, installing the live adapter, recreating live runtimes, creating live secrets, granting `agents.resume`, resuming Ana, enabling Human Send or enabling Gateway outbound.

## REAL NOW

Canonical Git entering the preflight:

```text
main = 2d4adc5c81ce6ce36554fd9e3fa399656dd7d612
open PRs = 0
PR #166 = merged / bridge code+CI
PR #167 = merged / ADR 0117 closure
```

A stale unmerged branch named `feat/paperclip-execution-bridge-attestation-v1` also exists. It is more than one hundred commits behind current `main`, has no PR, and is **not** authoritative. It must not be merged or used as production provenance merely because its name is related.

Fresh read-only production reconciliation after an interrupted chat proves:

```text
wandora-core
  image   = wandora/core:organization-adapter-candidate-af542864d267
  health  = healthy
  restarts= 0

wandora-paperclip
  image   = wandora/paperclip:v2026.831.1
  health  = healthy
  restarts= 0

wandora-messaging-gateway
  image   = wandora/messaging-gateway:origin-fix-94cfb4de
  health  = healthy
  restarts= 0

Core Paperclip Execution Bridge flag = absent / OFF
Human Send flag                      = absent / OFF
Gateway outbound flag                = absent / OFF

migration 014 resolver = ABSENT
live adapter wandora_mastra = ABSENT / exact adapter read returns 404
Organization Adapter plugin = ready / 0.1.0
Organization Adapter capabilities =
  agents.managed
  webhooks.receive
  secrets.read-ref
agents.resume = absent
```

MEDICSPRO remains exactly:

```text
Wandora employee count      = 1
employee                    = Ana
role                        = commercial-assistant
status                      = paused
autonomy                    = supervised
employee provider bindings  = 1
ana-commercial-v1 hires     = 1 / completed
unfinished hires            = 0

Paperclip Ana count          = 1
Paperclip status             = paused
adapterType                  = wandora_mastra
lastHeartbeatAt              = null
managed plugin               = wandora.organization-adapter-v1
managed key                  = ana-commercial-v1

MEDICSPRO outbound attempts  = 0
```

No prior bridge activation escaped the previous checkpoint.

## PROVEN EVIDENCE

### 1. Live Compose is canonical before any bridge activation

The live Paperclip Compose blob matches Git exactly:

```text
infra/stacks/paperclip/compose.yaml
Git/live blob = f9d29bcceaba982f6f290ef4524403b0b788298b
```

The live Core is currently composed from exactly these seven files, and every live file matches the current Git blob:

```text
compose.yaml                              b49b565a076859117dcf8a70904fe0e51f3b6150
compose.database.yaml                     c3c7f0c7c70a14c96d7f4dc3af8400370c7153f7
compose.gateway-ingress.yaml              bbf7ff98b7f98d8e2bc9f41393cfea77b5a7edc5
compose.agent-runtime-deterministic.yaml  dbc7a3bafad9a44a4c65a3865cfb0cf9787d0681
compose.human-api.yaml                    d778fc2251a05fbf8d4d7a96b113e084da209982
compose.organization-adapter.yaml         47f66dfcc6a20580f1b3613c8a03dd1402d111b3
compose.human-digital-employee-hire.yaml  cf188f4e22651f318984f10a17aba3dee05ad2ea
```

The live Paperclip container currently has only its persistent `/paperclip` volume mounted. It does **not** have a bridge-HMAC mount or the adapter-required bridge URL/secret-file environment.

### 2. Migration 014 source and verifier are canonical but not live

Canonical source:

```text
infra/stacks/supabase/migrations/20260919_014_paperclip_execution_binding_resolver_v1.sql
Git blob = e4f8527276bb777545bcd8a235fed8d1d43c39dc
```

Canonical verifier:

```text
infra/stacks/supabase/verifiers/VERIFY_20260919_PAPERCLIP_EXECUTION_BINDING_RESOLVER_V1.sql
Git blob = fe206e1bf47858b9e56dee028c251f9c065e6c9e
```

The migration creates only:

```text
wandora_private.resolve_paperclip_execution_organization(text)
```

with `SECURITY DEFINER`, explicit `search_path`, PUBLIC revoked and EXECUTE granted only to `wandora_core_runtime`.

The verifier proves:

- function presence;
- browser-role denial;
- `wandora_core_runtime` EXECUTE;
- active-company mapping;
- suspended-company non-resolution.

Its synthetic rows are created only inside a transaction that ends in `ROLLBACK`.

### 3. Adapter artifact provenance is exact

The selected private GitHub Actions artifact came from the green PR #166 merge-ref workflow:

```text
workflow run = 35430540600
artifact id  = 10580337991
artifact name=
paperclip-mastra-adapter-88b4b333df7c79f72a3126730f3b3ebb3f87b16b

artifact ZIP SHA-256 =
bd523953c42b2e8be23311c70c55be01c9248248e2e38358761e8c7d29a2414f
```

The artifact was independently inspected during this preflight outside production.

Exact contents:

```text
provenance.txt
wandora-paperclip-adapter-mastra-0.1.0.tgz
wandora-paperclip-adapter-mastra-0.1.0.tgz.sha256
```

Exact package SHA-256:

```text
0d2e77940c381bb36fc401bdf28080507227f081fe5e45a92f5b36723ed7604f
```

Artifact provenance:

```text
wandora_source=88b4b333df7c79f72a3126730f3b3ebb3f87b16b
paperclip_image=wandora/paperclip:v2026.831.1
paperclip_source=65ec059bde30d98c92165b24a30a540800dd1f6f
adapter_type=wandora_mastra
```

The tarball contains exactly:

```text
package/README.md
package/compatibility.json
package/index.mjs
package/package.json
```

The CI proof loaded that exact package through the pinned Paperclip external-adapter loader, proved `supportsLocalAgentJwt=true`, context minimization and run-token/header separation.

If this short-lived Actions artifact expires before production execution, a replacement build is acceptable only if it is reproduced from the code-equivalent canonical tree and the resulting package SHA-256 equals the frozen value above. Any byte drift is a stop/review event.

### 4. Core candidate provenance is exact and current-code-equivalent

Selected Core artifact:

```text
workflow run = 35430540748
artifact id  = 10580881710
artifact name=
core-organization-adapter-candidate-88b4b333df7c79f72a3126730f3b3ebb3f87b16b

artifact ZIP SHA-256 =
0387b4bf0f08f2c518b6249bf9515a37a080ffd4b36403d547902f5410ca1c05
```

Portable candidate manifest:

```text
candidate_contract = organization-adapter-core-v1
source_sha = 88b4b333df7c79f72a3126730f3b3ebb3f87b16b
source_tree_sha = fb69ab98faa7cf116fadb9b17974cf0f65224dd9
image_tag = wandora/core:organization-adapter-candidate-88b4b333df7c
oci_config_digest =
sha256:4c610084bb6de14a689b0668015868d7eb62c28e0cbb06f168015949699f0737
oci_manifest_digest =
sha256:0f719efbb96e77ef3fbe93e67da3a37c1a59cd8bd42f9a42c11836cdfebd5bb2
archive_sha256 =
b4acc5bac69743493865a69fa51757d32d2ab5bc738d9b277fccd62c3e3a7287
```

The PR merge-ref commit `88b4b333...` and the canonical squash merge `7bc8c479...` have the exact same Git tree:

```text
fb69ab98faa7cf116fadb9b17974cf0f65224dd9
```

Current `main` at `2d4adc5c...` differs from the code merge only by documentation files. Therefore this candidate is accepted as current-code-equivalent for the bridge implementation; rebuilding merely because the commit SHA differs is rejected.

### 5. Canonical Core bridge overlay exists, but only on Git

Canonical overlay:

```text
infra/stacks/core/compose.paperclip-execution-bridge.yaml
Git blob = 9c11adb4e31c14c8aa53523ca413e3cc95bcbcf6
```

It adds only:

```text
WANDORA_PAPERCLIP_EXECUTION_BRIDGE_ENABLED=true
WANDORA_PAPERCLIP_AGENT_ME_URL=http://wandora-paperclip:3100/api/agents/me
WANDORA_PAPERCLIP_EXECUTION_BRIDGE_SECRET_FILE=/run/secrets/wandora/paperclip-execution-bridge.hmac
read-only mount of the dedicated HMAC file
```

The overlay is intentionally absent from the live Core stack.

## GAPS

### Gap A — Paperclip has no canonical runtime bridge overlay

The adapter itself requires:

```text
WANDORA_PAPERCLIP_EXECUTION_BRIDGE_URL=
  http://wandora-core:8788/internal/v1/paperclip/execution

WANDORA_PAPERCLIP_EXECUTION_BRIDGE_SECRET_FILE=
  /run/secrets/wandora/paperclip-execution-bridge.hmac
```

but canonical/live Paperclip Compose defines neither and mounts no bridge secret.

Installing the adapter before a durable Paperclip-side runtime contract exists would create a registration that cannot be relied on across normal restart/recreation. This is a hard blocker.

The required code-only overlay contract is frozen as:

```text
infra/stacks/paperclip/compose.paperclip-execution-bridge.yaml

services:
  paperclip:
    environment:
      WANDORA_PAPERCLIP_EXECUTION_BRIDGE_URL:
        "http://wandora-core:8788/internal/v1/paperclip/execution"
      WANDORA_PAPERCLIP_EXECUTION_BRIDGE_SECRET_FILE:
        "/run/secrets/wandora/paperclip-execution-bridge.hmac"
    volumes:
      - "${WANDORA_PAPERCLIP_EXECUTION_BRIDGE_SECRET_FILE_HOST:?required}:/run/secrets/wandora/paperclip-execution-bridge.hmac:ro"
```

It must receive a Compose render/CI test before production use.

### Gap B — Core readiness does not yet attest the bridge database boundary

The current `/readyz` checker validates the base DB role/scope, Organization Adapter tables and customer-hire eligibility table when those capabilities are enabled.

It does **not** currently check that:

```text
wandora_private.resolve_paperclip_execution_organization(text)
```

exists/is callable when the Paperclip Execution Bridge flag is enabled.

Migration-first ordering reduces risk but does not make `/readyz` truthful after a later database restore/drift event. This is a hard readiness gap.

The next code-only slice must add a bridge-specific readiness check and fail-closed reason before production activation.

### Gap C — no integrated disposable Paperclip -> Core -> Mastra proof exists yet

Current evidence is strong but split:

- adapter package/loader proof is green;
- HMAC/request-contract tests are green;
- Paperclip run-token identity client tests are green;
- Core DB binding integration test is green;
- Mastra deterministic assigned-task test is green.

There is not yet one disposable proof that exercises the chain through an actual pinned Paperclip runtime/run-scoped token into the Core candidate and then the existing Agent Runtime/Mastra boundary.

A production activation must not substitute MEDICSPRO Ana for that proof because she must remain paused and must not be resumed during bridge activation.

The required proof is therefore an isolated disposable attestation using synthetic provider/data state only. It must leave production Paperclip, production PostgreSQL and MEDICSPRO unchanged.

## CAPABILITY AUTHORITY / REUSE GATE

### Capability needed

Allow the accepted Paperclip control plane to dispatch a reviewed assigned task into Wandora's existing Agent Runtime/Mastra implementation through a private replaceable boundary.

### Existing specialist authority

Paperclip owns:

- provider company/agent/run identity;
- run-scoped local agent token;
- external-adapter dispatch;
- task/run lifecycle.

Mastra owns execution behind the existing Wandora Agent Runtime.

### Wandora-owned authority

Wandora owns:

- private bridge trust and HMAC;
- tenant/employee mapping;
- exact managed-catalog compatibility policy;
- active/supervised execution policy;
- provider-neutral task input/output;
- audit/reconciliation expectations.

### Reuse result

**PASS — continue reusing Paperclip + the existing Wandora Agent Runtime/Mastra boundary.**

Do not build a second scheduler, provider run state machine, task engine or employee lifecycle.

The three gaps above are deployment/readiness/attestation gaps, not evidence for a new Wandora domain subsystem.

## DECISION

**NO-GO for Production Execution Bridge Activation Execution V1 today.**

The bridge implementation itself is accepted. The production activation sequence is not yet executable because the Paperclip-side persistent runtime overlay, bridge-specific Core readiness proof and one integrated disposable E2E attestation are missing.

Production remains exactly dormant.

## SECOND ADVERSARIAL REVIEW

Rejected:

1. **Install the adapter now and add env/mount later.**  
   Rejected. Registration would precede its durable runtime trust contract.

2. **Install the tgz directly as a Paperclip local path.**  
   Rejected. Paperclip local-path loading expects a directory containing `package.json`, not a tarball file.

3. **Install from `/tmp` or another ephemeral extracted directory.**  
   Rejected. The adapter store persists `localPath`; restart must not point to a disappeared path.

4. **Use npm registry installation.**  
   Rejected. The canonical package is a private CI artifact, not a reviewed public registry release.

5. **Reuse the Organization Adapter HMAC or Messaging HMAC.**  
   Rejected. The execution bridge is a separate directional trust boundary.

6. **Trust `/readyz=200` after merely applying migration 014.**  
   Rejected. Current readiness does not independently probe the bridge resolver.

7. **Use MEDICSPRO Ana to prove end-to-end execution.**  
   Rejected. That would require activation/resume or an invalid provider/Wandora lifecycle mismatch.

8. **Grant `agents.resume` as part of bridge activation.**  
   Rejected. Resume/customer activation is a separate capability and ADR boundary.

9. **Enable Human Send or Gateway outbound because Mastra execution is available.**  
   Rejected. Execution and external-send authority are independent effects.

10. **Rebuild the Core candidate because current `main` has a different commit SHA.**  
    Rejected. The reviewed candidate source tree is byte-identical to the canonical bridge code tree.

11. **Reuse the stale `feat/paperclip-execution-bridge-attestation-v1` branch.**  
    Rejected. It is materially behind current `main`, unmerged and non-authoritative.

## FROZEN CUSTODY CONTRACT

Future Activation Execution V1 must create exactly one new execution-bridge HMAC with:

```text
host path:
/opt/wandora/stacks/core/secrets/paperclip-execution-bridge-hmac

owner:
wandora-admin:wandora-ops

mode:
0640

generation:
openssl rand -hex 32
```

The plaintext must never enter Git, chat, PostgreSQL, Docker environment values, Paperclip config, logs or business payloads.

It is mounted read-only into both runtimes at:

```text
/run/secrets/wandora/paperclip-execution-bridge.hmac
```

Before use, hash-only proof must show:

- Core mount bytes == host file bytes;
- Paperclip mount bytes == host file bytes;
- bridge HMAC hash differs from Gateway ingress, Core outbound and Organization Adapter HMAC material.

The Core already has the required `wandora-ops` supplementary group through its database overlay. Paperclip currently runs with the image default/root user and can consume the read-only bind mount without broadening any customer authority.

## FROZEN ADAPTER INSTALL CONTRACT

The verified tgz must be extracted into a restart-stable path inside the existing persistent `/paperclip` volume:

```text
/paperclip/operator-packages/
  wandora-paperclip-adapter-mastra-v1/
  0d2e77940c381bb36fc401bdf28080507227f081fe5e45a92f5b36723ed7604f/
  package/
```

The exact install is the official instance-admin adapter route/CLI using a **local directory**:

```text
packageName =
/paperclip/operator-packages/wandora-paperclip-adapter-mastra-v1/
0d2e77940c381bb36fc401bdf28080507227f081fe5e45a92f5b36723ed7604f/
package

isLocalPath = true
```

Never point the adapter store at a host temp directory, Actions workspace or unpacked path outside persistent Paperclip storage.

Required post-install readback:

```text
adapter type = wandora_mastra
package name/path = exact frozen local path
version = 0.1.0
supportsLocalAgentJwt = true
test-environment = pass for the intended company/runtime configuration
```

An ambiguous install response must be reconciled first with exact `adapter get wandora_mastra` and adapter-store/readback state. Do not blindly repeat the install request.

## FROZEN MIGRATION 014 ORDER

Future execution must use this exact sequence:

1. prove migration 014 is still absent;
2. create a fresh scoped backup of `wandora` + `wandora_private`;
3. prove that backup by disposable restore;
4. on the disposable restore, apply migration 014 twice and run the canonical verifier;
5. verify the staged live SQL/verifier against the canonical Git blobs;
6. apply migration 014 once to production through the protected local DB-admin boundary;
7. run the canonical verifier exactly as committed;
8. run a separate production read-only postverify proving:
   - resolver exists;
   - only `wandora_core_runtime` has the intended EXECUTE authority;
   - exact MEDICSPRO Paperclip company ref resolves to the exact active MEDICSPRO organization;
   - durable organization/employee/binding/hire/outbound counts did not change;
9. only after all of that may Core promotion begin.

If any database step is ambiguous, stop before runtime promotion and reconcile schema/privileges first.

## FUTURE ACTIVATION EXECUTION V1 — EXACT ORDER

This order is **conditional on the next code-only readiness/attestation slice being merged and green**.

### 0. Reconcile again

Re-read canonical Git and live state. Abort if any bridge/migration/adapter/secret effect is already present but not reconciled.

### 1. Artifact and disposable attestation gate

Verify:

- adapter ZIP/package hashes and provenance;
- Core candidate archive/manifest/OCI digests;
- current bridge code tree remains equivalent;
- new Paperclip runtime overlay is canonical;
- new Core bridge-readiness check is canonical;
- integrated disposable Paperclip -> Core -> Agent Runtime/Mastra attestation is green with synthetic data and synthetic HMAC only.

No production mutation before this gate.

### 2. Migration 014

Execute the frozen migration order above.

### 3. Create dedicated live bridge HMAC

Create the one reviewed secret file only after migration validation.

Do not expose plaintext. Prove only metadata and hashes.

### 4. Core promotion

Load/verify the provenance-matched Core candidate.

Stage the exact canonical Core bridge overlay.

Render current seven overlays plus:

```text
compose.paperclip-execution-bridge.yaml
```

The accepted render delta must be limited to:

- Core image -> reviewed candidate;
- bridge enable flag;
- canonical private Paperclip `/api/agents/me` URL;
- bridge secret-file path;
- one read-only bridge-HMAC mount.

No public port, network, user, rootfs, Human Send or outbound delta is permitted.

Retain an exact rollback render using the current live image and the existing seven overlays without the bridge overlay.

Recreate only `wandora-core`.

Required validation:

```text
healthz = 200
readyz  = 200
startup paperclipExecutionBridge = true
organizationAdapter = true
humanDigitalEmployeeHire = true
humanSendProposal = false
agentRuntime = mastra-deterministic
unsigned bridge POST = 401
private Paperclip /api/health from Core = 200
```

### 5. Paperclip runtime bridge overlay

With the adapter still absent and Ana still paused:

- stage the reviewed Paperclip bridge overlay;
- render base + bridge overlay;
- require the only deltas to be the bridge URL and one read-only HMAC mount/secret-file env;
- retain a base-only rollback render;
- recreate only `wandora-paperclip`;
- prove health 200 and zero agent/provider-state drift;
- prove the shared HMAC by hash only.

### 6. Adapter package staging and install

- verify artifact ZIP and tgz hashes again;
- extract into the frozen persistent `/paperclip/operator-packages/.../<package-sha>/package` directory;
- install once through the official instance-admin adapter CLI local-path contract;
- reconcile on ambiguity before any retry;
- read back exact type/version/path;
- run adapter `test-environment`;
- prove Paperclip remains healthy.

### 7. Final bridge-foundation validation and STOP

Before declaring the bridge foundation active:

```text
migration 014 = live + verified
Core bridge   = ON + healthy/ready
Paperclip bridge runtime config = ON
wandora_mastra adapter = registered + healthy

MEDICSPRO Ana / Wandora   = paused + supervised
MEDICSPRO Ana / Paperclip = paused
lastHeartbeatAt           = null

agents.resume    = still absent
Human Send       = OFF
Gateway outbound = OFF
outbound attempts/messages for MEDICSPRO = unchanged
```

Do not resume Ana. Do not grant `agents.resume`. Do not expose a customer activation action in this execution slice.

## ROLLBACK / ABORT CONTRACT

### Before migration

Any artifact/provenance/attestation mismatch => abort with no production effect.

### Migration/verifier failure

Stop before any runtime/secret creation.

If migration committed but postverify is red, keep the bridge OFF. Reconcile the function/privileges first. If exact pre-slice schema restoration is required, disable bridge consumers first and either drop only the new resolver in a reviewed transaction or restore the fresh scoped backup. Never continue into runtime activation on a red database boundary.

### Core promotion failure

Recreate Core from the retained previous image + current seven overlays, without the bridge overlay. Verify previous health/readiness and all effect switches.

### Paperclip overlay failure

Keep adapter absent. Recreate Paperclip from the retained base-only composition and revalidate the exact paused Ana.

### Adapter install ambiguity/failure

Do not retry blindly.

First run exact adapter readback:

- if exact `wandora_mastra@0.1.0` with the frozen local path is registered, treat the install effect as completed and continue validation;
- if definitively absent after a confirmed failed dispatch, the same frozen request may be retried once under the same reviewed artifact;
- if mismatched/partial/unknown, stop for reconciliation.

Rollback order after a confirmed install is:

1. unregister/delete `wandora_mastra`;
2. prove exact adapter read returns 404;
3. only then remove the staged package directory if desired;
4. revert Paperclip bridge overlay;
5. revert Core bridge overlay/image if required;
6. remove the bridge secret only after neither runtime mounts it.

Never delete or alter MEDICSPRO Ana/hire/bindings as rollback for bridge infrastructure.

## EXECUTION PERFORMED BY THIS PREFLIGHT

This preflight performed only:

- canonical Git/PR/branch inspection;
- live read-only DB/runtime/provider reconciliation;
- artifact retrieval/inspection outside production;
- Compose/source comparison;
- repository documentation.

It did **not**:

- apply migration 014;
- create/drop the live resolver;
- create or alter a live bridge secret;
- stage or install the adapter into live Paperclip;
- recreate/promote live Core;
- recreate live Paperclip;
- grant `agents.resume`;
- resume/activate Ana;
- enable Human Send;
- enable Gateway outbound;
- send an outbound message.

## VALIDATION

Final no-effect state remains:

```text
main entering documentation execution = 2d4adc5c81ce6ce36554fd9e3fa399656dd7d612

migration 014       = ABSENT
wandora_mastra live = ABSENT / 404
Core bridge         = OFF
agents.resume       = absent

MEDICSPRO Ana/Wandora   = exactly 1 / paused + supervised
MEDICSPRO binding       = exactly 1
MEDICSPRO hire          = exactly 1 / completed
MEDICSPRO Ana/Paperclip = exactly 1 / paused / no heartbeat

Human Send       = OFF
Gateway outbound = OFF
outbound attempts for MEDICSPRO = 0
```

## NEXT EXECUTABLE SLICE

**Paperclip -> Wandora/Mastra Production Execution Bridge Runtime Custody + Readiness + Disposable E2E Attestation Implementation V1.**

That slice is repository/CI/disposable-proof only.

It must:

1. add the canonical Paperclip bridge overlay;
2. add Core bridge-specific readiness attestation for migration 014;
3. add/prove one disposable integrated Paperclip -> Core -> Agent Runtime/Mastra execution using synthetic state and the exact pinned Paperclip/runtime contracts;
4. preserve the frozen HMAC/install/rollback contracts above;
5. perform no production migration, live secret, live adapter install, live runtime recreation, employee resume or outbound effect.

Only after that slice is merged and independently validated may **Production Execution Bridge Activation Execution V1** begin.
