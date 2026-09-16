import { Pool } from 'pg';
import { MastraDeterministicAgentRuntime } from '../agent-runtime/mastra-deterministic.js';
import { PostgresAnaRepository } from '../ana/postgres-repository.js';
import { AnaSupervisedIngressService } from '../ana/supervised-ingress.js';
import { Es256JwksHumanTokenVerifier } from '../human-auth/es256-jwks.js';
import { createPrivateGatewayClient } from '../messaging/private-gateway.js';
import { HumanDigitalEmployeesReadService } from '../supervision/human-digital-employees-read.js';
import { HumanSupervisionReadService } from '../supervision/human-read.js';
import { HumanSendProposalService } from '../supervision/human-send-proposal.js';
import { loadRuntimeConfig } from './config.js';
import { createGatewayIngressHandler } from './gateway-ingress.js';
import { createHumanSupervisionHandler } from './human-supervision.js';
import { createRuntimeServer, type RuntimeReadiness } from './server.js';

const config = await loadRuntimeConfig();

const pool = config.mode === 'database' && config.database
  ? new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.database,
      user: config.database.user,
      password: config.database.password,
      max: 4,
      connectionTimeoutMillis: 3_000,
      idleTimeoutMillis: 30_000,
      application_name: 'wandora-core',
    })
  : undefined;

const agentRuntime = config.agentRuntime?.mode === 'mastra-deterministic'
  ? new MastraDeterministicAgentRuntime()
  : undefined;

const checkReady = async (): Promise<RuntimeReadiness> => {
  if (!pool) return { ready: false, reason: 'standby' };

  try {
    const result = await pool.query<{ current_user: string; organization_scope: string | null }>(
      `SELECT current_user::text AS current_user,
              wandora.current_core_organization_id()::text AS organization_scope`,
    );
    const row = result.rows[0];
    if (!row || row.current_user !== 'wandora_core_runtime') {
      return { ready: false, reason: 'unexpected-database-role' };
    }
    if (row.organization_scope !== null) {
      return { ready: false, reason: 'tenant-scope-leak' };
    }
    return { ready: true };
  } catch {
    return { ready: false, reason: 'database-unavailable' };
  }
};

const handleGatewayInbound = pool && config.gatewayIngress
  ? createGatewayIngressHandler({
      secret: config.gatewayIngress.secret,
      processInbound: (() => {
        const service = new AnaSupervisedIngressService({
          repository: new PostgresAnaRepository(pool),
          pool,
          ...(agentRuntime ? { runtime: agentRuntime } : {}),
        });
        return (organizationId, event) => service.handle(organizationId, event);
      })(),
    })
  : undefined;

const humanVerifier = pool && config.humanApi
  ? new Es256JwksHumanTokenVerifier({
      jwksUrl: config.humanApi.jwksUrl,
      issuer: config.humanApi.issuer,
      audience: config.humanApi.audience,
    })
  : undefined;

const humanReadService = pool && humanVerifier
  ? new HumanSupervisionReadService(pool, humanVerifier)
  : undefined;

const humanDigitalEmployeesReadService = pool && humanReadService
  ? new HumanDigitalEmployeesReadService(pool, humanReadService)
  : undefined;

const humanSendProposalService = pool && humanVerifier && config.humanSendProposal
  ? new HumanSendProposalService(
      pool,
      humanVerifier,
      createPrivateGatewayClient({
        url: config.humanSendProposal.gatewayUrl,
        secret: config.humanSendProposal.gatewaySecret,
      }),
      config.humanSendProposal.connectionId,
    )
  : undefined;

const handleHumanSupervision = humanReadService
  ? createHumanSupervisionHandler(
      humanReadService,
      humanSendProposalService,
      humanDigitalEmployeesReadService,
    )
  : undefined;

const server = createRuntimeServer({
  mode: config.mode,
  checkReady,
  ...(handleGatewayInbound ? { handleGatewayInbound } : {}),
  ...(handleHumanSupervision ? { handleHumanSupervision } : {}),
});
server.listen(config.port, '0.0.0.0', () => {
  console.log(JSON.stringify({
    event: 'wandora-core.started',
    mode: config.mode,
    port: config.port,
    gatewayIngress: Boolean(handleGatewayInbound),
    humanApi: Boolean(handleHumanSupervision),
    humanSendProposal: Boolean(humanSendProposalService),
    agentRuntime: config.agentRuntime?.mode ?? 'disabled',
  }));
});

let shuttingDown = false;
const shutdown = async (signal: string): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(JSON.stringify({ event: 'wandora-core.stopping', signal }));

  await new Promise<void>((resolve) => server.close(() => resolve()));
  if (pool) await pool.end();
  process.exitCode = 0;
};

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));
