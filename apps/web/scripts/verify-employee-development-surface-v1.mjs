import { readFileSync } from 'node:fs';

const workPage = readFileSync(new URL('../src/pages/WorkPage.tsx', import.meta.url), 'utf8');
const teamPage = readFileSync(new URL('../src/pages/TeamPage.tsx', import.meta.url), 'utf8');
const developmentPanel = readFileSync(new URL('../src/components/DigitalEmployeeDevelopmentPanel.tsx', import.meta.url), 'utf8');
const teachFromWork = readFileSync(new URL('../src/components/TeachEmployeeFromWork.tsx', import.meta.url), 'utf8');
const workPanel = readFileSync(new URL('../src/components/DigitalEmployeeWorkPanel.tsx', import.meta.url), 'utf8');
const workDrawer = readFileSync(new URL('../src/components/DigitalEmployeeWorkDrawer.tsx', import.meta.url), 'utf8');
const developmentProgress = readFileSync(new URL('../src/components/DigitalEmployeeDevelopmentProgress.tsx', import.meta.url), 'utf8');

const requireText = (source, text, label) => {
  if (!source.includes(text)) throw new Error(`Missing ${label}: ${text}`);
};

requireText(workPage, 'xl:grid-cols-[minmax(0,2.15fr)_minmax(20rem,0.85fr)]', 'desktop 70/30 work layout');
requireText(workPage, 'xl:sticky xl:top-6', 'desktop attention radar');
requireText(workPage, '<TeachEmployeeFromWork', 'work result to learning bridge');
requireText(teamPage, '<DigitalEmployeeDevelopmentPanel', 'Team employee development surface');
requireText(teamPage, 'Dar trabalho para {employee.name}', 'employee card work CTA');
requireText(teamPage, '<DigitalEmployeeWorkDrawer', 'right-side employee work drawer');
requireText(teamPage, '<DigitalEmployeeDevelopmentProgress employeeId={employee.id} />', 'employee development progress bar');

requireText(workDrawer, 'absolute inset-y-0 right-0', 'right-side drawer placement');
requireText(workDrawer, 'max-w-[36rem]', 'bounded desktop drawer width');
requireText(workDrawer, '[scrollbar-width:none]', 'no visible drawer scrollbar');

requireText(workPanel, "type WorkTab = 'new' | 'recent';", 'drawer work tabs');
requireText(workPanel, 'const PAGE_SIZE = 5;', 'recent-work page size');
requireText(workPanel, 'Paginação dos trabalhos recentes', 'recent-work pagination');
requireText(workPanel, "{item.result ? 'Abrir resultado' : 'Ver trabalho'}", 'work navigation');
requireText(workPanel, 'items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)', 'client-side bounded pagination');

for (const marker of [
  'Papel',
  'Comportamento',
  'Prática',
  'Experiência',
  'Mede marcos observáveis da formação nesta empresa.',
]) {
  requireText(developmentProgress, marker, `development progress marker ${marker}`);
}
requireText(developmentProgress, "entry.kind === 'responsibility'", 'responsibility milestone');
requireText(developmentProgress, "entry.kind === 'behavior'", 'behavior milestone');
requireText(developmentProgress, "entry.kind === 'practice'", 'practice milestone');
requireText(developmentProgress, "item.state === 'review-ready' && Boolean(item.result)", 'recorded-experience milestone');
requireText(developmentProgress, 'Não mede inteligência, desempenho nem altera autonomia.', 'progress semantic boundary');

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
