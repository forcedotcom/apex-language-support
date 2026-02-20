# Analyze E2E Tests

Monitor running e2e playwright tests for current branch, download artifacts on failure, provide analysis tools.

## Prerequisites

- `gh` CLI installed and authenticated (`gh auth status` succeeds)
- Git repo with branch checked out

## Workflow

1. **Get Current Branch**
   - `git branch --show-current`
   - Detached HEAD/no branch → error, stop

2. **Find E2E Workflows**
   - `gh run list -b <branch> --limit 50 --json databaseId,status,conclusion,workflowName,createdAt,headBranch`
   - Filter `workflowName` containing "E2E" or "Playwright"
   - Multiple found: prioritize `in_progress`/`queued`, then most recent completed (`createdAt` desc)
   - Multiple running → monitor all; only completed → use most recent

3. **Monitor Workflow Status**
   - **IMPORTANT**: Monitor until all complete. Never ask to continue—monitor automatically.
   - `in_progress`/`queued`: `gh run watch <run-id>` or poll `gh run view <run-id> --json status,conclusion` until `status: "completed"`
   - Multiple running → monitor all (sequentially if needed)
   - Already completed → skip monitoring

4. **Handle Results**
   - **NEVER RETURN BEFORE CI COMPLETES (SUCCESS OR FAILURE)**

   **Success:**
   - Report: "✓ E2E tests passed for workflow `<workflow-name>` on branch `<branch-name>`"
   - URL: `gh run view <run-id> --web`
   - Multiple workflows → report each

   **Failure/Cancellation:**
   - Create: `.e2e-artifacts/<branch-name>/<run-id>-<workflow-name>/` (sanitize: spaces/special → dashes)
   - Download: `gh run download <run-id> -D .e2e-artifacts/<branch-name>/<run-id>-<workflow-name>`
   - Extract/unzip if needed
   - Report failure with artifact location
   - Multiple failed → download each

5. **Offer Analysis** (if artifacts downloaded)
   - Search HTML reports: `playwright-report/index.html` or `**/playwright-report/index.html`
   - Search test results: `test-results/` directory
   - Reference: `.claude/skills/playwright-e2e/references/coding-playwright-tests.md`, `.claude/skills/playwright-e2e/references/iterating-playwright-tests.md`
   - Offer: open HTML report, show test results, open workflow (`gh run view <run-id> --web`)

## Artifact Storage Structure

```
.e2e-artifacts/
  <branch-name>/
    <run-id>-<workflow-name>/
      playwright-report/
        index.html
      playwright-test-results/
      (other artifacts)
```

Organized by branch and run ID.

## GitHub CLI Commands

- `gh run list -b <branch> --limit 50 --json databaseId,status,conclusion,workflowName,createdAt,headBranch` - List runs
- `gh run watch <run-id>` - Monitor until completion
- `gh run download <run-id> -D <directory>` - Download artifacts
- `gh run view <run-id> --web` - Open in browser

## Error Handling

- **Missing `gh` CLI**: `which gh` or `gh --version`, install: https://cli.github.com/
- **Unauthenticated**: `gh auth status`, `gh auth login` if needed, stop on failure
- **No branch checked out**: Detect detached HEAD/no git repo, error, stop
- **No workflows found**: `git ls-remote --heads origin <branch>`, report branch may not have triggered workflows, suggest pushing
- **Artifact download failures**: `gh run view <run-id> --json artifacts`, report "No artifacts available" or suggest manual download
- **Missing branch context**: `git branch --show-current` fails → check git repo, error

## Examples

**Running workflow → failure:**

1. Branch: `feature/my-branch`
2. Find "E2E (Playwright)" `in_progress`
3. Monitor until `failure`
4. Download to `.e2e-artifacts/feature/my-branch/<run-id>-E2E-Playwright/`
5. Report failure with artifact location, offer HTML report

**Already completed successfully:**

1. Find latest "E2E (Playwright)" `success`
2. Skip monitoring
3. Report success, provide workflow URL

**No workflows found:**

1. `gh run list` empty
2. `git ls-remote --heads origin <branch>`
3. Report branch may not be pushed or doesn't trigger workflows
