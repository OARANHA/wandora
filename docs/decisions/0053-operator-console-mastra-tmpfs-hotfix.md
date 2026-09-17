# ADR 0053 — Mastra Operator Console Ephemeral Runtime State Hotfix

- Status: **DRAFT — live-start failure reproduced; corrected candidate under CI**
- Date: 2026-09-17
- Scope: fix only the isolated Mastra operator console startup boundary discovered during the first protected production promotion attempt

## REAL NOW / PROVEN EVIDENCE

After PR #97 merged as `main@02f242af8dca74630c87d3bda85f620992259cbe`, the exact canonical operator-console files were staged on the VPS and verified byte-for-byte against Git blobs. The Mastra image built/typechecked successfully and the live Compose render contained no Organization Adapter, Human Send, Gateway outbound, model-provider or Evolution wiring.

The two operator containers were then started **before** any Traefik router was installed. `wandora-control-bridge` became healthy. `wandora-runtime-console` entered a restart loop with:

```text
ENOENT: no such file or directory, mkdir '/app/.mastra'
```

At failure time:

```text
operator-consoles Traefik router = ABSENT
wandora-control-bridge = healthy
wandora-runtime-console = stopped after diagnosis
Organization Adapter = OFF
migrations 010/011 = not applied
production HMAC = not created
Human Send = OFF
Gateway outbound = OFF
```

Therefore no failed Mastra origin was exposed publicly and no Organization Adapter effect occurred.

## DECISION

Keep the container root filesystem read-only. Add a narrowly scoped ephemeral tmpfs only at:

```text
/app/.mastra:rw,noexec,nosuid,size=16m
```

Do **not** solve the problem by making the root filesystem writable.

Extend Operator Consoles CI so the built Mastra image must actually start under `--read-only`, `--network none`, dropped capabilities, the existing `/tmp` tmpfs, and the new `/app/.mastra` tmpfs, then answer HTTP on container-local port 4111.

## SECOND ADVERSARIAL REVIEW

Rejected:

- removing `read_only` from the runtime console;
- attaching the console to Core/data networks merely to make startup easier;
- adding model/provider credentials or external network access to the CI smoke;
- installing the Traefik router before the corrected container is healthy;
- restarting the already-failing container repeatedly without changing the proven cause.

## VALIDATION GATE

Promotion may resume only after the hotfix CI is green and the fix is merged to `main`. Then the live Compose must be replaced with the exact merged bytes, the stopped runtime container recreated, both operator services proven healthy, and only then may the separately versioned Traefik router be installed.
