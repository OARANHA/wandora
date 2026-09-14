export type EvolutionConnection = {
  instanceName: string;
  baseUrl: string;
  apiKey: string;
};

export interface EvolutionConnectionResolver {
  resolve(connectionId: string): Promise<EvolutionConnection>;
}

export type HttpRequest = {
  url: string;
  method: 'POST';
  headers: Record<string, string>;
  body: string;
};

export interface HttpTransport {
  request(input: HttpRequest): Promise<{ status: number; body: unknown }>;
}
