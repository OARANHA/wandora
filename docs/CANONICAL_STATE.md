# Wandora — Canonical State / Handoff

## ADR 0188 — Web Business Density + Company Reference Fidelity V1 — CODE ONLY

The second owner-approved Company / Regras da Casa reference is now the canonical density/scale target. Customer hero titles on Início, Equipe, Conversas and Empresa are capped around 4rem instead of the previous 6–6.7rem range.

Empresa is reorganized around business comprehension: Regras da Casa first, compact two-column cards, Ensinar à equipe + Como funciona, then confirmed company facts and real history. Provenance/source controls remain semantically intact but visually secondary.

All existing Web gates plus WANDORA_WEB_BUSINESS_DENSITY_V1_OK and a production-shaped Docker build are GREEN. No API/auth/grounding/provider contract changed and production remains unchanged. See ADR 0188.


## ADR 0187 — Web Design System + App Shell Production Promotion V1 — GREEN

Production Web is `wandora/web:candidate-67966d42d23e` from exact `main@67966d42d23e1778d89c2430de8d59e2235dedfb`, healthy / restart 0. Persisted selector and live revision are aligned.

The bundled Dela Gothic One / Space Grotesk / JetBrains Mono design system, 250px→82px collapsible desktop sidebar, complete mobile menu and power-style real logout are live. Core, Paperclip and Messaging Gateway were not recreated.

The exact GitHub Web artifact is 10722734256 with ZIP digest `sha256:0b544336336d47225a54f9b470957afc8a65ea6e53f60006715efa486a88e319`. The valid rollback selector is retained in `web.env.before` and points to `candidate-d8349b353bb7`.

MEDICSPRO remains grounding 0 / works 2 / outbound 0; Ana is active + supervised; Human Send and Gateway outbound remain OFF. See ADR 0187.


## ADR 0186 — Web Design System + App Shell V1 — CODE ONLY

The customer Web design system now uses bundled/pinned Dela Gothic One 400 for display, Space Grotesk Variable for body/interface text and JetBrains Mono Variable for operational labels.

The existing six-route customer shell remains authoritative. Desktop sidebar now supports 250px expanded / 82px collapsed modes with browser-local visual preference, and the power-style Sair control reuses the existing AuthProvider signOut/session-revocation path. Mobile exposes the same route authority through a compact menu.

All existing Web gates plus WANDORA_WEB_APP_SHELL_DESIGN_SYSTEM_V1_OK and the production-shaped Docker build are GREEN. No API/auth/grounding/provider contract changed and production is unchanged. See ADR 0186.


## ADR 0185 — Customer Company Grounding Save + Business UX Production Promotion V1

The deterministic customer grounding create failure is fixed and promoted.

Production now runs Core and Web from `main@d8349b353bb7cc46423ea8ba60e8989522ef6b17`:

- Core = `wandora/core:organization-adapter-candidate-d8349b353bb7`;
- Web = `wandora/web:candidate-d8349b353bb7`;
- both healthy / restart 0.

A valid unauthenticated grounding POST now reaches normal auth and returns `401` instead of the former parser-level `400`. The `/company` UI now uses business-friendly language while preserving internal `fact/rule/provenance/sourceRef` semantics.

MEDICSPRO remains unchanged: grounding = 0, works = 2, outbound attempts = 0, Ana = one active + supervised employee. Human Send and Gateway outbound remain OFF.

The next permitted effect is the already-authorized MEDICSPRO first real grounding execution through the normal authenticated owner/admin customer flow. See ADR 0185.


## ADR 0183 — Grounding Browser Idempotency Production Promotion — GREEN

Live Web is now `wandora/web:candidate-8fb5201b0229`, healthy/restart 0. Grounding create preserves browser UUID + exact payload fingerprint across ambiguous retries. Core/Paperclip/Gateway were not recreated.

MEDICSPRO grounding remains 0. The next and only remaining effect in this slice is normal authenticated owner/admin creation of F1/F2/F3 as facts and R1 as a rule.


## ADR 0182 — Customer Company Grounding Create Browser Idempotency V1 — CODE ONLY

The `/company` create path now reuses the proven customer-browser safety model: UUID + exact payload fingerprint persisted in sessionStorage and reused after ambiguous responses. Changed payloads fail closed while a create is unresolved.

ADR 0179's planned human-readable idempotency keys are superseded before any grounding effect by browser-generated UUID v4 keys. F1/F2/F3 remain facts, R1 remains a rule, and grounding remains 0 until a later Web promotion + normal owner-session create.


## ADR 0181 — Owner-Statement Evidence Surface Production Promotion — GREEN

Web `wandora/web:candidate-8ee226bcc0dd` is live, healthy/restart 0 from exact `main@8ee226bcc0ddec2f333348235c501320fb223152`. The customer `/company` form can now preserve optional source evidence for truthful `owner_statement` provenance.

Core/Paperclip/Gateway were unchanged. MEDICSPRO grounding remains 0, works = 2, outbound attempts = 0. The remaining effect is the normal authenticated owner/admin creation of F1/F2/F3 as facts and R1 as a rule per ADR 0179.


## ADR 0180 — Customer Company Owner-Statement Evidence Surface V1 — CODE ONLY

The customer `/company` form now preserves optional provider-neutral `sourceRef/sourceLabel` for direct `owner_statement` provenance instead of exposing evidence only for `approved_source`. Approved-source references remain mandatory.

No Core/schema/provider authority changes. F1/F2/F3 remain facts and R1 remains a formal rule. No production effect or grounding mutation occurred.


## ADR 0179 — MEDICSPRO First Real Grounding Execution — OWNER SESSION GATE

Owner confirmation is complete for F1/F2/F3 and R1. The future customer mutation set is frozen as three `fact` entries and one `rule` entry, all with truthful `owner_statement` provenance and the owner-requested provider-neutral sourceRef.

Production mutation has **not** occurred: MEDICSPRO grounding remains 0. The only remaining effect gate is a normal authenticated MEDICSPRO owner/admin session through the canonical customer-facing grounding contract. Auth-admin/service-role impersonation, token extraction, privileged JWT minting and direct SQL remain forbidden.

See ADR 0179 for exact content, idempotency keys and the R1 `rule` classification.


## ADR 0178 — MEDICSPRO First Real Organization Grounding Content Preflight V1 — NO EFFECT

The first real content review is complete without creating grounding. Live remains at migration 017 present/verified, MEDICSPRO grounding rows = 0, works = 2, outbound attempts = 0, and Ana = one active + supervised employee.

Owner-authored evidence supports exactly one low-ambiguity first fact candidate: **“O MedicsPro reúne agenda, pacientes, informações clínicas e gestão financeira em um único ambiente.”** The evidence source is the first authenticated MEDICSPRO customer work (wandora:customer-work-operation:9a4bc45c-cb6e-410d-8e46-3d7b84fc85ab).

Market-positioning/benefit statements remain NEEDS OWNER CONFIRMATION. No durable Regras da Casa entry is accepted yet: repeated no-send/review instructions were task-scoped and cannot be promoted into a tenant-wide rule without explicit owner confirmation. Global anti-hallucination and external-effect rules remain Wandora runtime/effect policy and must not be duplicated as tenant grounding.

A future execution may insert the accepted fact only. A first fact+rule set requires explicit owner confirmation of a durable house rule before execution. See ADR 0178.


## ADR 0177 — Customer Web Grounding API Bridge Production Promotion Execution V1

Status: **EXECUTED / GREEN / WEB ONLY**.

Production Web is now `wandora/web:candidate-1800aa3d3fb4`, healthy/restart 0, from the exact immutable ADR 0176 artifact. Unauthenticated grounding through `https://app.wandora.com.br` now returns Core `401` rather than the prior Nginx `404`; unknown grounding and generic API paths remain `404`.

Migration 017 remains LIVE/verified, MEDICSPRO grounding rows remain 0, customer works remain 2 and outbound attempts remain 0. Core `d90b225e...`, Paperclip v2026.916.0 and Messaging Gateway were not recreated. Human Send and Gateway outbound remain OFF. No real fact/rule, model call, work/run/wakeup/session or external message was created by the promotion.

Last synchronized: **2026-09-22**

## 2026-09-22 Customer Web Grounding API Bridge Artifact Qualification V1 — NO PRODUCTION EFFECT

The code slice is merged in `main@1800aa3d3fb4a0928f314eed4f1722f7adb59ef0` through PR #233 / ADR 0175. Post-merge Web/Core/Platform Admin/Messaging Gateway workflows are GREEN.

The immutable Web candidate built from that exact `main` is:

```text
GitHub artifact id   = 10695249794
artifact name        = web-candidate-1800aa3d3fb4a0928f314eed4f1722f7adb59ef0
artifact ZIP sha256  = adba9f361b1135e123c555f6ff4afb3b555c13ec3dc129b7347a9467ddc6a109
source sha           = 1800aa3d3fb4a0928f314eed4f1722f7adb59ef0
source tree sha      = c98f0e3a13a4675a0c1b23e476bfa50e649edefe
image tag            = wandora/web:candidate-1800aa3d3fb4
image id             = sha256:270a150454befd2e260c45ebbe9b5985a973a32905ac157ce1738d6acf1a243d
OCI archive sha256   = 1d76901fa02ca4b8cfeef8bdf9daf9fbb12c610951a5e629c3cd16c6facc960a
manifest sha256      = 3846a2f11a84d19d60cfdb81251ac5735385ff8078b3209cf06ffa9781807a5e
```

The artifact ZIP and its internal `SHA256SUMS` were independently verified. Production remains unchanged: migration 017 is live/verified, grounding rows remain 0, Core remains `wandora/core:organization-adapter-candidate-d90b225e6cc2`, Web remains `wandora/web:candidate-65908b76c667`, MEDICSPRO remains at 2 works and 0 outbound attempts, and Human Send/Gateway outbound remain OFF.

Next slice: **Customer Web Grounding API Bridge Production Promotion Preflight / Execution V1 — WEB ONLY**. It may qualify/promote only this corrected Web artifact; do not reapply migration 017 or repromote Core.

## 2026-09-22 Customer Web Grounding API Bridge / Nginx Allowlist Correction V1 — CODE ONLY

ADR 0175 corrects only the explicit Web/Nginx transport bridge for the already-live Core grounding contract. The change adds exact allowlists for grounding read/create, retire and correct; preserves Authorization and Idempotency-Key; keeps request methods/bodies intact; preserves existing /me, work and conversations bridges; and keeps the generic /api/ fallback fail-closed at 404.

Production is intentionally unchanged: migration 017 remains LIVE/verified, grounding rows remain 0, Core remains wandora/core:organization-adapter-candidate-d90b225e6cc2, Web remains wandora/web:candidate-65908b76c667, MEDICSPRO remains at 2 works and 0 outbound attempts, and Human Send/Gateway outbound remain OFF.

The corrected Web candidate passed production-shaped build/verifier proof plus a disposable private candidate check where unauthenticated grounding reached Core and returned 401 rather than Nginx 404. No real grounding or external effect was created. The next slice is Web-only production promotion qualification/execution; do not reapply migration 017 or repromote Core.


## 2026-09-22 Organization Grounding Production Promotion Execution V1 — PARTIAL SAFE STOP

ADR 0174 records a safe partial production execution.

Current live boundary:

```text
migration 017 / organization_grounding_entries = LIVE / verified
grounding rows                                  = 0
Core = wandora/core:organization-adapter-candidate-d90b225e6cc2
Core = healthy / restart 0 / readyz 200
Web  = wandora/web:candidate-65908b76c667
Web  = healthy / restart 0
Paperclip = unchanged / healthy
Messaging Gateway = unchanged / healthy
MEDICSPRO works = 2
MEDICSPRO outbound attempts = 0
Human Send = OFF
Gateway outbound = OFF
```

The exact Web grounding candidate from ADR 0173 was rejected after public validation: direct Core returned 401 for the unauthenticated grounding route, while the public Web edge returned Nginx 404. Source inspection proved `apps/web/nginx.conf` lacks the grounding API allowlist/proxy even though `CompanyPage.tsx` calls those routes.

Per ADR 0173, Web alone was rolled back. Do **not** reapply migration 017 and do not restore the database merely to undo this binary/UI gap.

Next slice: **Customer Web Grounding API Bridge / Nginx Allowlist Correction V1 — CODE ONLY / NO PRODUCTION EFFECT**, followed by a separate Web-only promotion qualification/execution. No real MEDICSPRO grounding is authorized yet.

Preflight base checkpoint before ADR 0173 documentation:

```text
main = fba159db751122bfb5c600296bb7a0d5beb5a474
PR #229 = merged
open PRs = 0
```

Mutable Git/runtime state must still be reverified before execution.

## 2026-09-22 Organization Grounding Production Promotion Preflight V1 — GO FOR SEPARATE EXECUTION / NO EFFECT

Canonical Git at preflight decision:

```text
main = fba159db751122bfb5c600296bb7a0d5beb5a474
PR #229 = merged
open PRs = 0
ADR 0173 = Organization Grounding Production Promotion Preflight V1
```

All applicable post-merge push workflows on the exact main are GREEN: Core CI, Web CI, Platform Admin CI and Messaging Gateway CI.

Live remains unchanged: migration 017 / `wandora.organization_grounding_entries` is ABSENT; Core/Web/Paperclip/Gateway are healthy with restart 0; MEDICSPRO has exactly 2 customer work operations, exactly 1 active+supervised Ana and 0 outbound attempts; Human Send and Gateway outbound remain OFF.

Preflight qualification is GREEN:

- production-derived `pg_dump -Fc` restore proof on exact Supabase PostgreSQL 17.6.1.136;
- migration 017 applies idempotently in the disposable restore and canonical verifier returns `ORGANIZATION_GROUNDING_CONTRACT_V1_OK`;
- exact Core artifact = GitHub artifact 10686954415 from `d90b225e...`, ZIP digest `fca39cf5...`;
- exact Web artifact = GitHub artifact 10690072338 from `fba159db...`, ZIP digest `73ef5b75...`;
- `d90b225e..fba159db` has no Core diff;
- new Core readiness fails closed when the migration-017 grounding boundary is unavailable;
- future order is frozen as fresh backup/restore-check -> migration 017 + verifier -> Core -> Web -> validate -> STOP.

This preflight does **not** authorize production mutation by itself. A separate **Organization Grounding Production Promotion Execution V1** must take a fresh execution-time backup and revalidate all stop conditions. No real MEDICSPRO grounding belongs to that promotion execution.


Session bootstrap: read `docs/WANDORA_PROJECT_SOURCE.md` first for continuity only. Authority order then remains `AGENTS.md` → relevant accepted ADRs → `docs/CAPABILITY_AUTHORITY.md` → `docs/architecture.md` → this file → component README/runbook.

## 2026-09-22 GitHub-hosted CI migration — ADR 0158

Current repository visibility is public. Normal CI no longer targets the isolated VPS runner. All nine repository workflows now target `ubuntu-24.04` GitHub-hosted runners with unchanged check/job names.

The OpenAPI compatibility gate now provisions Node 24.21.0 explicitly and no workflow depends on `RUNNER_TOOL_CACHE`. Production deployment/credentials remain outside ordinary CI. The old `wandora-vps-01-ci` runner is fallback-only during validation and should be stopped/deregistered after hosted CI is proven GREEN.

This section supersedes the older 2026-09-19 self-hosted CI checkpoint for current CI execution only; ADR 0113 remains historical evidence.

## 2026-09-19 execution bridge activation V1 — COMPLETE / EMPLOYEE STILL PAUSED

Canonical Git at execution completion:

```text
main = 72bcd60eb8428f6210bd2aae0532edabd2c75c5f
PR #175 = merged
ADR 0125 = completion checkpoint
```

The Paperclip -> Wandora/Mastra production execution bridge foundation is now LIVE and validated. Migration 014 remains live/verified and was not repeated. The dedicated HMAC remains root-custodied on the host; Paperclip receives a node-owned `0400` tmpfs copy through the corrected ADR 0123/0124 startup wrapper.

Current production boundary:

```text
Core bridge                = LIVE / healthy / readyz 200
Paperclip bridge           = LIVE / healthy / restart 0
wandora_mastra             = exactly 1 / loaded / version 0.1.0
adapter test-environment   = PASS
Ana / Wandora              = exactly 1 / paused + supervised
Ana / Paperclip            = exactly 1 / paused
wakeups / heartbeat runs   = 0 / 0
agents.resume              = absent
Human Send                 = OFF
Gateway outbound           = OFF
MEDICSPRO outbound attempts= 0
```

This checkpoint activates only the bridge foundation. It does **not** authorize Ana activation/resume or customer messaging. Any future activation/outbound effect must be a separate reviewed slice from fresh REAL NOW evidence.

## 2026-09-19 CI execution checkpoint — HISTORICAL / SUPERSEDED FOR NORMAL CI

This section records ADR 0113 historical evidence. ADR 0158 and the 2026-09-22 GitHub-hosted CI section above supersede it for current normal CI execution.

```text
main entering CI slice                     = 90ce29465816e4b91fb7bf2d516e0119a6404731
PR                                          = #162 ci: add isolated Wandora self-hosted runner
implementation-validation head             = fad8d64070663aea823325f8970a24b90004295e
repository                                  = private
runner                                      = wandora-vps-01-ci
runner host                                 = wandora-vps-01 / 13.140.190.149
runner identity                             = wandora-ci
Docker boundary                             = dedicated rootless daemon
production Docker socket access             = none
validated PR checks                         = 7/7 success
```

At this historical ADR 0113 checkpoint, GitHub-hosted Actions quota exhaustion was an external billing/quota condition and normal repository CI temporarily targeted `[self-hosted, linux, x64, wandora-ci]`. This is no longer the current runner policy; ADR 0158 moved normal CI to GitHub-hosted `ubuntu-24.04`.

The runner is deliberately hosted on the existing Wandora VPS but is isolated from production through a dedicated unprivileged identity, no host `docker`/operator/sudo groups, a separate rootless Docker daemon/store, explicit systemd path restrictions, pre/post rootless-boundary hooks and resource ceilings of 300% CPU, 3 GiB `MemoryHigh`, 4 GiB `MemoryMax` and 4096 tasks. The runner service keeps `PrivateTmp=yes`; workflow files that must be bind-mounted into rootless Docker must be staged under `RUNNER_TEMP`, not the runner-private `/tmp`.

Final validation on the implementation head proved Core Candidate, Core, Messaging Gateway, Operator Consoles, Organization Adapter Plugin, Platform Admin and Web CI green while critical production containers remained healthy with zero restarts.

At the ADR 0113 CI checkpoint the next functional product slice was **Customer Owner First Real Tenant Digital-Employee Hire Execution Preflight V1**. ADR 0114 closed that no-effect gate and ADR 0115 has now completed the first real MEDICSPRO customer hire through the normal owner browser path. The next functional slice is **Customer Owner First Real Tenant Digital-Employee Activation Preflight V1**. Ana remains paused + supervised; Human Send and Gateway outbound remain OFF.

This file is a compact current-state handoff. Historical evidence belongs in accepted ADRs and infra proof documents. Mutable runtime facts must be re-verified before a later production action.

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

After timeout, frozen chat or tool failure, inspect real Git/runtime state before repeating any operation. A missing assistant response is not evidence that the prior operation failed.

## Capability authority

Wandora owns product/operator semantics, stable IDs, tenant authorization, policy, supervision, orchestration and provider-neutral contracts.

- **Paperclip** owns digital-employee organization/control-plane capability behind the Wandora Organization Adapter.
- **Mastra** supplies agent/workflow execution behind the Agent Runtime Adapter.
- **Evolution** supplies WhatsApp transport behind the Messaging Gateway.
- **Supabase** supplies identity/session and PostgreSQL/data infrastructure for Wandora-owned facts, mappings, policy and audit/reconciliation.
- **Docker / Compose / Portainer / Traefik / Cloudflare** supply deployment/runtime/edge capability.

Before material new domain state, apply ADR 0036 Capability Authority / Reuse Gate. Do not recreate Paperclip agent lifecycle, hierarchy, tasks or assignment control plane merely because a local Wandora table would be convenient.

## Customer Web — CURRENT

Implemented routes include `/`, `/team`, `/work`, `/conversations`, `/approvals`, `/company`, `/login` and `/start`.

**REAL:** login/session, explicit multi-organization selection, Team read, Work, Conversations, Canonical Confirmation V2, the controlled supervised WhatsApp loop, and the tenant-gated customer `Contratar Ana` contract/UI.

**PARTIAL / PLACEHOLDER:** dashboard/company/approval surfaces and digital-employee **activation/resume**. The first real MEDICSPRO hire is now live under ADR 0115; activation remains deliberately unavailable.

Customer hire is exposed only through the exact reviewed route `POST /api/v1/organizations/:organizationId/digital-employees`, normal human session authorization, tenant eligibility and Organization Adapter/Paperclip reconciliation. `Contratar` creates/returns a paused + supervised employee; it is not an activation capability.

Human Send and Gateway outbound remain separate effect capabilities and remain OFF.

## Organization Adapter — accepted V1 architecture

ADRs 0037–0050 establish the accepted catalog path:

```text
Wandora Organization Adapter
  -> private provider-neutral service contract
  -> frozen provider company target
  -> file-backed per-company HMAC custody
  -> signed private Paperclip webhook
  -> Wandora-owned headless multi-company Paperclip plugin
  -> Paperclip configured-company host scope
  -> agents.managed.reconcile(stable catalog agentKey, companyId)
```

V1 is **catalog-only**. Arbitrary/custom employees and silent fallback to direct `agent-hires` remain out of scope.

Direct repeated `agent-hires` was proven non-idempotent and is not the selected V1 catalog path.

### Minimum Wandora-private state — LIVE FOR INTERNAL CANARY

Migration 010:

```text
infra/stacks/supabase/migrations/20260916_010_organization_adapter_state_v1.sql
```

owns only minimum integration safety state:

1. organization → provider company binding;
2. digital employee → opaque provider-managed agent binding;
3. hire operation journal for idempotency, request hash, recovery and audit.

### Service contract boundary — LIVE FOR INTERNAL CANARY

Migration 011:

```text
infra/stacks/supabase/migrations/20260916_011_organization_adapter_service_contract_v1.sql
```

adds the reviewed internal catalog-hire service/runtime boundary with owner/admin authorization, frozen provider-company target, idempotency/conflict handling, conservative `uncertain` recovery and no provider ID leakage to customer contracts.

Both migrations are live in production. Their exact canonical verifiers returned `ORGANIZATION_ADAPTER_STATE_V1_OK` and `ORGANIZATION_ADAPTER_SERVICE_CONTRACT_V1_OK`; verifier proof rows rolled back.

## Secret custody — LIVE FOR INTERNAL CANARY

ADR 0041 selects mounted-file custody, not per-company HMAC environment variables and not database-held secret material.

Core derives only:

```text
paperclip-<sha256(providerCompanyRef)>.hmac
```

inside an operator-mounted absolute custody directory. Raw company refs never become filesystem paths. The reader uses `O_NOFOLLOW` and rejects missing, empty, oversized or weak material.

Per-company Organization Adapter custody is live for the internal canary. Core uses the mounted-file boundary and Paperclip stores only its company-owned encrypted secret with plugin config referencing it by `secret_ref`. Raw material remains outside Git and business payloads.

## Composed proof / activation rehearsal — PROVEN, NON-PRODUCTION

PR #85 proved the composed disposable path:

```text
OrganizationAdapterService
  -> migrations 010/011
  -> operation reservation / frozen target
  -> file-backed per-company custody
  -> signed Paperclip client
  -> exact private HTTP contract
```

ADR 0042 / PR #87 proved the production-shaped activation order and failure/rollback behavior using disposable/candidate infrastructure.

ADR 0043 / PR #88 added candidate-only Core wiring. The base live Core remains Organization Adapter OFF unless a later explicit activation changes it. The candidate overlay requires database mode, exact private Paperclip webhook, read-only HMAC custody and migration-011 readiness. It adds no customer/browser/Platform Admin hiring route.

## Core candidate provenance — PROVEN, NOT RUNNING AT LAST LIVE CHECK

ADRs 0044–0048 established the build, staging and portable OCI provenance contract.

Corrected candidate application source:

```text
068d30a49d9b96a943c7c3d23d86116e94cce788
```

Post-merge private artifact proof:

```text
workflow_run        = 35198147447
artifact_id         = 10487136577
artifact_zip_sha256 = 2bf661160c5344c87ed4445e709dfdcdc95e067c4c049eb596f3a1835c6d02db
archive_sha256      = 3b7c65c30525fb3f2bb0674bbe81687570aae48f26b08ee80b8c6a33193a7d76
oci_config_digest   = sha256:256f237aafdfb4f7968c122cce044312de78390105bb148b63a8ff7e271edb9f
oci_manifest_digest = sha256:f0ffa18271172e6e6e77f778f7b2f4f5302a84901909663525b8f665ad9f0c1e
```

Private host staging was:

```text
/home/wandora-admin/.local/share/wandora/core-candidates/
  068d30a49d9b96a943c7c3d23d86116e94cce788/
```

Last verified candidate state:

```text
candidate tag   = wandora/core:organization-adapter-candidate-068d30a49d9b
candidate VPS Id= sha256:f0ffa18271172e6e6e77f778f7b2f4f5302a84901909663525b8f665ad9f0c1e
state           = STAGED + LOADED, NOT RUNNING
running count   = 0
```

Do not repeat `docker load` merely because a chat froze. Reconcile current image/container state first.

## Production Activation Preflight V1 — ADR 0049

ADR 0049 did **not** authorize activation. It proved recovery/readiness prerequisites and stopped on a missing production Paperclip plugin artifact.

Already-proven recovery evidence — do not repeat blindly:

```text
backup = /home/wandora-admin/backups/postgres-pre-org-adapter-20260917T051624Z.dump
backup_sha256 = baa73742dfc6ef90f2cb4ff500d72da317f8d7c91a4db7e0c45b0a1fbcc7fe77
RESTORE_COUNTS_MATCH = YES
POSTGRES_WANDORA_RESTORE_PROOF_OK
ORGANIZATION_ADAPTER_LIVE_PREACTIVATION_V1_OK
```

Last live runtime evidence from that preflight — **historical until re-verified**:

```text
wandora-core      = wandora/core:team-read-b31db507, healthy
Organization Adapter = OFF
wandora-paperclip = wandora/paperclip:v2026.831.1, healthy/private
Paperclip binding = 127.0.0.1:3100 -> 3100/tcp
Human Send        = OFF
Gateway outbound  = OFF
migration 010 private tables = ABSENT
production Organization Adapter HMAC custody = ABSENT
production plugin/config = ABSENT
```

## Production Paperclip managed-plugin artifact — CANONICAL + LIVE FOR INTERNAL CANARY

ADR 0050 / PR #95 cleared ADR 0049's missing-artifact blocker.

Canonical source:

```text
integrations/paperclip/plugins/organization-adapter-v1/
```

Canonical package contract:

```text
package      = paperclip-plugin-wandora-organization-adapter@0.1.0
plugin id    = wandora.organization-adapter-v1
catalog key  = ana-commercial-v1
adapterType  = wandora_mastra
status       = paused
budget       = 0
Paperclip    = wandora/paperclip:v2026.831.1
source       = 65ec059bde30d98c92165b24a30a540800dd1f6f
plugin API   = 1
SDK source   = 1.0.0
```

The package embeds no Wandora execution URL, real secret, provider company identifier, API key or run JWT. `wandora_mastra` is only the stable future adapter identifier; execution-adapter promotion remains a separate gate.

Post-merge `main` proof:

```text
main                = f60715d042da4bbe4ac9068ea29dae2c986006bd
workflow_run        = 35266676646
artifact_id         = 10516662930
artifact_name       = organization-adapter-plugin-f60715d042da4bbe4ac9068ea29dae2c986006bd
artifact_zip_sha256 = 121358ee9f09b910eae82d6a72e15ed8ed6285bd6fe8ab311232fca2928abfa4
package             = paperclip-plugin-wandora-organization-adapter-0.1.0.tgz
package_sha256      = a4811f1d1f8521aeaf3930979ce12784f9b55e52390e24ead85300250d383e36
```

The dedicated CI proved strict typecheck, 5/5 signed-ingress tests, bundled SDK artifact shape, pinned native Paperclip manifest validation, two identical `npm pack` hashes, exact five-file tarball contents, forbidden proof/credential material absence and private artifact upload.

**Historical artifact blocker cleared by ADR 0050. Current live activation state is governed by ADR 0059 and the checkpoint below.**

## Operator Consoles + Paperclip Provider Prerequisites — LIVE, BOUNDED

ADRs 0051–0057 supersede older console/admin preflight notes.

Current proven operator surfaces:

```text
control.wandora.com.br -> Cloudflare Access -> Traefik -> control bridge -> private Paperclip
runtime.wandora.com.br -> Cloudflare Access -> Traefik -> isolated Mastra Studio
```

Origin TLS is valid and direct public-origin TCP/443 bypass was denied in the external probe.

Paperclip provider administration/current canary state:

```text
bootstrapStatus = ready
instance admin = established through explicit operator claim
provider companies = 1
provider company = Wandora Internal Supervised Proof
providerCompanyRef = 815d499e-4231-4e6b-b7fc-67f0ba22a595
owner/active membership = 1
wandora.organization-adapter-v1 = installed, ready
plugin company config = present
Paperclip Ana agents = 1
Paperclip managed resources = 1
```

The provider company maps only to the canonical internal Wandora supervised-proof organization. `Empresa Exemplo` deliberately still has no Paperclip company.

Migrations 010/011, control-plane binding and per-company custody are now live for this internal canary. Customer hiring remains absent.

## Production Activation Preflight V2 — COMPLETE, NO ACTIVATION

ADR 0057 closes the observation/plan preflight.

Revalidated evidence includes:

```text
backup sha256 = baa73742dfc6ef90f2cb4ff500d72da317f8d7c91a4db7e0c45b0a1fbcc7fe77
candidate = loaded, running count 0
live Core = wandora/core:team-read-b31db507, healthy
Organization Adapter = OFF
Human Send = OFF
Gateway outbound = OFF
plugin artifact = available, unexpired
wandora.organization-adapter-v1 installed count = 0
```

The full future migration -> operator binding -> canonical plugin artifact -> per-company HMAC/secret_ref -> company config -> candidate Core -> internal canary order is frozen in ADR 0057.

**Preflight completion is not activation authorization.**

## Exact future migration boundary

A later activation may proceed only after a fresh preflight. If that preflight explicitly authorizes execution, database order remains fixed:

1. apply `20260916_010_organization_adapter_state_v1.sql`;
2. run `VERIFY_20260916_ORGANIZATION_ADAPTER_STATE_V1.sql`;
3. stop immediately on failure;
4. apply `20260916_011_organization_adapter_service_contract_v1.sql`;
5. run `VERIFY_20260916_ORGANIZATION_ADAPTER_SERVICE_CONTRACT_V1.sql`;
6. stop immediately on failure;
7. only then continue to separately reviewed plugin install/config, per-company HMAC custody and candidate Core activation.

Migration 010 being inert is not permission to apply it early. Migration 011 widens `wandora_core_runtime` capability and remains part of one attributable activation sequence.

## Residual unrelated secret / cleanup gap

A residual file exists from an aborted/future dedicated Paperclip database experiment:

```text
/opt/wandora/stacks/paperclip-db/secrets/postgres_password
```

It was not referenced by live Paperclip at the ADR 0049 preflight and is **not** an Organization Adapter HMAC. Do not reuse it as HMAC material and do not delete it merely as part of context recovery/activation. Cleanup is a separate reviewed operational concern.

## What remains explicitly NOT live / NOT approved

- customer `Contratar` / `Ativar funcionário` route or UI;
- arbitrary/custom employee creation;
- direct `agent-hires` fallback;
- Paperclip → Wandora/Mastra execution-adapter production promotion;
- Human Send or Gateway outbound activation as part of Organization Adapter work;
- second/customer Paperclip provider-company provisioning.

## Second adversarial review after artifact promotion

Rejected shortcuts:

- treat the green artifact as permission to activate production immediately;
- install/configure the plugin before re-checking current live Paperclip/runtime state;
- apply migration 010 early merely because the artifact blocker is now gone;
- generate HMACs before the fresh preflight fixes the exact target/company/install composition;
- treat `wandora_mastra` as proof that the production execution adapter is installed;
- reuse the residual future `paperclip-db` PostgreSQL password as HMAC material;
- repeat backup, restore proof or candidate load just because prior chats froze.

## Production Activation Execution V1 — INTERNAL CANARY COMPLETE

ADR 0059 is the current activation authority/checkpoint.

```text
migration 010 = LIVE + verifier green
migration 011 = LIVE + verifier green

internal control-plane binding = exactly 1
Paperclip plugin = wandora.organization-adapter-v1@0.1.0, ready
Paperclip company config = present
Paperclip company secret reference = present, version 2
Paperclip private hostname allowlist includes wandora-paperclip

internal canary operation = completed
Wandora Ana = 1 active / supervised
Wandora provider binding = 1
Paperclip Ana = 1 paused / wandora_mastra
Paperclip managed resources = 1
same-key replay = same Wandora employee id
```

The first provider call failed closed with HTTP 403 because the Paperclip private hostname guard did not allow its Docker service hostname. PR #103 added only `PAPERCLIP_ALLOWED_HOSTNAMES=wandora-paperclip`, preserved the guard, and promoted the exact merged Compose. The existing `uncertain` operation was then retried with the same idempotency key and completed successfully.

Post-promotion runtime:

```text
live Core = wandora/core:organization-adapter-candidate-068d30a49d9b
live Core image id = sha256:f0ffa18271172e6e6e77f778f7b2f4f5302a84901909663525b8f665ad9f0c1e
live Core Organization Adapter = ON
live Core healthz/readyz = 200/200
Gateway ingress = ON
Human API = ON
deterministic Agent Runtime = ON
Human Send = OFF
Gateway outbound = OFF

Paperclip = healthy/private/authenticated
Paperclip plugin = ready
Paperclip companies = 1
Paperclip Ana / managed resources = 1 / 1
Empresa Exemplo Paperclip company = absent
customer Contratar/Ativar = absent
```

ADR 0060 proves that no Core or Core-stack source changed after the candidate source revision, the promotion render had no residual delta beyond the candidate image + Organization Adapter config/mount, rollback was prepared before replacement, and a same-key replay through the live Core returned the existing Ana without duplication.

## Organization Adapter Live Cross-Company Isolation Execution V1 — COMPLETE

ADR 0062 closes the remaining live A/B isolation gate.

The execution deliberately used an ephemeral provider-only company B and never provisioned `Empresa Exemplo`.

Two setup attempts failed closed and were fully recovered before any retry:

1. verifier used the wrong Paperclip membership table name; official cleanup restored baseline;
2. preflight expected HTTP 422 for cross-company secret_ref rejection, while the live Paperclip route intentionally normalizes that internal error to HTTP 400; source review proved the exact mapping and official cleanup again restored baseline.

The final proof established:

```text
B owner membership = 1
B config / B secret_ref = valid
B agents / managed = 0 / 0

A secret_ref -> B config
  = HTTP 400
  = "Plugin config references a secret outside the selected company"
  = B config unchanged

A HMAC -> B target
  = HTTP 502
  = invalid_wandora_signature
  = B agents / managed still 0 / 0
```

Cleanup used the official Paperclip company API, then re-saved A's exact existing config JSON unchanged to recompute the worker configured-company scope to A-only.

Final independent state:

```text
Core / Paperclip = healthy / healthy
Organization Adapter = ON
Human Send = OFF
Gateway outbound = OFF

Wandora organizations = 2
control-plane bindings = 1
digital-employee provider bindings = 1
completed hire operations = 1
Empresa Exemplo Paperclip binding = 0

Paperclip companies = 1
ephemeral B = 0
plugin = ready
A config / secret / Ana / managed = 1 / 1 / 1 / 1
A secret_ref unchanged = true
fixture checkpoint = absent
```

The cross-company isolation gate is therefore **CLOSED**. No durable B provider state remains.

## Customer Digital-Employee Lifecycle Contract Preflight V1 — COMPLETE, NO CUSTOMER EFFECT

ADR 0063 defines the customer lifecycle boundary without enabling any customer mutation.

Accepted semantics:

```text
Contratar = materialize one supported catalog employee, stable/idempotent, paused + supervised
Ativar    = separate future execution permission; unavailable until production execution bridge + least-privilege resume contract are proven
```

No new lifecycle table is approved. Existing `wandora.digital_employees.status = paused|active` plus the existing Organization Adapter binding/hire journal are sufficient for V1 hire.

The existing Organization Adapter service already owns owner/admin authorization, tenant scope, idempotency, provider reconciliation and private binding. Customer first-time hire must change its local finalization from `active` to `paused`; completed hire replay must return the actual canonical `paused|active` state.

Paperclip independently confirms managed agents are provisioned paused and “require explicit activation.” Its plugin SDK exposes company-scoped `agents.resume`, but the live Wandora plugin does not request that capability and the Paperclip -> Wandora/Mastra execution bridge remains laboratory-only. Therefore customer activation remains blocked.

Provider company creation is lazy at first hire in product semantics, but must **not** be hidden inline inside the customer POST yet. Paperclip company creation is an instance-admin effect with no Wandora idempotency contract. The first `Empresa Exemplo` canary will therefore use a separately reviewed operator bootstrap prerequisite; general self-service requires a later bootstrap-automation contract.

The current public placeholder `/start` is not production-safe. Real V1 must be authenticated/tenant-bound, use the selected canonical organization, expose only `Ana / ana-commercial-v1`, remove fake company/WhatsApp/knowledge effects, explicitly confirm `Contratar Ana`, and redirect to canonical `Equipe`. No `Ativar` control is rendered yet.

Customer hire also requires its own disabled-by-default runtime gate. Organization Adapter ON does not imply customer hire ON.

## Customer Hire Contract Implementation V1 — COMPLETE, GATE OFF

ADR 0064 closes the code/CI implementation slice.

The customer POST and authenticated Ana-only `/start` experience now exist in code behind a dedicated disabled-by-default runtime gate. First-time hire finalizes `paused + supervised`; hire replay returns the same employee with its current canonical `paused|active` state. The exact Web bridge forwards Authorization + Idempotency-Key and keeps the generic API boundary closed.

Second adversarial review found an existing legacy Ana in `Empresa Exemplo` that is active/supervised but has no Paperclip provider binding and no proven catalog identity. Therefore automatic adoption by matching name/role is rejected. The adapter now fails closed with `catalog-conflict` before journal/provider effect when such a legacy collision exists.

`Empresa Exemplo` is **not eligible for a naive first-hire canary**. ADR 0064 supersedes that future-canary assumption from ADR 0063.

No production deployment or customer effect was authorized by this implementation slice. Customer Digital-Employee Hire remains OFF; Human Send and Gateway outbound remain OFF; customer activation remains unavailable.

## Customer Hire Canary Selection + Legacy Reconciliation Preflight V1 — COMPLETE

ADR 0065 selects a **fresh employee-free internal customer-like tenant** for the first paused-first customer hire canary and defers legacy `Empresa Exemplo` adoption.

Read-only production evidence showed:

- only two current organizations;
- the internal supervised-proof organization already has the completed catalog canary and cannot prove first-time hire;
- `Empresa Exemplo` has one legacy active/supervised Ana with no Paperclip binding and no catalog hire operation;
- no durable provisioning/audit evidence proves that legacy row is `ana-commercial-v1`;
- the current ADR 0030 tenant provisioner always creates one active supervised commercial-assistant employee, so it cannot create a clean paused-first hire tenant;
- `wandora_platform_provisioner` remains inert at `CONNECTION LIMIT 0` with no password;
- live Customer Digital-Employee Hire, Human Send and Gateway outbound remain OFF.

The selected future canary is:

```text
Wandora Customer Hire Canary
slug = wandora-customer-hire-canary
pre-hire digital employees = 0
```

ADR 0065 also requires the actual first production hire effect to run through a **private production-connected candidate Core** with the customer-hire gate ON. The normal live Core stays customer-hire OFF during that canary because the current gate is runtime-wide, not tenant-specific.

## Private Tenant Provisioning V2 — IMPLEMENTED IN CODE / NOT LIVE

ADR 0066 implements the employee-free private provisioning contract without changing V1 behavior.

The versioned migration is:

```text
infra/stacks/supabase/migrations/20260918_012_private_tenant_provisioning_v2.sql
```

Contract:

```text
wandora_private.provision_beta_organization_v2(...)
  -> organization
  -> canonical user / Supabase identity mapping
  -> active owner membership
  -> private idempotency evidence
  -> zero digital employees
```

V1 and V2 share the private provisioning ledger with an explicit version/row-shape invariant:

```text
V1 -> provisioning_version = 1 -> employee_id required
V2 -> provisioning_version = 2 -> employee_id absent
```

The V1 function signature and first-employee behavior remain unchanged. V2 is executable only by the dedicated `wandora_platform_provisioner`; browser/authenticated/Core roles remain denied and the provisioner still has no direct table access.

A dedicated Core CI harness applies migrations 001→012 in order, reapplies 012, proves V2 behavior, V1 regression compatibility, shared-key cross-version fail-closed behavior and the least-privilege boundary.

**Migration 012 is not applied to production by this implementation slice.** The future canary tenant and Paperclip company remain absent; Customer Digital-Employee Hire, Human Send and Gateway outbound remain OFF.

## Private Tenant Provisioning V2 — PRODUCTION MIGRATION PREFLIGHT COMPLETE / NOT LIVE

ADR 0067 closes the production migration preflight without applying migration 012.

Fresh read-only live evidence before the preflight showed:

```text
organizations                     = 2
digital_employees                 = 3
control_plane_provider_bindings   = 1
digital_employee_provider_bindings= 1
completed catalog hire operations = 1
tenant_provisioning_requests      = 0
customer-hire canary              = absent

V1 function                       = present
V2 function                       = absent
provisioning_version column       = absent
employee_id                       = NOT NULL
```

The current rollback snapshot is:

```text
/home/wandora-admin/backups/postgres-pre-provisioning-v2-20260918T070139Z.dump
sha256=d88a4acb89eba37f7a366621c1d0ede4a824a26e54565bd823591979f28853ff
```

Restore proof on disposable `supabase/postgres:17.6.1.136` reproduced the current production business/integration counts and confirmed V1 present / V2 absent.

The exact canonical migration 012 Git blob `f9b6eedaf56b967ce9b30fd9a0558fb4c4cd34e7` was then applied twice to a disposable restore of that snapshot. It preserved all current business rows, created V2 only for `wandora_platform_provisioner`, and remained denied to Core/authenticated. A migration-only reverse path also restored the exact pre-012 schema while the provisioning ledger remained empty.

**Migration 012 is still absent from production.** Customer Digital-Employee Hire, Human Send and Gateway outbound remain OFF. The canary tenant and Paperclip company remain absent.

## Private Tenant Provisioning V2 — LIVE / DORMANT

ADR 0068 records the successful production application of migration 012.

Production now has:

```text
wandora_private.provision_beta_organization_v1(...) = present
wandora_private.provision_beta_organization_v2(...) = present
tenant_provisioning_requests.provisioning_version  = present
tenant_provisioning_requests.employee_id           = nullable

wandora_platform_provisioner EXECUTE V2 = true
wandora_core_runtime EXECUTE V2          = false
authenticated EXECUTE V2                 = false
platform direct ledger SELECT            = false
platform provisioner password            = absent
```

Post-migration business/integration state remained unchanged:

```text
organizations                     = 2
digital_employees                 = 3
control_plane_provider_bindings   = 1
digital_employee_provider_bindings= 1
completed catalog hire operations = 1
tenant_provisioning_requests      = 0
customer-hire canary              = absent
```

The canonical live-safe verifier returned `PRIVATE_TENANT_PROVISIONING_V2_LIVE_OK`. Core/Web/Paperclip/Gateway remained healthy. Customer Digital-Employee Hire, Human Send and Gateway outbound remained OFF.

V2 is therefore a **live but dormant** operator capability. No tenant has yet been created through it.

## Customer Hire Canary — Employee-Free Tenant Provisioning Preflight V1 — COMPLETE, NO CANARY CREATED

ADR 0069 freezes the exact first V2 canary request and least-privilege execution path.

Current frozen request:

```text
request_key               = customer-hire-canary:tenant-v2:v1
organization_slug         = wandora-customer-hire-canary
organization_display_name = Wandora Customer Hire Canary
owner_user_id             = e1000000-0000-4000-8000-000000000001
owner subject             = runtime-resolved only; SHA-256 frozen in ADR 0069
```

The production execution path creates no reusable platform password:

```text
private supabase_admin maintenance session
  -> resolve/hash-gate existing owner identity
  -> BEGIN
  -> SET LOCAL ROLE wandora_platform_provisioner
  -> provision_beta_organization_v2(...)
  -> COMMIT
  -> independent post-verification
```

The role-switch proof is green: the effective platform role can execute V2 and still cannot directly read the private provisioning ledger.

No redundant V2 rehearsal was run because ADR 0066/PR #111 already proves exact replay, changed-payload conflict, same-slug conflict, owner reuse and least privilege; ADRs 0067–0068 prove the exact current migration shape through disposable production restore and live application.

Production remains unchanged after this preflight: 2 organizations, 0 provisioning requests, canary absent, Customer Digital-Employee Hire OFF, Human Send OFF and Gateway outbound OFF.

## Customer Hire Canary — Employee-Free Tenant Provisioning Execution V1 — LIVE

ADR 0070 records the bounded V2 production execution.

Current durable state:

```text
organizations                       = 3
digital_employees total             = 3
tenant_provisioning_requests        = 1

Wandora Customer Hire Canary        = active
canary active owner memberships     = 1
canary digital employees            = 0
canary control-plane bindings       = 0
canary employee-provider bindings   = 0
canary hire operations              = 0
```

The provisioning row uses the frozen request key `customer-hire-canary:tenant-v2:v1`, `provisioning_version=2`, `employee_id=NULL`, and reuses the frozen canonical owner.

The least-privilege role remains passwordless with `CONNECTION LIMIT 0`.

Independent Paperclip API proof still reports exactly one provider company — `Wandora Internal Supervised Proof` — so the new canary has no Paperclip company yet.

Customer Digital-Employee Hire, Human Send and Gateway outbound remain OFF. The existing Organization Adapter internal canary bindings/operation remain unchanged at 1/1/1.

## Customer Hire Canary — Paperclip Provider Company Bootstrap Preflight V1 — COMPLETE, NO PROVIDER MUTATION

ADR 0071 freezes the first provider-company bootstrap for the clean customer-hire canary.

Live Paperclip proof:

```text
commit              = 65ec059bde30d98c92165b24a30a540800dd1f6f
deployment          = authenticated / private
bootstrap           = ready
database backup     = enabled / ok
operator credential = board_key / isInstanceAdmin=true
companies           = 1
exact canary-name matches = 0
```

Frozen request:

```json
{"name":"Wandora Customer Hire Canary"}
```

Body SHA-256:

```text
e1c49549f40291c7247bc70916127842ffa7aecb04428ce1b3380b08aaad51fe
```

Paperclip company creation has no idempotency key, company names are not unique, and the route is not externally atomic across company creation, owner membership/grants and audit. Therefore any lost/non-201 response after dispatch is treated as potentially effectful. Blind retry is forbidden; reconciliation against the frozen pre-call company baseline is mandatory.

The live health contract reports `companyDeletionEnabled=false`, so deletion is not assumed as normal rollback. Partial/orphan state stops the slice for separately reviewed recovery rather than direct SQL repair.

Production remains unchanged after preflight: Paperclip still has one company, the canary has zero employees/provider bindings/hire operations, and Customer Digital-Employee Hire, Human Send and Gateway outbound remain OFF.

## Customer Hire Canary — Paperclip Provider Company Bootstrap Execution V1 — LIVE

ADR 0072 records the one-shot provider bootstrap through the official Paperclip CLI/instance-admin boundary.

Current provider state:

```text
Paperclip companies total = 2

Wandora Internal Supervised Proof
  providerCompanyRef = 815d499e-4231-4e6b-b7fc-67f0ba22a595
  status = active

Wandora Customer Hire Canary
  providerCompanyRef = e7422a00-1474-49d5-ac32-34594520015e
  status = active
  owner membership = active
  agents = 0
  Organization Adapter config = absent
  company secrets = 0
```

The canary Wandora organization still has zero employees, zero provider bindings and zero hire operations. Existing internal integration totals remain 1/1/1.

Customer Digital-Employee Hire, Human Send and Gateway outbound remain OFF.

## Customer Hire Canary — Organization Adapter Custody + Config + Binding Preflight V1 — COMPLETE / EXECUTION BLOCKED

ADR 0073 freezes the production wiring contract without creating any new binding, secret or config.

Frozen pair:

```text
Wandora organization = 918d4c7e-fccb-41f0-aba7-04105a9b4ec0
Paperclip company     = e7422a00-1474-49d5-ac32-34594520015e
provider              = paperclip
```

Future Core custody filename:

```text
paperclip-0cbf21f19c002ca9207c67e5cdec8180641431eacdf601629b683de2a363bbd2.hmac
```

The accepted execution order is operator-owned Wandora binding → one protected HMAC file → one company-owned Paperclip `local_encrypted` secret → company-scoped plugin config **last** → independent validation. Core remains unable to INSERT the control-plane binding.

Secret creation and plugin-config responses are reconciled by readback after ambiguity; blind retry is forbidden. Plugin config is not treated as safely repeatable merely because its storage operation is an upsert.

The second adversarial review found a recovery blocker: live Paperclip database backups and `/paperclip/instances/default/secrets/master.key` are currently colocated on the same Docker volume, while Paperclip requires both database metadata and that master key to restore `local_encrypted` secrets. No independent external master-key recovery copy was found.

Therefore no second production `local_encrypted` HMAC is created yet.