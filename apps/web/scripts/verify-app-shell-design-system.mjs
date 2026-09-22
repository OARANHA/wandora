import { readFileSync } from 'node:fs';

const shell = readFileSync(new URL('../src/components/AppShell.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const route of ['/', '/team', '/work', '/conversations', '/approvals', '/company']) {
  assert(shell.includes(`to: '${route}'`), `app_shell_route_missing:${route}`);
}

assert(shell.includes("wandora.ui.sidebar-collapsed"), 'app_shell_sidebar_preference_missing');
assert(shell.includes('Recolher menu lateral'), 'app_shell_sidebar_collapse_control_missing');
assert(shell.includes('Expandir menu lateral'), 'app_shell_sidebar_expand_control_missing');
assert(shell.includes('onClick={() => void signOut()}'), 'app_shell_real_signout_missing');
assert(shell.includes('Sair do sistema'), 'app_shell_signout_label_missing');
assert(shell.includes('Power'), 'app_shell_power_control_missing');
assert(shell.includes("localStorage.setItem(SIDEBAR_COLLAPSED_KEY"), 'app_shell_sidebar_persistence_missing');

assert(main.includes("@fontsource/dela-gothic-one/latin-400.css"), 'display_font_latin_bundle_missing');
assert(main.includes("@fontsource/dela-gothic-one/latin-ext-400.css"), 'display_font_latin_ext_bundle_missing');
assert(main.includes("@fontsource-variable/space-grotesk"), 'body_font_bundle_missing');
assert(main.includes("@fontsource-variable/jetbrains-mono"), 'mono_font_bundle_missing');

assert(css.includes('--wandora-font-display'), 'display_font_token_missing');
assert(css.includes('--wandora-font-body'), 'body_font_token_missing');
assert(css.includes('--wandora-font-mono'), 'mono_font_token_missing');
assert(css.includes('"Dela Gothic One"'), 'display_font_family_missing');
assert(css.includes('"Space Grotesk Variable"'), 'body_font_family_missing');
assert(css.includes('"JetBrains Mono Variable"'), 'mono_font_family_missing');

assert(pkg.dependencies['@fontsource/dela-gothic-one'] === '5.3.0', 'display_font_dependency_unpinned');
assert(pkg.dependencies['@fontsource-variable/space-grotesk'] === '5.3.0', 'body_font_dependency_unpinned');
assert(pkg.dependencies['@fontsource-variable/jetbrains-mono'] === '5.3.0', 'mono_font_dependency_unpinned');

console.log('WANDORA_WEB_APP_SHELL_DESIGN_SYSTEM_V1_OK');