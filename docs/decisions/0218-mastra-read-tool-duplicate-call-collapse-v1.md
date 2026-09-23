# ADR 0218 — Mastra Read Tool Duplicate-Call Collapse V1

Status: **CODE CANDIDATE / E2E PARTIAL / NO FURTHER PRODUCTION EFFECT**
Date: 2026-09-23

## Context

ADR 0217 qualified and production now runs the ADR 0211 Core bridge candidate.

A bounded synthetic 28PRO Paperclip issue then proved the real path:

```text
Paperclip issue/run JWT
-> Wandora Core
-> Paperclip Tool Gateway
-> ephemeral RuntimeReadTool
-> supervised Mastra
-> Paperclip Tool Gateway call
-> VendaERP local_stdio
```

The first run succeeded and returned:

```text
Conexão com o VendaERP está disponível (connected: true).
```

However Paperclip ToolConnection audit proved that Mastra repeated the identical `vendaerp_probe {}` read five times inside that run. Paperclip then created one disposition-recovery handoff run which repeated the same read five more times.

All ten calls were connection-backed `mcp_local_stdio`, `risk=read`, policy-allowed and returned `connected=true`. No write/destructive tool, Wandora customer work or outbound effect occurred.

The E2E capability is therefore functionally proven, but the proof is **not accepted as final GREEN** because identical reads were multiplied unnecessarily.

## Proven evidence

Exact proof issue:

```text
issue = 44354c5e-cb9b-4092-ab6f-b17b7e9498e0
identifier = PRO-1
customer work marker = absent
```

Runs:

```text
11a666b1-7542-49b1-8c8e-c126be7a8e26 = succeeded
370c8a98-3ab8-4c5e-91f2-3c414f00c7ad = succeeded disposition handoff
```

ToolConnection audit filtered to PRO-1:

```text
policy decisions = 10
completed calls = 10
tool = vendaerp_probe
parameters = {}
risk = read
outcome = success
result = connected=true
```

A separate concurrent PRO-2 existed in Paperclip and is explicitly outside this ADR evidence.

## Capability Authority / Reuse Gate

No new tool engine, state machine, connection registry, retry layer or durable cache is justified.

Paperclip remains authoritative for:

- ToolConnection;
- install/grant/secret/profile/policy;
- Tool Gateway session;
- audit;
- actual MCP execution.

Wandora owns only the narrow ephemeral runtime admission adapter from ADR 0211.

Therefore the correction belongs inside that ephemeral adapter.

## Decision

Within one invocation of `createPaperclipToolGatewayReadBridge(...)`, each admitted RuntimeReadTool memoizes calls by:

```text
tool identity + canonicalized parameters
```

The memoized value is the first Promise returned by the Paperclip Tool Gateway call.

Consequences:

- same tool + semantically identical parameters in the same run = one Paperclip call;
- object key ordering does not create a second call;
- distinct parameters still create distinct Paperclip calls;
- a denied/unavailable first call remains failed for identical repeats in that run and is not implicitly retried;
- memoization ends with the run-scoped bridge object and creates no durable state.

Mastra's internal supervised instructions also explicitly require reusing an already-obtained identical read result rather than repeating the tool call.

## SECOND ADVERSARIAL REVIEW

- Does this move execution authority from Paperclip into Wandora? **No.**
- Does Wandora cache provider data durably? **No.**
- Does it bypass Paperclip policy/grant/secret resolution? **No. First call still traverses the full Paperclip path.**
- Could a changed parameter be incorrectly collapsed? **No; canonicalized parameter payload is part of the key.**
- Could cyclic/non-serializable parameters silently collide? **No; they fail closed as invalid.**
- Does a failed first call become an automatic retry? **No; the failed Promise is memoized.**
- Are write/destructive tools affected? **No; ADR 0211 still admits only connection-backed MCP `risk=read`.**
- Is cross-run caching introduced? **No.**
- Is Paperclip lifecycle/handoff duplicated? **No. The handoff remains Paperclip-owned.**
- Does this solve cross-run handoff duplication? **No. It intentionally solves only repeated identical reads inside one runtime execution.**

## Validation contract

Unit coverage must prove:

1. concurrent semantically identical reads produce one Tool Gateway call;
2. differently ordered object keys are treated as identical;
3. distinct parameters produce distinct calls;
4. identical denied reads do not trigger a second Tool Gateway call;
5. existing ADR 0211 admission/credential-leakage tests remain GREEN.

A later production proof must distinguish:

- per-run duplicate collapse;
- any separate Paperclip lifecycle handoff run.

If Paperclip creates a second run after successful task completion, that lifecycle behavior must not be hidden by this ADR.

## Effect boundary

This ADR/code candidate does not itself:

- deploy Core;
- mutate Paperclip connection/grant/secret/profile state;
- call VendaERP;
- create customer work;
- create outbound effects;
- apply migrations.

## Decision

**GO for code qualification.**

Final E2E GREEN requires a separately promoted fixed Core candidate and a fresh bounded production proof.
