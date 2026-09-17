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

PR #87 turned the intended activation/rollback sequence into a reproducible non-production gate.

It proves, with disposable state:

- migration 010 -> inert verifier -> migration 011 -> service/runtime verifier;
- exact pinned Paperclip image/plugin/config contract;
- Core runtime factory remains private and customer-unreachable;
- injected migration failure leaves no partial Organization Adapter tables;
- synthetic custody/signature failures fail closed;
- the historical service/runtime proof remains nested in the rehearsal.

No production mutation was performed by this rehearsal.

## ADR 0043 / PR #88 — Core Candidate Wiring V1 — MERGED, NOT LIVE

The base Core remains Organization Adapter OFF. A separate candidate-only Compose overlay may enable the already-proven private service with these fail-closed constraints:

- database mode only;
- exact private Paperclip webhook at `wandora-paperclip:3100`;
- absolute read-only mounted HMAC custody directory;
- no browser/customer/Platform Admin route added;
- readiness additionally requires the migration-011 private DB boundary;
- enabling the adapter before migration 011 yields `/readyz=503`, not a false-green candidate.

## ADR 0044 / PR #90 — Core Candidate Artifact + Pre-Activation Boundary V1 — MERGED

PR #90 merged as canonical `main@7c7e7706c5ec59f9f732ff15bf7fd6939f1e7569`.

It adds a clean-checkout candidate builder and a private GitHub Actions artifact path with exact source provenance. The builder:

- requires declared source SHA to equal the actual checkout `HEAD`;
- builds only `apps/core`;
- labels the image with the exact Git revision and Wandora candidate contract;
- verifies `USER node` and rejects Organization Adapter enable/secret material baked into image environment;
- writes a Docker archive, provenance manifest and SHA-256 checksum;
- removes/reloads the archive in CI and rechecks image ID + revision;
- publishes the result as a private 7-day artifact, not a public registry image.

The PR artifact proved the mechanism against the synthetic PR merge ref. The post-merge `main` run then produced the actual canonical candidate:

```text
source_sha       = 7c7e7706c5ec59f9f732ff15bf7fd6939f1e7569
image_id         = sha256:ea91dfa41b728ed0ee03965ae76c52b95d3a726c5fd655917532aa5e9a284895
archive_sha256   = 2164ecabeeef0d085e8c16ac842e251913235345249fbb7f2e4381a2e8c44a57
artifact_zip_sha = 1661fc806db899fb904cfa6ec1c8e94ea231e50e052c58beeb2c63f9458ff783
```

GitHub artifact ID: `10485487921`, private, retention 7 days from 2026-09-17.

## ADR 0045 — Core Candidate Host Staging V1 — PROVEN, NOT LOADED

The exact post-merge artifact was transferred to the VPS through the authorized connector's short-lived signed artifact URL. No Git credential, SSH key or registry credential was introduced.

Canonical host staging path:

```text
/home/wandora-admin/.local/share/wandora/core-candidates/
  7c7e7706c5ec59f9f732ff15bf7fd6939f1e7569/
```

Host verification proved:

```text
CORE_CANDIDATE_HOST_STAGING_V1_OK
source_sha = 7c7e7706c5ec59f9f732ff15bf7fd6939f1e7569
image_id = sha256:ea91dfa41b728ed0ee03965ae76c52b95d3a726c5fd655917532aa5e9a284895
zip_sha256 = 1661fc806db899fb904cfa6ec1c8e94ea231e50e052c58beeb2c63f9458ff783
archive_sha256 = 2164ecabeeef0d085e8c16ac842e251913235345249fbb7f2e4381a2e8c44a57
```

The first `/opt/wandora/artifacts` attempt failed before any download because the operator lacked write permission. Sudo was not bypassed. The user-owned staging path was used instead. The ZIP downloaded once, passed its digest, and after `unzip` was found absent the same validated file was reused with traversal-checked Python `zipfile` extraction; no package installation was needed.

The candidate Docker archive is staged but has **not** been loaded into the host Docker image store and no container has been created from it.

## ADR 0046 — Provider-Neutral Operator Console Hostnames V1 — ACCEPTED, DNS NOT ACTIVATED

Recovered prior project context explicitly supports:

```text
admin.wandora.com.br -> Wandora Platform Admin
```

No exact earlier provider-neutral Paperclip/Mastra hostname pair was recoverable. The accepted naming from ADR 0046 is therefore a new current decision, not a reconstructed historical claim:

```text
admin.wandora.com.br   -> first-party Wandora Platform Admin cockpit
control.wandora.com.br -> protected organization/control-plane native console bridge
runtime.wandora.com.br -> protected agent-runtime/studio native console bridge
```

`control` and `runtime` are capability names, not provider names. They survive Paperclip/Mastra replacement.

No DNS record or ingress change has been made by this decision. `runtime` must remain reserved until a separately validated standalone Mastra Studio/operator service actually exists. Native consoles remain optional engineering/diagnostic surfaces behind strong access control; they never replace Platform Admin or customer `app.wandora.com.br`.

## REAL LIVE observation after #90 + host staging

Reverified directly on the Wandora VPS on 2026-09-17:

```text
wandora-core      wandora/core:team-read-b31db507
wandora-paperclip wandora/paperclip:v2026.831.1
```

Live Core still has no `WANDORA_ORGANIZATION_ADAPTER_ENABLED=true` environment entry.

Direct production DB check still returns:

```text
control_plane_provider_bindings       ABSENT
digital_employee_provider_bindings    ABSENT
digital_employee_hire_operations      ABSENT
```

Organization Adapter HMAC custody remains absent.

The Paperclip operator service has only the historical loopback diagnostic binding:

```text
3100/tcp -> 127.0.0.1:3100
```

The read-only live pre-activation verifier explicitly allows only this exact loopback binding and fails wildcard/non-loopback/unexpected publication.

## What is still NOT live / NOT approved

- migrations 010/011 production application;
- production Paperclip managed plugin install/config;
- production per-company HMAC generation/mounting;
- candidate Docker image loaded into the production host image store;
- live Core Organization Adapter enablement;
- customer `Contratar` / `Ativar funcionário` route or UI;
- arbitrary/custom employee creation;
- direct `agent-hires` fallback;
- Human Send or Gateway outbound activation as part of this work;
- `control.wandora.com.br` or `runtime.wandora.com.br` DNS/ingress activation.

## SECOND ADVERSARIAL REVIEW AFTER #90 / ADR 0045

Tempting option: apply migrations 010/011 now because the exact candidate artifact exists and is staged on the host.

Rejected.

The artifact is present, but the actual production Docker engine has not yet loaded and independently inspected it. Widening DB privilege before proving the host can ingest the exact candidate would still invert the desired activation order.

Tempting option: start a candidate container immediately from the staged archive.

Rejected. `docker load` + offline image inspection is a smaller reversible gate that can prove identity/user/labels/config without creating a process, attaching a network, mounting a secret or touching the database.

Tempting option: activate `control`/`runtime` hostnames while doing this infrastructure work.

Rejected. Operator-console ingress is independent of Organization Adapter activation and should not enlarge the blast radius of this slice.

## NEXT EXECUTABLE SLICE

Next: **Organization Adapter Core Candidate Host Load + Offline Inspection V1** — no running container and no business/database/provider effect.

Required proof:

1. recompute the staged Docker archive SHA-256 before load;
2. `docker load` the exact verified archive only;
3. prove loaded image ID equals `sha256:ea91dfa41b728ed0ee03965ae76c52b95d3a726c5fd655917532aa5e9a284895`;
4. prove OCI revision label equals canonical `main@7c7e7706c5ec59f9f732ff15bf7fd6939f1e7569`;
5. prove candidate contract label equals `organization-adapter-core-v1`;
6. prove image runs as non-root `node` by configuration;
7. prove no Organization Adapter enable flag, HMAC material or provider credential is baked into image env;
8. prove no new container was created and the live `wandora-core` container/image did not change;
9. re-run the read-only live pre-activation state after load;
10. leave migrations 010/011, plugin config, production HMACs, live Core and customer hiring unchanged.

Only after this host-load gate is green should a separately reviewed **Production Technical Activation** decision be considered.

## Operator UI / native consoles

The normal operator contract is Wandora Platform Admin at `admin.wandora.com.br`, not provider-branded hostnames. `control.wandora.com.br` and `runtime.wandora.com.br` are reserved provider-neutral engineering bridges and require their own protected ingress review before activation.

Native Paperclip/Mastra/Evolution/Supabase/Portainer consoles remain protected engineering/diagnostic surfaces and do not become customer product contracts.

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
