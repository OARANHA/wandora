# ADR 0038 — Organization Adapter Private State V1

Date: 2026-09-16
Status: **Accepted implementation direction for inert private state. Customer hiring/runtime activation is NOT approved by this ADR.**

## Context

ADR 0036 requires Wandora to reuse specialist capabilities before creating local domain machinery. ADR 0037 selected Paperclip as the digital-employee organization/control-plane provider and proved the external execution-adapter boundary into Wandora/Mastra.

A subsequent disposable proof used the exact installed Paperclip image (`wandora/paperclip:v2026.831.1`) in an isolated volume and established additional facts:

- two isolated Paperclip companies can be created without touching the live control plane;
- `POST /api/companies/:companyId/agent-hires` successfully creates an agent in the selected company;
- a disposable Paperclip task assigned to that agent can run through the exact versioned `wandora_mastra_spike` adapter;
- Paperclip minted a run-scoped JWT, the Wandora proof bridge validated its dedicated HMAC, and the bridge used the opaque run JWT to update the same task successfully;
- the same `agent-hires` request repeated twice returned `201` twice with two different agent IDs;
- Paperclip agent `metadata` preserves and returns Wandora-owned reconciliation markers such as a stable employee ID and hire-operation key.

The literal disposable credential probe for Company A attempting Company B was not executed because the automation environment blocked creation/manipulation of an additional API credential. Cross-company denial remains strongly supported by the audited installed authorization code/tests and is an explicit activation gate rather than something this ADR claims was live-probed.

## Decision

Wandora will persist only the minimum private state needed to make the Paperclip Organization Adapter stable, idempotent, reconcilable and replaceable.

The approved state categories are:

1. **organization provider binding** — canonical Wandora organization ↔ provider company reference;
2. **digital-employee provider binding** — canonical Wandora employee ↔ provider agent reference;
3. **hire operation journal** — Wandora-owned idempotency/request-hash/reconciliation evidence for the non-idempotent external `agent-hires` effect.

These records live under `wandora_private`. They are not customer contracts and raw provider IDs remain hidden from Web and Platform Admin APIs.

## What remains authoritative where

**Wandora remains authoritative for:**

- stable organization and digital-employee IDs;
- tenant ownership and customer authorization;
- customer-facing employee name/role/autonomy/policy projection;
- adapter request idempotency;
- provider bindings;
- reconciliation/audit evidence;
- provider replacement boundary.

**Paperclip remains authoritative for:**

- control-plane agent lifecycle;
- organization hierarchy/coordination concepts supplied by Paperclip;
- task/issue lifecycle, assignment and run/checkout ownership;
- Paperclip permissions/configuration revisions;
- provider-side agent IDs and task IDs.

The hire journal is therefore an **external-effect safety journal**, not a second agent lifecycle.

## Hire idempotency contract

Paperclip does not deduplicate equal `agent-hires` requests for Wandora. Wandora must reserve an idempotency key before invoking Paperclip.

A hire operation records at minimum:

- organization;
- Wandora idempotency key;
- request SHA-256 hash;
- reserved stable Wandora employee UUID;
- selected provider;
- safety state (`planned`, `creating`, `completed`, `uncertain`);
- provider agent reference when known;
- timestamps.

Expected behavior for the later activation slice:

```text
same key + same request
  -> return/reconcile the same Wandora employee/provider binding

same key + changed request
  -> fail with idempotency conflict

creating/timeout/ambiguous response
  -> do NOT blindly call agent-hires again
  -> query Paperclip for Wandora metadata markers first
  -> exactly one match: reconcile
  -> zero matches: retry only under an explicitly safe policy
  -> multiple matches: fail closed for operator reconciliation
```

The Paperclip agent should carry non-secret metadata markers sufficient for reconciliation, such as the stable Wandora employee ID and hire-operation key. No Wandora credential belongs in Paperclip metadata.

## Inert migration rule

Migration `20260916_010_organization_adapter_state_v1.sql` creates only private state and constraints.

It MUST NOT in this slice:

- grant `wandora_core_runtime` access to the new tables;
- grant `authenticated` access;
- add Web/Core hiring routes;
- grant Core write access to `wandora.digital_employees`;
- install the adapter into live Paperclip;
- bind either existing production organization to Paperclip;
- provision a customer agent;
- activate Platform Admin;
- create provider credentials or secrets.

RLS remains enabled with no application policies. Explicit access activation is a later reviewed slice coupled to the Organization Adapter service/route that consumes it.

## Security / data minimization

The private state contains provider references, hashes and reconciliation state only. It must not contain:

- Paperclip board/API keys;
- Paperclip run JWTs;
- HMAC secrets;
- model-provider credentials;
- passwords;
- provider task bodies or prompt/runtime context;
- a copied Paperclip lifecycle or hierarchy.

## Relationship to existing patterns

This decision deliberately reuses two already-proven Wandora patterns:

- `wandora_private.messaging_provider_bindings` for private provider mapping;
- `wandora_private.outbound_attempts` for idempotency, conflict detection and conservative handling of ambiguous external effects.

The Organization Adapter state applies those patterns to a different provider capability; it does not create a new general workflow engine.

## Activation gates

Before a customer-facing `Contratar funcionário` action can be enabled, a later slice must still prove:

1. tenant-scoped Organization Adapter authorization and exact Core policy (`owner`/`admin` or a newer explicit capability);
2. Paperclip technical-identity lifecycle with least privilege;
3. cross-company denial using the final credential mechanism;
4. exact idempotent hire/replay/conflict behavior against disposable databases;
5. ambiguous-response reconciliation using Paperclip metadata;
6. rollback/cleanup behavior for local-only and provider-only partial success;
7. no provider IDs or credentials leak through customer APIs;
8. live activation uses reviewed secrets, backup/preflight and post-verification.

Only after those gates should the existing `Equipe`/`/start` customer experience expose a real hire action.