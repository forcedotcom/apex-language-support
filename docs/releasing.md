# Releasing the Apex Language Server VS Code Extension

This guide describes how a new release of the Apex Language Server VS Code
extension reaches the **VS Code Marketplace** and **Open VSX (ovsx)**, and the
manual step required to pick that release up in
[`code-builder-web`](https://github.com/forcedotcom/code-builder-web).

Most releases are **fully automated** — you do not normally run any commands by
hand. This document explains the automated pipeline so you can verify it, plus
the manual escape hatches for when you need to publish out of band.

---

## TL;DR

| I want to… | Do this |
| --- | --- |
| Ship a normal nightly/pre-release | Nothing — `nightly.yml` runs daily at 04:00 UTC |
| Promote a nightly to the pre-release slot | Nothing — `promote-prerelease.yml` runs Wed 07:00 UTC (or dispatch it) |
| Promote a pre-release to stable | Nothing — `promote-stable.yml` runs Wed 06:00 UTC (or dispatch it) |
| Publish a specific build right now | Run **Manual Publish** (`manual-publish.yml`) |
| Pick up a new version in code-builder-web | Bump the pin and update the lock file (see [below](#manual-step-code-builder-web)) |

---

## Key facts

- **Extension package:** `packages/apex-lsp-vscode-extension/`
- **Marketplace ID:** `salesforce.apex-language-server-extension`
  - publisher: `salesforce`
  - package name: `apex-language-server-extension`
  - display name: *Salesforce Apex Language Server (Typescript)*
- **Publish tools:** [`@vscode/vsce`](https://github.com/microsoft/vscode-vsce)
  (VS Code Marketplace) and [`ovsx`](https://github.com/eclipse/openvsx) (Open VSX).
- **Versioning is automated** from conventional commits — there is no Lerna /
  Changesets / manual `npm version` step.

### Even/odd minor version convention

The minor version encodes the channel:

| Minor | Channel | Example |
| --- | --- | --- |
| **Odd** (`0.1.x`, `0.3.x`, `0.5.x`) | Pre-release / nightly | `0.5.95` |
| **Even** (`0.2.x`, `0.4.x`, `0.6.x`) | Stable | `0.6.0` |

The version bumper enforces this automatically. Promotion to stable rounds the
odd minor up to the next even minor (e.g. `0.5.3` → `0.6.0`).

### Required secrets

These live in repo/org secrets — you only need to know they exist:

| Secret | Used for |
| --- | --- |
| `VSCE_PERSONAL_ACCESS_TOKEN` | Publishing to VS Code Marketplace |
| `IDEE_OVSX_PAT` | Publishing to Open VSX |
| `IDEE_GH_TOKEN` | Tagging / committing with branch-protection bypass |
| `MARKETPLACE_DEPLOY_TOKEN` / `MARKETPLACE_URL` | Internal CBWeb marketplace |

---

## The release pipeline (automated)

Releases flow through three channels. Each stage publishes the **same VSIX**
(repackaged with a new version string only at the stable step).

```
 nightly.yml (daily 04:00 UTC)
   └─> nightly-extensions.yml
         bump (odd minor) → package → GitHub Release + tag (no marketplace publish)
                                                              │
 promote-prerelease.yml (Wed 07:00 UTC)                       │
   └─> takes a nightly ≥7 days old ──────────────────────────┘
         publishes unchanged VSIX to the PRE-RELEASE slot
                                                              │
 promote-stable.yml (Wed 06:00 UTC)                           │
   └─> takes latest pre-release ──────────────────────────────┘
         repackages VSIX with EVEN minor → publishes to STABLE slot
```

### Stage 1 — Nightly (`nightly.yml` → `nightly-extensions.yml`)

- **Trigger:** schedule `0 4 * * *` (04:00 UTC daily), or manual dispatch.
- **What it does:**
  1. Detects changed extensions and analyzes conventional commits
     (`fix:` → patch, `feat:` → minor, `feat!:`/`BREAKING CHANGE:` → major).
  2. Bumps to the next **odd** minor (`ext-version-bumper`), commits
     `chore: bump versions for release [skip ci]`, and tags
     `v{VERSION}-nightly.{DATE}` (e.g. `v0.5.3-nightly.20260301`; non-main branches append the branch: `v{VERSION}-nightly.{BRANCH}.{DATE}`).
  3. Packages the VSIX (`npm run package:packages:prerelease`).
  4. Creates a GitHub Release with the VSIX + MD5 checksum attached (no marketplace publish at this stage).
  5. The internal CBWeb marketplace receives the web VSIX via `publish-to-cbweb-marketplace`.
- **Manual dispatch inputs:** `branch`, `extensions`, `dry-run`.

### Stage 2 — Promote to pre-release (`promote-prerelease.yml`)

- **Trigger:** schedule `0 7 * * 3` (Wed 07:00 UTC), or manual dispatch.
- **What it does:** finds an eligible nightly (default ≥7 days old), downloads
  that exact VSIX from its GitHub Release, and publishes it **unchanged** to the
  pre-release marketplace slot. Records a tracking tag
  `marketplace-prerelease-apex-lsp-vscode-extension-v{VERSION}`.

### Stage 3 — Promote to stable (`promote-stable.yml`)

- **Trigger:** schedule `0 6 * * 3` (Wed 06:00 UTC), or manual dispatch.
- **What it does:** takes the latest pre-release, computes the stable version
  (next **even** minor), **repackages** the VSIX (rewrites `package.json`
  version and `extension.vsixmanifest`), publishes to the stable slot with
  `--pre-release: false`, creates a stable GitHub Release, and tags
  `marketplace-stable-apex-lsp-vscode-extension-v{VERSION}`.

---

## Manual / out-of-band publishing (`manual-publish.yml`)

Use the **Manual Publish** workflow when you need to publish a specific build
immediately (e.g. a hotfix) instead of waiting for the scheduled promotions.

Run it from **Actions → Manual Publish → Run workflow**. Inputs:

| Input | Notes |
| --- | --- |
| `extension` | `apex-lsp-vscode-extension` (only option) |
| `version-tag` | **Tag path (normal):** a nightly git tag, e.g. `v0.5.3-nightly.20260301`. Mutually exclusive with `source-run-id`. |
| `source-run-id` | **Run path (bypass):** an Actions run ID whose VSIX artifact to publish. For branch builds with no GH release. Requires `skip-quality-checks=true` **and** `confirm-bypass=BYPASS`. |
| `slot` | `pre-release` or `stable`. |
| `registries` | `all` (default), `vsce`, or `ovsx`. |
| `target-stable-version` | Optional stable override (valid semver, **even** minor). Required when using `source-run-id` with `slot: stable`. |
| `skip-quality-checks` | Bypass the CI quality gate. Required for the `source-run-id` path. |
| `confirm-bypass` | Must be exactly `BYPASS` when skipping the quality gate. |
| `dry-run` | `true` runs the whole flow without publishing or tagging. |

The workflow has an environment approval gate, so a maintainer must approve the
publish job after the preview step.

> **Tip:** always do a `dry-run: true` pass first and read the preview summary
> before publishing for real.

### The exact publish commands

For reference, both scheduled and manual paths ultimately call
`.github/actions/publish-vsix` which runs:

```bash
# VS Code Marketplace
npx @vscode/vsce publish --packagePath "<vsix-path>" --skip-duplicate [--pre-release]

# Open VSX
npx ovsx publish "<vsix-path>" -p "$OVSX_PAT" --skip-duplicate [--pre-release]
```

`--skip-duplicate` makes reruns idempotent; `--pre-release` is added only for
the pre-release slot.

### Packaging locally (debugging only)

You normally never package by hand, but to reproduce a VSIX locally:

```bash
npm run package:packages              # stable VSIX (universal + web)
npm run package:packages:prerelease   # pre-release VSIX
```

Output: `apex-language-server-extension-{VERSION}.vsix` (desktop + browser) and a
`-web-*.vsix` variant used only by the internal CBWeb marketplace.

---

## Manual step: code-builder-web

`code-builder-web` does **not** auto-track every Apex release. After a new
version is live, update the pin so Code Builder ships it.

In a local checkout of the
[`code-builder-web`](https://github.com/forcedotcom/code-builder-web) repo, the
extension is declared in **`cbweb/extensions.json`** and locked to an exact
version + SHA in **`cbweb/.extensions-lock.json`**:

```jsonc
// cbweb/extensions.json
{
  "publisher": "salesforce",
  "name": "apex-language-server-extension",
  "version": "pre-release",            // dynamic: "pre-release" | "latest" | a pinned "X.Y.Z"
  "shaVerification": {
    "repo": "forcedotcom/apex-language-support"
  }
}
```

### Option A — refresh a dynamic pin (recommended)

If `version` is `"pre-release"` or `"latest"`, just re-resolve it to the newest
published build and update the lock file:

```bash
cd code-builder-web
npm run install-extensions:update-verified   # resolves + verifies SHA256
git add cbweb/extensions.json cbweb/.extensions-lock.json
git commit -m "chore: update apex-language-server-extension to <version>"
```

`install-extensions:update-verified` runs the install script with `--update`
(resolve newest version, rewrite the lock) and `--verify-sha` (check the
SHA256 against the GitHub Release asset).

### Option B — pin to a specific version

To freeze Code Builder on an exact build:

1. Edit `cbweb/extensions.json` — set `"version": "X.Y.Z"` (e.g. `"0.6.0"`).
2. Refresh and verify the lock:
   ```bash
   npm run install-extensions:update-verified
   ```
3. Commit both `cbweb/extensions.json` and `cbweb/.extensions-lock.json`.

### Useful code-builder-web scripts

| Script | Purpose |
| --- | --- |
| `npm run install-extensions` | Install the locked versions |
| `npm run install-extensions:update` | Resolve dynamic versions → update lock |
| `npm run install-extensions:update-verified` | Update **and** verify SHA256 |
| `npm run install-extensions:verify` | Verify locked SHA256 only |

> **Always commit both files.** `extensions.json` is the source of truth and
> `.extensions-lock.json` guarantees every developer/build gets the same VSIX.

See `code-builder-web/README.md` ("Managing Extensions") for full details,
including the auto-release integration that can trigger a CBW release when the
Apex extension publishes.

---

## Release checklist

**Normal release (automated):**

- [ ] Conventional-commit PRs merged to `main` (`fix:` / `feat:` / `feat!:`).
- [ ] Confirm the nightly published: check Actions → `nightly`, the new GitHub
      Release, and the Marketplace/Open VSX listings.
- [ ] Confirm Wed promotions ran (pre-release, then stable) as expected.
- [ ] Update `code-builder-web` pin (Option A) and open a PR there.

**Manual / hotfix release:**

- [ ] Identify the source (nightly `version-tag`, or branch `source-run-id`).
- [ ] Run **Manual Publish** with `dry-run: true`; review the preview.
- [ ] Re-run with `dry-run: false`; approve the environment gate.
- [ ] Verify the new version on both registries.
- [ ] Update `code-builder-web` pin and open a PR there.

---

## References

- `.github/workflows/README.md` — full workflow architecture and scripts.
- `.github/workflows/{nightly,nightly-extensions,promote-prerelease,promote-stable,manual-publish,package}.yml`
- `.github/actions/publish-vsix/action.yml` — the actual `vsce`/`ovsx` calls.
- `.github/scripts/ext-version-bumper.ts` — even/odd version bump logic.
- `code-builder-web/cbweb/extensions.json` + `cbweb/.extensions-lock.json`.
