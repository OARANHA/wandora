# ADR 0330 — Current-Core Rollback V2 Persistent Capture Execution V1

Date: 2026-09-29

Status: PERSISTENT CAPTURE EXECUTED + VALIDATED / CURRENT-CORE ROLLBACK V2 READY / HISTORICAL RECEIPT PRESERVED / ACTIVATION NOT AUTHORIZED

The Current-Core Rollback V2 persistent capture completed successfully through the existing governed zero-argument managed-admin program.

Fresh entry state before execution:

- PR #369 exact head 027ad6b0364dedf2b0ca4a95b605b45d92ea323c was 17/17 GREEN;
- Core remained the exact b2cff production baseline;
- Paperclip and Gateway were healthy;
- Fast Read Execution, Semantic Fast Read, Human Send and Gateway outbound were OFF;
- Task Drain was false / 0 / 0 / quiescent=true;
- the historical Rollback V2 receipt remained intact;
- the current-Core receipt was absent.

A fresh adversarial review returned confirm=0.92 with confidence 0.89. A fresh one-use managed-admin approval then executed the existing capture program exactly once.

Execution result:

- executed=true;
- exit_code=0;
- timed_out=false;
- duration 28168 ms;
- terminal marker ROLLBACK_FREEZE_V2_OK;
- activation_performed=false;
- provider_call_performed=false;
- customer_effect=false;
- outbound_effect=false.

The new current-Core receipt is:

/opt/wandora/ops-workspace/production-rollback-freeze-v2-b2cffbb54089212844ef177827e7a616b1008144.metadata

Independent receipt readback proves:

- rollback root prefix is specific to b2cff;
- Paperclip image, image id, commit and Compose provenance match the qualified v2026.916.1 baseline;
- Core tag, image id, revision and Compose provenance match b2cff exactly;
- Core and Gateway were healthy with restart count 0;
- exactly one Organization Adapter 0.5.0 was ready;
- Task Drain was quiescent;
- semantic Fast Read gates were OFF;
- custody and attestation overlays were not live;
- official Paperclip backup was created;
- backup gzip validation succeeded;
- disposable restore succeeded;
- schema equality succeeded;
- TypeSafe, wfri1 and Mistral custody was captured as metadata only;
- activation/provider/customer/outbound flags are all false;
- terminal receipt marker is ROLLBACK_FREEZE_V2_OK.

The historical receipt at /opt/wandora/ops-workspace/production-rollback-freeze-v2.metadata remains intact and still anchors the previous Core 2c214 baseline.

Fresh post-capture runtime validation proves the same Core container identity/start time/image/revision remained live and healthy with restart count 0, Paperclip remained healthy, Gateway remained healthy and outboundEnabled=false, and Task Drain remained false / 0 / 0 / quiescent=true.

Result: CURRENT-CORE ROLLBACK V2 IS READY.

This does not authorize Semantic Fast Read or any activation/provider/customer/outbound effect. Semantic Fast Read attestation must begin only in a separate fresh slice with REAL NOW reconciliation, a new decision, a new second adversarial review and fresh effect authorization.
