# ADR 0056 — Paperclip Provider Company Bootstrap V1

- Status: **Accepted — bounded live provider-company bootstrap completed**
- Date: 2026-09-17
- Scope: create exactly one internal Paperclip provider company for the Organization Adapter canary, without installing/configuring the plugin, creating HMAC custody, applying migrations 010/011, activating Core, or enabling outbound effects

## REAL NOW

Canonical base before this slice:

```text
main = e42f29967892c626c1ca790ee41ec0ceabc251ed
Paperclip image = wandora/paperclip:v2026.831.1
Paperclip health = healthy
bootstrapStatus = ready
```

The legitimate first instance-admin had already been explicitly claimed through the protected operator console.

The selected canonical Wandora canary organization is:

```text
organization_id = 3ddc8ca6-8961-4ad3-99e0-d7f869249a61
display_name    = Wandora Internal Supervised Proof
```

## DECISION

Create exactly one Paperclip company with the same display name:

```text
Wandora Internal Supervised Proof
```

Do not create `Empresa Exemplo` in this slice.

The company was created through Paperclip's authenticated instance-admin `POST /api/companies` path, not by direct database mutation. The pinned Paperclip route proves that successful creation also establishes the creating user as active `owner` and records `company.created`.

## EXECUTED RESULT

Observed provider company:

```text
provider        = paperclip
providerCompanyRef = 815d499e-4231-4e6b-b7fc-67f0ba22a595
name            = Wandora Internal Supervised Proof
status          = active
```

Direct read-only validation against the live embedded Paperclip PostgreSQL proved:

```text
matching company count = 1
owner/active membership = 1
company.created events  = 1
agent count              = 0
total Paperclip companies = 1
```

No team lead/agent was created because onboarding was stopped immediately after company creation.

## PROVEN EFFECT BOUNDARY

Post-bootstrap verification:

```text
Paperclip plugin registry entries = 0
wandora.organization-adapter-v1  = absent
migrations 010/011 tables        = absent
production paperclip-*.hmac      = absent
Organization Adapter Core        = OFF
Human Send                       = OFF
Gateway outbound                 = OFF
```

The company creation is therefore the only new provider-domain effect of this slice.

## FROZEN PROVIDER TARGET

For the internal Wandora canary:

```text
Wandora organization
3ddc8ca6-8961-4ad3-99e0-d7f869249a61

        ↕ future private binding

Paperclip provider company
815d499e-4231-4e6b-b7fc-67f0ba22a595
```

This is a private operator/provider mapping. It must not appear in customer contracts.

The deterministic Core custody filename derived from the frozen provider reference is:

```text
provider ref sha256 =
e3927793bfea0c30851b6e59ed2d1844323c9b2aa852db2f8011dc393449f158

paperclip-e3927793bfea0c30851b6e59ed2d1844323c9b2aa852db2f8011dc393449f158.hmac
```

No file or HMAC material was created by this slice.

## SECOND ADVERSARIAL REVIEW

Rejected:

- creating a generic provider-only company named `Wandora`;
- creating `Empresa Exemplo` first;
- creating both provider companies together;
- continuing onboarding into team-lead/agent creation;
- using direct SQL to create the provider company;
- installing/configuring the Organization Adapter plugin together with company bootstrap;
- creating HMAC material before the provider target was frozen;
- applying migrations 010/011 merely because provider administration is now ready.

## NEXT BOUNDARY

The provider target is now legitimate and frozen for the internal canary.

The next step is not customer onboarding. It is completion of **Organization Adapter Production Activation Preflight V2**, with zero additional activation effects. A separate execution decision is required before migrations, binding insertion, plugin install/config, HMAC generation, Core activation, or any canary reconcile.
