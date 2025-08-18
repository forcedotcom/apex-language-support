/*
 * Simple test script to verify the Apex Language Server worker functionality
 */

const fs = require('fs');
const path = require('path');

// Mock Worker class for Node.js testing
class MockWorker {
  constructor() {
    this.onmessage = null;
    this.onerror = null;
    this.onmessageerror = null;
  }

  postMessage(data) {
    console.log('📤 Sending to worker:', JSON.stringify(data, null, 2));
  }

  terminate() {
    console.log('🛑 Worker terminated');
  }
}

// Test the worker by examining its generated code
async function testWorker() {
  console.log('🔧 Testing Apex Language Server Worker');
  console.log('=====================================\n');

  const workerPath = path.join(
    __dirname,
    'packages',
    'apex-ls',
    'dist',
    'worker.mjs',
  );

  if (!fs.existsSync(workerPath)) {
    console.error('❌ Worker file not found:', workerPath);
    return;
  }

  const workerStats = fs.statSync(workerPath);
  console.log(
    `📊 Worker bundle size: ${(workerStats.size / 1024).toFixed(2)} KB`,
  );

  // Read the worker file to check what's included
  const workerContent = fs.readFileSync(workerPath, 'utf8');

  console.log('\n🔍 Checking worker capabilities:');
  console.log(
    '- ApexStorageManager:',
    workerContent.includes('ApexStorageManager') ? '✅' : '❌',
  );
  console.log(
    '- dispatchProcessOnDocumentSymbol:',
    workerContent.includes('dispatchProcessOnDocumentSymbol') ? '✅' : '❌',
  );
  console.log(
    '- ES Module format:',
    workerContent.includes('export {') ? '✅' : '❌',
  );
  console.log(
    '- No importScripts:',
    !workerContent.includes('importScripts') ? '✅' : '❌',
  );

  // Check for key language server capabilities
  console.log('\n📋 Language Server Features:');
  console.log(
    '- Document symbols:',
    workerContent.includes('onDocumentSymbol') ? '✅' : '❌',
  );
  console.log(
    '- Folding ranges:',
    workerContent.includes('onFoldingRanges') ? '✅' : '❌',
  );
  console.log(
    '- Text document sync:',
    workerContent.includes('TextDocumentSyncKind') ? '✅' : '❌',
  );
  console.log(
    '- Connection handling:',
    workerContent.includes('createConnection') ? '✅' : '❌',
  );

  // Check if compliant services are included
  console.log('\n🔧 Service Integration:');
  console.log(
    '- Compliant services bundled:',
    workerContent.includes('DocumentSymbolProcessingService') ? '✅' : '❌',
  );
  console.log(
    '- Logging framework:',
    workerContent.includes('UnifiedLoggerFactory') ? '✅' : '❌',
  );
  console.log(
    '- Storage layer:',
    workerContent.includes('WebWorkerStorage') ? '✅' : '❌',
  );

  console.log('\n✨ Worker analysis complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Test in VS Code web environment');
  console.log('2. Open an Apex file (.cls)');
  console.log('3. Try document symbols (Ctrl+Shift+O)');
  console.log('4. Check browser console for worker messages');
}

testWorker().catch(console.error);
