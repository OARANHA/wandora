# ADR 0098 — Customer Owner Transactional E-mail GoTrue SMTP Activation Preflight V1

- Status: **Accepted preflight — activation candidate versioned / rollback frozen / live GoTrue unchanged / no e-mail sent**
- Date: 2026-09-18
- Scope: freeze and prove the exact one-service Supabase Auth SMTP activation procedure after ADR 0097 provider/domain/credential provisioning, without changing live Auth SMTP or sending mail.

## REAL NOW

Canonical repository state at entry:

```text
main = 98c6460ee9cc1ba22fa0d0c4a77addec99c23274
open PRs = 0
ADR 0097 = complete / Resend sender foundation live
```

Observed live runtime at entry:

```text
supabase-auth = supabase/gotrue:v2.196.0 / healthy
wandora-web = healthy
wandora-core = healthy
wandora-messaging-gateway = healthy

GOTRUE_SMTP_HOST        = supabase-mail
GOTRUE_SMTP_PORT        = 2500
GOTRUE_SMTP_ADMIN_EMAIL = admin@example.com
GOTRUE_SMTP_SENDER_NAME = fake_sender
```

The live Auth container is Compose service `auth` in project `supabase`, working directory `/opt/wandora/stacks/supabase`, with exact source files:

```text
/opt/wandora/stacks/supabase/docker-compose.yml
/opt/wandora/stacks/supabase/docker-compose.wandora.yml
```

Docker Compose is `v5.5.1`. The GoTrue image default user is `supabase` UID/GID 1000.

The dedicated Resend credential remains only at:

```text
/opt/wandora/data/supabase/secrets/gotrue_smtp_pass
root:wandora-ops / 0640 / 36 bytes
```

No live service environment contains the exact credential value.

## PROVEN EVIDENCE — LIVE SOURCE HASHES

At preflight entry:

```text
docker-compose.yml
  sha256 = f6724c97f1ca555b700f5ecf630e8a2e5114682b64ca94158061326187139183

docker-compose.wandora.yml
  sha256 = 433ce0a9b96198cbd91bb0df0301efba471b5ce3acd33a1a0abe8558e8b7960d

.env
  sha256 = 6f3926f8fa00939052a3419887d298d61909e68a0ebc4225f7a31d5501fd92f0
```

The current non-secret SMTP values are still the old development relay. The current `.env` also contains an upstream `SMTP_PASS` source value and therefore must not be rendered to diagnostics after the activation overlay is introduced until that source is blanked.

## GAP FOUND BY THE SECOND ADVERSARIAL REVIEW

ADR 0096 had already selected file-backed secret custody, but this preflight tested the exact local Compose behavior rather than assuming Docker-secret semantics.

A disposable proof using the real host secret and exact GoTrue image showed:

```text
service user = supabase / UID 1000
host secret  = root:wandora-ops / 0640
short-syntax file-backed secret read = FAIL
```

The reason is that local Docker Compose uses a bind-backed file secret. The file permissions remain host permissions, and the container user `supabase` is not a member of the host `wandora-ops` numeric group.

The cleaner long-syntax attempt was also tested:

```yaml
uid: "1000"
gid: "1000"
mode: 0400
```

Docker Compose v5.5.1 emitted:

```text
secrets uid, gid and mode are not supported, they will be ignored
```

and the read still failed.

Therefore weakening the host secret to world-readable, hard-coding the host `wandora-ops` GID into the container, or pretending Compose remaps file-secret ownership are all rejected.

## DECISION — VERSIONED AUTH STARTUP CANDIDATE

The Wandora Supabase overlay now carries the reviewed Auth-only secret startup candidate.

The candidate:

1. keeps the host secret at `root:wandora-ops/0640`;
2. removes the inherited `GOTRUE_SMTP_PASS` from the created container configuration with `!reset null`;
3. mounts only `gotrue_smtp_pass` into Auth;
4. starts a minimal root shell only to read the protected file;
5. exports `GOTRUE_SMTP_PASS` in process memory;
6. immediately executes BusyBox `su -p` to the image's existing `supabase` user;
7. executes `/usr/local/bin/auth`;
8. leaves the final PID 1 running as UID/GID 1000.

The accepted wrapper is:

```sh
GOTRUE_SMTP_PASS="$(cat /run/secrets/gotrue_smtp_pass)"
export GOTRUE_SMTP_PASS
exec /bin/su -p -s /bin/sh supabase -c 'exec /usr/local/bin/auth'
```

Compose dollar escaping remains `$$` in the versioned YAML so interpolation occurs inside the container, never during Compose rendering.

## PROVEN EVIDENCE — PRIVILEGE DROP

A disposable no-network proof using the real secret path and exact GoTrue image established that the root wrapper can read the secret, preserve the exported variable through `su -p`, and execute as:

```text
UID = 1000
GID = 1000
```

A separate PID-1 proof showed:

```text
PID1_CMD = sleep 30
PID1_UID = 1000
```

after the same `exec su -p ... exec ...` pattern.

No resident root parent remains after the handoff. Root exists only during the short secret-read/drop-privilege startup window.

## PROVEN EVIDENCE — ENVIRONMENT RESET SEMANTICS

A minimal disposable Compose proof used an upstream-style interpolated mapping:

```yaml
GOTRUE_SMTP_PASS: ${SMTP_PASS}
```

plus the candidate:

```yaml
GOTRUE_SMTP_PASS: !reset null
```

The created container had:

```text
GOTRUE_SMTP_PASS present in Config.Env = false
```

both when the interpolation source contained a legacy value and when it was empty.

Important diagnostic nuance: `docker compose config` may still render the upstream interpolated value before the reset is reflected in the final created-container environment. Therefore the future execution must blank the `SMTP_PASS` source before any rendered-config diagnostic is permitted.

## FUTURE NON-SECRET SMTP STATE

The execution slice will set:

```text
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=
SMTP_ADMIN_EMAIL=acesso@notify.wandora.com.br
SMTP_SENDER_NAME=Wandora
```

`SMTP_PASS=` remains as an intentionally empty upstream compatibility placeholder. The actual credential exists only in the host secret file and is injected inside the container immediately before GoTrue starts.

A protected temporary future-state `.env` simulation plus the exact branch overlay proved:

```text
real Resend secret in rendered Compose = false
only Auth mounts gotrue_smtp_pass = true
SMTP host/port/user/from/name = exact selected contract
wrapper = exact reviewed startup
```

## EXACT ONE-SERVICE ACTIVATION COMMAND

After the future execution has atomically installed the reviewed overlay and future non-secret SMTP values, the only service recreation command is:

```sh
cd /opt/wandora/stacks/supabase
docker compose   -f docker-compose.yml   -f docker-compose.wandora.yml   up -d --no-deps --force-recreate auth
```

The exact branch candidate was dry-run against the live base with the future non-secret SMTP values.

Observed plan:

```text
Container supabase-auth Recreate
Container supabase-auth Recreated
Container ..._supabase-auth Starting
Container ..._supabase-auth Started
```

No database, API gateway, Studio, Realtime, Storage, Core, Web, Gateway or Paperclip recreation appeared in the plan.

## ROLLBACK SNAPSHOT

A protected same-host rollback snapshot was frozen without touching the running stack:

```text
/home/wandora-admin/backups/gotrue-smtp-activation-preflight-v1-20260919T012450Z
```

Properties:

```text
directory mode = 0700
files mode     = 0600
base compose   = byte-identical to live
Wandora overlay= byte-identical to live
SMTP rollback  = exactly the six SMTP_* entries only
SHA256SUMS     = present
metadata       = main SHA + Auth image/container identity
```

The SMTP rollback file contains values and is therefore protected operator material. Its contents must never be printed into chat, logs or Git.

## FUTURE ACTIVATION ORDER

The later execution must revalidate there is no drift, then:

1. verify canonical `main` still contains this accepted candidate;
2. verify live base Compose hash and current Auth image still match the preflight assumptions, or stop for review;
3. create a fresh rollback snapshot if any authorized non-SMTP live source changed after this preflight;
4. atomically update only the six SMTP_* lines in the live `.env` to the future state above, with `SMTP_PASS=` empty;
5. install the exact canonical `docker-compose.wandora.yml`;
6. render Compose only after `SMTP_PASS` is blank and prove the real secret value is absent;
7. run the one-service command with `--no-deps --force-recreate auth`;
8. require `supabase-auth` healthy with no restart loop;
9. verify final PID 1 UID is 1000;
10. verify non-secret GoTrue SMTP values are the selected Resend contract;
11. prove relay DNS/TCP/STARTTLS from the recreated Auth container;
12. optionally prove `AUTH` + immediate `QUIT` only, still with no `MAIL FROM`, `RCPT TO` or `DATA`;
13. verify Auth/recovery/eligibility/hire counters are unchanged;
14. keep invite, recovery and e-mail test outside the activation slice unless separately authorized.

## EXACT ROLLBACK

If activation health or verification fails:

1. do not send any e-mail;
2. restore the prior `docker-compose.wandora.yml` from the protected rollback snapshot;
3. restore exactly the six prior SMTP_* entries from the protected rollback snapshot;
4. render only a safe/non-secret summary;
5. recreate only `auth` with the same `--no-deps --force-recreate auth` command;
6. require Auth healthy;
7. verify the prior non-operational `supabase-mail:2500` state is restored;
8. keep the Resend key unused and revoke it if compromise is suspected or activation is abandoned.

Restoring the old non-operational mail relay is an acceptable rollback because rollback restores the last proven production state rather than silently selecting a second transport.

## SECOND ADVERSARIAL REVIEW — REJECTED OPTIONS

Rejected:

- make the secret `0644` so the non-root user can read it;
- change host ownership away from `root:wandora-ops`;
- hard-code host group GID 987 into the container;
- trust long-syntax secret `uid/gid/mode`, which the current Compose explicitly ignores;
- leave a long-running root GoTrue process;
- use a custom image only to add `gosu`/full `setpriv` when the pinned image already supplies a tested `su` path;
- put the Resend credential in `.env`, Compose, Git or a browser-visible setting;
- render Compose diagnostics while the legacy `SMTP_PASS` value is still present;
- recreate the whole Supabase stack;
- let dependency recreation occur implicitly;
- send a test message as part of activation proof;
- modify invite/recovery paths, JWTs, signup settings, customer-hire flags, Human Send or Gateway outbound in the same change.

## EXECUTION

This preflight performed only no-effect or disposable proof work:

- canonical Git/main/open-PR verification;
- current live Compose/runtime/image/user inspection;
- live source hashing;
- disposable environment-reset proofs;
- disposable secret readability proofs;
- disposable long-syntax ownership proof;
- disposable privilege-drop/PID-1 proof;
- protected rollback snapshot creation;
- exact branch candidate rendering against a protected temporary future-state env copy;
- exact one-service Docker Compose dry-run.

The branch `preflight/gotrue-smtp-activation-v1` versions the candidate, but this preflight does not deploy it to the VPS.

## VALIDATION / NO-EFFECT PROOF

The preflight must close with:

```text
live GoTrue SMTP host/port/from/name = unchanged
supabase-auth container identity     = unchanged
supabase-auth recreation             = false
invite sent                          = false
recovery sent                        = false
test e-mail sent                     = false
Auth users/recovery tokens           = unchanged
tenant eligibility                   = unchanged
unfinished hires                     = unchanged
Human Send                           = OFF
Gateway outbound                     = OFF
```

Disposable proof containers/files must be removed after final validation.

## RESULT

**Customer Owner Transactional E-mail GoTrue SMTP Activation Preflight V1 is accepted.**

The provider foundation already exists, and the exact Auth startup/secret/rollback path is now proven without activating it.

## NEXT EXECUTABLE SLICE

**Customer Owner Transactional E-mail GoTrue SMTP Activation Execution V1**

That execution may install the reviewed non-secret SMTP values and versioned Auth overlay and recreate **only** `supabase-auth`.

It must still **not** send an invite, recovery or e-mail test. Real customer-owner invitation remains a later separately reviewed effect.
