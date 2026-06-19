# Changelog

All notable changes to SafeCare are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Versions 0.4.1–0.4.6 were Raspberry Pi appliance image releases that did not
bump the in-app `SAFECARE_VERSION` constant (it remained at `0.4.0`); they are
reconstructed here from the git history for completeness.

## [0.4.7] - 2026-06-19

A reliability and developer-experience release. No product feature changes; the
focus is a trustworthy build/test pipeline and hermetic, offline-capable builds.

### Reliability

- **CI now enforces quality gates.** Typecheck, lint, and test previously ran
  with `continue-on-error: true`, so CI reported success even when they failed.
  They are now hard gates — a regression in any of them fails the build.
- **Fixed 14 failing backend unit tests** that the CI masking above had hidden.
  The failures were stale test scaffolding, not product bugs:
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

- Added `CHANGELOG.md` (this file), and `.nvmrc` pinning Node 20 to match
  `package.json` engines and CI.
- Stopped tracking generated `next-env.d.ts` files.

## [0.4.6] - 2026-05-27

### Fixed

- Captive portal loop after the WiFi handoff during Raspberry Pi setup.
- Captive portal now surfaces the WiFi error when a connection attempt fails,
  instead of silently retrying.

## [0.4.5] - 2026-05-26

### Fixed

- Captive portal handoff no longer cascade-stops the provisioner, fixing a
  failure mode where setup could stall after switching the Pi to the home WiFi.

## [0.4.4] - 2026-05-21

### Fixed

- Corrected the `rfkill` path in `safecare-ap.service` (`/usr/sbin`, not
  `/usr/bin`).

### Added

- Image build now validates that every systemd `Exec` path exists in the rootfs,
  catching missing-binary regressions at build time rather than first boot.

## [0.4.3] - 2026-05-21

### Fixed

- First-boot failure on the Pi image caused by missing packages — `rfkill` and
  `psmisc` are now installed in the image.

## [0.4.2] - 2026-05-19

### Fixed

- System unlock now keeps working with the same DEK after a backend restart.
- Regenerated `pnpm-lock.yaml` so CI can install with `--frozen-lockfile`.

## [0.4.1] - 2026-05-18

### Fixed

- Two setup-wizard regressions surfaced by user feedback.
- Setup wizard "stuck at the region map" trap.
- Image build script fixes for the v0.4.1 appliance image.

### Added

- Documentation for the in-place update path for already-deployed Pis.

## [0.4.0] - 2026-04-06

The rideshare and communications release.

### Added

- **Freestanding rideshare dashboard** (port 3002) with a **vetted referral
  directory** (vet/attorney/mechanic/clinic) gated by an admin vouch system.
- **Ride coordination** data model, types, and UI: shift board, recurring
  schedules, vehicle status (clean/flagged/unknown), dual capacity, transit
  escorts, intake queue, and driver-passenger affinity.
- **WhatsApp via Baileys** — direct WhatsApp Web pairing from the dashboard,
  replacing the Twilio Business API; multi-line relay pool and a non-technical
  setup guide.
- **Dual-image deployment** — Docker Compose profiles (`safecare`, `rideshare`,
  `full`) and matching Raspberry Pi variant image builds.
- Rideshare + referral network test suite.
- Setup-wizard screenshot clickthrough/GIF, dashboard screenshots, and a
  screenshot capture harness.
- Firebase Analytics + click instrumentation on safecare.app.

### Changed

- Renamed vehicle status "hot" to "flagged" for neutral framing.

## [0.3.0] - 2026-04-02

The security-hardening release.

### Added

- Field-level encryption hardening, encrypted backup export + restore
  (AES-256-GCM + scrypt), and webhook signature validation (Twilio HMAC,
  JotForm shared secret, fail-closed).

### Fixed

- Three critical security issues found in PR review.
- CI and Docker build fixes (exclude stale `mobile` package, dashboard build,
  root tsconfig copy).

## [0.2.0] - 2026-04-01

The internationalization and update-system release.

### Added

- **Internationalization** — 443 string keys across 7 languages (en, es, ar,
  so, fr, zh, uk), full coverage of notifications, driver PWA, and admin
  dashboard, with a language picker and RTL support for Arabic.
- **Update system** — version management, GHCR-based CI image publishing,
  update API, and a "System Updates" UI in dashboard settings.
- Password change with full session revocation.
- Smoke + security tests for the update system.

### Changed

- Switched the SD card image to xz compression (678 MB → 439 MB).

[0.4.7]: https://github.com/jasontitus/safecare/releases/tag/v0.4.7
[0.4.6]: https://github.com/jasontitus/safecare/releases/tag/v0.4.6
[0.4.5]: https://github.com/jasontitus/safecare/releases/tag/v0.4.5
[0.4.4]: https://github.com/jasontitus/safecare/releases/tag/v0.4.4
[0.4.3]: https://github.com/jasontitus/safecare/releases/tag/v0.4.3
[0.4.2]: https://github.com/jasontitus/safecare/releases/tag/v0.4.2
[0.4.1]: https://github.com/jasontitus/safecare/releases/tag/v0.4.1
[0.4.0]: https://github.com/jasontitus/safecare/releases/tag/v0.4.0
[0.3.0]: https://github.com/jasontitus/safecare/releases/tag/v0.3.0
[0.2.0]: https://github.com/jasontitus/safecare/releases/tag/v0.2.0
