import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { Pool } from 'pg';
import {
  OrganizationGroundingProjectionOverflowError,
  PostgresOrganizationGroundingProjection,
} from '../src/agent-runtime/organization-grounding.js';

const ORG_A = 'e1000000-0000-4000-8000-000000000001';
const ORG_B = 'e1000000-0000-4000-8000-000000000002';
const OWNER = 'e2000000-0000-4000-8000-000000000001';
const FACT = 'e3000000-0000-4000-8000-000000000001';
const RULE = 'e3000000-0000-4000-8000-000000000002';
const RETIRED = 'e3000000-0000-4000-8000-000000000003';
const FOREIGN = 'e3000000-0000-4000-8000-000000000004';

const runtimePool = new Pool({ connectionString: process.env.DATABASE_URL });
const fixturePool = new Pool({ connectionString: process.env.FIXTURE_DATABASE_URL });

after(async () => {
  await Promise.all([runtimePool.end(), fixturePool.end()]);
});

async function resetFixture() {
  await fixturePool.query(`TRUNCATE
    wandora.organization_grounding_entries,
    wandora.memberships,
    wandora.user_identities,
    wandora.users,
    wandora.organizations
    RESTART IDENTITY CASCADE`);
  await fixturePool.query(
    `INSERT INTO wandora.organizations(id,slug,display_name,status)
     VALUES ($1,'runtime-grounding-a','Runtime Grounding A','active'),
            ($2,'runtime-grounding-b','Runtime Grounding B','active')`,
    [ORG_A, ORG_B],
  );
  await fixturePool.query(
    `INSERT INTO wandora.users(id,display_name) VALUES ($1,'Owner')`,
    [OWNER],
  );
  await fixturePool.query(
    `INSERT INTO wandora.organization_grounding_entries
       (id,organization_id,entry_type,content,provenance_type,source_ref,source_label,status,created_by_user_id)
     VALUES
       ($1,$5,'fact','MEDICSPRO atende somente com dados confirmados.','approved_source',
        'source:company-profile:v1','Perfil oficial','active',$6),
       ($2,$5,'rule','Se algo nao estiver confirmado, declarar desconhecido.','owner_statement',
        NULL,NULL,'active',$6),
       ($3,$5,'fact','Fato aposentado.','owner_statement',NULL,NULL,'retired',$6),
       ($4,$7,'fact','Fato de outro tenant.','owner_statement',NULL,NULL,'active',$6)`,
    [FACT, RULE, RETIRED, FOREIGN, ORG_A, OWNER, ORG_B],
  );
}

test('runtime grounding projects active official facts/rules and keeps work context separate', async () => {
  await resetFixture();
  const projection = new PostgresOrganizationGroundingProjection(runtimePool);
  const result = await projection.project(ORG_A, {
    title: 'Preparar resposta interna',
    description: 'Hipotese do modelo: a empresa possui centenas de clientes.',
  });

  assert.deepEqual(result, {
    officialFacts: [{
      content: 'MEDICSPRO atende somente com dados confirmados.',
      provenance: {
        type: 'approved_source',
        sourceRef: 'source:company-profile:v1',
        sourceLabel: 'Perfil oficial',
      },
    }],
    houseRules: [{
      content: 'Se algo nao estiver confirmado, declarar desconhecido.',
      provenance: {
        type: 'owner_statement',
        sourceRef: null,
        sourceLabel: null,
      },
    }],
    workContext: {
      title: 'Preparar resposta interna',
      description: 'Hipotese do modelo: a empresa possui centenas de clientes.',
    },
  });

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes('Fato aposentado.'), false);
  assert.equal(serialized.includes('Fato de outro tenant.'), false);
  assert.equal(serialized.includes(ORG_A), false);
  assert.equal(serialized.includes(ORG_B), false);
  assert.equal(serialized.includes('paperclip'), false);
  assert.equal(serialized.includes('mastra'), false);
  assert.equal(result.officialFacts.some((item) => item.content.includes('centenas de clientes')), false);
});

test('runtime grounding tenant scope never returns another organization entries', async () => {
  await resetFixture();
  const projection = new PostgresOrganizationGroundingProjection(runtimePool);
  const result = await projection.project(ORG_B, {
    title: 'Tenant B',
    description: null,
  });

  assert.deepEqual(result.officialFacts, [{
    content: 'Fato de outro tenant.',
    provenance: {
      type: 'owner_statement',
      sourceRef: null,
      sourceLabel: null,
    },
  }]);
  assert.deepEqual(result.houseRules, []);
});

test('runtime grounding fails closed instead of silently truncating official truth', async () => {
  await resetFixture();
  await fixturePool.query(
    `INSERT INTO wandora.organization_grounding_entries
       (id,organization_id,entry_type,content,provenance_type,status,created_by_user_id)
     SELECT ('e4000000-0000-4000-8000-' || lpad(value::text, 12, '0'))::uuid,
            $1,'fact','Extra fact ' || value::text,'owner_statement','active',$2
       FROM generate_series(1, 199) AS value`,
    [ORG_A, OWNER],
  );

  const projection = new PostgresOrganizationGroundingProjection(runtimePool);
  await assert.rejects(
    projection.project(ORG_A, { title: 'Overflow proof', description: null }),
    (error: unknown) => error instanceof OrganizationGroundingProjectionOverflowError,
  );
});
