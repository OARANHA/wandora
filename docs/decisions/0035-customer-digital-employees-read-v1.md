# ADR 0035 — Customer Digital Employees Read V1

Date: 2026-09-16
Status: **Accepted.**

## State-first audit

The customer Web already has real Human Session, explicit organization selection, `Trabalho`, `Conversas` and supervised send contracts. Those remain preserved.

The existing `Equipe` screen is visually implemented but currently uses hard-coded employees and hard-coded progress/status copy. The canonical database already contains `wandora.digital_employees`, and `wandora_core_runtime` already has tenant-scoped SELECT access enforced by RLS.

The current canonical employee fields are:

- `id`;
- `organization_id`;
- `display_name`;
- `role`;
- `status`;
- `autonomy_mode`;
- timestamps.

There is no canonical percentage for "integração à empresa", no canonical free-form employee summary, and no customer hiring/catalog contract yet.

## Decision

Convert the existing `Equipe` surface from placeholder data to canonical read-only digital-employee data without inventing fields.

Add one exact customer route:

```text
GET /api/v1/organizations/:organizationId/digital-employees
```

The route returns only Wandora-owned fields:

```text
{
  "items": [
    {
      "id": "uuid",
      "name": "Ana",
      "role": "commercial-assistant",
      "status": "active",
      "autonomy": "supervised"
    }
  ]
}
```

## Authorization and isolation

- Supabase Auth Bearer verification remains the existing ES256/JWKS contract.
- The requested organization is a selector, never authorization evidence.
- The authenticated canonical user must have an active membership in an active organization.
- The employee query runs in a `REPEATABLE READ READ ONLY` transaction with transaction-local `wandora.organization_id`.
- Existing RLS independently restricts `wandora.digital_employees` to the selected tenant.
- Cross-tenant reads fail closed.
- No direct browser database access is introduced.

## Web boundary

The Web Nginx bridge exposes only the exact UUID route above and continues to strip cookies before Core.

`Equipe` must stop rendering invented employees and invented learning percentages. It renders only the canonical response and explicit loading/error/empty states.

Until a hiring/catalog contract exists, the page must not present an active control that appears able to hire an employee. Hiring is a separate mutation slice.

## Non-goals

- hiring/contracting a digital employee;
- employee catalog;
- editing role, autonomy or status;
- employee profile/detail route;
- human team/member management;
- learning percentage or knowledge scoring;
- Platform Admin;
- provider/runtime identifiers.

## Validation

CI must prove:

1. exact GET route only;
2. malformed organization IDs fail closed;
3. POST/mutation is not accepted;
4. active tenant member sees only that tenant's employees;
5. cross-tenant and inactive access fail closed;
6. transaction-local tenant scope is reset after reads;
7. Web forwards Bearer, strips Cookie and keeps generic `/api/` closed;
8. Web build/typecheck remains green;
9. existing `Trabalho`, `Conversas`, session and send routes remain unchanged.
