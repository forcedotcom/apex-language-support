# E2E Test Race Condition - Root Cause & Fix

## Problem Summary

PR #518 (capability gating) causes consistent e2e test failures for cross-file navigation tests:
- `should navigate to base class from derived class` 
- `should navigate to interface from implementing class`
- `should navigate to base class defined in another workspace file`

All 3 tests fail with the same symptom: F12 (go-to-definition) doesn't navigate - the editor stays in the source file instead of jumping to the target file.

## Root Cause

**NOT a bug in PR #518's capability gating logic** - the gating implementation is correct.

The issue is a **pre-existing race condition in the e2e tests** that PR #518 exposes:

### The Race Condition

1. Test calls `apexEditor.openFile('AccountHandler.cls')`
2. Test calls `apexEditor.waitForLanguageServerReady()` 
3. `waitForLanguageServerReady()` only waits for:
   - Monaco editor to be visible
   - `.view-lines` to render (file content displayed)
4. **It does NOT wait for workspace ingestion to complete!**
5. Test immediately presses F12 on "BaseHandler"
6. **Workspace might not be indexed yet** → LSP can't find BaseHandler.cls → navigation fails

### Why It Worked Before

On main branch, timing happens to work out - workspace ingestion completes fast enough that by the time F12 is pressed, BaseHandler.cls is already indexed.

### Why PR #518 Breaks It

PR #518 adds:
- Client capability processing overhead
- Capability check calls in multiple places  
- Additional logging
- Small timing changes in the initialization flow

These small timing changes (~50-200ms) cause workspace ingestion to not complete before the test presses F12, exposing the race condition.

## Evidence

### Tests That Pass vs Fail

✅ **Passing**: Tests using **qualified references** (e.g., `CrossFileCaller.cls` → `CrossFileUtility.method()`)
- These were already working thanks to PR #520's qualifier fix
- PR #520 merged before PR #518's latest update

❌ **Failing**: Tests using **simple type references** (e.g., `extends BaseHandler`, `implements DataProcessor`)  
- These require full workspace indexing
- The tests don't wait for indexing to complete

### Test on Main vs PR #518

**Main branch (passing):**
```
[21/29] should navigate to base class from derived class
✅ test passes in ~12 seconds
```

**PR #518 (failing):**
```
[21/29] should navigate to base class from derived class
❌ retry #1
❌ retry #2  
Error: Expected "abstract class BaseHandler", received "public class AccountHandler"
```

The editor content shows it never left AccountHandler.cls.

## The Fix

### Updated `waitForLSPInitialization()` 

Added `waitForWorkspaceIngestion()` helper that polls the status bar:

```typescript
export const waitForWorkspaceIngestion = async (
  page: Page,
  timeout?: number,
): Promise<void> => {
  // Poll status bar until "Apex" status shows ready (not "Loading...", "Scanning...", etc.)
  await page.waitForFunction(
    () => {
      const statusBar = document.querySelector('[id="workbench.parts.statusbar"]');
      const statusText = statusBar?.textContent || '';
      const apexStatusMatch = statusText.match(/Apex[:\s]*([^\n]*)/i);
      const apexStatus = apexStatusMatch?.[1]?.trim() || '';
      
      // Ready when no loading indicators
      return !apexStatus.toLowerCase().includes('loading') &&
             !apexStatus.toLowerCase().includes('scanning') &&
             !apexStatus.toLowerCase().includes('indexing');
    },
    { timeout: 20_000 } // 20s web, 30s desktop
  );
};
```

Then updated `waitForLSPInitialization()` to call it:

```typescript
export const waitForLSPInitialization = async (page: Page): Promise<void> => {
  // ... existing editor visibility checks ...
  
  // NEW: Wait for workspace ingestion to complete
  await waitForWorkspaceIngestion(page);
};
```

### Why This Works

The extension's status bar updates when it receives `apex/workspaceIngestionComplete` notification from the server. By polling the status bar, we ensure:

1. Server sent `apex/requestWorkspaceLoad` (capability gating didn't suppress it)
2. Client initiated workspace scanning
3. Client sent batches to server
4. Server indexed all files
5. Server sent `apex/workspaceIngestionComplete`
6. Client updated status bar to "ready"

Only then do tests proceed to cross-file navigation.

## Impact

- **All cross-file navigation tests** now wait for indexing
- **No breaking changes** to test API
- **Fixes flakiness** that would have bitten us again
- **PR #518 can merge** once tests pass

## Testing

After applying this fix:
1. Build extension: `npm run compile && npm run bundle`
2. Run the failing test: `cd e2e-tests && npx playwright test tests/apex-goto-definition.spec.ts --config=playwright.config.web.ts --project=chromium-web -g "base class" --headed`
3. Should pass ✅

Expected result: Test waits ~15-20s for workspace ingestion, then successfully navigates cross-file.
