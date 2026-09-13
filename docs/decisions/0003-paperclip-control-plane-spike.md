# ADR 0003 — Paperclip as laboratory organization/control-plane adapter

Status: **Accepted for laboratory spike; not frozen as product dependency**

Date: 2026-09-13

## Context

Wandora needs an internal organization/control-plane capability for digital employees without making a third-party schema part of the customer-facing product contract. The repository already identifies Paperclip as the first feasibility spike.

The spike evaluated whether a pinned, private Paperclip instance can run on the Wandora VPS and provide a plausible backend for digital-employee identity, organization structure, work items, budgets, governance and audit primitives.

## Upstream evaluated

- Project: `paperclipai/paperclip`
- License observed during the spike: MIT
- Release pinned for the laboratory stack: `v2026.831.1`
- Commit: `65ec059bde30d98c92165b24a30a540800dd1f6f`
- Build target: upstream production Docker target

No unreviewed `latest` tag is used by the stack.

## Laboratory result

The image built successfully on the Wandora VPS and the container reached a healthy state. `/api/health` reported:

- deployment mode `authenticated`;
- deployment exposure `private`;
- the expected pinned commit;
- embedded PostgreSQL initialized and migrations applied;
- automatic database backup support enabled.

The service is bound to `127.0.0.1:3100` only and attached to the private `wandora-core` Docker network. It is not a public customer surface.

The first health response correctly reports bootstrap as pending. No customer/company data or model-provider credentials were loaded during this infrastructure spike.

## Decision

Paperclip remains the leading organization-engine candidate for the next Wandora spike.

Wandora will access it only through an explicit `Organization Adapter`. Paperclip identifiers, payloads and authorization semantics must not become public Wandora API contracts.

Paperclip does **not** own:

- Wandora tenancy;
- plans or billing;
- canonical customer/contact/financial data;
- Wandora policy or approval semantics;
- customer-facing authentication;
- messaging-provider contracts.

Those remain Wandora-owned responsibilities.

## Security and operations constraints

- Keep Paperclip private by default; no direct Internet ingress.
- Use three independent secrets for Better Auth, agent JWT signing and tool-action approval signing.
- Disable upstream telemetry in the laboratory stack.
- Persist `/paperclip` in a named volume.
- Keep source/version metadata reproducible and versioned in this repository.
- Do not commit real secrets or bootstrap credentials.
- Backups must be observed and restore-tested before Paperclip stores irreplaceable state.

## Open questions for the next spike

1. Can Wandora create/read/update an employee and work item through a stable adapter without leaking Paperclip concepts?
2. Which Paperclip concepts map cleanly to Wandora and which must remain internal-only?
3. What is the failure mode if Paperclip is unavailable while the canonical Wandora Core remains online?
4. Can organization/control-plane events be consumed idempotently by Wandora?
5. Does the embedded database remain sufficient for the lab, or should Paperclip move to an external PostgreSQL instance before meaningful state is introduced?

## Reversibility

This decision is intentionally reversible. The customer-facing model must continue to work if Paperclip is later replaced by another organization engine or by a Wandora-native implementation.
