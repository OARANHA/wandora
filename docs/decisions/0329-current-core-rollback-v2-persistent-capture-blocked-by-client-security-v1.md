# ADR 0329 — Current-Core Rollback V2 Persistent Capture Blocked by Client Security V1

Date: 2026-09-29

Status: BLOCKED BEFORE CAPTURE EXECUTION / NO CURRENT-CORE RECEIPT / HISTORICAL RECEIPT PRESERVED / RUNTIME UNCHANGED / ACTIVATION NOT AUTHORIZED

The Current-Core Rollback V2 persistent capture was fully requalified before execution: PR #369 exact head 809bcd4b22c1a114f28bba3c54cdda71f4b4e7be was 17/17 GREEN, production Core remained the corrected b2cff baseline, Paperclip and Gateway were healthy, Task Drain was quiescent, all Fast Read/Human Send/outbound gates remained OFF, and the current-Core receipt was absent.

The existing governed zero-argument capture program was selected through the accepted Remote-Ops managed-admin boundary. No new capability, generic root shell, backup subsystem, lifecycle service or provider implementation was introduced.

A fresh second adversarial review required explicit human confirmation. After the human confirmed the prepared one-use capture action, the client security layer blocked the apply call before an execution result was returned.

Per state-first recovery discipline, the action was not retried. Fresh readback proved:

- the current-Core receipt remains absent;
- the historical Rollback V2 receipt remains intact and still anchors the earlier Core baseline;
- Core identity, start time, image/revision, health and restart count are unchanged;
- Paperclip remains healthy;
- Gateway remains healthy and outbound remains disabled;
- Task Drain remains false / 0 / 0 / quiescent=true.

Therefore there is no evidence that persistent capture executed.

Do not treat the failed apply as authorization to bypass the managed-admin boundary. Resume only in an execution context where the existing governed apply path is permitted, then re-run fresh exact-head/runtime reconciliation and require a new one-use approval before capture.

Semantic Fast Read attestation remains prohibited.
