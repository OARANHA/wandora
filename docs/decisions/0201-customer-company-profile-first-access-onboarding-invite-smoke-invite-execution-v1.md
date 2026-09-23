# ADR 0201 — Customer Company Profile + First Access Onboarding Invite-Only Smoke — Invite Execution V1

Status: **PARTIAL / EXACTLY ONE REAL INVITE APPLIED / ACCEPTANCE PENDING**
Date: 2026-09-23

## Context

ADR 0200 left migration 019 live, exact Core/Web candidates promoted, and the customer-company onboarding flag OFF because no legitimate unlinked Auth identity existed.

The operator/user then explicitly supplied and authorized one real e-mail address for the production smoke. The address is intentionally omitted from Git, following ADRs 0100–0102.

## REAL NOW

- main at entry: 1bb7240873386a90c5b4c72bbb03c13007003dce
- open PRs at entry: 0
- migration 019: APPLIED
- Core: wandora/core:organization-adapter-candidate-0a7f36833188 / healthy
- Web: wandora/web:candidate-0a7f36833188 / healthy
- onboarding flag: OFF / absent
- organization_profiles: 0
- unlinked Auth users before invite: 0

Supabase Auth remained supabase/gotrue:v2.196.0, healthy, restart 0, closed public signup, mail autoconfirm disabled, SITE_URL https://app.wandora.com.br, Resend SMTP configured, and the app origin present in the redirect allow-list.

Public /accept-invite, /recover-access and /login all returned 200.

## PRE-EFFECT GATES

The authorized target passed collision checks:

- target auth rows: 0
- target Wandora identity mappings: 0
- auth users: 2
- pending invites: 0
- auth.one_time_tokens: 0

The protected service-role credential was read only from existing host custody and never printed or committed. A read-only admin request returned HTTP 200 immediately before the invite.

## CAPABILITY AUTHORITY / REUSE GATE

Supabase Auth remains authoritative for invite identity creation, invite tokens, invite e-mail, verification, password establishment and authenticated sessions.

Wandora remains authoritative only for the later business transition from an authenticated unlinked identity to Wandora identity, organization, owner membership and company profile. No Paperclip, Mastra, messaging or employee capability is involved in this invite step.

## DECISION / SECOND ADVERSARIAL REVIEW

Exactly one provider-native POST /auth/v1/invite was authorized with redirect_to=https://app.wandora.com.br/accept-invite.

Immediately before the effect, target collision and Wandora linkage were zero; Auth was healthy; SMTP/redirect were valid; /accept-invite was reachable; onboarding flag was still OFF; and no prior invite to this target existed in this slice.

No retry is permitted without reconciliation.

## EXECUTION

Exactly one invite request was issued.

- admin read: HTTP 200
- invite curl rc: 0
- invite HTTP: 200
- target auth rows: 1
- invited_at present: 1
- confirmation_sent_at present: 1
- confirmed: 0
- signed in: 0
- target one-time tokens: 1

No retry occurred.

## VALIDATION

Post-invite target state:

- target Wandora identity mapping: 0
- organization_profiles: 0
- unfinished hire operations: 0
- onboarding flag: OFF / absent

Auth, Core, Web, Paperclip and Messaging Gateway remained healthy with zero restarts.

One globally-enabled eligibility row exists for MEDICSPRO / ana-commercial-v1. It is pre-existing and unrelated to the invited target.

## RESULT

Exactly one real production invite is applied and acceptance is pending.

No organization/profile, employee, Paperclip binding, Mastra run, work item or outbound attempt was created by this slice.

Next transition requires recipient interaction:

open Wandora invite -> /accept-invite -> define first password -> normal authenticated session -> expected Wandora unlinked state

Only after that verified Auth transition may the final onboarding flag be activated for the real company-profile smoke.

## NEXT EXECUTABLE SLICE

**Customer Company Profile + First Access Onboarding — Invite Acceptance + Final Flag Activation + Company Profile Smoke V1**

Do not resend automatically. If delivery is questioned, reconcile Auth/SMTP provider evidence first.