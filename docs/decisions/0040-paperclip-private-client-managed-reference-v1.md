# ADR 0040 — Paperclip Private Client + Managed Reference V1

Date: 2026-09-17
Status: **Accepted implementation direction for the private provider client. NOT live; customer hiring/runtime activation remains unapproved.**

## Context

ADR 0039 selected a Wandora-owned headless Paperclip managed plugin as the V1 catalog-employee control-plane mechanism. PR #81 then merged the provider-neutral `OrganizationAdapterService` with tenant authorization, durable operation journaling, frozen `provider_company_ref`, idempotency/conflict handling and conservative partial-success behavior.

The next review found one concrete mismatch between that provider-neutral contract and the real Paperclip webhook surface: `agents.managed.reconcile()` returns the managed agent internally to the worker, but Paperclip's inbound webhook route deliberately returns only webhook-delivery status. The worker's `onWebhook` return value is not surfaced as an HTTP response containing the managed agent UUID.

Paperclip plugin action/data bridge routes can return worker results, but they require Paperclip-authenticated actor context. Using them only to recover the native agent UUID would reintroduce a second, broader technical identity into the normal Wandora tenant runtime, contrary to ADR 0039.

## Decision

Wandora will use a dedicated signed Paperclip Organization Adapter provider client behind the existing provider-neutral service contract.

The request contract is:

```text
Wandora Core
  -> resolve company HMAC material by the operation's frozen providerCompanyRef
  -> POST exact JSON { companyId, catalogKey }
  -> x-wandora-timestamp in Unix seconds
  -> HMAC-SHA256(timestamp + "." + exact raw body)
  -> Paperclip managed plugin
  -> company-scoped secret_ref resolution
  -> exact HMAC verification
  -> agents.managed.reconcile(catalogKey, companyId)
```

The Core client does not accept HMAC material from customer input and does not select a secret independently of `providerCompanyRef`. A production secret resolver is intentionally not chosen or wired by this ADR; activation remains blocked until that custody decision is separately reviewed.

## Meaning of `provider_agent_ref`

For the Paperclip managed-catalog path, Wandora's private `provider_agent_ref` is an **opaque stable reference to the provider-managed agent resource**. It is not required to equal Paperclip's native agent table UUID.

The stable provider identity for managed agents is already the tuple:

```text
plugin key + company + manifest-declared agent key
```

The Core client therefore derives a compact opaque reference from:

```text
wandora.organization-adapter-v1
+ frozen provider company reference
+ catalog key
```

using SHA-256, and only returns that reference after Paperclip reports HTTP 200 with a valid webhook-delivery success payload.

This interpretation does not require a schema migration. The column is private, never a customer contract, and still serves its purpose: stable provider mapping, duplicate prevention, reconciliation evidence and provider replaceability.

Paperclip remains authoritative for its internal native agent UUID and lifecycle. Wandora does not need that UUID to invoke the selected `managed.reconcile()` path.

## Failure semantics

Transport failures, non-200 responses, malformed success payloads and invalid success correlation are treated as uncertain provider outcomes. The existing Organization Adapter service therefore keeps the operation in its conservative `uncertain` recovery path and never creates a visible Wandora employee from an ambiguous provider result.

The client validates its own webhook URL/request shape before network I/O. The production secret resolver remains an activation dependency rather than a raw secret field added to Wandora tables.

## Literal combined tenant-boundary proof

The previously outstanding variant has now been executed against a disposable Paperclip instance using the final request contract (`catalogKey=ana-commercial-v1`, Unix-second timestamp and exact raw-body HMAC).

Observed sequence:

```text
A secret -> A target       -> HTTP 200, one managed Ana
same A request replay      -> HTTP 200, still one managed Ana
A secret -> B target       -> HTTP 502 invalid_wandora_signature
B managed Ana after denial -> zero
B secret -> B target       -> HTTP 200, one managed Ana
```

This proves that a valid Company A HMAC cannot be replayed while naming Company B, and that the rejected request creates no managed resource in B. It complements the earlier independent Paperclip proofs for cross-company `secret_ref` config rejection and configured-company host scope.

Sanitized executable proof source is preserved under `spikes/paperclip-organization-adapter-private-client-v1/`.

## Second adversarial review

The first implementation thought was to rename `provider_agent_ref` to `provider_resource_ref`. The second review rejected that change as migration churn without a security benefit: the existing private column already denotes a reference to the provider agent and never promised that the value was a native UUID.

The review also rejected using Paperclip plugin-action/Board authentication merely to read back the UUID. That would weaken the least-privilege identity decision to solve a value the selected managed operation does not actually require.

## Not approved by this ADR

This ADR does not authorize:

- applying migrations 010/011 to the live Wandora database;
- installing or configuring the production Paperclip plugin;
- creating production per-company HMAC material;
- choosing or deploying the Wandora-side production secret resolver;
- adding a public/customer employee-hire route;
- activating arbitrary/custom employees;
- falling back to direct `agent-hires`;
- exposing provider refs, plugin config or credentials to customer contracts.

## Remaining activation gates

Before customer-facing `Contratar/Ativar funcionário`, a later operational slice must still:

1. select and prove custody/rotation of the Wandora-side per-company HMAC material without storing raw values in the Organization Adapter tables;
2. install the reviewed plugin artifact into live Paperclip and configure only the intended companies with company-owned `secret_ref` values;
3. apply migrations 010/011 with backup/preflight/post-verification and confirm minimum runtime grants;
4. wire the private provider client into the Core runtime only after those dependencies are ready;
5. execute a controlled live canary with no customer exposure first;
6. only then review the customer hire/activate API and Web UX as a separate product effect.
