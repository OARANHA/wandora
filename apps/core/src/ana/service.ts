import { createHash } from 'node:crypto';
import type {
  AgentRuntime,
  InboundProcessingResult,
  InboundTextEvent,
  MessagingGateway,
  OrganizationId,
} from './contracts.js';
import { evaluateProposal } from './policy.js';
import { CoreStateError, PostgresAnaRepository } from './postgres-repository.js';

export class AnaServiceError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'AnaServiceError';
  }
}

export type AnaInboundServiceDeps = {
  repository: PostgresAnaRepository;
  runtime: AgentRuntime;
  messaging: MessagingGateway;
  now?: () => string;
};

const outboundKey = (organizationId: string, eventId: string) =>
  `out_${createHash('sha256').update(`${organizationId}|${eventId}|ana-reply-v1`).digest('hex')}`;
export class AnaInboundService {
  private readonly now: () => string;

  constructor(private readonly deps: AnaInboundServiceDeps) {
    this.now = deps.now ?? (() => new Date().toISOString());
  }

  async handle(
    organizationId: OrganizationId,
    event: InboundTextEvent,
  ): Promise<InboundProcessingResult> {
    const context = await this.deps.repository.acceptInbound(organizationId, event);
    if (context.duplicateResult) return context.duplicateResult;

    let proposal;
    try {
      proposal = await this.deps.runtime.proposeCommercialReply({
        organizationId,
        employee: context.employee,
        customerText: event.text,
        customerAddress: event.sender,
      });
    } catch (error) {
      await this.deps.repository.markInboundFailed({ organizationId, eventId: event.eventId });
      throw error;
    }

    if (proposal.kind !== 'send-text' || proposal.text.trim().length === 0) {
      await this.deps.repository.markInboundFailed({ organizationId, eventId: event.eventId });
      throw new AnaServiceError('invalid_proposal', 'Employee proposal is not a valid outbound text action.');
    }
    const decision = evaluateProposal(proposal);
    if (decision.decision === 'require-approval') {
      try {
        return await this.deps.repository.createApprovalAndComplete({
          organizationId,
          eventId: event.eventId,
          employeeId: context.employee.id,
          workItemId: context.workItemId,
          contactId: context.contactId,
          conversationId: context.conversationId,
          proposal,
          occurredAt: this.now(),
        });
      } catch (error) {
        await this.deps.repository.markInboundFailed({ organizationId, eventId: event.eventId });
        throw error;
      }
    }

    const idempotencyKey = outboundKey(organizationId, event.eventId);
    let preparation;
    try {
      preparation = await this.deps.repository.prepareOutbound({
        organizationId,
        employeeId: context.employee.id,
        workItemId: context.workItemId,
        conversationId: context.conversationId,
        eventId: event.eventId,
        idempotencyKey,
        body: proposal.text,
      });
    } catch (error) {
      await this.deps.repository.markInboundFailed({ organizationId, eventId: event.eventId });
      throw error;
    }
    if (preparation.status === 'uncertain') {
      return this.deps.repository.completeOutboundUncertain({
        organizationId,
        employeeId: context.employee.id,
        workItemId: context.workItemId,
        conversationId: context.conversationId,
        contactId: context.contactId,
        eventId: event.eventId,
        idempotencyKey,
        occurredAt: this.now(),
      });
    }

    if (preparation.status === 'succeeded') {
      return this.deps.repository.completeOutboundSuccess({
        organizationId,
        employeeId: context.employee.id,
        workItemId: context.workItemId,
        conversationId: context.conversationId,
        contactId: context.contactId,
        eventId: event.eventId,
        idempotencyKey,
        body: proposal.text,
        gatewayRequestId: preparation.gatewayRequestId,
        occurredAt: this.now(),
      });
    }

    let outbound;
    try {
      outbound = await this.deps.messaging.sendText({
        connectionId: context.connectionId,
        recipient: event.sender,
        text: proposal.text,
        idempotencyKey,
      });
    } catch {
      return this.deps.repository.completeOutboundUncertain({
        organizationId,
        employeeId: context.employee.id,
        workItemId: context.workItemId,
        conversationId: context.conversationId,
        contactId: context.contactId,
        eventId: event.eventId,
        idempotencyKey,
        occurredAt: this.now(),
      });
    }
    const successArgs = {
      organizationId,
      employeeId: context.employee.id,
      workItemId: context.workItemId,
      conversationId: context.conversationId,
      contactId: context.contactId,
      eventId: event.eventId,
      idempotencyKey,
      body: proposal.text,
      gatewayRequestId: outbound.requestId,
      occurredAt: this.now(),
    };

    try {
      return await this.deps.repository.completeOutboundSuccess(successArgs);
    } catch (firstError) {
      try {
        return await this.deps.repository.completeOutboundSuccess(successArgs);
      } catch {
        try {
          return await this.deps.repository.completeOutboundUncertain({
            organizationId,
            employeeId: context.employee.id,
            workItemId: context.workItemId,
            conversationId: context.conversationId,
            contactId: context.contactId,
            eventId: event.eventId,
            idempotencyKey,
            occurredAt: this.now(),
          });
        } catch {
          throw firstError;
        }
      }
    }
  }

  async decideApproval(args: {
    organizationId: OrganizationId;
    approvalId: string;
    actorUserId: string;
    decision: 'approve' | 'reject';
  }): Promise<InboundProcessingResult> {
    const decidedAt = this.now();
    const context = await this.deps.repository.decideApproval({
      organizationId: args.organizationId,
      approvalId: args.approvalId,
      actorUserId: args.actorUserId,
      decision: args.decision,
      decidedAt,
    });

    if (context.decision === 'rejected') {
      return {
        status: 'approval-rejected',
        contactId: context.contactId,
        conversationId: context.conversationId,
        workItemId: context.workItemId,
        approvalId: context.approvalId,
      };
    }

    const idempotencyKey = outboundKey(args.organizationId, context.eventId);
    const preparation = await this.deps.repository.prepareOutbound({
      organizationId: args.organizationId,
      employeeId: context.employeeId,
      workItemId: context.workItemId,
      conversationId: context.conversationId,
      eventId: context.eventId,
      idempotencyKey,
      body: context.proposedText,
    });

    if (preparation.status === 'uncertain') {
      return this.deps.repository.completeOutboundUncertain({
        organizationId: args.organizationId, employeeId: context.employeeId,
        workItemId: context.workItemId, conversationId: context.conversationId,
        contactId: context.contactId, eventId: context.eventId, idempotencyKey,
        occurredAt: this.now(),
      });
    }
    if (preparation.status === 'succeeded') {
      return this.deps.repository.completeOutboundSuccess({
        organizationId: args.organizationId, employeeId: context.employeeId,
        workItemId: context.workItemId, conversationId: context.conversationId,
        contactId: context.contactId, eventId: context.eventId, idempotencyKey,
        body: context.proposedText, gatewayRequestId: preparation.gatewayRequestId,
        occurredAt: this.now(),
      });
    }

    let outbound;
    try {
      outbound = await this.deps.messaging.sendText({
        connectionId: context.connectionId, recipient: context.recipient,
        text: context.proposedText, idempotencyKey,
      });
    } catch {
      return this.deps.repository.completeOutboundUncertain({
        organizationId: args.organizationId, employeeId: context.employeeId,
        workItemId: context.workItemId, conversationId: context.conversationId,
        contactId: context.contactId, eventId: context.eventId, idempotencyKey,
        occurredAt: this.now(),
      });
    }

    try {
      return await this.deps.repository.completeOutboundSuccess({
        organizationId: args.organizationId, employeeId: context.employeeId,
        workItemId: context.workItemId, conversationId: context.conversationId,
        contactId: context.contactId, eventId: context.eventId, idempotencyKey,
        body: context.proposedText, gatewayRequestId: outbound.requestId,
        occurredAt: this.now(),
      });
    } catch (firstError) {
      try {
        return await this.deps.repository.completeOutboundSuccess({
          organizationId: args.organizationId, employeeId: context.employeeId,
          workItemId: context.workItemId, conversationId: context.conversationId,
          contactId: context.contactId, eventId: context.eventId, idempotencyKey,
          body: context.proposedText, gatewayRequestId: outbound.requestId,
          occurredAt: this.now(),
        });
      } catch {
        try {
          return await this.deps.repository.completeOutboundUncertain({
            organizationId: args.organizationId, employeeId: context.employeeId,
            workItemId: context.workItemId, conversationId: context.conversationId,
            contactId: context.contactId, eventId: context.eventId, idempotencyKey,
            occurredAt: this.now(),
          });
        } catch {
          throw firstError;
        }
      }
    }
  }
}

export { CoreStateError };
