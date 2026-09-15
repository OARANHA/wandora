import { HumanAuthError } from '../human-auth/es256-jwks.js';
import {
  HumanAccessError,
  HumanNotFoundError,
  type HumanSupervisionReadService,
} from '../supervision/human-read.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WORK_PATH_RE = /^\/api\/v1\/organizations\/([^/]+)\/work\/attention-required$/;
const CONVERSATIONS_PATH_RE = /^\/api\/v1\/organizations\/([^/]+)\/conversations$/;
const CONVERSATION_DETAIL_PATH_RE = /^\/api\/v1\/organizations\/([^/]+)\/conversations\/([^/]+)$/;
const SESSION_PATH = '/api/v1/me';

export type HumanSupervisionRequest = {
  method: string | undefined;
  pathname: string;
  authorization: string | undefined;
};

export type HumanSupervisionResponse = {
  status: number;
  body: Record<string, unknown>;
};

export function isHumanSupervisionPath(pathname: string): boolean {
  return pathname === SESSION_PATH || pathname.startsWith('/api/v1/organizations/');
}

export function createHumanSupervisionHandler(service: HumanSupervisionReadService) {
  return async (request: HumanSupervisionRequest): Promise<HumanSupervisionResponse> => {
    if (request.method !== 'GET') {
      return { status: 405, body: { error: 'method-not-allowed' } };
    }

    try {
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
        return { status: 200, body: { items } };
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
      return { status: 500, body: { error: 'internal-error' } };
    }
  };
}
