import type { HttpRequest, HttpTransport } from './provider.js';

export class FetchHttpTransport implements HttpTransport {
  async request(input: HttpRequest): Promise<{ status: number; body: unknown }> {
    const response = await fetch(input.url, {
      method: input.method,
      headers: { ...input.headers, origin: 'https://app.wandora.com.br' },
      body: input.body,
    });

    const text = await response.text();
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      // Preserve non-JSON provider responses without leaking them through the gateway contract.
    }

    return { status: response.status, body };
  }
}
