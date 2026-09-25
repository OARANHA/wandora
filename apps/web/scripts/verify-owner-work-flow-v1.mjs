import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const workPage = read('src/pages/WorkPage.tsx');
const workPanel = read('src/components/DigitalEmployeeWorkPanel.tsx');
const notifier = read('src/components/WorkCompletionNotifier.tsx');
const approvals = read('src/pages/ApprovalsPage.tsx');
const conversations = read('src/pages/ConversationsPage.tsx');

const requireText = (source, text, label) => {
  if (!source.includes(text)) throw new Error(`Missing ${label}: ${text}`);
};

requireText(workPanel, 'Acompanhar trabalho', 'post-submit follow-up CTA');
requireText(workPanel, 'Conversas continua reservada ao histórico real de clientes e canais.', 'work/conversation boundary');
requireText(workPage, 'ACOMPANHE DO PEDIDO AO RESULTADO.', 'owner work lifecycle');
requireText(workPage, 'SÓ INTERROMPE VOCÊ QUANDO PRECISA.', 'attention separation');
requireText(workPage, 'customer-supervised-work-overview', 'supervised-work read projection');
requireText(notifier, 'trabalho concluído nesta sessão', 'ephemeral completion notice');
requireText(notifier, 'Wandora has no durable', 'no invented unread-state guardrail');
requireText(approvals, 'SEM APROVAÇÃO', 'truthful approvals empty state');
requireText(approvals, 'não usa exemplos fictícios', 'demo-data removal statement');
requireText(conversations, 'somente leitura', 'conversation read-only boundary');

for (const forbidden of ['Mariana', 'Clara', 'Desconto de 12%', 'Pedido #1842']) {
  if (approvals.includes(forbidden)) throw new Error(`Fictitious approval fixture remains: ${forbidden}`);
}

console.log('WANDORA_WEB_OWNER_WORK_FLOW_V1_OK');
