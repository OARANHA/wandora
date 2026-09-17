# ADR 0041 — Organization Adapter Secret Custody + Runtime Wiring V1

- Status: Accepted
- Date: 2026-09-17
- Scope: non-production Organization Adapter sender-side custody and Core wiring proof

## Context

ADR 0039 selected a company-scoped Paperclip managed plugin and ADR 0040 added the signed private client. The remaining sender-side gap was how Wandora resolves the correct per-company HMAC without storing raw secrets in Wandora PostgreSQL or accepting secret material from customer input.

## Decision

For V1, Wandora reuses its existing mounted-secret-file pattern. The Core-side resolver receives only the frozen `providerCompanyRef` already reserved by the Organization Adapter operation. It hashes that opaque provider reference with SHA-256 and resolves exactly one file inside an operator-mounted absolute secret directory:

```text
paperclip-<sha256(providerCompanyRef)>.hmac
```

Raw provider company references never become filesystem paths. Secret contents never enter Wandora tables, customer payloads, URLs or Git. The default reader opens the file read-only with `O_NOFOLLOW`, trims surrounding whitespace and rejects missing, empty or oversized material.

A disposable runtime factory composes:

```text
OrganizationAdapterService
  -> PaperclipOrganizationAdapterProvider
  -> file-backed per-company secret resolver
  -> signed private Paperclip webhook
```

The factory is intentionally not wired into the live Core entrypoint and exposes no customer route.

## Adversarial review

Rejected:

1. per-company environment-variable secrets, because process environment broadens exposure and becomes operationally poor at tenant scale;
2. filenames built directly from `providerCompanyRef`, because provider-controlled opaque values should not define paths;
3. storing encrypted/raw HMAC material in Wandora PostgreSQL, because no product-domain need justifies adding secret custody to the business database;
4. activating a customer hiring route together with custody, because migrations 010/011, Paperclip plugin/config and runtime activation remain independent effect gates.

## Safety properties

- Company A operations derive only Company A's deterministic secret filename.
- A changed or malicious provider company reference cannot escape the mounted secret directory through path syntax.
- Missing custody fails closed before the provider call.
- Symlinked secret files are rejected by the default reader.
- Ambiguous retries continue to use the operation's frozen `provider_company_ref`; the resolver does not consult a mutable customer selector.
- Provider refs, secrets and plugin configuration remain outside customer contracts.

## Eventual live activation gates

Before any production activation, separately verify:

1. migrations 010/011 preflight and backup/recovery readiness;
2. exact live Paperclip plugin version, manifest/config and configured-company scope;
3. one generated HMAC per activated Paperclip company, mounted on both sides through reviewed secret custody;
4. secret-directory ownership/permissions and deterministic filename mapping without printing secret contents;
5. Core candidate with Organization Adapter still unreachable from customer routes;
6. Company A success/replay, A-signed/B-target denial and Company B success against the live candidate boundary;
7. post-verification that no duplicate employee/provider binding was created and no secret/provider reference leaked to customer APIs/logs;
8. rollback by disabling the Organization Adapter entry path first, then removing candidate runtime/plugin config; never blindly retry an uncertain external effect.

Production migrations, plugin installation/configuration, HMAC generation, Core live wiring and customer `Contratar/Ativar funcionário` remain out of scope for this ADR.
