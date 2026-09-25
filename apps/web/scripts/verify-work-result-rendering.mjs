import { readFile } from 'node:fs/promises';
import ts from 'typescript';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const helperSource = await readFile(
  new URL('../src/workResultFormat.ts', import.meta.url),
  'utf8',
);
const rendererSource = await readFile(
  new URL('../src/components/WorkResultContent.tsx', import.meta.url),
  'utf8',
);
const panelSource = await readFile(
  new URL('../src/components/DigitalEmployeeWorkPanel.tsx', import.meta.url),
  'utf8',
);
const workPageSource = await readFile(
  new URL('../src/pages/WorkPage.tsx', import.meta.url),
  'utf8',
);
const dashboardSource = await readFile(
  new URL('../src/pages/DashboardPage.tsx', import.meta.url),
  'utf8',
);

const compiledHelper = ts.transpileModule(helperSource, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;

const helper = await import(
  `data:text/javascript;base64,${Buffer.from(compiledHelper).toString('base64')}`
);

const sample = [
  '# Abordagem comercial',
  '',
  '**Benefícios**',
  '- **Organização:** agenda centralizada',
  '- Segurança com `revisão humana`',
  '',
  '1. Primeiro contato',
  '2. Revisão',
  '',
  '> Não enviar mensagem externa.',
  '',
  '[Clique aqui](https://example.invalid/nao-navegar)',
  '<script>alert("x")</script>',
].join('\n');

const blocks = helper.parseWorkResult(sample);
assert(blocks.some((block) => block.kind === 'heading'), 'work_result_heading_missing');
assert(blocks.some((block) => block.kind === 'unordered-list'), 'work_result_unordered_list_missing');
assert(blocks.some((block) => block.kind === 'ordered-list'), 'work_result_ordered_list_missing');
assert(blocks.some((block) => block.kind === 'quote'), 'work_result_quote_missing');
assert(
  JSON.stringify(blocks).includes('"kind":"strong"'),
  'work_result_strong_inline_missing',
);
assert(
  JSON.stringify(blocks).includes('"kind":"code"'),
  'work_result_code_inline_missing',
);
assert(
  !JSON.stringify(blocks).includes('https://example.invalid'),
  'work_result_link_target_must_not_survive',
);

const preview = helper.workResultPlainText(sample, 500);
assert(!preview.includes('**'), 'work_result_preview_markdown_strong_leaked');
assert(!preview.includes('https://example.invalid'), 'work_result_preview_link_target_leaked');
assert(preview.includes('Clique aqui'), 'work_result_preview_link_label_missing');

assert(
  !rendererSource.includes('dangerouslySetInnerHTML')
    && !rendererSource.includes('innerHTML')
    && !rendererSource.includes('href='),
  'work_result_renderer_must_remain_inert',
);
assert(
  workPageSource.includes('<WorkResultContent value={item.result.summary} />'),
  'work_result_detail_safe_renderer_missing',
);
assert(
  !panelSource.includes('item.result.summary'),
  'work_result_team_panel_must_not_render_full_result',
);
assert(
  dashboardSource.includes('workResultPlainText(latestWork.result.summary'),
  'work_result_dashboard_plain_preview_missing',
);

console.log('WANDORA_WEB_WORK_RESULT_SAFE_RENDERING_V1_OK');
