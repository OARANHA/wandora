import assert from 'node:assert/strict';
import { createServer, type IncomingHttpHeaders } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { after, afterEach } from 'node:test';
import { Pool } from 'pg';
import { OrganizationAdapterUnavailableError } from '../src/organization-adapter/contracts.js';
import {
  signPaperclipOrganizationAdapterRequest,
} from '../src/organization-adapter/paperclip-provider.js';
import {
  paperclipOrganizationAdapterSecretFileName,
} from '../src/organization-adapter/secret-custody.js';
import { createRuntimeOrganizationAdapter } from '../src/runtime/organization-adapter.js';

const ORG_A = '61000000-0000-4000-8000-0000000000a1';
const ORG_B = '61000000-0000-4000-8000-0000000000b1';
const USER = '62000000-0000-4000-8000-0000000000a1';
const COMPANY_A = 'paperclip-runtime-company-a';
const COMPANY_B = 'paperclip-runtime-company-b';
const SECRET_A = 'a-runtime-proof-secret-material-0001';
const SECRET_B = 'b-runtime-proof-secret-material-0002';
const CATALOG_KEY = 'ana-commercial-v1';

const runtimePool = new Pool({ connectionString: process.env.DATABASE_URL });
const fixturePool = new Pool({ connectionString: process.env.FIXTURE_DATABASE_URL });
const temporaryDirectories: string[] = [];

after(async () => {
  await Promise.all([runtimePool.end(), fixturePool.end()]);
});

afterEach(async () => {
  while (temporaryDirectories.length) {
    const directory = temporaryDirectories.pop();
    if (directory) await rm(directory, { recursive: true, force: true });
  }
});

async function resetFixture(): Promise<void> {
  await fixturePool.query(`TRUNCATE
    wandora_private.digital_employee_provider_bindings,
    wandora_private.digital_employee_hire_operations,
    wandora_private.control_plane_provider_bindings,
    wandora.digital_employees,
    wandora.memberships, wandora.user_identities, wandora.users,
    wandora.organizations RESTART IDENTITY CASCADE`);
  await fixturePool.query(
    `INSERT INTO wandora.organizations(id,slug,display_name) VALUES
       ($1,'runtime-org-a','Runtime Org A'),($2,'runtime-org-b','Runtime Org B')`,
    [ORG_A, ORG_B],
  );
  await fixturePool.query(`INSERT INTO wandora.users(id,display_name) VALUES ($1,'Gestor Runtime')`, [USER]);
  await fixturePool.query(
    `INSERT INTO wandora.memberships(organization_id,user_id,role,status)
     VALUES ($1,$2,'owner','active')`,
    [ORG_A, USER],
  );
  await fixturePool.query(
    `INSERT INTO wandora_private.control_plane_provider_bindings
       (organization_id,provider,provider_company_ref) VALUES
       ($1,'paperclip',$3),($2,'paperclip',$4)`,
    [ORG_A, ORG_B, COMPANY_A, COMPANY_B],
  );
}

type SignedRequest = {
  rawBody: string;
  headers: IncomingHttpHeaders;
  companyId: string;
  catalogKey: string;
};

async function createSignedProviderDouble(options: { failFirst?: boolean } = {}) {
  const calls: SignedRequest[] = [];
  let shouldFail = options.failFirst ?? false;

  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => {
      const rawBody = Buffer.concat(chunks).toString('utf8');
      const parsed = JSON.parse(rawBody) as { companyId: string; catalogKey: string };
      calls.push({ rawBody, headers: request.headers, ...parsed });

      const secret = parsed.companyId === COMPANY_A ? SECRET_A : parsed.companyId === COMPANY_B ? SECRET_B : '';
      const timestamp = String(request.headers['x-wandora-timestamp'] ?? '');
      const expected = signPaperclipOrganizationAdapterRequest(secret, timestamp, rawBody);
      const supplied = String(request.headers['x-wandora-signature'] ?? '');

      if (!secret || supplied !== expected) {
        response.writeHead(502, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ error: 'invalid_wandora_signature' }));
        return;
      }
      if (shouldFail) {
        shouldFail = false;
        response.writeHead(503, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ error: 'synthetic_ambiguous_delivery' }));
        return;
      }
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ status: 'success', deliveryId: `delivery-${calls.length}` }));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('provider_double_address_unavailable');
  return {
    calls,
    webhookUrl: `http://127.0.0.1:${address.port}/api/plugins/wandora.organization-adapter-v1/webhooks/employee-reconcile`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

async function createSecretDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'wandora-org-adapter-runtime-e2e-'));
  temporaryDirectories.push(directory);
  await writeFile(join(directory, paperclipOrganizationAdapterSecretFileName(COMPANY_A)), SECRET_A, { mode: 0o600 });
  await writeFile(join(directory, paperclipOrganizationAdapterSecretFileName(COMPANY_B)), SECRET_B, { mode: 0o600 });
  return directory;
}

test('service + DB + custody + signed client completes one canonical catalog hire without leakage', async () => {
  await resetFixture();
  const provider = await createSignedProviderDouble();
  try {
    const service = createRuntimeOrganizationAdapter(runtimePool, {
      webhookUrl: provider.webhookUrl,
      secretDirectory: await createSecretDirectory(),
    });
    const result = await service.ensureCatalogEmployee({
      organizationId: ORG_A,
      actorUserId: USER,
      catalogKey: CATALOG_KEY,
      idempotencyKey: 'runtime-e2e-hire-a',
    });

    assert.deepEqual(Object.keys(result).sort(), ['autonomy', 'id', 'name', 'role', 'status']);
    assert.equal(result.name, 'Ana');
    assert.equal(provider.calls.length, 1);
    assert.deepEqual(JSON.parse(provider.calls[0]!.rawBody), { companyId: COMPANY_A, catalogKey: CATALOG_KEY });

    const timestamp = String(provider.calls[0]!.headers['x-wandora-timestamp']);
    const signature = String(provider.calls[0]!.headers['x-wandora-signature']);
    assert.equal(signature, signPaperclipOrganizationAdapterRequest(SECRET_A, timestamp, provider.calls[0]!.rawBody));
    assert.notEqual(signature, signPaperclipOrganizationAdapterRequest(SECRET_B, timestamp, provider.calls[0]!.rawBody));

    const state = await fixturePool.query(
      `SELECT
         (SELECT count(*)::int FROM wandora.digital_employees) AS employees,
         (SELECT count(*)::int FROM wandora_private.digital_employee_provider_bindings) AS bindings,
         (SELECT status::text FROM wandora_private.digital_employee_hire_operations WHERE organization_id=$1) AS status`,
      [ORG_A],
    );
    assert.deepEqual(state.rows[0], { employees: 1, bindings: 1, status: 'completed' });
  } finally {
    await provider.close();
  }
});

test('uncertain retry keeps the frozen Company A target and Company A custody after the mutable binding changes', async () => {
  await resetFixture();
  const provider = await createSignedProviderDouble({ failFirst: true });
  try {
    const service = createRuntimeOrganizationAdapter(runtimePool, {
      webhookUrl: provider.webhookUrl,
      secretDirectory: await createSecretDirectory(),
    });
    const request = {
      organizationId: ORG_A,
      actorUserId: USER,
      catalogKey: CATALOG_KEY,
      idempotencyKey: 'runtime-e2e-uncertain-a',
    };

    await assert.rejects(
      service.ensureCatalogEmployee(request),
      (error: unknown) => error instanceof OrganizationAdapterUnavailableError
        && error.code === 'provider-operation-uncertain',
    );
    await fixturePool.query(
      `UPDATE wandora_private.control_plane_provider_bindings
          SET provider_company_ref=$2
        WHERE organization_id=$1 AND provider='paperclip'`,
      [ORG_A, COMPANY_B],
    );

    const repaired = await service.ensureCatalogEmployee(request);
    assert.equal(repaired.name, 'Ana');
    assert.equal(provider.calls.length, 2);
    assert.equal(provider.calls[0]!.companyId, COMPANY_A);
    assert.equal(provider.calls[1]!.companyId, COMPANY_A);

    for (const call of provider.calls) {
      const timestamp = String(call.headers['x-wandora-timestamp']);
      const signature = String(call.headers['x-wandora-signature']);
      assert.equal(signature, signPaperclipOrganizationAdapterRequest(SECRET_A, timestamp, call.rawBody));
      assert.notEqual(signature, signPaperclipOrganizationAdapterRequest(SECRET_B, timestamp, call.rawBody));
    }

    const operation = await fixturePool.query(
      `SELECT status::text AS status, provider_company_ref
         FROM wandora_private.digital_employee_hire_operations
        WHERE organization_id=$1`,
      [ORG_A],
    );
    assert.deepEqual(operation.rows[0], { status: 'completed', provider_company_ref: COMPANY_A });
  } finally {
    await provider.close();
  }
});
