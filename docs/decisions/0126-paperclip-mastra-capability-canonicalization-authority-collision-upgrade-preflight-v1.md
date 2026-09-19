# ADR 0126 — Paperclip + Mastra Capability Canonicalization, Authority Collision Audit + Paperclip Upgrade Preflight V1

- Date: 2026-09-19
- Status: **Accepted no-effect architecture checkpoint — capability authority canonicalized; Paperclip production upgrade remains NO-GO until disposable upgrade proof is complete**
- Scope: canonicalize Paperclip/Mastra/Wandora capability ownership and evaluate, without production mutation, whether Paperclip `v2026.916.0` and Mastra `1.67.0` should change the current runtime plan.

## REAL NOW

Canonical Wandora main entering this slice:

```text
main = d4c67dd66e8e5331c8b2f86197965ea3f864759e
```

PR hygiene discovered during reconciliation:

```text
PR #174 = still open but superseded by merged PR #175
PR #176 = still open but superseded by merged PR #177
```

No existing capability-canonicalization PR/branch or the requested capability map files were found before this execution.

Latest independently revalidated production state before the remote execution channel became unavailable:

```text
Paperclip = wandora/paperclip:v2026.831.1
source    = 65ec059bde30d98c92165b24a30a540800dd1f6f

Core      = wandora/core:organization-adapter-candidate-0a40dac127ae
@mastra/core = 1.66.0
@mastra/memory = NOT_FOUND
@mastra/observability = NOT_FOUND
@mastra/evals = NOT_FOUND

Core / Paperclip / Gateway / Web / Auth = healthy
restarts                                  = 0

migration 014         = LIVE / verified
Core execution bridge = ON
wandora_mastra         = installed exactly once / previous test-environment PASS

Ana / Wandora          = exactly 1 / paused + supervised
Ana / Paperclip        = exactly 1 / paused
agents.resume          = absent
Human Send             = OFF
Gateway outbound       = OFF
outbound attempts      = 0
```

Current upstream versions reviewed:

```text
Paperclip stable = v2026.916.0
Paperclip commit = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
released         = 2026-09-16

Mastra Core stable = 1.67.0
Wandora live       = 1.66.0
```

## PROVEN EVIDENCE

### 1. Paperclip v831.1 already owns material control-plane capabilities

Direct inspection of the exact production source found existing docs/schema/migrations for:

- company/agent lifecycle;
- tasks/issues and heartbeat/run lifecycle;
- Routines with schedule/webhook/API triggers;
- Skills catalog/studio/policy/releases;
- Execution Policy and typed review/approval stages;
- Decisions;
- Decision Training;
- Task Watchdog plus separate active-run/liveness recovery;
- user-specific secrets/responsible-user state;
- Tool Gateway / Connections foundation;
- execution workspaces/runtime leases;
- external adapter loading;
- run-scoped local-agent identity.

Therefore a missing Wandora table/service is not evidence that Wandora should implement any of those capabilities.

### 2. Paperclip v916 materially advances Connections

The upstream stable release makes the Connections train a headline capability: runtime credentials, grant ownership, responsible-person routing and in-task connection repair/intents are substantially more mature than the current production baseline.

This is a real upgrade benefit.

It does not, by itself, authorize upgrading production.

### 3. Routines and Task Watchdogs are distinct native primitives

Paperclip Routines are durable recurring work with trigger/revision/concurrency/catch-up/run-history semantics.

Task Watchdog is stopped-work verification scoped to a specific issue subtree. It is explicitly not a scheduler, not formal approval authority and not active-run silence monitoring.

A new Wandora scheduler/watchdog would duplicate native control-plane capability without a proven gap.

### 4. Mastra is currently a narrow execution implementation

The live Wandora Core uses only:

- `Mastra`;
- `createTool`;
- `createStep`;
- `createWorkflow`.

The deterministic Ana runtime makes no external model call and loads Mastra only after forcing `MASTRA_TELEMETRY_DISABLED=true`.

Memory, Observability and Evals packages are absent live.

### 5. Mastra 1.67 is not a prerequisite for this Paperclip slice

The reviewed 1.67 breaking changes include:

- `subscribeQueuedMessages` -> `subscribeThreadEvents`;
- `ArchilFilesystem.grep` -> `diskGrep`.

Current Wandora code does not use these contracts.

Mastra 1.67 also introduces `@mastra/connect` and a Studio Workflow Builder backend. Neither is required for the existing bridge or deterministic runtime.

### 6. A new authority collision exists upstream

Paperclip v916 Connections and Mastra 1.67 `@mastra/connect` can both technically become connection/credential/tool authorities.

Using both as authorities would duplicate:

- connection identity;
- credential custody;
- grants;
- responsible-user routing;
- token refresh;
- tool catalog/access;
- audit evidence.

This duplication is rejected.

### 7. Paperclip upgrade migration review found no current model-profile blocker

The v831.1 -> v916 source diff includes migrations after 0230.

Migration `0236_remove_cheap_model_profiles.sql` deletes retired `modelProfiles` / `modelProfile` state.

The protected current-enough recovery snapshot used for bridge activation contains zero occurrences of both keys, so that specific migration has no observed live-data payload to remove in the retained snapshot.

This is static/snapshot evidence only; it is not a substitute for the full disposable migration proof.

### 8. Full v916 migration audit narrows the destructive-risk surface

All migrations after the production `0230` baseline through `0279` were statically reviewed.

Material findings:

- no reviewed migration targets deletion of the external adapter registry, `wandora_mastra` adapter registration contract or Organization Adapter plugin configuration;
- destructive/transforming work is concentrated mainly in the Connections/grants model, retired model-profile cleanup, heartbeat/wakeup provenance and new chat/AI-connection structures;
- `0232_fixed_hannibal_king.sql` preserves a company-scoped secret when it is also referenced by an organization grant, a tool connection, a `company_secret_binding` or a routine trigger. Ambiguous personal grants fail conservatively to reauthorization rather than silently taking ownership of such a secret;
- `0276_hard_mandroid.sql` only adopts recognized active **user-scoped** AI credentials with supported declarations into the AI-connections model. Its migration states that host auth homes and company secrets are left untouched and it performs no agent-binding changes;
- `0260` and related wakeup migrations rewrite idempotency/provenance state, so zero Ana wakeups/heartbeat drift remains a required post-migration proof;
- `0236` remains the known retired model-profile cleanup; the retained production-derived snapshot has no observed `modelProfiles` / `modelProfile` payload.

This source audit lowers the likelihood of an Organization Adapter secret/adapter migration collision, but it is **not** a runtime safety claim. The production-derived disposable restore/migrate/start proof remains mandatory.

### 9. Adapter static compatibility is promising but not sufficient

The current `wandora_mastra@0.1.0` uses the Paperclip adapter contracts needed for:

- `supportsLocalAgentJwt`;
- `testEnvironment`;
- `execute`;
- run token;
- agent/company/run context.

Those concepts remain present in v916 source.

However, the adapter compatibility file is intentionally pinned to:

```text
Paperclip image  = wandora/paperclip:v2026.831.1
Paperclip source = 65ec059bde30d98c92165b24a30a540800dd1f6f
```

Therefore production v916 requires runtime qualification and an explicit compatibility re-attestation rather than an assumption.

## GAPS

The Paperclip production upgrade is not yet proven.

Required disposable gates still include:

1. exact v916 candidate image build completion and digest;
2. restore of the protected Paperclip DB + `master.key` into an isolated PostgreSQL 18 target;
3. complete v916 migration;
4. company and owner-membership preservation;
5. Organization Adapter plugin/config/secret-ref preservation;
6. successful decrypt with the protected recovery key and wrong-key rejection;
7. Ana remains exactly one and paused;
8. `wandora_mastra` package/load compatibility;
9. official adapter readback/test-environment PASS;
10. run-scoped JWT `/api/agents/me` behavior;
11. disposable Paperclip -> bridge -> Wandora/Mastra execution;
12. unknown company/agent mapping fail-closed;
13. zero unexpected wakeups/heartbeat drift;
14. zero outbound effect;
15. disposable cleanup;
16. rollback evidence.

During the preflight, the exact v916 source tag was cloned and a pinned candidate build was started:

```text
tag       = v2026.916.0
commit    = dffc2b3ca1b9e88fa21cb17493083e682dffd1ca
candidate = wandora/paperclip-upgrade-candidate:v2026.916.0-dffc2b3
```

The versioned GHCR tag `ghcr.io/paperclipai/paperclip:v2026.916.0` was not available, so the preflight correctly refused to substitute an unpinned `:latest`.

A PostgreSQL `18.1-bookworm` pull was also started to match the production embedded PostgreSQL 18.1 proof target.

The remote VPS execution channel then became unavailable. Completion of those already-dispatched operations is therefore **ambiguous and must be reconciled before any retry**.

No production runtime mutation was authorized or performed by this capability/upgrade preflight.

## CAPABILITY AUTHORITY / REUSE GATE

PASS with the following canonical split.

### Paperclip

Paperclip remains implementation authority for:

- digital-employee organization/control plane;
- company/agent lifecycle;
- durable tasks/issues/runs;
- Routines;
- organizational Skills catalog/policy/releases;
- control-plane Decisions/Execution Policy;
- Decision Training evidence;
- Task Watchdogs/liveness recovery;
- Paperclip-controlled connection/grant/agent-secret state;
- external adapter loading and run-scoped identity.

### Mastra

Mastra remains implementation authority for:

- agent/workflow execution;
- tool execution lifecycle;
- execution-local goals/task lists/signals;
- runtime memory when separately adopted;
- runtime observability/evals when separately adopted;
- workspaces/sandbox;
- runtime skill materialization;
- runtime token/context controls.

### Wandora

Wandora remains authority for:

- customer-facing product semantics and stable IDs;
- tenant membership/authorization;
- digital-employee customer contract and policy projection;
- provider-neutral adapters;
- external-effect authorization;
- supervised-send/customer commitment rules;
- messaging effect policy;
- compliance/effect audit;
- plans/billing/usage semantics;
- retention/privacy policy;
- minimum mappings/reconciliation state needed for safe provider replacement.

## DECISION

### 1. Canonicalize capabilities now

Create and maintain:

- `docs/PAPERCLIP_CAPABILITY_MAP.md`;
- `docs/MASTRA_CAPABILITY_MAP.md`;
- `docs/CAPABILITY_COLLISION_MATRIX.md`.

These documents are inputs to ADR 0036's Capability Authority / Reuse Gate.

### 2. Paperclip production upgrade remains NO-GO

Do not upgrade production from `v2026.831.1` to `v2026.916.0` until every disposable upgrade gate above is green.

The upgrade is currently **interesting and likely useful**, especially for Connections, but not yet proven safe for Wandora's exact bridge/plugin/secret state.

### 3. Mastra remains pinned to 1.66.0 for this slice

Do not couple Paperclip qualification to a Mastra version change.

A later Mastra 1.67 dependency upgrade may be small because current code does not use the reviewed breaking APIs, but it is a separate slice with its own dependency/runtime CI.

### 4. Paperclip Connections leads connection/grant authority evaluation

Do not create a competing Wandora connection/grant subsystem merely because it is missing locally.

Do not adopt Mastra `@mastra/connect` as the organizational connection authority while Paperclip Connections is the leading accepted specialist candidate.

### 5. External effects remain Wandora-authorized

Neither:

- Paperclip Tool Gateway/Connections;
- Paperclip Decision/Execution Policy;
- Mastra tool hooks;
- Mastra skills/signals/schedules/goals;
- Mastra eval/memory state

may authorize a customer-visible/external effect by themselves.

The final Wandora effect policy remains independently mandatory.

## SECOND ADVERSARIAL REVIEW

The provisional decisions were challenged against the following failure modes.

### “Paperclip is old; build missing capabilities in Wandora now”

Rejected. The exact v831.1 source already contains the major control-plane primitives. Local absence is not provider absence.

### “Upgrade Paperclip because the newer version is better”

Rejected. v916 has meaningful benefits, but its migrations and adapter/runtime contracts have not yet passed the required production-derived disposable proof.

### “Use latest because the exact GHCR version tag is absent”

Rejected. The candidate must be source/tag/commit pinned. An unpinned `:latest` would destroy provenance.

### “Use both Paperclip Connections and Mastra Connect”

Rejected. That creates two credential/grant authorities and ambiguous responsible-user semantics.

### “Paperclip approval means Wandora may send”

Rejected. Control-plane review is not external-effect authorization.

### “Mastra beforeToolCall is the authorization layer”

Rejected. A hook is a runtime interception point. Durable product/effect authorization remains Wandora-owned.

### “Paperclip Skills and Mastra Skills are duplicates, choose only one”

Rejected. They operate at different layers: organizational catalog/policy versus runtime materialization.

### “Routine and Mastra schedule are interchangeable”

Rejected. A durable business recurrence has ownership/history/concurrency semantics that belong in Paperclip Routine. Runtime-internal timing may remain Mastra-local.

### “Task Watchdog can approve high-risk actions”

Rejected. Paperclip's own watchdog contract explicitly forbids widening authority or bypassing formal approvals.

### “Upgrade Mastra simultaneously while already touching Paperclip”

Rejected. It expands the change surface without a dependency.

### “The interrupted build should simply be rerun”

Rejected. Its state is ambiguous. Reconcile whether the candidate image/pull completed before repeating any dispatched operation.

## EXECUTION

Completed in this no-effect slice:

- re-read canonical Wandora authority/state/architecture;
- revalidated current `main`;
- identified superseded open PRs #174/#176;
- reviewed exact production Paperclip v831.1 capabilities;
- reviewed upstream Paperclip v916 tag/commit and migration delta;
- reviewed live Mastra package state;
- reviewed current Mastra 1.67 release delta;
- created the three capability/collision maps on an isolated documentation branch;
- started, but did not assume completion of, an exact-source Paperclip v916 candidate build;
- started, but did not assume completion of, the PostgreSQL 18.1 proof image pull.

Not executed:

- Paperclip production upgrade;
- production DB migration;
- production Paperclip recreation;
- adapter reinstall;
- new secret creation;
- `agents.resume`;
- Ana activation/resume;
- Human Send enablement;
- Gateway outbound enablement;
- customer/provider outbound effect.

## VALIDATION

At the last successful runtime read before the remote channel became unavailable:

```text
production Paperclip = v2026.831.1
production Core      = healthy
Paperclip            = healthy
Gateway              = healthy
Web/Auth             = healthy
restarts             = 0

Ana                  = paused + supervised
agents.resume         = absent
Human Send            = OFF
Gateway outbound      = OFF
outbound attempts     = 0
```

Repository continuity rule:

```text
candidate build/pull state = MUST RECONCILE BEFORE RETRY
Paperclip upgrade          = NOT AUTHORIZED
Mastra upgrade             = NOT PART OF THIS SLICE
```

## NEXT

Resume **Paperclip v2026.916.0 Disposable Upgrade Compatibility Proof V1**.

First action after runtime access returns:

```text
reconcile already-started candidate build and postgres:18.1 pull
-> do not repeat completed operations
-> restore protected Paperclip snapshot + master.key in isolated lab
-> migrate/start exact v916 candidate
-> prove company/membership/plugin/secret/Ana/adapter/JWT/bridge invariants
-> prove fail-closed/no-outbound
-> cleanup lab
-> only then decide GO or NO-GO for a separate production upgrade execution
```

Ana activation, `agents.resume`, Human Send and Gateway outbound remain outside that slice.
