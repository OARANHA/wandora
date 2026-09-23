# ADR 0214 — 28PRO VendaERP Stack-Local Adapter Staging V1

Status: **GREEN / NARROWS ADR 0213 HOST PATH / NO PRODUCTION EFFECT**
Date: 2026-09-23

## Context

ADR 0213 proved that the VendaERP MCP adapter must be visible inside the live Paperclip container through a read-only bind mount before any ERP connection state is created.

Its first host-path proposal used:

```text
/opt/wandora/integrations/vendaerp-readonly-mcp
```

The live filesystem reconciliation performed immediately before activation proved:

- `/opt/wandora` is root-owned and not writable by the deployment operator session;
- `/opt/wandora/stacks/paperclip` is owned by `wandora-admin:wandora-ops`, setgid, and writable by the normal deployment operator;
- the Paperclip stack is already operated from that directory;
- Docker access is already intentionally granted to `wandora-admin`.

No privileged production mutation has occurred.

## Decision

Narrow ADR 0213's **host staging path only**.

Use:

```text
host:
/opt/wandora/stacks/paperclip/runtime-integrations/vendaerp-readonly-mcp

container:
/opt/wandora/integrations/vendaerp-readonly-mcp
```

Bind mount:

```text
/opt/wandora/stacks/paperclip/runtime-integrations/vendaerp-readonly-mcp:
  /opt/wandora/integrations/vendaerp-readonly-mcp:ro
```

The container path remains unchanged, so ADR 0212's approved stdio command remains:

```text
node /opt/wandora/integrations/vendaerp-readonly-mcp/server.mjs --tenant voepro
```

## Rationale

The deployment artifact belongs with the Paperclip stack it extends.

This avoids:

- creating a new privileged top-level host directory;
- requiring a sudo bypass or manual root-owned staging step;
- ad-hoc copying into the running container;
- drift between the stack definition and its runtime adapter artifact.

The adapter remains an exact repository-derived artifact, not editable operational state.

## Proven permission boundary

Live host:

```text
/opt/wandora                root:root          not operator-writable
/opt/wandora/stacks         root:wandora-ops   setgid
/opt/wandora/stacks/paperclip wandora-admin:wandora-ops writable
compose overlay             wandora-admin:wandora-ops writable
Docker access               available to wandora-admin
```

This is the normal deployment authority already used by the stack.

## Second adversarial review

Rejected:

- using Docker as a privilege-escalation trick to create the root-owned ADR 0213 host path;
- `docker cp` into the running container;
- storing the adapter in `/home/wandora-admin` and making production depend on a user-home checkout;
- asking for broader sudo/NOPASSWD rights merely to satisfy an arbitrary host path.

Accepted:

- stack-local, operator-owned runtime artifact;
- same read-only container path;
- exact checksum/provenance validation;
- existing Compose deployment authority.

No semantic, secret, grant, tool, runtime or provider authority changes.

## Effect boundary

Documentation only.

No adapter staging, compose change, container recreation, connection, grant, secret, provider call, model run, customer work or outbound effect is performed by this ADR.

## Decision

**GREEN.**

ADR 0213 remains authoritative except that its host staging path is superseded by this stack-local path.

Next step in **28PRO VendaERP Read-Only Connection Activation Execution V1**:

1. stage exact adapter under the stack-local runtime-integrations directory;
2. add the read-only bind mount to the existing Paperclip execution-bridge overlay;
3. validate rendered Compose;
4. recreate Paperclip through the existing two-file Compose project;
5. prove health + exact mount + MCP initialize/tools/list;
6. only then proceed to credential/connection activation.
