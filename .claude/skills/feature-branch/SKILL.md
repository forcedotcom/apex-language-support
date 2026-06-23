---
name: feature-branch
description: Create feature branches for all work. Use when creating branches, checking out, or pushing. Prevents accidental push to main.
---

# Feature Branch

All work must be on feature branches. Never commit directly to `main`.

## Do

Branch format: `<type>/W-XXXXX-short-description` (e.g. `feature/W-23006798-implementor-references`, `fix/...`, `chore/...`). Include a short description after the work item number.

```bash
git fetch origin main
git checkout main
git pull
git checkout -b feature/W-XXXXX-short-description
# ... work, commit ...
git push -u origin feature/W-XXXXX-short-description
```

Or, branch from remote without tracking it:

```bash
git fetch origin main
git checkout -b feature/W-XXXXX-short-description origin/main --no-track
```

## Don't

**Never** `git checkout -b feature/W-XXXXX origin/main` without `--no-track`.

That sets the new branch to track `origin/main`. A bare `git push` would then push to `main` instead of creating a remote feature branch.

## Summary

- All work on feature branches
- Use `--no-track` when branching from `origin/<base>`, or branch from local `<base>` after pull
- Always push with explicit branch: `git push -u origin feature/W-XXXXX`
