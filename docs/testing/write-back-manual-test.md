# Manual Testing Guide: Version-Aware Write-Back Protocol

## Prerequisites

1. **Build the extension:**
   ```bash
   npm run compile
   npm run bundle
   ```

2. **Launch VS Code Extension Host:**
   - Open VS Code in this repository
   - Press F5 to launch Extension Development Host
   - Or use the "Launch Extension" configuration in Run & Debug

## Test Scenario 1: Basic Write-Back Flow

### Setup
Create a test Apex workspace with these files:

**TestClass.cls:**
```apex
public class TestClass {
    public String getName() {
        return 'Test';
    }
    
    private Integer calculate(String input) {
        return input.length();
    }
}
```

**CallerClass.cls:**
```apex
public class CallerClass {
    public void callTest() {
        TestClass tc = new TestClass();
        String result = tc.getName();
    }
}
```

### Steps

1. **Enable debug logging:**
   - Open VS Code settings (Cmd+,)
   - Search for "apex log level"
   - Set `apex.logLevel` to "debug"

2. **Open both files** in the editor

3. **Trigger hover on `getName()`** in CallerClass.cls (line 4)
   - Hover over `getName`
   - Wait for hover tooltip to appear

4. **Check Output panel:**
   - View → Output
   - Select "Apex Language Server" from dropdown
   - Look for these log messages:

   ```
   [ENRICHMENT] Write-back accepted: X symbols, full level, file:///.../TestClass.cls (v1, XXms)
   [DATA-OWNER] Write-back accepted: X symbols merged at full level for file:///.../TestClass.cls
   ```

### Expected Results

✅ Hover shows method signature: `public String getName()`
✅ No errors in Output panel
✅ Write-back logs show "accepted" (not "rejected")
✅ Detail level progresses to "full"

### What to Verify

1. **First hover triggers enrichment:**
   - Initial detail level: `public-api`
   - After hover: `full`
   - Write-back accepted

2. **Second hover uses cached enrichment:**
   - No new write-back (already at `full`)
   - Hover still works correctly

## Test Scenario 2: Version Mismatch (Stale Write-Back)

### Steps

1. **Open TestClass.cls**

2. **Trigger hover** on a method

3. **Quickly edit the file** while hover is processing:
   - Add a comment: `// New comment`
   - Save the file

4. **Check Output panel** for rejection:
   ```
   [ENRICHMENT] Write-back rejected: ... [version mismatch]
   [DATA-OWNER] Write-back rejected: version mismatch (current=2, update=1)
   ```

### Expected Results

✅ Write-back rejected due to version mismatch
✅ Hover still completes (uses enriched data locally)
✅ Next hover will use fresh version and succeed

## Test Scenario 3: Concurrent Hovers

### Steps

1. **Open multiple Apex files** in split view

2. **Trigger hovers simultaneously:**
   - Hover over method in File 1
   - Immediately hover over method in File 2
   - Then hover over another method in File 1

3. **Check Output panel** for concurrent write-backs:
   ```
   [ENRICHMENT] Write-back accepted: ... (from worker-12345)
   [ENRICHMENT] Write-back accepted: ... (from worker-12346)
   [DATA-OWNER] Write-back accepted: ... (from worker-12345)
   [DATA-OWNER] Write-back skipped: already have full >= full
   ```

### Expected Results

✅ All hovers complete successfully
✅ First write-back accepted
✅ Subsequent write-backs for same file rejected (already enriched)
✅ Different files can write back independently

## Test Scenario 4: Worker Pool Performance

### Setup
Create a workspace with 10+ Apex classes.

### Steps

1. **Open all files** in editor tabs

2. **Trigger hovers rapidly:**
   - Hover over different methods in sequence
   - Don't wait for each hover to complete

3. **Monitor system performance:**
   - Activity Monitor (macOS) or Task Manager (Windows)
   - Check CPU usage of worker processes
   - Check memory usage

4. **Check Output panel** for worker distribution:
   ```
   [ENRICHMENT] Write-back accepted: ... (from worker-12345)
   [ENRICHMENT] Write-back accepted: ... (from worker-12346)
   [ENRICHMENT] Write-back accepted: ... (from worker-12347)
   ```

### Expected Results

✅ Hovers processed by different workers (see different worker IDs)
✅ CPU load distributed across worker processes
✅ No single-worker bottleneck
✅ Responsive hover even under load

## Checking Write-Back Metrics

### Via Debug Console

1. **Attach debugger** to Extension Host
2. **Set breakpoint** in worker.platform.ts at line where metrics are accessed
3. **Inspect `writeBackMetrics` object:**
   ```javascript
   {
     attempted: 15,
     accepted: 8,
     rejectedVersionMismatch: 2,
     rejectedDocumentMissing: 0,
     rejectedDetailLevel: 5,
     totalSymbolsMerged: 847
   }
   ```

### Via Logs

Search Output panel for:
```
Write-back accepted
Write-back rejected
Write-back skipped
```

Count occurrences to verify metrics.

## Common Issues

### Issue: No write-back logs appear

**Possible causes:**
1. Log level too high (set to "debug")
2. Workers not enriching (check if hover works at all)
3. Enrichment not reaching higher detail level

**Fix:**
- Set `apex.logLevel` to "debug"
- Check for other errors in Output panel
- Verify worker topology initialized (look for "Data owner initialized")

### Issue: All write-backs rejected

**Possible causes:**
1. Document versions changing too fast (typing while hovering)
2. Detail level already at maximum

**Fix:**
- Wait for document to stabilize before hovering
- Check detail level in logs (if already "full", no write-back needed)

### Issue: Hovers slow even with multiple workers

**Possible causes:**
1. Enrichment bottleneck (not the write-back)
2. Missing artifact resolution slowing down
3. Symbol loading from disk

**Fix:**
- Check timing logs: where is time spent?
- Verify stdlib loaded: "Resource loader initialized"
- Profile with Chrome DevTools (Inspect → More Tools → Performance)

## Success Criteria

✅ Write-backs accepted for new/stale symbol tables
✅ Write-backs rejected appropriately (version mismatch, detail level)
✅ Concurrent hovers work correctly
✅ No errors or crashes
✅ Performance improvement visible with multiple workers
✅ Memory usage reasonable (no leaks)

## Troubleshooting

**Enable verbose logging:**
```json
{
  "apex.logLevel": "debug",
  "apex.trace.server": "verbose"
}
```

**Check worker processes:**
```bash
ps aux | grep worker.platform
```

**Monitor file handles:**
```bash
lsof -p <extension-host-pid> | grep worker
```

**Capture timeline:**
1. Chrome DevTools → Inspect → More Tools → Performance
2. Start recording
3. Trigger hovers
4. Stop recording
5. Analyze flame graph for bottlenecks
