# ADR 0198 — Customer Company Profile + First Access Onboarding V1

Status: **IMPLEMENTED IN CODE / NO PRODUCTION EFFECT**
Date: 2026-09-23

## Context

ADR 0197 closed the real organization-grounding source-file owner-session smoke test. The next product gap is earlier in the customer journey.

A paying customer may initially exist only as an invited e-mail identity. Before this ADR, an authenticated identity with no Wandora organization reached the `unlinked` state and depended on operator intervention.

The existing `wandora.organizations` contract persists stable tenant identity, display name and status, but not PF/PJ classification, CPF/CNPJ, responsible person, address or contact profile.

`docs/product/FIRST_DAY_CUSTOMER_JOURNEY_V1.md` previously froze a first-company step that required only company name and optional site. This ADR supersedes **that first-company-bootstrap constraint only**. The current `/start` remains the separately reviewed digital-employee hiring surface.

## REAL NOW

```text
main = 363ebc5d50c0f505d90a941625f511d44a63e952
PR #256 = MERGED
open PRs = 0
```

Live production remains unchanged: migration 019/profile table/onboarding functions are absent and `WANDORA_CUSTOMER_COMPANY_ONBOARDING_ENABLED` is absent.
## Capability Authority / Reuse Gate

This capability is Wandora-owned. Wandora owns customer organization identity, first owner membership semantics, the customer-facing company profile and authorization for that profile.

Minimum durable profile state is PF/PJ, normalized CPF/CNPJ, legal/display name, responsible person, contact e-mail/phone, Brazilian address, optional site/segment, timezone and timestamps.

This is structured product identity/profile state, not organization grounding, CRM state, Paperclip state or runtime memory.

Provider split:

- Supabase Auth: human identity/session.
- Supabase PostgreSQL: storage infrastructure.
- BrasilAPI: optional lookup/enrichment provider behind a Wandora-owned adapter.
- Paperclip: digital-employee/control-plane implementation; not invoked here.
- Mastra: runtime/workflow execution; not invoked here.
- Messaging providers: not invoked here.

ADR 0168 remains binding: portability is contract decoupling, not implementation duplication.

## First-access contract

```text
verified Supabase session
→ local profile validation
→ Core onboarding contract
→ Wandora user identity + organization + owner membership + organization profile
→ normal /api/v1/me bootstrap
```

The operation creates no employee, Paperclip company, hire eligibility, Mastra run, connection, tool, work or outbound message.
## Account e-mail binding

The first profile `contactEmail` must equal the verified Supabase session e-mail. Web pre-fills it and makes it read-only during first setup.

## Local CPF / CNPJ / CEP validation

CPF validation is deterministic and local: accepted standard separators are normalized, repeated-digit values are rejected and both check digits are verified.

CNPJ validation is deterministic and local and supports both legacy numeric and Receita Federal alphanumeric formats:

```text
12 base positions = 0-9 / A-Z
2 final positions = numeric check digits
character value = ASCII code - 48
modulus = 11
first weights  = 5 4 3 2 9 8 7 6 5 4 3 2
second weights = 6 5 4 3 2 9 8 7 6 5 4 3 2
remainder 0/1 => DV 0; otherwise DV = 11 - remainder
```

Test vectors include `12.ABC.345/01DE-35`, `00.000.000/E08G-12` and legacy `11.222.333/0001-81`.

CEP accepts normal numeric/hyphen/space formatting and stores exactly eight digits. Unexpected identifier characters are rejected rather than silently stripped.
## BrasilAPI boundary

BrasilAPI is **not validation authority**. It is fail-soft enrichment only.

Current adapter targets:

```text
GET https://brasilapi.com.br/api/cep/v2/:cep
GET https://brasilapi.com.br/api/cnpj/v1/:cnpj
```

It uses verified human authorization, a 3-second timeout, explicit Wandora User-Agent and provider-neutral output.

`404` becomes `found=false`; network/rate-limit/non-success/invalid-response becomes `provider-unavailable`.

Therefore:

```text
provider lookup failure ≠ invalid CPF/CNPJ/CEP
```

A locally valid profile can be completed manually when lookup is unavailable or does not know the identifier. Provider-returned values are suggestions until the owner submits the profile.

## Security / privacy

Browser roles have no direct profile-table mutation grant. Full profile data is behind owner/admin Core authorization. The normal Empresa summary masks the tax ID, showing only its final four characters.

## Feature flag

`WANDORA_CUSTOMER_COMPANY_ONBOARDING_ENABLED` is OFF by default, cannot run in standby, and requires the Human API trust boundary. Production currently has no such flag.
## Migration 019 and verification

Canonical files:

```text
infra/stacks/supabase/migrations/20260923_019_customer_company_profile_onboarding_v1.sql
infra/stacks/supabase/verifiers/VERIFY_20260923_CUSTOMER_COMPANY_PROFILE_ONBOARDING_V1.sql
```

Migration 019 is **not live**.

A read-only production-derived `pg_dump -Fc` was restored into disposable `supabase/postgres:17.6.1.136` and migration 019 + verifier passed:

```text
CUSTOMER_COMPANY_PROFILE_ONBOARDING_V1_OK
PROFILE_019_FINAL_RESTORE_VERIFY_OK
```

Discarded laboratory attempts were reconciled before success: one repeated the known missing `docker exec -i` stdin mistake; another exposed unsupported `min(uuid)`; another exposed an ambiguous PL/pgSQL `organization_id`. All were corrected without production effect.

The final verifier proves owner membership, no digital employee creation, alphanumeric CNPJ persistence, identical-retry reconciliation, changed-retry fail-closed behavior and owner profile update.

## Local gates

Core typecheck/build are GREEN. Focused tests are 12/12 GREEN. Web production build is GREEN, all existing Web gates remain GREEN, and `WANDORA_WEB_COMPANY_PROFILE_ONBOARDING_V1_OK` is GREEN.
## Second adversarial review

The implementation explicitly rejects:

1. storing legal profile as grounding;
2. turning Wandora into a CRM;
3. creating Paperclip/Mastra/provider state during generic company onboarding;
4. hiring Ana automatically;
5. making BrasilAPI determine identifier validity;
6. blocking a valid profile because lookup is unavailable;
7. rejecting CNPJ alphanumeric;
8. silently deleting arbitrary invalid identifier characters;
9. exposing full CPF/CNPJ to ordinary members;
10. allowing first access to substitute a different account e-mail;
11. direct browser DB writes;
12. enabling production merely because code exists.

## Production boundary

```text
migration 019 = NOT LIVE
wandora.organization_profiles = ABSENT live
onboarding DB functions = ABSENT live
WANDORA_CUSTOMER_COMPANY_ONBOARDING_ENABLED = ABSENT live
```

No Core/Web image was promoted; MEDICSPRO, Paperclip, Mastra, messaging and outbound were unchanged.

## Decision

**Customer Company Profile + First Access Onboarding V1 is IMPLEMENTED IN CODE and locally GREEN.**

Next safe slice: **Customer Company Profile + First Access Onboarding Production Promotion Preflight V1**. It must qualify migration 019, exact Core/Web artifacts, feature-flag activation order, rollback and an invite-only first-access smoke plan before production mutation.