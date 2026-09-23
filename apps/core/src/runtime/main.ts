import { Pool } from 'pg';
import { MastraDeterministicAgentRuntime } from '../agent-runtime/mastra-deterministic.js';
import { MastraSupervisedModelAgentRuntime } from '../agent-runtime/mastra-supervised-model.js';
import { PostgresOrganizationGroundingProjection } from '../agent-runtime/organization-grounding.js';
import { PostgresAnaRepository } from '../ana/postgres-repository.js';
import { AnaSupervisedIngressService } from '../ana/supervised-ingress.js';
import { Es256JwksHumanTokenVerifier } from '../human-auth/es256-jwks.js';
import { createPrivateGatewayClient } from '../messaging/private-gateway.js';
import { createPaperclipExecutionHandler } from '../paperclip-execution/handler.js';
import { createPaperclipRunIdentityClient } from '../paperclip-execution/paperclip-run-identity.js';
import { PaperclipExecutionService } from '../paperclip-execution/service.js';
import { BrasilApiCompanyRegistryLookup } from '../supervision/company-registry-lookup.js';
import { HumanCompanyProfileService } from '../supervision/human-company-profile.js';
import { HumanDigitalEmployeeActivationService } from '../supervision/human-digital-employee-activation.js';
import { HumanDigitalEmployeesReadService } from '../supervision/human-digital-employees-read.js';
import { HumanGroundingService } from '../supervision/human-grounding.js';
import { HumanSupervisionReadService } from '../supervision/human-read.js';
import { HumanSendProposalService } from '../supervision/human-send-proposal.js';
import { loadRuntimeConfig } from './config.js';
import { createGatewayIngressHandler } from './gateway-ingress.js';
import { createHumanSupervisionHandler } from './human-supervision.js';
import { createRuntimeOrganizationAdapter } from './organization-adapter.js';
import { createRuntimeReadinessChecker } from './readiness.js';
import { createRuntimeServer } from './server.js';

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
  : config.agentRuntime?.mode === 'mastra-supervised-model'
    ? new MastraSupervisedModelAgentRuntime(config.agentRuntime.model)
    : undefined;

const organizationAdapterService = pool && config.organizationAdapter
  ? createRuntimeOrganizationAdapter(pool, config.organizationAdapter)
  : undefined;

const checkReady = createRuntimeReadinessChecker(pool, {
  organizationAdapterEnabled: Boolean(organizationAdapterService),
  customerCompanyOnboardingEnabled: Boolean(config.customerCompanyOnboarding),
  customerHireEnabled: Boolean(config.humanDigitalEmployeeHire),
  customerWorkEnabled: Boolean(config.humanDigitalEmployeeWork),
  paperclipExecutionBridgeEnabled: Boolean(config.paperclipExecutionBridge),
});

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

const handlePaperclipExecution = pool
  && agentRuntime
  && config.paperclipExecutionBridge
  ? createPaperclipExecutionHandler({
      secret: config.paperclipExecutionBridge.secret,
      verifyRunIdentity: createPaperclipRunIdentityClient({
        agentMeUrl: config.paperclipExecutionBridge.agentMeUrl,
      }),
      service: new PaperclipExecutionService(
        pool,
        agentRuntime,
        new PostgresOrganizationGroundingProjection(pool),
        config.humanDigitalEmployeeWork ? organizationAdapterService : undefined,
      ),
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

const humanGroundingService = pool && humanReadService
  ? new HumanGroundingService(pool, humanReadService)
  : undefined;

const humanCompanyProfileService = pool && humanVerifier && humanReadService && config.customerCompanyOnboarding
  ? new HumanCompanyProfileService(pool, humanVerifier, humanReadService)
  : undefined;

const companyRegistryLookup = humanVerifier && config.customerCompanyOnboarding
  ? new BrasilApiCompanyRegistryLookup(humanVerifier)
  : undefined;

const humanDigitalEmployeesReadService = pool && humanReadService
  ? new HumanDigitalEmployeesReadService(
      pool,
      humanReadService,
      Boolean(config.humanDigitalEmployeeHire && organizationAdapterService),
      Boolean(config.humanDigitalEmployeeActivation && organizationAdapterService && config.paperclipExecutionBridge && agentRuntime),
      Boolean(config.humanDigitalEmployeeWork && organizationAdapterService && config.paperclipExecutionBridge && agentRuntime),
    )
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

const humanDigitalEmployeeHireService = pool
  && humanVerifier
  && config.humanDigitalEmployeeHire
  && organizationAdapterService
  ? organizationAdapterService
  : undefined;

const humanDigitalEmployeeActivationService = organizationAdapterService
  && humanVerifier
  && config.humanDigitalEmployeeActivation
  && config.paperclipExecutionBridge
  && agentRuntime
  ? new HumanDigitalEmployeeActivationService(organizationAdapterService, checkReady)
  : undefined;

const humanDigitalEmployeeWorkService = organizationAdapterService
  && humanVerifier
  && config.humanDigitalEmployeeWork
  && config.paperclipExecutionBridge
  && agentRuntime
  ? organizationAdapterService
  : undefined;

const handleHumanSupervision = humanReadService
  ? createHumanSupervisionHandler(
      humanReadService,
      humanSendProposalService,
      humanDigitalEmployeesReadService,
      humanDigitalEmployeeHireService,
      humanDigitalEmployeeActivationService,
      humanDigitalEmployeeWorkService,
      humanGroundingService,
      humanCompanyProfileService,
      companyRegistryLookup,
    )
  : undefined;

const server = createRuntimeServer({
  mode: config.mode,
  checkReady,
  ...(handleGatewayInbound ? { handleGatewayInbound } : {}),
  ...(handlePaperclipExecution ? { handlePaperclipExecution } : {}),
  ...(handleHumanSupervision ? { handleHumanSupervision } : {}),
});
server.listen(config.port, '0.0.0.0', () => {
  console.log(JSON.stringify({
    event: 'wandora-core.started',
    mode: config.mode,
    port: config.port,
    gatewayIngress: Boolean(handleGatewayInbound),
    paperclipExecutionBridge: Boolean(handlePaperclipExecution),
    humanApi: Boolean(handleHumanSupervision),
    customerCompanyOnboarding: Boolean(humanCompanyProfileService),
    humanSendProposal: Boolean(humanSendProposalService),
    humanDigitalEmployeeHire: Boolean(humanDigitalEmployeeHireService),
    humanDigitalEmployeeActivation: Boolean(humanDigitalEmployeeActivationService),
    humanDigitalEmployeeWork: Boolean(humanDigitalEmployeeWorkService),
    organizationGrounding: Boolean(humanGroundingService),
    organizationAdapter: Boolean(organizationAdapterService),
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