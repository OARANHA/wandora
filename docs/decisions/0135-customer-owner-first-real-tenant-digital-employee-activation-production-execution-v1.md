# ADR 0135 — Customer Owner First Real Tenant Digital-Employee Activation Production Execution V1

Status: **Accepted / execution complete**

Date: 2026-09-20

## Context

ADR 0133 qualified the no-effect production activation path for the first real MEDICSPRO digital employee. ADR 0134 then closed a Web artifact defect discovered during execution before the owner activation point of no return.

This ADR records the completed production execution and the post-effect proof.

## REAL NOW

Canonical Git entry point for the final activation step:

```text
main = 3f9f6a580f6e2cadab20cd375c9bee4255344093
open PRs = 0
```

Production identities:

```text
MEDICSPRO organization = b3fa4d96-4e2d-4d5a-ab59-ffab0d3062e5
Wandora Ana            = b7eb53d4-498a-4277-b11f-17ddc42b3fe3
Paperclip company      = a63f27a8-dbac-4552-a456-b3a21302226b
Paperclip Ana          = da6cfc6b-e16f-483a-95f1-bacee8e54365
```

Execution foundation already live and revalidated:

```text
migration 015 = live
migration 015 verifier = DIGITAL_EMPLOYEE_ACTIVATION_PROJECTION_V1_OK

Organization Adapter = wandora.organization-adapter-v1@0.2.0 / ready
capabilities =
  agents.managed
  agents.resume
  webhooks.receive
  secrets.read-ref

Core = wandora/core:organization-adapter-candidate-8d2a53e3c264
Core image id = sha256:126fac5055560f385c93e0d3ded65fd9cc6021b52071eb33f74d469353979648

Web = wandora/web:candidate-eda946c36ec4
Web image id = sha256:41b0624da5f46ecaae27bb7295130936318a257dc5465f6f46c9f1159c02d5a5

Paperclip = wandora/paperclip:v2026.916.0
Paperclip image id = sha256:4fb5073ff0b09ea50527cfeafe5bcaff4f9dae2b0f508fd06c0dc58661735ced
```

## Web Auth incident during execution

The first promotion of the PR #182 Web candidate exposed a real build defect before activation:

```text
A autenticação da Wandora ainda não foi configurada neste build.
```

The candidate contained the activation bridge but had been built without the browser-public Supabase publishable key.

The execution failed closed:

- no owner activation request was accepted;
- Wandora Ana remained paused + supervised;
- Paperclip Ana remained paused;
- activation overlay was returned to OFF;
- Human Send and Gateway outbound remained OFF.

ADR 0134 records the root cause and correction.

PR #185 then produced and qualified the replacement Web artifact:

```text
Web CI #500 = GREEN
WANDORA_WEB_AUTH_PUBLIC_CONFIG_V1_OK
WANDORA_WEB_HUMAN_API_BRIDGE_V1_OK

replacement image = wandora/web:candidate-eda946c36ec4
image id = sha256:41b0624da5f46ecaae27bb7295130936318a257dc5465f6f46c9f1159c02d5a5
artifact ZIP sha256 = baa95435b8206e9d17885169d63242e7268737f42d18c4d1a0cc3a57f6ac0b8b
image archive sha256 = 911cddaa5e4a82135e80e0560d00334ace7381342b4e9ed58d4ed3fe4a725af8
source tree = 58e869628b076bd75a98a64938bf9829c49ed3ea
main tree after squash merge = 58e869628b076bd75a98a64938bf9829c49ed3ea
```

The real customer owner subsequently completed normal browser login successfully.

## SECOND ADVERSARIAL REVIEW BEFORE EFFECT

Immediately before the owner activation effect:

```text
Wandora Ana = paused + supervised
Paperclip Ana = paused
control bindings = 1
employee bindings = 1
completed exact-catalog hire = 1
unfinished hires = 0
wakeups = 0
heartbeat runs = 0
open routine runs = 0
outbound attempts = 0

Human Digital-Employee Activation = ON
Human Send = OFF
Gateway outbound = OFF
```

Rejected:

- direct SQL status mutation;
- direct Paperclip agent mutation;
- extracted/minted owner Auth token;
- blind retry after any ambiguous browser result;
- creating a wakeup/heartbeat/task merely to prove the active employee;
- enabling Human Send or Gateway outbound as part of activation;
- invoking Mastra as an activation side effect.

## EXECUTION

The real owner used the normal authenticated customer Web contract exactly once.

The Core activation contract called the Organization Adapter private webhook:

```text
POST /api/plugins/wandora.organization-adapter-v1/webhooks/employee-activate
HTTP 200
```

The provider lifecycle converged:

```text
Paperclip Ana:
paused -> idle
```

The Wandora projection then converged:

```text
Wandora Ana:
paused -> active
autonomy remains supervised
```

The same Wandora employee ID, Paperclip agent ID, provider binding and completed hire were preserved.

## POST-EFFECT VALIDATION

Durable Wandora state:

```text
Ana count = 1
Wandora Ana = active + supervised
control binding count = 1
employee binding count = 1
completed exact-catalog hire count = 1
unfinished hire count = 0
outbound attempts = 0
migration 015 helper count = 2
```

Paperclip lifecycle/run state:

```text
Paperclip Ana = idle
adapter = wandora_mastra
last_heartbeat_at = null
wakeups = 0
heartbeat runs = 0
open routine runs = 0
total routine runs = 0
task sessions = 0
```

Paperclip runtime state for MEDICSPRO Ana:

```text
session_id = null
last_run_id = null
last_run_status = null
total_input_tokens = 0
total_output_tokens = 0
total_cost_cents = 0
last_error = null
MEDICSPRO run_identity_contexts = 0
```

All production services remained healthy with zero restarts at final validation.

Effect gates after activation:

```text
WANDORA_HUMAN_DIGITAL_EMPLOYEE_ACTIVATION_ENABLED = true
Human Send = OFF
Gateway outbound = OFF
```

## Mastra / Agent Runtime conclusion

Activation did **not** call Mastra and did **not** create a Mastra workflow run.

The Core activation service only uses the customer authorization/readiness boundary plus the Organization Adapter lifecycle contract. The deterministic Mastra runtime remains lazy and is reached only through legitimate inbound/customer-processing or Paperclip execution work.

The zero task sessions, null Paperclip runtime `last_run_id`, zero run identity contexts, zero wakeups/heartbeat/routine runs and zero runtime token/cost counters independently match that architecture.

Mastra `@mastra/core@1.66.0` remains unchanged.

## Rollback / recovery boundary after activation

The lifecycle point of no automatic rollback has now been crossed intentionally.

No broad database restore, direct employee status UPDATE or newly granted `agents.pause` authority is authorized merely to make activation reversible.

If a later operational problem requires deactivation/pause semantics, that is a new reviewed lifecycle slice.

Human Send and Gateway outbound remain the external-effect safety barriers.

## RESULT

**Customer Owner First Real Tenant Digital-Employee Activation Production Execution V1 is complete and GREEN.**

MEDICSPRO now has exactly one real Ana that is:

```text
Wandora = active + supervised
Paperclip = idle / wandora_mastra
```

The employee is active but has not been given synthetic work, has not created a Mastra run, and has not produced outbound messaging.

## NEXT BOUNDARY

Any first legitimate post-activation work is a separate operational slice.

Do not manufacture a task, wakeup, heartbeat, Mastra run, Human Send action or Gateway outbound effect merely to demonstrate activity.

A future first-work slice must begin from current real state and define the legitimate work source, supervision expectations and effect boundary before execution.
