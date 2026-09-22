# ADR 0182 — Customer Company Grounding Create Browser Idempotency V1

Status: **ACCEPTED CANDIDATE / CODE ONLY / NO PRODUCTION EFFECT**
Date: 2026-09-22

## Context

ADR 0179 froze the first real MEDICSPRO grounding payloads before any production mutation.

The customer `/company` create flow previously generated a fresh idempotency key on every submit attempt. If a create response became ambiguous and the owner retried, the browser could send the same business payload with a new key.

That behavior is weaker than the already-proven customer work and customer hire browser contracts, which preserve a request identity across ambiguous retries.

No grounding row has yet been created, so the contract can be corrected before the first real effect.

## Reuse Gate

Reuse the existing Wandora customer-browser idempotency pattern rather than inventing a new operation subsystem:

- browser generates a UUID;
- browser persists UUID + exact request fingerprint in `sessionStorage`;
- same payload after ambiguity reuses the same UUID;
- different payload while a request is unresolved fails closed;
- deterministic rejection or successful confirmed creation clears the stored operation.

No new database state, journal, migration, service or provider capability is introduced.

## Decision

For grounding **create** only:

1. canonicalize the exact request from organization, entry type, content, provenance type, sourceRef and sourceLabel;
2. persist `idempotencyKey + requestFingerprint` under an organization-scoped sessionStorage key;
3. reuse the operation when the exact same request is retried;
4. reject a changed request while an unresolved operation remains;
5. preserve the operation on:
   - network failure;
   - incomplete success confirmation;
   - HTTP 409;
   - HTTP 503;
   - other inconclusive responses;
6. clear the operation on:
   - confirmed successful create;
   - HTTP 400/403/404 deterministic rejection.

Retire/correct behavior is unchanged by this slice.

## ADR 0179 correction

ADR 0179 listed human-readable planned keys such as `medicspro-grounding-20260922-f1`.

Those values are **superseded before any production grounding effect**.

The executable customer-browser contract uses cryptographically generated UUID v4 keys retained by request fingerprint, consistent with existing customer work/hire browser safety.

The semantic payload set remains unchanged:

- F1/F2/F3 = `fact`;
- R1 = `rule`;
- provenance = `owner_statement`;
- requested sourceRef remains `wandora:customer-work-operation:9a4bc45c-cb6e-410d-8e46-3d7b84fc85ab`.

## Second adversarial review

Rejected:

- new random key on every retry;
- fixed global/customer-visible idempotency keys;
- server-side duplicate journal solely for browser retry safety;
- direct SQL or operator mutation to avoid browser state;
- changing grounding semantics or provider authority.

Accepted:

- reuse the proven sessionStorage + fingerprint model.

## Validation

Production-shaped local Web Docker build is GREEN:

- TypeScript typecheck;
- existing invite/recovery/hire/work verifiers;
- company grounding surface verifier;
- grounding API bridge verifier;
- Vite production build.

The grounding verifier additionally proves:

- create resolves a persisted grounding operation;
- request uses the retained operation idempotency key;
- success/rejection cleanup exists;
- create no longer uses a fresh `mutationKey('create')` per submit.

## Production boundary

Code only. No Web promotion, grounding mutation, model call, customer work, provider effect or outbound message occurs in this ADR.

A separate exact-artifact Web promotion must occur before the first real MEDICSPRO grounding create.
