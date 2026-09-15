# Human Browser Session V1 — Production Activation

Date: 2026-09-15
Status: LIVE

## Scope

This note records production activation evidence for ADRs 0017, 0018 and 0019. It does not change their product or authorization decisions.

## Live runtime

- Web image: `wandora/web:web-human-session-76698780`
- Core image: `wandora/core:human-session-82aacc6d`
- Web and Core are healthy.
- Core remains private with no generic public hostname or host port.

## Human identity and tenant proof

A provisioned beta Supabase Auth identity is linked to the canonical owner of `Empresa Exemplo` through the reviewed one-off operation merged in PR #43.

Live canonical postchecks show:

- exactly one active owner membership for the beta owner in `Empresa Exemplo`;
- exactly one `attention-required` example work item;
- exactly one canonical supervised proposal for the example company.

No personal e-mail, Auth subject or credential is recorded in this document.

## Web boundary proof

Post-deploy public smoke proved:

- `/login` -> 200;
- `/healthz` -> 200;
- `/api/v1/me` without a session -> 401;
- reviewed organization work read without a session -> 401;
- unreviewed `/api/` route -> 404;
- `/internal/` route -> 404.

A real browser login using the provisioned beta account succeeded and entered the authenticated customer shell.

## Product state

`Trabalho` is no longer a front-end work fixture: its production implementation consumes the reviewed tenant-authorized Core read contract. The shell derives the visible human and organization context from `/api/v1/me`.

Other customer surfaces, including `Conversas` and broader dashboard preview content, must not be described as canonical until their own Core read contracts replace remaining preview data.

No send, edit-send, dismiss or autonomous outbound action was introduced by this activation.

## Next slice

The next customer-path slice is a separately reviewed **Conversas Read V1** contract through Wandora Core, preserving the same tenant authorization and provider-neutral boundaries. Human outbound actions remain a later explicit contract.
