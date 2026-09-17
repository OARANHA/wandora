# ADR 0046 — Provider-Neutral Operator Console Hostnames V1

- Status: Accepted
- Date: 2026-09-17
- Scope: naming policy for protected operator/admin web surfaces; this ADR does not create DNS records or expose a service

## Context

Wandora's accepted architecture keeps customers on Wandora-owned product surfaces while Paperclip UI, Mastra Studio, Evolution Manager, Supabase Studio and Portainer remain protected engineering/operator surfaces.

A prior project discussion explicitly proposed `admin.wandora.com.br` for the first-party **Wandora Platform Admin** cockpit. The exact earlier conversation does not provide a recovered provider-neutral hostname pair for Paperclip and Mastra; therefore this ADR does not pretend that `control` or `runtime` were previously chosen names.

Using provider names such as `paperclip.wandora.com.br` or `mastra.wandora.com.br` would turn replaceable implementation choices into DNS contracts and contradict the provider-neutral boundary.

## Decision

Reserve the following provider-neutral operator naming:

```text
admin.wandora.com.br    -> Wandora Platform Admin (first-party operator cockpit)
control.wandora.com.br  -> protected organization/control-plane native console bridge
runtime.wandora.com.br  -> protected agent-runtime/studio native console bridge
```

`control` maps semantically to the control-plane capability currently supplied by Paperclip. `runtime` maps semantically to the agent-runtime capability currently supplied by Mastra. The hostnames survive provider replacement.

These names are operator/engineering surfaces only. They are not customer product navigation and do not grant direct exposure of provider containers.

## Current runtime consequence

- `admin.wandora.com.br` is the intended first-party operator surface.
- `control.wandora.com.br` may be activated later through a protected ingress/bridge to the Paperclip operator UI.
- `runtime.wandora.com.br` is reserved but must **not** be activated merely for symmetry: the current accepted Mastra runtime is embedded behind Wandora Core and there is no separately validated live Mastra Studio service to expose.

DNS/ingress activation requires its own live preflight and Cloudflare Access policy proof.

## Security boundary

Any native-console hostname must:

1. be operator-only;
2. be protected by Cloudflare Access or an equivalently strong authenticated edge before exposure;
3. never publish the underlying Docker service directly to the Internet;
4. preserve the provider container on private/internal networks where practical;
5. avoid provider credentials in browser-visible configuration;
6. remain optional for engineering/diagnostics rather than becoming a required daily customer workflow;
7. not replace Wandora Platform Admin contracts.

## Adversarial review

### `paperclip.wandora.com.br` / `mastra.wandora.com.br`

Rejected. They leak replaceable implementation choices into stable public DNS names.

### One generic `ops.wandora.com.br` for all consoles

Rejected for V1. A generic proxy hub creates routing/auth complexity and makes per-surface access policy/audit less explicit. Wandora Platform Admin already owns the normal consolidated operator workflow at `admin`.

### Expose both `control` and `runtime` immediately

Rejected. A convenient hostname is not evidence that a native console is live or should be promoted to the edge. `runtime` remains reserved until a separately validated Mastra Studio/operator service exists.

## Non-goals

This ADR does not:

- create Cloudflare DNS records;
- alter Traefik;
- attach Paperclip or Mastra directly to `wandora-edge`;
- activate a Mastra Studio container;
- change customer URLs;
- make native consoles substitutes for Platform Admin.
