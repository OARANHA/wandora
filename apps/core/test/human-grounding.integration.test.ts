import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { Pool } from 'pg';
import { HumanGroundingService } from '../src/supervision/human-grounding.js';
import { HumanAccessError, type HumanSessionContext, type HumanSupervisionReadService } from '../src/supervision/human-read.js';

const ORG_A = 'd1000000-0000-4000-8000-000000000001';
const ORG_B = 'd1000000-0000-4000-8000-000000000002';
const OWNER = 'd2000000-0000-4000-8000-000000000001';
const ADMIN = 'd2000000-0000-4000-8000-000000000002';
const MEMBER = 'd2000000-0000-4000-8000-000000000003';

const runtimePool = new Pool({ connectionString: process.env.DATABASE_URL });
const fixturePool = new Pool({ connectionString: process.env.FIXTURE_DATABASE_URL });

after(async () => {
  await Promise.all([runtimePool.end(), fixturePool.end()]);
});

function readService(userId: string, role: 'owner' | 'admin' | 'member', organizationId = ORG_A) {
  return {
    async getSessionContext(): Promise<HumanSessionContext> {
      return {
        user: { id: userId, name: role },
        organizations: [{ id: organizationId, slug: 'fixture', name: 'Fixture', role }],
      };
    },
  } as unknown as HumanSupervisionReadService;
}

async function resetFixture() {
  await fixturePool.query(`TRUNCATE
    wandora.organization_grounding_entries,
    wandora.audit_records,
    wandora.memberships,
    wandora.user_identities,
    wandora.users,
    wandora.organizations
    RESTART IDENTITY CASCADE`);

  await fixturePool.query(
    `INSERT INTO wandora.organizations(id,slug,display_name,status)
     VALUES ($1,'grounding-a','Grounding A','active'),($2,'grounding-b','Grounding B','active')`,
    [ORG_A, ORG_B],
  );
  await fixturePool.query(
    `INSERT INTO wandora.users(id,display_name)
     VALUES ($1,'Owner'),($2,'Admin'),($3,'Member')`,
    [OWNER, ADMIN, MEMBER],
  );
  await fixturePool.query(
    `INSERT INTO wandora.memberships(organization_id,user_id,role,status)
     VALUES ($1,$3,'owner','active'),($1,$4,'admin','active'),($1,$5,'member','active'),($2,$5,'owner','active')`,
    [ORG_A, ORG_B, OWNER, ADMIN, MEMBER],
  );
}

test('owner/admin mutate and member cannot mutate through Core service', async () => {
  await resetFixture();

  const ownerService = new HumanGroundingService(runtimePool, readService(OWNER, 'owner'), () => new Date('2026-09-22T09:00:00Z'));
  const adminService = new HumanGroundingService(runtimePool, readService(ADMIN, 'admin'), () => new Date('2026-09-22T09:01:00Z'));
  const memberService = new HumanGroundingService(runtimePool, readService(MEMBER, 'member'), () => new Date('2026-09-22T09:02:00Z'));

  const created = await ownerService.create({
    organizationId: ORG_A,
    authorization: 'Bearer fixture',
    idempotencyKey: 'owner-create-1',
    entryType: 'fact',
    content: 'Atendimento ocorre em horario comercial.',
    provenanceType: 'approved_source',
    sourceRef: 'source:company-profile:v1',
    sourceLabel: 'Perfil oficial',
  });
  assert.equal(created.status, 'active');
  assert.equal(created.provenance.type, 'approved_source');

  await assert.rejects(
    memberService.create({
      organizationId: ORG_A,
      authorization: 'Bearer fixture',
      idempotencyKey: 'member-create-1',
      entryType: 'rule',
      content: 'Member cannot create this rule.',
      provenanceType: 'owner_statement',
      sourceRef: null,
      sourceLabel: null,
    }),
    (error: unknown) => error instanceof HumanAccessError && error.code === 'forbidden',
  );

  const corrected = await adminService.correct({
    organizationId: ORG_A,
    authorization: 'Bearer fixture',
    idempotencyKey: 'admin-correct-1',
    entryId: created.id,
    content: 'Atendimento segue o horario comercial publicado pela empresa.',
    sourceRef: 'correction:admin-reviewed:v1',
    sourceLabel: 'Revisao do admin',
  });
  assert.equal(corrected.provenance.type, 'approved_correction');
  assert.equal(corrected.supersedesEntryId, created.id);

  const retiredOriginal = await ownerService.list('Bearer fixture', ORG_A);
  assert.equal(retiredOriginal.find((item) => item.id === created.id)?.status, 'retired');

  const retiredCorrection = await ownerService.retire({
    organizationId: ORG_A,
    authorization: 'Bearer fixture',
    idempotencyKey: 'owner-retire-1',
    entryId: corrected.id,
  });
  assert.equal(retiredCorrection.status, 'retired');

  const audit = await fixturePool.query<{ action: string; actor_id: string }>(
    `SELECT action::text AS action, actor_id
       FROM wandora.audit_records
      WHERE organization_id = $1
      ORDER BY occurred_at, created_at`,
    [ORG_A],
  );
  assert.deepEqual(
    audit.rows
      .map((row) => row.action + ':' + row.actor_id)
      .sort(),
    [
      'grounding-created:' + OWNER,
      'grounding-corrected:' + ADMIN,
      'grounding-retired:' + OWNER,
    ].sort(),
  );
});

test('customer read is tenant-scoped and cannot read another organization', async () => {
  await resetFixture();
  const ownerA = new HumanGroundingService(runtimePool, readService(OWNER, 'owner'), () => new Date('2026-09-22T09:10:00Z'));
  const ownerB = new HumanGroundingService(runtimePool, readService(MEMBER, 'owner', ORG_B), () => new Date('2026-09-22T09:11:00Z'));

  await ownerA.create({
    organizationId: ORG_A,
    authorization: 'Bearer fixture',
    idempotencyKey: 'a-create-1',
    entryType: 'rule',
    content: 'Regra da empresa A.',
    provenanceType: 'owner_statement',
    sourceRef: null,
    sourceLabel: null,
  });
  await ownerB.create({
    organizationId: ORG_B,
    authorization: 'Bearer fixture',
    idempotencyKey: 'b-create-1',
    entryType: 'fact',
    content: 'Fato da empresa B.',
    provenanceType: 'owner_statement',
    sourceRef: null,
    sourceLabel: null,
  });

  const aItems = await ownerA.list('Bearer fixture', ORG_A);
  assert.equal(aItems.length, 1);
  assert.equal(aItems[0]?.content, 'Regra da empresa A.');

  await assert.rejects(
    ownerA.list('Bearer fixture', ORG_B),
    (error: unknown) => error instanceof HumanAccessError && error.code === 'forbidden',
  );
});