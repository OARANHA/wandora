import { readFileSync } from 'node:fs';

const workPage = readFileSync(new URL('../src/pages/WorkPage.tsx', import.meta.url), 'utf8');

const requireText = (text, label) => {
  if (!workPage.includes(text)) throw new Error(`Missing ${label}: ${text}`);
};

requireText("type WorkFilter = 'all' | 'running' | 'review-ready' | 'uncertain'", 'bounded local work filters');
requireText('Buscar trabalho, pessoa ou resultado', 'local work search');
requireText('max-h-[34rem]', 'bounded work-list viewport');
requireText('Abrir resultado', 'compact row primary action');
requireText('role="dialog"', 'work detail drawer');
requireText('detalhe do trabalho', 'drawer heading');
requireText('pedido original', 'drawer original-request section');
requireText('Copiar resultado', 'local copy action');
requireText('Dar novo trabalho para {item.employeeName}', 'existing Team-route continuation');
requireText('esta tela não inventa vínculo persistente entre trabalhos', 'no invented related-work state');
requireText('SÓ INTERROMPE VOCÊ QUANDO PRECISA.', 'attention-required boundary preserved');

for (const forbidden of [
  'Marcar como revisado',
  'Arquivar trabalho',
  'Refazer trabalho',
  'retryWork',
  'reviewedAt',
  'unreadWork',
]) {
  if (workPage.includes(forbidden)) throw new Error(`Invented durable action/state found: ${forbidden}`);
}

console.log('WANDORA_WEB_WORK_OPERATOR_DRAWER_V1_OK');
