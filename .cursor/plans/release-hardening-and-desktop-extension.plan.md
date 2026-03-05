---
name: Release Hardening and Single Extension CI
overview: Harden the nightly release workflow against failures and align release CI to treat the unified extension (browser + desktop entry points) as a single extension instead of two distinct ones.
todos: []
isProject: false
---

# Release Hardening and Single Extension CI Plan

This plan covers immediate stabilization work. The full 3-tier cadence redesign (nightly → pre-release promotion → stable promotion) is tracked in GUS [a07EE00002VjSc0YAF](https://gus.lightning.force.com/lightning/r/ADM_Work__c/a07EE00002VjSc0YAF/view) and is **out of scope here**.

This plan combines two efforts: (1) refactoring release CI so it treats the **single unified extension** as one release, not two (do this first—may contribute to failures), and (2) hardening the nightly release job. No changes to package builds or extension code.

> **Note on root cause:** The Mar 4 nightly failure was caused by `ext-promotion-finder.ts` having a critical tag name mismatch bug (looks for `v*-nightly` tags; bumper creates `<pkg>-v<version>-pre-release`), causing the promotion candidate list to always be empty, which ultimately resulted in the version bumper attempting to push tag `apex-language-server-extension-v0.5.1-pre-release` — a tag that already existed from Jan 21. The hardening in Part II addresses this symptom. The full fix (replacing `ext-promotion-finder.ts` with `ext-nightly-finder.ts`) is in the GUS work item above.

---

## Part I: Release CI – Single Extension (No Build Changes) — Do First

### Context

The extension is a **unified** package: one VS Code extension with both `main` (desktop) and `browser` (web) entry points in a single VSIX. The release CI was originally set up as if there were two extensions (one for browser, one for desktop). Scope: fix CI to treat it as one extension; **no changes to package builds or extension code**.

### Changes

**1. get-packages action** (`[.github/actions/get-packages/action.yml](.github/actions/get-packages/action.yml)`)

Currently, for `apex-lsp-vscode-extension` it outputs `desktop:$pkg,web:$pkg` (line 34), implying two separate artifacts. Change to a single path:

```bash
# Before
EXTENSION_PATHS="$EXTENSION_PATHS,desktop:$pkg,web:$pkg"

# After
EXTENSION_PATHS="$EXTENSION_PATHS,$pkg"
```

**2. Remove platform-dimension references in release scripts**

- `[.github/scripts/ext-publish-matrix.ts](.github/scripts/ext-publish-matrix.ts)`: Update comment from "desktop and web builds" to "single VSIX from unified extension"
- `[.github/scripts/ext-github-releases.ts](.github/scripts/ext-github-releases.ts)`: Remove stale comment "apex-lsp-vscode-extension-web package was removed"

**3. Verify no consumers expect desktop/web split**

The `extension-paths` output is documented in the workflows README but not wired into release workflows (they use `extensions` and `available-extensions`). Confirm no other workflows or scripts expect `desktop:` or `web:` prefixes. If any do, update them to use the single path.

**4. Documentation**

- `[.github/workflows/README.md](.github/workflows/README.md)` line 478: Replace "desktop" with "unified (browser + desktop)" or similar.
- `[.github/scripts/README.md](.github/scripts/README.md)`, `[.github/scripts/RELEASE_SCRIPTS.md](.github/scripts/RELEASE_SCRIPTS.md)`: Update wording that refers to "desktop and web" as separate builds; clarify it is one extension with both entry points.

### Out of Scope

- No changes to `apex-lsp-vscode-extension`, `apex-ls`, or other packages
- No changes to E2E test configs (web vs desktop refers to test runtime, not separate extension builds)
- `ext-publish-matrix.ts` and `ext-github-releases.ts` already treat it as one (single VSIX pattern); no changes

---

## Part II: Nightly Release Job Hardening — Do Second

### Context

The [Release run #194](https://github.com/forcedotcom/apex-language-support/actions/runs/22655151960/job/65663382535) failed in the `bump-versions` job at the "Commit version bumps with tags" step (exit 1), with an additional "Post Checkout" git 128 warning. Likely causes: push rejection (branch protection, non-fast-forward), tag conflicts from overlapping runs, or shallow clone lacking tag visibility.

### Changes

**1. Add Concurrency to Prevent Overlapping Runs**

In `[.github/workflows/release.yml](.github/workflows/release.yml)`, add a `concurrency` block so only one release run executes at a time per branch:

```yaml
concurrency:
  group: release-${{ github.workflow }}-${{ github.event.inputs.branch || 'main' }}
  cancel-in-progress: false
```

Place at workflow root level (after `on:` and before `permissions:`).

**2. Add fetch-depth: 0 to bump-versions Checkout**

In `[.github/workflows/release-extensions.yml](.github/workflows/release-extensions.yml)`, update the bump-versions job checkout (lines 203-206):

```yaml
- name: Checkout
  uses: actions/checkout@v4
  with:
    token: ${{ secrets.IDEE_GH_TOKEN }}
    fetch-depth: 0
```

**3. Harden "Commit version bumps with tags" Step**

In `[.github/workflows/release-extensions.yml](.github/workflows/release-extensions.yml)`, update the step (lines 246-307) in the non-promotion, non-dry-run path:

- Add explicit check for staged changes before commit; exit 1 with clear message if nothing to commit
- For push failure: fetch and rebase, then retry push once before failing
- For tag push: catch failures and continue with a warning instead of failing

Use `${{ inputs.branch || github.ref_name }}` for branch/ref handling.

---

## Suggested Execution Order

1. **Part I (single-extension CI)** – Do first; the desktop/web split in get-packages may contribute to release failures.
2. **Part II (release hardening)** – Concurrency, fetch-depth, and commit/push hardening.

---

## Verification

**Release hardening**

- Run manual release with `dry-run: true`
- Trigger real release or wait for nightly; confirm bump-versions succeeds
- Optionally re-run a completed release to validate tag-push handling

**Single-extension CI**

- Confirm `get-packages` outputs one path per extension for apex-lsp-vscode-extension
- Run release workflow; verify a single VSIX is produced and published
