# Interactive Debugging Session: Write-Back Protocol Timeout

## Problem
Integration test `WriteBackProtocol.integration.test.ts` times out after 30 seconds.
Need to debug why the hover dispatch doesn't complete.

## Debugging Session Steps

### Step 1: Setup

1. **Open VS Code** in this repository
2. **Open the test file:**
   ```
   packages/apex-ls/test/integration/WriteBackProtocol.integration.test.ts
   ```

3. **Set breakpoints** at key locations:
   - Line 64: `new DispatchDocumentOpen`
   - Line 85: `new DispatchHover`
   - Line 96: `new QuerySymbolSubset` (after hover)

### Step 2: Launch Debugger

1. **Select debug configuration:** "Debug Jest Test File"
2. **Click the test file** to make it active
3. **Press F5** to start debugging

Alternatively:
- Click Run → Start Debugging
- Or use Command Palette: "Debug: Start Debugging"

### Step 3: Observe Execution

Watch for:

**Does it reach DispatchDocumentOpen?**
- ✅ YES → Document opened successfully, continue
- ❌ NO → Worker topology initialization failed

**Does it reach DispatchHover?**
- ✅ YES → Hover dispatched to enrichment pool, continue
- ❌ NO → QuerySymbolSubset or document open failed

**Does DispatchHover return?**
- ✅ YES → Check how long it took (should be < 5s)
- ❌ NO → **This is where it's hanging**

### Step 4: Diagnose Hover Hang

If DispatchHover doesn't return, add breakpoints in worker code:

#### In `packages/apex-ls/src/worker.platform.ts`:

1. **Line ~550** (DispatchHover enrichment handler):
   ```typescript
   DispatchHover: enrichmentHandler<PositionReq>(
     'DispatchHover',
     async (svc, req) => {
   ```

2. **Line ~460** (loadSymbolDataForEnrichment):
   ```typescript
   async function loadSymbolDataForEnrichment(
   ```

3. **Line ~540** (writeBackEnrichedSymbols):
   ```typescript
   async function writeBackEnrichedSymbols(
   ```

#### What to check:

**Q1: Does DispatchHover handler get invoked?**
- If NO → Worker not processing requests (Effect protocol issue)
- If YES → Continue to Q2

**Q2: Does loadSymbolDataForEnrichment complete?**
- If NO → Stuck waiting for QuerySymbolSubset response from data owner
- If YES → Continue to Q3

**Q3: Does hover service processHover complete?**
- If NO → Enrichment stuck (not write-back related)
- If YES → Continue to Q4

**Q4: Does writeBackEnrichedSymbols get called?**
- If NO → shouldEnrich returned false (expected if already enriched)
- If YES → Continue to Q5

**Q5: Does writeBackEnrichedSymbols complete?**
- If NO → **Write-back is hanging** (this is the bug we're looking for)
- If YES → Test timeout is elsewhere

### Step 5: Narrow Down Write-Back Hang

If write-back is hanging, add breakpoints:

1. **requestCoordinatorAssistancePromise call** (line ~520):
   ```typescript
   const response = (await requestCoordinatorAssistancePromise(
     'dataOwner:UpdateSymbolSubset',
   ```

2. **Check if it returns** from requestCoordinatorAssistancePromise

3. **If it doesn't return:**
   - The coordinator assistance mediator isn't routing the request
   - Or the data owner isn't responding

### Step 6: Check Data Owner Handler

Add breakpoints in UpdateSymbolSubset handler:

**In `packages/apex-ls/src/worker.platform.ts` (line ~825)**:
```typescript
UpdateSymbolSubset: (req) =>
  guardRole('UpdateSymbolSubset').pipe(
```

**Questions:**
- Does it reach this handler?
- If YES → Does it complete the validation logic?
- If NO → Coordinator routing issue

### Step 7: Check Coordinator Routing

**In `packages/apex-ls/src/server/WorkerCoordinator.ts` (line ~473)**:
```typescript
async queryDataOwner(method: string, params: unknown): Promise<unknown> {
  switch (method) {
    case 'UpdateSymbolSubset':
```

**Questions:**
- Does queryDataOwner get called with 'UpdateSymbolSubset'?
- Does it execute the UpdateSymbolSubset case?
- Does callbacks.sendToDataOwner return?

### Step 8: Collect Evidence

At each breakpoint, inspect:

**Variables to check:**
- `req` (request payload)
- `topology` (worker handles)
- `workerId` (which worker)
- `queryResult.versions` (document version)
- `currentDoc.version` (data owner's version)

**Call stack:**
- How deep is the stack?
- Are we in an async boundary?
- Are we in Effect.gen?

**Console logs:**
In Debug Console, run:
```javascript
// Check if request made it to coordinator
console.log('Worker topology:', topology)

// Check document version
console.log('Document version:', currentDoc?.version)

// Check detail level
console.log('Detail level:', detailLevel)
```

## Common Issues & Fixes

### Issue 1: Worker not initialized

**Symptom:** Breakpoint in worker handler never hit

**Cause:** Worker topology initialization failed

**Fix:** Check topology initialization logs, ensure workers spawned

### Issue 2: Assistance request not reaching data owner

**Symptom:** requestCoordinatorAssistancePromise hangs

**Cause:** Assistance mediator not routing correctly

**Fix:** Verify CoordinatorAssistanceMediator has dataOwnerHandler set

### Issue 3: Data owner queue deadlock

**Symptom:** UpdateSymbolSubset reaches handler but doesn't return

**Cause:** Tiered queue blocked (read/write priority issue)

**Fix:** Check if queue processing loop is running

### Issue 4: Effect.promise not resolving

**Symptom:** Wrapped promise in Effect.gen hangs

**Cause:** Missing await or Effect.runPromise

**Fix:** Verify all promises properly wrapped with Effect.promise

## Quick Diagnostic Commands

Run these in Debug Console when paused:

```javascript
// Check worker state
assignedRole

// Check if queues initialized
dataOwnerQueues

// Check metrics
writeBackMetrics

// Check pending operations
Effect.runPromise(Queue.size(read))
Effect.runPromise(Queue.size(write))
```

## Success Criteria

After debugging session, you should know:

1. ✅ Which step hangs (document open, hover dispatch, write-back, etc.)
2. ✅ Whether enrichment completes
3. ✅ Whether write-back is invoked
4. ✅ Whether write-back returns
5. ✅ Root cause of timeout

## Next Steps

Based on findings:

**If enrichment hangs:** Not a write-back issue, debug hover service
**If write-back hangs:** Debug coordinator routing or data owner handler
**If write-back rejects:** Check version validation logic
**If test completes but slowly:** Optimize enrichment or symbol loading

## Fallback: Simplified Test

If full integration is too complex, test just the protocol:

```typescript
it('simplified: direct UpdateSymbolSubset call', async () => {
  const topology = await initializeTopology(...);
  
  // Manually open document first
  await topology.dataOwner.executeEffect(new DispatchDocumentOpen(...));
  
  // Manually create enriched symbols
  const enrichedSymbols = { symbols: [], references: [], ... };
  
  // Direct write-back call (bypass hover)
  const result = await topology.dataOwner.executeEffect(
    new UpdateSymbolSubset({
      uri: TEST_URI,
      documentVersion: 1,
      enrichedSymbolTable: enrichedSymbols,
      enrichedDetailLevel: 'full',
      sourceWorkerId: 'test-manual',
    })
  );
  
  expect(result.accepted).toBe(true);
});
```

This isolates write-back protocol from enrichment complexity.
