import { HumanAuthError } from '../human-auth/es256-jwks.js';
import {
  DigitalEmployeeActivationError,
  DigitalEmployeeWorkError,
  OrganizationAdapterConflictError,
  OrganizationAdapterUnavailableError,
} from '../organization-adapter/contracts.js';
import type { OrganizationAdapterService } from '../organization-adapter/service.js';
import type { HumanDigitalEmployeeActivationService } from '../supervision/human-digital-employee-activation.js';
import type { HumanDigitalEmployeesReadService } from '../supervision/human-digital-employees-read.js';
import {
  HumanAccessError,
  HumanNotFoundError,
  type HumanSupervisionReadService,
} from '../supervision/human-read.js';
import {
  HumanGroundingConflictError,
  type HumanGroundingService,
} from '../supervision/human-grounding.js';
import {
  HumanSendProposalConflictError,
  HumanSendProposalDeliveryUncertainError,
  type HumanSendProposalService,
} from '../supervision/human-send-proposal.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONFIRMATION_VERSION_RE = /^sha256:[0-9a-f]{64}$/;
const WORK_PATH_RE = /^\/api\/v1\/organizations\/([^/]+)\/work\/attention-required$/;
const SEND_PROPOSAL_PATH_RE = /^\/api\/v1\/organizations\/([^/]+)\/work\/([^/]+)\/proposals\/([^/]+)\/send$/;
const DIGITAL_EMPLOYEES_PATH_RE = /^\/api\/v1\/organizations\/([^/]+)\/digital-employees$/;
const DIGITAL_EMPLOYEE_ACTIVATE_PATH_RE = /^\/api\/v1\/organizations\/([^/]+)\/digital-employees\/([^/]+)\/activate$/;
const DIGITAL_EMPLOYEE_WORK_PATH_RE = /^\/api\/v1\/organizations\/([^/]+)\/digital-employees\/([^/]+)\/work$/;
const CONVERSATIONS_PATH_RE = /^\/api\/v1\/organizations\/([^/]+)\/conversations$/;
const CONVERSATION_DETAIL_PATH_RE = /^\/api\/v1\/organizations\/([^/]+)\/conversations\/([^/]+)$/;
const GROUNDING_PATH_RE = /^\/api\/v1\/organizations\/([^/]+)\/grounding$/;
const GROUNDING_RETIRE_PATH_RE = /^\/api\/v1\/organizations\/([^/]+)\/grounding\/([^/]+)\/retire$/;
const GROUNDING_CORRECT_PATH_RE = /^\/api\/v1\/organizations\/([^/]+)\/grounding\/([^/]+)\/correct$/;
const SESSION_PATH = '/api/v1/me';
const CATALOG_KEY_RE = /^[a-z0-9][a-z0-9._-]{2,63}$/;

export type HumanSupervisionRequest = {
  method: string | undefined;
  pathname: string;
  authorization: string | undefined;
  idempotencyKey?: string | undefined;
  rawBody?: string | undefined;
};

export type HumanSupervisionResponse = {
  status: number;
  body: Record<string, unknown>;
};

export function isHumanSupervisionPath(pathname: string): boolean {
  return pathname === SESSION_PATH || pathname.startsWith('/api/v1/organizations/');
}

export function isHumanSendProposalPath(pathname: string): boolean {
  const match = SEND_PROPOSAL_PATH_RE.exec(pathname);
  return Boolean(
    match
    && match[1]
    && match[2]
    && match[3]
    && UUID_RE.test(match[1])
    && UUID_RE.test(match[2])
    && UUID_RE.test(match[3])
  );
}

export function isHumanDigitalEmployeeHirePath(pathname: string): boolean {
  const match = DIGITAL_EMPLOYEES_PATH_RE.exec(pathname);
  return Boolean(match?.[1] && UUID_RE.test(match[1]));
}

export function isHumanDigitalEmployeeActivationPath(pathname: string): boolean {
  const match = DIGITAL_EMPLOYEE_ACTIVATE_PATH_RE.exec(pathname);
  return Boolean(match?.[1] && match?.[2] && UUID_RE.test(match[1]) && UUID_RE.test(match[2]));
}

export function isHumanDigitalEmployeeWorkPath(pathname: string): boolean {
  const match = DIGITAL_EMPLOYEE_WORK_PATH_RE.exec(pathname);
  return Boolean(match?.[1] && match?.[2] && UUID_RE.test(match[1]) && UUID_RE.test(match[2]));
}

export function isHumanGroundingMutationPath(pathname: string): boolean {
  const create = GROUNDING_PATH_RE.exec(pathname);
  if (create?.[1] && UUID_RE.test(create[1])) return true;

  const correction = GROUNDING_CORRECT_PATH_RE.exec(pathname);
  return Boolean(
    correction?.[1]
    && correction?.[2]
    && UUID_RE.test(correction[1])
    && UUID_RE.test(correction[2])
  );
}

function parseDigitalEmployeeWorkRequest(rawBody: string | undefined): {
  title: string;
  description: string;
} | undefined {
  if (!rawBody || rawBody.length > 8_192) return undefined;
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
    const record = parsed as Record<string, unknown>;
    if (
      Object.keys(record).sort().join(',') !== 'description,title'
      || typeof record.title !== 'string'
      || typeof record.description !== 'string'
    ) return undefined;
    const title = record.title.trim();
    const description = record.description.trim();
    if (!title || title.length > 200 || !description || description.length > 4000) return undefined;
    return { title, description };
  } catch {
    return undefined;
  }
}

function parseCatalogHireRequest(rawBody: string | undefined): { catalogKey: string } | undefined {
  if (!rawBody || rawBody.length > 1_024) return undefined;
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
    const record = parsed as Record<string, unknown>;
    if (
      Object.keys(record).length !== 1
      || typeof record.catalogKey !== 'string'
      || !CATALOG_KEY_RE.test(record.catalogKey)
    ) return undefined;
    return { catalogKey: record.catalogKey };
  } catch {
    return undefined;
  }
}

function parseGroundingCreateRequest(rawBody: string | undefined): {
  entryType: 'fact' | 'rule';
  content: string;
  provenanceType: 'owner_statement' | 'approved_source';
  sourceRef: string | null;
  sourceLabel: string | null;
} | undefined {
  if (!rawBody || rawBody.length > 8_192) return undefined;
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
    const record = parsed as Record<string, unknown>;
    const allowed = new Set(['entryType', 'content', 'provenanceType', 'sourceRef', 'sourceLabel']);
    if (Object.keys(record).some((key) => !allowed.has(key))) return undefined;
    if (record.entryType !== 'fact' && record.entryType !== 'rule') return undefined;
    if (record.provenanceType !== 'owner_statement' && record.provenanceType !== 'approved_source') return undefined;
    if (typeof record.content !== 'string') return undefined;
    const content = record.content.trim();
    if (!content || content.length > 4000) return undefined;
    const sourceRef = record.sourceRef == null ? null : typeof record.sourceRef === 'string' ? record.sourceRef.trim() : undefined;
    const sourceLabel = record.sourceLabel == null ? null : typeof record.sourceLabel === 'string' ? record.sourceLabel.trim() : undefined;
    if (sourceRef === undefined || sourceLabel === undefined) return undefined;
    if (sourceRef !== null && (!sourceRef || sourceRef.length > 1024)) return undefined;
    if (sourceLabel !== null && (!sourceLabel || sourceLabel.length > 255)) return undefined;
    if (record.provenanceType === 'approved_source' && sourceRef === null) return undefined;
    return { entryType: record.entryType, content, provenanceType: record.provenanceType, sourceRef, sourceLabel };
  } catch {
    return undefined;
  }
}

function parseGroundingCorrectionRequest(rawBody: string | undefined): {
  content: string;
  sourceRef: string;
  sourceLabel: string | null;
} | undefined {
  if (!rawBody || rawBody.length > 8_192) return undefined;
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
    const record = parsed as Record<string, unknown>;
    const allowed = new Set(['content', 'sourceRef', 'sourceLabel']);
    if (Object.keys(record).some((key) => !allowed.has(key))) return undefined;
    if (typeof record.content !== 'string' || typeof record.sourceRef !== 'string') return undefined;
    const content = record.content.trim();
    const sourceRef = record.sourceRef.trim();
    const sourceLabel = record.sourceLabel == null ? null : typeof record.sourceLabel === 'string' ? record.sourceLabel.trim() : undefined;
    if (!content || content.length > 4000 || !sourceRef || sourceRef.length > 1024) return undefined;
    if (sourceLabel === undefined || (sourceLabel !== null && (!sourceLabel || sourceLabel.length > 255))) return undefined;
    return { content, sourceRef, sourceLabel };
  } catch {
    return undefined;
  }
}

function parseConfirmationVersion(rawBody: string | undefined): string | undefined {
  if (!rawBody || rawBody.length > 1_024) return undefined;
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
    const record = parsed as Record<string, unknown>;
    if (Object.keys(record).length !== 1 || typeof record.confirmationVersion !== 'string') return undefined;
    return CONFIRMATION_VERSION_RE.test(record.confirmationVersion) ? record.confirmationVersion : undefined;
  } catch {
    return undefined;
  }
}

export function createHumanSupervisionHandler(
  service: HumanSupervisionReadService,
  sendProposalService?: HumanSendProposalService,
  digitalEmployeesService?: HumanDigitalEmployeesReadService,
  digitalEmployeeHireService?: OrganizationAdapterService,
  digitalEmployeeActivationService?: HumanDigitalEmployeeActivationService,
  digitalEmployeeWorkService?: OrganizationAdapterService,
  groundingService?: HumanGroundingService,
) {
  return async (request: HumanSupervisionRequest): Promise<HumanSupervisionResponse> => {
    try {
      const sendMatch = SEND_PROPOSAL_PATH_RE.exec(request.pathname);
      if (sendMatch) {
        if (!sendProposalService) {
          return { status: 404, body: { error: 'not-found' } };
        }
        if (request.method !== 'POST') {
          return { status: 405, body: { error: 'method-not-allowed' } };
        }

        const organizationId = sendMatch[1];
        const workItemId = sendMatch[2];
        const proposalId = sendMatch[3];
        const confirmationVersion = parseConfirmationVersion(request.rawBody);
        if (
          !organizationId
          || !workItemId
          || !proposalId
          || !UUID_RE.test(organizationId)
          || !UUID_RE.test(workItemId)
          || !UUID_RE.test(proposalId)
        ) {
          return { status: 404, body: { error: 'not-found' } };
        }
        if (!confirmationVersion) {
          return { status: 400, body: { error: 'invalid-confirmation' } };
        }

        const result = await sendProposalService.sendProposal({
          authorization: request.authorization,
          organizationId,
          workItemId,
          proposalId,
          confirmationVersion,
        });
        return { status: 200, body: result };
      }

      const groundingRetireMatch = GROUNDING_RETIRE_PATH_RE.exec(request.pathname);
      if (groundingRetireMatch) {
        const organizationId = groundingRetireMatch[1];
        const entryId = groundingRetireMatch[2];
        if (!organizationId || !entryId || !UUID_RE.test(organizationId) || !UUID_RE.test(entryId)) {
          return { status: 404, body: { error: 'not-found' } };
        }
        if (!groundingService) return { status: 404, body: { error: 'not-found' } };
        if (request.method !== 'POST') return { status: 405, body: { error: 'method-not-allowed' } };
        if (request.rawBody?.trim()) return { status: 400, body: { error: 'invalid-grounding-request' } };
        const idempotencyKey = request.idempotencyKey?.trim();
        if (!idempotencyKey || idempotencyKey.length > 255) {
          return { status: 400, body: { error: 'invalid-grounding-request' } };
        }
        const entry = await groundingService.retire({
          organizationId,
          authorization: request.authorization,
          idempotencyKey,
          entryId,
        });
        return { status: 200, body: { entry } };
      }

      const groundingCorrectMatch = GROUNDING_CORRECT_PATH_RE.exec(request.pathname);
      if (groundingCorrectMatch) {
        const organizationId = groundingCorrectMatch[1];
        const entryId = groundingCorrectMatch[2];
        if (!organizationId || !entryId || !UUID_RE.test(organizationId) || !UUID_RE.test(entryId)) {
          return { status: 404, body: { error: 'not-found' } };
        }
        if (!groundingService) return { status: 404, body: { error: 'not-found' } };
        if (request.method !== 'POST') return { status: 405, body: { error: 'method-not-allowed' } };
        const idempotencyKey = request.idempotencyKey?.trim();
        const correction = parseGroundingCorrectionRequest(request.rawBody);
        if (!idempotencyKey || idempotencyKey.length > 255 || !correction) {
          return { status: 400, body: { error: 'invalid-grounding-request' } };
        }
        const entry = await groundingService.correct({
          organizationId,
          authorization: request.authorization,
          idempotencyKey,
          entryId,
          ...correction,
        });
        return { status: 200, body: { entry } };
      }

      const groundingMatch = GROUNDING_PATH_RE.exec(request.pathname);
      if (groundingMatch) {
        const organizationId = groundingMatch[1];
        if (!organizationId || !UUID_RE.test(organizationId)) {
          return { status: 404, body: { error: 'not-found' } };
        }
        if (!groundingService) return { status: 404, body: { error: 'not-found' } };
        if (request.method === 'GET') {
          const items = await groundingService.list(request.authorization, organizationId);
          return { status: 200, body: { items } };
        }
        if (request.method !== 'POST') return { status: 405, body: { error: 'method-not-allowed' } };
        const idempotencyKey = request.idempotencyKey?.trim();
        const creation = parseGroundingCreateRequest(request.rawBody);
        if (!idempotencyKey || idempotencyKey.length > 255 || !creation) {
          return { status: 400, body: { error: 'invalid-grounding-request' } };
        }
        const entry = await groundingService.create({
          organizationId,
          authorization: request.authorization,
          idempotencyKey,
          ...creation,
        });
        return { status: 200, body: { entry } };
      }

      const employeeWorkMatch = DIGITAL_EMPLOYEE_WORK_PATH_RE.exec(request.pathname);
      if (employeeWorkMatch) {
        const organizationId = employeeWorkMatch[1];
        const employeeId = employeeWorkMatch[2];
        if (!organizationId || !employeeId || !UUID_RE.test(organizationId) || !UUID_RE.test(employeeId)) {
          return { status: 404, body: { error: 'not-found' } };
        }
        if (!digitalEmployeeWorkService) return { status: 404, body: { error: 'not-found' } };

        const session = await service.getSessionContext(request.authorization);
        if (request.method === 'GET') {
          const items = await digitalEmployeeWorkService.listCatalogEmployeeWork({
            organizationId,
            actorUserId: session.user.id,
            employeeId,
          });
          return { status: 200, body: { items } };
        }
        if (request.method !== 'POST') {
          return { status: 405, body: { error: 'method-not-allowed' } };
        }
        const idempotencyKey = request.idempotencyKey?.trim();
        const workRequest = parseDigitalEmployeeWorkRequest(request.rawBody);
        if (!idempotencyKey || idempotencyKey.length > 255 || !workRequest) {
          return { status: 400, body: { error: 'invalid-work-request' } };
        }
        const work = await digitalEmployeeWorkService.ensureCatalogEmployeeWork({
          organizationId,
          actorUserId: session.user.id,
          employeeId,
          idempotencyKey,
          title: workRequest.title,
          description: workRequest.description,
        });
        return { status: 200, body: { work } };
      }

      const activationMatch = DIGITAL_EMPLOYEE_ACTIVATE_PATH_RE.exec(request.pathname);
      if (activationMatch) {
        const organizationId = activationMatch[1];
        const employeeId = activationMatch[2];
        if (!organizationId || !employeeId || !UUID_RE.test(organizationId) || !UUID_RE.test(employeeId)) {
          return { status: 404, body: { error: 'not-found' } };
        }
        if (request.method !== 'POST') return { status: 405, body: { error: 'method-not-allowed' } };
        if (!digitalEmployeeActivationService) return { status: 404, body: { error: 'not-found' } };
        if (request.rawBody?.trim()) return { status: 400, body: { error: 'invalid-activation-request' } };

        const session = await service.getSessionContext(request.authorization);
        const employee = await digitalEmployeeActivationService.activate({
          organizationId,
          actorUserId: session.user.id,
          employeeId,
        });
        return { status: 200, body: { employee } };
      }

      const digitalEmployeesMatch = DIGITAL_EMPLOYEES_PATH_RE.exec(request.pathname);
      const digitalEmployeesOrganizationId = digitalEmployeesMatch?.[1];
      if (digitalEmployeesOrganizationId) {
        if (!UUID_RE.test(digitalEmployeesOrganizationId)) {
          return { status: 404, body: { error: 'not-found' } };
        }

        if (request.method === 'POST') {
          if (!digitalEmployeeHireService) {
            return { status: 404, body: { error: 'not-found' } };
          }
          const idempotencyKey = request.idempotencyKey?.trim();
          const hireRequest = parseCatalogHireRequest(request.rawBody);
          if (!idempotencyKey || idempotencyKey.length > 255 || !hireRequest) {
            return { status: 400, body: { error: 'invalid-hire-request' } };
          }
          const session = await service.getSessionContext(request.authorization);
          const employee = await digitalEmployeeHireService.ensureCatalogEmployee({
            organizationId: digitalEmployeesOrganizationId,
            actorUserId: session.user.id,
            catalogKey: hireRequest.catalogKey,
            idempotencyKey,
          });
          return { status: 200, body: { employee } };
        }

        if (request.method !== 'GET') {
          return { status: 405, body: { error: 'method-not-allowed' } };
        }
        if (!digitalEmployeesService) {
          return { status: 404, body: { error: 'not-found' } };
        }
        const view = await digitalEmployeesService.getDigitalEmployeesView(
          request.authorization,
          digitalEmployeesOrganizationId,
        );
        return { status: 200, body: view };
      }

      if (request.method !== 'GET') {
        return { status: 405, body: { error: 'method-not-allowed' } };
      }

      if (request.pathname === SESSION_PATH) {
        const session = await service.getSessionContext(request.authorization);
        return { status: 200, body: session };
      }

      const workMatch = WORK_PATH_RE.exec(request.pathname);
      const workOrganizationId = workMatch?.[1];
      if (workOrganizationId) {
        if (!UUID_RE.test(workOrganizationId)) {
          return { status: 404, body: { error: 'not-found' } };
        }
        const items = await service.listAttentionRequired(request.authorization, workOrganizationId);
        if (!sendProposalService) {
          return { status: 200, body: { items } };
        }

        const proposalIds = items.flatMap((item) => item.proposal ? [item.proposal.id] : []);
        const actionStates = await sendProposalService.getAttentionActionStates({
          authorization: request.authorization,
          organizationId: workOrganizationId,
          proposalIds,
        });
        const decoratedItems = items.map((item) => (
          item.proposal
            ? {
                ...item,
                proposal: {
                  ...item.proposal,
                  sendAction: actionStates.get(item.proposal.id)
                    ?? { state: 'unavailable' as const, reason: 'proposal-not-current' as const },
                },
              }
            : item
        ));
        return { status: 200, body: { items: decoratedItems } };
      }

      const conversationsMatch = CONVERSATIONS_PATH_RE.exec(request.pathname);
      const conversationsOrganizationId = conversationsMatch?.[1];
      if (conversationsOrganizationId) {
        if (!UUID_RE.test(conversationsOrganizationId)) {
          return { status: 404, body: { error: 'not-found' } };
        }
        const items = await service.listConversations(request.authorization, conversationsOrganizationId);
        return { status: 200, body: { items } };
      }

      const detailMatch = CONVERSATION_DETAIL_PATH_RE.exec(request.pathname);
      const detailOrganizationId = detailMatch?.[1];
      const conversationId = detailMatch?.[2];
      if (detailOrganizationId && conversationId) {
        if (!UUID_RE.test(detailOrganizationId) || !UUID_RE.test(conversationId)) {
          return { status: 404, body: { error: 'not-found' } };
        }
        const detail = await service.getConversationDetail(
          request.authorization,
          detailOrganizationId,
          conversationId,
        );
        return { status: 200, body: detail };
      }

      return { status: 404, body: { error: 'not-found' } };
    } catch (error) {
      if (error instanceof HumanAuthError) {
        if (error.code === 'jwks-unavailable') {
          return { status: 503, body: { error: 'authentication-unavailable' } };
        }
        return { status: 401, body: { error: 'unauthorized' } };
      }
      if (error instanceof HumanAccessError) {
        return { status: 403, body: { error: 'forbidden' } };
      }
      if (error instanceof HumanNotFoundError) {
        return { status: 404, body: { error: 'not-found' } };
      }
      if (error instanceof HumanGroundingConflictError) {
        return { status: 409, body: { error: error.code } };
      }
      if (error instanceof DigitalEmployeeActivationError) {
        if (error.code === 'employee-not-activatable') {
          return { status: 409, body: { error: 'employee-not-activatable' } };
        }
        if (error.code === 'provider-activation-uncertain') {
          return { status: 409, body: { error: 'employee-activation-uncertain', retry: 'same-activation-contract' } };
        }
        return { status: 503, body: { error: 'employee-activation-unavailable' } };
      }
      if (error instanceof DigitalEmployeeWorkError) {
        if (error.code === 'provider-work-uncertain') {
          return {
            status: 409,
            body: { error: 'employee-work-uncertain', retry: 'same-idempotency-key' },
          };
        }
        if (
          error.code === 'employee-work-unavailable'
          || error.code === 'work-execution-unavailable'
          || error.code === 'work-execution-uncertain'
        ) {
          return { status: 409, body: { error: error.code } };
        }
        return { status: 503, body: { error: 'employee-work-unavailable' } };
      }
      if (error instanceof OrganizationAdapterConflictError) {
        return { status: 409, body: { error: error.code } };
      }
      if (error instanceof OrganizationAdapterUnavailableError) {
        if (
          error.code === 'catalog-employee-unknown'
          || error.code === 'catalog-hire-not-eligible'
        ) {
          return { status: 404, body: { error: 'employee-not-available' } };
        }
        if (error.code === 'provider-not-configured') {
          return { status: 503, body: { error: 'employee-hiring-unavailable' } };
        }
        return {
          status: 409,
          body: { error: 'employee-hiring-uncertain', retry: 'same-idempotency-key' },
        };
      }
      if (error instanceof HumanSendProposalConflictError) {
        return { status: 409, body: { error: error.code } };
      }
      if (error instanceof HumanSendProposalDeliveryUncertainError) {
        return {
          status: 409,
          body: { error: 'delivery-uncertain', retry: false },
        };
      }
      return { status: 500, body: { error: 'internal-error' } };
    }
  };
}