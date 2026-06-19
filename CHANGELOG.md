# Changelog

All notable changes to SafeCare are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project aims to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Reliability

- **CI now enforces quality gates.** Typecheck, lint, and test steps previously
  ran with `continue-on-error: true`, so CI stayed green even when they failed.
  They are now hard gates — a regression in any of them fails the build.
- **Fixed 14 failing backend unit tests** that were masked by the CI change
  above. The failures were stale test scaffolding, not product bugs:
  - `referral.test.ts` (12 tests): the database mock's query builder did not
    support the chained calls the service actually makes
    (`.where().orderBy()`, `.leftJoin().where().orderBy()`, awaited `.from()`).
    Replaced it with a chainable, thenable mock.
  - `ride.test.ts` (2 tests): `mockSelectFrom.mockImplementation(...)` overrides
    from earlier tests leaked into later ones because `vi.clearAllMocks()` does
    not reset implementations. The default implementation is now restored in
    `beforeEach`.
- **`pnpm lint` now works.** `next lint` was unconfigured and dropped into an
  interactive setup prompt, which failed in CI and locally. Added ESLint +
  `eslint-config-next` and an `.eslintrc.json` to the dashboard and rideshare
  apps, and fixed the resulting `react/no-unescaped-entities` errors.
- **Hermetic, offline-capable builds.** The dashboard and rideshare apps fetched
  the Inter font from Google Fonts at build time, which broke the build in
  air-gapped or restricted networks and contradicted the project's
  no-third-party-CDN privacy stance. Switched to a self-hosted/system font stack
  (prefers locally installed Inter, falls back to native UI fonts). Builds no
  longer reach out to Google.

### Testing

- Added 22 unit tests for `packages/backend/src/utils/security.ts`
  (`constantTimeEquals`, `sanitizePlainText`, `normalizePhone`,
  `normalizeCommunicationPreference`, `redactPhone`) — closing a documented gap.
  Backend unit tests: 177 → 199. Workspace total: 263 → 285.

### Developer experience

- Added `.nvmrc` pinning Node 20 to match `package.json` engines and CI.
