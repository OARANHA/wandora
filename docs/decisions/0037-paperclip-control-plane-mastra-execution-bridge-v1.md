# ADR 0037 — Paperclip Control Plane + Wandora/Mastra Execution Bridge V1

Date: 2026-09-16
Status: **Accepted laboratory integration direction. Production/customer activation is NOT approved by this ADR.**

## Context

ADR 0036 requires Wandora to inspect adopted specialist systems before creating new domain/state machinery. Customer `Equipe` is already real, but hiring/configuration/activation remains a product gap.

The installed private Paperclip runtime was audited directly at the pinned source used by Wandora:

- image: `wandora/paperclip:v2026.831.1`;
- source commit: `65ec059bde30d98c92165b24a30a540800dd1f6f`;
- deployment mode: `authenticated`;
- exposure: private;
- health: `ok`.

That installed version already implements material control-plane capabilities Wandora must not duplicate casually:

- companies and company memberships;
- agent directory / org view;
- `POST /api/companies/:companyId/agent-hires`;
- agent lifecycle (pause/resume/terminate);
- agent permissions and configuration revisions;
- issues/tasks and assignment;
- approvals;
- goals, projects and routines;
- built-in and external agent adapters.

Paperclip also has an external adapter contract specifically intended to bridge its orchestration layer to custom runtimes, including HTTP/custom agents.

## Capability Authority result

For the first digital-employee control-plane path:

- **Wandora** owns customer/operator vocabulary, stable Wandora identity, tenant authorization, product policy, supervision, mappings/projections and adapter contracts.
- **Paperclip** is the selected control-plane capability provider for hiring/lifecycle/coordination concepts that its audited API already supports.
- **Mastra** remains the Wandora agent execution/runtime implementation behind the existing Wandora Agent Runtime boundary.
- **Supabase/PostgreSQL** persists Wandora-owned facts and minimal provider mappings/projections; it must not clone the full Paperclip control-plane model.

Existing beta `digital_employees` / `work_items` remain valid live vertical-slice state. Their existence does not grant architectural permission to expand a competing Paperclip-like control plane in Core.

## Board/service identity finding

Paperclip board API keys are bearer credentials attached to a Paperclip user. They do not carry an independent per-key company scope; authorization is derived from the owning user's active company memberships and permission grants.

Therefore:

- a broad instance-admin or multi-company board key must not become the normal tenant Organization Adapter credential;
- tenant operations should use a dedicated Paperclip service/board identity whose memberships and grants are limited to the mapped company/capabilities;
- platform-level Paperclip company provisioning, when required, is a separate higher-trust operation and must not be conflated with tenant-scoped employee operations.

The exact lifecycle/provisioning of those service identities remains to be proven before customer activation.

## Hiring boundary

A future Wandora `Contratar funcionário` product action should not directly insert a parallel employee/control-plane model merely because a local table is absent.

The target flow is:

```text
Customer Wandora Web
  -> Wandora hiring contract
  -> tenant authorization / plan / product policy
  -> Paperclip Organization Adapter
  -> Paperclip company-scoped agent-hire capability
  -> minimal Wandora ID <-> Paperclip ID mapping/projection
  -> customer-visible Equipe projection
```

Raw Paperclip IDs, schemas, approvals or adapter configuration never become browser contracts.

## Execution bridge

The audited Paperclip version supports external agent adapters with `supportsLocalAgentJwt`.

Paperclip mints a run-scoped agent JWT carrying at least agent/company/run identity. Current Paperclip authorization additionally mediates issue/task mutation against company scope, agent ownership and run/checkout attribution.

The accepted laboratory execution direction is:

```text
Paperclip issue/task
  -> Paperclip heartbeat/run
  -> external adapter: wandora_mastra
       - receives Paperclip run JWT from the adapter harness
       - authenticates to a PRIVATE Wandora execution endpoint using a separate Wandora HMAC
       - forwards the Paperclip run JWT opaquely for callbacks
  -> Wandora Execution Bridge
       - verifies Wandora HMAC, timestamp and exact request contract
       - does NOT receive Paperclip master JWT signing secret
       - maps Paperclip IDs to stable Wandora IDs
       - invokes Wandora Agent Runtime -> Mastra
       - uses the opaque run JWT only when calling Paperclip back for the same run/task
  -> Paperclip task/run lifecycle
```

## Trust boundary

The Paperclip run JWT is NOT sufficient authentication for the Wandora execution endpoint because Wandora should not receive the Paperclip master signing secret merely to verify it.

Paperclip -> Wandora therefore uses a dedicated directional HMAC secret, mounted only into the Paperclip runtime/adapter host and the private Wandora execution service. The request signs timestamp + exact body. The Paperclip run token is transported as an opaque secret header and must never be logged or persisted as product state.

This mirrors the already-proven Wandora Gateway -> Core directional-HMAC pattern.

## Fail-closed requirements

The production design must reject before Mastra execution when any of these are absent/invalid:

- dedicated bridge HMAC;
- bounded timestamp/replay window;
- Paperclip run token;
- mapped Paperclip company/agent identities;
- expected task/run identifiers;
- tenant/employee lifecycle compatibility.

Paperclip unavailability, timeout or ambiguous callback result must not be converted into invented success.

## Reconciliation and idempotency

Before customer activation, the Organization Adapter and execution bridge must define/prove:

- Wandora organization <-> Paperclip company mapping uniqueness;
- Wandora employee <-> Paperclip agent mapping uniqueness;
- idempotent hire retry behavior;
- mapping conflict behavior;
- Paperclip unavailable/retry semantics;
- duplicate Paperclip run delivery behavior;
- callback idempotency;
- reconciliation when one side committed and the other did not.

No browser or customer API may depend on provider IDs for idempotency.

## Laboratory proof already obtained

A disposable adapter package was loaded through Paperclip's actual external-adapter loader inside the exact live Paperclip image, with no production database/network access. The proof established:

- external adapter loader accepted the module;
- `supportsLocalAgentJwt=true` is available;
- missing run token fails closed;
- run token can be forwarded only in a private header;
- company/agent/run/context are delivered to the external runtime;
- execution result returns through Paperclip's adapter result contract.

The repository spike accompanying this ADR strengthens that proof with the dedicated Wandora HMAC boundary.

## Explicit non-goals

This ADR does NOT:

- install the adapter into live Paperclip;
- create a Paperclip company or agent;
- change live Wandora tenants/employees/work;
- migrate existing beta work routing;
- expose a customer hiring route;
- activate Platform Admin;
- enable Human Send or Gateway outbound;
- grant Wandora the Paperclip JWT master secret;
- authorize a broad instance-admin board key for normal tenant operations.

## Next validation gate

After this ADR/spike is green, the next slice is a **disposable Paperclip Organization Adapter contract proof** using non-customer Paperclip data only:

1. provision or select an isolated Paperclip test company through the appropriate higher-trust operator path;
2. establish a company-scoped technical identity with only required grants;
3. prove company-scoped list/org/agent-hire reads/actions;
4. prove cross-company denial;
5. create a disposable `wandora_mastra` agent using the external adapter;
6. assign a disposable issue/task and prove Paperclip -> Wandora/Mastra bridge -> scoped Paperclip callback;
7. destroy/reconcile the disposable state;
8. only then design the customer `Contratar funcionário` Wandora contract.
