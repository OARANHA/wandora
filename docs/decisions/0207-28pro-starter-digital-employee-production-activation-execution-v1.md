# ADR 0207 — 28PRO Starter Digital Employee Production Activation Execution V1

Status: **PARTIAL / SAFE STOP AT ORGANIZATION-ADAPTER SECRET CUSTODY STEP**
Date: 2026-09-23

## Entry authority

ADR 0206 qualified the execution sequence after exact-head CI GREEN.

## Real executed state

The effectful execution began after re-reconciling `main`, open PRs and production runtime.

Paperclip provider reconciliation found exactly one active `28PRO` company:

- provider company ref = `5d7ec217-118c-4292-8136-0a9ab16926ea`;
- status = active;
- agents = 0;
- created_at = `2026-09-23T09:14:05.795Z`.

The company create was **not replayed** after discovery. The exact origin of that already-created company is less important than the durable provider reconciliation; no second create is permitted.

Wandora/host reconciliation then proved:

- exactly one `28PRO -> paperclip` control-plane binding;
- binding provider company ref matches `5d7ec217-118c-4292-8136-0a9ab16926ea`;
- deterministic Organization Adapter HMAC file exists in host custody;
- file path is derived from SHA-256 of the provider company ref;
- file mode = 0640;
- owner/group = wandora-admin / wandora-ops;
- no starter eligibility row;
- no Wandora digital employee;
- no `ana-commercial-v1` hire operation;
- no employee/provider binding.

Paperclip reconciliation proves:

- Organization Adapter company secrets = 0;
- Organization Adapter company config = null;
- provider agents = 0.

Therefore the current cross-system state is a safe, intentionally partial company-wiring state:

```text
Paperclip company = present
Wandora control-plane binding = present
Core HMAC custody = present
Paperclip HMAC secret = absent
Paperclip Organization Adapter config = absent
starter eligibility = absent
starter hire = absent
starter employee = absent
```

## Tooling stop

The available remote execution tool rejected the command that would transfer the already-custodied HMAC into Paperclip `local_encrypted` secret creation, before the command reached the host.

No Paperclip secret create request was dispatched by the rejected attempts.

This is treated as a hard operational stop. The execution must not bypass tool security by exposing the HMAC in argv, logs, Git, chat or customer-visible state.

## Exact continuation point

Resume from **Paperclip Organization Adapter HMAC secret creation** only.

Do not recreate:

- Paperclip company;
- Wandora control-plane binding;
- host HMAC.

After the HMAC secret exists, continue the frozen ADR 0206 sequence:

1. set company-scoped Organization Adapter config referencing that exact secret;
2. reconcile plugin config/secret usage;
3. enable `ana-commercial-v1` eligibility through the existing operator function;
4. hire exactly one Ana using the canonical idempotent hire contract;
5. reconcile paused + supervised state;
6. activate exactly that Ana through the canonical activation contract;
7. prove active + supervised / Paperclip idle with no work, Mastra or outbound effects.

## Safety invariant

Any future continuation must begin with read-only reconciliation of the current partial state before executing the secret create. Never repeat work merely because a previous chat/tool response was interrupted.
