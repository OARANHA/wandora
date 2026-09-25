import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { Pool } from 'pg';
import {
  EmployeeGuidanceProjectionOverflowError,
  PostgresEmployeeGuidanceProjection,
} from '../src/agent-runtime/employee-guidance.js';

const ORG_A = 'f1000000-0000-4000-8000-000000000001';
const ORG_B = 'f1000000-0000-4000-8000-000000000002';
const OWNER = 'f2000000-0000-4000-8000-000000000001';
const EMPLOYEE_A = 'f3000000-0000-4000-8000-000000000001';
const EMPLOYEE_A2 = 'f3000000-0000-4000-8000-000000000002';
const EMPLOYEE_B = 'f3000000-0000-4000-8000-000000000003';

const runtimePool = new Pool({ connectionString: process.env.DATABASE_URL });
const fixturePool = new Pool({ connectionString: process.env.FIXTURE_DATABASE_URL });

after(async () => {
  await Promise.all([runtimePool.end(), fixturePool.end()]);
});

async function resetFixture() {
  await fixturePool.query(`TRUNCATE
    wandora.digital_employee_guidance_entries,
    wandora.digital_employees,
    wandora.memberships,
    wandora.user_identities,
    wandora.users,
    wandora.organizations
    RESTART IDENTITY CASCADE`);

  await fixturePool.query(
    `INSERT INTO wandora.organizations(id,slug,display_name,status)
     VALUES ($1,'guidance-runtime-a','Guidance Runtime A','active'),
            ($2,'guidance-runtime-b','Guidance Runtime B','active')`,
    [ORG_A, ORG_B],
  );
  await fixturePool.query(
    `INSERT INTO wandora.users(id,display_name) VALUES ($1,'Owner')`,
    [OWNER],
  );
  await fixturePool.query(
    `INSERT INTO wandora.digital_employees(id,organization_id,display_name,role,status,autonomy_mode)
     VALUES
       ($1,$4,'Ana','commercial-assistant','active','supervised'),
       ($2,$4,'Ana Dois','commercial-assistant','active','supervised'),
       ($3,$5,'Ana B','commercial-assistant','active','supervised')`,
    [EMPLOYEE_A, EMPLOYEE_A2, EMPLOYEE_B, ORG_A, ORG_B],
  );
  await fixturePool.query(
    `INSERT INTO wandora.digital_employee_guidance_entries
       (id,organization_id,employee_id,entry_type,content,provenance_type,source_ref,source_label,status,created_by_user_id)
     VALUES
       ('f4000000-0000-4000-8000-000000000001',$1,$2,'responsibility',
        'Qualificar oportunidades comerciais.','owner_statement',NULL,NULL,'active',$6),
       ('f4000000-0000-4000-8000-000000000002',$1,$2,'behavior',
        'Fale de forma objetiva e acolhedora.','approved_evidence','owner-review:1','Revisao do owner','active',$6),
       ('f4000000-0000-4000-8000-000000000003',$1,$2,'practice',
        'Pratica aposentada.','owner_statement',NULL,NULL,'retired',$6),
       ('f4000000-0000-4000-8000-000000000004',$1,$3,'behavior',
        'Outra funcionaria.','owner_statement',NULL,NULL,'active',$6),
       ('f4000000-0000-4000-8000-000000000005',$4,$5,'behavior',
        'Outro tenant.','owner_statement',NULL,NULL,'active',$6)`,
    [ORG_A, EMPLOYEE_A, EMPLOYEE_A2, ORG_B, EMPLOYEE_B, OWNER],
  );
}

test('runtime employee guidance projects only active guidance for the exact canonical employee', async () => {
  await resetFixture();
  const projection = new PostgresEmployeeGuidanceProjection(runtimePool);
  const result = await projection.project(ORG_A, EMPLOYEE_A);

  assert.deepEqual(result, [
    {
      type: 'responsibility',
      content: 'Qualificar oportunidades comerciais.',
      provenance: { type: 'owner_statement', sourceLabel: null },
    },
    {
      type: 'behavior',
      content: 'Fale de forma objetiva e acolhedora.',
      provenance: { type: 'approved_evidence', sourceLabel: 'Revisao do owner' },
    },
  ]);

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes('Pratica aposentada.'), false);
  assert.equal(serialized.includes('Outra funcionaria.'), false);
  assert.equal(serialized.includes('Outro tenant.'), false);
  assert.equal(serialized.includes('owner-review:1'), false);
  assert.equal(serialized.includes(EMPLOYEE_A), false);
  assert.equal(serialized.includes(ORG_A), false);
});

test('runtime employee guidance isolates employees inside one organization', async () => {
  await resetFixture();
  const projection = new PostgresEmployeeGuidanceProjection(runtimePool);
  const result = await projection.project(ORG_A, EMPLOYEE_A2);

  assert.deepEqual(result, [{
    type: 'behavior',
    content: 'Outra funcionaria.',
    provenance: { type: 'owner_statement', sourceLabel: null },
  }]);
});

test('runtime employee guidance fails closed instead of silently truncating approved guidance', async () => {
  await resetFixture();
  await fixturePool.query(
    `INSERT INTO wandora.digital_employee_guidance_entries
       (id,organization_id,employee_id,entry_type,content,provenance_type,status,created_by_user_id)
     SELECT ('f5000000-0000-4000-8000-' || lpad(value::text, 12, '0'))::uuid,
            $1,$2,'practice','Extra practice ' || value::text,'owner_statement','active',$3
       FROM generate_series(1, 99) AS value`,
    [ORG_A, EMPLOYEE_A, OWNER],
  );

  const projection = new PostgresEmployeeGuidanceProjection(runtimePool);
  await assert.rejects(
    projection.project(ORG_A, EMPLOYEE_A),
    (error: unknown) => error instanceof EmployeeGuidanceProjectionOverflowError,
  );
});
