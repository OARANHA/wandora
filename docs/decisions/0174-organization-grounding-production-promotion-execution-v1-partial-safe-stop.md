# ADR 0174 — Organization Grounding Production Promotion Execution V1 — Partial Safe Stop

Status: **EXECUTED PARTIALLY / SAFE STOP / WEB ROLLED BACK / NO CUSTOMER GROUNDING CREATED**  
Date: 2026-09-22

## Context

ADR 0173 authorized a separate production execution for migration 017, the grounding-aware Core and the customer `/company` surface, with strict order:

```text
fresh backup + restore-check
  -> migration 017 + verifier
  -> Core candidate proof
  -> Core promotion
  -> Web candidate proof
  -> Web promotion
  -> validation
  -> STOP
```

The execution was resumed across a chat/tool interruption. Per ADR 0168, every prior operation was reconciled from real tool/runtime state before any retry.

## Proven execution evidence

Canonical Git remained:

```text
main = 1a97f8bfc657fa6b3f1a0ded7771e304e530f8e3
open PRs = 0
post-merge push CI = 4/4 GREEN
```

The exact frozen artifacts from ADR 0173 were recovered and hash-verified.

Core artifact:

```text
ZIP sha256     = fca39cf5dd03cf12aa934b3d5b55258c25a0ed334de48cbb8863bf97ff1e3bfb
archive sha256 = f4a17b776c85b377a4c2f150852eb99553e085d6f30a0d7d72d79d152e067498
manifest       = sha256:7d8d9e5c83dc70b73e7b2ff56599d402fe4413676d3fab691fdc56069234727b
config         = sha256:f6b589b6dbfc84d86fd5eae10593e99e6c1ecbee08fc943ba41ad4bc5d966b0a
```

Web artifact:

```text
ZIP sha256     = 73ef5b75f3b021861ce2fe14b305dc030bdebe276aa82e688166d8e14687faf6
archive sha256 = f90927f7622f27bfafe003c7c108043f8926d0565c98bf84d21b320883c673a3
OCI config     = sha256:96779cdf6106d20cea39e98a82b47deb2d9df2ee05d50169f1d9a95274a1c9b2
OCI manifest   = sha256:b9f2ebebc34c731757021e53f578aa6e4311823876c7ddeaf229133fefb13c5d
```

Docker 29/containerd reports the Web OCI manifest digest as image ID; the artifact manifest's historical `image_id` field records the OCI config digest. The archive and both internal digests are internally consistent, so no artifact mismatch exists.

## Backup / restore boundary

A pre-migration execution snapshot was captured before migration 017:

```text
/home/wandora-admin/executions/organization-grounding-production-promotion-execution-v1-20260922T122703Z/wandora-pre-017.dump
sha256 = f0892637b1634e7baaf47a25c1cc6fb958583c8933aca270fccfee7c40dc14da
```

A role-aware isolated restore-check on `supabase/postgres:17.6.1.136` restored the current baseline with migration 017 absent and four organizations. The required Wandora roles were recreated with their reviewed least-privilege shapes.

An additional pre-migration snapshot was also captured before schema mutation:

```text
/home/wandora-admin/backups/organization-grounding-production-promotion-execution-v1-20260922T122859Z/wandora-pre-017.dump
sha256 = e5571c8e1e6f59b4b165d098f796382ec4d71266b3e055822dfcdb3a0dc37227
```

Its independent restore proof later reconfirmed the same pre-017 baseline. It is additional recovery evidence, not a reason to repeat migration 017.

## Migration 017 — LIVE / GREEN

Migration source:

```text
bc14aedf77b2a12ab1e9d022fa7fddaa4ac3ec343c18f65f700755dd268a2fdd
```

Verifier source:

```text
6c63c586101df1f8fd7ab2638663ea035f7878698d18c7149838987edd7fa2d7
```

Migration 017 was applied exactly once live. The canonical verifier returned:

```text
ORGANIZATION_GROUNDING_CONTRACT_V1_OK
```

Postverify:

```text
wandora.organization_grounding_entries = PRESENT
grounding rows                          = 0
```

Do not reapply migration 017 in a future session merely because this execution ended partially.

## Core promotion — LIVE / GREEN

The exact Core candidate was proven bounded against the verified live schema:

```text
healthz = 200
readyz  = 200
Human Send flag = absent
Gateway outbound flag = absent
```

The live Core was then promoted to:

```text
wandora/core:organization-adapter-candidate-d90b225e6cc2
manifest/image id = sha256:7d8d9e5c83dc70b73e7b2ff56599d402fe4413676d3fab691fdc56069234727b
healthy / restart 0 / readyz 200
```

The promotion created no new MEDICSPRO work, grounding, model call or outbound attempt.

## Web candidate discovery — real defect

The exact Web candidate passed its private bounded checks:

```text
/healthz       = 200
/company       = 200
/api/v1/me     = 401 without session
```

The candidate was promoted, but final public validation found:

```text
GET /api/v1/organizations/<MEDICSPRO>/grounding
public Web edge = 404 from nginx
direct Core from Web namespace = 401
```

Source inspection proved the cause:

- `CompanyPage.tsx` calls the canonical grounding endpoints;
- `apps/web/nginx.conf` contains explicit Core proxy allowlists for existing customer routes;
- no grounding read/create/correct/retire route is present in that Nginx allowlist.

Therefore the customer surface artifact is not production-functional even though the UI/build verifier is GREEN.

## Web rollback — EXECUTED / GREEN

Per ADR 0173, only Web was rolled back.

Current Web:

```text
wandora/web:candidate-65908b76c667
image id = sha256:ade2aadf2c1b3e15d1b239f259a70237d85965b05dd4b209469c2f332cefb36e
healthy / restart 0
/company public = 200
/api/v1/me unauthenticated = 401
```

Core + verified migration 017 remain live because both are additive/healthy and rollback of Web does not require database restore.

Paperclip and Messaging Gateway were not recreated.

## Final safety state

```text
migration 017                    = LIVE / verified
grounding rows                   = 0
Core                             = new grounding-aware candidate / healthy / ready
Web                              = previous production image / healthy
MEDICSPRO works                  = 2
MEDICSPRO outbound attempts      = 0
Human Send                       = OFF
Gateway outbound                 = OFF
Paperclip                        = healthy / unchanged
Messaging Gateway                = healthy / unchanged
real MEDICSPRO fact/rule         = none
new model call caused by slice   = 0
```

## Capability Authority / Reuse Gate

No new capability is required. The failure is a Web transport/allowlist integration gap, not evidence for a new grounding service, table, RAG, retrieval, memory, vector or provider subsystem.

ADR 0168 remains binding:

> Portability = contract decoupling, not implementation duplication.

## Decision

The full Organization Grounding Production Promotion Execution V1 is **not complete**.

Accepted safe partial state:

1. migration 017 remains live and verified;
2. grounding-aware Core remains live and ready;
3. previous Web remains live;
4. grounding rows remain zero;
5. external effects remain OFF.

The next slice is:

**Customer Web Grounding API Bridge / Nginx Allowlist Correction V1 — CODE ONLY / NO PRODUCTION EFFECT**

It must add only the missing reviewed Web proxy surface for the existing canonical Core grounding contracts, add a verifier that proves the proxy routes rather than only the React calls, and produce a new immutable Web artifact.

A later separate Web-only promotion preflight/execution must qualify that new artifact. Do not reuse the rejected Web artifact for customer grounding.

No real MEDICSPRO grounding may be created until the corrected customer route is live and validated.
