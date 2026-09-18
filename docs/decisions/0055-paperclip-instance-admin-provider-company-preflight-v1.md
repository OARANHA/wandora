# ADR 0055 — Paperclip Instance Admin + Provider Company Preflight V1

- Status: **Accepted preflight checkpoint — provider company creation NOT executed**
- Date: 2026-09-17
- Scope: close the Paperclip administrative prerequisite and select the first provider-company canary without creating provider state beyond the already-explicit instance-admin bootstrap

## REAL NOW

Canonical Git:

```text
main = b45276cb96a06853c710c879a183274b0070e6cd
PR #99 = merged
```

Live Paperclip:

```text
image               = wandora/paperclip:v2026.831.1
deployment mode     = authenticated
deployment exposure = private
public URL          = https://control.wandora.com.br
health              = healthy
bootstrapStatus     = ready
```

Cloudflare Access remains in front of `control.wandora.com.br` and direct public-origin access remains blocked.

The explicit operator bootstrap created the first legitimate Paperclip instance admin. This clears ADR 0052's instance-admin blocker. No Paperclip organization/company was created during this preflight checkpoint.

Canonical Wandora organizations currently include:

```text
Wandora Internal Supervised Proof
Empresa Exemplo
```

Both have existing Wandora-owned employee and messaging projections. The internal organization is explicitly the supervised-proof tenant.

## PROVEN EVIDENCE

ADR 0039 requires a one-to-one private binding from a Wandora organization to a Paperclip provider company and company-scoped plugin config/HMAC custody.

ADR 0040 requires a controlled live canary with no customer exposure before any customer hire/activate surface.

Therefore the first Paperclip provider company must correspond to an existing canonical Wandora organization; a generic provider-only company named merely `Wandora` would create drift and no canonical binding target.

## DECISION

The first Paperclip provider company selected for the activation canary is:

```text
Wandora Internal Supervised Proof
```

It maps conceptually to the existing canonical Wandora organization of the same display name and is the only acceptable first canary because it preserves the no-customer-exposure requirement.

`Empresa Exemplo` is deliberately NOT the first provider-company target. It remains unbound during the initial live canary.

## SECOND ADVERSARIAL REVIEW

Rejected:

- creating a generic Paperclip company named `Wandora`, because it has no canonical Wandora organization counterpart;
- using `Empresa Exemplo` first, because that would skip the internal canary boundary;
- creating both provider companies at once, because it widens the production mutation surface before the first canary is proven;
- installing/configuring the Organization Adapter plugin as part of company creation;
- generating HMAC material before the exact provider company exists and its reference is frozen;
- applying migrations 010/011 merely because instance-admin authority is now available;
- treating instance-admin bootstrap as Organization Adapter activation.

## EFFECT AUDIT

At this checkpoint:

```text
Paperclip instance admin = READY
Paperclip provider companies created by this slice = 0
Organization Adapter plugin installs = 0
Organization Adapter plugin configurations = 0
production HMACs generated = 0
migrations 010/011 applied = 0
Organization Adapter Core activation = OFF
Human Send = OFF
Gateway outbound = OFF
customer hire/activate route = absent
```

## NEXT EXECUTION GATE

The next slice is **Paperclip Provider Company Bootstrap V1** and is a real production mutation.

It may create exactly one Paperclip organization/company named:

```text
Wandora Internal Supervised Proof
```

After creation, stop and re-verify the provider company identity, membership/admin scope, live effect switches and Organization Adapter prerequisites. Do not create `Empresa Exemplo`, install/configure the plugin, generate HMAC, apply migrations 010/011 or activate Core in the same step.

Provider-company creation is outside this preflight and requires explicit execution authorization because it creates live provider state.
