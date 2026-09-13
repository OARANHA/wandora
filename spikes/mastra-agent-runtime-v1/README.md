# Mastra Agent Runtime Spike V1

Status: **validated laboratory spike**

Purpose: prove that Mastra can sit behind a Wandora-owned `AgentRuntime` boundary without leaking Mastra-specific runtime objects into Wandora contracts.

## Tested versions

- Node.js `22.23.2`
- `@mastra/core` `1.66.0`
- `mastra` `1.29.0`
- `zod` `4.6.4`
- `tsx` `4.23.13`
- TypeScript `6.0.3`
- `@types/node` `26.5.1`

The Docker base is pinned by digest in `Dockerfile`.

## Proof shape

```text
Wandora contract
  -> MastraAgentRuntime adapter
      -> registered Mastra workflow
          -> deterministic Mastra tool
      -> Wandora result contract
```

The sample operation is intentionally simple (`normalize-contact`) and uses no model provider. The spike is about runtime boundaries and reproducibility, not model quality.

## Validated outcomes

- typed Mastra tool executes successfully;
- tool executes through a committed Mastra workflow;
- the Wandora adapter returns only `ok`, `operation`, and Wandora-owned `output`;
- Mastra internals such as `runId`, workflow steps and execution path do not cross the adapter boundary;
- invalid input is rejected rather than returned as a successful Wandora result;
- strict TypeScript typecheck passes;
- `mastra build` succeeds;
- the verification suite passes inside Docker with networking disabled.

## Run locally

Use Node 22.13+; the validated host runtime was Node 22.23.2.

```bash
npm install
npm run verify
npm run build
```

Container verification:

```bash
docker build -t wandora/mastra-spike:v1 .
docker run --rm --network none wandora/mastra-spike:v1
```

## Important limits

This does **not** declare Mastra production-ready by itself. The spike does not prove model-provider quality, persistent runtime storage, long-running durability, production observability, horizontal scaling, or customer workload isolation.

Mastra currently falls back to in-memory storage in this spike. That is intentional: no runtime storage choice is being promoted to canonical business storage. Wandora transactional truth remains in Supabase/PostgreSQL.

## Architectural decision

Mastra is accepted as the initial implementation behind the Wandora `Agent Runtime Adapter`, subject to the adapter remaining provider-neutral. If a later runtime replaces Mastra, Wandora customer-facing contracts must not require migration merely because of that implementation change.
