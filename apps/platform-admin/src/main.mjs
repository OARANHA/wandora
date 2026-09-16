import { loadConfig } from './config.mjs';
import { createPlatformAdminServer } from './server.mjs';

const config = await loadConfig();
const server = createPlatformAdminServer(config);

server.listen(config.port, '0.0.0.0', () => {
  process.stdout.write(`wandora-platform-admin listening on ${config.port}\n`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
