# ADR 0207 — 28PRO Starter Digital Employee Production Activation Execution V1

Status: **COMPLETE / 28PRO STARTER WORKFORCE READY**
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

## Continuation checkpoint — Organization Adapter wired + starter eligibility enabled

After manual creation of the Paperclip company-owned Organization Adapter HMAC secret:

- secret id = `00c63430-2468-4221-b68e-48b96f303bb7`;
- provider = `local_encrypted`;
- status = active;
- latestVersion = 1;
- exact active matching secrets = 1.

The company-scoped Organization Adapter config was then persisted and independently reconciled:

- config id = `e21c507b-a457-419e-a47a-e9f274c15904`;
- exact secret_ref = `00c63430-2468-4221-b68e-48b96f303bb7`;
- secret referenceCount = 1;
- config lastError = null;
- Paperclip 28PRO agents = 0.

The existing least-privilege eligibility operator boundary was reused. The first direct role attempt failed before mutation because `postgres` cannot assume the NOLOGIN operator role; the second shell-quoted attempt failed before setter execution and its transaction rolled back. Independent readback proved the target row still absent before retry.

The canonical `supabase_admin -> transaction -> exclusive lock -> SET LOCAL ROLE wandora_customer_hire_operator -> setter -> postcondition -> COMMIT` pattern was then executed successfully:

- 28PRO + `ana-commercial-v1` eligibility = enabled;
- target employees = 0;
- target hire operations = 0;
- target employee/provider bindings = 0;
- Paperclip agents = 0.

The current execution point is now **owner-authorized paused-first hire**. Do not bypass the normal authenticated customer contract with operator SQL, service-role impersonation or direct Organization Adapter calls.

## Final execution closure

The owner-authorized hire completed through the normal customer contract and was independently reconciled before activation:

- Wandora Ana count = 1;
- employee id = `7b401163-8102-42db-b595-3a2017f54003`;
- role = `commercial-assistant`;
- autonomy = `supervised`;
- initial employee status = `paused`;
- hire operation count = 1;
- hire operation status = `completed`;
- employee/provider binding count = 1;
- Paperclip managed Ana count = 1;
- Paperclip agent id = `428b6730-3df4-4b92-b90a-a87f87c401f9`;
- Paperclip status before activation = `paused`;
- work items = 0;
- outbound attempts = 0.

The owner then invoked the existing customer activation contract exactly once. Final independent readback proves:

- same Wandora Ana = `active + supervised`;
- same canonical hire = `completed`;
- same employee/provider binding = present exactly once;
- same Paperclip managed Ana = `idle`;
- 28PRO work items = 0;
- 28PRO outbound attempts = 0;
- starter eligibility remains enabled exactly once.

Activation did not create work, start a Mastra run or send an external message.

## Final result

28PRO is now **starter-workforce ready** under ADR 0204/0205.

Current product truth:

```text
28PRO organization = active
Paperclip company = active
Organization Adapter wiring = ready
starter eligibility = enabled
Ana hire = completed
Ana = active + supervised
Paperclip Ana = idle
work items = 0
outbound attempts = 0
```

## Next executable slice

Resume the provider-neutral ERP roadmap:

**Paperclip Business-System Connection Container + REST Tool Gateway Read-Only Qualification V1 — CODE ONLY / NO EFFECT**

Then run a separate 28PRO VendaERP read-only connection activation preflight before entering the real ERP credentials.
