import { readFile } from 'node:fs/promises';

const pages = {
  dashboard: await readFile(new URL('../src/pages/DashboardPage.tsx', import.meta.url), 'utf8'),
  team: await readFile(new URL('../src/pages/TeamPage.tsx', import.meta.url), 'utf8'),
  conversations: await readFile(new URL('../src/pages/ConversationsPage.tsx', import.meta.url), 'utf8'),
  company: await readFile(new URL('../src/pages/CompanyPage.tsx', import.meta.url), 'utf8'),
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const [name, source] of Object.entries(pages)) {
  assert(!source.includes('6.7rem'), name + '_oversized_hero_forbidden');
  assert(!source.includes('6rem)]'), name + '_oversized_hero_forbidden');
}

assert(pages.company.includes('AS REGRAS DA'), 'company_reference_heading_missing');
assert(pages.company.includes('Ensinar isso'), 'company_teach_action_missing');
assert(pages.company.includes('como funciona'), 'company_how_it_works_missing');
assert(pages.company.includes('md:grid-cols-2'), 'company_rule_grid_missing');
assert(!/Otávio|Clara|Rafael|Agenda comercial|Planilha de preços|WhatsApp da empresa/.test(pages.company), 'company_demo_state_leak');

console.log('WANDORA_WEB_BUSINESS_DENSITY_V1_OK');