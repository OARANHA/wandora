# ADR 0039 — Paperclip Managed Catalog Organization Adapter V1

Date: 2026-09-16
Status: **Accepted implementation direction for the V1 Paperclip technical identity and catalog-employee provider operation. NOT live; customer hiring/runtime activation is NOT approved by this ADR.**

## Context

ADR 0038 accepted the minimum private Wandora state required around a Paperclip Organization Adapter, based on a disposable proof where direct Paperclip `agent-hires` was non-idempotent. The activation gate still required a final least-privilege technical identity and literal tenant-boundary evidence.

A second disposable proof against the exact installed Paperclip build established a stronger provider-native path for named Wandora employees: a headless Paperclip plugin can expose a private signed webhook and materialize a **manifest-declared managed agent** with `ctx.agents.managed.reconcile(agentKey, companyId)`.

The installed SDK and host implementation explicitly constrain this API to manifest-declared managed agents. `reconcile()` resolves an existing same-company binding, relinks a recoverable same-company managed marker, or creates the missing managed agent. Repeating the same reconcile therefore does not create another managed agent for the same plugin/company/agentKey tuple.

## Decision

For the first customer-hireable **catalog employee** path, the Paperclip side of the Wandora Organization Adapter will use a Wandora-owned **headless multi-company plugin**, not a normal Board API key and not direct `agent-hires`.

The V1 provider call chain is:

```text
Wandora Organization Adapter
  -> private Paperclip plugin webhook
  -> company-scoped plugin config
  -> company-scoped `secret_ref` resolution
  -> timestamp + HMAC verification
  -> Paperclip host company-scope authorization
  -> `agents.managed.reconcile(stableAgentKey, companyId)`
  -> stable Paperclip managed agent
```

The plugin's minimum proven capabilities are:

- `webhooks.receive`;
- `secrets.read-ref`;
- `agents.managed`.

Plugin installation and company configuration are operator/provisioning operations. Customer browsers never install/configure the plugin and never receive a Paperclip credential.

## Catalog boundary

V1 covers only employees declared in the plugin manifest under stable `agentKey` values, for example a future production catalog key for Ana.

This is a deliberate product boundary, not an implementation accident:

- a catalog employee may be reconciled into any Paperclip company for which the plugin is explicitly configured;
- the same stable key is reused for that employee definition across companies;
- arbitrary/custom agent definitions are **out of V1**;
- no fallback to direct `agent-hires` is allowed merely because a requested employee is not declared;
- custom/dynamic employee creation requires a newer ADR and a separate authorization/idempotency proof.

## Tenant isolation model

Isolation is intentionally layered.

1. The private request is authenticated with a per-company HMAC secret referenced from Paperclip config via `secret_ref`.
2. Paperclip validates at config-write time that a referenced secret belongs to the selected company.
3. Runtime secret resolution requires the explicit company plus the plugin/config binding.
4. The Paperclip plugin host independently limits proactive company-scoped calls to companies for which that plugin is configured.
5. `agents.managed.reconcile()` itself receives the target company and remains host-gated.

Disposable proof established both a cross-company secret-reference rejection and host denial when the same plugin tried `agents.managed.reconcile()` for an unconfigured company. These are independent boundaries.

The exact variant “a valid HMAC generated from Company A's final secret sent with a Company B target” has **not yet been claimed as executed**. It remains a final contract verifier before live activation even though the two underlying host boundaries are already proven separately.

## Idempotency and ADR 0038

This ADR narrows the provider operation chosen for the V1 catalog path and therefore clarifies ADR 0038.

ADR 0038's private schema remains accepted:

- organization -> provider company binding remains required;
- digital employee -> provider agent binding remains required;
- the operation journal remains Wandora's idempotency-key/request-hash/conflict/recovery/audit boundary.

However, for this V1 path the journal is **not compensating for provider duplicate hire behavior**. Paperclip `managed.reconcile` is itself stable for a declared plugin/company/agentKey. The journal still protects Wandora semantics across retries, changed requests, local/provider partial success, network ambiguity and durable mapping.

The existing migration `20260916_010_organization_adapter_state_v1.sql` does not need to be applied or changed merely to accept this decision. Its `planned`, `creating`, `completed` and `uncertain` states remain useful for the adapter transaction boundary.

## Board API key decision

A broad ordinary Board API key is not the V1 tenant runtime identity. Board API keys inherit their owner's memberships/permissions and would couple the normal adapter to a human/service user's broader Paperclip authority.

The plugin host instead supplies capability gating and explicit configured-company scope. This is the selected least-privilege Paperclip technical-identity mechanism for V1.

## Proven laboratory evidence

The disposable proof used:

- Paperclip image `wandora/paperclip:v2026.831.1`;
- installed Paperclip source commit `65ec059bde30d98c92165b24a30a540800dd1f6f`;
- a headless secret-ref proof plugin declaring one paused, zero-budget managed Ana proof agent;
- a separate no-secret scope proof plugin to isolate Paperclip host company-scope enforcement.

Observed outcomes included:

- omitting `secrets.read-ref` caused the host to reject runtime secret resolution;
- adding the capability allowed explicit company-scoped secret resolution;
- first valid reconcile created the managed Ana proof agent;
- identical replay resolved the same agent ID without duplication;
- saving one company's config with another company's secret reference was rejected;
- a plugin configured only for one disposable company could reconcile there;
- the same plugin call targeting an unconfigured disposable company was denied by the Paperclip host.

Exact hashes and sanitized proof details are recorded in `docs/infra/paperclip-organization-adapter-managed-plugin-proof-v1-20260916.md`.

## Not approved by this ADR

This ADR does **not** authorize:

- applying migration 010 to the live Wandora database;
- granting `wandora_core_runtime` access to the new private tables;
- installing this proof plugin into live Paperclip;
- creating live per-company HMAC secrets/config;
- exposing a customer `Contratar` / `Ativar funcionário` action;
- changing current outbound-effect switches;
- creating arbitrary/custom Paperclip agents;
- exposing Paperclip IDs or credentials through customer APIs.

## Remaining activation gates

The next slice must prove the **Wandora Organization Adapter Service Contract V1** without production effects:

1. exact customer authorization policy for hire/activate;
2. minimum Core service/API boundary and minimum DB grants around ADR 0038 state;
3. same idempotency key + same canonical request returns/reconciles the same Wandora employee and provider binding;
4. same key + changed request fails with an idempotency conflict;
5. provider reconcile replay resolves the same managed agent;
6. network ambiguity and local-only/provider-only partial-success repair behavior;
7. customer contracts never expose raw provider IDs, plugin config, secret refs or credentials;
8. literal valid Company A HMAC -> Company B target denial with the final signed-request harness;
9. only after those gates, a separate operational review may consider migration 010 live application, production plugin/config/secrets and customer hiring UX.