# Wandora — Canonical State / Handoff

Last synchronized: **2026-09-17**
Canonical `main` verified before this synchronization: `7c7e7706c5ec59f9f732ff15bf7fd6939f1e7569`

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

Post-merge canonical artifact:

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

A separately reviewed host `docker load` of the already hash-verified archive succeeded, but the load verifier stopped because the VPS `.Id` was `2afe…` rather than the runner `.Id=ea91…`.

Archive inspection proved this was a verifier-contract bug, not corruption:

```text
manifest.json Config -> sha256:ea91dfa41b728ed0ee03965ae76c52b95d3a726c5fd655917532aa5e9a284895
index.json manifest   -> sha256:2afe1888f7398290b92d1539dc5dea1e4ae956078f03ebe85e54f111cd49de14
```

The loaded candidate carries the exact canonical revision label, `io.wandora.candidate=organization-adapter-core-v1`, `USER node` and only the expected base runtime environment. The running container set before/after load has the same SHA-256 snapshot:

```text
2f9f03baa78c8cb1a5fff1ca02081aa65085a20f7a388875f5ae0b990d614a81
```

No container was created or restarted by the load.

Portable candidate manifests must henceforth record at least:

```text
source_sha
source_tree_sha
archive_sha256
oci_config_digest
oci_manifest_digest
```

`runner_image_id` may remain diagnostic only. Production activation is blocked until this provenance contract is fixed in Git/CI and re-proven.

## REAL LIVE observation after candidate load

Reverified directly on the VPS:

```text
live Core tag       = wandora/core:team-read-b31db507
live Core image id  = sha256:f219b95e37ff913e7a68dd83aa95726636f56902204aa5b108e9d975bac7ff8c
candidate tag       = wandora/core:organization-adapter-candidate-7c7e7706c5ec
candidate VPS .Id   = sha256:2afe1888f7398290b92d1539dc5dea1e4ae956078f03ebe85e54f111cd49de14
candidate state     = LOADED, NOT RUNNING
```

Live Core still has Organization Adapter OFF. Production DB still returns:

```text
control_plane_provider_bindings       ABSENT
digital_employee_provider_bindings    ABSENT
digital_employee_hire_operations      ABSENT
```

Organization Adapter HMAC custody remains absent. Paperclip remains `wandora/paperclip:v2026.831.1` with only the accepted loopback operator binding `127.0.0.1:3100`.

## What is still NOT live / NOT approved

- migrations 010/011 production application;
- production Paperclip managed plugin install/config;
- production per-company HMAC generation/mounting;
- any running candidate Core container;
- live Core Organization Adapter enablement;
- customer `Contratar` / `Ativar funcionário` route or UI;
- arbitrary/custom employee creation;
- direct `agent-hires` fallback;
- Human Send or Gateway outbound activation as part of this work;
- `control.wandora.com.br` or `runtime.wandora.com.br` DNS/ingress activation.

## SECOND ADVERSARIAL REVIEW AFTER ADR 0047

Tempting option: continue to production migration/plugin/HMAC activation because the candidate archive is already on the host and the loaded image metadata looks correct.

Rejected.

The load exposed a real provenance-contract defect in our verifier. A production activation must not depend on an engine-local `.Id` convention that changed between GitHub runner Docker and the VPS Docker 29.8 image store.

Tempting option: rebuild directly on the VPS so `.Id` matches the host.

Rejected. That would destroy the single-build provenance chain and replace it with a second build path.

Tempting option: remove the loaded candidate immediately and pretend the failed gate never happened.

Rejected. The inert loaded image is evidence required to explain/fix the provenance contract. It has no running process or authority and can be removed only after the corrected candidate is proven or if an explicit cleanup slice requires it.

## NEXT EXECUTABLE SLICE

Next: **Core Candidate Portable Provenance Contract Fix V1** — Git/CI only; no new production capability activation.

Required proof:

1. change the candidate manifest to record `oci_config_digest` and `oci_manifest_digest` explicitly;
2. retain runner `.Id` only as `runner_image_id` diagnostic evidence;
3. derive both portable digests by parsing the saved archive itself after `docker save`, using only pinned/standard tooling;
4. prove `manifest.json` config digest and `index.json` manifest digest reference valid archive blobs;
5. update CI reload verification so it proves archive digests + source revision + candidate contract + user + forbidden-env boundary, without universal `.Id` equality;
6. add a falsifiable regression proving engine-local `.Id` is not the portable contract;
7. rebuild after merge from the new canonical `main` and publish a private post-merge artifact;
8. leave migrations 010/011, Paperclip plugin/config, production HMACs, candidate runtime, customer hiring and operator-console DNS unchanged.

Only after the portable provenance contract is green on the new canonical artifact should candidate runtime activation be reconsidered.

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
