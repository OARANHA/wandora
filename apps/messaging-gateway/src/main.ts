import { createCoreIngressClient } from './core-client.js';
import { loadMessagingGatewayConfig } from './config.js';
import { createMessagingGatewayServer } from './server.js';

const config = await loadMessagingGatewayConfig();
const forwardToCore = createCoreIngressClient({
  url: config.coreIngressUrl,
  secret: config.coreIngressSecret,
});

const server = createMessagingGatewayServer({
  evolutionInstance: config.evolutionInstance,
  evolutionWebhookJwtKey: config.evolutionWebhookJwtKey,
  organizationId: config.organizationId,
  connectionId: config.connectionId,
  forwardToCore,
});

server.listen(config.port, '0.0.0.0', () => {
  console.log(JSON.stringify({
    event: 'wandora-messaging-gateway.started',
    port: config.port,
    provider: 'evolution',
  }));
});

let shuttingDown = false;
const shutdown = async (signal: string): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(JSON.stringify({ event: 'wandora-messaging-gateway.stopping', signal }));
  await new Promise<void>((resolve) => server.close(() => resolve()));
  process.exitCode = 0;
};

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));
