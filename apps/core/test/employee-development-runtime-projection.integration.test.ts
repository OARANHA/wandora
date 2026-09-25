import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { Pool } from 'pg';
import {
  EmployeeDevelopmentProjectionOverflowError,
  PostgresEmployeeDevelopmentProjection,
} from '../src/agent-runtime/employee-development.js';

const ORG = 'a1000000-0000-4000-8000-000000000001';
const OTHER_ORG = 'a1000000-0000-4000-8000-000000000002';
const EMPLOYEE = 'a2000000-0000-4000-8000-000000000001';
const OTHER_EMPLOYEE = 'a2000000-0000-4000-8000-000000000002';
const OWNER = 'a3000000-0000-4000-8000-000000000001';

const runtimePool = new Pool({ connectionString: process.env.DATABASE_URL });
const fixturePool = new Pool({ connectionString: process.env.FIXTURE_DATABASE_URL });

after(async () => {
  await Promise.all([runtimePool.end(), fixturePool.end()]);
});

async function resetFixture() {
  await fixturePool.query(`TRUNCATE
    wandora.digital_employee_development_entries,
    wandora.digital_employees,
    wandora.memberships,
    wandora.user_identities,
    wandora.users,
    wandora.organizations
    RESTART IDENTITY CASCADE`);

  await fixturePool.query(
    `INSERT INTO wandora.organizations(id,slug,display_name,status)
     VALUES ($1,'dev-a','Dev A','active'),($2,'dev-b','Dev B','active')`,
    [ORG, OTHER_ORG],
  );
  await fixturePool.query(
    `INSERT INTO wandora.users(id,display_name) VALUES ($1,'Owner')`,
    [OWNER],
  );
  await fixturePool.query(
    `INSERT INTO wandora.memberships(organization_id,user_id,role,status)
     VALUES ($1,$3,'owner','active'),($2,$3,'owner','active')`,
    [ORG, OTHER_ORG, OWNER],
  );
  await fixturePool.query(
    `INSERT INTO wandora.digital_employees
       (id,organization_id,display_name,role,status,autonomy_mode)
     VALUES
       ($1,$3,'Ana','commercial-assistant','active','supervised'),
       ($2,$3,'Outra Ana','commercial-assistant','active','supervised')`,
    [EMPLOYEE, OTHER_EMPLOYEE, ORG],
  );
}

test('runtime projection returns only active guidance for the exact employee without ids/sourceRef', async () => {
  await resetFixture();
  await fixturePool.query(
    `INSERT INTO wandora.digital_employee_development_entries
       (id,organization_id,employee_id,entry_kind,content,provenance_type,source_ref,source_label,status,created_by_user_id)
     VALUES
       ('a4000000-0000-4000-8000-000000000001',$1,$2,'responsibility','Qualificar oportunidades.','owner_statement',NULL,NULL,'active',$4),
       ('a4000000-0000-4000-8000-000000000002',$1,$2,'practice','Mostrar estoque antes do preco.','approved_learning','secret-evidence-ref','Revisao humana','active',$4),
       ('a4000000-0000-4000-8000-000000000003',$1,$2,'behavior','Antigo.','owner_statement',NULL,NULL,'retired',$4),
       ('a4000000-0000-4000-8000-000000000004',$1,$3,'behavior','Somente outra Ana.','owner_statement',NULL,NULL,'active',$4)`,
    [ORG, EMPLOYEE, OTHER_EMPLOYEE, OWNER],
  );

  const projection = new PostgresEmployeeDevelopmentProjection(runtimePool);
  const items = await projection.project(ORG, EMPLOYEE);

  assert.deepEqual(items, [
    {
      kind: 'responsibility',
      content: 'Qualificar oportunidades.',
      provenance: { type: 'owner_statement', sourceLabel: null },
    },
    {
      kind: 'practice',
      content: 'Mostrar estoque antes do preco.',
      provenance: { type: 'approved_learning', sourceLabel: 'Revisao humana' },
    },
  ]);

  const serialized = JSON.stringify(items);
  assert.equal(serialized.includes('secret-evidence-ref'), false);
  assert.equal(serialized.includes('a4000000'), false);
  assert.equal(serialized.includes('Somente outra Ana'), false);
  assert.equal(serialized.includes('Antigo.'), false);
});

test('runtime projection fails closed above the 100-entry bound', async () => {
  await resetFixture();
  for (let i = 0; i < 101; i += 1) {
    await fixturePool.query(
      `INSERT INTO wandora.digital_employee_development_entries
       (id,organization_id,employee_id,entry_kind,content,provenance_type,status,created_by_user_id)
       VALUES (gen_random_uuid(),$1,$2,'practice',$3,'owner_statement','active',$4)`,
      [ORG, EMPLOYEE, `Guidance ${i}`, OWNER],
    );
  }

  const projection = new PostgresEmployeeDevelopmentProjection(runtimePool);
  await assert.rejects(
    projection.project(ORG, EMPLOYEE),
    (error: unknown) => error instanceof EmployeeDevelopmentProjectionOverflowError,
  );
});
