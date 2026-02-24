/**
 * Demo data generator for the Apex Language Server telemetry dashboard.
 *
 * Generates realistic-looking trace data for testing the dashboard
 * without needing to run the actual language server.
 *
 * Usage:
 *   npx tsx telemetry/scripts/generate-demo-data.ts
 *   npx tsx telemetry/scripts/generate-demo-data.ts --count 1000
 *   npx tsx telemetry/scripts/generate-demo-data.ts --output ./custom-output.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface DemoSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: number;
  startTimeUnixNano: number;
  endTimeUnixNano: number;
  duration: number;
  status: { code: number; message?: string };
  resource: {
    attributes: {
      'extension.name': string;
      'extension.version': string;
      'service.platform': 'web' | 'desktop';
      'service.namespace'?: string;
    };
  };
  attributes: Record<string, string | number>;
}

const OPERATIONS = [
  { name: 'lsp.hover', method: 'textDocument/hover', avgDuration: 30 },
  { name: 'lsp.completion', method: 'textDocument/completion', avgDuration: 80 },
  { name: 'lsp.definition', method: 'textDocument/definition', avgDuration: 25 },
  { name: 'lsp.references', method: 'textDocument/references', avgDuration: 150 },
  { name: 'lsp.documentSymbol', method: 'textDocument/documentSymbol', avgDuration: 45 },
  { name: 'lsp.diagnostics', method: 'textDocument/diagnostic', avgDuration: 100 },
  { name: 'lsp.foldingRange', method: 'textDocument/foldingRange', avgDuration: 20 },
  { name: 'lsp.codeLens', method: 'textDocument/codeLens', avgDuration: 35 },
  { name: 'apex.parse', method: 'apex/parse', avgDuration: 120 },
  { name: 'apex.resolveSymbols', method: 'apex/resolveSymbols', avgDuration: 60 },
  { name: 'apex.findMissingArtifact', method: 'apex/findMissingArtifact', avgDuration: 200 },
];

const SAMPLE_URIS = [
  'file:///workspace/force-app/main/default/classes/AccountService.cls',
  'file:///workspace/force-app/main/default/classes/ContactController.cls',
  'file:///workspace/force-app/main/default/classes/OpportunityTrigger.cls',
  'file:///workspace/force-app/main/default/classes/LeadProcessor.cls',
  'file:///workspace/force-app/main/default/classes/CaseHandler.cls',
  'file:///workspace/force-app/main/default/classes/CustomMetadataUtil.cls',
  'file:///workspace/force-app/main/default/classes/BatchProcessor.cls',
  'file:///workspace/force-app/main/default/classes/RestApiController.cls',
];

/**
 * Generate a random hex string of specified length.
 */
function randomHex(length: number): string {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

/**
 * Generate a random duration with some variance.
 */
function randomDuration(baseDuration: number, environment: 'web' | 'desktop'): number {
  // Web is typically 30-50% slower
  const envMultiplier = environment === 'web' ? 1.4 : 1.0;

  // Add variance: 0.5x to 2x base duration
  const variance = 0.5 + Math.random() * 1.5;

  return baseDuration * envMultiplier * variance;
}

/**
 * Generate a single demo span.
 */
function generateSpan(
  timestamp: number,
  environment: 'web' | 'desktop',
  errorRate: number = 0.05
): DemoSpan {
  const operation = OPERATIONS[Math.floor(Math.random() * OPERATIONS.length)];
  const isError = Math.random() < errorRate;
  const duration = randomDuration(operation.avgDuration, environment);
  const uri = SAMPLE_URIS[Math.floor(Math.random() * SAMPLE_URIS.length)];

  return {
    traceId: randomHex(32),
    spanId: randomHex(16),
    name: operation.name,
    kind: 2, // SPAN_KIND_SERVER
    startTimeUnixNano: timestamp * 1_000_000,
    endTimeUnixNano: (timestamp + duration) * 1_000_000,
    duration: duration * 1_000_000, // nanoseconds
    status: isError
      ? { code: 2, message: 'Operation failed: timeout exceeded' }
      : { code: 0 },
    resource: {
      attributes: {
        'extension.name': 'apex-language-server',
        'extension.version': '1.0.0',
        'service.platform': environment,
        'service.namespace': 'apex-language-support',
      },
    },
    attributes: {
      'lsp.method': operation.method,
      'document.uri': uri,
      'document.position': `${Math.floor(Math.random() * 500)}:${Math.floor(Math.random() * 80)}`,
    },
  };
}

/**
 * Generate demo data with realistic distribution over time.
 */
function generateDemoData(options: {
  count: number;
  durationHours: number;
  desktopRatio: number;
  errorRate: number;
}): DemoSpan[] {
  const { count, durationHours, desktopRatio, errorRate } = options;
  const spans: DemoSpan[] = [];
  const now = Date.now();
  const startTime = now - durationHours * 60 * 60 * 1000;

  for (let i = 0; i < count; i++) {
    // Distribute spans over the time period with some clustering
    // (more activity during "work hours")
    const progress = i / count;
    const timestamp = startTime + progress * (now - startTime);

    // Add some random jitter
    const jitter = (Math.random() - 0.5) * 60 * 1000; // +/- 30 seconds
    const finalTimestamp = timestamp + jitter;

    const environment: 'web' | 'desktop' =
      Math.random() < desktopRatio ? 'desktop' : 'web';

    spans.push(generateSpan(finalTimestamp, environment, errorRate));
  }

  // Sort by timestamp
  spans.sort((a, b) => a.startTimeUnixNano - b.startTimeUnixNano);

  return spans;
}

/**
 * Main function.
 */
function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const options = {
    count: 500,
    durationHours: 24,
    desktopRatio: 0.6,
    errorRate: 0.05,
    output: path.join(__dirname, '../data/traces.json'),
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--count':
        options.count = parseInt(args[++i], 10);
        break;
      case '--hours':
        options.durationHours = parseInt(args[++i], 10);
        break;
      case '--desktop-ratio':
        options.desktopRatio = parseFloat(args[++i]);
        break;
      case '--error-rate':
        options.errorRate = parseFloat(args[++i]);
        break;
      case '--output':
        options.output = args[++i];
        break;
      case '--help':
        console.log(`
Demo Data Generator for Apex Language Server Telemetry

Usage: npx tsx generate-demo-data.ts [options]

Options:
  --count <n>          Number of spans to generate (default: 500)
  --hours <n>          Time span in hours (default: 24)
  --desktop-ratio <n>  Ratio of desktop vs web spans (default: 0.6)
  --error-rate <n>     Error rate 0-1 (default: 0.05)
  --output <path>      Output file path (default: ../data/traces.json)
  --help               Show this help message
`);
        process.exit(0);
    }
  }

  console.log('Generating demo data with options:', options);

  const spans = generateDemoData(options);

  // Ensure output directory exists
  const outputDir = path.dirname(options.output);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write as newline-delimited JSON (NDJSON)
  const ndjson = spans.map(s => JSON.stringify(s)).join('\n');
  fs.writeFileSync(options.output, ndjson);

  // Print statistics
  const desktopCount = spans.filter(s => s.resource.attributes['service.platform'] === 'desktop').length;
  const webCount = spans.filter(s => s.resource.attributes['service.platform'] === 'web').length;
  const errorCount = spans.filter(s => s.status.code === 2).length;

  console.log(`
Generated ${spans.length} demo spans:
  Desktop: ${desktopCount} (${((desktopCount / spans.length) * 100).toFixed(1)}%)
  Web: ${webCount} (${((webCount / spans.length) * 100).toFixed(1)}%)
  Errors: ${errorCount} (${((errorCount / spans.length) * 100).toFixed(1)}%)

Output written to: ${options.output}
`);
}

main();
