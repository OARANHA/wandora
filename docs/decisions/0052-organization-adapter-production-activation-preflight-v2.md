# ADR 0052 — Organization Adapter Production Activation Preflight V2

- Status: **DRAFT — observation identifies a remaining privileged provider blocker; activation NOT authorized**
- Date: 2026-09-17
- Scope: fresh observation/plan-first production preflight after ADR 0050, without applying migrations, installing/configuring the live plugin, generating HMAC custody or recreating Core

## REAL NOW

Git reconciliation before repeating any prior operation:

```text
main = 5b0ddff86d9fafc765d2599d7434b2d5411d5da7
PR #95 = production plugin artifact merged/proven
PR #96 = continuity checkpoint merged
PR #97 = operator consoles + this preflight, under review
```

Observed live runtime:

```text
Core image              = wandora/core:team-read-b31db507
Core health             = healthy
Core networks           = wandora-core, wandora-data
Core published ports    = none
Organization Adapter    = OFF
Paperclip image          = wandora/paperclip:v2026.831.1
Paperclip health         = healthy
Paperclip host binding  = 127.0.0.1:3100 -> 3100/tcp
Gateway health           = healthy
Human Send enable flag  = absent / OFF
Gateway outbound flag   = absent / OFF
```

Corrected candidate remains loaded and not running:

```text
candidate tag = wandora/core:organization-adapter-candidate-068d30a49d9b
candidate Id  = sha256:f0ffa18271172e6e6e77f778f7b2f4f5302a84901909663525b8f665ad9f0c1e
running count = 0
```

Production Organization Adapter tables remain absent:

```text
wandora_private.control_plane_provider_bindings       = ABSENT
wandora_private.digital_employee_provider_bindings    = ABSENT
wandora_private.digital_employee_hire_operations      = ABSENT
```

No `paperclip-*.hmac` production custody file was found and Core has no Organization Adapter custody mount.

## PROVEN EVIDENCE

The canonical post-merge plugin artifact remains available in GitHub Actions and is not expired:

```text
workflow_run        = 35266676646
artifact_id         = 10516662930
artifact_name       = organization-adapter-plugin-f60715d042da4bbe4ac9068ea29dae2c986006bd
artifact_zip_sha256 = 121358ee9f09b910eae82d6a72e15ed8ed6285bd6fe8ab311232fca2928abfa4
package_sha256      = a4811f1d1f8521aeaf3930979ce12784f9b55e52390e24ead85300250d383e36
expires_at          = 2026-09-24T19:45:38Z
```

The accepted recovery backup/restore proof and candidate load from ADR 0049 were not repeated because real-state reconciliation showed they already exist and the candidate remains loaded.

Cloudflare Access for the two operator console hostnames is now independently proven before any origin route: unauthenticated `control.wandora.com.br` and `runtime.wandora.com.br` requests are redirected to Cloudflare Access, and direct public-origin TCP/443 probes to the VPS time out. This clears the Access prerequisite but does not create Paperclip administrative authority.

### Exact future Core composition — rendered only

The canonical base + database + Organization Adapter overlays were rendered with the already-loaded candidate image and current Core DB secret file path. No `docker compose up` was executed and the future Organization Adapter custody directory was not created.

Observed composition invariants:

```text
image = wandora/core:organization-adapter-candidate-068d30a49d9b
WANDORA_CORE_MODE = database
WANDORA_CORE_DB_USER = wandora_core_runtime
WANDORA_ORGANIZATION_ADAPTER_ENABLED = true
webhook = http://wandora-paperclip:3100/api/plugins/wandora.organization-adapter-v1/webhooks/employee-reconcile
custody target = /run/secrets/wandora/organization-adapter
custody mount = read-only
Core root filesystem = read-only
published Core ports = none
Human Send overlay = absent
Gateway outbound overlay = absent
rendered_config_sha256 = e393fe295c81e2ece5495b368c018f1f1bcda4175a639b8c07d173384d415274
```

## REMAINING BLOCKER — PAPERCLIP INSTANCE ADMIN

Live Paperclip `/api/health` reports:

```text
status = ok
deploymentMode = authenticated
deploymentExposure = private
commit = 65ec059bde30d98c92165b24a30a540800dd1f6f
bootstrapStatus = bootstrap_pending
bootstrapInviteActive = false
```

The exact pinned Paperclip source defines `bootstrap_pending` in authenticated mode as the state where no instance-admin role exists.

The same pinned source protects `POST /api/plugins/install` with `assertInstanceAdmin(req)` because plugin installation is an instance-wide privileged operation.

Therefore artifact readiness is no longer the blocker, and protected console transport is no longer the blocker. **Legitimate live administrative authority to install the artifact is still not established.** Silently bootstrapping or granting instance-admin authority would be a new privileged production effect and is outside this preflight.

## GAPS

1. Complete and validate the protected Paperclip operator-console origin bridge from ADR 0051; Access itself is already proven.
2. Establish or verify a legitimate Paperclip instance admin through an explicit separately reviewed provider-administration step.
3. The production Organization Adapter plugin remains uninstalled/unconfigured live.
4. No production company-scoped `secret_ref` / HMAC custody exists.
5. Migrations 010/011 remain intentionally absent.
6. The exact provider company target/configuration must be frozen only after the provider admin boundary is legitimate.

## DECISION

**Organization Adapter production activation is NOT authorized by Preflight V2.**

Do not apply 010/011 early, do not install/configure the plugin through an unbootstrapped provider, do not create HMAC material, and do not recreate the candidate Core.

The protected operator-console micro-slice may finish independently because it does not grant Paperclip instance-admin authority or activate the Organization Adapter. After the console is validated, the next provider prerequisite is a deliberate instance-admin bootstrap/verification slice.

After that prerequisite is satisfied, refresh mutable live observations and continue the activation plan from the same fail-closed order rather than repeating already-proven backup/restore/candidate-load work.

## SECOND ADVERSARIAL REVIEW

Rejected:

- treating ADR 0050 artifact availability as sufficient authorization to install it;
- treating Cloudflare Access as equivalent to Paperclip administrative authorization;
- bootstrapping an instance admin automatically merely to make the preflight green;
- using a tenant/company board identity as a substitute for instance-admin plugin installation authority;
- applying migration 010 because it is inert;
- applying 010/011 before provider administrative readiness;
- creating HMAC custody before the exact company/config/install target is frozen;
- starting the candidate Core before plugin/config, migrations and custody are separately proven;
- enabling Human Send or Gateway outbound as part of Organization Adapter work;
- repeating backup, restore proof or `docker load` because a prior conversation froze.

## VALIDATION / EFFECT AUDIT

At this checkpoint:

```text
Cloudflare Access operator gate = proven
production migrations applied = 0
production plugin installs = 0
production plugin configurations = 0
production Organization Adapter HMACs generated = 0
Core recreations = 0
Organization Adapter candidate containers started = 0
Human Send activations = 0
Gateway outbound activations = 0
customer hiring routes added = 0
```

This draft records evidence only. It must not be interpreted as activation authorization.
