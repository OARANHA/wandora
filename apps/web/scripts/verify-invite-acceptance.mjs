import { readFile } from 'node:fs/promises';
import ts from 'typescript';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const helperSource = await readFile(new URL('../src/inviteAcceptance.ts', import.meta.url), 'utf8');
const compiledHelper = ts.transpileModule(helperSource, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;

const helper = await import(
  `data:text/javascript;base64,${Buffer.from(compiledHelper).toString('base64')}`
);

const {
  parseInviteRedirectFragment,
  saveStagedInviteSession,
  loadStagedInviteSession,
  clearStagedInviteSession,
  stageInviteRedirectFromCurrentLocation,
} = helper;

function memoryStorage() {
  const values = new Map();
  return {
    values,
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

const now = 2_000_000_000;
const validHash =
  '#access_token=invite-access&token_type=bearer&expires_in=3600&expires_at=2000003600&refresh_token=invite-refresh&type=invite&sb=';

const parsed = parseInviteRedirectFragment(validHash, now);
assert(parsed?.accessToken === 'invite-access', 'invite_fragment_access_token_not_parsed');
assert(parsed?.refreshToken === 'invite-refresh', 'invite_fragment_refresh_token_not_parsed');
assert(parsed?.expiresAt === 2_000_003_600, 'invite_fragment_expiry_not_parsed');

assert(
  parseInviteRedirectFragment(validHash.replace('&sb=', ''), now) === null,
  'invite_fragment_without_supabase_marker_must_fail',
);
assert(
  parseInviteRedirectFragment(validHash.replace('type=invite', 'type=recovery'), now) === null,
  'non_invite_fragment_must_fail',
);
assert(
  parseInviteRedirectFragment(validHash.replace('expires_at=2000003600', 'expires_at=1999999999'), now) === null,
  'expired_invite_fragment_must_fail',
);
assert(
  parseInviteRedirectFragment(validHash.replace('token_type=bearer', 'token_type=mac'), now) === null,
  'non_bearer_invite_fragment_must_fail',
);

const storage = memoryStorage();
let replacedUrl = null;
assert(
  stageInviteRedirectFromCurrentLocation({
    location: { pathname: '/accept-invite', search: '?source=email', hash: validHash },
    history: { replaceState(_state, _unused, url) { replacedUrl = url; } },
    storage,
    nowSeconds: now,
  }) === true,
  'valid_invite_fragment_not_staged',
);
assert(replacedUrl === '/accept-invite?source=email', 'invite_fragment_not_removed_immediately');

clearStagedInviteSession(storage);
let siteRootReplace = null;
assert(
  stageInviteRedirectFromCurrentLocation({
    location: { pathname: '/', search: '', hash: validHash },
    history: { replaceState(_state, _unused, url) { siteRootReplace = url; } },
    storage,
    nowSeconds: now,
  }) === true,
  'site_url_invite_redirect_must_be_recovered',
);
assert(siteRootReplace === '/accept-invite', 'site_url_invite_not_canonicalized');

const staged = loadStagedInviteSession(storage, now);
assert(staged?.accessToken === 'invite-access', 'staged_invite_not_reloadable');

clearStagedInviteSession(storage);
assert(loadStagedInviteSession(storage, now) === null, 'staged_invite_not_cleared');

const blockedStorage = {
  getItem() { throw new Error('blocked'); },
  setItem() { throw new Error('blocked'); },
  removeItem() { throw new Error('blocked'); },
};
let blockedReplace = null;
assert(
  stageInviteRedirectFromCurrentLocation({
    location: { pathname: '/accept-invite', search: '', hash: validHash },
    history: { replaceState(_state, _unused, url) { blockedReplace = url; } },
    storage: blockedStorage,
    nowSeconds: now,
  }) === true,
  'invite_must_survive_same_page_when_session_storage_is_blocked',
);
assert(blockedReplace === '/accept-invite', 'blocked_storage_fragment_not_removed');
assert(
  loadStagedInviteSession(blockedStorage, now)?.refreshToken === 'invite-refresh',
  'ephemeral_invite_fallback_missing',
);
clearStagedInviteSession(blockedStorage);

let invalidReplace = null;
const invalidStorage = memoryStorage();
saveStagedInviteSession(
  { accessToken: 'stale', refreshToken: 'stale-refresh', expiresAt: 2_000_003_600 },
  invalidStorage,
);
assert(
  stageInviteRedirectFromCurrentLocation({
    location: {
      pathname: '/accept-invite',
      search: '',
      hash: validHash.replace('type=invite', 'type=magiclink'),
    },
    history: { replaceState(_state, _unused, url) { invalidReplace = url; } },
    storage: invalidStorage,
    nowSeconds: now,
  }) === false,
  'invalid_invite_fragment_must_fail_closed',
);
assert(invalidReplace === '/accept-invite', 'invalid_invite_fragment_not_removed');
assert(loadStagedInviteSession(invalidStorage, now) === null, 'invalid_fragment_must_clear_stale_invite');

let unsupportedRootReplace = null;
assert(
  stageInviteRedirectFromCurrentLocation({
    location: {
      pathname: '/',
      search: '?keep=1',
      hash: validHash.replace('type=invite', 'type=recovery'),
    },
    history: { replaceState(_state, _unused, url) { unsupportedRootReplace = url; } },
    storage: invalidStorage,
    nowSeconds: now,
  }) === false,
  'unsupported_supabase_flow_must_fail_closed',
);
assert(unsupportedRootReplace === '/?keep=1', 'unsupported_supabase_fragment_not_removed');

const [authSource, providerSource, routerSource, mainSource, pageSource] = await Promise.all([
  readFile(new URL('../src/auth.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/AuthProvider.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/router.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/main.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/pages/InviteAcceptancePage.tsx', import.meta.url), 'utf8'),
]);

for (const fragment of [
  "method: 'PUT'",
  "${SUPABASE_AUTH_ORIGIN}/auth/v1/user",
  "Authorization: `Bearer ${session.accessToken}`",
  "body: JSON.stringify({ password })",
]) {
  assert(authSource.includes(fragment), `invite_password_transport_missing:${fragment}`);
}

assert(!authSource.includes('service_role'), 'service_role_must_not_enter_browser_auth');
assert(!pageSource.includes('service_role'), 'service_role_must_not_enter_invite_page');
assert(providerSource.includes('completeInvitation'), 'auth_provider_invite_promotion_missing');
assert(routerSource.includes("path: '/accept-invite'"), 'public_invite_route_missing');

const stageIndex = mainSource.indexOf('stageInviteRedirectFromCurrentLocation();');
const renderIndex = mainSource.indexOf('createRoot(');
assert(stageIndex >= 0, 'invite_fragment_staging_missing_from_main');
assert(stageIndex < renderIndex, 'invite_fragment_must_be_staged_before_react_render');

const updateIndex = pageSource.indexOf('await updateInvitedUserPassword(session, password);');
const clearIndex = pageSource.indexOf('clearStagedInviteSession();', updateIndex);
const promoteIndex = pageSource.indexOf('await completeInvitation(session);');
assert(updateIndex >= 0, 'invite_password_update_missing');
assert(clearIndex > updateIndex, 'invite_staging_cleared_before_password_success');
assert(promoteIndex > clearIndex, 'invite_session_promoted_before_password_success');

console.log('WANDORA_WEB_OWNER_INVITE_ACCEPTANCE_V1_OK');
console.log('WANDORA_WEB_FIRST_PASSWORD_CONTRACT_V1_OK');
