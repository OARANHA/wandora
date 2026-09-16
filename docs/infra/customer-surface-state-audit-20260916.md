# Customer Surface State Audit — 2026-09-16

Authority: ADR 0034 state-first continuity rule.

This audit records the current customer Web state before selecting the next customer-facing slice. It distinguishes implemented/proven behavior from static product UI.

## REAL

### Login / Human Session

- Supabase Auth sign-in is real.
- `GET /api/v1/me` resolves canonical Wandora identity and active organizations.
- explicit multi-organization selection is implemented.

### Trabalho

- reads canonical `attention-required` work through Core;
- Human Send Confirmation V2 is implemented;
- the supervised WhatsApp path has been proven end-to-end with a real handset;
- production external-effect switches remain OFF outside deliberate activation.

### Conversas

- canonical tenant-authorized conversation list is real;
- canonical selected-conversation history is real;
- the surface remains deliberately read-only.

## SELECTED TRANSITION: EQUIPE

Before ADR 0035, the existing `Equipe` screen was visually complete but backed by hard-coded employee objects (`Ana`, `Clara`), invented progress percentages and non-contractual status copy.

Canonical `wandora.digital_employees` already exists and is tenant-readable by Core under transaction-local tenant scope + RLS. ADR 0035 therefore converts the existing screen to a canonical read without redesigning it or inventing new employee fields.

The ADR 0035 implementation removes the fake employee/progress state and deliberately does not expose an active hiring/profile control until those mutation/detail contracts exist.

## PARTIAL / PLACEHOLDER

### Início

The dashboard layout exists, but metrics, employee cards, approval counts and activity feed are currently static product data. Do not treat those values as live business metrics.

### Aprovações

The screen exists, but the displayed approval records and action buttons are static. Canonical `wandora.approvals` exists for stronger commitments, but no reviewed customer read/decision API is connected to this screen yet.

### Empresa

The hub screen exists, but its section cards do not yet open canonical customer configuration flows. The underlying organization identity exists; broader company knowledge, people, tools/connections and plan configuration require their own contracts.

## Current priority

Preserve REAL surfaces and convert existing PARTIAL/PLACEHOLDER surfaces one contract at a time.

Selected first gap: **Equipe → canonical digital employees read** because:

1. the UI already exists;
2. canonical employee state already exists;
3. Core already has least-privilege/RLS read access;
4. the production beta company already has canonical digital employee state;
5. it creates customer-visible truth without introducing a new mutation or provider dependency.

After Team Read V1 is merged and validated, re-run this audit before selecting the next slice. Likely candidates are the actual employee hiring/catalog path, Empresa core profile/configuration, or canonical Approvals read/decision, depending on the real remaining customer journey gap.
