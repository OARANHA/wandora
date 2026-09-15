export type InboundTextEvent = {
  eventId: string;
  connectionId: string;
  sender: string;
  text: string;
  occurredAt: string;
};

export type CoreInboundEnvelope = {
  organizationId: string;
  event: InboundTextEvent;
};

export type CoreForwardOutcome =
  | { kind: 'accepted'; status: 200 | 202 }
  | { kind: 'processing'; status: 409 }
  | { kind: 'permanent-rejection'; status: 422 };

export class CoreUnavailableError extends Error {
  constructor(message = 'Wandora Core supervised ingress is unavailable.') {
    super(message);
    this.name = 'CoreUnavailableError';
  }
}

export class IgnoredEvolutionEvent extends Error {
  constructor(public readonly reason: string) {
    super(reason);
    this.name = 'IgnoredEvolutionEvent';
  }
}

export class InvalidEvolutionEvent extends Error {
  constructor(public readonly reason: string) {
    super(reason);
    this.name = 'InvalidEvolutionEvent';
  }
}
