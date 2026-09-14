import { Pool } from 'pg';
import { loadRuntimeConfig } from './config.js';
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
const server = createRuntimeServer({ mode: config.mode, checkReady });
server.listen(config.port, '0.0.0.0', () => {
  console.log(JSON.stringify({
    event: 'wandora-core.started',
    mode: config.mode,
    port: config.port,
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
