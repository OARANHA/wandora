# Organization Adapter 0.3.1 Production Promotion Preflight V1

Status: **CLOSED / NO EFFECT / GO FOR SEPARATE EXECUTION**

Authority: ADR 0159.

## Objective

Prepare the exact production promotion from Organization Adapter 0.3.0 to 0.3.1 without using Ana, MED-1 or a second customer work as a smoke test.

## Frozen production identities

```text
Paperclip image         = wandora/paperclip:v2026.916.0
plugin key              = wandora.organization-adapter-v1
plugin id               = 86e77fe7-c7e4-4bee-afa3-46cdad575d0c
live version            = 0.3.0
MEDICSPRO company       = a63f27a8-dbac-4552-a456-b3a21302226b
Paperclip Ana           = da6cfc6b-e16f-483a-95f1-bacee8e54365
MED-1                   = 42a8a8df-f6d9-4a4e-a3aa-662a05dc6154
```

## Candidate

Canonical GitHub Actions artifact:

```text
main source             = d4d9ecc69cce33f6b0553b8372e576c56a4d91ac
workflow                = Organization Adapter Plugin CI #232
run id                  = 35682666013
artifact id             = 10675810790
artifact ZIP sha256     = 2a6bba462b4998736493eb70f00da90ba8f4d99117bbae384fbeb87467d9ce2f
package                 = paperclip-plugin-wandora-organization-adapter-0.3.1.tgz
package sha256          = 06a42a04dd0b6eff8ee377c1d4f1e40bbabce122767d0d77e92ee509d27d811d
```

Preflight custody:

```text
/home/wandora-admin/executions/organization-adapter-031-promotion-preflight-v1-20260922/
```

Do not substitute the older local laboratory package hash.

## Rollback

Retained live package:

```text
version                 = 0.3.0
tgz sha256              = c7bdc270b1fa13d7e3ceacba5455647bd98cc15f29e61046a2bbfad85e62ce82
live path               = /paperclip/operator-packages/wandora-organization-adapter-v1/c7bdc270b1fa13d7e3ceacba5455647bd98cc15f29e61046a2bbfad85e62ce82/package
config response sha256  = 83d5cb41938ce4fdf9025b8a51c8df28e55caed70473ed40ed2f3a2835b1f326
```

Never hard-purge the plugin.

## Future execution

1. Fresh REAL NOW reconciliation.
2. Verify no live run/recovery and no second work.
3. Verify candidate and rollback hashes.
4. Stage exact 0.3.1 candidate into:
   `/paperclip/operator-packages/wandora-organization-adapter-v1/06a42a04d.../package`.
5. Verify exact five-file package shape and semantic manifest equality.
6. Soft-uninstall `wandora.organization-adapter-v1` once, purge=false.
7. Read back same plugin row/config.
8. Install exact staged local path once.
9. Read back same plugin ID, version 0.3.1, status ready.
10. Verify company config hash and secret-ref unchanged.
11. Verify plugin health.
12. **Do not restart Paperclip.**
13. Verify Ana remains historical `error`, MED-1 remains done, runs remain 2/0-live.
14. Verify work=1, outbound=0, Human Send OFF, Gateway outbound OFF.
15. STOP.

## Ambiguous result rule

Never blind-retry uninstall or install. Read provider state first and classify convergence.

## Hard stops

Stop on package/provenance drift, config/secret-ref drift, capability escalation, duplicate plugin row, unhealthy Paperclip/Core, live run/recovery, work-count drift, outbound drift, or any requirement to normalize Ana/restart Paperclip.

## Boundary

This runbook authorizes no mutation by itself.
