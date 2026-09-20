import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { Pool } from 'pg';
import type { HumanTokenVerifier } from '../src/human-auth/es256-jwks.js';
import { paperclipManagedAgentRef } from '../src/organization-adapter/paperclip-provider.js';
import { HumanDigitalEmployeesReadService } from '../src/supervision/human-digital-employees-read.js';
import { HumanSupervisionReadService } from '../src/supervision/human-read.js';

const ORG='91000000-0000-4000-8000-0000000000a1';
const USER='92000000-0000-4000-8000-0000000000a1';
const EMP='93000000-0000-4000-8000-0000000000a1';
const COMPANY='94000000-0000-4000-8000-0000000000a1';
const SUBJECT='activation-read-subject';
const runtimePool=new Pool({connectionString:process.env.DATABASE_URL});
const fixturePool=new Pool({connectionString:process.env.FIXTURE_DATABASE_URL});
after(async()=>{await Promise.all([runtimePool.end(),fixturePool.end()]);});
const verifier: HumanTokenVerifier={async verifyAuthorization(){return {subject:SUBJECT};}};

async function reset(){
  await fixturePool.query(`TRUNCATE
    wandora_private.digital_employee_catalog_hire_eligibility,
    wandora_private.digital_employee_provider_bindings,
    wandora_private.digital_employee_hire_operations,
    wandora_private.control_plane_provider_bindings,
    wandora.digital_employees,
    wandora.memberships, wandora.user_identities, wandora.users,
    wandora.organizations RESTART IDENTITY CASCADE`);
  await fixturePool.query(`INSERT INTO wandora.organizations(id,slug,display_name,status) VALUES($1,'read-a','Read A','active')`,[ORG]);
  await fixturePool.query(`INSERT INTO wandora.users(id,display_name) VALUES($1,'Owner')`,[USER]);
  await fixturePool.query(`INSERT INTO wandora.user_identities(user_id,provider,provider_subject) VALUES($1,'supabase',$2)`,[USER,SUBJECT]);
  await fixturePool.query(`INSERT INTO wandora.memberships(organization_id,user_id,role,status) VALUES($1,$2,'owner','active')`,[ORG,USER]);
  await fixturePool.query(`INSERT INTO wandora.digital_employees(id,organization_id,display_name,role,status,autonomy_mode) VALUES($1,$2,'Ana','commercial-assistant','paused','supervised')`,[EMP,ORG]);
  const ref=paperclipManagedAgentRef(COMPANY,'ana-commercial-v1');
  await fixturePool.query(`INSERT INTO wandora_private.control_plane_provider_bindings(organization_id,provider,provider_company_ref) VALUES($1,'paperclip',$2)`,[ORG,COMPANY]);
  await fixturePool.query(`INSERT INTO wandora_private.digital_employee_provider_bindings(organization_id,employee_id,provider,provider_agent_ref) VALUES($1,$2,'paperclip',$3)`,[ORG,EMP,ref]);
  await fixturePool.query(`INSERT INTO wandora_private.digital_employee_hire_operations(organization_id,idempotency_key,request_hash,employee_id,provider,catalog_key,provider_company_ref,status,provider_agent_ref,completed_at) VALUES($1,'read-hire',$2,$3,'paperclip','ana-commercial-v1',$4,'completed',$5,now())`,[ORG,'b'.repeat(64),EMP,COMPANY,ref]);
}
test('backend exposes activation only for exact locally ready paused employee and never exposes provider ids', async()=>{
  await reset();
  const session=new HumanSupervisionReadService(runtimePool,verifier);
  const service=new HumanDigitalEmployeesReadService(runtimePool,session,true,true);
  const view=await service.getDigitalEmployeesView('Bearer valid',ORG);
  assert.deepEqual(view.items[0]?.activation,{available:true,state:'available'});
  assert.equal(JSON.stringify(view).includes(COMPANY),false);
  assert.equal(JSON.stringify(view).includes('managed:v1:'),false);
  await fixturePool.query(`DELETE FROM wandora_private.digital_employee_provider_bindings WHERE organization_id=$1`,[ORG]);
  const unavailable=await service.getDigitalEmployeesView('Bearer valid',ORG);
  assert.deepEqual(unavailable.items[0]?.activation,{available:false,state:'unavailable'});
});
