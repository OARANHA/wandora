# Wandora Core — Multi-tenant/Auth Contract Freeze V1

This slice freezes the minimum Wandora-owned identity, company, membership and messaging-connection boundaries before customer UI or business workflows are added.

## Human-facing principle

People should experience Wandora as a company with a team, responsibilities and connected tools — not as Supabase, Evolution, RLS or provider IDs. These contracts intentionally hide infrastructure so later product screens can stay simple.

## Canonical identities

- `organization.id` is the Wandora company/tenant ID.
- `user.id` is the Wandora human-user ID.
- external login identities map through `user_identities`; a Supabase Auth `sub` is not the Wandora user ID.
- `messaging_connection.id` is the Wandora connection ID; Evolution instance names remain private provider bindings.

Provider IDs never become customer-facing identifiers.

## Initial human roles

V1 deliberately keeps roles small:

- `owner` — company governance authority; ownership, membership and high-impact settings.
- `admin` — operational administration delegated by the owner, without redefining company ownership.
- `member` — normal human teammate. Membership proves tenant belonging but does not automatically grant every business action.

Role is only one authorization input. Sensitive actions, employee tools, billing, approvals and future domain capabilities remain Wandora Core policy decisions.

`can_access_messaging_connection()` proves only tenant-scoped visibility/access to the canonical connection. It is **not** permission to send arbitrary messages. Sending still requires a Wandora Core capability/policy decision and any required human approval.

## Supabase Auth mapping

The database reads the authenticated subject from `request.jwt.claim.sub` and resolves it through `wandora.user_identities` with provider `supabase`.

This keeps login/session infrastructure replaceable while giving Wandora a stable canonical user ID.

## Tenant isolation

Defense is layered:

- Wandora Core owns business authorization;
- canonical tables carry `organization_id` where tenant ownership exists;
- authenticated reads use PostgreSQL RLS as defense in depth;
- suspended memberships lose tenant access;
- provider bindings live in `wandora_private` and are not readable by the authenticated role.

The verifier creates two organizations and proves that a user authenticated for one cannot resolve or read the other organization's messaging connection even when the foreign UUID is known.

## Audit actor contract

Future audit events must always carry a canonical `organization_id`, `actor_type` and Wandora-owned `actor_id`.

For humans, `actor_id` is the canonical Wandora `user.id`. Digital employees will use their future canonical digital-employee ID; provider/runtime IDs such as Supabase Auth subjects, Evolution instances or Mastra run IDs never serve as audit actor IDs.

## Verification

`verify.sh` runs only against a disposable PostgreSQL container using the same Supabase PostgreSQL 17.6.1.136 image family as the laboratory foundation. It does not mutate the live Wandora Supabase database.

```bash
bash verify.sh
```

Success ends with `CORE_MULTITENANT_AUTH_V1_OK` and `verify=ok`.
