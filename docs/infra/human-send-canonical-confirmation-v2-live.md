# Human Send Canonical Confirmation V2 — Live Evidence

Date: 2026-09-16

## Scope

This record captures the production state after ADR 0027, Core PR #58 and Web PR #59 were merged and promoted.

Canonical repository head used for the promotion:

```text
a1ee475570c9314198068537003918a6022d8490
```

The promotion intentionally did **not** enable customer outbound capability. Human Send and Messaging Gateway outbound remain disabled by absence of their runtime enable flags.

## Live images after promotion

```text
Core:    wandora/core:canonical-confirm-a1ee4755
Web:     wandora/web:canonical-confirm-a1ee4755
Gateway: wandora/messaging-gateway:origin-fix-94cfb4de
```

Observed health after recreate:

```text
Core health:   healthy
Core /healthz: 200
Core /readyz:  200
Web health:    healthy
Gateway health: healthy
```

Core startup explicitly reported:

```text
mode=database
gatewayIngress=true
humanApi=true
humanSendProposal=false
agentRuntime=mastra-deterministic
```

## Reviewed public boundary proof

After the Core/Web promotion:

```text
GET /                                      = 200
GET /login                                 = 200
GET /healthz                               = 200
GET /api/v1/me without Bearer              = 401
GET /api/v1/session                        = 404
GET /internal/v1/gateway/inbound            = 404
GET reviewed Trabalho route without Bearer = 401
GET nearby unreviewed work route            = 404
```

With Human Send disabled, the exact supervised-send POST on Core remains unavailable (`404`). Generic/unreviewed `/api/` and all Web `/internal/` paths remain closed.

The live Web bundle contains the V2 markers for:

- `confirmationVersion`;
- stale-confirmation UX;
- post-send success feedback.

## Canonical confirmation contract now deployed

When Human Send is explicitly enabled in a future controlled activation, `state=ready` carries a Core-derived confirmation snapshot:

```text
recipientMasked
text
version = sha256:<64 hex>
```

Web freezes the reviewed snapshot, including its work/proposal selectors, when the human opens the confirmation dialog. The final POST can send only the `confirmationVersion`; recipient, text, provider, connection and idempotency key remain Core-derived.

At send time Core reloads canonical state and compares the fingerprint before any durable outbound attempt. Invalid confirmation bodies fail closed; a valid but outdated version fails as `confirmation-stale` before Gateway/provider effect.

## Prior real outbound proof retained

Before ADR 0027, the controlled internal proof established one successful human-supervised WhatsApp delivery to an explicitly authorized handset. The delivered V2 proof text was observed on the handset, and Core persisted one canonical outbound message.

Historical delivery evidence remains intentionally immutable. At the time of this V2 deployment validation the live database showed:

```text
outbound_attempts total = 3
uncertain              = 2
succeeded              = 1
canonical outbound messages = 1
```

The two `uncertain` attempts predate the Confirmation V2 candidate/promotion work and were not retried. No new outbound attempt or outbound message was created by the V2 candidate or deployment validation.

## Safety switches after promotion

Observed production runtime state:

```text
WANDORA_HUMAN_SEND_PROPOSAL_ENABLED = absent
WANDORA_GATEWAY_OUTBOUND_ENABLED    = absent
```

The versioned activation overlays remain available for a later separately reviewed controlled proof, but they are not part of the currently running Core/Gateway compose configuration.

Empresa Exemplo remains non-sending; the controlled provider-bound proof state remains separate from the demo tenant.

## Rollback evidence

Pre-promotion operator snapshot:

```text
/home/wandora-admin/backups/canonical-confirm-v2-20260916T061650Z
```

Previous live images recorded there:

```text
Core: wandora/core:human-send-capable-72b1c49a
Web:  wandora/web:send-confirmation-49a21303
```

Gateway was not changed by this promotion.

## Validation method

The promotion followed:

**decision → second adversarial review → execution → validation**

The adversarial review explicitly attempted to invalidate promotion by checking for hidden source drift, missing candidate containers, accidental outbound effects, DNS alias collision, compose-overlay drift and rollback weakness. Promotion proceeded only after those checks were reconciled.
