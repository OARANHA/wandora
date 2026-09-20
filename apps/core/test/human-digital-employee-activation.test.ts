import assert from 'node:assert/strict';
import test from 'node:test';
import { DigitalEmployeeActivationError } from '../src/organization-adapter/contracts.js';
import type { OrganizationAdapterService } from '../src/organization-adapter/service.js';
import { HumanDigitalEmployeeActivationService } from '../src/supervision/human-digital-employee-activation.js';

const input={organizationId:'00000000-0000-4000-8000-0000000000a1',actorUserId:'00000000-0000-4000-8000-0000000000b1',employeeId:'00000000-0000-4000-8000-0000000000c1'};

test('activation stops before Organization Adapter when runtime readiness is not green', async()=>{
  let calls=0;
  const adapter={async activateCatalogEmployee(){calls+=1;throw new Error('must not run');}} as unknown as OrganizationAdapterService;
  const service=new HumanDigitalEmployeeActivationService(adapter,async()=>({ready:false,reason:'paperclip-execution-bridge-database-boundary-unavailable'}));
  await assert.rejects(service.activate(input),(error:unknown)=>error instanceof DigitalEmployeeActivationError&&error.code==='runtime-not-ready');
  assert.equal(calls,0);
});

test('green readiness delegates only the narrow activation contract', async()=>{
  const seen:unknown[]=[];
  const adapter={async activateCatalogEmployee(value:unknown){seen.push(value);return{id:input.employeeId,name:'Ana',role:'commercial-assistant',status:'active',autonomy:'supervised'};}} as unknown as OrganizationAdapterService;
  const service=new HumanDigitalEmployeeActivationService(adapter,async()=>({ready:true}));
  const result=await service.activate(input);
  assert.equal(result.status,'active');
  assert.deepEqual(seen,[input]);
});
