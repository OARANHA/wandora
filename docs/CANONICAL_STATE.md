# Wandora — Canonical State / Handoff

Last synchronized: **2026-09-17**
Canonical application source verified for this checkpoint: `068d30a49d9b96a943c7c3d23d86116e94cce788` (the docs-only handoff change is based on this commit and does not change candidate artifact identity).

Authority order: `AGENTS.md` → accepted ADRs → `docs/CAPABILITY_AUTHORITY.md` → `docs/architecture.md` → this file → component README/runbook.

Do not ask the user to reconstruct decisions already recorded in Git. Do not silently reopen accepted boundaries. Mutable runtime facts must be re-verified before acting.

## Mandatory execution discipline

```text
REAL NOW
  -> PROVEN EVIDENCE
  -> GAPS
  -> CAPABILITY AUTHORITY / REUSE GATE
  -> DECISION
  -> SECOND ADVERSARIAL REVIEW
  -> EXECUTION
  -> VALIDATION
```

## Capability authority

Wandora owns product semantics, stable IDs, authorization, policy, supervision, orchestration and provider-neutral contracts.

- Supabase: identity/session and PostgreSQL/data infrastructure for Wandora-owned facts, mappings, policy and audit/reconciliation.
- Paperclip: digital-employee organization/control-plane capability behind Organization Adapter.
- Mastra: agent/workflow execution behind Agent Runtime Adapter.
- Evolution: WhatsApp transport behind Messaging Gateway.
- Docker/Portainer/Traefik/Cloudflare: deployment/runtime/edge capability.

Provider consoles remain protected operator/engineering surfaces. Customers use Wandora.

## Customer Web — CURRENT

Implemented routes include `/`, `/team`, `/work`, `/conversations`, `/approvals`, `/company`, `/login` and `/start`.

REAL: session/login, explicit organization selection, Team read, Work, Conversations, Canonical Confirmation V2 and the controlled supervised WhatsApp loop.

PARTIAL/PLACEHOLDER: dashboard/company/approval/start actions, including real employee hiring/activation.

Human Send and Gateway outbound remain OFF unless deliberately activated in a separately reviewed step.

## Paperclip / Organization Adapter authority

ADR 0037 proves Paperclip already owns the employee control-plane capability: companies/memberships, agent lifecycle/organization, tasks/issues, assignment/run ownership, approvals and external runtime adapters.

Do not create a parallel Wandora-native agent control plane.

Direct `agent-hires` was proven non-idempotent for repeated equal Wandora requests and is not the selected V1 catalog path.

The selected catalog path is:

```text
Wandora Organization Adapter
  -> private signed webhook
  -> Wandora-owned headless multi-company Paperclip plugin
  -> company-scoped HMAC custody
  -> Paperclip configured-company host scope
  -> agents.managed.reconcile(stable catalog agentKey, companyId)
```

V1 is catalog-only. Arbitrary/custom agents and silent fallback to `agent-hires` remain out of scope.

## Organization Adapter private state — MERGED, NOT LIVE

ADR 0038 / migration `20260916_010_organization_adapter_state_v1.sql` define only minimum Wandora-private integration state:

1. organization -> provider company binding;
2. digital employee -> opaque provider-managed agent reference;
3. operation journal for idempotency/request hash/recovery/audit.

Migration 010 remains **not applied to production**.

ADR 0039 selects the managed catalog plugin mechanism.

## Service contract / signed client — MERGED, NOT LIVE

PR #81 / migration `20260916_011_organization_adapter_service_contract_v1.sql` prove the internal provider-neutral service contract, including owner/admin authorization, catalog-only input, frozen provider-company target, idempotency/conflict handling, conservative `uncertain` recovery and no provider ID leakage.

Migration 011 remains **not applied to production**.

ADR 0040 / PR #82 add the signed Paperclip private client:

```text
resolve HMAC by frozen providerCompanyRef
-> POST exact JSON { companyId, catalogKey }
-> HMAC-SHA256(timestamp + "." + exact raw body)
-> private Paperclip plugin webhook
```

The final disposable Paperclip proof literally established:

```text
A secret -> A target       -> success, one managed Ana
same A replay              -> success, still one managed Ana
A secret -> B target       -> rejected
B managed Ana after denial -> zero
B secret -> B target       -> success, one managed Ana
```

## Secret custody / composed runtime proof — MERGED, NOT LIVE

ADR 0041 / PR #84 select mounted file custody, not environment-variable or database-held per-company HMAC material.

Core derives only:

```text
paperclip-<sha256(providerCompanyRef)>.hmac
```

inside an operator-mounted absolute secret directory. Raw company refs never become filesystem paths; the reader uses `O_NOFOLLOW` and rejects missing/empty/oversized/weak material.

PR #85 proves the composed disposable path:

```text
OrganizationAdapterService
  -> migrations 010/011
  -> operation reservation / frozen target
  -> file-backed per-company custody
  -> signed Paperclip client
  -> exact private HTTP contract
```

The proof includes one canonical hire, customer-contract non-leakage, Company A/B secret separation and frozen-target recovery after a mutable binding change.

## ADR 0042 / PR #87 — Production Activation Rehearsal V1 — MERGED

The rehearsal proves migration ordering, failure rollback, exact pinned Paperclip/plugin contract, private Core factory and fail-closed custody/signature behavior using disposable infrastructure. No production mutation occurred.

## ADR 0043 / PR #88 — Core Candidate Wiring V1 — MERGED, NOT LIVE

The base Core remains Organization Adapter OFF. A separate candidate-only overlay may enable the private service only in database mode with the exact private Paperclip webhook, read-only HMAC custody mount and migration-011 readiness boundary. There is still no customer/browser/Platform Admin hiring route.

## ADR 0044 / PR #90 — Core Candidate Artifact V1 — MERGED

PR #90 merged as canonical `main@7c7e7706c5ec59f9f732ff15bf7fd6939f1e7569`.

The candidate builder requires a clean checkout and exact `HEAD == source_sha`, builds only `apps/core`, labels the candidate with source revision + Wandora candidate contract, requires `USER node`, rejects Organization Adapter enable/secret material baked into environment, creates a Docker archive + provenance manifest + SHA-256 checksum, reloads the archive in CI and publishes a private 7-day GitHub Actions artifact.

Post-merge canonical artifact for that historical source:

```text
source_sha          = 7c7e7706c5ec59f9f732ff15bf7fd6939f1e7569
historical runner .Id / OCI config digest
                    = sha256:ea91dfa41b728ed0ee03965ae76c52b95d3a726c5fd655917532aa5e9a284895
OCI manifest digest = sha256:2afe1888f7398290b92d1539dc5dea1e4ae956078f03ebe85e54f111cd49de14
archive_sha256      = 2164ecabeeef0d085e8c16ac842e251913235345249fbb7f2e4381a2e8c44a57
artifact_zip_sha256 = 1661fc806db899fb904cfa6ec1c8e94ea231e50e052c58beeb2c63f9458ff783
artifact_id         = 10485487921
```

Important correction from ADR 0047: `docker image inspect .Id` is **not** a portable identity contract across Docker image stores. The old runner `.Id=ea91…` corresponds to the saved OCI config digest; the VPS Docker 29.8 load exposes `.Id=2afe…`, the OCI manifest digest.

## ADR 0045 — Core Candidate Host Staging V1 — PROVEN

The exact post-merge artifact was transferred to the VPS using only the authorized connector's short-lived signed artifact URL. No Git, SSH or registry credential was introduced.

Private staging path:

```text
/home/wandora-admin/.local/share/wandora/core-candidates/
  7c7e7706c5ec59f9f732ff15bf7fd6939f1e7569/
```

Host staging proved exact source SHA, artifact ZIP SHA-256, Docker archive SHA-256 and bundled `SHA256SUMS`. ZIP extraction used Python stdlib with path-traversal rejection because `unzip` is not installed; no package was installed and the already-validated download was reused.

The attempted `/opt/wandora/artifacts` staging failed before download because the operator did not own the path; sudo was not bypassed.

## ADR 0046 — Provider-Neutral Operator Console Hostnames V1 — ACCEPTED, DNS OFF

Historically recovered recommendation:

```text
admin.wandora.com.br -> first-party Wandora Platform Admin
```

No exact older Paperclip/Mastra hostname pair was recoverable. The current accepted provider-neutral names are therefore a **new current decision**:

```text
control.wandora.com.br -> protected organization/control-plane console bridge
runtime.wandora.com.br -> protected agent-runtime/studio console bridge
```

These are capability names, not provider names. No DNS/Traefik/Cloudflare ingress was activated. `runtime` remains reserved until a separately validated standalone Mastra Studio/operator service exists. Native consoles remain operator/engineering surfaces behind strong access control and never replace customer Wandora or Platform Admin.

## ADR 0047 — Portable Container Image Provenance Digests V1 — ACCEPTED

A separately reviewed host `docker load` of the already hash-verified historical archive succeeded, but the load verifier stopped because the VPS `.Id` was `2afe…` rather than the runner `.Id=ea91…`.

Archive inspection proved this was a verifier-contract bug, not corruption:

```text
manifest.json Config -> sha256:ea91dfa41b728ed0ee03965ae76c52b95d3a726c5fd655917532aa5e9a284895
index.json manifest   -> sha256:2afe1888f7398290b92d1539dc5dea1e4ae956078f03ebe85e54f111cd49de14
```

The historical loaded candidate carries the exact canonical revision label, `io.wandora.candidate=organization-adapter-core-v1`, `USER node` and only the expected base runtime environment. The running container set before/after that historical load had the same SHA-256 snapshot:

```text
2f9f03baa78c8cb1a5fff1ca02081aa65085a20f7a388875f5ae0b990d614a81
```

No container was created or restarted by that historical load.

Portable candidate manifests must henceforth record at least:

```text
source_sha
source_tree_sha
archive_sha256
oci_config_digest
oci_manifest_digest
```

`runner_image_id` remains diagnostic only. PR #92 implemented this corrected contract, including a positive regression proving `runner_image_id` is not authoritative and a negative regression proving a forged portable OCI digest is rejected.

## ADR 0048 — Core Candidate Portable Host Proof V1 — PROVEN, NOT RUNNING

PR #92 merged with application source:

```text
068d30a49d9b96a943c7c3d23d86116e94cce788
```

The post-merge `push` workflow built directly from that real `main` and published a new private artifact:

```text
workflow_run        = 35198147447
artifact_id         = 10487136577
artifact_zip_sha256 = 2bf661160c5344c87ed4445e709dfdcdc95e067c4c049eb596f3a1835c6d02db
archive_sha256      = 3b7c65c30525fb3f2bb0674bbe81687570aae48f26b08ee80b8c6a33193a7d76
oci_config_digest   = sha256:256f237aafdfb4f7968c122cce044312de78390105bb148b63a8ff7e271edb9f
oci_manifest_digest = sha256:f0ffa18271172e6e6e77f778f7b2f4f5302a84901909663525b8f665ad9f0c1e
```

The exact artifact was staged privately at:

```text
/home/wandora-admin/.local/share/wandora/core-candidates/
  068d30a49d9b96a943c7c3d23d86116e94cce788/
```

Host validation independently proved ZIP hash, bundled `SHA256SUMS`, archive hash, both OCI blob digests/references, source/candidate labels, `USER node` and forbidden-env boundary. The new image was then loaded into the Docker image store without running it.

Current corrected candidate:

```text
candidate tag       = wandora/core:organization-adapter-candidate-068d30a49d9b
candidate VPS .Id   = sha256:f0ffa18271172e6e6e77f778f7b2f4f5302a84901909663525b8f665ad9f0c1e
candidate state     = STAGED + LOADED, NOT RUNNING
running candidates  = 0
```

The VPS `.Id` equals the already-proven OCI manifest digest, valid under ADR 0047.

The first combined load-verification shell exited non-zero **after the image was already loaded** because `set -o pipefail` treated the expected zero-match `grep` used to count running candidate containers as an error. Real state was inspected before any retry; no second `docker load` was performed.

Docker event inspection showed only normal health-check `exec_*` events over the relevant interval and no create/start/restart/stop lifecycle event caused by the image load.

## REAL LIVE observation after corrected candidate load

Reverified directly on the VPS after staging/load:

```text
live Core tag             = wandora/core:team-read-b31db507
live Core status          = healthy
live Organization Adapter = OFF
corrected candidate tag   = wandora/core:organization-adapter-candidate-068d30a49d9b
corrected candidate .Id   = sha256:f0ffa18271172e6e6e77f778f7b2f4f5302a84901909663525b8f665ad9f0c1e
corrected candidate state = LOADED, NOT RUNNING
```

Production DB still returns:

```text
control_plane_provider_bindings       ABSENT
digital_employee_provider_bindings    ABSENT
digital_employee_hire_operations      ABSENT
```

Organization Adapter HMAC custody remains absent. Paperclip remains `wandora/paperclip:v2026.831.1`, healthy, with only the accepted loopback operator binding `127.0.0.1:3100->3100/tcp`. No production managed-plugin/HMAC activation was performed by this slice.

The historical `7c7e7706…` candidate and unrelated old laboratory/probe containers/images were deliberately not cleaned up in this provenance slice. Cleanup is a separate operational concern and must not be mixed into activation/provenance evidence.

## What is still NOT live / NOT approved

- migrations 010/011 production application;
- production Paperclip managed plugin install/config;
- production per-company HMAC generation/mounting;
- any running Organization Adapter candidate Core container;
- live Core Organization Adapter enablement;
- customer `Contratar` / `Ativar funcionário` route or UI;
- arbitrary/custom employee creation;
- direct `agent-hires` fallback;
- Human Send or Gateway outbound activation as part of this work;
- `control.wandora.com.br` or `runtime.wandora.com.br` DNS/ingress activation.

## SECOND ADVERSARIAL REVIEW AFTER ADR 0048

Tempting option: activate migrations/plugin/HMAC/Core immediately because both CI and host provenance are now green.

Rejected. Artifact/load provenance proves the executable supply chain, not the full production activation sequence. The database, provider plugin, HMAC custody and runtime recreation are distinct effects with their own failure/rollback ordering.

Tempting option: repeat the `docker load` because the combined harness exited 1.

Rejected. Real-state inspection proved the first load had already completed and the failure was only the expected-zero `grep` under `pipefail`. Repeating an already-completed operation would violate state-first continuity.

Tempting option: clean historical candidates and old laboratory containers while preparing activation.

Rejected for this slice. Cleanup is useful but orthogonal; mixing it into the provenance checkpoint would widen the mutation surface and obscure evidence attribution.

## NEXT EXECUTABLE SLICE

Next: **Organization Adapter Production Activation Preflight V1** — preflight/plan first; no production mutation merely because the candidate is loaded.

Required proof before any activation execution:

1. re-verify current `main`, live Core/Paperclip/Supabase state and the corrected candidate identity;
2. enumerate exact migration 010/011 preconditions, application order, post-verifiers and rollback implications;
3. define the exact pinned Paperclip managed-plugin production install/configuration boundary;
4. define per-company HMAC generation, filename derivation, ownership/mode and read-only mount without exposing secret material;
5. render and inspect the candidate Core composition before recreation;
6. define activation and rollback order so partially successful states fail closed;
7. keep Human Send and Gateway outbound explicitly outside the Organization Adapter activation;
8. prove technical activation still introduces no customer `Contratar/Ativar funcionário` route;
9. perform a second adversarial review of the complete preflight before any production mutation.

Only after this preflight is documented and survives the second review may a separately bounded execution apply production effects.

## Operator UI / native consoles

The normal operator contract is Wandora Platform Admin at `admin.wandora.com.br`, not provider-branded hostnames. `control.wandora.com.br` and `runtime.wandora.com.br` are reserved provider-neutral engineering bridges and require their own protected ingress review before activation.

## Operational safety

- Git is source of truth; Portainer is not.
- Merged migration != live migration.
- Provider consoles stay operator-only.
- Secrets/tokens never enter Git, DB payloads or logs.
- External effects fail conservatively; uncertain effects are never blindly retried.
- Browser-supplied IDs are selectors, never authorization.
- Human Send and Gateway outbound remain OFF unless explicitly activated after review.
- An Organization Adapter proof/candidate must not silently become a customer-visible activation path.
- A candidate archive being staged or loaded does not mean the candidate runtime is active.

## Definition of progress

Progress means the real product gap was identified, authority checked, provider capability reused behind Wandora contracts, only minimum Wandora-owned safety state persisted, the decision survived adversarial review and execution was independently validated.
