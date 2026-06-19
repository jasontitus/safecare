# Releasing SafeCare

This is the end-to-end runbook for cutting a SafeCare release. There are three
independent artifacts, and you can ship any subset:

1. **Docker images** (`ghcr.io/jasontitus/safecare-*`) + a **GitHub Release** —
   used by PC/VPS deployments and the in-dashboard "System Updates" updater.
   Fully automated by `.github/workflows/release.yml` on a `v*` tag push.
2. **Raspberry Pi SD-card image** (`safecare-vX.Y.Z.img.xz`) — the flashable
   appliance image linked from `safecare.app/download`. Built and uploaded
   manually.
3. **Website** (`safecare.app`) — Firebase Hosting; the `/download` redirect
   points at the current Pi image in GCS.

Versions `0.4.1`–`0.4.6` were Pi-image-only releases (artifact 2) and did not
bump the in-app version constant.

---

## 0. Prerequisites

- Clean `main`, all checks green: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.
- For the Pi image: Docker running, ~10 GB free disk, 30–60 min.
- For the upload/website: `gcloud` authenticated to the `safecare-maps`
  project and `firebase` CLI authenticated.

---

## 1. Bump the version + changelog (every release that ships code)

The source of truth for in-app update checks is `SAFECARE_VERSION`.

1. Edit `packages/shared/src/constants.ts`:
   ```ts
   export const SAFECARE_VERSION = 'X.Y.Z';
   ```
2. Add a section to `CHANGELOG.md` (newest first) describing the changes, and
   add the matching link reference at the bottom of the file.
3. Commit to `main`:
   ```bash
   pnpm --filter @safecare/shared build   # recompile the constant
   git add packages/shared/src/constants.ts CHANGELOG.md
   git commit -m "Release vX.Y.Z: bump version + changelog"
   git push origin main
   ```

### Semver guidance

- **Patch** (`0.4.x`): bug fixes, reliability, Pi-image-only fixes.
- **Minor** (`0.x.0`): new features, backwards-compatible.
- **Major**: breaking changes to the data model, API, or deployment.

---

## 2. Docker images + GitHub Release (tag push)

Pushing a `v*` tag triggers `.github/workflows/release.yml`, which builds the
backend/dashboard/pwa images for `linux/arm64,linux/amd64`, pushes them to GHCR
tagged with the version and `latest`, and creates a GitHub Release with
auto-generated notes.

```bash
git tag -a vX.Y.Z <commit> -m "SafeCare vX.Y.Z"   # <commit> = the main commit to release
git push origin vX.Y.Z
```

Verify: **Actions** tab shows the release workflow green, and
`ghcr.io/jasontitus/safecare-backend:X.Y.Z` exists. Deployed dashboards will now
report the update under **Settings > System Updates** (the checker compares
`SAFECARE_VERSION` against the latest GitHub Release).

> Note: some managed/CI git proxies block tag pushes (HTTP 403) even when branch
> pushes succeed. If so, push the tag from a normal clone/workstation.

---

## 3. Raspberry Pi image (optional per release)

Build the flashable appliance image with pi-gen in Docker:

```bash
./scripts/rpi/build/build-image.sh safecare     # or: rideshare | full
# output: scripts/rpi/build/output/safecare-<date>.img.xz
```

Rename to the release convention (`safecare-vX.Y.Z.img.xz`) so the public
download URL is versioned:

```bash
mv scripts/rpi/build/output/safecare-<date>.img.xz \
   scripts/rpi/build/output/safecare-vX.Y.Z.img.xz
```

(Optional) flash + smoke-test before publishing: `./scripts/rpi/build/test-image.sh`.

---

## 4. Upload the image + publish the website redirect

`upload-image.sh` uploads to the `safecare-maps-osrm` GCS bucket, makes the
object public, and rewrites the `/download` redirect in
`infra/prebuilt/hosting/firebase.json` to point at the new image:

```bash
./scripts/rpi/build/upload-image.sh scripts/rpi/build/output/safecare-vX.Y.Z.img.xz
```

Then deploy the hosting change so `safecare.app/download` serves the new image:

```bash
cd infra/prebuilt/hosting && firebase deploy --only hosting
```

Commit the `firebase.json` change so the repo reflects the live redirect:

```bash
git add infra/prebuilt/hosting/firebase.json
git commit -m "Point /download redirect at safecare-vX.Y.Z.img.xz"
git push origin main
```

> Do not update the `/download` redirect to a `vX.Y.Z` image before the image is
> actually uploaded — it would 404 the public download link. `upload-image.sh`
> updates the redirect only after a successful upload.

---

## Release checklist

- [ ] `main` green (`typecheck`, `lint`, `test`, `build`)
- [ ] `SAFECARE_VERSION` bumped
- [ ] `CHANGELOG.md` entry + link reference added
- [ ] version/changelog committed and pushed to `main`
- [ ] `vX.Y.Z` tag pushed → release workflow green, GHCR images published
- [ ] (if shipping Pi image) image built, renamed `safecare-vX.Y.Z.img.xz`
- [ ] (if shipping Pi image) `upload-image.sh` run, `firebase deploy` done
- [ ] (if shipping Pi image) `firebase.json` redirect committed to `main`
- [ ] `safecare.app/download` serves the new image
