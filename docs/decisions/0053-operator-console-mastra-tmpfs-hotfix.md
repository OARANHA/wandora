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

The first hotfix candidate preserved the read-only root and added `/app/.mastra` as a 16 MiB tmpfs. The new real-start CI smoke correctly rejected it with `ENOSPC: no space left on device` while Mastra bundled its development environment.

A second adversarial VPS proof used the same image with `--network none`, `--read-only`, dropped capabilities and a temporary 64 MiB `/app/.mastra` tmpfs. The Studio reached HTTP readiness, consumed `19344 KiB` (30% of the 64 MiB mount), and remained responsive after an additional 10-second stability probe:

```text
READY_AT=10
/app/.mastra used = 19344 KiB
64 MiB tmpfs use = 30%
STABLE_10S_OK
```

## DECISION

Keep the container root filesystem read-only. Provide only the narrowly scoped ephemeral tmpfs required by Mastra:

```text
/app/.mastra:rw,noexec,nosuid,size=64m
```

64 MiB is selected from measured startup evidence rather than guesswork. Do **not** solve the problem by making the root filesystem writable or by granting a large persistent writable volume.

Extend Operator Consoles CI so the built Mastra image must actually start under `--read-only`, `--network none`, dropped capabilities, the existing `/tmp` tmpfs, and the exact 64 MiB `/app/.mastra` tmpfs, then answer HTTP on container-local port 4111. The smoke also verifies actual `/app/.mastra` usage remains below the configured boundary.

## SECOND ADVERSARIAL REVIEW

Rejected:

- removing `read_only` from the runtime console;
- using 256 MiB merely because the broad proof succeeded;
- retaining 16 MiB after CI proved it insufficient;
- attaching the console to Core/data networks merely to make startup easier;
- adding model/provider credentials or external network access to the CI smoke;
- installing the Traefik router before the corrected container is healthy;
- restarting the already-failing live container repeatedly without changing the proven cause.

The 64 MiB decision survived the second review because measured steady startup consumption was 19344 KiB and the exact 64 MiB isolated proof reached and retained readiness.

## TLS / 526 OBSERVATION

While the router remains intentionally absent, local SNI probes show Traefik presents `TRAEFIK DEFAULT CERT` for `control.wandora.com.br` and `runtime.wandora.com.br`, while already-routed `app.wandora.com.br` and `status.wandora.com.br` present valid Let's Encrypt certificates. With Cloudflare Full (strict), the operator hostnames therefore return 526 until the reviewed routers are installed. Do not weaken Cloudflare SSL mode to hide this pre-promotion state.

## VALIDATION GATE

Promotion may resume only after the updated hotfix CI is green and the fix is merged to `main`. Then the live Compose must be replaced with the exact merged bytes, the stopped runtime container recreated, both operator services proven healthy, and only then may the separately versioned Traefik router be installed. After router installation, verify origin certificates for both SNI names and confirm Cloudflare Access still intercepts both external hostnames before declaring the console slice complete.
