# Baseline Performance Testing

This document explains how to use the baseline performance testing system to measure restart command performance before implementing Effect.ts observability.

## Quick Start

### Running Tests

1. **Quick Test (5 restarts)**:
   - Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
   - Run: `Apex: Run Quick Baseline Test (5 restarts)`
   - Wait for completion message

2. **Full Test (15 restarts)**:
   - Open Command Palette
   - Run: `Apex: Run Full Baseline Test (15 restarts)`
   - Wait for completion message (~1 minute)

3. **Manual Testing**:
   - Just use the regular restart command: `Apex: Restart Language Server`
   - Each restart is automatically measured
   - Use `Apex: Save Baseline Stats to File` to save results

### Managing Results

- **Save Stats**: `Apex: Save Baseline Stats to File` - Saves to `baselineStats.json` in workspace root
- **Clear Stats**: `Apex: Clear Baseline Stats` - Clears all collected measurements

## Output Format

The `baselineStats.json` file contains:

```json
{
  "totalSamples": 15,
  "successfulSamples": 15,
  "averageDuration": 247.33,
  "minDuration": 198.45,
  "maxDuration": 312.67,
  "successRate": 100,
  "metrics": [
    {
      "timestamp": "2024-01-15T10:30:00.000Z",
      "operation": "restart-language-server",
      "duration": 247.33,
      "success": true
    }
    // ... more entries
  ],
  "generatedAt": "2024-01-15T10:35:00.000Z"
}
```

## Understanding the Results

### Key Metrics

- **averageDuration**: Typical restart time in milliseconds
- **minDuration**: Fastest restart observed
- **maxDuration**: Slowest restart observed
- **successRate**: Percentage of successful restarts

### Console Output

Watch the VS Code Developer Console (`Help > Toggle Developer Tools > Console`) for detailed logs:

```
[BASELINE] restart-language-server: 247.33ms (SUCCESS)
[BASELINE TEST] Running test 1/5
[BASELINE TEST] Waiting 2000ms before next test...
```

## Typical Expected Results

Based on VSCode extension patterns, you should expect:

- **Average restart time**: 200-500ms (depending on system)
- **Success rate**: 95-100%
- **Variation**: ±50-100ms between runs

## Troubleshooting

### No measurements appearing

- Check that you've restarted VS Code after installing
- Verify the extension is active (should see "Apex Language Server extension is now active!" in output)

### Tests failing

- Ensure workspace has an Apex project
- Check that language server binary is accessible
- Try manual restart first: `Apex: Restart Language Server`

### File not saving

- Verify you have an open workspace folder
- Check file permissions in workspace root
- Look for error messages in console

## Next Steps

After collecting baseline data:

1. Note the average restart performance
2. Proceed with Effect.ts observability implementation
3. Compare post-implementation performance
4. Aim for <10ms additional overhead with full observability

The baseline results will be used in the Effect.ts demo to show:

- "Before Effect.ts: 247ms average restart"
- "After Effect.ts: 251ms average restart (+4ms for full observability)"
- "Observability overhead: 1.6% for complete visibility"
