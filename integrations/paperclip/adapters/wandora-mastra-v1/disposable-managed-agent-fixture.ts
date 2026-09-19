import { randomUUID } from 'node:crypto';
import {
  closeRegisteredClients,
  createDb,
  plugins,
} from '/app/packages/db/src/index.ts';
import { pluginManagedAgentService } from '/app/server/src/services/plugin-managed-agents.ts';

const databaseUrl = process.env.DATABASE_URL?.trim();
const companyId = process.env.WANDORA_DISPOSABLE_COMPANY_ID?.trim();

if (!databaseUrl) throw new Error('disposable_paperclip_database_url_missing');
if (!companyId) throw new Error('disposable_paperclip_company_id_missing');

const pluginKey = 'wandora.organization-adapter-v1';
const pluginId = randomUUID();

const manifest = {
  id: pluginKey,
  apiVersion: 1,
  version: '0.1.0-disposable-attestation',
  displayName: 'Wandora Organization Adapter Disposable Attestation',
  description: 'Disposable-only managed-agent fixture for execution bridge attestation.',
  author: 'Wandora',
  categories: ['automation', 'connector'],
  capabilities: ['agents.managed'],
  entrypoints: { worker: './dist/worker.js' },
  agents: [{
    agentKey: 'ana-commercial-v1',
    displayName: 'Ana',
    role: 'commercial-assistant',
    title: 'Assistente Comercial Digital — Disposable Attestation',
    capabilities: 'Disposable execution-bridge attestation only.',
    adapterType: 'wandora_mastra',
    status: 'idle',
    budgetMonthlyCents: 0,
  }],
};

const db = createDb(databaseUrl, { maxConnections: 2 });

try {
  await db.insert(plugins).values({
    id: pluginId,
    pluginKey,
    packageName: '@wandora/disposable-organization-adapter-attestation',
    version: manifest.version,
    apiVersion: manifest.apiVersion,
    categories: manifest.categories,
    manifestJson: manifest,
    status: 'ready',
    installOrder: 1,
  });

  const managedAgents = pluginManagedAgentService(db, {
    pluginId,
    pluginKey,
    manifest,
  });

  const resolution = await managedAgents.reconcile('ana-commercial-v1', companyId);
  const agent = resolution.agent;

  if (
    !agent
    || !agent.id
    || agent.companyId !== companyId
    || agent.name !== 'Ana'
    || agent.role !== 'commercial-assistant'
    || agent.adapterType !== 'wandora_mastra'
    || agent.status !== 'idle'
    || agent.metadata?.pluginManagedAgent?.pluginKey !== pluginKey
    || agent.metadata?.pluginManagedAgent?.agentKey !== 'ana-commercial-v1'
  ) {
    throw new Error('disposable_managed_agent_identity_invalid');
  }

  process.stdout.write(agent.id);
} finally {
  await closeRegisteredClients(databaseUrl);
}
