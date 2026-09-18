import { readFile } from 'node:fs/promises';
import ts from 'typescript';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function loadHelper(relativeUrl) {
  const source = await readFile(new URL(relativeUrl, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
}

function memoryStorage() {
  const values = new Map();
  return {
    values,
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

const recovery = await loadHelper('../src/recoveryAccess.ts');
const invite = await loadHelper('../src/inviteAcceptance.ts');
const {
  parseRecoveryRedirectFragment,
  saveStagedRecoverySession,
  loadStagedRecoverySession,
  clearStagedRecoverySession,
  stageRecoveryRedirectFromCurrentLocation,
} = recovery;

const now = 2_000_000_000;
const validHash =
  '#access_token=recovery-access&token_type=bearer&expires_in=3600&expires_at=2000003600&refresh_token=recovery-refresh&type=recovery&sb=';

const parsed = parseRecoveryRedirectFragment(validHash, now);
assert(parsed?.accessToken === 'recovery-access', 'recovery_fragment_access_token_not_parsed');
assert(parsed?.refreshToken === 'recovery-refresh', 'recovery_fragment_refresh_token_not_parsed');
assert(parsed?.expiresAt === 2_000_003_600, 'recovery_fragment_expiry_not_parsed');
assert(parseRecoveryRedirectFragment(validHash.replace('&sb=', ''), now) === null, 'recovery_without_sb_must_fail');
assert(parseRecoveryRedirectFragment(validHash.replace('type=recovery', 'type=invite'), now) === null, 'non_recovery_fragment_must_fail');
assert(parseRecoveryRedirectFragment(validHash.replace('token_type=bearer', 'token_type=mac'), now) === null, 'non_bearer_recovery_must_fail');
assert(parseRecoveryRedirectFragment(validHash.replace('expires_at=2000003600', 'expires_at=1999999999'), now) === null, 'expired_recovery_must_fail');

const storage = memoryStorage();
let inviteTouched = false;
assert(
  invite.stageInviteRedirectFromCurrentLocation({
    location: { pathname: '/', search: '', hash: validHash },
    history: { replaceState() { inviteTouched = true; } },
    storage,
    nowSeconds: now,
  }) === false,
  'invite_handler_must_defer_recovery_flow',
);
assert(inviteTouched === false, 'invite_handler_must_not_erase_recovery_fragment');

let recoveryTouched = false;
const inviteHash = validHash.replace('type=recovery', 'type=invite');
assert(
  stageRecoveryRedirectFromCurrentLocation({
    location: { pathname: '/', search: '', hash: inviteHash },
    history: { replaceState() { recoveryTouched = true; } },
    storage,
    nowSeconds: now,
  }) === false,
  'recovery_handler_must_defer_invite_flow',
);
assert(recoveryTouched === false, 'recovery_handler_must_not_erase_invite_fragment');

let replacedUrl = null;
assert(
  stageRecoveryRedirectFromCurrentLocation({
    location: { pathname: '/', search: '?source=email', hash: validHash },
    history: { replaceState(_state, _unused, url) { replacedUrl = url; } },
    storage,
    nowSeconds: now,
  }) === true,
  'site_url_recovery_redirect_must_be_staged',
);
assert(replacedUrl === '/recover-access?source=email', 'recovery_fragment_not_canonicalized_and_removed');
assert(loadStagedRecoverySession(storage, now)?.accessToken === 'recovery-access', 'staged_recovery_not_reloadable');

clearStagedRecoverySession(storage);
assert(loadStagedRecoverySession(storage, now) === null, 'staged_recovery_not_cleared');

const blockedStorage = {
  getItem() { throw new Error('blocked'); },
  setItem() { throw new Error('blocked'); },
  removeItem() { throw new Error('blocked'); },
};
let blockedReplace = null;
assert(
  stageRecoveryRedirectFromCurrentLocation({
    location: { pathname: '/recover-access', search: '', hash: validHash },
    history: { replaceState(_state, _unused, url) { blockedReplace = url; } },
    storage: blockedStorage,
    nowSeconds: now,
  }) === true,
  'recovery_must_survive_same_page_when_session_storage_is_blocked',
);
assert(blockedReplace === '/recover-access', 'blocked_storage_recovery_fragment_not_removed');
assert(
  loadStagedRecoverySession(blockedStorage, now)?.refreshToken === 'recovery-refresh',
  'ephemeral_recovery_fallback_missing',
);
clearStagedRecoverySession(blockedStorage);

const invalidStorage = memoryStorage();
saveStagedRecoverySession(
  { accessToken: 'stale', refreshToken: 'stale-refresh', expiresAt: 2_000_003_600 },
  invalidStorage,
);
let invalidReplace = null;
assert(
  stageRecoveryRedirectFromCurrentLocation({
    location: {
      pathname: '/recover-access',
      search: '',
      hash: validHash.replace('token_type=bearer', 'token_type=mac'),
    },
    history: { replaceState(_state, _unused, url) { invalidReplace = url; } },
    storage: invalidStorage,
    nowSeconds: now,
  }) === false,
  'invalid_recovery_fragment_must_fail_closed',
);
assert(invalidReplace === '/recover-access', 'invalid_recovery_fragment_not_removed');
assert(loadStagedRecoverySession(invalidStorage, now) === null, 'invalid_recovery_must_clear_stale_stage');

const [authSource, providerSource, routerSource, mainSource, pageSource, inviteSource, packageSource] = await Promise.all([
  readFile(new URL('../src/auth.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/AuthProvider.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/router.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/main.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/RecoveryAccessPage.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/inviteAcceptance.ts', import.meta.url), 'utf8'),
  readFile(new URL('../package.json', import.meta.url), 'utf8'),
]);

for (const fragment of [
  "${SUPABASE_AUTH_ORIGIN}/auth/v1/recover",
  "method: 'POST'",
  "redirect_to: RECOVERY_REDIRECT_TO",
  "finalizeAuthenticatedUserPassword",
  "${SUPABASE_AUTH_ORIGIN}/auth/v1/user",
  "return await signInWithPassword(email, password);",
]) {
  assert(authSource.includes(fragment), `recovery_auth_contract_missing:${fragment}`);
}

assert(!authSource.includes('service_role'), 'service_role_must_not_enter_browser_auth');
assert(!pageSource.includes('service_role'), 'service_role_must_not_enter_recovery_page');
assert(routerSource.includes("path: '/recover-access'"), 'public_recovery_route_missing');
assert(providerSource.includes('completePasswordSetup'), 'shared_password_setup_bootstrap_missing');
assert(inviteSource.includes("fragment.get('type') === 'recovery'"), 'invite_handler_recovery_deferral_missing');
assert((await readFile(new URL('../src/recoveryAccess.ts', import.meta.url), 'utf8')).includes("fragment.get('type') === 'invite'"), 'recovery_handler_invite_deferral_missing');
assert(pageSource.includes('Se existir uma conta liberada para esse e-mail'), 'neutral_recovery_completion_copy_missing');
assert(pageSource.includes('finalizeAuthenticatedUserPassword'), 'recovery_shared_password_finalizer_missing');
assert(packageSource.includes('verify-recovery-access.mjs'), 'recovery_verifier_missing_from_build');

const inviteStageIndex = mainSource.indexOf('stageInviteRedirectFromCurrentLocation();');
const recoveryStageIndex = mainSource.indexOf('stageRecoveryRedirectFromCurrentLocation();');
const renderIndex = mainSource.indexOf('createRoot(');
assert(inviteStageIndex >= 0 && recoveryStageIndex >= 0, 'pre_render_auth_staging_missing');
assert(inviteStageIndex < recoveryStageIndex, 'invite_dispatch_order_changed');
assert(recoveryStageIndex < renderIndex, 'recovery_fragment_must_be_staged_before_react_render');

const finalizeIndex = pageSource.indexOf('const completed = await finalizeAuthenticatedUserPassword(active, password);');
const clearIndex = pageSource.indexOf('clearStagedRecoverySession();', finalizeIndex);
const promoteIndex = pageSource.indexOf('await completePasswordSetup(completed);');
assert(finalizeIndex >= 0, 'recovery_password_finalize_missing');
assert(clearIndex > finalizeIndex, 'recovery_staging_cleared_before_password_reconciliation');
assert(promoteIndex > clearIndex, 'recovery_session_promoted_before_password_reconciliation');

console.log('WANDORA_WEB_OWNER_INTERRUPTED_INVITE_RECOVERY_V1_OK');
console.log('WANDORA_WEB_SHARED_PASSWORD_FINALIZATION_V1_OK');
