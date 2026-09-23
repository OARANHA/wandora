import { readFileSync } from 'node:fs';

const dashboard = readFileSync(new URL('../src/pages/DashboardPage.tsx', import.meta.url), 'utf8');
const company = readFileSync(new URL('../src/pages/CompanyPage.tsx', import.meta.url), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(dashboard.includes('greetingForHour'), 'home_greeting_helper_missing');
assert(dashboard.includes("context?.user.name"), 'home_logged_user_name_missing');
assert(dashboard.includes("'Bom dia'"), 'home_good_morning_missing');
assert(dashboard.includes("'Boa tarde'"), 'home_good_afternoon_missing');
assert(dashboard.includes("'Boa noite'"), 'home_good_evening_missing');
assert(dashboard.includes('text-[clamp(1.9rem,3vw,3rem)]'), 'home_hero_density_missing');
assert(!dashboard.includes('6.7rem'), 'home_oversized_hero_regression');
assert(dashboard.includes('Ver aprovações'), 'home_quick_approvals_missing');
assert(dashboard.includes('Conversas'), 'home_quick_conversations_missing');
assert(dashboard.includes('Ensinar algo'), 'home_quick_teach_missing');

assert(company.includes('selectedEntry'), 'company_selected_entry_missing');
assert(company.includes('EntryDrawer'), 'company_right_drawer_missing');
assert(company.includes('line-clamp-4'), 'company_card_preview_missing');
assert(company.includes('Ver detalhes'), 'company_card_detail_action_missing');
assert(company.includes('absolute inset-y-0 right-0'), 'company_right_drawer_position_missing');
assert(company.includes("event.key === 'Escape'"), 'company_drawer_escape_close_missing');
assert(company.includes('text-[clamp(1.9rem,3vw,3rem)]'), 'company_header_density_missing');
assert(company.includes('text-[clamp(1.35rem,2vw,1.85rem)]'), 'company_section_density_missing');

console.log('WANDORA_WEB_HOME_GREETING_COMPANY_DRAWER_V1_OK');