export type NormalizeContactInput = {
  name: string;
  email?: string;
};

export type NormalizeContactOutput = {
  normalizedName: string;
  normalizedEmail?: string;
};

export type WandoraRuntimeRequest = {
  operation: 'normalize-contact';
  payload: NormalizeContactInput;
};

export type WandoraRuntimeResult = {
  ok: true;
  operation: 'normalize-contact';
  output: NormalizeContactOutput;
};

export interface AgentRuntime {
  execute(request: WandoraRuntimeRequest): Promise<WandoraRuntimeResult>;
}
