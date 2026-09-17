# ADR 0043 — Organization Adapter Core Candidate Wiring V1

- Status: Proposed
- Date: 2026-09-17
- Scope: production-shaped but disabled-by-default Core wiring for the Organization Adapter

## Context

ADR 0042 and PR #87 proved the activation sequence in disposable infrastructure. A live preflight also established a recoverable PostgreSQL snapshot and restore proof before any production mutation. Migrations 010/011 remain absent from production, the live Core has no Organization Adapter wiring, the production Paperclip managed plugin/config and per-company HMACs remain absent, and no customer hiring route exists.

Applying migration 011 before the runtime candidate is ready would widen `wandora_core_runtime` privileges without an executable benefit. The next uncertainty is therefore whether the production Core shape can carry the Organization Adapter safely while remaining unreachable from customer traffic.

## Decision

Add a disabled-by-default Organization Adapter runtime configuration and a separate Compose overlay. When explicitly enabled, Core may construct the existing private `OrganizationAdapterService`, but no HTTP handler, customer route or Platform Admin action is added by this slice.

The candidate configuration is fail-closed:

- only database mode may enable it;
- the webhook URL must be exactly the private Paperclip plugin route at `wandora-paperclip:3100`;
- per-company HMAC files are read only from the existing deterministic file-custody directory mounted read-only into Core;
- the configured secret directory must exist as a directory at startup;
- Core readiness additionally requires `wandora_core_runtime` to be able to read the three private Organization Adapter tables activated by migration 011;
- therefore an overlay enabled before the reviewed DB boundary exists is not ready rather than falsely healthy.

## Candidate topology

```text
Core candidate
  -> Organization Adapter config flag
  -> OrganizationAdapterService
  -> PaperclipOrganizationAdapterProvider
  -> per-company file secret resolver
  -> private Paperclip plugin webhook
```

There is deliberately no route from browser/customer APIs to the service in this ADR.

## Adversarial review

Rejected:

1. applying migrations 010/011 before candidate wiring exists, because that grants idle privileges with no product benefit;
2. accepting arbitrary Paperclip webhook URLs, because provider routing is operator infrastructure, not tenant input;
3. reporting `/readyz=200` merely because the base database connection works, because an enabled Organization Adapter without migration-011 access would be a false-green candidate;
4. bundling `Contratar/Ativar funcionário`, because customer effect activation remains a separate product/security decision.

## Safety and activation gates

This ADR does not authorize production activation. Before a live candidate may enable the overlay, separately verify:

1. migrations 010/011 are applied in the rehearsed order and their verifiers are green;
2. the exact pinned Paperclip plugin/config is installed only for explicitly selected companies;
3. per-company HMAC material is generated and mounted on sender and receiver sides without entering Git/DB/logs;
4. candidate `/readyz` is 200 only after the Organization Adapter DB boundary is available;
5. no customer route invokes the adapter;
6. cross-company HMAC denial and replay/uncertain recovery are re-proven against the candidate boundary;
7. rollback disables the candidate entry path before removing provider/plugin/secret material.

Production migrations, production plugin/config, production HMACs and customer hiring UX remain out of scope.
