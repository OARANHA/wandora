import { createHmac, timingSafeEqual } from 'node:crypto';
import http from 'node:http';
import { loadExternalAdapterPackage } from '/app/server/src/adapters/plugin-loader.ts';

const BRIDGE_SECRET = 'synthetic-spike-secret-not-production';
const RUN_TOKEN = 'synthetic-paperclip-run-token';
const MAX_CLOCK_SKEW_MS = 30_000;

function safeEqualHex(left, right) {
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

const received = {
  signatureOk: false,
  timestampOk: false,
  runTokenOk: false,
  bodyOk: false,
  contextMinimized: false,
};

const server = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const rawBody = Buffer.concat(chunks).toString('utf8');
  const timestamp = String(req.headers['x-wandora-paperclip-timestamp'] ?? '');
  const signatureHeader = String(req.headers['x-wandora-paperclip-signature'] ?? '');
  const runToken = String(req.headers['x-wandora-paperclip-run-token'] ?? '');
  const expected = createHmac('sha256', BRIDGE_SECRET).update(`${timestamp}.${rawBody}`).digest('hex');
  const receivedHex = signatureHeader.startsWith('sha256=') ? signatureHeader.slice(7) : '';
  const parsedTimestamp = Number(timestamp);
  const body = JSON.parse(rawBody);
  received.signatureOk = /^[a-f0-9]{64}$/.test(receivedHex) && safeEqualHex(expected, receivedHex);
  received.timestampOk = Number.isFinite(parsedTimestamp) && Math.abs(Date.now() - parsedTimestamp) <= MAX_CLOCK_SKEW_MS;
  received.runTokenOk = runToken === RUN_TOKEN;
  received.bodyOk = body.paperclipAgentId === 'agent-spike-1'
    && body.paperclipCompanyId === 'company-spike-1'
    && body.paperclipRunId === 'run-spike-1'
    && body.task?.issueId === 'issue-spike-1'
    && body.task?.identifier === 'TEST-1'
    && body.task?.title === 'Qualificar contato'
    && body.task?.description === 'Entender a necessidade do contato.'
    && body.task?.workMode === 'standard'
    && body.task?.wakeReason === 'issue_assigned';
  received.contextMinimized = !Object.hasOwn(body, 'context')
    && !Object.hasOwn(body, 'runToken')
    && !rawBody.includes('must-not-cross-bridge')
    && !rawBody.includes('managedMcp');
  const ok = Object.values(received).every(Boolean);
  res.writeHead(ok ? 200 : 401, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ executionId: 'exec-spike-1', model: 'deterministic-spike', summary: ok ? 'accepted' : 'rejected' }));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();

const adapter = await loadExternalAdapterPackage('@wandora/paperclip-adapter-mastra-spike', '/app/tmp/wandora-adapter');
if (adapter.type !== 'wandora_mastra_spike') throw new Error('loader_type_mismatch');
if (adapter.supportsLocalAgentJwt !== true) throw new Error('local_jwt_capability_missing');
const common = {
  runId: 'run-spike-1',
  agent: { id: 'agent-spike-1', companyId: 'company-spike-1', name: 'Ana', adapterType: adapter.type, adapterConfig: {} },
  runtime: { sessionId: null, sessionParams: null, sessionDisplayId: null, taskKey: null },
  config: { url: `http://127.0.0.1:${port}/execute` },
  context: {
    paperclipIssue: {
      id: 'issue-spike-1',
      identifier: 'TEST-1',
      title: 'Qualificar contato',
      description: 'Entender a necessidade do contato.',
      workMode: 'standard',
    },
    wakeReason: 'issue_assigned',
    paperclipManagedMcp: { token: 'must-not-cross-bridge' },
    unrelatedProviderInternal: 'must-not-cross-bridge',
  },
  onLog: async () => {},
};

let missingTokenFailClosed = false;
process.env.WANDORA_PAPERCLIP_BRIDGE_SECRET = BRIDGE_SECRET;
try { await adapter.execute(common); } catch (error) {
  missingTokenFailClosed = error instanceof Error && error.message === 'paperclip_run_token_required';
}
if (!missingTokenFailClosed) throw new Error('missing_run_token_did_not_fail_closed');

let missingSecretFailClosed = false;
delete process.env.WANDORA_PAPERCLIP_BRIDGE_SECRET;
try { await adapter.execute({ ...common, authToken: RUN_TOKEN }); } catch (error) {
  missingSecretFailClosed = error instanceof Error && error.message === 'wandora_bridge_secret_required';
}
if (!missingSecretFailClosed) throw new Error('missing_bridge_secret_did_not_fail_closed');

process.env.WANDORA_PAPERCLIP_BRIDGE_SECRET = BRIDGE_SECRET;
const result = await adapter.execute({ ...common, authToken: RUN_TOKEN });
server.close();
delete process.env.WANDORA_PAPERCLIP_BRIDGE_SECRET;

if (!Object.values(received).every(Boolean)) throw new Error(`request_contract_failed:${JSON.stringify(received)}`);
if (result.exitCode !== 0 || result.resultJson?.executionId !== 'exec-spike-1') throw new Error('result_contract_failed');
console.log(JSON.stringify({
  loader: 'ok',
  supportsLocalAgentJwt: adapter.supportsLocalAgentJwt,
  missingRunTokenFailClosed: missingTokenFailClosed,
  missingBridgeSecretFailClosed: missingSecretFailClosed,
  requestContract: received,
  resultContract: { exitCode: result.exitCode, provider: result.provider, model: result.model, executionId: result.resultJson?.executionId },
}));
