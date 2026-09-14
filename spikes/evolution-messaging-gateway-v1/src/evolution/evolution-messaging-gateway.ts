import { createHash } from 'node:crypto';
import type {
  MessagingGateway,
  OutboundTextMessage,
  OutboundTextResult,
} from '../contracts/messaging-gateway.js';
import { outboundTextMessageSchema } from '../contracts/schemas.js';
import type { OutboundAttemptStore } from '../runtime/outbound-idempotency.js';
import type { EvolutionConnectionResolver, HttpTransport } from './provider.js';

function fingerprint(message: OutboundTextMessage): string {
  return createHash('sha256')
    .update(JSON.stringify({
      connectionId: message.connectionId,
      recipient: message.recipient,
      text: message.text,
    }))
    .digest('hex');
}

export class EvolutionMessagingGateway implements MessagingGateway {
  constructor(
    private readonly connections: EvolutionConnectionResolver,
    private readonly http: HttpTransport,
    private readonly attempts: OutboundAttemptStore,
  ) {}

  async sendText(input: OutboundTextMessage): Promise<OutboundTextResult> {
    const message = outboundTextMessageSchema.parse(input);
    const messageFingerprint = fingerprint(message);
    const begin = await this.attempts.begin(message.idempotencyKey, messageFingerprint);

    if (begin.kind === 'existing') {
      if (begin.attempt.fingerprint !== messageFingerprint) {
        throw new Error('Idempotency key reused with different outbound content');
      }
      if (begin.attempt.state === 'succeeded') return begin.attempt.result;
      throw new Error(`Outbound delivery state is ${begin.attempt.state}; automatic retry refused`);
    }

    const connection = await this.connections.resolve(message.connectionId);
    const number = message.recipient.replace(/\D/g, '');
    const baseUrl = connection.baseUrl.replace(/\/$/, '');
    const url = `${baseUrl}/message/sendText/${encodeURIComponent(connection.instanceName)}`;

    let response: { status: number; body: unknown };
    try {
      response = await this.http.request({
        url,
        method: 'POST',
        headers: { 'content-type': 'application/json', apikey: connection.apiKey },
        body: JSON.stringify({ number, text: message.text }),
      });
    } catch {
      await this.attempts.markUncertain(message.idempotencyKey, messageFingerprint);
      throw new Error('Evolution sendText transport failed; delivery state is uncertain');
    }

    if (response.status < 200 || response.status >= 300) {
      await this.attempts.markUncertain(message.idempotencyKey, messageFingerprint);
      throw new Error(`Evolution sendText failed with HTTP ${response.status}; delivery state is uncertain`);
    }

    const result: OutboundTextResult = {
      accepted: true,
      requestId: message.idempotencyKey,
    };
    await this.attempts.markSucceeded(message.idempotencyKey, messageFingerprint, result);
    return result;
  }
}
