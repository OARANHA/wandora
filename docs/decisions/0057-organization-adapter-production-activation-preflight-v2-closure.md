# ADR 0057 — Organization Adapter Production Activation Preflight V2 Closure

- Status: **Accepted preflight — activation sequence frozen; activation NOT executed**
- Date: 2026-09-17
- Supersedes: ADR 0052's remaining instance-admin/provider-target blockers
- Scope: close Production Activation Preflight V2 after operator consoles, legitimate Paperclip administration, and one internal provider-company bootstrap

## REAL NOW

Canonical Git before this documentation closure:

```text
main = e42f29967892c626c1ca790ee41ec0ceabc251ed
```

Live runtime reverified:

```text
Core image           = wandora/core:team-read-b31db507
Core health          = healthy
Organization Adapter = OFF

Paperclip image      = wandora/paperclip:v2026.831.1
Paperclip health     = healthy
bootstrapStatus      = ready
deployment mode      = authenticated
exposure             = private
public operator URL  = https://control.wandora.com.br

Human Send           = OFF
Gateway outbound     = OFF
```

Protected operator consoles are live behind Cloudflare Access:

```text
control.wandora.com.br -> Paperclip
runtime.wandora.com.br -> isolated Mastra Studio
```

Direct public-origin TCP/443 bypass remains blocked and origin TLS is valid.

## INTERNAL CANARY TARGET — FROZEN

Canonical Wandora organization:

```text
3ddc8ca6-8961-4ad3-99e0-d7f869249a61
Wandora Internal Supervised Proof
```

Paperclip provider company:

```text
815d499e-4231-4e6b-b7fc-67f0ba22a595
Wandora Internal Supervised Proof
```

Provider-side bootstrap proof:

```text
matching company count = 1
owner/active membership = 1
company.created events = 1
agents = 0
total Paperclip companies = 1
```

`Empresa Exemplo` deliberately remains without a Paperclip provider company at this stage.

## DATABASE STATE — STILL PRE-ACTIVATION

Production Organization Adapter tables remain absent:

```text
wandora_private.control_plane_provider_bindings    = ABSENT
wandora_private.digital_employee_provider_bindings = ABSENT
wandora_private.digital_employee_hire_operations   = ABSENT
```

Migration order remains fixed:

1. apply `20260916_010_organization_adapter_state_v1.sql`;
2. run `VERIFY_20260916_ORGANIZATION_ADAPTER_STATE_V1.sql`;
3. stop on any failure;
4. apply `20260916_011_organization_adapter_service_contract_v1.sql`;
5. run `VERIFY_20260916_ORGANIZATION_ADAPTER_SERVICE_CONTRACT_V1.sql`;
6. stop on any failure.

Migration 011 grants Core only SELECT on `control_plane_provider_bindings`; Core does not receive INSERT there.

Therefore the provider-company binding is an explicit operator-owned activation step, not a runtime self-provisioning side effect.

The future insert is conceptually:

```sql
INSERT INTO wandora_private.control_plane_provider_bindings
  (organization_id, provider, provider_company_ref)
VALUES
  (
    '3ddc8ca6-8961-4ad3-99e0-d7f869249a61',
    'paperclip',
    '815d499e-4231-4e6b-b7fc-67f0ba22a595'
  );
```

No `ON CONFLICT DO UPDATE` is allowed in the first activation. Any existing or conflicting row must stop the run for operator reconciliation.

## RECOVERY / CANDIDATE — REVERIFIED, NOT REPEATED

Accepted backup remains present:

```text
/home/wandora-admin/backups/postgres-pre-org-adapter-20260917T051624Z.dump
mode   = 0600
sha256 = baa73742dfc6ef90f2cb4ff500d72da317f8d7c91a4db7e0c45b0a1fbcc7fe77
```

The already-proven restore proof was not repeated.

Corrected candidate remains loaded and not running:

```text
tag = wandora/core:organization-adapter-candidate-068d30a49d9b
id  = sha256:f0ffa18271172e6e6e77f778f7b2f4f5302a84901909663525b8f665ad9f0c1e
running count = 0
```

Exact future Core composition was already rendered in ADR 0052:

```text
WANDORA_ORGANIZATION_ADAPTER_ENABLED = true
webhook = http://wandora-paperclip:3100/api/plugins/wandora.organization-adapter-v1/webhooks/employee-reconcile
custody = /run/secrets/wandora/organization-adapter (read-only)
Core root filesystem = read-only
Core published ports = none
Human Send overlay = absent
Gateway outbound overlay = absent
rendered_config_sha256 = e393fe295c81e2ece5495b368c018f1f1bcda4175a639b8c07d173384d415274
```

## PRODUCTION PLUGIN ARTIFACT — AVAILABLE + UNEXPIRED

Canonical source:

```text
integrations/paperclip/plugins/organization-adapter-v1/
```

Current GitHub Actions artifact revalidation:

```text
workflow_run = 35266676646
artifact_id  = 10516662930
name         = organization-adapter-plugin-f60715d042da4bbe4ac9068ea29dae2c986006bd
expired      = false
expires_at   = 2026-09-24T19:45:38Z
zip sha256   = 121358ee9f09b910eae82d6a72e15ed8ed6285bd6fe8ab311232fca2928abfa4
package      = paperclip-plugin-wandora-organization-adapter-0.1.0.tgz
package sha256 = a4811f1d1f8521aeaf3930979ce12784f9b55e52390e24ead85300250d383e36
```

If the artifact is expired at execution time, activation must stop and rebuild/restage through the canonical CI workflow. Do not substitute a local unproven package.

The live Paperclip data volume is persistent at `/paperclip`. The future local install staging root is therefore frozen as:

```text
/paperclip/operator-packages/wandora-organization-adapter-v1/
  a4811f1d1f8521aeaf3930979ce12784f9b55e52390e24ead85300250d383e36/
    package/
```

The tarball must be verified before extraction, and the extracted package must contain only the canonical five-file package shape before `POST /api/plugins/install`.

Future install request shape:

```json
{
  "packageName": "/paperclip/operator-packages/wandora-organization-adapter-v1/a4811f1d1f8521aeaf3930979ce12784f9b55e52390e24ead85300250d383e36/package",
  "isLocalPath": true
}
```

The live registry currently proves:

```text
plugins count = 0
wandora.organization-adapter-v1 count = 0
```

## FUTURE HMAC / PAPERCLIP SECRET — RENDER ONLY

No production HMAC exists now.

For the frozen Paperclip company reference:

```text
sha256(providerCompanyRef)
= e3927793bfea0c30851b6e59ed2d1844323c9b2aa852db2f8011dc393449f158
```

Future Core custody filename:

```text
paperclip-e3927793bfea0c30851b6e59ed2d1844323c9b2aa852db2f8011dc393449f158.hmac
```

Paperclip's current configured secret provider resolves to `local_encrypted`; managed mode defaults to `paperclip_managed`.

At activation time, generate one strong random HMAC value once and write the same material to both reviewed custody boundaries:

1. Core mounted file, restrictive ownership/mode, never logged;
2. Paperclip company secret through the authenticated company-secret route.

Future Paperclip secret request shape:

```json
{
  "name": "Wandora Organization Adapter HMAC",
  "key": "wandora.organization-adapter.hmac",
  "provider": "local_encrypted",
  "managedMode": "paperclip_managed",
  "value": "<generated-at-activation; never logged or committed>"
}
```

The returned Paperclip secret UUID becomes the only config reference.

Future company-scoped plugin configuration:

```json
{
  "companyId": "815d499e-4231-4e6b-b7fc-67f0ba22a595",
  "configJson": {
    "hmacSecret": {
      "type": "secret_ref",
      "secretId": "<Paperclip secret UUID returned by create>"
    }
  }
}
```

The pinned Paperclip route independently validates that the referenced secret belongs to the selected company before persisting config.

## FROZEN ACTIVATION ORDER

A later **separate execution** may proceed only in this order:

1. revalidate Git `main`, live health, effect switches, backup, candidate, artifact availability, and exact canary company identity;
2. apply migration 010 and its verifier;
3. apply migration 011 and its verifier;
4. insert exactly one operator-owned `paperclip` control-plane binding for the internal Wandora organization; fail on any preexisting/conflicting row;
5. verify the exact binding and confirm customer/API contracts still expose no provider IDs;
6. materialize the canonical CI plugin package into the frozen persistent staging path and verify outer artifact/package hashes;
7. install exactly plugin `wandora.organization-adapter-v1@0.1.0` as instance-admin and verify manifest/capabilities/worker readiness;
8. generate one per-company HMAC exactly once without printing it;
9. write Core custody file and create the matching Paperclip company secret;
10. configure the plugin only for `815d499e-4231-4e6b-b7fc-67f0ba22a595` using that company-owned `secret_ref`;
11. verify plugin config scope, secret binding, worker health and **still zero managed Ana resources before the canary call**;
12. re-render the exact Core candidate composition against current live state;
13. start/promote the candidate Core with Organization Adapter enabled but no customer hire route, Human Send OFF and Gateway outbound OFF;
14. run the separately reviewed internal canary for `ana-commercial-v1`;
15. validate one managed Ana, replay stability, Wandora provider binding/operation state and absence of customer/provider leakage;
16. stop before any customer-facing hire/activate capability.

## CROSS-COMPANY GATE

The first live canary uses only `Wandora Internal Supervised Proof`.

Before any customer-facing activation, the accepted cross-company isolation gate must still be satisfied. The preferred ordering is:

1. prove the internal canary first;
2. only then decide whether `Empresa Exemplo` should receive the second provider company needed for live A/B isolation verification;
3. do not create the second provider company merely to make this preflight look complete.

The existing disposable A-secret -> B-target denial proof remains valid evidence, but it does not authorize skipping any explicit live gate still required by the activation ADRs.

## STOP CONDITIONS

Abort before the next step if any of the following occurs:

- `main` or provider artifact provenance changed unexpectedly;
- backup is missing/hash-changed;
- candidate image/tag/digest changed or is already running unexpectedly;
- migrations are partly present before activation starts;
- provider binding already exists or conflicts;
- Paperclip company identity/name/status/membership differs;
- any managed agent already exists unexpectedly;
- Organization Adapter/Human Send/Gateway outbound is already enabled unexpectedly;
- plugin registry is non-empty in an unexplained way;
- artifact/package hash differs;
- plugin install requests additional capability beyond the accepted manifest;
- Paperclip secret or plugin config is cross-company or ambiguous;
- HMAC custody cannot be created with restrictive ownership/mode;
- any step returns uncertain external-effect status.

Do not blindly retry uncertain provider effects.

## SECOND ADVERSARIAL REVIEW

Rejected:

- calling this preflight permission to activate immediately;
- applying migration 010 early because it is inert;
- letting Core auto-create provider bindings;
- using an UPSERT for the first provider binding;
- installing a locally rebuilt/unproven plugin artifact;
- storing raw HMAC in environment variables or Wandora PostgreSQL;
- configuring the plugin with a secret belonging to another company;
- generating HMAC before the exact company/artifact/binding sequence is frozen;
- creating the second Paperclip company before the first canary is proven;
- enabling Human Send or Gateway outbound as part of Organization Adapter activation;
- exposing customer `Contratar/Ativar funcionário` together with the internal canary.

## DECISION

**Production Activation Preflight V2 is complete.**

It is green as an observation/plan artifact: the operator consoles are protected, legitimate Paperclip instance-admin authority exists, the internal provider company target is frozen, recovery/candidate evidence is current, the canonical plugin artifact is available, and the full future migration/binding/install/secret/config/Core order is now explicit.

**No Organization Adapter activation is performed or authorized by this ADR itself.**

The next executable slice is a separate **Organization Adapter Production Activation Execution V1**. It must begin with REAL NOW and a second adversarial review of this frozen sequence before any migration, HMAC, plugin install/config, provider binding, or Core activation is executed.
