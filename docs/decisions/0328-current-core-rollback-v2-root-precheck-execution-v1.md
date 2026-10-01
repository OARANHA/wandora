# ADR 0328 — Current-Core Rollback V2 Root Precheck Execution V1

Date: 2026-09-29

Status: ROOT PRECHECK GREEN / CAPTURE NOT EXECUTED / ACTIVATION NOT AUTHORIZED

The current-Core Rollback V2 governed precheck executed successfully against the corrected production Core baseline b2cffbb54089212844ef177827e7a616b1008144.

Fresh exact-head CI was 17/17 GREEN before execution. The precheck completed with exit code 0 and terminal marker ROLLBACK_FREEZE_V2_PRECHECK_OK.

Post-execution validation proved the production Core identity remained unchanged and healthy with restart count 0. Fast Read Execution, Semantic Fast Read, Human Send and Gateway outbound remained disabled. Task Drain remained quiescent.

The historical Rollback V2 receipt remains preserved for the earlier Core baseline. The current-Core receipt remains absent, proving the precheck did not perform persistent capture.

Persistent capture is a separate future effect requiring fresh reconciliation, a new decision, a new second adversarial review and a new one-use approval.

Semantic Fast Read attestation is not authorized by this decision.
