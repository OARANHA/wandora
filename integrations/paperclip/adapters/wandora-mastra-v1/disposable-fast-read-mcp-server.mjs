import readline from 'node:readline';

const send = (id, result) => {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
};

const sendError = (id, code, message) => {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n');
};

const tools = [{
  name: 'get_value',
  description: 'Read one deterministic synthetic value.',
  inputSchema: {
    type: 'object',
    properties: { key: { type: 'string' } },
    required: ['key'],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true },
}];

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let message;
  try {
    message = JSON.parse(trimmed);
  } catch {
    return;
  }
  if (typeof message.id !== 'number') return;

  if (message.method === 'initialize') {
    send(message.id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'wandora-fast-read-disposable', version: '1.0.0' },
    });
    return;
  }
  if (message.method === 'tools/list') {
    send(message.id, { tools });
    return;
  }
  if (message.method === 'tools/call') {
    if (message.params?.name !== 'get_value') {
      sendError(message.id, -32601, 'unknown tool');
      return;
    }
    const key = typeof message.params?.arguments?.key === 'string'
      ? message.params.arguments.key
      : '';
    if (!key) {
      sendError(message.id, -32602, 'key is required');
      return;
    }
    send(message.id, {
      content: [{ type: 'text', text: `synthetic:${key}:ok` }],
      isError: false,
    });
    return;
  }
  sendError(message.id, -32601, 'method not found');
});
