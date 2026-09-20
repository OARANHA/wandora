import { DigitalEmployeeActivationError, type CatalogEmployeeResult } from '../organization-adapter/contracts.js';
import type { OrganizationAdapterService } from '../organization-adapter/service.js';
import type { RuntimeReadiness } from '../runtime/server.js';

export class HumanDigitalEmployeeActivationService {
  constructor(
    private readonly adapter: OrganizationAdapterService,
    private readonly checkReady: () => Promise<RuntimeReadiness>,
  ) {}

  async activate(input: {
    organizationId: string;
    actorUserId: string;
    employeeId: string;
  }): Promise<CatalogEmployeeResult> {
    const readiness = await this.checkReady();
    if (!readiness.ready) {
      throw new DigitalEmployeeActivationError('runtime-not-ready', 'Activation runtime is not ready.');
    }
    return this.adapter.activateCatalogEmployee(input);
  }
}
