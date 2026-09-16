import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { loadRuntimeConfig } from '../src/runtime/config.js';

const connectionId = '22222222-2222-2222-2222-222222222222';
const gatewayUrl = 'http://wandora-messaging-gateway:8787/internal/v1/core/outbound/text';

test('Human Send Proposal is disabled by default and cannot be enabled in standby', async () => {
  const standby = await loadRuntimeConfig({ WANDORA_CORE_MODE: 'standby' });
  assert.equal(standby.humanSendProposal, undefined);

  await assert.rejects(
    loadRuntimeConfig({
      WANDORA_CORE_MODE: 'standby',
      WANDORA_HUMAN_SEND_PROPOSAL_ENABLED: 'true',
    }),
    /cannot be enabled while Wandora Core is in standby/,
  );
});

test('Human Send Proposal requires Human API, canonical connection, pinned private route and distinct file HMAC', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wandora-human-send-config-'));
  const dbSecret = join(dir, 'db-password');
  const outboundSecret = join(dir, 'outbound-secret');
  const ingressSecret = join(dir, 'ingress-secret');
  try {
    await writeFile(dbSecret, 'synthetic-db-password\n', { mode: 0o600 });
    await writeFile(outboundSecret, 'outbound-secret-0123456789abcdef0123456789abcdef\n', { mode: 0o600 });
    await writeFile(ingressSecret, 'ingress-secret-0123456789abcdef0123456789abcdef0\n', { mode: 0o600 });

    await assert.rejects(
      loadRuntimeConfig({
        WANDORA_CORE_MODE: 'database',
        WANDORA_HUMAN_SEND_PROPOSAL_ENABLED: 'true',
      }),
      /requires the Human API/,
    );

    const baseEnv: NodeJS.ProcessEnv = {
      WANDORA_CORE_MODE: 'database',
      WANDORA_CORE_DB_PASSWORD_FILE: dbSecret,
      WANDORA_HUMAN_API_ENABLED: 'true',
      WANDORA_AUTH_JWKS_URL: 'https://supabase.example.test/auth/v1/.well-known/jwks.json',
      WANDORA_AUTH_ISSUER: 'https://supabase.example.test/auth/v1',
      WANDORA_AUTH_AUDIENCE: 'authenticated',
      WANDORA_HUMAN_SEND_PROPOSAL_ENABLED: 'true',
      WANDORA_HUMAN_SEND_PROPOSAL_CONNECTION_ID: connectionId,
      WANDORA_CORE_OUTBOUND_SECRET_FILE: outboundSecret,
    };

    const config = await loadRuntimeConfig(baseEnv);
    assert.deepEqual(config.humanSendProposal, {
      connectionId,
      gatewayUrl,
      gatewaySecret: 'outbound-secret-0123456789abcdef0123456789abcdef',
    });

    await assert.rejects(
      loadRuntimeConfig({ ...baseEnv, WANDORA_HUMAN_SEND_PROPOSAL_CONNECTION_ID: 'provider-instance' }),
      /must be a canonical UUID/,
    );
    await assert.rejects(
      loadRuntimeConfig({ ...baseEnv, WANDORA_MESSAGING_GATEWAY_OUTBOUND_URL: 'https://provider.example.test/send' }),
      /private canonical Messaging Gateway route/,
    );

    await assert.rejects(
      loadRuntimeConfig({
        ...baseEnv,
        WANDORA_GATEWAY_INGRESS_ENABLED: 'true',
        WANDORA_GATEWAY_INGRESS_SECRET_FILE: outboundSecret,
      }),
      /must use distinct HMAC secrets/,
    );

    const distinct = await loadRuntimeConfig({
      ...baseEnv,
      WANDORA_GATEWAY_INGRESS_ENABLED: 'true',
      WANDORA_GATEWAY_INGRESS_SECRET_FILE: ingressSecret,
    });
    assert.notEqual(distinct.gatewayIngress?.secret, distinct.humanSendProposal?.gatewaySecret);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
