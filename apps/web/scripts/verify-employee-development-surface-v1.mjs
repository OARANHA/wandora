import { readFileSync } from 'node:fs';

const workPage = readFileSync(new URL('../src/pages/WorkPage.tsx', import.meta.url), 'utf8');
const teamPage = readFileSync(new URL('../src/pages/TeamPage.tsx', import.meta.url), 'utf8');
const developmentPanel = readFileSync(new URL('../src/components/DigitalEmployeeDevelopmentPanel.tsx', import.meta.url), 'utf8');
const teachFromWork = readFileSync(new URL('../src/components/TeachEmployeeFromWork.tsx', import.meta.url), 'utf8');
const workPanel = readFileSync(new URL('../src/components/DigitalEmployeeWorkPanel.tsx', import.meta.url), 'utf8');

const requireText = (source, text, label) => {
  if (!source.includes(text)) throw new Error(`Missing ${label}: ${text}`);
};

requireText(workPage, 'xl:grid-cols-[minmax(0,2.15fr)_minmax(20rem,0.85fr)]', 'desktop 70/30 work layout');
requireText(workPage, 'xl:sticky xl:top-6', 'desktop attention radar');
requireText(workPage, '<TeachEmployeeFromWork', 'work result to learning bridge');
requireText(teamPage, '<DigitalEmployeeDevelopmentPanel', 'Team employee development surface');
requireText(teamPage, 'xl:grid-cols-[minmax(0,1.3fr)_minmax(22rem,0.7fr)]', 'Team desktop development/work two-column layout');
requireText(teamPage, '<DigitalEmployeeWorkPanel employeeId={employee.id} employeeName={employee.name} compact />', 'Team compact work panel');


requireText(workPanel, 'compact?: boolean;', 'compact Team work-panel contract');
requireText(workPanel, "{item.result ? 'Abrir resultado' : 'Ver trabalho'}", 'compact work navigation');
requireText(workPanel, 'line-clamp-2', 'bounded recent-work preview');

for (const tab of ['Responsabilidades', 'Aprendizados', 'Autonomia']) {
  requireText(developmentPanel, tab, `employee development tab ${tab}`);
}
requireText(developmentPanel, '/development', 'real development Core endpoint');
requireText(developmentPanel, "'idempotency-key': input.idempotencyKey", 'retry-stable owner mutation identity');
requireText(developmentPanel, "provenanceType: 'owner_statement'", 'direct owner statement provenance');

requireText(teachFromWork, 'Ensinar à Ana', 'reviewed work learning action');
requireText(teachFromWork, "provenanceType: 'approved_learning'", 'approved work-derived learning provenance');
requireText(teachFromWork, 'sourceRef: `work:${workId}`', 'provider-neutral work evidence reference');
requireText(teachFromWork, 'O resultado deste trabalho não vira aprendizado automaticamente.', 'no automatic promotion');
requireText(teachFromWork, "'idempotency-key': input.idempotencyKey", 'retry-stable work learning identity');

for (const forbidden of [
  'item.result.summary,',
  'Paperclip Skill',
  'Mastra memory',
  'candidate-learning',
  'autoLearning',
]) {
  if (teachFromWork.includes(forbidden)) throw new Error(`Forbidden learning shortcut found: ${forbidden}`);
}

console.log('WANDORA_WEB_EMPLOYEE_DEVELOPMENT_SURFACE_V1_OK');
