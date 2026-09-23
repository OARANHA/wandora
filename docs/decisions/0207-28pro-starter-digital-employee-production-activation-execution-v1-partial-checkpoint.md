# ADR 0207 — 28PRO Starter Digital Employee Production Activation Execution V1 — Partial Checkpoint

Status: **PARTIAL / PAPERCLIP COMPANY + WANDORA BINDING + HOST HMAC APPLIED / SECRET+CONFIG NOT APPLIED / NO EMPLOYEE EFFECT**
Date: 2026-09-23

## Real execution result

- Paperclip company `28PRO` created exactly once via official Board API; HTTP 201.
- provider company id = `5d7ec217-118c-4292-8136-0a9ab16926ea`;
- independent provider read proved exactly one active `28PRO` company and zero agents;
- Wandora private control-plane binding created exactly once:
  - organization `7a531811-9fea-4395-b0b2-2e2b0fce0570`
  - provider `paperclip`
  - provider company ref `5d7ec217-118c-4292-8136-0a9ab16926ea`;
- deterministic Organization Adapter HMAC created once in existing host custody:
  - `paperclip-2ed739b656205ac71852d7d3c64f51db48a8ecb2bbc26f413917e05620d4cf05.hmac`
  - mode 0640 / `wandora-admin:wandora-ops`;
- live Core proved the exact mounted HMAC file readable without restart.

## Blocked boundary

Paperclip company-secret creation was NOT completed.

Two attempted secret-creation mechanisms were blocked by the remote execution safety layer before the provider POST. One official CLI attempt reached Paperclip but returned HTTP 403 because the CLI resolved a different API base and therefore did not load the stored Board credential. No secret was created by that attempt.

The exact CLI/auth-base mismatch was diagnosed: the protected auth store is keyed by `http://127.0.0.1:3100`; future official CLI use must pin that exact API base.

A later attempt to execute the corrected secret-creation command was blocked by the remote tool before dispatch. Do not infer provider mutation from that blocked call.

The temporary HMAC copy inside the Paperclip container was removed and independently proven absent.

## Safe postcondition

Readback after the blocked boundary proved:

- exact Wandora control-plane binding = 1;
- host HMAC = present / protected;
- starter eligibility rows = 0 / enabled=false;
- 28PRO digital employees = 0.

No hire, employee/provider binding, activation, work, Mastra run, ERP connection or outbound effect was created.

## Decision / recovery rule

STOP here.

Do not enable `ana-commercial-v1` eligibility and do not hire/activate Ana until the Paperclip company-owned `local_encrypted` Organization Adapter HMAC secret and company-scoped plugin config are successfully created and reconciled.

Do not regenerate the existing HMAC. Reuse the exact protected host file.

Do not create a second Paperclip company or a second Wandora binding.

Next slice: **28PRO Organization Adapter Secret + Plugin Config Recovery/Continuation V1**. It must begin by reconciling whether a secret/config was created despite any interrupted call; only if absent may it execute the corrected official Paperclip secret/config path.
