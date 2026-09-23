# ADR 0226 — 28PRO VendaERP Bounded Product Read Retry Preflight V2

Status: **GREEN / PREFLIGHT COMPLETE / NO PROVIDER CALL**
Date: 2026-09-23

## Objective

Qualify one bounded retry of the 28PRO product-catalog read after:

- ADR 0220 defined the semantic read contract;
- the first live attempt `PRO-4` failed and exposed more read tools than the slice allowed;
- ADR 0223/0224/0225 converged tool narrowing back to Paperclip-native issue-scoped profile authority;
- safe VendaERP MCP error-code observability remains live.

This preflight does not call VendaERP.

## Canonical entry

```text
main = 970b32ac09d1db104f30eedb02702528eb92c0a8
PR #295 = merged
ADR 0225 = convergence execution complete
open PRs = 0
```

Production runtime at preflight:

```text
Core = wandora/core:organization-adapter-candidate-da4289034575
Core health/restarts = healthy / 0
Paperclip = wandora/paperclip:v2026.916.0
Paperclip health/restarts = healthy / 0
wandora_mastra = 0.4.0 / loaded / retained package 6390812d...
VendaERP MCP server.mjs sha256 = 067e7f98912f8bfb7bd19f6d098d19dcbb443c451819d85f17e317a6fe774640
Ana = idle / wandora_mastra
Wandora work operations = 0
Wandora outbound attempts = 0
```

## Paperclip-native narrowing proof

A temporary Paperclip-only issue was created with no assignee and therefore no wake/run:

```text
identifier = PRO-5
issue id = e5435108-e7fe-4c94-94c2-0395d6a617fc
status = backlog
assignee = null
customer-work marker = absent
```

A temporary active profile was created:

```text
profile id = 88e3cd3b-dca9-43a9-98b4-2735fefc0dad
defaultAction = deny
entries = 1
```

The only included catalog entry was:

```text
tool = vendaerp_search_products
catalogEntryId = 165fcdca-8021-41dd-90e5-f0f143adeac3
risk = read
```

The profile was bound natively by Paperclip:

```text
targetType = issue
targetId = e5435108-e7fe-4c94-94c2-0395d6a617fc
binding id = f217bde8-c000-424b-bb54-92fbac2f7152
```

No Wandora task marker or Core-side allowlist was used.

## Policy proof

Paperclip's native policy-test endpoint was executed with:

- actor = Ana;
- `runContext.issueId = PRO-5`;
- `consumeRateLimit = false`;
- `writeAuditEvent = false`;
- no tool execution.

All eight active VendaERP catalog entries were evaluated.

Result:

```text
vendaerp_search_products             = allow / allow_profile
vendaerp_search_orders               = deny / deny_default
vendaerp_search_parties              = deny / deny_default
vendaerp_search_price_table_products = deny / deny_default
vendaerp_list_price_tables           = deny / deny_default
vendaerp_get_product_stock           = deny / deny_default
vendaerp_list_companies              = deny / deny_default
vendaerp_probe                       = deny / deny_default

summary = allow 1 / deny 7
```

This proves the issue-scoped profile wins over Ana's broader install profile for this issue context.

## Cleanup proof

The temporary binding was unbound.

The temporary profile was deleted with:

```text
assignmentCount = 0
appliesToAgentCount = 0
```

The temporary issue `PRO-5` was deleted.

Post-cleanup readback:

```text
profile residual = false
issue residual = false
heartbeat runs created after preflight = 0
Tool Gateway audit events after preflight = 0
Wandora work operations = 0
Wandora outbound attempts = 0
Core = healthy / restart 0
Paperclip = healthy / restart 0
```

No provider endpoint was called.

## Capability Authority / Reuse Gate

The semantic requirement is:

```text
this one business task may use exactly one already-authorized read capability
```

The operational implementation is Paperclip-owned:

- issue identity;
- profile binding;
- narrowest-scope precedence;
- effective policy;
- catalog identity;
- Tool Gateway visibility;
- audit;
- MCP execution.

Wandora creates no durable task-tool policy state and no parallel authorization engine.

ADR 0168 remains preserved.

ADR 0208 remains preserved: generic REST execution remains NO-GO.

## Second adversarial review

- Is narrowing implemented by Paperclip rather than Wandora? **Yes.**
- Can this profile broaden Ana's access? **No; it contains one already-authorized read catalog entry.**
- Are any write/destructive tools visible? **No.**
- Was any run JWT fabricated? **No.**
- Was any session/model run opened? **No.**
- Was any provider call made? **No.**
- Did cleanup leave operational residue? **No.**
- Are work/outbound still zero? **Yes.**
- Does safe provider-error observability remain live? **Yes.**

## Frozen retry execution

A separate execution may:

1. reconcile main, runtime, catalog and zero-effect counters;
2. create one temporary Paperclip-only issue;
3. create one temporary active `defaultAction=deny` profile;
4. include only catalog entry `165fcdca-8021-41dd-90e5-f0f143adeac3` / `vendaerp_search_products`;
5. bind the profile to that issue with `targetType=issue`;
6. re-run native policy tests and require exactly `1 allow / 7 deny`;
7. only then assign/wake Ana through the native Paperclip lifecycle;
8. instruct the supervised task to call exactly:
   ```json
   {"pageSize":5,"skip":0}
   ```
   with `vendaerp_search_products`;
9. permit no other tool;
10. perform no automatic retry;
11. if the read succeeds, accept only the ADR 0220 provider-neutral fields:
    - name;
    - code;
    - category;
    - brand;
    - unit;
    - sale price;
    - stock balance;
12. exclude provider/internal IDs, barcode, minimum price, credentials/tokens and customer/order PII from the proof output;
13. if the read fails, capture only the safe normalized MCP stderr code and stop;
14. reconcile Tool Gateway invocation count, work/outbound and runtime health;
15. remove the temporary issue/profile/binding after evidence capture.

## Decision

**GREEN.**

Next slice:

**28PRO VendaERP Bounded Product Read Retry Execution V2 — READ ONLY**

Exactly one bounded provider read is authorized only through the frozen Paperclip issue-scoped narrowing sequence above.
