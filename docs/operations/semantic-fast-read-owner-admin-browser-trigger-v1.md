# Semantic Fast Read Owner/Admin Browser Trigger V1

Status: **PREPARED PROCEDURE / DO NOT EXECUTE UNTIL THE ATTESTATION WINDOW IS EXPLICITLY AUTHORIZED**

Purpose: preserve human agency and the existing authentication boundary. The owner/admin session stays inside the browser; Remote-Ops never receives, prints or impersonates the Bearer token.

## Preconditions

Before using this procedure:

- the exact attestation window has a fresh effect authorization;
- the current Core is intentionally in that bounded attestation composition;
- the human is already signed in to `https://app.wandora.com.br`;
- the chosen organization is the intended 28PRO tenant;
- Core must still revalidate that the session user has active role `owner` or `admin`.

## Browser-console procedure

Use the browser DevTools console on `app.wandora.com.br`.

The snippet defaults to **preflight only**. It does not print the session object or any token.

```js
(async () => {
  const EXECUTE = false; // change to true only for the one separately authorized attestation request
  const REQUEST = 'Qual é o preço do produto PREMIUM PLUS?';
  const SESSION_KEY = 'wandora.auth.session.v1';
  const ACTIVE_ORG_KEY = 'wandora.active-organization-id';

  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) throw new Error('wandora_browser_session_missing');

  const session = JSON.parse(raw);
  if (
    !session ||
    typeof session.accessToken !== 'string' ||
    typeof session.refreshToken !== 'string' ||
    typeof session.expiresAt !== 'number'
  ) {
    throw new Error('wandora_browser_session_invalid');
  }

  const auth = (input, init = {}) => fetch(input, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${session.accessToken}`,
    },
  });

  const meResponse = await auth('/api/v1/me');
  if (!meResponse.ok) throw new Error(`wandora_me_failed_${meResponse.status}`);
  const me = await meResponse.json();

  const organizations = Array.isArray(me.organizations) ? me.organizations : [];
  const allowed = organizations.filter((org) => org && (org.role === 'owner' || org.role === 'admin'));
  const selectedId = sessionStorage.getItem(ACTIVE_ORG_KEY);

  let organization = null;
  if (selectedId) {
    organization = allowed.find((org) => org.id === selectedId) || null;
    if (!organization) throw new Error('active_organization_not_owner_or_admin');
  } else if (allowed.length === 1) {
    organization = allowed[0];
  } else {
    throw new Error('owner_admin_organization_selection_required');
  }

  const employeesResponse = await auth(
    `/api/v1/organizations/${organization.id}/digital-employees`,
  );
  if (!employeesResponse.ok) {
    throw new Error(`digital_employees_failed_${employeesResponse.status}`);
  }
  const employeesPayload = await employeesResponse.json();
  const employees = Array.isArray(employeesPayload.items) ? employeesPayload.items : [];
  const matches = employees.filter((employee) =>
    employee &&
    employee.name === 'Ana' &&
    employee.status === 'active'
  );
  if (matches.length !== 1) {
    throw new Error(`expected_exactly_one_active_ana_got_${matches.length}`);
  }
  const employee = matches[0];

  console.log({
    preflight: true,
    organization: {
      id: organization.id,
      name: organization.name,
      role: organization.role,
    },
    employee: {
      id: employee.id,
      name: employee.name,
      status: employee.status,
    },
    request: REQUEST,
    executionAuthorizedLocally: EXECUTE,
  });

  if (!EXECUTE) {
    console.log('FAST_READ_PREFLIGHT_ONLY');
    return;
  }

  const response = await auth(
    `/api/v1/organizations/${organization.id}/digital-employees/${employee.id}/fast-read`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request: REQUEST }),
    },
  );

  const body = await response.json().catch(() => null);
  console.log({
    fastReadHttpStatus: response.status,
    body,
  });
})();
```

## Safety properties

- no access token or refresh token is logged;
- no token is copied to MCP/operator state;
- organization selection fails closed on ambiguity;
- the browser preflight requires `owner` or `admin`;
- Core independently revalidates canonical identity/membership;
- exactly one active Ana is required;
- execution defaults to `false`;
- the request is fixed to one product-price question;
- this procedure has no WhatsApp or Human Send path.

Historical product prices are not an expected-answer oracle. The live result must be validated against the single current VendaERP read performed in the authorized attestation.

Do not execute a second request in the same attestation window.
