# ADR 0234 — Wandora Read Tool Failure Propagation V1

Status: **CODE CANDIDATE GREEN / NO PROVIDER CALL / NO PRODUCTION EFFECT**
Date: 2026-09-23

## Objective

Implement the minimum Wandora-owned correction selected by ADR 0233:

- preserve semantic read-tool failure across the Mastra model/tool loop;
- never accept a model-authored summary as successful work after a read tool failed;
- preserve a bounded private Core error contract;
- keep Paperclip lifecycle, Tool Gateway policy, retry/reconciliation and issue disposition provider-owned.

This slice does not change production and does not authorize another VendaERP call.

## Canonical base

main = 6e540994c528f3dd74fdd16c35c6456a8fde3984
ADR 0233 = MERGED
code candidate commit = 0993fb0cb8f012d42205dd89ab9506a95d93e706

## Capability Authority / Reuse Gate

No new table, migration, state machine, retry engine, lifecycle flag, policy engine or Paperclip fork was added.

Authority remains:

- Paperclip: issue/run lifecycle, continuation/recovery, Tool Gateway, policy/rate-limit/audit and terminal disposition.
- Wandora: business work/result semantics and the rule that failed provider/tool execution cannot become successful durable work.
- Mastra: ephemeral supervised model/tool execution.

ADR 0168 remains preserved.

## Implementation

### 1. Mastra runtime preserves the first read-tool failure

The supervised model runtime now records whether any supplied read tool threw during Agent.generate().

The underlying tool exception is still thrown into Mastra so its normal model/tool loop behavior remains unchanged.

After Agent.generate():

- if no read tool failed, the existing structured summary path remains unchanged;
- if a read tool failed, the original first tool error is rethrown before Wandora accepts or persists any model summary.

If Agent.generate() itself throws after a read-tool failure, the original read-tool error remains the semantic failure returned to the caller.

This does not introduce a Wandora retry/tool budget policy. Later tool admission remains governed by Paperclip Tool Gateway policy.

### 2. MCP error result receives a distinct internal category

PaperclipToolGatewayReadBridgeError now distinguishes:

- invalid;
- denied;
- unavailable;
- tool-failed.

A normal MCP HTTP/transport failure remains unavailable/denied as before.

A successful Tool Gateway response whose MCP result is explicitly:

- data.isError = true; or
- error = MCP tool returned an error result

is classified as tool-failed.

The existing identical-read collapse is unchanged.

### 3. Private Core boundary exposes only a bounded safe failure

The private Paperclip execution handler maps tool-failed to:

HTTP 422
error = read-tool-failed

No provider payload, token, internal id or raw MCP error is exposed.

All other unknown failures keep the prior HTTP 500 internal-error behavior.

### 4. wandora_mastra remains unchanged

The adapter is intentionally not modified.

It already treats a non-2xx Core execution response as a failed adapter execution.

In particular, this ADR rejects converting read-tool-failed into exitCode 0.

That preserves Paperclip's own failed-run reconciliation/recovery authority.

### 5. Customer-work durability remains fail-closed

PaperclipExecutionService already surrounds runtime execution with the customer-work durable result contract.

When runtime execution throws after a prepared Wandora customer work:

- recordCatalogEmployeeWorkResult is not called;
- markCatalogEmployeeWorkExecutionUncertain is called;
- the original failure is propagated.

ADR 0234 adds explicit integration coverage for a read-tool failure through this path.

## Validation

### Static/build

- npm run typecheck = GREEN
- npm run build = GREEN
- git diff --check = GREEN

### Focused no-provider tests

Focused runtime/bridge/handler suite:

13/13 GREEN

This includes:

- a synthetic Mastra tool-call turn where vendaerp_search_products throws;
- a later model response that attempts to return a textual success summary;
- assertion that Wandora rejects the task with the original tool error;
- MCP isError classification as tool-failed;
- identical-call collapse remaining one call;
- Core handler mapping tool-failed to bounded HTTP 422 read-tool-failed.

### Durable customer-work integration

The repository's migration-aware Organization Adapter verifier ran in temporary containers.

Result:

33/33 GREEN

The new integration test proves:

- customer work is prepared;
- one synthetic read tool throws;
- runtime result is rejected;
- durable successful work result count remains zero;
- markCatalogEmployeeWorkExecutionUncertain receives the exact organization/employee/work/run identity.

Verifier terminal markers:

- ORGANIZATION_ADAPTER_SERVICE_CONTRACT_V1_VERIFY_OK
- ORGANIZATION_ADAPTER_RUNTIME_E2E_V1_VERIFY_OK
- DIGITAL_EMPLOYEE_ACTIVATION_CONTRACT_V1_VERIFY_OK
- CUSTOMER_HIRE_TENANT_ELIGIBILITY_V1_VERIFY_OK
- PAPERCLIP_EXECUTION_BINDING_RESOLVER_V1_VERIFY_OK
- DIGITAL_EMPLOYEE_ACTIVATION_PROJECTION_V1_OK
- DIGITAL_EMPLOYEE_WORK_ADMISSION_V1_OK

## Second adversarial review

- Did this add issueId propagation to Tool Gateway? **No.**
- Did it create a second rate-limit or tool policy? **No.**
- Did it add a Wandora retry engine? **No.**
- Did it alter Paperclip source or lifecycle? **No.**
- Did it alter wandora_mastra? **No.**
- Can a model summary override a failed read tool after this candidate? **No.**
- Does customer work record success after runtime read-tool failure? **No.**
- Is the work marked uncertain instead? **Yes.**
- Was VendaERP called during validation? **No.**
- Was production changed? **No.**

## Decision

**CODE CANDIDATE GREEN.**

The candidate is ready for repository CI/review.

It is not yet production-qualified.

Next slice after merge:

**ADR 0234 Production Promotion Preflight V1 — NO PROVIDER CALL**

That preflight must freeze the exact Core artifact, prove production/runtime rollback state and determine whether the change is Core-only. No VendaERP read is authorized before separate promotion and post-promotion preflight.
